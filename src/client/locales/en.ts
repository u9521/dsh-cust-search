/**
 * English copy for the custom web-search settings page.
 *
 * Flat dictionary: the key is the whole dotted path, which is exactly what the
 * locale namespace `cust-search` declares. `en` is the single source of truth
 * for the key union; `zh` must cover every key.
 */
export const en = {
  'header.sortModeActive': 'Sort Mode',
  'header.detailMode': 'Detail Configuration Mode',
  'header.defaultTimeout': 'Global Default Timeout:',
  'header.saving': 'Saving...',
  'header.save': 'Save Config',
  'header.saveSuccess': 'Configuration saved and active',
  'header.unsavedChanges': 'Configuration modified. Save config to apply.',
  'header.unsavedWithClearedOnly':
    'Marked to clear credentials for {names}. Save config to apply.',
  'header.unsavedWithClearedAndOther':
    'Configuration modified (marked to clear credentials for {names}). Save config to apply.',
  'header.saveFailed': 'Save failed:',
  'header.loadFailed': 'Failed to load config:',
  'header.loading': 'Loading search plugin configuration...',
  'header.noEnabledEngines':
    'No search engines enabled. Please switch to Detail Mode to enable engines.',
  'badge.bridge': 'Official Bridge',
  'badge.keyed': 'Key Required',
  'badge.free': 'Free (No Key)',
  'badge.disabled': 'Disabled',
  'badge.enabled': 'Enabled',
  'badge.clickToEnable': 'Not Enabled',
  'detail.timeoutLabel': 'Custom Timeout (ms)',
  'detail.timeoutPlaceholder': 'Inherit Global ({timeout}ms)',
  'detail.keyRefLabel': 'Credential Name (KeyRef)',
  'detail.apiKeyLabel': 'API Key Configuration',
  'detail.apiKeyPlaceholderConfigured': 'Configured (Type new key to override)',
  'detail.apiKeyPlaceholderEmpty': 'Enter API Key',
  'detail.clearKey': 'Clear Key',
  'detail.clearKeyTitle': 'Remove this KeyRef from credentials store',
  'detail.undoClearKey': 'Undo Clear',
  'detail.undoClearKeyTitle':
    'Cancel clear mark and restore credential configuration',
  'detail.keyStatusMarkedClear': 'Marked to Clear',
  'detail.apiKeyPlaceholderClearing':
    'Marked to clear credential (applies on save)',
  'detail.clearKeyMarked':
    'Marked to clear credential for {name}. Save config to apply.',
  'detail.keyStatusCredentials': 'Credentials Configured',
  'detail.keyStatusEnv': 'Environment Var',
  'detail.keyStatusMissing': 'Not configured',
  'detail.marketLabel': 'Search Market',
  'detail.searxngLabel':
    'Custom SearXNG instances (comma separated, empty for public defaults)',
  'sort.dragHandleTitle': 'Drag to reorder engine priority',
  'sort.dropHere': 'Drop here',
  'sort.placeholderEngine': 'Moving: {name}',
  'footer.save': 'Save Config',
  'footer.saving': 'Saving...',
  'footer.testSearch': 'Test Search',
  'footer.enabledCount': '{count} search engine(s) enabled',
  'footer.enabledCountRatio': 'Enabled {enabled} / {total}',
  'testModal.title': 'Test Search',
  'testModal.searchPlaceholder': 'Enter search keywords...',
  'testModal.searchBtn': 'Search',
  'testModal.searchingBtn': 'Searching...',
  'testModal.noEnabledEngines':
    'No search engines enabled. Please enable at least one engine before testing.',
  'testModal.emptyState':
    'Enter keywords and click "Search" to test all enabled search engines',
  'testModal.statusPending': 'Pending',
  'testModal.statusSearching': 'Searching...',
  'testModal.statusSuccess': 'Success ({count} results, {ms}ms)',
  'testModal.statusEmpty': 'Success (0 results, {ms}ms)',
  'testModal.statusFailed': 'Failed ({ms}ms)',
  'testModal.retry': 'Retry',
  'testModal.expand': 'Expand',
  'testModal.collapse': 'Collapse',
  'testModal.expandAll': 'Expand All',
  'testModal.collapseAll': 'Collapse All',
  'testModal.expandSnippet': 'Click blank area to expand full snippet',
  'testModal.collapseSnippet': 'Click blank area to collapse snippet',
  'testModal.close': 'Close',
  'testModal.noResults': 'No search results found.',
  'testModal.summary':
    'Tested {total} engines: {success} succeeded, {failed} failed',
  'engines.deepseek.name': 'DeepSeek Official',
  'engines.deepseek.description':
    'Direct bridge to official web-search-deepseek plugin. Please configure API Key, endpoint, and model in the official Web Search settings.',
  'engines.bing.name': 'Bing Search',
  'engines.bing.description':
    'Microsoft Bing web search with locale and market support',
  'engines.ddg.name': 'DuckDuckGo',
  'engines.ddg.description': 'Privacy search with automatic HTML/Lite fallback',
  'engines.searxng.name': 'SearXNG',
  'engines.searxng.description':
    'Meta-search engine aggregating multiple public instances',
  'engines.tavily.name': 'Tavily Search',
  'engines.tavily.description':
    'AI search optimized for LLMs with custom KeyRef or keyless access',
  'engines.anysearch.name': 'AnySearch',
  'engines.anysearch.description': 'Keyless structured AI search endpoint',
  'engines.exa.name': 'Exa Search',
  'engines.exa.description':
    'Neural semantic search with custom KeyRef or public MCP access',
  'engines.keenable.name': 'Keenable Search',
  'engines.keenable.description':
    'Realtime web retrieval with custom KeyRef, falling back to keyless MCP quota',
  'engines.firecrawl.name': 'Firecrawl Search',
  'engines.firecrawl.description':
    'AI-oriented web search and scraping with custom KeyRef or keyless quota',
  'engines.parallel.name': 'Parallel Search',
  'engines.parallel.description':
    'Parallel.ai natural-language objective search with custom KeyRef, falling back to free MCP without a key',
  'engines.perplexity.name': 'Perplexity Search',
  'engines.perplexity.description':
    'Perplexity Sonar retrieval returning a cited generated answer; requires an API Key',
} as const

/** Dictionary key union of the `cust-search` locale namespace. */
export type CustSearchLocaleKey = keyof typeof en
