import { isCredentialRefName } from "@deepseek-ai/dsh-credentials";
import { z } from "zod";
import { defineDomain } from "@deepseek-ai/dsh-storage-domain";
import { randomUUID } from "node:crypto";
import { WebError } from "@deepseek-ai/dsh-web";
//#region lib/types/server/config.js
/**
* Wrap one opened domain.
*
* @param domain - the `cust_search` domain handle.
* @returns the store both call sites take.
*/
function createConfigStore(domain) {
	return {
		read: () => domain.global.get(),
		write: (next) => domain.global.set(next)
	};
}
//#endregion
//#region lib/types/server/domain.js
/**
* Engine-independent defaults. The domain's `initial` is exactly this value, so
* a deployment that never saved anything reads these defaults without any write
* — unlike the previous file reader, which materialized a file on first read.
*/
const DEFAULT_STORAGE = {
	defaultTimeout: 8e3,
	enginesOrder: [
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
	engineConfigs: {
		deepseek: { timeout: 15e3 },
		bing: {
			timeout: 6e3,
			market: "zh-CN"
		},
		ddg: { timeout: 6e3 },
		searxng: {
			timeout: 6e3,
			instances: []
		},
		tavily: {
			timeout: 8e3,
			keyRef: "TAVILY_API_KEY"
		},
		exa: {
			timeout: 8e3,
			keyRef: "EXA_API_KEY"
		},
		anysearch: { timeout: 8e3 },
		keenable: {
			timeout: 15e3,
			keyRef: "KEENABLE_API_KEY"
		},
		firecrawl: {
			timeout: 12e3,
			keyRef: "FIRECRAWL_API_KEY"
		},
		parallel: {
			timeout: 15e3,
			keyRef: "PARALLEL_API_KEY"
		},
		perplexity: {
			timeout: 15e3,
			keyRef: "PERPLEXITY_API_KEY"
		}
	}
};
/**
* One engine's overrides. Loose on purpose: engine ids and their specific knobs
* are data (the settings page can add a `keyRef` to any engine), so an unknown
* field must survive a read/write round trip instead of being stripped.
*/
const engineSpecificConfig = z.looseObject({
	timeout: z.number().positive().optional(),
	keyRef: z.string().optional(),
	market: z.string().optional(),
	instances: z.array(z.string()).optional()
});
/**
* The whole persisted configuration. Validation happens at the durability
* boundary, so a hand-edited or truncated file fails the open loudly instead of
* being silently replaced by defaults.
*/
const custSearchStorageSchema = z.object({
	defaultTimeout: z.number().positive().default(DEFAULT_STORAGE.defaultTimeout),
	enginesOrder: z.array(z.string()).default([...DEFAULT_STORAGE.enginesOrder]),
	engineConfigs: z.record(z.string(), engineSpecificConfig).default({ ...DEFAULT_STORAGE.engineConfigs })
});
/**
* The `cust_search` storage domain. The default `single` layout keeps the whole
* configuration in one atomically republished `cust_search.json`, which is the
* shape this plugin's reads and writes actually have: one ordered engine list
* plus its per-engine settings, never independent records.
*/
const custSearchDomainSpec = defineDomain({
	name: "cust_search",
	version: 1,
	global: {
		schema: custSearchStorageSchema,
		initial: DEFAULT_STORAGE
	},
	tables: {}
});
//#endregion
//#region lib/types/server/engines/result.js
/**
* What a usable search result is.
*
* Every adapter used to restate this: `uniqueSources()`, an `if (sources.length
* === 0) throw`, a `truncated: false` literal, and — in some adapters only — a
* 300-character snippet cap. The rule now lives here, once, so "empty means
* failed" and "snippets are capped" are properties of the seam rather than
* conventions an adapter might forget.
*
* @module @local/dsh-cust-search/server/engines/result
*/
/** Longest snippet a result may carry. */
const SNIPPET_LIMIT = 300;
/**
* An adapter failed in a way the user can act on.
*
* Distinguishing this from a transport failure lets the caller skip an engine
* that needs a key while still reporting a real outage.
*/
var EngineResultError = class extends Error {
	/** Which engine produced no usable result. */
	engineId;
	constructor(engineId, reason) {
		super(`${engineId}: ${reason}`);
		this.name = "EngineResultError";
		this.engineId = engineId;
	}
};
/**
* Shape one adapter's raw rows into a result the seam can accept.
*
* @param engineId - the engine the rows came from, used in the failure message.
* @param sources - raw rows; URLs are required, everything else is optional.
* @param content - provider-generated answer text, when the adapter has one.
* @returns a deduplicated, snippet-capped, non-empty result.
* @throws {EngineResultError} when no row carries a URL.
*/
function toResult(engineId, sources, content) {
	const seen = /* @__PURE__ */ new Set();
	const shaped = [];
	for (const source of sources) {
		if (!source.url || seen.has(source.url)) continue;
		seen.add(source.url);
		shaped.push({
			url: source.url,
			...source.title ? { title: source.title } : {},
			...source.snippet ? { snippet: source.snippet.slice(0, 300) } : {},
			...source.publishedAt ? { publishedAt: source.publishedAt } : {}
		});
	}
	if (shaped.length === 0) throw new EngineResultError(engineId, "returned no usable results");
	return {
		...content ? { content } : {},
		sources: shaped,
		truncated: false
	};
}
//#endregion
//#region lib/types/server/engines/deepseek.js
/**
* Official DeepSeek search providers, in preference order.
*
* Two of them exist since DSH 0.2.1-rc.2:
*
* - `deepseek-search-api` (`@deepseek-ai/dsh-web-deepseek-api`) issues one direct
*   Search API request: no auxiliary model turn, and it takes a result count.
* - `deepseek-official` (`@deepseek-ai/dsh-web-search-deepseek`) runs a whole
*   Messages turn with the native `web_search` server tool.
*
* Both are "the official DeepSeek search", so the engine chain exposes them as
* one engine and prefers the direct API: it is the cheaper, bounded request, and
* its sources carry snippets and dates the Messages provider only derives from
* citations. The list is the whole priority policy, in one place.
*/
const OFFICIAL_PROVIDER_IDS = ["deepseek-search-api", "deepseek-official"];
/**
* Bridges the official DeepSeek search provider into the engine chain.
*
* The lookup is a constructor argument rather than a field on the engine
* context: reading the web runtime's private registry is this bridge's business
* alone, and no other adapter should have to be told the runtime exists.
*/
var DeepSeekBridgeEngine = class {
	id = "deepseek";
	type = "bridge";
	lookup;
	/**
	* @param lookup - resolves the official provider, or undefined when absent.
	*/
	constructor(lookup = () => void 0) {
		this.lookup = lookup;
	}
	async search(request, _ctx, signal) {
		const official = this.lookup();
		if (!official) throw new Error("no official DeepSeek search provider is registered (enable web-deepseek-api or web-search-deepseek)");
		const result = await official.search({
			query: request.query,
			maxResults: request.maxResults
		}, signal);
		return toResult(this.id, result.sources, result.content);
	}
};
/**
* Read the preferred official provider out of the web runtime's registry.
*
* `@deepseek-ai/dsh-web` publishes no "provider registered under id X"
* accessor: `WebRuntime.search()` resolves the provider *configuration*
* selects, which is this plugin itself. This is the one place the private
* registry shape is read, and it degrades to "absent" rather than throwing so a
* changed runtime shape disables the bridge instead of breaking every search.
*
* Preference is two passes, not one:
*
* 1. The first provider that reports itself usable. A provider whose credential
*    is missing must not shadow one that is configured.
* 2. Otherwise the first *registered* provider anyway. Calling it would fail,
*    but its own error names the missing key and where to set it — far more
*    actionable than "nothing is registered" when the real problem is an
*    unconfigured key. Availability is a routing hint, never a verdict.
*
* @param web - the `ctx.web` service.
* @returns the preferred official provider, or undefined when none is registered.
*/
function officialProviderOf(web) {
	const registry = web;
	const registered = OFFICIAL_PROVIDER_IDS.map((id) => registry?.searchProviders?.get(id)).filter((provider) => provider !== void 0);
	return registered.find(isUsable) ?? registered[0];
}
/** Whether a provider reports itself runnable, treating a throwing check as "no". */
function isUsable(provider) {
	try {
		return provider.available();
	} catch {
		return false;
	}
}
/**
* Which search provider the web seam will actually select, when it can be told.
*
* This plugin pins `web.searchProvider` to itself from its bundle patch, but the
* official Web search settings page writes that same field: flipping its switch
* is a deliberate user action, and the profile layer outranks a bundle layer, so
* the pin loses and this plugin is silently deselected. The host warns at
* startup instead of leaving that invisible.
*
* Best-effort by design — the field is private, and a runtime that renames or
* hides it reports `undefined`, which reads as "cannot tell" rather than
* producing a false alarm.
*
* @param web - the `ctx.web` service.
* @returns the configured provider id, or undefined when nothing pins one.
*/
function selectedSearchProviderOf(web) {
	const configured = web?.config?.searchProvider?.get?.();
	if (typeof configured === "string") return configured;
	const ambient = process.env.DSH_WEB_SEARCH_PROVIDER;
	return ambient && ambient.length > 0 ? ambient : void 0;
}
//#endregion
//#region lib/types/server/engines/base.js
const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const DEFAULT_ACCEPT_LANG = "zh-CN,zh;q=0.9,en;q=0.8";
function decodeEntities(text) {
	return String(text).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
function stripTags(html) {
	return decodeEntities(String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}
function extractDdgUrl(rel) {
	if (!rel) return null;
	const m = rel.match(/uddg=([^&]+)/);
	if (m) try {
		return decodeURIComponent(m[1]);
	} catch {
		return m[1];
	}
	if (rel.startsWith("//")) return `https:${rel}`;
	return rel;
}
/**
* Fetch one HTML page for a scraping engine.
*
* The call's time budget already arrived as `signal`, so this adds no timer of
* its own — it used to schedule a 12 s one that outlived every failure path.
*
* @param url - the page to fetch.
* @param signal - the call's abort signal, from the caller's `Deadline`.
* @param acceptLang - `Accept-Language` header value.
* @returns the response body.
* @throws when the response is not OK or carries an anti-bot challenge.
*/
async function fetchHtml(url, signal, acceptLang) {
	const response = await fetch(url, {
		headers: {
			"user-agent": DEFAULT_USER_AGENT,
			"accept-language": acceptLang ?? "zh-CN,zh;q=0.9,en;q=0.8"
		},
		signal,
		redirect: "follow"
	});
	if (!response.ok) throw new Error(`HTTP ${response.status} from ${url.split("?")[0]}`);
	const html = await response.text();
	if (response.status === 202 || /anomaly|captcha|unusual traffic|robot check/i.test(html.slice(0, 4e3))) throw new Error("Search provider returned anti-bot challenge or rate limit");
	return html;
}
/**
* Fetch one HTML page, retrying once on a transport failure or an empty body.
*
* @param url - the page to fetch.
* @param signal - the call's abort signal.
* @param acceptLang - `Accept-Language` header value.
* @param maxAttempts - total attempts; the caller's deadline still bounds them.
* @returns the response body.
*/
async function fetchHtmlWithRetry(url, signal, acceptLang, maxAttempts = 2) {
	let lastError;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const html = await fetchHtml(url, signal, acceptLang);
			if (html.length > 500) return html;
		} catch (error) {
			lastError = error;
			if (signal.aborted) throw error;
		}
		if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 1e3));
	}
	throw lastError ?? /* @__PURE__ */ new Error("fetch failed with empty body");
}
//#endregion
//#region lib/types/server/engines/bing.js
const BING_URL = "https://www.bing.com/search";
const LANG_PROFILES = {
	zh: {
		market: "zh-CN",
		acceptLang: "zh-CN,zh;q=0.9,en;q=0.8"
	},
	en: {
		market: "en-US",
		acceptLang: "en-US,en;q=0.9"
	},
	ru: {
		market: "ru-RU",
		acceptLang: "ru-RU,ru;q=0.9,en;q=0.8"
	},
	ja: {
		market: "ja-JP",
		acceptLang: "ja-JP,ja;q=0.9,en;q=0.8"
	},
	de: {
		market: "de-DE",
		acceptLang: "de-DE,de;q=0.9,en;q=0.8"
	},
	fr: {
		market: "fr-FR",
		acceptLang: "fr-FR,fr;q=0.9,en;q=0.8"
	},
	es: {
		market: "es-ES",
		acceptLang: "es-ES,es;q=0.9,en;q=0.8"
	},
	ko: {
		market: "ko-KR",
		acceptLang: "ko-KR,ko;q=0.9,en;q=0.8"
	}
};
var BingSearchEngine = class {
	id = "bing";
	type = "free";
	async search(request, ctx, signal) {
		const market = typeof ctx.engineConfig.market === "string" && ctx.engineConfig.market || "zh-CN";
		const acceptLang = LANG_PROFILES.zh.acceptLang;
		const params = new URLSearchParams({
			q: request.query,
			mkt: market,
			adlt: "off"
		});
		const blocks = (await fetchHtmlWithRetry(`${BING_URL}?${params}`, signal, acceptLang)).match(/<li class="b_algo"[\s\S]*?<\/li>/g) ?? [];
		const sources = [];
		for (const block of blocks) {
			const hrefMatch = block.match(/<a[^>]*href="(https?:\/\/[^"]+)"/);
			const titleMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*>(.*?)<\/a>[\s\S]*?<\/h2>/);
			const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/);
			if (!hrefMatch) continue;
			sources.push({
				url: hrefMatch[1],
				...titleMatch ? { title: stripTags(titleMatch[1]) } : {},
				...snippetMatch ? { snippet: stripTags(snippetMatch[1]) } : {}
			});
		}
		return toResult(this.id, sources);
	}
};
//#endregion
//#region lib/types/server/engines/duckduckgo.js
const DDG_HTML_URL = "https://html.duckduckgo.com/html/";
const DDG_LITE_URL = "https://lite.duckduckgo.com/lite/";
var DuckDuckGoSearchEngine = class {
	id = "ddg";
	type = "free";
	async search(request, _ctx, signal) {
		try {
			return await this.searchHtml(request, signal);
		} catch (error) {
			if (signal.aborted || signal.aborted) throw error;
			return await this.searchLite(request, signal);
		}
	}
	async searchHtml(request, signal) {
		const params = new URLSearchParams({
			q: request.query,
			adlt: "-1"
		});
		const blocks = (await fetchHtmlWithRetry(`${DDG_HTML_URL}?${params}`, signal)).match(/<div class="result results_links[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g) ?? [];
		const sources = [];
		for (const block of blocks) {
			const urlMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]*)"/);
			const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*>(.*?)<\/a>/);
			const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/);
			const dateMatch = block.match(/<span[^>]*>\s*([\dT:.+-]+)\s*<\/span>/);
			const url = extractDdgUrl(urlMatch?.[1]);
			if (!url) continue;
			sources.push({
				url,
				...titleMatch ? { title: stripTags(titleMatch[1]) } : {},
				...snippetMatch ? { snippet: stripTags(snippetMatch[1]) } : {},
				...dateMatch ? { publishedAt: dateMatch[1] } : {}
			});
		}
		return toResult(this.id, sources);
	}
	async searchLite(request, signal) {
		const params = new URLSearchParams({
			q: request.query,
			adlt: "-1"
		});
		const html = await fetchHtmlWithRetry(`${DDG_LITE_URL}?${params}`, signal);
		const linkMatches = html.match(/<a[^>]*class=['"]result-link['"][^>]*>[\s\S]*?<\/a>/g) ?? [];
		const snippetMatches = html.match(/class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/g) ?? [];
		const sources = [];
		for (let i = 0; i < linkMatches.length; i++) {
			const tag = linkMatches[i];
			const hrefMatch = tag.match(/href="([^"]*)"/);
			const titleMatch = tag.match(/class=['"]result-link['"][^>]*>(.*?)<\/a>/);
			if (!hrefMatch) continue;
			const url = extractDdgUrl(hrefMatch[1]);
			if (!url) continue;
			const snippet = snippetMatches[i]?.match(/class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/)?.[1];
			sources.push({
				url,
				...titleMatch ? { title: stripTags(titleMatch[1]) } : {},
				...snippet ? { snippet: stripTags(snippet) } : {}
			});
		}
		return toResult(this.id, sources);
	}
};
//#endregion
//#region lib/types/server/engines/request.js
/**
* One outbound HTTP request made on behalf of a search engine.
*
* Every adapter calls this instead of `fetch` directly. It owns exactly one
* thing the adapters used to repeat: a network failure reported in the engine's
* own vocabulary instead of as a bare `TypeError`. A timeout is NOT classified
* here — the runner owns the budget and therefore owns the answer to "was this
* slow or broken"; this module only refuses to guess.
*
* @module @local/dsh-cust-search/server/engines/request
*/
/** A request that failed before any usable response existed. */
var EngineRequestError = class extends Error {
	/** The engine the failing request belonged to. */
	engineName;
	constructor(engineName, detail, options) {
		super(`${engineName} request failed: ${detail}`, options);
		this.name = "EngineRequestError";
		this.engineName = engineName;
	}
};
/**
* Issue one request under a deadline.
*
* A non-2xx response is a result, not a throw: adapters own their status
* handling because the useful explanation differs per API (401 means "fix the
* key", 429 means "wait", 402 means "pay"). Only transport failures — no
* response at all — are normalized here, and an abort is never reinterpreted.
*
* @param engineName - display name used in the failure message.
* @param url - absolute request URL.
* @param init - request options; `signal` is replaced by the call's signal.
* @param signal - the call's abort signal.
* @returns the response, whatever its status.
* @throws {EngineRequestError} when the request never produced a response.
*/
async function engineRequest(engineName, url, init, signal) {
	try {
		return await fetch(url, {
			...init,
			signal
		});
	} catch (error) {
		if (signal.aborted) throw error;
		throw new EngineRequestError(engineName, error instanceof Error ? error.message : String(error), { cause: error });
	}
}
//#endregion
//#region lib/types/server/engines/searxng.js
const DEFAULT_INSTANCES = [
	"https://opnxng.com",
	"https://priv.au",
	"https://searx.be",
	"https://searx.tiekoetter.com",
	"https://search.inetol.net",
	"https://paulgo.io"
];
var SearxngSearchEngine = class {
	id = "searxng";
	type = "free";
	async search(request, ctx, signal) {
		const custom = ctx.engineConfig.instances;
		const instances = Array.isArray(custom) && custom.length > 0 ? custom : DEFAULT_INSTANCES;
		const errors = [];
		for (const base of instances) {
			if (signal.aborted) break;
			try {
				const params = new URLSearchParams({
					q: request.query,
					format: "json"
				});
				const response = await engineRequest(`SearXNG ${base}`, `${base}/search?${params}`, { headers: {
					"user-agent": DEFAULT_USER_AGENT,
					accept: "application/json"
				} }, signal);
				if (!response.ok) {
					errors.push(`${base}: HTTP ${response.status}`);
					continue;
				}
				const data = await response.json().catch(() => null);
				if (!data || !Array.isArray(data.results)) {
					errors.push(`${base}: invalid JSON`);
					continue;
				}
				const sources = data.results.filter((r) => Boolean(r.url)).map((r) => ({
					url: r.url,
					...r.title ? { title: String(r.title) } : {},
					...r.content ? { snippet: String(r.content) } : {}
				}));
				if (sources.length > 0) return toResult(this.id, sources);
				errors.push(`${base}: 0 results`);
			} catch (error) {
				errors.push(`${base}: ${error instanceof Error ? error.message : String(error)}`);
				if (signal.aborted) break;
			}
		}
		throw new Error(`All SearXNG instances failed: ${errors.join("; ").slice(0, 200)}`);
	}
};
//#endregion
//#region lib/types/server/engines/tavily.js
const TAVILY_URL = "https://api.tavily.com/search";
var TavilySearchEngine = class {
	id = "tavily";
	type = "keyed";
	defaultKeyRef = "TAVILY_API_KEY";
	async search(request, ctx, signal) {
		const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef;
		const apiKey = await ctx.resolveApiKey(keyRef);
		const response = await engineRequest("Tavily", TAVILY_URL, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json",
				...apiKey ? { authorization: `Bearer ${apiKey}` } : { "x-tavily-access-mode": "keyless" }
			},
			body: JSON.stringify({
				query: request.query,
				max_results: Math.min(request.maxResults || 5, 20),
				search_depth: "basic"
			}),
			redirect: "error"
		}, signal);
		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			throw new Error(`Tavily API error (HTTP ${response.status}): ${detail.slice(0, 150)}`);
		}
		const sources = ((await response.json()).results ?? []).filter((r) => Boolean(r.url)).map((r) => ({
			url: r.url,
			...r.title ? { title: String(r.title) } : {},
			...r.content ? { snippet: String(r.content) } : {}
		}));
		return toResult(this.id, sources);
	}
};
//#endregion
//#region lib/types/server/engines/anysearch.js
const ANYSEARCH_URL = "https://api.anysearch.com/v1/search";
var AnysearchSearchEngine = class {
	id = "anysearch";
	type = "free";
	async search(request, _ctx, signal) {
		const response = await engineRequest("AnySearch", ANYSEARCH_URL, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				query: request.query,
				max_results: request.maxResults || 5
			})
		}, signal);
		if (!response.ok) throw new Error(`AnySearch API error (HTTP ${response.status})`);
		const data = await response.json();
		if (data.code !== 0) throw new Error(`AnySearch API error: ${data.message ?? data.code}`);
		const sources = (data.data?.results ?? []).filter((r) => Boolean(r.url)).map((r) => ({
			url: r.url,
			...r.title ? { title: String(r.title) } : {},
			...r.snippet ? { snippet: String(r.snippet) } : {}
		}));
		return toResult(this.id, sources);
	}
};
//#endregion
//#region lib/types/server/engines/exa.js
const EXA_REST_URL = "https://api.exa.ai/search";
const EXA_MCP_URL = "https://mcp.exa.ai/mcp";
var ExaSearchEngine = class {
	id = "exa";
	type = "keyed";
	defaultKeyRef = "EXA_API_KEY";
	async search(request, ctx, signal) {
		const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef;
		const key = await ctx.resolveApiKey(keyRef);
		return key ? await this.searchRest(request, key, signal) : await this.searchMcp(request, signal);
	}
	async searchRest(request, apiKey, signal) {
		const response = await engineRequest("Exa", EXA_REST_URL, {
			method: "POST",
			headers: {
				authorization: `Bearer ${apiKey}`,
				"content-type": "application/json",
				accept: "application/json"
			},
			body: JSON.stringify({
				query: request.query,
				type: "auto",
				contents: { highlights: { highlightsPerUrl: 1 } },
				numResults: request.maxResults || 5
			})
		}, signal);
		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			throw new Error(`Exa API error (HTTP ${response.status}): ${detail.slice(0, 150)}`);
		}
		const data = await response.json();
		const sources = [];
		for (const r of data.results ?? []) {
			const snippet = r.highlights?.find((h) => h.trim().length > 0);
			if (!r.url || !snippet) continue;
			sources.push({
				url: r.url,
				...r.title ? { title: r.title } : {},
				snippet,
				...r.publishedDate ? { publishedAt: r.publishedDate } : {}
			});
		}
		return toResult(this.id, sources);
	}
	async searchMcp(request, signal) {
		const response = await engineRequest("Exa MCP", EXA_MCP_URL, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json, text/event-stream"
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: Date.now(),
				method: "tools/call",
				params: {
					name: "web_search_exa",
					arguments: {
						query: request.query,
						numResults: request.maxResults || 5
					}
				}
			})
		}, signal);
		if (!response.ok) throw new Error(`Exa MCP error (HTTP ${response.status})`);
		const text = await response.text();
		let json = null;
		for (const line of text.split("\n")) if (line.startsWith("data: ")) try {
			json = JSON.parse(line.slice(6));
			break;
		} catch {}
		if (!json || json.error) throw new Error(`Exa MCP error: ${json?.error?.message ?? "invalid response"}`);
		const textBlocks = (json.result?.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");
		const sources = [];
		for (const block of textBlocks.split(/\n(?=Title:)/)) {
			const title = block.match(/^Title: (.+)$/m)?.[1];
			const url = block.match(/^URL: (\S+)$/m)?.[1];
			const published = block.match(/^Published: (.+)$/m)?.[1];
			const highlights = block.split(/^Highlights:$/m)[1]?.split("\n").filter((l) => l.trim() && !l.trim().startsWith("...")).slice(0, 3).join(" ");
			if (!url) continue;
			sources.push({
				url,
				...title ? { title } : {},
				...highlights ? { snippet: highlights } : {},
				...published && /^\d{4}-\d{2}-\d{2}/.test(published) ? { publishedAt: published } : {}
			});
		}
		return toResult(this.id, sources);
	}
};
//#endregion
//#region lib/types/server/engines/keenable.js
const KEENABLE_URL = "https://api.keenable.ai/v1/search";
const KEENABLE_MCP_URL = "https://api.keenable.ai/mcp";
var KeenableSearchEngine = class {
	id = "keenable";
	type = "keyed";
	defaultKeyRef = "KEENABLE_API_KEY";
	async search(request, ctx, signal) {
		const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef;
		const apiKey = await ctx.resolveApiKey(keyRef);
		return apiKey ? await this.searchRest(request, apiKey, keyRef, signal) : await this.searchMcp(request, signal);
	}
	async searchRest(request, apiKey, keyRef, signal) {
		const response = await engineRequest("Keenable", KEENABLE_URL, {
			method: "POST",
			headers: {
				"x-api-key": apiKey,
				"content-type": "application/json",
				accept: "application/json"
			},
			body: JSON.stringify({
				query: request.query,
				mode: "realtime"
			}),
			redirect: "error"
		}, signal);
		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			if (response.status === 401) throw new Error(`Keenable API key is invalid (HTTP 401), update keyRef "${keyRef}" in settings`);
			throw new Error(`Keenable API error (HTTP ${response.status}): ${detail.slice(0, 150)}`);
		}
		const sources = ((await response.json()).results ?? []).filter((r) => Boolean(r.url)).map((r) => {
			const snippet = r.snippet ?? r.description;
			return {
				url: r.url,
				...r.title ? { title: String(r.title) } : {},
				...snippet ? { snippet: String(snippet) } : {},
				...r.published_at ? { publishedAt: String(r.published_at) } : {}
			};
		});
		return toResult(this.id, sources);
	}
	async searchMcp(request, signal) {
		const response = await engineRequest("Keenable MCP", KEENABLE_MCP_URL, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json, text/event-stream"
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: Date.now(),
				method: "tools/call",
				params: {
					name: "search_web_pages",
					arguments: { query: request.query }
				}
			})
		}, signal);
		if (!response.ok) throw new Error(`Keenable MCP error (HTTP ${response.status})`);
		const data = await response.json();
		if (data.error) throw new Error(`Keenable MCP error: ${data.error.message ?? "unknown error"}`);
		const text = (data.result?.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");
		if (data.result?.isError) throw new Error(`Keenable MCP error: ${text.slice(0, 200)}`);
		return toResult(this.id, this.parseMcpText(text));
	}
	/** Parse the `Title: / URL: / Snippets:` block layout returned by the MCP tool. */
	parseMcpText(text) {
		const sources = [];
		for (const block of text.split(/\n(?=Title:)/)) {
			const title = block.match(/^Title: (.+)$/m)?.[1];
			const url = block.match(/^URL: (\S+)$/m)?.[1];
			const published = block.match(/^Published: (.+)$/m)?.[1] ?? block.match(/^Acquired: (.+)$/m)?.[1];
			const snippets = block.split(/^Snippets:$/m)[1]?.split("\n").filter((line) => line.trim().length > 0).slice(0, 3).join(" ");
			if (!url) continue;
			sources.push({
				url,
				...title ? { title } : {},
				...snippets ? { snippet: snippets } : {},
				...published && /^\d{4}-\d{2}-\d{2}/.test(published) ? { publishedAt: published } : {}
			});
		}
		return sources;
	}
};
//#endregion
//#region lib/types/server/engines/firecrawl.js
const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/search";
var FirecrawlSearchEngine = class {
	id = "firecrawl";
	type = "keyed";
	defaultKeyRef = "FIRECRAWL_API_KEY";
	async search(request, ctx, signal) {
		const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef;
		const apiKey = await ctx.resolveApiKey(keyRef);
		const response = await engineRequest("Firecrawl", FIRECRAWL_URL, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json",
				...apiKey ? { authorization: `Bearer ${apiKey}` } : {}
			},
			body: JSON.stringify({
				query: request.query,
				limit: Math.min(Math.max(request.maxResults || 5, 1), 10)
			}),
			redirect: "error"
		}, signal);
		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			if (response.status === 401) throw new Error(`Firecrawl API key is invalid (HTTP 401), update keyRef "${keyRef}" in settings`);
			if (response.status === 429) throw new Error(`Firecrawl rate limit exceeded (HTTP 429), configure keyRef "${keyRef}" for higher limits`);
			throw new Error(`Firecrawl API error (HTTP ${response.status}): ${detail.slice(0, 150)}`);
		}
		const sources = ((await response.json()).data?.web ?? []).filter((r) => Boolean(r.url)).map((r) => ({
			url: r.url,
			...r.title ? { title: String(r.title) } : {},
			...r.description ? { snippet: String(r.description) } : {}
		}));
		return toResult(this.id, sources);
	}
};
//#endregion
//#region lib/types/server/engines/parallel.js
const PARALLEL_URL = "https://api.parallel.ai/v1/search";
const PARALLEL_MCP_URL = "https://search.parallel.ai/mcp";
const PARALLEL_MCP_PROTOCOL_VERSION = "2025-03-26";
const PARALLEL_MCP_SESSION_ID = randomUUID();
let nextRpcRequestId = 1;
function createRpcRequestId() {
	return nextRpcRequestId++;
}
var ParallelSearchEngine = class {
	id = "parallel";
	type = "keyed";
	defaultKeyRef = "PARALLEL_API_KEY";
	async search(request, ctx, signal) {
		const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef;
		const apiKey = await ctx.resolveApiKey(keyRef);
		return apiKey ? await this.searchRest(request, apiKey, keyRef, signal) : await this.searchMcp(request, signal);
	}
	async searchRest(request, apiKey, keyRef, signal) {
		const response = await engineRequest("Parallel", PARALLEL_URL, {
			method: "POST",
			headers: {
				"x-api-key": apiKey,
				"content-type": "application/json",
				accept: "application/json"
			},
			body: JSON.stringify({
				objective: request.query,
				search_queries: [request.query],
				mode: "fast",
				advanced_settings: { max_results: Math.min(Math.max(request.maxResults || 5, 1), 20) }
			}),
			redirect: "error"
		}, signal);
		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			if (response.status === 401 || response.status === 403) throw new Error(`Parallel API key is invalid (HTTP ${response.status}), update keyRef "${keyRef}" in settings`);
			if (response.status === 402) throw new Error(`Parallel quota or billing error (HTTP 402): ${detail.slice(0, 150)}`);
			throw new Error(`Parallel API error (HTTP ${response.status}): ${detail.slice(0, 150)}`);
		}
		const data = await response.json();
		return toResult(this.id, this.toSources(data.results ?? []));
	}
	async searchMcp(request, signal) {
		const initResponse = await this.postMcp({
			jsonrpc: "2.0",
			id: createRpcRequestId(),
			method: "initialize",
			params: {
				protocolVersion: PARALLEL_MCP_PROTOCOL_VERSION,
				capabilities: {},
				clientInfo: {
					name: "dsh-cust-search",
					version: "0.1.0"
				}
			}
		}, void 0, signal);
		if (!initResponse.ok) {
			const detail = await initResponse.text().catch(() => "");
			throw new Error(`Parallel MCP initialize error (HTTP ${initResponse.status}): ${detail.slice(0, 150)}`);
		}
		const sessionId = initResponse.headers.get("mcp-session-id") ?? void 0;
		await this.readMcpPayload(initResponse, "initialize");
		const initializedResponse = await this.postMcp({
			jsonrpc: "2.0",
			method: "notifications/initialized"
		}, sessionId, signal);
		if (!initializedResponse.ok) {
			const detail = await initializedResponse.text().catch(() => "");
			throw new Error(`Parallel MCP initialized notification error (HTTP ${initializedResponse.status}): ${detail.slice(0, 150)}`);
		}
		const response = await this.postMcp({
			jsonrpc: "2.0",
			id: createRpcRequestId(),
			method: "tools/call",
			params: {
				name: "web_search",
				arguments: {
					objective: request.query,
					search_queries: [request.query],
					session_id: PARALLEL_MCP_SESSION_ID
				}
			}
		}, sessionId, signal);
		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			throw new Error(`Parallel MCP error (HTTP ${response.status}): ${detail.slice(0, 150)}`);
		}
		const result = (await this.readMcpPayload(response, "web_search")).result;
		const text = (result?.content ?? []).filter((block) => block.type === "text").map((block) => block.text ?? "").join("\n");
		if (result?.isError) throw new Error(`Parallel MCP error: ${text.slice(0, 200)}`);
		return toResult(this.id, this.toSources(result?.structuredContent?.results ?? this.parseMcpSearchResults(text)));
	}
	async postMcp(body, sessionId, signal) {
		const headers = {
			"content-type": "application/json",
			accept: "application/json, text/event-stream"
		};
		if (sessionId) {
			headers["mcp-session-id"] = sessionId;
			headers["mcp-protocol-version"] = PARALLEL_MCP_PROTOCOL_VERSION;
		}
		return await engineRequest("Parallel MCP", PARALLEL_MCP_URL, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
			redirect: "error"
		}, signal);
	}
	async readMcpPayload(response, label) {
		const contentType = response.headers.get("content-type") ?? "";
		const text = await response.text();
		let payload;
		if (contentType.includes("text/event-stream")) payload = this.parseMcpEventStream(text, label);
		else try {
			payload = JSON.parse(text);
		} catch {
			throw new Error(`Parallel MCP ${label} returned invalid JSON`);
		}
		if (payload.error) throw new Error(`Parallel MCP ${label} error: ${payload.error.message ?? "unknown error"}`);
		return payload;
	}
	parseMcpEventStream(text, label) {
		for (const event of text.split(/\r?\n\r?\n/)) {
			const data = event.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
			if (!data) continue;
			try {
				const payload = JSON.parse(data);
				if (payload.error || payload.result !== void 0 || payload.id) return payload;
			} catch {}
		}
		throw new Error(`Parallel MCP ${label} returned an invalid event stream`);
	}
	/** Parse the JSON payload carried in the `web_search` text content block. */
	parseMcpSearchResults(text) {
		try {
			const payload = JSON.parse(text);
			if (!Array.isArray(payload.results)) throw new Error("missing results array");
			return payload.results;
		} catch (error) {
			throw new Error(`Parallel MCP web_search returned an invalid payload: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	toSources(results) {
		return results.filter((result) => Boolean(result.url)).map((result) => {
			const excerpt = (result.excerpts ?? []).find((item) => String(item).trim().length > 0);
			return {
				url: result.url,
				...result.title ? { title: String(result.title) } : {},
				...excerpt ? { snippet: String(excerpt) } : {},
				...result.publish_date ? { publishedAt: String(result.publish_date) } : {}
			};
		});
	}
};
//#endregion
//#region lib/types/server/engines/perplexity.js
const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";
var PerplexitySearchEngine = class {
	id = "perplexity";
	type = "keyed";
	defaultKeyRef = "PERPLEXITY_API_KEY";
	async search(request, ctx, signal) {
		const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef;
		const apiKey = await ctx.resolveApiKey(keyRef);
		if (!apiKey) throw new Error(`Perplexity search requires "${keyRef}"`);
		const response = await engineRequest("Perplexity", PERPLEXITY_URL, {
			method: "POST",
			headers: {
				authorization: `Bearer ${apiKey}`,
				"content-type": "application/json",
				accept: "application/json"
			},
			body: JSON.stringify({
				model: "sonar",
				max_tokens: 1024,
				messages: [{
					role: "user",
					content: request.query
				}]
			}),
			redirect: "error"
		}, signal);
		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			if (response.status === 401) throw new Error(`Perplexity API key is invalid (HTTP 401), update keyRef "${keyRef}" in settings`);
			if (response.status === 429) throw new Error("Perplexity rate limit or quota exceeded (HTTP 429)");
			throw new Error(`Perplexity API error (HTTP ${response.status}): ${detail.slice(0, 150)}`);
		}
		const data = await response.json();
		const sources = (data.citations ?? []).filter((url) => typeof url === "string" && url.length > 0).map((url) => ({ url }));
		return toResult(this.id, sources, data.choices?.[0]?.message?.content || void 0);
	}
};
//#endregion
//#region lib/types/server/engines/deadline.js
/**
* The one place a search call is given a time budget.
*
* Every adapter used to build its own `AbortController`, its own `setTimeout`,
* and its own parent-signal bridge, with three different cleanup disciplines.
* That made the effective budget `min(engineConfig.timeout, adapter constant)`
* — invisible from any interface — and leaked a live timer plus a listener on
* every error path.
*
* @module @local/dsh-cust-search/server/engines/deadline
*/
/**
* Start one deadline.
*
* @param timeoutMs - the budget; the caller has already resolved it from
*   `engineConfig.timeout ?? defaultTimeout`.
* @param parent - the caller's signal, forwarded so a closed UI stops the work.
* @returns the deadline; call `dispose()` in a `finally`.
*/
function createDeadline(timeoutMs, parent) {
	const controller = new AbortController();
	let expired = false;
	let released = false;
	const timer = setTimeout(() => {
		expired = true;
		controller.abort();
	}, timeoutMs);
	const forward = () => controller.abort();
	if (parent) {
		if (parent.aborted) controller.abort();
		else parent.addEventListener("abort", forward, { once: true });
	}
	return {
		signal: controller.signal,
		get timedOut() {
			return expired;
		},
		dispose() {
			if (released) return;
			released = true;
			clearTimeout(timer);
			parent?.removeEventListener("abort", forward);
		}
	};
}
//#endregion
//#region lib/types/server/engines/run.js
/**
* Run one engine under one budget.
*
* This is the module the provider loop and the settings test page both call.
* They used to carry separate copies of it, and had drifted: only the provider
* forwarded the caller's signal, and only the route turned an empty result into
* a success.
*
* @module @local/dsh-cust-search/server/engines/run
*/
/** The fallback budget when nothing configured one. */
const DEFAULT_TIMEOUT_MS = 8e3;
/**
* Resolve one engine's time budget.
*
* The configuration is the only authority. Adapters used to impose their own
* constants on top, so a configured 15 000 ms silently became 12 000 ms.
*
* @param storage - the stored configuration.
* @param engineId - the engine whose slice may override the default.
* @returns the budget in milliseconds.
*/
function resolveTimeout(storage, engineId) {
	const configured = storage.engineConfigs[engineId]?.timeout;
	if (typeof configured === "number" && configured > 0) return configured;
	const fallback = storage.defaultTimeout;
	return typeof fallback === "number" && fallback > 0 ? fallback : DEFAULT_TIMEOUT_MS;
}
/**
* Build the credential resolver one run uses.
*
* The settings test page can hand over a value the user has typed but not yet
* saved; it applies only to the reference that page is editing.
*
* @param resolveApiKey - the plugin-wide resolver.
* @param override - the unsaved value, when there is one.
* @param engineConfig - this engine's configuration.
* @param engine - the engine being run.
* @returns the resolver for this call.
*/
function resolverFor(resolveApiKey, override, engineConfig, engine) {
	if (override === void 0) return resolveApiKey;
	const target = engineConfig.keyRef || engine.defaultKeyRef;
	return (keyRef) => keyRef === void 0 || keyRef === target ? Promise.resolve(override) : resolveApiKey(keyRef);
}
/**
* Run one engine and report the outcome instead of throwing.
*
* The outcome shape is the interface: the provider only needs to know whether
* to try the next engine, and the settings page only needs a duration and a
* message. Neither has to interpret an exception.
*
* @param options - engine, configuration, and the call's identity.
* @returns the outcome, including whether the budget expired.
* @throws only when the caller aborted: that is not an engine failure.
*/
async function runEngine(options) {
	const { engine, storage, query, maxResults, resolveApiKey, signal } = options;
	const engineConfig = options.engineConfigOverride ?? storage.engineConfigs[engine.id] ?? {};
	const ctx = {
		engineConfig,
		resolveApiKey: resolverFor(resolveApiKey, options.overrideApiKey, engineConfig, engine)
	};
	const deadline = createDeadline(resolveTimeout(storage, engine.id), signal);
	const startedAt = Date.now();
	try {
		return {
			ok: true,
			result: await engine.search({
				query,
				maxResults
			}, ctx, deadline.signal),
			durationMs: Date.now() - startedAt,
			timedOut: false
		};
	} catch (error) {
		const timedOut = deadline.timedOut;
		if (signal?.aborted) throw error;
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error),
			durationMs: Date.now() - startedAt,
			timedOut
		};
	} finally {
		deadline.dispose();
	}
}
//#endregion
//#region lib/types/server/engines/index.js
/**
* Build the engine registry.
*
* The adapters are stateless, so one instance serves every request; callers
* build the registry once and keep it. It used to be rebuilt per HTTP request
* just to read each adapter's `id`.
*
* @param web - the `ctx.web` service, read only by the DeepSeek bridge.
* @returns the registry.
*/
function buildEngineRegistry(web) {
	const engines = [
		new DeepSeekBridgeEngine(() => officialProviderOf(web)),
		new BingSearchEngine(),
		new DuckDuckGoSearchEngine(),
		new SearxngSearchEngine(),
		new TavilySearchEngine(),
		new AnysearchSearchEngine(),
		new ExaSearchEngine(),
		new KeenableSearchEngine(),
		new FirecrawlSearchEngine(),
		new ParallelSearchEngine(),
		new PerplexitySearchEngine()
	];
	const byId = new Map(engines.map((engine) => [engine.id, engine]));
	return {
		get: (id) => byId.get(id),
		all: () => engines,
		definitions: () => engines.map((engine) => ({
			id: engine.id,
			type: engine.type,
			...engine.defaultKeyRef ? { defaultKeyRef: engine.defaultKeyRef } : {}
		}))
	};
}
//#endregion
//#region lib/types/server/provider.js
const CUST_SEARCH_PROVIDER_ID = "cust-search";
/**
* The search provider the web seam selects.
*
* Its whole job is policy: walk the configured engine order and stop at the
* first engine that returns a usable result. Mechanics live in `runEngine`, so
* this module never touches a timer or an `AbortController`.
*/
var CustSearchProvider = class {
	id = CUST_SEARCH_PROVIDER_ID;
	options;
	constructor(options) {
		this.options = options;
	}
	available() {
		return true;
	}
	async search(request, signal) {
		if (!request || typeof request.query !== "string" || request.query.trim().length === 0) throw new WebError("Query is required for web search", "WEB_PROVIDER_ERROR");
		const storage = this.options.config.read();
		const order = storage.enginesOrder.length > 0 ? storage.enginesOrder : DEFAULT_STORAGE.enginesOrder;
		const maxResults = request.maxResults ?? 5;
		const failures = [];
		for (const engineId of order) {
			if (signal?.aborted) throw new WebError("Search request aborted", "WEB_ABORTED");
			const engine = this.options.engines.get(engineId);
			if (!engine) {
				this.options.logger?.warn?.(`cust-search: unknown engine "${engineId}", skipping`);
				continue;
			}
			const outcome = await this.options.run(engine, storage, request.query, maxResults, signal);
			if (outcome.ok && outcome.result) return outcome.result;
			const detail = outcome.error ?? "returned no usable results";
			failures.push(`${engineId}: ${detail}`);
			this.options.logger?.warn?.(`cust-search: engine "${engineId}" failed (${detail}), trying next engine`);
		}
		throw new WebError(`All configured search engines failed (${failures.join("; ") || "no usable engines"}).`, "WEB_PROVIDER_ERROR");
	}
};
//#endregion
//#region lib/types/server/routes.js
/**
* JSON response for a browser caller.
*
* `no-store` is unconditional: every payload is live host state — the stored
* config, whether a credential resolves, and per-engine test outcomes.
*/
function json(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store"
		}
	});
}
/**
* Turn a handler into a route body.
*
* All three routes answer the same envelope: `{ ok: true, data }` or
* `{ ok: false, error }` at status 500. That shape, and the same
* `instanceof Error` dance, used to be written out once per route.
*
* @param handler - the route's work.
* @returns a fetch handler that answers 500 instead of rejecting.
*/
function route(handler) {
	return async (request) => {
		try {
			return await handler(request);
		} catch (error) {
			return json({
				ok: false,
				error: error instanceof Error ? error.message : String(error)
			}, 500);
		}
	};
}
/**
* Classify where one credential reference is supplied from.
*
* `credentials.describe()` is the seam's own answer: it reports `configured`
* and the winning layer (`file` for the managed store, `env` for the process
* environment, `project-env`/`user-env` for `.env` files). The settings page
* only distinguishes "stored through this page" from "supplied by the
* environment", so the layers collapse onto two labels.
*
* @param ctx - context carrying `credentials`.
* @param keyRef - the reference named by the engine configuration.
* @returns whether a value is available, and which of the two surfaces supplies it.
*/
async function describeKey(ctx, keyRef) {
	if (!isCredentialRefName(keyRef)) {
		const ambient = process.env[keyRef];
		return ambient && ambient.length > 0 ? {
			hasKey: true,
			keySource: "env"
		} : {
			hasKey: false,
			keySource: "none"
		};
	}
	const credentials = ctx.get("credentials");
	if (credentials) try {
		const info = await credentials.describe(keyRef);
		if (info.configured) return {
			hasKey: true,
			keySource: (info.source ?? "file") === "file" ? "credentials" : "env"
		};
		return {
			hasKey: false,
			keySource: "none"
		};
	} catch {}
	const ambient = process.env[keyRef];
	return ambient && ambient.length > 0 ? {
		hasKey: true,
		keySource: "env"
	} : {
		hasKey: false,
		keySource: "none"
	};
}
/**
* Register the settings/test HTTP surface on DSH's shared `/api` channel.
*
* Registration goes through `connection.fetch` rather than
* `webServer.register({ kind: 'exact' })` on purpose. The webserver resolves
* its exact table before the `/api` prefix table, so an exact route under
* `/api/...` would be served without ever reaching Connection — skipping the
* Host/Origin fence and the browser-session cookie check. Routes on the shared
* channel are dispatched only after `connection.admit()` accepts the request as
* an owner Peer, so authentication is structural rather than per-handler.
*
* @param ctx - the host plugin context carrying `connection`.
* @param options - credential resolver, live web runtime, and logger.
*/
function registerRoutes(ctx, options) {
	const connection = ctx.get("connection");
	if (!connection) {
		options.logger?.warn("cust-search: the connection service is absent, so the /api/cust-search routes are not registered");
		return;
	}
	connection.fetch.register({
		path: "/api/cust-search/get-config",
		methods: ["GET"],
		requestBody: "buffered",
		fetch: route(async () => {
			const config = options.config.read();
			const rawDefs = options.engines.definitions();
			const definitions = [];
			for (const def of rawDefs) {
				const keyRef = (config.engineConfigs[def.id] ?? {}).keyRef || def.defaultKeyRef;
				const key = keyRef ? await describeKey(ctx, keyRef) : {
					hasKey: false,
					keySource: "none"
				};
				definitions.push({
					...def,
					...key
				});
			}
			return json({
				ok: true,
				data: {
					config,
					definitions
				}
			});
		})
	});
	connection.fetch.register({
		path: "/api/cust-search/set-config",
		methods: ["POST"],
		requestBody: "buffered",
		fetch: route(async (request) => {
			const raw = await request.text();
			const payload = JSON.parse(raw);
			const current = options.config.read();
			const updated = {
				defaultTimeout: typeof payload.defaultTimeout === "number" && payload.defaultTimeout > 0 ? payload.defaultTimeout : current.defaultTimeout,
				enginesOrder: Array.isArray(payload.enginesOrder) ? payload.enginesOrder : current.enginesOrder,
				engineConfigs: typeof payload.engineConfigs === "object" && payload.engineConfigs !== null ? payload.engineConfigs : current.engineConfigs
			};
			if (payload.keyUpdates && typeof payload.keyUpdates === "object") {
				const credentials = ctx.get("credentials");
				for (const update of Object.values(payload.keyUpdates)) if (update && typeof update.keyRef === "string" && update.keyRef.trim().length > 0) {
					const ref = update.keyRef.trim();
					if (update.value && update.value.trim().length > 0) await credentials?.set(ref, update.value.trim());
					else if (update.value === "") await credentials?.unset(ref);
				}
			}
			await options.config.write(updated);
			return json({ ok: true });
		})
	});
	connection.fetch.register({
		path: "/api/cust-search/test-engine",
		methods: ["POST"],
		requestBody: "buffered",
		fetch: route(async (request) => {
			const raw = await request.text();
			const { engineId, query, maxResults = 5, engineConfig: overrideConfig, tempApiKey } = JSON.parse(raw);
			if (!engineId || typeof query !== "string" || query.trim().length === 0) return json({
				ok: false,
				error: "engineId and non-empty query are required"
			}, 400);
			const engine = options.engines.get(engineId);
			if (!engine) return json({
				ok: false,
				error: `Search engine "${engineId}" not found`
			}, 404);
			const outcome = await runEngine({
				engine,
				storage: options.config.read(),
				query: query.trim(),
				maxResults,
				resolveApiKey: options.resolveApiKey,
				...overrideConfig === void 0 ? {} : { engineConfigOverride: overrideConfig },
				...tempApiKey === void 0 ? {} : { overrideApiKey: tempApiKey },
				signal: request.signal
			});
			return json({
				ok: outcome.ok,
				data: {
					engineId,
					durationMs: outcome.durationMs,
					...outcome.result === void 0 ? {} : { result: outcome.result },
					...outcome.error === void 0 ? {} : { error: outcome.error },
					...outcome.timedOut ? { timedOut: true } : {}
				}
			});
		})
	});
}
//#endregion
//#region lib/types/server/index.js
const name = "cust-search";
const inject = ["web"];
/**
* Resolve one credential reference.
*
* The credentials seam already layers the managed store over the process
* environment and `.env` files, so it is the only source for a name inside its
* grammar. A name outside the grammar has no reference to miss, and a bare
* environment lookup is the only thing that can answer it.
*
* @param ctx - context carrying `credentials`.
* @param keyRef - the reference named by the engine configuration.
* @returns the secret value, or undefined when nothing supplies one.
*/
async function resolveCredential(ctx, keyRef) {
	if (!keyRef) return void 0;
	if (!isCredentialRefName(keyRef)) return process.env[keyRef];
	try {
		const resolved = await ctx.get("credentials")?.resolve(keyRef);
		if (resolved) return resolved.value;
	} catch {}
}
function apply(ctx) {
	const logger = ctx.logger;
	const resolveApiKey = (keyRef) => resolveCredential(ctx, keyRef);
	ctx.inject(["storageDomain"], (storageCtx) => {
		let disposed = false;
		storageCtx.storageDomain.open(custSearchDomainSpec).then((domain) => {
			if (disposed) {
				domain.close();
				return;
			}
			storageCtx.effect(() => () => domain.close(), "cust-search: storage domain");
			start(storageCtx, createConfigStore(domain));
		}).catch((error) => {
			logger.error(`cust-search: could not open the cust_search storage domain: ${error instanceof Error ? error.message : String(error)}`);
		});
		storageCtx.effect(() => () => {
			disposed = true;
		}, "cust-search: storage teardown guard");
	});
	function start(runtimeCtx, config) {
		const engines = buildEngineRegistry(ctx.web);
		const selected = selectedSearchProviderOf(ctx.web);
		if (selected !== void 0 && selected !== "cust-search") logger.warn(`cust-search: web.searchProvider is "${selected}", so this plugin will not receive searches. Set it back to "cust-search" (Plugins > Built-in plugin settings > Web search, or the web entry in cordis.patch.yml) to re-enable the engine chain.`);
		runtimeCtx.inject(["connection"], (sctx) => {
			registerRoutes(sctx, {
				config,
				engines,
				resolveApiKey,
				logger
			});
		});
		ctx.web.registerSearchProvider(new CustSearchProvider({
			config,
			engines,
			resolveApiKey,
			run: (engine, storage, query, maxResults, signal) => runEngine({
				engine,
				storage,
				query,
				maxResults,
				resolveApiKey,
				...signal === void 0 ? {} : { signal }
			}),
			logger
		}));
	}
}
//#endregion
export { AnysearchSearchEngine, BingSearchEngine, CUST_SEARCH_PROVIDER_ID, CustSearchProvider, DEFAULT_ACCEPT_LANG, DEFAULT_STORAGE, DEFAULT_TIMEOUT_MS, DEFAULT_USER_AGENT, DeepSeekBridgeEngine, DuckDuckGoSearchEngine, EngineRequestError, EngineResultError, ExaSearchEngine, FirecrawlSearchEngine, KeenableSearchEngine, ParallelSearchEngine, PerplexitySearchEngine, SNIPPET_LIMIT, SearxngSearchEngine, TavilySearchEngine, apply, buildEngineRegistry, createConfigStore, createDeadline, custSearchDomainSpec, engineRequest, extractDdgUrl, fetchHtml, fetchHtmlWithRetry, inject, name, officialProviderOf, registerRoutes, resolveTimeout, runEngine, selectedSearchProviderOf, stripTags, toResult };
