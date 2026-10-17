import type {
  EngineContext,
  SearchEngine,
  SearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'
import { fetchHtmlWithRetry, stripTags } from './base.ts'
import { toResult } from './result.ts'

const BING_URL = 'https://www.bing.com/search'

const LANG_PROFILES: Record<string, { market: string; acceptLang: string }> = {
  zh: { market: 'zh-CN', acceptLang: 'zh-CN,zh;q=0.9,en;q=0.8' },
  en: { market: 'en-US', acceptLang: 'en-US,en;q=0.9' },
  ru: { market: 'ru-RU', acceptLang: 'ru-RU,ru;q=0.9,en;q=0.8' },
  ja: { market: 'ja-JP', acceptLang: 'ja-JP,ja;q=0.9,en;q=0.8' },
  de: { market: 'de-DE', acceptLang: 'de-DE,de;q=0.9,en;q=0.8' },
  fr: { market: 'fr-FR', acceptLang: 'fr-FR,fr;q=0.9,en;q=0.8' },
  es: { market: 'es-ES', acceptLang: 'es-ES,es;q=0.9,en;q=0.8' },
  ko: { market: 'ko-KR', acceptLang: 'ko-KR,ko;q=0.9,en;q=0.8' },
}

export class BingSearchEngine implements SearchEngine {
  readonly id = 'bing'
  readonly type = 'free' as const

  async search(
    request: SearchRequest,
    ctx: EngineContext,
    signal: AbortSignal,
  ): Promise<WebSearchResult> {
    const market =
      (typeof ctx.engineConfig.market === 'string' &&
        ctx.engineConfig.market) ||
      'zh-CN'
    const acceptLang = LANG_PROFILES.zh.acceptLang

    const params = new URLSearchParams({
      q: request.query,
      mkt: market,
      adlt: 'off',
    })

    const html = await fetchHtmlWithRetry(
      `${BING_URL}?${params}`,
      signal,
      acceptLang,
    )
    const blocks = html.match(/<li class="b_algo"[\s\S]*?<\/li>/g) ?? []
    const sources: WebSearchSource[] = []

    for (const block of blocks) {
      const hrefMatch = block.match(/<a[^>]*href="(https?:\/\/[^"]+)"/)
      const titleMatch = block.match(
        /<h2[^>]*>[\s\S]*?<a[^>]*>(.*?)<\/a>[\s\S]*?<\/h2>/,
      )
      const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/)
      if (!hrefMatch) continue

      sources.push({
        url: hrefMatch[1],
        ...(titleMatch ? { title: stripTags(titleMatch[1]) } : {}),
        ...(snippetMatch ? { snippet: stripTags(snippetMatch[1]) } : {}),
      })
    }

    return toResult(this.id, sources)
  }
}
