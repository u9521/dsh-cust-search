import type {
  GetConfigResponse,
  SetConfigRequest,
  TestEngineRequest,
  WebSearchResult,
} from '../types.ts'

/**
 * Every call below targets a host route on DSH's shared `/api` channel, which
 * requires the browser-session cookie that `dsh web` issues when the printed
 * startup URL is opened. The cookie is `HttpOnly` and `SameSite=Strict`, so the
 * page cannot read or attach it by hand: `same-origin` is what lets the browser
 * send it, and a session that was never established (or has expired) answers
 * 401 rather than serving the settings payload.
 */
const SAME_ORIGIN: RequestInit = { credentials: 'same-origin' }

/**
 * A rejection the settings UI translates through its own dictionary.
 *
 * Thrown instead of a pre-formatted sentence so the copy stays inside the
 * locale namespace: the transport layer cannot know the active language.
 */
export class ApiError extends Error {
  readonly status: number
  /** Locale key in the `cust-search` namespace describing this rejection. */
  readonly messageKey: 'error.unauthorized' | 'error.forbidden' | null

  constructor(
    status: number,
    messageKey: 'error.unauthorized' | 'error.forbidden' | null,
    detail?: string,
  ) {
    super(detail ?? `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.messageKey = messageKey
  }
}

/** Map a non-OK response onto a translatable rejection. */
function rejection(res: Response): ApiError {
  if (res.status === 401) return new ApiError(401, 'error.unauthorized')
  if (res.status === 403) return new ApiError(403, 'error.forbidden')
  return new ApiError(res.status, null)
}

export async function fetchConfig(): Promise<GetConfigResponse> {
  const res = await fetch('/api/cust-search/get-config', {
    ...SAME_ORIGIN,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw rejection(res)
  }
  const json = (await res.json()) as {
    ok: boolean
    data: GetConfigResponse
    error?: string
  }
  if (!json.ok || !json.data) {
    throw new Error(json.error || 'Failed to fetch config')
  }
  return json.data
}

export async function saveConfig(payload: SetConfigRequest): Promise<void> {
  const res = await fetch('/api/cust-search/set-config', {
    ...SAME_ORIGIN,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw rejection(res)
  }
  const json = (await res.json()) as { ok: boolean; error?: string }
  if (!json.ok) {
    throw new Error(json.error || 'Failed to save config')
  }
}

/**
 * Why one engine test produced no result.
 *
 * A discriminated union rather than a string: the page has to translate an
 * auth rejection, word a timeout, and pass host prose through, and deciding
 * which it is by inspecting text was a guess. Every member is produced by one
 * module, so the page switches on `kind` instead of matching substrings.
 */
export type EngineTestFailure =
  | { kind: 'auth'; messageKey: 'error.unauthorized' | 'error.forbidden' }
  | { kind: 'timeout' }
  | { kind: 'cancelled' }
  | { kind: 'host'; message: string }

/** What one test-engine call produced, success or failure. */
export interface EngineTestOutcome {
  ok: boolean
  durationMs: number
  result?: WebSearchResult
  failure?: EngineTestFailure
}

/**
 * Run one engine test.
 *
 * Resolves for every outcome, including a rejected request: the page renders
 * an outcome either way, and a thrown transport error would force every caller
 * to carry a second, differently-shaped failure path.
 *
 * @param payload - the engine, query, and any unsaved credential.
 * @param signal - aborts the request when the modal closes.
 * @returns the outcome; `ok: false` carries a typed failure.
 */
export async function testEngine(
  payload: TestEngineRequest,
  signal?: AbortSignal,
): Promise<EngineTestOutcome> {
  let res: Response
  try {
    res = await fetch('/api/cust-search/test-engine', {
      ...SAME_ORIGIN,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    })
  } catch (error) {
    if (signal?.aborted)
      return { ok: false, durationMs: 0, failure: { kind: 'cancelled' } }
    return {
      ok: false,
      durationMs: 0,
      failure: {
        kind: 'host',
        message: error instanceof Error ? error.message : String(error),
      },
    }
  }

  // A 401/403 here is the connection fence answering, not the engine: it
  // writes a plain-text body, so the status is the only usable signal.
  if (res.status === 401 || res.status === 403) {
    const rejected = rejection(res)
    return {
      ok: false,
      durationMs: 0,
      failure: {
        kind: 'auth',
        messageKey: rejected.messageKey ?? 'error.unauthorized',
      },
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    try {
      const body = JSON.parse(text) as {
        data?: { durationMs?: number }
        error?: string
      }
      if (body.error || body.data) {
        return {
          ok: false,
          durationMs: body.data?.durationMs ?? 0,
          failure: {
            kind: 'host',
            message: body.error || `HTTP ${res.status}`,
          },
        }
      }
    } catch {
      // fall through to the status-only message
    }
    return {
      ok: false,
      durationMs: 0,
      failure: {
        kind: 'host',
        message:
          text.length > 0
            ? `HTTP ${res.status}: ${text}`
            : `HTTP ${res.status}`,
      },
    }
  }

  const body = (await res.json()) as {
    ok: boolean
    data: {
      durationMs: number
      result?: WebSearchResult
      error?: string
      timedOut?: boolean
    }
  }

  if (body.ok && body.data.result) {
    return {
      ok: true,
      durationMs: body.data.durationMs,
      result: body.data.result,
    }
  }
  if (body.data.timedOut) {
    return {
      ok: false,
      durationMs: body.data.durationMs,
      failure: { kind: 'timeout' },
    }
  }
  return {
    ok: false,
    durationMs: body.data.durationMs,
    failure: {
      kind: 'host',
      message: body.data.error || 'Unknown search error',
    },
  }
}
