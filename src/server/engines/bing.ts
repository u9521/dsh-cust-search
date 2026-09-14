import type {
  SearchEngine,
  SearchEngineContext,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'
import { fetchHtmlWithRetry, stripTags, uniqueSources } from './base.ts'

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

  available(): boolean {
    return true
  }

  async search(
    query: string,
    maxResults: number,
    ctx: SearchEngineContext,
    signal?: AbortSignal,
  ): Promise<WebSearchResult> {
    const market =
      (typeof ctx.engineConfig.market === 'string' &&
        ctx.engineConfig.market) ||
      'zh-CN'
    const profile = LANG_PROFILES.zh
    const acceptLang = profile.acceptLang

    const params = new URLSearchParams({
      q: query,
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

    const limited = uniqueSources(sources, maxResults)
    if (limited.length === 0) {
      throw new Error('Bing returned 0 results')
    }

    return {
      sources: limited,
      truncated: false,
    }
  }
}
