import * as React from 'react'

export interface UseEngineDragDropOptions {
  enginesOrder: string[]
  onReorder: (newOrder: string[]) => void
}

export interface UseEngineDragDropReturn {
  draggedId: string | null
  dragActive: boolean
  targetIndex: number | null
  cardWidth: number
  initialTransform: string
  containerRef: React.RefObject<HTMLDivElement | null>
  floatingRef: React.RefObject<HTMLDivElement | null>
  handlePointerDown: (
    ev: React.PointerEvent,
    id: string,
    initialIdx: number,
  ) => void
  commitDrop: () => void
}

export function useEngineDragDrop({
  enginesOrder,
  onReorder,
}: UseEngineDragDropOptions): UseEngineDragDropReturn {
  const [draggedId, setDraggedId] = React.useState<string | null>(null)
  const [dragActive, setDragActive] = React.useState<boolean>(false)
  const [targetIndex, setTargetIndex] = React.useState<number | null>(null)
  const [cardWidth, setCardWidth] = React.useState<number>(0)
  const [initialTransform, setInitialTransform] = React.useState<string>('')

  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const floatingRef = React.useRef<HTMLDivElement | null>(null)

  const dragRef = React.useRef({
    draggedId,
    dragActive,
    targetIndex,
    enginesOrder,
    onReorder,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  })
  dragRef.current = {
    ...dragRef.current,
    draggedId,
    dragActive,
    targetIndex,
    enginesOrder,
    onReorder,
  }

  const commitDrop = React.useCallback(() => {
    const {
      draggedId: curId,
      targetIndex: curTarget,
      enginesOrder: curOrder,
      onReorder: curOnReorder,
    } = dragRef.current

    if (!curId || curTarget === null || !curOrder) {
      setDraggedId(null)
      setDragActive(false)
      setTargetIndex(null)
      return
    }

    const remaining = curOrder.filter((id) => id !== curId)
    const clampedIndex = Math.max(0, Math.min(curTarget, remaining.length))
    remaining.splice(clampedIndex, 0, curId)

    const isChanged = JSON.stringify(remaining) !== JSON.stringify(curOrder)
    if (isChanged) {
      curOnReorder(remaining)
    }

    setDraggedId(null)
    setDragActive(false)
    setTargetIndex(null)
  }, [])

  const handlePointerDown = React.useCallback(
    (ev: React.PointerEvent, id: string, initialIdx: number) => {
      // Only drag on left click
      if (ev.button !== 0) return
      const target = ev.target as HTMLElement | null
      if (
        target?.closest('button') ||
        target?.closest('input') ||
        target?.closest('select') ||
        target?.closest('a')
      ) {
        return
      }

      const card = ev.currentTarget as HTMLElement
      const rect = card.getBoundingClientRect()
      const offsetX = ev.clientX - rect.left
      const offsetY = ev.clientY - rect.top
      const initX = ev.clientX - offsetX
      const initY = ev.clientY - offsetY

      dragRef.current.startX = ev.clientX
      dragRef.current.startY = ev.clientY
      dragRef.current.offsetX = offsetX
      dragRef.current.offsetY = offsetY
      dragRef.current.draggedId = id
      dragRef.current.targetIndex = initialIdx
      dragRef.current.dragActive = false

      setDraggedId(id)
      setTargetIndex(initialIdx)
      setCardWidth(rect.width)
      setInitialTransform(
        `translate3d(${initX}px, ${initY}px, 0) scale(1.025) rotate(0.4deg)`,
      )

      const handlePointerMove = (moveEv: PointerEvent) => {
        const {
          startX,
          startY,
          offsetX: offX,
          offsetY: offY,
          draggedId: curId,
        } = dragRef.current
        if (!curId) return

        const currX = moveEv.clientX - offX
        const currY = moveEv.clientY - offY

        // Check if movement exceeds threshold (3px)
        if (!dragRef.current.dragActive) {
          const dist = Math.hypot(
            moveEv.clientX - startX,
            moveEv.clientY - startY,
          )
          if (dist > 3) {
            dragRef.current.dragActive = true
            setDragActive(true)
            document.body.classList.add('dsh-cs-is-dragging')
          }
        }

        if (dragRef.current.dragActive) {
          // Zero-latency GPU hardware update directly on the DOM element
          if (floatingRef.current) {
            floatingRef.current.style.transform = `translate3d(${currX}px, ${currY}px, 0) scale(1.025) rotate(0.4deg)`
          }

          // Calculate slot boundary only when crossing midlines
          const container = containerRef.current
          if (container) {
            const cards = Array.from(
              container.querySelectorAll<HTMLElement>(
                '.dsh-cs-sort-card:not(.dsh-cs-sort-card-floating)',
              ),
            )
            let nextSlot = cards.length
            for (let i = 0; i < cards.length; i++) {
              const cRect = cards[i]!.getBoundingClientRect()
              const midY = cRect.top + cRect.height / 2
              if (moveEv.clientY < midY) {
                nextSlot = i
                break
              }
            }
            if (dragRef.current.targetIndex !== nextSlot) {
              dragRef.current.targetIndex = nextSlot
              setTargetIndex(nextSlot)
            }
          }
        }
      }

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
        window.removeEventListener('pointercancel', handlePointerUp)
        window.removeEventListener('keydown', handleKeyDown)
        document.body.classList.remove('dsh-cs-is-dragging')

        if (dragRef.current.dragActive) {
          commitDrop()
        } else {
          setDraggedId(null)
          setDragActive(false)
          setTargetIndex(null)
        }
      }

      const handleKeyDown = (keyEv: KeyboardEvent) => {
        if (keyEv.key === 'Escape') {
          window.removeEventListener('pointermove', handlePointerMove)
          window.removeEventListener('pointerup', handlePointerUp)
          window.removeEventListener('pointercancel', handlePointerUp)
          window.removeEventListener('keydown', handleKeyDown)
          document.body.classList.remove('dsh-cs-is-dragging')

          setDraggedId(null)
          setDragActive(false)
          setTargetIndex(null)
        }
      }

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      window.addEventListener('pointercancel', handlePointerUp)
      window.addEventListener('keydown', handleKeyDown)
    },
    [commitDrop],
  )

  return {
    draggedId,
    dragActive,
    targetIndex,
    cardWidth,
    initialTransform,
    containerRef,
    floatingRef,
    handlePointerDown,
    commitDrop,
  }
}
