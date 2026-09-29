window.__ModuleLoader__.load({
	id: "@local/dsh-cust-search",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region lib/types/client/api.js
		async function fetchConfig() {
			const res = await fetch("/api/cust-search/get-config", { headers: { Accept: "application/json" } });
			if (!res.ok) throw new Error(`Failed to fetch config (HTTP ${res.status})`);
			const json = await res.json();
			if (!json.ok || !json.data) throw new Error(json.error || "Failed to fetch config");
			return json.data;
		}
		async function saveConfig(payload) {
			const res = await fetch("/api/cust-search/set-config", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json"
				},
				body: JSON.stringify(payload)
			});
			if (!res.ok) throw new Error(`Failed to save config (HTTP ${res.status})`);
			const json = await res.json();
			if (!json.ok) throw new Error(json.error || "Failed to save config");
		}
		async function testEngine(payload, signal) {
			const res = await fetch("/api/cust-search/test-engine", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json"
				},
				body: JSON.stringify(payload),
				signal
			});
			if (!res.ok) {
				const text = await res.text();
				try {
					const json = JSON.parse(text);
					if (json.data) return json;
					return {
						ok: false,
						data: {
							engineId: payload.engineId,
							durationMs: 0,
							error: json.error || `HTTP ${res.status}`
						}
					};
				} catch {
					return {
						ok: false,
						data: {
							engineId: payload.engineId,
							durationMs: 0,
							error: `HTTP ${res.status}: ${text}`
						}
					};
				}
			}
			return await res.json();
		}
		//#endregion
		//#region lib/types/client/i18n.js
		/** Renders the key itself; only reachable if a component escapes the provider. */
		const KEY_FALLBACK = (key, params) => params === void 0 ? key : Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), key);
		const I18nContext = react.createContext(KEY_FALLBACK);
		function I18nProvider({ translator, children }) {
			return react.createElement(I18nContext.Provider, { value: translator }, children);
		}
		function useI18n() {
			return { t: react.useContext(I18nContext) };
		}
		//#endregion
		//#region lib/types/client/components/FooterBar.js
		const e$17 = react.createElement;
		function FooterBar({ onSave, saving, onOpenTestSearch, message, enabledCount, totalCount }) {
			const { t } = useI18n();
			const isError = Boolean(message) && (message.includes("失败") || message.includes("错误") || message.toLowerCase().includes("failed") || message.toLowerCase().includes("error"));
			const isWarning = Boolean(message) && !isError && (message.includes("已修改") || message.toLowerCase().includes("modified") || message.toLowerCase().includes("unsaved") || message.includes("未保存"));
			const noticeClass = isError ? "error" : isWarning ? "warning" : "success";
			const NoticeIcon = isError || isWarning ? _deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular : _deepseek_ai_dsh_client_ui_primitives.IconCheckOutlineRegular;
			const countText = totalCount !== void 0 ? t("footer.enabledCountRatio", {
				enabled: enabledCount,
				total: totalCount
			}) : t("footer.enabledCount", { count: enabledCount });
			return e$17("div", { className: "dsh-cs-footer" }, e$17("div", { className: "dsh-cs-footer-left" }, message ? e$17("div", { className: `dsh-cs-footer-notice ${noticeClass}` }, e$17(NoticeIcon, { size: 14 }), e$17("span", null, message)) : e$17("span", { className: "dsh-cs-footer-count" }, countText)), e$17("div", { className: "dsh-cs-footer-right" }, e$17("button", {
				type: "button",
				className: "dsh-cs-btn secondary",
				onClick: onOpenTestSearch,
				title: t("footer.testSearch")
			}, e$17(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutlineRegular, { size: 14 }), e$17("span", null, t("footer.testSearch"))), e$17("button", {
				type: "button",
				className: "dsh-cs-btn primary",
				onClick: onSave,
				disabled: saving
			}, saving ? e$17(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutlineRegular, {
				size: 14,
				className: "dsh-cs-spin"
			}) : null, e$17("span", null, saving ? t("footer.saving") : t("footer.save")))));
		}
		//#endregion
		//#region lib/types/client/components/common/Switch.js
		const e$16 = react.createElement;
		function Switch({ checked, onChange, label, title, disabled = false, className }) {
			return e$16("button", {
				type: "button",
				className: `dsh-cs-switch ${checked ? "active" : ""} ${className || ""}`.trim(),
				role: "switch",
				"aria-checked": checked,
				"aria-label": label,
				title,
				disabled,
				onClick: () => {
					if (!disabled) onChange(!checked);
				}
			}, e$16("span", { className: "dsh-cs-switch-thumb" }));
		}
		//#endregion
		//#region lib/types/client/components/HeaderBar.js
		const e$15 = react.createElement;
		function HeaderBar({ isSortMode, onToggleSortMode, defaultTimeout, onChangeDefaultTimeout }) {
			const { t } = useI18n();
			return e$15("div", { className: "dsh-cs-header" }, e$15("div", { className: "dsh-cs-header-main" }, e$15("div", { className: "dsh-cs-header-left" }, e$15("div", {
				className: "dsh-cs-mode-toggle",
				onClick: onToggleSortMode
			}, e$15(Switch, {
				checked: isSortMode,
				onChange: onToggleSortMode,
				label: isSortMode ? t("header.sortModeActive") : t("header.detailMode")
			}), e$15("span", null, isSortMode ? t("header.sortModeActive") : t("header.detailMode"))), e$15("div", { className: "dsh-cs-timeout-group" }, e$15("span", null, t("header.defaultTimeout")), e$15("input", {
				type: "number",
				className: "dsh-cs-input",
				value: defaultTimeout,
				onChange: (ev) => {
					const val = parseInt(ev.target.value, 10);
					if (!isNaN(val)) onChangeDefaultTimeout(val);
				},
				style: {
					width: "85px",
					height: "30px"
				},
				step: 500,
				min: 1e3
			}), e$15("span", null, "ms")))));
		}
		//#endregion
		//#region lib/types/client/components/common/EngineTypeBadge.js
		const e$14 = react.createElement;
		function EngineTypeBadge({ type, className, style }) {
			const { t } = useI18n();
			const badgeClass = type === "bridge" ? "dsh-cs-badge bridge" : type === "keyed" ? "dsh-cs-badge keyed" : "dsh-cs-badge free";
			return e$14("span", {
				className: className ? `${badgeClass} ${className}` : badgeClass,
				style
			}, type === "bridge" ? t("badge.bridge") : type === "keyed" ? t("badge.keyed") : t("badge.free"));
		}
		//#endregion
		//#region lib/types/client/components/common/OrderBadge.js
		const e$13 = react.createElement;
		function OrderBadge({ index, active = false, disabled = false, className, style }) {
			const { t } = useI18n();
			if (disabled || typeof index !== "number" || index <= 0) {
				const cls = `dsh-cs-order-badge disabled ${className || ""}`.trim();
				return e$13("span", {
					className: cls,
					style
				}, t("badge.disabled"));
			}
			const cls = `dsh-cs-order-badge ${active ? "active" : ""} ${className || ""}`.trim();
			return e$13("span", {
				className: cls,
				style
			}, `#${index}`);
		}
		//#endregion
		//#region lib/types/client/components/EngineDetailCard.js
		const e$12 = react.createElement;
		function EngineDetailCard({ engineDef, orderIndex, engineConfig, defaultTimeout, apiKeyInput, isMarkedForClear = false, onToggleEnable, onChangeTimeout, onChangeKeyRef, onApiKeyInputChange, onClearApiKey, onUndoClearApiKey, onChangeOption }) {
			const { t } = useI18n();
			const isEnabled = typeof orderIndex === "number" && orderIndex > 0;
			const currentKeyRef = engineConfig.keyRef || engineDef.defaultKeyRef || "";
			const engineName = t(`engines.${engineDef.id}.name`) || engineDef.id;
			const engineDesc = t(`engines.${engineDef.id}.description`) || "";
			return e$12("div", { className: `dsh-cs-card ${isEnabled ? "" : "disabled"}`.trim() }, e$12("div", { className: "dsh-cs-card-header" }, e$12("div", { className: "dsh-cs-card-identity" }, e$12(OrderBadge, {
				index: orderIndex,
				disabled: !isEnabled
			}), e$12("span", { className: "dsh-cs-card-name" }, engineName), e$12(EngineTypeBadge, { type: engineDef.type })), e$12(Switch, {
				checked: isEnabled,
				onChange: onToggleEnable,
				label: engineName,
				title: isEnabled ? t("badge.enabled") : t("badge.disabled")
			})), e$12("div", { className: "dsh-cs-card-desc" }, engineDesc), e$12("div", { className: "dsh-cs-card-body" }, e$12("div", { className: "dsh-cs-field" }, e$12("label", { className: "dsh-cs-field-label" }, t("detail.timeoutLabel")), e$12("input", {
				type: "number",
				className: "dsh-cs-input",
				placeholder: t("detail.timeoutPlaceholder", { timeout: defaultTimeout }),
				value: engineConfig.timeout || "",
				onChange: (ev) => {
					const val = parseInt(ev.target.value, 10);
					onChangeTimeout(isNaN(val) || val <= 0 ? void 0 : val);
				},
				min: 1e3,
				step: 500
			})), engineDef.type === "keyed" ? e$12("div", { className: "dsh-cs-field" }, e$12("label", { className: "dsh-cs-field-label" }, t("detail.keyRefLabel")), e$12("input", {
				type: "text",
				className: "dsh-cs-input",
				value: currentKeyRef,
				disabled: isMarkedForClear,
				placeholder: engineDef.defaultKeyRef || t("detail.keyRefPlaceholder"),
				onChange: (ev) => onChangeKeyRef(ev.target.value)
			})) : null, engineDef.type === "keyed" ? e$12("div", { className: "dsh-cs-field full-width" }, e$12("div", { className: "dsh-cs-field-label" }, e$12("span", null, t("detail.apiKeyLabel")), e$12("span", { style: {
				fontSize: "11px",
				display: "flex",
				alignItems: "center"
			} }, e$12("span", { className: `dsh-cs-dot ${isMarkedForClear ? "warning" : engineDef.hasKey ? "ok" : "missing"}` }), isMarkedForClear ? t("detail.keyStatusMarkedClear") : engineDef.hasKey ? engineDef.keySource === "credentials" ? t("detail.keyStatusCredentials") : t("detail.keyStatusEnv") : t("detail.keyStatusMissing"))), e$12("div", { style: {
				display: "flex",
				alignItems: "center",
				gap: "8px"
			} }, e$12("input", {
				type: "password",
				className: "dsh-cs-input",
				disabled: isMarkedForClear,
				placeholder: isMarkedForClear ? t("detail.apiKeyPlaceholderClearing") : engineDef.hasKey ? t("detail.apiKeyPlaceholderConfigured") : t("detail.apiKeyPlaceholderEmpty"),
				value: isMarkedForClear ? "" : apiKeyInput,
				onChange: (ev) => onApiKeyInputChange(ev.target.value),
				style: { flex: 1 }
			}), e$12("button", {
				type: "button",
				className: isMarkedForClear ? "dsh-cs-btn undo" : "dsh-cs-btn danger",
				title: isMarkedForClear ? t("detail.undoClearKeyTitle") : t("detail.clearKeyTitle"),
				onClick: isMarkedForClear ? onUndoClearApiKey : onClearApiKey,
				style: { flexShrink: 0 }
			}, e$12(isMarkedForClear ? _deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular : _deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 14 }), e$12("span", null, isMarkedForClear ? t("detail.undoClearKey") : t("detail.clearKey"))))) : null, engineDef.id === "bing" ? e$12("div", { className: "dsh-cs-field" }, e$12("label", { className: "dsh-cs-field-label" }, t("detail.marketLabel")), e$12("select", {
				className: "dsh-cs-select",
				value: engineConfig.market || "zh-CN",
				onChange: (ev) => onChangeOption("market", ev.target.value)
			}, e$12("option", { value: "zh-CN" }, "zh-CN (简体中文)"), e$12("option", { value: "zh-TW" }, "zh-TW (繁体中文)"), e$12("option", { value: "en-US" }, "en-US (美式英语)"), e$12("option", { value: "en-GB" }, "en-GB (英式英语)"), e$12("option", { value: "ja-JP" }, "ja-JP (日语)"), e$12("option", { value: "ru-RU" }, "ru-RU (俄语)"), e$12("option", { value: "de-DE" }, "de-DE (德语)"), e$12("option", { value: "fr-FR" }, "fr-FR (法语)"))) : null, engineDef.id === "searxng" ? e$12("div", { className: "dsh-cs-field full-width" }, e$12("label", { className: "dsh-cs-field-label" }, t("detail.searxngLabel")), e$12("input", {
				type: "text",
				className: "dsh-cs-input",
				value: Array.isArray(engineConfig.instances) ? engineConfig.instances.join(", ") : "",
				placeholder: "https://searx.be, https://priv.au",
				onChange: (ev) => {
					onChangeOption("instances", ev.target.value.split(",").map((s) => s.trim()).filter(Boolean));
				}
			})) : null));
		}
		//#endregion
		//#region lib/types/client/components/settings/EngineDetailList.js
		const e$11 = react.createElement;
		function EngineDetailList({ allOrderedDefs, config, initialConfig: _initialConfig, keyInputs, keyUpdates, onToggleEnable, onChangeTimeout, onChangeKeyRef, onApiKeyInputChange, onClearApiKey, onUndoClearApiKey, onChangeOption }) {
			return e$11(react.Fragment, null, allOrderedDefs.map(({ def, orderIndex }) => {
				const engineConf = config.engineConfigs[def.id] ?? {};
				const apiKeyInput = keyInputs[def.id] || "";
				const isMarkedForClear = keyUpdates[def.id]?.value === "";
				return e$11(EngineDetailCard, {
					key: def.id,
					engineDef: def,
					orderIndex,
					engineConfig: engineConf,
					defaultTimeout: config.defaultTimeout,
					apiKeyInput,
					isMarkedForClear,
					onToggleEnable: (enable) => onToggleEnable(def.id, enable),
					onChangeTimeout: (timeout) => onChangeTimeout(def.id, timeout),
					onChangeKeyRef: (keyRef) => onChangeKeyRef(def.id, keyRef),
					onApiKeyInputChange: (val) => onApiKeyInputChange(def.id, val, def.defaultKeyRef),
					onClearApiKey: () => onClearApiKey(def.id, def.defaultKeyRef),
					onUndoClearApiKey: () => onUndoClearApiKey(def.id),
					onChangeOption: (key, value) => onChangeOption(def.id, key, value)
				});
			}));
		}
		//#endregion
		//#region lib/types/client/components/SortablePreviewCard.js
		const e$10 = react.createElement;
		function DragHandleIcon() {
			return e$10("svg", {
				width: "14",
				height: "14",
				viewBox: "0 0 16 16",
				fill: "currentColor",
				style: { opacity: .6 }
			}, e$10("circle", {
				cx: "5",
				cy: "3",
				r: "1.5"
			}), e$10("circle", {
				cx: "11",
				cy: "3",
				r: "1.5"
			}), e$10("circle", {
				cx: "5",
				cy: "8",
				r: "1.5"
			}), e$10("circle", {
				cx: "11",
				cy: "8",
				r: "1.5"
			}), e$10("circle", {
				cx: "5",
				cy: "13",
				r: "1.5"
			}), e$10("circle", {
				cx: "11",
				cy: "13",
				r: "1.5"
			}));
		}
		function DropPlaceholderCard({ orderIndex, engineDef }) {
			const { t } = useI18n();
			const engineName = engineDef ? t(`engines.${engineDef.id}.name`) || engineDef.id : "";
			return e$10("div", { className: "dsh-cs-drop-placeholder" }, e$10("div", { style: {
				display: "flex",
				alignItems: "center",
				gap: "10px"
			} }, e$10(OrderBadge, {
				index: orderIndex,
				active: true
			}), e$10("span", { style: {
				fontSize: "13px",
				fontWeight: 600,
				color: "var(--dsw-static-deepseek-450, #2563eb)"
			} }, t("sort.dropHere"))), engineDef ? e$10("div", { style: {
				fontSize: "12px",
				color: "var(--dsw-alias-label-secondary)",
				display: "flex",
				alignItems: "center",
				gap: "8px"
			} }, e$10("span", null, t("sort.placeholderEngine", { name: engineName })), e$10(EngineTypeBadge, { type: engineDef.type })) : null);
		}
		const SortablePreviewCard = react.forwardRef(function SortablePreviewCard({ engineDef, orderIndex, timeout, defaultTimeout, className, style, onPointerDown }, ref) {
			const { t } = useI18n();
			const currentTimeout = timeout && timeout > 0 ? timeout : defaultTimeout;
			const engineName = t(`engines.${engineDef.id}.name`) || engineDef.id;
			return e$10("div", {
				ref,
				className: `dsh-cs-sort-card ${className || ""}`.trim(),
				style,
				onPointerDown
			}, e$10("div", { style: {
				display: "flex",
				alignItems: "center"
			} }, e$10("span", {
				className: "dsh-cs-drag-handle",
				title: t("sort.dragHandleTitle")
			}, e$10(DragHandleIcon)), e$10(OrderBadge, {
				index: orderIndex,
				style: { marginRight: "10px" }
			}), e$10("strong", {
				className: "dsh-cs-card-name",
				style: { marginRight: "10px" }
			}, engineName), e$10(EngineTypeBadge, { type: engineDef.type })), e$10("div", { style: {
				display: "flex",
				alignItems: "center",
				gap: "8px"
			} }, e$10("span", { style: {
				fontSize: "12px",
				color: "var(--dsw-alias-label-secondary)",
				background: "var(--dsw-alias-bg-layer-2)",
				border: "1px solid var(--dsw-alias-border-l2)",
				padding: "2px 8px",
				borderRadius: "4px",
				fontFamily: "monospace"
			} }, `${currentTimeout}ms`)));
		});
		//#endregion
		//#region lib/types/client/components/settings/EngineSortList.js
		const e$9 = react.createElement;
		function EngineSortList({ config, enabledDefs, defMap, draggedId, dragActive, targetIndex, cardWidth, initialTransform, floatingRef, handlePointerDown }) {
			const { t } = useI18n();
			if (enabledDefs.length === 0) return e$9("div", { style: {
				padding: "40px 20px",
				textAlign: "center",
				color: "var(--dsw-alias-label-tertiary)",
				background: "var(--dsw-alias-bg-layer-1)",
				borderRadius: "12px",
				border: "1px dashed var(--dsw-alias-border-l2)"
			} }, t("header.noEnabledEngines"));
			if (dragActive && draggedDefIdValid(draggedId, defMap)) {
				const activeDraggedId = draggedId;
				const remainingDefs = enabledDefs.filter((d) => d.id !== activeDraggedId);
				const draggedDef = defMap.get(activeDraggedId);
				const currentTarget = Math.max(0, Math.min(targetIndex ?? 0, remainingDefs.length));
				const elements = [];
				let remPtr = 0;
				const totalSlots = remainingDefs.length + 1;
				for (let slot = 0; slot < totalSlots; slot++) if (slot === currentTarget) elements.push(e$9(DropPlaceholderCard, {
					key: "__drop_placeholder__",
					orderIndex: slot + 1,
					engineDef: draggedDef
				}));
				else {
					const def = remainingDefs[remPtr];
					if (def) {
						const engineConf = config.engineConfigs[def.id] ?? {};
						elements.push(e$9(SortablePreviewCard, {
							key: def.id,
							engineDef: def,
							orderIndex: slot + 1,
							timeout: engineConf.timeout,
							defaultTimeout: config.defaultTimeout,
							onPointerDown: (ev) => handlePointerDown(ev, def.id, slot)
						}));
						remPtr++;
					}
				}
				const engineConf = config.engineConfigs[draggedDef.id] ?? {};
				elements.push(e$9(SortablePreviewCard, {
					key: `__floating_${draggedDef.id}__`,
					ref: floatingRef,
					engineDef: draggedDef,
					orderIndex: currentTarget + 1,
					timeout: engineConf.timeout,
					defaultTimeout: config.defaultTimeout,
					className: "dsh-cs-sort-card-floating",
					style: {
						width: cardWidth > 0 ? `${cardWidth}px` : void 0,
						transform: initialTransform
					}
				}));
				return e$9(react.Fragment, null, elements);
			}
			return e$9(react.Fragment, null, enabledDefs.map((def, idx) => {
				const engineConf = config.engineConfigs[def.id] ?? {};
				return e$9(SortablePreviewCard, {
					key: def.id,
					engineDef: def,
					orderIndex: idx + 1,
					timeout: engineConf.timeout,
					defaultTimeout: config.defaultTimeout,
					onPointerDown: (ev) => handlePointerDown(ev, def.id, idx)
				});
			}));
		}
		function draggedDefIdValid(id, map) {
			return typeof id === "string" && map.has(id);
		}
		//#endregion
		//#region lib/types/client/components/settings/useEngineDragDrop.js
		function useEngineDragDrop({ enginesOrder, onReorder }) {
			const [draggedId, setDraggedId] = react.useState(null);
			const [dragActive, setDragActive] = react.useState(false);
			const [targetIndex, setTargetIndex] = react.useState(null);
			const [cardWidth, setCardWidth] = react.useState(0);
			const [initialTransform, setInitialTransform] = react.useState("");
			const containerRef = react.useRef(null);
			const floatingRef = react.useRef(null);
			const latestPointerRef = react.useRef({
				x: 0,
				y: 0
			});
			const pendingRafRef = react.useRef(null);
			const cleanupRef = react.useRef(null);
			const dragRef = react.useRef({
				draggedId,
				dragActive,
				targetIndex,
				enginesOrder,
				onReorder,
				startX: 0,
				startY: 0,
				offsetX: 0,
				offsetY: 0,
				slotMidpoints: []
			});
			dragRef.current = {
				...dragRef.current,
				draggedId,
				dragActive,
				targetIndex,
				enginesOrder,
				onReorder
			};
			react.useLayoutEffect(() => {
				if (dragActive && floatingRef.current) {
					const { offsetX, offsetY } = dragRef.current;
					const currX = latestPointerRef.current.x - offsetX;
					const currY = latestPointerRef.current.y - offsetY;
					floatingRef.current.style.transform = `translate3d(${currX}px, ${currY}px, 0) scale(1.025) rotate(0.4deg)`;
				}
			}, [dragActive]);
			react.useEffect(() => {
				return () => {
					if (pendingRafRef.current !== null) {
						cancelAnimationFrame(pendingRafRef.current);
						pendingRafRef.current = null;
					}
					if (cleanupRef.current) cleanupRef.current();
					document.body.classList.remove("dsh-cs-is-dragging");
				};
			}, []);
			const commitDrop = react.useCallback(() => {
				const { draggedId: curId, targetIndex: curTarget, enginesOrder: curOrder, onReorder: curOnReorder } = dragRef.current;
				if (!curId || curTarget === null || !curOrder) {
					setDraggedId(null);
					setDragActive(false);
					setTargetIndex(null);
					return;
				}
				const remaining = curOrder.filter((id) => id !== curId);
				const clampedIndex = Math.max(0, Math.min(curTarget, remaining.length));
				remaining.splice(clampedIndex, 0, curId);
				if (JSON.stringify(remaining) !== JSON.stringify(curOrder)) curOnReorder(remaining);
				setDraggedId(null);
				setDragActive(false);
				setTargetIndex(null);
			}, []);
			return {
				draggedId,
				dragActive,
				targetIndex,
				cardWidth,
				initialTransform,
				containerRef,
				floatingRef,
				handlePointerDown: react.useCallback((ev, id, initialIdx) => {
					if (ev.button !== 0) return;
					const target = ev.target;
					if (target?.closest("button") || target?.closest("input") || target?.closest("select") || target?.closest("a")) return;
					if (cleanupRef.current) cleanupRef.current();
					if (pendingRafRef.current !== null) {
						cancelAnimationFrame(pendingRafRef.current);
						pendingRafRef.current = null;
					}
					const rect = ev.currentTarget.getBoundingClientRect();
					const offsetX = ev.clientX - rect.left;
					const offsetY = ev.clientY - rect.top;
					const initX = ev.clientX - offsetX;
					const initY = ev.clientY - offsetY;
					const container = containerRef.current;
					let slotMidpoints = [];
					let initialContainerTop = 0;
					let scrollDelta = 0;
					if (container) {
						initialContainerTop = container.getBoundingClientRect().top;
						slotMidpoints = Array.from(container.querySelectorAll(".dsh-cs-sort-card:not(.dsh-cs-sort-card-floating)")).map((c) => {
							const cRect = c.getBoundingClientRect();
							return cRect.top + cRect.height / 2;
						});
					}
					dragRef.current.startX = ev.clientX;
					dragRef.current.startY = ev.clientY;
					dragRef.current.offsetX = offsetX;
					dragRef.current.offsetY = offsetY;
					dragRef.current.draggedId = id;
					dragRef.current.targetIndex = initialIdx;
					dragRef.current.dragActive = false;
					dragRef.current.slotMidpoints = slotMidpoints;
					latestPointerRef.current = {
						x: ev.clientX,
						y: ev.clientY
					};
					setDraggedId(id);
					setTargetIndex(initialIdx);
					setCardWidth(rect.width);
					setInitialTransform(`translate3d(${initX}px, ${initY}px, 0) scale(1.025) rotate(0.4deg)`);
					const calculateNextSlot = (clientY) => {
						const midpoints = dragRef.current.slotMidpoints;
						const N = midpoints.length;
						if (N <= 1) return 0;
						const curTarget = dragRef.current.targetIndex ?? 0;
						const effectiveY = clientY + scrollDelta;
						let nextSlot = N - 1;
						for (let i = 0; i < N - 1; i++) if (effectiveY < midpoints[i < curTarget ? i : i + 1]) {
							nextSlot = i;
							break;
						}
						return nextSlot;
					};
					const updateFrame = () => {
						pendingRafRef.current = null;
						if (!dragRef.current.dragActive) return;
						const { offsetX: offX, offsetY: offY } = dragRef.current;
						const currX = latestPointerRef.current.x - offX;
						const currY = latestPointerRef.current.y - offY;
						if (floatingRef.current) floatingRef.current.style.transform = `translate3d(${currX}px, ${currY}px, 0) scale(1.025) rotate(0.4deg)`;
						const nextSlot = calculateNextSlot(latestPointerRef.current.y);
						if (dragRef.current.targetIndex !== nextSlot) {
							dragRef.current.targetIndex = nextSlot;
							setTargetIndex(nextSlot);
						}
					};
					const handlePointerMove = (moveEv) => {
						if (!dragRef.current.draggedId) return;
						latestPointerRef.current.x = moveEv.clientX;
						latestPointerRef.current.y = moveEv.clientY;
						if (!dragRef.current.dragActive) {
							if (Math.hypot(moveEv.clientX - dragRef.current.startX, moveEv.clientY - dragRef.current.startY) > 3) {
								dragRef.current.dragActive = true;
								setDragActive(true);
								document.body.classList.add("dsh-cs-is-dragging");
							} else return;
						}
						if (pendingRafRef.current === null) pendingRafRef.current = requestAnimationFrame(updateFrame);
					};
					const handleScroll = () => {
						const cont = containerRef.current;
						if (cont) {
							const currentContainerTop = cont.getBoundingClientRect().top;
							scrollDelta = initialContainerTop - currentContainerTop;
						}
						if (dragRef.current.dragActive && pendingRafRef.current === null) pendingRafRef.current = requestAnimationFrame(updateFrame);
					};
					const cleanupEvents = () => {
						window.removeEventListener("pointermove", handlePointerMove);
						window.removeEventListener("pointerup", handlePointerUp);
						window.removeEventListener("pointercancel", handlePointerUp);
						window.removeEventListener("keydown", handleKeyDown);
						window.removeEventListener("scroll", handleScroll, true);
						document.body.classList.remove("dsh-cs-is-dragging");
						cleanupRef.current = null;
					};
					const handlePointerUp = () => {
						if (pendingRafRef.current !== null) {
							cancelAnimationFrame(pendingRafRef.current);
							pendingRafRef.current = null;
						}
						cleanupEvents();
						if (dragRef.current.dragActive) {
							const finalSlot = calculateNextSlot(latestPointerRef.current.y);
							if (dragRef.current.targetIndex !== finalSlot) dragRef.current.targetIndex = finalSlot;
							commitDrop();
						} else {
							setDraggedId(null);
							setDragActive(false);
							setTargetIndex(null);
						}
					};
					const handleKeyDown = (keyEv) => {
						if (keyEv.key === "Escape") {
							if (pendingRafRef.current !== null) {
								cancelAnimationFrame(pendingRafRef.current);
								pendingRafRef.current = null;
							}
							cleanupEvents();
							setDraggedId(null);
							setDragActive(false);
							setTargetIndex(null);
						}
					};
					cleanupRef.current = cleanupEvents;
					window.addEventListener("pointermove", handlePointerMove);
					window.addEventListener("pointerup", handlePointerUp);
					window.addEventListener("pointercancel", handlePointerUp);
					window.addEventListener("keydown", handleKeyDown);
					window.addEventListener("scroll", handleScroll, {
						passive: true,
						capture: true
					});
				}, [commitDrop]),
				commitDrop
			};
		}
		//#endregion
		//#region lib/types/client/components/common/Modal.js
		const e$8 = react.createElement;
		function Modal({ open, onClose, title, icon, closeTitle, panelClassName, footer, children }) {
			react.useEffect(() => {
				if (!open) return;
				const handleKeyDown = (ev) => {
					if (ev.key === "Escape") onClose();
				};
				window.addEventListener("keydown", handleKeyDown);
				return () => window.removeEventListener("keydown", handleKeyDown);
			}, [open, onClose]);
			if (!open) return null;
			return e$8("div", {
				className: "dsh-cs-modal-overlay",
				onClick: (ev) => {
					if (ev.target === ev.currentTarget) onClose();
				}
			}, e$8("div", {
				className: `dsh-cs-modal-panel ${panelClassName || ""}`.trim(),
				role: "dialog",
				"aria-modal": true,
				"aria-label": title
			}, e$8("div", { className: "dsh-cs-modal-header" }, e$8("div", { className: "dsh-cs-modal-title-row" }, icon || null, e$8("h3", { className: "dsh-cs-modal-title" }, title)), e$8("button", {
				type: "button",
				className: "dsh-cs-modal-close-btn",
				onClick: onClose,
				title: closeTitle
			}, e$8(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 16 }))), children, footer || null));
		}
		//#endregion
		//#region lib/types/client/components/test-modal/EmptyState.js
		const e$7 = react.createElement;
		function EmptyState({ noEnabledEngines, enabledEngineIds, defMap }) {
			const { t } = useI18n();
			if (noEnabledEngines) return e$7("div", { className: "dsh-cs-test-empty-notice warning" }, e$7(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular, { size: 16 }), e$7("span", null, t("testModal.noEnabledEngines")));
			return e$7("div", { className: "dsh-cs-test-empty-state" }, e$7("p", null, t("testModal.emptyState")), e$7("div", { className: "dsh-cs-test-pills-list" }, enabledEngineIds.map((id, idx) => {
				const name = defMap.get(id) ? t(`engines.${id}.name`) || id : id;
				return e$7("span", {
					key: id,
					className: "dsh-cs-test-engine-pill"
				}, e$7("strong", null, `#${idx + 1}`), ` ${name}`);
			})));
		}
		//#endregion
		//#region lib/types/client/components/test-modal/ResultSourceItem.js
		const e$6 = react.createElement;
		function ResultSourceItem({ src, sIdx, engineId, isExpanded, onToggleExpand }) {
			const { t } = useI18n();
			const sourceKey = `${engineId}-${sIdx}`;
			const [canExpand, setCanExpand] = react.useState(false);
			const snippetRef = react.useRef(null);
			react.useEffect(() => {
				const el = snippetRef.current;
				if (!el) return;
				const checkOverflow = () => {
					if (!isExpanded && snippetRef.current) {
						const overflows = snippetRef.current.scrollHeight > snippetRef.current.clientHeight + 2;
						setCanExpand(overflows);
					}
				};
				checkOverflow();
				if (typeof ResizeObserver !== "undefined") {
					const ro = new ResizeObserver(() => checkOverflow());
					ro.observe(el);
					return () => ro.disconnect();
				}
			}, [src.snippet, isExpanded]);
			const handleClick = (ev) => {
				if (!canExpand) return;
				if (ev.target?.closest("a")) return;
				const selection = window.getSelection();
				if (selection && selection.toString().trim().length > 0) return;
				onToggleExpand(sourceKey);
			};
			const tooltipTitle = canExpand ? isExpanded ? t("testModal.collapseSnippet") : t("testModal.expandSnippet") : void 0;
			return e$6("div", {
				className: `dsh-cs-test-source-item ${canExpand ? "expandable" : ""} ${isExpanded ? "expanded" : ""}`,
				title: tooltipTitle,
				onClick: handleClick
			}, e$6("div", { className: "dsh-cs-test-source-title-row" }, e$6("a", {
				href: src.url,
				target: "_blank",
				rel: "noopener noreferrer",
				className: "dsh-cs-test-source-title"
			}, src.title || src.url, e$6(_deepseek_ai_dsh_client_ui_primitives.IconRightUpOutlineRegular, {
				size: 12,
				className: "dsh-cs-test-external-icon"
			})), src.publishedAt ? e$6("span", { className: "dsh-cs-test-source-date" }, src.publishedAt) : null), e$6("div", { className: "dsh-cs-test-source-url" }, src.url), src.snippet ? e$6("div", {
				ref: snippetRef,
				className: "dsh-cs-test-source-snippet"
			}, src.snippet) : null, src.snippet && canExpand ? e$6("div", { className: "dsh-cs-test-source-footer" }, e$6("span", { className: "dsh-cs-test-source-hint" }, isExpanded ? `▴ ${t("testModal.collapseSnippet")}` : `▾ ${t("testModal.expandSnippet")}`)) : null);
		}
		//#endregion
		//#region lib/types/client/components/test-modal/StatusBadge.js
		const e$5 = react.createElement;
		function StatusBadge({ status }) {
			const { t } = useI18n();
			if (status.state === "loading") return e$5("span", { className: "dsh-cs-test-badge loading" }, e$5(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutlineRegular, {
				size: 12,
				className: "dsh-cs-spin"
			}), e$5("span", null, t("testModal.statusSearching")));
			if (status.state === "success") {
				const srcCount = status.result?.sources?.length ?? 0;
				if (srcCount > 0) return e$5("span", { className: "dsh-cs-test-badge success" }, e$5(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutlineRegular, { size: 12 }), e$5("span", null, t("testModal.statusSuccess", {
					count: srcCount,
					ms: status.durationMs ?? 0
				})));
				return e$5("span", { className: "dsh-cs-test-badge warning" }, e$5(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular, { size: 12 }), e$5("span", null, t("testModal.statusEmpty", { ms: status.durationMs ?? 0 })));
			}
			if (status.state === "error") return e$5("span", { className: "dsh-cs-test-badge error" }, e$5(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular, { size: 12 }), e$5("span", null, t("testModal.statusFailed", { ms: status.durationMs ?? 0 })));
			return e$5("span", { className: "dsh-cs-test-badge pending" }, e$5("span", null, t("testModal.statusPending")));
		}
		//#endregion
		//#region lib/types/client/components/test-modal/EngineResultCard.js
		const e$4 = react.createElement;
		function EngineResultCard({ engineId, orderIndex, definition, status, isCollapsed, query, expandedSources, onToggleCollapse, onRetry, onToggleSourceExpand }) {
			const { t } = useI18n();
			const engineName = definition ? t(`engines.${engineId}.name`) || engineId : engineId;
			return e$4("div", { className: "dsh-cs-test-engine-card" }, e$4("div", {
				className: `dsh-cs-test-engine-header ${isCollapsed ? "collapsed" : ""}`,
				onClick: () => onToggleCollapse(engineId)
			}, e$4("div", { className: "dsh-cs-test-engine-identity" }, e$4(OrderBadge, {
				index: orderIndex,
				active: true
			}), e$4("span", { className: "dsh-cs-test-engine-name" }, engineName), definition ? e$4(EngineTypeBadge, { type: definition.type }) : null), e$4("div", { className: "dsh-cs-test-engine-actions" }, e$4(StatusBadge, { status }), e$4("button", {
				type: "button",
				className: "dsh-cs-btn secondary dsh-cs-test-retry-btn",
				disabled: status.state === "loading" || query.trim().length === 0,
				onClick: (ev) => {
					ev.stopPropagation();
					onRetry(engineId);
				},
				title: t("testModal.retry")
			}, e$4(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular, { size: 13 }), e$4("span", null, t("testModal.retry"))), e$4("button", {
				type: "button",
				className: "dsh-cs-btn secondary dsh-cs-test-expand-btn",
				onClick: (ev) => {
					ev.stopPropagation();
					onToggleCollapse(engineId);
				},
				title: isCollapsed ? t("testModal.expand") : t("testModal.collapse")
			}, isCollapsed ? e$4(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 12 }) : e$4(_deepseek_ai_dsh_client_ui_primitives.IconChevronUpOutlineRegular, { size: 12 }), e$4("span", null, isCollapsed ? t("testModal.expand") : t("testModal.collapse"))))), !isCollapsed ? e$4("div", { className: "dsh-cs-test-engine-body" }, status.state === "loading" ? e$4("div", { className: "dsh-cs-test-loading-hint" }, e$4(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutlineRegular, {
				size: 16,
				className: "dsh-cs-spin"
			}), e$4("span", null, `正在检索 ${engineName}...`)) : status.state === "error" ? e$4("div", { className: "dsh-cs-test-error-box" }, status.error || "Request failed") : status.state === "success" ? !status.result?.sources || status.result.sources.length === 0 ? e$4("div", { className: "dsh-cs-test-empty-notice" }, t("testModal.noResults")) : e$4("div", { className: "dsh-cs-test-sources-list" }, status.result.sources.map((src, sIdx) => e$4(ResultSourceItem, {
				key: `${src.url}-${sIdx}`,
				src,
				sIdx,
				engineId,
				isExpanded: Boolean(expandedSources[`${engineId}-${sIdx}`]),
				onToggleExpand: onToggleSourceExpand
			}))) : null) : null);
		}
		//#endregion
		//#region lib/types/client/components/test-modal/SearchBar.js
		const e$3 = react.createElement;
		function SearchBar({ inputRef, query, onQueryChange, onSearch, isSearching, disabled }) {
			const { t } = useI18n();
			return e$3("div", { className: "dsh-cs-test-searchbar" }, e$3("input", {
				ref: inputRef,
				type: "text",
				className: "dsh-cs-input dsh-cs-test-input",
				value: query,
				placeholder: t("testModal.searchPlaceholder"),
				onChange: (ev) => onQueryChange(ev.target.value),
				onKeyDown: (ev) => {
					if (ev.key === "Enter") {
						ev.preventDefault();
						onSearch();
					}
				}
			}), e$3("button", {
				type: "button",
				className: "dsh-cs-btn primary dsh-cs-test-search-btn",
				onClick: onSearch,
				disabled
			}, isSearching ? e$3(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutlineRegular, {
				size: 14,
				className: "dsh-cs-spin"
			}) : e$3(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutlineRegular, { size: 14 }), e$3("span", null, isSearching ? t("testModal.searchingBtn") : t("testModal.searchBtn"))));
		}
		//#endregion
		//#region lib/types/client/components/test-modal/useEngineTesting.js
		function useEngineTesting({ enabledEngineIds, engineConfigs, keyInputs, open }) {
			const [query, setQuery] = react.useState("");
			const [isSearching, setIsSearching] = react.useState(false);
			const [engineStates, setEngineStates] = react.useState({});
			const [hasSearched, setHasSearched] = react.useState(false);
			const abortControllerRef = react.useRef(null);
			react.useEffect(() => {
				if (!open && abortControllerRef.current) {
					abortControllerRef.current.abort();
					abortControllerRef.current = null;
				}
			}, [open]);
			const runTestForEngine = react.useCallback(async (engineId, searchQuery, signal) => {
				setEngineStates((prev) => ({
					...prev,
					[engineId]: { state: "loading" }
				}));
				try {
					const engineConf = engineConfigs[engineId];
					const tempKey = keyInputs[engineId];
					const res = await testEngine({
						engineId,
						query: searchQuery,
						maxResults: 5,
						engineConfig: engineConf,
						tempApiKey: tempKey !== void 0 ? tempKey : void 0
					}, signal);
					if (res.ok && res.data.result) setEngineStates((prev) => ({
						...prev,
						[engineId]: {
							state: "success",
							durationMs: res.data.durationMs,
							result: res.data.result
						}
					}));
					else setEngineStates((prev) => ({
						...prev,
						[engineId]: {
							state: "error",
							durationMs: res.data.durationMs,
							error: res.data.error || "Unknown search error"
						}
					}));
				} catch (err) {
					if (signal?.aborted) return;
					setEngineStates((prev) => ({
						...prev,
						[engineId]: {
							state: "error",
							durationMs: 0,
							error: err instanceof Error ? err.message : String(err)
						}
					}));
				}
			}, [engineConfigs, keyInputs]);
			const handleSearchAll = react.useCallback(async (onSuccessStart) => {
				const trimmed = query.trim();
				if (!trimmed || enabledEngineIds.length === 0 || isSearching) return;
				if (abortControllerRef.current) abortControllerRef.current.abort();
				const ctrl = new AbortController();
				abortControllerRef.current = ctrl;
				setIsSearching(true);
				setHasSearched(true);
				if (onSuccessStart) onSuccessStart();
				const initialStatus = {};
				for (const id of enabledEngineIds) initialStatus[id] = { state: "loading" };
				setEngineStates(initialStatus);
				try {
					await Promise.allSettled(enabledEngineIds.map((id) => runTestForEngine(id, trimmed, ctrl.signal)));
				} finally {
					setIsSearching(false);
				}
			}, [
				query,
				enabledEngineIds,
				isSearching,
				runTestForEngine
			]);
			const handleRetrySingle = react.useCallback((engineId, onBeforeRetry) => {
				const trimmed = query.trim();
				if (!trimmed) return;
				if (onBeforeRetry) onBeforeRetry();
				runTestForEngine(engineId, trimmed);
			}, [query, runTestForEngine]);
			return {
				query,
				setQuery,
				isSearching,
				hasSearched,
				engineStates,
				summary: react.useMemo(() => {
					const total = enabledEngineIds.length;
					let success = 0;
					let failed = 0;
					for (const id of enabledEngineIds) {
						const st = engineStates[id];
						if (st?.state === "success") success++;
						if (st?.state === "error") failed++;
					}
					return {
						total,
						success,
						failed
					};
				}, [enabledEngineIds, engineStates]),
				runTestForEngine,
				handleSearchAll,
				handleRetrySingle
			};
		}
		//#endregion
		//#region lib/types/client/components/test-modal/SearchModal.js
		const e$2 = react.createElement;
		function SearchModal({ open, onClose, enabledEngineIds, definitions, engineConfigs, keyInputs }) {
			const { t } = useI18n();
			const inputRef = react.useRef(null);
			const [collapsedMap, setCollapsedMap] = react.useState({});
			const [expandedSources, setExpandedSources] = react.useState({});
			const { query, setQuery, isSearching, hasSearched, engineStates, summary, handleSearchAll, handleRetrySingle } = useEngineTesting({
				enabledEngineIds,
				engineConfigs,
				keyInputs,
				open
			});
			react.useEffect(() => {
				if (open) setTimeout(() => {
					inputRef.current?.focus();
				}, 50);
			}, [open]);
			const toggleSourceExpand = react.useCallback((key) => {
				setExpandedSources((prev) => ({
					...prev,
					[key]: !prev[key]
				}));
			}, []);
			const toggleCollapse = react.useCallback((id) => {
				setCollapsedMap((prev) => ({
					...prev,
					[id]: !prev[id]
				}));
			}, []);
			const handleExpandAll = react.useCallback(() => {
				setCollapsedMap({});
			}, []);
			const handleCollapseAll = react.useCallback(() => {
				const next = {};
				for (const id of enabledEngineIds) next[id] = true;
				setCollapsedMap(next);
			}, [enabledEngineIds]);
			const onSearch = react.useCallback(() => {
				handleSearchAll(() => {
					setCollapsedMap({});
					setExpandedSources({});
				});
			}, [handleSearchAll]);
			const onRetry = react.useCallback((id) => {
				handleRetrySingle(id, () => {
					setCollapsedMap((prev) => ({
						...prev,
						[id]: false
					}));
				});
			}, [handleRetrySingle]);
			const defMap = react.useMemo(() => {
				const map = /* @__PURE__ */ new Map();
				for (const def of definitions) map.set(def.id, def);
				return map;
			}, [definitions]);
			const modalFooter = e$2("div", { className: "dsh-cs-modal-footer" }, e$2("div", { className: "dsh-cs-modal-footer-left" }, hasSearched && summary.total > 0 ? e$2("span", { className: "dsh-cs-test-summary" }, t("testModal.summary", {
				total: summary.total,
				success: summary.success,
				failed: summary.failed
			})) : null), e$2("div", { className: "dsh-cs-modal-footer-right" }, e$2("button", {
				type: "button",
				className: "dsh-cs-btn secondary",
				onClick: onClose
			}, t("testModal.close"))));
			return e$2(Modal, {
				open,
				onClose,
				title: t("testModal.title"),
				icon: e$2(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutlineRegular, { size: 18 }),
				closeTitle: t("testModal.close"),
				footer: modalFooter
			}, e$2(SearchBar, {
				inputRef,
				query,
				onQueryChange: setQuery,
				onSearch,
				isSearching,
				disabled: isSearching || query.trim().length === 0 || enabledEngineIds.length === 0
			}), hasSearched && enabledEngineIds.length > 0 ? e$2("div", { className: "dsh-cs-test-toolbar" }, e$2("span", { className: "dsh-cs-test-toolbar-count" }, t("footer.enabledCountRatio", {
				enabled: enabledEngineIds.length,
				total: enabledEngineIds.length
			})), e$2("div", { className: "dsh-cs-test-toolbar-actions" }, e$2("button", {
				type: "button",
				className: "dsh-cs-test-text-btn",
				onClick: handleExpandAll
			}, t("testModal.expandAll")), e$2("button", {
				type: "button",
				className: "dsh-cs-test-text-btn",
				onClick: handleCollapseAll
			}, t("testModal.collapseAll")))) : null, e$2("div", { className: "dsh-cs-test-results-container" }, enabledEngineIds.length === 0 || !hasSearched ? e$2(EmptyState, {
				noEnabledEngines: enabledEngineIds.length === 0,
				enabledEngineIds,
				defMap
			}) : enabledEngineIds.map((id, idx) => e$2(EngineResultCard, {
				key: id,
				engineId: id,
				orderIndex: idx + 1,
				definition: defMap.get(id),
				status: engineStates[id] || { state: "idle" },
				isCollapsed: Boolean(collapsedMap[id]),
				query,
				expandedSources,
				onToggleCollapse: toggleCollapse,
				onRetry,
				onToggleSourceExpand: toggleSourceExpand
			}))));
		}
		//#endregion
		//#region lib/types/client/components/SettingsView.js
		const e$1 = react.createElement;
		function SettingsView() {
			const { t } = useI18n();
			const [config, setConfig] = react.useState(null);
			const [initialConfig, setInitialConfig] = react.useState(null);
			const [definitions, setDefinitions] = react.useState([]);
			const [keyInputs, setKeyInputs] = react.useState({});
			const [keyUpdates, setKeyUpdates] = react.useState({});
			const [isSortMode, setIsSortMode] = react.useState(false);
			const [isTestModalOpen, setIsTestModalOpen] = react.useState(false);
			const [loading, setLoading] = react.useState(true);
			const [saving, setSaving] = react.useState(false);
			const [errorMessage, setErrorMessage] = react.useState(null);
			const [savedSuccess, setSavedSuccess] = react.useState(false);
			const loadData = react.useCallback(async () => {
				try {
					setLoading(true);
					const data = await fetchConfig();
					setConfig(data.config);
					setInitialConfig(data.config);
					setDefinitions(data.definitions);
					setKeyInputs({});
					setKeyUpdates({});
					setErrorMessage(null);
					setSavedSuccess(false);
				} catch (err) {
					setErrorMessage(`${t("header.loadFailed")} ${err instanceof Error ? err.message : String(err)}`);
				} finally {
					setLoading(false);
				}
			}, [t]);
			react.useEffect(() => {
				loadData();
			}, [loadData]);
			const onReorder = react.useCallback((newOrder) => {
				if (!config) return;
				setConfig({
					...config,
					enginesOrder: newOrder
				});
				setSavedSuccess(false);
				setErrorMessage(null);
			}, [config]);
			const { draggedId, dragActive, targetIndex, cardWidth, initialTransform, containerRef, floatingRef, handlePointerDown } = useEngineDragDrop({
				enginesOrder: config?.enginesOrder ?? [],
				onReorder
			});
			const handleSave = async () => {
				if (!config) return;
				try {
					setSaving(true);
					setErrorMessage(null);
					await saveConfig({
						defaultTimeout: config.defaultTimeout,
						enginesOrder: config.enginesOrder,
						engineConfigs: config.engineConfigs,
						keyUpdates: Object.keys(keyUpdates).length > 0 ? keyUpdates : void 0
					});
					setKeyUpdates({});
					setKeyInputs({});
					setInitialConfig(config);
					setSavedSuccess(true);
					const refreshed = await fetchConfig();
					setDefinitions(refreshed.definitions);
				} catch (err) {
					setErrorMessage(`${t("header.saveFailed")} ${err instanceof Error ? err.message : String(err)}`);
				} finally {
					setSaving(false);
				}
			};
			const clearedEngineIds = react.useMemo(() => Object.keys(keyUpdates).filter((id) => keyUpdates[id]?.value === ""), [keyUpdates]);
			const hasOtherChanges = react.useMemo(() => {
				if (!config || !initialConfig) return false;
				if (config.defaultTimeout !== initialConfig.defaultTimeout) return true;
				if (JSON.stringify(config.enginesOrder) !== JSON.stringify(initialConfig.enginesOrder)) return true;
				if (JSON.stringify(config.engineConfigs) !== JSON.stringify(initialConfig.engineConfigs)) return true;
				for (const id of Object.keys(keyUpdates)) if (keyUpdates[id]?.value !== "") return true;
				return false;
			}, [
				config,
				initialConfig,
				keyUpdates
			]);
			const displayMessage = react.useMemo(() => {
				if (errorMessage) return errorMessage;
				if (clearedEngineIds.length > 0) {
					const names = clearedEngineIds.map((id) => t(`engines.${id}.name`) || id).join("、");
					if (hasOtherChanges) return t("header.unsavedWithClearedAndOther", { names });
					return t("header.unsavedWithClearedOnly", { names });
				}
				if (hasOtherChanges) return t("header.unsavedChanges");
				if (savedSuccess) return t("header.saveSuccess");
				return null;
			}, [
				errorMessage,
				clearedEngineIds,
				hasOtherChanges,
				savedSuccess,
				t
			]);
			const handleToggleEnable = react.useCallback((engineId, enable) => {
				if (!config) return;
				setSavedSuccess(false);
				setErrorMessage(null);
				let newOrder = [...config.enginesOrder];
				if (enable) {
					if (!newOrder.includes(engineId)) newOrder.push(engineId);
				} else newOrder = newOrder.filter((id) => id !== engineId);
				setConfig({
					...config,
					enginesOrder: newOrder
				});
			}, [config]);
			const handleChangeTimeout = react.useCallback((engineId, timeout) => {
				if (!config) return;
				setSavedSuccess(false);
				setErrorMessage(null);
				const currentConf = config.engineConfigs[engineId] ?? {};
				setConfig({
					...config,
					engineConfigs: {
						...config.engineConfigs,
						[engineId]: {
							...currentConf,
							timeout
						}
					}
				});
			}, [config]);
			const handleChangeKeyRef = react.useCallback((engineId, keyRef) => {
				if (!config) return;
				setSavedSuccess(false);
				setErrorMessage(null);
				const currentConf = config.engineConfigs[engineId] ?? {};
				setConfig({
					...config,
					engineConfigs: {
						...config.engineConfigs,
						[engineId]: {
							...currentConf,
							keyRef
						}
					}
				});
			}, [config]);
			const handleApiKeyInputChange = react.useCallback((engineId, val, defaultKeyRef) => {
				if (!config) return;
				setSavedSuccess(false);
				setErrorMessage(null);
				setKeyInputs((prev) => ({
					...prev,
					[engineId]: val
				}));
				const targetRef = (config.engineConfigs[engineId] ?? {}).keyRef || defaultKeyRef || "";
				if (targetRef) setKeyUpdates((prev) => ({
					...prev,
					[engineId]: {
						keyRef: targetRef,
						value: val
					}
				}));
			}, [config]);
			const handleClearApiKey = react.useCallback((engineId, defaultKeyRef) => {
				if (!config) return;
				setSavedSuccess(false);
				setErrorMessage(null);
				const initialKeyRef = initialConfig?.engineConfigs[engineId]?.keyRef;
				const currentConf = config.engineConfigs[engineId] ?? {};
				const targetRef = initialKeyRef || currentConf.keyRef || defaultKeyRef || "";
				setConfig({
					...config,
					engineConfigs: {
						...config.engineConfigs,
						[engineId]: {
							...currentConf,
							keyRef: initialKeyRef
						}
					}
				});
				setKeyInputs((prev) => ({
					...prev,
					[engineId]: ""
				}));
				if (targetRef) setKeyUpdates((prev) => ({
					...prev,
					[engineId]: {
						keyRef: targetRef,
						value: ""
					}
				}));
			}, [config, initialConfig]);
			const handleUndoClearApiKey = react.useCallback((engineId) => {
				setSavedSuccess(false);
				setErrorMessage(null);
				setKeyUpdates((prev) => {
					const next = { ...prev };
					delete next[engineId];
					return next;
				});
			}, []);
			const handleChangeOption = react.useCallback((engineId, key, value) => {
				if (!config) return;
				setSavedSuccess(false);
				setErrorMessage(null);
				const currentConf = config.engineConfigs[engineId] ?? {};
				setConfig({
					...config,
					engineConfigs: {
						...config.engineConfigs,
						[engineId]: {
							...currentConf,
							[key]: value
						}
					}
				});
			}, [config]);
			if (loading) return e$1("div", {
				className: "dsh-cs-container",
				style: {
					padding: "60px 20px",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: "10px",
					color: "var(--dsw-alias-label-secondary)"
				}
			}, e$1(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutlineRegular, {
				size: 24,
				className: "dsh-cs-spin"
			}), e$1("span", null, t("header.loading")));
			if (!config) return e$1("div", {
				className: "dsh-cs-container",
				style: {
					padding: "40px 20px",
					textAlign: "center",
					color: "var(--dsw-alias-state-error-primary, #ef4444)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "8px"
				}
			}, e$1(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular, { size: 18 }), e$1("span", null, errorMessage || t("header.loadFailed")));
			const defMap = /* @__PURE__ */ new Map();
			for (const def of definitions) defMap.set(def.id, def);
			const enabledDefs = config.enginesOrder.map((id) => defMap.get(id)).filter(Boolean);
			const allOrderedDefs = [];
			const orderSet = new Set(config.enginesOrder);
			config.enginesOrder.forEach((id, idx) => {
				const def = defMap.get(id);
				if (def) allOrderedDefs.push({
					def,
					orderIndex: idx + 1
				});
			});
			definitions.forEach((def) => {
				if (!orderSet.has(def.id)) allOrderedDefs.push({
					def,
					orderIndex: void 0
				});
			});
			return e$1("div", { className: "dsh-cs-container" }, e$1(HeaderBar, {
				isSortMode,
				onToggleSortMode: () => setIsSortMode(!isSortMode),
				defaultTimeout: config.defaultTimeout,
				onChangeDefaultTimeout: (val) => {
					setSavedSuccess(false);
					setErrorMessage(null);
					setConfig({
						...config,
						defaultTimeout: val
					});
				}
			}), e$1("div", {
				ref: containerRef,
				className: "dsh-cs-list"
			}, isSortMode ? e$1(EngineSortList, {
				config,
				enabledDefs,
				defMap,
				draggedId,
				dragActive,
				targetIndex,
				cardWidth,
				initialTransform,
				floatingRef,
				handlePointerDown
			}) : e$1(EngineDetailList, {
				allOrderedDefs,
				config,
				initialConfig,
				keyInputs,
				keyUpdates,
				onToggleEnable: handleToggleEnable,
				onChangeTimeout: handleChangeTimeout,
				onChangeKeyRef: handleChangeKeyRef,
				onApiKeyInputChange: handleApiKeyInputChange,
				onClearApiKey: handleClearApiKey,
				onUndoClearApiKey: handleUndoClearApiKey,
				onChangeOption: handleChangeOption
			})), e$1(FooterBar, {
				onSave: handleSave,
				saving,
				onOpenTestSearch: () => setIsTestModalOpen(true),
				message: displayMessage,
				enabledCount: config.enginesOrder.length,
				totalCount: definitions.length
			}), isTestModalOpen ? e$1(SearchModal, {
				open: isTestModalOpen,
				onClose: () => setIsTestModalOpen(false),
				enabledEngineIds: config.enginesOrder,
				definitions,
				engineConfigs: config.engineConfigs,
				keyInputs
			}) : null);
		}
		//#endregion
		//#region lib/types/client/locales/en.js
		/**
		* English copy for the custom web-search settings page.
		*
		* Flat dictionary: the key is the whole dotted path, which is exactly what the
		* locale namespace `cust-search` declares. `en` is the single source of truth
		* for the key union; `zh` must cover every key.
		*/
		const en = {
			"header.sortModeActive": "Sort Mode",
			"header.detailMode": "Detail Configuration Mode",
			"header.defaultTimeout": "Global Default Timeout:",
			"header.saving": "Saving...",
			"header.save": "Save Config",
			"header.saveSuccess": "Configuration saved and active",
			"header.unsavedChanges": "Configuration modified. Save config to apply.",
			"header.unsavedWithClearedOnly": "Marked to clear credentials for {names}. Save config to apply.",
			"header.unsavedWithClearedAndOther": "Configuration modified (marked to clear credentials for {names}). Save config to apply.",
			"header.saveFailed": "Save failed:",
			"header.loadFailed": "Failed to load config:",
			"header.loading": "Loading search plugin configuration...",
			"header.noEnabledEngines": "No search engines enabled. Please switch to Detail Mode to enable engines.",
			"badge.bridge": "Official Bridge",
			"badge.keyed": "Key Required",
			"badge.free": "Free (No Key)",
			"badge.disabled": "Disabled",
			"badge.enabled": "Enabled",
			"badge.clickToEnable": "Not Enabled",
			"detail.timeoutLabel": "Custom Timeout (ms)",
			"detail.timeoutPlaceholder": "Inherit Global ({timeout}ms)",
			"detail.keyRefLabel": "Credential Name (KeyRef)",
			"detail.apiKeyLabel": "API Key Configuration",
			"detail.apiKeyPlaceholderConfigured": "Configured (Type new key to override)",
			"detail.apiKeyPlaceholderEmpty": "Enter API Key",
			"detail.clearKey": "Clear Key",
			"detail.clearKeyTitle": "Remove this KeyRef from credentials store",
			"detail.undoClearKey": "Undo Clear",
			"detail.undoClearKeyTitle": "Cancel clear mark and restore credential configuration",
			"detail.keyStatusMarkedClear": "Marked to Clear",
			"detail.apiKeyPlaceholderClearing": "Marked to clear credential (applies on save)",
			"detail.clearKeyMarked": "Marked to clear credential for {name}. Save config to apply.",
			"detail.keyStatusCredentials": "Credentials Configured",
			"detail.keyStatusEnv": "Environment Var",
			"detail.keyStatusMissing": "Not configured",
			"detail.marketLabel": "Search Market",
			"detail.searxngLabel": "Custom SearXNG instances (comma separated, empty for public defaults)",
			"sort.dragHandleTitle": "Drag to reorder engine priority",
			"sort.dropHere": "Drop here",
			"sort.placeholderEngine": "Moving: {name}",
			"footer.save": "Save Config",
			"footer.saving": "Saving...",
			"footer.testSearch": "Test Search",
			"footer.enabledCount": "{count} search engine(s) enabled",
			"footer.enabledCountRatio": "Enabled {enabled} / {total}",
			"testModal.title": "Test Search",
			"testModal.searchPlaceholder": "Enter search keywords...",
			"testModal.searchBtn": "Search",
			"testModal.searchingBtn": "Searching...",
			"testModal.noEnabledEngines": "No search engines enabled. Please enable at least one engine before testing.",
			"testModal.emptyState": "Enter keywords and click \"Search\" to test all enabled search engines",
			"testModal.statusPending": "Pending",
			"testModal.statusSearching": "Searching...",
			"testModal.statusSuccess": "Success ({count} results, {ms}ms)",
			"testModal.statusEmpty": "Success (0 results, {ms}ms)",
			"testModal.statusFailed": "Failed ({ms}ms)",
			"testModal.retry": "Retry",
			"testModal.expand": "Expand",
			"testModal.collapse": "Collapse",
			"testModal.expandAll": "Expand All",
			"testModal.collapseAll": "Collapse All",
			"testModal.expandSnippet": "Click blank area to expand full snippet",
			"testModal.collapseSnippet": "Click blank area to collapse snippet",
			"testModal.close": "Close",
			"testModal.noResults": "No search results found.",
			"testModal.summary": "Tested {total} engines: {success} succeeded, {failed} failed",
			"engines.deepseek.name": "DeepSeek Official",
			"engines.deepseek.description": "Direct bridge to official web-search-deepseek plugin. Please configure API Key, endpoint, and model in the official Web Search settings.",
			"engines.bing.name": "Bing Search",
			"engines.bing.description": "Microsoft Bing web search with locale and market support",
			"engines.ddg.name": "DuckDuckGo",
			"engines.ddg.description": "Privacy search with automatic HTML/Lite fallback",
			"engines.searxng.name": "SearXNG",
			"engines.searxng.description": "Meta-search engine aggregating multiple public instances",
			"engines.tavily.name": "Tavily Search",
			"engines.tavily.description": "AI search optimized for LLMs with custom KeyRef or keyless access",
			"engines.anysearch.name": "AnySearch",
			"engines.anysearch.description": "Keyless structured AI search endpoint",
			"engines.exa.name": "Exa Search",
			"engines.exa.description": "Neural semantic search with custom KeyRef or public MCP access",
			"engines.keenable.name": "Keenable Search",
			"engines.keenable.description": "Realtime web retrieval with custom KeyRef, falling back to keyless MCP quota",
			"engines.firecrawl.name": "Firecrawl Search",
			"engines.firecrawl.description": "AI-oriented web search and scraping with custom KeyRef or keyless quota",
			"engines.parallel.name": "Parallel Search",
			"engines.parallel.description": "Parallel.ai natural-language objective search with custom KeyRef, falling back to free MCP without a key",
			"engines.perplexity.name": "Perplexity Search",
			"engines.perplexity.description": "Perplexity Sonar retrieval returning a cited generated answer; requires an API Key"
		};
		//#endregion
		//#region lib/types/client/locales/zh.js
		/**
		* Simplified Chinese copy. Typed against {@link CustSearchLocaleKey}, so a key
		* missing from (or added only to) this dictionary is a compile error.
		*/
		const zh = {
			"header.sortModeActive": "排序模式",
			"header.detailMode": "详细配置模式",
			"header.defaultTimeout": "全局默认超时:",
			"header.saving": "保存中...",
			"header.save": "保存配置",
			"header.saveSuccess": "配置已保存并生效",
			"header.unsavedChanges": "配置已修改，保存配置后生效",
			"header.unsavedWithClearedOnly": "已标记清空 {names} 的凭据，保存配置后生效",
			"header.unsavedWithClearedAndOther": "配置已修改（已标记清空 {names} 的凭据），保存配置后生效",
			"header.saveFailed": "保存失败:",
			"header.loadFailed": "加载失败:",
			"header.loading": "正在加载搜索插件配置...",
			"header.noEnabledEngines": "当前未启用任何搜索引擎，请切换至详细配置模式开启引擎。",
			"badge.bridge": "官方直连",
			"badge.keyed": "需凭据",
			"badge.free": "免费免Key",
			"badge.disabled": "已禁用",
			"badge.enabled": "已启用",
			"badge.clickToEnable": "未启用",
			"detail.timeoutLabel": "单引擎超时时间 (毫秒)",
			"detail.timeoutPlaceholder": "跟随全局 ({timeout}ms)",
			"detail.keyRefLabel": "凭据引用名 (KeyRef)",
			"detail.apiKeyLabel": "API Key 配置",
			"detail.apiKeyPlaceholderConfigured": "已配置凭据 (输入新密钥以覆盖)",
			"detail.apiKeyPlaceholderEmpty": "输入 API Key",
			"detail.clearKey": "清空凭据",
			"detail.clearKeyTitle": "从凭据中心移除该 KeyRef 的值",
			"detail.undoClearKey": "撤销清空",
			"detail.undoClearKeyTitle": "取消清空标记，恢复凭据配置",
			"detail.keyStatusMarkedClear": "已标记清空",
			"detail.apiKeyPlaceholderClearing": "已标记清空凭据 (保存配置后生效)",
			"detail.clearKeyMarked": "已标记清空 {name} 的凭据，保存配置后生效",
			"detail.keyStatusCredentials": "已设置凭据",
			"detail.keyStatusEnv": "环境变量生效",
			"detail.keyStatusMissing": "未配置凭据",
			"detail.marketLabel": "检索语言市场 (Market)",
			"detail.searxngLabel": "自定义实例列表 (逗号分隔，留空使用公共节点)",
			"sort.dragHandleTitle": "按住拖动调整引擎调用优先级",
			"sort.dropHere": "放置于此位置",
			"sort.placeholderEngine": "移动: {name}",
			"footer.save": "保存配置",
			"footer.saving": "保存中...",
			"footer.testSearch": "测试搜索",
			"footer.enabledCount": "已启用 {count} 个搜索引擎",
			"footer.enabledCountRatio": "已启用 {enabled} / {total}",
			"testModal.title": "测试搜索",
			"testModal.searchPlaceholder": "输入搜索关键词...",
			"testModal.searchBtn": "搜索",
			"testModal.searchingBtn": "检索中...",
			"testModal.noEnabledEngines": "当前未启用任何搜索引擎，请在配置中开启至少一个引擎后再测试。",
			"testModal.emptyState": "输入关键词并点击「搜索」，将测试已启用的搜索引擎",
			"testModal.statusPending": "待测试",
			"testModal.statusSearching": "检索中...",
			"testModal.statusSuccess": "成功 ({count} 条结果，耗时 {ms}ms)",
			"testModal.statusEmpty": "成功 (未返回结果，耗时 {ms}ms)",
			"testModal.statusFailed": "失败 (耗时 {ms}ms)",
			"testModal.retry": "重试",
			"testModal.expand": "展开",
			"testModal.collapse": "收起",
			"testModal.expandAll": "全部展开",
			"testModal.collapseAll": "全部收起",
			"testModal.expandSnippet": "点击空白处展开完整摘要",
			"testModal.collapseSnippet": "点击空白处收起摘要",
			"testModal.close": "关闭",
			"testModal.noResults": "未检索到匹配的网页结果。",
			"testModal.summary": "共测试 {total} 个引擎：{success} 个成功，{failed} 个失败",
			"engines.deepseek.name": "DeepSeek Official",
			"engines.deepseek.description": "直接调用官方 web-search-deepseek 插件；API Key、端点及模型等具体配置请前往官方「Web 搜索」插件配置卡片设置。",
			"engines.bing.name": "Bing Search",
			"engines.bing.description": "微软必应网页搜索，支持多语言与地区本地化检索",
			"engines.ddg.name": "DuckDuckGo",
			"engines.ddg.description": "DuckDuckGo 隐私网页搜索，HTML/Lite 双模自动重试",
			"engines.searxng.name": "SearXNG",
			"engines.searxng.description": "SearXNG 元搜索引擎，自动轮换公共与自建实例聚合检索",
			"engines.tavily.name": "Tavily Search",
			"engines.tavily.description": "针对大语言模型优化的 AI 搜索，支持自定义 KeyRef 或免 Key 匿名额度",
			"engines.anysearch.name": "AnySearch",
			"engines.anysearch.description": "免费免 Key 的 AI 结构化搜索端点",
			"engines.exa.name": "Exa Search",
			"engines.exa.description": "神经网络 AI 语义搜索，支持自定义 KeyRef 或公共 MCP 免 Key 访问",
			"engines.keenable.name": "Keenable Search",
			"engines.keenable.description": "实时网页检索，支持自定义 KeyRef；未配置凭据时自动使用免 Key MCP 匿名额度",
			"engines.firecrawl.name": "Firecrawl Search",
			"engines.firecrawl.description": "面向 AI 的网页抓取与检索，支持自定义 KeyRef 或免 Key 匿名额度",
			"engines.parallel.name": "Parallel Search",
			"engines.parallel.description": "Parallel.ai 自然语言目标检索，支持自定义 KeyRef；未配置凭据时自动使用免费 MCP 匿名额度",
			"engines.perplexity.name": "Perplexity Search",
			"engines.perplexity.description": "Perplexity Sonar 在线检索并返回带引用的生成式答案，需配置 API Key"
		};
		//#endregion
		//#region lib/types/client/styles.js
		const CSS = [
			`
/* ====================================================
   Base Container & Global Layout
   ==================================================== */

/* The host section holding the page becomes the flex column the page fills.
   The page is content-sized on purpose: the Plugins page around it owns the
   scroll, so a bundle card grows with its content instead of trapping a second
   scroll region inside the page. */
:has(> .dsh-cs-container) {
  box-sizing: border-box;
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
  min-width: 0 !important;
  padding: 0 !important;
}

.dsh-cs-container {
  box-sizing: border-box;
  color: var(--dsw-alias-label-primary);
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
}
.dsh-cs-container * {
  box-sizing: border-box;
}

/* The card stack. Deliberately flex: 0 0 auto (not a zero flex-basis): an
   auto-height host would collapse a 1 1 0% row to nothing. */
.dsh-cs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 0 0 auto;
  min-height: 0;
  padding: 0 24px 16px 24px;
}

/* Standard Buttons */
.dsh-cs-btn {
  align-items: center;
  border-radius: 6px;
  box-sizing: border-box;
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  gap: 6px;
  justify-content: center;
  line-height: 1;
  transition: background-color 0.15s, border-color 0.15s, opacity 0.15s;
  vertical-align: middle;
  border: 1px solid transparent;
}
.dsh-cs-btn.primary {
  background: var(--dsw-static-deepseek-450, #2563eb);
  border-color: var(--dsw-static-deepseek-450, #2563eb);
  color: #ffffff;
  height: 32px;
  padding: 0 16px;
}
.dsh-cs-btn.primary:hover:not(:disabled) {
  opacity: 0.9;
}
.dsh-cs-btn.secondary {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
  height: 32px;
  padding: 0 12px;
}
.dsh-cs-btn.secondary:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-layer-1));
}
.dsh-cs-btn.danger {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #ef4444;
  height: 34px;
  padding: 0 12px;
  font-size: 13px;
  white-space: nowrap;
}
.dsh-cs-btn.danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
}
.dsh-cs-btn.undo {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #f59e0b;
  height: 34px;
  padding: 0 12px;
  font-size: 13px;
  white-space: nowrap;
}
.dsh-cs-btn.undo:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.22);
  border-color: rgba(245, 158, 11, 0.5);
}
.dsh-cs-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Status dots */
.dsh-cs-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 5px;
}
.dsh-cs-dot.ok {
  background: #10b981;
}
.dsh-cs-dot.warning {
  background: #f59e0b;
}
.dsh-cs-dot.missing {
  background: #ef4444;
}

/* Spin Animation */
@keyframes dsh-cs-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.dsh-cs-spin {
  animation: dsh-cs-spin 1s linear infinite;
}
`,
			`
/* ====================================================
   Common UI Primitives (Switch, Badges)
   ==================================================== */

/* Switch component (Dark Mode Adapted) */
.dsh-cs-switch {
  width: 36px;
  height: 20px;
  border-radius: 9999px;
  background: var(--dsw-alias-bg-layer-3, rgba(255, 255, 255, 0.15));
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.15));
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 1px;
  position: relative;
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  outline: none;
}
.dsh-cs-switch.active {
  background: var(--dsw-static-deepseek-450, #2563eb);
  border-color: var(--dsw-static-deepseek-450, #2563eb);
}
.dsh-cs-switch-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  transform: translateX(0);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: block;
}
.dsh-cs-switch.active .dsh-cs-switch-thumb {
  transform: translateX(16px);
}

/* Order Badges (Code pill style) */
.dsh-cs-order-badge {
  font-size: 12px;
  font-weight: 600;
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);
  background: var(--dsw-alias-bg-layer-3, rgba(255, 255, 255, 0.08));
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.15));
  color: var(--dsw-alias-label-primary, #e2e8f0);
  border-radius: 6px;
  padding: 2px 7px;
  line-height: 1.2;
}
.dsh-cs-order-badge.disabled {
  opacity: 0.45;
  border-style: dashed;
  color: var(--dsw-alias-label-tertiary, #81858c);
}
.dsh-cs-order-badge.active {
  background: rgba(37, 99, 235, 0.15);
  border-color: var(--dsw-static-deepseek-450, #2563eb);
  color: var(--dsw-static-deepseek-450, #2563eb);
}

/* Engine Type Badges */
.dsh-cs-badge {
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  line-height: 14px;
  padding: 2px 6px;
  border: 0.5px solid transparent;
}
.dsh-cs-badge.bridge {
  background: rgba(88, 166, 255, 0.12);
  border-color: rgba(88, 166, 255, 0.25);
  color: #58a6ff;
}
.dsh-cs-badge.keyed {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.25);
  color: #f59e0b;
}
.dsh-cs-badge.free {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.25);
  color: #10b981;
}
`,
			`
/* ====================================================
   Header Toolbar & Controls (HeaderBar)
   ==================================================== */

.dsh-cs-header {
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0 24px 12px 24px;
  flex-shrink: 0;
}
.dsh-cs-header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}
.dsh-cs-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.dsh-cs-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.dsh-cs-header-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 18px;
  padding-top: 8px;
  border-top: 1px solid var(--dsw-alias-border-l2);
  width: 100%;
}
.dsh-cs-header-notice.warning {
  color: #f59e0b;
}
.dsh-cs-header-notice.success {
  color: #10b981;
}
.dsh-cs-header-notice.error {
  color: #ef4444;
}

/* Mode Switch & Controls */
.dsh-cs-mode-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}
.dsh-cs-timeout-group {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}
`,
			`
/* ====================================================
   Engine Detail Card & Form Controls (EngineDetailCard)
   ==================================================== */

.dsh-cs-card {
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.15s, box-shadow 0.15s, background-color 0.15s;
}
.dsh-cs-card:hover {
  border-color: var(--dsw-alias-border-l2);
}
.dsh-cs-card.disabled {
  background: var(--dsw-alias-bg-layer-2);
  border-style: dashed;
  opacity: 0.75;
}
.dsh-cs-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.dsh-cs-card-identity {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.dsh-cs-card-name {
  color: var(--dsw-alias-label-primary);
  font-size: 15px;
  font-weight: 600;
  line-height: 20px;
}
.dsh-cs-card-desc {
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 18px;
  margin: 0;
}

/* Card Body Fields */
.dsh-cs-card-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--dsw-alias-border-l2);
}
.dsh-cs-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.dsh-cs-field.full-width {
  grid-column: 1 / -1;
}
.dsh-cs-field-label {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dsh-cs-input {
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  height: 34px;
  padding: 0 10px;
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
  width: 100%;
}
.dsh-cs-input:focus {
  border-color: var(--dsw-static-deepseek-450, #2563eb);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}
.dsh-cs-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  background: var(--dsw-alias-bg-layer-1);
  border-style: dashed;
}
.dsh-cs-select {
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  height: 34px;
  padding: 0 10px;
  transition: border-color 0.15s;
  outline: none;
  width: 100%;
  color-scheme: light dark;
}
.dsh-cs-select:focus {
  border-color: var(--dsw-static-deepseek-450, #2563eb);
}
`,
			`
/* ====================================================
   Sort Mode & Drag-and-Drop (SortablePreviewCard)
   ==================================================== */

.dsh-cs-sort-card {
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: grab;
  user-select: none;
  touch-action: none;
  opacity: 1 !important;
  transition: border-color 0.15s, transform 0.15s, background-color 0.15s, box-shadow 0.15s;
}
.dsh-cs-sort-card:hover {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l2);
}
.dsh-cs-sort-card:active {
  cursor: grabbing;
}
.dsh-cs-sort-card.dsh-cs-sort-card-floating {
  position: fixed !important;
  left: 0 !important;
  top: 0 !important;
  margin: 0 !important;
  opacity: 0.9 !important;
  pointer-events: none !important;
  z-index: 9999 !important;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45), 0 4px 12px rgba(0, 0, 0, 0.2) !important;
  border-color: var(--dsw-static-deepseek-450, #2563eb) !important;
  background: var(--dsw-alias-bg-layer-2) !important;
  cursor: grabbing !important;
  will-change: transform;
  transition: box-shadow 0.15s ease, opacity 0.15s ease !important;
  box-sizing: border-box !important;
}

body.dsh-cs-is-dragging,
body.dsh-cs-is-dragging * {
  cursor: grabbing !important;
  user-select: none !important;
}

/* Drop Placeholder Slot (Target Location) */
.dsh-cs-drop-placeholder {
  box-sizing: border-box;
  height: 52px;
  border-radius: 10px;
  border: 2px dashed var(--dsw-static-deepseek-450, #2563eb);
  background: rgba(37, 99, 235, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  user-select: none;
  animation: dsh-cs-placeholder-pulse 1.6s ease-in-out infinite alternate, dsh-cs-placeholder-pop 0.18s cubic-bezier(0.2, 0, 0, 1);
  transition: border-color 0.15s, background-color 0.15s;
}

@keyframes dsh-cs-placeholder-pop {
  from {
    opacity: 0.3;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes dsh-cs-placeholder-pulse {
  from {
    background: rgba(37, 99, 235, 0.05);
    border-color: rgba(37, 99, 235, 0.45);
  }
  to {
    background: rgba(37, 99, 235, 0.13);
    border-color: var(--dsw-static-deepseek-450, #2563eb);
  }
}

.dsh-cs-drag-handle {
  display: inline-flex;
  align-items: center;
  color: var(--dsw-alias-label-tertiary);
  margin-right: 12px;
  cursor: grab;
}
`,
			`
/* ====================================================
   Bottom Toolbar & Action Controls (FooterBar)
   ==================================================== */

/* Floating action bar: rounded, inset from the page edges, and pinned to the
   bottom of the scrolling page so Save/Test stay reachable while the engine
   list scrolls under it. It wears the product's menu material — a translucent
   fill over the theme's backdrop blur — so content passing underneath reads as
   frosted glass instead of being hidden. Stays in flow, so it settles into its
   own row once the list is scrolled to its end. */
.dsh-cs-footer {
  align-items: center;
  /* Opaque fallback first; the theme's translucent menu fill wins when defined. */
  background: var(--dsw-alias-bg-layer-2);
  background: var(--dsw-menu-surface-fill, var(--dsw-alias-bg-layer-2));
  /* The theme's own glass blur (menus, hover cards). Do NOT use --dsw-mask-blur
     here: the theme defines that one as "none" for this surface. */
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(24px) saturate(150%));
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-lg, 12px);
  bottom: 12px;
  box-shadow: var(--dsw-elevation-prominent);
  box-sizing: border-box;
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  justify-content: space-between;
  margin: 12px 24px;
  padding: 12px 16px;
  position: sticky;
  z-index: 5;
}
.dsh-cs-footer-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}
.dsh-cs-footer-count {
  font-size: 13px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-cs-footer-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  line-height: 18px;
}
.dsh-cs-footer-notice.warning {
  color: #f59e0b;
}
.dsh-cs-footer-notice.success {
  color: #10b981;
}
.dsh-cs-footer-notice.error {
  color: #ef4444;
}
.dsh-cs-footer-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
`,
			`
/* ====================================================
   Generic Modal Framework (common/Modal)
   ==================================================== */

.dsh-cs-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}
.dsh-cs-modal-panel {
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 16px;
  width: 820px;
  max-width: calc(100vw - 32px);
  height: min(85vh, 850px);
  max-height: min(85vh, 850px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  animation: dsh-cs-modal-fade-in 0.15s ease-out;
}
@keyframes dsh-cs-modal-fade-in {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
.dsh-cs-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  flex-shrink: 0;
}
.dsh-cs-modal-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--dsw-alias-label-primary);
}
.dsh-cs-modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
}
.dsh-cs-modal-close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--dsw-alias-label-tertiary);
  border-radius: 6px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background-color 0.15s;
}
.dsh-cs-modal-close-btn:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
}

/* Modal Footer */
.dsh-cs-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  border-top: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  flex-shrink: 0;
}
.dsh-cs-modal-footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dsh-cs-modal-footer-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
`,
			`
/* ====================================================
   Test Search Modal (test-modal/*)
   ==================================================== */

/* Modal Search Bar */
.dsh-cs-test-searchbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background: var(--dsw-alias-bg-layer-2);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  flex-shrink: 0;
}
.dsh-cs-test-input {
  flex: 1;
  height: 38px !important;
  font-size: 14px;
  box-sizing: border-box;
}
.dsh-cs-btn.primary.dsh-cs-test-search-btn,
.dsh-cs-test-search-btn {
  height: 38px !important;
  line-height: 38px;
  padding: 0 18px;
  font-size: 14px;
  flex-shrink: 0;
  box-sizing: border-box;
}

/* Modal Toolbar (Global Expand/Collapse) */
.dsh-cs-test-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px 4px 20px;
  flex-shrink: 0;
}
.dsh-cs-test-toolbar-count {
  font-size: 13px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-cs-test-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dsh-cs-test-text-btn {
  background: transparent;
  border: 1px solid var(--dsw-alias-border-l2);
  cursor: pointer;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 4px;
  transition: color 0.15s, background-color 0.15s, border-color 0.15s;
}
.dsh-cs-test-text-btn:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l1);
}

/* Modal Content Results */
.dsh-cs-test-results-container {
  flex: 1 1 0%;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 20px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dsh-cs-test-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 20px;
  text-align: center;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
}
.dsh-cs-test-pills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
.dsh-cs-test-engine-pill {
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--dsw-alias-label-primary);
}
.dsh-cs-test-empty-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 8px;
  font-size: 13px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
}
.dsh-cs-test-empty-notice.warning {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: #f59e0b;
}

/* Test Engine Card */
.dsh-cs-test-engine-card {
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.15s;
  flex-shrink: 0;
  width: 100%;
}
.dsh-cs-test-engine-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 16px;
  background: var(--dsw-alias-bg-layer-3, rgba(255, 255, 255, 0.03));
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  cursor: pointer;
  user-select: none;
}
.dsh-cs-test-engine-header:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.06));
}
.dsh-cs-test-engine-header.collapsed {
  border-bottom: none;
}
.dsh-cs-test-engine-identity {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.dsh-cs-test-engine-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}
.dsh-cs-test-engine-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.dsh-cs-test-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.dsh-cs-test-badge.pending {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-tertiary);
  border: 1px solid var(--dsw-alias-border-l2);
}
.dsh-cs-test-badge.loading {
  background: rgba(37, 99, 235, 0.12);
  color: var(--dsw-static-deepseek-450, #2563eb);
  border: 1px solid rgba(37, 99, 235, 0.25);
}
.dsh-cs-test-badge.success {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.25);
}
.dsh-cs-test-badge.warning {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.25);
}
.dsh-cs-test-badge.error {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.25);
}
.dsh-cs-test-retry-btn {
  height: 26px;
  padding: 0 8px;
  font-size: 12px;
  gap: 4px;
}
.dsh-cs-test-expand-btn {
  height: 26px;
  padding: 0 8px;
  font-size: 12px;
  gap: 4px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-cs-test-expand-btn:hover {
  color: var(--dsw-alias-label-primary);
}
.dsh-cs-test-engine-body {
  padding: 14px 16px;
}
.dsh-cs-test-loading-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 6px;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
}
.dsh-cs-test-error-box {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  padding: 10px 12px;
  color: #ef4444;
  font-size: 13px;
  line-height: 18px;
  word-break: break-word;
}
.dsh-cs-test-sources-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dsh-cs-test-source-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  transition: border-color 0.15s, background-color 0.15s;
  cursor: default;
}
.dsh-cs-test-source-item.expandable {
  cursor: pointer;
}
.dsh-cs-test-source-item.expandable:hover {
  border-color: var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3, rgba(255, 255, 255, 0.04));
}
.dsh-cs-test-source-item.expanded {
  border-color: rgba(37, 99, 235, 0.4);
  background: var(--dsw-alias-bg-layer-3, rgba(255, 255, 255, 0.03));
}
.dsh-cs-test-source-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  user-select: text;
}
.dsh-cs-test-source-title {
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  line-height: 18px;
  cursor: pointer;
}
.dsh-cs-test-source-title:hover {
  color: var(--dsw-static-deepseek-450, #2563eb);
  text-decoration: underline;
}
.dsh-cs-test-external-icon {
  color: var(--dsw-alias-label-tertiary);
  flex-shrink: 0;
}
.dsh-cs-test-source-date {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  flex-shrink: 0;
  user-select: text;
}
.dsh-cs-test-source-url {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  word-break: break-all;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 14px;
  user-select: text;
  cursor: text;
}
.dsh-cs-test-source-snippet {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
  line-height: 18px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  user-select: text;
  cursor: text;
}
.dsh-cs-test-source-item.expanded .dsh-cs-test-source-snippet {
  display: block;
  -webkit-line-clamp: unset;
  -webkit-box-orient: unset;
  overflow: visible;
  white-space: pre-wrap;
  word-break: break-word;
}
.dsh-cs-test-source-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 2px;
}
.dsh-cs-test-source-hint {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.65;
  transition: opacity 0.15s, color 0.15s;
  user-select: none;
}
.dsh-cs-test-source-item:hover .dsh-cs-test-source-hint {
  opacity: 1;
  color: var(--dsw-static-deepseek-450, #2563eb);
}

.dsh-cs-test-summary {
  font-size: 13px;
  color: var(--dsw-alias-label-secondary);
}
`
		].join("\n\n");
		//#endregion
		//#region lib/types/client/index.js
		const e = react.createElement;
		/** Locale namespace owned by this plugin; merged into LocaleNamespaceMap in locales/index.ts. */
		const NS = "cust-search";
		/**
		* Package name this plugin is installed under. The Plugins page keys a bundle's
		* own configuration by that name, so this is where our page registers.
		*/
		const BUNDLE_NAME = "@local/dsh-cust-search";
		const name = "cust-search-client";
		const inject = ["slots", "locale"];
		/** The page body; `t` is the framework-injected locale seat for {@link NS}. */
		function CustSearchConfig({ t }) {
			return e(I18nProvider, { translator: t }, e(SettingsView));
		}
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "cust-search: dictionaries");
			ctx.effect(() => {
				const style = document.createElement("style");
				style.dataset.plugin = BUNDLE_NAME;
				style.textContent = CSS;
				document.head.appendChild(style);
				return () => style.remove();
			}, "cust-search: styles");
			const slots = ctx.get("slots");
			if (!slots) return;
			slots.inject("plugins.bundle.config", () => slots.register({
				name: "plugins.bundle.config",
				key: BUNDLE_NAME,
				locale: NS
			}, CustSearchConfig));
		}
		//#endregion
		exports.BUNDLE_NAME = BUNDLE_NAME;
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map