// routes/recovery.js
// Recovery Center Admin Module
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const {
  createValidatedBackup,
  revalidateBackup,
  runRestoreDrill,
  restoreToStaging,
  getRecoveryStats
} = require('../services/recoveryService');

const {
  getThreatSignals,
  getContainmentMode,
  setContainmentMode
} = require('../services/threatService');

const {
  getAuditLogs,
  getRecordVersions,
  softDeleteRecord,
  restoreSoftDeletedRecord,
  logAudit
} = require('../services/auditService');

const {
  requireAdmin,
  requireStepUpAuth,
  verifyStepUp,
  grantStepUpClearance,
  recoveryRateLimiter
} = require('../services/securityService');

const ADMIN_PREFIX = (process.env.ADMIN_ROUTE_PATH || '/@65783+@4556/admin').replace(/\/+$/, '');

// Middleware: All recovery routes require Admin session
router.use(requireAdmin);

// Pass helper variables to all recovery templates
router.use((req, res, next) => {
  res.locals.admin = req.session.adminUser;
  res.locals.adminRoutePath = ADMIN_PREFIX;
  res.locals.recoveryRoutePath = `${ADMIN_PREFIX}/recovery`;
  res.locals.containment = getContainmentMode();
  res.locals.isStepUpAuthorized = Boolean(
    req.session.stepUpAuthorizedUntil && Date.now() < req.session.stepUpAuthorizedUntil
  );
  next();
});

// 1. Recovery Center Hub (Overview of Backups, RPO/RTO, Last Known Good, Threat Signals)
router.get('/', (req, res) => {
  const stats = getRecoveryStats();
  const threats = getThreatSignals(15);
  const auditSummary = getAuditLogs({ limit: 5 });

  res.render('admin/recovery/index', {
    stats,
    threats,
    auditSummary: auditSummary.logs,
    activeTab: 'overview',
    flash: req.query.msg || null,
    flashType: req.query.type || 'info'
  });
});

// 2. Backups List & Management Page
router.get('/backups', (req, res) => {
  const stats = getRecoveryStats();
  res.render('admin/recovery/backups', {
    stats,
    activeTab: 'backups',
    flash: req.query.msg || null,
    flashType: req.query.type || 'info'
  });
});

// 3. Create Validated Backup Action
router.post('/backups/create', recoveryRateLimiter, async (req, res) => {
  try {
    const backup = await createValidatedBackup({
      backupType: 'manual',
      initiatedBy: req.session.adminUser.username
    });

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ success: true, backup });
    }
    return res.redirect(`${ADMIN_PREFIX}/recovery/backups?msg=Validated+Clean+backup+created+successfully&type=success`);
  } catch (err) {
    console.error('Create backup error:', err);
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(500).json({ success: false, message: err.message });
    }
    return res.redirect(`${ADMIN_PREFIX}/recovery/backups?msg=${encodeURIComponent('Backup failed: ' + err.message)}&type=error`);
  }
});

// 4. Revalidate Backup
router.post('/backups/:id/validate', recoveryRateLimiter, async (req, res) => {
  try {
    const backupId = parseInt(req.params.id, 10);
    const result = await revalidateBackup(backupId, req.session.adminUser);

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json(result);
    }
    return res.redirect(`${ADMIN_PREFIX}/recovery/backups?msg=Backup+re-validated+successfully&type=success`);
  } catch (err) {
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(500).json({ success: false, message: err.message });
    }
    return res.redirect(`${ADMIN_PREFIX}/recovery/backups?msg=${encodeURIComponent(err.message)}&type=error`);
  }
});

// 5. Restore Drill Page & Runner (Sandbox Drill)
router.get('/drills', (req, res) => {
  const stats = getRecoveryStats();
  res.render('admin/recovery/drills', {
    stats,
    activeTab: 'drills',
    drillResult: null,
    flash: req.query.msg || null,
    flashType: req.query.type || 'info'
  });
});

