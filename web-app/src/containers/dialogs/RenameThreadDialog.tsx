import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/i18n/react-i18next-compat'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogClose,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IconEdit, IconLoader2, IconSparkles } from '@tabler/icons-react'
import { ThreadMessage } from '@janhq/core'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useMessages } from '@/hooks/useMessages'
import { useModelProvider } from '@/hooks/useModelProvider'
import { useAssistant } from '@/hooks/useAssistant'
import { useGeneralSetting } from '@/hooks/useGeneralSetting'
import { generateThreadTitle } from '@/lib/threadTitle'
import { removeReasoningContent } from '@/utils/reasoning'
import { resolveAuxiliaryModel } from '@/utils/auxiliaryModels'

interface RenameThreadDialogProps {
  thread: Thread
  plainTitleForRename: string
  onRename: (threadId: string, title: string) => void
  onDropdownClose: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  withoutTrigger?: boolean
}

export function RenameThreadDialog({
  thread,
  plainTitleForRename,
  onRename,
  onDropdownClose,
  open,
  onOpenChange,
  withoutTrigger,
}: RenameThreadDialogProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [internalOpen, setInternalOpen] = useState(false)
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const getMessages = useMessages((state) => state.getMessages)
  const { getProviderByName, providers } = useModelProvider()
  const currentAssistant = useAssistant((state) => state.currentAssistant)
  const auxiliaryModels = useGeneralSetting((state) => state.auxiliaryModels)
  const isControlled = open !== undefined
  const isOpen = isControlled ? !!open : internalOpen
  const setOpenSafe = (next: boolean) => {
    if (isControlled) {
      onOpenChange?.(next)
    } else {
      setInternalOpen(next)
    }
  }

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setTitle(plainTitleForRename || t('common:newThread'))
    }
  }, [isOpen, plainTitleForRename, t])

  const handleOpenChange = (open: boolean) => {
    setOpenSafe(open)
    if (!open) {
      onDropdownClose()
    }
  }

  const handleRename = () => {
    if (title.trim()) {
      onRename(thread.id, title.trim())
      setOpenSafe(false)
      onDropdownClose()
      toast.success(t('common:toast.renameThread.title'), {
        id: 'rename-thread',
        description: t('common:toast.renameThread.description', { title }),
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (e.key === 'Enter' && title.trim()) {
      handleRename()
    }
  }

  const buildConversationText = (messages: ThreadMessage[]) => {
    const candidates = messages.filter(
      (message) => message.role === 'user' || message.role === 'assistant'
    )
    const sample =
      candidates.length <= 6
        ? candidates
        : [...candidates.slice(0, 3), ...candidates.slice(-3)]

    const lines = sample
      .map((message) => {
        const text = removeReasoningContent(
          message.content?.[0]?.text?.value || ''
        ).trim()
        if (!text) return null
        const roleLabel = message.role === 'user' ? '用户' : '助手'
        return `${roleLabel}：${text}`
      })
      .filter(Boolean)
    return lines.join('\n')
  }

  const handleAutoTitle = async () => {
    if (isGeneratingTitle) return
    const providerName = thread.model?.provider
    const modelId = thread.model?.id
    if (!providerName || !modelId) {
      toast.error(t('common:toast.autoRenameFailed.title'), {
        description: t('common:toast.autoRenameFailed.missingModel'),
      })
      return
    }
    const fallbackProvider = getProviderByName(providerName)
    if (!fallbackProvider) {
      toast.error(t('common:toast.autoRenameFailed.title'), {
        description: t('common:toast.autoRenameFailed.missingProvider'),
      })
      return
    }

    const messages = getMessages(thread.id)
    const conversationText = buildConversationText(messages)
    if (!conversationText) {
      toast.error(t('common:toast.autoRenameFailed.title'), {
        description: t('common:toast.autoRenameFailed.noMessages'),
      })
      return
    }

    const resolvedTitleModel = resolveAuxiliaryModel(
      providers,
      auxiliaryModels.threadTitle
    )
    const titleProvider = resolvedTitleModel?.provider ?? fallbackProvider
    const titleModel =
      resolvedTitleModel?.model ??
      fallbackProvider.models?.find((m) => m.id === modelId)
    if (!titleModel) {
      toast.error(t('common:toast.autoRenameFailed.title'), {
        description: t('common:toast.autoRenameFailed.missingModel'),
      })
      return
    }

    const titleThread = resolvedTitleModel
      ? {
          ...thread,
          model: {
            id: titleModel.id,
            provider: titleProvider.provider,
          },
        }
      : thread

    const modelConfig = titleModel
    const modelSettings = modelConfig?.settings
      ? Object.fromEntries(
          Object.entries(modelConfig.settings)
            .filter(
              ([key, value]) =>
                key !== 'ctx_len' &&
                key !== 'ngl' &&
                value.controller_props?.value !== undefined &&
                value.controller_props?.value !== null &&
                value.controller_props?.value !== ''
            )
            .map(([key, value]) => [key, value.controller_props?.value])
        )
      : undefined
    const baseParams = {
      ...modelSettings,
      ...(currentAssistant?.parameters || {}),
    } as Record<string, unknown>
    const supportsReasoning =
      modelConfig?.capabilities?.includes('reasoning') ?? false

    setIsGeneratingTitle(true)
    try {
      const generatedTitle = await generateThreadTitle({
        thread: titleThread,
        provider: titleProvider,
        userMessage: '',
        assistantMessage: '',
        baseParams,
        supportsReasoning,
        conversationText,
      })
      if (generatedTitle) {
        setTitle(generatedTitle)
      } else {
        toast.error(t('common:toast.autoRenameFailed.title'), {
          description: t('common:toast.autoRenameFailed.generic'),
        })
      }
    } catch (error) {
      toast.error(t('common:toast.autoRenameFailed.title'), {
        description: t('common:toast.autoRenameFailed.generic'),
      })
      throw error
    } finally {
      setIsGeneratingTitle(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!withoutTrigger && (
        <DialogTrigger asChild>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <IconEdit />
            <span>{t('common:rename')}</span>
          </DropdownMenuItem>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('common:threadTitle')}</DialogTitle>
          <div className="relative mt-2">
            <Input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="pr-10"
              onKeyDown={handleKeyDown}
              placeholder={t('common:threadTitle')}
              aria-label={t('common:threadTitle')}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
              <button
                onClick={handleAutoTitle}
                className="p-1 rounded hover:bg-main-view-fg/5 text-main-view-fg/70"
                type="button"
                disabled={isGeneratingTitle}
                title={`${t('common:auto')}${t('common:rename')}`}
                aria-label={`${t('common:auto')}${t('common:rename')}`}
              >
                {isGeneratingTitle ? (
                  <IconLoader2 size={16} className="animate-spin" />
                ) : (
                  <IconSparkles size={16} />
                )}
              </button>
            </div>
          </div>
          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <DialogClose asChild>
              <Button variant="link" size="sm" className="w-full sm:w-auto">
                {t('common:cancel')}
              </Button>
            </DialogClose>
            <Button
              disabled={!title.trim()}
              onClick={handleRename}
              size="sm"
              className="w-full sm:w-auto"
            >
              {t('common:rename')}
            </Button>
          </DialogFooter>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
