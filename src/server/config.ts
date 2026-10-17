import type { Domain } from '@deepseek-ai/dsh-storage-domain'
import type { CustSearchStorage } from '../types.ts'
import { custSearchDomainSpec } from './domain.ts'

/**
 * The configuration, as the rest of the plugin sees it.
 *
 * This is the seam the provider and the settings routes cross. They used to
 * read a module-level binding instead, which made the startup order a fact the
 * type system could not express: a caller could run before the domain opened
 * and silently receive the built-in defaults.
 *
 * @module @local/dsh-cust-search/server/config
 */

/** Read and replace the stored configuration. */
export interface ConfigStore {
  /**
   * The current configuration.
   *
   * Synchronous: reads come from the domain's authoritative in-memory state, so
   * the search provider pays no I/O per request.
   *
   * @returns the stored configuration.
   */
  read(): CustSearchStorage

  /**
   * Replace the whole configuration durably.
   *
   * The rejection is deliberate: a failed backend write must not look like a
   * successful save.
   *
   * @param next - the complete next configuration.
   */
  write(next: CustSearchStorage): Promise<void>
}

/**
 * Wrap one opened domain.
 *
 * @param domain - the `cust_search` domain handle.
 * @returns the store both call sites take.
 */
export function createConfigStore(
  domain: Domain<typeof custSearchDomainSpec>,
): ConfigStore {
  return {
    read: () => domain.global.get(),
    write: (next) => domain.global.set(next),
  }
}
