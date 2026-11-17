import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCategory } from '../src/lib/validators.js';

test('1. Judul kosong: mengembalikan ok: false dengan pesan error yang tepat', () => {
  const result = validateCategory({ title: '', description: 'Deskripsi valid' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('Judul kategori tidak boleh kosong.'));
});

test('2. Judul spasi saja: mengembalikan ok: false setelah di-trim', () => {
  const result = validateCategory({ title: '     ', description: '' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('Judul kategori tidak boleh kosong.'));
});

test('3. Terlalu panjang: judul > 100 karakter atau deskripsi > 300 karakter', () => {
  const longTitle = 'a'.repeat(101);
  const resultTitle = validateCategory({ title: longTitle, description: 'Deskripsi singkat' });
  assert.equal(resultTitle.ok, false);
  assert.ok(resultTitle.errors.includes('Judul kategori maksimal 100 karakter.'));

  const longDesc = 'b'.repeat(301);
  const resultDesc = validateCategory({ title: 'Judul Normal', description: longDesc });
  assert.equal(resultDesc.ok, false);
  assert.ok(resultDesc.errors.includes('Deskripsi kategori maksimal 300 karakter.'));
});

test('4. Data valid: judul dan deskripsi sesuai batas', () => {
  const result = validateCategory({
    title: 'Manajemen Emosi dan Resolusi Konflik',
    description: 'Panduan bimbingan konseling untuk siswa dalam mengelola emosi di sekolah.',
  });
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test('5. Deskripsi kosong boleh: judul valid tanpa deskripsi tetap ok: true', () => {
  const resultEmptyString = validateCategory({ title: 'Karakter Positif', description: '' });
  assert.equal(resultEmptyString.ok, true);
  assert.equal(resultEmptyString.errors.length, 0);

  const resultOmitted = validateCategory({ title: 'Pengembangan Diri' });
  assert.equal(resultOmitted.ok, true);
  assert.equal(resultOmitted.errors.length, 0);
});
