import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useModelProvider } from '@/hooks/useModelProvider'
import { useProviderModels } from '@/hooks/useProviderModels'
import { ModelCombobox } from '@/containers/ModelCombobox'
import { IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { cn, getProviderTitle } from '@/lib/utils'
import { useTranslation } from '@/i18n/react-i18next-compat'
import { getModelCapabilities } from '@/lib/models'
import {
  buildModelSettingsFromMetadata,
  formatContextLengthLabel,
  getContextLabelClasses,
  resolveModelMetadata,
  type ModelMetadataCandidate,
} from '@/lib/modelMetadata'
import { toast } from 'sonner'

type DialogAddModelProps = {
  provider: ModelProvider
  trigger?: React.ReactNode
}

export const DialogAddModel = ({ provider, trigger }: DialogAddModelProps) => {
  const { t } = useTranslation()
  const { updateProvider } = useModelProvider()
  const [modelId, setModelId] = useState<string>('')
  const [open, setOpen] = useState(false)
  const [isComboboxOpen, setIsComboboxOpen] = useState(false)
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false)
  const [metadataCandidates, setMetadataCandidates] = useState<
    ModelMetadataCandidate[]
  >([])
  const [pendingModelId, setPendingModelId] = useState<string>('')

  // Fetch models from provider API (API key is optional)
  const { models, loading, error, refetch } = useProviderModels(
    provider.base_url ? provider : undefined
  )

  const resetMetadataDialog = () => {
    setMetadataDialogOpen(false)
    setMetadataCandidates([])
    setPendingModelId('')
  }

  const addModelWithMetadata = (
    targetModelId: string,
    metadata?: Awaited<ReturnType<typeof resolveModelMetadata>>['metadata']
  ) => {
    const settings = buildModelSettingsFromMetadata(metadata)
    const capabilities =
      metadata?.capabilities ??
      getModelCapabilities(provider.provider, targetModelId)
    const displayName = metadata?.displayName

    const newModel = {
      id: targetModelId,
      model: targetModelId,
      name: targetModelId,
      capabilities,
      version: '1.0',
      ...(displayName ? { displayName } : {}),
      ...(settings ? { settings } : {}),
    }

    const updatedModels = [...provider.models, newModel]
    updateProvider(provider.provider, {
      ...provider,
      models: updatedModels,
    })

    setModelId('')
    setOpen(false)
  }

  // Handle form submission
  const handleSubmit = async () => {
    const trimmedModelId = modelId.trim()
    if (!trimmedModelId) return

    if (provider.models.some((e) => e.id === trimmedModelId)) {
      toast.error(t('providers:addModel.modelExists'), {
        description: t('providers:addModel.modelExistsDesc'),
      })
      return
    }

    let resolution: Awaited<ReturnType<typeof resolveModelMetadata>>
    try {
      resolution = await resolveModelMetadata(trimmedModelId)
    } catch (error) {
      toast.error(t('common:error'), {
        description:
          error instanceof Error ? error.message : t('common:unknownError'),
      })
      return
    }

    if (resolution.candidates && resolution.candidates.length > 1) {
      setMetadataCandidates(resolution.candidates)
      setPendingModelId(trimmedModelId)
      setMetadataDialogOpen(true)
      return
    }

    addModelWithMetadata(trimmedModelId, resolution.metadata)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          resetMetadataDialog()
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <div className="size-6 cursor-pointer flex items-center justify-center rounded hover:bg-main-view-fg/10 transition-all duration-200 ease-in-out">
            <IconPlus size={18} className="text-main-view-fg/50" />
          </div>
        )}
      </DialogTrigger>
      <DialogContent
        onEscapeKeyDown={(e: KeyboardEvent) => {
          if (isComboboxOpen) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('providers:addModel.title')}</DialogTitle>
          <DialogDescription>
            {t('providers:addModel.description', {
              provider: getProviderTitle(provider.provider),
            })}
          </DialogDescription>
        </DialogHeader>

        {/* Model selection field - required */}
        <div className="space-y-2">
          <label
            htmlFor="model-id"
            className="text-sm font-medium inline-block"
          >
            {t('providers:addModel.modelId')}{' '}
            <span className="text-destructive">*</span>
          </label>
          <ModelCombobox
            key={`${provider.provider}-${provider.base_url || ''}`}
            value={modelId}
            onChange={setModelId}
            models={models}
            loading={loading}
            error={error}
            onRefresh={refetch}
            placeholder={t('providers:addModel.enterModelId')}
            onOpenChange={setIsComboboxOpen}
          />
        </div>

        {/* Explore models link */}
        {provider.explore_models_url && (
          <div className="text-sm text-main-view-fg/70">
            <a
              href={provider.explore_models_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline text-primary"
            >
              <span>
                {t('providers:addModel.exploreModels', {
                  provider: getProviderTitle(provider.provider),
                })}
              </span>
            </a>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={!modelId.trim()}
          >
            {t('providers:addModel.addModel')}
          </Button>
        </DialogFooter>
      </DialogContent>
      <Dialog
        open={metadataDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            resetMetadataDialog()
            return
          }
          setMetadataDialogOpen(true)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('providers:addModel.metadataMatchTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('providers:addModel.metadataMatchDescription', {
                modelId: pendingModelId || modelId,
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[320px] overflow-auto">
            {metadataCandidates.map((candidate) => {
              const contextLabel = formatContextLengthLabel(
                candidate.metadata.contextLength
              )
              const contextClasses = getContextLabelClasses(
                candidate.metadata.contextLength
              )
              return (
                <div
                  key={candidate.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-main-view-fg/10 p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-main-view-fg">
                      {candidate.metadata.displayName || candidate.id}
                    </div>
                    <div className="text-xs text-main-view-fg/60 break-all">
                      {candidate.id}
                    </div>
                    {candidate.canonicalSlug && (
                      <div className="text-xs text-main-view-fg/60 break-all mt-1">
                        {candidate.canonicalSlug}
                      </div>
                    )}
                    {candidate.huggingFaceId && (
                      <div className="text-xs text-main-view-fg/60 break-all mt-1">
                        {candidate.huggingFaceId}
                      </div>
                    )}
                    {contextLabel && (
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-2',
                          contextClasses
                        )}
                      >
                        {contextLabel}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const targetModelId = pendingModelId || modelId.trim()
                      if (!targetModelId) return
                      addModelWithMetadata(targetModelId, candidate.metadata)
                      resetMetadataDialog()
                    }}
                  >
                    {t('providers:addModel.metadataMatchSelect')}
                  </Button>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={resetMetadataDialog}>
              {t('common:cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
