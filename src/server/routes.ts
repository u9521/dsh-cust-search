import type { Context } from '@deepseek-ai/cordis'
import { isCredentialRefName } from '@deepseek-ai/dsh-credentials'
import type { CredentialRef } from '@deepseek-ai/dsh-credentials'
// Side-effect type import: the cordis Context augmentation for `connection`.
import type {} from '@deepseek-ai/dsh-client-connection'
import type {
  EngineDefinition,
  EngineRegistry,
  GetConfigResponse,
  SetConfigRequest,
  TestEngineRequest,
} from '../types.ts'
import type { ConfigStore } from './config.ts'
import { runEngine } from './engines/run.ts'

export interface RouteOptions {
  /** The configuration the routes read and replace. */
  config: ConfigStore
  /** The engine set, built once by the plugin entry. */
  engines: EngineRegistry
  /** Credential resolver, already bound to its owning context. */
  resolveApiKey: (keyRef?: string) => Promise<string | undefined>
  logger?: {
    info(message: string, ...args: unknown[]): void
    warn(message: string, ...args: unknown[]): void
    error(message: string, ...args: unknown[]): void
    debug(message: string, ...args: unknown[]): void
  }
}

/**
 * JSON response for a browser caller.
 *
 * `no-store` is unconditional: every payload is live host state — the stored
 * config, whether a credential resolves, and per-engine test outcomes.
 */
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

/**
 * Turn a handler into a route body.
 *
 * All three routes answer the same envelope: `{ ok: true, data }` or
 * `{ ok: false, error }` at status 500. That shape, and the same
 * `instanceof Error` dance, used to be written out once per route.
 *
 * @param handler - the route's work.
 * @returns a fetch handler that answers 500 instead of rejecting.
 */
function route<T extends Request | undefined>(
  handler: (request: T) => Promise<Response>,
): (request: T) => Promise<Response> {
  return async (request: T) => {
    try {
      return await handler(request)
    } catch (error) {
      return json(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        500,
      )
    }
  }
}

/**
 * Classify where one credential reference is supplied from.
 *
 * `credentials.describe()` is the seam's own answer: it reports `configured`
 * and the winning layer (`file` for the managed store, `env` for the process
 * environment, `project-env`/`user-env` for `.env` files). The settings page
 * only distinguishes "stored through this page" from "supplied by the
 * environment", so the layers collapse onto two labels.
 *
 * @param ctx - context carrying `credentials`.
 * @param keyRef - the reference named by the engine configuration.
 * @returns whether a value is available, and which of the two surfaces supplies it.
 */
async function describeKey(
  ctx: Context,
  keyRef: string,
): Promise<{ hasKey: boolean; keySource: 'credentials' | 'env' | 'none' }> {
  if (!isCredentialRefName(keyRef)) {
    const ambient = process.env[keyRef]
    return ambient && ambient.length > 0
      ? { hasKey: true, keySource: 'env' }
      : { hasKey: false, keySource: 'none' }
  }

  const credentials = ctx.get('credentials')
  if (credentials) {
    try {
      const info = await credentials.describe(keyRef as CredentialRef)
      if (info.configured) {
        const layer = info.source ?? 'file'
        return {
          hasKey: true,
          keySource: layer === 'file' ? 'credentials' : 'env',
        }
      }
      return { hasKey: false, keySource: 'none' }
    } catch {}
  }

  const ambient = process.env[keyRef]
  return ambient && ambient.length > 0
    ? { hasKey: true, keySource: 'env' }
    : { hasKey: false, keySource: 'none' }
}

/**
 * Register the settings/test HTTP surface on DSH's shared `/api` channel.
 *
 * Registration goes through `connection.fetch` rather than
 * `webServer.register({ kind: 'exact' })` on purpose. The webserver resolves
 * its exact table before the `/api` prefix table, so an exact route under
 * `/api/...` would be served without ever reaching Connection — skipping the
 * Host/Origin fence and the browser-session cookie check. Routes on the shared
 * channel are dispatched only after `connection.admit()` accepts the request as
 * an owner Peer, so authentication is structural rather than per-handler.
 *
 * @param ctx - the host plugin context carrying `connection`.
 * @param options - credential resolver, live web runtime, and logger.
 */
