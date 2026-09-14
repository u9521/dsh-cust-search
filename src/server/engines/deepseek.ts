import type {
  SearchEngine,
  SearchEngineContext,
  WebSearchResult,
} from '../../types.ts'

export class DeepSeekBridgeEngine implements SearchEngine {
  readonly id = 'deepseek'
  readonly type = 'bridge' as const

  available(ctx: SearchEngineContext): boolean {
    const web = ctx.web as {
      searchProviders?: Map<string, { available?: () => boolean }>
    } | null
    const official = web?.searchProviders?.get('deepseek-official')
    return Boolean(
      official &&
      (typeof official.available !== 'function' || official.available()),
    )
  }

  async search(
    query: string,
    maxResults: number,
    ctx: SearchEngineContext,
    signal?: AbortSignal,
  ): Promise<WebSearchResult> {
    const web = ctx.web as {
      searchProviders?: Map<
        string,
        {
          search: (
            req: { query: string; maxResults?: number },
            sig?: AbortSignal,
          ) => Promise<WebSearchResult>
        }
      >
    } | null
    const official = web?.searchProviders?.get('deepseek-official')

    if (!official) {
      throw new Error(
        'web-search-deepseek plugin is not active or not registered',
      )
    }

    return await official.search({ query, maxResults }, signal)
  }
}
