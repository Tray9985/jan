import { useEffect, useMemo, useRef, useState } from 'react'
import { ThreadMessage } from '@janhq/core'
import { parseContextOverflow } from '@/utils/error'
import {
  getLocalPropsExtension,
  type LlamacppModelProps,
} from '@/lib/llamacppRouterProps'
import { useModelProvider } from './useModelProvider'
import { useAppState } from './useAppState'

export type ModelProps = LlamacppModelProps

export interface TokenCountData {
  tokenCount: number
  inputTokens?: number
  outputTokens?: number
  maxTokens?: number
  percentage?: number
  isNearLimit: boolean
  loading: boolean
  modelProps?: ModelProps
  modelDisplayName?: string
  fitEnabled: boolean
  configuredCtxLen?: number
  modalities?: { vision: boolean; audio: boolean }
  /** 费用（美元），从 providerMetadata.cost 按每百万 token 单价计算 */
  cost?: number
  error?: string
  isOverflow?: boolean
}

interface UsageMeta {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

// The token-usage popup normally reflects the last *successful* turn. When a
// request overflows, that turn is never recorded, so the popup would keep
// showing a comfortable percentage next to an "out of context" error. Parse
// the failing request's counts out of the stamped contextError so the popup
// reflects the request that actually overflowed.
const getActiveContextOverflow = (messages: ThreadMessage[]) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const ctx = (messages[i].metadata as { contextError?: unknown } | undefined)
      ?.contextError
    if (typeof ctx === 'string' && ctx.length > 0) return parseContextOverflow(ctx)
  }
  return null
}

const getLatestServerUsage = (messages: ThreadMessage[]): UsageMeta => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const usage = (messages[i].metadata as { usage?: UsageMeta } | undefined)
      ?.usage
    if (usage && typeof usage.totalTokens === 'number' && usage.totalTokens > 0)
      return usage
  }
  return {}
}

const readSettingNumber = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

export const useTokensCount = (messages: ThreadMessage[] = []) => {
  const { selectedModel, selectedProvider, getProviderByName } =
    useModelProvider()
  const [modelProps, setModelProps] = useState<ModelProps | undefined>(
    undefined
  )
  const [loading, setLoading] = useState(false)
  const reqId = useRef(0)

  const isLocalProvider =
    selectedProvider === 'llamacpp' || selectedProvider === 'mlx'
  const modelId = selectedModel?.id

  const threadId = messages[0]?.thread_id
  // Populated per-chunk while a llama.cpp turn is streaming (timings_per_token);
  // cleared on stream start/finish/error, so its presence means "live now".
  const liveStats = useAppState((s) =>
    threadId ? s.liveTokenStatsByThread[threadId] : undefined
  )
  // getModelProps only succeeds once the router has autoloaded the model, which
  // normally doesn't happen until the first turn is sent. Refetch as soon as that
  // load finishes so the counter can appear mid-turn instead of waiting for the
  // full response (and the resulting messages.length bump) to land.
  const loadingModel = useAppState((s) =>
    threadId ? s.loadingModels[threadId] : s.loadingModel
  )

  useEffect(() => {
    // 仅本地模型需要从扩展获取运行时 modelProps
    if (!isLocalProvider || !modelId) {
      setModelProps(undefined)
      setLoading(false)
      return
    }
    const ext = getLocalPropsExtension(selectedProvider)
    if (!ext?.getModelProps) {
      setModelProps(undefined)
      return
    }
    const id = ++reqId.current
    setLoading(true)
    ext
      .getModelProps(modelId)
      .then((props) => {
        if (id !== reqId.current) return
        setModelProps(props)
      })
      .catch(() => {
        if (id !== reqId.current) return
        setModelProps(undefined)
      })
      .finally(() => {
        if (id !== reqId.current) return
        setLoading(false)
      })
  }, [isLocalProvider, modelId, selectedProvider, messages.length, loadingModel])

  const tokenData: TokenCountData = useMemo(() => {
    if (!modelId) {
      return {
        tokenCount: 0,
        loading: false,
        isNearLimit: false,
        fitEnabled: false,
      }
    }
    const overflow = isLocalProvider
      ? getActiveContextOverflow(messages)
      : null
    const usage =
      isLocalProvider && liveStats
        ? {
            inputTokens: liveStats.promptTokens,
            outputTokens: liveStats.completionTokens,
            totalTokens: liveStats.promptTokens + liveStats.completionTokens,
          }
        : getLatestServerUsage(messages)
    const tokenCount = overflow?.requestTokens ?? usage.totalTokens ?? 0

    // 远程模型优先使用 API 返回的上下文长度
    const ctxLenSetting = readSettingNumber(
      selectedModel?.settings?.ctx_len?.controller_props?.value
    )
    const apiContextLimit = (
      selectedModel?.providerMetadata?.limit as
        | { context?: number }
        | undefined
    )?.context
    const maxTokens =
      overflow?.contextTokens ??
      (isLocalProvider
        ? modelProps?.nCtx ?? ctxLenSetting
        : apiContextLimit ?? ctxLenSetting)
    const percentage = maxTokens ? (tokenCount / maxTokens) * 100 : undefined
    const isNearLimit = overflow != null || (percentage ? percentage > 85 : false)

    const provider = getProviderByName(selectedProvider)
    const fitEnabled =
      selectedProvider === 'llamacpp' &&
      provider?.settings?.find((s) => s.key === 'fit')?.controller_props
        ?.value === true
    const configuredCtxLen = ctxLenSetting
    const modelDisplayName =
      selectedProvider === 'llamacpp'
        ? modelProps?.modelAlias || selectedModel?.name || modelId
        : selectedModel?.name || modelId
    const caps = selectedModel?.capabilities ?? []
    const modalities = {
      vision: caps.includes('vision'),
      audio: caps.includes('audio'),
    }

    // 计算费用：从 providerMetadata.cost 取每百万 token 单价
    const costMeta = selectedModel?.providerMetadata?.cost as
      | { input?: number; output?: number }
      | undefined
    const cost =
      costMeta
        ? ((usage.inputTokens ?? 0) / 1_000_000) * (costMeta.input ?? 0) +
          ((usage.outputTokens ?? 0) / 1_000_000) * (costMeta.output ?? 0)
        : undefined

    return {
      tokenCount,
      inputTokens: overflow ? overflow.requestTokens : usage.inputTokens,
      outputTokens: overflow ? 0 : usage.outputTokens,
      maxTokens,
      percentage,
      isNearLimit,
      loading,
      modelProps,
      modelDisplayName,
      fitEnabled,
      configuredCtxLen,
      modalities,
      cost,
      isOverflow: overflow != null,
    }
  }, [
    messages,
    modelId,
    selectedProvider,
    isLocalProvider,
    modelProps,
    loading,
    liveStats,
    getProviderByName,
    selectedModel,
  ])

  return {
    ...tokenData,
    calculateTokens: async () => undefined,
  }
}
