# Engineering Standards

- Keep components small and feature-scoped.
- Components call feature services or shared API clients; raw `fetch` stays out of UI components.
- Persist only domain state. Avoid saving transient UI focus, hover, and menu state.
- Generated assets, projects, logs, and build output do not belong in source control.
- API errors must be readable and must not corrupt local project files.
- Every milestone must pass `npm run lint`, `npm test`, `npm run build`, Node API smoke test, and media health check.

## Feature Flags

Phase 5 advanced UI is guarded by frontend environment flags. All flags default to enabled; set a flag to `0`, `false`, `off`, or `no` to hide that advanced entry point without changing saved project data.

```env
VITE_FEATURE_IMAGE_EDIT=1
VITE_FEATURE_VIDEO_FRAMES=1
VITE_FEATURE_VIDEO_CLIP=1
VITE_FEATURE_MATERIAL_FILTERS=1
VITE_FEATURE_MATERIAL_REVIEW=1
VITE_FEATURE_PROJECT_HISTORY=1
```

Core canvas behavior, project save/load, material upload, and generation requests must continue to work when any advanced flag is disabled.
