export function detectPlatform(url) {
  if (typeof url !== 'string') return 'unknown';
  try {
    const { hostname } = new URL(url);
    const host = hostname.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') return 'youtube';
    if (host === 'instagram.com') return 'instagram';
    if (host === 'x.com' || host === 'twitter.com') return 'x';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

let nextId = 1;

export function createQueueItem(url, title) {
  return {
    id: `q${nextId++}`,
    url,
    title,
    platform: detectPlatform(url),
    mode: 'video',
    quality: '1080p',
    bitrate: null,
  };
}

export function addToQueue(queue, item) {
  return [...queue, item];
}

export function removeFromQueue(queue, id) {
  return queue.filter((item) => item.id !== id);
}

export function setItemMode(queue, id, mode) {
  return queue.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      mode,
      bitrate: mode === 'audio' ? (item.bitrate ?? '192kbps') : null,
    };
  });
}

export function setItemQuality(queue, id, value) {
  return queue.map((item) => {
    if (item.id !== id) return item;
    return item.mode === 'audio' ? { ...item, bitrate: value } : { ...item, quality: value };
  });
}

export function filterByPlatform(items, platform) {
  if (platform === 'all') return items;
  return items.filter((item) => item.platform === platform);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function groupByDate(items, now = new Date()) {
  const today = startOfDay(now);
  const yesterday = today - 86400000;
  const weekAgo = today - 6 * 86400000;

  const groups = {};
  const order = ['Bugün', 'Dün', 'Bu hafta', 'Daha eski'];

  for (const item of items) {
    const day = startOfDay(item.downloadedAt);
    let label;
    if (day === today) label = 'Bugün';
    else if (day === yesterday) label = 'Dün';
    else if (day >= weekAgo) label = 'Bu hafta';
    else label = 'Daha eski';

    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }

  const ordered = {};
  for (const label of order) {
    if (groups[label]) ordered[label] = groups[label];
  }
  return ordered;
}

export function oppositeTheme(theme) {
  return theme === 'dark' ? 'light' : 'dark';
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
