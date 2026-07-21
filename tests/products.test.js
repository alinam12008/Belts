// Smoke tests for the admin product CRUD flow and catalog integrity.
// Uses Node's built-in test runner (node --test) -- no new dependencies.
// Run against a live server: BASE_URL=http://localhost:3000 npm test
// Defaults to http://localhost:3000 if BASE_URL isn't set.

const test = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPass123!';

async function api(path, options = {}) {
  const res = await fetch(BASE_URL + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Connection: 'close', ...(options.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch (_) { /* non-JSON response */ }
  return { status: res.status, body };
}

async function loginAsAdmin() {
  const login = await api('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  assert.equal(login.status, 200, 'admin login should succeed');
  assert.ok(login.body.devCode, 'login should return a 2FA code to verify with');

  const verify = await api('/api/admin/verify-2fa', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, code: login.body.devCode }),
  });
  assert.equal(verify.status, 200, '2FA verification should succeed');
  assert.ok(verify.body.token, 'verify-2fa should return a JWT token');
  return verify.body.token;
}

test('database is ready and connected', async () => {
  const status = await api('/api/db-status');
  assert.equal(status.status, 200);
  assert.equal(status.body.ready, true, 'database should report ready');
});

test('admin can log in and reach a protected route', async () => {
  const token = await loginAsAdmin();
  const me = await api('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(me.status, 200);
  assert.equal(me.body.email, ADMIN_EMAIL);
});

test('full product lifecycle: create, appears in catalog, update, delete, gone', async () => {
  const token = await loginAsAdmin();
  const testSku = 'TEST-SMOKE-' + Date.now();

  // Create
  const create = await api('/api/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Smoke Test Product',
      sku: testSku,
      category: 'Rubber',
      price: 1,
      stock: 1,
    }),
  });
  assert.equal(create.status, 200, 'product creation should succeed');
  const createdId = create.body._id;
  assert.ok(createdId, 'created product should have an _id');

  // Appears in the full catalog listing
  const listAfterCreate = await api('/api/products');
  const foundAfterCreate = listAfterCreate.body.find((p) => p._id === createdId);
  assert.ok(foundAfterCreate, 'newly created product should appear in GET /api/products');

  // Update
  const update = await api(`/api/products/${createdId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Smoke Test Product Updated',
      sku: testSku,
      category: 'Rubber',
      price: 2,
      stock: 2,
    }),
  });
  assert.equal(update.status, 200, 'product update should succeed');
  assert.equal(update.body.name, 'Smoke Test Product Updated');

  // Delete
  const del = await api(`/api/products/${createdId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'x-delete-verified': 'true' },
  });
  assert.equal(del.status, 200, 'product deletion should succeed');

  // Confirmed gone
  const afterDelete = await api(`/api/products/${createdId}`);
  assert.equal(afterDelete.status, 404, 'deleted product should return 404');
});

test('catalog has no duplicate SKUs', async () => {
  const list = await api('/api/products');
  assert.equal(list.status, 200);
  const skuCounts = new Map();
  for (const p of list.body) {
    skuCounts.set(p.sku, (skuCounts.get(p.sku) || 0) + 1);
  }
  const duplicates = [...skuCounts.entries()].filter(([, count]) => count > 1);
  assert.deepEqual(duplicates, [], 'no SKU should appear more than once in the catalog');
});

test('public catalog feed returns valid, non-empty data', async () => {
  const res = await api('/products_data.json');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body), 'public catalog should be an array');
  assert.ok(res.body.length > 0, 'public catalog should not be empty');
  for (const item of res.body) {
    assert.ok(item.title, 'every catalog item should have a title');
    assert.ok(Array.isArray(item.breadcrumbs), 'every catalog item should have breadcrumbs');
  }
});
