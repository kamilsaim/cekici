import fs from 'node:fs';
import path from 'node:path';

/**
 * Paketlenmiş dağıtımda yt-dlp ve ffmpeg uygulamanın yanındaki bin/ klasöründe
 * gömülü gelir; arkadaşların bilgisayarına hiçbir şey kurulmaz. Geliştirmede
 * böyle bir klasör yoktur, o zaman PATH'teki isme düşeriz ve `npm start`
 * bugünkü gibi çalışır.
 *
 * @returns {string} çalıştırılabilir dosyanın mutlak yolu veya çıplak adı
 */
export function resolveBinary(name, { bundleDir, platform = process.platform } = {}) {
  const filename = platform === 'win32' ? `${name}.exe` : name;
  const dirs = Array.isArray(bundleDir) ? bundleDir : [bundleDir];
  for (const dir of dirs.filter(Boolean)) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) return candidate;
  }
  return name;
}

/** İkilinin gömülü mü yoksa sistemden mi geldiğini söyler (log/teşhis için). */
export function isBundled(resolved) {
  return path.isAbsolute(resolved);
}
