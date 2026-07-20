require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('./db');
const cloudinary = require('./cloudinary');
const isVercel = process.env.VERCEL === '1';

// ============================================================
// 1. SMTP Transporter
// ============================================================
let smtpTransporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('✅ SMTP Transporter created successfully (port 587).');
  } catch (err) {
    console.error('❌ SMTP creation failed on port 587:', err.message);
    try {
      smtpTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log('✅ SMTP Transporter created successfully (fallback port 465).');
    } catch (err2) {
      console.error('❌ Fallback SMTP creation also failed:', err2.message);
      smtpTransporter = null;
    }
  }
} else {
  console.warn('⚠️ SMTP environment variables missing. Email will not work.');
}

// ============================================================
// 2. Email Sending Function
// ============================================================
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || 'info@belts-store.com';
const SITE_URL = process.env.SITE_URL || 'https://belts-store.com';

async function sendSupportEmail({ to, subject, html, text }) {
  if (!smtpTransporter) {
    return { success: false, error: 'SMTP configuration is missing. Check .env file.' };
  }
  try {
    const info = await smtpTransporter.sendMail({
      from: `"BELTS STORE Support" <${SUPPORT_EMAIL}>`,
      replyTo: SUPPORT_EMAIL,
      to,
      subject,
      text,
      html,
    });
    console.log('📧 Email sent successfully:', info.messageId);
    return { success: true };
  } catch (err) {
    console.error('❌ Support email send failed:', err);
    return { success: false, error: err.message || 'Email send failed' };
  }
}

// ============================================================
// 3. Express App & Middleware
// ============================================================
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON payload.' });
  }
  next(err);
});

// Short-lived in-memory cache for the product catalog. The Vercel-to-Atlas
// network path has consistently higher latency than local, so even a warm,
// already-connected instance takes several hundred ms per query -- for a
// catalog that changes rarely (only on admin edits) compared to how often
// visitors load it, serving a recent cached copy instead of re-querying on
// every single request is a large, safe win. Cleared immediately whenever a
// product is created/updated/deleted so admin changes are never stale.
const productsCache = { all: null, allAt: 0, publicCatalog: null, publicCatalogAt: 0 };
const PRODUCTS_CACHE_TTL_MS = 30000;
function invalidateProductsCache() {
  productsCache.all = null;
  productsCache.publicCatalog = null;
}

// Middleware to wait for DB readiness
const ensureDbReady = async (req, res, next) => {
  let attempts = 0;
  while (!db.ready && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }
  if (!db.ready) {
    return res.status(503).json({ error: 'Database is still initializing. Please try again.' });
  }
  // Give this instance a fresh chance to reach MongoDB if its initial
  // cold-start attempt failed, instead of staying stuck on the JSON
  // fallback (and therefore possibly stale/inconsistent data) for its
  // entire lifetime. Throttled internally, so this is a no-op most of
  // the time and never slows down a request when already connected.
  if (!db.isMongo) {
    await db.ensureMongoConnection();
  }
  next();
};

// Blocks WRITE operations (create/update/delete) when MongoDB isn't
// connected, so an admin edit never silently lands on ephemeral per-instance
// storage that vanishes on the next cold start. Reads (browsing, login) are
// still allowed to fall back so the site doesn't go fully dark during a
// transient MongoDB connectivity blip -- only writes are blocked.
const requireMongoForWrites = async (req, res, next) => {
  if (!db.isMongo) {
    await db.ensureMongoConnection();
  }
  if (!db.isMongo) {
    return res.status(503).json({ error: 'Database connection is temporarily unavailable. Changes cannot be saved right now -- please try again in a moment.' });
  }
  next();
};

// ---- Debug endpoint: database status ----
app.get('/api/db-status', ensureDbReady, (req, res) => {
  res.json({
    usingMongoDB: db.isMongo,
    ready: db.ready,
    seedHistoryExists: db.SeedHistory ? true : false,
    buildMarker: 'no-silent-fallback-v1',
    hasMongoUriEnvVar: !!process.env.MONGODB_URI,
    mongoUriLength: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0
  });
});

