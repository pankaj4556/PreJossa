// services/securityService.js
// Zero Trust Access: RBAC, Step-Up Auth, Rate Limiting, Session Expiry, Input Sanitization
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { logAudit } = require('./auditService');

// In-memory rate limiting state
const rateLimitBuckets = new Map();

// Periodic cleanup of expired rate limit buckets (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitBuckets.entries()) {
    if (now > record.resetTime) {
      rateLimitBuckets.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * High-performance sliding window rate limiter
 */
function createRateLimiter({
  windowMs = 60 * 1000,
  max = 60,
  message = 'Too many requests, please try again later.',
  keyGenerator = (req) => req.ip || req.connection?.remoteAddress || 'unknown'
}) {
  return (req, res, next) => {
    const key = `${req.baseUrl || ''}${req.path}:${keyGenerator(req)}`;
    const now = Date.now();
    let record = rateLimitBuckets.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      rateLimitBuckets.set(key, record);
    } else {
      record.count++;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      logAudit({
        actorUsername: req.session?.adminUser?.username || req.session?.user?.email || 'anonymous',
        actorRole: req.session?.adminUser ? 'admin' : (req.session?.user ? 'user' : 'anonymous'),
        action: 'RATE_LIMIT_EXCEEDED',
        entityType: 'network',
        entityId: req.path,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: 'BLOCKED',
        details: { count: record.count, maxAllowed: max, path: req.path }
      });

      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(429).json({ success: false, error: 'RATE_LIMIT_EXCEEDED', message });
      }
      return res.status(429).render('404', {
        title: 'Rate Limit Exceeded',
        message
      });
    }

    next();
  };
}

// Preconfigured Rate Limiters
const loginRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: 'Too many authentication attempts. Please wait 5 minutes before trying again.'
});

const exportRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  message: 'Export threshold reached. Please wait a few minutes before downloading more choice files.'
});

const recoveryRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  message: 'Recovery actions rate limited to safeguard database stability.'
});

/**
 * RBAC: Admin route guard
 */
function requireAdmin(req, res, next) {
  const adminRoutePath = (process.env.ADMIN_ROUTE_PATH || '/@65783+@4556/admin').replace(/\/+$/, '');
  if (req.session && req.session.adminUser) {
    return next();
  }
  return res.redirect(`${adminRoutePath}/login`);
}

/**
 * RBAC: User route guard
 */
function requireUser(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  if (req.xhr || req.headers.accept?.includes('json')) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  return res.redirect('/#login');
}

/**
 * Session Expiry & Inactivity Hygiene
 * Enforces a 30-minute idle timeout on admin sessions
 */
function adminSessionHygiene(req, res, next) {
  if (req.session && req.session.adminUser) {
    const now = Date.now();
    const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

    if (req.session.lastActivity && (now - req.session.lastActivity > IDLE_TIMEOUT_MS)) {
      logAudit({
        actorUsername: req.session.adminUser.username,
        actorRole: 'admin',
        action: 'SESSION_EXPIRED',
        entityType: 'session',
        entityId: req.session.adminUser.username,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: 'SUCCESS',
        details: { idleDurationMs: now - req.session.lastActivity }
      });
      req.session.adminUser = null;
      req.session.stepUpAuthorizedUntil = null;
      const adminRoutePath = (process.env.ADMIN_ROUTE_PATH || '/@65783+@4556/admin').replace(/\/+$/, '');
      return res.redirect(`${adminRoutePath}/login?expired=1`);
    }

    req.session.lastActivity = now;
  }
  next();
}

/**
 * Step-Up Authentication Guard
 * For destructive operations (e.g. restores, rollbacks, containment changes, mass exports)
 */
function requireStepUpAuth(req, res, next) {
  const now = Date.now();
  const isAuthorized = req.session && req.session.stepUpAuthorizedUntil && (now < req.session.stepUpAuthorizedUntil);

  if (isAuthorized) {
    return next();
  }

  const adminRoutePath = (process.env.ADMIN_ROUTE_PATH || '/@65783+@4556/admin').replace(/\/+$/, '');

  if (req.xhr || req.headers.accept?.includes('json')) {
    return res.status(403).json({
      success: false,
      stepUpRequired: true,
      message: 'Step-up authentication required for privileged recovery/destructive operations.',
      verifyUrl: `${adminRoutePath}/recovery/step-up`
    });
  }

  // Redirect to step-up prompt
  const returnTo = encodeURIComponent(req.originalUrl || req.url);
  return res.redirect(`${adminRoutePath}/recovery/step-up?returnTo=${returnTo}`);
}

/**
 * Verify admin credentials to issue Step-Up Clearance
 */
function verifyStepUp(username, password) {
  const admin = db.prepare(`SELECT * FROM admin_users WHERE LOWER(username) = LOWER(?)`).get(username);
  const envUser = (process.env.ADMIN_USERNAME || 'admin').trim();
  const envPass = (process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'admin123')).trim();

  let ok = false;
  if (admin && admin.password_hash && bcrypt.compareSync(password, admin.password_hash)) {
    ok = true;
  } else if (envPass && username.toLowerCase() === envUser.toLowerCase() && password === envPass) {
    ok = true;
  }
  return ok;
}

/**
 * Grant step-up clearance for 5 minutes
 */
function grantStepUpClearance(req) {
  if (req.session) {
    req.session.stepUpAuthorizedUntil = Date.now() + (5 * 60 * 1000); // 5 mins
  }
}

/**
 * Strict Input Validation & Sanitization Helpers
 */
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>'"\0]/g, '').trim();
}

function parseStrictInt(val, fallback = null) {
  const num = parseInt(val, 10);
  return isNaN(num) ? fallback : num;
}

module.exports = {
  createRateLimiter,
  loginRateLimiter,
  exportRateLimiter,
  recoveryRateLimiter,
  requireAdmin,
  requireUser,
  adminSessionHygiene,
  requireStepUpAuth,
  verifyStepUp,
  grantStepUpClearance,
  sanitizeInput,
  parseStrictInt
};
