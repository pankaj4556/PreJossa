// routes/public.js
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const config = require('../config.json');
const { getPaymentStatus } = require('../services/paymentService');

// Pass user session and site config to all templates
router.use((req, res, next) => {
  res.locals.user = req.session ? req.session.user : null;
  res.locals.site = config.site;
  res.locals.landingConfig = config.landing;
  res.locals.paymentsConfig = config.payments;
  next();
});

// 1. Root / Single-Page Landing Page
router.get('/', (req, res) => {
  const stats = {
    iitCount: db.prepare(`SELECT COUNT(*) as c FROM institutes WHERE type = 'IIT'`).get().c,
    nitCount: db.prepare(`SELECT COUNT(*) as c FROM institutes WHERE type = 'NIT'`).get().c,
    branchCount: db.prepare(`SELECT COUNT(*) as c FROM branches`).get().c,
    cutoffCount: db.prepare(`SELECT COUNT(*) as c FROM closing_ranks`).get().c
  };

  res.render('landing', {
    stats,
    user: req.session ? req.session.user : null
  });
});

// 2. Legacy /home route redirect
router.get('/home', (req, res) => {
  res.redirect(301, '/');
});

// 3. Choice List Generator Page
router.get('/generator', (req, res) => {
  const branches = db.prepare(`SELECT * FROM branches ORDER BY group_name, canonical_name`).all();
  const states = db.prepare(`SELECT DISTINCT state FROM institutes ORDER BY state ASC`).all().map(r => r.state);

  res.render('generator', { branches, states });
});

// 4. Result Page (Choice List Preview & On-screen editor)
router.get('/result/:id', (req, res) => {
  const listId = req.params.id;
  const choiceListRow = db.prepare(`SELECT * FROM choice_lists WHERE id = ?`).get(listId);

  if (!choiceListRow) {
    return res.status(404).render('404', { message: 'Choice list not found.' });
  }

  const inputs = JSON.parse(choiceListRow.inputs);
  const choices = JSON.parse(choiceListRow.result);

  const summary = {
    totalChoices: choices.length,
    safeCount: choices.filter(c => c.chance === 'Safe').length,
    moderateCount: choices.filter(c => c.chance === 'Moderate').length,
    ambitiousCount: choices.filter(c => c.chance === 'Ambitious').length,
    iitCount: choices.filter(c => c.institute_type === 'IIT').length,
    nitCount: choices.filter(c => c.institute_type === 'NIT').length,
    dataYear: choiceListRow.data_year || 2024
  };

  const paymentStatus = res.locals.user 
    ? getPaymentStatus(res.locals.user.id, listId)
    : { status: 'not_logged_in', isUnlocked: false };

  res.render('result', {
    choiceListId: listId,
    inputs,
    summary,
    choices,
    paymentStatus,
    dataYear: choiceListRow.data_year || 2024
  });
});

// 5. College Explorer
router.get('/explore', (req, res) => {
  const states = db.prepare(`SELECT DISTINCT state FROM institutes ORDER BY state ASC`).all().map(r => r.state);
  const branches = db.prepare(`SELECT canonical_name FROM branches ORDER BY canonical_name ASC`).all().map(r => r.canonical_name);

  res.render('explore', { states, branches });
});

// 6. College Detail Page
router.get('/college/:id', (req, res) => {
  const idOrCode = req.params.id;
  const college = db.prepare(`
    SELECT i.*, 
           nr.rank as nirf_rank, nr.score as nirf_score,
           pl.average_package_lpa, pl.median_package_lpa, pl.highest_package_lpa, pl.placement_percent
    FROM institutes i
    LEFT JOIN nirf_rankings nr ON (i.id = nr.institute_id AND nr.year = 2024)
    LEFT JOIN placements pl ON (i.id = pl.institute_id AND pl.year = 2024)
    WHERE i.id = ? OR i.josaa_code = ?
  `).get(idOrCode, idOrCode);

  if (!college) {
    return res.status(404).render('404', { message: 'Institute not found.' });
  }

  // Fetch Programs & Cutoffs for this institute
  const programs = db.prepare(`
    SELECT p.*, b.canonical_name, b.group_name
    FROM programs p
    JOIN branches b ON p.branch_id = b.id
    WHERE p.institute_id = ?
    ORDER BY p.degree, b.canonical_name
  `).all(college.id);

  const cutoffs = db.prepare(`
    SELECT cr.*, p.original_name, b.canonical_name
    FROM closing_ranks cr
    JOIN programs p ON cr.program_id = p.id
    JOIN branches b ON p.branch_id = b.id
    WHERE p.institute_id = ?
    ORDER BY b.canonical_name, cr.seat_type, cr.gender_pool
    LIMIT 200
  `).all(college.id);

  res.render('college-detail', { college, programs, cutoffs });
});

// 7. NIRF Ranking List
router.get('/nirf', (req, res) => {
  const rankings = db.prepare(`
    SELECT i.id, i.name, i.type, i.josaa_code, i.city, i.state, i.website,
           nr.rank as nirf_rank, nr.score as nirf_score, nr.source_url,
           pl.average_package_lpa, pl.highest_package_lpa
    FROM institutes i
    JOIN nirf_rankings nr ON (i.id = nr.institute_id AND nr.year = 2024)
    LEFT JOIN placements pl ON (i.id = pl.institute_id AND pl.year = 2024)
    ORDER BY nr.rank ASC
  `).all();

  res.render('nirf', { rankings });
});

// 8. Branches Master List
router.get('/branches', (req, res) => {
  const branches = db.prepare(`
    SELECT b.*,
           (SELECT COUNT(DISTINCT institute_id) FROM programs WHERE branch_id = b.id) as institute_count
    FROM branches b
    ORDER BY b.group_name, b.canonical_name
  `).all();

  res.render('branches', { branches });
});

// 9. About / Data Sources & Disclaimer
router.get('/about', (req, res) => {
  res.render('about');
});

// 10. Payment Page (₹49 per download via Razorpay)
router.get('/payment/:choiceListId', (req, res) => {
  const choiceListId = req.params.choiceListId;
  const choiceListRow = db.prepare(`SELECT * FROM choice_lists WHERE id = ?`).get(choiceListId);

  if (!choiceListRow) {
    return res.status(404).render('404', { message: 'Choice list not found.' });
  }

  const inputs = JSON.parse(choiceListRow.inputs);
  const choices = JSON.parse(choiceListRow.result);

  const paymentStatus = res.locals.user 
    ? getPaymentStatus(res.locals.user.id, choiceListId)
    : { status: 'not_logged_in', isUnlocked: false };

  res.render('payment', {
    choiceListId,
    inputs,
    totalChoices: choices.length,
    paymentStatus,
    priceInr: config.payments.pricePerDownloadInr || 49,
    keyId: process.env.RAZORPAY_KEY_ID || config.payments?.keyId || 'rzp_test_Ts0RTmsL5QfBuC'
  });
});

// 11. Login & Signup Pages
router.get('/login', (req, res) => {
  const returnTo = req.query.returnTo || '/';
  res.render('login', { returnTo, error: null });
});

router.get('/signup', (req, res) => {
  const returnTo = req.query.returnTo || '/';
  res.render('signup', { returnTo, error: null });
});

router.get('/logout', (req, res) => {
  req.session.user = null;
  res.redirect('/');
});

module.exports = router;
