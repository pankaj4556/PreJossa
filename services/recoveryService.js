// services/recoveryService.js
// Recovery Center: Backups, Automated Clean Validation, Restore Drills, RPO/RTO & Staging Workflows
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../database/db');
const { logAudit } = require('./auditService');

const BACKUP_DIR = path.resolve(__dirname, '../storage/backups');
const STAGING_DB_PATH = path.resolve(__dirname, '../database/staging.sqlite');

// Ensure storage directories exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Ensure catalog tables exist
db.exec(`
  CREATE TABLE IF NOT EXISTS backup_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    filesize_bytes INTEGER,
    sha256_checksum TEXT,
    status TEXT DEFAULT 'in_progress', -- 'validated_clean', 'validation_failed', 'in_progress'
    integrity_check_status TEXT,
    foreign_key_status TEXT,
    row_counts_json TEXT,
    validation_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    validated_at DATETIME,
    is_last_known_good INTEGER DEFAULT 0,
    backup_type TEXT DEFAULT 'manual' -- 'manual', 'scheduled', 'pre_restore'
  );
  CREATE INDEX IF NOT EXISTS idx_backup_catalog_status ON backup_catalog(status);
  CREATE INDEX IF NOT EXISTS idx_backup_catalog_good ON backup_catalog(is_last_known_good);

  CREATE TABLE IF NOT EXISTS restore_drills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_id INTEGER,
    drill_type TEXT DEFAULT 'sandbox_drill', -- 'sandbox_drill', 'staging_restore', 'simulation'
    target_instance TEXT,
    rto_seconds REAL,
    status TEXT DEFAULT 'PASSED', -- 'PASSED', 'FAILED'
    health_report_json TEXT,
    executed_by TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (backup_id) REFERENCES backup_catalog(id)
  );
`);

/**
 * Calculate SHA-256 Checksum of a file
 */
function calculateSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', err => reject(err));
  });
}

/**
 * Run Automated Validation Suite on any SQLite database file
 */
function validateDatabaseFile(filePath) {
  let targetDb = null;
  const report = {
    isValid: false,
    integrityCheck: 'UNCHECKED',
    foreignKeys: 'UNCHECKED',
    rowCounts: {},
    smokeQueries: [],
    errors: [],
    validatedAt: new Date().toISOString()
  };

  try {
    targetDb = new Database(filePath, { readonly: true, fileMustExist: true });

    // 1. PRAGMA integrity_check
    const integrityRows = targetDb.pragma('integrity_check');
    if (integrityRows && integrityRows.length === 1 && (integrityRows[0].integrity_check === 'ok' || integrityRows[0] === 'ok')) {
      report.integrityCheck = 'OK';
    } else {
      report.integrityCheck = 'FAILED';
      report.errors.push(`Integrity check failed: ${JSON.stringify(integrityRows)}`);
    }

    // 2. PRAGMA foreign_key_check
    const fkRows = targetDb.pragma('foreign_key_check');
    if (Array.isArray(fkRows) && fkRows.length === 0) {
      report.foreignKeys = 'OK';
    } else {
      report.foreignKeys = 'FAILED';
      report.errors.push(`Foreign key violations detected: ${fkRows.length} errors`);
    }

    // 3. Row count audit for critical tables
    const criticalTables = ['institutes', 'programs', 'closing_ranks', 'admin_users', 'users', 'choice_lists'];
    for (const table of criticalTables) {
      try {
        const count = targetDb.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
        report.rowCounts[table] = count;
      } catch (tableErr) {
        report.rowCounts[table] = 0;
        report.errors.push(`Missing or unreadable table '${table}': ${tableErr.message}`);
      }
    }

    // 4. Smoke Queries (Simulate real app queries)
    try {
      const adminCount = targetDb.prepare(`SELECT COUNT(*) as c FROM admin_users`).get().c;
      report.smokeQueries.push({ name: 'Admin User Exists', status: adminCount > 0 ? 'PASS' : 'WARN', count: adminCount });
    } catch (e) {
      report.smokeQueries.push({ name: 'Admin User Exists', status: 'FAIL', error: e.message });
      report.errors.push(`Smoke query failed: admin user check`);
    }

    try {
      const sampleProgram = targetDb.prepare(`
        SELECT p.original_name, i.name as inst_name 
        FROM programs p 
        JOIN institutes i ON p.institute_id = i.id 
        LIMIT 1
      `).get();
      report.smokeQueries.push({
        name: 'Relational Program Join',
        status: sampleProgram ? 'PASS' : 'WARN',
        sample: sampleProgram ? `${sampleProgram.inst_name} - ${sampleProgram.original_name}` : 'none'
      });
    } catch (e) {
      report.smokeQueries.push({ name: 'Relational Program Join', status: 'FAIL', error: e.message });
      report.errors.push(`Smoke query failed: program join check`);
    }

    report.isValid = report.integrityCheck === 'OK' && report.foreignKeys === 'OK' && report.errors.length === 0;
  } catch (err) {
    report.errors.push(`Database connection/read error: ${err.message}`);
    report.isValid = false;
  } finally {
    if (targetDb) {
      try {
        targetDb.close();
      } catch (closeErr) {
        console.warn('Error closing validation db:', closeErr.message);
      }
    }
  }

  return report;
}

