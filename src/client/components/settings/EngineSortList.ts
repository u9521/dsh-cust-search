import * as React from 'react'
import type { CustSearchStorage, EngineDefinition } from '../../../types.ts'
import { useI18n } from '../../i18n.ts'
import {
  DropPlaceholderCard,
  SortablePreviewCard,
} from '../SortablePreviewCard.ts'

const e = React.createElement

export interface EngineSortListProps {
  config: CustSearchStorage
  enabledDefs: EngineDefinition[]
  defMap: Map<string, EngineDefinition>
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

export function EngineSortList({
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
}: EngineSortListProps): React.ReactElement {
  const { t } = useI18n()

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

  if (dragActive && draggedDefIdValid(draggedId, defMap)) {
    const activeDraggedId = draggedId as string
    const remainingDefs = enabledDefs.filter((d) => d.id !== activeDraggedId)
    const draggedDef = defMap.get(activeDraggedId)!
    const currentTarget = Math.max(
      0,
      Math.min(targetIndex ?? 0, remainingDefs.length),
    )
    const elements: React.ReactElement[] = []
    let remPtr = 0
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
        const def = remainingDefs[remPtr]
        if (def) {
          const engineConf = config.engineConfigs[def.id] ?? {}
          elements.push(
            e(SortablePreviewCard, {
              key: def.id,
              engineDef: def,
              orderIndex: slot + 1,
              timeout: engineConf.timeout,
              defaultTimeout: config.defaultTimeout,
              onPointerDown: (ev: React.PointerEvent) =>
                handlePointerDown(ev, def.id, slot),
            }),
          )
          remPtr++
        }
      }
    }

    // Render the elevated floating card following the cursor with high opacity (0.9)
    const engineConf = config.engineConfigs[draggedDef.id] ?? {}
    elements.push(
      e(SortablePreviewCard, {
        key: `__floating_${draggedDef.id}__`,
        ref: floatingRef as React.LegacyRef<HTMLDivElement>,
        engineDef: draggedDef,
        orderIndex: currentTarget + 1,
        timeout: engineConf.timeout,
        defaultTimeout: config.defaultTimeout,
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
    enabledDefs.map((def, idx) => {
      const engineConf = config.engineConfigs[def.id] ?? {}
      return e(SortablePreviewCard, {
        key: def.id,
        engineDef: def,
        orderIndex: idx + 1,
        timeout: engineConf.timeout,
        defaultTimeout: config.defaultTimeout,
        onPointerDown: (ev: React.PointerEvent) =>
          handlePointerDown(ev, def.id, idx),
      })
    }),
  )
}

function draggedDefIdValid(
  id: string | null,
  map: Map<string, EngineDefinition>,
): boolean {
  return typeof id === 'string' && map.has(id)
}
