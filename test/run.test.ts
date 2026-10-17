import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  runEngine,
  resolveTimeout,
  DEFAULT_TIMEOUT_MS,
} from '../src/server/engines/run.ts'
import { toResult } from '../src/server/engines/result.ts'
import type {
  CustSearchStorage,
  EngineContext,
  SearchEngine,
  SearchRequest,
  WebSearchResult,
} from '../src/types.ts'

const storage = (over: Partial<CustSearchStorage> = {}): CustSearchStorage => ({
  defaultTimeout: 1000,
  enginesOrder: ['stub'],
  engineConfigs: {},
  ...over,
})

/** An engine that reports what it was given and returns one source. */
function stubEngine(
  id: string,
  onCall: (
    request: SearchRequest,
    ctx: EngineContext,
    signal: AbortSignal,
  ) => Promise<WebSearchResult>,
): SearchEngine {
  return { id, type: 'free', search: onCall }
}

const ok = (): WebSearchResult =>
  toResult('stub', [{ url: 'https://a.example' }])

test('configuration is the only deadline authority', () => {
  assert.equal(resolveTimeout(storage({ defaultTimeout: 1234 }), 'stub'), 1234)
  assert.equal(
    resolveTimeout(
      storage({
        defaultTimeout: 1234,
        engineConfigs: { stub: { timeout: 4321 } },
      }),
      'stub',
    ),
    4321,
  )
  assert.equal(
    resolveTimeout(storage({ defaultTimeout: 0 }), 'stub'),
    DEFAULT_TIMEOUT_MS,
  )
})

test('an expired budget is reported as a timeout', async () => {
  const engine = stubEngine('stub', async (_request, _ctx, signal) => {
    await new Promise((resolve) =>
      signal.addEventListener('abort', resolve, { once: true }),
    )
    throw new Error('aborted')
  })
  const outcome = await runEngine({
    engine,
    storage: storage({ defaultTimeout: 10 }),
    query: 'q',
    maxResults: 5,
    resolveApiKey: async () => undefined,
  })
  assert.equal(outcome.ok, false)
  assert.equal(outcome.timedOut, true)
})

test('a caller abort is rethrown, not turned into an outcome', async () => {
  const engine = stubEngine('stub', async (_request, _ctx, signal) => {
    await new Promise((resolve) =>
      signal.addEventListener('abort', resolve, { once: true }),
    )
    throw new Error('aborted')
  })
  const parent = new AbortController()
  const pending = runEngine({
    engine,
    storage: storage(),
    query: 'q',
    maxResults: 5,
    resolveApiKey: async () => undefined,
    signal: parent.signal,
  })
  parent.abort()
  await assert.rejects(pending)
})

test('a successful run passes the query and keeps its result', async () => {
  let seen: SearchRequest | undefined
  const engine = stubEngine('stub', async (request) => {
    seen = request
    return ok()
  })
  const outcome = await runEngine({
    engine,
    storage: storage(),
    query: 'hello',
    maxResults: 7,
    resolveApiKey: async () => undefined,
  })
  assert.equal(outcome.ok, true)
  assert.deepEqual(seen, { query: 'hello', maxResults: 7 })
  assert.equal(outcome.result?.sources.length, 1)
})

test('an engine failure becomes an outcome, not an exception', async () => {
  const engine = stubEngine('stub', async () => {
    throw new Error('upstream said no')
  })
  const outcome = await runEngine({
    engine,
    storage: storage(),
    query: 'q',
    maxResults: 5,
    resolveApiKey: async () => undefined,
  })
  assert.equal(outcome.ok, false)
  assert.equal(outcome.timedOut, false)
  assert.match(outcome.error ?? '', /upstream said no/)
})

test('the engine only ever sees its own two-field context', async () => {
  const engine = stubEngine('stub', async (_request, ctx) => {
    assert.deepEqual(Object.keys(ctx).sort(), ['engineConfig', 'resolveApiKey'])
    return ok()
  })
  await runEngine({
    engine,
    storage: storage({ engineConfigs: { stub: { timeout: 50 } } }),
    query: 'q',
    maxResults: 5,
    resolveApiKey: async () => undefined,
  })
})

test('an override cell is used only for the engine it is meant for', async () => {
  const engine = stubEngine('stub', async (_request, ctx) => {
    assert.equal(await ctx.resolveApiKey('STUB_KEY'), 'temp')
    assert.equal(await ctx.resolveApiKey('OTHER_KEY'), 'real')
    return ok()
  })
  await runEngine({
    engine,
    storage: storage({ engineConfigs: { stub: { keyRef: 'STUB_KEY' } } }),
    query: 'q',
    maxResults: 5,
    resolveApiKey: async () => 'real',
    overrideApiKey: 'temp',
  })
})
