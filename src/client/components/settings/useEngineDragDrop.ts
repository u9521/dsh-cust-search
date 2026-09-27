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

  const latestPointerRef = React.useRef({ x: 0, y: 0 })
  const pendingRafRef = React.useRef<number | null>(null)
  const cleanupRef = React.useRef<(() => void) | null>(null)

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
    slotMidpoints: [] as number[],
  })
  dragRef.current = {
    ...dragRef.current,
    draggedId,
    dragActive,
    targetIndex,
    enginesOrder,
    onReorder,
  }

  // Ensure floating card is immediately positioned on mount when drag activates
  React.useLayoutEffect(() => {
    if (dragActive && floatingRef.current) {
      const { offsetX, offsetY } = dragRef.current
      const currX = latestPointerRef.current.x - offsetX
      const currY = latestPointerRef.current.y - offsetY
      floatingRef.current.style.transform = `translate3d(${currX}px, ${currY}px, 0) scale(1.025) rotate(0.4deg)`
    }
  }, [dragActive])

  // Cleanup on unmount if drag was active
  React.useEffect(() => {
    return () => {
      if (pendingRafRef.current !== null) {
        cancelAnimationFrame(pendingRafRef.current)
        pendingRafRef.current = null
      }
      if (cleanupRef.current) {
        cleanupRef.current()
      }
      document.body.classList.remove('dsh-cs-is-dragging')
    }
  }, [])

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

      if (cleanupRef.current) {
        cleanupRef.current()
      }
      if (pendingRafRef.current !== null) {
        cancelAnimationFrame(pendingRafRef.current)
        pendingRafRef.current = null
      }

      const card = ev.currentTarget as HTMLElement
      const rect = card.getBoundingClientRect()
      const offsetX = ev.clientX - rect.left
      const offsetY = ev.clientY - rect.top
      const initX = ev.clientX - offsetX
      const initY = ev.clientY - offsetY

      // Pre-calculate slot midpoints once before drag starts to eliminate layout thrashing
      const container = containerRef.current
      let slotMidpoints: number[] = []
      let initialContainerTop = 0
      let scrollDelta = 0

      if (container) {
        const containerRect = container.getBoundingClientRect()
        initialContainerTop = containerRect.top
        const cards = Array.from(
          container.querySelectorAll<HTMLElement>(
            '.dsh-cs-sort-card:not(.dsh-cs-sort-card-floating)',
          ),
        )
        slotMidpoints = cards.map((c) => {
          const cRect = c.getBoundingClientRect()
          return cRect.top + cRect.height / 2
        })
      }

      dragRef.current.startX = ev.clientX
      dragRef.current.startY = ev.clientY
      dragRef.current.offsetX = offsetX
      dragRef.current.offsetY = offsetY
      dragRef.current.draggedId = id
      dragRef.current.targetIndex = initialIdx
      dragRef.current.dragActive = false
      dragRef.current.slotMidpoints = slotMidpoints

      latestPointerRef.current = { x: ev.clientX, y: ev.clientY }

      setDraggedId(id)
      setTargetIndex(initialIdx)
      setCardWidth(rect.width)
      setInitialTransform(
        `translate3d(${initX}px, ${initY}px, 0) scale(1.025) rotate(0.4deg)`,
      )

      const calculateNextSlot = (clientY: number): number => {
        const midpoints = dragRef.current.slotMidpoints
        const N = midpoints.length
        if (N <= 1) return 0

        const curTarget = dragRef.current.targetIndex ?? 0
        const effectiveY = clientY + scrollDelta
        let nextSlot = N - 1

        for (let i = 0; i < N - 1; i++) {
          const slot = i < curTarget ? i : i + 1
          const midY = midpoints[slot]!
          if (effectiveY < midY) {
            nextSlot = i
            break
          }
        }

        return nextSlot
      }

      const updateFrame = () => {
        pendingRafRef.current = null
        if (!dragRef.current.dragActive) return

        const { offsetX: offX, offsetY: offY } = dragRef.current
        const currX = latestPointerRef.current.x - offX
        const currY = latestPointerRef.current.y - offY

        // 1. Zero-latency GPU hardware update directly on the DOM element in rAF
        if (floatingRef.current) {
          floatingRef.current.style.transform = `translate3d(${currX}px, ${currY}px, 0) scale(1.025) rotate(0.4deg)`
        }

        // 2. Pure in-memory slot calculation using pre-computed midpoints - zero forced reflow
        const nextSlot = calculateNextSlot(latestPointerRef.current.y)
        if (dragRef.current.targetIndex !== nextSlot) {
          dragRef.current.targetIndex = nextSlot
          setTargetIndex(nextSlot)
        }
      }

      const handlePointerMove = (moveEv: PointerEvent) => {
        if (!dragRef.current.draggedId) return

        latestPointerRef.current.x = moveEv.clientX
        latestPointerRef.current.y = moveEv.clientY

        // Check if movement exceeds threshold (3px)
        if (!dragRef.current.dragActive) {
          const dist = Math.hypot(
            moveEv.clientX - dragRef.current.startX,
            moveEv.clientY - dragRef.current.startY,
          )
          if (dist > 3) {
            dragRef.current.dragActive = true
            setDragActive(true)
            document.body.classList.add('dsh-cs-is-dragging')
          } else {
            return
          }
        }

        // Batch visual updates and slot detection to next animation frame
        if (pendingRafRef.current === null) {
          pendingRafRef.current = requestAnimationFrame(updateFrame)
        }
      }

      const handleScroll = () => {
        const cont = containerRef.current
        if (cont) {
          const currentContainerTop = cont.getBoundingClientRect().top
          scrollDelta = initialContainerTop - currentContainerTop
        }
        if (dragRef.current.dragActive && pendingRafRef.current === null) {
          pendingRafRef.current = requestAnimationFrame(updateFrame)
        }
      }

      const cleanupEvents = () => {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
        window.removeEventListener('pointercancel', handlePointerUp)
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('scroll', handleScroll, true)
        document.body.classList.remove('dsh-cs-is-dragging')
        cleanupRef.current = null
      }

      const handlePointerUp = () => {
        if (pendingRafRef.current !== null) {
          cancelAnimationFrame(pendingRafRef.current)
          pendingRafRef.current = null
        }
        cleanupEvents()

        if (dragRef.current.dragActive) {
          const finalSlot = calculateNextSlot(latestPointerRef.current.y)
          if (dragRef.current.targetIndex !== finalSlot) {
            dragRef.current.targetIndex = finalSlot
          }
          commitDrop()
        } else {
          setDraggedId(null)
          setDragActive(false)
          setTargetIndex(null)
        }
      }

      const handleKeyDown = (keyEv: KeyboardEvent) => {
        if (keyEv.key === 'Escape') {
          if (pendingRafRef.current !== null) {
            cancelAnimationFrame(pendingRafRef.current)
            pendingRafRef.current = null
          }
          cleanupEvents()

          setDraggedId(null)
          setDragActive(false)
          setTargetIndex(null)
        }
      }

      cleanupRef.current = cleanupEvents

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      window.addEventListener('pointercancel', handlePointerUp)
      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('scroll', handleScroll, {
        passive: true,
        capture: true,
      })
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
