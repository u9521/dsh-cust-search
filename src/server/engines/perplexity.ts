import type {
  SearchEngine,
  SearchEngineContext,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'
import { uniqueSources } from './base.ts'

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions'

export class PerplexitySearchEngine implements SearchEngine {
  readonly id = 'perplexity'
  readonly type = 'keyed' as const
  readonly defaultKeyRef = 'PERPLEXITY_API_KEY'

  available(): boolean {
    return true
  }

  async search(
    query: string,
    _maxResults: number,
    ctx: SearchEngineContext,
    signal?: AbortSignal,
  ): Promise<WebSearchResult> {
    const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef
    const apiKey = await ctx.resolveApiKey(keyRef)
    if (!apiKey) {
      throw new Error(`Perplexity search requires "${keyRef}"`)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)
    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort)

    let response: Response
    try {
      response = await fetch(PERPLEXITY_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          max_tokens: 1024,
          messages: [{ role: 'user', content: query }],
        }),
        signal: controller.signal,
        redirect: 'error',
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new Error(
        `Perplexity request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      if (response.status === 401) {
        throw new Error(
          `Perplexity API key is invalid (HTTP 401), update keyRef "${keyRef}" in settings`,
        )
      }
      if (response.status === 429) {
        throw new Error('Perplexity rate limit or quota exceeded (HTTP 429)')
      }
      throw new Error(
        `Perplexity API error (HTTP ${response.status}): ${detail.slice(0, 150)}`,
      )
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      citations?: string[]
    }

    const answer = data.choices?.[0]?.message?.content ?? ''
    const citations = data.citations ?? []

    // Citations are URL-only by design; the web seam renders title ?? hostname.
    const sources: WebSearchSource[] = citations
      .filter((url) => typeof url === 'string' && url.length > 0)
      .map((url) => ({ url }))

    if (sources.length === 0) {
      throw new Error('Perplexity returned 0 citations')
    }

    return {
      ...(answer ? { content: answer } : {}),
      sources: uniqueSources(sources),
      truncated: false,
    }
  }
}
