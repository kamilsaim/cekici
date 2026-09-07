const BITRATE_MAP = {
  '128kbps': '128K',
  '192kbps': '192K',
  '320kbps': '320K',
};

export function bitrateToYtdlpQuality(bitrate) {
  return BITRATE_MAP[bitrate] ?? '192K';
}

export function buildDownloadArgs({ url, mode, quality, bitrate, outputTemplate }) {
  const args = ['--newline', '-o', outputTemplate];

  if (mode === 'audio') {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', bitrateToYtdlpQuality(bitrate));
  } else {
    const height = quality.replace('p', '');
    args.push('-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`, '--merge-output-format', 'mp4');
  }

  args.push(url);
  return args;
}
