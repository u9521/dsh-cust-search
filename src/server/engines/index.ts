import type { EngineDefinition, SearchEngine } from '../../types.ts'
import { DeepSeekBridgeEngine } from './deepseek.ts'
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

export function createEngineRegistry(): Map<string, SearchEngine> {
  const registry = new Map<string, SearchEngine>()

  const register = (engine: SearchEngine) => {
    registry.set(engine.id, engine)
  }

  register(new DeepSeekBridgeEngine())
  register(new BingSearchEngine())
  register(new DuckDuckGoSearchEngine())
  register(new SearxngSearchEngine())
  register(new TavilySearchEngine())
  register(new AnysearchSearchEngine())
  register(new ExaSearchEngine())
  register(new KeenableSearchEngine())
  register(new FirecrawlSearchEngine())
  register(new ParallelSearchEngine())
  register(new PerplexitySearchEngine())

  return registry
}

export function getEngineDefinitions(): EngineDefinition[] {
  const registry = createEngineRegistry()
  const defs: EngineDefinition[] = []
  for (const engine of registry.values()) {
    defs.push({
      id: engine.id,
      type: engine.type,
      ...(engine.defaultKeyRef ? { defaultKeyRef: engine.defaultKeyRef } : {}),
    })
  }
  return defs
}
