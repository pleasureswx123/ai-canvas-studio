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

function normalizeSeedanceFaceReview(review) {
  if (!review || typeof review !== 'object') return null;
  const status = String(review.status || '').trim().toLowerCase();
  if (!status) return null;
  return {
    status,
    assetId: String(review.assetId || review.asset_id || '').trim(),
    assetRef: String(review.assetRef || review.asset_ref || '').trim(),
    assetStatus: String(review.assetStatus || review.asset_status || '').trim(),
    message: String(review.message || '').trim(),
    updatedAt: String(review.updatedAt || review.updated_at || nowIso()).trim(),
  };
}

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

function materialMediaAbsoluteUrl(req, src) {
  const host = req.headers.host || `127.0.0.1:${process.env.NODE_API_PORT || 8787}`;
  return `http://${host}${src}`;
}

async function requestSeedanceReview(req, item, body) {
  const manualRef = String(body?.assetRef || body?.asset_ref || '').trim();
  if (manualRef) {
    return {
      status: 'approved',
      assetId: manualRef.replace(/^asset:\/\//, ''),
      assetRef: manualRef.startsWith('asset://') ? manualRef : `asset://${manualRef}`,
      assetStatus: 'Active',
      message: 'Approved asset reference recorded manually',
      updatedAt: nowIso(),
    };
  }

  const origin = String(process.env.MEDIA_SERVICE_ORIGIN || 'http://127.0.0.1:8790').replace(/\/+$/, '');
  const response = await fetch(`${origin}/api/seedance-face-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: materialMediaAbsoluteUrl(req, item.src),
      name: item.name || 'seedance-face-review',
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload?.error?.message || `Seedance review failed: ${response.status}`);
  }
  return normalizeSeedanceFaceReview(payload.data || payload);
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
      seedanceFaceReview: normalizeSeedanceFaceReview(body?.seedanceFaceReview),
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

  if (req.method === 'POST' && url.pathname.startsWith('/api/material-library/seedance-review/')) {
    const id = decodeURIComponent(url.pathname.slice('/api/material-library/seedance-review/'.length));
    const items = await readMaterialIndex();
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Material not found');
    const item = items[index];
    if (item.kind !== 'image') throw new Error('Seedance review only supports image materials');
    const review = await requestSeedanceReview(req, item, body || {});
    items[index] = { ...item, seedanceFaceReview: review };
    await writeMaterialIndex(items);
    send(res, 200, items[index]);
    return true;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/material-library/media/')) {
    const fileName = assertSafeFileName(decodeURIComponent(url.pathname.slice('/api/material-library/media/'.length)));
    streamFile(res, path.join(MATERIAL_ASSETS_ROOT, fileName), fileName);
    return true;
  }

  return false;
}