// ---- Init database ----
db.init(
  process.env.MONGODB_URI,
  process.env.ADMIN_EMAIL || 'admin@belts.com',
  process.env.ADMIN_PASSWORD || 'admin123'
).then(() => {
  seedProductsFromCatalog().catch(err => {
    console.error('❌ Seeding error:', err.message);
  });
}).catch((err) => {
  console.error('Database initialization failed:', err.message);
});

const JWT_SECRET = process.env.JWT_SECRET || 'belts_secret_session_key';
const pending2fa = new Map();
const CATALOG_PRODUCTS_PATH = path.join(__dirname, 'stitch_modern_belt_store_redesign', 'products_data.json');
const BACKUP_PRODUCTS_PATH = path.join(__dirname, 'data', 'products-backup.json');

// ============================================================
// 🔥 UPDATED: seedProductsFromCatalog using SeedHistory
// ============================================================
async function seedProductsFromCatalog() {
  try {
    // Guard: if SeedHistory is not available, skip.
    if (!db.SeedHistory) {
      console.warn('⚠️ SeedHistory model not available. Skipping seeding.');
      return;
    }

    // Check if seeding has already been done
    const seedDoc = await db.SeedHistory.findOne({});
    if (seedDoc) {
      console.log('✅ Seed history exists – skipping seeding.');
      return;
    }

    // If no seed history but products already exist (manual additions)
    const count = await db.Product.countDocuments();
    if (count > 0) {
      console.log('✅ Products already exist but no seed history – creating seed history and skipping.');
      await db.SeedHistory.create({ seeded: true, timestamp: new Date() });
      return;
    }

    // Locate catalog file
    let catalogPath = CATALOG_PRODUCTS_PATH;
    if (!fs.existsSync(catalogPath)) {
      catalogPath = BACKUP_PRODUCTS_PATH;
    }
    if (!fs.existsSync(catalogPath)) {
      console.log('No product catalog file found for seeding.');
      return;
    }

    const rawProducts = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    if (!Array.isArray(rawProducts)) {
      console.warn('Product catalog seed file is not an array.');
      return;
    }

    let createdCount = 0;

    for (const [index, item] of rawProducts.entries()) {
      const title = item.title || item.productName || item.name || `Product ${index + 1}`;
      const breadcrumbs = Array.isArray(item.breadcrumbs) ? item.breadcrumbs : [];
      const category = breadcrumbs[0] || item.category || 'General';
      const subcategory = breadcrumbs[1] || item.subcategory || '';
      const cleanName = String(title).replace(/<[^>]+>/g, ' ').trim();
      const slugBase = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `product-${index + 1}`;
      const sku = item.sku || `SKU-${Date.now()}-${index + 1}`;

      const normalizedProduct = {
        name: cleanName,
        description: item.full_description || item.description || item.short_description || '',
        shortDescription: item.short_description || item.description || '',
        category,
        subcategory,
        brand: item.brand || '',
        sku,
        price: Number(item.price) || 0,
        discountPrice: Number(item.discountPrice) || 0,
        stock: Number(item.stock) || 10,
        status: 'Active',
        images: item.image ? [item.image] : (Array.isArray(item.images) ? item.images : []),
        specifications: item.specs || item.specifications || {},
        tags: [category, subcategory].filter(Boolean),
        slug: `${slugBase}-${Date.now()}-${index + 1}`,
      };

      const existing = await db.Product.findOne({ sku });
      if (!existing) {
        await db.Product.create(normalizedProduct);
        createdCount++;
      }
    }

    // Mark seeding as done
    await db.SeedHistory.create({ seeded: true, timestamp: new Date() });
    console.log(`✅ Initial seed: ${createdCount} new products added.`);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  }
}

