export const HEADER_CSS = `
/* ====================================================
   Header Toolbar & Controls (HeaderBar)
   ==================================================== */

.dsh-cs-header {
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0 24px 12px 24px;
  flex-shrink: 0;
}
.dsh-cs-header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}
.dsh-cs-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.dsh-cs-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.dsh-cs-header-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 18px;
  padding-top: 8px;
  border-top: 1px solid var(--dsw-alias-border-l2);
  width: 100%;
}
.dsh-cs-header-notice.warning {
  color: #f59e0b;
}
.dsh-cs-header-notice.success {
  color: #10b981;
}
.dsh-cs-header-notice.error {
  color: #ef4444;
}

/* Mode Switch & Controls */
.dsh-cs-mode-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}
.dsh-cs-timeout-group {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}
`
