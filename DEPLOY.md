# Image Playground 部署文档

## 项目概述

基于开源项目修改的 AI 图像生成工具，仅供个人使用。

**核心改动：**
- 纯前端直连上游：浏览器直接请求 Right Code API（上游已开启 CORS），服务器不存 API Key
- API Key 由各用户在网页「设置」中填写一次，保存在各自浏览器本地
- 默认使用 Right Code 画图接口（`https://www.right.codes/draw/v1/images/generations`，同步等待直接返回图片）
- 默认模型 `nano-banana-fast`（可在设置中修改）
- 生图参数精简为「尺寸」+「数量」
- 移除赞助作者弹窗
- 删除 Agent 功能，只保留画廊模式
- 删除原作者品牌信息

---

## 快速部署（Docker）

> 推荐直接使用 `docker compose up -d --build`（compose.yml 已配置好端口 7767、容器名 `image-playground-shunfeng`）。

### 1. 构建镜像

```bash
cd ~/Desktop/code/gpt_image_playground
docker build -f deploy/Dockerfile -t image-playground-shunfeng .
```

### 2. 运行容器

```bash
docker run -d \
  --name image-playground-shunfeng \
  -p 7767:80 \
  --env-file .env \
  image-playground-shunfeng
```

### 3. 访问

打开浏览器访问 `http://你的服务器IP:7767`，首次使用在右上角「设置」里填入 Right Code 的 API Key（`sk-...`）即可。

---

## 架构说明

```
浏览器 ──直连──→ Right Code API (www.right.codes，Cloudflare)
   │              请求头 Authorization: Bearer <用户填写的Key>
   │
   └──→ Nginx (:7767→80)：仅提供静态文件 + /usage-proxy 额度查询代理
```

- **前端**：React SPA，画图请求 `https://www.right.codes/draw/v1/images/generations`（同步等待返回图片 URL），由用户浏览器直接发起，不经过服务器
- **Nginx**：不再代理生图请求，只托管静态文件；`/usage-proxy/` 仍由服务端注入 PackyAPI 令牌查询额度
- **API Key**：保存在各用户浏览器 localStorage 中，服务器与前端 JS 产物中都不包含

---

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `API_DEFAULT_URL` | 否 | 上游 API 地址，默认 `https://www.right.codes/draw`（需以 `/draw` 结尾），启动时注入前端 |
| `PACKY_ACCESS_TOKEN` / `PACKY_USER_ID` | 否 | PackyAPI 用量查询（右上角额度显示），不配则不显示 |

### 修改配置

上游地址变了只需改 `compose.yml` 中 `API_DEFAULT_URL`（或 `docker run -e`）后重启容器：

```bash
docker rm -f image-playground-shunfeng
docker run -d --name image-playground-shunfeng -p 7767:80 \
  -e API_DEFAULT_URL=https://新地址/draw \
  image-playground-shunfeng
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
| `src/components/HelpModal.tsx` | 移除 GitHub 页脚 |
| `src/components/SettingsModal.tsx` | About 页替换为简洁版本 |
| `src/components/SupportPromptModal.tsx` | 赞助弹窗（→ 第二轮已删除） |
| `src/hooks/useVersionCheck.ts` | 禁用 GitHub 版本检查 |

### 🧹 界面与文档精简（第二轮）

| 文件 | 改动 |
|------|------|
| `src/components/input/inputParamsPanel.tsx` | 参数面板精简为「尺寸」+「数量」，移除质量/格式/审核/透明背景/压缩率控件 |
| `src/components/InputBar.tsx` | 桌面参数列数 `grid-cols-6 → grid-cols-2`，精简面板传参；修复代理模式下发送按钮误判「未完成 API 配置」 |
| `src/lib/apiProfiles.ts` | `validateApiProfile` 在走代理时豁免 apiKey 检查（Key 由服务端注入，前端为空） |
| `src/components/SettingsModal.tsx` | 移除「API 配置 / Agent 配置 / 关于」三个 tab，默认打开「习惯配置」 |
| `src/App.tsx` | 移除赞助弹窗 `SupportPromptModal` 的引用 |
| `src/store.ts` | 禁用「生成 50 张后弹赞助」触发；Agent 引导 tab 改为 `general` |
| `src/components/SupportPromptModal.tsx` | **删除**（原赞助作者弹窗，第一轮仅置空链接，本轮直接删文件） |
| `README.md` | 重写为精简版，移除原作者信息、赞助商与在线体验链接 |
| `RELEASE.md` | **删除** |
| `docs/custom-provider-llm-prompt.md`、`docs/images/*` | **删除**（自定义服务商已下线、截图不再使用） |

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
