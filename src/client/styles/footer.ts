export const FOOTER_CSS = `
/* ====================================================
   Bottom Toolbar & Action Controls (FooterBar)
   ==================================================== */

.dsh-cs-footer {
  align-items: center;
  background: var(--dsw-alias-bg-layer-2);
  border-top: 1px solid var(--dsw-alias-border-l2);
  display: flex;
  flex-shrink: 0;
  justify-content: space-between;
  gap: 16px;
  margin: 0;
  padding: 14px 24px;
  width: 100%;
  box-sizing: border-box;
}
.dsh-cs-footer-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}
.dsh-cs-footer-count {
  font-size: 13px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-cs-footer-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  line-height: 18px;
}
.dsh-cs-footer-notice.warning {
  color: #f59e0b;
}
.dsh-cs-footer-notice.success {
  color: #10b981;
}
.dsh-cs-footer-notice.error {
  color: #ef4444;
}
.dsh-cs-footer-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
`
