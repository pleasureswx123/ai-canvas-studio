# Legacy Mapping

旧项目只作为只读参考。迁移通过 `scripts/legacy-import.mjs` 完成，默认 preview，不写入新项目。

## Command

```bash
node scripts/legacy-import.mjs --source ../my-canvas/projects/<slug>/project_data.json
node scripts/legacy-import.mjs --source ../my-canvas/projects/<slug>/project_data.json --write
```

## Node Types

| Legacy type | New type |
| --- | --- |
| `AIImageNode` | `imageNode` |
| `AIVideoNode` | `videoNode` |
| `AITextNode` | `textNode` |

Unsupported legacy node types are skipped and reported.

## Asset Fields

| Legacy field | New field |
| --- | --- |
| `data.imageAsset` | `data.asset` for image nodes |
| `data.capturedFrame` | fallback `data.asset` for image nodes |
| `data.generatedVideo` | `data.asset` for video nodes |
| `data.capturedClip` | fallback `data.asset` for video nodes |

The importer preserves legacy `src` paths as-is. Phase 2 intentionally does not copy binary files; file materialization will be handled separately if needed.

## Prompt And Text Fields

| Legacy field | New field |
| --- | --- |
| `generationPrompt` | `prompt` |
| `prompt` | `prompt` |
| `lastGenerationPrompt` | fallback `prompt` |
| `text` / `content` | `text` |

## Ignored Transient Fields

- `singleSelectedNodeId`
- `focusedNodeId`
- `textEditingNodeId`
- `maximizedViewNodeId`
- `connectionHoverNodeId`
- `connectionHoverTilt`
- `uiDismissToken`

These fields describe old UI state and must not be persisted in the new domain model.
