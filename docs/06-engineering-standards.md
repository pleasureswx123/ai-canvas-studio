# Engineering Standards

- Keep components small and feature-scoped.
- Components call feature services or shared API clients; raw `fetch` stays out of UI components.
- Persist only domain state. Avoid saving transient UI focus, hover, and menu state.
- Generated assets, projects, logs, and build output do not belong in source control.
- API errors must be readable and must not corrupt local project files.
- Every milestone must pass `npm run lint`, `npm run build`, Node API smoke test, and media health check.
