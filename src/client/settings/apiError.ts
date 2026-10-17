/**
 * Turning a rejected call into text the page can show.
 *
 * Auth rejections carry a locale key rather than a sentence, because the
 * transport layer cannot know the active language; everything else is already
 * host-authored prose and passes through unchanged. This lives outside the
 * draft hook so it can be tested without React.
 *
 * @module @local/dsh-cust-search/client/settings/apiError
 */

/** The page's translator shape. */
export type Translate = (
  key: string,
  params?: Record<string, unknown>,
) => string

/**
 * Render a rejection in the active language.
 *
 * @param error - whatever the call rejected with.
 * @param translate - the page's translator.
 * @returns text ready to display.
 */
export function describeApiError(error: unknown, translate: Translate): string {
  const key = (error as { messageKey?: string | null }).messageKey
  if (typeof key === 'string' && key.length > 0) return translate(key)
  return error instanceof Error ? error.message : String(error)
}
