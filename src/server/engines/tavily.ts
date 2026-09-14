import type {
  SearchEngine,
  SearchEngineContext,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'
import { uniqueSources } from './base.ts'

const TAVILY_URL = 'https://api.tavily.com/search'

export class TavilySearchEngine implements SearchEngine {
  readonly id = 'tavily'
  readonly type = 'keyed' as const
  readonly defaultKeyRef = 'TAVILY_API_KEY'

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
    const timer = setTimeout(() => controller.abort(), 12000)
    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort)

    let response: Response
    try {
      const body = {
        query,
        max_results: Math.min(maxResults || 5, 20),
        search_depth: 'basic',
      }

      response = await fetch(TAVILY_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(apiKey
            ? { authorization: `Bearer ${apiKey}` }
            : { 'x-tavily-access-mode': 'keyless' }),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        redirect: 'error',
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new Error(
        `Tavily request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }

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
        ...(r.content ? { snippet: String(r.content).slice(0, 300) } : {}),
      }))

    if (sources.length === 0) {
      throw new Error('Tavily returned 0 results')
    }

    return {
      sources: uniqueSources(sources, maxResults),
      truncated: false,
    }
  }
}
