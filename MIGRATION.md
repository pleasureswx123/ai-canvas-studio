# Migration Guide

本文说明如何从旧项目 `../my-canvas` 迁移到新项目 `my-canvas-next`。旧项目只作为只读 Legacy Reference，不在旧目录继续做补丁式开发。

## Scope

当前迁移覆盖核心创作数据：

- 工程 `project_data.json`
- 图片、视频、文本节点
- 画布连线
- 节点内核心 prompt、文本、素材引用
- 素材库 `material-library/library_data.json`

当前不会完整迁移旧版临时 UI 状态、历史面板细节、旧动画状态、旧弹窗展开状态和未工程化的运行缓存。

## Backup

迁移前先保留旧目录原样备份：

```bash
Copy-Item -Recurse ..\my-canvas ..\my-canvas.backup
```

新项目写入时会把数据放在：

```text
projects/<slug>/project_data.json
projects/<slug>/assets/
material-library/library_data.json
material-library/assets/
```

这些目录默认不进入 Git。迁移失败时可以删除新项目中对应的 `projects/<slug>` 或 `material-library` 运行数据后重新执行。

## Project Preview

先执行 preview，确认转换报告：

```bash
node scripts/legacy-import.mjs --source ../my-canvas/projects/<slug>/project_data.json
```

重点检查：

- `convertedNodes`
- `convertedEdges`
- `skippedNodes`
- `skippedNodeTypes`
- `migratedAssets`
- `missingAssets`

如果 `skippedNodes` 或 `missingAssets` 很高，先查看旧工程是否使用了尚未纳入迁移范围的节点类型或外部文件路径。

## Project Write

确认 preview 后写入新项目：

```bash
node scripts/legacy-import.mjs --source ../my-canvas/projects/<slug>/project_data.json --write
```

写入后启动新项目，在工程列表中打开 `<slug>_imported`，检查画布节点、连线、素材预览是否符合预期。

## Material Library Preview

素材库先执行 preview：

```bash
npm run legacy:materials -- --source ../my-canvas/material-library/library_data.json
```

确认条目数量、缺失文件和分类后再写入。

## Material Library Write

追加写入：

```bash
npm run legacy:materials -- --source ../my-canvas/material-library/library_data.json --write
```

清空新素材库后重建：

```bash
npm run legacy:materials -- --source ../my-canvas/material-library/library_data.json --write --replace
```

## Failure Recovery

如果工程迁移失败：

1. 保留命令输出中的 report。
2. 删除新项目中对应 `projects/<slug>_imported` 目录。
3. 根据 report 补齐缺失素材或记录暂缓迁移字段。
4. 重新执行 preview。

如果素材库迁移失败：

1. 不使用 `--replace` 时，新旧数据会追加合并，先检查重复条目。
2. 需要干净重建时，用 `--write --replace`。
3. 若素材文件缺失，先在旧项目 `material-library/assets/` 中确认文件是否存在。

## Drill Record

2026-05-18 已完成一次只读 preview 演练：

```bash
node scripts/legacy-import.mjs --source ../my-canvas/projects/proj_mo57tkma_e9n870/project_data.json
```

结果：

- convertedNodes: 63
- skippedNodes: 0
- convertedEdges: 16
- skippedEdges: 0
- migratedAssets: 39
- missingAssets: 19

结论：核心节点和连线可转换；部分旧素材文件缺失，需要迁移真实工程前按 report 补齐或确认废弃。
