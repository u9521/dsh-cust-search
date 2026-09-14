import * as React from 'react'
import {
  IconLoadingOutline16,
  IconWarningOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { CustSearchStorage, EngineDefinition } from '../../types.ts'
import { fetchConfig, saveConfig } from '../api.ts'
import { useI18n } from '../i18n.ts'
import { FooterBar } from './FooterBar.ts'
import { HeaderBar } from './HeaderBar.ts'
import { EngineDetailList } from './settings/EngineDetailList.ts'
import { EngineSortList } from './settings/EngineSortList.ts'
import { useEngineDragDrop } from './settings/useEngineDragDrop.ts'
import { SearchModal } from './test-modal/SearchModal.ts'

const e = React.createElement

export function SettingsView(): React.ReactElement {
  const { t } = useI18n()
  const [config, setConfig] = React.useState<CustSearchStorage | null>(null)
  const [initialConfig, setInitialConfig] =
    React.useState<CustSearchStorage | null>(null)
  const [definitions, setDefinitions] = React.useState<EngineDefinition[]>([])
  const [keyInputs, setKeyInputs] = React.useState<Record<string, string>>({})
  const [keyUpdates, setKeyUpdates] = React.useState<
    Record<string, { keyRef: string; value: string }>
  >({})
  const [isSortMode, setIsSortMode] = React.useState<boolean>(false)
  const [isTestModalOpen, setIsTestModalOpen] = React.useState<boolean>(false)
  const [loading, setLoading] = React.useState<boolean>(true)
  const [saving, setSaving] = React.useState<boolean>(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [savedSuccess, setSavedSuccess] = React.useState<boolean>(false)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchConfig()
      setConfig(data.config)
      setInitialConfig(data.config)
      setDefinitions(data.definitions)
      setKeyInputs({})
      setKeyUpdates({})
      setErrorMessage(null)
      setSavedSuccess(false)
    } catch (err) {
      setErrorMessage(
        `${t('header.loadFailed')} ${err instanceof Error ? err.message : String(err)}`,
      )
    } finally {
      setLoading(false)
    }
  }, [t])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const onReorder = React.useCallback(
    (newOrder: string[]) => {
      if (!config) return
      setConfig({
        ...config,
        enginesOrder: newOrder,
      })
      setSavedSuccess(false)
      setErrorMessage(null)
    },
    [config],
  )

  const {
    draggedId,
    dragActive,
    targetIndex,
    cardWidth,
    initialTransform,
    containerRef,
    floatingRef,
    handlePointerDown,
  } = useEngineDragDrop({
    enginesOrder: config?.enginesOrder ?? [],
    onReorder,
  })

  const handleSave = async () => {
    if (!config) return
    try {
      setSaving(true)
      setErrorMessage(null)
      await saveConfig({
        defaultTimeout: config.defaultTimeout,
        enginesOrder: config.enginesOrder,
        engineConfigs: config.engineConfigs,
        keyUpdates: Object.keys(keyUpdates).length > 0 ? keyUpdates : undefined,
      })
      setKeyUpdates({})
      setKeyInputs({})
      setInitialConfig(config)
      setSavedSuccess(true)
      const refreshed = await fetchConfig()
      setDefinitions(refreshed.definitions)
    } catch (err) {
      setErrorMessage(
        `${t('header.saveFailed')} ${err instanceof Error ? err.message : String(err)}`,
      )
    } finally {
      setSaving(false)
    }
  }

  // Track cleared engine IDs
  const clearedEngineIds = React.useMemo(
    () => Object.keys(keyUpdates).filter((id) => keyUpdates[id]?.value === ''),
    [keyUpdates],
  )

  // Track other configuration modifications
  const hasOtherChanges = React.useMemo(() => {
    if (!config || !initialConfig) return false
    if (config.defaultTimeout !== initialConfig.defaultTimeout) return true
    if (
      JSON.stringify(config.enginesOrder) !==
      JSON.stringify(initialConfig.enginesOrder)
    )
      return true
    if (
      JSON.stringify(config.engineConfigs) !==
      JSON.stringify(initialConfig.engineConfigs)
    )
      return true
    for (const id of Object.keys(keyUpdates)) {
      if (keyUpdates[id]?.value !== '') return true
    }
    return false
  }, [config, initialConfig, keyUpdates])

  // Composed reactive message
  const displayMessage = React.useMemo(() => {
    if (errorMessage) return errorMessage

    const hasClears = clearedEngineIds.length > 0
    if (hasClears) {
      const names = clearedEngineIds
        .map((id) => t(`engines.${id}.name`) || id)
        .join('、')
      if (hasOtherChanges) {
        return t('header.unsavedWithClearedAndOther', { names })
      }
      return t('header.unsavedWithClearedOnly', { names })
    }

    if (hasOtherChanges) {
      return t('header.unsavedChanges')
    }

    if (savedSuccess) {
      return t('header.saveSuccess')
    }

    return null
  }, [errorMessage, clearedEngineIds, hasOtherChanges, savedSuccess, t])

  // Engine action handlers
  const handleToggleEnable = React.useCallback(
    (engineId: string, enable: boolean) => {
      if (!config) return
      setSavedSuccess(false)
      setErrorMessage(null)
      let newOrder = [...config.enginesOrder]
      if (enable) {
        if (!newOrder.includes(engineId)) newOrder.push(engineId)
      } else {
        newOrder = newOrder.filter((id) => id !== engineId)
      }
      setConfig({ ...config, enginesOrder: newOrder })
    },
    [config],
  )

  const handleChangeTimeout = React.useCallback(
    (engineId: string, timeout?: number) => {
      if (!config) return
      setSavedSuccess(false)
      setErrorMessage(null)
      const currentConf = config.engineConfigs[engineId] ?? {}
      setConfig({
        ...config,
        engineConfigs: {
          ...config.engineConfigs,
          [engineId]: { ...currentConf, timeout },
        },
      })
    },
    [config],
  )

  const handleChangeKeyRef = React.useCallback(
    (engineId: string, keyRef: string) => {
      if (!config) return
      setSavedSuccess(false)
      setErrorMessage(null)
      const currentConf = config.engineConfigs[engineId] ?? {}
      setConfig({
        ...config,
        engineConfigs: {
          ...config.engineConfigs,
          [engineId]: { ...currentConf, keyRef },
        },
      })
    },
    [config],
  )

  const handleApiKeyInputChange = React.useCallback(
    (engineId: string, val: string, defaultKeyRef?: string) => {
      if (!config) return
      setSavedSuccess(false)
      setErrorMessage(null)
      setKeyInputs((prev) => ({ ...prev, [engineId]: val }))
      const currentConf = config.engineConfigs[engineId] ?? {}
      const targetRef = (currentConf.keyRef as string) || defaultKeyRef || ''
      if (targetRef) {
        setKeyUpdates((prev) => ({
          ...prev,
          [engineId]: { keyRef: targetRef, value: val },
        }))
      }
    },
    [config],
  )

  const handleClearApiKey = React.useCallback(
    (engineId: string, defaultKeyRef?: string) => {
      if (!config) return
      setSavedSuccess(false)
      setErrorMessage(null)
      const initialKeyRef = initialConfig?.engineConfigs[engineId]?.keyRef
      const currentConf = config.engineConfigs[engineId] ?? {}
      const targetRef =
        (initialKeyRef as string) ||
        (currentConf.keyRef as string) ||
        defaultKeyRef ||
        ''
      setConfig({
        ...config,
        engineConfigs: {
          ...config.engineConfigs,
          [engineId]: {
            ...currentConf,
            keyRef: initialKeyRef,
          },
        },
      })
      setKeyInputs((prev) => ({ ...prev, [engineId]: '' }))
      if (targetRef) {
        setKeyUpdates((prev) => ({
          ...prev,
          [engineId]: { keyRef: targetRef, value: '' },
        }))
      }
    },
    [config, initialConfig],
  )

  const handleUndoClearApiKey = React.useCallback((engineId: string) => {
    setSavedSuccess(false)
    setErrorMessage(null)
    setKeyUpdates((prev) => {
      const next = { ...prev }
      delete next[engineId]
      return next
    })
  }, [])

  const handleChangeOption = React.useCallback(
    (engineId: string, key: string, value: unknown) => {
      if (!config) return
      setSavedSuccess(false)
      setErrorMessage(null)
      const currentConf = config.engineConfigs[engineId] ?? {}
      setConfig({
        ...config,
        engineConfigs: {
          ...config.engineConfigs,
          [engineId]: { ...currentConf, [key]: value },
        },
      })
    },
    [config],
  )

  if (loading) {
    return e(
      'div',
      {
        className: 'dsh-cs-container',
        style: {
          padding: '60px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          color: 'var(--dsw-alias-label-secondary)',
        },
      },
      e(IconLoadingOutline16, { size: 24, className: 'dsh-cs-spin' }),
      e('span', null, t('header.loading')),
    )
  }

  if (!config) {
    return e(
      'div',
      {
        className: 'dsh-cs-container',
        style: {
          padding: '40px 20px',
          textAlign: 'center',
          color: 'var(--dsw-alias-state-error-primary, #ef4444)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        },
      },
      e(IconWarningOutline16, { size: 18 }),
      e('span', null, errorMessage || t('header.loadFailed')),
    )
  }

  // Build definition map
  const defMap = new Map<string, EngineDefinition>()
  for (const def of definitions) {
    defMap.set(def.id, def)
  }

  // In sort mode: only show enabled engines in enginesOrder
  const enabledDefs = config.enginesOrder
    .map((id) => defMap.get(id))
    .filter(Boolean) as EngineDefinition[]

  // In detail mode: display enabled engines first (ordered), then disabled engines
  const allOrderedDefs: Array<{ def: EngineDefinition; orderIndex?: number }> =
    []
  const orderSet = new Set(config.enginesOrder)

  config.enginesOrder.forEach((id, idx) => {
    const def = defMap.get(id)
    if (def) allOrderedDefs.push({ def, orderIndex: idx + 1 })
  })

  definitions.forEach((def) => {
    if (!orderSet.has(def.id)) {
      allOrderedDefs.push({ def, orderIndex: undefined })
    }
  })

  return e(
    'div',
    {
      className: 'dsh-cs-container',
    },
    // Header
    e(HeaderBar, {
      isSortMode,
      onToggleSortMode: () => setIsSortMode(!isSortMode),
      defaultTimeout: config.defaultTimeout,
      onChangeDefaultTimeout: (val: number) => {
        setSavedSuccess(false)
        setErrorMessage(null)
        setConfig({ ...config, defaultTimeout: val })
      },
    }),
    // Card list
    e(
      'div',
      {
        ref: containerRef,
        className: 'dsh-cs-list',
      },
      isSortMode
        ? e(EngineSortList, {
            config,
            enabledDefs,
            defMap,
            draggedId,
            dragActive,
            targetIndex,
            cardWidth,
            initialTransform,
            floatingRef,
            handlePointerDown,
          })
        : e(EngineDetailList, {
            allOrderedDefs,
            config,
            initialConfig,
            keyInputs,
            keyUpdates,
            onToggleEnable: handleToggleEnable,
            onChangeTimeout: handleChangeTimeout,
            onChangeKeyRef: handleChangeKeyRef,
            onApiKeyInputChange: handleApiKeyInputChange,
            onClearApiKey: handleClearApiKey,
            onUndoClearApiKey: handleUndoClearApiKey,
            onChangeOption: handleChangeOption,
          }),
    ),
    // Docked bottom toolbar
    e(FooterBar, {
      onSave: handleSave,
      saving,
      onOpenTestSearch: () => setIsTestModalOpen(true),
      message: displayMessage,
      enabledCount: config.enginesOrder.length,
      totalCount: definitions.length,
    }),
    // Test search modal
    isTestModalOpen
      ? e(SearchModal, {
          open: isTestModalOpen,
          onClose: () => setIsTestModalOpen(false),
          enabledEngineIds: config.enginesOrder,
          definitions,
          engineConfigs: config.engineConfigs,
          keyInputs,
        })
      : null,
  )
}
