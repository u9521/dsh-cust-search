import * as React from 'react'
import {
  IconCheckOutline16,
  IconLoadingOutline16,
  IconSearchOutline16,
  IconWarningOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useI18n } from '../i18n.ts'

const e = React.createElement

export interface FooterBarProps {
  onSave: () => void
  saving: boolean
  onOpenTestSearch: () => void
  message?: string | null
  enabledCount: number
  totalCount?: number
}

export function FooterBar({
  onSave,
  saving,
  onOpenTestSearch,
  message,
  enabledCount,
  totalCount,
}: FooterBarProps): React.ReactElement {
  const { t } = useI18n()

  const isError =
    Boolean(message) &&
    (message!.includes('失败') ||
      message!.includes('错误') ||
      message!.toLowerCase().includes('failed') ||
      message!.toLowerCase().includes('error'))

  const isWarning =
    Boolean(message) &&
    !isError &&
    (message!.includes('已修改') ||
      message!.toLowerCase().includes('modified') ||
      message!.toLowerCase().includes('unsaved') ||
      message!.includes('未保存'))

  const noticeClass = isError ? 'error' : isWarning ? 'warning' : 'success'
  const NoticeIcon =
    isError || isWarning ? IconWarningOutline16 : IconCheckOutline16

  const countText =
    totalCount !== undefined
      ? t('footer.enabledCountRatio', {
          enabled: enabledCount,
          total: totalCount,
        })
      : t('footer.enabledCount', { count: enabledCount })

  return e(
    'div',
    { className: 'dsh-cs-footer' },
    // Left side: Status message or enabled count
    e(
      'div',
      { className: 'dsh-cs-footer-left' },
      message
        ? e(
            'div',
            { className: `dsh-cs-footer-notice ${noticeClass}` },
            e(NoticeIcon, { size: 14 }),
            e('span', null, message),
          )
        : e('span', { className: 'dsh-cs-footer-count' }, countText),
    ),
    // Right side: Action buttons
    e(
      'div',
      { className: 'dsh-cs-footer-right' },
      e(
        'button',
        {
          type: 'button',
          className: 'dsh-cs-btn secondary',
          onClick: onOpenTestSearch,
          title: t('footer.testSearch'),
        },
        e(IconSearchOutline16, { size: 14 }),
        e('span', null, t('footer.testSearch')),
      ),
      e(
        'button',
        {
          type: 'button',
          className: 'dsh-cs-btn primary',
          onClick: onSave,
          disabled: saving,
        },
        saving
          ? e(IconLoadingOutline16, { size: 14, className: 'dsh-cs-spin' })
          : null,
        e('span', null, saving ? t('footer.saving') : t('footer.save')),
      ),
    ),
  )
}
