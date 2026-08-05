import { useEffect, useState } from 'react'
import { fetchUsage, type UsageInfo } from '../lib/usageApi'

// NewAPI quota 换算：500000 = $1（PackyAPI 若使用不同比例，调整此常量）
const QUOTA_PER_USD = 500000

// 右上角额度徽标：进入页面（组件挂载）时请求一次用量，之后不再请求。
// 未配置用量查询或请求失败时静默不显示（如本地开发无 Nginx 代理）。
export default function UsageBadge() {
  const [usage, setUsage] = useState<UsageInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchUsage()
      .then((info) => {
        if (!cancelled) setUsage(info)
      })
      .catch(() => {
        // 静默失败：不显示徽标
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!usage) return null

  const remainingUsd = usage.remaining / QUOTA_PER_USD
  const usedUsd = usage.used / QUOTA_PER_USD

  return (
    <div
      className="hidden sm:flex items-center mr-1 px-2 py-1 rounded-lg text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap"
      title={`PackyAPI 额度（剩余 ${remainingUsd.toFixed(2)} / 已用 ${usedUsd.toFixed(2)} USD）`}
    >
      剩余: <span className="mx-1 text-[#4CA154]">{remainingUsd.toFixed(2)}</span> USD
    </div>
  )
}
