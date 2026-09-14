import * as React from 'react'
import { IconSearchOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { EngineDefinition, EngineSpecificConfig } from '../../../types.ts'
import { useI18n } from '../../i18n.ts'
import { Modal } from '../common/Modal.ts'
import { EmptyState } from './EmptyState.ts'
import { EngineResultCard } from './EngineResultCard.ts'
import { SearchBar } from './SearchBar.ts'
import { useEngineTesting } from './useEngineTesting.ts'

const e = React.createElement

export interface SearchModalProps {
  open: boolean
  onClose: () => void
  enabledEngineIds: string[]
  definitions: EngineDefinition[]
  engineConfigs: Record<string, EngineSpecificConfig>
  keyInputs: Record<string, string>
}

export function SearchModal({
  open,
  onClose,
  enabledEngineIds,
  definitions,
  engineConfigs,
  keyInputs,
}: SearchModalProps): React.ReactElement | null {
  const { t } = useI18n()
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [collapsedMap, setCollapsedMap] = React.useState<
    Record<string, boolean>
  >({})
  const [expandedSources, setExpandedSources] = React.useState<
    Record<string, boolean>
  >({})

  const {
    query,
    setQuery,
    isSearching,
    hasSearched,
    engineStates,
    summary,
    handleSearchAll,
    handleRetrySingle,
  } = useEngineTesting({
    enabledEngineIds,
    engineConfigs,
    keyInputs,
    open,
  })

  // Auto focus input on modal open
  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [open])

  const toggleSourceExpand = React.useCallback((key: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }, [])

  const toggleCollapse = React.useCallback((id: string) => {
    setCollapsedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }, [])

  const handleExpandAll = React.useCallback(() => {
    setCollapsedMap({})
  }, [])

  const handleCollapseAll = React.useCallback(() => {
    const next: Record<string, boolean> = {}
    for (const id of enabledEngineIds) next[id] = true
    setCollapsedMap(next)
  }, [enabledEngineIds])

  const onSearch = React.useCallback(() => {
    handleSearchAll(() => {
      setCollapsedMap({})
      setExpandedSources({})
    })
  }, [handleSearchAll])

  const onRetry = React.useCallback(
    (id: string) => {
      handleRetrySingle(id, () => {
        setCollapsedMap((prev) => ({ ...prev, [id]: false }))
      })
    },
    [handleRetrySingle],
  )

  // Map definitions by id for fast lookup
  const defMap = React.useMemo(() => {
    const map = new Map<string, EngineDefinition>()
    for (const def of definitions) {
      map.set(def.id, def)
    }
    return map
  }, [definitions])

  // Footer element
  const modalFooter = e(
    'div',
    { className: 'dsh-cs-modal-footer' },
    e(
      'div',
      { className: 'dsh-cs-modal-footer-left' },
      hasSearched && summary.total > 0
        ? e(
            'span',
            { className: 'dsh-cs-test-summary' },
            t('testModal.summary', {
              total: summary.total,
              success: summary.success,
              failed: summary.failed,
            }),
          )
        : null,
    ),
    e(
      'div',
      { className: 'dsh-cs-modal-footer-right' },
      e(
        'button',
        {
          type: 'button',
          className: 'dsh-cs-btn secondary',
          onClick: onClose,
        },
        t('testModal.close'),
      ),
    ),
  )

  return e(
    Modal,
    {
      open,
      onClose,
      title: t('testModal.title'),
      icon: e(IconSearchOutline16, { size: 18 }),
      closeTitle: t('testModal.close'),
      footer: modalFooter,
    },
    // Search Bar
    e(SearchBar, {
      inputRef,
      query,
      onQueryChange: setQuery,
      onSearch,
      isSearching,
      disabled:
        isSearching ||
        query.trim().length === 0 ||
        enabledEngineIds.length === 0,
    }),

    // Global Expand/Collapse toolbar
    hasSearched && enabledEngineIds.length > 0
      ? e(
          'div',
          { className: 'dsh-cs-test-toolbar' },
          e(
            'span',
            { className: 'dsh-cs-test-toolbar-count' },
            t('footer.enabledCountRatio', {
              enabled: enabledEngineIds.length,
              total: enabledEngineIds.length,
            }),
          ),
          e(
            'div',
            { className: 'dsh-cs-test-toolbar-actions' },
            e(
              'button',
              {
                type: 'button',
                className: 'dsh-cs-test-text-btn',
                onClick: handleExpandAll,
              },
              t('testModal.expandAll'),
            ),
            e(
              'button',
              {
                type: 'button',
                className: 'dsh-cs-test-text-btn',
                onClick: handleCollapseAll,
              },
              t('testModal.collapseAll'),
            ),
          ),
        )
      : null,

    // Results Content Area
    e(
      'div',
      { className: 'dsh-cs-test-results-container' },
      enabledEngineIds.length === 0 || !hasSearched
        ? e(EmptyState, {
            noEnabledEngines: enabledEngineIds.length === 0,
            enabledEngineIds,
            defMap,
          })
        : enabledEngineIds.map((id, idx) =>
            e(EngineResultCard, {
              key: id,
              engineId: id,
              orderIndex: idx + 1,
              definition: defMap.get(id),
              status: engineStates[id] || { state: 'idle' },
              isCollapsed: Boolean(collapsedMap[id]),
              query,
              expandedSources,
              onToggleCollapse: toggleCollapse,
              onRetry,
              onToggleSourceExpand: toggleSourceExpand,
            }),
          ),
    ),
  )
}
