const now = new Date();
function hoursAgo(h) {
  return new Date(now.getTime() - h * 3600 * 1000).toISOString();
}

export const initialHistory = [
  {
    id: 'h1',
    title: 'Gitar Dersi #4 - Akorlar',
    platform: 'youtube',
    downloadedAt: hoursAgo(3),
    meta: '1080p · 24MB',
  },
  {
    id: 'h2',
    title: 'Reels - Yemek tarifi',
    platform: 'instagram',
    downloadedAt: hoursAgo(7),
    meta: '🎵 192kbps · 3.1MB',
  },
  {
    id: 'h3',
    title: 'Haber klibi - Gündem',
    platform: 'x',
    downloadedAt: hoursAgo(26),
    meta: '720p · 11MB',
  },
];
