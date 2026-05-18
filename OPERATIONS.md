# Operations Guide

本文说明本地启动、环境变量、端口、日志、验证和常见故障处理。

## Requirements

- Node.js 24+
- npm
- Python 3.10+
- ffmpeg，可选但建议安装。视频剪辑能力依赖本地 `ffmpeg` 命令。

## Install

```bash
npm install
```

首次运行 Playwright 端到端测试时安装浏览器：

```bash
npx playwright install chromium
```

## Environment

复制环境变量模板：

```bash
Copy-Item .env.example .env.local
```

检查环境变量：

```bash
npm run env:check
```

本地默认使用 mock provider：

```env
MEDIA_PROVIDER=mock
```

真实 provider 的 API key 放在 `.env.local`，不要提交到 Git。常用变量见 `.env.example`：

- `OPENAI_IMAGE_API_KEY`
- `ARK_API_KEY`
- `VECTORENGINE_API_KEY`
- `DASHSCOPE_API_KEY`
- `XUNKE_API_KEY`

Key 获取渠道和项目内职责见 `README.md` 的 `AI Model And Provider Matrix`。如果 `MEDIA_PROVIDER` 包含真实 provider 但对应 key 为空，`npm run env:check` 会失败。

## Ports

- Web: `http://127.0.0.1:5174`
- Node API: `http://127.0.0.1:8787/api/health`
- Python media service: `http://127.0.0.1:8790/api/media-health`

如需改端口，优先通过 `.env.local` 修改 `NODE_API_PORT`、`MEDIA_SERVICE_PORT` 和 `MEDIA_SERVICE_ORIGIN`。

## Start

同时启动前端、Node API、Python media service：

```bash
npm run dev
```

单独启动：

```bash
npm run dev:web
npm run dev:api
npm run dev:media
```

## Verification

基础门禁：

```bash
npm run verify
```

包含浏览器端到端冒烟：

```bash
npm run verify:e2e
```

单项命令：

```bash
npm run env:check
npm run lint
npm test
npm run build
npm run smoke:api
npm run test:e2e
```

## Runtime Data

以下目录是运行数据，不提交到 Git：

- `projects/`
- `material-library/assets/`
- `material-library/library_data.json`
- `logs/`
- `dist/`
- `test-results/`
- `playwright-report/`

## Common Issues

### API key missing

本地开发保持 `MEDIA_PROVIDER=mock`。切换真实 provider 后，如果 key 缺失，服务会返回规范化错误，前端应展示可读错误且不破坏工程数据。

### ffmpeg missing

视频剪辑失败且错误中包含 `ffmpeg` 时，安装 ffmpeg 并确保命令在 PATH 中可用：

```bash
ffmpeg -version
```

### Port already in use

关闭占用端口的进程，或改 `.env.local` 端口。Windows 可查看端口占用：

```bash
Get-NetTCPConnection -LocalPort 5174,8787,8790 -ErrorAction SilentlyContinue
```

### Playwright reuses stale server

如果端到端测试表现和源码不一致，关闭旧的 Vite 或 API 进程后重新执行：

```bash
npm run test:e2e
```
