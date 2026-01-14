import { predefinedProviders } from '@/consts/providers'

export type AuxiliaryModelOption = {
  provider: ModelProvider
  model: Model
}

const requiresApiKey = (provider: ModelProvider) => {
  return (
    provider.provider !== 'llamacpp' &&
    predefinedProviders.some((item) => item.provider.includes(provider.provider))
  )
}

export const getSelectableModelOptions = (
  providers: ModelProvider[]
): AuxiliaryModelOption[] => {
  const options: AuxiliaryModelOption[] = []

  providers.forEach((provider) => {
    if (!provider.active) return
    if (requiresApiKey(provider) && !provider.api_key?.length) return

    provider.models.forEach((model) => {
      options.push({ provider, model })
    })
  })

  return options
}

export const resolveAuxiliaryModel = (
  providers: ModelProvider[],
  target: ThreadModel | null | undefined
): AuxiliaryModelOption | null => {
  if (!target) return null

  const provider = providers.find(
    (item) => item.provider === target.provider
  )
  if (!provider || !provider.active) return null
  if (requiresApiKey(provider) && !provider.api_key?.length) return null

  const model = provider.models.find((item) => item.id === target.id)
  if (!model) return null

  return { provider, model }
}
