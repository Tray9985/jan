import { create } from 'zustand'

type ContextSummaryCacheEntry = {
  summarizedCount: number
  summaryText: string
}

type ContextSummaryCacheState = {
  cache: Record<string, ContextSummaryCacheEntry>
  getSummary: (threadId: string) => ContextSummaryCacheEntry | undefined
  setSummary: (threadId: string, entry: ContextSummaryCacheEntry) => void
  clearSummary: (threadId: string) => void
  clearAll: () => void
}

export const useContextSummaryCache = create<ContextSummaryCacheState>()(
  (set, get) => ({
    cache: {},
    getSummary: (threadId) => get().cache[threadId],
    setSummary: (threadId, entry) =>
      set((state) => ({
        cache: {
          ...state.cache,
          [threadId]: entry,
        },
      })),
    clearSummary: (threadId) =>
      set((state) => {
        if (!state.cache[threadId]) return state
        const { [threadId]: _, ...rest } = state.cache
        return { cache: rest }
      }),
    clearAll: () => set({ cache: {} }),
  })
)
