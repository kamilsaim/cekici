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
