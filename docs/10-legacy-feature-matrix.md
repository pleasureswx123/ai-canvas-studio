# Legacy Feature Matrix

本文记录旧项目能力在新项目中的迁移状态。旧项目只作为 Legacy Reference，新项目是默认开发入口。

| Legacy capability | New status | New location or replacement | Note |
| --- | --- | --- | --- |
| 工程列表、创建、打开、保存、重命名、删除 | 已迁移 | `src/features/projects`、`server/node-api/routes/projects.js` | 新版使用统一 `{ ok, data, error }` 返回结构。 |
| `projects/<slug>/project_data.json` 本地工程数据 | 已迁移 | `projects/<slug>/project_data.json` | 新版有 schema 校验和保存前备份。 |
| 图片、视频、文本画布节点 | 已迁移 | `src/features/canvas/nodes` | 旧巨型组件已拆为共享节点组件。 |
| React Flow 连线和画布保存 | 已迁移 | `src/features/canvas`、`src/app/App.jsx` | 支持保存加载和 Playwright 冒烟覆盖。 |
| 本地素材上传 | 已迁移 | `server/node-api/routes/projects.js` | 文件写入当前工程 assets。 |
| 素材库保存、删除、拖入画布 | 已迁移 | `src/features/materials`、`server/node-api/routes/materials.js` | 新版素材库 schema 更明确。 |
| 素材库分类筛选和搜索 | 已迁移 | `src/features/materials/MaterialPanel.jsx` | 受 feature flag 控制。 |
| 图片生成 mock 链路 | 已迁移 | `server/media-service/providers/mock_provider.py` | 默认本地开发 provider。 |
| OpenAI/Ark/VectorEngine 图片生成 | 已迁移 | `server/media-service/providers` | API key 通过 `.env.local` 管理。 |
| Seedance/Ark、DashScope、Xunke 视频生成 | 已迁移 | `server/media-service/providers` | 前端通过统一 generation API 调用。 |
| 上游节点 mention 引用 | 已迁移 | `src/features/canvas/components/MentionPicker.jsx` | 新版保留核心引用能力。 |
| 图片生成参数 | 已迁移 | `src/features/canvas/components/GenerationSettings.jsx` | 模型、比例、尺寸、质量。 |
| 视频生成参数 | 已迁移 | `src/features/canvas/components/GenerationSettings.jsx` | 模型、场景、比例、分辨率、时长。 |
| 图片裁剪 | 已迁移 | `src/features/canvas/imageEditing.js` | 新版先做浏览器端中心裁剪。 |
| 图片标注 | 已迁移 | `src/features/canvas/imageEditing.js` | 新版先做浏览器端文字标注。 |
| 视频首帧/尾帧引用 | 已迁移 | `src/features/canvas/nodes/VideoNode.jsx` | 从上游图片中选择并传给 provider。 |
| 视频剪辑 | 已迁移 | `server/node-api/routes/projects.js` | 依赖本地 ffmpeg。 |
| 工程生成历史 | 已迁移 | `src/app/App.jsx` | 展示最近 100 条，可拖回画布。 |
| 工程封面缩略图 | 已迁移 | `server/node-api/services/storage.js` | 列表接口自动返回封面。 |
| Seedance 主体/人物素材审核 | 已迁移 | `server/node-api/routes/materials.js` | 当前记录审核结果 schema，可替换真实服务。 |
| 旧工程导入 | 已迁移 | `scripts/legacy-import.mjs` | preview/write 双模式。 |
| 旧素材库导入 | 已迁移 | `scripts/legacy-material-import.mjs` | preview/write/replace 模式。 |
| 复杂历史面板细节 | 替代实现 | 工程生成历史面板 | 先保留业务复用价值，不复刻旧 UI 细节。 |
| 复杂裁剪和视频编辑工作台 | 暂不复刻 | 基础裁剪、标注、剪辑 | 后续按独立模块扩展，不回到巨型组件。 |
| 旧 UI 动画和边缘交互 | 废弃 | 新 UI 基础交互 | 不迁移无明确业务价值的装饰和临时状态。 |
| 旧 transient UI 字段 | 废弃 | schema 会剥离 | focus、hover、selection、menu、dismiss token 不持久化。 |

## Read-only Policy

`../my-canvas` 保持只读参考：

- 不在旧目录修 bug。
- 不从旧目录复制大组件继续堆叠。
- 只查阅业务行为、接口样例、数据字段和素材路径。
- 迁移后的新能力必须落在 `my-canvas-next` 的模块边界内。
