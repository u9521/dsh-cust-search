import * as React from 'react'
import type { EngineSpecificConfig, WebSearchResult } from '../../../types.ts'
import { testEngine } from '../../api.ts'

export interface EngineTestStatus {
  state: 'idle' | 'loading' | 'success' | 'error'
  durationMs?: number
  result?: WebSearchResult
  error?: string
}

export interface UseEngineTestingOptions {
  enabledEngineIds: string[]
  engineConfigs: Record<string, EngineSpecificConfig>
  keyInputs: Record<string, string>
  open: boolean
}

export interface UseEngineTestingReturn {
  query: string
  setQuery: React.Dispatch<React.SetStateAction<string>>
  isSearching: boolean
  hasSearched: boolean
  engineStates: Record<string, EngineTestStatus>
  summary: {
    total: number
    success: number
    failed: number
  }
  runTestForEngine: (
    engineId: string,
    searchQuery: string,
    signal?: AbortSignal,
  ) => Promise<void>
  handleSearchAll: (onSuccessStart?: () => void) => Promise<void>
  handleRetrySingle: (engineId: string, onBeforeRetry?: () => void) => void
}

export function useEngineTesting({
  enabledEngineIds,
  engineConfigs,
  keyInputs,
  open,
}: UseEngineTestingOptions): UseEngineTestingReturn {
  const [query, setQuery] = React.useState<string>('')
  const [isSearching, setIsSearching] = React.useState<boolean>(false)
  const [engineStates, setEngineStates] = React.useState<
    Record<string, EngineTestStatus>
  >({})
  const [hasSearched, setHasSearched] = React.useState<boolean>(false)

  const abortControllerRef = React.useRef<AbortController | null>(null)

  // Abort any in-flight test requests when modal closes
  React.useEffect(() => {
    if (!open && abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [open])

  // Single engine test runner
  const runTestForEngine = React.useCallback(
    async (
      engineId: string,
      searchQuery: string,
      signal?: AbortSignal,
    ): Promise<void> => {
      setEngineStates((prev) => ({
        ...prev,
        [engineId]: { state: 'loading' },
      }))

      try {
        const engineConf = engineConfigs[engineId]
        const tempKey = keyInputs[engineId]

        const res = await testEngine(
          {
            engineId,
            query: searchQuery,
            maxResults: 5,
            engineConfig: engineConf,
            tempApiKey: tempKey !== undefined ? tempKey : undefined,
          },
          signal,
        )

        if (res.ok && res.data.result) {
          setEngineStates((prev) => ({
            ...prev,
            [engineId]: {
              state: 'success',
              durationMs: res.data.durationMs,
              result: res.data.result,
            },
          }))
        } else {
          setEngineStates((prev) => ({
            ...prev,
            [engineId]: {
              state: 'error',
              durationMs: res.data.durationMs,
              error: res.data.error || 'Unknown search error',
            },
          }))
        }
      } catch (err) {
        if (signal?.aborted) return
        setEngineStates((prev) => ({
          ...prev,
          [engineId]: {
            state: 'error',
            durationMs: 0,
            error: err instanceof Error ? err.message : String(err),
          },
        }))
      }
    },
    [engineConfigs, keyInputs],
  )

  // Run test across all enabled engines
  const handleSearchAll = React.useCallback(
    async (onSuccessStart?: () => void) => {
      const trimmed = query.trim()
      if (!trimmed || enabledEngineIds.length === 0 || isSearching) return

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      const ctrl = new AbortController()
      abortControllerRef.current = ctrl

      setIsSearching(true)
      setHasSearched(true)
      if (onSuccessStart) onSuccessStart()

      // Set initial loading state for all enabled engines
      const initialStatus: Record<string, EngineTestStatus> = {}
      for (const id of enabledEngineIds) {
        initialStatus[id] = { state: 'loading' }
      }
      setEngineStates(initialStatus)

      try {
        await Promise.allSettled(
          enabledEngineIds.map((id) =>
            runTestForEngine(id, trimmed, ctrl.signal),
          ),
        )
      } finally {
        setIsSearching(false)
      }
    },
    [query, enabledEngineIds, isSearching, runTestForEngine],
  )

  // Single engine retry
  const handleRetrySingle = React.useCallback(
    (engineId: string, onBeforeRetry?: () => void) => {
      const trimmed = query.trim()
      if (!trimmed) return
      if (onBeforeRetry) onBeforeRetry()
      runTestForEngine(engineId, trimmed)
    },
    [query, runTestForEngine],
  )

  // Calculate summary counts
  const summary = React.useMemo(() => {
    const total = enabledEngineIds.length
    let success = 0
    let failed = 0
    for (const id of enabledEngineIds) {
      const st = engineStates[id]
      if (st?.state === 'success') success++
      if (st?.state === 'error') failed++
    }
    return { total, success, failed }
  }, [enabledEngineIds, engineStates])

  return {
    query,
    setQuery,
    isSearching,
    hasSearched,
    engineStates,
    summary,
    runTestForEngine,
    handleSearchAll,
    handleRetrySingle,
  }
}
