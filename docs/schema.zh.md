# 存储结构与 JSON Schema 规范

[English](schema.md) | 中文

`dsh-cust-search` 插件的持久化配置保存在独立的用户存储目录中，不修改系统或宿主配置文件。

- **存储文件路径**：`~/.dsh/storages/cust_search.json`
- **存储引擎**：`ctx.storage.domain` 的 `cust_search` 域（JSON backend，`single` 布局）。该文件是域 unit 文档，而不是裸配置对象：
  ```json
  {
    "unit": { "name": "cust_search", "version": 1 },
    "global": { "...下文的配置内容..." },
    "tables": {}
  }
  ```
  每次写入都会原子地整体重发该 unit；文件损坏或格式不符时域打开会直接失败，而不是被默认值覆盖。
- **安全特性**：API Key 等敏感凭据通过 DSH 凭据服务 (`ctx.credentials`) 管理，**绝不会明文写入该 JSON 文件**。

---

## 1. 完整配置示例

下文的对象即 `global` 的值：

```json
{
  "defaultTimeout": 8000,
  "enginesOrder": [
    "deepseek",
    "bing",
    "ddg",
    "searxng",
    "tavily",
    "anysearch",
    "exa",
    "keenable",
    "firecrawl",
    "parallel",
    "perplexity"
  ],
  "engineConfigs": {
    "deepseek": {
      "timeout": 15000
    },
    "bing": {
      "timeout": 6000,
      "market": "zh-CN"
    },
    "ddg": {
      "timeout": 8000
    },
    "searxng": {
      "timeout": 6000,
      "instances": ["https://searx.be", "https://search.ononoki.org"]
    },
    "tavily": {
      "timeout": 10000,
      "keyRef": "TAVILY_API_KEY"
    },
    "anysearch": {
      "timeout": 8000
    },
    "exa": {
      "timeout": 10000,
      "keyRef": "EXA_API_KEY"
    },
    "keenable": {
      "timeout": 15000,
      "keyRef": "KEENABLE_API_KEY"
    },
    "firecrawl": {
      "timeout": 12000,
      "keyRef": "FIRECRAWL_API_KEY"
    },
    "parallel": {
      "timeout": 15000,
      "keyRef": "PARALLEL_API_KEY"
    },
    "perplexity": {
      "timeout": 15000,
      "keyRef": "PERPLEXITY_API_KEY"
    }
  }
}
```

---

## 2. 字段属性详解

### 根级字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `defaultTimeout` | `number` | 否 | `8000` | 全局默认请求超时时间（毫秒）。当单引擎未配置专属超时时生效。 |
| `enginesOrder` | `string[]` | 是 | 内置顺序（`deepseek`、`bing`、`ddg`、`searxng`、`tavily`、`anysearch`、`exa`、`keenable`、`firecrawl`、`parallel`、`perplexity`） | **已启用**引擎的顺序列表。数组下标即为搜索时的优先执行与重试顺序。 |
| `engineConfigs` | `object` | 否 | `{}` | 各搜索引擎的独立个性化配置字典，键名为引擎 ID。 |

该文件仅由宿主路由 `/api/cust-search/get-config` 与 `/api/cust-search/set-config` 读写，设置页面不会直接操作它。

这两个路由注册在 DSH 共享的 `/api` 通道上，由 `@deepseek-ai/dsh-client-connection` 在分发前依次完成 Host/Origin 校验、浏览器或 API 凭据校验，并以 owner Peer 身份放行。未携带 cookie 的请求（包括直接 `curl`）会得到 `401`，Host/Origin 不可信时得到 `403`；请打开 `dsh web` 启动时打印的带 token 链接以建立会话。监听器启用 TLS 时 cookie 会带 `Secure`，非浏览器 API 调用方则通过 `GET /connect?token=...` 换取 API cookie。

---

### `engineConfigs` 各引擎独立配置参数

| 引擎 ID | 配置项 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| **通用（所有引擎）** | `timeout` | `number` | 单次引擎尝试的时间预算（毫秒）。设置后完全取代 `defaultTimeout`；适配器不再自带超时，因此该值是唯一权威，而不是上限。 |
| **通用（Keyed 引擎）** | `keyRef` | `string` | 动态环境变量/凭据键名（如 `MY_TAVILY_KEY`）。 |
| `bing` | `market` | `string` | 市场区域代码（如 `zh-CN`, `en-US`），用于本地化优化搜索结果。 |
| `searxng` | `instances` | `string[]` | 自定义 SearXNG 实例 URL 列表，发起检索时自动负载轮换。 |

---

## 3. 启用与禁用机制

1. **启用判定**：只要引擎 ID 存在于 `enginesOrder` 数组中，该引擎即处于**启用**状态；其在数组中的索引位置决定了首选及重试顺位。
2. **禁用判定**：将引擎移出 `enginesOrder` 数组后，该引擎即被**禁用**，搜索时完全跳过。
3. **新增引擎保护**：当插件版本升级新增引擎时，已存在的 `cust_search.json` 保留原有列表，新引擎默认作为“已禁用”卡片展示，需用户在界面上手动开启。
