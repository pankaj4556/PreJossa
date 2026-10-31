// services/paymentService.js
const crypto = require('crypto');
const Razorpay = require('razorpay');
const db = require('../database/db');
const config = require('../config.json');

/**
 * Get Razorpay Client Instance.
 * Reads credentials ONLY from environment variables — the secret is never
 * returned to callers; it stays inside this module.
 */
function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID || config.payments?.keyId;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId) {
    throw new Error('RAZORPAY_KEY_ID is not set in environment variables.');
  }
  if (!keySecret || keySecret === 'rzp_test_secret_placeholder' || keySecret === 'your_razorpay_key_secret_here') {
    throw new Error('RAZORPAY_KEY_SECRET in .env is still set to placeholder. Enter your real Razorpay Key Secret and restart the server.');
  }

  return {
    client: new Razorpay({ key_id: keyId, key_secret: keySecret }),
    keyId
    // keySecret intentionally NOT spread into the return object
  };
}

/**
 * Get current purchase/payment status for a user and choice list
 */
function getPaymentStatus(userId, choiceListId) {
  if (!userId || !choiceListId) {
    return { status: 'not_paid', isUnlocked: false };
  }

  // 1. Check if verified purchase already exists in purchases table
  const purchase = db.prepare(`
    SELECT * FROM purchases 
    WHERE user_id = ? AND choice_list_id = ?
  `).get(userId, choiceListId);

  if (purchase) {
    return {
      status: 'approved',
      isUnlocked: true,
      downloadCount: purchase.download_count,
      unlockedAt: purchase.unlocked_at,
      paymentId: purchase.payment_id
    };
  }

  // 2. Check latest payment record
  const payment = db.prepare(`
    SELECT * FROM payments 
    WHERE user_id = ? AND choice_list_id = ?
    ORDER BY id DESC LIMIT 1
  `).get(userId, choiceListId);

  if (!payment) {
    return { status: 'not_paid', isUnlocked: false };
  }

  return {
    status: payment.status, // 'pending', 'approved', 'failed', 'rejected'
    isUnlocked: payment.status === 'approved',
    paymentId: payment.id,
    razorpayOrderId: payment.razorpay_order_id,
    razorpayPaymentId: payment.razorpay_payment_id,
    submittedAt: payment.submitted_at,
    errorDescription: payment.error_description || payment.rejection_reason
  };
}

/**
 * Create a Razorpay Order server-side with trusted pricing
 */
async function createRazorpayOrder({ userId, choiceListId }) {
  if (!userId || !choiceListId) {
    throw new Error('User ID and Choice List ID are required to create a payment order.');
  }

  // Check choice list exists
  const choiceList = db.prepare(`SELECT id, user_id FROM choice_lists WHERE id = ?`).get(choiceListId);
  if (!choiceList) {
    throw new Error('Choice list not found.');
  }

  // Associate anonymous choice list with current user if needed
  if (!choiceList.user_id) {
    db.prepare(`UPDATE choice_lists SET user_id = ? WHERE id = ?`).run(userId, choiceListId);
  } else if (choiceList.user_id !== userId) {
    throw new Error('Unauthorized: You cannot purchase another student\'s choice list.');
  }

  // Check if already unlocked
  const existingStatus = getPaymentStatus(userId, choiceListId);
  if (existingStatus.isUnlocked) {
    return {
      alreadyUnlocked: true,
      isUnlocked: true,
      message: 'Choice list is already purchased and unlocked.'
    };
  }

  // If UPI provider is configured, use UPI order creation directly
  if (config.payments?.provider === 'upi') {
    return await createUpiOrder({ userId, choiceListId });
  }

  // Trusted price from server-side config (49 INR = 4900 paise)
  const priceInr = config.payments?.pricePerDownloadInr || 49;
  const amountPaise = priceInr * 100;
  const currency = config.payments?.currency || 'INR';

  let client, keyId;
  try {
    const rzpInst = getRazorpayInstance();
    client = rzpInst.client;
    keyId = rzpInst.keyId;
  } catch (err) {
    console.warn('Razorpay not configured, falling back to UPI direct payment:', err.message);
    return await createUpiOrder({ userId, choiceListId });
  }

  let razorpayOrderId;
  const receipt = `josaa_${choiceListId}_${userId}_${Date.now()}`.slice(0, 40);

  try {
    const order = await client.orders.create({
      amount: amountPaise,
      currency: currency,
      receipt: receipt,
      notes: {
        userId: String(userId),
        choiceListId: String(choiceListId)
      }
    });
    razorpayOrderId = order.id;
  } catch (apiErr) {
    console.warn('Razorpay API order creation failed, automatically falling back to UPI direct payment:', apiErr.error?.description || apiErr.message || apiErr);
    return await createUpiOrder({ userId, choiceListId });
  }

  // Record pending payment in database (satisfying legacy NOT NULL columns safely)
  const insert = db.prepare(`
    INSERT INTO payments (
      user_id, choice_list_id, amount, payment_method,
      upi_reference_id, proof_image_path, razorpay_order_id, status
    ) VALUES (?, ?, ?, 'razorpay', ?, 'razorpay_gateway', ?, 'pending')
  `).run(userId, choiceListId, amountPaise, razorpayOrderId, razorpayOrderId);

  return {
    success: true,
    orderId: razorpayOrderId,
    amount: amountPaise,
    amountInr: priceInr,
    currency: currency,
    keyId: keyId,
    choiceListId: choiceListId,
    paymentRecordId: insert.lastInsertRowid
  };
}

