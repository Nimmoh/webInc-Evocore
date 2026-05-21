'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { connect: connectDB } = require('./db/mongo');

const contactRoutes = require('./routes/contact');
const servicesRoutes = require('./routes/services');
const productsRoutes = require('./routes/products');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// ── SECURITY MIDDLEWARE ──
// Basic helmet security (skip CSP for now as it may break inline scripts)
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for development/inline scripts
    crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://evocore.co.ke', 'https://www.evocore.co.ke']
        : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting for API routes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { success: false, message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: { success: false, message: 'Too many login attempts, please try again later.' },
});

app.use('/api/', apiLimiter);
app.use('/api/admin/login', authLimiter);

// ── BODY PARSING ──
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── SECURITY HEADERS ──
app.use((req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Protect against clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Remove server header
    res.removeHeader('X-Powered-By');
    next();
});

// ── STATIC FILES WITH CACHING ──
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '7d',
    immutable: true,
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
}));

app.use('/images', express.static(path.join(__dirname, 'index', 'images'), {
    maxAge: '7d',
    immutable: true,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
}));

app.use(express.static(path.join(__dirname, 'index'), {
    maxAge: '1d',
    setHeaders: (res, path) => {
        // Cache HTML files for shorter time
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
        // Cache JS/CSS longer
        if (path.endsWith('.js') || path.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

// ── SEO METADATA FOR PAGES ──
app.use((req, res, next) => {
    // Add canonical URL header for SEO
    if (req.path.endsWith('.html') || req.path === '/') {
        const host = req.get('host');
        const protocol = req.protocol;
        res.locals.canonicalUrl = `${protocol}://${host}${req.originalUrl}`;
    }
    next();
});

app.use('/api/contact', contactRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok' }));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Endpoint not found.' });
  }
  next();
});

app.use((err, _req, res, _next) => {
  console.error('[server] error:', err);
  if (err && err.message && /file|image/i.test(err.message)) {
    return res.status(400).json({ success: false, message: err.message });
  }
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error('\n[server] Failed to connect to MongoDB:', err.message);
    console.error('[server] Check MONGODB_URI in .env, your Atlas IP allow-list, and network access.\n');
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`\n  Evocore Tech server running`);
    console.log(`  Local:   http://127.0.0.1:${PORT}/`);
    console.log(`  Admin:   http://127.0.0.1:${PORT}/admin.html`);
    console.log(`  API:     http://127.0.0.1:${PORT}/api/health\n`);
  });
}

start();
