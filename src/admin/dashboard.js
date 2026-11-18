import { requireAdmin } from '../lib/guard.js';
import {
  getAllCategories,
  upsertCategory,
  deleteCategory,
  logout,
} from '../lib/dataService.js';
import { importCategory, downloadExcelTemplate } from '../lib/portability.js';
import { validateCategory } from '../lib/validators.js';
import { escapeHtml } from '../lib/ui.js';
import { showToast, confirmModal, styles } from '../lib/components.js';

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
    adminEmailEl.textContent = user.email || 'Admin Guru';
  }

  // Tombol Logout
  logoutBtn?.addEventListener('click', async () => {
    logoutBtn.disabled = true;
    await logout();
    window.location.href = '/admin/login.html';
  });

  // Muat daftar kategori
  async function loadCategories() {
    loadingStateEl?.classList.remove('hidden');
    emptyStateEl?.classList.add('hidden');
    if (categoriesListEl) categoriesListEl.innerHTML = '';

    const res = await getAllCategories();

    loadingStateEl?.classList.add('hidden');

    if (res.error) {
      showToast(res.error, 'error');
      if (categoriesListEl) {
        categoriesListEl.innerHTML = `<div class="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">Error: ${escapeHtml(
          res.error
        )}</div>`;
      }
      return;
    }

    currentCategories = res.data || [];

    if (currentCategories.length === 0) {
      emptyStateEl?.classList.remove('hidden');
      return;
    }

    renderCategories(currentCategories);
  }

  // Render daftar paket
  function renderCategories(categories) {
    if (!categoriesListEl) return;
    categoriesListEl.innerHTML = '';

    categories.forEach((cat) => {
      const card = document.createElement('div');
      card.className = `${styles.card} hover:border-blue-500/40 transition-colors flex flex-col justify-between`;

      const statusBadge = cat.is_published
        ? `<span class="${styles.badgeGreen}">Published</span>`
        : `<span class="${styles.badgeSlate}">Draft</span>`;

      const questionCount =
        cat.questions_count !== undefined
          ? cat.questions_count
          : Array.isArray(cat.questions)
          ? cat.questions.length
          : 0;

      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="flex items-center space-x-2">
              ${statusBadge}
              <span class="text-xs text-slate-400 font-medium">${questionCount} Soal</span>
            </div>
            <a href="/admin/editor.html?category=${encodeURIComponent(
              cat.id
            )}" class="inline-flex items-center text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">
              Buka Editor Soal &rarr;
            </a>
          </div>

          <h3 class="text-base font-bold text-white mb-1 leading-snug">${escapeHtml(
            cat.title
          )}</h3>
          <p class="text-xs text-slate-300 leading-relaxed mb-4 line-clamp-2">${escapeHtml(
            cat.description || '(Belum ada deskripsi materi)'
          )}</p>
        </div>

        <div class="pt-3 border-t border-[#1e2f5c] flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center space-x-2">
            <button type="button" class="btn-toggle text-xs font-medium px-2.5 py-1 rounded border ${
              cat.is_published
                ? 'border-amber-500/40 text-amber-300 hover:bg-amber-950/40'
                : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40'
            } transition-colors" data-id="${cat.id}">
              ${cat.is_published ? 'Jadikan Draft' : 'Publikasikan'}
            </button>
            <button type="button" class="btn-edit text-xs font-medium px-2.5 py-1 rounded border border-[#1e2f5c] bg-[#132247] text-slate-200 hover:bg-[#1e2f5c] transition-colors" data-id="${
              cat.id
            }">
              Ubah Data
            </button>
          </div>
          <button type="button" class="btn-delete text-xs font-medium px-2.5 py-1 rounded border border-rose-900/50 bg-rose-950/30 text-rose-400 hover:bg-rose-950/60 transition-colors" data-id="${
            cat.id
          }">
            Hapus
          </button>
        </div>
      `;

      // Event listener tombol aksi
      card.querySelector('.btn-toggle')?.addEventListener('click', () => togglePublish(cat));
      card.querySelector('.btn-edit')?.addEventListener('click', () => startEdit(cat));
      card.querySelector('.btn-delete')?.addEventListener('click', () => confirmDelete(cat));

      categoriesListEl.appendChild(card);
    });
  }

  // Aksi: Impor paket Excel (.xlsx) atau JSON
  const importFileInput = document.getElementById('import-file-input');
  const btnDoImport = document.getElementById('btn-do-import');
  const btnDownloadTemplate = document.getElementById('btn-download-template');
  const importStatusEl = document.getElementById('import-status');

  btnDownloadTemplate?.addEventListener('click', () => {
    try {
      downloadExcelTemplate();
      showToast('Template Excel berhasil diunduh.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengunduh template Excel.', 'error');
    }
  });

  btnDoImport?.addEventListener('click', async () => {
    const file = importFileInput?.files?.[0];
    if (!file) {
      showToast('Pilih berkas Excel (.xlsx) terlebih dahulu.', 'warning');
      return;
    }

    btnDoImport.disabled = true;
    if (importStatusEl) {
      importStatusEl.textContent = 'Membaca dan memvalidasi berkas...';
      importStatusEl.className = 'text-xs text-blue-400 font-medium';
    }

    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.type.includes('sheet');

    reader.onload = async (e) => {
      try {
        const fileData = e.target.result;
        if (importStatusEl) importStatusEl.textContent = 'Menyimpan paket ke database...';
        const res = await importCategory(fileData);

        btnDoImport.disabled = false;

        if (res.error) {
          if (importStatusEl) {
            importStatusEl.textContent = 'Gagal impor: ' + res.error;
            importStatusEl.className = 'text-xs text-rose-400 font-medium';
          }
          showToast(res.error, 'error');
        } else {
          if (importStatusEl) {
            importStatusEl.textContent = 'Berhasil diimpor!';
            importStatusEl.className = 'text-xs text-emerald-400 font-medium';
          }
          showToast(
            `Paket "${res.data.category.title}" berhasil diimpor sebagai draft (${res.data.totalQuestions} soal).`,
            'success'
          );
          if (importFileInput) importFileInput.value = '';
          await loadCategories();
        }
      } catch (err) {
        btnDoImport.disabled = false;
        if (importStatusEl) {
          importStatusEl.textContent = 'Format berkas rusak atau tidak valid.';
          importStatusEl.className = 'text-xs text-rose-400 font-medium';
        }
        showToast('Terjadi kesalahan saat memproses berkas impor.', 'error');
      }
    };

    reader.onerror = () => {
      btnDoImport.disabled = false;
      if (importStatusEl) {
        importStatusEl.textContent = 'Gagal membaca berkas file.';
        importStatusEl.className = 'text-xs text-rose-400 font-medium';
      }
      showToast('Gagal membaca berkas file.', 'error');
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });

  // Aksi: Buat paket baru
  createForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('create-title').value;
    const description = document.getElementById('create-desc').value;
    const is_published = document.getElementById('create-published').checked;

    const validation = validateCategory({ title, description });
    if (!validation.ok) {
      showToast(validation.errors.join(' | '), 'warning');
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
      showToast(res.error, 'error');
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

    editSection.classList.remove('hidden');
    editTitleInput.focus();
    editSection.scrollIntoView({ behavior: 'smooth' });
  }

  // Batal edit
  editCancelBtn?.addEventListener('click', () => {
    editForm.reset();
    editSection.classList.add('hidden');
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
      showToast(validation.errors.join(' | '), 'warning');
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
      showToast(res.error, 'error');
    } else {
      showToast('Perubahan kategori berhasil disimpan.', 'success');
      editForm.reset();
      editSection.classList.add('hidden');
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
      showToast(res.error, 'error');
    } else {
      showToast(
        `Status paket diubah menjadi ${nextStatus ? 'Published' : 'Draft'}.`,
        'info'
      );
      await loadCategories();
    }
  }

  // Aksi: Hapus kategori dengan konfirmasi modal yang ramah
  async function confirmDelete(cat) {
    const confirmed = await confirmModal(
      `Apakah Anda yakin ingin menghapus paket materi "${cat.title}" beserta seluruh soal di dalamnya? Tindakan ini tidak dapat dibatalkan.`,
      {
        title: 'Hapus Paket Materi BK',
        confirmText: 'Hapus Permanen',
        isDanger: true,
      }
    );
    if (!confirmed) return;

    const res = await deleteCategory(cat.id);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast('Paket kategori berhasil dihapus.', 'info');
      await loadCategories();
    }
  }

  // Load awal
  loadCategories();
}
