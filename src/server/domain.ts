import { z } from 'zod'
import { defineDomain } from '@deepseek-ai/dsh-storage-domain'
import type { CustSearchStorage } from '../types.ts'

/**
 * Engine-independent defaults. The domain's `initial` is exactly this value, so
 * a deployment that never saved anything reads these defaults without any write
 * — unlike the previous file reader, which materialized a file on first read.
 */
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

/**
 * One engine's overrides. Loose on purpose: engine ids and their specific knobs
 * are data (the settings page can add a `keyRef` to any engine), so an unknown
 * field must survive a read/write round trip instead of being stripped.
 */
const engineSpecificConfig = z.looseObject({
  timeout: z.number().positive().optional(),
  keyRef: z.string().optional(),
  market: z.string().optional(),
  instances: z.array(z.string()).optional(),
})

/**
 * The whole persisted configuration. Validation happens at the durability
 * boundary, so a hand-edited or truncated file fails the open loudly instead of
 * being silently replaced by defaults.
 */
const custSearchStorageSchema = z.object({
  defaultTimeout: z.number().positive().default(DEFAULT_STORAGE.defaultTimeout),
  enginesOrder: z.array(z.string()).default([...DEFAULT_STORAGE.enginesOrder]),
  engineConfigs: z
    .record(z.string(), engineSpecificConfig)
    .default({ ...DEFAULT_STORAGE.engineConfigs }),
})

/**
 * The `cust_search` storage domain. The default `single` layout keeps the whole
 * configuration in one atomically republished `cust_search.json`, which is the
 * shape this plugin's reads and writes actually have: one ordered engine list
 * plus its per-engine settings, never independent records.
 */
export const custSearchDomainSpec = defineDomain({
  name: 'cust_search',
  version: 1,
  global: {
    schema: custSearchStorageSchema,
    initial: DEFAULT_STORAGE,
  },
  tables: {},
})
