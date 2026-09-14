import * as React from 'react'
import {
  IconCheckOutline16,
  IconLoadingOutline16,
  IconWarningOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useI18n } from '../../i18n.ts'
import type { EngineTestStatus } from './useEngineTesting.ts'

const e = React.createElement

export interface StatusBadgeProps {
  status: EngineTestStatus
}

export function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const { t } = useI18n()

  if (status.state === 'loading') {
    return e(
      'span',
      { className: 'dsh-cs-test-badge loading' },
      e(IconLoadingOutline16, {
        size: 12,
        className: 'dsh-cs-spin',
      }),
      e('span', null, t('testModal.statusSearching')),
    )
  }

  if (status.state === 'success') {
    const srcCount = status.result?.sources?.length ?? 0
    if (srcCount > 0) {
      return e(
        'span',
        { className: 'dsh-cs-test-badge success' },
        e(IconCheckOutline16, { size: 12 }),
        e(
          'span',
          null,
          t('testModal.statusSuccess', {
            count: srcCount,
            ms: status.durationMs ?? 0,
          }),
        ),
      )
    }
    return e(
      'span',
      { className: 'dsh-cs-test-badge warning' },
      e(IconWarningOutline16, { size: 12 }),
      e(
        'span',
        null,
        t('testModal.statusEmpty', {
          ms: status.durationMs ?? 0,
        }),
      ),
    )
  }

  if (status.state === 'error') {
    return e(
      'span',
      { className: 'dsh-cs-test-badge error' },
      e(IconWarningOutline16, { size: 12 }),
      e(
        'span',
        null,
        t('testModal.statusFailed', {
          ms: status.durationMs ?? 0,
        }),
      ),
    )
  }

  return e(
    'span',
    { className: 'dsh-cs-test-badge pending' },
    e('span', null, t('testModal.statusPending')),
  )
}
