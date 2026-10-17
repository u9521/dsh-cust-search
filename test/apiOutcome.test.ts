import { test } from 'node:test'
import assert from 'node:assert/strict'
import { testEngine } from '../src/client/api.ts'

const request = { engineId: 'tavily', query: 'q' }

/** Replace `fetch` for one test and restore it afterwards. */
function withFetch(
  t: {
    mock: { method: (target: unknown, name: string, impl: unknown) => void }
  },
  impl: (url: string, init: RequestInit) => Promise<Response>,
) {
  t.mock.method(globalThis, 'fetch', impl)
}

test('a successful test resolves with the result', async (t) => {
  withFetch(
    t,
    async () =>
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            engineId: 'tavily',
            durationMs: 42,
            result: { sources: [{ url: 'https://a' }], truncated: false },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
  )
  const outcome = await testEngine(request)
  assert.equal(outcome.ok, true)
  assert.equal(outcome.durationMs, 42)
  assert.equal(outcome.result?.sources.length, 1)
})

test('a timeout is a typed failure, not prose to match on', async (t) => {
  withFetch(
    t,
    async () =>
      new Response(
        JSON.stringify({
          ok: false,
          data: { engineId: 'tavily', durationMs: 8000, timedOut: true },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
  )
  const outcome = await testEngine(request)
  assert.equal(outcome.ok, false)
  assert.deepEqual(outcome.failure, { kind: 'timeout' })
})

test('an engine failure keeps the host message', async (t) => {
  withFetch(
    t,
    async () =>
      new Response(
        JSON.stringify({
          ok: false,
          data: {
            engineId: 'tavily',
            durationMs: 12,
            error: 'Tavily API key is invalid (HTTP 401)',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
  )
  const outcome = await testEngine(request)
  assert.deepEqual(outcome.failure, {
    kind: 'host',
    message: 'Tavily API key is invalid (HTTP 401)',
  })
})

test('a connection-fence rejection becomes an auth failure', async (t) => {
  withFetch(t, async () => new Response('unauthorized', { status: 401 }))
  const outcome = await testEngine(request)
  assert.deepEqual(outcome.failure, {
    kind: 'auth',
    messageKey: 'error.unauthorized',
  })
})

test('a network error becomes a host failure instead of throwing', async (t) => {
  withFetch(t, async () => {
    throw new TypeError('connection refused')
  })
  const outcome = await testEngine(request)
  assert.equal(outcome.ok, false)
  assert.deepEqual(outcome.failure, {
    kind: 'host',
    message: 'connection refused',
  })
})

test('a cancelled call is distinguishable from a failure', async (t) => {
  const controller = new AbortController()
  withFetch(t, (_url, init) => {
    return new Promise((_resolve, reject) => {
      init.signal?.addEventListener(
        'abort',
        () => reject(new DOMException('aborted', 'AbortError')),
        { once: true },
      )
    })
  })
  const pending = testEngine(request, controller.signal)
  controller.abort()
  const outcome = await pending
  assert.deepEqual(outcome.failure, { kind: 'cancelled' })
})

test('an error body without JSON still reports the status', async (t) => {
  withFetch(t, async () => new Response('<html>nope</html>', { status: 500 }))
  const outcome = await testEngine(request)
  assert.equal(outcome.failure?.kind, 'host')
  const message = (outcome.failure as { message: string }).message
  assert.match(message, /HTTP 500/)
})
