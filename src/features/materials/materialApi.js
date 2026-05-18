import { apiRequest } from '../../shared/api/client.js';

export function listMaterials() {
  return apiRequest('/api/material-library/list');
}

export function saveMaterial(payload) {
  return apiRequest('/api/material-library/save', {
    method: 'POST',
    body: payload,
  });
}

export function deleteMaterial(id) {
  return apiRequest(`/api/material-library/item/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
