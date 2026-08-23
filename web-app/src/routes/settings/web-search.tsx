import { createFileRoute } from '@tanstack/react-router'
import { route } from '@/constants/routes'
import HeaderPage from '@/containers/HeaderPage'
import SettingsMenu from '@/containers/SettingsMenu'
import { Card, CardItem } from '@/containers/Card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTranslation } from '@/i18n/react-i18next-compat'
import { Input } from '@/components/ui/input'
import {
  ChevronsUpDown,
  Eye,
  EyeOff,
  Globe2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  useWebSearchConfig,
  WEB_SEARCH_PROVIDERS,
  getProviderMeta,
  providerFavicon,
  type CustomWebSearchProvider,
} from '@/hooks/useWebSearchConfig'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute(route.settings.web_search as any)({
  component: WebSearchContent,
})

const ProviderFavicon = ({ src }: { src: string }) => (
  <img
    src={src}
    alt=""
    className="size-4 shrink-0 rounded-full border border-border/50 bg-white object-contain"
  />
)

type HeaderRow = {
  id: string
  name: string
  value: string
}

function AddCustomProviderDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (provider: CustomWebSearchProvider) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [headers, setHeaders] = useState<HeaderRow[]>([])
  const [error, setError] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setName('')
    setBaseUrl('')
    setHeaders([])
    setError('')
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) reset()
  }

  const handleAdd = () => {
    const trimmedName = name.trim()
    const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, '')
    let url: URL
    try {
      url = new URL(trimmedBaseUrl)
    } catch {
      setError(t('settings:webSearch.customInvalidUrl'))
      return
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      setError(t('settings:webSearch.customInvalidUrl'))
      return
    }

    const headerEntries = headers.map((header) => [
      header.name.trim(),
      header.value.trim(),
    ])
    if (headerEntries.some(([headerName, value]) => !headerName || !value)) {
      setError(t('settings:webSearch.customIncompleteHeader'))
      return
    }
    if (
      new Set(headerEntries.map(([headerName]) => headerName.toLowerCase()))
        .size !== headerEntries.length
    ) {
      setError(t('settings:webSearch.customDuplicateHeader'))
      return
    }

    onAdd({
      id: `custom-${crypto.randomUUID()}`,
      name: trimmedName,
      baseUrl: trimmedBaseUrl,
      headers: Object.fromEntries(headerEntries),
    })
    onOpenChange(false)
    reset()
  }

  const canSubmit = name.trim().length > 0 && baseUrl.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[520px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          nameInputRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('settings:webSearch.customAddTitle')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">
              {t('settings:webSearch.customName')}
            </label>
            <Input
              ref={nameInputRef}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError('')
              }}
              placeholder={t('settings:webSearch.customNamePlaceholder')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">
              {t('settings:webSearch.customBaseUrl')}
            </label>
            <Input
              value={baseUrl}
              onChange={(event) => {
                setBaseUrl(event.target.value)
                setError('')
              }}
              placeholder="https://example.com/api/v1"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">
                {t('settings:webSearch.customHeaders')}
              </label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() =>
                  setHeaders((current) => [
                    ...current,
                    { id: crypto.randomUUID(), name: '', value: '' },
                  ])
                }
              >
                <Plus />
                {t('settings:webSearch.customAddHeader')}
              </Button>
            </div>
            {headers.length === 0 ? (
              <div className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                {t('settings:webSearch.customHeadersEmpty')}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {headers.map((header) => (
                  <div key={header.id} className="flex items-start gap-2">
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                      <Input
                        value={header.name}
                        onChange={(event) => {
                          setHeaders((current) =>
                            current.map((item) =>
                              item.id === header.id
                                ? { ...item, name: event.target.value }
                                : item
                            )
                          )
                          setError('')
                        }}
                        placeholder={t('settings:webSearch.customHeaderName')}
                      />
                      <Input
                        value={header.value}
                        onChange={(event) => {
                          setHeaders((current) =>
                            current.map((item) =>
                              item.id === header.id
                                ? { ...item, value: event.target.value }
                                : item
                            )
                          )
                          setError('')
                        }}
                        placeholder={t('settings:webSearch.customHeaderValue')}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('common:delete')}
                      onClick={() =>
                        setHeaders((current) =>
                          current.filter((item) => item.id !== header.id)
                        )
                      }
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="link" size="sm" className="hover:no-underline">
              {t('common:cancel')}
            </Button>
          </DialogClose>
          <Button size="sm" disabled={!canSubmit} onClick={handleAdd}>
            {t('common:save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function WebSearchContent() {
  const { t } = useTranslation()
  const [showKey, setShowKey] = useState(false)
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const {
    webSearchEnabled,
    searchProvider,
    apiKeys,
    endpoints,
    customProviders,
    setWebSearchEnabled,
    setSearchProvider,
    setApiKey,
    setEndpoint,
    addCustomProvider,
    deleteCustomProvider,
  } = useWebSearchConfig()

  const customProvider = customProviders.find(
    (item) => item.id === searchProvider
  )
  const provider = getProviderMeta(searchProvider)
  const providerLabel = customProvider?.name ?? provider.label
  const apiKey = apiKeys[provider.id] ?? ''
  const endpoint = endpoints[provider.id] ?? ''

  return (
    <div className="flex flex-col h-svh w-full">
      <HeaderPage>
        <div className="flex items-center gap-2 w-full">
          <span className="font-medium text-base font-studio">
            {t('common:settings')}
          </span>
        </div>
      </HeaderPage>
      <div className="flex h-[calc(100%-60px)]">
        <SettingsMenu />
        <div className="p-4 pt-0 w-full overflow-y-auto">
          <div className="flex flex-col justify-between gap-4 gap-y-3 w-full">
            <Card
              header={
                <div className="flex items-center justify-between">
                  <h1 className="text-foreground font-studio font-medium text-base mb-2">
                    {t('settings:webSearch.title')}
                  </h1>
                  <Switch
                    checked={webSearchEnabled}
                    onCheckedChange={setWebSearchEnabled}
                  />
                </div>
              }
            >
              <CardItem
                title={t('settings:webSearch.enable')}
                description={t('settings:webSearch.enableDesc')}
              />
              <CardItem
                title={t('settings:webSearch.provider')}
                description={t('settings:webSearch.providerDesc')}
                actions={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-between gap-2"
                      >
                        {customProvider ? (
                          <Globe2 className="size-4 shrink-0" />
                        ) : (
                          <ProviderFavicon src={providerFavicon(provider)} />
                        )}
                        <span className="max-w-36 truncate">{providerLabel}</span>
                        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      {WEB_SEARCH_PROVIDERS.map((p) => (
                        <DropdownMenuItem
                          key={p.id}
                          className={cn(
                            'cursor-pointer my-0.5 gap-2',
                            searchProvider === p.id && 'bg-secondary-foreground/8'
                          )}
                          onClick={() => setSearchProvider(p.id)}
                        >
                          <ProviderFavicon src={providerFavicon(p)} />
                          <span className="truncate">{p.label}</span>
                        </DropdownMenuItem>
                      ))}
                      {customProviders.map((item) => (
                        <DropdownMenuItem
                          key={item.id}
                          className={cn(
                            'cursor-pointer my-0.5 gap-2',
                            searchProvider === item.id &&
                              'bg-secondary-foreground/8'
                          )}
                          onClick={() => setSearchProvider(item.id)}
                        >
                          <Globe2 className="size-4 shrink-0" />
                          <span className="truncate">{item.name}</span>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer my-0.5 gap-2"
                        onSelect={() => setCustomDialogOpen(true)}
                      >
                        <Plus className="size-4" />
                        {t('settings:webSearch.customAdd')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              />
              {customProvider ? (
                <CardItem
                  title={customProvider.name}
                  description={
                    <div className="space-y-2">
                      <p className="break-all">{customProvider.baseUrl}</p>
                      <p>
                        {t('settings:webSearch.customHeadersCount', {
                          count: Object.keys(customProvider.headers).length,
                        })}
                      </p>
                    </div>
                  }
                  actions={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('common:delete')}
                      onClick={() => deleteCustomProvider(customProvider.id)}
                    >
                      <Trash2 />
                    </Button>
                  }
                />
              ) : provider.requiresEndpoint ? (
                <CardItem
                  title={t('settings:webSearch.endpoint', {
                    provider: provider.label,
                  })}
                  className="block"
                  description={
                    <div className="space-y-2">
                      <p>
                        {t('settings:webSearch.endpointDesc', {
                          provider: provider.label,
                        })}
                      </p>
                      <Input
                        type="text"
                        className="w-full"
                        placeholder={t('settings:webSearch.endpointPlaceholder')}
                        value={endpoint}
                        onChange={(e) =>
                          setEndpoint(provider.id, e.target.value)
                        }
                      />
                    </div>
                  }
                />
              ) : (
                <CardItem
                  title={t('settings:webSearch.apiKey', {
                    provider: provider.label,
                  })}
                  className="block"
                  description={
                    <div className="space-y-2">
                      <p>
                        {t(
                          provider.keyless
                            ? 'settings:webSearch.apiKeyOptional'
                            : 'settings:webSearch.apiKeyRequired',
                          { provider: provider.label }
                        )}
                      </p>
                      <div className="relative">
                        <Input
                          type={showKey ? 'text' : 'password'}
                          className="w-full pr-16"
                          placeholder={t(
                            'settings:webSearch.apiKeyPlaceholder',
                            { provider: provider.label }
                          )}
                          value={apiKey}
                          onChange={(e) =>
                            setApiKey(provider.id, e.target.value)
                          }
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                          <button
                            onClick={() => setShowKey(!showKey)}
                            className="p-1 rounded hover:bg-foreground/5 text-foreground/70"
                          >
                            {showKey ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                />
              )}
            </Card>
            <AddCustomProviderDialog
              open={customDialogOpen}
              onOpenChange={setCustomDialogOpen}
              onAdd={addCustomProvider}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
