import fs from 'node:fs/promises';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';

const dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(dirname, '..', '..', '..');
export const PROJECTS_ROOT = path.join(ROOT, 'projects');
export const MATERIAL_ROOT = path.join(ROOT, 'material-library');
export const MATERIAL_ASSETS_ROOT = path.join(MATERIAL_ROOT, 'assets');
export const MATERIAL_INDEX = path.join(MATERIAL_ROOT, 'library_data.json');

const SLUG_RE = /^[a-zA-Z0-9_-]{1,120}$/;
const FILE_RE = /^[a-zA-Z0-9._-]{1,180}$/;

export function nowIso() {
  return new Date().toISOString();
}

export function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
}

export function slugifyName(name) {
  const hash = createHash('sha1').update(`${name}-${Date.now()}`).digest('hex').slice(0, 8);
  return `proj_${Date.now().toString(36)}_${hash}`;
}

export function assertSafeSlug(slug) {
  const value = String(slug || '').trim();
  if (!SLUG_RE.test(value)) throw new Error('Invalid project slug');
  return value;
}

export function assertSafeFileName(fileName) {
  const value = path.basename(String(fileName || '').trim());
  if (!FILE_RE.test(value)) throw new Error('Invalid file name');
  return value;
}

export function projectDir(slug) {
  return path.join(PROJECTS_ROOT, assertSafeSlug(slug));
}

export function projectJsonPath(slug) {
  return path.join(projectDir(slug), 'project_data.json');
}

export function projectAssetsDir(slug) {
  return path.join(projectDir(slug), 'assets');
}

export async function ensureBaseDirs() {
  await fs.mkdir(PROJECTS_ROOT, { recursive: true });
  await fs.mkdir(MATERIAL_ASSETS_ROOT, { recursive: true });
}

export function defaultProject(name, slug = slugifyName(name)) {
  return {
    version: 1,
    slug,
    name: String(name || 'Untitled Project').trim() || 'Untitled Project',
    updatedAt: nowIso(),
    flow: {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  };
}

export function normalizeProjectData(raw, fallback = {}) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const flow = data.flow && typeof data.flow === 'object' ? data.flow : {};
  return {
    version: 1,
    slug: String(data.slug || fallback.slug || ''),
    name: String(data.name || fallback.name || 'Untitled Project'),
    updatedAt: nowIso(),
    flow: {
      nodes: Array.isArray(flow.nodes) ? flow.nodes : [],
      edges: Array.isArray(flow.edges) ? flow.edges : [],
      viewport:
        flow.viewport && typeof flow.viewport === 'object'
          ? flow.viewport
          : { x: 0, y: 0, zoom: 1 },
    },
  };
}

export function normalizePersistedNode(node) {
  const data = node?.data && typeof node.data === 'object' ? node.data : {};
  const nextData = {
    title: typeof data.title === 'string' ? data.title : '',
  };
  if (typeof data.prompt === 'string') nextData.prompt = data.prompt;
  if (typeof data.text === 'string') nextData.text = data.text;
  for (const key of ['provider', 'model', 'ratio', 'size', 'quality', 'resolution', 'duration', 'scenario']) {
    if (typeof data[key] === 'string') nextData[key] = data[key];
  }
  if (data.asset && typeof data.asset === 'object') {
    nextData.asset = {
      src: typeof data.asset.src === 'string' ? data.asset.src : '',
      name: typeof data.asset.name === 'string' ? data.asset.name : '',
      kind: data.asset.kind === 'video' ? 'video' : 'image',
    };
  }
  if (typeof data.taskId === 'string') nextData.taskId = data.taskId;
  if (typeof data.status === 'string') nextData.status = data.status;
  if (data.analysis && typeof data.analysis === 'object') {
    nextData.analysis = data.analysis;
  }
  return {
    id: String(node.id || ''),
    type: String(node.type || ''),
    position: {
      x: Number(node.position?.x) || 0,
      y: Number(node.position?.y) || 0,
    },
    data: nextData,
  };
}

export function normalizeProjectForSave(raw, fallback = {}) {
  const project = normalizeProjectData(raw, fallback);
  project.flow.nodes = project.flow.nodes.map(normalizePersistedNode);
  project.flow.edges = project.flow.edges.map((edge) => ({
    id: String(edge?.id || `${edge?.source || 'source'}-${edge?.target || 'target'}`),
    source: String(edge?.source || ''),
    target: String(edge?.target || ''),
    sourceHandle: edge?.sourceHandle == null ? null : String(edge.sourceHandle),
    targetHandle: edge?.targetHandle == null ? null : String(edge.targetHandle),
  }));
  project.flow.viewport = {
    x: Number(project.flow.viewport?.x) || 0,
    y: Number(project.flow.viewport?.y) || 0,
    zoom: Number(project.flow.viewport?.zoom) || 1,
  };
  return project;
}

export async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function writeJsonAtomic(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, filePath);
}

export async function backupJsonIfExists(filePath) {
  try {
    await fs.copyFile(filePath, path.join(path.dirname(filePath), 'project_data.backup.json'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

export async function listProjects() {
  await ensureBaseDirs();
  const entries = await fs.readdir(PROJECTS_ROOT, { withFileTypes: true });
  const projects = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !SLUG_RE.test(entry.name)) continue;
    const data = await readJson(projectJsonPath(entry.name), null);
    if (!data) continue;
    projects.push({
      slug: entry.name,
      name: data.name || entry.name,
      updatedAt: data.updatedAt || '',
      nodeCount: data.flow?.nodes?.length || 0,
    });
  }
  return projects.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export async function readMaterialIndex() {
  await ensureBaseDirs();
  const data = await readJson(MATERIAL_INDEX, []);
  return Array.isArray(data) ? data : [];
}

export async function writeMaterialIndex(items) {
  await writeJsonAtomic(MATERIAL_INDEX, Array.isArray(items) ? items : []);
}

export function mediaType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml; charset=utf-8';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  return 'application/octet-stream';
}

export function streamFile(res, filePath, fileName) {
  res.writeHead(200, {
    'Content-Type': mediaType(fileName),
    'Cache-Control': 'no-store',
  });
  createReadStream(filePath).pipe(res);
}