/**
 * Create a new backup and run automated clean validation
 */
async function createValidatedBackup({ backupType = 'manual', initiatedBy = 'admin' } = {}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-prejossa-${timestamp}.sqlite`;
  const backupPath = path.join(BACKUP_DIR, filename);

  // 1. Initial catalog entry in progress
  const insertStmt = db.prepare(`
    INSERT INTO backup_catalog (filename, filepath, status, backup_type)
    VALUES (?, ?, 'in_progress', ?)
  `);
  const record = insertStmt.run(filename, backupPath, backupType);
  const backupId = record.lastInsertRowid;

  try {
    // 2. Perform online SQLite backup safely using better-sqlite3 backup API
    await db.backup(backupPath);

    // 3. Compute file size and SHA-256
    const stat = fs.statSync(backupPath);
    const checksum = await calculateSha256(backupPath);

    // 4. Run automated validation checks
    const valReport = validateDatabaseFile(backupPath);

    const status = valReport.isValid ? 'validated_clean' : 'validation_failed';
    const isClean = valReport.isValid ? 1 : 0;

    // 5. Update catalog
    if (isClean) {
      // Unset previous last known good, promote this one
      db.prepare(`UPDATE backup_catalog SET is_last_known_good = 0 WHERE is_last_known_good = 1`).run();
    }

    db.prepare(`
      UPDATE backup_catalog 
      SET filesize_bytes = ?,
          sha256_checksum = ?,
          status = ?,
          integrity_check_status = ?,
          foreign_key_status = ?,
          row_counts_json = ?,
          validation_notes = ?,
          validated_at = CURRENT_TIMESTAMP,
          is_last_known_good = ?
      WHERE id = ?
    `).run(
      stat.size,
      checksum,
      status,
      valReport.integrityCheck,
      valReport.foreignKeys,
      JSON.stringify(valReport.rowCounts),
      JSON.stringify(valReport),
      isClean,
      backupId
    );

    // 6. Immutable audit log entry
    logAudit({
      actorUsername: initiatedBy,
      actorRole: 'admin',
      action: isClean ? 'BACKUP_VALIDATED_CLEAN' : 'BACKUP_VALIDATION_FAILED',
      entityType: 'backup',
      entityId: backupId,
      status: isClean ? 'SUCCESS' : 'FAILURE',
      details: {
        filename,
        filesizeBytes: stat.size,
        checksum,
        integrityCheck: valReport.integrityCheck,
        foreignKeys: valReport.foreignKeys,
        errors: valReport.errors
      }
    });

    return {
      success: true,
      backupId,
      filename,
      filepath: backupPath,
      filesizeBytes: stat.size,
      checksum,
      status,
      validationReport: valReport
    };
  } catch (backupErr) {
    db.prepare(`
      UPDATE backup_catalog 
      SET status = 'validation_failed', 
          validation_notes = ? 
      WHERE id = ?
    `).run(backupErr.message, backupId);

    logAudit({
      actorUsername: initiatedBy,
      actorRole: 'admin',
      action: 'BACKUP_FAILED',
      entityType: 'backup',
      entityId: backupId,
      status: 'FAILURE',
      details: { error: backupErr.message }
    });

    throw backupErr;
  }
}

/**
 * Re-validate an existing backup
 */
async function revalidateBackup(backupId, actor = { username: 'admin' }) {
  const backup = db.prepare(`SELECT * FROM backup_catalog WHERE id = ?`).get(backupId);
  if (!backup) throw new Error('Backup not found');
  if (!fs.existsSync(backup.filepath)) throw new Error('Backup file does not exist on disk');

  const checksum = await calculateSha256(backup.filepath);
  const valReport = validateDatabaseFile(backup.filepath);
  const status = valReport.isValid ? 'validated_clean' : 'validation_failed';

  if (valReport.isValid && !backup.is_last_known_good) {
    db.prepare(`UPDATE backup_catalog SET is_last_known_good = 0 WHERE is_last_known_good = 1`).run();
    db.prepare(`UPDATE backup_catalog SET is_last_known_good = 1 WHERE id = ?`).run(backupId);
  }

  db.prepare(`
    UPDATE backup_catalog 
    SET sha256_checksum = ?,
        status = ?,
        integrity_check_status = ?,
        foreign_key_status = ?,
        row_counts_json = ?,
        validation_notes = ?,
        validated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    checksum,
    status,
    valReport.integrityCheck,
    valReport.foreignKeys,
    JSON.stringify(valReport.rowCounts),
    JSON.stringify(valReport),
    backupId
  );

  logAudit({
    actorUsername: actor.username,
    actorRole: 'admin',
    action: 'BACKUP_REVALIDATED',
    entityType: 'backup',
    entityId: backupId,
    status: valReport.isValid ? 'SUCCESS' : 'FAILURE',
    details: valReport
  });

  return { success: true, status, report: valReport };
}

