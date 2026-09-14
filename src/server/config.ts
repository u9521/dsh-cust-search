import z from '@deepseek-ai/schemastery'

export const DEFAULT_ENGINES = [
  'bing',
  'ddg',
  'searxng',
  'tavily',
  'anysearch',
  'exa',
]

export const Config = z.object({
  engines: z
    .array(z.string())
    .default(DEFAULT_ENGINES)
    .description(
      'Ordered list of search engines to query sequentially until one succeeds.',
    ),
  timeoutPerEngine: z
    .number()
    .default(8000)
    .description('Timeout in milliseconds per engine attempt.'),
  bingMarket: z
    .string()
    .default('zh-CN')
    .description('Market code for Bing searches (e.g. zh-CN, en-US).'),
  searxngInstances: z
    .array(z.string())
    .default([])
    .description(
      'Custom SearXNG instance URLs (leave empty to use public defaults).',
    ),
  tavilyApiKey: z
    .string()
    .role('secret')
    .default('')
    .description(
      'API key for Tavily (optional; keyless anonymous access supported).',
    ),
  exaApiKey: z
    .string()
    .role('secret')
    .default('')
    .description('API key for Exa (optional; keyless MCP supported).'),
  parallelApiKey: z
    .string()
    .role('secret')
    .default('')
    .description('API key for Parallel AI search.'),
  perplexityApiKey: z
    .string()
    .role('secret')
    .default('')
    .description('API key for Perplexity search.'),
  deepseekApiKey: z
    .string()
    .role('secret')
    .default('')
    .description('API key for DeepSeek official search.'),
})
