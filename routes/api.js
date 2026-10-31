// routes/api.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const db = require('../database/db');
const { generateChoiceList } = require('../services/rankingEngine');
const { exportToPdf } = require('../services/pdfExporter');
const { exportToExcel } = require('../services/excelExporter');
const { exportToCsv } = require('../services/csvExporter');
const { exportToWord } = require('../services/wordExporter');
const {
  getPaymentStatus,
  getUpiConfig,
  createUpiOrder,
  verifyUpiPayment,
  createRazorpayOrder,
  verifyPaymentSignature,
  recordPaymentFailure,
  processRazorpayWebhook
} = require('../services/paymentService');

// 1. Generate JoSAA Choice List
router.post('/generate', (req, res) => {
  try {
    const inputs = req.body;
    const result = generateChoiceList(inputs);

    // Save choice list to database
    const userId = req.session && req.session.user ? req.session.user.id : null;
    const insert = db.prepare(`
      INSERT INTO choice_lists (user_id, inputs, result, data_year)
      VALUES (?, ?, ?, ?)
    `).run(
      userId,
      JSON.stringify(result.inputs),
      JSON.stringify(result.choices),
      result.summary.dataYear || 2024
    );

    // Record anonymous generation metric
    db.prepare(`INSERT INTO generated_lists (format) VALUES ('web_preview')`).run();

    res.json({
      success: true,
      choiceListId: insert.lastInsertRowid,
      inputs: result.inputs,
      summary: result.summary,
      choices: result.choices
    });
  } catch (err) {
    console.error('Error generating list:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error generating choice list.' });
  }
});

// 2. Update Choice List (On-Screen reordering / editing)
router.post('/choice-list/:id/update', (req, res) => {
  try {
    const choiceListId = req.params.id;
    const { choices } = req.body;

    if (!Array.isArray(choices)) {
      return res.status(400).json({ success: false, message: 'Invalid choices data.' });
    }

    db.prepare(`UPDATE choice_lists SET result = ? WHERE id = ?`)
      .run(JSON.stringify(choices), choiceListId);

    res.json({ success: true, message: 'Choice sequence saved.' });
  } catch (err) {
    console.error('Error updating choice list:', err);
    res.status(500).json({ success: false, message: 'Failed to update choice sequence.' });
  }
});

// 3. College Explorer Search & Filter API
router.get('/colleges', (req, res) => {
  try {
    const { q, type, state, nirfMax, minLpa, branch } = req.query;

    let query = `
      SELECT 
        i.*,
        COALESCE(nr.rank, 999) as nirf_rank,
        COALESCE(nr.score, 0) as nirf_score,
        COALESCE(pl.average_package_lpa, 0) as avg_placement_lpa,
        COALESCE(pl.highest_package_lpa, 0) as highest_placement_lpa,
        COALESCE(pl.placement_percent, 0) as placement_percent,
        (SELECT COUNT(*) FROM programs WHERE institute_id = i.id) as program_count
      FROM institutes i
      LEFT JOIN nirf_rankings nr ON (i.id = nr.institute_id AND nr.category = 'Engineering' AND nr.year = 2024)
      LEFT JOIN placements pl ON (i.id = pl.institute_id AND pl.year = 2024)
      WHERE 1=1
    `;
    const params = [];

    if (q) {
      query += ` AND (i.name LIKE ? OR i.city LIKE ? OR i.josaa_code LIKE ?)`;
      const term = `%${q}%`;
      params.push(term, term, term);
    }

    if (type && type !== 'ALL') {
      query += ` AND i.type = ?`;
      params.push(type);
    }

    if (state && state !== 'ALL') {
      query += ` AND i.state = ?`;
      params.push(state);
    }

    if (nirfMax) {
      query += ` AND nr.rank <= ?`;
      params.push(parseInt(nirfMax, 10));
    }

    if (minLpa) {
      query += ` AND pl.average_package_lpa >= ?`;
      params.push(parseFloat(minLpa));
    }

    if (branch && branch !== 'ALL') {
      query += ` AND i.id IN (
        SELECT DISTINCT p.institute_id 
        FROM programs p 
        JOIN branches b ON p.branch_id = b.id 
        WHERE b.canonical_name = ?
      )`;
      params.push(branch);
    }

    query += ` ORDER BY nirf_rank ASC`;

    const colleges = db.prepare(query).all(...params);
    res.json({ success: true, count: colleges.length, colleges });
  } catch (err) {
    console.error('Error querying colleges:', err);
    res.status(500).json({ success: false, message: 'Failed to search colleges.' });
  }
});

