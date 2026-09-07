import {
  createQueueItem,
  addToQueue,
  removeFromQueue,
  setItemMode,
  setItemQuality,
  groupByDate,
  filterByPlatform,
  oppositeTheme,
  formatSize,
} from './logic.js';

function initTabs() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      navItems.forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.target).classList.add('active');
    });
  });
}

initTabs();

let queue = [];

const VIDEO_QUALITIES = ['1080p', '720p', '480p'];
const AUDIO_BITRATES = ['128kbps', '192kbps', '320kbps'];

async function resolveTitle(item) {
  try {
    const res = await fetch('/api/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: item.url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Link çözümlenemedi');
    item.title = data.title;
    item.platform = data.platform;
    item.resolveError = null;
  } catch (err) {
    item.resolveError = err.message;
  }
  renderQueue();
}

function renderQueue() {
  const list = document.getElementById('queue-list');
  const subtitle = document.getElementById('queue-subtitle');
  const downloadBtn = document.getElementById('download-all-btn');

  subtitle.textContent = `${queue.length} video ekli · toplu indir`;
  downloadBtn.textContent = `Tümünü İndir (${queue.length}) ⬇️`;
  downloadBtn.disabled = queue.length === 0 || queue.some((i) => i.jobStatus === 'downloading');

  list.innerHTML = '';
  for (const item of queue) {
    const card = document.createElement('div');
    card.className = 'queue-card';

    const qualityOptions = item.mode === 'audio' ? AUDIO_BITRATES : VIDEO_QUALITIES;
    const activeValue = item.mode === 'audio' ? item.bitrate : item.quality;
    const locked = item.jobStatus === 'downloading' || item.jobStatus === 'completed';

    card.innerHTML = `
      <div class="queue-thumb">
        <span class="platform-badge ${item.platform}">${item.platform.slice(0, 2).toUpperCase()}</span>
      </div>
      <div class="queue-body">
        <div class="queue-title">${item.title}</div>
        <div class="chip-row mode-row">
          <button class="chip mode-chip ${item.mode === 'video' ? 'active' : ''}" data-mode="video" ${locked ? 'disabled' : ''}>Video</button>
          <button class="chip mode-chip ${item.mode === 'audio' ? 'active' : ''}" data-mode="audio" ${locked ? 'disabled' : ''}>🎵 Ses</button>
        </div>
        <div class="chip-row quality-row">
          ${qualityOptions
            .map(
              (q) =>
                `<button class="chip quality-chip ${q === activeValue ? 'active' : ''}" data-value="${q}" ${locked ? 'disabled' : ''}>${q}</button>`
            )
            .join('')}
        </div>
        ${
          item.jobStatus === 'downloading' || item.jobStatus === 'completed'
            ? `<div class="progress-track"><div class="progress-fill" style="width:${item.jobProgress ?? 0}%"></div></div>
               <div class="queue-status">${item.jobStatus === 'completed' ? 'Tamamlandı ✓' : `%${item.jobProgress ?? 0}`}</div>`
            : ''
        }
        ${item.jobStatus === 'failed' ? `<div class="queue-error">Hata: ${item.jobError}</div>` : ''}
        ${item.resolveError ? `<div class="queue-error">${item.resolveError}</div>` : ''}
      </div>
      <button class="remove-btn" data-id="${item.id}" ${item.jobStatus === 'downloading' ? 'disabled' : ''}>✕</button>
    `;

    card.querySelector('.remove-btn').addEventListener('click', () => {
      queue = removeFromQueue(queue, item.id);
      renderQueue();
    });

    card.querySelectorAll('.mode-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        queue = setItemMode(queue, item.id, btn.dataset.mode);
        renderQueue();
      });
    });

    card.querySelectorAll('.quality-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        queue = setItemQuality(queue, item.id, btn.dataset.value);
        renderQueue();
      });
    });

    list.appendChild(card);
  }
}

document.getElementById('add-link-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('link-input');
  const url = input.value.trim();
  if (!url) return;
  const item = createQueueItem(url, url.length > 40 ? url.slice(0, 40) + '…' : url);
  queue = addToQueue(queue, item);
  input.value = '';
  renderQueue();
  resolveTitle(item);
});

async function pollJob(item) {
  const res = await fetch(`/api/downloads/${item.jobId}`);
  const job = await res.json();
  item.jobStatus = job.status;
  item.jobProgress = job.progress;
  item.jobError = job.error;
  renderQueue();

  if (job.status === 'completed') {
    await loadHistory();
    queue = removeFromQueue(queue, item.id);
    renderQueue();
    return;
  }
  if (job.status === 'failed') return;
  setTimeout(() => pollJob(item), 1000);
}

