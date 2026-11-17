import { getRanking, getWinners, getRoundSummaries } from './lib/gameEngine.js';
import { loadGame } from './lib/gameStore.js';
import { retryPendingSessions } from './lib/sessionReport.js';
import { renderNavbar, renderFooter, showToast, styles } from './lib/components.js';
import { escapeHtml } from './lib/ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar('#navbar-container', { active: 'result' });
  renderFooter('#footer-container');

  const state = loadGame();
  const noGameEl = document.getElementById('no-game-state');
  const resultContainer = document.getElementById('result-container');

  if (!state || (!state.roundSummaries?.length && state.phase !== 'FINAL_RESULT')) {
    noGameEl?.classList.remove('hidden');
    resultContainer?.classList.add('hidden');
    return;
  }

  noGameEl?.classList.add('hidden');
  resultContainer?.classList.remove('hidden');

  renderWinners(state);
  renderRankings(state);
  renderRoundSummaries(state);
  checkPendingSessions();
  setupActions(state);
});

function renderWinners(state) {
  const winnerCard = document.getElementById('winner-card');
  const winnerTitle = document.getElementById('winner-title');
  const winnerSubtitle = document.getElementById('winner-subtitle');
  if (!winnerCard || !winnerTitle || !winnerSubtitle) return;

  const winners = getWinners(state);
  if (winners.length === 0) {
    winnerTitle.textContent = 'Permainan Berakhir';
    winnerSubtitle.textContent = 'Tidak ada skor yang tercatat.';
    return;
  }

  if (winners.length > 1) {
    winnerTitle.textContent = `Juara Bersama: ${winners.map((w) => w.name).join(' & ')}`;
    winnerSubtitle.textContent = `Hasil imbang yang membanggakan dengan ${state.scores[winners[0].id] || 0} poin!`;
  } else {
    const winner = winners[0];
    winnerTitle.textContent = `Selamat kepada ${winner.name}!`;
    winnerSubtitle.textContent = `Pemenang utama dengan total perolehan ${state.scores[winner.id] || 0} poin.`;
  }
}

function renderRankings(state) {
  const container = document.getElementById('rankings-list');
  if (!container) return;

  const rankings = getRanking(state);
  container.innerHTML = rankings
    .map((item) => {
      const isTop = item.rank === 1;
      return `
      <div class="bg-white border rounded-xl p-4 flex items-center justify-between shadow-sm ${
        isTop ? 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/20' : 'border-slate-200'
      }">
        <div class="flex items-center space-x-3">
          <span class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            isTop ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-700'
          }">
            #${item.rank}
          </span>
          <div>
            <div class="flex items-center space-x-2">
              <span class="w-3 h-3 rounded-full" style="background-color: ${escapeHtml(item.team.color)};"></span>
              <span class="font-bold text-slate-900 text-sm sm:text-base">${escapeHtml(item.team.name)}</span>
            </div>
            <span class="text-xs text-slate-400">Peringkat ${item.rank}</span>
          </div>
        </div>
        <div class="text-right">
          <span class="text-xl sm:text-2xl font-extrabold text-slate-900">${item.score}</span>
          <span class="text-xs text-slate-400 font-semibold block">Poin</span>
        </div>
      </div>
    `;
    })
    .join('');
}

function renderRoundSummaries(state) {
  const container = document.getElementById('round-summaries-list');
  if (!container) return;

  const summaries = getRoundSummaries(state);
  if (!summaries || summaries.length === 0) {
    container.innerHTML = '<div class="text-xs text-slate-400 p-4 text-center">Belum ada ringkasan ronde.</div>';
    return;
  }

  container.innerHTML = summaries
    .map((sum, idx) => {
      const winner = state.config.teams.find((t) => t.id === sum.winnerTeamId);
      const prompts = Array.isArray(sum.discussion_prompts) ? sum.discussion_prompts : [];
      const promptsHtml =
        prompts.length > 0
          ? `<ul class="list-disc pl-4 space-y-1 mt-1 text-xs text-slate-600">${prompts
              .map((p) => `<li>${escapeHtml(p)}</li>`)
              .join('')}</ul>`
          : '<em class="text-xs text-slate-400">Tidak ada pertanyaan panduan.</em>';

      return `
      <details class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group mb-3">
        <summary class="p-4 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors list-none">
          <div class="flex items-center space-x-3 pr-2">
            <span class="w-6 h-6 rounded bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-100 shrink-0">
              ${idx + 1}
            </span>
            <div>
              <h4 class="font-bold text-sm text-slate-900 leading-snug">${escapeHtml(sum.question_text)}</h4>
              <span class="text-xs text-slate-500">Pemenang: <strong>${
                winner ? escapeHtml(winner.name) : 'Tidak ada'
              }</strong> (${sum.awardedPoints} Pts)</span>
            </div>
          </div>
          <span class="text-xs text-slate-400 group-open:rotate-180 transition-transform">&darr;</span>
        </summary>
        <div class="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3">
          ${
            sum.reflection_note
              ? `<div class="p-3 bg-indigo-50/50 border border-indigo-100/60 rounded-lg text-xs">
                  <span class="font-bold text-indigo-900 block mb-0.5">Catatan Refleksi:</span>
                  <p class="text-slate-700 leading-relaxed">${escapeHtml(sum.reflection_note)}</p>
                </div>`
              : ''
          }
          <div>
            <span class="text-xs font-bold text-slate-700">Pertanyaan Diskusi:</span>
            ${promptsHtml}
          </div>
        </div>
      </details>
    `;
    })
    .join('');
}

function checkPendingSessions() {
  const syncBanner = document.getElementById('sync-banner');
  const syncStatusText = document.getElementById('sync-status-text');
  const btnRetry = document.getElementById('btn-retry-sync');
  if (!syncBanner || !syncStatusText) return;

  try {
    const raw = localStorage.getItem('family100bk:pending_sessions');
    const queue = raw ? JSON.parse(raw) : [];

    if (Array.isArray(queue) && queue.length > 0) {
      syncBanner.classList.remove('hidden');
      syncStatusText.textContent = `Ada ${queue.length} laporan sesi tersimpan di perangkat yang menunggu pengiriman ke server.`;
      btnRetry?.addEventListener('click', async () => {
        btnRetry.disabled = true;
        btnRetry.textContent = 'Mengirim...';
        const res = await retryPendingSessions();
        btnRetry.disabled = false;
        btnRetry.textContent = 'Kirim Ulang';
        if (res.sent > 0) {
          showToast(`Berhasil mengirimkan ${res.sent} laporan sesi.`, 'success');
          checkPendingSessions();
        } else {
          showToast('Koneksi belum stabil. Laporan tetap tersimpan aman di perangkat.', 'info');
        }
      });
    } else {
      syncBanner.classList.add('hidden');
    }
  } catch {
    syncBanner.classList.add('hidden');
  }
}

function setupActions(state) {
  // Main Lagi (Redirects to setup with same category)
  document.getElementById('btn-play-again')?.addEventListener('click', () => {
    const catId = state.config?.categoryId;
    if (catId) {
      window.location.href = `/setup.html?category=${encodeURIComponent(catId)}`;
    } else {
      window.location.href = '/setup.html';
    }
  });

  // Beranda
  document.getElementById('btn-home')?.addEventListener('click', () => {
    window.location.href = '/index.html';
  });

  // Cetak Ringkasan
  document.getElementById('btn-print')?.addEventListener('click', () => {
    window.print();
  });
}
