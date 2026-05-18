import { apiRequest } from '../../shared/api/client.js';

export function generateImage({
  prompt,
  projectSlug,
  provider,
  model,
  ratio,
  size,
  quality,
  inputImages = [],
  contextText = '',
}) {
  return apiRequest('/api/generate-image', {
    method: 'POST',
    body: { prompt, projectSlug, provider, model, ratio, size, quality, inputImages, contextText },
  });
}

export function generateVideo({
  prompt,
  projectSlug,
  provider,
  model,
  ratio,
  resolution,
  duration,
  scenario,
  inputImages = [],
  firstFrameImage = '',
  lastFrameImage = '',
  contextText = '',
}) {
  return apiRequest('/api/generate-video', {
    method: 'POST',
    body: {
      prompt,
      projectSlug,
      provider,
      model,
      ratio,
      resolution,
      duration,
      scenario,
      inputImages,
      firstFrameImage,
      lastFrameImage,
      contextText,
    },
  });
}

export function getVideoTask(taskId) {
  return apiRequest(`/api/video-task/${encodeURIComponent(taskId)}`);
}