// 4. Razorpay Payment: Create Order
router.post('/payment/create-order', async (req, res) => {
  try {
    const user = req.session ? req.session.user : null;
    if (!user) {
      return res.status(401).json({ success: false, message: 'You must be logged in to initiate payment.' });
    }

    const { choiceListId } = req.body;
    if (!choiceListId) {
      return res.status(400).json({ success: false, message: 'Choice list ID is required.' });
    }

    const orderData = await createRazorpayOrder({
      userId: user.id,
      choiceListId: parseInt(choiceListId, 10)
    });

    res.json({
      success: true,
      ...orderData
    });
  } catch (err) {
    console.error('Payment Create Order Error:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to create payment order.' });
  }
});

// 4b. UPI Payment Intent & QR Generation
router.post('/payment/upi-order', async (req, res) => {
  try {
    const user = req.session ? req.session.user : null;
    if (!user) {
      return res.status(401).json({ success: false, message: 'You must be logged in to initiate payment.' });
    }

    const { choiceListId } = req.body;
    if (!choiceListId) {
      return res.status(400).json({ success: false, message: 'Choice list ID is required.' });
    }

    const orderData = await createUpiOrder({
      userId: user.id,
      choiceListId: parseInt(choiceListId, 10)
    });

    res.json({
      success: true,
      ...orderData
    });
  } catch (err) {
    console.error('UPI Create Order Error:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to create UPI order.' });
  }
});

// 4c. UPI Verification & Instant Choice List Unlock
router.post('/payment/verify-upi', async (req, res) => {
  try {
    const user = req.session ? req.session.user : null;
    if (!user) {
      return res.status(401).json({ success: false, message: 'You must be logged in to verify payment.' });
    }

    const { choiceListId, upiReferenceId, upiApp } = req.body;
    if (!choiceListId) {
      return res.status(400).json({ success: false, message: 'Choice list ID is required.' });
    }

    const result = await verifyUpiPayment({
      userId: user.id,
      choiceListId: parseInt(choiceListId, 10),
      upiReferenceId,
      upiApp
    });

    res.json(result);
  } catch (err) {
    console.error('UPI Verification Error:', err);
    res.status(400).json({ success: false, message: err.message || 'UPI verification failed.' });
  }
});

