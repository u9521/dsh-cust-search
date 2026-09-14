import * as React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { IconSearchOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { SettingsView } from './components/SettingsView.ts'
import {
  createFallbackTranslator,
  I18nProvider,
  LOCALE_NS,
  type Translator,
} from './i18n.ts'
import { en, flattenDictionary, zh } from './locales/index.ts'
import { CSS } from './styles.ts'

const e = React.createElement

export const name = 'cust-search-client'
export const inject = ['slots']

interface ClientLocaleService {
  register: (ns: string, dicts: Record<string, Record<string, string>>) => void
  bind: (ns: string) => Translator
  subscribe: (callback: () => void) => () => void
}

export function apply(ctx: Context): void {
  const slots = ctx.get('slots') as
    | {
        inject: (name: string, callback: () => void) => void
        register: (
          descriptor: {
            name: string
            id: string
            order: number
            label: () => string
            icon?: unknown
          },
          component: React.ComponentType,
        ) => () => void
      }
    | undefined

  if (!slots) return

  // 1. Register i18n locale
  const locale = ctx.get('locale') as ClientLocaleService | undefined

  if (locale) {
    ctx.effect(() => {
      locale.register(LOCALE_NS, {
        zh: flattenDictionary(zh),
        en: flattenDictionary(en),
      })
      return () => {}
    }, 'cust-search: locale')
  }

  let translator: Translator = locale
    ? locale.bind(LOCALE_NS)
    : createFallbackTranslator()

  if (locale) {
    ctx.effect(() => {
      const unsub = locale.subscribe(() => {
        translator = locale.bind(LOCALE_NS)
      })
      return () => {
        if (typeof unsub === 'function') unsub()
      }
    }, 'cust-search: locale updates')
  }

  // 2. Inject DSH native stylesheet
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = '@local/dsh-cust-search'
    style.textContent = CSS
    document.head.appendChild(style)
    return () => style.remove()
  }, 'cust-search: styles')

  // 3. Register settings section
  slots.inject('settings.section', () =>
    slots.register(
      {
        name: 'settings.section',
        id: 'cust-search',
        order: 35,
        label: () => translator('tabLabel'),
        icon: IconSearchOutline16,
      },
      function CustSearchSettingsSection() {
        return e(I18nProvider, { translator }, e(SettingsView))
      },
    ),
  )

  // 4. Ensure settings nav tab displays official search magnifying glass icon
  ctx.effect(() => {
    const searchPathD1 =
      'M11.894845 6.647401C11.894845 3.725463 9.534486 1.356779 6.623219 1.35657C3.711786 1.35657 1.351635 3.725338 1.351635 6.647401C1.351843 9.569296 3.711911 11.938273 6.623219 11.938273C9.534361 11.938064 11.894637 9.569171 11.894845 6.647401ZM13.245462 6.647401C13.245254 10.317935 10.280401 13.293613 6.623219 13.293821C2.965871 13.293821 0.000204 10.31806 0 6.647401C0 2.976574 2.965746 0 6.623219 0C10.280526 0.000205 13.245462 2.9767 13.245462 6.647401Z'
    const searchPathD2 =
      'M16.000417 15.041079L15.044449 16.000433L11.530434 12.473588L12.486298 11.514234L16.000417 15.041079Z'

    const syncNavIcon = () => {
      const labels = ['Web 搜索', 'Web Search', translator('tabLabel')].filter(
        Boolean,
      )
      const buttons = document.querySelectorAll('button')
      for (const btn of buttons) {
        const text = btn.textContent || ''
        if (labels.some((l) => text.includes(l))) {
          const svg = btn.querySelector('svg')
          if (svg && svg.getAttribute('data-icon') !== 'search') {
            svg.setAttribute('data-icon', 'search')
            svg.setAttribute('viewBox', '0 0 16 16')
            svg.innerHTML = `<path d="${searchPathD1}" fill="currentColor"/><path d="${searchPathD2}" fill="currentColor"/>`
          }
        }
      }
    }

    const observer = new MutationObserver(syncNavIcon)
    observer.observe(document.body, { childList: true, subtree: true })
    syncNavIcon()

    return () => observer.disconnect()
  }, 'cust-search: nav icon')
}

export * from './components/SettingsView.ts'
export * from './i18n.ts'
export * from './locales/index.ts'
export * from './styles.ts'
