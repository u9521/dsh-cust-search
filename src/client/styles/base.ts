export const BASE_CSS = `
/* ====================================================
   Base Container & Global Layout
   ==================================================== */

/* Ensure settings options wrapper lets .dsh-cs-container manage scroll and fill full height */
:has(> .dsh-cs-container),
[class*="options"]:has(.dsh-cs-container) {
  padding: 0 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
  min-height: 0 !important;
}

.dsh-cs-container {
  box-sizing: border-box;
  color: var(--dsw-alias-label-primary);
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow: hidden;
}
.dsh-cs-container * {
  box-sizing: border-box;
}

/* Card Lists - dedicated scroll container */
.dsh-cs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1 1 0%;
  min-height: 0;
  overflow-y: auto;
  padding: 0 24px 16px 24px;
}

/* Standard Buttons */
.dsh-cs-btn {
  align-items: center;
  border-radius: 6px;
  box-sizing: border-box;
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  gap: 6px;
  justify-content: center;
  line-height: 1;
  transition: background-color 0.15s, border-color 0.15s, opacity 0.15s;
  vertical-align: middle;
  border: 1px solid transparent;
}
.dsh-cs-btn.primary {
  background: var(--dsw-static-deepseek-450, #2563eb);
  border-color: var(--dsw-static-deepseek-450, #2563eb);
  color: #ffffff;
  height: 32px;
  padding: 0 16px;
}
.dsh-cs-btn.primary:hover:not(:disabled) {
  opacity: 0.9;
}
.dsh-cs-btn.secondary {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
  height: 32px;
  padding: 0 12px;
}
.dsh-cs-btn.secondary:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-layer-1));
}
.dsh-cs-btn.danger {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #ef4444;
  height: 34px;
  padding: 0 12px;
  font-size: 13px;
  white-space: nowrap;
}
.dsh-cs-btn.danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
}
.dsh-cs-btn.undo {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #f59e0b;
  height: 34px;
  padding: 0 12px;
  font-size: 13px;
  white-space: nowrap;
}
.dsh-cs-btn.undo:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.22);
  border-color: rgba(245, 158, 11, 0.5);
}
.dsh-cs-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Status dots */
.dsh-cs-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 5px;
}
.dsh-cs-dot.ok {
  background: #10b981;
}
.dsh-cs-dot.warning {
  background: #f59e0b;
}
.dsh-cs-dot.missing {
  background: #ef4444;
}

/* Spin Animation */
@keyframes dsh-cs-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.dsh-cs-spin {
  animation: dsh-cs-spin 1s linear infinite;
}
`
