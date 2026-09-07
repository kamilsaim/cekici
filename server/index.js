import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { createJobStore } from './jobs.js';
import { readHistory, addHistoryEntry, deleteHistoryEntry, clearHistoryFile } from './history.js';
import { resolveInfo, runDownload } from './ytdlp-runner.js';
import { buildDownloadArgs } from './ytdlp-args.js';
import { detectPlatform } from '../js/logic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DOWNLOADS_DIR = path.join(ROOT, 'downloads');
const HISTORY_FILE = path.join(ROOT, 'data', 'history.json');
const PORT = process.env.PORT || 3000;

function checkPrerequisite(cmd, versionFlag, installHint) {
  const result = spawnSync(cmd, [versionFlag]);
  if (result.error || result.status !== 0) {
    console.error(`Hata: "${cmd}" bulunamadı veya çalıştırılamadı. Kurulum: ${installHint}`);
    process.exit(1);
  }
}

checkPrerequisite('yt-dlp', '--version', 'pip install yt-dlp');
checkPrerequisite('ffmpeg', '-version', 'winget install ffmpeg');

fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });

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
    const outputTemplate = path.join(DOWNLOADS_DIR, `${job.id}-%(title)s.%(ext)s`);
    const args = buildDownloadArgs({
      url: job.url,
      mode: job.mode,
      quality: job.quality,
      bitrate: job.bitrate,
      outputTemplate,
    });
    const resultPath = await runDownload(args, (pct) => jobStore.updateProgress(job.id, pct));
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
  res.json({ downloadsPath: DOWNLOADS_DIR });
});

app.post('/api/resolve', async (req, res) => {
  const { url } = req.body ?? {};
  const platform = detectPlatform(url);
  if (platform === 'unknown') {
    return res.status(400).json({ error: 'Desteklenmeyen veya geçersiz link.' });
  }
  try {
    const info = await resolveInfo(url);
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
  const entries = readHistory(HISTORY_FILE);
  const entry = entries.find((e) => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Kayıt bulunamadı.' });
  res.download(path.join(DOWNLOADS_DIR, entry.filename));
});

app.delete('/api/history/:id', (req, res) => {
  const entries = readHistory(HISTORY_FILE);
  const entry = entries.find((e) => e.id === req.params.id);
  if (entry) {
    const filePath = path.join(DOWNLOADS_DIR, entry.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  res.json(deleteHistoryEntry(HISTORY_FILE, req.params.id));
});

app.delete('/api/history', (req, res) => {
  const entries = readHistory(HISTORY_FILE);
  for (const entry of entries) {
    const filePath = path.join(DOWNLOADS_DIR, entry.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  res.json(clearHistoryFile(HISTORY_FILE));
});

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
