import * as React from 'react'
import type { EngineDefinition } from '../../../types.ts'
import { useI18n } from '../../i18n.ts'
import {
  DropPlaceholderCard,
  SortablePreviewCard,
} from '../SortablePreviewCard.ts'

const e = React.createElement

/** What the sort view needs from the drag hook. */
export interface SortDragState {
  draggedId: string | null
  dragActive: boolean
  targetIndex: number | null
  cardWidth: number
  initialTransform: string
  floatingRef: React.RefObject<HTMLDivElement | null>
  handlePointerDown: (
    ev: React.PointerEvent,
    id: string,
    initialIdx: number,
  ) => void
}

export interface EngineSortListProps {
  /** Enabled engines, in configured order. */
  enabledDefs: EngineDefinition[]
  /** Per-engine timeout and the global default, for the preview cards. */
  timeouts: Record<string, number | undefined>
  defaultTimeout: number
  drag: SortDragState
}

export function EngineSortList({
  enabledDefs,
  timeouts,
  defaultTimeout,
  drag,
}: EngineSortListProps): React.ReactElement {
  const { t } = useI18n()
  const { draggedId, dragActive, targetIndex, cardWidth, initialTransform } =
    drag

  if (enabledDefs.length === 0) {
    return e(
      'div',
      {
        style: {
          padding: '40px 20px',
          textAlign: 'center',
          color: 'var(--dsw-alias-label-tertiary)',
          background: 'var(--dsw-alias-bg-layer-1)',
          borderRadius: '12px',
          border: '1px dashed var(--dsw-alias-border-l2)',
        },
      },
      t('header.noEnabledEngines'),
    )
  }

  const draggedDef = enabledDefs.find((def) => def.id === draggedId)

  if (dragActive && draggedDef) {
    const remainingDefs = enabledDefs.filter((def) => def.id !== draggedDef.id)
    const currentTarget = Math.max(
      0,
      Math.min(targetIndex ?? 0, remainingDefs.length),
    )
    const elements: React.ReactElement[] = []
    let remainingPtr = 0
    const totalSlots = remainingDefs.length + 1

    for (let slot = 0; slot < totalSlots; slot++) {
      if (slot === currentTarget) {
        elements.push(
          e(DropPlaceholderCard, {
            key: '__drop_placeholder__',
            orderIndex: slot + 1,
            engineDef: draggedDef,
          }),
        )
      } else {
        const def = remainingDefs[remainingPtr]
        if (def) {
          elements.push(
            e(SortablePreviewCard, {
              key: def.id,
              engineDef: def,
              orderIndex: slot + 1,
              timeout: timeouts[def.id],
              defaultTimeout,
              onPointerDown: (ev: React.PointerEvent) =>
                drag.handlePointerDown(ev, def.id, slot),
            }),
          )
          remainingPtr++
        }
      }
    }

    // The elevated card that follows the cursor, at full opacity.
    elements.push(
      e(SortablePreviewCard, {
        key: `__floating_${draggedDef.id}__`,
        ref: drag.floatingRef as React.LegacyRef<HTMLDivElement>,
        engineDef: draggedDef,
        orderIndex: currentTarget + 1,
        timeout: timeouts[draggedDef.id],
        defaultTimeout,
        className: 'dsh-cs-sort-card-floating',
        style: {
          width: cardWidth > 0 ? `${cardWidth}px` : undefined,
          transform: initialTransform,
        },
      }),
    )

    return e(React.Fragment, null, elements)
  }

  return e(
    React.Fragment,
    null,
    enabledDefs.map((def, idx) =>
      e(SortablePreviewCard, {
        key: def.id,
        engineDef: def,
        orderIndex: idx + 1,
        timeout: timeouts[def.id],
        defaultTimeout,
        onPointerDown: (ev: React.PointerEvent) =>
          drag.handlePointerDown(ev, def.id, idx),
      }),
    ),
  )
}
