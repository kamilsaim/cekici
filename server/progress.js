export function parseProgressLine(line) {
  const match = line.match(/\[download\]\s+(\d{1,3}(?:\.\d+)?)%/);
  if (!match) return null;
  return Math.min(100, Math.round(parseFloat(match[1])));
}
