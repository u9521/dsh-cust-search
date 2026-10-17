import type { Deadline } from '../../types.ts'

/**
 * The one place a search call is given a time budget.
 *
 * Every adapter used to build its own `AbortController`, its own `setTimeout`,
 * and its own parent-signal bridge, with three different cleanup disciplines.
 * That made the effective budget `min(engineConfig.timeout, adapter constant)`
 * — invisible from any interface — and leaked a live timer plus a listener on
 * every error path.
 *
 * @module @local/dsh-cust-search/server/engines/deadline
 */

/**
 * Start one deadline.
 *
 * @param timeoutMs - the budget; the caller has already resolved it from
 *   `engineConfig.timeout ?? defaultTimeout`.
 * @param parent - the caller's signal, forwarded so a closed UI stops the work.
 * @returns the deadline; call `dispose()` in a `finally`.
 */
export function createDeadline(
  timeoutMs: number,
  parent?: AbortSignal,
): Deadline {
  const controller = new AbortController()
  let expired = false
  let released = false

  const timer = setTimeout(() => {
    expired = true
    controller.abort()
  }, timeoutMs)

  const forward = () => controller.abort()

  if (parent) {
    if (parent.aborted) controller.abort()
    else parent.addEventListener('abort', forward, { once: true })
  }

  return {
    signal: controller.signal,
    get timedOut() {
      return expired
    },
    dispose() {
      if (released) return
      released = true
      clearTimeout(timer)
      parent?.removeEventListener('abort', forward)
    },
  }
}