/**
 * Server-Side Razorpay Signature Verification & Unlock
 */
async function verifyPaymentSignature({ userId, choiceListId, razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new Error('Missing payment verification parameters (order_id, payment_id, signature).');
  }

  // 1. Fetch pending payment record
  const payment = db.prepare(`
    SELECT * FROM payments 
    WHERE razorpay_order_id = ?
  `).get(razorpay_order_id);

  if (!payment) {
    throw new Error('Order not found in database. Untrusted payment verification.');
  }

  // 2. Verify user ownership
  if (payment.user_id !== userId) {
    throw new Error('Unauthorized: This payment order does not belong to your account.');
  }

  // 3. Verify choice list match
  if (payment.choice_list_id !== parseInt(choiceListId, 10)) {
    throw new Error('Invalid request: Choice list ID mismatch.');
  }

  // 4. Idempotency: If already approved and unlocked, return success immediately
  if (payment.status === 'approved') {
    return {
      success: true,
      message: 'Payment already verified and choice list unlocked.',
      isUnlocked: true,
      alreadyUnlocked: true
    };
  }

  // 5. Verify HMAC SHA256 Signature — secret is read directly from env here,
  //    never passed through any public interface.
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new Error('RAZORPAY_KEY_SECRET is not configured. Cannot verify payment signature.');
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const isValidSignature = crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(razorpay_signature, 'hex')
  );

  if (!isValidSignature) {
    // Record verification failure
    db.prepare(`
      UPDATE payments 
      SET status = 'failed', error_description = 'HMAC signature verification failed' 
      WHERE id = ?
    `).run(payment.id);

    throw new Error('Payment signature verification failed. Untrusted payment attempt.');
  }

  // 6. Grant Access Atomically
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE payments 
      SET status = 'approved',
          razorpay_payment_id = ?,
          razorpay_signature = ?,
          upi_reference_id = ?,
          reviewed_by = 'razorpay_auto',
          reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(razorpay_payment_id, razorpay_signature, razorpay_payment_id, payment.id);

    db.prepare(`
      INSERT OR REPLACE INTO purchases (user_id, choice_list_id, payment_id, unlocked_at, download_count)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, 0)
    `).run(userId, choiceListId, payment.id);
  });

  tx();

  return {
    success: true,
    message: 'Payment verified successfully! All 4 download formats are now unlocked.',
    isUnlocked: true
  };
}

/**
 * Record a payment failure or cancellation
 */
function recordPaymentFailure({ userId, choiceListId, razorpay_order_id, error }) {
  if (!razorpay_order_id) return { recorded: false };

  const errorDesc = (error && (error.description || error.message || error.reason)) || 'Payment cancelled or interrupted by user';

  db.prepare(`
    UPDATE payments 
    SET status = 'failed', error_description = ? 
    WHERE razorpay_order_id = ? AND user_id = ? AND status != 'approved'
  `).run(errorDesc, razorpay_order_id, userId);

  return { recorded: true, status: 'failed' };
}

/**
 * Process Razorpay Webhook Event Idempotently
 */
