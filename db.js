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

// --- Local JSON File Database Fallback Implementation ---
class JSONModel {
  constructor(filename, defaultData = []) {
    this.filePath = path.join(DATA_DIR, filename);
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.error(`Failed to create directory for ${filename}:`, err.message);
      }
    }
    if (!fs.existsSync(this.filePath)) {
      const originalPath = path.join(__dirname, 'scratch', 'data', filename);
      if (isVercel && fs.existsSync(originalPath)) {
        try {
          fs.copyFileSync(originalPath, this.filePath);
          console.log(`Copied seed file ${filename} to /tmp`);
        } catch (copyErr) {
          console.error(`Failed to copy seed file ${filename} to /tmp:`, copyErr.message);
          try {
            fs.writeFileSync(this.filePath, JSON.stringify(defaultData, null, 2));
          } catch (writeErr) {
            console.error(`Failed to write default data for ${filename}:`, writeErr.message);
          }
        }
      } else {
        try {
          fs.writeFileSync(this.filePath, JSON.stringify(defaultData, null, 2));
        } catch (writeErr) {
          console.error(`Failed to write default data for ${filename}:`, writeErr.message);
        }
      }
    }
  }

  _read() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        console.warn(`Data in ${this.filePath} is not an array. Returning empty array.`);
        return [];
      }
      return parsed;
    } catch (e) {
      console.error(`Error reading ${this.filePath}:`, e.message);
      return [];
    }
  }

  _write(data) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error(`Error writing ${this.filePath}:`, e);
    }
  }

  _generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  async find(query = {}) {
    let items = this._read();
    return items.filter(item => {
      for (let key in query) {
        if (query[key] !== undefined && item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });
  }

  async findOne(query = {}) {
    const items = await this.find(query);
    return items[0] || null;
  }

  async findById(id) {
    return this.findOne({ _id: id });
  }

  async create(data) {
    const items = this._read();
    const newItem = {
      _id: this._generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };
    items.push(newItem);
    this._write(items);
    return newItem;
  }

  async findByIdAndUpdate(id, updateData, options = {}) {
    const items = this._read();
    const idx = items.findIndex(item => item._id === id);
    if (idx === -1) return null;

    let current = items[idx];
    if (updateData.$push) {
      for (let key in updateData.$push) {
        if (!Array.isArray(current[key])) current[key] = [];
        current[key].push(updateData.$push[key]);
      }
      delete updateData.$push;
    }

    current = {
      ...current,
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    items[idx] = current;
    this._write(items);
    return current;
  }

  async findByIdAndDelete(id) {
    const items = this._read();
    const idx = items.findIndex(item => item._id === id);
    if (idx === -1) return null;
    const removed = items.splice(idx, 1)[0];
    this._write(items);
    return removed;
  }

  async deleteMany(query = {}) {
    let items = this._read();
    const kept = items.filter(item => {
      if (query.sku && query.sku.$nin) {
        return query.sku.$nin.includes(item.sku);
      }
      for (let key in query) {
        if (item[key] !== query[key]) return true;
      }
      return false;
    });
    this._write(kept);
    return { deletedCount: items.length - kept.length };
  }

  async countDocuments(query = {}) {
    const items = await this.find(query);
    return items.length;
  }
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

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  status: { type: String, default: 'Active' }
}, { timestamps: true });

const ActivityLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  adminName: { type: String, default: 'Admin' },
  timestamp: { type: String, required: true }
});

const OrderSchema = new mongoose.Schema({
  client: {
    name: String,
    company: String,
    email: String,
    phone: String,
    message: String
  },
  items: [{
    id: String,
    name: String,
    ref: String,
    quantity: Number,
    image: String
  }],
  status: { type: String, default: 'Pending' },
  totalPrice: { type: Number, default: 0 }
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: { type: String, default: 'Active' }
}, { timestamps: true });

const SupportTicketSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  company: { type: String, default: '' },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, default: 'Open' },
  emailSentAt: { type: String, default: '' },
  whatsappSentAt: { type: String, default: '' },
  lastResponseAt: { type: String, default: '' },
  replies: [{
    sender: String,
    message: String,
    products: [{ name: String, url: String }],
    timestamp: String
  }]
}, { timestamps: true });

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discountType: { type: String, required: true },
  discountValue: { type: Number, required: true },
  status: { type: String, default: 'Active' },
  usageLimit: { type: Number, default: null },
  usedCount: { type: Number, default: 0 }
}, { timestamps: true });

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

  // 2. Seed Categories
  const categoryCount = await db.Category.countDocuments();
  if (categoryCount === 0) {
    console.log('Seeding default categories...');
    const defaultCategories = [
      { name: 'Belts Power Transmission', description: 'V Belts, Timing Belts, and Ribbed Belts', image: '', status: 'Active' },
      { name: 'Pulleys', description: 'Precision grooved pulleys', image: '', status: 'Active' },
      { name: 'Conveying Accessorise', description: 'Modular handling accessories and rollers', image: '', status: 'Active' },
      { name: 'Rubber', description: 'Industrial rubber sheetings and components', image: '', status: 'Active' },
      { name: 'Industrial Insulation', description: 'Gaskets, felts, and gland packings', image: '', status: 'Active' },
      { name: 'Bearings', description: 'Ball and roller bearing systems', image: '', status: 'Active' },
      { name: 'Transmission Chains And Sprockets', description: 'ANSI/DIN chains and sprockets', image: '', status: 'Active' }
    ];
    for (const cat of defaultCategories) {
      await db.Category.create(cat);
    }
  }

  // 3. Seed Users
  const userCount = await db.User.countDocuments();
  if (userCount === 0) {
    console.log('Seeding initial users...');
    const salt = await bcrypt.genSalt(10);
    const userPass = await bcrypt.hash('password123', salt);
    await db.User.create({ name: 'John Doe', email: 'john@example.com', password: userPass, status: 'Active' });
    await db.User.create({ name: 'Jane Smith', email: 'jane@example.com', password: userPass, status: 'Active' });
    await db.User.create({ name: 'Blocked Bob', email: 'bob@example.com', password: userPass, status: 'Blocked' });
  }

  // 4. Seed Support Tickets
  const ticketCount = await db.SupportTicket.countDocuments();
  if (ticketCount === 0) {
    console.log('Seeding initial support tickets...');
    await db.SupportTicket.create({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+966500000001',
      company: 'Industrial Co',
      subject: 'quote',
      message: 'Need pricing for bulk order of Optibelt KB SK wedge belts.',
      status: 'Open',
      replies: []
    });
    await db.SupportTicket.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+966500000002',
      company: 'AgriCorp',
      subject: 'technical',
      message: 'Can you provide the maximum temperature range for the Chevron Conveyor Belts?',
      status: 'Resolved',
      replies: [
        { sender: 'Admin', message: 'Hello Jane, Kauman Chevron Belts generally withstand up to 90 degrees Celsius.', timestamp: new Date().toISOString() },
        { sender: 'Jane Smith', message: 'Thank you, that is exactly what I needed!', timestamp: new Date().toISOString() }
      ]
    });
  }

  // 5. Seed Coupons
  const couponCount = await db.Coupon.countDocuments();
  if (couponCount === 0) {
    console.log('Seeding initial coupons...');
    await db.Coupon.create({ code: 'WELCOME10', discountType: 'percentage', discountValue: 10, status: 'Active', usageLimit: 100, usedCount: 15 });
    await db.Coupon.create({ code: 'HEAVY50', discountType: 'flat', discountValue: 50, status: 'Active', usageLimit: 10, usedCount: 2 });
  }

  // (do NOT seed products here – index.js handles that)

  db.ready = true;
  console.log('✅ Database is fully initialized and ready.');
};

module.exports = db;
