import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildEngineRegistry } from '../src/server/engines/index.ts'

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
    /not active or not registered/,
  )
})
