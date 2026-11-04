// server.js - Main Application Entry Point
// Single-process Express application per PRD Section 5 & 6
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

// Load Configuration
const configPath = path.resolve(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Initialize Database
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || config.site?.port || 3000;

// Trust proxy for reverse proxies (Render, Heroku, Cloudflare, Nginx) so secure cookies work properly
app.set('trust proxy', 1);

// Setup Template Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares - capture rawBody for Razorpay webhook signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Serve Static Assets (Tailwind, JS, Images, Icons)
app.use(express.static(path.join(__dirname, 'public')));

// Session Configuration (SQLite-backed — survives server restarts)
const SqliteStore = require('better-sqlite3-session-store')(session);
const sessionDb = require('./database/db');

app.use(session({
  name: 'josaa_session',
  store: new SqliteStore({ client: sessionDb, expired: { clear: true, intervalMs: 900000 } }),
  secret: process.env.SESSION_SECRET || config.admin?.sessionSecret || 'josaa_secret_key_2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days — stays logged in
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false'
  }
}));

// Global Template Locals (Available to all templates and routes)
app.use((req, res, next) => {
  res.locals.user = req.session ? req.session.user : null;
  res.locals.site = config.site;
  res.locals.landingConfig = config.landing;
  res.locals.paymentsConfig = {
    ...config.payments,
    upiPayeeName: process.env.UPI_PAYEE_NAME || config.payments?.upiPayeeName || 'Pankaj Kumar',
    upiIdNavi: process.env.UPI_ID_NAVI || config.payments?.upiIdNavi || '8000859195@naviaxis',
    upiIdPhonepe: process.env.UPI_ID_PHONEPE || config.payments?.upiIdPhonepe || '8000859195-oc44@ibl',
    upiIdPaytm: process.env.UPI_ID_PAYTM || config.payments?.upiIdPaytm || '8000859195@ptsbi',
    upiId: process.env.UPI_ID || config.payments?.upiId || '8000859195@naviaxis',
    keyId: process.env.RAZORPAY_KEY_ID || config.payments?.keyId || 'rzp_test_Ts0RTmsL5QfBuC'
  };
  const ADMIN_ROUTE_PATH = (process.env.ADMIN_ROUTE_PATH || '/@65783+@4556/admin').replace(/\/+$/, '');
  res.locals.adminRoutePath = ADMIN_ROUTE_PATH;
  next();
});

// Route Middlewares
const publicRoutes = require('./routes/public');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const ADMIN_ROUTE_PATH = (process.env.ADMIN_ROUTE_PATH || '/@65783+@4556/admin').replace(/\/+$/, '');

// Handle encoded URL variants (e.g. %2B vs literal +) if path contains +
if (ADMIN_ROUTE_PATH.includes('+')) {
  const encodedPath = ADMIN_ROUTE_PATH.replace(/\+/g, '%2B');
  app.use((req, res, next) => {
    if (req.url.startsWith(encodedPath)) {
      req.url = req.url.replace(encodedPath, ADMIN_ROUTE_PATH);
    }
    next();
  });
}

// In path-to-regexp (used by Express), escape '+' if present
const adminMountPath = ADMIN_ROUTE_PATH.replace(/\+/g, '\\+');
app.use('/api', apiRoutes);
app.use(adminMountPath, adminRoutes);
app.use('/', publicRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404', {
    site: config.site,
    user: req.session ? req.session.user : null,
    message: 'The page you requested could not be found.'
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).render('404', {
    site: config.site,
    user: req.session ? req.session.user : null,
    message: 'An unexpected internal error occurred. Please try again.'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  🚀 ${config.site?.name || 'PreJOSAA'} is live on http://localhost:${PORT}`);
  console.log(`  📊 Database: SQLite WAL (${config.paths?.database})`);
  console.log(`  🔐 Admin Portal: http://localhost:${PORT}${ADMIN_ROUTE_PATH}`);
  console.log(`  ⚡ UPI Price: ₹${config.payments?.pricePerDownloadInr || 49} / download`);
  console.log(`=======================================================`);
});
