import type {
  SearchEngine,
  SearchEngineContext,
  WebSearchResult,
  WebSearchSource,
} from '../../types.ts'

export type {
  SearchEngine,
  SearchEngineContext,
  WebSearchResult,
  WebSearchSource,
}

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
export const DEFAULT_ACCEPT_LANG = 'zh-CN,zh;q=0.9,en;q=0.8'

export function decodeEntities(text: string): string {
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

export const SNIPPET_NOISE =
  /\b(sign up|sign in|log in|login|subscribe( to| for)?|member[- ]?only|become a member|create (a )?free account|read more|continue reading|story continues|get started|install (the )?app|view on|medium membership|join \w+ for free|get updates from this writer|stories in your inbox|remember me for|unlock this|free to read|become a patron)\b/gi

export function cleanSnippet(text?: string): string {
  if (!text) return ''
  return String(text)
    .replace(SNIPPET_NOISE, ' ')
    .replace(/^\s*(#{1,6}\s*|\[\s*x?\s*\]\s*|-\s*\[\s*x?\s*\]\s*|>\s*)/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
}

export function stripTags(html: string): string {
  return decodeEntities(
    String(html)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

export function extractDdgUrl(rel?: string | null): string | null {
  if (!rel) return null
  const m = rel.match(/uddg=([^&]+)/)
  if (m) {
    try {
      return decodeURIComponent(m[1])
    } catch {
      return m[1]
    }
  }
  if (rel.startsWith('//')) return `https:${rel}`
  return rel
}

/**
 * Drop duplicate URLs, preserving order.
 *
 * Deliberately unbounded: `maxResults` belongs to the web seam, which enforces
 * it on the way back and reports `truncated` itself. An engine whose API takes
 * a result count applies it at the request layer instead.
 */
export function uniqueSources(sources: WebSearchSource[]): WebSearchSource[] {
  const seen = new Set<string>()
  const out: WebSearchSource[] = []
  for (const s of sources) {
    if (s.url && !seen.has(s.url)) {
      seen.add(s.url)
      out.push(s)
    }
  }
  return out
}

export async function fetchHtml(
  url: string,
  signal?: AbortSignal,
  acceptLang?: string,
): Promise<string> {
  let response: Response
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort)
    response = await fetch(url, {
      headers: {
        'user-agent': DEFAULT_USER_AGENT,
        'accept-language': acceptLang ?? DEFAULT_ACCEPT_LANG,
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error(
      `connection error: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url.split('?')[0]}`)
  }
  const html = await response.text()
  if (
    response.status === 202 ||
    /anomaly|captcha|unusual traffic|robot check/i.test(html.slice(0, 4000))
  ) {
    throw new Error('Search provider returned anti-bot challenge or rate limit')
  }
  return html
}

export async function fetchHtmlWithRetry(
  url: string,
  signal?: AbortSignal,
  acceptLang?: string,
  maxAttempts = 2,
): Promise<string> {
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const html = await fetchHtml(url, signal, acceptLang)
      if (html.length > 500) return html
    } catch (error) {
      lastError = error
      if (signal?.aborted) throw error
    }
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  throw lastError ?? new Error('fetch failed with empty body')
}
