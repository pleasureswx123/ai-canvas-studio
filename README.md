# My Canvas Next

工程化重建版 AI 画布。旧项目仅作为 Legacy Reference，新项目从清晰的目录边界、API 契约和数据模型开始。

## Default Development Entry

所有后续开发、迁移和修复都以本目录为默认入口。旧项目 `../my-canvas` 只用于只读参考，不再直接改动。

## Start

```bash
npm install
npm run dev
```

- Web: http://127.0.0.1:5174
- Node API: http://127.0.0.1:8787/api/health
- Media service: http://127.0.0.1:8790/api/media-health

## Verification

```bash
npm run verify
npm run verify:e2e
```

## Docs

- `MIGRATION.md`：旧项目数据迁移步骤、备份和失败恢复。
- `OPERATIONS.md`：环境变量、端口、启动、日志和常见错误。
- `CONTRIBUTING.md`：目录规范、提交规范、评审和验证要求。
- `docs/07-refactor-roadmap.md`：完整阶段任务清单。
- `docs/10-legacy-feature-matrix.md`：旧功能迁移、替代和废弃对照。

## Current Capability

- 工程列表、创建、打开、保存、重命名、删除
- React Flow 图片/视频/文本节点
- 本地素材上传到工程 assets
- Mock 和真实 provider 图片/视频生成链路
- 基础素材库、高级素材筛选和旧素材库迁移
- 图片裁剪、标注、视频首尾帧引用、基础剪辑、生成历史、工程缩略图
