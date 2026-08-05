import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { normalizeDevProxyConfig } from './src/lib/devProxy'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

function loadDevProxyConfig() {
  try {
    return normalizeDevProxyConfig(
      JSON.parse(readFileSync('./dev-proxy.config.json', 'utf-8')) as unknown,
    )
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT') return null
    throw error
  }
}

// 去掉路径前缀（如 /api-proxy → ''），用于代理转发到上游时的 rewrite
function stripPrefix(prefix: string) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return (path: string) => path.replace(new RegExp(`^${escaped}`), '')
}

export default defineConfig(({ command, mode }) => {
  // 仅本地 dev server 读取 .env 凭证并注入代理请求头
  // （凭证只存在于 Node 端，不会进入前端 bundle，和 docker 的 nginx 注入等价）
  const env = command === 'serve' ? loadEnv(mode, process.cwd(), '') : {}
  const apiKey = env.API_KEY
  const apiProxyUrl = env.API_PROXY_URL || 'https://www.packyapi.ai/v1'
  const accessToken = env.PACKY_ACCESS_TOKEN
  const userId = env.PACKY_USER_ID

  const devProxyConfig = command === 'serve' ? loadDevProxyConfig() : null
  // mock 模式（dev-proxy.config.json）优先；否则 .env 配了 API_KEY 就走真实 API
  const useMockProxy = Boolean(devProxyConfig?.enabled)
  const useRealApi = !useMockProxy && Boolean(apiKey)

  // 传给前端的代理开关：让前端走同源 /api-proxy 路径
  const clientDevProxyConfig = useMockProxy
    ? devProxyConfig
    : useRealApi
      ? { enabled: true, prefix: '/api-proxy', target: apiProxyUrl, changeOrigin: true, secure: false }
      : null

  return {
    plugins: [react()],
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __DEV_PROXY_CONFIG__: JSON.stringify(clientDevProxyConfig),
    },
    server: {
      host: true,
      proxy: useMockProxy
        ? {
            [devProxyConfig!.prefix]: {
              target: devProxyConfig!.target,
              changeOrigin: devProxyConfig!.changeOrigin,
              secure: devProxyConfig!.secure,
              rewrite: stripPrefix(devProxyConfig!.prefix),
            },
          }
        : useRealApi
          ? {
              '/api-proxy': {
                target: apiProxyUrl,
                changeOrigin: true,
                secure: false,
                rewrite: stripPrefix('/api-proxy'),
                headers: { Authorization: `Bearer ${apiKey}` },
              },
              '/usage-proxy': {
                target: 'https://www.packyapi.ai',
                changeOrigin: true,
                secure: false,
                rewrite: stripPrefix('/usage-proxy'),
                headers: {
                  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                  ...(userId ? { 'New-Api-User': userId } : {}),
                },
              },
            }
          : undefined,
    },
  }
})
