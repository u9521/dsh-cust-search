import * as React from 'react'
import { IconWarningOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import type { EngineDefinition } from '../../../types.ts'
import { useI18n } from '../../i18n.ts'

const e = React.createElement

export interface EmptyStateProps {
  noEnabledEngines: boolean
  enabledEngineIds: string[]
  defMap: Map<string, EngineDefinition>
}

export function EmptyState({
  noEnabledEngines,
  enabledEngineIds,
  defMap,
}: EmptyStateProps): React.ReactElement {
  const { t } = useI18n()

  if (noEnabledEngines) {
    return e(
      'div',
      { className: 'dsh-cs-test-empty-notice warning' },
      e(IconWarningOutlineRegular, { size: 16 }),
      e('span', null, t('testModal.noEnabledEngines')),
    )
  }

  return e(
    'div',
    { className: 'dsh-cs-test-empty-state' },
    e('p', null, t('testModal.emptyState')),
    e(
      'div',
      { className: 'dsh-cs-test-pills-list' },
      enabledEngineIds.map((id, idx) => {
        const def = defMap.get(id)
        const name = def ? t(`engines.${id}.name`) || id : id
        return e(
          'span',
          { key: id, className: 'dsh-cs-test-engine-pill' },
          e('strong', null, `#${idx + 1}`),
          ` ${name}`,
        )
      }),
    ),
  )
}
