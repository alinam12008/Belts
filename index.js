require('dotenv').config();
const mongoose = require('mongoose'); // add this line
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
// 1. SMTP Transporter – with fallback and logging
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
  console.log('   Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
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


// Init database
db.init(
  process.env.MONGODB_URI,
  process.env.ADMIN_EMAIL || 'admin@belts.com',
  process.env.ADMIN_PASSWORD || 'admin123'
).then(() => {
  seedProductsFromCatalog();
}).catch((err) => {
  console.error('Database initialization failed:', err.message);
});

const JWT_SECRET = process.env.JWT_SECRET || 'belts_secret_session_key';
const pending2fa = new Map();
const CATALOG_PRODUCTS_PATH = path.join(__dirname, 'stitch_modern_belt_store_redesign', 'products_data.json');
const BACKUP_PRODUCTS_PATH = path.join(__dirname, 'data', 'products-backup.json');

async function seedProductsFromCatalog() {
  try {
    // 1. Skip if any product already exists
    const count = await db.Product.countDocuments();
    if (count > 0) {
      console.log('✅ Products already exist, skipping seeding.');
      return;
    }

    // 2. Locate the seed file
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
      // Build your product data (same as before)
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

      // 🔥 ONLY create if the product does NOT exist
      const existing = await db.Product.findOne({ sku });
      if (!existing) {
        await db.Product.create(normalizedProduct);
        createdCount++;
      }
      // If it exists, we do NOTHING (no update, no overwrite)
    }

    console.log(`✅ Initial seed: ${createdCount} new products added.`);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  }
}

// Rebuild the static products_data.json file from the current DB state.
// This helps static pages that fetch products_data.json directly pick up
// admin changes (create/edit/delete).
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
      // On some hosting platforms (serverless), writing into the project dir may fail.
      console.warn('⚠️ Failed to write products_data.json to disk:', fsErr.message);
    }
  } catch (err) {
    console.error('Failed to rebuild static catalog:', err.message);
  }
}

// Authentication middleware
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
// 4. Routes – all fully implemented
// ============================================================

