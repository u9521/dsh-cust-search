import type {
  EngineContext,
  SearchEngine,
  SearchRequest,
  WebSearchProvider,
  WebSearchResult,
} from '../../types.ts'
import { toResult } from './result.ts'

/** Id the official `web-search-deepseek` plugin registers its provider under. */
const OFFICIAL_PROVIDER_ID = 'deepseek-official'

/** The slice of the web runtime this bridge reads. */
interface WebProviderRegistry {
  searchProviders?: Map<string, WebSearchProvider>
}

/** A resolver for the official provider, supplied by the plugin entry. */
export type OfficialProviderLookup = () => WebSearchProvider | undefined

/**
 * Bridges the official DeepSeek search provider into the engine chain.
 *
 * The lookup is a constructor argument rather than a field on the engine
 * context: reading the web runtime's private registry is this bridge's business
 * alone, and no other adapter should have to be told the runtime exists.
 */
export class DeepSeekBridgeEngine implements SearchEngine {
  readonly id = 'deepseek'
  readonly type = 'bridge' as const

  private readonly lookup: OfficialProviderLookup

  /**
   * @param lookup - resolves the official provider, or undefined when absent.
   */
  constructor(lookup: OfficialProviderLookup = () => undefined) {
    this.lookup = lookup
  }

  async search(
    request: SearchRequest,
    _ctx: EngineContext,
    signal: AbortSignal,
  ): Promise<WebSearchResult> {
    const official = this.lookup()
    if (!official) {
      throw new Error(
        'web-search-deepseek plugin is not active or not registered',
      )
    }
    const result = await official.search(
      { query: request.query, maxResults: request.maxResults },
      signal,
    )
    return toResult(this.id, result.sources, result.content)
  }
}

/**
 * Read the official provider out of the web runtime's registry.
 *
 * `@deepseek-ai/dsh-web` publishes no "provider registered under id X"
 * accessor: `WebRuntime.search()` resolves the provider *configuration*
 * selects, which is this plugin itself. This is the one place the private
 * registry shape is read, and it degrades to "absent" rather than throwing so a
 * changed runtime shape disables the bridge instead of breaking every search.
 *
 * @param web - the `ctx.web` service.
 * @returns the official provider, or undefined.
 */
export function officialProviderOf(
  web: unknown,
): WebSearchProvider | undefined {
  const registry = web as WebProviderRegistry | null | undefined
  return registry?.searchProviders?.get(OFFICIAL_PROVIDER_ID)
}
