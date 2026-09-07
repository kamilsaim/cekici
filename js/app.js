import {
  createQueueItem,
  addToQueue,
  removeFromQueue,
  setItemMode,
  setItemQuality,
  groupByDate,
  filterByPlatform,
} from './logic.js';
import { initialHistory } from './history-data.js';

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

function renderQueue() {
  const list = document.getElementById('queue-list');
  const subtitle = document.getElementById('queue-subtitle');
  const downloadBtn = document.getElementById('download-all-btn');

  subtitle.textContent = `${queue.length} video ekli · toplu indir`;
  downloadBtn.textContent = `Tümünü İndir (${queue.length}) ⬇️`;
  downloadBtn.disabled = queue.length === 0;

  list.innerHTML = '';
  for (const item of queue) {
    const card = document.createElement('div');
    card.className = 'queue-card';

    const qualityOptions = item.mode === 'audio' ? AUDIO_BITRATES : VIDEO_QUALITIES;
    const activeValue = item.mode === 'audio' ? item.bitrate : item.quality;

    card.innerHTML = `
      <div class="queue-thumb">
        <span class="platform-badge ${item.platform}">${item.platform.slice(0, 2).toUpperCase()}</span>
      </div>
      <div class="queue-body">
        <div class="queue-title">${item.title}</div>
        <div class="chip-row mode-row">
          <button class="chip mode-chip ${item.mode === 'video' ? 'active' : ''}" data-mode="video">Video</button>
          <button class="chip mode-chip ${item.mode === 'audio' ? 'active' : ''}" data-mode="audio">🎵 Ses</button>
        </div>
        <div class="chip-row quality-row">
          ${qualityOptions
            .map(
              (q) =>
                `<button class="chip quality-chip ${q === activeValue ? 'active' : ''}" data-value="${q}">${q}</button>`
            )
            .join('')}
        </div>
      </div>
      <button class="remove-btn" data-id="${item.id}">✕</button>
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
});

document.getElementById('download-all-btn').addEventListener('click', () => {
  alert(`${queue.length} video indiriliyor... (simülasyon)`);
  queue = [];
  renderQueue();
});

renderQueue();

let history = [...initialHistory];
let activeFilter = 'all';

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
            <div class="history-meta">${item.meta}</div>
          </div>
        </div>
        <div class="history-actions">
          <button class="play-btn">▶ Oynat</button>
          <button class="share-btn">↗ Paylaş</button>
          <button class="redownload-btn">↻ Tekrar</button>
          <button class="delete-btn">🗑</button>
        </div>
      `;

      card.querySelector('.play-btn').addEventListener('click', () => alert(`Oynatılıyor: ${item.title}`));
      card.querySelector('.share-btn').addEventListener('click', () => alert(`Paylaşılıyor: ${item.title}`));
      card.querySelector('.redownload-btn').addEventListener('click', () => alert(`Tekrar indiriliyor: ${item.title}`));
      card.querySelector('.delete-btn').addEventListener('click', () => {
        history = history.filter((h) => h.id !== item.id);
        renderHistory();
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

renderHistory();