/**
 * Run a non-destructive Sandbox Restore Drill (measures RTO)
 */
async function runRestoreDrill(backupId = null, actor = { username: 'admin' }) {
  // If backupId is not provided, use the Last Known Good backup
  let backup = null;
  if (backupId) {
    backup = db.prepare(`SELECT * FROM backup_catalog WHERE id = ?`).get(backupId);
  } else {
    backup = db.prepare(`SELECT * FROM backup_catalog WHERE is_last_known_good = 1 ORDER BY id DESC LIMIT 1`).get();
  }

  if (!backup) {
    throw new Error('No valid clean backup available to run restore drill. Please create a backup first.');
  }

  const startHr = process.hrtime.bigint();
  const tempDrillPath = path.join(BACKUP_DIR, `temp_drill_${Date.now()}.sqlite`);

  try {
    // 1. Copy backup file to isolated temp drill path
    fs.copyFileSync(backup.filepath, tempDrillPath);

    // 2. Run full validation checks and smoke tests
    const valReport = validateDatabaseFile(tempDrillPath);

    // 3. Measure RTO (Recovery Time Objective in seconds)
    const endHr = process.hrtime.bigint();
    const rtoSeconds = Number(endHr - startHr) / 1e9;

    const drillPassed = valReport.isValid;

    // 4. Record drill result in restore_drills table
    const drillRecord = db.prepare(`
      INSERT INTO restore_drills (
        backup_id, drill_type, target_instance, rto_seconds, status, health_report_json, executed_by
      ) VALUES (?, 'sandbox_drill', 'isolated_temp_sandbox', ?, ?, ?, ?)
    `).run(
      backup.id,
      parseFloat(rtoSeconds.toFixed(4)),
      drillPassed ? 'PASSED' : 'FAILED',
      JSON.stringify(valReport),
      actor.username
    );

    // 5. Clean up temporary drill database
    if (fs.existsSync(tempDrillPath)) {
      try {
        fs.unlinkSync(tempDrillPath);
      } catch (uErr) {
        console.warn('Temp drill unlink error:', uErr.message);
      }
    }

    // 6. Audit log
    logAudit({
      actorUsername: actor.username,
      actorRole: 'admin',
      action: 'RESTORE_DRILL_COMPLETED',
      entityType: 'drill',
      entityId: drillRecord.lastInsertRowid,
      status: drillPassed ? 'SUCCESS' : 'FAILURE',
      details: {
        backupId: backup.id,
        filename: backup.filename,
        rtoSeconds,
        integrityCheck: valReport.integrityCheck,
        errors: valReport.errors
      }
    });

    return {
      success: true,
      drillId: drillRecord.lastInsertRowid,
      backupId: backup.id,
      backupFilename: backup.filename,
      rtoSeconds: parseFloat(rtoSeconds.toFixed(4)),
      status: drillPassed ? 'PASSED' : 'FAILED',
      validationReport: valReport
    };
  } catch (drillErr) {
    if (fs.existsSync(tempDrillPath)) {
      try { fs.unlinkSync(tempDrillPath); } catch (e) {}
    }
    throw drillErr;
  }
}

/**
 * "Restore to Staging" Workflow:
 * Copies SQLite DB file to a separate staging instance (database/staging.sqlite)
 * and executes comprehensive automated health checks.
 */
