import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readHistory, writeHistory, addHistoryEntry, deleteHistoryEntry, clearHistoryFile } from '../../server/history.js';

function tempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hist-'));
  return path.join(dir, 'history.json');
}

test('readHistory: dosya yoksa boş dizi döner', () => {
  assert.deepEqual(readHistory(tempFile()), []);
});

test('writeHistory + readHistory: yazılan veriyi geri okur', () => {
  const file = tempFile();
  writeHistory(file, [{ id: '1', title: 'A' }]);
  assert.deepEqual(readHistory(file), [{ id: '1', title: 'A' }]);
});

test('addHistoryEntry: yeni kaydı listenin başına ekler', () => {
  const file = tempFile();
  addHistoryEntry(file, { id: '1', title: 'A' });
  const result = addHistoryEntry(file, { id: '2', title: 'B' });
  assert.equal(result.length, 2);
  assert.equal(result[0].id, '2');
});

test('deleteHistoryEntry: id ile eşleşen kaydı çıkarır', () => {
  const file = tempFile();
  addHistoryEntry(file, { id: '1', title: 'A' });
  addHistoryEntry(file, { id: '2', title: 'B' });
  const result = deleteHistoryEntry(file, '1');
  assert.equal(result.length, 1);
  assert.equal(result[0].id, '2');
});

test('clearHistoryFile: tüm kayıtları temizler', () => {
  const file = tempFile();
  addHistoryEntry(file, { id: '1', title: 'A' });
  const result = clearHistoryFile(file);
  assert.deepEqual(result, []);
  assert.deepEqual(readHistory(file), []);
});
