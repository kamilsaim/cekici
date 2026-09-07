import { spawn } from 'node:child_process';
import { parseProgressLine } from './progress.js';

export function resolveInfo(url, cookiesFile) {
  return new Promise((resolve, reject) => {
    const cookieArgs = cookiesFile ? ['--cookies', cookiesFile] : [];
    const proc = spawn('yt-dlp', [...cookieArgs, '--dump-json', '--no-playlist', url]);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => (stdout += chunk));
    proc.stderr.on('data', (chunk) => (stderr += chunk));

    proc.on('error', (err) => reject(new Error(`yt-dlp çalıştırılamadı: ${err.message}`)));
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
      try {
        const info = JSON.parse(stdout);
        resolve({ title: info.title, thumbnail: info.thumbnail ?? null, duration: info.duration ?? null });
      } catch {
        reject(new Error('yt-dlp çıktısı ayrıştırılamadı'));
      }
    });
  });
}

export function runDownload(args, onProgress, cookiesFile) {
  return new Promise((resolve, reject) => {
    const cookieArgs = cookiesFile ? ['--cookies', cookiesFile] : [];
    const proc = spawn('yt-dlp', [...cookieArgs, ...args, '--print', 'after_move:filepath']);
    let stderr = '';
    let buffer = '';
    let outputPath = '';

    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const pct = parseProgressLine(line);
        if (pct !== null) {
          onProgress(pct);
        } else if (line.trim() && !line.startsWith('[')) {
          outputPath = line.trim();
        }
      }
    });

    proc.stderr.on('data', (chunk) => (stderr += chunk));

    proc.on('error', (err) => reject(new Error(`yt-dlp çalıştırılamadı: ${err.message}`)));
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
      if (!outputPath) return reject(new Error('İndirilen dosyanın yolu belirlenemedi'));
      resolve(outputPath);
    });
  });
}
