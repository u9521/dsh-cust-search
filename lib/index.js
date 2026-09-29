import { WebError } from "@deepseek-ai/dsh-web";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
//#region lib/types/server/engines/deepseek.js
/** Id the official `web-search-deepseek` plugin registers its provider under. */
const OFFICIAL_PROVIDER_ID = "deepseek-official";
/**
* The official DeepSeek provider, as registered with the web seam.
*
* `@deepseek-ai/dsh-web` publishes no "provider registered under id X" accessor:
* `WebRuntime.search()` resolves the provider *configuration* selects, which is
* this plugin itself. The bridge therefore reads the runtime's registry
* directly — in this one place — and reports absence rather than throwing, so a
* changed runtime shape degrades to "engine unavailable" instead of breaking
* every search.
*/
function officialProvider(ctx) {
	return ctx.web?.searchProviders?.get(OFFICIAL_PROVIDER_ID);
}
/** Bridges the official DeepSeek search provider into the engine chain. */
var DeepSeekBridgeEngine = class {
	id = "deepseek";
	type = "bridge";
	available(ctx) {
		const official = officialProvider(ctx);
		if (official === void 0) return false;
		return typeof official.available === "function" ? official.available() : true;
	}
	async search(query, maxResults, ctx, signal) {
		const official = officialProvider(ctx);
		if (!official) throw new Error("web-search-deepseek plugin is not active or not registered");
		return await official.search({
			query,
			maxResults
		}, signal);
	}
};
//#endregion
//#region lib/types/server/engines/base.js
const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const DEFAULT_ACCEPT_LANG = "zh-CN,zh;q=0.9,en;q=0.8";
function decodeEntities(text) {
	return String(text).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
const SNIPPET_NOISE = /\b(sign up|sign in|log in|login|subscribe( to| for)?|member[- ]?only|become a member|create (a )?free account|read more|continue reading|story continues|get started|install (the )?app|view on|medium membership|join \w+ for free|get updates from this writer|stories in your inbox|remember me for|unlock this|free to read|become a patron)\b/gi;
function cleanSnippet(text) {
	if (!text) return "";
	return String(text).replace(SNIPPET_NOISE, " ").replace(/^\s*(#{1,6}\s*|\[\s*x?\s*\]\s*|-\s*\[\s*x?\s*\]\s*|>\s*)/gm, " ").replace(/\s+/g, " ").trim().slice(0, 300);
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
* Drop duplicate URLs, preserving order.
*
* Deliberately unbounded: `maxResults` belongs to the web seam, which enforces
* it on the way back and reports `truncated` itself. An engine whose API takes
* a result count applies it at the request layer instead.
*/
function uniqueSources(sources) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const s of sources) if (s.url && !seen.has(s.url)) {
		seen.add(s.url);
		out.push(s);
	}
	return out;
}
async function fetchHtml(url, signal, acceptLang) {
	let response;
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 12e3);
		const onAbort = () => controller.abort();
		signal?.addEventListener("abort", onAbort);
		response = await fetch(url, {
			headers: {
				"user-agent": DEFAULT_USER_AGENT,
				"accept-language": acceptLang ?? "zh-CN,zh;q=0.9,en;q=0.8"
			},
			signal: controller.signal,
			redirect: "follow"
		});
		clearTimeout(timer);
		signal?.removeEventListener("abort", onAbort);
	} catch (error) {
		if (signal?.aborted) throw error;
		throw new Error(`connection error: ${error instanceof Error ? error.message : String(error)}`);
	}
	if (!response.ok) throw new Error(`HTTP ${response.status} from ${url.split("?")[0]}`);
	const html = await response.text();
	if (response.status === 202 || /anomaly|captcha|unusual traffic|robot check/i.test(html.slice(0, 4e3))) throw new Error("Search provider returned anti-bot challenge or rate limit");
	return html;
}
async function fetchHtmlWithRetry(url, signal, acceptLang, maxAttempts = 2) {
	let lastError;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const html = await fetchHtml(url, signal, acceptLang);
			if (html.length > 500) return html;
		} catch (error) {
			lastError = error;
			if (signal?.aborted) throw error;
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
	available() {
		return true;
	}
	async search(query, _maxResults, ctx, signal) {
		const market = typeof ctx.engineConfig.market === "string" && ctx.engineConfig.market || "zh-CN";
		const acceptLang = LANG_PROFILES.zh.acceptLang;
		const params = new URLSearchParams({
			q: query,
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
		const limited = uniqueSources(sources);
		if (limited.length === 0) throw new Error("Bing returned 0 results");
		return {
			sources: limited,
			truncated: false
		};
	}
};
//#endregion
//#region lib/types/server/engines/duckduckgo.js
const DDG_HTML_URL = "https://html.duckduckgo.com/html/";
const DDG_LITE_URL = "https://lite.duckduckgo.com/lite/";
var DuckDuckGoSearchEngine = class {
	id = "ddg";
	type = "free";
	available() {
		return true;
	}
	async search(query, maxResults, _ctx, signal) {
		try {
			return await this.searchHtml(query, maxResults, signal);
		} catch {
			return await this.searchLite(query, maxResults, signal);
		}
	}
	async searchHtml(query, _maxResults, signal) {
		const params = new URLSearchParams({
			q: query,
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
		const limited = uniqueSources(sources);
		if (limited.length === 0) throw new Error("DuckDuckGo HTML returned 0 results");
		return {
			sources: limited,
			truncated: false
		};
	}
	async searchLite(query, _maxResults, signal) {
		const params = new URLSearchParams({
			q: query,
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
		const limited = uniqueSources(sources);
		if (limited.length === 0) throw new Error("DuckDuckGo Lite returned 0 results");
		return {
			sources: limited,
			truncated: false
		};
	}
};
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
	available() {
		return true;
	}
	async search(query, _maxResults, ctx, signal) {
		const customInstances = ctx.engineConfig.instances;
		const instances = Array.isArray(customInstances) && customInstances.length > 0 ? customInstances : DEFAULT_INSTANCES;
		const errors = [];
		for (const base of instances) try {
			const params = new URLSearchParams({
				q: query,
				format: "json"
			});
			const ctrl = new AbortController();
			const timer = setTimeout(() => ctrl.abort(), 6e3);
			const onAbort = () => ctrl.abort();
			signal?.addEventListener("abort", onAbort);
			const response = await fetch(`${base}/search?${params}`, {
				headers: {
					"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
					accept: "application/json"
				},
				signal: ctrl.signal
			});
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
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
			if (sources.length > 0) return {
				sources: uniqueSources(sources),
				truncated: false
			};
			errors.push(`${base}: 0 results`);
		} catch (error) {
			errors.push(`${base}: ${error instanceof Error ? error.message : String(error)}`);
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
	available() {
		return true;
	}
	async search(query, maxResults, ctx, signal) {
		const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef;
		const apiKey = await ctx.resolveApiKey(keyRef);
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 12e3);
		const onAbort = () => controller.abort();
		signal?.addEventListener("abort", onAbort);
		let response;
		try {
			const body = {
				query,
				max_results: Math.min(maxResults || 5, 20),
				search_depth: "basic"
			};
			response = await fetch(TAVILY_URL, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					accept: "application/json",
					...apiKey ? { authorization: `Bearer ${apiKey}` } : { "x-tavily-access-mode": "keyless" }
				},
				body: JSON.stringify(body),
				signal: controller.signal,
				redirect: "error"
			});
		} catch (error) {
			if (signal?.aborted) throw error;
			throw new Error(`Tavily request failed: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
		}
		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			throw new Error(`Tavily API error (HTTP ${response.status}): ${detail.slice(0, 150)}`);
		}
		const sources = ((await response.json()).results ?? []).filter((r) => Boolean(r.url)).map((r) => ({
			url: r.url,
			...r.title ? { title: String(r.title) } : {},
			...r.content ? { snippet: String(r.content).slice(0, 300) } : {}
		}));
		if (sources.length === 0) throw new Error("Tavily returned 0 results");
		return {
			sources: uniqueSources(sources),
			truncated: false
		};
	}
};
//#endregion
//#region lib/types/server/engines/anysearch.js
const ANYSEARCH_URL = "https://api.anysearch.com/v1/search";
var AnysearchSearchEngine = class {
	id = "anysearch";
	type = "free";
	available() {
		return true;
	}
	async search(query, maxResults, _ctx, signal) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 1e4);
		const onAbort = () => controller.abort();
		signal?.addEventListener("abort", onAbort);
		let response;
		try {
			response = await fetch(ANYSEARCH_URL, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					query,
					max_results: maxResults || 5
				}),
				signal: controller.signal
			});
		} catch (error) {
			if (signal?.aborted) throw error;
			throw new Error(`AnySearch request failed: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
		}
		if (!response.ok) throw new Error(`AnySearch API error (HTTP ${response.status})`);
		const data = await response.json();
		if (data.code !== 0) throw new Error(`AnySearch API error: ${data.message ?? data.code}`);
		const sources = (data.data?.results ?? []).filter((r) => Boolean(r.url)).map((r) => ({
			url: r.url,
			...r.title ? { title: String(r.title) } : {},
			...r.snippet ? { snippet: String(r.snippet).slice(0, 300) } : {}
		}));
		if (sources.length === 0) throw new Error("AnySearch returned 0 results");
		return {
			sources: uniqueSources(sources),
			truncated: false
		};
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
	available() {
		return true;
	}
	async search(query, maxResults, ctx, signal) {
		const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef;
		const key = await ctx.resolveApiKey(keyRef);
		if (key) return await this.searchRest(query, maxResults, key, signal);
		return await this.searchMcp(query, maxResults, signal);
	}
	async searchRest(query, maxResults, apiKey, signal) {
		const body = {
			query,
			type: "auto",
			contents: { highlights: { highlightsPerUrl: 1 } },
			numResults: maxResults || 5
		};
		const response = await fetch(EXA_REST_URL, {
			method: "POST",
			headers: {
				authorization: `Bearer ${apiKey}`,
				"content-type": "application/json",
				accept: "application/json"
			},
			body: JSON.stringify(body),
			...signal !== void 0 ? { signal } : {}
		});
		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			throw new Error(`Exa API error (HTTP ${response.status}): ${detail.slice(0, 150)}`);
		}
		const sources = ((await response.json()).results ?? []).map((r) => {
			const snippet = r.highlights?.find((h) => h.trim().length > 0);
			if (!r.url || !snippet) return null;
			return {
				url: r.url,
				...r.title ? { title: r.title } : {},
				snippet,
				...r.publishedDate ? { publishedAt: r.publishedDate } : {}
			};
		}).filter(Boolean);
		if (sources.length === 0) throw new Error("Exa REST returned 0 results");
		return {
			sources: uniqueSources(sources),
			truncated: false
		};
	}
	async searchMcp(query, maxResults, signal) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 15e3);
		const onAbort = () => controller.abort();
		signal?.addEventListener("abort", onAbort);
		let response;
		try {
			response = await fetch(EXA_MCP_URL, {
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
							query,
							numResults: maxResults || 5
						}
					}
				}),
				signal: controller.signal
			});
		} catch (error) {
			if (signal?.aborted) throw error;
			throw new Error(`Exa MCP request failed: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
		}
		if (!response.ok) throw new Error(`Exa MCP error (HTTP ${response.status})`);
		const lines = (await response.text()).split("\n");
		let json = null;
		for (const line of lines) if (line.startsWith("data: ")) try {
			json = JSON.parse(line.slice(6));
			break;
		} catch {}
		if (!json || json.error) throw new Error(`Exa MCP error: ${json?.error?.message ?? "invalid response"}`);
		const blocks = (json.result?.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n").split(/\n(?=Title:)/);
		const sources = [];
		for (const block of blocks) {
			const title = block.match(/^Title: (.+)$/m)?.[1];
			const url = block.match(/^URL: (\S+)$/m)?.[1];
			const published = block.match(/^Published: (.+)$/m)?.[1];
			const highlights = block.split(/^Highlights:$/m)[1]?.split("\n").filter((l) => l.trim() && !l.trim().startsWith("...")).slice(0, 3).join(" ");
			if (!url) continue;
			sources.push({
				url,
				...title ? { title } : {},
				...highlights ? { snippet: highlights.slice(0, 300) } : {},
				...published && /^\d{4}-\d{2}-\d{2}/.test(published) ? { publishedAt: published } : {}
			});
		}
		if (sources.length === 0) throw new Error("Exa MCP returned 0 results");
		return {
			sources: uniqueSources(sources),
			truncated: false
		};
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
	available() {
		return true;
	}
	async search(query, maxResults, ctx, signal) {
		const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef;
		const apiKey = await ctx.resolveApiKey(keyRef);
		if (apiKey) return await this.searchRest(query, maxResults, apiKey, keyRef, signal);
		return await this.searchMcp(query, maxResults, signal);
	}
	async searchRest(query, _maxResults, apiKey, keyRef, signal) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 2e4);
		const onAbort = () => controller.abort();
		signal?.addEventListener("abort", onAbort);
		let response;
		try {
			response = await fetch(KEENABLE_URL, {
				method: "POST",
				headers: {
					"x-api-key": apiKey,
					"content-type": "application/json",
					accept: "application/json"
				},
				body: JSON.stringify({
					query,
					mode: "realtime"
				}),
				signal: controller.signal,
				redirect: "error"
			});
		} catch (error) {
			if (signal?.aborted) throw error;
			throw new Error(`Keenable request failed: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
		}
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
				...snippet ? { snippet: String(snippet).slice(0, 300) } : {},
				...r.published_at ? { publishedAt: String(r.published_at) } : {}
			};
		});
		if (sources.length === 0) throw new Error("Keenable returned 0 results");
		return {
			sources: uniqueSources(sources),
			truncated: false
		};
	}
	async searchMcp(query, maxResults, signal) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 25e3);
		const onAbort = () => controller.abort();
		signal?.addEventListener("abort", onAbort);
		let response;
		try {
			response = await fetch(KEENABLE_MCP_URL, {
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
						arguments: { query }
					}
				}),
				signal: controller.signal
			});
		} catch (error) {
			if (signal?.aborted) throw error;
			throw new Error(`Keenable MCP request failed: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
		}
		if (!response.ok) throw new Error(`Keenable MCP error (HTTP ${response.status})`);
		const data = await response.json();
		if (data.error) throw new Error(`Keenable MCP error: ${data.error.message ?? "unknown error"}`);
		const text = (data.result?.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");
		if (data.result?.isError) throw new Error(`Keenable MCP error: ${text.slice(0, 200)}`);
		const sources = this.parseMcpText(text, maxResults);
		if (sources.length === 0) throw new Error("Keenable MCP returned 0 results");
		return {
			sources,
			truncated: false
		};
	}
	/** Parse the `Title: / URL: / Snippets:` block layout returned by the MCP tool. */
	parseMcpText(text, _maxResults) {
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
				...snippets ? { snippet: snippets.slice(0, 300) } : {},
				...published && /^\d{4}-\d{2}-\d{2}/.test(published) ? { publishedAt: published } : {}
			});
		}
		return uniqueSources(sources);
	}
};
//#endregion
//#region lib/types/server/engines/firecrawl.js
const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/search";
var FirecrawlSearchEngine = class {
	id = "firecrawl";
	type = "keyed";
	defaultKeyRef = "FIRECRAWL_API_KEY";
	available() {
		return true;
	}
	async search(query, maxResults, ctx, signal) {
		const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef;
		const apiKey = await ctx.resolveApiKey(keyRef);
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 2e4);
		const onAbort = () => controller.abort();
		signal?.addEventListener("abort", onAbort);
		let response;
		try {
			const body = {
				query,
				limit: Math.min(Math.max(maxResults || 5, 1), 10)
			};
			response = await fetch(FIRECRAWL_URL, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					accept: "application/json",
					...apiKey ? { authorization: `Bearer ${apiKey}` } : {}
				},
				body: JSON.stringify(body),
				signal: controller.signal,
				redirect: "error"
			});
		} catch (error) {
			if (signal?.aborted) throw error;
			throw new Error(`Firecrawl request failed: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
		}
		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			if (response.status === 401) throw new Error(`Firecrawl API key is invalid (HTTP 401), update keyRef "${keyRef}" in settings`);
			if (response.status === 429) throw new Error(`Firecrawl rate limit exceeded (HTTP 429), configure keyRef "${keyRef}" for higher limits`);
			throw new Error(`Firecrawl API error (HTTP ${response.status}): ${detail.slice(0, 150)}`);
		}
		const sources = ((await response.json()).data?.web ?? []).filter((r) => Boolean(r.url)).map((r) => ({
			url: r.url,
			...r.title ? { title: String(r.title) } : {},
			...r.description ? { snippet: String(r.description).slice(0, 300) } : {}
		}));
		if (sources.length === 0) throw new Error("Firecrawl returned 0 results");
		return {
			sources: uniqueSources(sources),
			truncated: false
		};
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
	available() {
		return true;
	}
	async search(query, maxResults, ctx, signal) {
		const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef;
		const apiKey = await ctx.resolveApiKey(keyRef);
		if (apiKey) return await this.searchRest(query, maxResults, apiKey, keyRef, signal);
		return await this.searchMcp(query, maxResults, signal);
	}
	async searchRest(query, maxResults, apiKey, keyRef, signal) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 25e3);
		const onAbort = () => controller.abort();
		signal?.addEventListener("abort", onAbort);
		let response;
		try {
			response = await fetch(PARALLEL_URL, {
				method: "POST",
				headers: {
					"x-api-key": apiKey,
					"content-type": "application/json",
					accept: "application/json"
				},
				body: JSON.stringify({
					objective: query,
					search_queries: [query],
					mode: "fast",
					advanced_settings: { max_results: Math.min(Math.max(maxResults || 5, 1), 20) }
				}),
				signal: controller.signal,
				redirect: "error"
			});
		} catch (error) {
			if (signal?.aborted) throw error;
			throw new Error(`Parallel request failed: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
		}
		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			if (response.status === 401 || response.status === 403) throw new Error(`Parallel API key is invalid (HTTP ${response.status}), update keyRef "${keyRef}" in settings`);
			if (response.status === 402) throw new Error(`Parallel quota or billing error (HTTP 402): ${detail.slice(0, 150)}`);
			throw new Error(`Parallel API error (HTTP ${response.status}): ${detail.slice(0, 150)}`);
		}
		const data = await response.json();
		const sources = this.toSources(data.results ?? [], maxResults);
		if (sources.length === 0) throw new Error("Parallel returned 0 results");
		return {
			sources,
			truncated: false
		};
	}
	async searchMcp(query, maxResults, signal) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 35e3);
		const onAbort = () => controller.abort();
		signal?.addEventListener("abort", onAbort);
		try {
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
			}, void 0, controller.signal);
			if (!initResponse.ok) {
				const detail = await initResponse.text().catch(() => "");
				throw new Error(`Parallel MCP initialize error (HTTP ${initResponse.status}): ${detail.slice(0, 150)}`);
			}
			const sessionId = initResponse.headers.get("mcp-session-id") ?? void 0;
			await this.readMcpPayload(initResponse, "initialize");
			const initializedResponse = await this.postMcp({
				jsonrpc: "2.0",
				method: "notifications/initialized"
			}, sessionId, controller.signal);
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
						objective: query,
						search_queries: [query],
						session_id: PARALLEL_MCP_SESSION_ID
					}
				}
			}, sessionId, controller.signal);
			if (!response.ok) {
				const detail = await response.text().catch(() => "");
				throw new Error(`Parallel MCP error (HTTP ${response.status}): ${detail.slice(0, 150)}`);
			}
			const result = (await this.readMcpPayload(response, "web_search")).result;
			const text = (result?.content ?? []).filter((block) => block.type === "text").map((block) => block.text ?? "").join("\n");
			if (result?.isError) throw new Error(`Parallel MCP error: ${text.slice(0, 200)}`);
			const sources = this.toSources(result?.structuredContent?.results ?? this.parseMcpSearchResults(text), maxResults);
			if (sources.length === 0) throw new Error("Parallel MCP returned 0 results");
			return {
				sources,
				truncated: false
			};
		} catch (error) {
			if (signal?.aborted) throw error;
			if (error instanceof Error && error.message.startsWith("Parallel")) throw error;
			throw new Error(`Parallel MCP request failed: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
		}
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
		try {
			return await fetch(PARALLEL_MCP_URL, {
				method: "POST",
				headers,
				body: JSON.stringify(body),
				signal,
				redirect: "error"
			});
		} catch (error) {
			if (signal.aborted) throw error;
			throw new Error(`Parallel MCP request failed: ${error instanceof Error ? error.message : String(error)}`);
		}
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
	toSources(results, _maxResults) {
		return uniqueSources(results.filter((result) => Boolean(result.url)).map((result) => {
			const excerpt = (result.excerpts ?? []).find((item) => String(item).trim().length > 0);
			return {
				url: result.url,
				...result.title ? { title: String(result.title) } : {},
				...excerpt ? { snippet: String(excerpt).slice(0, 300) } : {},
				...result.publish_date ? { publishedAt: String(result.publish_date) } : {}
			};
		}));
	}
};
//#endregion
//#region lib/types/server/engines/perplexity.js
const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";
var PerplexitySearchEngine = class {
	id = "perplexity";
	type = "keyed";
	defaultKeyRef = "PERPLEXITY_API_KEY";
	available() {
		return true;
	}
	async search(query, _maxResults, ctx, signal) {
		const keyRef = ctx.engineConfig.keyRef || this.defaultKeyRef;
		const apiKey = await ctx.resolveApiKey(keyRef);
		if (!apiKey) throw new Error(`Perplexity search requires "${keyRef}"`);
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 2e4);
		const onAbort = () => controller.abort();
		signal?.addEventListener("abort", onAbort);
		let response;
		try {
			response = await fetch(PERPLEXITY_URL, {
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
						content: query
					}]
				}),
				signal: controller.signal,
				redirect: "error"
			});
		} catch (error) {
			if (signal?.aborted) throw error;
			throw new Error(`Perplexity request failed: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
		}
		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			if (response.status === 401) throw new Error(`Perplexity API key is invalid (HTTP 401), update keyRef "${keyRef}" in settings`);
			if (response.status === 429) throw new Error("Perplexity rate limit or quota exceeded (HTTP 429)");
			throw new Error(`Perplexity API error (HTTP ${response.status}): ${detail.slice(0, 150)}`);
		}
		const data = await response.json();
		const answer = data.choices?.[0]?.message?.content ?? "";
		const sources = (data.citations ?? []).filter((url) => typeof url === "string" && url.length > 0).map((url) => ({ url }));
		if (sources.length === 0) throw new Error("Perplexity returned 0 citations");
		return {
			...answer ? { content: answer } : {},
			sources: uniqueSources(sources),
			truncated: false
		};
	}
};
//#endregion
//#region lib/types/server/engines/index.js
function createEngineRegistry() {
	const registry = /* @__PURE__ */ new Map();
	const register = (engine) => {
		registry.set(engine.id, engine);
	};
	register(new DeepSeekBridgeEngine());
	register(new BingSearchEngine());
	register(new DuckDuckGoSearchEngine());
	register(new SearxngSearchEngine());
	register(new TavilySearchEngine());
	register(new AnysearchSearchEngine());
	register(new ExaSearchEngine());
	register(new KeenableSearchEngine());
	register(new FirecrawlSearchEngine());
	register(new ParallelSearchEngine());
	register(new PerplexitySearchEngine());
	return registry;
}
function getEngineDefinitions() {
	const registry = createEngineRegistry();
	const defs = [];
	for (const engine of registry.values()) defs.push({
		id: engine.id,
		type: engine.type,
		...engine.defaultKeyRef ? { defaultKeyRef: engine.defaultKeyRef } : {}
	});
	return defs;
}
//#endregion
//#region lib/types/server/storage.js
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
function getStorageDir(ensureExists = false) {
	const dshHome = process.env.DSH_HOME || path.join(os.homedir(), ".dsh");
	const storageDir = path.join(dshHome, "storages");
	if (ensureExists && !fs.existsSync(storageDir)) try {
		fs.mkdirSync(storageDir, { recursive: true });
	} catch {}
	return storageDir;
}
function getCustSearchStoragePath(ensureDir = false) {
	return path.join(getStorageDir(ensureDir), "cust_search.json");
}
function loadStorage() {
	const filePath = getCustSearchStoragePath(false);
	try {
		if (fs.existsSync(filePath)) {
			const raw = fs.readFileSync(filePath, "utf-8");
			const parsed = JSON.parse(raw);
			return {
				defaultTimeout: typeof parsed.defaultTimeout === "number" && parsed.defaultTimeout > 0 ? parsed.defaultTimeout : DEFAULT_STORAGE.defaultTimeout,
				enginesOrder: Array.isArray(parsed.enginesOrder) ? parsed.enginesOrder : DEFAULT_STORAGE.enginesOrder,
				engineConfigs: typeof parsed.engineConfigs === "object" && parsed.engineConfigs !== null ? {
					...DEFAULT_STORAGE.engineConfigs,
					...parsed.engineConfigs
				} : { ...DEFAULT_STORAGE.engineConfigs }
			};
		}
	} catch {}
	const initial = { ...DEFAULT_STORAGE };
	saveStorage(initial);
	return initial;
}
function saveStorage(data) {
	const filePath = getCustSearchStoragePath(true);
	try {
		fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
	} catch (err) {
		console.error("Failed to save cust_search.json:", err);
	}
}
//#endregion
//#region lib/types/server/provider.js
const CUST_SEARCH_PROVIDER_ID = "cust-search";
var CustSearchProvider = class {
	options;
	id = CUST_SEARCH_PROVIDER_ID;
	engines = createEngineRegistry();
	constructor(options) {
		this.options = options;
	}
	available() {
		return true;
	}
	async search(request, signal) {
		if (!request || typeof request.query !== "string" || request.query.trim().length === 0) throw new WebError("Query is required for web search", "WEB_PROVIDER_ERROR");
		const storage = loadStorage();
		const engineIds = storage.enginesOrder && storage.enginesOrder.length > 0 ? storage.enginesOrder : DEFAULT_STORAGE.enginesOrder;
		const maxResults = request.maxResults ?? 5;
		const failures = [];
		for (const engineId of engineIds) {
			if (signal?.aborted) throw new WebError("Search request aborted", "WEB_ABORTED");
			const engine = this.engines.get(engineId);
			if (!engine) {
				this.options.logger?.warn?.(`cust-search: unknown engine "${engineId}", skipping`);
				continue;
			}
			const engineConfig = storage.engineConfigs[engineId] ?? {};
			const engineCtx = {
				config: storage,
				engineConfig,
				web: this.options.web,
				resolveApiKey: this.options.resolveApiKey,
				logger: this.options.logger
			};
			if (!engine.available(engineCtx)) {
				this.options.logger?.debug?.(`cust-search: engine "${engineId}" is not available, skipping`);
				continue;
			}
			const timeoutMs = typeof engineConfig.timeout === "number" && engineConfig.timeout > 0 ? engineConfig.timeout : storage.defaultTimeout || 8e3;
			const ctrl = new AbortController();
			const timer = setTimeout(() => ctrl.abort(), timeoutMs);
			const onAbort = () => ctrl.abort();
			signal?.addEventListener("abort", onAbort);
			try {
				const result = await engine.search(request.query, maxResults, engineCtx, ctrl.signal);
				clearTimeout(timer);
				signal?.removeEventListener("abort", onAbort);
				if (result.sources && result.sources.length > 0) return result;
				const msg = `engine "${engineId}" returned 0 results`;
				failures.push(msg);
				this.options.logger?.warn?.(`cust-search: ${msg}, trying next engine`);
			} catch (err) {
				clearTimeout(timer);
				signal?.removeEventListener("abort", onAbort);
				if (signal?.aborted) throw new WebError("Search request aborted", "WEB_ABORTED");
				const errMsg = err instanceof Error ? err.message : String(err);
				const msg = `${engineId}: ${errMsg}`;
				failures.push(msg);
				this.options.logger?.warn?.(`cust-search: engine "${engineId}" failed (${errMsg}), trying next engine`);
			}
		}
		throw new WebError(`All configured search engines failed (${failures.join("; ") || "no usable engines"}).`, "WEB_PROVIDER_ERROR");
	}
};
//#endregion
//#region lib/types/server/routes.js
async function readRequestBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (chunk) => chunks.push(chunk));
		req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
		req.on("error", reject);
	});
}
function sendJson(res, status, data) {
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	res.writeHead(status);
	res.end(JSON.stringify(data));
}
function registerRoutes(ctx, options) {
	const webServer = ctx.get("webServer");
	if (!webServer) return () => {};
	const unregisterGet = webServer.register({
		kind: "exact",
		path: "/api/cust-search/get-config",
		handler: async (req, res) => {
			if (req.method !== "GET") {
				sendJson(res, 405, {
					ok: false,
					error: "Method Not Allowed"
				});
				return;
			}
			try {
				const config = loadStorage();
				const rawDefs = getEngineDefinitions();
				const credentials = ctx.get("credentials");
				const definitions = [];
				for (const def of rawDefs) {
					const keyRef = (config.engineConfigs[def.id] ?? {}).keyRef || def.defaultKeyRef;
					let hasKey = false;
					let keySource = "none";
					if (keyRef) {
						if (credentials) try {
							const hit = await credentials.resolve(keyRef);
							if (hit?.value && hit.value.length > 0) {
								hasKey = true;
								keySource = "credentials";
							}
						} catch {}
						if (!hasKey && process.env[keyRef] && process.env[keyRef].length > 0) {
							hasKey = true;
							keySource = "env";
						}
					}
					definitions.push({
						...def,
						hasKey,
						keySource
					});
				}
				sendJson(res, 200, {
					ok: true,
					data: {
						config,
						definitions
					}
				});
			} catch (error) {
				sendJson(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}
	});
	const unregisterSet = webServer.register({
		kind: "exact",
		path: "/api/cust-search/set-config",
		handler: async (req, res) => {
			if (req.method !== "POST") {
				sendJson(res, 405, {
					ok: false,
					error: "Method Not Allowed"
				});
				return;
			}
			try {
				const raw = await readRequestBody(req);
				const payload = JSON.parse(raw);
				const current = loadStorage();
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
				saveStorage(updated);
				sendJson(res, 200, { ok: true });
			} catch (error) {
				sendJson(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}
	});
	const unregisterTest = webServer.register({
		kind: "exact",
		path: "/api/cust-search/test-engine",
		handler: async (req, res) => {
			if (req.method !== "POST") {
				sendJson(res, 405, {
					ok: false,
					error: "Method Not Allowed"
				});
				return;
			}
			try {
				const raw = await readRequestBody(req);
				const { engineId, query, maxResults = 5, engineConfig: overrideConfig, tempApiKey } = JSON.parse(raw);
				if (!engineId || typeof query !== "string" || query.trim().length === 0) {
					sendJson(res, 400, {
						ok: false,
						error: "engineId and non-empty query are required"
					});
					return;
				}
				const engine = createEngineRegistry().get(engineId);
				if (!engine) {
					sendJson(res, 404, {
						ok: false,
						error: `Search engine "${engineId}" not found`
					});
					return;
				}
				const storage = loadStorage();
				const engineConfig = overrideConfig ?? storage.engineConfigs[engineId] ?? {};
				const defaultTimeout = storage.defaultTimeout || 8e3;
				const timeoutMs = typeof engineConfig.timeout === "number" && engineConfig.timeout > 0 ? engineConfig.timeout : defaultTimeout;
				const resolveApiKey = async (keyRef) => {
					if (!keyRef) return void 0;
					const targetRef = engineConfig.keyRef || engine.defaultKeyRef;
					if (tempApiKey !== void 0 && (!keyRef || keyRef === targetRef)) return tempApiKey;
					if (options?.resolveApiKey) return options.resolveApiKey(keyRef);
					const credentials = ctx.get("credentials");
					if (credentials) try {
						const hit = await credentials.resolve(keyRef);
						if (hit?.value && hit.value.length > 0) return hit.value;
					} catch {}
					return process.env[keyRef];
				};
				const engineCtx = {
					config: storage,
					engineConfig,
					web: options?.web,
					resolveApiKey,
					logger: options?.logger
				};
				if (!engine.available(engineCtx)) {
					sendJson(res, 200, {
						ok: false,
						data: {
							engineId,
							durationMs: 0,
							error: "Search engine is not available in current environment"
						}
					});
					return;
				}
				const startTime = Date.now();
				const ctrl = new AbortController();
				const timer = setTimeout(() => ctrl.abort(), timeoutMs);
				try {
					const result = await engine.search(query.trim(), maxResults, engineCtx, ctrl.signal);
					clearTimeout(timer);
					sendJson(res, 200, {
						ok: true,
						data: {
							engineId,
							durationMs: Date.now() - startTime,
							result
						}
					});
				} catch (err) {
					clearTimeout(timer);
					sendJson(res, 200, {
						ok: false,
						data: {
							engineId,
							durationMs: Date.now() - startTime,
							error: ctrl.signal.aborted ? `请求超时 (${timeoutMs}ms)` : err instanceof Error ? err.message : String(err)
						}
					});
				}
			} catch (error) {
				sendJson(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}
	});
	return () => {
		unregisterGet();
		unregisterSet();
		unregisterTest();
	};
}
//#endregion
//#region lib/types/server/index.js
const name = "cust-search";
const inject = ["web"];
function apply(ctx) {
	const logger = ctx.logger;
	/**
	* Resolve one credential reference. The credentials seam is asked first —
	* it already layers the process environment and `.env` files — and a bare
	* environment lookup covers names outside the seam's grammar.
	*/
	const resolveApiKey = async (keyRef) => {
		if (!keyRef) return void 0;
		try {
			const resolved = await ctx.get("credentials")?.resolve(keyRef);
			if (resolved) return resolved.value;
		} catch {}
		return process.env[keyRef];
	};
	ctx.inject(["webServer"], (sctx) => {
		sctx.effect(() => registerRoutes(sctx, {
			resolveApiKey,
			web: ctx.web,
			logger
		}), "cust-search: webServer routes");
	});
	ctx.web.registerSearchProvider(new CustSearchProvider({
		web: ctx.web,
		resolveApiKey,
		logger
	}));
}
//#endregion
export { AnysearchSearchEngine, BingSearchEngine, CUST_SEARCH_PROVIDER_ID, CustSearchProvider, DEFAULT_ACCEPT_LANG, DEFAULT_STORAGE, DEFAULT_USER_AGENT, DeepSeekBridgeEngine, DuckDuckGoSearchEngine, ExaSearchEngine, FirecrawlSearchEngine, KeenableSearchEngine, ParallelSearchEngine, PerplexitySearchEngine, SNIPPET_NOISE, SearxngSearchEngine, TavilySearchEngine, apply, cleanSnippet, createEngineRegistry, decodeEntities, extractDdgUrl, fetchHtml, fetchHtmlWithRetry, getCustSearchStoragePath, getEngineDefinitions, getStorageDir, inject, loadStorage, name, readRequestBody, registerRoutes, saveStorage, stripTags, uniqueSources };
