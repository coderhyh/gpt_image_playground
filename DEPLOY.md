# Image Playground 部署文档

## 项目概述

基于 [gpt_image_playground](https://github.com/CookSleep/gpt_image_playground) 修改的 AI 图像生成工具。

**核心改动：**
- API Key 完全在服务端配置，前端不暴露
- 固定使用自建 Nexus API（`https://nexus.apimf.top/v1/images/generations`）
- 固定模型 `gpt-image-2`
- 删除 Agent 功能，只保留画廊模式
- 删除原作者品牌信息

---

## 快速部署（Docker）

### 1. 构建镜像

```bash
cd ~/Desktop/code/gpt_image_playground
docker build -f deploy/Dockerfile -t image-playground .
```

### 2. 运行容器

```bash
docker run -d \
  --name image-playground \
  -p 80:80 \
  -e API_KEY=*** \
  image-playground
```

### 3. 访问

打开浏览器访问 `http://你的服务器IP`，即可直接使用，无需任何配置。

---

## 架构说明

```
浏览器 ──→ Nginx (:80) ──→ Nexus API
                │              (nexus.apimf.top)
                │ 注入 Authorization: Bearer $API_KEY
                │
                └── 静态文件 (dist/)
```

- **前端**：React SPA，调用 `/api-proxy/images/generations`
- **Nginx**：代理 `/api-proxy/` → `https://nexus.apimf.top/v1/`，同时注入 API Key
- **API Key**：仅存在于服务器环境变量，前端 JS 代码中不包含

---

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `API_KEY` | 是 | Nexus API 的 Key（`sk-...`） |
| `API_PROXY_URL` | 否 | 上游 API 地址，默认 `https://nexus.apimf.top/v1` |
| `API_BASE_URL` | 否 | 前端请求的 API 路径，默认 `/api-proxy`（走 Nginx 代理）。设为空字符串则用默认值 |

### 修改配置（不重建镜像）

Key 或 URL 变了只需重启容器，不需要重新构建：

```bash
# 改 Key
docker rm -f image-playground
docker run -d --name image-playground -p 80:80 \
  -e API_KEY=*** \
  image-playground

# 改上游 API 地址
docker rm -f image-playground
docker run -d --name image-playground -p 80:80 \
  -e API_KEY=*** -e API_PROXY_URL=https://新地址/v1 \
  image-playground

# 改前端请求路径
docker rm -f image-playground
docker run -d --name image-playground -p 80:80 \
  -e API_KEY=*** -e API_BASE_URL=/自定义路径 \
  image-playground
```

---

## 改动文件清单（27个文件）

### 🔒 服务端（API Key 不出现在前端）

| 文件 | 改动 |
|------|------|
| `deploy/nginx.conf` | 添加 `proxy_set_header Authorization "Bearer ${API_KEY}"` |
| `deploy/Dockerfile` | 添加 `ENV API_KEY=*** | | `deploy/inject-api-url.sh` | 锁定代理配置为常开 |
| `deploy/migrate-api-env.envsh` | API_PROXY_URL 默认值改为 nexus.apimf.top |

### 🎨 前端 API 层

| 文件 | 改动 |
|------|------|
| `src/lib/apiProfiles.ts` | DEFAULT_BASE_URL=`/api-proxy`，锁定 model、apiProxy |
| `src/lib/devProxy.ts` | buildApiUrl 直接走代理路径 |
| `src/lib/openaiCompatibleImageApi.ts` | 请求体简化为 `{model,prompt,size,response_format:"b64_json"}`，移除 Authorization |

### 🗑️ Agent 功能移除

**删除的文件（8个）：**
- `src/components/AgentWorkspace.tsx`
- `src/components/HistoryModal.tsx`
- `src/components/settings/AgentSettingsTab.tsx`
- `src/lib/agentApi.ts` + `agentApi.test.ts`
- `src/lib/agentImageReferences.ts` + `agentImageReferences.test.ts`
- `src/lib/agentWebSearch.ts`
- `src/store.test.ts`

**修改的文件：**
- `src/App.tsx` — 移除 Agent 模式分支
- `src/components/Header.tsx` — 移除画廊/Agent 切换按钮
- `src/components/SettingsModal.tsx` — 移除 Agent 设置 Tab
- `src/components/InputBar.tsx` — 移除 Agent 输入逻辑
- `src/components/HelpModal.tsx` — 移除 Agent 帮助内容
- `src/components/DetailModal.tsx` — 移除 Agent 任务判断
- `src/components/TaskCard.tsx` — 移除 Agent 任务标记
- `src/components/settings/GeneralSettingsTab.tsx` — 移除 Agent 设置项
- `src/types.ts` — 移除 Agent 类型，保留向后兼容字段
- `src/store.ts` — Agent 代码变为死代码（由桩模块兜底）

**桩模块（让死代码编译通过）：**
- `src/lib/agentApi.ts` → 返回空值的 stub
- `src/lib/agentImageReferences.ts` → 返回空值的 stub
- `src/lib/agentWebSearch.ts` → 返回 false 的 stub
- `src/components/AgentWorkspace.tsx` → 返回 null
- `src/components/HistoryModal.tsx` → 返回 null
- `src/components/settings/AgentSettingsTab.tsx` → 返回 null

### 🏷️ 去品牌化

| 文件 | 改动 |
|------|------|
| `index.html` | title → "Image Playground" |
| `public/manifest.webmanifest` | name → "Image Playground" |
| `src/components/Header.tsx` | 标题从 "GPT Image Playground" 链接 → 纯文字 "Image Playground" |
| `src/components/HelpModal.tsx` | 移除 @CookSleep GitHub 页脚 |
| `src/components/SettingsModal.tsx` | About 页替换为简洁版本 |
| `src/components/SupportPromptModal.tsx` | Issues 链接置空 |
| `src/hooks/useVersionCheck.ts` | 禁用 GitHub 版本检查 |

---

## 本地开发

```bash
cd ~/Desktop/code/gpt_image_playground
npm install
npm run dev
```

开发模式下 Vite 不会走 Nginx 代理，需要手动在浏览器中配置 API（或使用 dev-proxy.config.json）。

---

## 构建产物

```
dist/
├── index.html          (1 KB)
├── manifest.webmanifest
├── pwa-icon.svg
├── sw.js
└── assets/
    ├── index-*.css     (108 KB / 22 KB gzip)
    ├── index-*.js      (793 KB / 231 KB gzip)
    └── *.woff/*.ttf    (KaTeX 字体)
```
