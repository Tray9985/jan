import { IconStar, IconStarFilled } from '@tabler/icons-react'
import { useFavoriteModel } from '@/hooks/useFavoriteModel'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/react-i18next-compat'

interface FavoriteModelActionProps {
  model: Model
}

export function FavoriteModelAction({ model }: FavoriteModelActionProps) {
  const { isFavorite, toggleFavorite } = useFavoriteModel()
  const isModelFavorite = isFavorite(model.id)
  const { t } = useTranslation()

  return (
    <Button
      aria-label={t('common:toggleFavorite')}
      variant="ghost"
      size="icon-xs"
      onClick={() => toggleFavorite(model)}
    >
      {isModelFavorite ? (
        <IconStarFilled size={18} className="text-muted-foreground" />
      ) : (
        <IconStar size={18} className="text-muted-foreground" />
      )}
    </Button>
  )
}
