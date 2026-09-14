import * as React from 'react'
import type { CustSearchStorage, EngineDefinition } from '../../../types.ts'
import { EngineDetailCard } from '../EngineDetailCard.ts'

const e = React.createElement

export interface EngineDetailListProps {
  allOrderedDefs: Array<{ def: EngineDefinition; orderIndex?: number }>
  config: CustSearchStorage
  initialConfig: CustSearchStorage | null
  keyInputs: Record<string, string>
  keyUpdates: Record<string, { keyRef: string; value: string }>
  onToggleEnable: (id: string, enable: boolean) => void
  onChangeTimeout: (id: string, timeout?: number) => void
  onChangeKeyRef: (id: string, keyRef: string) => void
  onApiKeyInputChange: (id: string, val: string, defaultKeyRef?: string) => void
  onClearApiKey: (id: string, defaultKeyRef?: string) => void
  onUndoClearApiKey: (id: string) => void
  onChangeOption: (id: string, key: string, value: unknown) => void
}

export function EngineDetailList({
  allOrderedDefs,
  config,
  initialConfig: _initialConfig,
  keyInputs,
  keyUpdates,
  onToggleEnable,
  onChangeTimeout,
  onChangeKeyRef,
  onApiKeyInputChange,
  onClearApiKey,
  onUndoClearApiKey,
  onChangeOption,
}: EngineDetailListProps): React.ReactElement {
  return e(
    React.Fragment,
    null,
    allOrderedDefs.map(({ def, orderIndex }) => {
      const engineConf = config.engineConfigs[def.id] ?? {}
      const apiKeyInput = keyInputs[def.id] || ''
      const isMarkedForClear = keyUpdates[def.id]?.value === ''

      return e(EngineDetailCard, {
        key: def.id,
        engineDef: def,
        orderIndex,
        engineConfig: engineConf,
        defaultTimeout: config.defaultTimeout,
        apiKeyInput,
        isMarkedForClear,
        onToggleEnable: (enable: boolean) => onToggleEnable(def.id, enable),
        onChangeTimeout: (timeout?: number) => onChangeTimeout(def.id, timeout),
        onChangeKeyRef: (keyRef: string) => onChangeKeyRef(def.id, keyRef),
        onApiKeyInputChange: (val: string) =>
          onApiKeyInputChange(def.id, val, def.defaultKeyRef),
        onClearApiKey: () => onClearApiKey(def.id, def.defaultKeyRef),
        onUndoClearApiKey: () => onUndoClearApiKey(def.id),
        onChangeOption: (key: string, value: unknown) =>
          onChangeOption(def.id, key, value),
      })
    }),
  )
}
