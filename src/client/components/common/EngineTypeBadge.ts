import * as React from 'react'
import type { EngineType } from '../../../types.ts'
import { useI18n } from '../../i18n.ts'

const e = React.createElement

export interface EngineTypeBadgeProps {
  type: EngineType
  className?: string
  style?: React.CSSProperties
}

export function EngineTypeBadge({
  type,
  className,
  style,
}: EngineTypeBadgeProps): React.ReactElement {
  const { t } = useI18n()

  const badgeClass =
    type === 'bridge'
      ? 'dsh-cs-badge bridge'
      : type === 'keyed'
        ? 'dsh-cs-badge keyed'
        : 'dsh-cs-badge free'

  return e(
    'span',
    {
      className: className ? `${badgeClass} ${className}` : badgeClass,
      style,
    },
    type === 'bridge'
      ? t('badge.bridge')
      : type === 'keyed'
        ? t('badge.keyed')
        : t('badge.free'),
  )
}
