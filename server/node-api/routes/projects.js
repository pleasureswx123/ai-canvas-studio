import fs from 'node:fs/promises';
import path from 'node:path';
import {
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
