import type {
  SearchEngine,
  SearchEngineContext,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'
import { uniqueSources } from './base.ts'

const KEENABLE_URL = 'https://api.keenable.ai/v1/search'
const KEENABLE_MCP_URL = 'https://api.keenable.ai/mcp'

export class KeenableSearchEngine implements SearchEngine {
  readonly id = 'keenable'
  readonly type = 'keyed' as const
  readonly defaultKeyRef = 'KEENABLE_API_KEY'

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
    if (apiKey) {
      return await this.searchRest(query, maxResults, apiKey, keyRef, signal)
    }
    return await this.searchMcp(query, maxResults, signal)
  }

  private async searchRest(
    query: string,
    _maxResults: number,
    apiKey: string,
    keyRef: string,
    signal?: AbortSignal,
  ): Promise<WebSearchResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)
    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort)

    let response: Response
    try {
      response = await fetch(KEENABLE_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ query, mode: 'realtime' }),
        signal: controller.signal,
        redirect: 'error',
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new Error(
        `Keenable request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      if (response.status === 401) {
        throw new Error(
          `Keenable API key is invalid (HTTP 401), update keyRef "${keyRef}" in settings`,
        )
      }
      throw new Error(
        `Keenable API error (HTTP ${response.status}): ${detail.slice(0, 150)}`,
      )
    }

    const data = (await response.json()) as {
      results?: Array<{
        url?: string
        title?: string
        snippet?: string
        description?: string
        published_at?: string
      }>
    }

    const sources: WebSearchSource[] = (data.results ?? [])
      .filter((r) => Boolean(r.url))
      .map((r) => {
        const snippet = r.snippet ?? r.description
        return {
          url: r.url!,
          ...(r.title ? { title: String(r.title) } : {}),
          ...(snippet ? { snippet: String(snippet).slice(0, 300) } : {}),
          ...(r.published_at ? { publishedAt: String(r.published_at) } : {}),
        }
      })

    if (sources.length === 0) {
      throw new Error('Keenable returned 0 results')
    }

    return {
      sources: uniqueSources(sources),
      truncated: false,
    }
  }

  private async searchMcp(
    query: string,
    maxResults: number,
    signal?: AbortSignal,
  ): Promise<WebSearchResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 25000)
    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort)

    let response: Response
    try {
      response = await fetch(KEENABLE_MCP_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'search_web_pages',
            arguments: { query },
          },
        }),
        signal: controller.signal,
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new Error(
        `Keenable MCP request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }

    if (!response.ok) {
      throw new Error(`Keenable MCP error (HTTP ${response.status})`)
    }

    const data = (await response.json()) as {
      error?: { message?: string }
      result?: {
        isError?: boolean
        content?: Array<{ type?: string; text?: string }>
      }
    }

    if (data.error) {
      throw new Error(
        `Keenable MCP error: ${data.error.message ?? 'unknown error'}`,
      )
    }

    const text = (data.result?.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('\n')

    if (data.result?.isError) {
      throw new Error(`Keenable MCP error: ${text.slice(0, 200)}`)
    }

    const sources = this.parseMcpText(text, maxResults)
    if (sources.length === 0) {
      throw new Error('Keenable MCP returned 0 results')
    }

    return {
      sources,
      truncated: false,
    }
  }

  /** Parse the `Title: / URL: / Snippets:` block layout returned by the MCP tool. */
  private parseMcpText(text: string, _maxResults: number): WebSearchSource[] {
    const sources: WebSearchSource[] = []
    for (const block of text.split(/\n(?=Title:)/)) {
      const title = block.match(/^Title: (.+)$/m)?.[1]
      const url = block.match(/^URL: (\S+)$/m)?.[1]
      const published =
        block.match(/^Published: (.+)$/m)?.[1] ??
        block.match(/^Acquired: (.+)$/m)?.[1]
      const snippets = block
        .split(/^Snippets:$/m)[1]
        ?.split('\n')
        .filter((line) => line.trim().length > 0)
        .slice(0, 3)
        .join(' ')

      if (!url) continue

      sources.push({
        url,
        ...(title ? { title } : {}),
        ...(snippets ? { snippet: snippets.slice(0, 300) } : {}),
        ...(published && /^\d{4}-\d{2}-\d{2}/.test(published)
          ? { publishedAt: published }
          : {}),
      })
    }
    return uniqueSources(sources)
  }
}
