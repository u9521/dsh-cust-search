export const MODAL_CSS = `
/* ====================================================
   Generic Modal Framework (common/Modal)
   ==================================================== */

.dsh-cs-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}
.dsh-cs-modal-panel {
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 16px;
  width: 820px;
  max-width: calc(100vw - 32px);
  height: min(85vh, 850px);
  max-height: min(85vh, 850px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  animation: dsh-cs-modal-fade-in 0.15s ease-out;
}
@keyframes dsh-cs-modal-fade-in {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
.dsh-cs-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  flex-shrink: 0;
}
.dsh-cs-modal-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--dsw-alias-label-primary);
}
.dsh-cs-modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
}
.dsh-cs-modal-close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--dsw-alias-label-tertiary);
  border-radius: 6px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background-color 0.15s;
}
.dsh-cs-modal-close-btn:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
}

/* Modal Footer */
.dsh-cs-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  border-top: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  flex-shrink: 0;
}
.dsh-cs-modal-footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dsh-cs-modal-footer-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
`
