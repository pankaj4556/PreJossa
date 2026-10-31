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

// Session Configuration
app.use(session({
  name: 'josaa_session',
  secret: config.admin?.sessionSecret || 'josaa_secret_key_2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
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
  res.locals.adminRoutePath = '/@65783+@4556/admin';
  next();
});

// Route Middlewares
const publicRoutes = require('./routes/public');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

// Handle both raw '+' and '%2B' in the custom admin secret path
app.use((req, res, next) => {
  if (req.url.startsWith('/@65783%2B@4556/admin')) {
    req.url = req.url.replace('/@65783%2B@4556/admin', '/@65783+@4556/admin');
  }
  next();
});

const ADMIN_PATH = '/@65783\\+@4556/admin';
app.use('/api', apiRoutes);
app.use(ADMIN_PATH, adminRoutes);
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
  console.log(`  🔐 Admin Portal: http://localhost:${PORT}/@65783+@4556/admin`);
  console.log(`  ⚡ UPI Price: ₹${config.payments?.pricePerDownloadInr || 49} / download`);
  console.log(`=======================================================`);
});