// 🔥 ADD THIS HEALTH CHECK ROUTE FIRST
app.get('/api/health', async (req, res) => {
  try {
    await db.Product.findOne(); // a simple query to test connection
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// Intercept products data request to serve dynamic product items
app.get(['/products_data.json', '/stitch_modern_belt_store_redesign/products_data.json'], async (req, res) => {
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
    res.json(mapped);
  } catch (err) {
    console.error('Error serving products catalog:', err);
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

// Admin Auth Endpoints
app.post('/api/admin/signup', async (req, res) => {
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

app.post('/api/admin/login', async (req, res) => {
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

    // 2FA Generation
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

app.post('/api/admin/verify-2fa', async (req, res) => {
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

app.post('/api/admin/request-delete-verification', requireAdmin, async (req, res) => {
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

app.post('/api/admin/confirm-delete-verification', requireAdmin, async (req, res) => {
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

app.get('/api/admin/me', requireAdmin, async (req, res) => {
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
// Products – Direct JSON file operations (MongoDB fallback)
// ============================================================
const PRODUCTS_FILE = isVercel ? path.join('/tmp', 'products.json') : path.join(__dirname, 'data', 'products.json');
const LOGS_FILE = isVercel ? path.join('/tmp', 'logs.json') : path.join(__dirname, 'data', 'logs.json');

// Copy seed files to /tmp on Vercel if they do not exist
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

// GET /api/products
app.get('/api/products', async (req, res) => {
  try {
    const products = await db.Product.find().lean(); // lean() for plain JS objects
    res.json(products);
  } catch (err) {
    console.error('❌ GET /api/products error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
});

// ============================================================
// Category-based browse routes
// ============================================================

/**
 * Converts a human-readable string → URL-friendly slug
 * e.g. "Belts Power Transmission" → "belts-power-transmission"
 */
function toSlug(str) {
  return (str || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * GET /api/categories
 * Returns a structured map of all categories and their subcategories,
 * with URL-friendly slugs and product counts.
 *
 * Example response:
 * [
 *   {
 *     "name": "Belts Power Transmission",
 *     "slug": "belts-power-transmission",
 *     "productCount": 46,
 *     "subcategories": [
 *       { "name": "V Belts", "slug": "v-belts", "productCount": 10 },
 *       ...
 *     ]
 *   },
 *   ...
 * ]
 */
app.get('/api/categories', async (req, res) => {
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

/**
 * GET /api/products/category/:category
 * Returns all active products in a given category (matched by slug).
 *
 * Example:  GET /api/products/category/belts-power-transmission
 */
app.get('/api/products/category/:category', async (req, res) => {
  try {
    const categorySlug = req.params.category.toLowerCase();
    const allProducts = await db.Product.find({ status: 'Active' });

    const matched = allProducts.filter(p =>
      toSlug(p.category || '') === categorySlug
    );

    if (matched.length === 0) {
      return res.status(404).json({
        error: `No products found for category "${req.params.category}"`,
        hint: 'Use GET /api/categories to see all valid category slugs'
      });
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

/**
 * GET /api/products/category/:category/:subcategory
 * Returns all active products in a given category AND subcategory (matched by slug).
 *
 * Example:  GET /api/products/category/belts-power-transmission/v-belts
 */
app.get('/api/products/category/:category/:subcategory', async (req, res) => {
  try {
    const categorySlug    = req.params.category.toLowerCase();
    const subcategorySlug = req.params.subcategory.toLowerCase();
    const allProducts     = await db.Product.find({ status: 'Active' });

    const matched = allProducts.filter(p =>
      toSlug(p.category    || '') === categorySlug &&
      toSlug(p.subcategory || '') === subcategorySlug
    );

    if (matched.length === 0) {
      return res.status(404).json({
        error: `No products found for "${req.params.category} > ${req.params.subcategory}"`,
        hint: 'Use GET /api/categories to see all valid slugs'
      });
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

// POST /api/products
app.post('/api/products', requireAdmin, async (req, res) => {
  try {
    const { name, description, shortDescription, category, subcategory, brand, sku, price, discountPrice, stock, status, images, specifications, tags } = req.body;

    if (!name || !sku || !category) {
      return res.status(400).json({ error: 'Name, SKU, and Category are required' });
    }

    // Generate unique slug
    const timestamp = Date.now();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + timestamp;

    // Generate unique SKU
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

    // Log activity
    await db.ActivityLog.create({
      action: `Added product: ${name} (SKU: ${finalSku})`,
      adminName: req.admin.name,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Product created: ${name} (${finalSku})`);
    // Rebuild static catalog for frontend consumers
    try { await rebuildStaticCatalog(); } catch (e) { /* logged in helper */ }
    res.json(newProduct);

  } catch (err) {
    console.error('❌ Product creation error:', err);
    res.status(500).json({ error: 'Failed to add product', details: err.message });
  }
});

// PUT /api/products/:id
app.put('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, shortDescription, category, subcategory, brand, sku, price, discountPrice, stock, status, images, specifications, tags } = req.body;

    // Validate required fields
    if (!name || !sku || !category) {
      return res.status(400).json({ error: 'Name, SKU, and Category are required' });
    }

    // Generate slug
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

    // Try to find and update the product
    let updatedProduct;
    try {
      updatedProduct = await db.Product.findByIdAndUpdate(id, updateData, { new: true });
    } catch (castErr) {
      // If ID is not a valid ObjectId, try to find by sku or slug (fallback)
      console.warn(`Invalid ObjectId format for ID: ${id}, trying fallback by sku or slug`);
      // Attempt to find by sku or slug if the id matches
      const product = await db.Product.findOne({ 
        $or: [{ sku: id }, { slug: id }] 
      });
      if (product) {
        // Update the found product
        updatedProduct = await db.Product.findByIdAndUpdate(product._id, updateData, { new: true });
      } else {
        throw castErr; // rethrow to trigger 404
      }
    }

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Log activity
    await db.ActivityLog.create({
      action: `Modified product: ${updatedProduct.name} (SKU: ${updatedProduct.sku})`,
      adminName: req.admin.name,
      timestamp: new Date().toISOString()
    });

    // Rebuild static catalog
    try { await rebuildStaticCatalog(); } catch (e) { /* logged in helper */ }

    res.json(updatedProduct);
  } catch (err) {
    console.error('❌ Product update error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to edit product', details: err.message });
  }
});

// DELETE /api/products/:id
app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    if (req.headers['x-delete-verified'] !== 'true') {
      return res.status(403).json({ error: 'Delete action must be verified by admin credentials and 2FA.' });
    }

    const deleted = await db.Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Product not found' });

    // Log activity
    await db.ActivityLog.create({
      action: `Deleted product: ${deleted.name} (SKU: ${deleted.sku})`,
      adminName: req.admin.name,
      timestamp: new Date().toISOString()
    });

    // Rebuild static catalog so public pages reflect the deletion
    try { await rebuildStaticCatalog(); } catch (e) { /* logged in helper */ }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Product deletion error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});


// ============================================================
// Image Upload — Cloudinary (permanent, CDN-backed storage)
// ============================================================

// ~10 MB limit: base64 encodes ~4/3x, so 13.6 M chars ≈ 10 MB raw
const MAX_BASE64_LENGTH = 13_600_000;

app.post('/api/products/upload', requireAdmin, async (req, res) => {
  try {
    const { filename, base64 } = req.body;
    if (!filename || !base64) {
      return res.status(400).json({ error: 'Filename and base64 string are required' });
    }

    // 1. File size guard — reject payloads over ~10 MB
    if (base64.length > MAX_BASE64_LENGTH) {
      return res.status(413).json({ error: 'Image too large. Maximum allowed size is 10 MB.' });
    }

    // 2. Image-type validation — only accept images
    if (base64.startsWith('data:') && !base64.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Only image uploads are allowed.' });
    }

    // 3. Preserve the original format: use the data URI prefix as-is when present,
    //    otherwise fall back to JPEG (document: frontend should always send full data URI)
    const dataUri = base64.startsWith('data:')
      ? base64
      : `data:image/jpeg;base64,${base64}`;

    const hasCloudinaryConfig = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
    if (!hasCloudinaryConfig) {
      console.warn('Cloudinary config missing; returning the uploaded image as a data URL so products can still be saved.');
      return res.json({ url: dataUri });
    }

    // 4. Build a unique public_id — Date.now() guarantees no collisions, so overwrite is not needed
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

// User APIs
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const users = await db.User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/api/users/:id/status', requireAdmin, async (req, res) => {
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

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
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

// Order/Quote Request APIs
app.get('/api/orders', requireAdmin, async (req, res) => {
  try {
    const orders = await db.Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders list' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { client, items, amount } = req.body;
    if (!client || !items || items.length === 0) {
      return res.status(400).json({ error: 'Client and items details are required' });
    }

    let totalPrice = 0;
    const updatedItems = [];
    for (let item of items) {
      const dbProd = await db.Product.findOne({ sku: item.ref });
      let itemPrice = 50;
      if (dbProd) {
        itemPrice = dbProd.discountPrice || dbProd.price || 50;
        const newStock = Math.max(0, dbProd.stock - item.quantity);
        let updates = { stock: newStock };
        if (newStock === 0) {
          updates.status = 'Inactive';
        }
        await db.Product.findByIdAndUpdate(dbProd._id, updates);
      }
      totalPrice += itemPrice * item.quantity;
      updatedItems.push({
        id: item.id,
        name: item.name,
        ref: item.ref,
        quantity: item.quantity,
        image: item.image,
        unitPrice: itemPrice
      });
    }

    const finalTotal = (amount !== undefined && !isNaN(amount)) ? Number(amount) : totalPrice;

    const order = await db.Order.create({
      client,
      items: updatedItems,
      status: 'Pending',
      totalPrice: finalTotal
    });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

app.put('/api/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await db.Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    await db.ActivityLog.create({
      action: `Set status of order ID ${order._id} to ${status}`,
      adminName: req.admin.name,
      timestamp: new Date().toISOString()
    });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

app.put('/api/orders/:id', requireAdmin, async (req, res) => {
  try {
    const { client, items, amount } = req.body;
    if (!client || !items || items.length === 0) {
      return res.status(400).json({ error: 'Client and items details are required' });
    }

    let totalPrice = 0;
    const updatedItems = [];
    for (let item of items) {
      const dbProd = await db.Product.findOne({ sku: item.ref });
      let itemPrice = dbProd ? (dbProd.discountPrice || dbProd.price || 50) : 50;
      totalPrice += itemPrice * item.quantity;
      updatedItems.push({
        id: item.id || item.ref || Math.random().toString(36).substr(2, 9),
        name: item.name,
        ref: item.ref,
        quantity: item.quantity,
        image: item.image || '',
        unitPrice: itemPrice
      });
    }

    const finalTotal = (amount !== undefined && !isNaN(amount)) ? Number(amount) : totalPrice;

    const updatedOrder = await db.Order.findByIdAndUpdate(req.params.id, {
      client,
      items: updatedItems,
      totalPrice: finalTotal,
      updatedAt: new Date().toISOString()
    }, { new: true });

    await db.ActivityLog.create({
      action: `Updated order ID ${req.params.id}`,
      adminName: req.admin.name,
      timestamp: new Date().toISOString()
    });

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

app.delete('/api/orders/:id', requireAdmin, async (req, res) => {
  try {
    await db.Order.findByIdAndDelete(req.params.id);
    await db.ActivityLog.create({
      action: `Cancelled/deleted order ID ${req.params.id}`,
      adminName: req.admin.name,
      timestamp: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Support Tickets
app.get('/api/tickets', requireAdmin, async (req, res) => {
  try {
    const tickets = await db.SupportTicket.find();
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets list' });
  }
});

app.post('/api/tickets', async (req, res) => {
  try {
    const { name, email, phone, company, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Name, email, subject, and message are required' });
    }
    const ticket = await db.SupportTicket.create({
      name, email, phone, company, subject, message, status: 'Open', replies: []
    });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit contact message' });
  }
});

app.put('/api/tickets/:id', requireAdmin, async (req, res) => {
  try {
    const { message, status, reply } = req.body;
    let update = {};

    if (status && !reply) {
      update.status = status;
      const ticket = await db.SupportTicket.findByIdAndUpdate(req.params.id, update, { new: true });
      return res.json(ticket);
    }

    if (reply) {
      console.log("ADMIN REPLY RECEIVED");

      const ticket = await db.SupportTicket.findById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      console.log("CUSTOMER EMAIL:", ticket.email);

      const subject = `Support Response - Ticket #${ticket._id}`;
      const websiteUrl = SITE_URL;

      const whatsappNumbers = [
        { number: '+966 13 832 2867', clean: '966138322867' },
      ];
      const whatsappMessage = 'Welcome%20to%20Belts%20Store!!%20I%20want%20to%20inquire';

      const whatsappButtons = whatsappNumbers.map(w => `
        <a href="https://wa.me/${w.clean}?text=${whatsappMessage}"
          style="
            background:#25D366;
            color:white;
            padding:12px 24px;
            text-decoration:none;
            border-radius:6px;
            display:inline-block;
            margin:5px;
          ">
          Chat on WhatsApp - ${w.number}
        </a>
      `).join('');

      const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:auto;padding:20px">

      <h2 style="color:#003178;">
        BELTS STORE
      </h2>

      <p>Hello ${ticket.name},</p>

      <p>Thank you for contacting our support team.</p>

      <hr>

      <h3>Your Query</h3>

      <div style="background:#f5f5f5;padding:15px;border-radius:8px;">
        ${ticket.message}
      </div>

      <br>

      <h3>Admin Response</h3>

      <div style="background:#eef8ff;padding:15px;border-radius:8px;">
        ${reply}
      </div>

      <br>

      <a href="${websiteUrl}"
        style="
          background:#003178;
          color:white;
          padding:12px 24px;
          text-decoration:none;
          border-radius:6px;
          display:inline-block;
          margin:5px;
        ">
        Visit Website
      </a>

      ${whatsappButtons}

      <hr>

      <p>
        Regards,<br>
        BELTS STORE Support Team<br>
        <a href="mailto:${SUPPORT_EMAIL}" style="color:#003178;">${SUPPORT_EMAIL}</a>
      </p>

      </div>
      `;

      const emailText = `
      Customer Query:${ticket.message}
      Admin Response:${reply}
      Website:${websiteUrl}

      Regards,
      BELTS STORE Support Team
      ${SUPPORT_EMAIL}
      `;

      const emailResult = await sendSupportEmail({
        to: ticket.email,
        subject,
        html: emailHtml,
        text: emailText
      });

      console.log("EMAIL SENT SUCCESSFULLY");

      if (!emailResult.success) {
        return res.status(500).json({ error: emailResult.error || 'Failed to send support email' });
      }

      const replyEntry = {
        sender: 'Admin',
        message: reply,
        timestamp: new Date().toISOString()
      };

      update.$push = { replies: replyEntry };
      update.emailSentAt = new Date().toISOString();
      update.lastResponseAt = new Date().toISOString();
      update.status = 'Replied';

      const updatedTicket = await db.SupportTicket.findByIdAndUpdate(req.params.id, update, { new: true });
      return res.json(updatedTicket);
    }

    const ticket = await db.SupportTicket.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update support ticket' });
  }
});

// Discount Coupons
app.get('/api/coupons', requireAdmin, async (req, res) => {
  try {
    const coupons = await db.Coupon.find();
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

app.post('/api/coupons', requireAdmin, async (req, res) => {
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

app.put('/api/coupons/:id/status', requireAdmin, async (req, res) => {
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

app.delete('/api/coupons/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await db.Coupon.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Coupon not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

// Dashboard Analytics
app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
  try {
    const totalOrders = await db.Order.countDocuments();
    const orders = await db.Order.find();
    const products = await db.Product.find();
    const users = await db.User.countDocuments();
    const logs = await db.ActivityLog.find();

    let totalSales = 0;
    let weeklyRevenue = 0;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const productSales = {};
    orders.forEach(order => {
      if (order.status !== 'Cancelled') {
        totalSales += order.totalPrice || 0;
        const orderDate = new Date(order.createdAt || order.updatedAt);
        if (orderDate >= oneWeekAgo) {
          weeklyRevenue += order.totalPrice || 0;
        }
        order.items.forEach(item => {
          productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
        });
      }
    });

    const mostSold = Object.keys(productSales)
      .map(name => ({ name, count: productSales[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const lowStock = products
      .filter(p => p.stock <= 10)
      .map(p => ({ name: p.name, stock: p.stock, sku: p.sku }));

    res.json({
      totalSales,
      weeklyRevenue,
      totalOrders,
      activeUsers: users,
      mostSold,
      lowStock,
      recentLogs: logs.slice(-10).reverse()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Analytics failure' });
  }
});

// ============================================================
// 5. Language / i18n API – serves locale JSON files
// ============================================================
const LOCALES_DIR = path.join(__dirname, 'locales');

app.get('/api/language/:lang', (req, res) => {
  const lang = req.params.lang;
  // Only allow 'en' and 'ar' to prevent path traversal
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
// 6. Static Files & Server Start
// ============================================================

// ============================================================
// 6. Static Files & Server Start
// ============================================================

// ***** MOVED STATIC MIDDLEWARE TO BOTTOM *****
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'stitch_modern_belt_store_redesign')));

// Explicit routes for clients.html and partners.html (optional, static already serves them)
app.get('/clients.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'stitch_modern_belt_store_redesign', 'clients.html'));
});
app.get('/partners.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'stitch_modern_belt_store_redesign', 'partners.html'));
});

const PORT = process.env.PORT || 3000;
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;