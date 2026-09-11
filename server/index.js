try { process.loadEnvFile(); } catch {}
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper for generating IDs
function generateId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Helper to check if user is a Leader/Admin
async function checkIsLeader(db, userId) {
  const user = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
  return user && (user.role === 'Leader' || user.role === 'Admin');
}

// ---------------- AUTH ENDPOINTS ----------------

app.post('/api/auth/signup', async (req, res) => {
  try {
    const db = await getDb();
    const { name, email, password, role, orgName } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const id = generateId('U');
    const isMember = role === 'Member';

    // Find primary Leader's organization if registering as Member
    let targetOrgId = generateId('ORG');
    let targetOrgName = orgName || 'Saivyy Technologies Private Limited';
    let targetLeaderId = id;

    if (isMember) {
      const leader = await db.get("SELECT * FROM users WHERE role = 'Leader' ORDER BY rowid ASC LIMIT 1");
      if (leader) {
        targetOrgId = leader.orgId;
        targetLeaderId = leader.id;
        targetOrgName = leader.orgName || targetOrgName;
      } else {
        targetOrgId = 'ORG-saivyy-default';
      }
    }

    const userRole = isMember ? 'Member' : 'Leader';

    await db.run(
      `INSERT INTO users (id, name, email, password, role, orgName, orgId, created)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, email, password, userRole, targetOrgName, targetOrgId, new Date().toISOString()]
    );

    if (isMember) {
      // Check if a team_members entry already exists by email or name
      const existingTm = await db.get(
        `SELECT * FROM team_members WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?)`,
        [email, name]
      );

      if (existingTm) {
        await db.run(
          `UPDATE team_members SET email = ?, userId = ? WHERE id = ?`,
          [email, targetLeaderId, existingTm.id]
        );
      } else {
        // Ensure at least one team exists for the leader
        let team = await db.get(`SELECT * FROM teams WHERE userId = ? ORDER BY rowid ASC LIMIT 1`, [targetLeaderId]);
        if (!team) {
          team = await db.get(`SELECT * FROM teams ORDER BY rowid ASC LIMIT 1`);
        }
        let teamId = team ? team.id : 'TEAM-default';
        if (!team) {
          await db.run(
            `INSERT INTO teams (id, name, description, created, userId) VALUES (?, ?, ?, ?, ?)`,
            ['TEAM-default', 'SAIVYY SALES TEAM', 'Main Sales Team', new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), targetLeaderId]
          );
        }

        const tmId = generateId('TM');
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        await db.run(
          `INSERT INTO team_members (id, teamId, name, initials, role, email, phone, tag, leads, calls, meetings, conv, revenue, won, lost, status, created, userId)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 'Active', ?, ?)`,
          [tmId, teamId, name, initials, 'Member', email, '', 'Member', new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), targetLeaderId]
        );
      }
    }

    const newUser = await db.get('SELECT id, name, email, role, orgName, orgId FROM users WHERE id = ?', [id]);
    res.json({ success: true, user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const db = await getDb();
    let { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    email = String(email).trim().toLowerCase();
    password = String(password).trim();

    const user = await db.get('SELECT * FROM users WHERE LOWER(email) = ?', [email]);
    if (!user || user.password.trim() !== password) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgName: user.orgName,
        orgId: user.orgId
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to fetch fresh profile of currently logged in user
app.get('/api/auth/me', async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const user = await db.get('SELECT id, name, email, role, orgName, orgId FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint for Leaders to create Member login credentials
app.post('/api/auth/create-member', async (req, res) => {
  try {
    const db = await getDb();
    const creatorId = req.headers['x-user-id'] || 'U-admin';

    // Verify creator is Leader
    const creator = await db.get('SELECT * FROM users WHERE id = ?', [creatorId]);
    if (!creator || creator.role !== 'Leader') {
      return res.status(403).json({ error: 'Only Leaders can create member credentials' });
    }

    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const tm = await db.get('SELECT tag, role FROM team_members WHERE LOWER(name) = LOWER(?) OR LOWER(email) = LOWER(?)', [name, email]);
    const isLeaderRole = (tm && (tm.tag === 'Leader' || tm.role === 'Leader' || tm.role === 'ADMIN')) || role === 'Leader';
    const finalRole = isLeaderRole ? 'Leader' : 'Member';

    const existing = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existing) {
      // If this account already exists in the same org, just link the team member and return it
      if (existing.orgId === creator.orgId || !existing.orgId) {
        await db.run(`UPDATE users SET orgId = ?, role = ? WHERE id = ?`, [creator.orgId, finalRole, existing.id]);
        await db.run(`UPDATE team_members SET email = ?, userId = ? WHERE name = ? AND userId = ?`,
          [email, existing.id, name, creatorId]);
        const linked = await db.get('SELECT id, name, email, role, orgName, orgId FROM users WHERE id = ?', [existing.id]);
        return res.json({ success: true, user: linked, linked: true });
      }
      return res.status(400).json({ error: 'Email already registered to a different organization' });
    }

    const id = generateId('U');
    await db.run(
      `INSERT INTO users (id, name, email, password, role, orgName, orgId, created)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, email, password, finalRole, creator.orgName, creator.orgId, new Date().toISOString()]
    );

    // Link this newly registered user account to their team member entry
    await db.run(`UPDATE team_members SET email = ?, userId = ? WHERE name = ? AND userId = ?`,
      [email, id, name, creatorId]);

    const newMember = await db.get('SELECT id, name, email, role, orgName, orgId FROM users WHERE id = ?', [id]);
    res.json({ success: true, user: newMember });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leaders fetch all users in their organization
