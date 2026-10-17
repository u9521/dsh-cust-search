import type {
  EngineContext,
  SearchEngine,
  SearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'
import { engineRequest } from './request.ts'
import { toResult } from './result.ts'

const EXA_REST_URL = 'https://api.exa.ai/search'
const EXA_MCP_URL = 'https://mcp.exa.ai/mcp'

export class ExaSearchEngine implements SearchEngine {
  readonly id = 'exa'
  readonly type = 'keyed' as const
  readonly defaultKeyRef = 'EXA_API_KEY'

  async search(
    request: SearchRequest,
    ctx: EngineContext,
    signal: AbortSignal,
  ): Promise<WebSearchResult> {
    const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef
    const key = await ctx.resolveApiKey(keyRef)
    return key
      ? await this.searchRest(request, key, signal)
      : await this.searchMcp(request, signal)
  }

  private async searchRest(
    request: SearchRequest,
    apiKey: string,
    signal: AbortSignal,
  ): Promise<WebSearchResult> {
    const response = await engineRequest(
      'Exa',
      EXA_REST_URL,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          query: request.query,
          type: 'auto',
          contents: { highlights: { highlightsPerUrl: 1 } },
          numResults: request.maxResults || 5,
        }),
      },
      signal,
    )

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

    const sources: WebSearchSource[] = []
    for (const r of data.results ?? []) {
      const snippet = r.highlights?.find((h) => h.trim().length > 0)
      if (!r.url || !snippet) continue
      sources.push({
        url: r.url,
        ...(r.title ? { title: r.title } : {}),
        snippet,
        ...(r.publishedDate ? { publishedAt: r.publishedDate } : {}),
      })
    }

    return toResult(this.id, sources)
  }

  private async searchMcp(
    request: SearchRequest,
    signal: AbortSignal,
  ): Promise<WebSearchResult> {
    const response = await engineRequest(
      'Exa MCP',
      EXA_MCP_URL,
      {
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
            arguments: {
              query: request.query,
              numResults: request.maxResults || 5,
            },
          },
        }),
      },
      signal,
    )

    if (!response.ok) {
      throw new Error(`Exa MCP error (HTTP ${response.status})`)
    }

    const text = await response.text()
    let json: {
      error?: { message?: string }
      result?: { content?: Array<{ type: string; text?: string }> }
    } | null = null
    for (const line of text.split('\n')) {
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

    const textBlocks = (json.result?.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('\n')

    const sources: WebSearchSource[] = []

    for (const block of textBlocks.split(/\n(?=Title:)/)) {
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
        ...(highlights ? { snippet: highlights } : {}),
        ...(published && /^\d{4}-\d{2}-\d{2}/.test(published)
          ? { publishedAt: published }
          : {}),
      })
    }

    return toResult(this.id, sources)
  }
}
