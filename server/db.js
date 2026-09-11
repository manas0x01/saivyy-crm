try { process.loadEnvFile(); } catch {}
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { INITIAL_STORE } from './initialStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;
const DEFAULT_ORG_ID = 'ORG-saivyy-default';

// ─── camelCase mapping (PostgreSQL folds unquoted column names to lowercase) ──
// When we SELECT *, pg returns e.g. "orgid" instead of "orgId".
// This map restores the correct camelCase key names.
const PG_COL_CAMEL = {
  orgname:             'orgName',
  orgid:               'orgId',
  lastcontact:         'lastContact',
  nextfollowup:        'nextFollowup',
  dealvalue:           'dealValue',
  dealvaluenum:        'dealValueNum',
  businessdescription: 'businessDescription',
  companysize:         'companySize',
  annualrevenue:       'annualRevenue',
  businessmodel:       'businessModel',
  ownerinitials:       'ownerInitials',
  userid:              'userId',
  ownerfull:           'ownerFull',
  totalrevenue:        'totalRevenue',
  joindate:            'joinDate',
  teamid:              'teamId',
  linkedlead:          'linkedLead',
  duedate:             'dueDate',
  openrate:            'openRate',
  clickrate:           'clickRate',
  apikey:              'apiKey',
  webhookurl:          'webhookUrl',
  lastsync:            'lastSync',
  teamname:            'teamName',
  accountuserid:       'accountUserId',
  isleader:            'isLeader',
  haslogin:            'hasLogin',
  uploaded_at:         'uploadedAt',
  batch_index:         'batchIndex',
};

function mapRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[PG_COL_CAMEL[k] || k] = v;
  }
  return out;
}

// ─── PostgreSQL Wrapper ───────────────────────────────────────────────────────
// Wraps pg.Pool to expose the same .get()/.all()/.run()/.exec() API as sqlite.
// Also handles:
//   - ? → $1, $2, ... parameter conversion
//   - SQLite rowid → id replacement
//   - PRAGMA table_info → information_schema.columns
//   - Duplicate key errors (code 23505) treated as no-ops (safe seeding)
class PgWrapper {
  constructor(pool) {
    this.pool = pool;
  }

  _convert(sql, params = []) {
    let i = 0;
    let pgSql = String(sql)
      // Replace ? with $1, $2, ...
      .replace(/\?/g, () => `$${++i}`)
      // SQLite-specific rowid → id (used in ORDER BY rowid DESC/ASC)
      .replace(/\browid\b/gi, 'id');
    return pgSql;
  }

  async _pragmaInfo(tableName) {
    try {
      const r = await this.pool.query(
        `SELECT column_name AS name
         FROM information_schema.columns
         WHERE table_name = $1 AND table_schema = 'public'
         ORDER BY ordinal_position`,
        [tableName.toLowerCase()]
      );
      return r.rows;
    } catch (e) {
      return [];
    }
  }

  async exec(sql) {
    // Split multi-statement SQL (CREATE TABLE IF NOT EXISTS blocks)
    const statements = String(sql).split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      try {
        await this.pool.query(stmt);
      } catch (e) {
        if (!e.message.includes('already exists')) {
          console.error('pg exec error:', e.message);
        }
      }
    }
  }

  async get(sql, params = []) {
    const trimmed = String(sql).trim().toUpperCase();
    if (trimmed.startsWith('PRAGMA')) {
      const m = sql.match(/PRAGMA\s+table_info\((\w+)\)/i);
      if (!m) return undefined;
      const rows = await this._pragmaInfo(m[1]);
      return rows[0];
    }
    try {
      const pgSql = this._convert(sql, params);
      const r = await this.pool.query(pgSql, params);
      return mapRow(r.rows[0]) || undefined;
    } catch (e) {
      console.error('pg get error:', e.message, '\nSQL:', sql);
      throw e;
    }
  }

  async all(sql, params = []) {
    const trimmed = String(sql).trim().toUpperCase();
    if (trimmed.startsWith('PRAGMA')) {
      const m = sql.match(/PRAGMA\s+table_info\((\w+)\)/i);
      if (!m) return [];
      return await this._pragmaInfo(m[1]);
    }
    try {
      const pgSql = this._convert(sql, params);
      const r = await this.pool.query(pgSql, params);
      return r.rows.map(mapRow);
    } catch (e) {
      console.error('pg all error:', e.message, '\nSQL:', sql);
      throw e;
    }
  }

  async run(sql, params = []) {
    try {
      const pgSql = this._convert(sql, params);
      const r = await this.pool.query(pgSql, params);
      return { changes: r.rowCount || 0 };
    } catch (e) {
      // Ignore unique constraint violations (safe to re-seed)
      if (e.code === '23505') return { changes: 0 };
      console.error('pg run error:', e.message, '\nSQL:', sql);
      throw e;
    }
  }
}

