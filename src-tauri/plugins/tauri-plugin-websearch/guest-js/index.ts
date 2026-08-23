import { invoke } from '@tauri-apps/api/core'
import { SearchResult, FetchedPage } from './types'

export { SearchResult, FetchedPage } from './types'

export async function webSearch(
  query: string,
  count?: number,
  apiKey?: string,
  provider?: string,
  endpoint?: string,
  headers?: Record<string, string>
): Promise<SearchResult[]> {
  return await invoke('plugin:websearch|web_search', {
    query,
    count,
    provider,
    apiKey,
    endpoint,
    headers,
  })
}

export async function webFetch(
  url: string,
  apiKey?: string,
  provider?: string,
  endpoint?: string,
  headers?: Record<string, string>
): Promise<FetchedPage> {
  return await invoke('plugin:websearch|web_fetch', {
    url,
    provider,
    apiKey,
    endpoint,
    headers,
  })
}
