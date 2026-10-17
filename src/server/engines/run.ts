import type {
  CustSearchStorage,
  EngineContext,
  EngineRunOutcome,
  SearchEngine,
} from '../../types.ts'
import { createDeadline } from './deadline.ts'

/**
 * Run one engine under one budget.
 *
 * This is the module the provider loop and the settings test page both call.
 * They used to carry separate copies of it, and had drifted: only the provider
 * forwarded the caller's signal, and only the route turned an empty result into
 * a success.
 *
 * @module @local/dsh-cust-search/server/engines/run
 */

/** The fallback budget when nothing configured one. */
export const DEFAULT_TIMEOUT_MS = 8000

export interface RunEngineOptions {
  /** The engine to run. */
  engine: SearchEngine
  /** The stored configuration; supplies the budget and this engine's slice. */
  storage: CustSearchStorage
  /** The query text. */
  query: string
  /** Result count to ask upstream for. */
  maxResults: number
  /** Credential resolver, already bound to its owning context. */
  resolveApiKey: EngineContext['resolveApiKey']
  /** Optional per-call configuration override (the settings test page). */
  engineConfigOverride?: EngineContext['engineConfig']
  /** Optional credential value that overrides resolution (the settings test page). */
  overrideApiKey?: string
  /** The caller's signal. */
  signal?: AbortSignal
}

/**
 * Resolve one engine's time budget.
 *
 * The configuration is the only authority. Adapters used to impose their own
 * constants on top, so a configured 15 000 ms silently became 12 000 ms.
 *
 * @param storage - the stored configuration.
 * @param engineId - the engine whose slice may override the default.
 * @returns the budget in milliseconds.
 */
export function resolveTimeout(
  storage: CustSearchStorage,
  engineId: string,
): number {
  const configured = storage.engineConfigs[engineId]?.timeout
  if (typeof configured === 'number' && configured > 0) return configured
  const fallback = storage.defaultTimeout
  return typeof fallback === 'number' && fallback > 0
    ? fallback
    : DEFAULT_TIMEOUT_MS
}

/**
 * Build the credential resolver one run uses.
 *
 * The settings test page can hand over a value the user has typed but not yet
 * saved; it applies only to the reference that page is editing.
 *
 * @param resolveApiKey - the plugin-wide resolver.
 * @param override - the unsaved value, when there is one.
 * @param engineConfig - this engine's configuration.
 * @param engine - the engine being run.
 * @returns the resolver for this call.
 */
function resolverFor(
  resolveApiKey: EngineContext['resolveApiKey'],
  override: string | undefined,
  engineConfig: EngineContext['engineConfig'],
  engine: SearchEngine,
): EngineContext['resolveApiKey'] {
  if (override === undefined) return resolveApiKey
  const target = engineConfig.keyRef || engine.defaultKeyRef
  return (keyRef?: string) =>
    keyRef === undefined || keyRef === target
      ? Promise.resolve(override)
      : resolveApiKey(keyRef)
}

/**
 * Run one engine and report the outcome instead of throwing.
 *
 * The outcome shape is the interface: the provider only needs to know whether
 * to try the next engine, and the settings page only needs a duration and a
 * message. Neither has to interpret an exception.
 *
 * @param options - engine, configuration, and the call's identity.
 * @returns the outcome, including whether the budget expired.
 * @throws only when the caller aborted: that is not an engine failure.
 */
export async function runEngine(
  options: RunEngineOptions,
): Promise<EngineRunOutcome> {
  const { engine, storage, query, maxResults, resolveApiKey, signal } = options
  const engineConfig =
    options.engineConfigOverride ?? storage.engineConfigs[engine.id] ?? {}
  const ctx: EngineContext = {
    engineConfig,
    resolveApiKey: resolverFor(
      resolveApiKey,
      options.overrideApiKey,
      engineConfig,
      engine,
    ),
  }

  const deadline = createDeadline(resolveTimeout(storage, engine.id), signal)
  const startedAt = Date.now()

  try {
    const result = await engine.search(
      { query, maxResults },
      ctx,
      deadline.signal,
    )
    return {
      ok: true,
      result,
      durationMs: Date.now() - startedAt,
      timedOut: false,
    }
  } catch (error) {
    // Read the flag before disposal: the getter is backed by the live deadline.
    const timedOut = deadline.timedOut
    if (signal?.aborted) throw error
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
      timedOut,
    }
  } finally {
    deadline.dispose()
  }
}
