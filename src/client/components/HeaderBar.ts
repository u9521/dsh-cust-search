import * as React from 'react'
import { useI18n } from '../i18n.ts'
import { Switch } from './common/Switch.ts'

const e = React.createElement

export interface HeaderBarProps {
  isSortMode: boolean
  onToggleSortMode: () => void
  defaultTimeout: number
  onChangeDefaultTimeout: (val: number) => void
}

export function HeaderBar({
  isSortMode,
  onToggleSortMode,
  defaultTimeout,
  onChangeDefaultTimeout,
}: HeaderBarProps): React.ReactElement {
  const { t } = useI18n()

  return e(
    'div',
    { className: 'dsh-cs-header' },
    // Main top row: controls on left
    e(
      'div',
      { className: 'dsh-cs-header-main' },
      e(
        'div',
        { className: 'dsh-cs-header-left' },
        // Mode Switch using DSH pill switch
        e(
          'div',
          {
            className: 'dsh-cs-mode-toggle',
            onClick: onToggleSortMode,
          },
          e(Switch, {
            checked: isSortMode,
            onChange: onToggleSortMode,
            label: isSortMode
              ? t('header.sortModeActive')
              : t('header.detailMode'),
          }),
          e(
            'span',
            null,
            isSortMode ? t('header.sortModeActive') : t('header.detailMode'),
          ),
        ),
        // Default timeout input
        e(
          'div',
          { className: 'dsh-cs-timeout-group' },
          e('span', null, t('header.defaultTimeout')),
          e('input', {
            type: 'number',
            className: 'dsh-cs-input',
            value: defaultTimeout,
            onChange: (ev: React.ChangeEvent<HTMLInputElement>) => {
              const val = parseInt(ev.target.value, 10)
              if (!isNaN(val)) onChangeDefaultTimeout(val)
            },
            style: { width: '85px', height: '30px' },
            step: 500,
            min: 1000,
          }),
          e('span', null, 'ms'),
        ),
      ),
    ),
  )
}
