import type { Context } from '@deepseek-ai/cordis'
import { CustSearchProvider, CUST_SEARCH_PROVIDER_ID } from './provider.ts'
import { registerRoutes } from './routes.ts'

export const name = 'cust-search'
export const inject = ['web']

export function apply(ctx: Context): void {
  const logger = ctx.logger

  const resolveApiKey = async (
    keyRef?: string,
  ): Promise<string | undefined> => {
    if (!keyRef) return undefined

    const credentials = ctx.get('credentials') as
      | {
          resolve(ref: string): Promise<{ value?: string } | undefined>
        }
      | undefined

    if (credentials) {
      try {
        const resolved = await credentials.resolve(keyRef)
        if (resolved?.value && resolved.value.length > 0) return resolved.value
      } catch {}
    }

    return process.env[keyRef]
  }

  // Register HTTP routes on webServer if available
  ctx.inject(['webServer'], (sctx: Context) => {
    sctx.effect(() => {
      return registerRoutes(sctx, {
        resolveApiKey,
        web: ctx.web,
        logger,
      })
    }, 'cust-search: webServer routes')
  })

  // Create and register search provider
  const provider = new CustSearchProvider({
    web: ctx.web,
    resolveApiKey,
    logger,
  })

  ctx.web.registerSearchProvider(provider)

  // Runtime takeover fallback if searchProviderId was not set or unset by patches
  const webRuntime = ctx.web as unknown as { searchProviderId?: string }
  if (!webRuntime.searchProviderId) {
    webRuntime.searchProviderId = provider.id
    logger.info?.(
      `cust-search: web.searchProvider was unset, dynamically taking over as "${provider.id}"`,
    )
  }
}

export { CustSearchProvider, CUST_SEARCH_PROVIDER_ID }
export * from './engines/index.ts'
export * from './provider.ts'
export * from './storage.ts'
export * from './routes.ts'
