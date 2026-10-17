import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildEngineRegistry,
  selectedSearchProviderOf,
} from '../src/server/engines/index.ts'

test('every configured default engine resolves', () => {
  const registry = buildEngineRegistry()
  for (const id of [
    'deepseek',
    'bing',
    'ddg',
    'searxng',
    'tavily',
    'anysearch',
    'exa',
    'keenable',
    'firecrawl',
    'parallel',
    'perplexity',
  ]) {
    assert.ok(registry.get(id), `missing engine ${id}`)
  }
  assert.equal(registry.get('nope'), undefined)
})

test('definitions come from the same instances the runner uses', () => {
  const registry = buildEngineRegistry()
  const definitions = registry.definitions()
  assert.equal(definitions.length, registry.all().length)
  assert.deepEqual(
    definitions.map((d) => d.id),
    registry.all().map((e) => e.id),
  )
  for (const definition of definitions) {
    assert.equal(registry.get(definition.id)?.type, definition.type)
  }
})

test('keyed engines advertise their default reference', () => {
  const registry = buildEngineRegistry()
  assert.equal(registry.get('tavily')?.defaultKeyRef, 'TAVILY_API_KEY')
  assert.equal(registry.get('bing')?.defaultKeyRef, undefined)
})

test('the bridge reports itself unavailable without the official provider', async () => {
  const registry = buildEngineRegistry(undefined)
  const bridge = registry.get('deepseek')
  assert.ok(bridge)
  await assert.rejects(
    bridge.search(
      { query: 'q', maxResults: 5 },
      { engineConfig: {}, resolveApiKey: async () => undefined },
      new AbortController().signal,
    ),
    /no official DeepSeek search provider/,
  )
})

/** A provider stub that records the requests it receives. */
function providerStub(id: string, usable = true) {
  const calls: Array<{ query: string; maxResults?: number }> = []
  return {
    calls,
    provider: {
      id,
      available: () => usable,
      search: async (request: { query: string; maxResults?: number }) => {
        calls.push(request)
        return { sources: [{ url: `https://${id}/result` }], truncated: false }
      },
    },
  }
}

test('the new official Search API provider is preferred over Messages search', async () => {
  const api = providerStub('deepseek-search-api')
  const official = providerStub('deepseek-official')
  const web = {
    searchProviders: new Map([
      [official.provider.id, official.provider],
      [api.provider.id, api.provider],
    ]),
  }

  const bridge = buildEngineRegistry(web).get('deepseek')
  assert.ok(bridge)
  const result = await bridge.search(
    { query: 'q', maxResults: 5 },
    { engineConfig: {}, resolveApiKey: async () => undefined },
    new AbortController().signal,
  )

  assert.equal(api.calls.length, 1)
  assert.equal(official.calls.length, 0)
  assert.equal(result.sources[0]?.url, 'https://deepseek-search-api/result')
})

test('an unusable official provider does not shadow a usable one', async () => {
  const api = providerStub('deepseek-search-api', false)
  const official = providerStub('deepseek-official')
  const web = {
    searchProviders: new Map([
      [api.provider.id, api.provider],
      [official.provider.id, official.provider],
    ]),
  }

  const bridge = buildEngineRegistry(web).get('deepseek')
  assert.ok(bridge)
  await bridge.search(
    { query: 'q', maxResults: 5 },
    { engineConfig: {}, resolveApiKey: async () => undefined },
    new AbortController().signal,
  )

  assert.equal(api.calls.length, 0)
  assert.equal(official.calls.length, 1)
})

test('with nothing usable, a registered provider is still chosen so its own error surfaces', async () => {
  // "No API key" must be reported by the provider that wanted the key, not
  // swallowed into "nothing is registered" — the two need different fixes.
  const web = {
    searchProviders: new Map([
      [
        'deepseek-search-api',
        {
          id: 'deepseek-search-api',
          available: () => false,
          search: async () => {
            throw new Error('DeepSeek web access has no API key')
          },
        },
      ],
    ]),
  }

  const bridge = buildEngineRegistry(web).get('deepseek')
  assert.ok(bridge)
  await assert.rejects(
    bridge.search(
      { query: 'q', maxResults: 5 },
      { engineConfig: {}, resolveApiKey: async () => undefined },
      new AbortController().signal,
    ),
    /has no API key/,
  )
})

test('a provider whose availability check throws is skipped, not fatal', async () => {
  const web = {
    searchProviders: new Map([
      [
        'deepseek-search-api',
        {
          id: 'deepseek-search-api',
          available: () => {
            throw new Error('boom')
          },
          search: async () => ({ sources: [], truncated: false }),
        },
      ],
      [
        'deepseek-official',
        {
          id: 'deepseek-official',
          available: () => true,
          search: async () => ({
            sources: [{ url: 'https://official/result' }],
            truncated: false,
          }),
        },
      ],
    ]),
  }

  const bridge = buildEngineRegistry(web).get('deepseek')
  assert.ok(bridge)
  const result = await bridge.search(
    { query: 'q', maxResults: 5 },
    { engineConfig: {}, resolveApiKey: async () => undefined },
    new AbortController().signal,
  )
  assert.equal(result.sources[0]?.url, 'https://official/result')
})

test('the configured search provider is reported when the runtime exposes it', () => {
  assert.equal(
    selectedSearchProviderOf({
      config: { searchProvider: { get: () => 'cust-search' } },
    }),
    'cust-search',
  )
  assert.equal(
    selectedSearchProviderOf({
      config: { searchProvider: { get: () => undefined } },
    }),
    undefined,
  )
  // A runtime that hides the field reads as "cannot tell", not as a mismatch.
  assert.equal(selectedSearchProviderOf({}), undefined)
})
