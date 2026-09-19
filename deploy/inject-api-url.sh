#!/bin/sh

# 纯前端直连部署：浏览器直接请求上游 API（上游已开启 CORS），
# API Key 由各用户在页面设置中填写并保存在浏览器本地，服务器不存 Key。
# 如需自定义上游，docker run 时传 -e API_DEFAULT_URL=...（需以 /draw 结尾）。
DEFAULT_API_URL=${API_DEFAULT_URL:-https://www.right.codes/draw}
API_PROXY_AVAILABLE=false
API_PROXY_LOCKED=false
DEFAULT_CONFIG_ONLY=false
DOCKER_LEGACY_API_URL_USED=false

escape_sed_replacement() {
    printf '%s' "$1" | sed 's/[&|\\]/\\&/g'
}

DEFAULT_API_URL_ESCAPED=$(escape_sed_replacement "$DEFAULT_API_URL")

# 查找所有 js 文件并将占位符替换为运行时配置
find /usr/share/nginx/html/assets -type f -name "*.js" -exec sed -i "s|__VITE_DEFAULT_API_URL_PLACEHOLDER__|$DEFAULT_API_URL_ESCAPED|g" {} +
find /usr/share/nginx/html/assets -type f -name "*.js" -exec sed -i "s|__VITE_API_PROXY_AVAILABLE_PLACEHOLDER__|$API_PROXY_AVAILABLE|g" {} +
find /usr/share/nginx/html/assets -type f -name "*.js" -exec sed -i "s|__VITE_API_PROXY_LOCKED_PLACEHOLDER__|$API_PROXY_LOCKED|g" {} +
find /usr/share/nginx/html/assets -type f -name "*.js" -exec sed -i "s|__VITE_DOCKER_DEPLOYMENT_PLACEHOLDER__|true|g" {} +
find /usr/share/nginx/html/assets -type f -name "*.js" -exec sed -i "s|__VITE_DOCKER_LEGACY_API_URL_USED_PLACEHOLDER__|$DOCKER_LEGACY_API_URL_USED|g" {} +
find /usr/share/nginx/html/assets -type f -name "*.js" -exec sed -i "s|__VITE_SHOW_DEFAULT_CONFIG_ONLY_PLACEHOLDER__|$DEFAULT_CONFIG_ONLY|g" {} +

exec "$@"
