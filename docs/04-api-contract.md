# API Contract

All Node API responses use:

```json
{ "ok": true, "data": {} }
```

or:

```json
{ "ok": false, "error": { "message": "Readable message" } }
```

## Projects

- `GET /api/health`
- `GET /api/project/list`
- `POST /api/project/create` body `{ "name": "Project name" }`
- `GET /api/project/load?slug=<slug>`
- `PUT /api/project/save` body `{ "slug": "...", "data": ProjectData }`
- `POST /api/project/rename` body `{ "slug": "...", "name": "New name" }`
- `DELETE /api/project/delete?slug=<slug>`
- `PUT /api/project/asset/:slug/:filename`
- `GET /api/project/media/:slug/:filename`

## Materials

- `GET /api/material-library/list`
- `POST /api/material-library/save` body `{ "name", "category", "src", "kind" }`
- `DELETE /api/material-library/item/:id`
- `GET /api/material-library/media/:filename`

## Media Service

- `GET /api/media-health`
- `POST /api/generate-image` body `{ "prompt", "projectSlug", "provider", "model", "ratio", "size", "quality", "inputImages", "contextText" }`
- `POST /api/generate-video` body `{ "prompt", "projectSlug", "provider", "model", "ratio", "resolution", "duration", "scenario", "inputImages", "firstFrameImage", "lastFrameImage", "contextText" }`
- `GET /api/video-task/:taskId`

Milestone 1 uses a local mock provider so the chain can be tested without vendor credentials.

## Text

- `POST /api/text-analyze` body `{ "text": "..." }`

Returns a local analysis object with `summary`, `keywords`, and `stats`. The API boundary is intentionally stable so a model-backed analyzer can replace the local implementation later.
