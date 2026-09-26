export const BASE_CSS = `
/* ====================================================
   Base Container & Global Layout
   ==================================================== */

/* The host section holding the page becomes the flex column the page fills.
   The page is content-sized on purpose: the Plugins page around it owns the
   scroll, so a bundle card grows with its content instead of trapping a second
   scroll region inside the page. */
:has(> .dsh-cs-container) {
  box-sizing: border-box;
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
  min-width: 0 !important;
  padding: 0 !important;
}

.dsh-cs-container {
  box-sizing: border-box;
  color: var(--dsw-alias-label-primary);
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
}
.dsh-cs-container * {
  box-sizing: border-box;
}

/* The card stack. Deliberately flex: 0 0 auto (not a zero flex-basis): an
   auto-height host would collapse a 1 1 0% row to nothing. */
.dsh-cs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 0 0 auto;
  min-height: 0;
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
