import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createJobStore } from '../../server/jobs.js';

test('createJob: queued durumunda, %0 ilerlemeyle job oluşturur', () => {
  const store = createJobStore();
  const job = store.createJob({ id: 'j1', url: 'https://youtu.be/a', mode: 'video', quality: '1080p', title: 'A', platform: 'youtube' });
  assert.equal(job.status, 'queued');
  assert.equal(job.progress, 0);
  assert.equal(store.getJob('j1').status, 'queued');
});

test('getJob: olmayan id için null döner', () => {
  const store = createJobStore();
  assert.equal(store.getJob('yok'), null);
});

test('nextQueued: en eski queued job\'ı döner, yoksa null', () => {
  const store = createJobStore();
  assert.equal(store.nextQueued(), null);
  const a = store.createJob({ id: 'a', url: 'u', mode: 'video', quality: '1080p', title: 'A', platform: 'youtube' });
  store.createJob({ id: 'b', url: 'u', mode: 'video', quality: '1080p', title: 'B', platform: 'youtube' });
  assert.equal(store.nextQueued().id, a.id);
});

test('markDownloading + updateProgress: durum ve ilerlemeyi günceller', () => {
  const store = createJobStore();
  store.createJob({ id: 'a', url: 'u', mode: 'video', quality: '1080p', title: 'A', platform: 'youtube' });
  store.markDownloading('a');
  store.updateProgress('a', 55);
  const job = store.getJob('a');
  assert.equal(job.status, 'downloading');
  assert.equal(job.progress, 55);
});

test('completeJob: durumu completed yapar, progress 100 ve historyId atanır', () => {
  const store = createJobStore();
  store.createJob({ id: 'a', url: 'u', mode: 'video', quality: '1080p', title: 'A', platform: 'youtube' });
  store.completeJob('a', 'hist-1');
  const job = store.getJob('a');
  assert.equal(job.status, 'completed');
  assert.equal(job.progress, 100);
  assert.equal(job.historyId, 'hist-1');
});

test('failJob: durumu failed yapar ve hata mesajını kaydeder', () => {
  const store = createJobStore();
  store.createJob({ id: 'a', url: 'u', mode: 'video', quality: '1080p', title: 'A', platform: 'youtube' });
  store.failJob('a', 'ağ hatası');
  const job = store.getJob('a');
  assert.equal(job.status, 'failed');
  assert.equal(job.error, 'ağ hatası');
});

test('nextQueued: downloading/completed/failed durumundaki job\'ları atlar', () => {
  const store = createJobStore();
  store.createJob({ id: 'a', url: 'u', mode: 'video', quality: '1080p', title: 'A', platform: 'youtube' });
  store.markDownloading('a');
  const b = store.createJob({ id: 'b', url: 'u', mode: 'video', quality: '1080p', title: 'B', platform: 'youtube' });
  assert.equal(store.nextQueued().id, b.id);
});