// ---- (Optional) Rebuild static catalog ----
async function rebuildStaticCatalog() {
  try {
    const products = await db.Product.find({ status: 'Active' });
    const mapped = products.map((p, idx) => {
      const breadcrumbs = [p.category];
      if (p.subcategory) breadcrumbs.push(p.subcategory);
      return {
        title: p.name,
        url: p.slug ? `https://belts-store.com/product/${p.slug}/` : `https://belts-store.com/product/product-${idx}/`,
        image: p.images && p.images.length > 0 ? p.images[0] : '',
        breadcrumbs: breadcrumbs,
        short_description: p.shortDescription || '',
        full_description: p.description || '',
        specs: p.specifications || {},
        related: []
      };
    });

    try {
      fs.writeFileSync(CATALOG_PRODUCTS_PATH, JSON.stringify(mapped, null, 2), 'utf8');
      console.log('✅ Rebuilt static products_data.json');
    } catch (fsErr) {
      console.warn('⚠️ Failed to write products_data.json to disk:', fsErr.message);
    }
  } catch (err) {
    console.error('Failed to rebuild static catalog:', err.message);
  }
}

// ============================================================
// Authentication Middleware
// ============================================================
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Session expired' });
  }
};

// ============================================================
// 4. Routes
// ============================================================

// Health check
app.get('/api/health', ensureDbReady, (req, res) => {
  res.json({ status: 'ok', database: 'connected' });
});

// Dynamic products_data.json
app.get(['/products_data.json', '/stitch_modern_belt_store_redesign/products_data.json'], ensureDbReady, async (req, res) => {
  try {
    const now = Date.now();
    if (productsCache.publicCatalog && (now - productsCache.publicCatalogAt) < PRODUCTS_CACHE_TTL_MS) {
      return res.json(productsCache.publicCatalog);
    }

    const products = await db.Product.find({ status: 'Active' }).lean();
    const mapped = products.map((p, idx) => {
      const breadcrumbs = [p.category];
      if (p.subcategory) breadcrumbs.push(p.subcategory);
      return {
        title: p.name,
        url: p.slug ? `https://belts-store.com/product/${p.slug}/` : `https://belts-store.com/product/product-${idx}/`,
        image: p.images && p.images.length > 0 ? p.images[0] : '',
        breadcrumbs: breadcrumbs,
        short_description: p.shortDescription || '',
        full_description: p.description || '',
        specs: p.specifications || {},
        related: []
      };
    });
    productsCache.publicCatalog = mapped;
    productsCache.publicCatalogAt = now;
    res.json(mapped);
  } catch (err) {
    console.error('Error serving products catalog:', err);
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

// ---- Admin Auth Endpoints ----
app.post('/api/admin/signup', ensureDbReady, async (req, res) => {
  try {
    const { name, email, password, adminCode } = req.body;
    if (!name || !email || !password || !adminCode) {
      return res.status(400).json({ error: 'Name, email, password, and admin access code are required' });
    }
    const correctCode = process.env.ADMIN_SECRET_CODE || 'ADMIN123';
    if (adminCode !== correctCode) {
      return res.status(403).json({ error: 'Invalid secret admin code' });
    }
    const existing = await db.Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered as admin' });
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    await db.Admin.create({
      name,
      email,
      password: passwordHash,
      profilePicture: '',
      loginHistory: []
    });
    res.json({ success: true, message: 'Admin account created. You can now login.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Admin signup failed' });
  }
});

app.post('/api/admin/login', ensureDbReady, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const admin = await db.Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const history = admin.loginHistory || [];
      history.push({ timestamp: new Date().toISOString(), ip, status: 'Failed: Wrong password' });
      await db.Admin.findByIdAndUpdate(admin._id, { loginHistory: history });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    pending2fa.set(email, {
      code,
      expires: Date.now() + 5 * 60 * 1000,
      adminId: admin._id
    });
    console.log(`[2FA Security Code] Code for ${email} is: ${code}`);

    res.json({ twoFactorRequired: true, email, devCode: code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login initiation failed' });
  }
});

app.post('/api/admin/verify-2fa', ensureDbReady, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }
    const session = pending2fa.get(email);
    if (!session) {
      return res.status(400).json({ error: '2FA session not found or expired. Please login again.' });
    }
    if (Date.now() > session.expires) {
      pending2fa.delete(email);
      return res.status(400).json({ error: '2FA code expired. Please request a new one.' });
    }
    if (session.code !== code) {
      return res.status(401).json({ error: 'Incorrect 2FA verification code' });
    }

    pending2fa.delete(email);
    const admin = await db.Admin.findById(session.adminId);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const history = admin.loginHistory || [];
    history.push({ timestamp: new Date().toISOString(), ip, status: 'Success' });
    await db.Admin.findByIdAndUpdate(admin._id, { loginHistory: history });

    const token = jwt.sign(
      { id: admin._id, name: admin.name, email: admin.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token, admin: { name: admin.name, email: admin.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '2FA verification failed' });
  }
});

app.post('/api/admin/request-delete-verification', requireAdmin, ensureDbReady, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    const admin = await db.Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin account not found' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const isEmailMatch = normalizedEmail === String(admin.email).trim().toLowerCase();
    const isNameMatch = String(admin.name || '').trim().toLowerCase() === normalizedEmail;

    if (!isEmailMatch && !isNameMatch) {
      return res.status(401).json({ error: 'Admin username or email does not match the current signed-in account' });
    }

    const credentialMatch = await bcrypt.compare(password, admin.password);
    if (!credentialMatch) {
      return res.status(401).json({ error: 'Admin password is incorrect' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    pending2fa.set(admin.email, {
      code,
      expires: Date.now() + 5 * 60 * 1000,
      adminId: admin._id,
      purpose: 'delete-product'
    });

    console.log(`[Delete Verification] Code for ${admin.email} is: ${code}`);
    res.json({ success: true, email: admin.email, devCode: code, message: 'Credential verification succeeded. Enter the 2FA code below.' });
  } catch (err) {
    console.error('Delete verification request failed:', err);
    res.status(500).json({ error: 'Failed to start delete verification' });
  }
});

app.post('/api/admin/confirm-delete-verification', requireAdmin, ensureDbReady, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and 2FA code are required' });
    }

    const session = pending2fa.get(email);
    if (!session || session.purpose !== 'delete-product') {
      return res.status(400).json({ error: 'Delete verification session not found or expired. Please retry.' });
    }
    if (Date.now() > session.expires) {
      pending2fa.delete(email);
      return res.status(400).json({ error: 'Delete verification code expired. Please retry.' });
    }
    if (session.code !== code) {
      return res.status(401).json({ error: 'Incorrect 2FA code for delete confirmation' });
    }

    pending2fa.delete(email);
    res.json({ success: true, message: 'Delete confirmation verified.' });
  } catch (err) {
    console.error('Delete verification confirmation failed:', err);
    res.status(500).json({ error: 'Delete verification failed' });
  }
});

