import * as React from 'react'
import {
  IconLoadingOutline16,
  IconSearchOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useI18n } from '../../i18n.ts'

const e = React.createElement

export interface SearchBarProps {
  inputRef?: React.RefObject<HTMLInputElement | null>
  query: string
  onQueryChange: (query: string) => void
  onSearch: () => void
  isSearching: boolean
  disabled: boolean
}

export function SearchBar({
  inputRef,
  query,
  onQueryChange,
  onSearch,
  isSearching,
  disabled,
}: SearchBarProps): React.ReactElement {
  const { t } = useI18n()

  return e(
    'div',
    { className: 'dsh-cs-test-searchbar' },
    e('input', {
      ref: inputRef,
      type: 'text',
      className: 'dsh-cs-input dsh-cs-test-input',
      value: query,
      placeholder: t('testModal.searchPlaceholder'),
      onChange: (ev: React.ChangeEvent<HTMLInputElement>) =>
        onQueryChange(ev.target.value),
      onKeyDown: (ev: React.KeyboardEvent) => {
        if (ev.key === 'Enter') {
          ev.preventDefault()
          onSearch()
        }
      },
    }),
    e(
      'button',
      {
        type: 'button',
        className: 'dsh-cs-btn primary dsh-cs-test-search-btn',
        onClick: onSearch,
        disabled,
      },
      isSearching
        ? e(IconLoadingOutline16, { size: 14, className: 'dsh-cs-spin' })
        : e(IconSearchOutline16, { size: 14 }),
      e(
        'span',
        null,
        isSearching ? t('testModal.searchingBtn') : t('testModal.searchBtn'),
      ),
    ),
  )
}
