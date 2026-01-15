import { modelSettings } from '@/lib/predefined'
import { useModelProvider } from '@/hooks/useModelProvider'

type ProviderModelMetadata = {
  capabilities: string[]
  contextLength?: number
  displayName?: string
}

export type ModelMetadataCandidate = {
  id: string
  canonicalSlug?: string
  huggingFaceId?: string
  metadata: ProviderModelMetadata
  matchFields: string[]
}

export type ModelMetadataResolution = {
  metadata?: ProviderModelMetadata
  candidates?: ModelMetadataCandidate[]
}

type OpenRouterModel = {
  id: string
  name?: string
  canonical_slug?: string
  hugging_face_id?: string
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
    context_length?: number
    max_completion_tokens?: number
  }
}

const CACHE_DURATION = 5 * 60 * 1000
type OpenRouterCacheEntry = {
  timestamp: number
  metadata: Map<string, ProviderModelMetadata>
  models: OpenRouterModel[]
}

const openRouterCache = new Map<string, OpenRouterCacheEntry>()

const formatCompactNumber = (value: number) => {
  if (value >= 1000000) return `${Math.round(value / 1000000)}M`
  if (value >= 1000) return `${Math.round(value / 1000)}K`
  return value.toString()
}

const normalizeModelId = (value: string) => {
  if (!value) return ''
  return value
    .trim()
    .toLowerCase()
    .split('/')
    .map((segment) => segment.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
    .join('/')
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
  const topProviderContextLength =
    typeof model.top_provider?.context_length === 'number'
      ? model.top_provider.context_length
      : undefined
  const contextLength =
    topProviderContextLength ??
    (typeof model.context_length === 'number' ? model.context_length : undefined)
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

const getOpenRouterProvider = (): ModelProvider => {
  const state = useModelProvider.getState()
  const provider = state.getProviderByName
    ? state.getProviderByName('openrouter')
    : state.providers.find((item) => item.provider === 'openrouter')
  if (!provider) {
    throw new Error('OpenRouter provider is not configured.')
  }
  if (!provider.base_url) {
    throw new Error('OpenRouter base URL is not configured.')
  }
  if (!provider.api_key) {
    throw new Error('OpenRouter API key is required to fetch model metadata.')
  }
  return provider
}

const fetchOpenRouterModels = async (): Promise<OpenRouterModel[]> => {
  const provider = getOpenRouterProvider()
  const apiKey = provider.api_key
  if (!apiKey) {
    throw new Error('OpenRouter API key is required to fetch model metadata.')
  }
  console.log(`[ModelMetadata] Fetching OpenRouter models from ${provider.base_url}`)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  headers['x-api-key'] = apiKey
  headers['Authorization'] = `Bearer ${apiKey}`

  const response = await fetch(`${provider.base_url}/models`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch OpenRouter models: ${response.status} ${response.statusText}`
    )
  }

  const data = await response.json()
  const models = Array.isArray(data?.data) ? (data.data as OpenRouterModel[]) : []
  console.log(`[ModelMetadata] Fetched ${models.length} OpenRouter models`)
  return models
}

const buildMetadataCandidates = (
  models: OpenRouterModel[],
  metadataMap: Map<string, ProviderModelMetadata>,
  target: string,
  fields: Array<'id' | 'canonical_slug' | 'hugging_face_id'>
): ModelMetadataCandidate[] => {
  const results = new Map<string, ModelMetadataCandidate>()

  models.forEach((model) => {
    fields.forEach((field) => {
      const value =
        field === 'id'
          ? model.id
          : field === 'canonical_slug'
            ? model.canonical_slug
            : model.hugging_face_id
      if (!value) return
      if (normalizeModelId(value) !== target) return

      const existing = results.get(model.id)
      if (existing) {
        if (!existing.matchFields.includes(field)) {
          existing.matchFields.push(field)
        }
        return
      }

      const metadata = metadataMap.get(model.id) ?? parseOpenRouterMetadata(model)
      results.set(model.id, {
        id: model.id,
        canonicalSlug: model.canonical_slug,
        huggingFaceId: model.hugging_face_id,
        metadata,
        matchFields: [field],
      })
    })
  })

  return Array.from(results.values())
}

const getOpenRouterMetadataCache = async (): Promise<OpenRouterCacheEntry> => {
  const provider = getOpenRouterProvider()
  const cacheKey = `${provider.provider}-${provider.base_url}-${provider.api_key}`
  const logKey = `${provider.provider}-${provider.base_url}`
  const cached = openRouterCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[ModelMetadata] Cache hit for ${logKey}`)
    return cached
  }

  console.log(`[ModelMetadata] Cache miss for ${logKey}`)
  const models = await fetchOpenRouterModels()
  const map = new Map<string, ProviderModelMetadata>()
  models.forEach((model) => {
    if (model?.id) {
      map.set(model.id, parseOpenRouterMetadata(model))
    }
  })
  const entry: OpenRouterCacheEntry = {
    timestamp: Date.now(),
    metadata: map,
    models,
  }
  openRouterCache.set(cacheKey, entry)
  return entry
}

export const getModelMetadataMap = async (): Promise<
  Map<string, ProviderModelMetadata>
> => {
  const cache = await getOpenRouterMetadataCache()
  return cache.metadata
}

export const resolveModelMetadata = async (
  modelId: string
): Promise<ModelMetadataResolution> => {
  console.log(`[ModelMetadata] Resolving metadata for ${modelId}`)
  const cache = await getOpenRouterMetadataCache()
  const exactMatch = cache.metadata.get(modelId)
  if (exactMatch) {
    console.log(`[ModelMetadata] Exact match found for ${modelId}`)
    return { metadata: exactMatch }
  }

  const normalizedTarget = normalizeModelId(modelId)
  if (!normalizedTarget) {
    console.log(`[ModelMetadata] Normalized model ID is empty for ${modelId}`)
    return { metadata: undefined }
  }

  const idCandidates = buildMetadataCandidates(
    cache.models,
    cache.metadata,
    normalizedTarget,
    ['id']
  )
  if (idCandidates.length === 1) {
    console.log(`[ModelMetadata] Normalized id match found for ${modelId}`)
    return { metadata: idCandidates[0].metadata }
  }
  if (idCandidates.length > 1) {
    console.log(
      `[ModelMetadata] Multiple normalized id matches for ${modelId}: ${idCandidates
        .map((candidate) => candidate.id)
        .join(', ')}`
    )
    return { candidates: idCandidates }
  }

  const fallbackCandidates = buildMetadataCandidates(
    cache.models,
    cache.metadata,
    normalizedTarget,
    ['canonical_slug', 'hugging_face_id']
  )
  if (fallbackCandidates.length === 1) {
    console.log(`[ModelMetadata] Fallback match found for ${modelId}`)
    return { metadata: fallbackCandidates[0].metadata }
  }
  if (fallbackCandidates.length > 1) {
    console.log(
      `[ModelMetadata] Multiple fallback matches for ${modelId}: ${fallbackCandidates
        .map((candidate) => candidate.id)
        .join(', ')}`
    )
    return { candidates: fallbackCandidates }
  }

  console.log(`[ModelMetadata] No metadata match for ${modelId}`)
  return { metadata: undefined }
}
