# dsh-cust-search

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![DSH Compatibility](https://img.shields.io/badge/DSH-%3E%3D0.1.7--rc.2-brightgreen.svg)](https://github.com/deepseek-ai/deepseek-harness)
[![Node Version](https://img.shields.io/badge/Node-%5E22.19%20%7C%7C%20%3E%3D24-blue.svg)](https://nodejs.org/)

[English](README.md) | 中文

DeepSeek Harness (DSH) WebUI 多引擎顺序搜索插件，按顺序尝试多个搜索引擎，当前引擎搜不到或报错时自动换下一个。

---

## 界面预览

### 1. 配置界面
![配置界面](docs/pics/config.png)

### 2. 排序模式
![排序模式](docs/pics/sorting.png)

### 3. 搜索测试
![搜索测试](docs/pics/testing.png)

---

## 核心特性

- **多引擎按顺序搜索**：搜索时按排好的顺序依次尝试。如果前面的引擎遇到网络问题、Key 失效或超时，会自动换下一个已开启的引擎接着搜，直到搜出结果为止。
- **支持 11 款搜索引擎**：内置 DeepSeek 官方直连、免费网页搜索（Bing、DuckDuckGo、SearXNG）以及 AI 智能搜索（Tavily、Exa、Firecrawl、Parallel、Perplexity 等）。

---

## 支持的搜索引擎

| 引擎名称 | 引擎 ID | 接入类型 | 凭据配置 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| **DeepSeek Official** | `deepseek` | `Bridge` | 官方插件设置页 | 直连官方 `deepseek-official` 提供方 |
| **Bing** | `bing` | `Free` | 无需凭据 | 语言区域驱动网页检索 |
| **DuckDuckGo** | `ddg` | `Free` | 无需凭据 | HTML 主通道，失败降级 Lite 通道 |
| **SearXNG** | `searxng` | `Free` | 无需凭据 | 自动轮询公共实例，支持配置自定义实例 |
| **Tavily** | `tavily` | `Keyed` | `TAVILY_API_KEY` | 有 Key 走高质量接口，无 Key 走共享通道 |
| **AnySearch** | `anysearch` | `Free` | 无需凭据 | 免费免 Key 结构化 AI 搜索 |
| **Exa** | `exa` | `Keyed` | `EXA_API_KEY` | 神经语义搜索，有 Key 走 REST，无 Key 走公共 MCP |
| **Keenable** | `keenable` | `Keyed` | `KEENABLE_API_KEY` | 实时网络检索，有 Key 走 REST，无 Key 走免 Key MCP |
| **Firecrawl** | `firecrawl` | `Keyed` | `FIRECRAWL_API_KEY` | 深度网页抓取与解析，支持免 Key 匿名配额 |
| **Parallel** | `parallel` | `Keyed` | `PARALLEL_API_KEY` | AI 目标检索，无 Key 走免认证 Streamable HTTP MCP |
| **Perplexity** | `perplexity` | `Keyed` | `PERPLEXITY_API_KEY` | Sonar 大模型生成式检索，带引用来源 |

> `deepseek` 直连引擎复用官方 `deepseek-official` 提供方。`@deepseek-ai/dsh-web` 未公开「按 ID 取 provider」的接口，因此该引擎直接读取 web 运行时的 provider 注册表（收敛在 `src/server/engines/deepseek.ts` 一处）；若该内部结构变化，引擎会降级为「不可用」而不是让整个搜索失败。

---

## DSH 版本兼容性

| 插件版本 | 兼容 DSH 版本 | 说明 |
| :--- | :--- | :--- |
| **main（当前）** | **`>= 0.1.7-rc.2`** | 对齐 DSH 客户端插槽、i18n、图标与 web seam 契约；由 `cordis.patch.yml` 声明式固定 `web.searchProvider` |

---

## 快速安装 (推荐 / 一行命令)

通过 GitHub `dist` 分支安装（由 CI 自动构建产物，无需本地编译）：

```sh
dsh plugin --profile web add github:u9521/dsh-cust-search#dist
```

安装后**重启 web**（`dsh web`）并**硬刷新浏览器**（Cmd+Shift+R 或 Ctrl+F5）。配置页在插件自己的卡片上：**插件 → 已安装 → `@local/dsh-cust-search`**。

### 升级

通过 `dsh plugin update` 命令拉取最新发布版本：

```sh
dsh plugin --profile web update @local/dsh-cust-search
```

升级后**重启 web** 并**硬刷新浏览器**。

---

## 配置与存储

配置保存于独立的用户存储文件中，不修改系统配置文件：

- **存储路径**：`~/.dsh/storages/cust_search.json`
- **详细规范**：完整的配置格式与字段定义，请参阅 [存储结构与 JSON Schema 规范](docs/schema.zh.md)。

---

## 本地开发与源码构建

### 环境要求

- **pnpm**：`npm install -g pnpm`
- **Node.js**：`^22.19 || >=24`

### 1. 克隆与构建

```sh
git clone https://github.com/u9521/dsh-cust-search.git ~/.dsh/plugins/dsh-cust-search
cd ~/.dsh/plugins/dsh-cust-search
pnpm install
pnpm run build
```

### 2. 本地安装

```sh
dsh plugin --profile web add ~/.dsh/plugins/dsh-cust-search
```

安装后**重启 web**（`dsh web`）并**硬刷新浏览器**。

### 3. 本地源码升级

本地安装以软链接方式接入 profile，源码升级仅需拉取最新代码并重新构建：

```sh
cd ~/.dsh/plugins/dsh-cust-search
git pull
pnpm run build
```

---

## 常用开发命令

| 命令 | 说明 |
| :--- | :--- |
| `pnpm run build` | 完整编译构建，生成 `lib/` 产物 |
| `pnpm run check` | 仅类型检查 (`tsc --noEmit`) |
| `pnpm run lint` | 全量代码检查 (ESLint + TypeScript + Prettier) |
| `pnpm run lint:fix` | 自动修复 ESLint 规则与代码格式化 |
| `pnpm run fmt` | 用 Prettier 格式化源码与配置文件 |

---

## 卸载

```sh
dsh plugin --profile web remove @local/dsh-cust-search
```

卸载后重启 web 并硬刷新浏览器。若本地不再需要源码，可删除克隆目录：

```sh
rm -rf ~/.dsh/plugins/dsh-cust-search
```

---

## 许可证

[MIT](LICENSE) © 2026 u9521
