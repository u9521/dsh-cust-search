import { randomUUID } from 'node:crypto'
import type {
  SearchEngine,
  SearchEngineContext,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'
import { uniqueSources } from './base.ts'

const PARALLEL_URL = 'https://api.parallel.ai/v1/search'
const PARALLEL_MCP_URL = 'https://search.parallel.ai/mcp'
const PARALLEL_MCP_PROTOCOL_VERSION = '2025-03-26'
const PARALLEL_MCP_SESSION_ID = randomUUID()

interface ParallelResult {
  url?: string
  title?: string
  excerpts?: string[]
  publish_date?: string
}

interface JsonRpcPayload {
  id?: number | string
  error?: { message?: string }
  result?: unknown
}

let nextRpcRequestId = 1

function createRpcRequestId(): number {
  return nextRpcRequestId++
}

export class ParallelSearchEngine implements SearchEngine {
  readonly id = 'parallel'
  readonly type = 'keyed' as const
  readonly defaultKeyRef = 'PARALLEL_API_KEY'

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
    maxResults: number,
    apiKey: string,
    keyRef: string,
    signal?: AbortSignal,
  ): Promise<WebSearchResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 25000)
    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort)

    let response: Response
    try {
      const body = {
        objective: query,
        search_queries: [query],
        mode: 'fast',
        advanced_settings: {
          max_results: Math.min(Math.max(maxResults || 5, 1), 20),
        },
      }

      response = await fetch(PARALLEL_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        redirect: 'error',
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new Error(
        `Parallel request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Parallel API key is invalid (HTTP ${response.status}), update keyRef "${keyRef}" in settings`,
        )
      }
      if (response.status === 402) {
        throw new Error(
          `Parallel quota or billing error (HTTP 402): ${detail.slice(0, 150)}`,
        )
      }
      throw new Error(
        `Parallel API error (HTTP ${response.status}): ${detail.slice(0, 150)}`,
      )
    }

    const data = (await response.json()) as {
      results?: ParallelResult[]
    }

    const sources = this.toSources(data.results ?? [], maxResults)
    if (sources.length === 0) {
      throw new Error('Parallel returned 0 results')
    }

    return {
      sources,
      truncated: false,
    }
  }

  private async searchMcp(
    query: string,
    maxResults: number,
    signal?: AbortSignal,
  ): Promise<WebSearchResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 35000)
    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort)

    try {
      const initResponse = await this.postMcp(
        {
          jsonrpc: '2.0',
          id: createRpcRequestId(),
          method: 'initialize',
          params: {
            protocolVersion: PARALLEL_MCP_PROTOCOL_VERSION,
            capabilities: {},
            clientInfo: {
              name: 'dsh-cust-search',
              version: '0.1.0',
            },
          },
        },
        undefined,
        controller.signal,
      )

      if (!initResponse.ok) {
        const detail = await initResponse.text().catch(() => '')
        throw new Error(
          `Parallel MCP initialize error (HTTP ${initResponse.status}): ${detail.slice(0, 150)}`,
        )
      }

      const sessionId = initResponse.headers.get('mcp-session-id') ?? undefined
      await this.readMcpPayload(initResponse, 'initialize')

      const initializedResponse = await this.postMcp(
        {
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        },
        sessionId,
        controller.signal,
      )

      if (!initializedResponse.ok) {
        const detail = await initializedResponse.text().catch(() => '')
        throw new Error(
          `Parallel MCP initialized notification error (HTTP ${initializedResponse.status}): ${detail.slice(0, 150)}`,
        )
      }

      const response = await this.postMcp(
        {
          jsonrpc: '2.0',
          id: createRpcRequestId(),
          method: 'tools/call',
          params: {
            name: 'web_search',
            arguments: {
              objective: query,
              search_queries: [query],
              session_id: PARALLEL_MCP_SESSION_ID,
            },
          },
        },
        sessionId,
        controller.signal,
      )

      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        throw new Error(
          `Parallel MCP error (HTTP ${response.status}): ${detail.slice(0, 150)}`,
        )
      }

      const payload = await this.readMcpPayload(response, 'web_search')
      const result = payload.result as
        | {
            isError?: boolean
            content?: Array<{ type?: string; text?: string }>
            structuredContent?: { results?: ParallelResult[] }
          }
        | undefined

      const text = (result?.content ?? [])
        .filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join('\n')

      if (result?.isError) {
        throw new Error(`Parallel MCP error: ${text.slice(0, 200)}`)
      }

      const sources = this.toSources(
        result?.structuredContent?.results ?? this.parseMcpSearchResults(text),
        maxResults,
      )
      if (sources.length === 0) {
        throw new Error('Parallel MCP returned 0 results')
      }

      return {
        sources,
        truncated: false,
      }
    } catch (error) {
      if (signal?.aborted) throw error
      if (error instanceof Error && error.message.startsWith('Parallel')) {
        throw error
      }
      throw new Error(
        `Parallel MCP request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
  }

  private async postMcp(
    body: unknown,
    sessionId: string | undefined,
    signal: AbortSignal,
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    }
    if (sessionId) {
      headers['mcp-session-id'] = sessionId
      headers['mcp-protocol-version'] = PARALLEL_MCP_PROTOCOL_VERSION
    }

    try {
      return await fetch(PARALLEL_MCP_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
        redirect: 'error',
      })
    } catch (error) {
      if (signal.aborted) throw error
      throw new Error(
        `Parallel MCP request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async readMcpPayload(
    response: Response,
    label: string,
  ): Promise<JsonRpcPayload> {
    const contentType = response.headers.get('content-type') ?? ''
    const text = await response.text()

    let payload: JsonRpcPayload
    if (contentType.includes('text/event-stream')) {
      payload = this.parseMcpEventStream(text, label)
    } else {
      try {
        payload = JSON.parse(text) as JsonRpcPayload
      } catch {
        throw new Error(`Parallel MCP ${label} returned invalid JSON`)
      }
    }

    if (payload.error) {
      throw new Error(
        `Parallel MCP ${label} error: ${payload.error.message ?? 'unknown error'}`,
      )
    }

    return payload
  }

  private parseMcpEventStream(text: string, label: string): JsonRpcPayload {
    for (const event of text.split(/\r?\n\r?\n/)) {
      const data = event
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n')

      if (!data) continue

      try {
        const payload = JSON.parse(data) as JsonRpcPayload
        if (payload.error || payload.result !== undefined || payload.id) {
          return payload
        }
      } catch {}
    }

    throw new Error(`Parallel MCP ${label} returned an invalid event stream`)
  }

  /** Parse the JSON payload carried in the `web_search` text content block. */
  private parseMcpSearchResults(text: string): ParallelResult[] {
    try {
      const payload = JSON.parse(text) as { results?: ParallelResult[] }
      if (!Array.isArray(payload.results)) {
        throw new Error('missing results array')
      }
      return payload.results
    } catch (error) {
      throw new Error(
        `Parallel MCP web_search returned an invalid payload: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  private toSources(
    results: ParallelResult[],
    maxResults: number,
  ): WebSearchSource[] {
    const sources: WebSearchSource[] = results
      .filter((result) => Boolean(result.url))
      .map((result) => {
        const excerpt = (result.excerpts ?? []).find(
          (item) => String(item).trim().length > 0,
        )
        return {
          url: result.url!,
          ...(result.title ? { title: String(result.title) } : {}),
          ...(excerpt ? { snippet: String(excerpt).slice(0, 300) } : {}),
          ...(result.publish_date
            ? { publishedAt: String(result.publish_date) }
            : {}),
        }
      })

    return uniqueSources(sources, maxResults)
  }
}
