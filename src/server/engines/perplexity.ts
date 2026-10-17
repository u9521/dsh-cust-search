import type {
  EngineContext,
  SearchEngine,
  SearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'
import { engineRequest } from './request.ts'
import { toResult } from './result.ts'

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions'

export class PerplexitySearchEngine implements SearchEngine {
  readonly id = 'perplexity'
  readonly type = 'keyed' as const
  readonly defaultKeyRef = 'PERPLEXITY_API_KEY'

  async search(
    request: SearchRequest,
    ctx: EngineContext,
    signal: AbortSignal,
  ): Promise<WebSearchResult> {
    const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef
    const apiKey = await ctx.resolveApiKey(keyRef)
    if (!apiKey) {
      throw new Error(`Perplexity search requires "${keyRef}"`)
    }

    const response = await engineRequest(
      'Perplexity',
      PERPLEXITY_URL,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          max_tokens: 1024,
          messages: [{ role: 'user', content: request.query }],
        }),
        redirect: 'error',
      },
      signal,
    )

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

    // Citations are URL-only by design; the web seam renders title ?? hostname.
    const sources: WebSearchSource[] = (data.citations ?? [])
      .filter((url) => typeof url === 'string' && url.length > 0)
      .map((url) => ({ url }))

    return toResult(
      this.id,
      sources,
      data.choices?.[0]?.message?.content || undefined,
    )
  }
}
