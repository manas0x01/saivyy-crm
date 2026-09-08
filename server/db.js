import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { INITIAL_STORE } from './initialStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;
const DEFAULT_ORG_ID = 'ORG-saivyy-default';

// ─── 1. TURSO (libSQL) Cloud Adapter ─────────────────────────────────────────
async function loadTursoDriver() {
  try {
    const libsql = await import('@libsql/client');
    return libsql;
  } catch (err) {
    console.warn('libsql client not available:', err?.message || err);
    return null;
  }
}

function rowToPlain(row) {
  if (!row) return undefined;
  const obj = {};
  for (const key of Object.keys(row)) {
    obj[key] = row[key];
  }
  return obj;
}

function createTursoAdapter(client) {
  return {
    _isTurso: true,

    async exec(sql) {
      const stmts = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => ({ sql: s, args: [] }));
      if (stmts.length > 0) {
        try {
          await client.batch(stmts, 'write');
        } catch (e) {
          for (const stmt of stmts) {
            try { await client.execute(stmt); } catch (_) {}
          }
        }
      }
      return true;
    },

    async get(sql, params = []) {
      try {
        const result = await client.execute({ sql, args: params });
        if (!result.rows || result.rows.length === 0) return undefined;
        return rowToPlain(result.rows[0]);
      } catch (e) {
        console.error('Turso get error:', e?.message, sql);
        return undefined;
      }
    },

    async all(sql, params = []) {
      try {
        const result = await client.execute({ sql, args: params });
        return (result.rows || []).map(rowToPlain);
      } catch (e) {
        console.error('Turso all error:', e?.message, sql);
        return [];
      }
    },

    async run(sql, params = []) {
      try {
        const result = await client.execute({ sql, args: params });
        return { changes: result.rowsAffected || 1, lastID: Number(result.lastInsertRowid || 0) };
      } catch (e) {
        console.error('Turso run error:', e?.message, sql);
        return { changes: 0 };
      }
    }
  };
}

// ─── 2. Local SQLite Driver ───────────────────────────────────────────────────
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

// ─── 3. Main getDb() — priority: Turso > local SQLite > in-memory fallback ──
export async function getDb() {
  if (dbInstance) return dbInstance;

  // Priority 1: Turso cloud database (for Vercel production)
  if (process.env.TURSO_DATABASE_URL) {
    console.log('Connecting to Turso cloud database...');
    const tursoMod = await loadTursoDriver();
    if (tursoMod && tursoMod.createClient) {
      try {
        const client = tursoMod.createClient({
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN || '',
        });
        dbInstance = createTursoAdapter(client);
        await initDb(dbInstance);
        console.log('Turso cloud database connected and initialized');
        return dbInstance;
      } catch (e) {
        console.error('Turso connection failed, falling back:', e?.message);
        dbInstance = null;
      }
    }
  }

  // Priority 2: Local SQLite file
  const driverObj = await loadSqliteDriver();

  if (driverObj && driverObj.open && driverObj.sqlite3) {
    let dbPath = path.join(__dirname, 'crm.sqlite');

    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      const tmpPath = path.join('/tmp', 'crm.sqlite');
      try {
        if (!fs.existsSync(tmpPath) && fs.existsSync(dbPath)) {
          fs.copyFileSync(dbPath, tmpPath);
        }
        dbPath = tmpPath;
      } catch (e) {
        console.warn('Could not copy sqlite DB to /tmp:', e);
      }
    }

    try {
      dbInstance = await driverObj.open({
        filename: dbPath,
        driver: driverObj.sqlite3.Database
      });
      await initDb(dbInstance);
      return dbInstance;
    } catch (err) {
      console.warn('File SQLite failed, trying in-memory:', err);
      try {
        dbInstance = await driverObj.open({
          filename: ':memory:',
          driver: driverObj.sqlite3.Database
        });
        await initDb(dbInstance);
        return dbInstance;
      } catch (memErr) {
        console.warn('In-memory sqlite failed:', memErr);
      }
    }
  }

  // Priority 3: Pure JS in-memory fallback
  console.log('Using in-memory JS fallback store');
  dbInstance = createMemoryFallbackDb();
  return dbInstance;
}

