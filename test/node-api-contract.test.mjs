import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import test from 'node:test';

const PORT = 18879;
const base = `http://127.0.0.1:${PORT}`;

async function waitForHealth(process) {
  const deadline = Date.now() + 8000;
  let lastError = null;
  while (Date.now() < deadline) {
    if (process.exitCode != null) break;
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw lastError || new Error('Node API did not become healthy');
}

async function request(pathname, options = {}) {
  const response = await fetch(`${base}${pathname}`, {
    ...options,
    headers: {
      ...(options.body && typeof options.body !== 'string' ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });
  const payload = await response.json();
  return { response, payload };
}

test('Node API contract creates, saves, loads, rejects invalid save, and deletes project', async () => {
  const server = spawn(process.execPath, ['server/node-api/index.js'], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_API_PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const errors = [];
  server.stderr.on('data', (chunk) => errors.push(String(chunk)));

  try {
    await waitForHealth(server);
    const health = await request('/api/health');
    assert.equal(health.response.status, 200);
    assert.equal(health.payload.ok, true);
    assert.equal(health.payload.data.service, 'node-api');

    const created = await request('/api/project/create', {
      method: 'POST',
      body: { name: 'Contract Project' },
    });
    assert.equal(created.response.status, 200);
    assert.equal(created.payload.ok, true);
    assert.match(created.payload.data.slug, /^proj_/);

    const project = created.payload.data;
    const saved = await request('/api/project/save', {
      method: 'PUT',
      body: {
        slug: project.slug,
        data: {
          ...project,
          flow: {
            nodes: [
              {
                id: 'contract_text',
                type: 'textNode',
                position: { x: 1, y: 2 },
                data: { title: 'Contract Text', text: 'hello' },
              },
            ],
            edges: [],
            viewport: { x: 3, y: 4, zoom: 1.2 },
          },
        },
      },
    });
    assert.equal(saved.response.status, 200);
    assert.equal(saved.payload.ok, true);

    const invalid = await request('/api/project/save', {
      method: 'PUT',
      body: {
        slug: project.slug,
        data: {
          ...project,
          flow: {
            nodes: [],
            edges: [{ id: 'bad_edge', source: 'a', target: 'b' }],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
        },
      },
    });
    assert.equal(invalid.payload.ok, false);
    assert.match(invalid.payload.error.message, /Invalid project data/);

    const loaded = await request(`/api/project/load?slug=${encodeURIComponent(project.slug)}`);
    assert.equal(loaded.response.status, 200);
    assert.equal(loaded.payload.data.flow.nodes.length, 1);

    const deleted = await request(`/api/project/delete?slug=${encodeURIComponent(project.slug)}`, { method: 'DELETE' });
    assert.equal(deleted.response.status, 200);
    assert.equal(deleted.payload.ok, true);
  } finally {
    server.kill();
    await once(server, 'exit').catch(() => {});
  }

  assert.deepEqual(errors, []);
});
