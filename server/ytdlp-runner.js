import { spawn } from 'node:child_process';
import { parseProgressLine } from './progress.js';

// Paketlenmiş dağıtımda yt-dlp ve ffmpeg uygulamanın yanında gömülü gelir, o
// yüzden çalıştırılabilir yolları dışarıdan geçiliyor. Verilmezse PATH'teki
// isimlere düşer ve geliştirme ortamı bugünkü gibi çalışır.
function baseArgs({ cookiesFile, ffmpegPath }) {
  return [
    ...(cookiesFile ? ['--cookies', cookiesFile] : []),
    ...(ffmpegPath ? ['--ffmpeg-location', ffmpegPath] : []),
    '--remote-components', 'ejs:github',
  ];
}

export function resolveInfo(url, { cookiesFile, ytdlpPath = 'yt-dlp', ffmpegPath } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ytdlpPath, [...baseArgs({ cookiesFile, ffmpegPath }), '--dump-json', '--no-playlist', url]);
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

export function runDownload(args, onProgress, { cookiesFile, ytdlpPath = 'yt-dlp', ffmpegPath } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ytdlpPath, [...baseArgs({ cookiesFile, ffmpegPath }), ...args, '--print', 'after_move:filepath']);
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

/**
 * Gömülü yt-dlp'yi kendi kendine günceller. YouTube sık değiştiği için sabit
 * bir kopya birkaç ay içinde bozulur; bu sayede arkadaşlara yeni paket
 * göndermek gerekmez. Başarısız olursa sessizce yok sayılır (internet yok,
 * dosya kilitli, izin yok gibi durumlar uygulamayı engellememeli).
 */
export function selfUpdateYtdlp(ytdlpPath, log = console.log) {
  return new Promise((resolve) => {
    const proc = spawn(ytdlpPath, ['-U']);
    let out = '';
    proc.stdout.on('data', (c) => (out += c));
    proc.stderr.on('data', (c) => (out += c));
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => {
      if (code === 0 && /Updated|up to date|up-to-date/i.test(out)) {
        log(`yt-dlp güncelleme kontrolü: ${out.trim().split('\n').pop()}`);
      }
      resolve(code === 0);
    });
  });
}
