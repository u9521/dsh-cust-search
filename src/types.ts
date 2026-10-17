import type {
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '@deepseek-ai/dsh-web'

export type {
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
  WebSearchSource,
}

export type EngineType = 'bridge' | 'free' | 'keyed'

export interface EngineSpecificConfig {
  timeout?: number
  keyRef?: string
  market?: string
  instances?: string[]
  [key: string]: unknown
}

export interface CustSearchStorage {
  defaultTimeout: number
  enginesOrder: string[]
  engineConfigs: Record<string, EngineSpecificConfig>
}

export interface EngineDefinition {
  id: string
  type: EngineType
  defaultKeyRef?: string
  hasKey?: boolean
  keySource?: 'credentials' | 'env' | 'none'
}

/** How the host talks to the engine set. */
export interface EngineRegistry {
  /** Look one engine up; undefined for an unknown id. */
  get(id: string): SearchEngine | undefined
  /** Every engine, in declaration order. */
  all(): readonly SearchEngine[]
  /** Display facts for the settings page. */
  definitions(): EngineDefinition[]
}

/** Reported so the settings page can distinguish a budget expiry from a failure. */
export interface EngineRunOutcome {
  ok: boolean
  result?: WebSearchResult
  error?: string
  durationMs: number
  timedOut: boolean
}

/**
 * One search call's time budget.
 *
 * Internal to the runner: it is the only module allowed to release the budget,
 * so it never crosses the adapter seam. Adapters receive the `signal` alone.
 */
export interface Deadline {
  /** Aborted when the budget expires or the caller aborts. */
  readonly signal: AbortSignal
  /** Whether the budget itself expired. False when only the caller aborted. */
  readonly timedOut: boolean
  /** Release the timer and the caller listener. Idempotent. */
  dispose(): void
}

/**
 * What an engine adapter is allowed to know.
 *
 * Deliberately two fields. The stored configuration and the logger used to be
 * here too, but no adapter ever read them, so they only widened the interface
 * every adapter had to be written against.
 */
export interface EngineContext {
  /** This engine's own configuration slice. */
  engineConfig: EngineSpecificConfig
  /** Resolve one credential reference to its value. */
  resolveApiKey: (keyRef?: string) => Promise<string | undefined>
}

/**
 * What an adapter needs to know about one search call.
 *
 * `maxResults` stays because an API that takes a result count should ask for
 * enough: the web seam truncates on the way back but cannot recover sources an
 * adapter never requested.
 */
export interface SearchRequest {
  readonly query: string
  readonly maxResults: number
}

/** How one adapter reads the web: its identity, and one search entry point. */
export interface SearchEngine {
  readonly id: string
  readonly type: EngineType
  readonly defaultKeyRef?: string
  /**
   * Run one search.
   *
   * The caller owns the time budget; the adapter forwards `signal` to every
   * request and never schedules a timer of its own. Returning an empty
   * `sources` array is a failure: the caller treats it as one.
   *
   * @param request - the query and the result count to ask upstream for.
   * @param ctx - this engine's configuration and credential resolver.
   * @param signal - the call's abort signal; it ends when the budget expires.
   * @returns the adapter's raw result; shaping happens once, outside.
   */
  search(
    request: SearchRequest,
    ctx: EngineContext,
    signal: AbortSignal,
  ): Promise<WebSearchResult>
}

export interface GetConfigResponse {
  config: CustSearchStorage
  definitions: EngineDefinition[]
}

export interface SetConfigRequest {
  defaultTimeout: number
  enginesOrder: string[]
  engineConfigs: Record<string, EngineSpecificConfig>
  keyUpdates?: Record<string, { keyRef: string; value: string }>
}

export interface TestEngineRequest {
  engineId: string
  query: string
  maxResults?: number
  engineConfig?: EngineSpecificConfig
  tempApiKey?: string
}

/** What the test-engine route writes; the client parses it into an outcome. */
export interface TestEngineResponseData {
  engineId: string
  durationMs: number
  result?: WebSearchResult
  error?: string
  /** True when the engine's configured budget expired; the page owns the wording. */
  timedOut?: boolean
}
