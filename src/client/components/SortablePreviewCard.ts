import * as React from 'react'
import type { EngineDefinition } from '../../types.ts'
import { useI18n } from '../i18n.ts'
import { EngineTypeBadge } from './common/EngineTypeBadge.ts'
import { OrderBadge } from './common/OrderBadge.ts'

const e = React.createElement

// Six-dots drag handle SVG icon
function DragHandleIcon() {
  return e(
    'svg',
    {
      width: '14',
      height: '14',
      viewBox: '0 0 16 16',
      fill: 'currentColor',
      style: { opacity: 0.6 },
    },
    e('circle', { cx: '5', cy: '3', r: '1.5' }),
    e('circle', { cx: '11', cy: '3', r: '1.5' }),
    e('circle', { cx: '5', cy: '8', r: '1.5' }),
    e('circle', { cx: '11', cy: '8', r: '1.5' }),
    e('circle', { cx: '5', cy: '13', r: '1.5' }),
    e('circle', { cx: '11', cy: '13', r: '1.5' }),
  )
}

export interface DropPlaceholderCardProps {
  orderIndex: number
  engineDef?: EngineDefinition
}

export function DropPlaceholderCard({
  orderIndex,
  engineDef,
}: DropPlaceholderCardProps): React.ReactElement {
  const { t } = useI18n()
  const engineName = engineDef
    ? t(`engines.${engineDef.id}.name`) || engineDef.id
    : ''

  return e(
    'div',
    {
      className: 'dsh-cs-drop-placeholder',
    },
    e(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
      e(OrderBadge, { index: orderIndex, active: true }),
      e(
        'span',
        {
          style: {
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--dsw-static-deepseek-450, #2563eb)',
          },
        },
        t('sort.dropHere'),
      ),
    ),
    engineDef
      ? e(
          'div',
          {
            style: {
              fontSize: '12px',
              color: 'var(--dsw-alias-label-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            },
          },
          e('span', null, t('sort.placeholderEngine', { name: engineName })),
          e(EngineTypeBadge, { type: engineDef.type }),
        )
      : null,
  )
}

export interface SortablePreviewCardProps {
  engineDef: EngineDefinition
  orderIndex: number
  timeout?: number
  defaultTimeout: number
  className?: string
  style?: React.CSSProperties
  onPointerDown?: (ev: React.PointerEvent) => void
}

export const SortablePreviewCard = React.forwardRef<
  HTMLDivElement,
  SortablePreviewCardProps
>(function SortablePreviewCard(
  {
    engineDef,
    orderIndex,
    timeout,
    defaultTimeout,
    className,
    style,
    onPointerDown,
  },
  ref,
): React.ReactElement {
  const { t } = useI18n()
  const currentTimeout = timeout && timeout > 0 ? timeout : defaultTimeout
  const engineName = t(`engines.${engineDef.id}.name`) || engineDef.id

  return e(
    'div',
    {
      ref,
      className: `dsh-cs-sort-card ${className || ''}`.trim(),
      style,
      onPointerDown,
    },
    e(
      'div',
      { style: { display: 'flex', alignItems: 'center' } },
      e(
        'span',
        { className: 'dsh-cs-drag-handle', title: t('sort.dragHandleTitle') },
        e(DragHandleIcon),
      ),
      e(OrderBadge, {
        index: orderIndex,
        style: { marginRight: '10px' },
      }),
      e(
        'strong',
        { className: 'dsh-cs-card-name', style: { marginRight: '10px' } },
        engineName,
      ),
      e(EngineTypeBadge, { type: engineDef.type }),
    ),
    e(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
      e(
        'span',
        {
          style: {
            fontSize: '12px',
            color: 'var(--dsw-alias-label-secondary)',
            background: 'var(--dsw-alias-bg-layer-2)',
            border: '1px solid var(--dsw-alias-border-l2)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontFamily: 'monospace',
          },
        },
        `${currentTimeout}ms`,
      ),
    ),
  )
})
