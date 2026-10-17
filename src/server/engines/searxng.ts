import type {
  EngineContext,
  SearchEngine,
  SearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'
import { DEFAULT_USER_AGENT } from './base.ts'
import { engineRequest } from './request.ts'
import { toResult } from './result.ts'

const DEFAULT_INSTANCES = [
  'https://opnxng.com',
  'https://priv.au',
  'https://searx.be',
  'https://searx.tiekoetter.com',
  'https://search.inetol.net',
  'https://paulgo.io',
]

export class SearxngSearchEngine implements SearchEngine {
  readonly id = 'searxng'
  readonly type = 'free' as const

  async search(
    request: SearchRequest,
    ctx: EngineContext,
    signal: AbortSignal,
  ): Promise<WebSearchResult> {
    const custom = ctx.engineConfig.instances
    const instances =
      Array.isArray(custom) && custom.length > 0 ? custom : DEFAULT_INSTANCES

    const errors: string[] = []

    for (const base of instances) {
      // One shared budget: instances are fallbacks of each other, not separate
      // calls, so the first slow host does not get a fresh 6 s each.
      if (signal.aborted) break

      try {
        const params = new URLSearchParams({
          q: request.query,
          format: 'json',
        })
        const response = await engineRequest(
          `SearXNG ${base}`,
          `${base}/search?${params}`,
          {
            headers: {
              'user-agent': DEFAULT_USER_AGENT,
              accept: 'application/json',
            },
          },
          signal,
        )

        if (!response.ok) {
          errors.push(`${base}: HTTP ${response.status}`)
          continue
        }

        const data = (await response.json().catch(() => null)) as {
          results?: Array<{ url?: string; title?: string; content?: string }>
        } | null

        if (!data || !Array.isArray(data.results)) {
          errors.push(`${base}: invalid JSON`)
          continue
        }

        const sources: WebSearchSource[] = data.results
          .filter((r) => Boolean(r.url))
          .map((r) => ({
            url: r.url!,
            ...(r.title ? { title: String(r.title) } : {}),
            ...(r.content ? { snippet: String(r.content) } : {}),
          }))

        if (sources.length > 0) return toResult(this.id, sources)
        errors.push(`${base}: 0 results`)
      } catch (error) {
        errors.push(
          `${base}: ${error instanceof Error ? error.message : String(error)}`,
        )
        if (signal.aborted) break
      }
    }

    throw new Error(
      `All SearXNG instances failed: ${errors.join('; ').slice(0, 200)}`,
    )
  }
}
