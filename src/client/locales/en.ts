export const en = {
  tabLabel: 'Web Search',
  header: {
    sortModeActive: 'Sort Mode',
    detailMode: 'Detail Configuration Mode',
    defaultTimeout: 'Global Default Timeout:',
    saving: 'Saving...',
    save: 'Save Config',
    saveSuccess: 'Configuration saved and active',
    unsavedChanges: 'Configuration modified. Save config to apply.',
    unsavedWithClearedOnly:
      'Marked to clear credentials for {names}. Save config to apply.',
    unsavedWithClearedAndOther:
      'Configuration modified (marked to clear credentials for {names}). Save config to apply.',
    saveFailed: 'Save failed:',
    loadFailed: 'Failed to load config:',
    loading: 'Loading search plugin configuration...',
    noEnabledEngines:
      'No search engines enabled. Please switch to Detail Mode to enable engines.',
  },
  badge: {
    bridge: 'Official Bridge',
    keyed: 'Key Required',
    free: 'Free (No Key)',
    disabled: 'Disabled',
    enabled: 'Enabled',
    clickToEnable: 'Not Enabled',
  },
  detail: {
    timeoutLabel: 'Custom Timeout (ms)',
    timeoutPlaceholder: 'Inherit Global ({timeout}ms)',
    keyRefLabel: 'Credential Name (KeyRef)',
    apiKeyLabel: 'API Key Configuration',
    apiKeyPlaceholderConfigured: 'Configured (Type new key to override)',
    apiKeyPlaceholderEmpty: 'Enter API Key',
    clearKey: 'Clear Key',
    clearKeyTitle: 'Remove this KeyRef from credentials store',
    undoClearKey: 'Undo Clear',
    undoClearKeyTitle: 'Cancel clear mark and restore credential configuration',
    keyStatusMarkedClear: 'Marked to Clear',
    apiKeyPlaceholderClearing: 'Marked to clear credential (applies on save)',
    clearKeyMarked:
      'Marked to clear credential for {name}. Save config to apply.',
    keyStatusCredentials: 'Credentials Configured',
    keyStatusEnv: 'Environment Var',
    keyStatusMissing: 'Not configured',
    marketLabel: 'Search Market',
    searxngLabel:
      'Custom SearXNG instances (comma separated, empty for public defaults)',
  },
  sort: {
    dragHandleTitle: 'Drag to reorder engine priority',
    dropHere: 'Drop here',
    placeholderEngine: 'Moving: {name}',
  },
  footer: {
    save: 'Save Config',
    saving: 'Saving...',
    testSearch: 'Test Search',
    enabledCount: '{count} search engine(s) enabled',
    enabledCountRatio: 'Enabled {enabled} / {total}',
  },
  testModal: {
    title: 'Test Search',
    searchPlaceholder: 'Enter search keywords...',
    searchBtn: 'Search',
    searchingBtn: 'Searching...',
    noEnabledEngines:
      'No search engines enabled. Please enable at least one engine before testing.',
    emptyState:
      'Enter keywords and click "Search" to test all enabled search engines',
    statusPending: 'Pending',
    statusSearching: 'Searching...',
    statusSuccess: 'Success ({count} results, {ms}ms)',
    statusEmpty: 'Success (0 results, {ms}ms)',
    statusFailed: 'Failed ({ms}ms)',
    retry: 'Retry',
    expand: 'Expand',
    collapse: 'Collapse',
    expandAll: 'Expand All',
    collapseAll: 'Collapse All',
    expandSnippet: 'Click blank area to expand full snippet',
    collapseSnippet: 'Click blank area to collapse snippet',
    close: 'Close',
    noResults: 'No search results found.',
    summary: 'Tested {total} engines: {success} succeeded, {failed} failed',
  },
  engines: {
    deepseek: {
      name: 'DeepSeek Official',
      description:
        'Direct bridge to official web-search-deepseek plugin. Please configure API Key, endpoint, and model in the official Web Search settings.',
    },
    bing: {
      name: 'Bing Search',
      description: 'Microsoft Bing web search with locale and market support',
    },
    ddg: {
      name: 'DuckDuckGo',
      description: 'Privacy search with automatic HTML/Lite fallback',
    },
    searxng: {
      name: 'SearXNG',
      description: 'Meta-search engine aggregating multiple public instances',
    },
    tavily: {
      name: 'Tavily Search',
      description:
        'AI search optimized for LLMs with custom KeyRef or keyless access',
    },
    anysearch: {
      name: 'AnySearch',
      description: 'Keyless structured AI search endpoint',
    },
    exa: {
      name: 'Exa Search',
      description:
        'Neural semantic search with custom KeyRef or public MCP access',
    },
    keenable: {
      name: 'Keenable Search',
      description:
        'Realtime web retrieval with custom KeyRef, falling back to keyless MCP quota',
    },
    firecrawl: {
      name: 'Firecrawl Search',
      description:
        'AI-oriented web search and scraping with custom KeyRef or keyless quota',
    },
    parallel: {
      name: 'Parallel Search',
      description:
        'Parallel.ai natural-language objective search with custom KeyRef, falling back to free MCP without a key',
    },
    perplexity: {
      name: 'Perplexity Search',
      description:
        'Perplexity Sonar retrieval returning a cited generated answer; requires an API Key',
    },
  },
}