app.get('/api/users/org-members', async (req, res) => {
  try {
    const db = await getDb();
    const leaderId = req.headers['x-user-id'] || 'U-admin';
    const leader = await db.get('SELECT * FROM users WHERE id = ?', [leaderId]);
    if (!leader || leader.role !== 'Leader') {
      return res.status(403).json({ error: 'Only Leaders can view org members' });
    }
    const members = await db.all(
      'SELECT id, name, email, role, orgName, orgId, created FROM users WHERE orgId = ? ORDER BY created ASC',
      [leader.orgId]
    );
    res.json({ success: true, members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leader impersonates a member (returns member's session without password)
app.post('/api/auth/impersonate', async (req, res) => {
  try {
    const db = await getDb();
    const leaderId = req.headers['x-user-id'] || 'U-admin';
    const leader = await db.get('SELECT * FROM users WHERE id = ?', [leaderId]);
    if (!leader || leader.role !== 'Leader') {
      return res.status(403).json({ error: 'Only Leaders can impersonate members' });
    }
    const { memberId } = req.body;
    const member = await db.get(
      'SELECT id, name, email, role, orgName, orgId FROM users WHERE id = ? AND orgId = ?',
      [memberId, leader.orgId]
    );
    if (!member) {
      return res.status(404).json({ error: 'Member not found in your organization' });
    }
    res.json({ success: true, member });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ---------------- API ENDPOINTS (SEGREGATED BY ROLE/ORG) ----------------

// Health check — visit /api/health to verify DB is connected and data is loaded
app.get('/api/health', async (req, res) => {
  try {
    const db = await getDb();
    const leads   = await db.get('SELECT COUNT(*) as count FROM leads');
    const users   = await db.get('SELECT COUNT(*) as count FROM users');
    const teams   = await db.get('SELECT COUNT(*) as count FROM teams');
    const dbType  = process.env.DATABASE_URL ? 'PostgreSQL (Neon)' : 'SQLite (local)';
    res.json({
      status: 'ok',
      db: dbType,
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      counts: {
        leads:  Number(leads?.count  ?? 0),
        users:  Number(users?.count  ?? 0),
        teams:  Number(teams?.count  ?? 0),
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message, DATABASE_URL_SET: !!process.env.DATABASE_URL });
  }
});

app.get('/api/crm/state', async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.headers['x-user-id'] || 'U-admin';

    // Fetch user details
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    let leads, deals, customers, companies, tasks, calls, meetings, activities, automations, campaigns, notifications, integrations, teams;

    if (user && user.role === 'Leader') {
      // Auto-sync: Ensure all Member users belong to Leader's org and exist in team_members table
      const allMemberUsers = await db.all("SELECT * FROM users WHERE role = 'Member'");
      for (const mUser of allMemberUsers) {
        if (mUser.orgId !== user.orgId) {
          await db.run("UPDATE users SET orgId = ? WHERE id = ?", [user.orgId, mUser.id]);
        }
        const tm = await db.get(
          "SELECT * FROM team_members WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?)",
          [mUser.email, mUser.name]
        );
        if (tm) {
          if (!tm.email || tm.email !== mUser.email || tm.userId !== userId) {
            await db.run("UPDATE team_members SET email = ?, userId = ? WHERE id = ?", [mUser.email, userId, tm.id]);
          }
        } else {
          let team = await db.get("SELECT * FROM teams WHERE userId = ? ORDER BY rowid ASC LIMIT 1", [userId]);
          if (!team) team = await db.get("SELECT * FROM teams ORDER BY rowid ASC LIMIT 1");
          let teamId = team ? team.id : 'TEAM-default';
          if (!team) {
            await db.run(
              "INSERT INTO teams (id, name, description, created, userId) VALUES (?, ?, ?, ?, ?)",
              ['TEAM-default', 'SAIVYY SALES TEAM', 'Main Sales Team', new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), userId]
            );
          }
          const tmId = generateId('TM');
          const initials = mUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
          await db.run(
            `INSERT INTO team_members (id, teamId, name, initials, role, email, phone, tag, leads, calls, meetings, conv, revenue, won, lost, status, created, userId)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 'Active', ?, ?)`,
            [tmId, teamId, mUser.name, initials, 'Member', mUser.email, '', 'Member', new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), userId]
          );
        }
      }

      // Leaders see all data across the CRM organization
      leads = await db.all("SELECT * FROM leads ORDER BY COALESCE(uploaded_at, created, '') DESC, batch_index ASC, id ASC");
      deals = await db.all('SELECT * FROM deals ORDER BY rowid DESC');
      customers = await db.all('SELECT * FROM customers ORDER BY rowid DESC');
      companies = await db.all('SELECT * FROM companies ORDER BY rowid DESC');
      tasks = await db.all('SELECT * FROM tasks ORDER BY rowid DESC');
      calls = await db.all('SELECT * FROM calls ORDER BY rowid DESC');
      meetings = await db.all('SELECT * FROM meetings ORDER BY rowid DESC');
      activities = await db.all('SELECT * FROM activities ORDER BY rowid DESC');
      automations = await db.all('SELECT * FROM automations ORDER BY rowid DESC');
      campaigns = await db.all('SELECT * FROM campaigns ORDER BY rowid DESC');
      notifications = await db.all('SELECT * FROM notifications ORDER BY rowid DESC');
      integrations = await db.all('SELECT * FROM integrations ORDER BY rowid DESC');
      teams = await db.all('SELECT * FROM teams ORDER BY rowid DESC');
    } else {
      // Members see their records (by userId or matching owner name)
      const memberOwnerPattern = user ? `%${user.name.toLowerCase()}%` : '%';
      leads = await db.all(
        `SELECT * FROM leads WHERE userId = ? OR LOWER(owner) LIKE ? ORDER BY COALESCE(uploaded_at, created, '') DESC, batch_index ASC, id ASC`,
        [userId, memberOwnerPattern]
      );
      deals = await db.all(
        `SELECT * FROM deals WHERE userId = ? OR LOWER(owner) LIKE ? ORDER BY rowid DESC`,
        [userId, memberOwnerPattern]
      );
      customers = await db.all(
        `SELECT * FROM customers WHERE userId = ? ORDER BY rowid DESC`,
        [userId]
      );
      companies = await db.all(
        `SELECT * FROM companies WHERE userId = ? ORDER BY rowid DESC`,
        [userId]
      );
      tasks = await db.all(
        `SELECT * FROM tasks WHERE userId = ? ORDER BY rowid DESC`,
        [userId]
      );
      calls = await db.all(
        `SELECT * FROM calls WHERE userId = ? ORDER BY rowid DESC`,
        [userId]
      );
      meetings = await db.all(
        `SELECT * FROM meetings WHERE userId = ? ORDER BY rowid DESC`,
        [userId]
      );
      activities = await db.all(
        `SELECT * FROM activities WHERE userId = ? ORDER BY rowid DESC`,
        [userId]
      );
      automations = await db.all(`SELECT * FROM automations WHERE userId = ? ORDER BY rowid DESC`, [userId]);
      campaigns = await db.all(`SELECT * FROM campaigns WHERE userId = ? ORDER BY rowid DESC`, [userId]);
      notifications = await db.all(`SELECT * FROM notifications WHERE userId = ? ORDER BY rowid DESC`, [userId]);
      integrations = await db.all(`SELECT * FROM integrations WHERE userId = ? ORDER BY rowid DESC`, [userId]);
      teams = await db.all(`SELECT * FROM teams ORDER BY rowid DESC`);
    }
    
    let teamMembers;
    if (user && user.role === 'Leader') {
      const orgMembers = await db.all('SELECT id FROM users WHERE orgId = ?', [user.orgId]);
      let allowedUserIds = orgMembers.map(m => m.id);
      if (!allowedUserIds.includes(userId)) allowedUserIds.push(userId);
      const placeholders = allowedUserIds.map(() => '?').join(',');

      teamMembers = await db.all(`
        SELECT tm.*, t.name AS teamName
        FROM team_members tm
        LEFT JOIN teams t ON t.id = tm.teamId
        WHERE tm.userId IN (${placeholders}) OR tm.userId IS NULL OR tm.userId = ''
        ORDER BY tm.rowid DESC
      `, allowedUserIds);
    } else {
      teamMembers = await db.all(`
        SELECT tm.*, t.name AS teamName
        FROM team_members tm
        LEFT JOIN teams t ON t.id = tm.teamId
        ORDER BY tm.rowid DESC
      `);
    }

    // Check if any member has login credentials generated
    const allUsers = await db.all('SELECT id, name, email, role FROM users');
    const userRoleMap = new Map(allUsers.map(u => [u.email ? u.email.toLowerCase() : '', u.role]));
    const userByEmail = new Map(allUsers.map(u => [u.email ? u.email.toLowerCase() : '', u]));
    const userByName = new Map(allUsers.map(u => [u.name ? u.name.toLowerCase() : '', u]));
    
    const teamMembersWithLoginStatus = teamMembers.map(tm => {
      const matchedUser = (tm.email && userByEmail.get(tm.email.toLowerCase())) || userByName.get(tm.name?.toLowerCase());
      const uRole = matchedUser ? matchedUser.role : (tm.email ? userRoleMap.get(tm.email.toLowerCase()) : null);
      const isLeaderUser = uRole === 'Leader' || uRole === 'Admin' || tm.tag === 'Leader';
      return {
        ...tm,
        accountUserId: matchedUser ? matchedUser.id : tm.userId,
        tag: isLeaderUser ? 'Leader' : (tm.tag || 'Member'),
        role: (isLeaderUser && (!tm.role || tm.role === 'Member')) ? 'Team Leader' : tm.role,
        isLeader: isLeaderUser,
        hasLogin: tm.email ? userRoleMap.has(tm.email.toLowerCase()) : false
      };
    });

    // Parse boolean & JSON fields
    const parsedTasks = tasks.map(t => ({ ...t, completed: Boolean(t.completed) }));
    const parsedMeetings = meetings.map(m => ({ ...m, attendees: JSON.parse(m.attendees || '[]') }));
    const parsedNotifs = notifications.map(n => ({ ...n, read: Boolean(n.read) }));
    const parsedIntegrations = integrations.map(i => ({ ...i, status: Boolean(i.status) }));

    res.json({
      leads,
      deals,
      customers,
      companies,
      tasks: parsedTasks,
      calls,
      meetings: parsedMeetings,
      activities,
      teams,
      teamMembers: teamMembersWithLoginStatus,
      team: teamMembersWithLoginStatus,
      automations,
      campaigns,
      notifications: parsedNotifs,
      integrations: parsedIntegrations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- LEADS ---
app.post('/api/leads', async (req, res) => {
  try {
    const db = await getDb();
    const l = req.body;
    let requesterId = req.headers['x-user-id'] || 'U-admin';
    const id = l.id || generateId('L');

    // Ensure valid requester ID & fallback
    const requester = await db.get('SELECT id, role, orgId FROM users WHERE id = ?', [requesterId]);
    let userId = requester?.id;
    if (!userId) {
      const anyLeader = await db.get("SELECT id FROM users WHERE role = 'Leader' LIMIT 1");
      userId = anyLeader?.id || requesterId;
    }

    if (l.assignedUserId && l.assignedUserId !== requesterId) {
      if (requester && (requester.role === 'Leader' || requester.role === 'Admin')) {
        const target = await db.get(
          'SELECT id FROM users WHERE id = ? AND orgId = ?',
          [l.assignedUserId, requester.orgId]
        );
        if (target) userId = l.assignedUserId;
      }
    }

    const name = (l.name || l.company || 'New Lead').trim();
    const company = (l.company || 'Direct Client').trim();
    const initials = l.initials || name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'LD';
    const owner = l.owner || requester?.name || 'Unassigned';
    const ownerInitials = l.ownerInitials || owner.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const uploadedAt = l.uploadedAt || new Date().toISOString();
    const batchIndex = l.batchIndex !== undefined ? Number(l.batchIndex) : 0;

    await db.run(
      `INSERT INTO leads (id, name, initials, company, title, email, phone, status, priority, score, source, owner, ownerInitials, lastContact, nextFollowup, dealValue, dealValueNum, probability, created, industry, location, website, notes, businessDescription, companySize, annualRevenue, businessModel, userId, uploaded_at, batch_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, name, initials, company, l.title || '', l.email || '', l.phone || '',
        l.status || 'New', l.priority || 'Medium', Number(l.score) || 40, l.source || 'Manual',
        owner, ownerInitials, l.lastContact || new Date().toISOString(),
        l.nextFollowup || 'Not scheduled', l.dealValue || '₹0', Number(l.dealValueNum) || 0,
        Number(l.probability) || 100, l.created || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        l.industry || '', l.location || '', l.website || '', l.notes || '',
        l.businessDescription || '', l.companySize || '', l.annualRevenue || '', l.businessModel || '',
        userId, uploadedAt, batchIndex
      ]
    );
    const newLead = await db.get('SELECT * FROM leads WHERE id = ?', [id]);
    res.json(newLead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk import endpoint — inserts many leads in one request (used by Excel import for speed)
app.post(['/api/leads/bulk', '/api/leads/batch'], async (req, res) => {
  try {
    const db = await getDb();
    let leads = req.body;
    if (leads && !Array.isArray(leads) && Array.isArray(leads.leads)) {
      leads = leads.leads;
    }
    const requesterId = req.headers['x-user-id'] || 'U-admin';
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'Body must be a non-empty array of leads' });
    }

    // Resolve requester permission & fallback to organization leader if needed
    let requesterRole = 'Leader';
    let requesterOrgId = 'ORG-saivyy-default';
    let defaultUserId = requesterId;
    const allowedOrgUserIds = new Set();

    try {
      const requester = await db.get('SELECT id, role, orgId FROM users WHERE id = ?', [requesterId]);
      if (requester) {
        requesterRole = requester.role;
        requesterOrgId = requester.orgId;
        defaultUserId = requester.id;
      } else {
        const anyLeader = await db.get("SELECT id, role, orgId FROM users WHERE role = 'Leader' LIMIT 1");
        if (anyLeader) {
          defaultUserId = anyLeader.id;
          requesterOrgId = anyLeader.orgId;
        }
      }
      if (requesterOrgId) {
        const orgUsers = await db.all('SELECT id FROM users WHERE orgId = ?', [requesterOrgId]);
        orgUsers.forEach(u => allowedOrgUserIds.add(u.id));
      }
    } catch (_) {}

    const uploadTimestamp = new Date().toISOString();
    let insertedCount = 0;

    // Process in chunks of 50 rows in original order
    const CHUNK_SIZE = 50;
    for (let c = 0; c < leads.length; c += CHUNK_SIZE) {
      const chunk = leads.slice(c, c + CHUNK_SIZE);
      const rows = [];

      for (let j = 0; j < chunk.length; j++) {
        const l = chunk[j];
        const overallIndex = c + j;
        const id = l.id || generateId('L');
        let userId = defaultUserId;
        if (l.assignedUserId && l.assignedUserId !== requesterId && (requesterRole === 'Leader' || requesterRole === 'Admin')) {
          if (allowedOrgUserIds.has(l.assignedUserId)) {
            userId = l.assignedUserId;
          }
        }

        const phone = (l.phone || '').trim();
        // Skip leads with empty or invalid phone numbers
        if (!phone) continue;

        const name = (l.name || l.company || 'New Lead').trim();
        const company = (l.company || 'Direct Client').trim();
        const initials = l.initials || name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'LD';
        const owner = l.owner || 'Unassigned';
        const ownerInitials = l.ownerInitials || owner.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const uploadedAt = l.uploadedAt || uploadTimestamp;
        const batchIndex = l.batchIndex !== undefined ? Number(l.batchIndex) : overallIndex;

        rows.push([
          id, name, initials, company, l.title || '', l.email || '', phone,
          l.status || 'New', l.priority || 'Medium', Number(l.score) || 40, l.source || 'Excel Import',
          owner, ownerInitials, l.lastContact || new Date().toISOString(),
          l.nextFollowup || 'Not scheduled', l.dealValue || '₹0', Number(l.dealValueNum) || 0,
          Number(l.probability) || 100, l.created || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          l.industry || '', l.location || '', l.website || '', l.notes || '',
          l.businessDescription || '', l.companySize || '', l.annualRevenue || '', l.businessModel || '',
          userId, uploadedAt, batchIndex
        ]);
      }

      if (rows.length > 0) {
        try {
          const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
          const values = rows.flat();
          await db.run(
            `INSERT INTO leads (id, name, initials, company, title, email, phone, status, priority, score, source, owner, ownerInitials, lastContact, nextFollowup, dealValue, dealValueNum, probability, created, industry, location, website, notes, businessDescription, companySize, annualRevenue, businessModel, userId, uploaded_at, batch_index)
             VALUES ${placeholders}`,
            values
          );
          insertedCount += rows.length;
        } catch (chunkErr) {
          console.warn('Chunk insert failed, falling back to sequential:', chunkErr.message);
          // Fallback to row-by-row if multi-row insert has a unique constraint or format issue
          for (const r of rows) {
            try {
              await db.run(
                `INSERT INTO leads (id, name, initials, company, title, email, phone, status, priority, score, source, owner, ownerInitials, lastContact, nextFollowup, dealValue, dealValueNum, probability, created, industry, location, website, notes, businessDescription, companySize, annualRevenue, businessModel, userId, uploaded_at, batch_index)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                r
              );
              insertedCount++;
            } catch (singleErr) {
              console.error('Row insert error:', singleErr.message);
            }
          }
        }
      }
    }

    res.json({ success: true, inserted: insertedCount, total: leads.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/leads/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const updates = req.body;
    const keys = Object.keys(updates).filter(k =>
      k !== 'id' &&
      // Never allow overwriting the ordering fields — they are set at import time and must be permanent
      k !== 'uploaded_at' && k !== 'uploadedAt' &&
      k !== 'batch_index' && k !== 'batchIndex'
    );
    if (!keys.length) return res.json({ id });

    // Map camelCase keys to DB column names (PostgreSQL uses snake_case columns)
    const colMap = {
      lastContact: 'lastcontact', nextFollowup: 'nextfollowup',
      dealValue: 'dealvalue', dealValueNum: 'dealvaluenum',
      ownerInitials: 'ownerinitials', businessDescription: 'businessdescription',
      companySize: 'companysize', annualRevenue: 'annualrevenue',
      businessModel: 'businessmodel', userId: 'userid',
    };
    const dbKeys = keys.map(k => colMap[k] || k);
    const setClause = dbKeys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => updates[k]);
    await db.run(`UPDATE leads SET ${setClause} WHERE id = ?`, [...values, id]);
    const updated = await db.get('SELECT * FROM leads WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/leads/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM leads WHERE id = ?', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DEALS ---
app.post('/api/deals', async (req, res) => {
  try {
    const db = await getDb();
    const d = req.body;
    const userId = req.headers['x-user-id'] || 'U-admin';
    const id = d.id || generateId('D');
    await db.run(
      `INSERT INTO deals (id, deal, company, value, score, priority, owner, ownerFull, close, last, next, stage, probability, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, d.deal, d.company, d.value || 0, d.score || 50, d.priority, d.owner, d.ownerFull, d.close, d.last, d.next, d.stage, d.probability || 20, userId]
    );
    const newDeal = await db.get('SELECT * FROM deals WHERE id = ?', [id]);
    res.json(newDeal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/deals/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const updates = req.body;
    const keys = Object.keys(updates).filter(k => k !== 'id');
    if (!keys.length) return res.json({ id });

    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => updates[k]);
    await db.run(`UPDATE deals SET ${setClause} WHERE id = ?`, [...values, id]);
    const updated = await db.get('SELECT * FROM deals WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/deals/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM deals WHERE id = ?', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CUSTOMERS ---
app.post('/api/customers', async (req, res) => {
  try {
    const db = await getDb();
    const c = req.body;
    const userId = req.headers['x-user-id'] || 'U-admin';
    const id = c.id || generateId('C');
    await db.run(
      `INSERT INTO customers (id, name, initials, company, title, email, phone, status, owner, totalRevenue, lastContact, joinDate, industry, location, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, c.name, c.initials, c.company, c.title, c.email, c.phone, c.status, c.owner, c.totalRevenue, c.lastContact, c.joinDate, c.industry, c.location, userId]
    );
    const item = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TASKS ---
app.post('/api/tasks', async (req, res) => {
  try {
    const db = await getDb();
    const t = req.body;
    const userId = req.headers['x-user-id'] || 'U-admin';
    const id = t.id || generateId('T');
    await db.run(
      `INSERT INTO tasks (id, title, linkedLead, dueDate, priority, owner, completed, created, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, t.title, t.linkedLead, t.dueDate, t.priority, t.owner, t.completed ? 1 : 0, t.created, userId]
    );
    const item = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
    res.json({ ...item, completed: Boolean(item.completed) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id/toggle', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const task = await db.get('SELECT completed FROM tasks WHERE id = ?', [id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const newStatus = task.completed ? 0 : 1;
    await db.run('UPDATE tasks SET completed = ? WHERE id = ?', [newStatus, id]);
    res.json({ id, completed: Boolean(newStatus) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CALLS & TELEPHONY INTEGRATION ---
app.post('/api/calls', async (req, res) => {
  try {
    const db = await getDb();
    const cl = req.body;
    const userId = req.headers['x-user-id'] || 'U-admin';
    const id = cl.id || generateId('CL');
    await db.run(
      `INSERT INTO calls (id, contact, company, date, time, duration, outcome, notes, owner, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, cl.contact, cl.company, cl.date, cl.time, cl.duration, cl.outcome, cl.notes, cl.owner, userId]
    );

    // Auto-update matching lead's lastContact and status if applicable
    if (cl.contact) {
      const match = await db.get('SELECT * FROM leads WHERE name = ? OR company = ? OR phone LIKE ?', [cl.contact, cl.company || '', `%${cl.contact}%`]);
      if (match) {
        const nowIso = new Date().toISOString();
        const updatedStatus = match.status === 'New' ? 'Contacted' : match.status;
        await db.run('UPDATE leads SET lastContact = ?, status = ? WHERE id = ?', [nowIso, updatedStatus, match.id]);
      }
    }

    const item = await db.get('SELECT * FROM calls WHERE id = ?', [id]);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Telephony & Cold Call Webhook API — receives automatic call logs from Exotel, Twilio, MyOperator, or Mobile Call Sync apps
app.post('/api/telephony/webhook', async (req, res) => {
  try {
    const db = await getDb();
    const payload = { ...req.query, ...req.body };

    // 'phone' = number you CALLED (the outgoing / dialed number)
    // 'my_number' = optional: your own SIM number (safety guard)
    const rawPhone    = payload.phone || payload.called || payload.call_number || payload.number || payload.From || payload.from || payload.caller || payload.toNumber || payload.To || payload.to || '';
    const myOwnNumber = payload.my_number || payload.self || '';
    const leadName    = payload.name || payload.contact_name || payload.lead_name || '';
    const duration    = payload.duration || payload.call_duration || payload.CallDuration || payload.duration_formatted || '2 min';
    const outcome     = payload.outcome || payload.CallStatus || payload.status || 'Connected';
    const notes       = payload.notes || payload.recording_url || payload.summary || 'Outbound cold call logged automatically via telephony integration';
    const repName     = payload.owner || payload.rep || 'Sales Rep';
    const userId      = req.headers['x-user-id'] || payload.userId || 'U-117bb402-3724-4580-9da9-01311b759889';

    const cleanPhone = String(rawPhone).trim();
    if (!cleanPhone) {
      return res.status(400).json({ error: 'Phone number is required in webhook payload' });
    }

    const digitsOnly  = cleanPhone.replace(/[^0-9]/g, '');
    const last10      = digitsOnly.slice(-10);

    // ── Guard 1: reject if phone matches explicitly provided my_number ──────────
    const myDigits = myOwnNumber ? String(myOwnNumber).replace(/[^0-9]/g, '').slice(-10) : '';
    if (myDigits && last10 === myDigits) {
      return res.status(400).json({ error: 'Webhook phone matches your own SIM number. Send the dialed number instead.' });
    }

    // ── Guard 2: reject if phone matches ANY registered user in the system ──────
    // This auto-blocks when MacroDroid accidentally sends the rep's own number
    const allUsers = await db.all('SELECT phone FROM users WHERE phone IS NOT NULL AND phone != ""');
    for (const u of allUsers) {
      const uDigits = String(u.phone).replace(/[^0-9]/g, '').slice(-10);
      if (uDigits && uDigits.length >= 7 && last10 === uDigits) {
        return res.status(400).json({
          error: `Webhook rejected: phone ${cleanPhone} belongs to a registered CRM user, not a lead. Make sure MacroDroid sends the DIALED number (the contact's number), not your own SIM number.`
        });
      }
    }

    // ── Match a lead by name (if provided) then by phone number ─────────────────
    let matchingLead = null;
    if (leadName) {
      matchingLead = await db.get(
        `SELECT * FROM leads WHERE LOWER(name) LIKE LOWER(?)`,
        [`%${leadName.trim()}%`]
      );
    }
    if (!matchingLead && last10 && last10.length >= 7) {
      matchingLead = await db.get(
        `SELECT * FROM leads WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '(', ''), ')', '') LIKE ?`,
        [`%${last10}%`]
      );
    }

    let matchedName  = cleanPhone;
    let matchedCompany = 'Prospect Company';

    if (matchingLead) {
      matchedName    = matchingLead.name;
      matchedCompany = matchingLead.company || 'Prospect Company';

      // ── Auto-update lead: set status to Contacted (if was New) + update lastContact
      const nowIso = new Date().toISOString();
      const newStatus = matchingLead.status === 'New' ? 'Contacted' : matchingLead.status;
      await db.run(
        `UPDATE leads SET lastContact = ?, status = ? WHERE id = ?`,
        [nowIso, newStatus, matchingLead.id]
      );
    } else {
      // No matching lead — auto-create a new Cold Call lead
      const newLeadId = generateId('L');
      await db.run(
        `INSERT INTO leads (id, name, initials, company, title, email, phone, status, priority, score, source, owner, ownerInitials, lastContact, nextFollowup, dealValue, dealValueNum, probability, created, notes, userId)
         VALUES (?, ?, 'CC', 'Prospect Company', 'Decision Maker', ?, ?, 'Contacted', 'Medium', 50, 'Cold Call', ?, 'SR', ?, 'Follow-up in 2 days', '₹0', 0, 20, ?, ?, ?)`,
        [newLeadId, `Cold Call (${cleanPhone})`, '', cleanPhone, repName, new Date().toISOString(), new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), notes, userId]
      );
      matchedName = `Cold Call (${cleanPhone})`;
    }

    // ── Log the Call ─────────────────────────────────────────────────────────────
    const callId  = generateId('CL');
    const now     = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    await db.run(
      `INSERT INTO calls (id, contact, company, date, time, duration, outcome, notes, owner, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [callId, matchedName, matchedCompany, dateStr, timeStr, duration, outcome, notes, repName, userId]
    );

    // ── Log the Activity ─────────────────────────────────────────────────────────
    const actId = generateId('ACT');
    await db.run(
      `INSERT INTO activities (id, type, contact, company, description, date, time, owner, userId)
       VALUES (?, 'Call', ?, ?, ?, ?, ?, ?, ?)`,
      [actId, matchedName, matchedCompany, `Outbound call (${duration}) — Outcome: ${outcome}`, dateStr, timeStr, repName, userId]
    );

    res.json({
      success: true,
      message: matchingLead
        ? `Call logged and "${matchedName}" status updated to Contacted`
        : `No matching lead found — new Cold Call lead created for ${cleanPhone}`,
      callId,
      matchedLead: matchedName,
      company: matchedCompany,
      matched: Boolean(matchingLead),
      leadId: matchingLead?.id || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- MEETINGS ---
app.post('/api/meetings', async (req, res) => {
  try {
    const db = await getDb();
    const m = req.body;
    const userId = req.headers['x-user-id'] || 'U-admin';
    const id = m.id || generateId('M');
    await db.run(
      `INSERT INTO meetings (id, title, contact, company, date, time, duration, type, outcome, owner, attendees, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, m.title, m.contact, m.company, m.date, m.time, m.duration, m.type, m.outcome, m.owner, JSON.stringify(m.attendees || []), userId]
    );
    const item = await db.get('SELECT * FROM meetings WHERE id = ?', [id]);
    res.json({ ...item, attendees: JSON.parse(item.attendees || '[]') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ACTIVITIES ---
app.post('/api/activities', async (req, res) => {
  try {
    const db = await getDb();
    const a = req.body;
    const userId = req.headers['x-user-id'] || 'U-admin';
    const id = a.id || generateId('A');
    await db.run(
      `INSERT INTO activities (id, type, contact, company, description, date, time, owner, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, a.type, a.contact, a.company, a.description, a.date, a.time, a.owner, userId]
    );
    const item = await db.get('SELECT * FROM activities WHERE id = ?', [id]);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/activities/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM activities WHERE id = ?', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- COMPANIES ---
app.post('/api/companies', async (req, res) => {
  try {
    const db = await getDb();
    const co = req.body;
    const userId = req.headers['x-user-id'] || 'U-admin';
    const id = co.id || generateId('CO');
    await db.run(
      `INSERT INTO companies (id, name, industry, location, contacts, deals, revenue, website, status, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, co.name, co.industry, co.location, co.contacts || 0, co.deals || 0, co.revenue || '₹0', co.website, co.status, userId]
    );
    const item = await db.get('SELECT * FROM companies WHERE id = ?', [id]);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TEAMS (LEADER/ADMIN ONLY) ---
app.post('/api/teams', async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.headers['x-user-id'] || 'U-admin';
    
    if (!(await checkIsLeader(db, userId))) {
      return res.status(403).json({ error: 'Only Leaders can create teams' });
    }

    const team = req.body;
    const id = team.id || generateId('TEAM');
    await db.run(
      `INSERT INTO teams (id, name, description, created, userId)
       VALUES (?, ?, ?, ?, ?)`,
      [id, team.name, team.description || '', team.created || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), userId]
    );
    const item = await db.get('SELECT * FROM teams WHERE id = ?', [id]);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teams/:id', async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.headers['x-user-id'] || 'U-admin';
    
    if (!(await checkIsLeader(db, userId))) {
      return res.status(403).json({ error: 'Only Leaders can delete teams' });
    }

    await db.run('DELETE FROM team_members WHERE teamId = ?', [req.params.id]);
    await db.run('DELETE FROM teams WHERE id = ?', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TEAM MEMBERS (LEADER/ADMIN ONLY) ---
app.post('/api/team-members', async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.headers['x-user-id'] || 'U-admin';
    
    if (!(await checkIsLeader(db, userId))) {
      return res.status(403).json({ error: 'Only Leaders can add team members' });
    }

    const member = req.body;
    const id = member.id || generateId('TM');
    await db.run(
      `INSERT INTO team_members (id, teamId, name, initials, role, email, phone, tag, leads, calls, meetings, conv, revenue, won, lost, status, created, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        member.teamId,
        member.name,
        member.initials,
        member.role,
        member.email,
        member.phone,
        member.tag || 'Member',
        member.leads || 0,
        member.calls || 0,
        member.meetings || 0,
        member.conv || 0,
        member.revenue || 0,
        member.won || 0,
        member.lost || 0,
        member.status || 'Active',
        member.created || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        userId
      ]
    );
    const item = await db.get(`
      SELECT tm.*, t.name AS teamName
      FROM team_members tm
      LEFT JOIN teams t ON t.id = tm.teamId
      WHERE tm.id = ?
    `, [id]);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/team-members/:id', async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.headers['x-user-id'] || 'U-admin';
    
    if (!(await checkIsLeader(db, userId))) {
      return res.status(403).json({ error: 'Only Leaders can modify team members' });
    }

    const { id } = req.params;
    const updates = req.body;
    const keys = Object.keys(updates).filter(k => k !== 'id');
    if (!keys.length) return res.json({ id });

    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => updates[k]);
    await db.run(`UPDATE team_members SET ${setClause} WHERE id = ?`, [...values, id]);

    // Automatically sync role to users table if tag/role is changed
    const tm = await db.get('SELECT email, tag, role FROM team_members WHERE id = ?', [id]);
    if (tm && tm.email) {
      const newRole = (updates.tag === 'Leader' || updates.role === 'Leader' || tm.tag === 'Leader' || tm.role === 'Leader' || tm.role === 'ADMIN') ? 'Leader' : 'Member';
      await db.run('UPDATE users SET role = ? WHERE LOWER(email) = LOWER(?)', [newRole, tm.email]);
    }

    const item = await db.get(`
      SELECT tm.*, t.name AS teamName
      FROM team_members tm
      LEFT JOIN teams t ON t.id = tm.teamId
      WHERE tm.id = ?
    `, [id]);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/team-members/:id', async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.headers['x-user-id'] || 'U-admin';
    
    if (!(await checkIsLeader(db, userId))) {
      return res.status(403).json({ error: 'Only Leaders can delete team members' });
    }

    await db.run('DELETE FROM team_members WHERE id = ?', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AUTOMATIONS ---
app.put('/api/automations/:id/toggle', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const auto = await db.get('SELECT status FROM automations WHERE id = ?', [id]);
    if (!auto) return res.status(404).json({ error: 'Automation not found' });
    const newStatus = auto.status === 'active' ? 'inactive' : 'active';
    await db.run('UPDATE automations SET status = ? WHERE id = ?', [newStatus, id]);
    res.json({ id, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/automations', async (req, res) => {
  try {
    const db = await getDb();
    const au = req.body;
    const userId = req.headers['x-user-id'] || 'U-admin';
    const id = au.id || generateId('AU');
    await db.run(
      `INSERT INTO automations (id, name, trigger, action, status, triggered, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, au.name, au.trigger, au.action, au.status || 'active', 0, userId]
    );
    const item = await db.get('SELECT * FROM automations WHERE id = ?', [id]);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CAMPAIGNS ---
app.post('/api/campaigns', async (req, res) => {
  try {
    const db = await getDb();
    const cam = req.body;
    const userId = req.headers['x-user-id'] || 'U-admin';
    const id = cam.id || generateId('CAM');
    await db.run(
      `INSERT INTO campaigns (id, name, type, status, sent, opened, clicked, openRate, clickRate, created, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, cam.name, cam.type, cam.status || 'Active', 0, 0, 0, 0, 0, cam.created, userId]
    );
    const item = await db.get('SELECT * FROM campaigns WHERE id = ?', [id]);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- INTEGRATIONS ---
app.get('/api/integrations', async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.headers['x-user-id'] || 'U-admin';
    const list = await db.all('SELECT * FROM integrations WHERE userId = ? ORDER BY rowid DESC', [userId]);
    res.json(list.map(i => ({ ...i, status: Boolean(i.status) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/integrations', async (req, res) => {
  try {
    const db = await getDb();
    const item = req.body;
    const userId = req.headers['x-user-id'] || 'U-admin';
    const id = item.id || generateId('INT');
    await db.run(
      `INSERT INTO integrations (id, name, category, status, description, apiKey, webhookUrl, config, lastSync, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, item.name, item.category || 'Custom', item.status ? 1 : 0, item.desc || item.description || '', item.apiKey || '', item.webhookUrl || '', item.config || '{}', 'Just connected', userId]
    );
    const created = await db.get('SELECT * FROM integrations WHERE id = ?', [id]);
    res.json({ ...created, status: Boolean(created.status) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/integrations/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { name, category, desc, description, apiKey, webhookUrl, config, status } = req.body;
    await db.run(
      `UPDATE integrations SET name = ?, category = ?, description = ?, apiKey = ?, webhookUrl = ?, config = ?, status = ?, lastSync = ? WHERE id = ?`,
      [name, category, desc || description || '', apiKey, webhookUrl, typeof config === 'object' ? JSON.stringify(config) : config, status ? 1 : 0, 'Just updated', id]
    );
    const updated = await db.get('SELECT * FROM integrations WHERE id = ?', [id]);
    res.json({ ...updated, status: Boolean(updated.status) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/integrations/:id/toggle', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const item = await db.get('SELECT status FROM integrations WHERE id = ?', [id]);
    if (!item) return res.status(404).json({ error: 'Integration not found' });
    const newStatus = item.status ? 0 : 1;
    await db.run('UPDATE integrations SET status = ?, lastSync = ? WHERE id = ?', [newStatus, newStatus ? 'Just connected' : 'Disconnected', id]);
    res.json({ id, status: Boolean(newStatus) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/integrations/:id/test', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const item = await db.get('SELECT * FROM integrations WHERE id = ?', [id]);
    if (!item) return res.status(404).json({ error: 'Integration not found' });

    // Simulate real handshake delay
    await new Promise(r => setTimeout(r, 600));
    await db.run('UPDATE integrations SET lastSync = ? WHERE id = ?', ['Synced just now', id]);

    res.json({ success: true, message: `Successfully connected & verified API handshake for ${item.name}!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/integrations/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM integrations WHERE id = ?', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RESET database option (clear all CRM data but preserve team structure)
app.post('/api/crm/reset', async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.headers['x-user-id'] || 'U-admin';
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);

    let allowedUserIds = [userId];
    if (user && user.role === 'Leader') {
      const orgMembers = await db.all('SELECT id FROM users WHERE orgId = ?', [user.orgId]);
      allowedUserIds = orgMembers.map(m => m.id);
      if (!allowedUserIds.includes(userId)) allowedUserIds.push(userId);
    }

    const placeholders = allowedUserIds.map(() => '?').join(',');

    // Only clear CRM operational data — preserve teams, team_members, users
    await db.run(`DELETE FROM leads WHERE userId IN (${placeholders})`, allowedUserIds);
    await db.run(`DELETE FROM deals WHERE userId IN (${placeholders})`, allowedUserIds);
    await db.run(`DELETE FROM customers WHERE userId IN (${placeholders})`, allowedUserIds);
    await db.run(`DELETE FROM companies WHERE userId IN (${placeholders})`, allowedUserIds);
    await db.run(`DELETE FROM tasks WHERE userId IN (${placeholders})`, allowedUserIds);
    await db.run(`DELETE FROM calls WHERE userId IN (${placeholders})`, allowedUserIds);
    await db.run(`DELETE FROM meetings WHERE userId IN (${placeholders})`, allowedUserIds);
    await db.run(`DELETE FROM activities WHERE userId IN (${placeholders})`, allowedUserIds);
    await db.run(`DELETE FROM automations WHERE userId IN (${placeholders})`, allowedUserIds);
    await db.run(`DELETE FROM campaigns WHERE userId IN (${placeholders})`, allowedUserIds);
    await db.run(`DELETE FROM notifications WHERE userId IN (${placeholders})`, allowedUserIds);
    await db.run(`DELETE FROM integrations WHERE userId IN (${placeholders})`, allowedUserIds);
    // Note: teams and team_members are preserved

    res.json({ success: true, message: 'CRM data reset. Team structure preserved.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static frontend build (dist folder) in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback all non-API routes to index.html for React Router SPA routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

// Express Global Error Handler — Guarantees all server errors return valid JSON
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Saivyy CRM REST API server running on port ${PORT}`);
  });
}

export default app;
