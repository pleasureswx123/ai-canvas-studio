import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  MATERIAL_ASSETS_ROOT,
  assertSafeFileName,
  assertSafeSlug,
  defaultProject,
  ensureBaseDirs,
  listProjects,
  normalizeProjectData,
  normalizeProjectForSave,
  nowIso,
  backupJsonIfExists,
  projectAssetsDir,
  projectDir,
  projectJsonPath,
  readJson,
  streamFile,
  writeJsonAtomic,
} from '../services/storage.js';
import { assertValidProjectData } from '../services/schema.js';

const execFileAsync = promisify(execFile);

function resolveLocalMediaPath(src, expectedSlug) {
  const value = String(src || '');
  if (value.startsWith('/api/project/media/')) {
    const parts = value.slice('/api/project/media/'.length).split('/');
    const slug = assertSafeSlug(decodeURIComponent(parts[0] || ''));
    if (slug !== expectedSlug) throw new Error('Video asset must belong to the current project');
    const fileName = assertSafeFileName(decodeURIComponent(parts[1] || ''));
    return path.join(projectAssetsDir(slug), fileName);
  }
  if (value.startsWith('/api/material-library/media/')) {
    const fileName = assertSafeFileName(decodeURIComponent(value.slice('/api/material-library/media/'.length)));
    return path.join(MATERIAL_ASSETS_ROOT, fileName);
  }
  throw new Error('Only local project or material-library videos can be clipped');
}

async function clipVideoAsset({ slug, src, start, end }) {
  const safeSlug = assertSafeSlug(slug);
  const startSeconds = Number(start);
  const endSeconds = Number(end);
  if (!Number.isFinite(startSeconds) || startSeconds < 0) throw new Error('Clip start must be a non-negative number');
  if (!Number.isFinite(endSeconds) || endSeconds <= startSeconds) throw new Error('Clip end must be greater than start');
  const duration = Math.min(endSeconds - startSeconds, 600);
  const inputPath = resolveLocalMediaPath(src, safeSlug);
  await fs.access(inputPath);
  await fs.mkdir(projectAssetsDir(safeSlug), { recursive: true });
  const outputName = assertSafeFileName(`clip_${Date.now().toString(36)}.mp4`);
  const outputPath = path.join(projectAssetsDir(safeSlug), outputName);
  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-ss',
      String(startSeconds),
      '-i',
      inputPath,
      '-t',
      String(duration),
      '-map',
      '0',
      '-c',
      'copy',
      '-avoid_negative_ts',
      'make_zero',
      outputPath,
    ]);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('ffmpeg is not installed or not available in PATH');
    }
    throw new Error(error.stderr || error.message || 'Video clipping failed');
  }
  return {
    src: `/api/project/media/${encodeURIComponent(safeSlug)}/${encodeURIComponent(outputName)}`,
    name: outputName,
    kind: 'video',
  };
}

export async function handleProjectRoute(req, res, url, body, send) {
  if (req.method === 'GET' && url.pathname === '/api/project/list') {
    send(res, 200, await listProjects());
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/project/create') {
    const project = defaultProject(body?.name);
    await ensureBaseDirs();
    await fs.mkdir(projectAssetsDir(project.slug), { recursive: true });
    await writeJsonAtomic(projectJsonPath(project.slug), project);
    send(res, 200, project);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/project/load') {
    const slug = assertSafeSlug(url.searchParams.get('slug'));
    const project = await readJson(projectJsonPath(slug), null);
    if (!project) throw new Error('Project not found');
    send(res, 200, normalizeProjectData(project, { slug }));
    return true;
  }

  if (req.method === 'PUT' && url.pathname === '/api/project/save') {
    const slug = assertSafeSlug(body?.slug);
    const existing = await readJson(projectJsonPath(slug), null);
    if (!existing) throw new Error('Project not found');
    const project = normalizeProjectForSave(body?.data, { slug, name: existing.name });
    project.slug = slug;
    project.name = String(project.name || existing.name || 'Untitled Project');
    project.updatedAt = nowIso();
    assertValidProjectData(project);
    await backupJsonIfExists(projectJsonPath(slug));
    await writeJsonAtomic(projectJsonPath(slug), project);
    send(res, 200, project);
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/project/rename') {
    const slug = assertSafeSlug(body?.slug);
    const project = await readJson(projectJsonPath(slug), null);
    if (!project) throw new Error('Project not found');
    project.name = String(body?.name || '').trim() || project.name;
    project.updatedAt = nowIso();
    await writeJsonAtomic(projectJsonPath(slug), project);
    send(res, 200, project);
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/project/clip-video') {
    send(res, 200, await clipVideoAsset(body || {}));
    return true;
  }

  if (req.method === 'DELETE' && url.pathname === '/api/project/delete') {
    const slug = assertSafeSlug(url.searchParams.get('slug'));
    await fs.rm(projectDir(slug), { recursive: true, force: true });
    send(res, 200, { slug });
    return true;
  }

  if (req.method === 'PUT' && url.pathname.startsWith('/api/project/asset/')) {
    const parts = url.pathname.slice('/api/project/asset/'.length).split('/');
    const slug = assertSafeSlug(decodeURIComponent(parts[0] || ''));
    const fileName = assertSafeFileName(decodeURIComponent(parts[1] || ''));
    await fs.mkdir(projectAssetsDir(slug), { recursive: true });
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    await fs.writeFile(path.join(projectAssetsDir(slug), fileName), Buffer.concat(chunks));
    send(res, 200, {
      src: `/api/project/media/${encodeURIComponent(slug)}/${encodeURIComponent(fileName)}`,
      name: fileName,
    });
    return true;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/project/media/')) {
    const parts = url.pathname.slice('/api/project/media/'.length).split('/');
    const slug = assertSafeSlug(decodeURIComponent(parts[0] || ''));
    const fileName = assertSafeFileName(decodeURIComponent(parts[1] || ''));
    streamFile(res, path.join(projectAssetsDir(slug), fileName), fileName);
    return true;
  }

  return false;
}
