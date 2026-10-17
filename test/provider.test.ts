import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CustSearchProvider } from '../src/server/provider.ts'
import { buildEngineRegistry } from '../src/server/engines/index.ts'
import { DEFAULT_STORAGE } from '../src/server/domain.ts'
import type { ConfigStore } from '../src/server/config.ts'
import type { CustSearchStorage, SearchEngine } from '../src/types.ts'

const storeOf = (config: CustSearchStorage): ConfigStore => ({
  read: () => config,
  write: async () => {},
})

const stub = (
  id: string,
  behaviour: () => Promise<
    never | { sources: { url: string }[]; truncated: boolean }
  >,
): SearchEngine => ({
  id,
  type: 'free',
  search: behaviour as SearchEngine['search'],
})

function provider(
  engines: SearchEngine[],
  config: CustSearchStorage = DEFAULT_STORAGE,
) {
  const byId = new Map(engines.map((e) => [e.id, e]))
  return new CustSearchProvider({
    config: storeOf(config),
    engines: {
      get: (id) => byId.get(id),
      all: () => engines,
      definitions: () => [],
    },
    resolveApiKey: async () => undefined,
    run: async (engine) => {
      try {
        const result = await engine.search(
          { query: 'q', maxResults: 5 },
          {} as never,
          new AbortController().signal,
        )
        return { ok: true, result }
      } catch (error) {
        return { ok: false, error: (error as Error).message }
      }
    },
  })
}

test('the first engine with a result wins', async () => {
  const calls: string[] = []
  const p = provider(
    [
      stub('a', async () => {
        calls.push('a')
        return { sources: [{ url: 'https://a' }], truncated: false }
      }),
      stub('b', async () => {
        calls.push('b')
        return { sources: [{ url: 'https://b' }], truncated: false }
      }),
    ],
    { ...DEFAULT_STORAGE, enginesOrder: ['a', 'b'] },
  )
  const result = await p.search({ query: 'q', maxResults: 5 })
  assert.deepEqual(calls, ['a'])
  assert.equal(result?.sources[0]?.url, 'https://a')
})

test('a failing engine is skipped in configured order', async () => {
  const calls: string[] = []
  const p = provider(
    [
      stub('a', async () => {
        calls.push('a')
        throw new Error('down')
      }),
      stub('b', async () => {
        calls.push('b')
        return { sources: [{ url: 'https://b' }], truncated: false }
      }),
    ],
    { ...DEFAULT_STORAGE, enginesOrder: ['a', 'b'] },
  )
  const result = await p.search({ query: 'q', maxResults: 5 })
  assert.deepEqual(calls, ['a', 'b'])
  assert.equal(result?.sources[0]?.url, 'https://b')
})

test('an unknown engine id is skipped, not fatal', async () => {
  const p = provider(
    [
      stub('b', async () => ({
        sources: [{ url: 'https://b' }],
        truncated: false,
      })),
    ],
    { ...DEFAULT_STORAGE, enginesOrder: ['ghost', 'b'] },
  )
  const result = await p.search({ query: 'q', maxResults: 5 })
  assert.equal(result?.sources[0]?.url, 'https://b')
})

test('exhausting every engine reports what was tried', async () => {
  const p = provider(
    [
      stub('a', async () => {
        throw new Error('one')
      }),
      stub('b', async () => {
        throw new Error('two')
      }),
    ],
    { ...DEFAULT_STORAGE, enginesOrder: ['a', 'b'] },
  )
  await assert.rejects(
    p.search({ query: 'q', maxResults: 5 }),
    (error: unknown) => {
      const message = (error as Error).message
      return message.includes('a: one') && message.includes('b: two')
    },
  )
})

test('a blank query is rejected before any engine runs', async () => {
  let called = false
  const p = provider([
    stub('a', async () => {
      called = true
      return { sources: [{ url: 'https://a' }], truncated: false }
    }),
  ])
  await assert.rejects(p.search({ query: '   ', maxResults: 5 }))
  assert.equal(called, false)
})

test('the registry is the one the host built', () => {
  const registry = buildEngineRegistry()
  assert.ok(registry.get('tavily'))
  assert.equal(registry.all().length, 11)
})
