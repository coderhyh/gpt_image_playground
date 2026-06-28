# Image Playground

基于 `gpt-image-2` 的 AI 图像生成画廊。纯前端 SPA，API Key 在服务端注入，前端不暴露。

## 特性

- 输入提示词生成图片，固定模型 `gpt-image-2`
- 画廊式历史记录，支持收藏、批量下载
- 参考图与遮罩编辑
- 数据纯本地化（IndexedDB），不上传服务器
- API Key 仅存在于服务器环境变量，前端代码与请求中均不包含

## 部署（Docker）

```bash
docker build -f deploy/Dockerfile -t image-playground .
docker run -d --name image-playground -p 80:80 -e API_KEY=sk-xxxx image-playground
```

打开 `http://服务器IP` 即可使用，无需在前端配置任何内容。

### 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `API_KEY` | 是 | 上游 API 的 Key |
| `API_PROXY_URL` | 否 | 上游 API 地址，默认 `https://nexus.apimf.top/v1` |
| `API_BASE_URL` | 否 | 前端请求路径，默认 `/api-proxy`（走 Nginx 代理） |

修改 Key 或地址只需重建容器，无需重新构建镜像。

### 工作原理

```
浏览器 ──→ Nginx (:80) ──→ 上游 API
              │
              │ 注入 Authorization: Bearer $API_KEY
              └── 静态文件 (dist/)
```

前端请求同源 `/api-proxy/images/generations`，由 Nginx 转发到上游并在服务端注入 Key，前端请求不携带 `Authorization`。

## 本地开发

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 构建
npm test         # 测试
```

开发模式下不走 Nginx 代理，需另行配置 API 调试地址。
