# Architecture

## Runtime

- Vite Web runs on `5174`.
- Node API runs on `8787` and owns project/material-library files.
- Python media service runs on `8790` and owns generation tasks.
- Vite proxies `/api/generate-*`, `/api/video-task/*`, and `/api/media-health` to Python. Other `/api/*` routes go to Node.

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