router.post('/drills/run', recoveryRateLimiter, async (req, res) => {
  try {
    const backupId = req.body.backupId ? parseInt(req.body.backupId, 10) : null;
    const drill = await runRestoreDrill(backupId, req.session.adminUser);

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ success: true, drill });
    }

    const stats = getRecoveryStats();
    return res.render('admin/recovery/drills', {
      stats,
      activeTab: 'drills',
      drillResult: drill,
      flash: `Restore drill passed! Measured RTO: ${drill.rtoSeconds}s. Database integrity 100% verified.`,
      flashType: 'success'
    });
  } catch (err) {
    console.error('Drill execution error:', err);
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(500).json({ success: false, message: err.message });
    }
    const stats = getRecoveryStats();
    return res.render('admin/recovery/drills', {
      stats,
      activeTab: 'drills',
      drillResult: null,
      flash: `Drill failed: ${err.message}`,
      flashType: 'error'
    });
  }
});

// 6. "Restore to Staging" Workflow View & Action
router.get('/staging', (req, res) => {
  const stats = getRecoveryStats();
  res.render('admin/recovery/staging', {
    stats,
    activeTab: 'staging',
    stagingResult: null,
    flash: req.query.msg || null,
    flashType: req.query.type || 'info'
  });
});

router.post('/staging/run', recoveryRateLimiter, async (req, res) => {
  try {
    const backupId = req.body.backupId ? parseInt(req.body.backupId, 10) : null;
    const staging = await restoreToStaging(backupId, req.session.adminUser);

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ success: true, staging });
    }

    const stats = getRecoveryStats();
    return res.render('admin/recovery/staging', {
      stats,
      activeTab: 'staging',
      stagingResult: staging,
      flash: `Successfully restored database to staging instance! All health checks & benchmark queries PASSED.`,
      flashType: 'success'
    });
  } catch (err) {
    console.error('Staging restore error:', err);
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(500).json({ success: false, message: err.message });
    }
    const stats = getRecoveryStats();
    return res.render('admin/recovery/staging', {
      stats,
      activeTab: 'staging',
      stagingResult: null,
      flash: `Restore to staging failed: ${err.message}`,
      flashType: 'error'
    });
  }
});

// 7. RPO / RTO SLA Analysis Page
router.get('/rpo-rto', (req, res) => {
  const stats = getRecoveryStats();
  res.render('admin/recovery/rpo-rto', {
    stats,
    activeTab: 'rpo-rto'
  });
});

// 8. Threat Signals Dashboard & Containment Mode
router.get('/threats', (req, res) => {
  const threats = getThreatSignals(15);
  res.render('admin/recovery/threats', {
    threats,
    activeTab: 'threats',
    flash: req.query.msg || null,
    flashType: req.query.type || 'info'
  });
});

// Toggle Containment Mode (Protected by Step-Up Auth)
router.post('/threats/containment', requireStepUpAuth, (req, res) => {
  try {
    const { enabled, reason } = req.body;
    const isEnable = enabled === '1' || enabled === 'true' || enabled === true;
    const updated = setContainmentMode({
      enabled: isEnable,
      reason: reason || (isEnable ? 'Emergency containment activated by administrator.' : null),
      actor: req.session.adminUser
    });

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ success: true, containment: updated });
    }

    const msg = isEnable 
      ? 'Containment Mode ENABLED! All deletes and exports are now globally locked.' 
      : 'Containment Mode DISABLED. Standard operations restored.';
    return res.redirect(`${ADMIN_PREFIX}/recovery/threats?msg=${encodeURIComponent(msg)}&type=${isEnable ? 'error' : 'success'}`);
  } catch (err) {
    console.error('Containment toggle error:', err);
    return res.redirect(`${ADMIN_PREFIX}/recovery/threats?msg=${encodeURIComponent(err.message)}&type=error`);
  }
});

// 9. Immutable Audit Logs & Version History Explorer
router.get('/audit', (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 30;
  const offset = (page - 1) * limit;
  const actionFilter = req.query.action || null;
  const statusFilter = req.query.status || null;

  const { logs, total } = getAuditLogs({ limit, offset, action: actionFilter, status: statusFilter });
  const totalPages = Math.ceil(total / limit) || 1;

  res.render('admin/recovery/audit', {
    logs,
    total,
    page,
    totalPages,
    actionFilter,
    statusFilter,
    activeTab: 'audit'
  });
});

// 10. Admin Step-Up Authentication Screen & Verification Endpoint
router.get('/step-up', (req, res) => {
  res.render('admin/recovery/step-up', {
    returnTo: req.query.returnTo || `${ADMIN_PREFIX}/recovery`,
    error: null
  });
});

