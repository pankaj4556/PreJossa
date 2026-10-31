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

module.exports = db;
