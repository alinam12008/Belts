// direct-import.js – writes scraped products directly to data/products.json
const fs = require('fs');
const path = require('path');

// Ensure the data folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('📁 Created data folder');
}

// Check if scraped file exists
const scrapedFile = path.join(__dirname, 'products-scraped.json');
if (!fs.existsSync(scrapedFile)) {
  console.error('❌ products-scraped.json not found. Run the scraper first.');
  process.exit(1);
}

// Read scraped products
const scraped = JSON.parse(fs.readFileSync(scrapedFile, 'utf8'));

// Deduplicate by name
const seen = new Set();
const unique = scraped.filter(p => {
  if (seen.has(p.name)) return false;
  seen.add(p.name);
  return true;
});

console.log(`📊 Unique products: ${unique.length}`);

// Transform to match the product schema
const products = unique.map((p, i) => ({
  _id: `prod_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
  name: p.name,
  description: '',
  shortDescription: '',
  category: p.category || 'Uncategorized',
  subcategory: p.subcategory || '',
  brand: '',
  sku: p.sku || `SKU-${Date.now()}-${i}`,
  price: 0,
  discountPrice: 0,
  stock: 10,
  status: 'Active',
  images: p.image ? [p.image] : [],
  specifications: {},
  tags: [p.category, p.subcategory].filter(Boolean),
  slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now() + '-' + i,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}));

// Write to data/products.json
const productsFile = path.join(dataDir, 'products.json');
fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));

console.log(`✅ ${products.length} products written to ${productsFile}`);