import * as React from 'react'

const e = React.createElement

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  title?: string
  disabled?: boolean
  className?: string
}

export function Switch({
  checked,
  onChange,
  label,
  title,
  disabled = false,
  className,
}: SwitchProps): React.ReactElement {
  return e(
    'button',
    {
      type: 'button',
      className:
        `dsh-cs-switch ${checked ? 'active' : ''} ${className || ''}`.trim(),
      role: 'switch',
      'aria-checked': checked,
      'aria-label': label,
      title,
      disabled,
      onClick: () => {
        if (!disabled) {
          onChange(!checked)
        }
      },
    },
    e('span', { className: 'dsh-cs-switch-thumb' }),
  )
}
