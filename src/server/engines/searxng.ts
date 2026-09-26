import type {
  SearchEngine,
  SearchEngineContext,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'
import { uniqueSources } from './base.ts'

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

  available(): boolean {
    return true
  }

  async search(
    query: string,
    _maxResults: number,
    ctx: SearchEngineContext,
    signal?: AbortSignal,
  ): Promise<WebSearchResult> {
    const customInstances = ctx.engineConfig.instances as string[] | undefined
    const instances =
      Array.isArray(customInstances) && customInstances.length > 0
        ? customInstances
        : DEFAULT_INSTANCES

    const errors: string[] = []

    for (const base of instances) {
      try {
        const params = new URLSearchParams({ q: query, format: 'json' })
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 6000)
        const onAbort = () => ctrl.abort()
        signal?.addEventListener('abort', onAbort)

        const response = await fetch(`${base}/search?${params}`, {
          headers: {
            'user-agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
            accept: 'application/json',
          },
          signal: ctrl.signal,
        })
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)

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

        if (sources.length > 0) {
          return {
            sources: uniqueSources(sources),
            truncated: false,
          }
        }
        errors.push(`${base}: 0 results`)
      } catch (error) {
        errors.push(
          `${base}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    throw new Error(
      `All SearXNG instances failed: ${errors.join('; ').slice(0, 200)}`,
    )
  }
}