async function restoreToStaging(backupId = null, actor = { username: 'admin' }) {
  let backup = null;
  if (backupId) {
    backup = db.prepare(`SELECT * FROM backup_catalog WHERE id = ?`).get(backupId);
  } else {
    backup = db.prepare(`SELECT * FROM backup_catalog WHERE is_last_known_good = 1 ORDER BY id DESC LIMIT 1`).get();
  }

  // If no backup exists yet, automatically create one from live DB
  if (!backup) {
    const fresh = await createValidatedBackup({ backupType: 'manual', initiatedBy: actor.username });
    backup = db.prepare(`SELECT * FROM backup_catalog WHERE id = ?`).get(fresh.backupId);
  }

  const startHr = process.hrtime.bigint();

  // 1. Remove prior staging db files (including shm/wal if present)
  for (const ext of ['', '-shm', '-wal']) {
    const p = `${STAGING_DB_PATH}${ext}`;
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch (e) {}
    }
  }

  // 2. Copy backup file to staging instance
  fs.copyFileSync(backup.filepath, STAGING_DB_PATH);

  // 3. Connect to staging instance and run health checks
  let stagingDb = null;
  const stagingReport = {
    stagingDbPath: STAGING_DB_PATH,
    backupSource: backup.filename,
    backupChecksum: backup.sha256_checksum,
    healthChecks: {},
    tableMetrics: {},
    queryPerformanceMs: 0,
    overallStatus: 'HEALTHY'
  };

  try {
    stagingDb = new Database(STAGING_DB_PATH);
    stagingDb.pragma('journal_mode = WAL');

    // Health check 1: PRAGMA integrity_check
    const integrityRes = stagingDb.pragma('integrity_check');
    stagingReport.healthChecks.integrityCheck = (integrityRes[0]?.integrity_check === 'ok' || integrityRes[0] === 'ok') ? 'OK' : 'FAILED';

    // Health check 2: PRAGMA foreign_key_check
    const fkRes = stagingDb.pragma('foreign_key_check');
    stagingReport.healthChecks.foreignKeyCheck = fkRes.length === 0 ? 'OK' : 'FAILED';

    // Health check 3: Table counts
    const tables = ['institutes', 'programs', 'closing_ranks', 'nirf_rankings', 'placements', 'users', 'choice_lists', 'payments', 'purchases', 'admin_users'];
    for (const t of tables) {
      try {
        const count = stagingDb.prepare(`SELECT count(*) as c FROM ${t}`).get().c;
        stagingReport.tableMetrics[t] = count;
      } catch (e) {
        stagingReport.tableMetrics[t] = 0;
      }
    }

    // Health check 4: Query Benchmark
    const qStart = process.hrtime.bigint();
    const benchmarkRows = stagingDb.prepare(`
      SELECT p.original_name, i.name, cr.closing_rank 
      FROM closing_ranks cr 
      JOIN programs p ON cr.program_id = p.id 
      JOIN institutes i ON p.institute_id = i.id 
      LIMIT 100
    `).all();
    const qEnd = process.hrtime.bigint();
    stagingReport.queryPerformanceMs = Number(qEnd - qStart) / 1e6;
    stagingReport.healthChecks.queryExecution = benchmarkRows.length > 0 ? 'PASS' : 'WARN';

    if (stagingReport.healthChecks.integrityCheck !== 'OK' || stagingReport.healthChecks.foreignKeyCheck !== 'OK') {
      stagingReport.overallStatus = 'UNHEALTHY';
    }
  } finally {
    if (stagingDb) {
      try { stagingDb.close(); } catch (e) {}
    }
  }

  const endHr = process.hrtime.bigint();
  const rtoSeconds = Number(endHr - startHr) / 1e9;

  // Record drill in database
  const drillRecord = db.prepare(`
    INSERT INTO restore_drills (
      backup_id, drill_type, target_instance, rto_seconds, status, health_report_json, executed_by
    ) VALUES (?, 'staging_restore', 'database/staging.sqlite', ?, ?, ?, ?)
  `).run(
    backup.id,
    parseFloat(rtoSeconds.toFixed(4)),
    stagingReport.overallStatus === 'HEALTHY' ? 'PASSED' : 'FAILED',
    JSON.stringify(stagingReport),
    actor.username
  );

  logAudit({
    actorUsername: actor.username,
    actorRole: 'admin',
    action: 'RESTORE_TO_STAGING',
    entityType: 'staging',
    entityId: drillRecord.lastInsertRowid,
    status: stagingReport.overallStatus === 'HEALTHY' ? 'SUCCESS' : 'FAILURE',
    details: {
      backupId: backup.id,
      rtoSeconds,
      overallStatus: stagingReport.overallStatus,
      tableMetrics: stagingReport.tableMetrics
    }
  });

  return {
    success: stagingReport.overallStatus === 'HEALTHY',
    drillId: drillRecord.lastInsertRowid,
    backupId: backup.id,
    backupFilename: backup.filename,
    stagingDbPath: STAGING_DB_PATH,
    rtoSeconds: parseFloat(rtoSeconds.toFixed(4)),
    report: stagingReport
  };
}

