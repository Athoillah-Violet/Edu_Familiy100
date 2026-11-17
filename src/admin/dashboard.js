import { requireAdmin } from '../lib/guard.js';
import {
  getAllCategories,
  upsertCategory,
  deleteCategory,
  logout,
} from '../lib/dataService.js';
import { validateCategory } from '../lib/validators.js';
import { escapeHtml, showToast } from '../lib/ui.js';

// 1. Guard requireAdmin() paling awal
async function main() {
  const auth = await requireAdmin();

  // Jika di mode demo atau belum login, requireAdmin sudah menangani notice / redirect
  if (auth && auth.user) {
    initDashboard(auth.user);
  }
}

main();

function initDashboard(user) {
  const adminEmailEl = document.getElementById('admin-email');
  const logoutBtn = document.getElementById('logout-btn');
  const createForm = document.getElementById('create-category-form');
  const createSubmitBtn = document.getElementById('create-submit-btn');

  const editSection = document.getElementById('edit-section');
  const editForm = document.getElementById('edit-category-form');
  const editIdInput = document.getElementById('edit-id');
  const editTitleInput = document.getElementById('edit-title');
  const editDescInput = document.getElementById('edit-desc');
  const editPublishedInput = document.getElementById('edit-published');
  const editCancelBtn = document.getElementById('edit-cancel-btn');

  const loadingStateEl = document.getElementById('loading-state');
  const emptyStateEl = document.getElementById('empty-state');
  const categoriesListEl = document.getElementById('categories-list');

  let currentCategories = [];

  // Tampilkan email admin
  if (adminEmailEl) {
    adminEmailEl.textContent = user.email || 'Admin';
  }

  // Tombol Logout
  logoutBtn?.addEventListener('click', async () => {
    logoutBtn.disabled = true;
    await logout();
    window.location.href = '/admin/login.html';
  });

  // Muat daftar kategori
  async function loadCategories() {
    loadingStateEl.style.display = 'block';
    emptyStateEl.style.display = 'none';
    categoriesListEl.innerHTML = '';

    const res = await getAllCategories();

    loadingStateEl.style.display = 'none';

    if (res.error) {
      showToast(res.error, 'error');
      categoriesListEl.innerHTML = `<p style="color: red;">Error: ${escapeHtml(res.error)}</p>`;
      return;
    }

    currentCategories = res.data || [];

    if (currentCategories.length === 0) {
      emptyStateEl.style.display = 'block';
      return;
    }

    renderCategories(currentCategories);
  }

  // Render daftar paket
  function renderCategories(categories) {
    categoriesListEl.innerHTML = '';

    categories.forEach((cat) => {
      const card = document.createElement('div');
      card.style.cssText = 'border: 1px solid #ccc; padding: 12px; margin-bottom: 12px; border-radius: 4px;';

      const statusBadge = cat.is_published
        ? '<strong style="color: green;">[Published]</strong>'
        : '<strong style="color: orange;">[Draft]</strong>';

      const questionCount = cat.questions_count !== undefined ? cat.questions_count : 0;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <h3 style="margin: 0 0 8px 0;">${escapeHtml(cat.title)}</h3>
          <div>${statusBadge} &bull; <span>${questionCount} Soal</span></div>
        </div>
        <p style="margin: 4px 0 12px 0; color: #444;">${escapeHtml(cat.description || '(Tidak ada deskripsi)')}</p>
        <div>
          <button type="button" class="btn-toggle" data-id="${cat.id}">
            ${cat.is_published ? 'Ubah ke Draft' : 'Publikasikan'}
          </button>
          <button type="button" class="btn-edit" data-id="${cat.id}">Edit Judul/Deskripsi</button>
          <button type="button" class="btn-delete" data-id="${cat.id}">Hapus</button>
          | <a href="/admin/editor.html?category=${encodeURIComponent(cat.id)}">Kelola Soal (Editor) &rarr;</a>
        </div>
      `;

      // Event listener tombol aksi
      card.querySelector('.btn-toggle')?.addEventListener('click', () => togglePublish(cat));
      card.querySelector('.btn-edit')?.addEventListener('click', () => startEdit(cat));
      card.querySelector('.btn-delete')?.addEventListener('click', () => confirmDelete(cat));

      categoriesListEl.appendChild(card);
    });
  }

  // Aksi: Buat paket baru
  createForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('create-title').value;
    const description = document.getElementById('create-desc').value;
    const is_published = document.getElementById('create-published').checked;

    const validation = validateCategory({ title, description });
    if (!validation.ok) {
      alert(validation.errors.join('\n'));
      return;
    }

    createSubmitBtn.disabled = true;
    createSubmitBtn.textContent = 'Menyimpan...';

    const res = await upsertCategory({
      title,
      description,
      is_published,
    });

    createSubmitBtn.disabled = false;
    createSubmitBtn.textContent = 'Tambah Paket Baru';

    if (res.error) {
      alert(res.error);
    } else {
      showToast('Paket kategori berhasil dibuat.', 'success');
      createForm.reset();
      await loadCategories();
    }
  });

  // Aksi: Mulai edit
  function startEdit(cat) {
    editIdInput.value = cat.id;
    editTitleInput.value = cat.title;
    editDescInput.value = cat.description || '';
    editPublishedInput.checked = Boolean(cat.is_published);

    editSection.style.display = 'block';
    editTitleInput.focus();
    editSection.scrollIntoView({ behavior: 'smooth' });
  }

  // Batal edit
  editCancelBtn?.addEventListener('click', () => {
    editForm.reset();
    editSection.style.display = 'none';
  });

  // Simpan perubahan edit
  editForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editIdInput.value;
    const title = editTitleInput.value;
    const description = editDescInput.value;
    const is_published = editPublishedInput.checked;

    const validation = validateCategory({ title, description });
    if (!validation.ok) {
      alert(validation.errors.join('\n'));
      return;
    }

    const saveBtn = document.getElementById('edit-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Menyimpan...';

    const res = await upsertCategory({
      id,
      title,
      description,
      is_published,
    });

    saveBtn.disabled = false;
    saveBtn.textContent = 'Simpan Perubahan';

    if (res.error) {
      alert(res.error);
    } else {
      showToast('Perubahan kategori berhasil disimpan.', 'success');
      editForm.reset();
      editSection.style.display = 'none';
      await loadCategories();
    }
  });

  // Aksi: Toggle status publish
  async function togglePublish(cat) {
    const nextStatus = !cat.is_published;
    const res = await upsertCategory({
      id: cat.id,
      title: cat.title,
      description: cat.description,
      is_published: nextStatus,
    });

    if (res.error) {
      alert(res.error);
    } else {
      showToast(`Status paket diubah menjadi ${nextStatus ? 'Published' : 'Draft'}.`, 'info');
      await loadCategories();
    }
  }

  // Aksi: Hapus kategori dengan konfirmasi
  async function confirmDelete(cat) {
    const isConfirmed = window.confirm(`Apakah Anda yakin ingin menghapus paket "${cat.title}"?`);
    if (!isConfirmed) return;

    const res = await deleteCategory(cat.id);
    if (res.error) {
      alert(res.error);
    } else {
      showToast('Paket kategori berhasil dihapus.', 'info');
      await loadCategories();
    }
  }

  // Load awal
  loadCategories();
}
