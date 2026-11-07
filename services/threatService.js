// services/threatService.js
// Threat signals monitoring & Containment Mode kill-switch
const db = require('../database/db');
const { logAudit } = require('./auditService');

// Ensure system_settings table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

/**
 * Get current Containment Mode state
 */
function getContainmentMode() {
  try {
    const row = db.prepare(`SELECT value FROM system_settings WHERE key = 'containment_mode'`).get();
    if (row && row.value) {
      return JSON.parse(row.value);
    }
  } catch (err) {
    console.error('Error fetching containment mode:', err.message);
  }
  return {
    enabled: false,
    reason: null,
    enabled_at: null,
    enabled_by: null
  };
}

/**
 * Toggle or set Containment Mode
 */
function setContainmentMode({ enabled, reason = 'Operator triggered containment', actor = { username: 'admin' } }) {
  const currentState = getContainmentMode();
  const newState = {
    enabled: Boolean(enabled),
    reason: enabled ? (reason || 'Threat detected: containment active') : null,
    enabled_at: enabled ? new Date().toISOString() : null,
    enabled_by: enabled ? actor.username : null,
    disabled_at: !enabled ? new Date().toISOString() : null,
    disabled_by: !enabled ? actor.username : null
  };

  db.prepare(`
    INSERT INTO system_settings (key, value, updated_at) 
    VALUES ('containment_mode', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(JSON.stringify(newState));

  logAudit({
    actorUsername: actor.username,
    actorRole: 'admin',
    action: enabled ? 'CONTAINMENT_ENABLED' : 'CONTAINMENT_DISABLED',
    entityType: 'system',
    entityId: 'containment_mode',
    status: 'SUCCESS',
    details: { priorState: currentState, newState }
  });

  return newState;
}

/**
 * Compute real-time threat signals across rolling window
 */
function getThreatSignals(windowMinutes = 15) {
  // ISO cutoff timestamp
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  // Failed logins in window
  const failedLogins = db.prepare(`
    SELECT COUNT(*) as c FROM audit_logs 
    WHERE action = 'FAILED_LOGIN' 
    AND datetime(timestamp) >= datetime(?)
  `).get(cutoff).c;

  // Mass deletes in window
  const massDeletes = db.prepare(`
    SELECT COUNT(*) as c FROM audit_logs 
    WHERE action IN ('SOFT_DELETE', 'HARD_DELETE') 
    AND datetime(timestamp) >= datetime(?)
  `).get(cutoff).c;

  // Export bursts in window
  const exportBursts = db.prepare(`
    SELECT COUNT(*) as c FROM audit_logs 
    WHERE action = 'EXPORT' 
    AND datetime(timestamp) >= datetime(?)
  `).get(cutoff).c;

  // Threat threshold limits
  const THRESHOLDS = {
    failedLogins: { warning: 5, critical: 15 },
    massDeletes: { warning: 3, critical: 8 },
    exportBursts: { warning: 10, critical: 25 }
  };

  // Calculate scores
  let threatScore = 0;
  const anomalies = [];

  if (failedLogins >= THRESHOLDS.failedLogins.critical) {
    threatScore += 45;
    anomalies.push({
      type: 'FAILED_LOGIN_STORM',
      severity: 'CRITICAL',
      count: failedLogins,
      message: `Critical failed login storm detected (${failedLogins} attempts in ${windowMinutes}m)`
    });
  } else if (failedLogins >= THRESHOLDS.failedLogins.warning) {
    threatScore += 20;
    anomalies.push({
      type: 'FAILED_LOGIN_SPIKE',
      severity: 'WARNING',
      count: failedLogins,
      message: `Elevated failed logins (${failedLogins} attempts in ${windowMinutes}m)`
    });
  }

  if (massDeletes >= THRESHOLDS.massDeletes.critical) {
    threatScore += 50;
    anomalies.push({
      type: 'MASS_DELETE_SPIKE',
      severity: 'CRITICAL',
      count: massDeletes,
      message: `Mass deletion alert (${massDeletes} deletions in ${windowMinutes}m)`
    });
  } else if (massDeletes >= THRESHOLDS.massDeletes.warning) {
    threatScore += 25;
    anomalies.push({
      type: 'DELETE_SPIKE',
      severity: 'WARNING',
      count: massDeletes,
      message: `Unusual delete frequency (${massDeletes} deletions in ${windowMinutes}m)`
    });
  }

  if (exportBursts >= THRESHOLDS.exportBursts.critical) {
    threatScore += 35;
    anomalies.push({
      type: 'EXPORT_BURST',
      severity: 'CRITICAL',
      count: exportBursts,
      message: `High volume data exfiltration risk (${exportBursts} exports in ${windowMinutes}m)`
    });
  } else if (exportBursts >= THRESHOLDS.exportBursts.warning) {
    threatScore += 15;
    anomalies.push({
      type: 'EXPORT_SPIKE',
      severity: 'WARNING',
      count: exportBursts,
      message: `Elevated export activity (${exportBursts} exports in ${windowMinutes}m)`
    });
  }

  let threatLevel = 'NORMAL';
  if (threatScore >= 60) {
    threatLevel = 'CRITICAL';
  } else if (threatScore >= 20) {
    threatLevel = 'ELEVATED';
  }

  const containment = getContainmentMode();

  return {
    windowMinutes,
    threatScore,
    threatLevel,
    metrics: {
      failedLogins,
      massDeletes,
      exportBursts
    },
    thresholds: THRESHOLDS,
    anomalies,
    containment
  };
}

/**
 * Middleware: Blocks destructive or exfiltration requests if containment mode is active
 */
function containmentGuard(operationType = 'delete') {
  return (req, res, next) => {
    const containment = getContainmentMode();
    if (containment.enabled) {
      logAudit({
        actorUsername: req.session?.adminUser?.username || req.session?.user?.email || 'anonymous',
        actorRole: req.session?.adminUser ? 'admin' : (req.session?.user ? 'user' : 'anonymous'),
        action: 'CONTAINMENT_BLOCKED',
        entityType: 'security',
        entityId: operationType,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: 'BLOCKED',
        details: { blockedOperation: operationType, containmentReason: containment.reason }
      });

      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(423).json({
          success: false,
          blocked: true,
          error: 'CONTAINMENT_MODE_ACTIVE',
          message: `Operation '${operationType}' is currently locked. The system is operating in emergency containment mode. Reason: ${containment.reason}`
        });
      }

      return res.status(423).render('404', {
        title: 'System Containment Active',
        message: `Security Lock: The operation '${operationType}' has been suspended under active containment mode. Reason: ${containment.reason}`
      });
    }
    next();
  };
}

module.exports = {
  getContainmentMode,
  setContainmentMode,
  getThreatSignals,
  containmentGuard
};
