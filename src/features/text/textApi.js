import { apiRequest } from '../../shared/api/client.js';

export function analyzeText(text) {
  return apiRequest('/api/text-analyze', {
    method: 'POST',
    body: { text },
  });
}
