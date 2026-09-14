import type {
  SearchEngine,
  SearchEngineContext,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'
import { uniqueSources } from './base.ts'

const ANYSEARCH_URL = 'https://api.anysearch.com/v1/search'

export class AnysearchSearchEngine implements SearchEngine {
  readonly id = 'anysearch'
  readonly type = 'free' as const

  available(): boolean {
    return true
  }

  async search(
    query: string,
    maxResults: number,
    _ctx: SearchEngineContext,
    signal?: AbortSignal,
  ): Promise<WebSearchResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort)

    let response: Response
    try {
      response = await fetch(ANYSEARCH_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query, max_results: maxResults || 5 }),
        signal: controller.signal,
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new Error(
        `AnySearch request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }

    if (!response.ok) {
      throw new Error(`AnySearch API error (HTTP ${response.status})`)
    }

    const data = (await response.json()) as {
      code?: number
      message?: string
      data?: {
        results?: Array<{ url?: string; title?: string; snippet?: string }>
      }
    }

    if (data.code !== 0) {
      throw new Error(`AnySearch API error: ${data.message ?? data.code}`)
    }

    const results = data.data?.results ?? []
    const sources: WebSearchSource[] = results
      .filter((r) => Boolean(r.url))
      .map((r) => ({
        url: r.url!,
        ...(r.title ? { title: String(r.title) } : {}),
        ...(r.snippet ? { snippet: String(r.snippet).slice(0, 300) } : {}),
      }))

    if (sources.length === 0) {
      throw new Error('AnySearch returned 0 results')
    }

    return {
      sources: uniqueSources(sources, maxResults),
      truncated: false,
    }
  }
}
