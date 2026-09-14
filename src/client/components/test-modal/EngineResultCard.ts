import * as React from 'react'
import {
  IconChevronDownOutline14,
  IconChevronUpOutline14,
  IconLoadingOutline16,
  IconRefreshOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { EngineDefinition } from '../../../types.ts'
import { useI18n } from '../../i18n.ts'
import { EngineTypeBadge } from '../common/EngineTypeBadge.ts'
import { OrderBadge } from '../common/OrderBadge.ts'
import { ResultSourceItem } from './ResultSourceItem.ts'
import { StatusBadge } from './StatusBadge.ts'
import type { EngineTestStatus } from './useEngineTesting.ts'

const e = React.createElement

export interface EngineResultCardProps {
  engineId: string
  orderIndex: number
  definition?: EngineDefinition
  status: EngineTestStatus
  isCollapsed: boolean
  query: string
  expandedSources: Record<string, boolean>
  onToggleCollapse: (id: string) => void
  onRetry: (id: string) => void
  onToggleSourceExpand: (key: string) => void
}

export function EngineResultCard({
  engineId,
  orderIndex,
  definition,
  status,
  isCollapsed,
  query,
  expandedSources,
  onToggleCollapse,
  onRetry,
  onToggleSourceExpand,
}: EngineResultCardProps): React.ReactElement {
  const { t } = useI18n()
  const engineName = definition
    ? t(`engines.${engineId}.name`) || engineId
    : engineId

  return e(
    'div',
    { className: 'dsh-cs-test-engine-card' },
    // Card Header
    e(
      'div',
      {
        className: `dsh-cs-test-engine-header ${isCollapsed ? 'collapsed' : ''}`,
        onClick: () => onToggleCollapse(engineId),
      },
      e(
        'div',
        { className: 'dsh-cs-test-engine-identity' },
        e(OrderBadge, { index: orderIndex, active: true }),
        e('span', { className: 'dsh-cs-test-engine-name' }, engineName),
        definition ? e(EngineTypeBadge, { type: definition.type }) : null,
      ),
      e(
        'div',
        { className: 'dsh-cs-test-engine-actions' },
        e(StatusBadge, { status }),
        e(
          'button',
          {
            type: 'button',
            className: 'dsh-cs-btn secondary dsh-cs-test-retry-btn',
            disabled: status.state === 'loading' || query.trim().length === 0,
            onClick: (ev: React.MouseEvent) => {
              ev.stopPropagation()
              onRetry(engineId)
            },
            title: t('testModal.retry'),
          },
          e(IconRefreshOutline16, { size: 13 }),
          e('span', null, t('testModal.retry')),
        ),
        e(
          'button',
          {
            type: 'button',
            className: 'dsh-cs-btn secondary dsh-cs-test-expand-btn',
            onClick: (ev: React.MouseEvent) => {
              ev.stopPropagation()
              onToggleCollapse(engineId)
            },
            title: isCollapsed
              ? t('testModal.expand')
              : t('testModal.collapse'),
          },
          isCollapsed
            ? e(IconChevronDownOutline14, { size: 12 })
            : e(IconChevronUpOutline14, { size: 12 }),
          e(
            'span',
            null,
            isCollapsed ? t('testModal.expand') : t('testModal.collapse'),
          ),
        ),
      ),
    ),

    // Card Body
    !isCollapsed
      ? e(
          'div',
          { className: 'dsh-cs-test-engine-body' },
          status.state === 'loading'
            ? e(
                'div',
                { className: 'dsh-cs-test-loading-hint' },
                e(IconLoadingOutline16, {
                  size: 16,
                  className: 'dsh-cs-spin',
                }),
                e('span', null, `正在检索 ${engineName}...`),
              )
            : status.state === 'error'
              ? e(
                  'div',
                  { className: 'dsh-cs-test-error-box' },
                  status.error || 'Request failed',
                )
              : status.state === 'success'
                ? !status.result?.sources || status.result.sources.length === 0
                  ? e(
                      'div',
                      { className: 'dsh-cs-test-empty-notice' },
                      t('testModal.noResults'),
                    )
                  : e(
                      'div',
                      { className: 'dsh-cs-test-sources-list' },
                      status.result.sources.map((src, sIdx) =>
                        e(ResultSourceItem, {
                          key: `${src.url}-${sIdx}`,
                          src,
                          sIdx,
                          engineId,
                          isExpanded: Boolean(
                            expandedSources[`${engineId}-${sIdx}`],
                          ),
                          onToggleExpand: onToggleSourceExpand,
                        }),
                      ),
                    )
                : null,
        )
      : null,
  )
}
