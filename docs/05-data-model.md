# Data Model

## ProjectData

```json
{
  "version": 1,
  "slug": "proj_x",
  "name": "Untitled",
  "updatedAt": "2026-05-18T00:00:00.000Z",
  "flow": {
    "nodes": [],
    "edges": [],
    "viewport": { "x": 0, "y": 0, "zoom": 1 }
  }
}
```

The Node API validates this shape before saving. Invalid saves are rejected before `project_data.json` is overwritten.

## Node Data

- `image`: `{ "title", "prompt", "asset": { "src", "name", "kind" } }`
- `video`: `{ "title", "prompt", "asset": { "src", "name", "kind" }, "taskId", "status" }`
- `text`: `{ "title", "text" }`

Image/video nodes may also persist generation settings:

```json
{
  "provider": "mock",
  "model": "seed-2-720p",
  "ratio": "16:9",
  "size": "1024x1024",
  "quality": "auto",
  "resolution": "720p",
  "duration": "5",
  "scenario": "text"
}
```

Runtime-only upstream context (`upstreamImages`, `upstreamText`, `upstreamSummary`) is derived from graph edges and is not persisted.

Image edit operations, such as crop and annotation, do not introduce a separate edit-history model in Phase 5. The browser exports the edited bitmap as a new project asset, then replaces the node `asset` reference with the uploaded file.

Mention references use the lightweight persisted text form:

```text
@[Node Title](node:node_id)
```

At runtime, referenced node text and image assets are added to the same generation context as connected upstream nodes.

## MaterialItem

```json
{
  "id": "mat_x",
  "name": "Reference",
  "category": "其他",
  "kind": "image",
  "src": "/api/material-library/media/file.png",
  "createdAt": "2026-05-18T00:00:00.000Z"
}
```

## Legacy Mapping

Legacy `AIImageNode.data.imageAsset` maps to milestone `image.data.asset`. Legacy `AIVideoNode.data.generatedVideo` maps to milestone `video.data.asset`. Unknown legacy UI-only fields are ignored during future import.

See `docs/08-legacy-mapping.md` for the executable migration mapping.

## Backup Policy

Before each successful save, Node API copies the previous `project_data.json` to `project_data.backup.json` in the same project directory.
