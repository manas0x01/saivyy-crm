import Database from 'sqlite3';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DB_PATH = 'C:/Users/Manas/Desktop/crm/saivyy-crm.db';
const TARGET_DB_PATH = path.join(__dirname, 'crm.sqlite');
const INITIAL_STORE_PATH = path.join(__dirname, 'initialStore.js');

async function sync() {
  console.log('--- Reading source database: saivyy-crm.db ---');
  const srcDb = new Database.Database(SOURCE_DB_PATH);
  const all = promisify(srcDb.all.bind(srcDb));

  const tables = [
    'users',
    'leads',
    'deals',
    'customers',
    'companies',
    'teams',
    'team_members',
    'tasks',
    'calls',
    'meetings',
    'activities',
    'team',
    'automations',
    'campaigns',
    'notifications',
    'integrations'
  ];

  const fullStore = {};

  for (const table of tables) {
    try {
      const rows = await all(`SELECT * FROM ${table}`);
      fullStore[table] = rows || [];
      console.log(`Table '${table}': ${fullStore[table].length} rows`);
    } catch (e) {
      console.warn(`Table '${table}' query error: ${e.message}`);
      fullStore[table] = [];
    }
  }

  srcDb.close();

  // If team is empty but team_members has entries, populate team as well
  if (fullStore.team.length === 0 && fullStore.team_members.length > 0) {
    fullStore.team = fullStore.team_members.map(tm => ({
      id: tm.id,
      name: tm.name,
      initials: tm.initials || '',
      role: tm.role || 'Member',
      email: tm.email || '',
      phone: tm.phone || '',
      leads: tm.leads || 0,
      calls: tm.calls || 0,
      meetings: tm.meetings || 0,
      conv: tm.conv || 0,
      revenue: tm.revenue || 0,
      won: tm.won || 0,
      lost: tm.lost || 0,
      status: tm.status || 'Active',
      userId: tm.userId || 'U-117bb402-3724-4580-9da9-01311b759889'
    }));
  }

  // Generate initialStore.js file content
  console.log('Writing comprehensive data to initialStore.js...');
  const initialStoreContent = `// Auto-generated INITIAL_STORE seeded from saivyy-crm.db\nexport const INITIAL_STORE = ${JSON.stringify(fullStore, null, 2)};\n`;
  fs.writeFileSync(INITIAL_STORE_PATH, initialStoreContent, 'utf8');
  console.log('initialStore.js updated successfully!');

  // Copy saivyy-crm.db directly to crm.sqlite
  console.log('Copying saivyy-crm.db to crm.sqlite...');
  try {
    fs.copyFileSync(SOURCE_DB_PATH, TARGET_DB_PATH);
    console.log('Copied saivyy-crm.db directly to server/crm.sqlite successfully!');
  } catch (err) {
    console.warn('Direct file copy failed (might be file locked):', err.message);
    console.log('Writing directly via sqlite connection instead...');
  }
}

sync().catch(err => console.error('Error:', err));
