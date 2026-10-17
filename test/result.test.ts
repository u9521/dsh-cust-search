import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  toResult,
  SNIPPET_LIMIT,
  EngineResultError,
} from '../src/server/engines/result.ts'
import type { WebSearchSource } from '../src/types.ts'

const row = (
  url: string,
  extra: Partial<WebSearchSource> = {},
): WebSearchSource => ({ url, ...extra })

test('rows with the same URL collapse to the first occurrence', () => {
  const result = toResult('exa', [
    row('https://a.example', { title: 'first' }),
    row('https://a.example', { title: 'second' }),
    row('https://b.example'),
  ])
  assert.deepEqual(
    result.sources.map((s) => s.url),
    ['https://a.example', 'https://b.example'],
  )
  assert.equal(result.sources[0]?.title, 'first')
  assert.equal(result.truncated, false)
})

test('rows without a URL are dropped', () => {
  const result = toResult('exa', [row(''), row('https://a.example')])
  assert.equal(result.sources.length, 1)
})

test('an empty result is a failure, not an empty success', () => {
  assert.throws(
    () => toResult('bing', []),
    (error: unknown) =>
      error instanceof EngineResultError && /bing/.test(error.message),
  )
  assert.throws(
    () => toResult('bing', [row('')]),
    (error: unknown) => error instanceof EngineResultError,
  )
})

test('snippets are capped at one shared limit', () => {
  const long = 'x'.repeat(SNIPPET_LIMIT * 2)
  const result = toResult('tavily', [
    row('https://a.example', { snippet: long }),
  ])
  assert.equal(result.sources[0]?.snippet?.length, SNIPPET_LIMIT)
})

test('provider answer text survives shaping', () => {
  const result = toResult('perplexity', [row('https://a.example')], 'an answer')
  assert.equal(result.content, 'an answer')
})

test('absent optional fields are not invented', () => {
  const result = toResult('exa', [row('https://a.example')])
  assert.deepEqual(Object.keys(result.sources[0] ?? {}), ['url'])
})
