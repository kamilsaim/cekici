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
