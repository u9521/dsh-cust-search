import * as React from 'react'
import { en, flattenDictionary, zh } from './locales/index.ts'

export const LOCALE_NS = 'dsh-cust-search'

const zhDict = flattenDictionary(zh)
const enDict = flattenDictionary(en)

export type Translator = (
  key: string,
  params?: Record<string, unknown>,
) => string

function formatString(
  template: string,
  params?: Record<string, unknown>,
): string {
  if (!params) return template
  let str = template
  for (const [k, v] of Object.entries(params)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
  }
  return str
}

export function createFallbackTranslator(lang?: string): Translator {
  const currentLang =
    lang ||
    (typeof navigator !== 'undefined' && navigator.language.startsWith('zh')
      ? 'zh'
      : 'en')
  const dict = currentLang.startsWith('zh') ? zhDict : enDict
  const fallbackDict = enDict

  return (key: string, params?: Record<string, unknown>) => {
    const raw = dict[key] || fallbackDict[key] || key
    return formatString(raw, params)
  }
}

const I18nContext = React.createContext<Translator>(createFallbackTranslator())

export function I18nProvider({
  translator,
  children,
}: {
  translator?: Translator
  children?: React.ReactNode
}): React.ReactElement {
  const current = translator || createFallbackTranslator()
  return React.createElement(I18nContext.Provider, { value: current }, children)
}

export function useI18n(): { t: Translator } {
  const t = React.useContext(I18nContext)
  return { t }
}
