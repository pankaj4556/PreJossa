# PreJOSAA: JoSAA Choice Filling & Recovery Center

PreJOSAA is an enterprise-grade counseling decision support system built on an **Immutable-by-Design SQLite WAL architecture**, **Zero Trust Access**, and an automated **Recovery Center** capable of sub-second RTO restoration and verified clean recovery points.

---

## 🛡️ Recovery Center & Business Continuity Architecture

The application contains an administrative module — **Recovery Center** (`/@65783+@4556/admin/recovery`) — built for enterprise resilience, auditability, and rapid recovery from ransomware, data corruption, or operational errors.

### Core Capabilities:
1. **Automated Clean Recovery Point Validation**: Every backup is verified via a 4-tier check (`PRAGMA integrity_check`, `PRAGMA foreign_key_check`, minimum row count thresholds, smoke query join benchmarks) before being marked `VALIDATED_CLEAN` with a cryptographic SHA-256 fingerprint.
2. **Sub-Second RTO (Recovery Time Objective)**: Empirical sandbox restore drills measure and record recovery duration in milliseconds/seconds (Target SLA < 15 minutes; Measured: **~0.035 seconds**).
3. **RPO (Recovery Point Objective)**: Live tracking of data age vs. 4-hour SLA with automated alerting for stale points.
4. **Restore to Staging Workflow**: Safely copies SQLite snapshots to an isolated staging instance (`database/staging.sqlite`) and executes health audits without affecting production traffic.
5. **Immutable-by-Design Data**: Hard deletes are completely replaced with soft deletes (`is_deleted = 1`, `deleted_at`), append-only `audit_logs`, and full before/after state diff versioning in `record_versions`.
6. **Zero Trust Access**: RBAC, rate-limiting on authentication and export bursts, 30-minute idle session expiry, and step-up authentication (5-minute clearance token) for privileged destructive operations.
7. **Threat Signals & Containment Mode**: Real-time sliding window (15-min) tracking of failed login storms, mass deletes, and export bursts. An emergency circuit breaker globally freezes all deletes and file downloads across the application.

---

## 🎯 Ransomware scenario

> **Technical Interview Evidence & Drill Protocol**
> This walkthrough demonstrates how the system detects database tampering/corruption, isolates the threat, rolls back to the Last Known Good recovery point, and validates complete application health with zero data loss.

### Executive Summary:
| Metric | SLA Target | Measured in Drill | SLA Status |
| :--- | :--- | :--- | :--- |
| **RTO (Recovery Time Objective)** | < 15 minutes (900s) | **0.0356 seconds** | **EXCELLING (99.9% faster)** |
| **RPO (Recovery Point Objective)** | < 4 hours (240m) | **0 minutes (Live snapshots)** | **HEALTHY** |
| **Integrity Assurance** | PRAGMA check = 'ok' | **100% Passed (0 FK violations)** | **VERIFIED CLEAN** |
| **Data Loss** | 0 records | **0 records lost** | **ZERO DATA LOSS** |

---

### Step-by-Step Execution Guide

#### Step 1: Automated Clean Point Validation
Before any disaster, the system establishes a clean baseline. The backup engine creates a point-in-time snapshot and runs automated validation tests:
- `PRAGMA integrity_check` -> confirms zero corrupt pages or B-tree inconsistencies.
- `PRAGMA foreign_key_check` -> validates relational integrity across 10 tables.
- Table existence & row counts -> verifies core entities (`institutes`: 54, `programs`: 694, `closing_ranks`: 10,660).
- Calculates SHA-256 checksum and marks status as `VALIDATED_CLEAN`.

#### Step 2: Simulate Corruption (Ransomware Attack)
To simulate ransomware encryption or bit-rot corruption:
1. A sandbox copy of the SQLite database is created.
2. Malicious payload bytes (`!!!_MALICIOUS_RANSOMWARE_ENCRYPTED_HEADER_CORRUPTED_PAGE_DATA_!!!`) are injected directly into the database file header and page blocks.
3. The automated validation suite runs against the file:
   ```
   Integrity Check: UNCHECKED / FAILED
   Error Detected: Database connection/read error: database disk image is malformed
   Alert: Ransomware Tampering Caught Instantly!
   ```
4. If this occurs on a live system, **Containment Mode** is triggered (via UI or API), instantly locking all delete operations and freezing file downloads across the app with HTTP 423.

#### Step 3: Restore from Last Clean Point (RTO Benchmark)
The incident responder accesses the Recovery Center:
1. The system identifies the **Last Known Good** backup indexed with its cryptographic SHA-256 fingerprint.
2. The restore engine executes an atomic point-in-time cutover.
3. High-resolution timer measures empirical RTO:
   ```
   Sandbox Restore Drill Completed in: 0.0356 seconds
   Integrity Check Post-Restoration: OK
   ```

#### Step 4: Verify App is Healthy (Restore to Staging)
Prior to promoting to live production:
1. The backup is restored to the staging instance (`database/staging.sqlite`).
2. The staging health verification runner tests:
   - `PRAGMA integrity_check` -> **OK**
   - `PRAGMA foreign_key_check` -> **0 violations**
   - 100-join relational query benchmark -> **0.22 ms latency**
   - Table row count reconciliation -> All 10 tables verified intact.
