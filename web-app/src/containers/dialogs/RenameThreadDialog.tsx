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
import { IconEdit, IconSparkles, IconLoader2 } from '@tabler/icons-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useMessages } from '@/hooks/useMessages'
import { generateThreadTitle, buildTranscriptFromMessages } from '@/lib/thread-title-summarizer'

interface RenameThreadDialogProps {
  thread: Thread
  plainTitleForRename: string
  onRename: (threadId: string, title: string) => void
  onDropdownClose?: () => void
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
  const [aiLoading, setAiLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

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
    if (isOpen) {
      setTitle(plainTitleForRename || t('common:newThread'))
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isOpen, plainTitleForRename, t])

  const handleOpenChange = (open: boolean) => {
    setOpenSafe(open)
    if (!open) {
      onDropdownClose?.()
    }
  }

  const handleRename = () => {
    if (title.trim()) {
      onRename(thread.id, title.trim())
      setOpenSafe(false)
      onDropdownClose?.()
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

  // AI 自动生成标题
  const handleAiRename = async () => {
    try {
      setAiLoading(true)
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const messages = useMessages.getState().getMessages(thread.id)
      const transcript = buildTranscriptFromMessages(messages)
      if (!transcript) return

      const newTitle = await generateThreadTitle(transcript, controller.signal)
      if (!newTitle) return

      onRename(thread.id, newTitle)
      setOpenSafe(false)
      onDropdownClose?.()
      toast.success(t('common:toast.renameThread.title'), {
        id: 'rename-thread-via-ai',
        description: t('common:toast.renameThread.description', {
          title: newTitle,
        }),
      })
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      console.error('AI rename failed:', error)
    } finally {
      setAiLoading(false)
      abortRef.current = null
    }
  }

  // 弹窗关闭时取消进行中的 AI 请求
  useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort()
      setAiLoading(false)
    }
  }, [isOpen])

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
              className="pr-8"
              onKeyDown={handleKeyDown}
              placeholder={t('common:threadTitle')}
              aria-label={t('common:threadTitle')}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
              disabled={aiLoading}
              onClick={handleAiRename}
              aria-label="AI rename"
            >
              {aiLoading ? (
                <IconLoader2 size={16} className="animate-spin" />
              ) : (
                <IconSparkles size={16} />
              )}
            </Button>
          </div>
          <DialogFooter className="mt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                {t('common:cancel')}
              </Button>
            </DialogClose>
            <Button
              disabled={!title.trim() || title.trim() === plainTitleForRename}
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
