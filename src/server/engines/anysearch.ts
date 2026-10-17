import type {
  EngineContext,
  SearchEngine,
  SearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'
import { engineRequest } from './request.ts'
import { toResult } from './result.ts'

const ANYSEARCH_URL = 'https://api.anysearch.com/v1/search'

export class AnysearchSearchEngine implements SearchEngine {
  readonly id = 'anysearch'
  readonly type = 'free' as const

  async search(
    request: SearchRequest,
    _ctx: EngineContext,
    signal: AbortSignal,
  ): Promise<WebSearchResult> {
    const response = await engineRequest(
      'AnySearch',
      ANYSEARCH_URL,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: request.query,
          max_results: request.maxResults || 5,
        }),
      },
      signal,
    )

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

    const sources: WebSearchSource[] = (data.data?.results ?? [])
      .filter((r) => Boolean(r.url))
      .map((r) => ({
        url: r.url!,
        ...(r.title ? { title: String(r.title) } : {}),
        ...(r.snippet ? { snippet: String(r.snippet) } : {}),
      }))

    return toResult(this.id, sources)
  }
}
