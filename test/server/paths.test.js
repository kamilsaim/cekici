import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveBinary, isBundled } from '../../server/paths.js';

function tempBundle(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cekici-bin-'));
  for (const f of files) fs.writeFileSync(path.join(dir, f), '');
  return dir;
}

test('resolveBinary: bundle klasöründeki dosyayı mutlak yolla döner', () => {
  const dir = tempBundle(['yt-dlp.exe']);
  const resolved = resolveBinary('yt-dlp', { bundleDir: dir, platform: 'win32' });
  assert.equal(resolved, path.join(dir, 'yt-dlp.exe'));
  assert.ok(isBundled(resolved));
});

test('resolveBinary: bundle yoksa PATH adına düşer', () => {
  const resolved = resolveBinary('yt-dlp', { bundleDir: undefined, platform: 'win32' });
  assert.equal(resolved, 'yt-dlp');
  assert.ok(!isBundled(resolved));
});

test('resolveBinary: bundle klasörü var ama dosya yoksa PATH adına düşer', () => {
  const dir = tempBundle([]);
  assert.equal(resolveBinary('ffmpeg', { bundleDir: dir, platform: 'win32' }), 'ffmpeg');
});

test('resolveBinary: win32 dışında .exe eklemez', () => {
  const dir = tempBundle(['ffmpeg']);
  assert.equal(resolveBinary('ffmpeg', { bundleDir: dir, platform: 'linux' }), path.join(dir, 'ffmpeg'));
});

test('resolveBinary: birden çok aday klasörü sırayla dener', () => {
  const bos = tempBundle([]);
  const dolu = tempBundle(['yt-dlp.exe']);
  const resolved = resolveBinary('yt-dlp', { bundleDir: [bos, dolu], platform: 'win32' });
  assert.equal(resolved, path.join(dolu, 'yt-dlp.exe'));
});