// ─── 4. JS In-Memory Fallback ─────────────────────────────────────────────────
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
    } else if (clean.includes('ORDER BY rowid DESC')) {
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
        if (newObj.id) { store[table].unshift(newObj); saveStore(); }
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

// ─── 5. Database Schema & Seed ────────────────────────────────────────────────
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
      userId TEXT
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
      desc TEXT,
      apiKey TEXT,
      webhookUrl TEXT,
      config TEXT,
      lastSync TEXT,
      userId TEXT
    );
  `);

  // Migrate users table (local SQLite only)
  try {
    const userCols = await db.all('PRAGMA table_info(users)');
    if (!userCols.some(c => c.name === 'orgId')) {
      await db.run('ALTER TABLE users ADD COLUMN orgId TEXT');
    }
    if (!userCols.some(c => c.name === 'role')) {
      await db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'Member'");
    }
  } catch(e) {}

  try {
    await db.run(`UPDATE users SET orgId = ? WHERE (orgId IS NULL OR orgId = '')`, [DEFAULT_ORG_ID]);
  } catch(e) {}

  // Column migrations for local SQLite
  if (!db._isTurso) {
    const tables = ['leads', 'deals', 'customers', 'companies', 'teams', 'team_members', 'tasks', 'calls', 'meetings', 'activities', 'automations', 'campaigns', 'notifications', 'integrations'];
    for (const table of tables) {
      try {
        const colInfo = await db.all(`PRAGMA table_info(${table})`);
        if (!colInfo.some(c => c.name === 'userId')) {
          await db.run(`ALTER TABLE ${table} ADD COLUMN userId TEXT`);
        }
      } catch (e) {}
    }
    try {
      const leadCols = await db.all('PRAGMA table_info(leads)');
      const colNames = leadCols.map(c => c.name);
      if (!colNames.includes('businessDescription')) await db.run('ALTER TABLE leads ADD COLUMN businessDescription TEXT');
      if (!colNames.includes('companySize')) await db.run('ALTER TABLE leads ADD COLUMN companySize TEXT');
      if (!colNames.includes('annualRevenue')) await db.run('ALTER TABLE leads ADD COLUMN annualRevenue TEXT');
      if (!colNames.includes('businessModel')) await db.run('ALTER TABLE leads ADD COLUMN businessModel TEXT');
    } catch (e) {}
  }

  // Set default userId
  const crmTables = ['leads', 'deals', 'customers', 'companies', 'teams', 'team_members', 'tasks', 'calls', 'meetings', 'activities', 'automations', 'campaigns', 'notifications', 'integrations'];
  for (const table of crmTables) {
    try {
      await db.run(`UPDATE ${table} SET userId = 'U-117bb402-3724-4580-9da9-01311b759889' WHERE userId IS NULL OR userId = 'U-admin'`);
    } catch (e) {}
  }

  // Seed users if empty
  const userCount = await db.get("SELECT COUNT(*) as count FROM users");
  if (userCount && userCount.count === 0) {
    for (const u of (INITIAL_STORE.users || [])) {
      try {
        await db.run(
          `INSERT INTO users (id, name, email, password, role, orgName, orgId, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [u.id, u.name, u.email, u.password, u.role, u.orgName, u.orgId || DEFAULT_ORG_ID, u.created || new Date().toISOString()]
        );
      } catch (e) {}
    }
  }

  // Seed integrations if empty
  const intCount = await db.get("SELECT COUNT(*) as count FROM integrations");
  if (intCount && intCount.count === 0) {
    const defaultIntegrations = [
      { id: "whatsapp", name: "WhatsApp Business API", category: "Messaging", status: 1, desc: "Send automated WhatsApp follow-ups.", apiKey: "wa_live_94821048", webhookUrl: "https://api.ledgercrm.com/v1/webhooks/whatsapp", config: "{}", lastSync: "5 mins ago" },
      { id: "meta_leads", name: "Meta Lead Ads", category: "Lead Capture", status: 1, desc: "Capture leads from Facebook and Instagram.", apiKey: "meta_access_token_84920", webhookUrl: "https://api.ledgercrm.com/v1/webhooks/meta-leads", config: "{}", lastSync: "12 mins ago" },
      { id: "gmail", name: "Google Workspace / Gmail", category: "Email Sync", status: 1, desc: "2-way sync for customer emails.", apiKey: "gm_live_94827041823901", webhookUrl: "https://api.ledgercrm.com/v1/webhooks/gmail", config: "{}", lastSync: "2 mins ago" },
      { id: "twilio", name: "Twilio Voice & SMS", category: "Telephony", status: 1, desc: "Click-to-call and SMS sequences.", apiKey: "AC948201948102948120", webhookUrl: "https://api.ledgercrm.com/v1/webhooks/twilio", config: "{}", lastSync: "30 mins ago" },
      { id: "slack", name: "Slack Deal Alerts", category: "Alerts", status: 1, desc: "Post deal stage changes to Slack.", apiKey: "xoxb-948291048-sales-bot", webhookUrl: "https://hooks.slack.com/services/T00/B00/XXXX", config: "{}", lastSync: "10 mins ago" },
      { id: "openai", name: "OpenAI GPT-4o Sales Copilot", category: "AI & Intelligence", status: 1, desc: "Generate AI email drafts and summaries.", apiKey: "sk-proj-openai-live-key", webhookUrl: "", config: "{}", lastSync: "Active" },
      { id: "razorpay", name: "Razorpay Payments & Invoices", category: "Billing", status: 1, desc: "Generate payment links and track invoices.", apiKey: "rzp_live_948102948", webhookUrl: "https://api.ledgercrm.com/v1/webhooks/razorpay", config: "{}", lastSync: "45 mins ago" },
      { id: "zapier", name: "Zapier Automations", category: "Workflow", status: 1, desc: "Connect CRM with 5,000+ web apps.", apiKey: "zap_live_83921048", webhookUrl: "https://hooks.zapier.com/hooks/catch/123/abc", config: "{}", lastSync: "1 hour ago" },
    ];
    for (const item of defaultIntegrations) {
      try {
        await db.run(
          `INSERT INTO integrations (id, name, category, status, desc, apiKey, webhookUrl, config, lastSync, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.id, item.name, item.category, item.status, item.desc, item.apiKey, item.webhookUrl, item.config, item.lastSync, 'U-117bb402-3724-4580-9da9-01311b759889']
        );
      } catch (e) {}
    }
  }

  // Seed leads if empty
  const leadCount = await db.get("SELECT COUNT(*) as count FROM leads");
  if (leadCount && leadCount.count === 0 && INITIAL_STORE.leads && INITIAL_STORE.leads.length > 0) {
    console.log(`Seeding ${INITIAL_STORE.leads.length} leads...`);
    for (const l of INITIAL_STORE.leads) {
      try {
        await db.run(
          `INSERT INTO leads (id, name, initials, company, title, email, phone, status, priority, score, source, owner, ownerInitials, lastContact, nextFollowup, dealValue, dealValueNum, probability, created, industry, location, website, notes, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [l.id, l.name, l.initials, l.company, l.title, l.email, l.phone, l.status, l.priority, l.score, l.source, l.owner, l.ownerInitials, l.lastContact, l.nextFollowup, l.dealValue, l.dealValueNum, l.probability, l.created, l.industry, l.location, l.website, l.notes || '', l.userId]
        );
      } catch (e) {}
    }
    if (INITIAL_STORE.teams) {
      for (const t of INITIAL_STORE.teams) {
        try {
          await db.run(`INSERT INTO teams (id, name, description, created, userId) VALUES (?, ?, ?, ?, ?)`, [t.id, t.name, t.description, t.created, t.userId]);
        } catch (e) {}
      }
    }
    if (INITIAL_STORE.team_members) {
      for (const tm of INITIAL_STORE.team_members) {
        try {
          await db.run(
            `INSERT INTO team_members (id, teamId, name, initials, role, email, phone, tag, leads, calls, meetings, conv, revenue, won, lost, status, created, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tm.id, tm.teamId, tm.name, tm.initials, tm.role, tm.email, tm.phone, tm.tag, tm.leads, tm.calls, tm.meetings, tm.conv, tm.revenue, tm.won, tm.lost, tm.status, tm.created, tm.userId]
          );
        } catch (e) {}
      }
    }
    if (INITIAL_STORE.activities) {
      for (const a of INITIAL_STORE.activities) {
        try {
          await db.run(`INSERT INTO activities (id, type, contact, company, description, date, time, owner, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [a.id, a.type, a.contact, a.company, a.description, a.date, a.time, a.owner, a.userId]);
        } catch (e) {}
      }
    }
    if (INITIAL_STORE.calls) {
      for (const cl of INITIAL_STORE.calls) {
        try {
          await db.run(`INSERT INTO calls (id, contact, company, date, time, duration, outcome, notes, owner, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [cl.id, cl.contact, cl.company, cl.date, cl.time, cl.duration, cl.outcome, cl.notes, cl.owner, cl.userId]);
        } catch (e) {}
      }
    }
  }
}
