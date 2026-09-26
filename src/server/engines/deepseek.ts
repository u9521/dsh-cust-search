import type {
  SearchEngine,
  SearchEngineContext,
  WebSearchProvider,
  WebSearchResult,
} from '../../types.ts'

/** Id the official `web-search-deepseek` plugin registers its provider under. */
const OFFICIAL_PROVIDER_ID = 'deepseek-official'

/** The slice of the web runtime this bridge reads. */
interface WebProviderRegistry {
  searchProviders?: Map<string, WebSearchProvider>
}

/**
 * The official DeepSeek provider, as registered with the web seam.
 *
 * `@deepseek-ai/dsh-web` publishes no "provider registered under id X" accessor:
 * `WebRuntime.search()` resolves the provider *configuration* selects, which is
 * this plugin itself. The bridge therefore reads the runtime's registry
 * directly — in this one place — and reports absence rather than throwing, so a
 * changed runtime shape degrades to "engine unavailable" instead of breaking
 * every search.
 */
function officialProvider(
  ctx: SearchEngineContext,
): WebSearchProvider | undefined {
  const registry = ctx.web as WebProviderRegistry | null | undefined
  return registry?.searchProviders?.get(OFFICIAL_PROVIDER_ID)
}

/** Bridges the official DeepSeek search provider into the engine chain. */
export class DeepSeekBridgeEngine implements SearchEngine {
  readonly id = 'deepseek'
  readonly type = 'bridge' as const

  available(ctx: SearchEngineContext): boolean {
    const official = officialProvider(ctx)
    if (official === undefined) return false
    // Tolerate a registry entry that omits the (required) usability probe.
    return typeof official.available === 'function'
      ? official.available()
      : true
  }

  async search(
    query: string,
    maxResults: number,
    ctx: SearchEngineContext,
    signal?: AbortSignal,
  ): Promise<WebSearchResult> {
    const official = officialProvider(ctx)
    if (!official) {
      throw new Error(
        'web-search-deepseek plugin is not active or not registered',
      )
    }
    return await official.search({ query, maxResults }, signal)
  }
}
