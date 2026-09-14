import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { CustSearchStorage } from '../types.ts'

export const DEFAULT_STORAGE: CustSearchStorage = {
  defaultTimeout: 8000,
  enginesOrder: [
    'deepseek',
    'bing',
    'ddg',
    'searxng',
    'tavily',
    'anysearch',
    'exa',
    'keenable',
    'firecrawl',
    'parallel',
    'perplexity',
  ],
  engineConfigs: {
    deepseek: { timeout: 15000 },
    bing: { timeout: 6000, market: 'zh-CN' },
    ddg: { timeout: 6000 },
    searxng: { timeout: 6000, instances: [] },
    tavily: { timeout: 8000, keyRef: 'TAVILY_API_KEY' },
    exa: { timeout: 8000, keyRef: 'EXA_API_KEY' },
    anysearch: { timeout: 8000 },
    keenable: { timeout: 15000, keyRef: 'KEENABLE_API_KEY' },
    firecrawl: { timeout: 12000, keyRef: 'FIRECRAWL_API_KEY' },
    parallel: { timeout: 15000, keyRef: 'PARALLEL_API_KEY' },
    perplexity: { timeout: 15000, keyRef: 'PERPLEXITY_API_KEY' },
  },
}

export function getStorageDir(ensureExists = false): string {
  const dshHome = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
  const storageDir = path.join(dshHome, 'storages')
  if (ensureExists && !fs.existsSync(storageDir)) {
    try {
      fs.mkdirSync(storageDir, { recursive: true })
    } catch {}
  }
  return storageDir
}

export function getCustSearchStoragePath(ensureDir = false): string {
  return path.join(getStorageDir(ensureDir), 'cust_search.json')
}

export function loadStorage(): CustSearchStorage {
  const filePath = getCustSearchStoragePath(false)
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<CustSearchStorage>
      return {
        defaultTimeout:
          typeof parsed.defaultTimeout === 'number' && parsed.defaultTimeout > 0
            ? parsed.defaultTimeout
            : DEFAULT_STORAGE.defaultTimeout,
        enginesOrder: Array.isArray(parsed.enginesOrder)
          ? parsed.enginesOrder
          : DEFAULT_STORAGE.enginesOrder,
        engineConfigs:
          typeof parsed.engineConfigs === 'object' &&
          parsed.engineConfigs !== null
            ? { ...DEFAULT_STORAGE.engineConfigs, ...parsed.engineConfigs }
            : { ...DEFAULT_STORAGE.engineConfigs },
      }
    }
  } catch {}

  const initial = { ...DEFAULT_STORAGE }
  saveStorage(initial)
  return initial
}

export function saveStorage(data: CustSearchStorage): void {
  const filePath = getCustSearchStoragePath(true)
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save cust_search.json:', err)
  }
}