document.getElementById('download-all-btn').addEventListener('click', async () => {
  for (const item of queue) {
    if (item.jobId) continue;
    const res = await fetch('/api/downloads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: item.url,
        title: item.title,
        platform: item.platform,
        mode: item.mode,
        quality: item.quality,
        bitrate: item.bitrate,
      }),
    });
    const data = await res.json();
    item.jobId = data.jobId;
    item.jobStatus = 'queued';
    item.jobProgress = 0;
    pollJob(item);
  }
  renderQueue();
});

renderQueue();

let history = [];
let activeFilter = 'all';

async function loadHistory() {
  const res = await fetch('/api/history');
  history = await res.json();
  renderHistory();
}

function metaFor(entry) {
  const quality = entry.mode === 'audio' ? `🎵 ${entry.bitrate}` : entry.quality;
  return `${quality} · ${formatSize(entry.sizeBytes)}`;
}

function renderHistory() {
  const list = document.getElementById('history-list');
  const count = document.getElementById('history-count');
  const filtered = filterByPlatform(history, activeFilter);
  count.textContent = `${filtered.length} indirme`;

  const groups = groupByDate(filtered);
  list.innerHTML = '';

  for (const [label, items] of Object.entries(groups)) {
    const groupLabel = document.createElement('div');
    groupLabel.className = 'date-group-label';
    groupLabel.textContent = label.toUpperCase();
    list.appendChild(groupLabel);

    for (const item of items) {
      const card = document.createElement('div');
      card.className = 'history-card';
      card.innerHTML = `
        <div class="history-top">
          <div class="queue-thumb">
            <span class="platform-badge ${item.platform}">${item.platform.slice(0, 2).toUpperCase()}</span>
          </div>
          <div>
            <div class="history-title">${item.title}</div>
            <div class="history-meta">${metaFor(item)}</div>
          </div>
        </div>
        <div class="history-actions">
          <button class="play-btn">▶ Oynat</button>
          <button class="share-btn">↗ Paylaş</button>
          <button class="redownload-btn">↻ Tekrar</button>
          <button class="delete-btn">🗑</button>
        </div>
      `;

      card.querySelector('.play-btn').addEventListener('click', () => {
        window.open(`/api/history/${item.id}/file`, '_blank');
      });

      card.querySelector('.share-btn').addEventListener('click', async () => {
        const fileUrl = `${window.location.origin}/api/history/${item.id}/file`;
        if (navigator.share) {
          try {
            await navigator.share({ title: item.title, url: fileUrl });
          } catch {
            /* kullanıcı paylaşımı iptal etti */
          }
        } else {
          window.open(fileUrl, '_blank');
        }
      });

      card.querySelector('.redownload-btn').addEventListener('click', async () => {
        await fetch('/api/downloads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: item.url,
            title: item.title,
            platform: item.platform,
            mode: item.mode,
            quality: item.quality,
            bitrate: item.bitrate,
          }),
        });
        alert("Tekrar indirme kuyruğa alındı. Birazdan Geçmiş'te görünecek.");
      });

      card.querySelector('.delete-btn').addEventListener('click', async () => {
        await fetch(`/api/history/${item.id}`, { method: 'DELETE' });
        await loadHistory();
      });

      list.appendChild(card);
    }
  }
}

document.querySelectorAll('.filter-chip').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.platform;
    renderHistory();
  });
});

loadHistory();

const themeToggle = document.getElementById('theme-toggle');
let currentTheme = localStorage.getItem('theme') || 'light';

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.setAttribute('aria-checked', String(theme === 'dark'));
  localStorage.setItem('theme', theme);
}

themeToggle.addEventListener('click', () => applyTheme(oppositeTheme(currentTheme)));
applyTheme(currentTheme);

document.getElementById('clear-history-btn').addEventListener('click', async () => {
  await fetch('/api/history', { method: 'DELETE' });
  await loadHistory();
  alert('Geçmiş temizlendi.');
});

document.getElementById('default-quality-select').addEventListener('change', (e) => {
  localStorage.setItem('defaultQuality', e.target.value);
});

fetch('/api/config')
  .then((res) => res.json())
  .then((config) => {
    document.querySelector('.settings-value').textContent = config.downloadsPath;
  });
