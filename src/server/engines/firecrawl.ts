import type {
  SearchEngine,
  SearchEngineContext,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'
import { uniqueSources } from './base.ts'

const FIRECRAWL_URL = 'https://api.firecrawl.dev/v2/search'

export class FirecrawlSearchEngine implements SearchEngine {
  readonly id = 'firecrawl'
  readonly type = 'keyed' as const
  readonly defaultKeyRef = 'FIRECRAWL_API_KEY'

  available(): boolean {
    return true
  }

  async search(
    query: string,
    maxResults: number,
    ctx: SearchEngineContext,
    signal?: AbortSignal,
  ): Promise<WebSearchResult> {
    const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef
    const apiKey = await ctx.resolveApiKey(keyRef)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)
    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort)

    let response: Response
    try {
      const body = {
        query,
        limit: Math.min(Math.max(maxResults || 5, 1), 10),
      }

      response = await fetch(FIRECRAWL_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        redirect: 'error',
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new Error(
        `Firecrawl request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }

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
        ...(r.description
          ? { snippet: String(r.description).slice(0, 300) }
          : {}),
      }))

    if (sources.length === 0) {
      throw new Error('Firecrawl returned 0 results')
    }

    return {
      sources: uniqueSources(sources, maxResults),
      truncated: false,
    }
  }
}
