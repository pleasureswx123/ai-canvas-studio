import fs from 'node:fs/promises';
import path from 'node:path';
import {
  MATERIAL_ASSETS_ROOT,
  assertSafeFileName,
  makeId,
  nowIso,
  readMaterialIndex,
  streamFile,
  writeMaterialIndex,
} from '../services/storage.js';

function extensionFromKind(kind) {
  return kind === 'video' ? '.mp4' : '.svg';
}

async function copyRemoteOrLocalAsset(src, fileName) {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Unable to read material source: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  await fs.mkdir(MATERIAL_ASSETS_ROOT, { recursive: true });
  await fs.writeFile(path.join(MATERIAL_ASSETS_ROOT, fileName), Buffer.from(arrayBuffer));
}

export async function handleMaterialRoute(req, res, url, body, send) {
  if (req.method === 'GET' && url.pathname === '/api/material-library/list') {
    send(res, 200, await readMaterialIndex());
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/material-library/save') {
    const items = await readMaterialIndex();
    const kind = body?.kind === 'video' ? 'video' : 'image';
    const id = makeId('mat');
    const sourceName = body?.src ? path.basename(String(body.src).split('?')[0]) : '';
    const ext = path.extname(sourceName) || extensionFromKind(kind);
    const fileName = assertSafeFileName(`${id}${ext}`);
    await copyRemoteOrLocalAsset(body?.src, fileName);
    const item = {
      id,
      name: String(body?.name || 'Untitled Material'),
      category: String(body?.category || '其他'),
      kind,
      src: `/api/material-library/media/${encodeURIComponent(fileName)}`,
      createdAt: nowIso(),
    };
    items.unshift(item);
    await writeMaterialIndex(items);
    send(res, 200, item);
    return true;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/material-library/item/')) {
    const id = decodeURIComponent(url.pathname.slice('/api/material-library/item/'.length));
    const items = await readMaterialIndex();
    const next = items.filter((item) => item.id !== id);
    await writeMaterialIndex(next);
    send(res, 200, { id });
    return true;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/material-library/media/')) {
    const fileName = assertSafeFileName(decodeURIComponent(url.pathname.slice('/api/material-library/media/'.length)));
    streamFile(res, path.join(MATERIAL_ASSETS_ROOT, fileName), fileName);
    return true;
  }

  return false;
}
