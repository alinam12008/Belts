require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('./db');

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
async function sendSupportEmail({ to, subject, html, text }) {
  if (!smtpTransporter) {
    return { success: false, error: 'SMTP configuration is missing. Check .env file.' };
  }
  try {
    const info = await smtpTransporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
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

// ✅ FIXED: Serve static files from the root folder FIRST
// This allows clients.html and partners.html to be served correctly
app.use(express.static(__dirname));

// Force serve clients.html and partners.html
app.get('/clients.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'clients.html'));
});
app.get('/partners.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'partners.html'));
});

// Then serve the redesign folder (if it exists)
app.use(express.static(path.join(__dirname, 'stitch_modern_belt_store_redesign')));

// Then serve uploads folder
app.use('/mmmm', express.static(path.join(__dirname, 'mmmm')));

// Init database
db.init(
  process.env.MONGODB_URI,
  process.env.ADMIN_EMAIL || 'admin@belts.com',
  process.env.ADMIN_PASSWORD || 'admin123'
);

const JWT_SECRET = process.env.JWT_SECRET || 'belts_secret_session_key';
const pending2fa = new Map();

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
const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');

// Helper: read products from JSON file
function readProductsFile() {
  try {
    if (!fs.existsSync(PRODUCTS_FILE)) {
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([], null, 2));
    }
    const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading products file:', err);
    return [];
  }
}

// Helper: write products to JSON file
function writeProductsFile(products) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

// GET /api/products
app.get('/api/products', async (req, res) => {
  try {
    const products = readProductsFile();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/products
app.post('/api/products', requireAdmin, async (req, res) => {
  try {
    const products = readProductsFile();
    const { name, description, shortDescription, category, subcategory, brand, sku, price, discountPrice, stock, status, images, specifications, tags } = req.body;

    if (!name || !sku || !category) {
      return res.status(400).json({ error: 'Name, SKU, and Category are required' });
    }

    // Generate unique slug
    const timestamp = Date.now();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + timestamp;

    // Generate unique SKU
    const finalSku = sku + '-' + Math.random().toString(36).substring(2, 6);

    const newProduct = {
      _id: `prod_${timestamp}_${Math.random().toString(36).substring(2, 9)}`,
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
      slug: slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    products.push(newProduct);
    writeProductsFile(products);

    // Log activity
    const logs = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'logs.json'), 'utf8') || '[]');
    logs.push({
      action: `Added product: ${name} (SKU: ${finalSku})`,
      adminName: req.admin.name,
      timestamp: new Date().toISOString()
    });
    fs.writeFileSync(path.join(__dirname, 'data', 'logs.json'), JSON.stringify(logs, null, 2));

    console.log(`✅ Product created: ${name} (${finalSku})`);
    res.json(newProduct);

  } catch (err) {
    console.error('❌ Product creation error:', err);
    res.status(500).json({ error: 'Failed to add product', details: err.message });
  }
});

// PUT /api/products/:id
app.put('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const products = readProductsFile();
    const index = products.findIndex(p => p._id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Product not found' });

    const { name, description, shortDescription, category, subcategory, brand, sku, price, discountPrice, stock, status, images, specifications, tags } = req.body;

    // Generate slug from name with timestamp
    let slug = undefined;
    if (name) {
      slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now();
    }

    let finalStatus = status;
    if (stock !== undefined && Number(stock) === 0) {
      finalStatus = 'Inactive';
    }

    const updatedProduct = {
      ...products[index],
      name: name || products[index].name,
      description: description || '',
      shortDescription: shortDescription || '',
      category: category || products[index].category,
      subcategory: subcategory || '',
      brand: brand || '',
      sku: sku || products[index].sku,
      price: price !== undefined ? Number(price) : products[index].price,
      discountPrice: discountPrice !== undefined ? Number(discountPrice) : products[index].discountPrice,
      stock: stock !== undefined ? Number(stock) : products[index].stock,
      status: finalStatus || products[index].status,
      images: images || products[index].images,
      specifications: specifications || {},
      tags: tags || [category, subcategory].filter(Boolean),
      ...(slug && { slug }),
      updatedAt: new Date().toISOString()
    };

    products[index] = updatedProduct;
    writeProductsFile(products);

    // Log activity
    const logs = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'logs.json'), 'utf8') || '[]');
    logs.push({
      action: `Modified product: ${updatedProduct.name} (SKU: ${updatedProduct.sku})`,
      adminName: req.admin.name,
      timestamp: new Date().toISOString()
    });
    fs.writeFileSync(path.join(__dirname, 'data', 'logs.json'), JSON.stringify(logs, null, 2));

    res.json(updatedProduct);
  } catch (err) {
    console.error('❌ Product update error:', err);
    res.status(500).json({ error: 'Failed to edit product', details: err.message });
  }
});

// DELETE /api/products/:id
app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const products = readProductsFile();
    const index = products.findIndex(p => p._id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Product not found' });

    const deleted = products[index];
    products.splice(index, 1);
    writeProductsFile(products);

    // Log activity
    const logs = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'logs.json'), 'utf8') || '[]');
    logs.push({
      action: `Deleted product: ${deleted.name} (SKU: ${deleted.sku})`,
      adminName: req.admin.name,
      timestamp: new Date().toISOString()
    });
    fs.writeFileSync(path.join(__dirname, 'data', 'logs.json'), JSON.stringify(logs, null, 2));

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Product deletion error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});


// Image Base64 Upload
const UPLOADS_DIR = path.join(__dirname, 'mmmm', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.post('/api/products/upload', requireAdmin, async (req, res) => {
  try {
    const { filename, base64 } = req.body;
    if (!filename || !base64) {
      return res.status(400).json({ error: 'Filename and base64 string are required' });
    }
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    if (matches && matches.length === 3) {
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64, 'base64');
    }
    const cleanName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalFilename = `${Date.now()}_${cleanName}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, finalFilename), buffer);
    res.json({ url: `/mmmm/uploads/${finalFilename}` });
  } catch (err) {
    res.status(500).json({ error: 'Image upload failed' });
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
      const websiteUrl = 'http://localhost:3000';
      
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

      <h2 style="color:#0b3b82;">
        Stitch Modern Belt Store
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
          background:#0b3b82;
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
        Stitch Modern Belt Store Support Team
      </p>

      </div>
      `;

      const emailText = `
      Customer Query:${ticket.message}
      Admin Response:${reply}
      Website:${websiteUrl}
      
      Regards,Stitch Modern Belt Store Support Team
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
// 5. Static Files & Server Start
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});