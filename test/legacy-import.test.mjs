import assert from 'node:assert/strict';
import test from 'node:test';
import { convertLegacyProject } from '../scripts/legacy-import.mjs';

test('legacy import converts core node types and edges', () => {
  const legacy = {
    slug: 'legacy_demo',
    name: 'Legacy Demo',
    flow: {
      nodes: [
        {
          id: 'img_1',
          type: 'AIImageNode',
          position: { x: 10, y: 20 },
          data: {
            title: 'Legacy Image',
            generationPrompt: 'image prompt',
            imageAsset: { src: '/legacy/image.png', name: 'image.png' },
          },
        },
        {
          id: 'txt_1',
          type: 'AITextNode',
          position: { x: 30, y: 40 },
          data: { content: 'text content' },
        },
      ],
      edges: [{ id: 'edge_1', source: 'txt_1', target: 'img_1' }],
      viewport: { x: 1, y: 2, zoom: 0.9 },
    },
  };

  const { project, report } = convertLegacyProject(legacy, { outSlug: 'legacy_demo_imported' });
  assert.equal(project.slug, 'legacy_demo_imported');
  assert.equal(project.flow.nodes.length, 2);
  assert.equal(project.flow.edges.length, 1);
  assert.equal(project.flow.nodes[0].type, 'imageNode');
  assert.equal(project.flow.nodes[0].data.asset.kind, 'image');
  assert.equal(report.convertedNodes, 2);
  assert.equal(report.migratedAssets, 1);
});

test('legacy import reports unsupported node types', () => {
  const { project, report } = convertLegacyProject({
    slug: 'legacy_bad',
    flow: {
      nodes: [{ id: 'unknown_1', type: 'UnknownNode', position: { x: 0, y: 0 }, data: {} }],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  });

  assert.equal(project.flow.nodes.length, 0);
  assert.equal(report.skippedNodes, 1);
  assert.equal(report.skippedNodeTypes.UnknownNode, 1);
});
