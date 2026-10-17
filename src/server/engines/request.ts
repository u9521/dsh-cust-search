/**
 * One outbound HTTP request made on behalf of a search engine.
 *
 * Every adapter calls this instead of `fetch` directly. It owns exactly one
 * thing the adapters used to repeat: a network failure reported in the engine's
 * own vocabulary instead of as a bare `TypeError`. A timeout is NOT classified
 * here — the runner owns the budget and therefore owns the answer to "was this
 * slow or broken"; this module only refuses to guess.
 *
 * @module @local/dsh-cust-search/server/engines/request
 */

/** A request that failed before any usable response existed. */
export class EngineRequestError extends Error {
  /** The engine the failing request belonged to. */
  readonly engineName: string

  constructor(engineName: string, detail: string, options?: ErrorOptions) {
    super(`${engineName} request failed: ${detail}`, options)
    this.name = 'EngineRequestError'
    this.engineName = engineName
  }
}

/**
 * Issue one request under a deadline.
 *
 * A non-2xx response is a result, not a throw: adapters own their status
 * handling because the useful explanation differs per API (401 means "fix the
 * key", 429 means "wait", 402 means "pay"). Only transport failures — no
 * response at all — are normalized here, and an abort is never reinterpreted.
 *
 * @param engineName - display name used in the failure message.
 * @param url - absolute request URL.
 * @param init - request options; `signal` is replaced by the call's signal.
 * @param signal - the call's abort signal.
 * @returns the response, whatever its status.
 * @throws {EngineRequestError} when the request never produced a response.
 */
export async function engineRequest(
  engineName: string,
  url: string,
  init: RequestInit,
  signal: AbortSignal,
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal })
  } catch (error) {
    if (signal.aborted) throw error
    throw new EngineRequestError(
      engineName,
      error instanceof Error ? error.message : String(error),
      { cause: error },
    )
  }
}
