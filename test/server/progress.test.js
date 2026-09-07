import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProgressLine } from '../../server/progress.js';

test('parseProgressLine: normal ilerleme satırından yüzdeyi çıkarır', () => {
  assert.equal(parseProgressLine('[download]  42.3% of ~10.00MiB at 1.20MiB/s ETA 00:05'), 42);
});

test('parseProgressLine: %100 satırını tanır', () => {
  assert.equal(parseProgressLine('[download] 100% of 10.00MiB in 00:08'), 100);
});

test('parseProgressLine: ilerleme içermeyen satırda null döner', () => {
  assert.equal(parseProgressLine('[Merger] Merging formats into "video.mp4"'), null);
  assert.equal(parseProgressLine(''), null);
});
