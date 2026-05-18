import assert from 'node:assert/strict';
import test from 'node:test';
import { validateProjectData } from '../server/node-api/services/schema.js';

function validProject(overrides = {}) {
  return {
    version: 1,
    slug: 'proj_test',
    name: 'Test Project',
    updatedAt: '2026-05-18T00:00:00.000Z',
    cover: null,
    history: [],
    flow: {
      nodes: [
        {
          id: 'node_1',
          type: 'imageNode',
          position: { x: 0, y: 0 },
          data: {
            title: 'Image',
            prompt: 'hello',
            asset: { src: '/api/project/media/proj_test/a.png', name: 'a.png', kind: 'image' },
          },
        },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    ...overrides,
  };
}

test('valid project data accepts Phase 5 fields', () => {
  const project = validProject({
    cover: { src: '/api/project/media/proj_test/a.png', name: 'a.png', kind: 'image', updatedAt: '2026-05-18T00:00:00.000Z' },
    history: [
      {
        id: 'hist_1',
        nodeId: 'node_1',
        nodeTitle: 'Image',
        kind: 'image',
        prompt: 'hello',
        provider: 'mock',
        model: 'mock',
        asset: { src: '/api/project/media/proj_test/a.png', name: 'a.png', kind: 'image' },
        createdAt: '2026-05-18T00:00:00.000Z',
      },
    ],
  });
  const result = validateProjectData(project);
  assert.equal(result.ok, true, result.errors.join('; '));
});

test('schema rejects edges that reference missing nodes', () => {
  const project = validProject({
    flow: {
      nodes: [],
      edges: [{ id: 'edge_1', source: 'missing_a', target: 'missing_b' }],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  });
  const result = validateProjectData(project);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /source must reference an existing node/);
});

test('schema rejects invalid asset kind', () => {
  const project = validProject();
  project.flow.nodes[0].data.asset.kind = 'audio';
  const result = validateProjectData(project);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /kind must be image or video/);
});
