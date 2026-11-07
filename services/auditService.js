// services/auditService.js
// Immutable audit logging and record versioning
const db = require('../database/db');

// Ensure tables exist
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    actor_id INTEGER,
    actor_username TEXT,
    actor_role TEXT DEFAULT 'system',
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'SUCCESS',
    details TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_username);

  CREATE TABLE IF NOT EXISTS record_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    version_num INTEGER NOT NULL,
    changed_by TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    action TEXT NOT NULL,
    before_state TEXT,
    after_state TEXT,
    diff_summary TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_record_versions_lookup ON record_versions(table_name, record_id);
`);

/**
 * Append an immutable log entry to audit_logs
 */
function logAudit({
  actorId = null,
  actorUsername = 'system',
  actorRole = 'system',
  action,
  entityType,
  entityId = null,
  ipAddress = '127.0.0.1',
  userAgent = 'internal',
  status = 'SUCCESS',
  details = null
}) {
  try {
    const detailsStr = typeof details === 'object' && details !== null 
      ? JSON.stringify(details) 
      : (details || null);

    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        actor_id, actor_username, actor_role, action, 
        entity_type, entity_id, ip_address, user_agent, status, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      actorId,
      actorUsername,
      actorRole,
      action,
      entityType,
      entityId ? String(entityId) : null,
      ipAddress,
      userAgent,
      status,
      detailsStr
    );
  } catch (err) {
    console.error('[AUDIT_LOG_ERROR] Failed to record audit log:', err.message);
  }
}

/**
 * Record a version change with before/after snapshots and diff calculation
 */
function recordVersion({
  tableName,
  recordId,
  changedBy = 'system',
  action = 'UPDATE',
  beforeState = null,
  afterState = null,
  diffSummary = null
}) {
  try {
    // Get latest version number for this record
    const latest = db.prepare(`
      SELECT MAX(version_num) as v FROM record_versions 
      WHERE table_name = ? AND record_id = ?
    `).get(tableName, recordId);

    const nextVersion = (latest && latest.v ? latest.v : 0) + 1;

    let computedDiff = diffSummary;
    if (!computedDiff && beforeState && afterState) {
      const bObj = typeof beforeState === 'string' ? JSON.parse(beforeState) : beforeState;
      const aObj = typeof afterState === 'string' ? JSON.parse(afterState) : afterState;
      const changes = [];
      const keys = new Set([...Object.keys(bObj || {}), ...Object.keys(aObj || {})]);
      for (const k of keys) {
        if (JSON.stringify(bObj[k]) !== JSON.stringify(aObj[k])) {
          changes.push(`${k}: ${JSON.stringify(bObj[k])} -> ${JSON.stringify(aObj[k])}`);
        }
      }
      computedDiff = changes.join('; ') || 'No column delta';
    }

    const stmt = db.prepare(`
      INSERT INTO record_versions (
        table_name, record_id, version_num, changed_by, action,
        before_state, after_state, diff_summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      tableName,
      recordId,
      nextVersion,
      changedBy,
      action,
      typeof beforeState === 'object' && beforeState !== null ? JSON.stringify(beforeState) : beforeState,
      typeof afterState === 'object' && afterState !== null ? JSON.stringify(afterState) : afterState,
      computedDiff
    );

    return nextVersion;
  } catch (err) {
    console.error('[VERSIONING_ERROR] Failed to record version:', err.message);
    return null;
  }
}

/**
 * Soft delete a record instead of hard deleting
 */
function softDeleteRecord(tableName, recordId, actor = { id: null, username: 'admin', role: 'admin' }, reason = 'Manual soft delete') {
  const allowedTables = ['users', 'choice_lists', 'payments', 'purchases'];
  if (!allowedTables.includes(tableName)) {
    throw new Error(`Soft deletes are only permitted on registered entities (${allowedTables.join(', ')}).`);
  }

  const existing = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(recordId);
  if (!existing) {
    throw new Error(`Record ${recordId} not found in ${tableName}.`);
  }

  if (existing.is_deleted === 1) {
    return { alreadyDeleted: true, message: 'Record is already soft-deleted.' };
  }

  // Update record with soft delete flags
  db.prepare(`
    UPDATE ${tableName} 
    SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(recordId);

  const updated = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(recordId);

  // Record version
  recordVersion({
    tableName,
    recordId,
    changedBy: actor.username,
    action: 'SOFT_DELETE',
    beforeState: existing,
    afterState: updated,
    diffSummary: `Soft deleted by ${actor.username}. Reason: ${reason}`
  });

  // Log in append-only audit log
  logAudit({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    action: 'SOFT_DELETE',
    entityType: tableName,
    entityId: recordId,
    status: 'SUCCESS',
    details: { reason, priorState: existing }
  });

  return { success: true, message: `Record ${recordId} in ${tableName} has been soft deleted.` };
}

/**
 * Restore a soft-deleted record
 */
function restoreSoftDeletedRecord(tableName, recordId, actor = { id: null, username: 'admin', role: 'admin' }) {
  const allowedTables = ['users', 'choice_lists', 'payments', 'purchases'];
  if (!allowedTables.includes(tableName)) {
    throw new Error(`Entity not supported.`);
  }

  const existing = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(recordId);
  if (!existing || existing.is_deleted !== 1) {
    throw new Error(`Record ${recordId} is not in a soft-deleted state.`);
  }

  db.prepare(`
    UPDATE ${tableName} 
    SET is_deleted = 0, deleted_at = NULL 
    WHERE id = ?
  `).run(recordId);

  const restored = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(recordId);

  recordVersion({
    tableName,
    recordId,
    changedBy: actor.username,
    action: 'RESTORE',
    beforeState: existing,
    afterState: restored,
    diffSummary: `Restored from soft deletion by ${actor.username}`
  });

  logAudit({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    action: 'RESTORE_RECORD',
    entityType: tableName,
    entityId: recordId,
    status: 'SUCCESS',
    details: { priorDeletedAt: existing.deleted_at }
  });

  return { success: true, message: `Record ${recordId} restored successfully.` };
}

/**
 * Fetch paginated audit logs
 */
function getAuditLogs({ limit = 50, offset = 0, action = null, status = null } = {}) {
  let query = `SELECT * FROM audit_logs WHERE 1=1`;
  const params = [];

  if (action) {
    query += ` AND action = ?`;
    params.push(action);
  }
  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const logs = db.prepare(query).all(...params);
  const total = db.prepare(`SELECT COUNT(*) as c FROM audit_logs`).get().c;

  return { logs, total };
}

/**
 * Fetch version history for a specific record
 */
function getRecordVersions(tableName, recordId) {
  return db.prepare(`
    SELECT * FROM record_versions 
    WHERE table_name = ? AND record_id = ? 
    ORDER BY version_num DESC
  `).all(tableName, recordId);
}

module.exports = {
  logAudit,
  recordVersion,
  softDeleteRecord,
  restoreSoftDeletedRecord,
  getAuditLogs,
  getRecordVersions
};
