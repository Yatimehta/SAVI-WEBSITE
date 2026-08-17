// Load environment variables from .env (no-op if file absent — env vars still work)
require('dotenv').config();

const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const nodemailer = require('nodemailer');
const Database   = require('better-sqlite3');
const { rateLimit } = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3005;

// ─────────────────────────────────────────────
// SQLite setup
// ─────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'submissions.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    form_type       TEXT,
    name            TEXT,
    email           TEXT,
    company         TEXT,
    role            TEXT,
    entities        TEXT,
    jurisdictions   TEXT,
    platform        TEXT,
    current_system  TEXT,
    message         TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    email_sent      INTEGER NOT NULL DEFAULT 0
  );
`);

const insertSubmission = db.prepare(`
  INSERT INTO submissions
    (form_type, name, email, company, role, entities, jurisdictions, platform, current_system, message)
  VALUES
    (@form_type, @name, @email, @company, @role, @entities, @jurisdictions, @platform, @current_system, @message)
`);

const markEmailSent = db.prepare(`
  UPDATE submissions SET email_sent = 1 WHERE id = ?
`);

// ─────────────────────────────────────────────
// Nodemailer transporter (lazy — only used when request comes in)
// ─────────────────────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendSubmissionEmail(fields) {
  const transporter = createTransporter();
  const subject = fields.form_type === 'quote'
    ? `[SAVI] New Quote Request — ${fields.company}`
    : `[SAVI] New Demo Request — ${fields.company}`;

  const text = [
    `Form type:       ${fields.form_type || 'demo'}`,
    `Name:            ${fields.name}`,
    `Email:           ${fields.email}`,
    `Company:         ${fields.company}`,
    `Role:            ${fields.role || '—'}`,
    `Entities:        ${fields.entities || '—'}`,
    `Jurisdictions:   ${fields.jurisdictions || '—'}`,
    `Platform:        ${fields.platform || '—'}`,
    `Current system:  ${fields.current_system || '—'}`,
    `Message:         ${fields.message || '—'}`,
  ].join('\n');

  await transporter.sendMail({
    from:    process.env.SMTP_FROM || process.env.SMTP_USER,
    to:      'saakshi@vinayakafinancials.com',
    subject,
    text,
  });
}

// ─────────────────────────────────────────────
// Rate limiter — 5 submissions per IP per 15 min
// ─────────────────────────────────────────────
const submitLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             5,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message:         { success: false, error: 'Too many submissions from this IP — please try again later.' },
});

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mandatory Security Headers (Section 19 Technical Build Requirements)
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; script-src 'self' 'unsafe-inline'; connect-src 'self';"
  );
  next();
});

// ─────────────────────────────────────────────
// POST /api/submit-form
// ─────────────────────────────────────────────
app.post('/api/submit-form', submitLimiter, async (req, res) => {
  const {
    formType, name, email, company, role,
    entities, jurisdictions, platform, currentSystem,
    message, captchaAnswer, captchaToken,
  } = req.body;

  // (a) Validate required fields
  if (!name || !email || !company) {
    return res.status(400).json({ success: false, error: 'Please fill in all required fields.' });
  }

  // (a) Server-side CAPTCHA check
  if (!captchaToken || parseInt(captchaAnswer, 10) !== parseInt(captchaToken, 10)) {
    return res.status(400).json({ success: false, error: 'Spam protection check failed. Please solve the math challenge correctly.' });
  }

  const fields = {
    form_type:      formType      || 'demo',
    name:           name          || '',
    email:          email         || '',
    company:        company       || '',
    role:           role          || '',
    entities:       entities      || '',
    jurisdictions:  jurisdictions || '',
    platform:       platform      || '',
    current_system: currentSystem || '',
    message:        message       || '',
  };

  // (b) Write to SQLite FIRST — this is the safety net
  let rowId;
  try {
    const result = insertSubmission.run(fields);
    rowId = result.lastInsertRowid;
    console.log(`[FORM] Submission saved to DB — id=${rowId}, from=${email}`);
  } catch (dbErr) {
    console.error('[FORM] DB write failed:', dbErr);
    return res.status(500).json({ success: false, error: 'Failed to save your submission. Please try again.' });
  }

  // (c) Attempt email — do NOT block the success response on this
  try {
    await sendSubmissionEmail(fields);
    // (d) Mark email_sent = true
    markEmailSent.run(rowId);
    console.log(`[FORM] Email sent for submission id=${rowId}`);
  } catch (emailErr) {
    // (f) Log server-side, never expose SMTP details to client
    console.error(`[FORM] Email delivery failed for submission id=${rowId}:`, emailErr.message);
  }

  // (e) Always respond success if DB write succeeded
  return res.json({
    success:   true,
    recipient: 'saakshi@vinayakafinancials.com',
    message:   fields.form_type === 'quote'
      ? "Thank you — we've received your details and will be in touch shortly to discuss what would work for your organisation."
      : "Thank you — we've received your request and will be in touch shortly to arrange a time.",
  });
});

// ─────────────────────────────────────────────
// GET /admin/submissions  (password-protected via ?key= or X-Admin-Key header)
// ─────────────────────────────────────────────
app.get('/admin/submissions', (req, res) => {
  const providedKey = req.query.key || req.headers['x-admin-key'];
  const secretKey   = process.env.ADMIN_SECRET;

  if (!secretKey) {
    return res.status(503).json({ error: 'Admin endpoint not configured (ADMIN_SECRET not set).' });
  }
  if (!providedKey || providedKey !== secretKey) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const rows = db.prepare('SELECT * FROM submissions ORDER BY id DESC').all();
  return res.json({ count: rows.length, submissions: rows });
});

// ─────────────────────────────────────────────
// Static assets
// ─────────────────────────────────────────────
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js',  express.static(path.join(__dirname, 'js')));
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────
// Clean URL router (Section 3 Sitemap)
// ─────────────────────────────────────────────
const routes = {
  '/':                         'index.html',
  '/product':                  'product/index.html',
  '/product/intelligence-platform': 'product/intelligence-platform/index.html',
  '/product/full-platform':    'product/full-platform/index.html',
  '/product/capabilities':     'product/capabilities/index.html',
  '/how-it-works':             'how-it-works/index.html',
  '/who-its-for':              'who-its-for/index.html',
  '/trust':                    'trust/index.html',
  '/resources':                'resources/index.html',
  '/pricing':                  'pricing/index.html',
  '/about':                    'about/index.html',
  '/about/company':            'about/company/index.html',
  '/contact':                  'contact/index.html',
  '/demo':                     'demo/index.html',
  '/legal/privacy':            'legal/privacy/index.html',
  '/legal/terms':              'legal/terms/index.html',
  '/legal/cookies':            'legal/cookies/index.html',
};

Object.entries(routes).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Page not found');
    }
  });
});

// Fallback for .html extension requests
app.use((req, res, next) => {
  let reqPath = req.path;
  if (reqPath.endsWith('/')) {
    reqPath += 'index.html';
  } else if (!path.extname(reqPath)) {
    reqPath += '/index.html';
  }
  const fullPath = path.join(__dirname, reqPath);
  if (fs.existsSync(fullPath)) {
    return res.sendFile(fullPath);
  }
  next();
});

// ─────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`SAVI Corporate Website running at http://localhost:${PORT}`);
});
