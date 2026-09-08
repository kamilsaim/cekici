import fs from 'node:fs';
import path from 'node:path';

// Kullanıcının değiştirebildiği kalıcı tercihler. history.js gibi dosya yolu
// dışarıdan geçilir, böylece testler geçici dosya kullanabilir.

export const DEFAULT_SETTINGS = { downloadDir: null };

export function readSettings(filePath) {
  if (!fs.existsSync(filePath)) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    // Bozuk dosya yüzünden uygulama açılmasın; varsayılana dönüp devam et.
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(filePath, settings) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2));
  return merged;
}

export function updateSettings(filePath, patch) {
  return writeSettings(filePath, { ...readSettings(filePath), ...patch });
}

/**
 * Kullanıcının seçtiği indirme klasörünü döner. Seçim yoksa ya da klasör
 * silinmiş/erişilemezse fallback'e döner — kullanıcı diskini toplayıp klasörü
 * taşıdığında uygulama hata vermek yerine varsayılana dönmeli.
 */
export function resolveDownloadDir(settings, fallback) {
  const chosen = settings?.downloadDir;
  if (!chosen) return fallback;
  try {
    if (fs.statSync(chosen).isDirectory()) return chosen;
  } catch {
    // erişilemiyor
  }
  return fallback;
}
