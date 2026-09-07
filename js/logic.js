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
