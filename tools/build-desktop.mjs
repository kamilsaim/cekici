// Arkadaşlara gönderilecek Windows paketini hazırlar.
//
//   npm run build:desktop
//
// Çıktı: dist/cekici.zip — içinde Node, ffmpeg ve yt-dlp gömülü olduğu için
// karşı tarafta hiçbir kurulum gerekmez. İndirilen dosyalar bir kez indirilip
// dist/.cache altında saklanır, sonraki derlemeler hızlıdır.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const CACHE = path.join(DIST, '.cache');
const OUT = path.join(DIST, 'cekici');
const APP = path.join(OUT, 'app');
const BIN = path.join(OUT, 'bin');

const NODE_VERSION = 'v24.20.0';
const NODE_URL = `https://nodejs.org/dist/${NODE_VERSION}/win-x64/node.exe`;
const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
const FFMPEG_URL = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';

// Pakete girecek uygulama dosyaları. Sunucuya özgü dağıtım artıkları
// (Dockerfile, render.yaml) bilerek dışarıda.
const APP_FILES = ['server', 'js', 'css', 'icons', 'index.html', 'manifest.json', 'sw.js'];

function ps(command) {
  const result = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], {
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error(`PowerShell komutu başarısız: ${command}`);
}

// Windows'ta npm bir .cmd dosyasidir ve Node 20+ bunu shell olmadan
// calistirmaz (EINVAL). Komutu ayri argumanlar yerine tek string olarak
// vermek, shell:true ile arguman gecmenin tetikledigi DEP0190 uyarisindan da
// kurtariyor. Buradaki komutlar sabit, disaridan girdi almiyor.
function run(command, cwd) {
  const result = spawnSync(command, { cwd, stdio: 'inherit', shell: true });
  if (result.error) throw new Error(`"${command}" çalıştırılamadı: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`"${command}" başarısız oldu`);
}

async function download(url, dest) {
  if (fs.existsSync(dest)) {
    console.log(`  önbellekten: ${path.basename(dest)}`);
    return dest;
  }
  console.log(`  indiriliyor: ${url}`);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`İndirilemedi (${res.status}): ${url}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

function copyInto(src, destDir) {
  fs.cpSync(src, path.join(destDir, path.basename(src)), { recursive: true });
}

const BASLAT_BAT = `@echo off
chcp 65001 >nul
title Cekici - Video Indirici
cd /d "%~dp0"

set CEKICI_OPEN_BROWSER=1
set CEKICI_BIN_DIR=%~dp0bin

echo.
echo   Cekici baslatiliyor... Tarayici birazdan kendiliginden acilacak.
echo   Uygulamayi kapatmak icin bu pencereyi kapatin.
echo.

node.exe app\\server\\index.js

echo.
echo   Uygulama durdu.
pause
`;

async function main() {
  console.log('1/6  Eski çıktı temizleniyor');
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(BIN, { recursive: true });
  fs.mkdirSync(APP, { recursive: true });

  console.log('2/6  Node indiriliyor');
  fs.copyFileSync(await download(NODE_URL, path.join(CACHE, `node-${NODE_VERSION}.exe`)), path.join(OUT, 'node.exe'));

  console.log('3/6  yt-dlp indiriliyor');
  fs.copyFileSync(await download(YTDLP_URL, path.join(CACHE, 'yt-dlp.exe')), path.join(BIN, 'yt-dlp.exe'));

  console.log('4/6  ffmpeg indiriliyor');
  const zip = await download(FFMPEG_URL, path.join(CACHE, 'ffmpeg.zip'));
  const extracted = path.join(CACHE, 'ffmpeg-extracted');
  if (!fs.existsSync(extracted)) {
    ps(`Expand-Archive -Path '${zip}' -DestinationPath '${extracted}' -Force`);
  }
  // Arşivin içindeki klasör adı sürümle değişiyor, ffmpeg.exe'yi arayarak bul.
  const found = findFile(extracted, 'ffmpeg.exe');
  if (!found) throw new Error('Arşivde ffmpeg.exe bulunamadı');
  fs.copyFileSync(found, path.join(BIN, 'ffmpeg.exe'));

  console.log('5/6  Uygulama dosyaları kopyalanıyor');
  for (const item of APP_FILES) copyInto(path.join(ROOT, item), APP);
  // Paket içinde sadece üretim bağımlılıkları olsun.
  fs.writeFileSync(path.join(APP, 'package.json'), JSON.stringify({
    name: 'cekici', private: true, type: 'module', dependencies: readDeps(),
  }, null, 2));
  run('npm install --omit=dev --no-audit --no-fund', APP);
  fs.writeFileSync(path.join(OUT, 'baslat.bat'), BASLAT_BAT, 'latin1');

  console.log('6/6  ZIP hazırlanıyor');
  const zipOut = path.join(DIST, 'cekici.zip');
  fs.rmSync(zipOut, { force: true });
  // Compress-Archive dosyalari tek tek acar ve tazece yazilmis dosyalar
  // antivirus taramasindayken "baska bir islem kullaniyor" hatasi verir.
  // CreateFromDirectory tek seferde calisir ve belirgin sekilde hizlidir.
  ps([
    'Add-Type -AssemblyName System.IO.Compression.FileSystem;',
    `[System.IO.Compression.ZipFile]::CreateFromDirectory('${OUT}', '${zipOut}')`,
  ].join(' '));

  console.log(`\nHazır: ${zipOut} (${(fs.statSync(zipOut).size / 1024 / 1024).toFixed(0)} MB)`);
  console.log('Bu dosyayı arkadaşlarına gönderebilirsin.');
}

function readDeps() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8')).dependencies;
}

function findFile(dir, name) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const hit = findFile(full, name);
      if (hit) return hit;
    } else if (entry.name === name) {
      return full;
    }
  }
  return null;
}

main().catch((err) => {
  console.error(`\nHata: ${err.message}`);
  process.exit(1);
});