app.get('/api/admin/me', requireAdmin, ensureDbReady, async (req, res) => {
  try {
    const admin = await db.Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ error: 'Profile not found' });
    res.json({
      name: admin.name,
      email: admin.email,
      profilePicture: admin.profilePicture,
      loginHistory: admin.loginHistory
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin profile' });
  }
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const { name, email, profilePicture, password } = req.body;
    let updateData = { name, email, profilePicture };
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    const updated = await db.Admin.findByIdAndUpdate(req.admin.id, updateData, { new: true });
    res.json({ name: updated.name, email: updated.email, profilePicture: updated.profilePicture });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update admin profile' });
  }
});

// ============================================================
// Products API
// ============================================================
const PRODUCTS_FILE = isVercel ? path.join('/tmp', 'products.json') : path.join(__dirname, 'data', 'products.json');
const LOGS_FILE = isVercel ? path.join('/tmp', 'logs.json') : path.join(__dirname, 'data', 'logs.json');

if (isVercel) {
  const originalProducts = path.join(__dirname, 'data', 'products.json');
  if (!fs.existsSync(PRODUCTS_FILE) && fs.existsSync(originalProducts)) {
    try {
      fs.copyFileSync(originalProducts, PRODUCTS_FILE);
      console.log('Copied products.json seed to /tmp');
    } catch (err) {
      console.error('Failed to copy products.json to /tmp:', err.message);
    }
  }
  const originalLogs = path.join(__dirname, 'data', 'logs.json');
  if (!fs.existsSync(LOGS_FILE) && fs.existsSync(originalLogs)) {
    try {
      fs.copyFileSync(originalLogs, LOGS_FILE);
      console.log('Copied logs.json seed to /tmp');
    } catch (err) {
      console.error('Failed to copy logs.json to /tmp:', err.message);
    }
  }
}

