import * as React from 'react'
import {
  IconLoadingOutlineRegular,
  IconWarningOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { EngineDefinition } from '../../types.ts'
import { useI18n } from '../i18n.ts'
import { useConfigDraft } from '../settings/useConfigDraft.ts'
import { FooterBar } from './FooterBar.ts'
import { HeaderBar } from './HeaderBar.ts'
import { EngineDetailList } from './settings/EngineDetailList.ts'
import { EngineSortList } from './settings/EngineSortList.ts'
import { useEngineDragDrop } from './settings/useEngineDragDrop.ts'
import { SearchModal } from './test-modal/SearchModal.ts'

const e = React.createElement

/**
 * The settings page.
 *
 * Layout and ordering only. Editable state and every mutation live in
 * {@link useConfigDraft}; cards read the draft themselves instead of receiving
 * a dozen forwarded closures.
 */
export function SettingsView(): React.ReactElement {
  const { t } = useI18n()
  const draft = useConfigDraft(t)
  const [isSortMode, setIsSortMode] = React.useState<boolean>(false)
  const [isTestModalOpen, setIsTestModalOpen] = React.useState<boolean>(false)

  const config = draft.draft
  const drag = useEngineDragDrop({
    enginesOrder: config?.enginesOrder ?? [],
    onReorder: draft.reorder,
  })

  const message = React.useMemo(() => {
    if (draft.error) return draft.error
    if (draft.clearedEngineIds.length > 0) {
      const names = draft.clearedEngineIds
        .map((id) => t(`engines.${id}.name`) || id)
        .join('\u3001')
      return draft.dirty
        ? t('header.unsavedWithClearedAndOther', { names })
        : t('header.unsavedWithClearedOnly', { names })
    }
    if (draft.dirty) return t('header.unsavedChanges')
    if (draft.justSaved) return t('header.saveSuccess')
    return null
  }, [draft.clearedEngineIds, draft.dirty, draft.error, draft.justSaved, t])

  if (draft.loading) {
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
      e(IconLoadingOutlineRegular, { size: 24, className: 'dsh-cs-spin' }),
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
      e(IconWarningOutlineRegular, { size: 18 }),
      e('span', null, draft.error || t('header.loadFailed')),
    )
  }

  const byId = new Map<string, EngineDefinition>()
  for (const def of draft.definitions) byId.set(def.id, def)

  // Enabled engines in configured order, then the ones switched off.
  const enabledDefs = config.enginesOrder
    .map((id) => byId.get(id))
    .filter((def): def is EngineDefinition => def !== undefined)

  const entries: Array<{ def: EngineDefinition; orderIndex?: number }> =
    enabledDefs.map((def, idx) => ({ def, orderIndex: idx + 1 }))
  for (const def of draft.definitions) {
    if (!config.enginesOrder.includes(def.id)) entries.push({ def })
  }

  const timeouts: Record<string, number | undefined> = {}
  for (const [id, engineConfig] of Object.entries(config.engineConfigs)) {
    timeouts[id] = engineConfig?.timeout as number | undefined
  }

  return e(
    'div',
    { className: 'dsh-cs-container' },
    e(HeaderBar, {
      isSortMode,
      onToggleSortMode: () => setIsSortMode(!isSortMode),
      defaultTimeout: config.defaultTimeout,
      onChangeDefaultTimeout: draft.setDefaultTimeout,
    }),
    e(
      'div',
      { ref: drag.containerRef, className: 'dsh-cs-list' },
      isSortMode
        ? e(EngineSortList, {
            enabledDefs,
            timeouts,
            defaultTimeout: config.defaultTimeout,
            drag,
          })
        : e(EngineDetailList, { entries, draft }),
    ),
    e(FooterBar, {
      onSave: () => {
        void draft.save()
      },
      saving: draft.saving,
      onOpenTestSearch: () => setIsTestModalOpen(true),
      message,
      enabledCount: config.enginesOrder.length,
      totalCount: draft.definitions.length,
    }),
    isTestModalOpen
      ? e(SearchModal, {
          open: isTestModalOpen,
          onClose: () => setIsTestModalOpen(false),
          enabledEngineIds: config.enginesOrder,
          definitions: draft.definitions,
          engineConfigs: config.engineConfigs,
          keyInputs: draft.keyInputs,
        })
      : null,
  )
}
