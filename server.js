// Load environment variables from .env (no-op if file absent: env vars still work)
require('dotenv').config();

const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

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
      id                 SERIAL PRIMARY KEY,
      form_type          TEXT,
      name               TEXT,
      email              TEXT,
      company            TEXT,
      role               TEXT,
      entities           TEXT,
      jurisdictions      TEXT,
      platform           TEXT,
      current_system     TEXT,
      message            TEXT,
      created_at         TIMESTAMPTZ DEFAULT NOW(),
      email_sent         BOOLEAN NOT NULL DEFAULT FALSE,
      email_error        TEXT,
      email_attempted_at TIMESTAMPTZ
    );
  `);
  // Ensure schema migrations for existing tables
  try {
    await pool.query(`
      ALTER TABLE submissions ADD COLUMN IF NOT EXISTS email_error TEXT;
      ALTER TABLE submissions ADD COLUMN IF NOT EXISTS email_attempted_at TIMESTAMPTZ;
    `);
  } catch (migErr) {
    console.warn('[DB Migration note]:', migErr.message);
  }
  console.log('[DB] Submissions table ready');
}

const nodemailer = require('nodemailer');

function getEmailTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
  }
  return null;
}

// ─────────────────────────────────────────────
// Email Notification Sender (SMTP / Resend)
// ─────────────────────────────────────────────
async function sendSubmissionEmail(fields, rowId) {
  const isQuote = fields.form_type === 'quote';
  const subject = isQuote
    ? `[SAVI] 💼 New Quote Request: ${fields.company} (${fields.name})`
    : `[SAVI] 📅 New Demo Request: ${fields.company} (${fields.name})`;

  const textContent = [
    `═══════════════════════════════════════════════════`,
    ` SAVI FINANCIAL INTELLIGENCE · NEW SUBMISSION`,
    `═══════════════════════════════════════════════════`,
    `Submission ID:   #${rowId}`,
    `Form Type:       ${fields.form_type ? fields.form_type.toUpperCase() : 'DEMO'}`,
    `Full Name:       ${fields.name}`,
    `Work Email:      ${fields.email}`,
    `Company:         ${fields.company}`,
    `Role / Title:    ${fields.role || 'Not specified'}`,
    `Entities:        ${fields.entities || 'Not specified'}`,
    `Jurisdictions:   ${fields.jurisdictions || 'Not specified'}`,
    `Platform:        ${fields.platform || 'Not specified'}`,
    `Current System:  ${fields.current_system || 'Not specified'}`,
    `Message / Notes: ${fields.message || 'None provided'}`,
    `Timestamp:       ${new Date().toISOString()}`,
    `═══════════════════════════════════════════════════`,
  ].join('\n');

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0B1F3A; color: #F1F5F9; border-radius: 12px; overflow: hidden; border: 1px solid #E5C378;">
      <div style="background: linear-gradient(135deg, #071526 0%, #0B1F3A 100%); padding: 24px 30px; border-bottom: 2px solid #E5C378;">
        <h2 style="margin: 0; color: #FFFFFF; font-size: 22px; letter-spacing: 0.02em;">SAVI Financial Intelligence</h2>
        <p style="margin: 6px 0 0 0; color: #E5C378; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">
          New ${isQuote ? 'Quote Request' : 'Demo Walkthrough Request'} (#${rowId})
        </p>
      </div>
      <div style="padding: 30px; background: #0E1D36;">
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr><td style="padding: 10px 0; color: #94A3B8; width: 140px; font-weight: 600;">Submission ID:</td><td style="padding: 10px 0; color: #E5C378; font-weight: 700;">#${rowId}</td></tr>
          <tr><td style="padding: 10px 0; color: #94A3B8; font-weight: 600;">Representative:</td><td style="padding: 10px 0; color: #FFFFFF; font-weight: 700;">${fields.name}</td></tr>
          <tr><td style="padding: 10px 0; color: #94A3B8; font-weight: 600;">Work Email:</td><td style="padding: 10px 0;"><a href="mailto:${fields.email}" style="color: #38BDF8; text-decoration: none; font-weight: 600;">${fields.email}</a></td></tr>
          <tr><td style="padding: 10px 0; color: #94A3B8; font-weight: 600;">Company:</td><td style="padding: 10px 0; color: #FFFFFF; font-weight: 700;">${fields.company}</td></tr>
          <tr><td style="padding: 10px 0; color: #94A3B8; font-weight: 600;">Role / Title:</td><td style="padding: 10px 0; color: #E2E8F0;">${fields.role || 'N/A'}</td></tr>
          <tr><td style="padding: 10px 0; color: #94A3B8; font-weight: 600;">Entities:</td><td style="padding: 10px 0; color: #E2E8F0;">${fields.entities || 'N/A'}</td></tr>
          ${fields.jurisdictions ? `<tr><td style="padding: 10px 0; color: #94A3B8; font-weight: 600;">Jurisdictions:</td><td style="padding: 10px 0; color: #E2E8F0;">${fields.jurisdictions}</td></tr>` : ''}
          ${fields.platform ? `<tr><td style="padding: 10px 0; color: #94A3B8; font-weight: 600;">Platform:</td><td style="padding: 10px 0; color: #E2E8F0;">${fields.platform}</td></tr>` : ''}
          <tr><td style="padding: 10px 0; color: #94A3B8; font-weight: 600; vertical-align: top;">Notes / Request:</td><td style="padding: 10px 0; color: #E2E8F0; line-height: 1.5;">${fields.message || 'No additional notes'}</td></tr>
        </table>
        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.12); font-size: 13px; color: #94A3B8;">
          Received via vinayakafinancials.com · SAVI Corporate Platform
        </div>
      </div>
    </div>
  `;

  // 1. Try Nodemailer (Gmail SMTP configured in .env)
  const transporter = getEmailTransporter();
  if (transporter) {
    const fromAddress = process.env.SMTP_FROM || `SAVI Enquiries <${process.env.SMTP_USER}>`;
    const recipients = ['saakshi@vinayakafinancials.com', process.env.SMTP_USER].filter(Boolean).join(', ');
    
    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipients,
      replyTo: fields.email,
      subject,
      text: textContent,
      html: htmlContent
    });

    console.log(`[EMAIL SUCCESS] Timestamp=${new Date().toISOString()}, submission_id=${rowId}, recipients=${recipients}, messageId=${info.messageId}`);

    // Also send instant confirmation to the customer
    if (fields.email && fields.email.includes('@')) {
      try {
        await transporter.sendMail({
          from: fromAddress,
          to: fields.email,
          subject: isQuote
            ? `SAVI Quote Request Received · Vinayaka Financials`
            : `SAVI Walkthrough Request Received · Vinayaka Financials`,
          text: `Dear ${fields.name},\n\nThank you for reaching out regarding SAVI Financial Intelligence. We have received your ${isQuote ? 'custom quotation request' : 'demonstration walkthrough request'} for ${fields.company}.\n\nOur team is reviewing your requirements and will reach out shortly to schedule a convenient time.\n\nBest regards,\nSaakshi Sharma\nVinayaka Financials\nhttps://vinayakafinancials.com`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #0B1F3A; color: #F1F5F9; border-radius: 10px; overflow: hidden; border: 1px solid #E5C378;">
              <div style="padding: 24px 30px; background: linear-gradient(135deg, #071526, #0B1F3A); border-bottom: 2px solid #E5C378;">
                <h2 style="margin: 0; color: #FFFFFF; font-size: 20px;">Vinayaka Financials · SAVI</h2>
              </div>
              <div style="padding: 30px; background: #0E1D36; font-size: 15px; line-height: 1.6; color: #E2E8F0;">
                <p style="margin-top: 0;">Dear <strong>${fields.name}</strong>,</p>
                <p>Thank you for your interest in <strong>SAVI Financial Intelligence</strong>. We have successfully received your ${isQuote ? 'quote inquiry' : 'demo walkthrough request'} for <strong>${fields.company}</strong>.</p>
                <p>Our team will review your specifications and contact you shortly to coordinate next steps.</p>
                <div style="margin: 24px 0; padding: 16px; background: rgba(229,195,120,0.1); border-left: 3px solid #E5C378; border-radius: 4px; font-size: 14px;">
                  If you have immediate questions, feel free to reply directly to this email or contact us on WhatsApp at <strong>+91 82900 06889</strong>.
                </div>
                <p style="margin-bottom: 0; font-size: 13px; color: #94A3B8;">
                  Kind regards,<br>
                  <strong style="color: #FFFFFF;">Saakshi Sharma</strong><br>
                  Vinayaka Financials · <a href="https://vinayakafinancials.com" style="color: #E5C378; text-decoration: none;">vinayakafinancials.com</a>
                </p>
              </div>
            </div>
          `
        });
        console.log(`[EMAIL AUTO-REPLY] Customer confirmation sent to ${fields.email} for submission_id=${rowId}`);
      } catch (custErr) {
        console.warn(`[EMAIL AUTO-REPLY WARNING] Customer auto-reply failed for submission_id=${rowId}:`, custErr.message);
      }
    }

    return { success: true, messageId: info.messageId, transport: 'smtp' };
  }

  // 2. Fallback to Resend if RESEND_API_KEY is configured
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'SAVI Enquiries <onboarding@resend.dev>';
    const result = await resend.emails.send({
      from: fromAddress,
      to: 'saakshi@vinayakafinancials.com',
      subject,
      text: textContent,
      html: htmlContent
    });
    if (result.error) {
      throw new Error(result.error.message || JSON.stringify(result.error));
    }
    console.log(`[EMAIL SUCCESS via Resend] Timestamp=${new Date().toISOString()}, submission_id=${rowId}, data=`, result.data);
    return { success: true, messageId: result.data?.id, transport: 'resend' };
  }

  throw new Error('No email transport configured (neither SMTP credentials nor RESEND_API_KEY provided)');
}

// ─────────────────────────────────────────────
// Rate limiter: Max 1 submission per 10s per IP (Debounce & Flood Protection)
// ─────────────────────────────────────────────
const submitLimiter = rateLimit({
  windowMs:        10 * 1000,
  max:             1,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message:         { success: false, error: 'Please wait a few seconds before submitting again.' },
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

  // (b) Server-side CAPTCHA check
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

  // (c) Server-side Deduplication Check: reject/ignore if same email & company within last 30 seconds
  try {
    const existing = await pool.query(
      `SELECT id FROM submissions
       WHERE email = $1 AND company = $2 AND created_at > NOW() - INTERVAL '30 seconds'
       ORDER BY id DESC LIMIT 1`,
      [fields.email, fields.company]
    );

    if (existing.rows && existing.rows.length > 0) {
      console.log(`[FORM DEDUP] Ignored duplicate submission from ${fields.email} for ${fields.company} within 30s (matches id=${existing.rows[0].id})`);
      return res.json({
        success:   true,
        recipient: 'saakshi@vinayakafinancials.com',
        message:   fields.form_type === 'quote'
          ? "Thank you: we've received your details and will be in touch shortly to discuss what would work for your organisation."
          : "Thank you: we've received your request and will be in touch shortly to arrange a time.",
      });
    }
  } catch (dedupErr) {
    console.warn('[FORM DEDUP Check Warning]:', dedupErr.message);
  }

  // (d) Write to Postgres FIRST: safety net
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

  // (e) Attempt email delivery with detailed logging and DB persistence
  try {
    const emailResult = await sendSubmissionEmail(fields, rowId);
    await pool.query(
      'UPDATE submissions SET email_sent = TRUE, email_error = NULL, email_attempted_at = NOW() WHERE id = $1',
      [rowId]
    );
    console.log(`[FORM] Email delivery recorded in DB for submission id=${rowId}, messageId=${emailResult.messageId}`);
  } catch (emailErr) {
    const fullErrorDetails = {
      message: emailErr.message,
      code: emailErr.code || null,
      command: emailErr.command || null,
      response: emailErr.response || null,
      responseCode: emailErr.responseCode || null,
      stack: emailErr.stack || null
    };
    const errorString = JSON.stringify(fullErrorDetails);

    console.error(`[FORM EMAIL ERROR] Timestamp=${new Date().toISOString()}, submission_id=${rowId}:`, fullErrorDetails);

    try {
      await pool.query(
        'UPDATE submissions SET email_sent = FALSE, email_error = $1, email_attempted_at = NOW() WHERE id = $2',
        [errorString, rowId]
      );
    } catch (updateErr) {
      console.error('[FORM DB Update Error]:', updateErr.message);
    }
  }

  // (f) Always respond success if DB write succeeded
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
  '/admin':                         'admin/index.html',
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
