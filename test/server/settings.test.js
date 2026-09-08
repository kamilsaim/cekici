import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  readSettings, writeSettings, updateSettings, resolveDownloadDir, DEFAULT_SETTINGS,
} from '../../server/settings.js';

function tempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cekici-ayar-'));
  return path.join(dir, 'settings.json');
}

test('readSettings: dosya yokken varsayılanı döner', () => {
  assert.deepEqual(readSettings(tempFile()), DEFAULT_SETTINGS);
});

test('writeSettings/readSettings: yazılanı geri okur', () => {
  const file = tempFile();
  writeSettings(file, { downloadDir: 'C:\Indirilenler' });
  assert.equal(readSettings(file).downloadDir, 'C:\Indirilenler');
});

test('readSettings: bozuk JSON uygulamayı düşürmez, varsayılana döner', () => {
  const file = tempFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '{bozuk');
  assert.deepEqual(readSettings(file), DEFAULT_SETTINGS);
});

test('updateSettings: mevcut alanları koruyarak günceller', () => {
  const file = tempFile();
  writeSettings(file, { downloadDir: 'C:\A' });
  const merged = updateSettings(file, { downloadDir: 'C:\B' });
  assert.equal(merged.downloadDir, 'C:\B');
  assert.equal(readSettings(file).downloadDir, 'C:\B');
});

test('resolveDownloadDir: seçim yoksa fallback', () => {
  assert.equal(resolveDownloadDir({ downloadDir: null }, 'D:\varsayilan'), 'D:\varsayilan');
});

test('resolveDownloadDir: var olan klasörü döner', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cekici-hedef-'));
  assert.equal(resolveDownloadDir({ downloadDir: dir }, 'D:\varsayilan'), dir);
});

test('resolveDownloadDir: klasör silinmişse fallback (kullanıcı taşımış olabilir)', () => {
  assert.equal(resolveDownloadDir({ downloadDir: '/yok/boyle/klasor' }, 'D:\varsayilan'), 'D:\varsayilan');
});
