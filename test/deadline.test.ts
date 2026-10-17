import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDeadline } from '../src/server/engines/deadline.ts'

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms))

test('a deadline aborts once its budget expires and reports it', async () => {
  const deadline = createDeadline(20)
  try {
    assert.equal(deadline.timedOut, false)
    await tick(40)
    assert.equal(deadline.signal.aborted, true)
    assert.equal(deadline.timedOut, true)
  } finally {
    deadline.dispose()
  }
})

test('a caller abort is forwarded but is not reported as a timeout', async () => {
  const parent = new AbortController()
  const deadline = createDeadline(10_000, parent.signal)
  try {
    parent.abort()
    assert.equal(deadline.signal.aborted, true)
    assert.equal(deadline.timedOut, false)
  } finally {
    deadline.dispose()
  }
})

test('an already-aborted parent starts aborted', () => {
  const parent = new AbortController()
  parent.abort()
  const deadline = createDeadline(10_000, parent.signal)
  try {
    assert.equal(deadline.signal.aborted, true)
    assert.equal(deadline.timedOut, false)
  } finally {
    deadline.dispose()
  }
})

test('the budget alone decides timedOut, never the parent', async () => {
  const parent = new AbortController()
  const deadline = createDeadline(20, parent.signal)
  try {
    await tick(40)
    assert.equal(deadline.timedOut, true)
    assert.equal(deadline.signal.aborted, true)
  } finally {
    deadline.dispose()
  }
})

test('dispose releases the timer so a late expiry cannot abort anything', async () => {
  const deadline = createDeadline(20)
  deadline.dispose()
  await tick(40)
  assert.equal(deadline.signal.aborted, false)
  assert.equal(deadline.timedOut, false)
})

test('dispose releases the parent listener', () => {
  const parent = new AbortController()
  const deadline = createDeadline(10_000, parent.signal)
  deadline.dispose()
  parent.abort()
  assert.equal(deadline.signal.aborted, false)
})

test('dispose is idempotent', () => {
  const deadline = createDeadline(10_000)
  deadline.dispose()
  assert.doesNotThrow(() => deadline.dispose())
})
