import * as React from 'react'

/**
 * Translate function shape used by this page's components.
 *
 * Deliberately loose: engine copy is looked up with computed keys
 * (`engines.<id>.name`), while the framework's namespace-bound `t` seat types
 * its key domain as a closed union. The seat is widened to this shape exactly
 * once, at the registration boundary in `index.ts`.
 */
export type Translator = (
  key: string,
  params?: Record<string, unknown>,
) => string

/** Renders the key itself; only reachable if a component escapes the provider. */
const KEY_FALLBACK: Translator = (key, params) =>
  params === undefined
    ? key
    : Object.entries(params).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        key,
      )

const I18nContext = React.createContext<Translator>(KEY_FALLBACK)

export function I18nProvider({
  translator,
  children,
}: {
  translator: Translator
  children?: React.ReactNode
}): React.ReactElement {
  return React.createElement(
    I18nContext.Provider,
    { value: translator },
    children,
  )
}

export function useI18n(): { t: Translator } {
  return { t: React.useContext(I18nContext) }
}
