-- JoSAA Choice Filling and College Explorer Database Schema
-- File: database/schema.sql

CREATE TABLE IF NOT EXISTS institutes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'IIT' or 'NIT'
    josaa_code TEXT NOT NULL UNIQUE,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    established_year INTEGER,
    website TEXT,
    annual_fee TEXT,
    campus_type TEXT,
    source_url TEXT,
    data_year INTEGER DEFAULT 2024
);

CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    canonical_name TEXT NOT NULL UNIQUE,
    group_name TEXT NOT NULL -- 'Computer', 'Electrical', 'Mechanical', 'Civil', 'Chemical', etc.
);

CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institute_id INTEGER NOT NULL,
    branch_id INTEGER NOT NULL,
    original_name TEXT NOT NULL,
    duration_years INTEGER DEFAULT 4,
    degree TEXT DEFAULT 'B.Tech',
    seats INTEGER DEFAULT 0,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS closing_ranks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    round INTEGER NOT NULL,
    quota TEXT NOT NULL, -- 'AI', 'HS', 'OS'
    seat_type TEXT NOT NULL, -- 'OPEN', 'EWS', 'OBC-NCL', 'SC', 'ST', 'OPEN (PwD)', etc.
    gender_pool TEXT NOT NULL, -- 'Gender-Neutral', 'Female-only'
    opening_rank INTEGER,
    closing_rank INTEGER NOT NULL,
    source_url TEXT,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nirf_rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institute_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    category TEXT NOT NULL, -- 'Engineering', 'Overall'
    rank INTEGER NOT NULL,
    score REAL,
    source_url TEXT,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS placements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institute_id INTEGER NOT NULL,
    program_id INTEGER,
    year INTEGER NOT NULL,
    average_package_lpa REAL NOT NULL,
    median_package_lpa REAL,
    highest_package_lpa REAL,
    placement_percent REAL,
    source_url TEXT,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    mobile TEXT,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user', -- 'user' or 'admin'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS choice_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    inputs TEXT NOT NULL,
    result TEXT NOT NULL,
    data_year INTEGER NOT NULL DEFAULT 2024,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    choice_list_id INTEGER NOT NULL,
    amount INTEGER DEFAULT 4900, -- 4900 paise = Rs 49
    payment_method TEXT DEFAULT 'razorpay',
    upi_reference_id TEXT,
    proof_image_path TEXT,
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    error_description TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'failed', 'rejected'
    rejection_reason TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_by TEXT,
    reviewed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (choice_list_id) REFERENCES choice_lists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    choice_list_id INTEGER NOT NULL,
    payment_id INTEGER NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    download_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (choice_list_id) REFERENCES choice_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset TEXT NOT NULL,
    year INTEGER NOT NULL,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    rows INTEGER NOT NULL,
    filename TEXT
);

CREATE TABLE IF NOT EXISTS generated_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    format TEXT
);

-- Essential Performance Indexes
CREATE INDEX IF NOT EXISTS idx_institutes_type ON institutes(type);
CREATE INDEX IF NOT EXISTS idx_institutes_josaa_code ON institutes(josaa_code);
CREATE INDEX IF NOT EXISTS idx_programs_institute_branch ON programs(institute_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_closing_ranks_lookup ON closing_ranks(program_id, year, quota, seat_type, gender_pool);
CREATE INDEX IF NOT EXISTS idx_closing_ranks_cutoff ON closing_ranks(closing_rank);
CREATE INDEX IF NOT EXISTS idx_nirf_institute_year ON nirf_rankings(institute_id, year, category);
CREATE INDEX IF NOT EXISTS idx_placements_institute_year ON placements(institute_id, year);
CREATE INDEX IF NOT EXISTS idx_payments_user_choice ON payments(user_id, choice_list_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_purchases_user_choice ON purchases(user_id, choice_list_id);
