import * as React from 'react'
import {
  IconRefreshOutlineRegular,
  IconTrashOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { EngineDefinition, EngineSpecificConfig } from '../../types.ts'
import { useI18n } from '../i18n.ts'
import { EngineTypeBadge } from './common/EngineTypeBadge.ts'
import { OrderBadge } from './common/OrderBadge.ts'
import { Switch } from './common/Switch.ts'

const e = React.createElement

export interface EngineDetailCardProps {
  engineDef: EngineDefinition
  orderIndex?: number // 1-based index if enabled, undefined if disabled
  engineConfig: EngineSpecificConfig
  defaultTimeout: number
  apiKeyInput: string
  isMarkedForClear?: boolean
  onToggleEnable: (enabled: boolean) => void
  onChangeTimeout: (timeout?: number) => void
  onChangeKeyRef: (keyRef: string) => void
  onApiKeyInputChange: (val: string) => void
  onClearApiKey: () => void
  onUndoClearApiKey: () => void
  onChangeOption: (key: string, value: unknown) => void
}

export function EngineDetailCard({
  engineDef,
  orderIndex,
  engineConfig,
  defaultTimeout,
  apiKeyInput,
  isMarkedForClear = false,
  onToggleEnable,
  onChangeTimeout,
  onChangeKeyRef,
  onApiKeyInputChange,
  onClearApiKey,
  onUndoClearApiKey,
  onChangeOption,
}: EngineDetailCardProps): React.ReactElement {
  const { t } = useI18n()
  const isEnabled = typeof orderIndex === 'number' && orderIndex > 0
  const currentKeyRef =
    (engineConfig.keyRef as string) || engineDef.defaultKeyRef || ''

  const engineName = t(`engines.${engineDef.id}.name`) || engineDef.id
  const engineDesc = t(`engines.${engineDef.id}.description`) || ''

  return e(
    'div',
    {
      className: `dsh-cs-card ${isEnabled ? '' : 'disabled'}`.trim(),
    },
    // Header
    e(
      'div',
      { className: 'dsh-cs-card-header' },
      e(
        'div',
        { className: 'dsh-cs-card-identity' },
        e(OrderBadge, { index: orderIndex, disabled: !isEnabled }),
        e('span', { className: 'dsh-cs-card-name' }, engineName),
        e(EngineTypeBadge, { type: engineDef.type }),
      ),
      // Clean Switch Button (No redundant text prompt)
      e(Switch, {
        checked: isEnabled,
        onChange: onToggleEnable,
        label: engineName,
        title: isEnabled ? t('badge.enabled') : t('badge.disabled'),
      }),
    ),
    // Description
    e('div', { className: 'dsh-cs-card-desc' }, engineDesc),
    // Body / Options
    e(
      'div',
      { className: 'dsh-cs-card-body' },
      // Timeout
      e(
        'div',
        { className: 'dsh-cs-field' },
        e(
          'label',
          { className: 'dsh-cs-field-label' },
          t('detail.timeoutLabel'),
        ),
        e('input', {
          type: 'number',
          className: 'dsh-cs-input',
          placeholder: t('detail.timeoutPlaceholder', {
            timeout: defaultTimeout,
          }),
          value: engineConfig.timeout || '',
          onChange: (ev: React.ChangeEvent<HTMLInputElement>) => {
            const val = parseInt(ev.target.value, 10)
            onChangeTimeout(isNaN(val) || val <= 0 ? undefined : val)
          },
          min: 1000,
          step: 500,
        }),
      ),
      // Keyed Engine: KeyRef & API Key
      engineDef.type === 'keyed'
        ? e(
            'div',
            { className: 'dsh-cs-field' },
            e(
              'label',
              { className: 'dsh-cs-field-label' },
              t('detail.keyRefLabel'),
            ),
            e('input', {
              type: 'text',
              className: 'dsh-cs-input',
              value: currentKeyRef,
              disabled: isMarkedForClear,
              placeholder:
                engineDef.defaultKeyRef || t('detail.keyRefPlaceholder'),
              onChange: (ev: React.ChangeEvent<HTMLInputElement>) =>
                onChangeKeyRef(ev.target.value),
            }),
          )
        : null,
      engineDef.type === 'keyed'
        ? e(
            'div',
            { className: 'dsh-cs-field full-width' },
            e(
              'div',
              { className: 'dsh-cs-field-label' },
              e('span', null, t('detail.apiKeyLabel')),
              e(
                'span',
                {
                  style: {
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                  },
                },
                e('span', {
                  className: `dsh-cs-dot ${
                    isMarkedForClear
                      ? 'warning'
                      : engineDef.hasKey
                        ? 'ok'
                        : 'missing'
                  }`,
                }),
                isMarkedForClear
                  ? t('detail.keyStatusMarkedClear')
                  : engineDef.hasKey
                    ? engineDef.keySource === 'credentials'
                      ? t('detail.keyStatusCredentials')
                      : t('detail.keyStatusEnv')
                    : t('detail.keyStatusMissing'),
              ),
            ),
            e(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
              e('input', {
                type: 'password',
                className: 'dsh-cs-input',
                disabled: isMarkedForClear,
                placeholder: isMarkedForClear
                  ? t('detail.apiKeyPlaceholderClearing')
                  : engineDef.hasKey
                    ? t('detail.apiKeyPlaceholderConfigured')
                    : t('detail.apiKeyPlaceholderEmpty'),
                value: isMarkedForClear ? '' : apiKeyInput,
                onChange: (ev: React.ChangeEvent<HTMLInputElement>) =>
                  onApiKeyInputChange(ev.target.value),
                style: { flex: 1 },
              }),
              e(
                'button',
                {
                  type: 'button',
                  className: isMarkedForClear
                    ? 'dsh-cs-btn undo'
                    : 'dsh-cs-btn danger',
                  title: isMarkedForClear
                    ? t('detail.undoClearKeyTitle')
                    : t('detail.clearKeyTitle'),
                  onClick: isMarkedForClear ? onUndoClearApiKey : onClearApiKey,
                  style: { flexShrink: 0 },
                },
                e(
                  isMarkedForClear
                    ? IconRefreshOutlineRegular
                    : IconTrashOutlineRegular,
                  {
                    size: 14,
                  },
                ),
                e(
                  'span',
                  null,
                  isMarkedForClear
                    ? t('detail.undoClearKey')
                    : t('detail.clearKey'),
                ),
              ),
            ),
          )
        : null,
      // Bing market
      engineDef.id === 'bing'
        ? e(
            'div',
            { className: 'dsh-cs-field' },
            e(
              'label',
              { className: 'dsh-cs-field-label' },
              t('detail.marketLabel'),
            ),
            e(
              'select',
              {
                className: 'dsh-cs-select',
                value: (engineConfig.market as string) || 'zh-CN',
                onChange: (ev: React.ChangeEvent<HTMLSelectElement>) =>
                  onChangeOption('market', ev.target.value),
              },
              e('option', { value: 'zh-CN' }, 'zh-CN (简体中文)'),
              e('option', { value: 'zh-TW' }, 'zh-TW (繁体中文)'),
              e('option', { value: 'en-US' }, 'en-US (美式英语)'),
              e('option', { value: 'en-GB' }, 'en-GB (英式英语)'),
              e('option', { value: 'ja-JP' }, 'ja-JP (日语)'),
              e('option', { value: 'ru-RU' }, 'ru-RU (俄语)'),
              e('option', { value: 'de-DE' }, 'de-DE (德语)'),
              e('option', { value: 'fr-FR' }, 'fr-FR (法语)'),
            ),
          )
        : null,
      // SearXNG custom instances
      engineDef.id === 'searxng'
        ? e(
            'div',
            { className: 'dsh-cs-field full-width' },
            e(
              'label',
              { className: 'dsh-cs-field-label' },
              t('detail.searxngLabel'),
            ),
            e('input', {
              type: 'text',
              className: 'dsh-cs-input',
              value: Array.isArray(engineConfig.instances)
                ? engineConfig.instances.join(', ')
                : '',
              placeholder: 'https://searx.be, https://priv.au',
              onChange: (ev: React.ChangeEvent<HTMLInputElement>) => {
                const arr = ev.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                onChangeOption('instances', arr)
              },
            }),
          )
        : null,
    ),
  )
}
