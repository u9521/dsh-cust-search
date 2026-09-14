import { WebError } from '@deepseek-ai/dsh-web'
import type {
  CustSearchStorage,
  SearchEngineContext,
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
} from '../types.ts'
import { createEngineRegistry } from './engines/index.ts'
import { DEFAULT_STORAGE, loadStorage } from './storage.ts'

export const CUST_SEARCH_PROVIDER_ID = 'cust-search'

export interface ProviderOptions {
  web?: unknown
  resolveApiKey: (keyRef?: string) => Promise<string | undefined>
  logger?: SearchEngineContext['logger']
}

export class CustSearchProvider implements WebSearchProvider {
  readonly id = CUST_SEARCH_PROVIDER_ID
  private readonly engines = createEngineRegistry()

  constructor(private readonly options: ProviderOptions) {}

  available(): boolean {
    return true
  }

  async search(
    request: WebSearchRequest,
    signal?: AbortSignal,
  ): Promise<WebSearchResult> {
    if (
      !request ||
      typeof request.query !== 'string' ||
      request.query.trim().length === 0
    ) {
      throw new WebError(
        'Query is required for web search',
        'WEB_PROVIDER_ERROR',
      )
    }

    const storage: CustSearchStorage = loadStorage()
    const engineIds =
      storage.enginesOrder && storage.enginesOrder.length > 0
        ? storage.enginesOrder
        : DEFAULT_STORAGE.enginesOrder

    const maxResults = request.maxResults ?? 5
    const failures: string[] = []

    for (const engineId of engineIds) {
      if (signal?.aborted) {
        throw new WebError('Search request aborted', 'WEB_ABORTED')
      }

      const engine = this.engines.get(engineId)
      if (!engine) {
        this.options.logger?.warn?.(
          `cust-search: unknown engine "${engineId}", skipping`,
        )
        continue
      }

      const engineConfig = storage.engineConfigs[engineId] ?? {}
      const engineCtx: SearchEngineContext = {
        config: storage,
        engineConfig,
        web: this.options.web,
        resolveApiKey: this.options.resolveApiKey,
        logger: this.options.logger,
      }

      if (!engine.available(engineCtx)) {
        this.options.logger?.debug?.(
          `cust-search: engine "${engineId}" is not available, skipping`,
        )
        continue
      }

      const timeoutMs =
        typeof engineConfig.timeout === 'number' && engineConfig.timeout > 0
          ? engineConfig.timeout
          : storage.defaultTimeout || 8000

      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), timeoutMs)
      const onAbort = () => ctrl.abort()
      signal?.addEventListener('abort', onAbort)

      try {
        const result = await engine.search(
          request.query,
          maxResults,
          engineCtx,
          ctrl.signal,
        )
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)

        if (result.sources && result.sources.length > 0) {
          return result
        }

        const msg = `engine "${engineId}" returned 0 results`
        failures.push(msg)
        this.options.logger?.warn?.(`cust-search: ${msg}, trying next engine`)
      } catch (err) {
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)

        if (signal?.aborted) {
          throw new WebError('Search request aborted', 'WEB_ABORTED')
        }

        const errMsg = err instanceof Error ? err.message : String(err)
        const msg = `${engineId}: ${errMsg}`
        failures.push(msg)
        this.options.logger?.warn?.(
          `cust-search: engine "${engineId}" failed (${errMsg}), trying next engine`,
        )
      }
    }

    throw new WebError(
      `All configured search engines failed (${failures.join('; ') || 'no usable engines'}).`,
      'WEB_PROVIDER_ERROR',
    )
  }
}
