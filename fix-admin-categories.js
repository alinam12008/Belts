// fix-admin-categories.js
const fs = require('fs');
const path = require('path');

const adminHtmlPath = path.join(__dirname, 'stitch_modern_belt_store_redesign', 'admin.html');
const productsPath = path.join(__dirname, 'data', 'products.json');

// 1. Your new category structure
const newCategoriesHierarchy = {
  "BELTS POWER TRANSMISSION": [
    "V Belts",
    "Round Belts",
    "Ribbed Belts",
    "Emergency and transport belts",
    "Timing Belts",
    "Special Belts",
    "Repair Kits and Tension Tools"
  ],
  "PULLEYS": [],
  "CONVEYING ACCESSORIES": [],
  "RUBBER": [],
  "INDUSTRIAL INSULATION": [],
  "BEARINGS": {
    "RADIAL BALL BEARINGS": [],
    "RADIAL ROLLER BEARINGS": [],
    "THRUST BALL BEARINGS": [],
    "BEARING UNITS AND PLUMMER BLOCK HOUSING": []
  },
  "TRANSMISSION CHAINS AND SPROCKETS": {
    "TRANSMISSION CHAIN": [],
    "SPROCKETS": [],
    "COUPLINGS": []
  }
};

// 2. Update admin.html
let adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');
const regex = /const categoriesHierarchy = \{[\s\S]*?\};/;
const newCategoriesStr = `const categoriesHierarchy = ${JSON.stringify(newCategoriesHierarchy, null, 2)};`;
if (regex.test(adminHtml)) {
  adminHtml = adminHtml.replace(regex, newCategoriesStr);
  fs.writeFileSync(adminHtmlPath, adminHtml);
  console.log('✅ Updated admin.html');
}

// 3. Update product categories in data/products.json
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const categoryMapping = {
  'V Belts': { category: 'Belts Power Transmission', subcategory: 'V Belts' },
  'Round Belts': { category: 'Belts Power Transmission', subcategory: 'Round Belts' },
  'Ribbed Belts': { category: 'Belts Power Transmission', subcategory: 'Ribbed Belts' },
  'Emergency and transport belts': { category: 'Belts Power Transmission', subcategory: 'Emergency and transport belts' },
  'Timing Belts': { category: 'Belts Power Transmission', subcategory: 'Timing Belts' },
  'Special Belts': { category: 'Belts Power Transmission', subcategory: 'Special Belts' },
  'Repair Kits and Tension Tools': { category: 'Belts Power Transmission', subcategory: 'Repair Kits and Tension Tools' },
  'Radial Ball Bearings': { category: 'Bearings', subcategory: 'Radial Ball Bearings' },
  'Radial Roller Bearings': { category: 'Bearings', subcategory: 'Radial Roller Bearings' },
  'Thrust Ball Bearings': { category: 'Bearings', subcategory: 'Thrust Ball Bearings' },
  'Bearing Units and Plummer Block Housing': { category: 'Bearings', subcategory: 'Bearing Units and Plummer Block Housing' },
  'Transmission chain': { category: 'Transmission Chains and Sprockets', subcategory: 'Transmission chain' },
  'Sprockets': { category: 'Transmission Chains and Sprockets', subcategory: 'Sprockets' },
  'Couplings': { category: 'Transmission Chains and Sprockets', subcategory: 'Couplings' },
};

let fixed = 0;
const updatedProducts = products.map(p => {
  if (categoryMapping[p.category]) {
    const mapped = categoryMapping[p.category];
    if (p.category !== mapped.category || p.subcategory !== mapped.subcategory) {
      fixed++;
      console.log(`🔄 ${p.name}: ${p.category} → ${mapped.category} / ${mapped.subcategory}`);
      return { ...p, category: mapped.category, subcategory: mapped.subcategory };
    }
  }
  if (p.category === 'Couplings') {
    fixed++;
    console.log(`🔄 ${p.name}: Couplings → Transmission Chains and Sprockets / Couplings`);
    return { ...p, category: 'Transmission Chains and Sprockets', subcategory: 'Couplings' };
  }
  return p;
});

fs.writeFileSync(productsPath, JSON.stringify(updatedProducts, null, 2));
console.log(`\n✅ Fixed ${fixed} product categories.`);
console.log('🎉 All done! Restart your server and refresh the admin panel.');