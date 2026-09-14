import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {
  EngineDefinition,
  GetConfigResponse,
  SearchEngineContext,
  SetConfigRequest,
  TestEngineRequest,
} from '../types.ts'
import { createEngineRegistry, getEngineDefinitions } from './engines/index.ts'
import { loadStorage, saveStorage } from './storage.ts'

export interface RouteOptions {
  resolveApiKey?: (keyRef?: string) => Promise<string | undefined>
  web?: unknown
  logger?: SearchEngineContext['logger']
}

export async function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.writeHead(status)
  res.end(JSON.stringify(data))
}

export function registerRoutes(
  ctx: Context,
  options?: RouteOptions,
): () => void {
  const webServer = ctx.get('webServer') as
    | {
        register: (opts: {
          kind: 'exact'
          path: string
          handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>
        }) => () => void
      }
    | undefined

  if (!webServer) return () => {}

  const unregisterGet = webServer.register({
    kind: 'exact',
    path: '/api/cust-search/get-config',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'GET') {
        sendJson(res, 405, { ok: false, error: 'Method Not Allowed' })
        return
      }

      try {
        const config = loadStorage()
        const rawDefs = getEngineDefinitions()
        const credentials = ctx.get('credentials') as
          | {
              resolve(
                ref: string,
              ): Promise<{ value?: string; source?: string } | undefined>
            }
          | undefined

        const definitions: EngineDefinition[] = []
        for (const def of rawDefs) {
          const engineConfig = config.engineConfigs[def.id] ?? {}
          const keyRef =
            (engineConfig.keyRef as string | undefined) || def.defaultKeyRef

          let hasKey = false
          let keySource: 'credentials' | 'env' | 'none' = 'none'

          if (keyRef) {
            if (credentials) {
              try {
                const hit = await credentials.resolve(keyRef)
                if (hit?.value && hit.value.length > 0) {
                  hasKey = true
                  keySource = 'credentials'
                }
              } catch {}
            }
            if (
              !hasKey &&
              process.env[keyRef] &&
              process.env[keyRef]!.length > 0
            ) {
              hasKey = true
              keySource = 'env'
            }
          }

          definitions.push({
            ...def,
            hasKey,
            keySource,
          })
        }

        const body: GetConfigResponse = {
          config,
          definitions,
        }
        sendJson(res, 200, { ok: true, data: body })
      } catch (error) {
        sendJson(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    },
  })

  const unregisterSet = webServer.register({
    kind: 'exact',
    path: '/api/cust-search/set-config',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'Method Not Allowed' })
        return
      }

      try {
        const raw = await readRequestBody(req)
        const payload = JSON.parse(raw) as SetConfigRequest

        const current = loadStorage()
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
          const credentials = ctx.get('credentials') as
            | {
                set?(ref: string, value: string): Promise<void>
                unset?(ref: string): Promise<void>
              }
            | undefined

          for (const update of Object.values(payload.keyUpdates)) {
            if (
              update &&
              typeof update.keyRef === 'string' &&
              update.keyRef.trim().length > 0
            ) {
              const ref = update.keyRef.trim()
              if (update.value && update.value.trim().length > 0) {
                if (typeof credentials?.set === 'function') {
                  await credentials.set(ref, update.value.trim())
                }
              } else if (update.value === '') {
                // Clear credential
                if (typeof credentials?.unset === 'function') {
                  await credentials.unset(ref)
                }
              }
            }
          }
        }

        saveStorage(updated)
        sendJson(res, 200, { ok: true })
      } catch (error) {
        sendJson(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    },
  })

  const unregisterTest = webServer.register({
    kind: 'exact',
    path: '/api/cust-search/test-engine',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'Method Not Allowed' })
        return
      }

      try {
        const raw = await readRequestBody(req)
        const payload = JSON.parse(raw) as TestEngineRequest
        const {
          engineId,
          query,
          maxResults = 5,
          engineConfig: overrideConfig,
          tempApiKey,
        } = payload

        if (
          !engineId ||
          typeof query !== 'string' ||
          query.trim().length === 0
        ) {
          sendJson(res, 400, {
            ok: false,
            error: 'engineId and non-empty query are required',
          })
          return
        }

        const engines = createEngineRegistry()
        const engine = engines.get(engineId)
        if (!engine) {
          sendJson(res, 404, {
            ok: false,
            error: `Search engine "${engineId}" not found`,
          })
          return
        }

        const storage = loadStorage()
        const engineConfig =
          overrideConfig ?? storage.engineConfigs[engineId] ?? {}
        const defaultTimeout = storage.defaultTimeout || 8000
        const timeoutMs =
          typeof engineConfig.timeout === 'number' && engineConfig.timeout > 0
            ? engineConfig.timeout
            : defaultTimeout

        const resolveApiKey = async (
          keyRef?: string,
        ): Promise<string | undefined> => {
          if (!keyRef) return undefined
          const targetRef =
            (engineConfig.keyRef as string | undefined) || engine.defaultKeyRef
          if (tempApiKey !== undefined && (!keyRef || keyRef === targetRef)) {
            return tempApiKey
          }
          if (options?.resolveApiKey) {
            return options.resolveApiKey(keyRef)
          }
          const credentials = ctx.get('credentials') as
            | {
                resolve(ref: string): Promise<{ value?: string } | undefined>
              }
            | undefined
          if (credentials) {
            try {
              const hit = await credentials.resolve(keyRef)
              if (hit?.value && hit.value.length > 0) return hit.value
            } catch {}
          }
          return process.env[keyRef]
        }

        const engineCtx: SearchEngineContext = {
          config: storage,
          engineConfig,
          web: options?.web,
          resolveApiKey,
          logger: options?.logger,
        }

        if (!engine.available(engineCtx)) {
          sendJson(res, 200, {
            ok: false,
            data: {
              engineId,
              durationMs: 0,
              error: 'Search engine is not available in current environment',
            },
          })
          return
        }

        const startTime = Date.now()
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), timeoutMs)

        try {
          const result = await engine.search(
            query.trim(),
            maxResults,
            engineCtx,
            ctrl.signal,
          )
          clearTimeout(timer)
          const durationMs = Date.now() - startTime
          sendJson(res, 200, {
            ok: true,
            data: {
              engineId,
              durationMs,
              result,
            },
          })
        } catch (err) {
          clearTimeout(timer)
          const durationMs = Date.now() - startTime
          const isTimeout = ctrl.signal.aborted
          const errorMsg = isTimeout
            ? `请求超时 (${timeoutMs}ms)`
            : err instanceof Error
              ? err.message
              : String(err)
          sendJson(res, 200, {
            ok: false,
            data: {
              engineId,
              durationMs,
              error: errorMsg,
            },
          })
        }
      } catch (error) {
        sendJson(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    },
  })

  return () => {
    unregisterGet()
    unregisterSet()
    unregisterTest()
  }
}
