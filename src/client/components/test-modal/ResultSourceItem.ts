import * as React from 'react'
import { IconRightUpOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import type { WebSearchSource } from '../../../types.ts'
import { useI18n } from '../../i18n.ts'

const e = React.createElement

export interface ResultSourceItemProps {
  src: WebSearchSource
  sIdx: number
  engineId: string
  isExpanded: boolean
  onToggleExpand: (key: string) => void
}

export function ResultSourceItem({
  src,
  sIdx,
  engineId,
  isExpanded,
  onToggleExpand,
}: ResultSourceItemProps): React.ReactElement {
  const { t } = useI18n()
  const sourceKey = `${engineId}-${sIdx}`
  const [canExpand, setCanExpand] = React.useState<boolean>(false)
  const snippetRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const el = snippetRef.current
    if (!el) return

    const checkOverflow = () => {
      if (!isExpanded && snippetRef.current) {
        const overflows =
          snippetRef.current.scrollHeight > snippetRef.current.clientHeight + 2
        setCanExpand(overflows)
      }
    }

    checkOverflow()

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => checkOverflow())
      ro.observe(el)
      return () => ro.disconnect()
    }
  }, [src.snippet, isExpanded])

  const handleClick = (ev: React.MouseEvent) => {
    if (!canExpand) return
    const target = ev.target as HTMLElement | null
    if (target?.closest('a')) return
    const selection = window.getSelection()
    if (selection && selection.toString().trim().length > 0) return
    onToggleExpand(sourceKey)
  }

  const tooltipTitle = canExpand
    ? isExpanded
      ? t('testModal.collapseSnippet')
      : t('testModal.expandSnippet')
    : undefined

  return e(
    'div',
    {
      className: `dsh-cs-test-source-item ${canExpand ? 'expandable' : ''} ${isExpanded ? 'expanded' : ''}`,
      title: tooltipTitle,
      onClick: handleClick,
    },
    e(
      'div',
      { className: 'dsh-cs-test-source-title-row' },
      e(
        'a',
        {
          href: src.url,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'dsh-cs-test-source-title',
        },
        src.title || src.url,
        e(IconRightUpOutlineRegular, {
          size: 12,
          className: 'dsh-cs-test-external-icon',
        }),
      ),
      src.publishedAt
        ? e('span', { className: 'dsh-cs-test-source-date' }, src.publishedAt)
        : null,
    ),
    e('div', { className: 'dsh-cs-test-source-url' }, src.url),
    src.snippet
      ? e(
          'div',
          {
            ref: snippetRef,
            className: 'dsh-cs-test-source-snippet',
          },
          src.snippet,
        )
      : null,
    src.snippet && canExpand
      ? e(
          'div',
          { className: 'dsh-cs-test-source-footer' },
          e(
            'span',
            { className: 'dsh-cs-test-source-hint' },
            isExpanded
              ? `▴ ${t('testModal.collapseSnippet')}`
              : `▾ ${t('testModal.expandSnippet')}`,
          ),
        )
      : null,
  )
}
