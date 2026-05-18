# Refactor Roadmap

这份清单覆盖从当前 `my-canvas-next` MVP 到完整替代旧项目的重构路径。每个阶段都必须保持项目可运行、可构建、可回退，旧项目只作为 Legacy Reference，不在旧目录上继续补丁式开发。

## Phase 0: Baseline 已完成

- [x] 创建 `my-canvas-next` 新项目，不修改旧项目。
- [x] 建立 React/Vite + Node API + Python media service 同栈架构。
- [x] 建立 `docs/` 文档集：产品简述、架构、技术方案、API 契约、数据模型、工程规范、时序图。
- [x] 实现工程列表、创建、打开、保存、重命名、删除。
- [x] 实现 React Flow 图片、视频、文本基础节点。
- [x] 实现本地素材上传到工程 assets。
- [x] 实现素材库基础列表、保存、删除、拖入画布。
- [x] 实现 mock 图片/视频生成链路和视频任务查询。
- [x] 通过 `npm run lint`、`npm run build`、Node API smoke、media health。

## Phase 1: 稳定 MVP

目标：让新项目具备可持续开发的最低稳定性，避免后续迁移时破坏基础闭环。

- [x] 修复前端启动体验：无工程时给出清晰空状态，引导新建工程。
- [x] 增加自动保存策略：节点/边变化后防抖保存，手动保存仍保留。
- [x] 增加保存状态：未保存、保存中、已保存、保存失败。
- [x] 增加 API client 超时和 AbortController 支持。
- [x] 增加统一错误展示组件，替换 `window.prompt/confirm` 以外的临时消息。
- [x] 增加工程删除二次确认弹窗组件。
- [x] 增加素材上传进度和失败提示。
- [x] 增加视频任务轮询状态：PENDING、RUNNING、SUCCEEDED、FAILED。
- [x] 增加基础 smoke 脚本：创建工程、保存节点、上传小文件、生成 mock 图片、生成 mock 视频。
- [x] 验收：刷新页面后工程数据、节点、连线、素材 URL 不丢失。

## Phase 2: 数据契约与兼容导入

目标：固定数据边界，支持从旧项目迁移核心资产和画布结构。

- [x] 为 `ProjectData`、`FlowNode`、`FlowEdge`、`MaterialItem`、`GenerationTask` 建立 JSON Schema。
- [x] Node API 保存前校验 `project_data.json`，失败时返回可读错误。
- [x] 保存时剥离所有运行时字段，只持久化领域字段。
- [x] 为项目文件写入增加备份机制：保存前保留最近一次 `project_data.backup.json`。
- [x] 建立 legacy field mapping 文档，覆盖旧版 `AIImageNode`、`AIVideoNode`、`AITextNode`。
- [x] 实现 legacy import 脚本：读取旧项目 `project_data.json`，转换为新项目节点。
- [x] 支持旧图片字段 `imageAsset`、`capturedFrame` 映射到新 `asset`。
- [x] 支持旧视频字段 `generatedVideo`、`capturedClip` 映射到新 `asset`。
- [x] 忽略旧版 transient UI 字段：focus、hover、selection、menu、dismiss token。
- [x] 增加导入预检报告：节点数、边数、可迁移素材、跳过字段、缺失文件。
- [x] 验收：至少 3 个旧项目样例能导入并保存为新项目格式。

## Phase 3: 真实生成服务适配

目标：用 provider adapter 替换 mock，但保持前端接口不变。

- [x] 设计 Python media provider 接口：`generate_image`、`submit_video_task`、`query_video_task`、`download_result`。
- [x] 将 mock provider 保留为默认开发 provider。
- [x] 迁移 Volcengine/Ark 图片生成 adapter。当前通过 `openai_image` 的 Ark-compatible 配置支持。
- [x] 迁移 OpenAI image adapter。
- [x] 迁移 Gemini/VectorEngine 图片 adapter。
- [x] 迁移 Seedance/Ark 视频 adapter。
- [x] 迁移 DashScope 或其他旧版仍需保留的视频 provider。
- [x] 增加 provider 环境变量文档和 `.env.example`。
- [x] 统一 provider 错误格式：认证失败、额度不足、参数非法、任务失败、下载失败。
- [x] 生成结果必须写入当前工程 `projects/<slug>/assets`，禁止默认散落到全局 outputs。
- [x] 验收：无 API key 时 mock 可用；有真实配置时图片/视频至少各跑通一个 provider。

