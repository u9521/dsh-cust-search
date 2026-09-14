export const COMMON_CSS = `
/* ====================================================
   Common UI Primitives (Switch, Badges)
   ==================================================== */

/* Switch component (Dark Mode Adapted) */
.dsh-cs-switch {
  width: 36px;
  height: 20px;
  border-radius: 9999px;
  background: var(--dsw-alias-bg-layer-3, rgba(255, 255, 255, 0.15));
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.15));
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 1px;
  position: relative;
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  outline: none;
}
.dsh-cs-switch.active {
  background: var(--dsw-static-deepseek-450, #2563eb);
  border-color: var(--dsw-static-deepseek-450, #2563eb);
}
.dsh-cs-switch-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  transform: translateX(0);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: block;
}
.dsh-cs-switch.active .dsh-cs-switch-thumb {
  transform: translateX(16px);
}

/* Order Badges (Code pill style) */
.dsh-cs-order-badge {
  font-size: 12px;
  font-weight: 600;
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);
  background: var(--dsw-alias-bg-layer-3, rgba(255, 255, 255, 0.08));
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.15));
  color: var(--dsw-alias-label-primary, #e2e8f0);
  border-radius: 6px;
  padding: 2px 7px;
  line-height: 1.2;
}
.dsh-cs-order-badge.disabled {
  opacity: 0.45;
  border-style: dashed;
  color: var(--dsw-alias-label-tertiary, #81858c);
}
.dsh-cs-order-badge.active {
  background: rgba(37, 99, 235, 0.15);
  border-color: var(--dsw-static-deepseek-450, #2563eb);
  color: var(--dsw-static-deepseek-450, #2563eb);
}

/* Engine Type Badges */
.dsh-cs-badge {
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  line-height: 14px;
  padding: 2px 6px;
  border: 0.5px solid transparent;
}
.dsh-cs-badge.bridge {
  background: rgba(88, 166, 255, 0.12);
  border-color: rgba(88, 166, 255, 0.25);
  color: #58a6ff;
}
.dsh-cs-badge.keyed {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.25);
  color: #f59e0b;
}
.dsh-cs-badge.free {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.25);
  color: #10b981;
}
`
