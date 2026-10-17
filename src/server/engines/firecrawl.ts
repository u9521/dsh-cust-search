import type {
  EngineContext,
  SearchEngine,
  SearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'
import { engineRequest } from './request.ts'
import { toResult } from './result.ts'

const FIRECRAWL_URL = 'https://api.firecrawl.dev/v2/search'

export class FirecrawlSearchEngine implements SearchEngine {
  readonly id = 'firecrawl'
  readonly type = 'keyed' as const
  readonly defaultKeyRef = 'FIRECRAWL_API_KEY'

  async search(
    request: SearchRequest,
    ctx: EngineContext,
    signal: AbortSignal,
  ): Promise<WebSearchResult> {
    const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef
    const apiKey = await ctx.resolveApiKey(keyRef)

    const response = await engineRequest(
      'Firecrawl',
      FIRECRAWL_URL,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          query: request.query,
          limit: Math.min(Math.max(request.maxResults || 5, 1), 10),
        }),
        redirect: 'error',
      },
      signal,
    )

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      if (response.status === 401) {
        throw new Error(
          `Firecrawl API key is invalid (HTTP 401), update keyRef "${keyRef}" in settings`,
        )
      }
      if (response.status === 429) {
        throw new Error(
          `Firecrawl rate limit exceeded (HTTP 429), configure keyRef "${keyRef}" for higher limits`,
        )
      }
      throw new Error(
        `Firecrawl API error (HTTP ${response.status}): ${detail.slice(0, 150)}`,
      )
    }

    const data = (await response.json()) as {
      data?: {
        web?: Array<{ url?: string; title?: string; description?: string }>
      }
    }
    const sources: WebSearchSource[] = (data.data?.web ?? [])
      .filter((r) => Boolean(r.url))
      .map((r) => ({
        url: r.url!,
        ...(r.title ? { title: String(r.title) } : {}),
        ...(r.description ? { snippet: String(r.description) } : {}),
      }))

    return toResult(this.id, sources)
  }
}
