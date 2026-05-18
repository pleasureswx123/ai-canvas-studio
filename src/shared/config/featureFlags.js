function enabled(name, defaultValue = true) {
  const value = String(import.meta.env[name] ?? '').trim().toLowerCase();
  if (!value) return defaultValue;
  return !['0', 'false', 'off', 'no'].includes(value);
}

export const featureFlags = {
  imageEdit: enabled('VITE_FEATURE_IMAGE_EDIT'),
  videoFrames: enabled('VITE_FEATURE_VIDEO_FRAMES'),
  videoClip: enabled('VITE_FEATURE_VIDEO_CLIP'),
  materialFilters: enabled('VITE_FEATURE_MATERIAL_FILTERS'),
  materialReview: enabled('VITE_FEATURE_MATERIAL_REVIEW'),
  projectHistory: enabled('VITE_FEATURE_PROJECT_HISTORY'),
};
