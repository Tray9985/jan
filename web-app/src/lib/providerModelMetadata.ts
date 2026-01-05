import { modelSettings } from '@/lib/predefined'

type ProviderModelMetadata = {
  capabilities: string[]
  contextLength?: number
  displayName?: string
}

type OpenRouterModel = {
  id: string
  name?: string
  context_length?: number
  max_completion_tokens?: number
  supported_parameters?: string[]
  architecture?: {
    modality?: {
      input?: string[]
      output?: string[]
    }
  }
  top_provider?: {
    max_completion_tokens?: number
  }
}

const CACHE_DURATION = 5 * 60 * 1000
const openRouterCache = new Map<
  string,
  { timestamp: number; data: Map<string, ProviderModelMetadata> }
>()

const formatCompactNumber = (value: number) => {
  if (value >= 1000000) return `${Math.round(value / 1000000)}M`
  if (value >= 1000) return `${Math.round(value / 1000)}K`
  return value.toString()
}

export const getModelContextLength = (model?: Model): number | undefined => {
  const rawValue = model?.settings?.ctx_len?.controller_props?.value
  if (typeof rawValue === 'number') return rawValue
  if (typeof rawValue === 'string') {
    const parsed = parseInt(rawValue, 10)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

export const formatContextLengthLabel = (contextLength?: number) => {
  if (!contextLength || !Number.isFinite(contextLength) || contextLength <= 0) {
    return undefined
  }
  return formatCompactNumber(contextLength)
}

export const getContextLabelClasses = (contextLength?: number) => {
  if (!contextLength || !Number.isFinite(contextLength) || contextLength <= 0) {
    return undefined
  }
  if (contextLength >= 1000000) return 'bg-emerald-200/80 text-emerald-900'
  if (contextLength >= 256000) return 'bg-lime-200/80 text-lime-900'
  if (contextLength >= 128000) return 'bg-amber-200/80 text-amber-900'
  return 'bg-orange-200/80 text-orange-900'
}

const buildCtxLenSetting = (contextLength?: number): ProviderSetting | undefined => {
  if (!contextLength || !Number.isFinite(contextLength) || contextLength <= 0) {
    return undefined
  }
  const base = modelSettings.ctx_len
  return {
    ...base,
    controller_props: {
      ...base.controller_props,
      value: contextLength,
      placeholder: String(contextLength),
    },
  }
}

export const buildModelSettingsFromMetadata = (
  metadata?: ProviderModelMetadata
): Record<string, ProviderSetting> | undefined => {
  const ctxSetting = buildCtxLenSetting(metadata?.contextLength)
  if (!ctxSetting) return undefined
  return { ctx_len: ctxSetting }
}

const parseOpenRouterCapabilities = (model: OpenRouterModel): string[] => {
  const capabilities = new Set<string>(['completion'])
  const supportedParams = Array.isArray(model.supported_parameters)
    ? model.supported_parameters
    : []
  const modalities = model.architecture?.modality?.input ?? []

  if (supportedParams.includes('tools') || supportedParams.includes('tool_choice')) {
    capabilities.add('tools')
  }
  if (supportedParams.includes('reasoning')) {
    capabilities.add('reasoning')
  }
  if (modalities.includes('image') || modalities.includes('vision')) {
    capabilities.add('vision')
  }

  return Array.from(capabilities)
}

const parseOpenRouterMetadata = (model: OpenRouterModel): ProviderModelMetadata => {
  const contextLength =
    typeof model.context_length === 'number' ? model.context_length : undefined
  const displayName =
    typeof model.name === 'string' && model.name.trim()
      ? model.name.trim()
      : undefined

  return {
    capabilities: parseOpenRouterCapabilities(model),
    contextLength,
    displayName,
  }
}

const fetchOpenRouterModels = async (
  provider: ModelProvider
): Promise<OpenRouterModel[]> => {
  if (!provider.base_url) return []
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (provider.api_key) {
    headers['x-api-key'] = provider.api_key
    headers['Authorization'] = `Bearer ${provider.api_key}`
  }

  const response = await fetch(`${provider.base_url}/models`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenRouter models: ${response.status}`)
  }

  const data = await response.json()
  return Array.isArray(data?.data) ? (data.data as OpenRouterModel[]) : []
}

const getOpenRouterMetadataMap = async (
  provider: ModelProvider
): Promise<Map<string, ProviderModelMetadata>> => {
  const cacheKey = `${provider.provider}-${provider.base_url}`
  const cached = openRouterCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  const models = await fetchOpenRouterModels(provider)
  const map = new Map<string, ProviderModelMetadata>()
  models.forEach((model) => {
    if (model?.id) {
      map.set(model.id, parseOpenRouterMetadata(model))
    }
  })
  openRouterCache.set(cacheKey, { timestamp: Date.now(), data: map })
  return map
}

export const getProviderModelsMetadataMap = async (
  provider: ModelProvider
): Promise<Map<string, ProviderModelMetadata>> => {
  if (provider.provider !== 'openrouter') return new Map()
  try {
    return await getOpenRouterMetadataMap(provider)
  } catch (error) {
    console.debug('Failed to fetch provider metadata:', error)
    return new Map()
  }
}

export const getProviderModelMetadata = async (
  provider: ModelProvider,
  modelId: string
): Promise<ProviderModelMetadata | undefined> => {
  const map = await getProviderModelsMetadataMap(provider)
  return map.get(modelId)
}
