import { useMemo } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardItem } from '@/containers/Card'
import { useGeneralSetting } from '@/hooks/useGeneralSetting'
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
  const { auxiliaryModels, setAuxiliaryModel } = useGeneralSetting()
  const providers = useModelProvider((state) => state.providers)

  const modelOptions = useMemo(
    () => getSelectableModelOptions(providers),
    [providers]
  )

  const auxiliaryItems = [
    {
      key: 'threadTitle' as const,
      title: t('settings:auxiliaryModels.threadTitle'),
      description: t('settings:auxiliaryModels.threadTitleDesc'),
    },
  ]

  return (
    <Card title={t('settings:auxiliaryModels.title')}>
      {auxiliaryItems.map((item) => {
        const selectedTarget = auxiliaryModels[item.key] ?? null
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
            key={item.key}
            title={item.title}
            description={item.description}
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
                    onClick={() => setAuxiliaryModel(item.key, null)}
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
                          setAuxiliaryModel(item.key, {
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
      })}
    </Card>
  )
}
