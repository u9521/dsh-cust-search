import * as React from 'react'
import { useI18n } from '../../i18n.ts'

const e = React.createElement

export interface OrderBadgeProps {
  index?: number
  active?: boolean
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

export function OrderBadge({
  index,
  active = false,
  disabled = false,
  className,
  style,
}: OrderBadgeProps): React.ReactElement {
  const { t } = useI18n()

  if (disabled || typeof index !== 'number' || index <= 0) {
    const cls = `dsh-cs-order-badge disabled ${className || ''}`.trim()
    return e('span', { className: cls, style }, t('badge.disabled'))
  }

  const stateCls = active ? 'active' : ''
  const cls = `dsh-cs-order-badge ${stateCls} ${className || ''}`.trim()
  return e('span', { className: cls, style }, `#${index}`)
}