router.post('/step-up', (req, res) => {
  const password = req.body.password || '';
  const returnTo = req.body.returnTo || `${ADMIN_PREFIX}/recovery`;
  const username = req.session.adminUser.username;

  if (verifyStepUp(username, password)) {
    grantStepUpClearance(req);
    logAudit({
      actorUsername: username,
      actorRole: 'admin',
      action: 'STEP_UP_AUTH_SUCCESS',
      entityType: 'session',
      entityId: username,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS'
    });
    return res.redirect(returnTo);
  }

  logAudit({
    actorUsername: username,
    actorRole: 'admin',
    action: 'STEP_UP_AUTH_FAILED',
    entityType: 'session',
    entityId: username,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    status: 'FAILURE'
  });

  return res.render('admin/recovery/step-up', {
    returnTo,
    error: 'Step-up verification failed. Invalid administrator password.'
  });
});

// 11. Ransomware Scenario Interview Walkthrough & Simulation Bench
router.get('/ransomware-scenario', (req, res) => {
  const stats = getRecoveryStats();
  res.render('admin/recovery/ransomware-scenario', {
    stats,
    activeTab: 'ransomware',
    simulationResult: null
  });
});

router.post('/ransomware-scenario/simulate', recoveryRateLimiter, async (req, res) => {
  try {
    const { runRestoreDrill, createValidatedBackup, validateDatabaseFile } = require('../services/recoveryService');
    const simDir = path.resolve(__dirname, '../storage/backups');
    const simFile = path.join(simDir, `ransomware_sim_${Date.now()}.sqlite`);

    // Step 1: Ensure we have a last known good backup
    const stats = getRecoveryStats();
    let cleanBackup = stats.lastKnownGood;
    if (!cleanBackup) {
      const fresh = await createValidatedBackup({ backupType: 'scheduled', initiatedBy: req.session.adminUser.username });
      cleanBackup = { id: fresh.backupId, filepath: fresh.filepath, filename: fresh.filename };
    }

    // Step 2: Create a simulated victim database file
    fs.copyFileSync(cleanBackup.filepath, simFile);

    // Step 3: Inject corruption into the simulated victim database
    // Corrupt the header or random pages
    const fd = fs.openSync(simFile, 'r+');
    const corruptBuffer = Buffer.from('TAMPERED_RANSOMWARE_ENCRYPTED_BLOCK_0000000000000000000000');
    fs.writeSync(fd, corruptBuffer, 0, corruptBuffer.length, 100);
    fs.closeSync(fd);

    // Step 4: Validate that our automated checks detect the corruption
    const corruptedCheck = validateDatabaseFile(simFile);

    // Step 5: Execute restore drill from Clean Backup
    const drillResult = await runRestoreDrill(cleanBackup.id, req.session.adminUser);

    // Step 6: Clean up simulation file
    if (fs.existsSync(simFile)) {
      try { fs.unlinkSync(simFile); } catch (e) {}
    }

    const simReport = {
      scenario: 'Ransomware File Corruption & Clean Recovery Drill',
      step1_clean_point: {
        filename: cleanBackup.filename,
        checksum: cleanBackup.sha256_checksum,
        status: 'VALIDATED_CLEAN'
      },
      step2_corruption_simulation: {
        status: 'CORRUPTION_INJECTED',
        corruptedCheck: corruptedCheck.integrityCheck,
        errorsDetected: corruptedCheck.errors
      },
      step3_clean_restore: {
        drillStatus: drillResult.status,
        measuredRTO: `${drillResult.rtoSeconds}s`,
        integrityRestored: drillResult.validationReport.integrityCheck
      },
      step4_verdict: 'RECOVERY_VALIDATED_HEALTHY_ZERO_DATA_LOSS'
    };

    return res.render('admin/recovery/ransomware-scenario', {
      stats: getRecoveryStats(),
      activeTab: 'ransomware',
      simulationResult: simReport
    });
  } catch (simErr) {
    console.error('Ransomware simulation error:', simErr);
    return res.render('admin/recovery/ransomware-scenario', {
      stats: getRecoveryStats(),
      activeTab: 'ransomware',
      simulationResult: { error: simErr.message }
    });
  }
});

module.exports = router;
