// scripts/test_recovery_suite.js
// Automated verification for Recovery Center & Zero Trust Security suite
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const {
  createValidatedBackup,
  validateDatabaseFile,
  runRestoreDrill,
  restoreToStaging,
  getRecoveryStats
} = require('../services/recoveryService');
const {
  logAudit,
  recordVersion,
  softDeleteRecord,
  restoreSoftDeletedRecord,
  getAuditLogs,
  getRecordVersions
} = require('../services/auditService');
const {
  getThreatSignals,
  getContainmentMode,
  setContainmentMode
} = require('../services/threatService');
const {
  verifyStepUp
} = require('../services/securityService');

async function testAll() {
  console.log('🧪 Starting Recovery Center & Resilience Test Suite...\n');

  // Test 1: Backup & Automated Validation
  console.log('[TEST 1] Creating Validated Clean Backup...');
  const backup = await createValidatedBackup({ backupType: 'test_suite', initiatedBy: 'automated_test' });
  assert.strictEqual(backup.status, 'validated_clean', 'Backup must be validated clean');
  assert.strictEqual(backup.validationReport.integrityCheck, 'OK');
  assert.strictEqual(backup.validationReport.foreignKeys, 'OK');
  assert(backup.checksum.length === 64, 'Checksum must be a 64-char hex SHA-256');
  console.log('  ✓ Test 1 Passed: Validated clean backup generated with SHA-256 hash\n');

  // Test 2: Restore Drill (RTO Measurement)
  console.log('[TEST 2] Executing Restore Drill...');
  const drill = await runRestoreDrill(backup.backupId, { username: 'test_operator' });
  assert.strictEqual(drill.status, 'PASSED');
  assert(typeof drill.rtoSeconds === 'number' && drill.rtoSeconds < 15, 'Drill RTO must be well under 15s');
  console.log(`  ✓ Test 2 Passed: Restore drill measured RTO at ${drill.rtoSeconds}s\n`);

  // Test 3: "Restore to Staging" Workflow
  console.log('[TEST 3] Running "Restore to Staging" Workflow...');
  const staging = await restoreToStaging(backup.backupId, { username: 'test_operator' });
  assert.strictEqual(staging.success, true);
  assert.strictEqual(staging.report.overallStatus, 'HEALTHY');
  assert.strictEqual(staging.report.healthChecks.integrityCheck, 'OK');
  assert.strictEqual(staging.report.healthChecks.foreignKeyCheck, 'OK');
  assert(fs.existsSync(staging.stagingDbPath), 'Staging file must exist on disk');
  console.log(`  ✓ Test 3 Passed: Staging database healthy at ${staging.stagingDbPath}\n`);

  // Test 4: Immutable-by-Design Soft Delete & Record Versioning
  console.log('[TEST 4] Testing Soft Delete & Versioning...');
  // Insert a test user
  const userInsert = db.prepare(`
    INSERT INTO users (name, email, password_hash, role) 
    VALUES ('Drill Tester', 'tester@recovery.test', 'hash123', 'user')
  `).run();
  const testUserId = userInsert.lastInsertRowid;

  // Perform soft delete
  const delResult = softDeleteRecord('users', testUserId, { id: 1, username: 'admin', role: 'admin' }, 'Testing soft delete');
  assert.strictEqual(delResult.success, true);

  const softDeletedUser = db.prepare(`SELECT is_deleted, deleted_at FROM users WHERE id = ?`).get(testUserId);
  assert.strictEqual(softDeletedUser.is_deleted, 1, 'is_deleted must be 1');
  assert(softDeletedUser.deleted_at !== null, 'deleted_at must have timestamp');

  // Check version history
  const versions = getRecordVersions('users', testUserId);
  assert(versions.length >= 1, 'Record versions must contain version entry');
  assert.strictEqual(versions[0].action, 'SOFT_DELETE');

  // Restore soft-deleted record
  const restoreRes = restoreSoftDeletedRecord('users', testUserId, { id: 1, username: 'admin', role: 'admin' });
  assert.strictEqual(restoreRes.success, true);
  const restoredUser = db.prepare(`SELECT is_deleted, deleted_at FROM users WHERE id = ?`).get(testUserId);
  assert.strictEqual(restoredUser.is_deleted, 0);
  assert.strictEqual(restoredUser.deleted_at, null);
  console.log('  ✓ Test 4 Passed: Soft delete, retention, before/after versioning, and restore operational\n');

  // Test 5: Threat Signals & Containment Mode
  console.log('[TEST 5] Testing Threat Heuristics & Containment Mode...');
  const initialThreats = getThreatSignals(15);
  assert(typeof initialThreats.threatScore === 'number');

  // Enable containment mode
  setContainmentMode({ enabled: true, reason: 'Drill containment test', actor: { username: 'security_admin' } });
  const containmentActive = getContainmentMode();
  assert.strictEqual(containmentActive.enabled, true);
  assert.strictEqual(containmentActive.reason, 'Drill containment test');

  // Disable containment mode
  setContainmentMode({ enabled: false, actor: { username: 'security_admin' } });
  const containmentDisabled = getContainmentMode();
  assert.strictEqual(containmentDisabled.enabled, false);
  console.log('  ✓ Test 5 Passed: Threat calculation and Containment Mode toggle validated\n');

  // Test 6: Zero Trust Step-Up Authentication
  console.log('[TEST 6] Testing Admin Step-Up Authentication...');
  const okPass = verifyStepUp('admin', 'admin123');
  const badPass = verifyStepUp('admin', 'wrong_password_xyz');
  assert.strictEqual(okPass, true, 'Valid password must verify step-up');
  assert.strictEqual(badPass, false, 'Invalid password must reject step-up');
  console.log('  ✓ Test 6 Passed: Admin step-up authentication check passed\n');

  // Test 7: Append-Only Audit Logs
  console.log('[TEST 7] Verifying Append-Only Audit Logs...');
  const { logs, total } = getAuditLogs({ limit: 10 });
  assert(total > 0, 'Audit logs must have recorded system operations');
  console.log(`  ✓ Test 7 Passed: ${total} audit logs indexed in append-only table\n`);

  console.log('======================================================================');
  console.log('  🎉 ALL 7 RECOVERY & RESILIENCE TESTS PASSED CLEANLY');
  console.log('======================================================================\n');
}

testAll().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
