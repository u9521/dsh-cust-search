import type {
  EngineContext,
  SearchEngine,
  SearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'
import { extractDdgUrl, fetchHtmlWithRetry, stripTags } from './base.ts'
import { toResult } from './result.ts'

const DDG_HTML_URL = 'https://html.duckduckgo.com/html/'
const DDG_LITE_URL = 'https://lite.duckduckgo.com/lite/'

export class DuckDuckGoSearchEngine implements SearchEngine {
  readonly id = 'ddg'
  readonly type = 'free' as const

  async search(
    request: SearchRequest,
    _ctx: EngineContext,
    signal: AbortSignal,
  ): Promise<WebSearchResult> {
    try {
      return await this.searchHtml(request, signal)
    } catch (error) {
      // A budget expiry is terminal: the lite channel would be given the same
      // already-exhausted signal and could only fail again.
      if (signal.aborted || signal.aborted) throw error
      return await this.searchLite(request, signal)
    }
  }

  private async searchHtml(
    request: SearchRequest,
    signal: AbortSignal,
  ): Promise<WebSearchResult> {
    const params = new URLSearchParams({ q: request.query, adlt: '-1' })
    const html = await fetchHtmlWithRetry(`${DDG_HTML_URL}?${params}`, signal)
    const blocks =
      html.match(
        /<div class="result results_links[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g,
      ) ?? []
    const sources: WebSearchSource[] = []

    for (const block of blocks) {
      const urlMatch = block.match(
        /<a[^>]*class="result__a"[^>]*href="([^"]*)"/,
      )
      const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*>(.*?)<\/a>/)
      const snippetMatch = block.match(
        /<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/,
      )
      const dateMatch = block.match(/<span[^>]*>\s*([\dT:.+-]+)\s*<\/span>/)

      const url = extractDdgUrl(urlMatch?.[1])
      if (!url) continue

      sources.push({
        url,
        ...(titleMatch ? { title: stripTags(titleMatch[1]) } : {}),
        ...(snippetMatch ? { snippet: stripTags(snippetMatch[1]) } : {}),
        ...(dateMatch ? { publishedAt: dateMatch[1] } : {}),
      })
    }

    return toResult(this.id, sources)
  }

  private async searchLite(
    request: SearchRequest,
    signal: AbortSignal,
  ): Promise<WebSearchResult> {
    const params = new URLSearchParams({ q: request.query, adlt: '-1' })
    const html = await fetchHtmlWithRetry(`${DDG_LITE_URL}?${params}`, signal)
    const linkMatches =
      html.match(/<a[^>]*class=['"]result-link['"][^>]*>[\s\S]*?<\/a>/g) ?? []
    const snippetMatches =
      html.match(/class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/g) ?? []
    const sources: WebSearchSource[] = []

    for (let i = 0; i < linkMatches.length; i++) {
      const tag = linkMatches[i]
      const hrefMatch = tag.match(/href="([^"]*)"/)
      const titleMatch = tag.match(/class=['"]result-link['"][^>]*>(.*?)<\/a>/)
      if (!hrefMatch) continue

      const url = extractDdgUrl(hrefMatch[1])
      if (!url) continue

      const snippet = snippetMatches[i]?.match(
        /class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/,
      )?.[1]

      sources.push({
        url,
        ...(titleMatch ? { title: stripTags(titleMatch[1]) } : {}),
        ...(snippet ? { snippet: stripTags(snippet) } : {}),
      })
    }

    return toResult(this.id, sources)
  }
}
