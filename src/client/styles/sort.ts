export const SORT_CSS = `
/* ====================================================
   Sort Mode & Drag-and-Drop (SortablePreviewCard)
   ==================================================== */

.dsh-cs-sort-card {
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: grab;
  user-select: none;
  touch-action: none;
  opacity: 1 !important;
  transition: border-color 0.15s, transform 0.15s, background-color 0.15s, box-shadow 0.15s;
}
.dsh-cs-sort-card:hover {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l2);
}
.dsh-cs-sort-card:active {
  cursor: grabbing;
}
.dsh-cs-sort-card.dsh-cs-sort-card-floating {
  position: fixed !important;
  left: 0 !important;
  top: 0 !important;
  margin: 0 !important;
  opacity: 0.9 !important;
  pointer-events: none !important;
  z-index: 9999 !important;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45), 0 4px 12px rgba(0, 0, 0, 0.2) !important;
  border-color: var(--dsw-static-deepseek-450, #2563eb) !important;
  background: var(--dsw-alias-bg-layer-2) !important;
  cursor: grabbing !important;
  will-change: transform;
  transition: box-shadow 0.15s ease, opacity 0.15s ease !important;
  box-sizing: border-box !important;
}

body.dsh-cs-is-dragging,
body.dsh-cs-is-dragging * {
  cursor: grabbing !important;
  user-select: none !important;
}

/* Drop Placeholder Slot (Target Location) */
.dsh-cs-drop-placeholder {
  box-sizing: border-box;
  height: 52px;
  border-radius: 10px;
  border: 2px dashed var(--dsw-static-deepseek-450, #2563eb);
  background: rgba(37, 99, 235, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  user-select: none;
  animation: dsh-cs-placeholder-pulse 1.6s ease-in-out infinite alternate, dsh-cs-placeholder-pop 0.18s cubic-bezier(0.2, 0, 0, 1);
  transition: border-color 0.15s, background-color 0.15s;
}

@keyframes dsh-cs-placeholder-pop {
  from {
    opacity: 0.3;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes dsh-cs-placeholder-pulse {
  from {
    background: rgba(37, 99, 235, 0.05);
    border-color: rgba(37, 99, 235, 0.45);
  }
  to {
    background: rgba(37, 99, 235, 0.13);
    border-color: var(--dsw-static-deepseek-450, #2563eb);
  }
}

.dsh-cs-drag-handle {
  display: inline-flex;
  align-items: center;
  color: var(--dsw-alias-label-tertiary);
  margin-right: 12px;
  cursor: grab;
}
`
