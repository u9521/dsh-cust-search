export const FOOTER_CSS = `
/* ====================================================
   Bottom Toolbar & Action Controls (FooterBar)
   ==================================================== */

/* Floating action bar: rounded, inset from the page edges, and pinned to the
   bottom of the scrolling page so Save/Test stay reachable while the engine
   list scrolls under it. It wears the product's menu material — a translucent
   fill over the theme's backdrop blur — so content passing underneath reads as
   frosted glass instead of being hidden. Stays in flow, so it settles into its
   own row once the list is scrolled to its end. */
.dsh-cs-footer {
  align-items: center;
  /* Opaque fallback first; the theme's translucent menu fill wins when defined. */
  background: var(--dsw-alias-bg-layer-2);
  background: var(--dsw-menu-surface-fill, var(--dsw-alias-bg-layer-2));
  /* The theme's own glass blur (menus, hover cards). Do NOT use --dsw-mask-blur
     here: the theme defines that one as "none" for this surface. */
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(24px) saturate(150%));
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-lg, 12px);
  bottom: 12px;
  box-shadow: var(--dsw-elevation-prominent);
  box-sizing: border-box;
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  justify-content: space-between;
  margin: 12px 24px;
  padding: 12px 16px;
  position: sticky;
  z-index: 5;
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
