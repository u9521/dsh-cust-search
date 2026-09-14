export const CARD_CSS = `
/* ====================================================
   Engine Detail Card & Form Controls (EngineDetailCard)
   ==================================================== */

.dsh-cs-card {
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.15s, box-shadow 0.15s, background-color 0.15s;
}
.dsh-cs-card:hover {
  border-color: var(--dsw-alias-border-l2);
}
.dsh-cs-card.disabled {
  background: var(--dsw-alias-bg-layer-2);
  border-style: dashed;
  opacity: 0.75;
}
.dsh-cs-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.dsh-cs-card-identity {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.dsh-cs-card-name {
  color: var(--dsw-alias-label-primary);
  font-size: 15px;
  font-weight: 600;
  line-height: 20px;
}
.dsh-cs-card-desc {
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 18px;
  margin: 0;
}

/* Card Body Fields */
.dsh-cs-card-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--dsw-alias-border-l2);
}
.dsh-cs-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.dsh-cs-field.full-width {
  grid-column: 1 / -1;
}
.dsh-cs-field-label {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dsh-cs-input {
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  height: 34px;
  padding: 0 10px;
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
  width: 100%;
}
.dsh-cs-input:focus {
  border-color: var(--dsw-static-deepseek-450, #2563eb);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}
.dsh-cs-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  background: var(--dsw-alias-bg-layer-1);
  border-style: dashed;
}
.dsh-cs-select {
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  height: 34px;
  padding: 0 10px;
  transition: border-color 0.15s;
  outline: none;
  width: 100%;
  color-scheme: light dark;
}
.dsh-cs-select:focus {
  border-color: var(--dsw-static-deepseek-450, #2563eb);
}
`
