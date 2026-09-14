import type {
  GetConfigResponse,
  SetConfigRequest,
  TestEngineRequest,
  TestEngineResponse,
} from '../types.ts'

export async function fetchConfig(): Promise<GetConfigResponse> {
  const res = await fetch('/api/cust-search/get-config', {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch config (HTTP ${res.status})`)
  }
  const json = (await res.json()) as {
    ok: boolean
    data: GetConfigResponse
    error?: string
  }
  if (!json.ok || !json.data) {
    throw new Error(json.error || 'Failed to fetch config')
  }
  return json.data
}

export async function saveConfig(payload: SetConfigRequest): Promise<void> {
  const res = await fetch('/api/cust-search/set-config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Failed to save config (HTTP ${res.status})`)
  }
  const json = (await res.json()) as { ok: boolean; error?: string }
  if (!json.ok) {
    throw new Error(json.error || 'Failed to save config')
  }
}

export async function testEngine(
  payload: TestEngineRequest,
  signal?: AbortSignal,
): Promise<TestEngineResponse> {
  const res = await fetch('/api/cust-search/test-engine', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })
  if (!res.ok) {
    const text = await res.text()
    try {
      const json = JSON.parse(text)
      if (json.data) return json as TestEngineResponse
      return {
        ok: false,
        data: {
          engineId: payload.engineId,
          durationMs: 0,
          error: json.error || `HTTP ${res.status}`,
        },
      }
    } catch {
      return {
        ok: false,
        data: {
          engineId: payload.engineId,
          durationMs: 0,
          error: `HTTP ${res.status}: ${text}`,
        },
      }
    }
  }
  return (await res.json()) as TestEngineResponse
}