export function registerRoutes(ctx: Context, options: RouteOptions): void {
  const connection = ctx.get('connection')

  // Fail closed. Falling back to a raw webServer route would expose an
  // unauthenticated config writer, which is strictly worse than an
  // unavailable settings page.
  if (!connection) {
    options.logger?.warn(
      'cust-search: the connection service is absent, so the /api/cust-search routes are not registered',
    )
    return
  }

  connection.fetch.register({
    path: '/api/cust-search/get-config',
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: route(async () => {
      const config = options.config.read()
      const rawDefs = options.engines.definitions()

      const definitions: EngineDefinition[] = []
      for (const def of rawDefs) {
        const engineConfig = config.engineConfigs[def.id] ?? {}
        const keyRef =
          (engineConfig.keyRef as string | undefined) || def.defaultKeyRef

        const key = keyRef
          ? await describeKey(ctx, keyRef)
          : { hasKey: false, keySource: 'none' as const }

        definitions.push({
          ...def,
          ...key,
        })
      }

      const body: GetConfigResponse = {
        config,
        definitions,
      }
      return json({ ok: true, data: body })
    }),
  })

  connection.fetch.register({
    path: '/api/cust-search/set-config',
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: route(async (request) => {
      const raw = await request.text()
      const payload = JSON.parse(raw) as SetConfigRequest

      const current = options.config.read()
      const updated = {
        defaultTimeout:
          typeof payload.defaultTimeout === 'number' &&
          payload.defaultTimeout > 0
            ? payload.defaultTimeout
            : current.defaultTimeout,
        enginesOrder: Array.isArray(payload.enginesOrder)
          ? payload.enginesOrder
          : current.enginesOrder,
        engineConfigs:
          typeof payload.engineConfigs === 'object' &&
          payload.engineConfigs !== null
            ? payload.engineConfigs
            : current.engineConfigs,
      }

      // Handle credentials updates or removals
      if (payload.keyUpdates && typeof payload.keyUpdates === 'object') {
        const credentials = ctx.get('credentials')

        for (const update of Object.values(payload.keyUpdates)) {
          if (
            update &&
            typeof update.keyRef === 'string' &&
            update.keyRef.trim().length > 0
          ) {
            const ref = update.keyRef.trim() as CredentialRef
            if (update.value && update.value.trim().length > 0) {
              await credentials?.set(ref, update.value.trim())
            } else if (update.value === '') {
              await credentials?.unset(ref)
            }
          }
        }
      }

      await options.config.write(updated)
      return json({ ok: true })
    }),
  })

  connection.fetch.register({
    path: '/api/cust-search/test-engine',
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: route(async (request) => {
      const raw = await request.text()
      const payload = JSON.parse(raw) as TestEngineRequest
      const {
        engineId,
        query,
        maxResults = 5,
        engineConfig: overrideConfig,
        tempApiKey,
      } = payload

      if (!engineId || typeof query !== 'string' || query.trim().length === 0) {
        return json(
          {
            ok: false,
            error: 'engineId and non-empty query are required',
          },
          400,
        )
      }

      const engine = options.engines.get(engineId)
      if (!engine) {
        return json(
          {
            ok: false,
            error: `Search engine "${engineId}" not found`,
          },
          404,
        )
      }

      const storage = options.config.read()
      const outcome = await runEngine({
        engine,
        storage,
        query: query.trim(),
        maxResults,
        resolveApiKey: options.resolveApiKey,
        ...(overrideConfig === undefined
          ? {}
          : { engineConfigOverride: overrideConfig }),
        ...(tempApiKey === undefined ? {} : { overrideApiKey: tempApiKey }),
        signal: request.signal,
      })

      return json({
        ok: outcome.ok,
        data: {
          engineId,
          durationMs: outcome.durationMs,
          ...(outcome.result === undefined ? {} : { result: outcome.result }),
          ...(outcome.error === undefined ? {} : { error: outcome.error }),
          ...(outcome.timedOut ? { timedOut: true } : {}),
        },
      })
    }),
  })
}
