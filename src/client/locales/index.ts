import type { CustSearchLocaleKey } from './en.ts'

export { en, type CustSearchLocaleKey } from './en.ts'
export { zh } from './zh.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Copy owned by this plugin's settings page. */
    'cust-search': CustSearchLocaleKey
  }
}