// ─── Local SQLite Driver ──────────────────────────────────────────────────────
async function loadSqliteDriver() {
  try {
    const sqlite3Mod = await import('sqlite3');
    const sqliteMod = await import('sqlite');
    const sqlite3 = sqlite3Mod.default || sqlite3Mod;
    const open = sqliteMod.open;
    return { sqlite3, open };
  } catch (err) {
    console.warn('Native sqlite3 module not available:', err?.message || err);
    return null;
  }
}

// ─── Main getDb() ─────────────────────────────────────────────────────────────
// Priority:
//   1. DATABASE_URL env var → PostgreSQL (Neon / any pg-compatible)  [PRODUCTION]
//   2. Local SQLite file (server/crm.sqlite)                          [DEVELOPMENT]
//   3. In-memory SQLite fallback                                      [CI/TEST]
//   4. JS in-memory fallback (no native modules)                      [LAST RESORT]
export async function getDb() {
  if (dbInstance) return dbInstance;

  // ── 1. PostgreSQL via DATABASE_URL (Neon free tier recommended) ───────────
  if (process.env.DATABASE_URL) {
    try {
      const pgMod = await import('pg');
      const { Pool } = pgMod.default || pgMod;
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      // Verify connection
      await pool.query('SELECT 1');
      console.log('✅ Connected to PostgreSQL (Neon) — data is permanently persisted');
      dbInstance = new PgWrapper(pool);
      await initDb(dbInstance);
      return dbInstance;
    } catch (err) {
      console.error('❌ PostgreSQL connection failed:', err.message);
      throw new Error(`Database connection failed: ${err.message}. Check your DATABASE_URL environment variable.`);
    }
  }

  // ── 2. Local SQLite (development only) ────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const driverObj = await loadSqliteDriver();
    if (driverObj && driverObj.open && driverObj.sqlite3) {
      const dbPath = path.join(__dirname, 'crm.sqlite');
      try {
        dbInstance = await driverObj.open({
          filename: dbPath,
          driver: driverObj.sqlite3.Database
        });
        console.log('✅ Using local SQLite:', dbPath);
        await initDb(dbInstance);
        return dbInstance;
      } catch (err) {
        console.warn('File SQLite failed, trying in-memory:', err.message);
        try {
          dbInstance = await driverObj.open({
            filename: ':memory:',
            driver: driverObj.sqlite3.Database
          });
          console.log('⚠️  Using in-memory SQLite (data not persisted)');
          await initDb(dbInstance);
          return dbInstance;
        } catch (memErr) {
          console.warn('In-memory sqlite failed:', memErr.message);
        }
      }
    }
  }

  // ── 3. Production with no DATABASE_URL — fail loudly ─────────────────────
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'DATABASE_URL is not set. In production, you must provide a PostgreSQL connection string. ' +
      'Create a free database at https://neon.tech and set DATABASE_URL in your Render environment variables.'
    );
  }

  // ── 4. Last resort: JS in-memory fallback ────────────────────────────────
  console.log('⚠️  Using in-memory JS fallback store — data will NOT persist');
  dbInstance = createMemoryFallbackDb();
  return dbInstance;
}


