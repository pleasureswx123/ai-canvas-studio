export function safeAssetName(file) {
  const original = file?.name || 'asset.bin';
  const ext = original.includes('.') ? original.slice(original.lastIndexOf('.')) : '';
  const cleanBase = original
    .replace(ext, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 48);
  return `${Date.now().toString(36)}_${cleanBase || 'asset'}${ext || ''}`;
}

export function inferAssetKind(srcOrName = '') {
  return /\.(mp4|webm|mov|mkv)$/i.test(srcOrName) ? 'video' : 'image';
}
