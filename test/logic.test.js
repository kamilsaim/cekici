import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPlatform } from '../js/logic.js';

test('detectPlatform: youtube.com linkini tanır', () => {
  assert.equal(detectPlatform('https://www.youtube.com/watch?v=abc123'), 'youtube');
});

test('detectPlatform: youtu.be kısa linkini tanır', () => {
  assert.equal(detectPlatform('https://youtu.be/abc123'), 'youtube');
});

test('detectPlatform: instagram.com linkini tanır', () => {
  assert.equal(detectPlatform('https://www.instagram.com/reel/xyz/'), 'instagram');
});

test('detectPlatform: x.com ve twitter.com linkini tanır', () => {
  assert.equal(detectPlatform('https://x.com/user/status/123'), 'x');
  assert.equal(detectPlatform('https://twitter.com/user/status/123'), 'x');
});

test('detectPlatform: bilinmeyen linki "unknown" döner', () => {
  assert.equal(detectPlatform('https://example.com/video'), 'unknown');
});

test('detectPlatform: boş veya geçersiz string "unknown" döner', () => {
  assert.equal(detectPlatform(''), 'unknown');
  assert.equal(detectPlatform('not a url'), 'unknown');
});

import { createQueueItem, addToQueue, removeFromQueue, setItemMode, setItemQuality } from '../js/logic.js';

test('createQueueItem: youtube linki için video modunda, 1080p varsayılan öğe oluşturur', () => {
  const item = createQueueItem('https://youtu.be/abc123', 'Test Video');
  assert.equal(item.platform, 'youtube');
  assert.equal(item.title, 'Test Video');
  assert.equal(item.mode, 'video');
  assert.equal(item.quality, '1080p');
  assert.equal(item.bitrate, null);
  assert.ok(item.id);
});

test('addToQueue: yeni öğeyi kuyruğun sonuna ekler', () => {
  const queue = [];
  const item = createQueueItem('https://x.com/u/status/1', 'Klip');
  const result = addToQueue(queue, item);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, item.id);
});

test('removeFromQueue: id ile eşleşen öğeyi çıkarır', () => {
  const a = createQueueItem('https://youtu.be/a', 'A');
  const b = createQueueItem('https://youtu.be/b', 'B');
  const queue = [a, b];
  const result = removeFromQueue(queue, a.id);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, b.id);
});

test('setItemMode: mode "audio" yapılınca bitrate 192kbps varsayılan atanır', () => {
  const a = createQueueItem('https://youtu.be/a', 'A');
  const queue = [a];
  const result = setItemMode(queue, a.id, 'audio');
  assert.equal(result[0].mode, 'audio');
  assert.equal(result[0].bitrate, '192kbps');
});

test('setItemMode: mode "video" yapılınca bitrate null olur', () => {
  const a = createQueueItem('https://youtu.be/a', 'A');
  a.mode = 'audio';
  a.bitrate = '320kbps';
  const queue = [a];
  const result = setItemMode(queue, a.id, 'video');
  assert.equal(result[0].mode, 'video');
  assert.equal(result[0].bitrate, null);
});

test('setItemQuality: video kalitesini günceller', () => {
  const a = createQueueItem('https://youtu.be/a', 'A');
  const queue = [a];
  const result = setItemQuality(queue, a.id, '720p');
  assert.equal(result[0].quality, '720p');
});

test("setItemQuality: audio modundayken bitrate'i günceller", () => {
  const a = createQueueItem('https://youtu.be/a', 'A');
  a.mode = 'audio';
  const queue = [a];
  const result = setItemQuality(queue, a.id, '320kbps');
  assert.equal(result[0].bitrate, '320kbps');
});

import { groupByDate, filterByPlatform } from '../js/logic.js';

test('filterByPlatform: "all" ise listeyi olduğu gibi döner', () => {
  const items = [{ platform: 'youtube' }, { platform: 'x' }];
  assert.equal(filterByPlatform(items, 'all').length, 2);
});

test('filterByPlatform: verilen platforma göre filtreler', () => {
  const items = [{ platform: 'youtube' }, { platform: 'x' }, { platform: 'youtube' }];
  const result = filterByPlatform(items, 'youtube');
  assert.equal(result.length, 2);
  assert.ok(result.every((i) => i.platform === 'youtube'));
});

test('groupByDate: bugünkü ve dünkü kayıtları ayrı gruplara koyar', () => {
  const now = new Date('2026-09-07T18:00:00');
  const today = new Date('2026-09-07T09:00:00').toISOString();
  const yesterday = new Date('2026-09-06T20:00:00').toISOString();
  const items = [
    { id: '1', downloadedAt: today },
    { id: '2', downloadedAt: yesterday },
  ];
  const groups = groupByDate(items, now);
  assert.deepEqual(Object.keys(groups), ['Bugün', 'Dün']);
  assert.equal(groups['Bugün'].length, 1);
  assert.equal(groups['Dün'].length, 1);
});

test('groupByDate: 7 günden eski kayıt "Daha eski" grubuna girer', () => {
  const now = new Date('2026-09-07T18:00:00');
  const old = new Date('2026-08-01T09:00:00').toISOString();
  const groups = groupByDate([{ id: '1', downloadedAt: old }], now);
  assert.deepEqual(Object.keys(groups), ['Daha eski']);
});

import { oppositeTheme } from '../js/logic.js';

test('oppositeTheme: light -> dark, dark -> light', () => {
  assert.equal(oppositeTheme('light'), 'dark');
  assert.equal(oppositeTheme('dark'), 'light');
});
