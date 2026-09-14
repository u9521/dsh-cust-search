export const zh = {
  tabLabel: 'Web 搜索',
  header: {
    sortModeActive: '排序模式',
    detailMode: '详细配置模式',
    defaultTimeout: '全局默认超时:',
    saving: '保存中...',
    save: '保存配置',
    saveSuccess: '配置已保存并生效',
    unsavedChanges: '配置已修改，保存配置后生效',
    unsavedWithClearedOnly: '已标记清空 {names} 的凭据，保存配置后生效',
    unsavedWithClearedAndOther:
      '配置已修改（已标记清空 {names} 的凭据），保存配置后生效',
    saveFailed: '保存失败:',
    loadFailed: '加载失败:',
    loading: '正在加载搜索插件配置...',
    noEnabledEngines: '当前未启用任何搜索引擎，请切换至详细配置模式开启引擎。',
  },
  badge: {
    bridge: '官方直连',
    keyed: '需凭据',
    free: '免费免Key',
    disabled: '已禁用',
    enabled: '已启用',
    clickToEnable: '未启用',
  },
  detail: {
    timeoutLabel: '单引擎超时时间 (毫秒)',
    timeoutPlaceholder: '跟随全局 ({timeout}ms)',
    keyRefLabel: '凭据引用名 (KeyRef)',
    apiKeyLabel: 'API Key 配置',
    apiKeyPlaceholderConfigured: '已配置凭据 (输入新密钥以覆盖)',
    apiKeyPlaceholderEmpty: '输入 API Key',
    clearKey: '清空凭据',
    clearKeyTitle: '从凭据中心移除该 KeyRef 的值',
    undoClearKey: '撤销清空',
    undoClearKeyTitle: '取消清空标记，恢复凭据配置',
    keyStatusMarkedClear: '已标记清空',
    apiKeyPlaceholderClearing: '已标记清空凭据 (保存配置后生效)',
    clearKeyMarked: '已标记清空 {name} 的凭据，保存配置后生效',
    keyStatusCredentials: '已设置凭据',
    keyStatusEnv: '环境变量生效',
    keyStatusMissing: '未配置凭据',
    marketLabel: '检索语言市场 (Market)',
    searxngLabel: '自定义实例列表 (逗号分隔，留空使用公共节点)',
  },
  sort: {
    dragHandleTitle: '按住拖动调整引擎调用优先级',
    dropHere: '放置于此位置',
    placeholderEngine: '移动: {name}',
  },
  footer: {
    save: '保存配置',
    saving: '保存中...',
    testSearch: '测试搜索',
    enabledCount: '已启用 {count} 个搜索引擎',
    enabledCountRatio: '已启用 {enabled} / {total}',
  },
  testModal: {
    title: '测试搜索',
    searchPlaceholder: '输入搜索关键词...',
    searchBtn: '搜索',
    searchingBtn: '检索中...',
    noEnabledEngines:
      '当前未启用任何搜索引擎，请在配置中开启至少一个引擎后再测试。',
    emptyState: '输入关键词并点击「搜索」，将测试已启用的搜索引擎',
    statusPending: '待测试',
    statusSearching: '检索中...',
    statusSuccess: '成功 ({count} 条结果，耗时 {ms}ms)',
    statusEmpty: '成功 (未返回结果，耗时 {ms}ms)',
    statusFailed: '失败 (耗时 {ms}ms)',
    retry: '重试',
    expand: '展开',
    collapse: '收起',
    expandAll: '全部展开',
    collapseAll: '全部收起',
    expandSnippet: '点击空白处展开完整摘要',
    collapseSnippet: '点击空白处收起摘要',
    close: '关闭',
    noResults: '未检索到匹配的网页结果。',
    summary: '共测试 {total} 个引擎：{success} 个成功，{failed} 个失败',
  },
  engines: {
    deepseek: {
      name: 'DeepSeek Official',
      description:
        '直接调用官方 web-search-deepseek 插件；API Key、端点及模型等具体配置请前往官方「Web 搜索」插件配置卡片设置。',
    },
    bing: {
      name: 'Bing Search',
      description: '微软必应网页搜索，支持多语言与地区本地化检索',
    },
    ddg: {
      name: 'DuckDuckGo',
      description: 'DuckDuckGo 隐私网页搜索，HTML/Lite 双模自动重试',
    },
    searxng: {
      name: 'SearXNG',
      description: 'SearXNG 元搜索引擎，自动轮换公共与自建实例聚合检索',
    },
    tavily: {
      name: 'Tavily Search',
      description:
        '针对大语言模型优化的 AI 搜索，支持自定义 KeyRef 或免 Key 匿名额度',
    },
    anysearch: {
      name: 'AnySearch',
      description: '免费免 Key 的 AI 结构化搜索端点',
    },
    exa: {
      name: 'Exa Search',
      description:
        '神经网络 AI 语义搜索，支持自定义 KeyRef 或公共 MCP 免 Key 访问',
    },
    keenable: {
      name: 'Keenable Search',
      description:
        '实时网页检索，支持自定义 KeyRef；未配置凭据时自动使用免 Key MCP 匿名额度',
    },
    firecrawl: {
      name: 'Firecrawl Search',
      description:
        '面向 AI 的网页抓取与检索，支持自定义 KeyRef 或免 Key 匿名额度',
    },
    parallel: {
      name: 'Parallel Search',
      description:
        'Parallel.ai 自然语言目标检索，支持自定义 KeyRef；未配置凭据时自动使用免费 MCP 匿名额度',
    },
    perplexity: {
      name: 'Perplexity Search',
      description:
        'Perplexity Sonar 在线检索并返回带引用的生成式答案，需配置 API Key',
    },
  },
}
