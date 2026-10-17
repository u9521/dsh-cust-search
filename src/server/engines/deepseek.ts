import type {
  EngineContext,
  SearchEngine,
  SearchRequest,
  WebSearchProvider,
  WebSearchResult,
} from '../../types.ts'
import { toResult } from './result.ts'

/**
 * Official DeepSeek search providers, in preference order.
 *
 * Two of them exist since DSH 0.2.1-rc.2:
 *
 * - `deepseek-search-api` (`@deepseek-ai/dsh-web-deepseek-api`) issues one direct
 *   Search API request: no auxiliary model turn, and it takes a result count.
 * - `deepseek-official` (`@deepseek-ai/dsh-web-search-deepseek`) runs a whole
 *   Messages turn with the native `web_search` server tool.
 *
 * Both are "the official DeepSeek search", so the engine chain exposes them as
 * one engine and prefers the direct API: it is the cheaper, bounded request, and
 * its sources carry snippets and dates the Messages provider only derives from
 * citations. The list is the whole priority policy, in one place.
 */
const OFFICIAL_PROVIDER_IDS = [
  'deepseek-search-api',
  'deepseek-official',
] as const

/** The slice of the web runtime this bridge reads. */
interface WebProviderRegistry {
  searchProviders?: Map<string, WebSearchProvider>
  config?: { searchProvider?: { get?: () => unknown } }
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
        'no official DeepSeek search provider is registered ' +
          '(enable web-deepseek-api or web-search-deepseek)',
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
 * Read the preferred official provider out of the web runtime's registry.
 *
 * `@deepseek-ai/dsh-web` publishes no "provider registered under id X"
 * accessor: `WebRuntime.search()` resolves the provider *configuration*
 * selects, which is this plugin itself. This is the one place the private
 * registry shape is read, and it degrades to "absent" rather than throwing so a
 * changed runtime shape disables the bridge instead of breaking every search.
 *
 * Preference is two passes, not one:
 *
 * 1. The first provider that reports itself usable. A provider whose credential
 *    is missing must not shadow one that is configured.
 * 2. Otherwise the first *registered* provider anyway. Calling it would fail,
 *    but its own error names the missing key and where to set it — far more
 *    actionable than "nothing is registered" when the real problem is an
 *    unconfigured key. Availability is a routing hint, never a verdict.
 *
 * @param web - the `ctx.web` service.
 * @returns the preferred official provider, or undefined when none is registered.
 */
export function officialProviderOf(
  web: unknown,
): WebSearchProvider | undefined {
  const registry = web as WebProviderRegistry | null | undefined
  const registered = OFFICIAL_PROVIDER_IDS.map((id) =>
    registry?.searchProviders?.get(id),
  ).filter((provider): provider is WebSearchProvider => provider !== undefined)

  return registered.find(isUsable) ?? registered[0]
}

/** Whether a provider reports itself runnable, treating a throwing check as "no". */
function isUsable(provider: WebSearchProvider): boolean {
  try {
    return provider.available()
  } catch {
    return false
  }
}

/**
 * Which search provider the web seam will actually select, when it can be told.
 *
 * This plugin pins `web.searchProvider` to itself from its bundle patch, but the
 * official Web search settings page writes that same field: flipping its switch
 * is a deliberate user action, and the profile layer outranks a bundle layer, so
 * the pin loses and this plugin is silently deselected. The host warns at
 * startup instead of leaving that invisible.
 *
 * Best-effort by design — the field is private, and a runtime that renames or
 * hides it reports `undefined`, which reads as "cannot tell" rather than
 * producing a false alarm.
 *
 * @param web - the `ctx.web` service.
 * @returns the configured provider id, or undefined when nothing pins one.
 */
export function selectedSearchProviderOf(web: unknown): string | undefined {
  const registry = web as WebProviderRegistry | null | undefined
  const configured = registry?.config?.searchProvider?.get?.()
  if (typeof configured === 'string') return configured
  const ambient = process.env.DSH_WEB_SEARCH_PROVIDER
  return ambient && ambient.length > 0 ? ambient : undefined
}
