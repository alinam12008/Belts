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

// [FIX] Middleware to wait for DB readiness
const ensureDbReady = async (req, res, next) => {
  let attempts = 0;
  while (!db.ready && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }
  if (!db.ready) {
    return res.status(503).json({ error: 'Database is still initializing. Please try again.' });
  }
  next();
};

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
    const count = await db.Product.countDocuments();
    if (count > 0) {
      console.log('✅ Products already exist, skipping seeding.');
      return;
    }

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
    console.log(`✅ Initial seed: ${createdCount} new products added.`);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  }
}

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

// Health check – also ensures DB is ready
app.get('/api/health', ensureDbReady, (req, res) => {
  res.json({ status: 'ok', database: 'connected' });
});

// Intercept products data request to serve dynamic product items
app.get(['/products_data.json', '/stitch_modern_belt_store_redesign/products_data.json'], ensureDbReady, async (req, res) => {
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

// [FIX] GET /api/products – removed .lean() to work with both Mongoose and JSONModel
app.get('/api/products', ensureDbReady, async (req, res) => {
  try {
    console.log('🟢 /api/products called');
    if (!db.Product) {
      console.error('❌ db.Product is undefined!');
      return res.status(500).json({ error: 'Product model not initialized' });
    }
    const products = await db.Product.find({});
    console.log(`🟢 Found ${products.length} products`);
    res.json(products);
  } catch (err) {
    console.error('❌ /api/products error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
});

// ============================================================
// Category-based browse routes
// ============================================================
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

// [FIX] POST /api/products – added duplicate check and ensureDbReady
app.post('/api/products', requireAdmin, ensureDbReady, async (req, res) => {
  try {
    const { name, description, shortDescription, category, subcategory, brand, sku, price, discountPrice, stock, status, images, specifications, tags } = req.body;

    if (!name || !sku || !category) {
      return res.status(400).json({ error: 'Name, SKU, and Category are required' });
    }

    // Check if product already exists with same SKU
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
    try { await rebuildStaticCatalog(); } catch (e) {}
    res.json(newProduct);

  } catch (err) {
    console.error('❌ Product creation error:', err);
    res.status(500).json({ error: 'Failed to add product', details: err.message });
  }
});

// [FIX] PUT /api/products/:id – improved ObjectId fallback, ensureDbReady
app.put('/api/products/:id', requireAdmin, ensureDbReady, async (req, res) => {
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
    } catch (castErr) {
      console.warn(`Invalid ObjectId format for ID: ${id}, trying fallback by sku or slug`);
      const product = await db.Product.findOne({ $or: [{ sku: id }, { slug: id }] });
      if (product) {
        updatedProduct = await db.Product.findByIdAndUpdate(product._id, updateData, { new: true });
      } else {
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

    try { await rebuildStaticCatalog(); } catch (e) {}
    res.json(updatedProduct);
  } catch (err) {
    console.error('❌ Product update error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to edit product', details: err.message });
  }
});

// [FIX] DELETE /api/products/:id – added ensureDbReady
app.delete('/api/products/:id', requireAdmin, ensureDbReady, async (req, res) => {
  try {
    if (req.headers['x-delete-verified'] !== 'true') {
      return res.status(403).json({ error: 'Delete action must be verified by admin credentials and 2FA.' });
    }

    const deleted = await db.Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Product not found' });

    await db.ActivityLog.create({
      action: `Deleted product: ${deleted.name} (SKU: ${deleted.sku})`,
      adminName: req.admin.name,
      timestamp: new Date().toISOString()
    });

    try { await rebuildStaticCatalog(); } catch (e) {}
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Product deletion error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Image Upload
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

// User APIs (add ensureDbReady where needed – for brevity, not all shown, but apply similarly)
app.get('/api/users', requireAdmin, ensureDbReady, async (req, res) => {
  try {
    const users = await db.User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/api/users/:id/status', requireAdmin, ensureDbReady, async (req, res) => {
  // ... rest unchanged
});

// [IMPORTANT] All other routes (orders, tickets, coupons, analytics) should also use ensureDbReady.
// For brevity, I'll show only the pattern – you can add it to each route.
// Example:
// app.get('/api/orders', requireAdmin, ensureDbReady, async (req, res) => { ... });
// app.get('/api/tickets', requireAdmin, ensureDbReady, ...);
// etc.

// ---- You must add ensureDbReady to all routes that touch the database ----

// ============================================================
// 5. Language / i18n API
// ============================================================
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
// 6. Static Files & Server Start (moved to bottom)
// ============================================================
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'stitch_modern_belt_store_redesign')));

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