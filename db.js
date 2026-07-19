const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel ? path.join('/tmp', 'scratch', 'data') : path.join(__dirname, 'scratch', 'data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create DATA_DIR:', err.message);
  }
}

let isConnected = false;
module.exports.isConnected = () => isConnected;

let isMongo = false;
let db = {
  isMongo: false,
  Admin: null,
  Product: null,
  Category: null,
  ActivityLog: null,
  Order: null,
  User: null,
  SupportTicket: null,
  Coupon: null,
  SeedHistory: null,
  init: null,
  ready: false
};

// --- JSONModel class (unchanged) ---
class JSONModel {
  // ... (keep exactly as you have, no changes)
}

// --- Mongoose Schemas ---
const AdminSchema = new mongoose.Schema({
  name: { type: String, default: 'System Administrator' },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: '' },
  loginHistory: [{ timestamp: String, ip: String, status: String }]
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  shortDescription: { type: String, default: '' },
  category: { type: String, required: true },
  subcategory: { type: String, default: '' },
  brand: { type: String, default: '' },
  sku: { type: String, required: true, unique: true },
  price: { type: Number, default: 0 },
  discountPrice: { type: Number, default: 0 },
  images: [{ type: String }],
  specifications: { type: Map, of: String },
  tags: [{ type: String }],
  stock: { type: Number, default: 0 },
  status: { type: String, default: 'Active' },
  slug: { type: String, required: true }
}, { timestamps: true });

// ... other schemas (Category, ActivityLog, Order, User, SupportTicket, Coupon) – keep them unchanged
// Make sure you have SeedHistorySchema defined:

const SeedHistorySchema = new mongoose.Schema({
  seeded: { type: Boolean, default: true },
  timestamp: { type: Date, default: Date.now }
});

// ===== db.init =====
db.init = async function (mongoUri, defaultEmail, defaultPassword) {
  let isConnected = false;

  if (mongoUri) {
    try {
      console.log('Attempting MongoDB connection...');
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
      console.log('✅ Connected to MongoDB.');
      isConnected = true;
      isMongo = true;
      db.isMongo = true;

      // Register all models
      db.Admin = mongoose.model('Admin', AdminSchema);
      db.Product = mongoose.model('Product', ProductSchema);
      db.Category = mongoose.model('Category', CategorySchema);
      db.ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);
      db.Order = mongoose.model('Order', OrderSchema);
      db.User = mongoose.model('User', UserSchema);
      db.SupportTicket = mongoose.model('SupportTicket', SupportTicketSchema);
      db.Coupon = mongoose.model('Coupon', CouponSchema);
      db.SeedHistory = mongoose.model('SeedHistory', SeedHistorySchema);
    } catch (e) {
      console.warn('MongoDB connection failed. Falling back to local JSON database.', e.message);
    }
  }

  if (!isConnected) {
    console.log('Initializing file-based JSON Database...');
    db.isMongo = false;
    isMongo = false;

    db.Admin = new JSONModel('admin.json');
    db.Product = new JSONModel('products.json');
    db.Category = new JSONModel('categories.json');
    db.ActivityLog = new JSONModel('logs.json');
    db.Order = new JSONModel('orders.json');
    db.User = new JSONModel('users.json');
    db.SupportTicket = new JSONModel('tickets.json');
    db.Coupon = new JSONModel('coupons.json');
    db.SeedHistory = new JSONModel('seedHistory.json', []);
  }

  // --- Seeding (Admin, Categories, Users, Tickets, Coupons) ---
  // (keep your existing seeding code, but REMOVE product seeding from here)

  // 1. Seed Admin
  const adminCount = await db.Admin.countDocuments();
  if (adminCount === 0) {
    console.log('Seeding initial admin account...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);
    await db.Admin.create({
      name: 'System Administrator',
      email: defaultEmail,
      password: passwordHash,
      profilePicture: '',
      loginHistory: []
    });
  }

  // 2. Seed Categories (your existing code)
  // 3. Seed Users
  // 4. Seed Support Tickets
  // 5. Seed Coupons

  // (do NOT seed products here – index.js handles that)

  db.ready = true;
  console.log('✅ Database is fully initialized and ready.');
};

module.exports = db;