// database/db.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const config = require('../config.json');
const dbPath = path.resolve(__dirname, '..', config.paths.database || './database/database.sqlite');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath, {
  // verbose: console.log
});

// Enable WAL mode for high concurrency & foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Safe migration: Add Razorpay gateway columns to payments table if missing
try {
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='payments'").get();
  if (tableCheck) {
    const paymentCols = db.prepare("PRAGMA table_info(payments)").all().map(c => c.name);
    if (!paymentCols.includes('razorpay_order_id')) {
      db.exec("ALTER TABLE payments ADD COLUMN razorpay_order_id TEXT;");
      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_rzp_order ON payments(razorpay_order_id);");
    }
    if (!paymentCols.includes('razorpay_payment_id')) {
      db.exec("ALTER TABLE payments ADD COLUMN razorpay_payment_id TEXT;");
      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_rzp_payment ON payments(razorpay_payment_id);");
    }
    if (!paymentCols.includes('razorpay_signature')) {
      db.exec("ALTER TABLE payments ADD COLUMN razorpay_signature TEXT;");
    }
    if (!paymentCols.includes('error_description')) {
      db.exec("ALTER TABLE payments ADD COLUMN error_description TEXT;");
    }
  }
} catch (migErr) {
  console.warn('Note on payments schema migration:', migErr.message);
}

// Safe migration: Add soft delete columns (is_deleted, deleted_at) across mutable tables
try {
  const softDeleteTables = ['users', 'choice_lists', 'payments', 'purchases'];
  for (const tbl of softDeleteTables) {
    const tblExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tbl);
    if (tblExists) {
      const cols = db.prepare(`PRAGMA table_info(${tbl})`).all().map(c => c.name);
      if (!cols.includes('is_deleted')) {
        db.exec(`ALTER TABLE ${tbl} ADD COLUMN is_deleted INTEGER DEFAULT 0;`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_${tbl}_is_deleted ON ${tbl}(is_deleted);`);
      }
      if (!cols.includes('deleted_at')) {
        db.exec(`ALTER TABLE ${tbl} ADD COLUMN deleted_at DATETIME;`);
      }
    }
  }
} catch (softDelErr) {
  console.warn('Note on soft delete columns migration:', softDelErr.message);
}

// Ensure admin_users table and default admin exist
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const adminUser = (process.env.ADMIN_USERNAME || 'admin').trim();
  const adminPass = (process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'admin123')).trim();
  if (adminPass) {
    const existingAdmin = db.prepare("SELECT id, password_hash FROM admin_users WHERE username = ?").get(adminUser);
    const bcrypt = require('bcryptjs');
    if (!existingAdmin) {
      const hash = bcrypt.hashSync(adminPass, 10);
      db.prepare("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)").run(adminUser, hash);
    } else if (process.env.ADMIN_PASSWORD && !bcrypt.compareSync(adminPass, existingAdmin.password_hash)) {
      const hash = bcrypt.hashSync(adminPass, 10);
      db.prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?").run(hash, existingAdmin.id);
    }
  }
} catch (adminInitErr) {
  console.warn('Note on admin_users table check:', adminInitErr.message);
}

module.exports = db;