/**
 * Get comprehensive Recovery Center Metrics (RPO, RTO, Last Known Good, etc.)
 */
function getRecoveryStats() {
  const TARGET_RPO_MINUTES = 240; // 4 Hours target SLA
  const TARGET_RTO_MINUTES = 15;  // 15 Minutes target SLA

  // Last Known Good
  const lastKnownGood = db.prepare(`
    SELECT * FROM backup_catalog 
    WHERE is_last_known_good = 1 
    ORDER BY id DESC LIMIT 1
  `).get();

  // All backups (latest 20)
  const backups = db.prepare(`
    SELECT * FROM backup_catalog 
    ORDER BY id DESC LIMIT 20
  `).all();

  // Latest Restore Drills (latest 10)
  const recentDrills = db.prepare(`
    SELECT rd.*, bc.filename as backup_filename 
    FROM restore_drills rd 
    LEFT JOIN backup_catalog bc ON rd.backup_id = bc.id 
    ORDER BY rd.id DESC LIMIT 10
  `).all();

  // Latest Measured RTO from restore drills
  const latestDrill = recentDrills[0] || null;
  const measuredRtoSeconds = latestDrill ? latestDrill.rto_seconds : null;

  // Compute Actual RPO (Minutes since last clean backup)
  let actualRpoMinutes = null;
  let rpoStatus = 'NO_BACKUP';

  if (lastKnownGood && lastKnownGood.created_at) {
    const timeStr = lastKnownGood.created_at.includes('Z') 
      ? lastKnownGood.created_at 
      : `${lastKnownGood.created_at.replace(' ', 'T')}Z`;
    const backupTime = new Date(timeStr).getTime();
    const now = Date.now();
    actualRpoMinutes = Math.max(0, Math.round((now - backupTime) / (60 * 1000)));

    if (actualRpoMinutes <= TARGET_RPO_MINUTES) {
      rpoStatus = 'HEALTHY';
    } else if (actualRpoMinutes <= TARGET_RPO_MINUTES * 2) {
      rpoStatus = 'AT_RISK';
    } else {
      rpoStatus = 'BREACHED';
    }
  }

  // RTO Status
  let rtoStatus = 'UNMEASURED';
  if (measuredRtoSeconds !== null) {
    if (measuredRtoSeconds <= TARGET_RTO_MINUTES * 60) {
      rtoStatus = 'EXCELLING'; // Typically SQLite file copy takes < 2 seconds!
    } else {
      rtoStatus = 'BREACHED';
    }
  }

  // Check Staging DB status
  const stagingExists = fs.existsSync(STAGING_DB_PATH);
  let stagingStat = null;
  if (stagingExists) {
    const s = fs.statSync(STAGING_DB_PATH);
    stagingStat = {
      path: STAGING_DB_PATH,
      sizeBytes: s.size,
      updatedAt: s.mtime.toISOString()
    };
  }

  return {
    sla: {
      targetRpoMinutes: TARGET_RPO_MINUTES,
      targetRtoMinutes: TARGET_RTO_MINUTES
    },
    rpo: {
      actualMinutes: actualRpoMinutes,
      status: rpoStatus,
      lastBackupTime: lastKnownGood ? lastKnownGood.created_at : null
    },
    rto: {
      measuredSeconds: measuredRtoSeconds,
      status: rtoStatus,
      lastDrillTime: latestDrill ? latestDrill.executed_at : null
    },
    lastKnownGood,
    backups,
    recentDrills,
    staging: stagingStat
  };
}

module.exports = {
  createValidatedBackup,
  validateDatabaseFile,
  revalidateBackup,
  runRestoreDrill,
  restoreToStaging,
  getRecoveryStats,
  calculateSha256,
  BACKUP_DIR,
  STAGING_DB_PATH
};
