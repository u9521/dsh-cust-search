import type { Context } from '@deepseek-ai/cordis'
import type { CredentialRef } from '@deepseek-ai/dsh-credentials'
// Side-effect type import: the cordis Context augmentation for `webServer`.
import type {} from '@deepseek-ai/dsh-host-webserver'
import { CustSearchProvider, CUST_SEARCH_PROVIDER_ID } from './provider.ts'
import { registerRoutes } from './routes.ts'

export const name = 'cust-search'
export const inject = ['web']

export function apply(ctx: Context): void {
  const logger = ctx.logger

  /**
   * Resolve one credential reference. The credentials seam is asked first —
   * it already layers the process environment and `.env` files — and a bare
   * environment lookup covers names outside the seam's grammar.
   */
  const resolveApiKey = async (
    keyRef?: string,
  ): Promise<string | undefined> => {
    if (!keyRef) return undefined

    try {
      const resolved = await ctx
        .get('credentials')
        ?.resolve(keyRef as CredentialRef)
      if (resolved) return resolved.value
    } catch {}

    return process.env[keyRef]
  }

  // HTTP routes, registered only where a web server exists.
  ctx.inject(['webServer'], (sctx: Context) => {
    sctx.effect(
      () =>
        registerRoutes(sctx, {
          resolveApiKey,
          web: ctx.web,
          logger,
        }),
      'cust-search: webServer routes',
    )
  })

  // Register the search provider. Which provider the web seam selects is
  // composition's decision (`cordis.patch.yml` pins `searchProvider`), never a
  // registration-order or runtime-takeover side effect.
  ctx.web.registerSearchProvider(
    new CustSearchProvider({
      web: ctx.web,
      resolveApiKey,
      logger,
    }),
  )
}

export { CustSearchProvider, CUST_SEARCH_PROVIDER_ID }
export * from './engines/index.ts'
export * from './provider.ts'
export * from './storage.ts'
export * from './routes.ts'
