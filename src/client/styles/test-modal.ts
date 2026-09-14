export const TEST_MODAL_CSS = `
/* ====================================================
   Test Search Modal (test-modal/*)
   ==================================================== */

/* Modal Search Bar */
.dsh-cs-test-searchbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background: var(--dsw-alias-bg-layer-2);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  flex-shrink: 0;
}
.dsh-cs-test-input {
  flex: 1;
  height: 38px !important;
  font-size: 14px;
  box-sizing: border-box;
}
.dsh-cs-btn.primary.dsh-cs-test-search-btn,
.dsh-cs-test-search-btn {
  height: 38px !important;
  line-height: 38px;
  padding: 0 18px;
  font-size: 14px;
  flex-shrink: 0;
  box-sizing: border-box;
}

/* Modal Toolbar (Global Expand/Collapse) */
.dsh-cs-test-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px 4px 20px;
  flex-shrink: 0;
}
.dsh-cs-test-toolbar-count {
  font-size: 13px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-cs-test-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dsh-cs-test-text-btn {
  background: transparent;
  border: 1px solid var(--dsw-alias-border-l2);
  cursor: pointer;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 4px;
  transition: color 0.15s, background-color 0.15s, border-color 0.15s;
}
.dsh-cs-test-text-btn:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l1);
}

/* Modal Content Results */
.dsh-cs-test-results-container {
  flex: 1 1 0%;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 20px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dsh-cs-test-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 20px;
  text-align: center;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
}
.dsh-cs-test-pills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
.dsh-cs-test-engine-pill {
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--dsw-alias-label-primary);
}
.dsh-cs-test-empty-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 8px;
  font-size: 13px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
}
.dsh-cs-test-empty-notice.warning {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: #f59e0b;
}

/* Test Engine Card */
.dsh-cs-test-engine-card {
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.15s;
  flex-shrink: 0;
  width: 100%;
}
.dsh-cs-test-engine-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 16px;
  background: var(--dsw-alias-bg-layer-3, rgba(255, 255, 255, 0.03));
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  cursor: pointer;
  user-select: none;
}
.dsh-cs-test-engine-header:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.06));
}
.dsh-cs-test-engine-header.collapsed {
  border-bottom: none;
}
.dsh-cs-test-engine-identity {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.dsh-cs-test-engine-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}
.dsh-cs-test-engine-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.dsh-cs-test-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.dsh-cs-test-badge.pending {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-tertiary);
  border: 1px solid var(--dsw-alias-border-l2);
}
.dsh-cs-test-badge.loading {
  background: rgba(37, 99, 235, 0.12);
  color: var(--dsw-static-deepseek-450, #2563eb);
  border: 1px solid rgba(37, 99, 235, 0.25);
}
.dsh-cs-test-badge.success {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.25);
}
.dsh-cs-test-badge.warning {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.25);
}
.dsh-cs-test-badge.error {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.25);
}
.dsh-cs-test-retry-btn {
  height: 26px;
  padding: 0 8px;
  font-size: 12px;
  gap: 4px;
}
.dsh-cs-test-expand-btn {
  height: 26px;
  padding: 0 8px;
  font-size: 12px;
  gap: 4px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-cs-test-expand-btn:hover {
  color: var(--dsw-alias-label-primary);
}
.dsh-cs-test-engine-body {
  padding: 14px 16px;
}
.dsh-cs-test-loading-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 6px;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
}
.dsh-cs-test-error-box {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  padding: 10px 12px;
  color: #ef4444;
  font-size: 13px;
  line-height: 18px;
  word-break: break-word;
}
.dsh-cs-test-sources-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dsh-cs-test-source-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  transition: border-color 0.15s, background-color 0.15s;
  cursor: default;
}
.dsh-cs-test-source-item.expandable {
  cursor: pointer;
}
.dsh-cs-test-source-item.expandable:hover {
  border-color: var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3, rgba(255, 255, 255, 0.04));
}
.dsh-cs-test-source-item.expanded {
  border-color: rgba(37, 99, 235, 0.4);
  background: var(--dsw-alias-bg-layer-3, rgba(255, 255, 255, 0.03));
}
.dsh-cs-test-source-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  user-select: text;
}
.dsh-cs-test-source-title {
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  line-height: 18px;
  cursor: pointer;
}
.dsh-cs-test-source-title:hover {
  color: var(--dsw-static-deepseek-450, #2563eb);
  text-decoration: underline;
}
.dsh-cs-test-external-icon {
  color: var(--dsw-alias-label-tertiary);
  flex-shrink: 0;
}
.dsh-cs-test-source-date {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  flex-shrink: 0;
  user-select: text;
}
.dsh-cs-test-source-url {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  word-break: break-all;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 14px;
  user-select: text;
  cursor: text;
}
.dsh-cs-test-source-snippet {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
  line-height: 18px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  user-select: text;
  cursor: text;
}
.dsh-cs-test-source-item.expanded .dsh-cs-test-source-snippet {
  display: block;
  -webkit-line-clamp: unset;
  -webkit-box-orient: unset;
  overflow: visible;
  white-space: pre-wrap;
  word-break: break-word;
}
.dsh-cs-test-source-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 2px;
}
.dsh-cs-test-source-hint {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.65;
  transition: opacity 0.15s, color 0.15s;
  user-select: none;
}
.dsh-cs-test-source-item:hover .dsh-cs-test-source-hint {
  opacity: 1;
  color: var(--dsw-static-deepseek-450, #2563eb);
}

.dsh-cs-test-summary {
  font-size: 13px;
  color: var(--dsw-alias-label-secondary);
}
`