// 4d. Dynamic Auto-Filling UPI QR Code with Fixed Amount (am=49)
const QRCode = require('qrcode');
router.get('/payment/qr/:app', async (req, res) => {
  try {
    const appKey = (req.params.app || 'navi').toLowerCase();
    const upiConfig = getUpiConfig();
    const appInfo = upiConfig.apps[appKey] || upiConfig.apps.navi;
    const price = upiConfig.priceInr || 49;

    // Official NPCI UPI Standard Query URI with Fixed Amount am=...
    const upiUri = `upi://pay?pa=${encodeURIComponent(appInfo.upiId)}&pn=${encodeURIComponent(upiConfig.upiPayeeName)}&am=${price}&cu=INR&tn=${encodeURIComponent('PreJOSAA Choice List')}`;

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300');

    await QRCode.toFileStream(res, upiUri, {
      margin: 2,
      width: 420,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    });
  } catch (err) {
    console.error('QR stream error:', err);
    res.status(500).send('Failed to generate QR code.');
  }
});
router.post('/payment/verify', async (req, res) => {
  try {
    const user = req.session ? req.session.user : null;
    if (!user) {
      return res.status(401).json({ success: false, message: 'You must be logged in to verify payment.' });
    }

    const { choiceListId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const result = await verifyPaymentSignature({
      userId: user.id,
      choiceListId: parseInt(choiceListId, 10),
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    res.json(result);
  } catch (err) {
    console.error('Razorpay Verification Error:', err);
    res.status(400).json({ success: false, message: err.message || 'Payment verification failed.' });
  }
});

// 6. Razorpay Payment: Record Failure / Cancellation
router.post('/payment/record-failure', (req, res) => {
  try {
    const user = req.session ? req.session.user : null;
    const { choiceListId, razorpay_order_id, error } = req.body;

    if (user && razorpay_order_id) {
      recordPaymentFailure({
        userId: user.id,
        choiceListId: choiceListId ? parseInt(choiceListId, 10) : null,
        razorpay_order_id,
        error
      });
    }

    res.json({ success: true, message: 'Failure recorded.' });
  } catch (err) {
    console.warn('Record failure warning:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// 7. Razorpay Webhook Endpoint
router.post('/payment/webhook', (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    const result = processRazorpayWebhook(rawBody, signature);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error('Razorpay Webhook Error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// 8. Payment Status Check
router.get('/payment-status/:choiceListId', (req, res) => {
  const user = req.session ? req.session.user : null;
  const choiceListId = req.params.choiceListId;

  if (!user) {
    return res.json({ status: 'not_logged_in', isUnlocked: false });
  }

  const status = getPaymentStatus(user.id, choiceListId);
  res.json({ success: true, ...status });
});

// 9. Protected Download Handler (PDF, Excel, CSV, Word)
router.get('/download/:format/:choiceListId', (req, res) => {
  try {
    const { format, choiceListId } = req.params;
    const user = req.session ? req.session.user : null;

    if (!user) {
      return res.status(401).send('Please log in to download your choice list.');
    }

    // Verify purchase approval in database (never trust client)
    const paymentCheck = getPaymentStatus(user.id, choiceListId);
    if (!paymentCheck.isUnlocked) {
      return res.status(403).send('Download locked. Please complete payment to unlock your choice list.');
    }

    // Fetch choice list data
    const choiceListRow = db.prepare(`SELECT * FROM choice_lists WHERE id = ?`).get(choiceListId);
    if (!choiceListRow) {
      return res.status(404).send('Choice list not found.');
    }

    const inputs = JSON.parse(choiceListRow.inputs);
    const choices = JSON.parse(choiceListRow.result);

    const summary = {
      totalChoices: choices.length,
      safeCount: choices.filter(c => c.chance === 'Safe').length,
      moderateCount: choices.filter(c => c.chance === 'Moderate').length,
      ambitiousCount: choices.filter(c => c.chance === 'Ambitious').length,
      dataYear: choiceListRow.data_year || 2024
    };

    const choiceListData = { inputs, summary, choices };

    // Increment download counter
    db.prepare(`
      UPDATE purchases 
      SET download_count = download_count + 1 
      WHERE user_id = ? AND choice_list_id = ?
    `).run(user.id, choiceListId);

    // Record format analytics
    db.prepare(`INSERT INTO generated_lists (format) VALUES (?)`).run(format);

    const filename = `choice-list-rank${inputs.jeeMainRank || 'jee'}-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      return exportToPdf(choiceListData, res);
    } else if (format === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      return exportToExcel(choiceListData, res);
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return exportToCsv(choiceListData, res);
    } else if (format === 'docx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.docx"`);
      return exportToWord(choiceListData, res);
    } else {
      return res.status(400).send('Invalid export format requested.');
    }
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).send('Error generating export file.');
  }
});

// 7. Auth: Login
router.post('/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.toLowerCase().trim());
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role
    };

    res.json({
      success: true,
      message: 'Logged in successfully.',
      user: req.session.user
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
});

// 8. Auth: Signup
router.post('/auth/signup', (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (name, email, mobile, password_hash, role)
      VALUES (?, ?, ?, ?, 'user')
    `).run(name.trim(), cleanEmail, mobile ? mobile.trim() : null, hash);

    req.session.user = {
      id: result.lastInsertRowid,
      name: name.trim(),
      email: cleanEmail,
      mobile: mobile ? mobile.trim() : null,
      role: 'user'
    };

    res.json({
      success: true,
      message: 'Account created successfully.',
      user: req.session.user
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Account creation failed.' });
  }
});

// 9. Auth: Logout
router.post('/auth/logout', (req, res) => {
  req.session.user = null;
  res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = router;
