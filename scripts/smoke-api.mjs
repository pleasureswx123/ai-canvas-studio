const base = process.env.NODE_API_ORIGIN || 'http://127.0.0.1:8787';
const mediaBase = process.env.MEDIA_API_ORIGIN || 'http://127.0.0.1:8790';

async function check(pathname) {
  const response = await fetch(`${base}${pathname}`);
  const body = await response.json();
  if (!response.ok || body.ok !== true) {
    throw new Error(`${pathname} failed: ${JSON.stringify(body)}`);
  }
  console.log(`${pathname} ok`);
}

async function jsonRequest(origin, pathname, options = {}) {
  const response = await fetch(`${origin}${pathname}`, {
    ...options,
    headers: {
      ...(options.body && typeof options.body !== 'string' ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });
  const body = await response.json();
  if (!response.ok || body.ok !== true) {
    throw new Error(`${pathname} failed: ${JSON.stringify(body)}`);
  }
  return body.data;
}

await check('/api/health');
await check('/api/project/list');
await check('/api/material-library/list');

const project = await jsonRequest(base, '/api/project/create', {
  method: 'POST',
  body: { name: 'Smoke Project' },
});

try {
  const savedFlow = {
    ...project,
    flow: {
      nodes: [
        {
          id: 'node_smoke_text',
          type: 'textNode',
          position: { x: 10, y: 20 },
          data: { title: 'Smoke Text', text: 'hello smoke' },
        },
      ],
      edges: [],
      viewport: { x: 12, y: 24, zoom: 0.8 },
    },
  };
  await jsonRequest(base, '/api/project/save', {
    method: 'PUT',
    body: { slug: project.slug, data: savedFlow },
  });

  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="#22c55e"/></svg>';
  const uploadResponse = await fetch(
    `${base}/api/project/asset/${encodeURIComponent(project.slug)}/smoke_asset.svg`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'image/svg+xml' },
      body: svg,
    }
  );
  const uploadBody = await uploadResponse.json();
  if (!uploadResponse.ok || uploadBody.ok !== true) throw new Error(`asset upload failed: ${JSON.stringify(uploadBody)}`);

  const image = await jsonRequest(mediaBase, '/api/generate-image', {
    method: 'POST',
    body: { projectSlug: project.slug, provider: 'mock', prompt: 'smoke image' },
  });
  if (!image.src || !image.savedFilename) throw new Error('image generation did not return an asset');

  const submitted = await jsonRequest(mediaBase, '/api/generate-video', {
    method: 'POST',
    body: { projectSlug: project.slug, provider: 'mock', prompt: 'smoke video' },
  });
  const task = await jsonRequest(mediaBase, `/api/video-task/${encodeURIComponent(submitted.taskId)}`);
  if (task.status !== 'SUCCEEDED' || !task.src) throw new Error(`video task did not succeed: ${JSON.stringify(task)}`);

  const loaded = await jsonRequest(base, `/api/project/load?slug=${encodeURIComponent(project.slug)}`);
  if (loaded.flow.nodes.length !== 1 || loaded.flow.viewport.zoom !== 0.8) {
    throw new Error('project reload did not preserve saved flow');
  }

  console.log(`core smoke ok: ${project.slug}`);
} finally {
  await jsonRequest(base, `/api/project/delete?slug=${encodeURIComponent(project.slug)}`, { method: 'DELETE' });
}
