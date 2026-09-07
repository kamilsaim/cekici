import fs from 'node:fs';
import path from 'node:path';

export function readHistory(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function writeHistory(filePath, entries) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
}

export function addHistoryEntry(filePath, entry) {
  const entries = readHistory(filePath);
  entries.unshift(entry);
  writeHistory(filePath, entries);
  return entries;
}

export function deleteHistoryEntry(filePath, id) {
  const entries = readHistory(filePath).filter((e) => e.id !== id);
  writeHistory(filePath, entries);
  return entries;
}

export function clearHistoryFile(filePath) {
  writeHistory(filePath, []);
  return [];
}
