import { Minus, Square, X } from 'lucide-react'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/react-i18next-compat'

export const WindowControls = () => {
  const { t } = useTranslation()
  const appWindow = getCurrentWebviewWindow()

  const handleMinimize = async () => {
    await appWindow.minimize()
  }

  const handleMaximize = async () => {
    await appWindow.toggleMaximize()
  }

  const handleClose = async () => {
    await appWindow.close()
  }

  return (
    <div className="absolute top-0 z-50 right-4 h-15">
      <div className="flex items-center h-full">
        <Button
          onClick={handleMinimize}
          aria-label={t('common:minimize')}
          variant="ghost"
          size="icon-sm"
        >
          <Minus className="size-4" />
        </Button>
        <Button
          onClick={handleMaximize}
          variant="ghost"
          size="icon-sm"
          aria-label={t('common:maximize')}
        >
          <Square className="size-3" />
        </Button>
        <Button
          onClick={handleClose}
          variant="ghost"
          size="icon-sm"
          aria-label={t('common:close')}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
