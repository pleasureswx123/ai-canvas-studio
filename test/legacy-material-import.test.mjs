import assert from 'node:assert/strict';
import test from 'node:test';
import { convertLegacyMaterialItem, normalizeLegacyLibrary } from '../scripts/legacy-material-import.mjs';

function report() {
  return {
    sourceAssetsDir: 'D:/legacy/material-library/assets',
    skippedItems: 0,
    missingAssetPath: 0,
    renamedFiles: 0,
    seedanceReviewItems: 0,
  };
}

test('normalizes wrapped and array material libraries', () => {
  assert.equal(normalizeLegacyLibrary([{ id: 'a' }]).length, 1);
  assert.equal(normalizeLegacyLibrary({ items: [{ id: 'b' }] }).length, 1);
  assert.equal(normalizeLegacyLibrary({ items: null }).length, 0);
});

test('converts legacy material item and preserves Seedance review', () => {
  const state = report();
  const item = convertLegacyMaterialItem(
    {
      id: 'material_1',
      name: '角色',
      category: '人物',
      kind: 'image',
      assetPath: 'face.png',
      coverPath: 'face.png',
      width: 512,
      height: 768,
      seedanceFaceReview: {
        status: 'approved',
        assetId: 'asset-1',
        assetRef: 'asset://asset-1',
        assetStatus: 'Active',
      },
      createdAt: '2026-05-18T00:00:00.000Z',
    },
    state
  );

  assert.equal(item.id, 'material_1');
  assert.equal(item.kind, 'image');
  assert.match(item.src, /\/api\/material-library\/media\/material_1_face\.png/);
  assert.equal(item.seedanceFaceReview.status, 'approved');
  assert.equal(state.seedanceReviewItems, 1);
});

test('skips materials without asset path', () => {
  const state = report();
  const item = convertLegacyMaterialItem({ id: 'missing' }, state);
  assert.equal(item, null);
  assert.equal(state.skippedItems, 1);
  assert.equal(state.missingAssetPath, 1);
});