## Phase 4: 前端模块化迁移

目标：逐步恢复旧版高价值交互，但保持新架构边界。

- [x] 图片节点拆分为共享 `NodeShell`、`PromptPanel`、`MediaPreview`、`NodeActions` 等小组件。
- [x] 视频节点拆分为共享 `NodeShell`、`PromptPanel`、`MediaPreview`、`NodeStatus`、`NodeActions` 等小组件。
- [x] 文本节点增加文本分析入口，但 API client 与 UI 分离。
- [x] 迁移 mention 引用能力：图片/视频/文本节点可引用上游节点内容。
- [x] 迁移图片节点生成参数：模型、比例、尺寸、质量。
- [x] 迁移视频节点生成参数：模型、场景、比例、分辨率、时长。
- [x] 增加节点复制、删除、多选基础能力。
- [x] 增加连线语义：上游图片/文本自动参与生成请求。
- [x] 增加素材保存弹窗：名称、分类、类型。
- [x] 验收：旧版核心创作路径能在新 UI 中完成，不依赖旧巨型组件。

## Phase 5: 高级素材与编辑能力

目标：迁移旧版有业务价值的高级能力，仍按独立模块接入。

- [x] 图片裁剪模块：浏览器端中心裁剪，结果上传为当前工程 assets 并回写图片节点。
- [x] 图片标注模块：浏览器端文字标注，结果上传为当前工程 assets 并回写图片节点。
- [ ] 视频首帧/尾帧引用。
- [ ] 视频剪辑基础能力。
- [ ] 历史面板：按工程展示生成历史。
- [ ] 工程封面/缩略图生成。
- [ ] 素材库分类筛选和搜索。
- [ ] Seedance 主体/人物素材审核能力，作为独立 feature 接入。
- [ ] 素材库数据迁移脚本：旧 `material-library/library_data.json` 到新 schema。
- [ ] 验收：高级能力可独立关闭，不影响核心画布和工程保存。

## Phase 6: 测试与质量门禁

目标：让项目具备团队协作所需的最低质量保障。

- [ ] 引入单元测试框架，优先覆盖纯函数和 API client。
- [ ] 覆盖数据 schema 校验、legacy import、文件路径安全。
- [ ] 覆盖 Node API contract tests。
- [ ] 覆盖 Python provider mock tests。
- [ ] 增加前端 Playwright 冒烟测试：新建工程、添加节点、保存、刷新恢复。
- [ ] 增加 lint、build、test、smoke 一键脚本。
- [ ] 增加 CI 文档，即使暂时不接 GitHub Actions 也明确命令。
- [ ] 验收：任意重构 PR 必须通过 lint/build/test/smoke。

## Phase 7: 工程交付与旧项目下线

目标：让新项目正式替代旧项目，并保留必要迁移路径。

- [ ] 编写 `MIGRATION.md`：旧项目数据迁移步骤、备份策略、失败恢复。
- [ ] 编写 `OPERATIONS.md`：环境变量、端口、启动、日志、常见错误。
- [ ] 编写 `CONTRIBUTING.md`：目录规范、分支规范、提交规范、代码评审关注点。
- [ ] 完成旧项目功能对照表：已迁移、替代方案、废弃原因。
- [ ] 完成真实项目迁移演练，记录耗时和问题。
- [ ] 锁定旧项目为只读 reference。
- [ ] 新项目作为默认开发入口。
- [ ] 验收：团队成员只看新项目文档即可启动、开发、调试、迁移旧数据。

## Recommended Execution Rhythm

- 每个阶段独立分支或独立 PR。
- 每个阶段先补文档和验收标准，再改代码。
- 每个阶段结束必须更新本清单状态。
- 迁移旧功能时只迁移业务能力，不复制旧项目的大文件结构。
- 任何超过 500 行的组件或服务都必须拆分后再继续扩展。

## Priority Order

1. Phase 1：先让 MVP 足够稳。
2. Phase 2：再固定数据契约，否则后续迁移会反复返工。
3. Phase 3：接真实生成服务，验证核心商业价值。
4. Phase 4 和 Phase 5：按业务优先级迁移旧功能。
5. Phase 6 和 Phase 7：质量门禁、交付文档、旧项目下线。
