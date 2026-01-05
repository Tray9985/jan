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
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useMessages } from '@/hooks/useMessages'
import { useModelProvider } from '@/hooks/useModelProvider'
import { useAssistant } from '@/hooks/useAssistant'
import { generateThreadTitle } from '@/lib/threadTitle'
import { removeReasoningContent } from '@/utils/reasoning'

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
  const { getProviderByName } = useModelProvider()
  const currentAssistant = useAssistant((state) => state.currentAssistant)
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
      setIsOpen(false)
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
      toast.error('Failed to generate title', {
        description: 'Missing model information for this thread.',
      })
      return
    }
    const provider = getProviderByName(providerName)
    if (!provider) {
      toast.error('Failed to generate title', {
        description: 'Model provider is not available.',
      })
      return
    }

    const messages = getMessages(thread.id)
    const conversationText = buildConversationText(messages)
    if (!conversationText) {
      toast.error('Failed to generate title', {
        description: 'No messages found for this thread.',
      })
      return
    }

    const modelConfig = provider.models?.find((m) => m.id === modelId)
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
        thread,
        provider,
        userMessage: '',
        assistantMessage: '',
        baseParams,
        supportsReasoning,
        conversationText,
      })
      if (generatedTitle) {
        setTitle(generatedTitle)
      } else {
        toast.error('Failed to generate title')
      }
    } catch (error) {
      toast.error('Failed to generate title')
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
