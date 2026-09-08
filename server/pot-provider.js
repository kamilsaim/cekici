import fs from 'node:fs';
import { spawn } from 'node:child_process';

// bgutil PO token provider'ı HTTP server modunda, uygulamayla aynı container
// içinde çalıştırır. yt-dlp eklentisi (pip: bgutil-ytdlp-pot-provider) bu
// sunucuyu 127.0.0.1:4416 üzerinde kendiliğinden bulur; yt-dlp'ye ekstra
// argüman geçmek gerekmez. Sadece YouTube çıkarıcısını etkiler.
export const DEFAULT_ENTRY = '/opt/bgutil/server/build/main.js';
export const DEFAULT_PORT = 4416;

async function waitForReady(port, { attempts = 20, delayMs = 500 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/ping`);
      if (res.ok) return true;
    } catch {
      // sunucu henüz ayakta değil, tekrar dene
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

/**
 * Provider'ı başlatır. Dosya yoksa (ör. yerel Windows geliştirmesi) sessizce
 * atlar; bu durumda yt-dlp cookies'e veya çerezsiz moda düşer.
 * @returns {Promise<boolean>} provider hazır olduysa true
 */
export async function startPotProvider({
  entry = process.env.POT_PROVIDER_ENTRY || DEFAULT_ENTRY,
  port = Number(process.env.POT_PROVIDER_PORT) || DEFAULT_PORT,
  log = console.log,
} = {}) {
  if (!fs.existsSync(entry)) {
    log(`PO token provider bulunamadı (${entry}), bu adım atlanıyor.`);
    return false;
  }

  const child = spawn(process.execPath, [entry, '--port', String(port)], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });

  child.stderr.on('data', (chunk) => log(`[pot-provider] ${String(chunk).trim()}`));
  child.on('exit', (code) => log(`PO token provider ${code} koduyla sonlandı.`));
  // Ana süreç ölürse provider'ı da yanında götür.
  const kill = () => child.kill();
  process.on('exit', kill);
  process.on('SIGINT', () => { kill(); process.exit(0); });
  process.on('SIGTERM', () => { kill(); process.exit(0); });

  const ready = await waitForReady(port);
  log(ready
    ? `PO token provider hazır: http://127.0.0.1:${port}`
    : 'PO token provider yanıt vermedi; YouTube indirmeleri cookies\'e bağımlı kalacak.');
  return ready;
}
