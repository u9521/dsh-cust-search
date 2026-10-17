import type { Context } from '@deepseek-ai/cordis'
import { isCredentialRefName } from '@deepseek-ai/dsh-credentials'
import type { CredentialRef } from '@deepseek-ai/dsh-credentials'
// Side-effect type imports: the cordis Context augmentations for `connection`
// and `storageDomain`.
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-storage-domain'
import { createConfigStore } from './config.ts'
import type { ConfigStore } from './config.ts'
import { custSearchDomainSpec } from './domain.ts'
import { buildEngineRegistry } from './engines/index.ts'
import { runEngine } from './engines/run.ts'
import { CustSearchProvider, CUST_SEARCH_PROVIDER_ID } from './provider.ts'
import { registerRoutes } from './routes.ts'

export const name = 'cust-search'
export const inject = ['web']

/**
 * Resolve one credential reference.
 *
 * The credentials seam already layers the managed store over the process
 * environment and `.env` files, so it is the only source for a name inside its
 * grammar. A name outside the grammar has no reference to miss, and a bare
 * environment lookup is the only thing that can answer it.
 *
 * @param ctx - context carrying `credentials`.
 * @param keyRef - the reference named by the engine configuration.
 * @returns the secret value, or undefined when nothing supplies one.
 */
async function resolveCredential(
  ctx: Context,
  keyRef?: string,
): Promise<string | undefined> {
  if (!keyRef) return undefined
  if (!isCredentialRefName(keyRef)) return process.env[keyRef]

  try {
    const resolved = await ctx
      .get('credentials')
      ?.resolve(keyRef as CredentialRef)
    if (resolved) return resolved.value
  } catch {}
  return undefined
}

export function apply(ctx: Context): void {
  const logger = ctx.logger

  const resolveApiKey = (keyRef?: string) => resolveCredential(ctx, keyRef)

  // The configuration lives in the `cust_search` storage domain. Opening is
  // asynchronous and must precede every read, so the provider and the settings
  // routes are registered from inside the resolved child context: a deployment
  // without the storage seam contributes neither, instead of serving an empty
  // configuration.
  ctx.inject(['storageDomain'], (storageCtx: Context) => {
    let disposed = false

    void storageCtx.storageDomain
      .open(custSearchDomainSpec)
      .then((domain) => {
        // The fiber may unload while the open is still in flight; close the
        // handle immediately instead of leaking it past the plugin's lifetime.
        if (disposed) {
          void domain.close()
          return
        }
        storageCtx.effect(
          () => () => domain.close(),
          'cust-search: storage domain',
        )
        start(storageCtx, createConfigStore(domain))
      })
      .catch((error: unknown) => {
        logger.error(
          `cust-search: could not open the cust_search storage domain: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      })

    storageCtx.effect(
      () => () => {
        disposed = true
      },
      'cust-search: storage teardown guard',
    )
  })

  function start(runtimeCtx: Context, config: ConfigStore): void {
    // One engine set for the whole plugin: the adapters are stateless, so the
    // provider and the settings routes share the same instances.
    const engines = buildEngineRegistry(ctx.web)

    // HTTP routes live on DSH's shared `/api` channel, which admits a request
    // through the owner Peer (Host/Origin fence plus the browser or API cookie)
    // before dispatch. An exact route registered directly on the web server
    // under `/api` would shadow the shared prefix handler and skip that
    // admission, so the surface stays unregistered where Connection is absent.
    runtimeCtx.inject(['connection'], (sctx: Context) => {
      registerRoutes(sctx, { config, engines, resolveApiKey, logger })
    })

    // Register the search provider. Which provider the web seam selects is
    // composition's decision (`cordis.patch.yml` pins `searchProvider`), never a
    // registration-order or runtime-takeover side effect.
    ctx.web.registerSearchProvider(
      new CustSearchProvider({
        config,
        engines,
        resolveApiKey,
        run: (engine, storage, query, maxResults, signal) =>
          runEngine({
            engine,
            storage,
            query,
            maxResults,
            resolveApiKey,
            ...(signal === undefined ? {} : { signal }),
          }),
        logger,
      }),
    )
  }
}

export { CustSearchProvider, CUST_SEARCH_PROVIDER_ID }
export * from './engines/index.ts'
export * from './provider.ts'
export * from './config.ts'
export * from './domain.ts'
export * from './routes.ts'
