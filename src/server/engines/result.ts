import type { WebSearchResult, WebSearchSource } from '../../types.ts'

/**
 * What a usable search result is.
 *
 * Every adapter used to restate this: `uniqueSources()`, an `if (sources.length
 * === 0) throw`, a `truncated: false` literal, and — in some adapters only — a
 * 300-character snippet cap. The rule now lives here, once, so "empty means
 * failed" and "snippets are capped" are properties of the seam rather than
 * conventions an adapter might forget.
 *
 * @module @local/dsh-cust-search/server/engines/result
 */

/** Longest snippet a result may carry. */
export const SNIPPET_LIMIT = 300

/**
 * An adapter failed in a way the user can act on.
 *
 * Distinguishing this from a transport failure lets the caller skip an engine
 * that needs a key while still reporting a real outage.
 */
export class EngineResultError extends Error {
  /** Which engine produced no usable result. */
  readonly engineId: string

  constructor(engineId: string, reason: string) {
    super(`${engineId}: ${reason}`)
    this.name = 'EngineResultError'
    this.engineId = engineId
  }
}

/**
 * Shape one adapter's raw rows into a result the seam can accept.
 *
 * @param engineId - the engine the rows came from, used in the failure message.
 * @param sources - raw rows; URLs are required, everything else is optional.
 * @param content - provider-generated answer text, when the adapter has one.
 * @returns a deduplicated, snippet-capped, non-empty result.
 * @throws {EngineResultError} when no row carries a URL.
 */
export function toResult(
  engineId: string,
  sources: readonly WebSearchSource[],
  content?: string,
): WebSearchResult {
  const seen = new Set<string>()
  const shaped: WebSearchSource[] = []

  for (const source of sources) {
    if (!source.url || seen.has(source.url)) continue
    seen.add(source.url)
    shaped.push({
      url: source.url,
      ...(source.title ? { title: source.title } : {}),
      ...(source.snippet
        ? { snippet: source.snippet.slice(0, SNIPPET_LIMIT) }
        : {}),
      ...(source.publishedAt ? { publishedAt: source.publishedAt } : {}),
    })
  }

  if (shaped.length === 0) {
    throw new EngineResultError(engineId, 'returned no usable results')
  }

  return {
    ...(content ? { content } : {}),
    sources: shaped,
    truncated: false,
  }
}
