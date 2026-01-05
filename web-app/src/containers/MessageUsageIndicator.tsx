import { memo, useMemo } from 'react'
import { IconArrowUp, IconArrowDown } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

type UsagePayload = {
  prompt_tokens?: number
  completion_tokens?: number
}

type MessageUsageIndicatorProps = {
  metadata?: Record<string, unknown>
  className?: string
}

export const MessageUsageIndicator = memo(
  ({ metadata, className }: MessageUsageIndicatorProps) => {
    const { hasUsage, promptTokens, completionTokens } = useMemo(() => {
      const usage = (metadata as { usage?: UsagePayload } | undefined)?.usage
      const promptTokens =
        typeof usage?.prompt_tokens === 'number' ? usage.prompt_tokens : null
      const completionTokens =
        typeof usage?.completion_tokens === 'number'
          ? usage.completion_tokens
          : null
      const hasUsage =
        promptTokens !== null && completionTokens !== null
      return { hasUsage, promptTokens, completionTokens }
    }, [metadata])

    if (!hasUsage) return null

    return (
      <span
        className={cn(
          'text-xs text-main-view-fg/60 flex items-center gap-1',
          className
        )}
      >
        <span className="flex items-center gap-0.5">
          <IconArrowUp className="size-3" />
          <span>{promptTokens}</span>
        </span>
        <span className="text-main-view-fg/30">·</span>
        <span className="flex items-center gap-0.5">
          <IconArrowDown className="size-3" />
          <span>{completionTokens}</span>
        </span>
      </span>
    )
  }
)

export default memo(MessageUsageIndicator)