3. Staging displays green badge: **"STAGING HEALTHY: READY FOR PRODUCTION PROMOTION"**.

---

### Automated CLI Verification Script

You can run the entire ransomware simulation, corruption injection, clean restore, and staging health check in an automated end-to-end command:

```bash
node scripts/simulate_ransomware_drill.js
```

**Expected Terminal Output:**
```text
======================================================================
  🛡️  PREJOSAA RECOVERY CENTER: RANSOMWARE SCENARIO SIMULATION DRILL
======================================================================

[STEP 1] Generating & Validating Baseline Clean Recovery Point...
  ✓ Backup File Created: backup-prejossa-2026-11-07T05-10-14-150Z.sqlite
  ✓ Cryptographic SHA-256: df2125c04c98ff67e0f1a010f0c53f3760751b4872bfee79152676e3b8b9d3bc
  ✓ Storage Integrity: OK
  ✓ Foreign Keys: OK
  ✓ Validation Status: VALIDATED_CLEAN
  ✓ Seed Row Counts: Institutes: 54, Programs: 694, Closing Ranks: 10660

[STEP 2] Simulating Ransomware Attack (Injecting Corrupted Bytes)...
  ✓ Corrupted victim file created at temporary sandbox
  ✓ Automated Integrity Check on Tampered File: UNCHECKED
  ✓ Errors Caught by Heuristics: Database connection/read error: database disk image is malformed
  🚨 Ransomware Tampering Caught Instantly by Recovery Suite!

[STEP 3] Restoring from Last Known Good Clean Point (Measuring Empirical RTO)...
  ✓ Sandbox Restore Drill Completed in: 0.0356 seconds!
  ✓ Measured RTO: 0.0356s (Target SLA: < 900s)
  ✓ Integrity Check Post-Restoration: OK

[STEP 4] Deploying Clean Recovery Point to Staging (database/staging.sqlite)...
  ✓ Staging Instance Deployed in: 0.029s
  ✓ Staging PRAGMA integrity_check: OK
  ✓ Staging PRAGMA foreign_key_check: OK
  ✓ Relational Benchmark (100 Joins): Latency 0.22ms
  ✓ Overall Staging Status: HEALTHY
  ✓ Staging Row Counts: Institutes: 54, Programs: 694, Admins: 2

======================================================================
  🎯 DRILL VERDICT: RECOVERY SUCCESSFUL (ZERO DATA LOSS)
======================================================================
  • Empirical RTO (Recovery Time Objective):  0.0356s (SLA: < 15m) -> EXCELLING
  • Actual RPO (Recovery Point Objective):    0m (SLA: < 4h)  -> HEALTHY
  • Cryptographic Checksum Verified:         df2125c04c98ff67e0f1a010f0c53f3760751b4872bfee79152676e3b8b9d3bc
  • Production Promotion Status:             READY FOR DEPLOYMENT
======================================================================
```

---

## 🔗 Route & URL Wiring Guide

The Recovery Center is cleanly wired into the administrative route tree:

| Module / Action | URL Endpoint | Access Level & Zero Trust Controls |
| :--- | :--- | :--- |
| **Admin Login** | `/@65783+@4556/admin/login` | Rate limited (10 attempts/5m), audit logged |
| **Admin Dashboard** | `/@65783+@4556/admin` | Session authenticated, 30m idle expiry |
| **Recovery Center Hub** | `/@65783+@4556/admin/recovery` | Admin RBAC, RPO/RTO & Threat summary |
| **Recovery Point Catalog** | `/@65783+@4556/admin/recovery/backups` | List, SHA-256 fingerprints, 4-tier validation |
| **Create Clean Backup** | `POST /@65783+@4556/admin/recovery/backups/create` | Rate limited, automated validation check |
| **Restore Drill Runner** | `/@65783+@4556/admin/recovery/drills` | Non-destructive sandbox drill, empirical RTO |
| **Restore to Staging** | `/@65783+@4556/admin/recovery/staging` | Restores to `database/staging.sqlite`, health checks |
| **RPO / RTO SLA View** | `/@65783+@4556/admin/recovery/rpo-rto` | Real-time SLA analysis & recovery architecture |
| **Threat Signals & Containment** | `/@65783+@4556/admin/recovery/threats` | Spikes monitor (deletes, exports, failed logins) |
| **Containment Killswitch** | `POST /@65783+@4556/admin/recovery/threats/containment` | **Step-Up Authentication Required** |
| **Step-Up Verification** | `/@65783+@4556/admin/recovery/step-up` | Re-verifies password, grants 5-minute clearance |
| **Append-Only Audit Logs** | `/@65783+@4556/admin/recovery/audit` | Filterable immutable audit ledger |
| **CSV Data Import** | `/@65783+@4556/admin/imports` | Bulk data upload and import audit |
| **Protected File Exports** | `/api/download/:format/:choiceListId` | Rate-limited (20/5m), containment guarded |

---

## 🚀 Running the Application

```bash
# Install dependencies
npm install

# Initialize database seed
npm run seed

# Start server
npm start
```
Default Admin credentials (development):
- **Username**: `admin`
- **Password**: `admin123`
- **Admin Portal**: `http://localhost:3000/@65783+@4556/admin`
- **Recovery Center**: `http://localhost:3000/@65783+@4556/admin/recovery`
