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

export interface SearchEngineContext {
  config: CustSearchStorage
  engineConfig: EngineSpecificConfig
  web?: unknown
  resolveApiKey: (keyRef?: string) => Promise<string | undefined>
  logger?: {
    info(message: string, ...args: unknown[]): void
    warn(message: string, ...args: unknown[]): void
    error(message: string, ...args: unknown[]): void
    debug(message: string, ...args: unknown[]): void
  }
}

export interface SearchEngine {
  readonly id: string
  readonly type: EngineType
  readonly defaultKeyRef?: string
  available(ctx: SearchEngineContext): boolean
  search(
    query: string,
    maxResults: number,
    ctx: SearchEngineContext,
    signal?: AbortSignal,
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

export interface TestEngineResponseData {
  engineId: string
  durationMs: number
  result?: WebSearchResult
  error?: string
}

export interface TestEngineResponse {
  ok: boolean
  data: TestEngineResponseData
}