// ─── JS In-Memory Fallback ────────────────────────────────────────────────────
function createMemoryFallbackDb() {
  const TMP_STORE_PATH = path.join('/tmp', 'saivyy_store.json');
  let store;
  try {
    if (fs.existsSync(TMP_STORE_PATH)) {
      const saved = JSON.parse(fs.readFileSync(TMP_STORE_PATH, 'utf8'));
      store = { ...INITIAL_STORE, ...saved };
      if (!store.users) store.users = [];
      for (const u of (INITIAL_STORE.users || [])) {
        if (!store.users.some(su => su.id === u.id || (su.email && u.email && su.email.toLowerCase() === u.email.toLowerCase()))) {
          store.users.push(u);
        }
      }
      if (!store.leads || store.leads.length === 0) {
        store.leads = [...(INITIAL_STORE.leads || [])];
      }
    } else {
      store = JSON.parse(JSON.stringify(INITIAL_STORE || {}));
    }
  } catch (e) {
    store = JSON.parse(JSON.stringify(INITIAL_STORE || {}));
  }

  const tables = ['users', 'leads', 'deals', 'customers', 'companies', 'teams', 'team_members', 'tasks', 'calls', 'meetings', 'activities', 'automations', 'campaigns', 'notifications', 'integrations'];
  for (const t of tables) {
    if (!store[t]) store[t] = [];
  }

  function saveStore() {
    try { fs.writeFileSync(TMP_STORE_PATH, JSON.stringify(store)); } catch (e) {}
  }

  const DEFAULT_USER_ID = 'U-117bb402-3724-4580-9da9-01311b759889';

  function getTableName(sql) {
    if (!sql || typeof sql !== 'string') return null;
    const clean = sql.trim().replace(/\s+/g, ' ');
    const fromMatch = clean.match(/FROM\s+([a-z0-9_]+)/i);
    if (fromMatch) return fromMatch[1].toLowerCase();
    const intoMatch = clean.match(/INTO\s+([a-z0-9_]+)/i);
    if (intoMatch) return intoMatch[1].toLowerCase();
    const updateMatch = clean.match(/UPDATE\s+([a-z0-9_]+)/i);
    if (updateMatch) return updateMatch[1].toLowerCase();
    const deleteMatch = clean.match(/DELETE\s+FROM\s+([a-z0-9_]+)/i);
    if (deleteMatch) return deleteMatch[1].toLowerCase();
    return null;
  }

  function filterRows(tableRows = [], sql = '', params = []) {
    let rows = [...tableRows];
    const clean = String(sql).trim();

    if (clean.toUpperCase().startsWith('PRAGMA')) {
      return [
        { name: 'id' }, { name: 'name' }, { name: 'email' }, { name: 'password' },
        { name: 'role' }, { name: 'orgName' }, { name: 'orgId' }, { name: 'created' },
        { name: 'userId' }, { name: 'businessDescription' }, { name: 'companySize' },
        { name: 'annualRevenue' }, { name: 'businessModel' }
      ];
    }

    if (/WHERE\s+.*email/i.test(clean)) {
      if (clean.includes('LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?)') || clean.includes('LOWER(email) = ? OR LOWER(name) = ?')) {
        const emailParam = params[0];
        const nameParam = params[1];
        rows = rows.filter(r =>
          (r.email && emailParam && r.email.toLowerCase() === String(emailParam).toLowerCase()) ||
          (r.name && nameParam && r.name.toLowerCase() === String(nameParam).toLowerCase())
        );
      } else if (clean.includes('LOWER(name) = LOWER(?) OR LOWER(email) = LOWER(?)') || clean.includes('LOWER(name) = ? OR LOWER(email) = ?')) {
        const nameParam = params[0];
        const emailParam = params[1];
        rows = rows.filter(r =>
          (r.name && nameParam && r.name.toLowerCase() === String(nameParam).toLowerCase()) ||
          (r.email && emailParam && r.email.toLowerCase() === String(emailParam).toLowerCase())
        );
      } else {
        const email = params[0];
        if (email) rows = rows.filter(r => r.email && r.email.toLowerCase() === String(email).toLowerCase());
      }
    } else if (clean.includes('WHERE id = ?') || clean.includes('WHERE id =')) {
      const id = params[0];
      if (id) rows = rows.filter(r => r.id === id);
    } else if (clean.includes('WHERE orgId = ?')) {
      const orgId = params[0];
      if (orgId) rows = rows.filter(r => r.orgId === orgId);
    } else if (clean.includes('WHERE role =')) {
      if (clean.includes("'Member'")) rows = rows.filter(r => r.role === 'Member');
      else if (clean.includes("'Leader'")) rows = rows.filter(r => r.role === 'Leader');
    } else if (clean.includes('WHERE userId IN')) {
      if (params && params.length > 0) {
        rows = rows.filter(r => params.includes(r.userId) || !r.userId);
      }
    } else if (clean.includes('WHERE userId = ?')) {
      const userId = params[0];
      if (userId) {
        if (clean.includes('OR LOWER(owner) LIKE')) {
          const pattern = String(params[1] || '').replace(/%/g, '').toLowerCase();
          rows = rows.filter(r => r.userId === userId || (pattern && String(r.owner || '').toLowerCase().includes(pattern)));
        } else {
          rows = rows.filter(r => r.userId === userId || !r.userId);
        }
      }
    }

    if (clean.includes('ORDER BY created ASC')) {
      rows.sort((a, b) => String(a.created || '').localeCompare(String(b.created || '')));
    } else if (clean.includes('ORDER BY rowid DESC') || clean.includes('ORDER BY id DESC')) {
      rows = [...rows].reverse();
    }

    if (clean.includes('LIMIT 1')) {
      rows = rows.slice(0, 1);
    }

    return rows;
  }

  return {
    async exec() { return true; },
    async get(sql, params = []) {
      if (sql && sql.includes('COUNT(*)')) {
        const table = getTableName(sql);
        return { count: (store[table] || []).length };
      }
      const table = getTableName(sql);
      const rows = filterRows(store[table] || [], sql, params);
      return rows[0] || undefined;
    },
    async all(sql, params = []) {
      const table = getTableName(sql);
      if (!table) return filterRows([], sql, params);
      return filterRows(store[table] || [], sql, params);
    },
    async run(sql, params = []) {
      const clean = String(sql).trim();
      const table = getTableName(sql);
      if (table && !store[table]) store[table] = [];

      if (clean.toUpperCase().startsWith('INSERT INTO') && table) {
        const newObj = {};
        const colMatch = clean.match(/INSERT\s+INTO\s+[a-z0-9_]+\s*\(([^)]+)\)/i);
        const valMatch = clean.match(/VALUES\s*\((.+)\)/i);
        if (colMatch && valMatch) {
          const cols = colMatch[1].split(',').map(c => c.trim().replace(/["`]/g, ''));
          const valTokens = valMatch[1].split(',').map(v => v.trim());
          let pIdx = 0;
          for (let i = 0; i < cols.length; i++) {
            const token = valTokens[i] || '?';
            if (token === '?') {
              newObj[cols[i]] = params[pIdx++] ?? null;
            } else {
              let lit = token.replace(/^['"]|['"]$/g, '');
              if (/^\d+$/.test(lit)) lit = Number(lit);
              newObj[cols[i]] = lit;
            }
          }
        } else if (params.length > 0) {
          newObj.id = params[0];
          newObj.name = params[1] || 'Item';
          newObj.userId = params[params.length - 1] || DEFAULT_USER_ID;
          newObj.created = new Date().toISOString();
        }
        if (newObj.id) { store[table].push(newObj); saveStore(); }
      } else if (clean.toUpperCase().startsWith('UPDATE') && table) {
        const setMatch = clean.match(/UPDATE\s+[a-z0-9_]+\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
        if (setMatch) {
          const setTokens = setMatch[1].split(',').map(s => s.trim());
          const whereClause = setMatch[2];
          const numSetParams = setTokens.filter(s => s.includes('?')).length;
          const setParams = params.slice(0, numSetParams);
          const whereParams = params.slice(numSetParams);
          let targets = store[table] || [];
          if (whereClause.includes('id = ?')) {
            const id = whereParams[whereParams.length - 1] || whereParams[0];
            targets = targets.filter(r => r.id === id);
          } else if (/email/i.test(whereClause)) {
            const emailParam = whereParams[0];
            if (emailParam) targets = targets.filter(r => r.email && r.email.toLowerCase() === String(emailParam).toLowerCase());
          }
          let pIdx = 0;
          const updates = {};
          for (const token of setTokens) {
            const parts = token.split('=').map(p => p.trim());
            const col = parts[0].replace(/["`]/g, '');
            if (parts[1] === '?') {
              updates[col] = setParams[pIdx++];
            } else if (parts[1]) {
              let val = parts[1].replace(/^['"]|['"]$/g, '');
              if (/^\d+$/.test(val)) val = Number(val);
              updates[col] = val;
            }
          }
          for (const item of targets) Object.assign(item, updates);
          saveStore();
        }
      } else if (clean.toUpperCase().startsWith('DELETE') && table) {
        if (clean.includes('WHERE id = ?')) {
          const id = params[0];
          if (store[table]) { store[table] = store[table].filter(r => r.id !== id); saveStore(); }
        } else if (clean.includes('WHERE teamId = ?')) {
          const teamId = params[0];
          if (store[table]) { store[table] = store[table].filter(r => r.teamId !== teamId); saveStore(); }
        }
      }
      return { changes: 1 };
    }
  };
}

// ─── Database Schema & Seed ───────────────────────────────────────────────────
async function initDb(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'Member',
      orgName TEXT,
      orgId TEXT,
      created TEXT
    );
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      initials TEXT,
      company TEXT NOT NULL,
      title TEXT,
      email TEXT,
      phone TEXT,
      status TEXT,
      priority TEXT,
      score INTEGER DEFAULT 40,
      source TEXT,
      owner TEXT,
      ownerInitials TEXT,
      lastContact TEXT,
      nextFollowup TEXT,
      dealValue TEXT,
      dealValueNum INTEGER DEFAULT 0,
      probability INTEGER DEFAULT 20,
      created TEXT,
      industry TEXT,
      location TEXT,
      website TEXT,
      notes TEXT,
      businessDescription TEXT,
      companySize TEXT,
      annualRevenue TEXT,
      businessModel TEXT,
      userId TEXT,
      uploaded_at TEXT,
      batch_index INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      deal TEXT NOT NULL,
      company TEXT NOT NULL,
      value INTEGER DEFAULT 0,
      score INTEGER DEFAULT 50,
      priority TEXT,
      owner TEXT,
      ownerFull TEXT,
      close TEXT,
      last TEXT,
      next TEXT,
      stage TEXT,
      probability INTEGER DEFAULT 20,
      userId TEXT
    );
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      initials TEXT,
      company TEXT NOT NULL,
      title TEXT,
      email TEXT,
      phone TEXT,
      status TEXT,
      owner TEXT,
      totalRevenue TEXT,
      lastContact TEXT,
      joinDate TEXT,
      industry TEXT,
      location TEXT,
      userId TEXT
    );
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      industry TEXT,
      location TEXT,
      contacts INTEGER DEFAULT 0,
      deals INTEGER DEFAULT 0,
      revenue TEXT,
      website TEXT,
      status TEXT,
      userId TEXT
    );
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created TEXT,
      userId TEXT
    );
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      teamId TEXT NOT NULL,
      name TEXT NOT NULL,
      initials TEXT,
      role TEXT,
      email TEXT,
      phone TEXT,
      tag TEXT,
      leads INTEGER DEFAULT 0,
      calls INTEGER DEFAULT 0,
      meetings INTEGER DEFAULT 0,
      conv REAL DEFAULT 0,
      revenue INTEGER DEFAULT 0,
      won INTEGER DEFAULT 0,
      lost INTEGER DEFAULT 0,
      status TEXT,
      created TEXT,
      userId TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      linkedLead TEXT,
      dueDate TEXT,
      priority TEXT,
      owner TEXT,
      completed INTEGER DEFAULT 0,
      created TEXT,
      userId TEXT
    );
    CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      contact TEXT NOT NULL,
      company TEXT,
      date TEXT,
      time TEXT,
      duration TEXT,
      outcome TEXT,
      notes TEXT,
      owner TEXT,
      userId TEXT
    );
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      contact TEXT NOT NULL,
      company TEXT,
      date TEXT,
      time TEXT,
      duration TEXT,
      type TEXT,
      outcome TEXT,
      owner TEXT,
      attendees TEXT,
      userId TEXT
    );
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      contact TEXT NOT NULL,
      company TEXT,
      description TEXT,
      date TEXT,
      time TEXT,
      owner TEXT,
      userId TEXT
    );
    CREATE TABLE IF NOT EXISTS team (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      initials TEXT,
      role TEXT,
      email TEXT,
      phone TEXT,
      leads INTEGER DEFAULT 0,
      calls INTEGER DEFAULT 0,
      meetings INTEGER DEFAULT 0,
      conv REAL DEFAULT 0,
      revenue INTEGER DEFAULT 0,
      won INTEGER DEFAULT 0,
      lost INTEGER DEFAULT 0,
      status TEXT,
      userId TEXT
    );
    CREATE TABLE IF NOT EXISTS automations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger TEXT,
      action TEXT,
      status TEXT,
      triggered INTEGER DEFAULT 0,
      userId TEXT
    );
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      status TEXT,
      sent INTEGER DEFAULT 0,
      opened INTEGER DEFAULT 0,
      clicked INTEGER DEFAULT 0,
      openRate REAL DEFAULT 0,
      clickRate REAL DEFAULT 0,
      created TEXT,
      userId TEXT
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT,
      text TEXT,
      time TEXT,
      read INTEGER DEFAULT 0,
      userId TEXT
    );
    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      status INTEGER DEFAULT 0,
      description TEXT,
      apiKey TEXT,
      webhookUrl TEXT,
      config TEXT,
      lastSync TEXT,
      userId TEXT
    );
  `);

  // ── Column migrations (add if missing) ────────────────────────────────────
  try {
    const userCols = await db.all('PRAGMA table_info(users)');
    const userColNames = userCols.map(c => (c.name || '').toLowerCase());
    if (!userColNames.some(n => n === 'orgid' || n === 'orgId')) {
      await db.run('ALTER TABLE users ADD COLUMN orgId TEXT');
    }
    if (!userColNames.some(n => n === 'role')) {
      await db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'Member'");
    }
  } catch(e) {}

  try {
    await db.run(`UPDATE users SET orgId = ? WHERE (orgId IS NULL OR orgId = '')`, [DEFAULT_ORG_ID]);
  } catch(e) {}

  // Add userId to all tables if missing
  const allTables = ['leads', 'deals', 'customers', 'companies', 'teams', 'team_members', 'tasks', 'calls', 'meetings', 'activities', 'automations', 'campaigns', 'notifications', 'integrations'];
  for (const table of allTables) {
    try {
      const colInfo = await db.all(`PRAGMA table_info(${table})`);
      const colNames = (colInfo || []).map(c => (c.name || '').toLowerCase());
      if (colInfo && !colNames.some(n => n === 'userid')) {
        await db.run(`ALTER TABLE ${table} ADD COLUMN userId TEXT`);
      }
    } catch (e) {}
  }

  try {
    const leadCols = await db.all('PRAGMA table_info(leads)');
    const colNames = (leadCols || []).map(c => (c.name || '').toLowerCase());
    if (!colNames.includes('businessdescription') && !colNames.includes('businessDescription')) await db.run('ALTER TABLE leads ADD COLUMN businessDescription TEXT');
    if (!colNames.includes('companysize') && !colNames.includes('companySize')) await db.run('ALTER TABLE leads ADD COLUMN companySize TEXT');
    if (!colNames.includes('annualrevenue') && !colNames.includes('annualRevenue')) await db.run('ALTER TABLE leads ADD COLUMN annualRevenue TEXT');
    if (!colNames.includes('businessmodel') && !colNames.includes('businessModel')) await db.run('ALTER TABLE leads ADD COLUMN businessModel TEXT');
    if (!colNames.includes('ownerinitials') && !colNames.includes('ownerInitials')) await db.run('ALTER TABLE leads ADD COLUMN ownerInitials TEXT');
    if (!colNames.includes('uploaded_at') && !colNames.includes('uploadedat')) await db.run('ALTER TABLE leads ADD COLUMN uploaded_at TEXT');
    if (!colNames.includes('batch_index') && !colNames.includes('batchindex')) await db.run('ALTER TABLE leads ADD COLUMN batch_index INTEGER DEFAULT 0');
  } catch (e) {}

  // ── Seed tables from INITIAL_STORE (only when empty) ─────────────────────

  // Users
  const userCount = await db.get("SELECT COUNT(*) as count FROM users");
  if (userCount && Number(userCount.count) === 0) {
    for (const u of (INITIAL_STORE.users || [])) {
      try {
        await db.run(
          `INSERT INTO users (id, name, email, password, role, orgName, orgId, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [u.id, u.name, u.email, u.password, u.role, u.orgName, u.orgId || DEFAULT_ORG_ID, u.created || new Date().toISOString()]
        );
      } catch (e) {}
    }
  }

  // Integrations
  const intCount = await db.get("SELECT COUNT(*) as count FROM integrations");
  if (intCount && Number(intCount.count) === 0) {
    for (const item of (INITIAL_STORE.integrations || [])) {
      try {
        await db.run(
          `INSERT INTO integrations (id, name, category, status, description, apiKey, webhookUrl, config, lastSync, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.id, item.name, item.category || '', item.status ? 1 : 0, item.desc || item.description || '', item.apiKey || '', item.webhookUrl || '', item.config || '{}', item.lastSync || 'Never', item.userId || 'U-117bb402-3724-4580-9da9-01311b759889']
        );
      } catch (e) {}
    }
  }

  // Teams
  const teamCount = await db.get("SELECT COUNT(*) as count FROM teams");
  if (teamCount && Number(teamCount.count) === 0) {
    for (const t of (INITIAL_STORE.teams || [])) {
      try {
        await db.run(
          `INSERT INTO teams (id, name, description, created, userId) VALUES (?, ?, ?, ?, ?)`,
          [t.id, t.name, t.description || '', t.created, t.userId]
        );
      } catch (e) {}
    }
  }

  // Team members
  const tmCount = await db.get("SELECT COUNT(*) as count FROM team_members");
  if (tmCount && Number(tmCount.count) === 0) {
    for (const tm of (INITIAL_STORE.team_members || [])) {
      try {
        await db.run(
          `INSERT INTO team_members (id, teamId, name, initials, role, email, phone, tag, leads, calls, meetings, conv, revenue, won, lost, status, created, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [tm.id, tm.teamId, tm.name, tm.initials || '', tm.role || 'Member', tm.email || '', tm.phone || '', tm.tag || 'Member', tm.leads || 0, tm.calls || 0, tm.meetings || 0, tm.conv || 0, tm.revenue || 0, tm.won || 0, tm.lost || 0, tm.status || 'Active', tm.created, tm.userId]
        );
      } catch (e) {}
    }
  }

  // Leads
  const leadCount = await db.get("SELECT COUNT(*) as count FROM leads");
  if (leadCount && Number(leadCount.count) === 0) {
    if (INITIAL_STORE.leads && INITIAL_STORE.leads.length > 0) {
      console.log(`Seeding ${INITIAL_STORE.leads.length} leads from INITIAL_STORE...`);
    }
    for (const l of (INITIAL_STORE.leads || [])) {
      try {
        await db.run(
          `INSERT INTO leads (id, name, initials, company, title, email, phone, status, priority, score, source, owner, ownerInitials, lastContact, nextFollowup, dealValue, dealValueNum, probability, created, industry, location, website, notes, businessDescription, companySize, annualRevenue, businessModel, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [l.id, l.name, l.initials || '', l.company, l.title || '', l.email || '', l.phone || '', l.status || 'New', l.priority || 'Medium', l.score ?? 50, l.source || '', l.owner || '', l.ownerInitials || '', l.lastContact || '', l.nextFollowup || 'Not scheduled', l.dealValue || '₹0', l.dealValueNum ?? 0, l.probability ?? 100, l.created || '', l.industry || '', l.location || '', l.website || '', l.notes || '', l.businessDescription || '', l.companySize || '', l.annualRevenue || '', l.businessModel || '', l.userId || 'U-117bb402-3724-4580-9da9-01311b759889']
        );
      } catch (e) {}
    }
  }

  // Calls
  const callCount = await db.get("SELECT COUNT(*) as count FROM calls");
  if (callCount && Number(callCount.count) === 0) {
    for (const cl of (INITIAL_STORE.calls || [])) {
      try {
        await db.run(
          `INSERT INTO calls (id, contact, company, date, time, duration, outcome, notes, owner, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [cl.id, cl.contact, cl.company || '', cl.date, cl.time || '', cl.duration || '', cl.outcome || '', cl.notes || '', cl.owner || '', cl.userId || 'U-117bb402-3724-4580-9da9-01311b759889']
        );
      } catch (e) {}
    }
  }

  // Activities
  const actCount = await db.get("SELECT COUNT(*) as count FROM activities");
  if (actCount && Number(actCount.count) === 0) {
    for (const a of (INITIAL_STORE.activities || [])) {
      try {
        await db.run(
          `INSERT INTO activities (id, type, contact, company, description, date, time, owner, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [a.id, a.type, a.contact, a.company || '', a.description || '', a.date, a.time || '', a.owner || '', a.userId || 'U-117bb402-3724-4580-9da9-01311b759889']
        );
      } catch (e) {}
    }
  }

  // Fix any rows with NULL or legacy userId
  const fixTables = ['leads', 'deals', 'customers', 'companies', 'teams', 'team_members', 'tasks', 'calls', 'meetings', 'activities', 'automations', 'campaigns', 'notifications', 'integrations'];
  for (const table of fixTables) {
    try {
      await db.run(`UPDATE ${table} SET userId = 'U-117bb402-3724-4580-9da9-01311b759889' WHERE userId IS NULL OR userId = 'U-admin'`);
    } catch (e) {}
  }

  // Remove any empty or missing phone leads
  try {
    await db.run("DELETE FROM leads WHERE phone IS NULL OR TRIM(phone) = ''");
  } catch (e) {}

  console.log('✅ Database initialized and seeded');
}
