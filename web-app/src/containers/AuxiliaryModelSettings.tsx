import { useMemo } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Card, CardItem } from '@/containers/Card'
import {
  DEFAULT_CONTEXT_SUMMARY_MESSAGE_LIMIT,
  useGeneralSetting,
} from '@/hooks/useGeneralSetting'
import { useModelProvider } from '@/hooks/useModelProvider'
import { useTranslation } from '@/i18n/react-i18next-compat'
import { cn, getModelDisplayName, getProviderTitle } from '@/lib/utils'
import {
  getSelectableModelOptions,
  resolveAuxiliaryModel,
  type AuxiliaryModelOption,
} from '@/utils/auxiliaryModels'

const formatOptionLabel = (option: AuxiliaryModelOption) => {
  const providerName = getProviderTitle(option.provider.provider)
  const modelName = getModelDisplayName(option.model)
  return `${providerName} - ${modelName}`
}

const formatTargetLabel = (target: ThreadModel) => {
  const providerName = getProviderTitle(target.provider)
  return `${providerName} - ${target.id}`
}

export function AuxiliaryModelSettings() {
  const { t } = useTranslation()
  const {
    auxiliaryModels,
    setAuxiliaryModel,
    contextSummaryMessageLimit,
    setContextSummaryMessageLimit,
  } = useGeneralSetting()
  const providers = useModelProvider((state) => state.providers)

  const modelOptions = useMemo(
    () => getSelectableModelOptions(providers),
    [providers]
  )

  return (
    <>
      <Card title={t('settings:auxiliaryModels.threadTitleCard')}>
        {(() => {
          const selectedTarget = auxiliaryModels.threadTitle ?? null
          const resolvedSelection = resolveAuxiliaryModel(
            providers,
            selectedTarget
          )
          const selectedLabel = selectedTarget
            ? resolvedSelection
              ? formatOptionLabel(resolvedSelection)
              : formatTargetLabel(selectedTarget)
            : t('settings:auxiliaryModels.useChatModel')

          return (
            <CardItem
              title={t('settings:auxiliaryModels.threadTitle')}
              description={t('settings:auxiliaryModels.threadTitleDesc')}
              actions={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span
                      title={selectedLabel}
                      className="flex cursor-pointer items-center gap-1 px-2 py-1 rounded-sm bg-main-view-fg/15 text-sm outline-none text-main-view-fg font-medium max-w-[280px]"
                    >
                      <span className="truncate">{selectedLabel}</span>
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuItem
                      className={cn(
                        'cursor-pointer my-0.5',
                        selectedTarget === null && 'bg-main-view-fg/5'
                      )}
                      onClick={() => setAuxiliaryModel('threadTitle', null)}
                    >
                      {t('settings:auxiliaryModels.useChatModel')}
                    </DropdownMenuItem>
                    {modelOptions.length > 0 && <DropdownMenuSeparator />}
                    {modelOptions.map((option) => {
                      const isSelected =
                        selectedTarget?.id === option.model.id &&
                        selectedTarget?.provider === option.provider.provider
                      const label = formatOptionLabel(option)
                      return (
                        <DropdownMenuItem
                          key={`${option.provider.provider}:${option.model.id}`}
                          className={cn(
                            'cursor-pointer my-0.5',
                            isSelected && 'bg-main-view-fg/5'
                          )}
                          title={label}
                          onClick={() =>
                            setAuxiliaryModel('threadTitle', {
                              id: option.model.id,
                              provider: option.provider.provider,
                            })
                          }
                        >
                          <span className="truncate">{label}</span>
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            />
          )
        })()}
      </Card>
      <Card title={t('settings:auxiliaryModels.contextSummaryCard')}>
        {(() => {
          const selectedTarget = auxiliaryModels.contextSummary ?? null
          const resolvedSelection = resolveAuxiliaryModel(
            providers,
            selectedTarget
          )
          const selectedLabel = selectedTarget
            ? resolvedSelection
              ? formatOptionLabel(resolvedSelection)
              : formatTargetLabel(selectedTarget)
            : t('settings:auxiliaryModels.useChatModel')

          return (
            <CardItem
              title={t('settings:auxiliaryModels.contextSummary')}
              description={t('settings:auxiliaryModels.contextSummaryDesc')}
              actions={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span
                      title={selectedLabel}
                      className="flex cursor-pointer items-center gap-1 px-2 py-1 rounded-sm bg-main-view-fg/15 text-sm outline-none text-main-view-fg font-medium max-w-[280px]"
                    >
                      <span className="truncate">{selectedLabel}</span>
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuItem
                      className={cn(
                        'cursor-pointer my-0.5',
                        selectedTarget === null && 'bg-main-view-fg/5'
                      )}
                      onClick={() => setAuxiliaryModel('contextSummary', null)}
                    >
                      {t('settings:auxiliaryModels.useChatModel')}
                    </DropdownMenuItem>
                    {modelOptions.length > 0 && <DropdownMenuSeparator />}
                    {modelOptions.map((option) => {
                      const isSelected =
                        selectedTarget?.id === option.model.id &&
                        selectedTarget?.provider === option.provider.provider
                      const label = formatOptionLabel(option)
                      return (
                        <DropdownMenuItem
                          key={`${option.provider.provider}:${option.model.id}`}
                          className={cn(
                            'cursor-pointer my-0.5',
                            isSelected && 'bg-main-view-fg/5'
                          )}
                          title={label}
                          onClick={() =>
                            setAuxiliaryModel('contextSummary', {
                              id: option.model.id,
                              provider: option.provider.provider,
                            })
                          }
                        >
                          <span className="truncate">{label}</span>
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            />
          )
        })()}
        <CardItem
          title={t('settings:auxiliaryModels.contextSummaryLimit')}
          description={t('settings:auxiliaryModels.contextSummaryLimitDesc')}
          actions={
            <Input
              type="number"
              min={1}
              step={1}
              value={contextSummaryMessageLimit}
              onChange={(event) => {
                const rawValue = event.target.value
                if (rawValue === '') {
                  setContextSummaryMessageLimit(
                    DEFAULT_CONTEXT_SUMMARY_MESSAGE_LIMIT
                  )
                  return
                }
                const numericValue = Number(rawValue)
                if (!Number.isNaN(numericValue)) {
                  setContextSummaryMessageLimit(
                    Math.max(1, Math.floor(numericValue))
                  )
                }
              }}
              className="w-28"
            />
          }
        />
      </Card>
    </>
  )
}
