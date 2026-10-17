import type {
  EngineContext,
  SearchEngine,
  SearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'
import { engineRequest } from './request.ts'
import { toResult } from './result.ts'

const TAVILY_URL = 'https://api.tavily.com/search'

export class TavilySearchEngine implements SearchEngine {
  readonly id = 'tavily'
  readonly type = 'keyed' as const
  readonly defaultKeyRef = 'TAVILY_API_KEY'

  async search(
    request: SearchRequest,
    ctx: EngineContext,
    signal: AbortSignal,
  ): Promise<WebSearchResult> {
    const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef
    const apiKey = await ctx.resolveApiKey(keyRef)

    const response = await engineRequest(
      'Tavily',
      TAVILY_URL,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(apiKey
            ? { authorization: `Bearer ${apiKey}` }
            : { 'x-tavily-access-mode': 'keyless' }),
        },
        body: JSON.stringify({
          query: request.query,
          max_results: Math.min(request.maxResults || 5, 20),
          search_depth: 'basic',
        }),
        redirect: 'error',
      },
      signal,
    )

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(
        `Tavily API error (HTTP ${response.status}): ${detail.slice(0, 150)}`,
      )
    }

    const data = (await response.json()) as {
      results?: Array<{ url?: string; title?: string; content?: string }>
    }
    const sources: WebSearchSource[] = (data.results ?? [])
      .filter((r) => Boolean(r.url))
      .map((r) => ({
        url: r.url!,
        ...(r.title ? { title: String(r.title) } : {}),
        ...(r.content ? { snippet: String(r.content) } : {}),
      }))

    return toResult(this.id, sources)
  }
}
