# Architecture

## Runtime

- Vite Web runs on `5174`.
- Node API runs on `8787` and owns project/material-library files.
- Python media service runs on `8790` and owns generation tasks.
- Vite proxies `/api/generate-*`, `/api/video-task/*`, and `/api/media-health` to Python. Other `/api/*` routes go to Node.

## Technology

- Frontend: React 19, Vite 8, React Flow, lucide-react, Playwright.
- Node API: Node.js ESM, native `node:http`, local filesystem storage.
- Media service: Python 3, provider adapter pattern.
- Storage: local files only.

Not used currently: PostgreSQL, Redis, cloud object storage, login/auth, queue workers, ORM.

## Storage

```text
my-canvas-next/
  projects/
    <slug>/
      project_data.json
      assets/
  material-library/
    library_data.json
    assets/
```

## Legacy Reference

The old project stores React Flow data under `project_data.json.flow.nodes`, `flow.edges`, and `flow.viewport`. The new project keeps that broad shape but uses a smaller, documented node data contract for milestone 1.

## Deployment Direction

Deployment is intentionally postponed until product polish is stronger. The intended production topology is Docker Compose plus Nginx:

- Nginx serves built frontend assets and proxies API routes.
- Node API runs as its own container.
- Python media service runs as its own container with ffmpeg available.
- `projects/`, `material-library/`, and `logs/` become mounted volumes.
