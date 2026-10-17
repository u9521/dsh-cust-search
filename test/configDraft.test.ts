import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeApiError } from '../src/client/settings/apiError.ts'

const translate = (key: string) => `<${key}>`

test('a locale-key rejection is translated', () => {
  const error = Object.assign(new Error('unauthorized'), {
    messageKey: 'error.unauthorized',
  })
  assert.equal(describeApiError(error, translate), '<error.unauthorized>')
})

test('host prose passes through unchanged', () => {
  assert.equal(
    describeApiError(new Error('storage write failed'), translate),
    'storage write failed',
  )
})

test('a rejection carrying no key still renders', () => {
  assert.equal(describeApiError('plain string', translate), 'plain string')
})

test('a null key is treated as absent', () => {
  const error = Object.assign(new Error('boom'), { messageKey: null })
  assert.equal(describeApiError(error, translate), 'boom')
})
