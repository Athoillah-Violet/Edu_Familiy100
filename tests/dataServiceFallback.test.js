import test from 'node:test';
import assert from 'node:assert/strict';
import { getCategories, getAllCategories, upsertCategory } from '../src/lib/dataService.js';
import { isDemoMode } from '../src/lib/neon.js';

test('1. Demo Mode: getAllCategories() mengembalikan error ramah, bukan data demo', async () => {
  // Dalam lingkungan node murni tanpa Vite (isDemoMode = true)
  if (isDemoMode) {
    const res = await getAllCategories();
    assert.equal(res.data, null);
    assert.equal(res.error, 'Mode demo: fitur ini butuh koneksi database');
  }
});

test('2. Demo Mode: fungsi tulis upsertCategory() mengembalikan error ramah', async () => {
  if (isDemoMode) {
    const res = await upsertCategory({ title: 'Paket Uji' });
    assert.equal(res.data, null);
    assert.equal(res.error, 'Mode demo: fitur ini butuh koneksi database');
  }
});

test('3. Demo Mode: getCategories() mengembalikan data demo', async () => {
  if (isDemoMode) {
    const res = await getCategories();
    assert.ok(Array.isArray(res.data));
    assert.equal(res.data.length, 1);
    assert.equal(res.data[0].id, 'demo-cat-bullying');
    assert.equal(res.error, null);
  }
});
