import express from 'express';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { createJobStore } from './jobs.js';
import { readHistory, addHistoryEntry, deleteHistoryEntry, clearHistoryFile } from './history.js';
import { resolveInfo, runDownload, selfUpdateYtdlp } from './ytdlp-runner.js';
import { buildDownloadArgs } from './ytdlp-args.js';
import { startPotProvider } from './pot-provider.js';
import { resolveBinary, isBundled } from './paths.js';
import { readSettings, updateSettings, resolveDownloadDir } from './settings.js';
import { pickFolder } from './folder-picker.js';
import { detectPlatform } from '../js/logic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const HISTORY_FILE = path.join(ROOT, 'data', 'history.json');
const SETTINGS_FILE = path.join(ROOT, 'data', 'settings.json');
const PORT = Number(process.env.PORT) || 3000;

// Paketlenmiş dağıtımda yapı "cekici/app/" ve "cekici/bin/" şeklinde; geliştirmede
// böyle bir klasör yok ve PATH'e düşülür.
const BIN_DIRS = [process.env.CEKICI_BIN_DIR, path.join(ROOT, 'bin'), path.join(ROOT, '..', 'bin')];
const YTDLP = resolveBinary('yt-dlp', { bundleDir: BIN_DIRS });
const FFMPEG = resolveBinary('ffmpeg', { bundleDir: BIN_DIRS });

// Kullanıcı bir klasör seçmediyse buraya iner.
const DEFAULT_DOWNLOAD_DIR = process.platform === 'win32'
  ? path.join(os.homedir(), 'Downloads')
  : path.join(ROOT, 'downloads');

function currentDownloadDir() {
  const dir = resolveDownloadDir(readSettings(SETTINGS_FILE), DEFAULT_DOWNLOAD_DIR);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Geçmiş kayıtları tam yolu tutar; kullanıcı indirme klasörünü sonradan
// değiştirse bile eski dosyalar bulunabilsin diye. Eski kayıtlarda bu alan
// yok, onlar için o anki klasörle birleştiriyoruz.
function entryFilePath(entry) {
  return entry.filePath ?? path.join(currentDownloadDir(), entry.filename);
}

function prepareCookiesFile() {
  const source = [
    process.env.COOKIES_FILE,
    '/etc/secrets/cookies.txt',
    path.join(ROOT, 'cookies.txt'),
  ].filter(Boolean).find((p) => fs.existsSync(p));
  if (!source) return null;

  // yt-dlp cookie jar'ı her çalıştırmada geri yazmaya çalışır; salt-okunur
  // kaynaklar için yazılabilir bir kopya kullanılır.
  const writableCopy = path.join(ROOT, 'data', 'cookies-runtime.txt');
  fs.mkdirSync(path.dirname(writableCopy), { recursive: true });
  fs.copyFileSync(source, writableCopy);
  return writableCopy;
}

function checkPrerequisite(cmd, versionFlag, installHint) {
  const result = spawnSync(cmd, [versionFlag]);
  if (result.error || result.status !== 0) {
    console.error(`Hata: "${cmd}" bulunamadı veya çalıştırılamadı. Kurulum: ${installHint}`);
    process.exit(1);
  }
}

checkPrerequisite(YTDLP, '--version', 'pip install yt-dlp');
checkPrerequisite(FFMPEG, '-version', 'winget install ffmpeg');
console.log(`yt-dlp: ${isBundled(YTDLP) ? 'gömülü' : 'sistemden'} (${YTDLP})`);
console.log(`ffmpeg: ${isBundled(FFMPEG) ? 'gömülü' : 'sistemden'} (${FFMPEG})`);

fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });

const COOKIES_FILE = prepareCookiesFile();
if (COOKIES_FILE) console.log(`yt-dlp cookies dosyası kullanılıyor: ${COOKIES_FILE}`);

// Sunucuda barınırken YouTube'un bot kontrolünü aşmak için gerekiyordu; kişisel
// bilgisayarda dosyaları bulunamaz ve sessizce atlanır.
await startPotProvider();

// Gömülü kopyayı güncel tut; sistemdeki kuruluma dokunma (onu kullanıcı yönetir).
if (isBundled(YTDLP)) selfUpdateYtdlp(YTDLP);

const app = express();
app.use(express.json());
app.use(express.static(ROOT, { index: 'index.html' }));

const jobStore = createJobStore();
let processing = false;

