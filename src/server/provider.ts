import { WebError } from '@deepseek-ai/dsh-web'
import type {
  CustSearchStorage,
  EngineContext,
  EngineRegistry,
  SearchEngine,
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
} from '../types.ts'
import type { ConfigStore } from './config.ts'
import { DEFAULT_STORAGE } from './domain.ts'

export const CUST_SEARCH_PROVIDER_ID = 'cust-search'

export interface ProviderOptions {
  /** The configuration this provider reads on every search. */
  config: ConfigStore
  /** The engine set, built once and shared with the settings routes. */
  engines: EngineRegistry
  /** Credential resolver, already bound to its owning context. */
  resolveApiKey: EngineContext['resolveApiKey']
  /**
   * Run one engine. Injected so the provider owns policy (which engine, in what
   * order) while the runner owns mechanics (budget, outcome shape).
   */
  run: (
    engine: SearchEngine,
    storage: CustSearchStorage,
    query: string,
    maxResults: number,
    signal?: AbortSignal,
  ) => Promise<{ ok: boolean; result?: WebSearchResult; error?: string }>
  logger?: {
    info(message: string, ...args: unknown[]): void
    warn(message: string, ...args: unknown[]): void
    error(message: string, ...args: unknown[]): void
    debug(message: string, ...args: unknown[]): void
  }
}

/**
 * The search provider the web seam selects.
 *
 * Its whole job is policy: walk the configured engine order and stop at the
 * first engine that returns a usable result. Mechanics live in `runEngine`, so
 * this module never touches a timer or an `AbortController`.
 */
export class CustSearchProvider implements WebSearchProvider {
  readonly id = CUST_SEARCH_PROVIDER_ID

  private readonly options: ProviderOptions

  constructor(options: ProviderOptions) {
    this.options = options
  }

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

    const storage = this.options.config.read()
    const order =
      storage.enginesOrder.length > 0
        ? storage.enginesOrder
        : DEFAULT_STORAGE.enginesOrder
    const maxResults = request.maxResults ?? 5
    const failures: string[] = []

    for (const engineId of order) {
      if (signal?.aborted) {
        throw new WebError('Search request aborted', 'WEB_ABORTED')
      }

      const engine = this.options.engines.get(engineId)
      if (!engine) {
        this.options.logger?.warn?.(
          `cust-search: unknown engine "${engineId}", skipping`,
        )
        continue
      }

      const outcome = await this.options.run(
        engine,
        storage,
        request.query,
        maxResults,
        signal,
      )

      if (outcome.ok && outcome.result) return outcome.result

      const detail = outcome.error ?? 'returned no usable results'
      failures.push(`${engineId}: ${detail}`)
      this.options.logger?.warn?.(
        `cust-search: engine "${engineId}" failed (${detail}), trying next engine`,
      )
    }

    throw new WebError(
      `All configured search engines failed (${failures.join('; ') || 'no usable engines'}).`,
      'WEB_PROVIDER_ERROR',
    )
  }
}
