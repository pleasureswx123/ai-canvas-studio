# Contributing

本文定义新项目协作规范。旧项目 `../my-canvas` 只读参考，不在旧目录继续开发。

## Default Entry

新功能、修复和迁移工作都在 `my-canvas-next` 中完成。旧项目只能用于查阅业务行为、接口样例和历史数据。

## Directory Rules

- `src/app`：应用入口、页面编排和全局布局。
- `src/features/canvas`：画布、节点、边、节点共享组件。
- `src/features/projects`：工程列表、工程上下文和保存状态。
- `src/features/materials`：素材库、素材保存和筛选。
- `src/features/generation`：图片、视频生成 UI 状态与 API 调用。
- `src/shared`：API client、UI primitives、配置、工具函数。
- `server/node-api`：工程、素材、文件、文本分析等统一 Node API。
- `server/media-service`：Python provider adapter 和媒体生成服务。
- `docs`：产品、架构、方案、契约、路线图和流程图。
- `test`：单元、契约、Python provider、Playwright 冒烟测试。

组件内不要散落原始 `fetch`。前端统一通过 feature API 或 `src/shared/api/client.js` 调用接口。

## Commit Rules

提交信息使用中文，格式保持简短清楚：

```text
增加前端端到端冒烟测试
修复素材上传失败提示
补充旧项目迁移文档
```

每次提交只包含一个清晰主题。运行产物、用户工程数据、API key、日志和生成媒体不进入提交。

## Branch And PR Rules

建议每个阶段或功能独立分支。PR 描述至少包含：

- 改动范围
- 验证命令
- 是否涉及数据迁移
- 是否涉及真实 provider 或 API key
- 是否影响旧项目兼容策略

## Review Checklist

代码评审优先看这些风险：

- 是否破坏 `project_data.json` schema。
- 是否把临时 UI 状态持久化。
- 是否绕过统一 API client。
- 是否把生成资产写到工程目录之外。
- 是否引入无法关闭的高级能力。
- 是否缺少错误展示或失败恢复。
- 是否缺少必要测试或文档更新。
- 是否引入浏览器原生 `prompt`、`confirm`、`alert`。产品内必须使用应用级弹窗或 Notice。

## Required Verification

普通改动至少执行：

```bash
npm run verify
```

涉及画布交互、工程保存、前端运行边界的改动执行：

```bash
npm run verify:e2e
```

真实 provider 改动还需要在本地 `.env.local` 配好对应 key 后，至少跑通一个图片或视频生成链路。

## Documentation Sync

功能、需求、架构、配置、数据模型、AI provider 或开发流程发生变化时，必须同步更新 `AGENT.md`。如果变化影响启动、验证或交付，也要同步更新 `README.md`、`OPERATIONS.md` 或对应 `docs/` 文件。
