import type { EngineRegistry, SearchEngine } from '../../types.ts'
import { DeepSeekBridgeEngine, officialProviderOf } from './deepseek.ts'
import { BingSearchEngine } from './bing.ts'
import { DuckDuckGoSearchEngine } from './duckduckgo.ts'
import { SearxngSearchEngine } from './searxng.ts'
import { TavilySearchEngine } from './tavily.ts'
import { AnysearchSearchEngine } from './anysearch.ts'
import { ExaSearchEngine } from './exa.ts'
import { KeenableSearchEngine } from './keenable.ts'
import { FirecrawlSearchEngine } from './firecrawl.ts'
import { ParallelSearchEngine } from './parallel.ts'
import { PerplexitySearchEngine } from './perplexity.ts'

export * from './base.ts'
export * from './deadline.ts'
export * from './request.ts'
export * from './result.ts'
export * from './run.ts'
export * from './deepseek.ts'
export * from './bing.ts'
export * from './duckduckgo.ts'
export * from './searxng.ts'
export * from './tavily.ts'
export * from './anysearch.ts'
export * from './exa.ts'
export * from './keenable.ts'
export * from './firecrawl.ts'
export * from './parallel.ts'
export * from './perplexity.ts'

/**
 * Build the engine registry.
 *
 * The adapters are stateless, so one instance serves every request; callers
 * build the registry once and keep it. It used to be rebuilt per HTTP request
 * just to read each adapter's `id`.
 *
 * @param web - the `ctx.web` service, read only by the DeepSeek bridge.
 * @returns the registry.
 */
export function buildEngineRegistry(web?: unknown): EngineRegistry {
  const engines: SearchEngine[] = [
    new DeepSeekBridgeEngine(() => officialProviderOf(web)),
    new BingSearchEngine(),
    new DuckDuckGoSearchEngine(),
    new SearxngSearchEngine(),
    new TavilySearchEngine(),
    new AnysearchSearchEngine(),
    new ExaSearchEngine(),
    new KeenableSearchEngine(),
    new FirecrawlSearchEngine(),
    new ParallelSearchEngine(),
    new PerplexitySearchEngine(),
  ]
  const byId = new Map(engines.map((engine) => [engine.id, engine]))

  return {
    get: (id) => byId.get(id),
    all: () => engines,
    definitions: () =>
      engines.map((engine) => ({
        id: engine.id,
        type: engine.type,
        ...(engine.defaultKeyRef
          ? { defaultKeyRef: engine.defaultKeyRef }
          : {}),
      })),
  }
}
