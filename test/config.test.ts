import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createConfigStore } from '../src/server/config.ts'
import { DEFAULT_STORAGE } from '../src/server/domain.ts'
import type { CustSearchStorage } from '../src/types.ts'

/** Stand-in for an opened domain: same two members the store reads. */
function fakeDomain(initial: CustSearchStorage) {
  let value = initial
  return {
    global: {
      get: () => value,
      set: async (next: CustSearchStorage) => {
        value = next
      },
    },
  }
}

test('reads come from the domain, not a copy', () => {
  const initial = { ...DEFAULT_STORAGE, defaultTimeout: 1111 }
  const domain = fakeDomain(initial)
  const store = createConfigStore(domain as never)
  assert.equal(store.read().defaultTimeout, 1111)

  domain.global.set({ ...initial, defaultTimeout: 2222 })
  return Promise.resolve().then(() => {
    assert.equal(store.read().defaultTimeout, 2222)
  })
})

test('writes replace the whole configuration', async () => {
  const domain = fakeDomain(DEFAULT_STORAGE)
  const store = createConfigStore(domain as never)
  const next = { ...DEFAULT_STORAGE, enginesOrder: ['bing'] }
  await store.write(next)
  assert.deepEqual(store.read().enginesOrder, ['bing'])
})

test('a rejected write surfaces instead of being swallowed', async () => {
  const domain = {
    global: {
      get: () => DEFAULT_STORAGE,
      set: () => Promise.reject(new Error('backend refused')),
    },
  }
  const store = createConfigStore(domain as never)
  await assert.rejects(store.write(DEFAULT_STORAGE), /backend refused/)
})
