import { apiRequest, uploadBinary } from '../../shared/api/client.js';
import { safeAssetName } from '../../shared/utils/files.js';

export function listProjects() {
  return apiRequest('/api/project/list');
}

export function createProject(name) {
  return apiRequest('/api/project/create', { method: 'POST', body: { name } });
}

export function loadProject(slug) {
  return apiRequest(`/api/project/load?slug=${encodeURIComponent(slug)}`);
}

export function saveProject(slug, data) {
  return apiRequest('/api/project/save', { method: 'PUT', body: { slug, data } });
}

export function renameProject(slug, name) {
  return apiRequest('/api/project/rename', { method: 'POST', body: { slug, name } });
}

export function deleteProject(slug) {
  return apiRequest(`/api/project/delete?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });
}

export function uploadProjectAsset(slug, file) {
  const fileName = safeAssetName(file);
  return uploadBinary(`/api/project/asset/${encodeURIComponent(slug)}/${encodeURIComponent(fileName)}`, file);
}

export function clipProjectVideo({ slug, src, start, end }) {
  return apiRequest('/api/project/clip-video', {
    method: 'POST',
    timeoutMs: 120000,
    body: { slug, src, start, end },
  });
}
