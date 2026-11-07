// routes/admin.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const db = require('../database/db');
const config = require('../config.json');
const { approvePayment, rejectPayment } = require('../services/paymentService');
const { logAudit, recordVersion, softDeleteRecord, restoreSoftDeletedRecord } = require('../services/auditService');
const { containmentGuard, getContainmentMode } = require('../services/threatService');
const { loginRateLimiter, adminSessionHygiene, requireStepUpAuth } = require('../services/securityService');

const recoveryRoutes = require('./recovery');

const ADMIN_PREFIX = (process.env.ADMIN_ROUTE_PATH || '/@65783+@4556/admin').replace(/\/+$/, '');

// Session hygiene middleware across all admin routes
router.use(adminSessionHygiene);

// Middleware to ensure admin authentication
function requireAdmin(req, res, next) {
  if (req.session && req.session.adminUser) {
    return next();
  }
  return res.redirect(`${ADMIN_PREFIX}/login`);
}

// Mount Recovery Center Sub-Router
router.use('/recovery', recoveryRoutes);

// 1. Admin Login Page
router.get('/login', (req, res) => {
  if (req.session && req.session.adminUser) {
    return res.redirect(ADMIN_PREFIX);
  }
  res.render('admin/login', { error: null });
});

// Admin Login Handler
router.post('/login', loginRateLimiter, (req, res) => {
  const username = (req.body.username || '').trim();
  const password = (req.body.password || '').trim();
  const ipAddress = req.ip || req.connection?.remoteAddress;
  const userAgent = req.headers['user-agent'];

  if (!username || !password) {
    return res.render('admin/login', { error: 'Please enter both username and password.' });
  }

  // 1. Look up admin user in database (case-insensitive for username)
  let admin = null;
  try {
    admin = db.prepare(`SELECT * FROM admin_users WHERE LOWER(username) = LOWER(?)`).get(username);
  } catch (err) {
    console.error('Admin query error:', err.message);
  }

  // 2. Also check environment credentials for direct fallback / recovery
  const envUser = (process.env.ADMIN_USERNAME || 'admin').trim();
  const envPass = (process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'admin123')).trim();

  let authenticated = false;
  let adminRecord = null;

  if (admin && admin.password_hash && bcrypt.compareSync(password, admin.password_hash)) {
    authenticated = true;
    adminRecord = { id: admin.id, username: admin.username };
  } else if (envPass && username.toLowerCase() === envUser.toLowerCase() && password === envPass) {
    authenticated = true;
    try {
      const hash = bcrypt.hashSync(envPass, 10);
      if (admin) {
        db.prepare(`UPDATE admin_users SET password_hash = ? WHERE id = ?`).run(hash, admin.id);
        adminRecord = { id: admin.id, username: admin.username };
      } else {
        const info = db.prepare(`INSERT INTO admin_users (username, password_hash) VALUES (?, ?)`).run(envUser, hash);
        adminRecord = { id: info.lastInsertRowid, username: envUser };
      }
    } catch (e) {
      console.warn('Admin sync notice:', e.message);
      adminRecord = { id: 1, username: envUser };
    }
  }

  if (authenticated && adminRecord) {
    req.session.adminUser = adminRecord;
    logAudit({
      actorId: adminRecord.id,
      actorUsername: adminRecord.username,
      actorRole: 'admin',
      action: 'LOGIN',
      entityType: 'admin_session',
      entityId: adminRecord.username,
      ipAddress,
      userAgent,
      status: 'SUCCESS'
    });

    // Explicitly commit session before redirecting to avoid race conditions
    return req.session.save((saveErr) => {
      if (saveErr) {
        console.error('Session save error:', saveErr);
      }
      return res.redirect(ADMIN_PREFIX);
    });
  }

  logAudit({
    actorUsername: username || 'anonymous',
    actorRole: 'admin',
    action: 'FAILED_LOGIN',
    entityType: 'admin_session',
    entityId: username || 'unknown',
    ipAddress,
    userAgent,
    status: 'FAILURE',
    details: { attemptedUsername: username }
  });

  res.render('admin/login', { error: 'Invalid admin credentials.' });
});

