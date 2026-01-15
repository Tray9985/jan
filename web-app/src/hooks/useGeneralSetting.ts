import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { localStorageKey } from '@/constants/localStorage'
import { ExtensionManager } from '@/lib/extension'
import { useContextSummaryCache } from '@/hooks/useContextSummaryCache'

export const DEFAULT_CONTEXT_SUMMARY_MESSAGE_LIMIT = 15

export type AuxiliaryModelKey = 'threadTitle' | 'contextSummary'
export type AuxiliaryModels = Record<AuxiliaryModelKey, ThreadModel | null>

type GeneralSettingState = {
  currentLanguage: Language
  spellCheckChatInput: boolean
  tokenCounterCompact: boolean
  huggingfaceToken?: string
  auxiliaryModels: AuxiliaryModels
  contextSummaryEnabled: boolean
  contextSummaryMessageLimit: number
  setAuxiliaryModel: (key: AuxiliaryModelKey, model: ThreadModel | null) => void
  setContextSummaryEnabled: (value: boolean) => void
  setContextSummaryMessageLimit: (value: number) => void
  setHuggingfaceToken: (token: string) => void
  setSpellCheckChatInput: (value: boolean) => void
  setTokenCounterCompact: (value: boolean) => void
  setCurrentLanguage: (value: Language) => void
}

export const useGeneralSetting = create<GeneralSettingState>()(
  persist(
    (set) => ({
      currentLanguage: 'en',
      spellCheckChatInput: true,
      tokenCounterCompact: true,
      huggingfaceToken: undefined,
      auxiliaryModels: {
        threadTitle: null,
        contextSummary: null,
      },
      contextSummaryEnabled: true,
      contextSummaryMessageLimit: DEFAULT_CONTEXT_SUMMARY_MESSAGE_LIMIT,
      setAuxiliaryModel: (key, model) =>
        set((state) => ({
          auxiliaryModels: {
            ...state.auxiliaryModels,
            [key]: model,
          },
        })),
      setContextSummaryEnabled: (value) =>
        set(() => {
          useContextSummaryCache.getState().clearAll()
          return {
            contextSummaryEnabled: value,
          }
        }),
      setContextSummaryMessageLimit: (value) =>
        set(() => {
          useContextSummaryCache.getState().clearAll()
          return {
            contextSummaryMessageLimit: value,
          }
        }),
      setSpellCheckChatInput: (value) => set({ spellCheckChatInput: value }),
      setTokenCounterCompact: (value) => set({ tokenCounterCompact: value }),
      setCurrentLanguage: (value) => set({ currentLanguage: value }),
      setHuggingfaceToken: (token) => {
        set({ huggingfaceToken: token })
        ExtensionManager.getInstance()
          .getByName('@janhq/download-extension')
          ?.getSettings()
          .then((settings) => {
            if (settings) {
              const newSettings = settings.map((e) => {
                if (e.key === 'hf-token') {
                  e.controllerProps.value = token
                }
                return e
              })
              ExtensionManager.getInstance()
                .getByName('@janhq/download-extension')
                ?.updateSettings(newSettings)
            }
          })
      },
    }),
    {
      name: localStorageKey.settingGeneral,
      storage: createJSONStorage(() => localStorage),
    }
  )
)
