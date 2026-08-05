interface UsageApiResponse {
  success?: boolean
  data?: {
    quota?: number
    used_quota?: number
  }
}

export interface UsageInfo {
  // NewAPI 的 quota 字段是「当前剩余配额」（随消耗递减），used_quota 是累计已用
  remaining: number
  used: number
}

// 查询 PackyAPI 账户额度，走同源 /usage-proxy/ 代理
// （系统访问令牌与用户 ID 由 Nginx 在服务端注入，前端不接触凭证）。
export async function fetchUsage(): Promise<UsageInfo> {
  const response = await fetch('/usage-proxy/api/user/self', {
    method: 'GET',
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`用量查询失败：HTTP ${response.status}`)
  const payload = (await response.json()) as UsageApiResponse
  const data = payload.data
  if (!data) throw new Error('用量接口未返回数据')
  return {
    remaining: Number(data.quota) || 0,
    used: Number(data.used_quota) || 0,
  }
}