app.get('/api/debug-model', ensureDbReady, (req, res) => {
  res.json({
    hasProduct: !!db.Product,
    productType: typeof db.Product,
    modelName: db.Product ? db.Product.modelName : 'undefined'
  });
});

// Get a single product by ID (for debugging)
app.get('/api/products/:id', ensureDbReady, async (req, res) => {
  try {
    const product = await db.Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error('Error fetching product by ID:', err);
    res.status(500).json({ error: 'Failed to fetch product', details: err.message });
  }
});

// GET all products
app.get('/api/products', ensureDbReady, async (req, res) => {
  try {
    if (!db.Product) {
      console.error('❌ db.Product is undefined!');
      return res.status(500).json({ error: 'Product model not initialized' });
    }
    const now = Date.now();
    if (productsCache.all && (now - productsCache.allAt) < PRODUCTS_CACHE_TTL_MS) {
      return res.json(productsCache.all);
    }
    const products = await db.Product.find({}).lean();
    productsCache.all = products;
    productsCache.allAt = now;
    res.json(products);
  } catch (err) {
    console.error('❌ /api/products error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
});

// ---- Category routes ----
function toSlug(str) {
  return (str || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

app.get('/api/categories', ensureDbReady, async (req, res) => {
  try {
    const products = await db.Product.find({ status: 'Active' });
    const catMap = {};
    for (const p of products) {
      const cat = (p.category || 'Uncategorized').trim();
      const sub = (p.subcategory || '').trim();
      if (!catMap[cat]) catMap[cat] = { total: 0, subs: {} };
      catMap[cat].total += 1;
      if (sub) {
        if (!catMap[cat].subs[sub]) catMap[cat].subs[sub] = 0;
        catMap[cat].subs[sub] += 1;
      }
    }
    const result = Object.entries(catMap).map(([name, data]) => ({
      name,
      slug: toSlug(name),
      productCount: data.total,
      subcategories: Object.entries(data.subs).map(([subName, count]) => ({
        name: subName,
        slug: toSlug(subName),
        productCount: count
      }))
    }));
    res.json(result);
  } catch (err) {
    console.error('Failed to fetch categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/products/category/:category', ensureDbReady, async (req, res) => {
  try {
    const categorySlug = req.params.category.toLowerCase();
    const allProducts = await db.Product.find({ status: 'Active' });
    const matched = allProducts.filter(p => toSlug(p.category || '') === categorySlug);
    if (matched.length === 0) {
      return res.status(404).json({ error: `No products found for category "${req.params.category}"` });
    }
    res.json({
      category: matched[0].category,
      slug: categorySlug,
      total: matched.length,
      products: matched
    });
  } catch (err) {
    console.error('Failed to fetch products by category:', err);
    res.status(500).json({ error: 'Failed to fetch products by category' });
  }
});

app.get('/api/products/category/:category/:subcategory', ensureDbReady, async (req, res) => {
  try {
    const categorySlug = req.params.category.toLowerCase();
    const subcategorySlug = req.params.subcategory.toLowerCase();
    const allProducts = await db.Product.find({ status: 'Active' });
    const matched = allProducts.filter(p =>
      toSlug(p.category || '') === categorySlug &&
      toSlug(p.subcategory || '') === subcategorySlug
    );
    if (matched.length === 0) {
      return res.status(404).json({ error: `No products found for "${req.params.category} > ${req.params.subcategory}"` });
    }
    res.json({
      category: matched[0].category,
      subcategory: matched[0].subcategory,
      slug: `${categorySlug}/${subcategorySlug}`,
      total: matched.length,
      products: matched
    });
  } catch (err) {
    console.error('Failed to fetch products by subcategory:', err);
    res.status(500).json({ error: 'Failed to fetch products by subcategory' });
  }
});

// ---- POST, PUT, DELETE ----
app.post('/api/products', requireAdmin, ensureDbReady, requireMongoForWrites, async (req, res) => {
  try {
    const { name, description, shortDescription, category, subcategory, brand, sku, price, discountPrice, stock, status, images, specifications, tags } = req.body;

    if (!name || !sku || !category) {
      return res.status(400).json({ error: 'Name, SKU, and Category are required' });
    }

    const existing = await db.Product.findOne({ sku });
    if (existing) {
      return res.status(409).json({ error: 'A product with this SKU already exists.' });
    }

    const timestamp = Date.now();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + timestamp;
    const finalSku = sku + '-' + Math.random().toString(36).substring(2, 6);

    const newProduct = await db.Product.create({
      name: name || 'Unnamed Product',
      description: description || '',
      shortDescription: shortDescription || '',
      category: category || 'Uncategorized',
      subcategory: subcategory || '',
      brand: brand || '',
      sku: finalSku,
      price: Number(price) || 0,
      discountPrice: Number(discountPrice) || 0,
      stock: Number(stock) || 10,
      status: status || 'Active',
      images: images || [],
      specifications: specifications || {},
      tags: tags || [category, subcategory].filter(Boolean),
      slug: slug
    });

    await db.ActivityLog.create({
      action: `Added product: ${name} (SKU: ${finalSku})`,
      adminName: req.admin.name,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Product created: ${name} (${finalSku})`);
    invalidateProductsCache();
    try { await rebuildStaticCatalog(); } catch (e) {}
    res.json(newProduct);

  } catch (err) {
    console.error('❌ Product creation error:', err);
    res.status(500).json({ error: 'Failed to add product', details: err.message });
  }
});

app.put('/api/products/:id', requireAdmin, ensureDbReady, requireMongoForWrites, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, shortDescription, category, subcategory, brand, sku, price, discountPrice, stock, status, images, specifications, tags } = req.body;

    if (!name || !sku || !category) {
      return res.status(400).json({ error: 'Name, SKU, and Category are required' });
    }

    let slug = undefined;
    if (name) {
      slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now();
    }

    let finalStatus = status;
    if (stock !== undefined && Number(stock) === 0) {
      finalStatus = 'Inactive';
    }

    const updateData = {
      ...(name && { name }),
      description: description || '',
      shortDescription: shortDescription || '',
      ...(category && { category }),
      subcategory: subcategory || '',
      brand: brand || '',
      ...(sku && { sku }),
      ...(price !== undefined && { price: Number(price) }),
      ...(discountPrice !== undefined && { discountPrice: Number(discountPrice) }),
      ...(stock !== undefined && { stock: Number(stock) }),
      ...(finalStatus && { status: finalStatus }),
      ...(images && { images }),
      specifications: specifications || {},
      tags: tags || [category, subcategory].filter(Boolean),
      ...(slug && { slug })
    };

    let updatedProduct;
    try {
      updatedProduct = await db.Product.findByIdAndUpdate(id, updateData, { new: true });
      console.log('🟢 Product update result:', updatedProduct ? 'found' : 'not found');
    } catch (castErr) {
      console.warn(`Invalid ObjectId format for ID: ${id}, trying fallback by sku or slug`);
      const product = await db.Product.findOne({ $or: [{ sku: id }, { slug: id }] });
      if (product) {
        updatedProduct = await db.Product.findByIdAndUpdate(product._id, updateData, { new: true });
        console.log('🟢 Product update (fallback) result:', updatedProduct ? 'found' : 'not found');
      } else {
        console.warn('No product found by sku or slug');
        throw castErr;
      }
    }

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await db.ActivityLog.create({
      action: `Modified product: ${updatedProduct.name} (SKU: ${updatedProduct.sku})`,
      adminName: req.admin.name,
      timestamp: new Date().toISOString()
    });

    invalidateProductsCache();
    try { await rebuildStaticCatalog(); } catch (e) {}
    res.json(updatedProduct);
  } catch (err) {
    console.error('❌ Product update error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to edit product', details: err.message });
  }
});

app.delete('/api/products/:id', requireAdmin, ensureDbReady, requireMongoForWrites, async (req, res) => {
  try {
    if (req.headers['x-delete-verified'] !== 'true') {
      return res.status(403).json({ error: 'Delete action must be verified by admin credentials and 2FA.' });
    }

    const deleted = await db.Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Product not found' });

    console.log('🔴 Product deleted:', deleted.name, deleted.sku);

    await db.ActivityLog.create({
      action: `Deleted product: ${deleted.name} (SKU: ${deleted.sku})`,
      adminName: req.admin.name,
      timestamp: new Date().toISOString()
    });

    invalidateProductsCache();
    try { await rebuildStaticCatalog(); } catch (e) {}
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Product deletion error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ---- Image Upload ----
const MAX_BASE64_LENGTH = 13_600_000;
app.post('/api/products/upload', requireAdmin, ensureDbReady, async (req, res) => {
  try {
    const { filename, base64 } = req.body;
    if (!filename || !base64) return res.status(400).json({ error: 'Filename and base64 string are required' });

    if (base64.length > MAX_BASE64_LENGTH) {
      return res.status(413).json({ error: 'Image too large. Maximum allowed size is 10 MB.' });
    }
    if (base64.startsWith('data:') && !base64.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Only image uploads are allowed.' });
    }

    const dataUri = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    const hasCloudinaryConfig = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
    if (!hasCloudinaryConfig) {
      console.warn('Cloudinary config missing; returning the uploaded image as a data URL.');
      return res.json({ url: dataUri });
    }

    const publicId = `belts-store/${Date.now()}_${filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      public_id: publicId,
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto',
    });

    console.log(`✅ Image uploaded to Cloudinary: ${result.secure_url}`);
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error('❌ Cloudinary upload failed:', err);
    res.status(500).json({ error: 'Image upload failed', details: err.message });
  }
});

// ---- User APIs ----
app.get('/api/users', requireAdmin, ensureDbReady, async (req, res) => {
  try {
    const users = await db.User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/api/users/:id/status', requireAdmin, ensureDbReady, requireMongoForWrites, async (req, res) => {
  try {
    const { status } = req.body;
    const user = await db.User.findByIdAndUpdate(req.params.id, { status }, { new: true });
    await db.ActivityLog.create({
      action: `Set status of user ${user.email} to ${status}`,
      adminName: req.admin.name,
      timestamp: new Date().toISOString()
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.delete('/api/users/:id', requireAdmin, ensureDbReady, requireMongoForWrites, async (req, res) => {
  try {
    const user = await db.User.findByIdAndDelete(req.params.id);
    await db.ActivityLog.create({
      action: `Deleted user account: ${user.email}`,
      adminName: req.admin.name,
      timestamp: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ---- Orders ----
app.get('/api/orders', requireAdmin, ensureDbReady, async (req, res) => {
  try {
    const orders = await db.Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.post('/api/orders', requireAdmin, ensureDbReady, requireMongoForWrites, async (req, res) => {
  try {
    const { client, items, amount } = req.body;
    const payload = {
      client: client || {},
      items: Array.isArray(items) ? items : [],
      totalPrice: Number(amount) || 0,
      status: 'Pending'
    };
    const created = await db.Order.create(payload);
    res.json(created);
  } catch (err) {
    console.error('Orders create error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.put('/api/orders/:id/status', requireAdmin, ensureDbReady, requireMongoForWrites, async (req, res) => {
  try {
    const updated = await db.Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json(updated);
  } catch (err) {
    console.error('Order status update error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

app.delete('/api/orders/:id', requireAdmin, ensureDbReady, requireMongoForWrites, async (req, res) => {
  try {
    const deleted = await db.Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Order delete error:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// ---- Tickets ----
app.get('/api/tickets', requireAdmin, ensureDbReady, async (req, res) => {
  try {
    const tickets = await db.SupportTicket.find();
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

app.post('/api/tickets', async (req, res) => {
  try {
    const created = await db.SupportTicket.create(req.body);
    res.json(created);
  } catch (err) {
    console.error('Ticket create error:', err);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

app.put('/api/tickets/:id', requireAdmin, ensureDbReady, requireMongoForWrites, async (req, res) => {
  try {
    const ticket = await db.SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const update = {};
    if (req.body.status) update.status = req.body.status;
    if (req.body.reply) {
      update.replies = [...(ticket.replies || []), {
        sender: 'Admin',
        message: req.body.reply,
        products: Array.isArray(req.body.products) ? req.body.products : [],
        timestamp: new Date().toISOString()
      }];
      update.lastResponseAt = new Date().toISOString();
    }
    const updated = await db.SupportTicket.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(updated);
  } catch (err) {
    console.error('Ticket update error:', err);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// ---- Coupons ----
app.get('/api/coupons', requireAdmin, ensureDbReady, async (req, res) => {
  try {
    const coupons = await db.Coupon.find();
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

app.post('/api/coupons', requireAdmin, ensureDbReady, requireMongoForWrites, async (req, res) => {
  try {
    const { code, discountType, discountValue, usageLimit } = req.body;
    if (!code || !discountType || !discountValue) {
      return res.status(400).json({ error: 'Code, discount type, and discount value are required' });
    }
    const coupon = await db.Coupon.create({
      code: code.toUpperCase().trim(),
      discountType,
      discountValue: Number(discountValue),
      usageLimit: usageLimit ? Number(usageLimit) : null,
      status: 'Active',
      usedCount: 0
    });
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

app.put('/api/coupons/:id/status', requireAdmin, ensureDbReady, requireMongoForWrites, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid coupon status' });
    }
    const coupon = await db.Coupon.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update coupon status' });
  }
});

app.delete('/api/coupons/:id', requireAdmin, ensureDbReady, requireMongoForWrites, async (req, res) => {
  try {
    const deleted = await db.Coupon.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Coupon not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

// ---- Admin Analytics ----
app.get('/api/admin/analytics', requireAdmin, ensureDbReady, async (req, res) => {
  try {
    const products = await db.Product.find({ status: 'Active' });
    const lowStock = products.filter(p => Number(p.stock) <= 3).slice(0, 10);
    const orders = await db.Order.find({});
    const totalSales = orders.reduce((sum, order) => sum + (Number(order.totalPrice) || 0), 0);
    const weeklyRevenue = orders.filter(order => {
      const created = new Date(order.createdAt || order.updatedAt || Date.now());
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return created >= weekAgo;
    }).reduce((sum, order) => sum + (Number(order.totalPrice) || 0), 0);
    const recentLogs = await db.ActivityLog.find({}).sort({ timestamp: -1 }).limit(10);
    const mostSold = products.slice(0, 5).map(product => ({ name: product.name, count: Math.max(1, Math.min(10, Number(product.stock) || 1)) }));
    res.json({
      totalSales,
      weeklyRevenue,
      totalOrders: orders.length,
      activeUsers: await db.User.countDocuments({ status: 'Active' }),
      lowStock,
      mostSold,
      recentLogs
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// ---- i18n ----
const LOCALES_DIR = path.join(__dirname, 'locales');
app.get('/api/language/:lang', (req, res) => {
  const lang = req.params.lang;
  if (!['en', 'ar'].includes(lang)) {
    return res.status(400).json({ error: 'Unsupported language. Use "en" or "ar".' });
  }
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `Locale file for "${lang}" not found.` });
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (err) {
    console.error(`❌ Error serving locale "${lang}":`, err.message);
    res.status(500).json({ error: 'Failed to load language file.' });
  }
});

// ============================================================
// Static Files & Server Start (moved to bottom)
// ============================================================
app.get('/i18n.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'i18n.js'));
});
app.use('/mmmm', express.static(path.join(__dirname, 'mmmm')));
app.use(express.static(path.join(__dirname, 'stitch_modern_belt_store_redesign')));
app.use('/stitch_modern_belt_store_redesign', express.static(path.join(__dirname, 'stitch_modern_belt_store_redesign')));

app.get('/clients.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'stitch_modern_belt_store_redesign', 'clients.html'));
});
app.get('/partners.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'stitch_modern_belt_store_redesign', 'partners.html'));
});

const PORT = process.env.PORT || 3000;
if (!isVercel) {
  app.listen(PORT, () => {
    console.log('🚀 Server running at http://localhost:3000');
  });
}

module.exports = app;