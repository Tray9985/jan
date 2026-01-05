import { useMemo } from 'react'
import { ThreadMessage } from '@janhq/core'
import { cn } from '@/lib/utils'

type ThreadUsageTotalProps = {
  messages?: ThreadMessage[]
  className?: string
}

type UsagePayload = {
  total_tokens?: number
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return `${num}`
}

export const ThreadUsageTotal = ({
  messages = [],
  className,
}: ThreadUsageTotalProps) => {
  const { totalTokens, hasUsage } = useMemo(() => {
    let total = 0
    let hasUsage = false

    messages.forEach((message) => {
      if (message.role !== 'assistant') return
      const usage = (message.metadata as { usage?: UsagePayload } | undefined)
        ?.usage
      const totalTokens =
        typeof usage?.total_tokens === 'number' ? usage.total_tokens : null
      if (totalTokens !== null) {
        total += totalTokens
        hasUsage = true
      }
    })

    return { totalTokens: total, hasUsage }
  }, [messages])

  if (messages.length === 0) return null

  const displayValue = hasUsage ? formatNumber(totalTokens) : '--'

  return (
    <div
      className={cn(
        'text-xs text-main-view-fg/60 flex items-center gap-1',
        className
      )}
    >
      <span className="font-medium text-main-view-fg/70">Total</span>
      <span>{displayValue}</span>
    </div>
  )
}

export default ThreadUsageTotal
