import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDownloadArgs, bitrateToYtdlpQuality } from '../../server/ytdlp-args.js';

test('bitrateToYtdlpQuality: bilinen bitrate değerlerini eşler', () => {
  assert.equal(bitrateToYtdlpQuality('128kbps'), '128K');
  assert.equal(bitrateToYtdlpQuality('192kbps'), '192K');
  assert.equal(bitrateToYtdlpQuality('320kbps'), '320K');
});

test('bitrateToYtdlpQuality: bilinmeyen değerde 192K varsayılanına döner', () => {
  assert.equal(bitrateToYtdlpQuality('999kbps'), '192K');
});

test('buildDownloadArgs: video modunda yükseklik sınırlı format seçer', () => {
  const args = buildDownloadArgs({
    url: 'https://youtu.be/abc',
    mode: 'video',
    quality: '720p',
    outputTemplate: 'out/%(title)s.%(ext)s',
  });
  assert.ok(args.includes('-f'));
  assert.ok(args.includes('bestvideo[height<=720]+bestaudio/best[height<=720]/best'));
  assert.ok(args.includes('--merge-output-format'));
  assert.ok(args.includes('mp4'));
  assert.equal(args.at(-1), 'https://youtu.be/abc');
});

test('buildDownloadArgs: ses modunda mp3 çıkarma argümanlarını ekler', () => {
  const args = buildDownloadArgs({
    url: 'https://youtu.be/abc',
    mode: 'audio',
    bitrate: '320kbps',
    outputTemplate: 'out/%(title)s.%(ext)s',
  });
  assert.ok(args.includes('-x'));
  assert.ok(args.includes('--audio-format'));
  assert.ok(args.includes('mp3'));
  assert.ok(args.includes('--audio-quality'));
  assert.ok(args.includes('320K'));
});

test('buildDownloadArgs: her zaman --newline ve -o içerir', () => {
  const args = buildDownloadArgs({
    url: 'https://youtu.be/abc',
    mode: 'video',
    quality: '1080p',
    outputTemplate: 'out/%(title)s.%(ext)s',
  });
  assert.ok(args.includes('--newline'));
  const oIndex = args.indexOf('-o');
  assert.ok(oIndex !== -1);
  assert.equal(args[oIndex + 1], 'out/%(title)s.%(ext)s');
});

test('buildDownloadArgs: format zinciri koşulsuz bir yedekle biter', () => {
  // Instagram/X formatlarında çoğu zaman "height" alanı yok; height<=N
  // filtreleri hepsini eleyince yt-dlp "Requested format is not available"
  // hatası veriyordu. Zincirin sonunda her zaman çıplak "best" olmalı.
  const args = buildDownloadArgs({
    url: 'https://www.instagram.com/reel/DdBqCzkguSC/',
    mode: 'video',
    quality: '720p',
    outputTemplate: 'out/%(title)s.%(ext)s',
  });
  const selector = args[args.indexOf('-f') + 1];
  assert.ok(selector.endsWith('/best'), `zincir çıplak "best" ile bitmeli, gelen: ${selector}`);
});
