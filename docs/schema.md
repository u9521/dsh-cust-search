# Storage Schema Specification

English | [中文](schema.zh.md)

Persistent configuration for `dsh-cust-search` is stored in an isolated user directory without modifying system or host configuration files.

- **File Path**: `~/.dsh/storages/cust_search.json`
- **Security**: Sensitive credentials like API keys are managed through DSH credentials (`ctx.credentials`) and **are never written in plaintext to this JSON file**.

---

## 1. Complete Configuration Example

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

## 2. Field Specifications

### Root Fields

| Field | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `defaultTimeout` | `number` | No | `8000` | Global default request timeout in milliseconds when an engine does not have a dedicated timeout. |
| `enginesOrder` | `string[]` | Yes | `[]` | Ordered array of **enabled** engine IDs. The array order dictates the sequential execution and fallback priority. |
| `engineConfigs` | `object` | No | `{}` | Per-engine specific configuration map keyed by engine ID. |

---

### `engineConfigs` Field Properties

| Engine ID | Property | Type | Description |
| :--- | :--- | :--- | :--- |
| **All Engines** | `timeout` | `number` | Dedicated engine timeout in ms, overriding `defaultTimeout`. |
| **Keyed Engines** | `keyRef` | `string` | Dynamic environment variable / credential name (e.g. `MY_TAVILY_KEY`). |
| `bing` | `market` | `string` | Market region code (e.g. `zh-CN`, `en-US`) for localized search results. |
| `searxng` | `instances` | `string[]` | Custom list of SearXNG instance URLs, rotated automatically during queries. |

---

## 3. Enable / Disable Semantics

1. **Enabled Engines**: An engine whose ID is present in `enginesOrder` is **enabled**; its position determines its execution priority.
2. **Disabled Engines**: Removing an engine ID from `enginesOrder` **disables** it; it will be skipped during searches.
3. **New Engine Behavior**: When newly added engines are introduced in plugin updates, existing `cust_search.json` files keep their current list intact. New engines appear as disabled cards in Detail Mode until explicitly enabled.
