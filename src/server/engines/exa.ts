import type {
  SearchEngine,
  SearchEngineContext,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'
import { uniqueSources } from './base.ts'

const EXA_REST_URL = 'https://api.exa.ai/search'
const EXA_MCP_URL = 'https://mcp.exa.ai/mcp'

export class ExaSearchEngine implements SearchEngine {
  readonly id = 'exa'
  readonly type = 'keyed' as const
  readonly defaultKeyRef = 'EXA_API_KEY'

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
    const key = await ctx.resolveApiKey(keyRef)
    if (key) {
      return await this.searchRest(query, maxResults, key, signal)
    }
    return await this.searchMcp(query, maxResults, signal)
  }

  private async searchRest(
    query: string,
    maxResults: number,
    apiKey: string,
    signal?: AbortSignal,
  ): Promise<WebSearchResult> {
    const body = {
      query,
      type: 'auto',
      contents: { highlights: { highlightsPerUrl: 1 } },
      numResults: maxResults || 5,
    }

    const response = await fetch(EXA_REST_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
      ...(signal !== undefined ? { signal } : {}),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(
        `Exa API error (HTTP ${response.status}): ${detail.slice(0, 150)}`,
      )
    }

    const data = (await response.json()) as {
      results?: Array<{
        url?: string
        title?: string
        publishedDate?: string
        highlights?: string[]
      }>
    }

    const sources: WebSearchSource[] = (data.results ?? [])
      .map((r) => {
        const snippet = r.highlights?.find((h) => h.trim().length > 0)
        if (!r.url || !snippet) return null
        return {
          url: r.url,
          ...(r.title ? { title: r.title } : {}),
          snippet,
          ...(r.publishedDate ? { publishedAt: r.publishedDate } : {}),
        }
      })
      .filter(Boolean) as WebSearchSource[]

    if (sources.length === 0) {
      throw new Error('Exa REST returned 0 results')
    }

    return {
      sources: uniqueSources(sources, maxResults),
      truncated: false,
    }
  }

  private async searchMcp(
    query: string,
    maxResults: number,
    signal?: AbortSignal,
  ): Promise<WebSearchResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort)

    let response: Response
    try {
      response = await fetch(EXA_MCP_URL, {
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
            name: 'web_search_exa',
            arguments: { query, numResults: maxResults || 5 },
          },
        }),
        signal: controller.signal,
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new Error(
        `Exa MCP request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }

    if (!response.ok) {
      throw new Error(`Exa MCP error (HTTP ${response.status})`)
    }

    const text = await response.text()
    const lines = text.split('\n')
    let json: {
      error?: { message?: string }
      result?: { content?: Array<{ type: string; text?: string }> }
    } | null = null
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          json = JSON.parse(line.slice(6))
          break
        } catch {}
      }
    }

    if (!json || json.error) {
      throw new Error(
        `Exa MCP error: ${json?.error?.message ?? 'invalid response'}`,
      )
    }

    const content = (json.result?.content ?? []) as Array<{
      type: string
      text?: string
    }>
    const textBlocks = content
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('\n')

    const blocks = textBlocks.split(/\n(?=Title:)/)
    const sources: WebSearchSource[] = []

    for (const block of blocks) {
      const title = block.match(/^Title: (.+)$/m)?.[1]
      const url = block.match(/^URL: (\S+)$/m)?.[1]
      const published = block.match(/^Published: (.+)$/m)?.[1]
      const highlights = block
        .split(/^Highlights:$/m)[1]
        ?.split('\n')
        .filter((l) => l.trim() && !l.trim().startsWith('...'))
        .slice(0, 3)
        .join(' ')

      if (!url) continue

      sources.push({
        url,
        ...(title ? { title } : {}),
        ...(highlights ? { snippet: highlights.slice(0, 300) } : {}),
        ...(published && /^\d{4}-\d{2}-\d{2}/.test(published)
          ? { publishedAt: published }
          : {}),
      })
    }

    if (sources.length === 0) {
      throw new Error('Exa MCP returned 0 results')
    }

    return {
      sources: uniqueSources(sources, maxResults),
      truncated: false,
    }
  }
}
