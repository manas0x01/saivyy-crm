import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  let dbPath = path.join(__dirname, 'crm.sqlite');

  // On Vercel / serverless environment, copy DB to writable /tmp directory
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    const tmpPath = path.join('/tmp', 'crm.sqlite');
    try {
      if (!fs.existsSync(tmpPath) && fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, tmpPath);
      }
      dbPath = tmpPath;
    } catch (e) {
      console.warn("Could not copy sqlite DB to /tmp, using default path:", e);
    }
  }

  try {
    dbInstance = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  } catch (err) {
    console.warn("Failed to open file-based SQLite, trying in-memory SQLite fallback:", err);
    dbInstance = await open({
      filename: ':memory:',
      driver: sqlite3.Database
    });
  }

  await initDb(dbInstance);
  return dbInstance;
}

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

  // Migrate users table: add orgId column if missing
  try {
    const userCols = await db.all('PRAGMA table_info(users)');
    if (!userCols.some(c => c.name === 'orgId')) {
      await db.run('ALTER TABLE users ADD COLUMN orgId TEXT');
      console.log('Added orgId column to users table');
    }
    if (!userCols.some(c => c.name === 'role')) {
      await db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'Member'");
    }
  } catch(e) { console.error('users migration:', e); }

  const DEFAULT_ORG_ID = 'ORG-saivyy-default';
  // Backfill orgId for existing users if missing
  await db.run(`UPDATE users SET orgId = ? WHERE (orgId IS NULL OR orgId = '')`, [DEFAULT_ORG_ID]);

  // Ensure column migrations on all CRM tables
  const tables = [
    'leads', 'deals', 'customers', 'companies', 'teams', 'team_members',
    'tasks', 'calls', 'meetings', 'activities', 'automations', 'campaigns',
    'notifications', 'integrations'
  ];

  for (const table of tables) {
    try {
      const colInfo = await db.all(`PRAGMA table_info(${table})`);
      const hasUserId = colInfo.some(c => c.name === 'userId');
      if (!hasUserId) {
        await db.run(`ALTER TABLE ${table} ADD COLUMN userId TEXT`);
        console.log(`Added column userId to table ${table}`);
      }
    } catch (e) {
      console.error(`Migration error for ${table}:`, e);
    }
  }

  // Migrate leads table: add business details columns if missing
  try {
    const leadCols = await db.all('PRAGMA table_info(leads)');
    const colNames = leadCols.map(c => c.name);
    if (!colNames.includes('businessDescription')) await db.run('ALTER TABLE leads ADD COLUMN businessDescription TEXT');
    if (!colNames.includes('companySize')) await db.run('ALTER TABLE leads ADD COLUMN companySize TEXT');
    if (!colNames.includes('annualRevenue')) await db.run('ALTER TABLE leads ADD COLUMN annualRevenue TEXT');
    if (!colNames.includes('businessModel')) await db.run('ALTER TABLE leads ADD COLUMN businessModel TEXT');
  } catch (e) {
    console.error('Leads business details migration error:', e);
  }

  // Set default userId for existing records to Manas Saxena
  for (const table of tables) {
    try {
      await db.run(`UPDATE ${table} SET userId = 'U-117bb402-3724-4580-9da9-01311b759889' WHERE userId IS NULL OR userId = 'U-admin'`);
    } catch (e) {
      console.error(`Failed to seed userId for table ${table}:`, e);
    }
  }

  await db.run(
    `UPDATE leads
     SET dealValue = '₹0', dealValueNum = 0, probability = 100
     WHERE notes LIKE 'Imported via %'
       AND dealValueNum = 500000
       AND probability = 20`
  );



  // Seed default integrations if empty
  const intCount = await db.get("SELECT COUNT(*) as count FROM integrations");
  if (intCount.count === 0) {
    const defaultIntegrations = [
      { id: "whatsapp", name: "WhatsApp Business API", category: "Messaging", status: 1, desc: "Send automated WhatsApp follow-ups, template messages, and interactive chat responses.", apiKey: "wa_live_94821048", webhookUrl: "https://api.ledgercrm.com/v1/webhooks/whatsapp", config: JSON.stringify({ phoneNumber: "+91 98000 11111", template: "Lead Welcome Sequence" }), lastSync: "5 mins ago" },
      { id: "meta_leads", name: "Meta Lead Ads (Facebook & IG)", category: "Lead Capture", status: 1, desc: "Instantly capture incoming leads from Facebook and Instagram lead ad campaigns.", apiKey: "meta_access_token_84920", webhookUrl: "https://api.ledgercrm.com/v1/webhooks/meta-leads", config: JSON.stringify({ pageId: "1094820194", formId: "492810" }), lastSync: "12 mins ago" },
      { id: "linkedin", name: "LinkedIn Sales Navigator", category: "Social Selling", status: 1, desc: "Import company profiles, Decision Maker contacts, and sync InMail conversations.", apiKey: "li_oauth_token_94812", webhookUrl: "https://api.ledgercrm.com/v1/webhooks/linkedin", config: JSON.stringify({ syncInMail: true }), lastSync: "1 hour ago" },
      { id: "gmail", name: "Google Workspace / Gmail", category: "Email Sync", status: 1, desc: "2-way sync for customer emails, Google Meet links, and Google Calendar invites.", apiKey: "gm_live_94827041823901", webhookUrl: "https://api.ledgercrm.com/v1/webhooks/gmail", config: JSON.stringify({ autoSync: true, syncInterval: "5 mins" }), lastSync: "2 mins ago" },
      { id: "outlook", name: "Microsoft Outlook 365", category: "Email & Calendar", status: 0, desc: "Sync Outlook emails, Microsoft Teams call recordings, and O365 calendar events.", apiKey: "", webhookUrl: "", config: JSON.stringify({ tenantId: "" }), lastSync: "Never" },
      { id: "twilio", name: "Twilio Voice & SMS", category: "Telephony", status: 1, desc: "One-click click-to-call, SMS drip sequences, and automatic call recording sync.", apiKey: "AC948201948102948120", webhookUrl: "https://api.ledgercrm.com/v1/webhooks/twilio", config: JSON.stringify({ twilioNumber: "+1 800 555 0199" }), lastSync: "30 mins ago" },
      { id: "exotel", name: "Exotel / Cloud Telephony", category: "Telephony", status: 0, desc: "Cloud telephony IVR integration for Indian virtual sales call tracking and recording.", apiKey: "", webhookUrl: "", config: JSON.stringify({ sid: "" }), lastSync: "Never" },
      { id: "slack", name: "Slack Deal Alerts", category: "Alerts", status: 1, desc: "Post real-time deal stage changes and won revenue alerts to #sales-wins.", apiKey: "xoxb-948291048-sales-bot", webhookUrl: "https://hooks.slack.com/services/T00/B00/XXXX", config: JSON.stringify({ channel: "#sales-wins", notifyDeals: true }), lastSync: "10 mins ago" },
      { id: "calendly", name: "Calendly Meeting Sync", category: "Calendar", status: 1, desc: "Automatically create meeting events and contacts when prospects book a slot.", apiKey: "cal_live_948102948", webhookUrl: "https://api.ledgercrm.com/v1/webhooks/calendly", config: JSON.stringify({ eventType: "30min Demo" }), lastSync: "15 mins ago" },
      { id: "razorpay", name: "Razorpay Payments & Invoices", category: "Billing", status: 1, desc: "Generate payment links, track customer invoice statuses, and log payments automatically.", apiKey: "rzp_live_948102948", webhookUrl: "https://api.ledgercrm.com/v1/webhooks/razorpay", config: JSON.stringify({ autoReceipt: true }), lastSync: "45 mins ago" },
      { id: "stripe", name: "Stripe Subscriptions", category: "Billing", status: 0, desc: "Track customer subscription plans, recurring invoices, and MRR inside CRM.", apiKey: "", webhookUrl: "", config: JSON.stringify({ mode: "live" }), lastSync: "Never" },
      { id: "mailchimp", name: "Mailchimp & Brevo", category: "Email Marketing", status: 0, desc: "Sync CRM contacts with marketing subscriber lists and automated newsletters.", apiKey: "", webhookUrl: "", config: JSON.stringify({ listId: "" }), lastSync: "Never" },
      { id: "typeform", name: "Typeform / Google Forms", category: "Lead Capture", status: 1, desc: "Convert form entries directly into scored leads in your sales pipeline.", apiKey: "tf_live_948102", webhookUrl: "https://api.ledgercrm.com/v1/webhooks/typeform", config: JSON.stringify({ formId: "contact-form-1" }), lastSync: "2 hours ago" },
      { id: "zapier", name: "Zapier Automations", category: "Workflow", status: 1, desc: "Connect Ledger CRM with 5,000+ web apps seamlessly.", apiKey: "zap_live_83921048", webhookUrl: "https://hooks.zapier.com/hooks/catch/123/abc", config: JSON.stringify({ activeZaps: 4 }), lastSync: "1 hour ago" },
      { id: "make", name: "Make.com (Integromat)", category: "Workflow", status: 0, desc: "Visual scenario builder for multi-step data pipelines and webhook routing.", apiKey: "", webhookUrl: "", config: JSON.stringify({ scenarioId: "" }), lastSync: "Never" },
      { id: "openai", name: "OpenAI GPT-4o Sales Copilot", category: "AI & Intelligence", status: 1, desc: "Generate AI email drafts, call summaries, and buyer sentiment analysis.", apiKey: "sk-proj-openai-live-key", webhookUrl: "", config: JSON.stringify({ model: "gpt-4o" }), lastSync: "Active" },
      { id: "fireflies", name: "Fireflies.ai / Otter.ai", category: "AI & Intelligence", status: 0, desc: "Automatically record, transcribe, and extract action items from video calls.", apiKey: "", webhookUrl: "", config: JSON.stringify({ autoJoin: true }), lastSync: "Never" },
      { id: "hubspot", name: "HubSpot Data Migration", category: "Data Sync", status: 0, desc: "Import legacy HubSpot contacts, historical deal logs, and notes.", apiKey: "", webhookUrl: "", config: JSON.stringify({ portalId: "" }), lastSync: "Never" }
    ];

    for (const item of defaultIntegrations) {
      await db.run(
        `INSERT INTO integrations (id, name, category, status, desc, apiKey, webhookUrl, config, lastSync)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, item.name, item.category, item.status, item.desc, item.apiKey, item.webhookUrl, item.config, item.lastSync]
      );
    }
  }

  // Seed other tables if empty
  const leadCount = await db.get("SELECT COUNT(*) as count FROM leads");
  if (leadCount.count === 0) {
    const seedData = (await import('../src/data/seed.js'));
    
    // Seed leads
    for (const l of seedData.LEADS_SEED) {
      await db.run(
        `INSERT INTO leads (id, name, initials, company, title, email, phone, status, priority, score, source, owner, ownerInitials, lastContact, nextFollowup, dealValue, dealValueNum, probability, created, industry, location, website, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [l.id, l.name, l.initials, l.company, l.title, l.email, l.phone, l.status, l.priority, l.score, l.source, l.owner, l.ownerInitials, l.lastContact, l.nextFollowup, l.dealValue, l.dealValueNum, l.probability, l.created, l.industry, l.location, l.website, l.notes || '']
      );
    }

    // Seed deals
    for (const d of seedData.DEALS_SEED) {
      await db.run(
        `INSERT INTO deals (id, deal, company, value, score, priority, owner, ownerFull, close, last, next, stage, probability)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.id, d.deal, d.company, d.value, d.score, d.priority, d.owner, d.ownerFull, d.close, d.last, d.next, d.stage, d.probability]
      );
    }

    // Seed customers
    for (const c of seedData.CUSTOMERS_SEED) {
      await db.run(
        `INSERT INTO customers (id, name, initials, company, title, email, phone, status, owner, totalRevenue, lastContact, joinDate, industry, location)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.name, c.initials, c.company, c.title, c.email, c.phone, c.status, c.owner, c.totalRevenue, c.lastContact, c.joinDate, c.industry, c.location]
      );
    }

    // Seed companies
    for (const co of seedData.COMPANIES_SEED) {
      await db.run(
        `INSERT INTO companies (id, name, industry, location, contacts, deals, revenue, website, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [co.id, co.name, co.industry, co.location, co.contacts, co.deals, co.revenue, co.website, co.status]
      );
    }

    // Seed tasks
    for (const t of seedData.TASKS_SEED) {
      await db.run(
        `INSERT INTO tasks (id, title, linkedLead, dueDate, priority, owner, completed, created)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.title, t.linkedLead, t.dueDate, t.priority, t.owner, t.completed ? 1 : 0, t.created]
      );
    }

    // Seed calls
    for (const cl of seedData.CALLS_SEED) {
      await db.run(
        `INSERT INTO calls (id, contact, company, date, time, duration, outcome, notes, owner)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cl.id, cl.contact, cl.company, cl.date, cl.time, cl.duration, cl.outcome, cl.notes, cl.owner]
      );
    }

    // Seed meetings
    for (const m of seedData.MEETINGS_SEED) {
      await db.run(
        `INSERT INTO meetings (id, title, contact, company, date, time, duration, type, outcome, owner, attendees)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [m.id, m.title, m.contact, m.company, m.date, m.time, m.duration, m.type, m.outcome, m.owner, JSON.stringify(m.attendees || [])]
      );
    }

    // Seed activities
    for (const a of seedData.ACTIVITIES_SEED) {
      await db.run(
        `INSERT INTO activities (id, type, contact, company, description, date, time, owner)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.id, a.type, a.contact, a.company, a.description, a.date, a.time, a.owner]
      );
    }



    // Seed automations
    for (const au of seedData.AUTOMATIONS_SEED) {
      await db.run(
        `INSERT INTO automations (id, name, trigger, action, status, triggered)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [au.id, au.name, au.trigger, au.action, au.status, au.triggered]
      );
    }

    // Seed campaigns
    for (const cam of seedData.CAMPAIGNS_SEED) {
      await db.run(
        `INSERT INTO campaigns (id, name, type, status, sent, opened, clicked, openRate, clickRate, created)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cam.id, cam.name, cam.type, cam.status, cam.sent, cam.opened, cam.clicked, cam.openRate, cam.clickRate, cam.created]
      );
    }

    // Seed notifications
    await db.run(`INSERT INTO notifications (id, type, text, time, read) VALUES ('N-1', 'alert', 'Deal Kavach ERP Rollout idle for 8 days', '2h ago', 0)`);
    await db.run(`INSERT INTO notifications (id, type, text, time, read) VALUES ('N-2', 'task', '3 tasks are overdue today', '4h ago', 0)`);
  }
}
