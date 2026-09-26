import * as React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { SlotCore, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
// Side-effect type imports: they bring in the cordis Context augmentation for
// the `locale` service and the `plugins.bundle.config` SlotMap entry.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import { SettingsView } from './components/SettingsView.ts'
import { I18nProvider, type Translator } from './i18n.ts'
import { en, zh } from './locales/index.ts'
import { CSS } from './styles.ts'

const e = React.createElement

/** Locale namespace owned by this plugin; merged into LocaleNamespaceMap in locales/index.ts. */
export const NS = 'cust-search'

/**
 * Package name this plugin is installed under. The Plugins page keys a bundle's
 * own configuration by that name, so this is where our page registers.
 */
export const BUNDLE_NAME = '@local/dsh-cust-search'

export const name = 'cust-search-client'
export const inject = ['slots', 'locale']

/** The `slots` service surface this plugin uses (`dsh-client-runtime`'s SlotRegistry). */
interface SlotsService {
  register: SlotCore['register']
  inject(key: string, callback: () => void): () => void
}

/** The page body; `t` is the framework-injected locale seat for {@link NS}. */
function CustSearchConfig({ t }: { t: TranslateNS<typeof NS> }) {
  // Engine copy is looked up with computed keys (`engines.<id>.name`), which the
  // seat's closed key union cannot express; widen to the page's loose shape once.
  //
  // The `view` prop is deliberately ignored: a bundle's configuration entry is
  // only ever rendered with `view: 'page'` (the Plugins page shows the bundle's
  // manifest description for the one-liner), so there is no summary to draw.
  return e(I18nProvider, { translator: t as Translator }, e(SettingsView))
}

export function apply(ctx: Context): void {
  // 1. Dictionaries
  ctx.effect(
    () => ctx.locale.register(NS, { zh, en }),
    'cust-search: dictionaries',
  )

  // 2. Stylesheet
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = BUNDLE_NAME
    style.textContent = CSS
    document.head.appendChild(style)
    return () => style.remove()
  }, 'cust-search: styles')

  // 3. The page, on this bundle's own card in the Plugins page
  // (Plugins → Installed → this package). Registration waits for the page's
  // `plugins.bundle.config` declaration; a deployment without the Plugins page
  // simply never contributes one.
  const slots = ctx.get('slots') as SlotsService | undefined
  if (!slots) return
  slots.inject('plugins.bundle.config', () =>
    slots.register(
      { name: 'plugins.bundle.config', key: BUNDLE_NAME, locale: NS },
      CustSearchConfig,
    ),
  )
}
