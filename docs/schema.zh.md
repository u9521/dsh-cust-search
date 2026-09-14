# 存储结构与 JSON Schema 规范

[English](schema.md) | 中文

`dsh-cust-search` 插件的持久化配置保存在独立的用户存储目录中，不修改系统或宿主配置文件。

- **存储文件路径**：`~/.dsh/storages/cust_search.json`
- **安全特性**：API Key 等敏感凭据通过 DSH 凭据服务 (`ctx.credentials`) 管理，**绝不会明文写入该 JSON 文件**。

---

## 1. 完整配置示例

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
| `enginesOrder` | `string[]` | 是 | `[]` | **已启用**引擎的顺序列表。数组下标即为搜索时的优先执行与重试顺序。 |
| `engineConfigs` | `object` | 否 | `{}` | 各搜索引擎的独立个性化配置字典，键名为引擎 ID。 |

---

### `engineConfigs` 各引擎独立配置参数

| 引擎 ID | 配置项 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| **通用（所有引擎）** | `timeout` | `number` | 单引擎独立超时时间（毫秒）。设置后覆盖 `defaultTimeout`。 |
| **通用（Keyed 引擎）** | `keyRef` | `string` | 动态环境变量/凭据键名（如 `MY_TAVILY_KEY`）。 |
| `bing` | `market` | `string` | 市场区域代码（如 `zh-CN`, `en-US`），用于本地化优化搜索结果。 |
| `searxng` | `instances` | `string[]` | 自定义 SearXNG 实例 URL 列表，发起检索时自动负载轮换。 |

---

## 3. 启用与禁用机制

1. **启用判定**：只要引擎 ID 存在于 `enginesOrder` 数组中，该引擎即处于**启用**状态；其在数组中的索引位置决定了首选及重试顺位。
2. **禁用判定**：将引擎移出 `enginesOrder` 数组后，该引擎即被**禁用**，搜索时完全跳过。
3. **新增引擎保护**：当插件版本升级新增引擎时，已存在的 `cust_search.json` 保留原有列表，新引擎默认作为“已禁用”卡片展示，需用户在界面上手动开启。
