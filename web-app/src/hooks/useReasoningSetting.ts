import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { localStorageKey } from '@/constants/localStorage'

type ReasoningSettingState = {
  reasoningByModel: Record<string, boolean>
  setReasoningEnabled: (modelId: string | undefined, enabled: boolean) => void
  getReasoningEnabled: (
    modelId: string | undefined,
    defaultEnabled?: boolean
  ) => boolean
}

export const useReasoningSetting = create<ReasoningSettingState>()(
  persist(
    (set, get) => ({
      reasoningByModel: {},
      setReasoningEnabled: (modelId, enabled) => {
        if (!modelId) return
        set((state) => ({
          reasoningByModel: {
            ...state.reasoningByModel,
            [modelId]: enabled,
          },
        }))
      },
      getReasoningEnabled: (modelId, defaultEnabled = false) => {
        if (!modelId) return defaultEnabled
        const { reasoningByModel } = get()
        if (Object.prototype.hasOwnProperty.call(reasoningByModel, modelId)) {
          return reasoningByModel[modelId]
        }
        return defaultEnabled
      },
    }),
    {
      name: localStorageKey.reasoningByModel,
      storage: createJSONStorage(() => localStorage),
    }
  )
)
