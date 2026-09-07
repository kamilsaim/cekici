# Video İndirici Mobil Uygulama Arayüzü — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, interactive mobile-width HTML/CSS/JS prototype of a YouTube/Instagram/X video downloader app UI — with a multi-download queue, download history, a how-to-use guide, and settings — matching the approved design spec.

**Architecture:** Plain HTML/CSS/JS, no framework, no build step, no backend. Pure logic (platform detection, queue state, history grouping/filtering, theme) lives in `js/logic.js` with no DOM dependency so it can be unit-tested with Node's built-in test runner. DOM rendering and event wiring live in `js/app.js`, which imports `logic.js` as an ES module. This is a **design/UI prototype** — there is no real download engine; actions like "İndir" and "Paylaş" are simulated (toast/console feedback) per the spec's "Kapsam Dışı" section.

**Tech Stack:** HTML5, CSS3 (custom properties for design tokens), vanilla JS (ES modules), Node.js built-in test runner (`node --test`) for logic unit tests, Python's `http.server` (or any static server) to serve the app locally for browser verification.

**Spec:** `docs/superpowers/specs/2026-09-07-video-indirici-uygulama-design.md`

---

## File Structure

- `package.json` — minimal, `"type": "module"`, `test` script
- `index.html` — app shell: mobile frame, 4 screens (`#screen-indir`, `#screen-gecmis`, `#screen-howto`, `#screen-ayarlar`), bottom nav
- `css/styles.css` — design tokens (`:root` custom properties + `[data-theme="dark"]` overrides) and all component styles
- `js/logic.js` — pure functions, no DOM: `detectPlatform`, `createQueueItem`, `addToQueue`, `removeFromQueue`, `setItemMode`, `setItemQuality`, `groupByDate`, `filterByPlatform`, `oppositeTheme`
- `js/history-data.js` — mock seed data for the Geçmiş screen
- `js/app.js` — DOM rendering + event wiring, imports `logic.js` and `history-data.js`
- `test/logic.test.js` — Node built-in tests for every function in `logic.js`

---

## Task 0: Proje İskeleti

**Files:**
- Create: `package.json`

- [ ] **Step 1: Git deposunu başlat**

Run: `git init`
Expected: `Initialized empty Git repository in .../youtube/.git/`

- [ ] **Step 2: package.json oluştur**

```json
{
  "name": "video-indirici-ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test test/",
    "serve": "python -m http.server 8080"
  }
}
```

- [ ] **Step 3: .gitignore oluştur**

```
node_modules/
.superpowers/
```

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore
git commit -m "chore: proje iskeleti"
```

---

## Task 1: Platform Algılama Mantığı (logic.js başlangıcı)

**Files:**
- Create: `js/logic.js`
- Test: `test/logic.test.js`

- [ ] **Step 1: Başarısız olacak testi yaz**

`test/logic.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPlatform } from '../js/logic.js';

test('detectPlatform: youtube.com linkini tanır', () => {
  assert.equal(detectPlatform('https://www.youtube.com/watch?v=abc123'), 'youtube');
});

test('detectPlatform: youtu.be kısa linkini tanır', () => {
  assert.equal(detectPlatform('https://youtu.be/abc123'), 'youtube');
});

test('detectPlatform: instagram.com linkini tanır', () => {
  assert.equal(detectPlatform('https://www.instagram.com/reel/xyz/'), 'instagram');
});

test('detectPlatform: x.com ve twitter.com linkini tanır', () => {
  assert.equal(detectPlatform('https://x.com/user/status/123'), 'x');
  assert.equal(detectPlatform('https://twitter.com/user/status/123'), 'x');
});

test('detectPlatform: bilinmeyen linki "unknown" döner', () => {
  assert.equal(detectPlatform('https://example.com/video'), 'unknown');
});

