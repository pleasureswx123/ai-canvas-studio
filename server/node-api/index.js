import http from 'node:http';
import { handleMaterialRoute } from './routes/materials.js';
import { handleProjectRoute } from './routes/projects.js';
import { handleTextRoute } from './routes/text.js';
import { ensureBaseDirs } from './services/storage.js';

const PORT = Number(process.env.NODE_API_PORT || 8787);

function send(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ ok: statusCode < 400, data }));
}

function sendError(res, statusCode, error) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ ok: false, error: { message: error?.message || String(error) } }));
}

async function readBody(req) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return null;
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) return null;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : null;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Project-Slug');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
    if (req.method === 'GET' && url.pathname === '/api/health') {
      send(res, 200, { service: 'node-api', status: 'ok' });
      return;
    }
    const body = await readBody(req);
    if (await handleProjectRoute(req, res, url, body, send)) return;
    if (await handleMaterialRoute(req, res, url, body, send)) return;
    if (await handleTextRoute(req, res, url, body, send)) return;
    sendError(res, 404, new Error('Not found'));
  } catch (error) {
    sendError(res, 500, error);
  }
});

await ensureBaseDirs();
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Node API running at http://127.0.0.1:${PORT}`);
});