async function processQueue() {
  if (processing) return;
  const job = jobStore.nextQueued();
  if (!job) return;
  processing = true;
  jobStore.markDownloading(job.id);

  try {
    const outputTemplate = path.join(currentDownloadDir(), `${job.id}-%(title)s.%(ext)s`);
    const args = buildDownloadArgs({
      url: job.url,
      mode: job.mode,
      quality: job.quality,
      bitrate: job.bitrate,
      outputTemplate,
    });
    const resultPath = await runDownload(
      args,
      (pct) => jobStore.updateProgress(job.id, pct),
      { cookiesFile: COOKIES_FILE, ytdlpPath: YTDLP, ffmpegPath: isBundled(FFMPEG) ? FFMPEG : undefined },
    );
    const stats = fs.statSync(resultPath);

    const entry = {
      id: crypto.randomUUID(),
      url: job.url,
      title: job.title,
      platform: job.platform,
      mode: job.mode,
      quality: job.quality,
      bitrate: job.bitrate,
      sizeBytes: stats.size,
      downloadedAt: new Date().toISOString(),
      filename: path.basename(resultPath),
      filePath: resultPath,
    };
    addHistoryEntry(HISTORY_FILE, entry);
    jobStore.completeJob(job.id, entry.id);
  } catch (err) {
    jobStore.failJob(job.id, err.message);
  } finally {
    processing = false;
    processQueue();
  }
}

app.get('/api/config', (req, res) => {
  res.json({ downloadsPath: currentDownloadDir() });
});

app.get('/api/settings', (req, res) => {
  res.json({ downloadDir: currentDownloadDir(), isDefault: !readSettings(SETTINGS_FILE).downloadDir });
});

// Yerel klasör penceresini açar. Sadece kullanıcının kendi makinesinde anlamlı.
app.post('/api/choose-folder', async (req, res) => {
  try {
    const chosen = await pickFolder(currentDownloadDir());
    if (!chosen) return res.json({ cancelled: true, downloadDir: currentDownloadDir() });
    updateSettings(SETTINGS_FILE, { downloadDir: chosen });
    res.json({ cancelled: false, downloadDir: currentDownloadDir() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/reset-folder', (req, res) => {
  updateSettings(SETTINGS_FILE, { downloadDir: null });
  res.json({ downloadDir: currentDownloadDir(), isDefault: true });
});

app.post('/api/resolve', async (req, res) => {
  const { url } = req.body ?? {};
  const platform = detectPlatform(url);
  if (platform === 'unknown') {
    return res.status(400).json({ error: 'Desteklenmeyen veya geçersiz link.' });
  }
  try {
    const info = await resolveInfo(url, { cookiesFile: COOKIES_FILE, ytdlpPath: YTDLP });
    res.json({ platform, title: info.title, thumbnail: info.thumbnail });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post('/api/downloads', (req, res) => {
  const { url, title, platform, mode, quality, bitrate } = req.body ?? {};
  if (!url || !mode) {
    return res.status(400).json({ error: 'url ve mode zorunlu.' });
  }
  const job = jobStore.createJob({
    id: crypto.randomUUID(),
    url,
    title: title ?? url,
    platform: platform ?? detectPlatform(url),
    mode,
    quality,
    bitrate,
  });
  processQueue();
  res.status(201).json({ jobId: job.id });
});

app.get('/api/downloads/:jobId', (req, res) => {
  const job = jobStore.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job bulunamadı.' });
  res.json(job);
});

app.get('/api/history', (req, res) => {
  res.json(readHistory(HISTORY_FILE));
});

app.get('/api/history/:id/file', (req, res) => {
  const entry = readHistory(HISTORY_FILE).find((e) => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Kayıt bulunamadı.' });
  res.download(entryFilePath(entry));
});

app.delete('/api/history/:id', (req, res) => {
  const entry = readHistory(HISTORY_FILE).find((e) => e.id === req.params.id);
  if (entry) {
    const filePath = entryFilePath(entry);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  res.json(deleteHistoryEntry(HISTORY_FILE, req.params.id));
});

app.delete('/api/history', (req, res) => {
  for (const entry of readHistory(HISTORY_FILE)) {
    const filePath = entryFilePath(entry);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  res.json(clearHistoryFile(HISTORY_FILE));
});

// Port doluysa (uygulama zaten açıksa ya da başka bir şey portu tutuyorsa)
// birkaç port ileri dene; arkadaşın "adres kullanımda" hatasıyla karşılaşmasın.
function listen(port, attemptsLeft = 10) {
  const server = app.listen(port);
  server.on('listening', () => {
    const url = `http://localhost:${port}`;
    console.log(`Sunucu ${url} adresinde çalışıyor`);
    if (process.env.CEKICI_OPEN_BROWSER === '1') openBrowser(url);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.log(`Port ${port} dolu, ${port + 1} deneniyor...`);
      return listen(port + 1, attemptsLeft - 1);
    }
    console.error(`Sunucu başlatılamadı: ${err.message}`);
    process.exit(1);
  });
}

function openBrowser(url) {
  if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  else if (process.platform === 'darwin') spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  else spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
}

listen(PORT);