test('detectPlatform: boş veya geçersiz string "unknown" döner', () => {
  assert.equal(detectPlatform(''), 'unknown');
  assert.equal(detectPlatform('not a url'), 'unknown');
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/logic.js'`

- [ ] **Step 3: Minimal implementasyonu yaz**

`js/logic.js`:

```js
export function detectPlatform(url) {
  if (typeof url !== 'string') return 'unknown';
  try {
    const { hostname } = new URL(url);
    const host = hostname.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') return 'youtube';
    if (host === 'instagram.com') return 'instagram';
    if (host === 'x.com' || host === 'twitter.com') return 'x';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npm test`
Expected: PASS — 7/7 tests passing

- [ ] **Step 5: Commit**

```bash
git add js/logic.js test/logic.test.js
git commit -m "feat: platform algılama mantığı (detectPlatform)"
```

---

## Task 2: Kuyruk (Queue) Mantığı

**Files:**
- Modify: `js/logic.js`
- Modify: `test/logic.test.js`

- [ ] **Step 1: Başarısız olacak testleri ekle**

`test/logic.test.js` sonuna ekle:

```js
import { createQueueItem, addToQueue, removeFromQueue, setItemMode, setItemQuality } from '../js/logic.js';

test('createQueueItem: youtube linki için video modunda, 1080p varsayılan öğe oluşturur', () => {
  const item = createQueueItem('https://youtu.be/abc123', 'Test Video');
  assert.equal(item.platform, 'youtube');
  assert.equal(item.title, 'Test Video');
  assert.equal(item.mode, 'video');
  assert.equal(item.quality, '1080p');
  assert.equal(item.bitrate, null);
  assert.ok(item.id);
});

test('addToQueue: yeni öğeyi kuyruğun sonuna ekler', () => {
  const queue = [];
  const item = createQueueItem('https://x.com/u/status/1', 'Klip');
  const result = addToQueue(queue, item);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, item.id);
});

test('removeFromQueue: id ile eşleşen öğeyi çıkarır', () => {
  const a = createQueueItem('https://youtu.be/a', 'A');
  const b = createQueueItem('https://youtu.be/b', 'B');
  const queue = [a, b];
  const result = removeFromQueue(queue, a.id);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, b.id);
});

test('setItemMode: mode "audio" yapılınca bitrate 192kbps varsayılan atanır', () => {
  const a = createQueueItem('https://youtu.be/a', 'A');
  const queue = [a];
  const result = setItemMode(queue, a.id, 'audio');
  assert.equal(result[0].mode, 'audio');
  assert.equal(result[0].bitrate, '192kbps');
});

test('setItemMode: mode "video" yapılınca bitrate null olur', () => {
  const a = createQueueItem('https://youtu.be/a', 'A');
  a.mode = 'audio';
  a.bitrate = '320kbps';
  const queue = [a];
  const result = setItemMode(queue, a.id, 'video');
  assert.equal(result[0].mode, 'video');
  assert.equal(result[0].bitrate, null);
});

test('setItemQuality: video kalitesini günceller', () => {
  const a = createQueueItem('https://youtu.be/a', 'A');
  const queue = [a];
  const result = setItemQuality(queue, a.id, '720p');
  assert.equal(result[0].quality, '720p');
});

test('setItemQuality: audio modundayken bitrate\'i günceller', () => {
  const a = createQueueItem('https://youtu.be/a', 'A');
  a.mode = 'audio';
  const queue = [a];
  const result = setItemQuality(queue, a.id, '320kbps');
  assert.equal(result[0].bitrate, '320kbps');
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm test`
Expected: FAIL — `createQueueItem is not a function` (ve diğerleri)

- [ ] **Step 3: Minimal implementasyonu yaz**

`js/logic.js` sonuna ekle:

```js
let nextId = 1;

export function createQueueItem(url, title) {
  return {
    id: `q${nextId++}`,
    url,
    title,
    platform: detectPlatform(url),
    mode: 'video',
    quality: '1080p',
    bitrate: null,
  };
}

export function addToQueue(queue, item) {
  return [...queue, item];
}

export function removeFromQueue(queue, id) {
  return queue.filter((item) => item.id !== id);
}

export function setItemMode(queue, id, mode) {
  return queue.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      mode,
      bitrate: mode === 'audio' ? (item.bitrate ?? '192kbps') : null,
    };
  });
}

export function setItemQuality(queue, id, value) {
  return queue.map((item) => {
    if (item.id !== id) return item;
    return item.mode === 'audio' ? { ...item, bitrate: value } : { ...item, quality: value };
  });
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npm test`
Expected: PASS — tüm testler geçer (14/14)

- [ ] **Step 5: Commit**

```bash
git add js/logic.js test/logic.test.js
git commit -m "feat: indirme kuyruğu mantığı (add/remove/mode/quality)"
```

---

## Task 3: Geçmiş Gruplama ve Filtreleme Mantığı

**Files:**
- Modify: `js/logic.js`
- Modify: `test/logic.test.js`

- [ ] **Step 1: Başarısız olacak testleri ekle**

`test/logic.test.js` sonuna ekle:

```js
import { groupByDate, filterByPlatform } from '../js/logic.js';

test('filterByPlatform: "all" ise listeyi olduğu gibi döner', () => {
  const items = [{ platform: 'youtube' }, { platform: 'x' }];
  assert.equal(filterByPlatform(items, 'all').length, 2);
});

test('filterByPlatform: verilen platforma göre filtreler', () => {
  const items = [{ platform: 'youtube' }, { platform: 'x' }, { platform: 'youtube' }];
  const result = filterByPlatform(items, 'youtube');
  assert.equal(result.length, 2);
  assert.ok(result.every((i) => i.platform === 'youtube'));
});

test('groupByDate: bugünkü ve dünkü kayıtları ayrı gruplara koyar', () => {
  const now = new Date('2026-09-07T18:00:00');
  const today = new Date('2026-09-07T09:00:00').toISOString();
  const yesterday = new Date('2026-09-06T20:00:00').toISOString();
  const items = [
    { id: '1', downloadedAt: today },
    { id: '2', downloadedAt: yesterday },
  ];
  const groups = groupByDate(items, now);
  assert.deepEqual(Object.keys(groups), ['Bugün', 'Dün']);
  assert.equal(groups['Bugün'].length, 1);
  assert.equal(groups['Dün'].length, 1);
});

test('groupByDate: 7 günden eski kayıt "Daha eski" grubuna girer', () => {
  const now = new Date('2026-09-07T18:00:00');
  const old = new Date('2026-08-01T09:00:00').toISOString();
  const groups = groupByDate([{ id: '1', downloadedAt: old }], now);
  assert.deepEqual(Object.keys(groups), ['Daha eski']);
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm test`
Expected: FAIL — `groupByDate is not a function`

- [ ] **Step 3: Minimal implementasyonu yaz**

`js/logic.js` sonuna ekle:

```js
export function filterByPlatform(items, platform) {
  if (platform === 'all') return items;
  return items.filter((item) => item.platform === platform);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function groupByDate(items, now = new Date()) {
  const today = startOfDay(now);
  const yesterday = today - 86400000;
  const weekAgo = today - 6 * 86400000;

  const groups = {};
  const order = ['Bugün', 'Dün', 'Bu hafta', 'Daha eski'];

  for (const item of items) {
    const day = startOfDay(item.downloadedAt);
    let label;
    if (day === today) label = 'Bugün';
    else if (day === yesterday) label = 'Dün';
    else if (day >= weekAgo) label = 'Bu hafta';
    else label = 'Daha eski';

    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }

  const ordered = {};
  for (const label of order) {
    if (groups[label]) ordered[label] = groups[label];
  }
  return ordered;
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npm test`
Expected: PASS — tüm testler geçer (18/18)

- [ ] **Step 5: Commit**

```bash
git add js/logic.js test/logic.test.js
git commit -m "feat: geçmiş gruplama (tarih) ve platform filtresi mantığı"
```

---

## Task 4: Tema Mantığı

**Files:**
- Modify: `js/logic.js`
- Modify: `test/logic.test.js`

- [ ] **Step 1: Başarısız olacak testi ekle**

`test/logic.test.js` sonuna ekle:

```js
import { oppositeTheme } from '../js/logic.js';

test('oppositeTheme: light -> dark, dark -> light', () => {
  assert.equal(oppositeTheme('light'), 'dark');
  assert.equal(oppositeTheme('dark'), 'light');
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm test`
Expected: FAIL — `oppositeTheme is not a function`

- [ ] **Step 3: Minimal implementasyonu yaz**

`js/logic.js` sonuna ekle:

```js
export function oppositeTheme(theme) {
  return theme === 'dark' ? 'light' : 'dark';
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npm test`
Expected: PASS — tüm testler geçer (19/19)

- [ ] **Step 5: Commit**

```bash
git add js/logic.js test/logic.test.js
git commit -m "feat: tema geçiş mantığı (oppositeTheme)"
```

---

## Task 5: Tasarım Tokenleri ve Mobil Çerçeve (CSS + HTML iskeleti)

**Files:**
- Create: `css/styles.css`
- Create: `index.html`

- [ ] **Step 1: Tasarım tokenlerini ve temel çerçeveyi yaz**

`css/styles.css`:

```css
:root {
  --bg-grad-start: #fff7f0;
  --bg-grad-end: #ffeef5;
  --accent-start: #ff7a59;
  --accent-end: #ff4d8d;
  --text-dark: #2c2130;
  --text-muted: #8a7d8f;
  --text-muted-2: #a5899b;
  --card-bg: #ffffff;
  --chip-bg: #fff0f5;
  --chip-active-bg: #ff4d8d;
  --chip-active-text: #ffffff;
  --border-light: #ffd3e0;
  --page-bg: #f7f3ef;
  --radius-lg: 28px;
  --radius-md: 20px;
  --radius-sm: 14px;
  --radius-chip: 16px;
  --yt-color: #ff2d55;
  --ig-gradient: linear-gradient(135deg, #f58529, #dd2a7b, #8134af);
  --x-color: #111111;
  --shadow-card: 0 4px 10px rgba(0, 0, 0, 0.05);
  --shadow-accent: 0 6px 16px rgba(255, 77, 141, 0.35);
}

[data-theme='dark'] {
  --bg-grad-start: #1a1420;
  --bg-grad-end: #241a2c;
  --text-dark: #f5eef8;
  --text-muted: #b9a9c2;
  --text-muted-2: #a58fb0;
  --card-bg: #2b2233;
  --chip-bg: #3a2c45;
  --border-light: #4a3757;
  --page-bg: #14101a;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
  background: var(--page-bg);
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

.app-frame {
  width: 375px;
  max-width: 100%;
  min-height: 720px;
  background: linear-gradient(180deg, var(--bg-grad-start), var(--bg-grad-end));
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.screen { display: none; padding: 16px 18px 4px; flex: 1; overflow-y: auto; }
.screen.active { display: block; }

.screen-title { font-size: 20px; font-weight: 800; color: var(--text-dark); margin: 0 0 2px; }
.screen-subtitle { font-size: 12px; color: var(--text-muted); margin: 0 0 12px; }

.bottom-nav {
  display: flex;
  background: var(--card-bg);
  border-top: 1px solid var(--border-light);
  padding: 10px 4px 14px;
}
.nav-item {
  flex: 1;
  text-align: center;
  color: var(--text-muted-2);
  background: none;
  border: none;
  font-family: inherit;
  cursor: pointer;
}
.nav-item .icon { font-size: 18px; display: block; }
.nav-item .label { font-size: 10px; margin-top: 2px; }
.nav-item.active { color: var(--accent-end); }
.nav-item.active .label { font-weight: 700; }
```

- [ ] **Step 2: HTML iskeletini yaz (4 boş ekran + alt menü)**

`index.html`:

```html
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Video İndirici</title>
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
  <div class="app-frame">
    <main>
      <section id="screen-indir" class="screen active"></section>
      <section id="screen-gecmis" class="screen"></section>
      <section id="screen-howto" class="screen"></section>
      <section id="screen-ayarlar" class="screen"></section>
    </main>
    <nav class="bottom-nav">
      <button class="nav-item active" data-target="screen-indir">
        <span class="icon">⬇️</span><span class="label">İndir</span>
      </button>
      <button class="nav-item" data-target="screen-gecmis">
        <span class="icon">🕑</span><span class="label">Geçmiş</span>
      </button>
      <button class="nav-item" data-target="screen-howto">
        <span class="icon">❓</span><span class="label">Nasıl Kullanılır</span>
      </button>
      <button class="nav-item" data-target="screen-ayarlar">
        <span class="icon">⚙️</span><span class="label">Ayarlar</span>
      </button>
    </nav>
  </div>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Sekme geçiş mantığını yaz**

`js/app.js` oluştur:

```js
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
```

- [ ] **Step 4: Tarayıcıda doğrula**

Run: `npm run serve` (arka planda), sonra `http://localhost:8080` adresini tarayıcıda aç.
Expected: Mobil çerçeve (375px) ortalanmış görünür, alt menüdeki 4 butona tıklayınca aktif sekme (mor/pembe renk) değişir, boş ekranlar arasında geçiş çalışır. Sunucuyu durdur (`Ctrl+C`).

- [ ] **Step 5: Commit**

```bash
git add index.html css/styles.css js/app.js
git commit -m "feat: mobil çerçeve, tasarım tokenleri ve sekme geçişi"
```

---

## Task 6: İndir Ekranı (Kuyruk UI)

**Files:**
- Modify: `index.html` — `#screen-indir` içeriği
- Modify: `css/styles.css` — kuyruk kartı stilleri
- Modify: `js/app.js` — kuyruk render + event wiring

- [ ] **Step 1: `#screen-indir` HTML'ini doldur**

`index.html` içinde `<section id="screen-indir" class="screen active"></section>` satırını şununla değiştir:

```html
<section id="screen-indir" class="screen active">
  <h2 class="screen-title">İndirme Kuyruğu</h2>
  <p class="screen-subtitle" id="queue-subtitle">0 video ekli · toplu indir</p>

  <form id="add-link-form" class="add-link-row">
    <input id="link-input" type="text" placeholder="🔗 Link yapıştır..." autocomplete="off" />
    <button type="submit" class="add-btn">+</button>
  </form>

  <div id="queue-list"></div>

  <button id="download-all-btn" class="primary-btn" disabled>Tümünü İndir (0) ⬇️</button>
</section>
```

- [ ] **Step 2: Kuyruk kartı ve buton stillerini ekle**

`css/styles.css` sonuna ekle:

```css
.add-link-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--card-bg);
  border-radius: var(--radius-chip);
  padding: 10px 12px;
  box-shadow: var(--shadow-card);
  margin-bottom: 12px;
}
.add-link-row input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 12px;
  color: var(--text-dark);
  background: transparent;
}
.add-btn {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(90deg, var(--accent-start), var(--accent-end));
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
}

.queue-card {
  display: flex;
  gap: 10px;
  background: var(--card-bg);
  border-radius: var(--radius-md);
  padding: 12px;
  box-shadow: var(--shadow-card);
  margin-bottom: 10px;
}
.queue-thumb {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: var(--chip-bg);
  flex-shrink: 0;
  position: relative;
}
.platform-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 4px;
}
.platform-badge.youtube { background: var(--yt-color); }
.platform-badge.instagram { background: var(--ig-gradient); }
.platform-badge.x { background: var(--x-color); }
.platform-badge.unknown { background: #999; }

.queue-body { flex: 1; }
.queue-title { font-size: 11px; font-weight: 700; color: var(--text-dark); }
.chip-row { display: flex; gap: 5px; margin-top: 6px; flex-wrap: wrap; }
.chip {
  font-size: 9px;
  font-weight: 700;
  padding: 4px 7px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid var(--border-light);
  color: var(--text-muted-2);
  cursor: pointer;
}
.chip.active { background: var(--chip-active-bg); color: var(--chip-active-text); border-color: transparent; }
.remove-btn { color: #d9c7cf; font-size: 14px; background: none; border: none; cursor: pointer; align-self: flex-start; }

.primary-btn {
  width: 100%;
  background: linear-gradient(90deg, var(--accent-start), var(--accent-end));
  border: none;
  border-radius: 16px;
  padding: 14px;
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  box-shadow: var(--shadow-accent);
  cursor: pointer;
  margin: 4px 0 16px;
}
.primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 3: Kuyruk render ve event mantığını `js/app.js`'e ekle**

`js/app.js` başına import ekle, `initTabs()` çağrısından sonrasına ekle:

```js
import {
  createQueueItem,
  addToQueue,
  removeFromQueue,
  setItemMode,
  setItemQuality,
} from './logic.js';

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
```

- [ ] **Step 4: Tarayıcıda doğrula**

Run: `npm run serve`, `http://localhost:8080` adresini aç.
Expected: Link kutusuna herhangi bir metin (örn. `https://youtu.be/abc`) yazıp "+" tuşuna basınca kuyruğa kart eklenir, platform rozeti doğru görünür (YT/IN/X), "🎵 Ses" tıklanınca kalite çipleri bitrate'e döner, "✕" ile öğe silinir, "Tümünü İndir" butonu kuyruk boşken devre dışı, doluyken aktif. Sunucuyu durdur.

- [ ] **Step 5: Commit**

```bash
git add index.html css/styles.css js/app.js
git commit -m "feat: İndir ekranı - çoklu indirme kuyruğu UI"
```

---

## Task 7: Geçmiş Ekranı

**Files:**
- Create: `js/history-data.js`
- Modify: `index.html` — `#screen-gecmis` içeriği
- Modify: `css/styles.css` — geçmiş kartı stilleri
- Modify: `js/app.js` — geçmiş render + filtre + aksiyonlar

- [ ] **Step 1: Mock geçmiş verisini oluştur**

`js/history-data.js`:

```js
const now = new Date();
function hoursAgo(h) {
  return new Date(now.getTime() - h * 3600 * 1000).toISOString();
}

export const initialHistory = [
  {
    id: 'h1',
    title: 'Gitar Dersi #4 - Akorlar',
    platform: 'youtube',
    downloadedAt: hoursAgo(3),
    meta: '1080p · 24MB',
  },
  {
    id: 'h2',
    title: 'Reels - Yemek tarifi',
    platform: 'instagram',
    downloadedAt: hoursAgo(7),
    meta: '🎵 192kbps · 3.1MB',
  },
  {
    id: 'h3',
    title: 'Haber klibi - Gündem',
    platform: 'x',
    downloadedAt: hoursAgo(26),
    meta: '720p · 11MB',
  },
];
```

- [ ] **Step 2: `#screen-gecmis` HTML'ini doldur**

`index.html` içinde `<section id="screen-gecmis" class="screen"></section>` satırını şununla değiştir:

```html
<section id="screen-gecmis" class="screen">
  <h2 class="screen-title">Geçmiş</h2>
  <p class="screen-subtitle" id="history-count">0 indirme</p>

  <div class="chip-row filter-row" id="platform-filter">
    <button class="chip filter-chip active" data-platform="all">Tümü</button>
    <button class="chip filter-chip" data-platform="youtube">▶ YouTube</button>
    <button class="chip filter-chip" data-platform="instagram">📷 Instagram</button>
    <button class="chip filter-chip" data-platform="x">𝕏</button>
  </div>

  <div id="history-list"></div>
</section>
```

- [ ] **Step 3: Geçmiş kartı stillerini ekle**

`css/styles.css` sonuna ekle:

```css
.filter-row { margin-bottom: 10px; }
.filter-chip { border-radius: 16px; }
.filter-chip.active { background: var(--text-dark); color: #fff; border-color: transparent; }

.date-group-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted-2);
  margin: 10px 0 4px;
}

.history-card {
  background: var(--card-bg);
  border-radius: var(--radius-md);
  padding: 10px;
  box-shadow: var(--shadow-card);
  margin-bottom: 8px;
}
.history-card .queue-thumb { width: 50px; height: 50px; }
.history-top { display: flex; gap: 10px; }
.history-title { font-size: 11px; font-weight: 700; color: var(--text-dark); }
.history-meta { font-size: 9px; color: var(--text-muted-2); margin-top: 2px; }
.history-actions { display: flex; gap: 6px; margin-top: 8px; }
.history-actions button {
  flex: 1;
  text-align: center;
  background: var(--chip-bg);
  color: var(--accent-end);
  font-size: 9px;
  font-weight: 700;
  padding: 6px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
}
.history-actions button.delete-btn { flex: 0 0 30px; color: var(--text-muted-2); }
```

- [ ] **Step 4: Geçmiş render, filtre ve aksiyon mantığını `js/app.js`'e ekle**

`js/app.js` başına import ekle:

```js
import { groupByDate, filterByPlatform } from './logic.js';
import { initialHistory } from './history-data.js';
```

Dosyanın sonuna ekle:

```js
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
```

- [ ] **Step 5: Tarayıcıda doğrula**

Run: `npm run serve`, `http://localhost:8080` adresini aç, Geçmiş sekmesine geç.
Expected: 3 mock kayıt tarih gruplarına (Bugün/Dün) ayrılmış görünür, platform çiplerine tıklayınca liste filtrelenir, "🗑" ile kayıt kalıcı olarak silinir (sayfa yenilenmeden), diğer aksiyon butonları uyarı gösterir.

- [ ] **Step 6: Commit**

```bash
git add js/history-data.js index.html css/styles.css js/app.js
git commit -m "feat: Geçmiş ekranı - tarih gruplama, platform filtresi, aksiyonlar"
```

---

## Task 8: Nasıl Kullanılır Ekranı

**Files:**
- Modify: `index.html` — `#screen-howto` içeriği
- Modify: `css/styles.css` — adım kartı stilleri

- [ ] **Step 1: `#screen-howto` HTML'ini doldur**

`index.html` içinde `<section id="screen-howto" class="screen"></section>` satırını şununla değiştir:

```html
<section id="screen-howto" class="screen">
  <h2 class="screen-title">Nasıl Kullanılır?</h2>
  <p class="screen-subtitle">4 adımda video indir</p>

  <div class="step-card">
    <div class="step-num">1</div>
    <div>
      <div class="step-title">Videoyu bul, linkini kopyala</div>
      <div class="step-desc">YouTube, Instagram veya X'te "Paylaş &gt; Linki Kopyala"</div>
    </div>
  </div>

  <div class="step-card">
    <div class="step-num">2</div>
    <div>
      <div class="step-title">Uygulamaya yapıştır</div>
      <div class="step-desc">İndir sekmesinde link kutusuna dokun ve yapıştır</div>
    </div>
  </div>

  <div class="step-card">
    <div class="step-num">3</div>
    <div>
      <div class="step-title">Kalite / format seç</div>
      <div class="step-desc">Video kalitesi veya sadece ses (MP3, kbps) seçebilirsin</div>
    </div>
  </div>

  <div class="step-card">
    <div class="step-num">4</div>
    <div>
      <div class="step-title">İndir'e dokun</div>
      <div class="step-desc">Dosya cihazına iner, Geçmiş sekmesinden erişebilirsin</div>
    </div>
  </div>

  <div class="tip-box">💡 İpucu: Birden fazla link ekleyip "Tümünü İndir" ile toplu indirebilirsin.</div>
</section>
```

- [ ] **Step 2: Adım kartı stillerini ekle**

`css/styles.css` sonuna ekle:

```css
.step-card {
  display: flex;
  gap: 12px;
  align-items: center;
  background: var(--card-bg);
  border-radius: var(--radius-md);
  padding: 12px;
  box-shadow: var(--shadow-card);
  margin-bottom: 10px;
}
.step-num {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
  color: #fff;
  font-weight: 800;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step-title { font-size: 12px; font-weight: 700; color: var(--text-dark); }
.step-desc { font-size: 10px; color: var(--text-muted-2); }
.tip-box {
  background: var(--chip-bg);
  border-radius: var(--radius-sm);
  padding: 12px;
  font-size: 10px;
  color: var(--accent-end);
  margin: 8px 0 16px;
}
```

- [ ] **Step 3: Tarayıcıda doğrula**

Run: `npm run serve`, "Nasıl Kullanılır" sekmesine geç.
Expected: 4 numaralı adım kartı ve altta ipucu kutusu görünür, düzen diğer ekranlarla tutarlı.

- [ ] **Step 4: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: Nasıl Kullanılır ekranı - adım adım rehber"
```

---

## Task 9: Ayarlar Ekranı

**Files:**
- Modify: `index.html` — `#screen-ayarlar` içeriği
- Modify: `css/styles.css` — ayar satırı stilleri
- Modify: `js/app.js` — ayar mantığı (tema, geçmişi temizle, varsayılan kalite)

- [ ] **Step 1: `#screen-ayarlar` HTML'ini doldur**

`index.html` içinde `<section id="screen-ayarlar" class="screen"></section>` satırını şununla değiştir:

```html
<section id="screen-ayarlar" class="screen">
  <h2 class="screen-title">Ayarlar</h2>
  <p class="screen-subtitle">Uygulama tercihlerin</p>

  <div class="settings-list">
    <div class="settings-row">
      <div>
        <div class="settings-label">İndirme konumu</div>
        <div class="settings-value">Downloads/VideoIndirici</div>
      </div>
    </div>

    <div class="settings-row">
      <div class="settings-label">Varsayılan video kalitesi</div>
      <select id="default-quality-select" class="settings-select">
        <option value="1080p">1080p</option>
        <option value="720p">720p</option>
        <option value="480p">480p</option>
      </select>
    </div>

    <div class="settings-row">
      <div class="settings-label">Koyu tema</div>
      <button id="theme-toggle" class="toggle-switch" role="switch" aria-checked="false"></button>
    </div>

    <div class="settings-row">
      <button id="clear-history-btn" class="danger-btn">Geçmişi Temizle</button>
    </div>

    <div class="settings-row">
      <div>
        <div class="settings-label">Hakkında</div>
        <div class="settings-value">Video İndirici · v0.1.0</div>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Ayar satırı ve toggle stillerini ekle**

`css/styles.css` sonuna ekle:

```css
.settings-row {
  background: var(--card-bg);
  border-radius: var(--radius-md);
  padding: 14px;
  box-shadow: var(--shadow-card);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.settings-label { font-size: 12px; font-weight: 700; color: var(--text-dark); }
.settings-value { font-size: 10px; color: var(--text-muted-2); margin-top: 2px; }
.settings-select {
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 6px 8px;
  font-size: 11px;
  color: var(--text-dark);
  background: var(--chip-bg);
}
.toggle-switch {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: var(--border-light);
  border: none;
  position: relative;
  cursor: pointer;
}
.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.15s ease;
}
.toggle-switch[aria-checked='true'] {
  background: linear-gradient(90deg, var(--accent-start), var(--accent-end));
}
.toggle-switch[aria-checked='true']::after { left: 20px; }
.danger-btn {
  width: 100%;
  background: none;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 10px;
  color: var(--accent-end);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
```

- [ ] **Step 3: Ayar mantığını `js/app.js`'e ekle**

`js/app.js` başına import ekle:

```js
import { oppositeTheme } from './logic.js';
```

Dosyanın sonuna ekle:

```js
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

document.getElementById('clear-history-btn').addEventListener('click', () => {
  history = [];
  renderHistory();
  alert('Geçmiş temizlendi.');
});

document.getElementById('default-quality-select').addEventListener('change', (e) => {
  localStorage.setItem('defaultQuality', e.target.value);
});
```

- [ ] **Step 4: Tarayıcıda doğrula**

Run: `npm run serve`, Ayarlar sekmesine geç.
Expected: "Koyu tema" toggle'ına basınca tüm uygulama koyu temaya geçer (mor/pembe vurgular korunur), "Geçmişi Temizle" butonuna basınca Geçmiş sekmesindeki liste boşalır, varsayılan kalite seçimi kalıcı olarak `localStorage`'a kaydedilir (sayfa yenilenip tekrar açıldığında tema korunur).

- [ ] **Step 5: Commit**

```bash
git add index.html css/styles.css js/app.js
git commit -m "feat: Ayarlar ekranı - tema, geçmişi temizle, varsayılan kalite"
```

---

## Task 10: Son Kontrol ve Doğrulama

**Files:** (yok — sadece doğrulama)

- [ ] **Step 1: Tüm birim testlerini çalıştır**

Run: `npm test`
Expected: PASS — tüm testler (19+) geçer, hiçbir hata yok

- [ ] **Step 2: Tarayıcıda uçtan uca doğrulama**

Run: `npm run serve`, `http://localhost:8080` adresini aç.

Spec'e (`docs/superpowers/specs/2026-09-07-video-indirici-uygulama-design.md`) karşı kontrol listesi:
- [ ] 4 sekme arasında geçiş çalışıyor (İndir/Geçmiş/Nasıl Kullanılır/Ayarlar)
- [ ] İndir: birden fazla link eklenip kuyrukta bekletilebiliyor
- [ ] İndir: Video/Ses modu ve buna göre kalite (1080p/720p/480p) veya bitrate (128/192/320kbps) seçilebiliyor
- [ ] İndir: "Tümünü İndir" kuyruk boşken devre dışı
- [ ] Geçmiş: tarih gruplaması (Bugün/Dün) ve platform filtresi çalışıyor
- [ ] Geçmiş: Oynat/Paylaş/Tekrar/Sil aksiyonları çalışıyor, Sil kalıcı
- [ ] Nasıl Kullanılır: 4 adım kartı ve ipucu kutusu görünüyor
- [ ] Ayarlar: koyu tema toggle tüm ekranları etkiliyor, geçmişi temizle çalışıyor
- [ ] 375px genişlikte hiçbir öğe taşmıyor/kesilmiyor

- [ ] **Step 3: Tarayıcı penceresini 375px genişliğe ayarla ve her sekmeyi tek tek kontrol et**

DevTools ile responsive mod aç (375×720), her sekmeyi ziyaret et, yatay kaydırma çubuğu çıkmadığını doğrula. Sunucuyu durdur.

- [ ] **Step 4: Commit (varsa düzeltmeler)**

```bash
git add -A
git commit -m "fix: son kontrol sonrası küçük düzeltmeler"
```

(Düzeltme yoksa bu adımı atla.)