// Admin Logout Handler
router.get('/logout', (req, res) => {
  if (req.session && req.session.adminUser) {
    logAudit({
      actorId: req.session.adminUser.id,
      actorUsername: req.session.adminUser.username,
      actorRole: 'admin',
      action: 'LOGOUT',
      entityType: 'admin_session',
      entityId: req.session.adminUser.username,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS'
    });
  }
  req.session.adminUser = null;
  req.session.stepUpAuthorizedUntil = null;
  req.session.save(() => {
    res.redirect(`${ADMIN_PREFIX}/login`);
  });
});

// 2. Admin Dashboard
router.get('/', requireAdmin, (req, res) => {
  const totalLists = db.prepare(`SELECT COUNT(*) as c FROM choice_lists`).get().c;
  const totalGenerated = db.prepare(`SELECT COUNT(*) as c FROM generated_lists`).get().c;
  const totalPurchases = db.prepare(`SELECT COUNT(*) as c FROM purchases`).get().c;
  const totalDownloads = db.prepare(`SELECT COALESCE(SUM(download_count), 0) as s FROM purchases`).get().s;

  const paymentStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as revenuePaise
    FROM payments
  `).get();

  const dataFreshness = {
    institutes: db.prepare(`SELECT COUNT(*) as c FROM institutes`).get().c,
    programs: db.prepare(`SELECT COUNT(*) as c FROM programs`).get().c,
    closingRanks: db.prepare(`SELECT COUNT(*) as c FROM closing_ranks`).get().c,
    nirfRankings: db.prepare(`SELECT COUNT(*) as c FROM nirf_rankings`).get().c,
    placements: db.prepare(`SELECT COUNT(*) as c FROM placements`).get().c,
    dataYear: config.generator.dataYear || 2024
  };

  const recentPayments = db.prepare(`
    SELECT 
      p.*,
      u.name as user_name,
      u.email as user_email,
      u.mobile as user_mobile
    FROM payments p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.id DESC
    LIMIT 6
  `).all();

  res.render('admin/dashboard', {
    admin: req.session.adminUser,
    totalLists,
    totalGenerated,
    totalPurchases,
    totalDownloads,
    paymentStats: {
      ...paymentStats,
      revenueInr: ((paymentStats.revenuePaise || 0) / 100).toFixed(2)
    },
    dataFreshness,
    recentPayments
  });
});

// 3. Admin Payments History Screen (Razorpay Gateway Records)
router.get('/payments', requireAdmin, (req, res) => {
  const statusFilter = req.query.status || 'all';
  let query = `
    SELECT 
      p.*,
      u.name as user_name,
      u.email as user_email,
      u.mobile as user_mobile,
      cl.inputs,
      cl.data_year
    FROM payments p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN choice_lists cl ON p.choice_list_id = cl.id
  `;

  const params = [];
  if (statusFilter === 'approved') {
    query += ` WHERE p.status = 'approved'`;
  } else if (statusFilter === 'pending') {
    query += ` WHERE p.status = 'pending'`;
  } else if (statusFilter === 'failed') {
    query += ` WHERE (p.status = 'failed' OR p.status = 'rejected')`;
  }

  query += ` ORDER BY p.id DESC`;

  const payments = db.prepare(query).all(...params);

  res.render('admin/payments', {
    admin: req.session.adminUser,
    payments,
    currentFilter: statusFilter
  });
});

// Approve Payment Route
router.post('/payments/:id/approve', requireAdmin, containmentGuard('update'), (req, res) => {
  try {
    const paymentId = parseInt(req.params.id, 10);
    approvePayment(paymentId, req.session.adminUser.username);
    logAudit({
      actorUsername: req.session.adminUser.username,
      actorRole: 'admin',
      action: 'APPROVE_PAYMENT',
      entityType: 'payment',
      entityId: paymentId,
      status: 'SUCCESS'
    });
    res.json({ success: true, message: 'Payment approved! Choice list download unlocked for student.' });
  } catch (err) {
    console.error('Approve payment error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Reject Payment Route
router.post('/payments/:id/reject', requireAdmin, containmentGuard('update'), (req, res) => {
  try {
    const paymentId = parseInt(req.params.id, 10);
    const { reason } = req.body;
    rejectPayment(paymentId, reason, req.session.adminUser.username);
    logAudit({
      actorUsername: req.session.adminUser.username,
      actorRole: 'admin',
      action: 'REJECT_PAYMENT',
      entityType: 'payment',
      entityId: paymentId,
      status: 'SUCCESS',
      details: { reason }
    });
    res.json({ success: true, message: 'Payment rejected with reason recorded.' });
  } catch (err) {
    console.error('Reject payment error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Generic Soft-Delete Record Route (Immutable-by-design: replaces hard delete)
router.post('/records/soft-delete', requireAdmin, containmentGuard('delete'), requireStepUpAuth, (req, res) => {
  try {
    const { entityType, entityId, reason } = req.body;
    const result = softDeleteRecord(entityType, parseInt(entityId, 10), req.session.adminUser, reason);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Soft delete error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Generic Restore Soft-Deleted Record Route
router.post('/records/restore', requireAdmin, containmentGuard('restore'), requireStepUpAuth, (req, res) => {
  try {
    const { entityType, entityId } = req.body;
    const result = restoreSoftDeletedRecord(entityType, parseInt(entityId, 10), req.session.adminUser);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Serve Proof Screenshots securely to admin only
router.get('/proof/:filename', requireAdmin, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(__dirname, '../storage/proofs', filename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  res.status(404).send('Proof screenshot not found.');
});

// 4. Data Audit View (Section 16: checks missing source URL or year)
router.get('/audit', requireAdmin, (req, res) => {
  const missingSources = db.prepare(`
    SELECT 'Institute' as entity, id, name as identifier, source_url, data_year 
    FROM institutes WHERE source_url IS NULL OR source_url = ''
    UNION ALL
    SELECT 'NIRF Ranking' as entity, id, category || ' ' || rank as identifier, source_url, year as data_year
    FROM nirf_rankings WHERE source_url IS NULL OR source_url = ''
    UNION ALL
    SELECT 'Placement' as entity, id, 'Placement ' || year as identifier, source_url, year as data_year
    FROM placements WHERE source_url IS NULL OR source_url = ''
  `).all();

  const instituteList = db.prepare(`
    SELECT i.id, i.name, i.type, i.josaa_code, i.source_url, i.data_year,
           nr.rank as nirf_rank, pl.average_package_lpa
    FROM institutes i
    LEFT JOIN nirf_rankings nr ON (i.id = nr.institute_id AND nr.year = 2024)
    LEFT JOIN placements pl ON (i.id = pl.institute_id AND pl.year = 2024)
    ORDER BY nr.rank ASC
  `).all();

  res.render('admin/audit', {
    admin: req.session.adminUser,
    missingSources,
    instituteList
  });
});

// 5. Settings Screen
router.get('/settings', requireAdmin, (req, res) => {
  res.render('admin/settings', {
    admin: req.session.adminUser,
    config,
    saved: req.query.saved === '1'
  });
});

router.post('/settings', requireAdmin, (req, res) => {
  try {
    const { siteName, pricePerDownload, upiPayeeName, upiIdNavi, upiIdPhonepe, upiIdPaytm, keyId, introEnabled, showOncePerSession } = req.body;

    config.site.name = siteName || config.site.name;
    config.payments.pricePerDownloadInr = parseInt(pricePerDownload, 10) || 49;
    if (upiPayeeName) config.payments.upiPayeeName = upiPayeeName.trim();
    if (upiIdNavi) config.payments.upiIdNavi = upiIdNavi.trim();
    if (upiIdPhonepe) config.payments.upiIdPhonepe = upiIdPhonepe.trim();
    if (upiIdPaytm) config.payments.upiIdPaytm = upiIdPaytm.trim();
    config.payments.upiId = config.payments.upiIdNavi || '8000859195@naviaxis';
    if (keyId) config.payments.keyId = keyId.trim();
    config.landing.introEnabled = introEnabled === 'on';
    config.landing.showOncePerSession = showOncePerSession === 'on';

    fs.writeFileSync(path.resolve(__dirname, '../config.json'), JSON.stringify(config, null, 2));

    res.redirect(`${ADMIN_PREFIX}/settings?saved=1`);
  } catch (err) {
    console.error('Save settings error:', err);
    res.status(500).send('Failed to save settings.');
  }
});

// 6. CSV Data Import Screen
router.get('/imports', requireAdmin, (req, res) => {
  const logs = db.prepare(`SELECT * FROM import_logs ORDER BY id DESC`).all();
  res.render('admin/imports', {
    admin: req.session.adminUser,
    logs
  });
});

module.exports = router;
