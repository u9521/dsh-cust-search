import * as React from 'react'
import type { CustSearchStorage, EngineDefinition } from '../../types.ts'
import { fetchConfig, saveConfig } from '../api.ts'
import { describeApiError } from './apiError.ts'

/**
 * The editable configuration and everything that mutates it.
 *
 * This used to live inline in the settings page: nine `useState` cells and
 * seven handlers, each repeating the same "clear the message, spread the
 * engine's slice" preamble, then threaded through two list components as
 * twelve props. The rule for what counts as a pending key change, and the rule
 * for what counts as dirty, existed only as three `JSON.stringify` comparisons
 * inside a render.
 *
 * @module @local/dsh-cust-search/client/settings/useConfigDraft
 */

/** A credential edit the user has typed but not saved. */
export interface KeyUpdate {
  keyRef: string
  value: string
}

/** The page's outward state and commands. */
export interface ConfigDraft {
  /** Current edits; null until the first load finishes. */
  draft: CustSearchStorage | null
  /** What the host last accepted. */
  saved: CustSearchStorage | null
  /** Engine display facts from the host. */
  definitions: EngineDefinition[]
  /** True until the first load settles. */
  loading: boolean
  /** True while a save is in flight. */
  saving: boolean
  /** A rejection from the last load or save, already translated. */
  error: string | null
  /** True after a save the host accepted, until the next edit. */
  justSaved: boolean
  /** Unsaved credential edits, keyed by engine id. */
  keyUpdates: Record<string, KeyUpdate>
  /** Raw text the user has typed into each engine's key field. */
  keyInputs: Record<string, string>
  /** Engine ids whose pending edit would clear a stored credential. */
  clearedEngineIds: string[]
  /** Whether anything differs from what the host last accepted. */
  dirty: boolean
  /** Replace the whole engine order (drag and drop). */
  reorder(order: string[]): void
  /** Enable or disable one engine. */
  setEnabled(engineId: string, enabled: boolean): void
  /** Replace one engine's full configuration slice. */
  setEngineConfig(engineId: string, patch: Record<string, unknown>): void
  /** Record a typed credential value for one engine. */
  setKeyInput(engineId: string, value: string, defaultKeyRef?: string): void
  /** Mark one engine's stored credential for removal on the next save. */
  clearKey(engineId: string, defaultKeyRef?: string): void
  /** Undo a pending removal. */
  undoClearKey(engineId: string): void
  /** Set the global default budget. */
  setDefaultTimeout(ms: number): void
  /** Persist the draft. Resolves false when the host rejected it. */
  save(): Promise<boolean>
  /** Reload from the host, discarding edits. */
  reload(): Promise<void>
}

/** Whether one engine's slice differs from the saved one. */
function sliceDiffers(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
): boolean {
  const left = a ?? {}
  const right = b ?? {}
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    if (left[key] !== right[key]) return true
  }
  return false
}

/**
 * Own the settings page's editable state.
 *
 * @param t - the page's translator, used for error text.
 * @returns the draft and its commands.
 */