function processRazorpayWebhook(rawBody, signature) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_test_webhook_secret_placeholder';

  if (!rawBody || !signature) {
    throw new Error('Missing raw webhook body or signature.');
  }

  // Verify Webhook Signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (expectedSignature !== signature) {
    throw new Error('Invalid Razorpay webhook signature.');
  }

  const eventPayload = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf-8'));
  const event = eventPayload.event;
  const payload = eventPayload.payload;

  if (event === 'order.paid' || event === 'payment.captured') {
    const paymentEntity = payload.payment?.entity;
    const orderEntity = payload.order?.entity;
    const orderId = paymentEntity?.order_id || orderEntity?.id;
    const paymentId = paymentEntity?.id;

    if (!orderId) {
      return { status: 'ignored', message: 'No order_id present in webhook' };
    }

    const payment = db.prepare(`SELECT * FROM payments WHERE razorpay_order_id = ?`).get(orderId);
    if (!payment) {
      return { status: 'not_found', message: 'Order not found in database' };
    }

    // Idempotent: If already approved, do not re-process
    if (payment.status === 'approved') {
      return { status: 'already_processed', message: 'Payment already approved' };
    }

    // Grant Access Atomically
    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE payments 
        SET status = 'approved',
            razorpay_payment_id = ?,
            upi_reference_id = ?,
            reviewed_by = 'razorpay_webhook',
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(paymentId || orderId, paymentId || orderId, payment.id);

      db.prepare(`
        INSERT OR REPLACE INTO purchases (user_id, choice_list_id, payment_id, unlocked_at, download_count)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, 0)
      `).run(payment.user_id, payment.choice_list_id, payment.id);
    });

    tx();
    return { status: 'success', message: 'Purchase unlocked via webhook' };
  } else if (event === 'payment.failed') {
    const paymentEntity = payload.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const errorDesc = paymentEntity?.error_description || 'Payment failed';

    if (orderId) {
      db.prepare(`
        UPDATE payments 
        SET status = 'failed', error_description = ? 
        WHERE razorpay_order_id = ? AND status != 'approved'
      `).run(errorDesc, orderId);
    }
    return { status: 'recorded_failure' };
  }

  return { status: 'ignored', event };
}

/**
 * Legacy Admin helpers for backward compatibility
 */
function approvePayment(paymentId, adminUsername) {
  const payment = db.prepare(`SELECT * FROM payments WHERE id = ?`).get(paymentId);
  if (!payment) throw new Error('Payment record not found.');

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE payments 
      SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(adminUsername || 'admin', paymentId);

    db.prepare(`
      INSERT OR REPLACE INTO purchases (user_id, choice_list_id, payment_id, unlocked_at, download_count)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, 0)
    `).run(payment.user_id, payment.choice_list_id, paymentId);
  });

  tx();
  return { success: true };
}

function rejectPayment(paymentId, reason, adminUsername) {
  const payment = db.prepare(`SELECT * FROM payments WHERE id = ?`).get(paymentId);
  if (!payment) throw new Error('Payment record not found.');

  db.prepare(`
    UPDATE payments 
    SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(reason || 'Rejected by administrator', adminUsername || 'admin', paymentId);

  return { success: true };
}

/**
 * UPI Configuration Helper with Pankaj Kumar's exact accounts
 */
function getUpiConfig() {
  const upiPayeeName = process.env.UPI_PAYEE_NAME || config.payments?.upiPayeeName || 'Pankaj Kumar';
  const priceInr = config.payments?.pricePerDownloadInr || 49;
  const upiIdNavi = process.env.UPI_ID_NAVI || config.payments?.upiIdNavi || '8000859195@naviaxis';
  const upiIdPhonepe = process.env.UPI_ID_PHONEPE || config.payments?.upiIdPhonepe || '8000859195-oc44@ibl';
  const upiIdPaytm = process.env.UPI_ID_PAYTM || config.payments?.upiIdPaytm || '8000859195@ptsbi';
  const upiId = process.env.UPI_ID || config.payments?.upiId || upiIdNavi;

  return {
    upiPayeeName,
    priceInr,
    currency: 'INR',
    upiId,
    apps: {
      navi: {
        id: 'navi',
        name: 'Navi UPI',
        tagline: 'Pay using any UPI App (Navi / GPay / BHIM)',
        upiId: upiIdNavi,
        qrImage: '/images/qr-navi.png',
        intent: `upi://pay?pa=${encodeURIComponent(upiIdNavi)}&pn=${encodeURIComponent(upiPayeeName)}&am=${priceInr}&cu=INR&tn=PreJOSAA`
      },
      phonepe: {
        id: 'phonepe',
        name: 'PhonePe',
        tagline: 'Scan & Pay Using PhonePe App',
        upiId: upiIdPhonepe,
        qrImage: '/images/qr-phonepe.png',
        intent: `phonepe://pay?pa=${encodeURIComponent(upiIdPhonepe)}&pn=${encodeURIComponent(upiPayeeName)}&am=${priceInr}&cu=INR&tn=PreJOSAA`
      },
      paytm: {
        id: 'paytm',
        name: 'Paytm',
        tagline: 'Scan with Paytm or any UPI App',
        upiId: upiIdPaytm,
        qrImage: '/images/qr-paytm.png',
        intent: `paytmmp://pay?pa=${encodeURIComponent(upiIdPaytm)}&pn=${encodeURIComponent(upiPayeeName)}&am=${priceInr}&cu=INR&tn=PreJOSAA`
      }
    }
  };
}

/**
 * Create a UPI Direct Payment Order (Navi, PhonePe, Paytm, etc.)
 */
