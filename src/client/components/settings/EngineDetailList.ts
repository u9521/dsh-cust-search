import * as React from 'react'
import type { EngineDefinition } from '../../../types.ts'
import { EngineDetailCard } from '../EngineDetailCard.ts'
import type { ConfigDraft } from '../../settings/useConfigDraft.ts'

const e = React.createElement

export interface EngineDetailListProps {
  /** Enabled engines in configured order, then disabled ones. */
  entries: Array<{ def: EngineDefinition; orderIndex?: number }>
  /** The page's draft and commands. */
  draft: ConfigDraft
}

export function EngineDetailList({
  entries,
  draft,
}: EngineDetailListProps): React.ReactElement {
  return e(
    React.Fragment,
    null,
    entries.map(({ def, orderIndex }) =>
      e(EngineDetailCard, {
        key: def.id,
        engineDef: def,
        ...(orderIndex === undefined ? {} : { orderIndex }),
        draft,
      }),
    ),
  )
}
