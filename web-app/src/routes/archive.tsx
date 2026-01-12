import { createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { IconArchive } from '@tabler/icons-react'
import { route } from '@/constants/routes'
import HeaderPage from '@/containers/HeaderPage'
import ThreadList from '@/containers/ThreadList'
import { useThreads } from '@/hooks/useThreads'
import { useTranslation } from '@/i18n/react-i18next-compat'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute(route.archive as any)({
  component: Archive,
})

function Archive() {
  const { t } = useTranslation()
  const threads = useThreads((state) => state.threads)
  const archivedThreads = useMemo(
    () => Object.values(threads).filter((thread) => thread.archived),
    [threads]
  )

  return (
    <div className="flex h-full flex-col justify-center">
      <HeaderPage>
        <div className="flex items-center justify-between w-full mr-2">
          <span>{t('common:archived')}</span>
        </div>
      </HeaderPage>
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-8 py-4">
        {archivedThreads.length > 0 ? (
          <ThreadList threads={archivedThreads} variant="project" />
        ) : (
          <div className="px-1 mt-2">
            <div className="flex items-center gap-1 text-main-view-fg/80">
              <IconArchive size={18} />
              <h6 className="font-medium text-base">
                {t('common:noArchivedThreads')}
              </h6>
            </div>
            <p className="text-main-view-fg/60 mt-1 text-xs leading-relaxed">
              {t('common:noArchivedThreadsDesc')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
