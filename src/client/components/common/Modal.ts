import * as React from 'react'
import { IconCloseOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'

const e = React.createElement

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  icon?: React.ReactNode
  closeTitle?: string
  panelClassName?: string
  footer?: React.ReactNode
  children?: React.ReactNode
}

export function Modal({
  open,
  onClose,
  title,
  icon,
  closeTitle,
  panelClassName,
  footer,
  children,
}: ModalProps): React.ReactElement | null {
  React.useEffect(() => {
    if (!open) return
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return e(
    'div',
    {
      className: 'dsh-cs-modal-overlay',
      onClick: (ev: React.MouseEvent) => {
        if (ev.target === ev.currentTarget) {
          onClose()
        }
      },
    },
    e(
      'div',
      {
        className: `dsh-cs-modal-panel ${panelClassName || ''}`.trim(),
        role: 'dialog',
        'aria-modal': true,
        'aria-label': title,
      },
      // Header
      e(
        'div',
        { className: 'dsh-cs-modal-header' },
        e(
          'div',
          { className: 'dsh-cs-modal-title-row' },
          icon || null,
          e('h3', { className: 'dsh-cs-modal-title' }, title),
        ),
        e(
          'button',
          {
            type: 'button',
            className: 'dsh-cs-modal-close-btn',
            onClick: onClose,
            title: closeTitle,
          },
          e(IconCloseOutlineRegular, { size: 16 }),
        ),
      ),
      // Body content
      children,
      // Footer
      footer || null,
    ),
  )
}
