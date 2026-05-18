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

## Verification

Use `npm run verify` before merging substantial changes. It runs lint, JavaScript tests, Python tests, production build, and API smoke checks in sequence.

Use `npm run test:e2e` for browser-level smoke coverage. The current Playwright smoke creates a project, adds a text node, saves the canvas, reloads the app, reopens the project, and verifies the node content is restored.

Use `npm run verify:e2e` before merging changes that affect canvas interactions, project persistence, routing, or the frontend build/runtime boundary. It runs the base verification gate first, then the Playwright browser smoke.
