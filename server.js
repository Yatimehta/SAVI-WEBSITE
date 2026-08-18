// Load environment variables from .env (no-op if file absent: env vars still work)
require('dotenv').config();

const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const { Resend } = require('resend');
const { Pool }   = require('pg');
const { rateLimit } = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3005;

// Trust reverse proxy (Railway / Cloudflare) for rate limiting & IP detection
app.set('trust proxy', 1);

// Prevent browser/proxy stale caching of HTML, CSS, JS
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// ─────────────────────────────────────────────
// Postgres setup (DATABASE_URL injected by Railway)
// ─────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway.internal')
    ? false                          // private Railway network: no SSL needed
    : { rejectUnauthorized: false }, // external/local connections
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id             SERIAL PRIMARY KEY,
      form_type      TEXT,
      name           TEXT,
      email          TEXT,
      company        TEXT,
      role           TEXT,
      entities       TEXT,
      jurisdictions  TEXT,
      platform       TEXT,
      current_system TEXT,
      message        TEXT,
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      email_sent     BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);
  console.log('[DB] Submissions table ready');
}

// ─────────────────────────────────────────────
// Resend Email Sender (HTTPS API on port 443)
// ─────────────────────────────────────────────
async function sendSubmissionEmail(fields) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const resend = new Resend(apiKey);
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'SAVI Enquiries <onboarding@resend.dev>';
  const subject = fields.form_type === 'quote'
    ? `[SAVI] New Quote Request: ${fields.company}`
    : `[SAVI] New Demo Request: ${fields.company}`;

  const text = [
    `Form type:       ${fields.form_type || 'demo'}`,
    `Name:            ${fields.name}`,
    `Email:           ${fields.email}`,
    `Company:         ${fields.company}`,
    `Role:            ${fields.role || 'N/A'}`,
    `Entities:        ${fields.entities || 'N/A'}`,
    `Jurisdictions:   ${fields.jurisdictions || 'N/A'}`,
    `Platform:        ${fields.platform || 'N/A'}`,
    `Current system:  ${fields.current_system || 'N/A'}`,
    `Message:         ${fields.message || 'N/A'}`,
  ].join('\n');

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to:   'saakshi@vinayakafinancials.com',
    subject,
    text,
  });

  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }

  return data;
}

// ─────────────────────────────────────────────
// Rate limiter: 5 submissions per IP per 15 min
// ─────────────────────────────────────────────
const submitLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             5,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message:         { success: false, error: 'Too many submissions from this IP: please try again later.' },
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

  // (b) Write to Postgres FIRST: safety net
  let rowId;
  try {
    const result = await pool.query(
      `INSERT INTO submissions
         (form_type, name, email, company, role, entities, jurisdictions, platform, current_system, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [fields.form_type, fields.name, fields.email, fields.company, fields.role,
       fields.entities, fields.jurisdictions, fields.platform, fields.current_system, fields.message]
    );
    rowId = result.rows[0].id;
    console.log(`[FORM] Submission saved to DB: id=${rowId}, from=${email}`);
  } catch (dbErr) {
    console.error('[FORM] DB write failed:', dbErr.message);
    return res.status(500).json({ success: false, error: 'Failed to save your submission. Please try again.' });
  }

  // (c) Attempt email
  try {
    await sendSubmissionEmail(fields);
    // (d) Mark email_sent = true
    await pool.query('UPDATE submissions SET email_sent = TRUE WHERE id = $1', [rowId]);
    console.log(`[FORM] Email sent for submission id=${rowId}`);
  } catch (emailErr) {
    // (f) Log server-side only: never expose SMTP details to client
    console.error(`[FORM] Email delivery failed for submission id=${rowId}:`, emailErr.message);
  }

  // (e) Always respond success if DB write succeeded
  return res.json({
    success:   true,
    recipient: 'saakshi@vinayakafinancials.com',
    message:   fields.form_type === 'quote'
      ? "Thank you: we've received your details and will be in touch shortly to discuss what would work for your organisation."
      : "Thank you: we've received your request and will be in touch shortly to arrange a time.",
  });
});

// ─────────────────────────────────────────────
// GET /admin/submissions  (password-protected via ?key= or X-Admin-Key header)
// ─────────────────────────────────────────────
app.get('/admin/submissions', async (req, res) => {
  const providedKey = req.query.key || req.headers['x-admin-key'];
  const secretKey   = process.env.ADMIN_SECRET;

  if (!secretKey) {
    return res.status(503).json({ error: 'Admin endpoint not configured (ADMIN_SECRET not set).' });
  }
  if (!providedKey || providedKey !== secretKey) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const result = await pool.query('SELECT * FROM submissions ORDER BY id DESC');
    return res.json({ count: result.rows.length, submissions: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Database query failed.' });
  }
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
  '/':                              'index.html',
  '/product':                       'product/index.html',
  '/product/intelligence-platform': 'product/intelligence-platform/index.html',
  '/product/full-platform':         'product/full-platform/index.html',
  '/product/capabilities':          'product/capabilities/index.html',
  '/how-it-works':                  'how-it-works/index.html',
  '/who-its-for':                   'who-its-for/index.html',
  '/trust':                         'trust/index.html',
  '/resources':                     'resources/index.html',
  '/pricing':                       'pricing/index.html',
  '/download':                      'download/index.html',
  '/about':                         'about/index.html',
  '/about/company':                 'about/company/index.html',
  '/contact':                       'contact/index.html',
  '/demo':                          'demo/index.html',
  '/legal/privacy':                 'legal/privacy/index.html',
  '/legal/terms':                   'legal/terms/index.html',
  '/legal/cookies':                 'legal/cookies/index.html',
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

initDb().catch(err => {
  console.warn('[DB Warning] PostgreSQL connection failed (e.g. local environment without Railway internal network):', err.message);
}).finally(() => {
  app.listen(PORT, () => {
    console.log(`SAVI Corporate Website running at http://localhost:${PORT}`);
  });
});
