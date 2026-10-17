import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  engineRequest,
  EngineRequestError,
} from '../src/server/engines/request.ts'

const alive = () => new AbortController().signal

test('a non-2xx response is returned, not thrown', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('nope', { status: 401 }),
  )
  const response = await engineRequest('Stub', 'https://a.example', {}, alive())
  assert.equal(response.status, 401)
})

test('a transport failure is reported in the engine vocabulary', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('fetch failed')
  })
  await assert.rejects(
    engineRequest('Stub', 'https://a.example', {}, alive()),
    (error: unknown) =>
      error instanceof EngineRequestError &&
      /Stub request failed: fetch failed/.test(error.message),
  )
})

test('an abort is rethrown untouched, never relabelled', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new DOMException('aborted', 'AbortError')
  })
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(
    engineRequest('Stub', 'https://a.example', {}, controller.signal),
    (error: unknown) =>
      error instanceof DOMException && !(error instanceof EngineRequestError),
  )
})

test('the call signal wins over a signal in init', async (t) => {
  let seen: AbortSignal | undefined
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: string, init: RequestInit) => {
      seen = init.signal ?? undefined
      return new Response('ok')
    },
  )
  const signal = alive()
  await engineRequest(
    'Stub',
    'https://a.example',
    { signal: new AbortController().signal },
    signal,
  )
  assert.equal(seen, signal)
})
