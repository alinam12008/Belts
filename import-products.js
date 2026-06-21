
const axios = require('axios');
const fs = require('fs');

// Read and deduplicate
const rawProducts = JSON.parse(fs.readFileSync('products-scraped.json', 'utf8'));
const seen = new Set();
const products = rawProducts.filter(p => {
  if (seen.has(p.name)) return false;
  seen.add(p.name);
  return true;
});
console.log(`📊 Raw: ${rawProducts.length}, Unique: ${products.length}`);

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InNvMnl0cGUzNjRod3Jteno5dXByNCIsIm5hbWUiOiJTeXN0ZW0gQWRtaW5pc3RyYXRvciIsImVtYWlsIjoiYWRtaW5AZ21haWwuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzgyMDM4NTA3LCJleHAiOjE3ODIxMjQ5MDd9.D7cNUq9OiEDrkXnvAFSXSzd9528Lfwf2e2wNEJ38GQE";


async function importProducts() {
  console.log(`📦 Starting import of ${products.length} unique products...`);
  let success = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    try {
      const payload = {
        name: prod.name || "Unnamed Product",
        sku: prod.sku || `SKU-${Date.now()}-${i}`,
        category: prod.category || "Uncategorized",
        subcategory: prod.subcategory || "",
        price: prod.price || 0.01,
        stock: prod.stock || 10,
        status: prod.status || "Active",
        images: prod.image ? [prod.image] : [],
        shortDescription: prod.shortDescription || "",
        description: prod.description || "",
        specifications: prod.specifications || {}
      };

      await axios.post('http://localhost:3000/api/products', payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`✅ (${i+1}/${products.length}) ${payload.name}`);
      success++;
    } catch (err) {
      // 🔴 Print full error details
      console.error(`❌ (${i+1}/${products.length}) ${prod.name}`);
      if (err.response) {
        console.error('   Status:', err.response.status);
        console.error('   Data:', JSON.stringify(err.response.data, null, 2));
      } else {
        console.error('   Error:', err.message);
      }
      failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  console.log(`\n🎉 Import complete: ${success} succeeded, ${failed} failed.`);
}

importProducts();