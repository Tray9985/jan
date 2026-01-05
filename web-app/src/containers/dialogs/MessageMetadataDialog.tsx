import { useState } from 'react'
import { useTranslation } from '@/i18n/react-i18next-compat'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from '@/components/ui/dialog'
import { IconCopy, IconCopyCheck, IconInfoCircle } from '@tabler/icons-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import * as prismStyles from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { useCodeblock } from '@/hooks/useCodeblock'

interface MessageMetadataDialogProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any
  triggerElement?: React.ReactNode
}

export function MessageMetadataDialog({
  metadata,
  triggerElement,
}: MessageMetadataDialogProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const { codeBlockStyle } = useCodeblock()
  const metadataText = JSON.stringify(metadata || {}, null, 2)
  const syntaxStyle =
    prismStyles[
      codeBlockStyle
        .split('-')
        .map((part: string, index: number) =>
          index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
        )
        .join('') as keyof typeof prismStyles
    ] || prismStyles.oneLight

  const handleCopy = async () => {
    await navigator.clipboard.writeText(metadataText)
    setIsCopied(true)
    setTimeout(() => {
      setIsCopied(false)
    }, 2000)
  }

  const defaultTrigger = (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className="outline-0 focus:outline-0 flex items-center gap-1 hover:text-accent transition-colors cursor-pointer group relative"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setIsOpen(true)
            }
          }}
        >
          <IconInfoCircle size={16} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{t('metadata')}</p>
      </TooltipContent>
    </Tooltip>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>{triggerElement || defaultTrigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('common:dialogs.messageMetadata.title')}</DialogTitle>
          <div className="space-y-2 mt-4">
            <div className="border border-main-view-fg/10 rounded-md">
              <SyntaxHighlighter
                language="json"
                style={syntaxStyle}
                showLineNumbers={false}
                wrapLines={true}
                lineProps={{
                  style: {
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  },
                }}
                customStyle={{
                  margin: 0,
                  padding: '12px',
                  borderRadius: '6px',
                  maxHeight: '60vh',
                  overflow: 'auto',
                }}
                PreTag="div"
                CodeTag="code"
              >
                {metadataText}
              </SyntaxHighlighter>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs font-sans transition-colors text-main-view-fg/70 hover:text-main-view-fg"
              >
                {isCopied ? (
                  <>
                    <IconCopyCheck size={16} className="text-accent" />
                    <span>{t('common:copied')}</span>
                  </>
                ) : (
                  <>
                    <IconCopy size={16} />
                    <span>{t('common:copy')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
