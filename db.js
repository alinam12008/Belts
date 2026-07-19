db.init = async function (mongoUri, defaultEmail, defaultPassword) {
  let isConnected = false;

  if (mongoUri) {
    try {
      console.log('Attempting MongoDB connection...');
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000
      });
      console.log('Successfully connected to MongoDB.');
      isConnected = true;
      isMongo = true;
      db.isMongo = true;

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
    // 🔥 ADD THIS LINE – SeedHistory for fallback
    db.SeedHistory = new JSONModel('seedHistory.json', []);
  }

  // --- Seeding Data ---

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

  // ✅ Remove duplicate SeedHistory assignment
  db.ready = true;
  console.log('✅ Database is fully initialized and ready.');
};