export function useConfigDraft(
  t: (key: string, params?: Record<string, unknown>) => string,
): ConfigDraft {
  const [draft, setDraft] = React.useState<CustSearchStorage | null>(null)
  const [saved, setSaved] = React.useState<CustSearchStorage | null>(null)
  const [definitions, setDefinitions] = React.useState<EngineDefinition[]>([])
  const [keyInputs, setKeyInputs] = React.useState<Record<string, string>>({})
  const [keyUpdates, setKeyUpdates] = React.useState<Record<string, KeyUpdate>>(
    {},
  )
  const [loading, setLoading] = React.useState<boolean>(true)
  const [saving, setSaving] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)
  const [justSaved, setJustSaved] = React.useState<boolean>(false)

  const reset = React.useCallback((config: CustSearchStorage) => {
    setDraft(config)
    setSaved(config)
    setKeyInputs({})
    setKeyUpdates({})
    setError(null)
    setJustSaved(false)
  }, [])

  const reload = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchConfig()
      setDefinitions(data.definitions)
      reset(data.config)
    } catch (caught) {
      setError(`${t('header.loadFailed')} ${describeApiError(caught, t)}`)
    } finally {
      setLoading(false)
    }
  }, [reset, t])

  React.useEffect(() => {
    void reload()
  }, [reload])

  /** Every edit clears the surface messages and the saved flag. */
  const beginEdit = React.useCallback(() => {
    setJustSaved(false)
    setError(null)
  }, [])

  const reorder = React.useCallback(
    (order: string[]) => {
      setDraft((current) =>
        current === null ? current : { ...current, enginesOrder: order },
      )
      beginEdit()
    },
    [beginEdit],
  )

  const setDefaultTimeout = React.useCallback(
    (ms: number) => {
      setDraft((current) =>
        current === null ? current : { ...current, defaultTimeout: ms },
      )
      beginEdit()
    },
    [beginEdit],
  )

  const setEnabled = React.useCallback(
    (engineId: string, enabled: boolean) => {
      setDraft((current) => {
        if (current === null) return current
        const order = enabled
          ? current.enginesOrder.includes(engineId)
            ? current.enginesOrder
            : [...current.enginesOrder, engineId]
          : current.enginesOrder.filter((id) => id !== engineId)
        return { ...current, enginesOrder: order }
      })
      beginEdit()
    },
    [beginEdit],
  )

  const setEngineConfig = React.useCallback(
    (engineId: string, patch: Record<string, unknown>) => {
      setDraft((current) => {
        if (current === null) return current
        return {
          ...current,
          engineConfigs: {
            ...current.engineConfigs,
            [engineId]: {
              ...(current.engineConfigs[engineId] ?? {}),
              ...patch,
            },
          },
        }
      })
      beginEdit()
    },
    [beginEdit],
  )

  const setKeyInput = React.useCallback(
    (engineId: string, value: string, defaultKeyRef?: string) => {
      setKeyInputs((previous) => ({ ...previous, [engineId]: value }))
      // Read the current draft from the closure, not from inside a state
      // updater: an updater may run twice, which would record the pending edit
      // twice as well.
      const target =
        (draft?.engineConfigs[engineId]?.keyRef as string | undefined) ||
        defaultKeyRef
      if (target) {
        setKeyUpdates((previous) => ({
          ...previous,
          [engineId]: { keyRef: target, value },
        }))
      }
      beginEdit()
    },
    [beginEdit, draft],
  )

  const clearKey = React.useCallback(
    (engineId: string, defaultKeyRef?: string) => {
      const savedKeyRef = saved?.engineConfigs[engineId]?.keyRef as
        string | undefined
      const currentKeyRef = draft?.engineConfigs[engineId]?.keyRef as
        string | undefined
      const target = savedKeyRef || currentKeyRef || defaultKeyRef || ''

      setDraft((current) => {
        if (current === null) return current
        return {
          ...current,
          engineConfigs: {
            ...current.engineConfigs,
            [engineId]: {
              ...(current.engineConfigs[engineId] ?? {}),
              keyRef: savedKeyRef,
            },
          },
        }
      })
      setKeyInputs((previous) => ({ ...previous, [engineId]: '' }))
      if (target) {
        setKeyUpdates((previous) => ({
          ...previous,
          [engineId]: { keyRef: target, value: '' },
        }))
      }
      beginEdit()
    },
    [beginEdit, draft, saved],
  )

  const undoClearKey = React.useCallback(
    (engineId: string) => {
      setKeyUpdates((previous) => {
        const next = { ...previous }
        delete next[engineId]
        return next
      })
      beginEdit()
    },
    [beginEdit],
  )

  const clearedEngineIds = React.useMemo(
    () =>
      Object.entries(keyUpdates)
        .filter(([, update]) => update.value === '')
        .map(([id]) => id),
    [keyUpdates],
  )

  const dirty = React.useMemo(() => {
    if (draft === null || saved === null) return false
    if (draft.defaultTimeout !== saved.defaultTimeout) return true
    if (draft.enginesOrder.join('\u0000') !== saved.enginesOrder.join('\u0000'))
      return true
    const ids = new Set([
      ...Object.keys(draft.engineConfigs),
      ...Object.keys(saved.engineConfigs),
    ])
    for (const id of ids) {
      if (sliceDiffers(draft.engineConfigs[id], saved.engineConfigs[id]))
        return true
    }
    for (const update of Object.values(keyUpdates)) {
      if (update.value !== '') return true
    }
    return false
  }, [draft, keyUpdates, saved])

  const save = React.useCallback(async (): Promise<boolean> => {
    if (draft === null) return false
    try {
      setSaving(true)
      setError(null)
      await saveConfig({
        defaultTimeout: draft.defaultTimeout,
        enginesOrder: draft.enginesOrder,
        engineConfigs: draft.engineConfigs,
        keyUpdates: Object.keys(keyUpdates).length > 0 ? keyUpdates : undefined,
      })
      setSaved(draft)
      setKeyUpdates({})
      setKeyInputs({})
      setJustSaved(true)
      const refreshed = await fetchConfig()
      setDefinitions(refreshed.definitions)
      return true
    } catch (caught) {
      setError(`${t('header.saveFailed')} ${describeApiError(caught, t)}`)
      return false
    } finally {
      setSaving(false)
    }
  }, [draft, keyUpdates, t])

  return {
    draft,
    saved,
    definitions,
    loading,
    saving,
    error,
    justSaved,
    keyUpdates,
    keyInputs,
    clearedEngineIds,
    dirty,
    reorder,
    setEnabled,
    setEngineConfig,
    setKeyInput,
    clearKey,
    undoClearKey,
    setDefaultTimeout,
    save,
    reload,
  }
}
