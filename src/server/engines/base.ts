import type { WebSearchSource } from '../../types.ts'

export type { WebSearchSource }

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
export const DEFAULT_ACCEPT_LANG = 'zh-CN,zh;q=0.9,en;q=0.8'

function decodeEntities(text: string): string {
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
 * Fetch one HTML page for a scraping engine.
 *
 * The call's time budget already arrived as `signal`, so this adds no timer of
 * its own — it used to schedule a 12 s one that outlived every failure path.
 *
 * @param url - the page to fetch.
 * @param signal - the call's abort signal, from the caller's `Deadline`.
 * @param acceptLang - `Accept-Language` header value.
 * @returns the response body.
 * @throws when the response is not OK or carries an anti-bot challenge.
 */
export async function fetchHtml(
  url: string,
  signal: AbortSignal,
  acceptLang?: string,
): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'user-agent': DEFAULT_USER_AGENT,
      'accept-language': acceptLang ?? DEFAULT_ACCEPT_LANG,
    },
    signal,
    redirect: 'follow',
  })

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

/**
 * Fetch one HTML page, retrying once on a transport failure or an empty body.
 *
 * @param url - the page to fetch.
 * @param signal - the call's abort signal.
 * @param acceptLang - `Accept-Language` header value.
 * @param maxAttempts - total attempts; the caller's deadline still bounds them.
 * @returns the response body.
 */
export async function fetchHtmlWithRetry(
  url: string,
  signal: AbortSignal,
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
      if (signal.aborted) throw error
    }
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  throw lastError ?? new Error('fetch failed with empty body')
}