async function createUpiOrder({ userId, choiceListId, selectedApp = 'navi' }) {
  if (!userId || !choiceListId) {
    throw new Error('User ID and Choice List ID are required to initiate UPI payment.');
  }

  // Check choice list exists
  const choiceList = db.prepare(`SELECT id, user_id FROM choice_lists WHERE id = ?`).get(choiceListId);
  if (!choiceList) {
    throw new Error('Choice list not found.');
  }

  if (!choiceList.user_id) {
    db.prepare(`UPDATE choice_lists SET user_id = ? WHERE id = ?`).run(userId, choiceListId);
  } else if (choiceList.user_id !== userId) {
    throw new Error('Unauthorized: You cannot purchase another student\'s choice list.');
  }

  // Check if already unlocked
  const existingStatus = getPaymentStatus(userId, choiceListId);
  if (existingStatus.isUnlocked) {
    return {
      alreadyUnlocked: true,
      isUnlocked: true,
      message: 'Choice list is already purchased and unlocked.'
    };
  }

  const upiConfig = getUpiConfig();
  const activeApp = upiConfig.apps[selectedApp] || upiConfig.apps.navi;
  const amountPaise = upiConfig.priceInr * 100;
  const orderRef = `UPI_${choiceListId}_${userId}_${Date.now()}`.slice(0, 40);

  // Record pending payment in database
  const insert = db.prepare(`
    INSERT INTO payments (
      user_id, choice_list_id, amount, payment_method,
      upi_reference_id, proof_image_path, razorpay_order_id, status
    ) VALUES (?, ?, ?, ?, ?, 'upi_intent', ?, 'pending')
  `).run(userId, choiceListId, amountPaise, `upi_${activeApp.id}`, orderRef, orderRef);

  return {
    success: true,
    provider: 'upi',
    orderId: orderRef,
    amount: amountPaise,
    amountInr: upiConfig.priceInr,
    payeeName: upiConfig.upiPayeeName,
    selectedApp: activeApp.id,
    apps: upiConfig.apps,
    upiId: activeApp.upiId,
    qrImage: activeApp.qrImage,
    upiUri: activeApp.intent,
    choiceListId,
    paymentRecordId: insert.lastInsertRowid
  };
}

/**
 * Submit UPI Payment Reference ID (UTR) for Admin Verification (No auto-unlock)
 */
async function verifyUpiPayment({ userId, choiceListId, upiReferenceId, upiApp }) {
  if (!choiceListId) {
    throw new Error('Choice list ID is required.');
  }

  const trimmedUtr = String(upiReferenceId || '').trim();
  if (!trimmedUtr || trimmedUtr.length < 6) {
    throw new Error('Please enter a valid 12-digit UPI Reference Number / UTR from your payment app.');
  }

  const choiceList = db.prepare(`SELECT id, user_id FROM choice_lists WHERE id = ?`).get(choiceListId);
  if (!choiceList) {
    throw new Error('Choice list not found.');
  }

  if (!choiceList.user_id) {
    db.prepare(`UPDATE choice_lists SET user_id = ? WHERE id = ?`).run(userId, choiceListId);
  } else if (choiceList.user_id !== userId) {
    throw new Error('Unauthorized: You cannot submit payment for another student\'s choice list.');
  }

  const { priceInr } = getUpiConfig();
  const amountPaise = priceInr * 100;
  const appTag = upiApp ? `upi_${upiApp}` : 'upi';

  // Find existing payment or insert a new one with pending status
  let payment = db.prepare(`
    SELECT * FROM payments 
    WHERE user_id = ? AND choice_list_id = ?
    ORDER BY id DESC LIMIT 1
  `).get(userId, choiceListId);

  let paymentId;
  if (payment) {
    db.prepare(`
      UPDATE payments 
      SET status = 'pending',
          payment_method = ?,
          upi_reference_id = ?,
          error_description = NULL
      WHERE id = ?
    `).run(appTag, trimmedUtr, payment.id);
    paymentId = payment.id;
  } else {
    const ins = db.prepare(`
      INSERT INTO payments (
        user_id, choice_list_id, amount, payment_method,
        upi_reference_id, proof_image_path, razorpay_order_id, status
      ) VALUES (?, ?, ?, ?, ?, 'upi_intent', ?, 'pending')
    `).run(userId, choiceListId, amountPaise, appTag, trimmedUtr, `UPI_REC_${Date.now()}`);
    paymentId = ins.lastInsertRowid;
  }

  return {
    success: true,
    isUnlocked: false,
    status: 'pending',
    paymentId,
    upiReferenceId: trimmedUtr,
    message: 'Payment reference submitted successfully! Your payment is currently under admin verification. Once verified, your downloads will unlock.'
  };
}

module.exports = {
  getPaymentStatus,
  getUpiConfig,
  createUpiOrder,
  verifyUpiPayment,
  createRazorpayOrder,
  verifyPaymentSignature,
  recordPaymentFailure,
  processRazorpayWebhook,
  approvePayment,
  rejectPayment
};
