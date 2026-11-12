window.__ModuleLoader__.load({
	id: 'dsh-theme-buxu',
	factory: (require) => {
		var module = { exports: {} }
		var exports = module.exports

		/* ================================================================
		 * dsh-theme-buxu v0.2 —— 不虚主题
		 *
		 * 结构：CSS 底座（主题色 / 面板几何 / 排版）
		 *     + slots 组件（对话头像），后者按官方规范注册，
		 *       不再往别人的 DOM 里塞节点。
		 *
		 * 依据（官方 cordis-plugin-development skill）：
		 *   ui-plugin.md      React 来自浏览器模块表，用 require('react')
		 *   practices.md:36   通过 slots 贡献 UI，组件外不写 DOM
		 *   practices.md:34   不要 require 官方 ui-primitives
		 *   ui-plugin.md:13   不读别人的 DOM/样式来估算位置，选已分配空间的槽
		 * ================================================================ */

		const STYLE_ID = 'dsh-theme-buxu-style'
		const ROOT_ATTR = 'data-dsh-theme-buxu'

		/* 每个“元素+属性”只登记一次；重复写不增加引用，回滚只处理仍属于本插件的值。 */
		const _inlineTracked = new Map()
		function buxuTrack(el, kind, prop, value) {
			let props = _inlineTracked.get(el)
			if (!props) { props = new Map(); _inlineTracked.set(el, props) }
			if (!props.has(kind + ':' + prop)) props.set(kind + ':' + prop, value)
		}
		function buxuSetStyle(el, prop, value, priority) {
			if (!el || !el.style) return
			try {
				buxuTrack(el, 'style', prop, {
					value: el.style.getPropertyValue(prop),
					priority: el.style.getPropertyPriority(prop)
				})
				if (priority) el.style.setProperty(prop, value, priority)
				else el.style.setProperty(prop, value)
			} catch (e) { /* 元素已卸载或样式不可写 */ }
		}
		function buxuSetAttr(el, name, value) {
			if (!el) return
			try {
				buxuTrack(el, 'attr', name, {
					exists: el.hasAttribute(name),
					value: el.getAttribute(name)
				})
				el.setAttribute(name, value)
			} catch (e) { /* 元素已卸载或属性不可写 */ }
		}
		function buxuRollbackInline() {
			for (const [el, props] of _inlineTracked) {
				for (const [key, original] of props) {
					try {
						const split = key.indexOf(':')
						const kind = key.slice(0, split)
						const prop = key.slice(split + 1)
						if (kind === 'style') {
							if (original.value) el.style.setProperty(prop, original.value, original.priority)
							else el.style.removeProperty(prop)
						} else if (original.exists) el.setAttribute(prop, original.value)
						else el.removeAttribute(prop)
					} catch (e) { /* 元素已卸载等 */ }
				}
			}
			_inlineTracked.clear()
		}

		/* 助手头像内联（128px 压缩），避免任何运行时资源解析。
		   AVATAR_USER 已于 2026-11-05 QA 删除：它只被挂在 [data-dsh-tn-avatar]
		   上的规则引用，而全工程没有任何组件会写那个属性（纯死代码），
		   白占 6.4KB = 文件体积的 7%。助手头像真实在用，保留。 */
		/* AVATAR_ASSISTANT（白底 webp base64）已于 2026-11-05 删除：
		   换成透明底 SVG data URI，直接内联在 CSS 里，不再需要这个常量。
		   原图是白底实心 webp，转不成透明，官方 SVG 是矢量且天然透明。 */
		/* 用户头像（狗狗）：800x800 原图 65KB 太大，压到 128x128 JPEG q85 → 5.0KB。
		   2026-11-05 随「两侧都要头像」需求恢复（P3 清理时曾作为死代码删除）。 */
		const AVATAR_USER = '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'

		/* ================================================================
		 * 配色注册表 —— 多主题扩展点
		 *
		 * 每个主题一条声明式记录：id（键）、label（徽标/日志名）、colors（色板）。
		 * 新增主题 = 加一条记录，几何与组件代码零改动。
		 * 深浅两套由 body[data-ds-dark-theme] 驱动选择，
		 * 未来做成独立 DSH 皮肤插件时，同一注册表直接搬走。
		 * ================================================================ */
		/* ================================================================
		 * 色板注册表 —— **可扩展为 N 套**（2026-11-05 用户：今后不止黑白）
		 *
		 * 每套色板 = 一条独立记录，自带：
		 *   id       唯一键（设置里存的就是它）
		 *   scheme   'dark' | 'light' —— **只决定用哪套 CSS 选择器**
		 *            （DSH 的 body[data-ds-dark-theme] 只有这两个状态）
		 *   label    双语显示名（徽标 / 设置页用）
		 *   colors   完整色板（46 个键）
		 *
		 * **关键设计**：scheme 与「色板身份」解耦。
		 *   DSH 只提供 dark/light 二选一的选择器，
		 *   但我们可以在同一 scheme 下挂任意多套色板 ——
		 *   比如多个深色主题都走 body[data-ds-dark-theme]，
		 *   只是 colors 不同。
		 * 新增一套色板 = 往这个对象里加一条记录，别处零改动。
		 * ================================================================ */
		const PALETTES = {
			/* ---- 1 系列：原生布局（2026-11-05 收录）----
			   来源：一次契约降级时露出的「官方默认布局 + 我们的配色」，
			   用户觉得比完整布局更好看，要求收录为正式可点选方案。

			   **颜色与 cloud / slate 完全一致**，差异在 layout:'plain'：
			   只注入 token 层（配色），不注入任何布局改写 ——
			   于是保留官方的大圆角、无 6px 留边、无 1px 描边。
			   这样这个观感是「主动选出来的」，不再依赖随机降级。 */
			'slate2': {
				id: 'slate2',
				scheme: 'dark',
				layout: 'plain',
				label: { zh: '质肤·石墨', en: 'Buxu Slate' },
				colors: {
					bgBase: '#161616', bg1: '#161616', bg2: '#2B2B2B', bg3: '#1C1F24',
					sidebar: '#2B2B2B', composer: '#2B2B2B', bubble: '#282828', right: '#161616',
					select: '#414141', hover: '#333333',
					text: '#D4D4D4', text2: '#B4B4B4', text3: '#939393',
					project: '#A0A0A0', card: '#1E1E1E',
					caption: '#929292', dimmed: '#939393',
					accent: '#68798C', border: 'rgba(255,255,255,0.07)',
					cardBorder: '#414141', warn: '#FF8A30', hairline: '#222222',
					panelEdge: '#3A3A3A'
				}
			},
			'cloud2': {
				id: 'cloud2',
				scheme: 'light',
				layout: 'plain',
				label: { zh: '质肤·云白', en: 'Buxu Cloud' },
				colors: {
					bgBase: '#F2F2F4', bg1: '#F2F2F4', bg2: '#EBEBEE', bg3: '#FAFAFB',
					sidebar: '#E2E2E6', composer: '#FCFCFD', bubble: '#EBEBEE', right: '#F2F2F4',
					select: '#CFCFD4', hover: '#D8D8DC',
					text: '#1A1A1A', text2: '#3A3A3A', text3: '#636363',
					project: '#4E4E4E', card: '#FAFAFB',
					caption: '#5C5C5C', dimmed: '#636363',
					accent: '#4E6076', border: 'rgba(0,0,0,0.08)',
					cardBorder: '#D9D9DD', warn: '#C2610F',
					hairline: '#E8E8EA', panelEdge: '#C8C8CE'
				}
			}
			/* ---- 后续扩展位（加一条即可，无需改别处）----
			   'amber':  { id:'amber',  scheme:'dark',  label:{zh:'不虚·琥珀', en:'Buxu Amber'},  colors:{...} },
			   'forest': { id:'forest', scheme:'dark',  label:{zh:'不虚·苍青', en:'Buxu Forest'}, colors:{...} },
			   'paper':  { id:'paper',  scheme:'light', label:{zh:'不虚·纸白', en:'Buxu Paper'},  colors:{...} },
			   —— 同一 scheme 下可放任意多套，选择器由 scheme 决定。
			*/
		}

		/** 默认配色 id：与 lib/index.js schema 的 default 保持一致。
		    2026-11-06 起为深色原生布局方案 slate2；
		    2026-11-09 起显示名「质肤·石墨」（2 系列已剥离）。
		    所有「palette 无效/缺失」的兜底统一走它，不再散落。 */
		const DEFAULT_PALETTE_ID = 'slate2'

		/**
		 * 配色展示顺序（2026-11-09 起）：石墨 → 云白。
		 * 2 系列（石墨2/云白2）已剥离，定义存于 E:\DSH\_archive\series2\，
		 * 恢复时把 preferred 改回 ['slate2','cloud2','slate','cloud'] 即可。
		 * 未列入的新配色自动追加在末尾，不会丢失。
		 * 弹窗与设置页**统一**用这个数组，今后加配色只改一处。
		 */
		function hasPalette(id) {
			if (typeof id !== 'string') return false
			if (typeof Object.hasOwn === 'function') return Object.hasOwn(PALETTES, id)
			return Object.prototype.hasOwnProperty.call(PALETTES, id)
		}
		function paletteOrder() {
			const preferred = ['slate2', 'cloud2']
			const rest = Object.keys(PALETTES).filter((k) => preferred.indexOf(k) < 0)
			return preferred.filter((k) => PALETTES[k]).concat(rest)
		}

		/* ---- 推理等级进度条色彩方案（2026-11-07 精简为 4 套）----
		   4 套从**不同维度**设计，默认「单色蓝阶」：
		     ① 单色蓝阶 —— 纯明度变化（同一色相，最克制）
		     ② 暖阳     —— 暖色升温（黄→橙→珊瑚红）
		     ③ 青蓝绿   —— 冷暖过渡（蓝→青→绿）
		     ④ 靛紫粉   —— 邻近冷色（靛→紫→粉）
		   粒子效果改为**独立开关** effortParticles，任意配色都能叠加，
		   不再是某套配色自带。另有 custom：4 个取色器自定义渐变。
		   动画只用 CSS 伪元素 / @keyframes，不新建 DOM、不触发 MutationObserver，
		   且尊重 prefers-reduced-motion —— 不拖累首帧提速。 */
		const DEFAULT_EFFORT_GRADIENT = 'blueramp'
		const EFFORT_GRADIENTS = [
			{
				id: 'blueramp', label: '单色蓝阶',
				desc: '纯明度变化，同一色相，最克制耐看（默认）',
				cssStops: '#8FB6E8 0%, #6B9BE0 34%, #4A7FD0 67%, #2E5FB8 100%'
			},
			{
				id: 'sunrise', label: '暖阳',
				desc: '黄 → 橙 → 珊瑚红，暖色逐级升温',
				cssStops: '#F5C451 0%, #F0A24B 34%, #E9764A 67%, #D94F4F 100%'
			},
			{
				id: 'ocean', label: '青蓝绿',
				desc: '蓝 → 青 → 绿，冷暖过渡、冷静到活力',
				cssStops: '#3D7FD1 0%, #3FA9C9 34%, #43BE9B 67%, #4FB877 100%'
			},
			{
				id: 'indigo', label: '靛紫粉',
				desc: '靛 → 紫 → 粉，邻近冷色顺滑过渡',
				cssStops: '#4A6FD4 0%, #7C5FD0 34%, #A85BC4 67%, #D1569E 100%'
			},
			/* --- 自定义（色值来自配置字段 effortCustomColors）--- */
			{
				id: 'custom', label: '自定义',
				desc: '用下方 4 个取色器自己配一套渐变',
				cssStops: null, custom: true
			}
		]
		/** 自定义色标的默认值（4 段：0% / 34% / 67% / 100%）。 */
		const DEFAULT_EFFORT_CUSTOM = ['#4A6FD4', '#7C5FD0', '#A85BC4', '#D1569E']
		function effortGradientById(id) {
			return EFFORT_GRADIENTS.find((g) => g.id === id) || EFFORT_GRADIENTS[0]
		}
		/** 生成自定义方案的色标串（校验每个色值，非法则回退默认）。 */
		function customCssStops(colors) {
			const arr = Array.isArray(colors) && colors.length === 4 ? colors : DEFAULT_EFFORT_CUSTOM
			const ok = (c) => /^#[0-9A-Fa-f]{6}$/.test(c)
			const c = arr.map((x, i) => ok(x) ? x : DEFAULT_EFFORT_CUSTOM[i])
			return c[0] + ' 0%, ' + c[1] + ' 34%, ' + c[2] + ' 67%, ' + c[3] + ' 100%'
		}
		/** 当前生效的色标串：自定义方案从配置读，其余用预置。 */
		function activeCssStops(g, settings) {
			return g.custom ? customCssStops(settings && settings.effortCustomColors) : g.cssStops
		}

		/* 按 scheme 找色板；找不到就回落到该 scheme 的第一套。
		   这是「配色方案」与「DSH 深浅状态」之间的唯一桥接点。 */
		function paletteForScheme(scheme) {
			for (const key of Object.keys(PALETTES)) {
				if (PALETTES[key].scheme === scheme) return PALETTES[key]
			}
			return PALETTES[Object.keys(PALETTES)[0]]
		}

		const DARK = paletteForScheme('dark').colors
		const LIGHT = paletteForScheme('light').colors

		/* 共享几何常量 —— 所有配色共用，不随主题变。
		   集中声明避免「改一处漏一处」（坑 15 教训）。 */
		/* 默认几何 —— 用户没配置时用这套（= 之前的定稿值，视觉零变化）。 */
		const GEO_DEFAULTS = Object.freeze({
			topStrip: 6,        // 顶部细线高度
			titleRowH: 48,      // 工具行高度（顶条 6 + 48 = 54 = frame padding-top）
			radius: 6,          // 面板圆角
			gutter: 6,          // 四周留边宽度
			edge: 1,            // 描边线宽
			rowH: 30,           // 侧栏行高
			sidebarW: 268,      // 推荐侧栏宽度（官方范围 264-420）
			bubbleR: 14,        // 用户气泡圆角
			avatarSize: 26,     // 对话头像边长
			avatarR: 12,        // 头像圆角比例（%，50 = 正圆；默认 12 ≈ 3px 可感知收角）
			avatarsOn: true     // 是否渲染对话头像
		})

		/* 生效几何 —— **必须是 let**：设置页改完要能热更新。
		   applyThemeTokens / buildCss 每次重绘都读这里的当前值。 */
		let GEO = Object.assign({}, GEO_DEFAULTS)

		/** 用设置值覆盖几何默认值（只覆盖给了值的字段）。 */
		function applyGeometryFromSettings(s) {
			const next = Object.assign({}, GEO_DEFAULTS)
			if (s) {
				if (typeof s.topStrip === 'number') next.topStrip = s.topStrip
				if (typeof s.toolbarHeight === 'number') next.titleRowH = s.toolbarHeight
				if (typeof s.panelRadius === 'number') next.radius = s.panelRadius
				if (typeof s.panelGutter === 'number') next.gutter = s.panelGutter
				if (typeof s.sidebarRowHeight === 'number') next.rowH = s.sidebarRowHeight
				if (typeof s.sidebarWidth === 'number') next.sidebarW = s.sidebarWidth
				if (typeof s.bubbleRadius === 'number') next.bubbleR = s.bubbleRadius
				if (typeof s.avatarSize === 'number') next.avatarSize = s.avatarSize
				if (typeof s.avatarRadius === 'number') next.avatarR = s.avatarRadius
				if (typeof s.avatarsEnabled === 'boolean') next.avatarsOn = s.avatarsEnabled
			}
			GEO = next
		}

		/* ---------------------------------------------------------------
		 * SEL —— DSH DOM 映射层（工厂：传入 buildCss 的 scope）
		 *
		 * **全部官方哈希类名选择器只允许出现在这一层**。
		 * DSH 升级改了 DOM → 只修这里；组件层（buildCss）只消费 S.*。
		 * 选择：data-* 属性选择器是半公开 API，较稳，保留在组件层内联；
		 * class 哈希（CSS modules）是 fragile 的，必须走 SEL。
		 * 取证方式：document.title 诊断遍历（2026-11-04）。
		 * --------------------------------------------------------------- */
		const SEL = (scope) => ({
			// 框架
			frame: "[class*='frame']:has([class*='centerCol'])",
			frameTop: "[class*='frame']:has([class*='sidebarCol'])",
			sidebarCol: "[class*='sidebarCol']",
			centerCol: "[class*='centerCol']",
			// 会话头部 / 工具行
			titleRow: "[data-slot='conversation.session.header'] [class*='titleRow']",
			anyTitleRow: "[class*='titleRow']",
			titleCluster: "[data-slot='conversation.session.header'] [class*='titleCluster']",
			headerActions: "[data-slot='conversation.session.header'] [class*='headerActions']",
			headerUtilities: "[data-slot='conversation.session.header'] [class*='headerUtilities']",
			headerCorner: "[data-slot='conversation.session.header'] [class*='headerCorner']",
			anyHeaderUtilities: "[class*='headerUtilities']",
			anyHeaderCorner: "[class*='headerCorner']",
			headerBlock: "[data-slot='conversation.session.header'] > div[class$='_header']",
			// 压平范围必须限 frame 之内（2026-11-04）：全局版会把 body 级门户页面
			// （充值页等 dshmarket overlay）自己的头部也压成 0 高，导航/返回键消失。
			// **2026-11-08 事故修复**：官方窗口 header 是 <header data-window-drag>，
			// 而 TodoPanel 的 DXuOLW_header 是 <button>（root 是 overflow:hidden）。
			// 旧选择器裸 [class*='_header'] 把两者一起压成 height:0 → 石墨2/云白2
			// （full 布局）下任务框连缩小态都消失；皮肤1 不注入布局层所以正常。
			// 加 header 标签限定：只命中官方窗口 <header>，不碰任何 <button>。
			// 比 Level 4 复杂 :not 更保守，Chromium/Electron 全版本确定生效。
			officialHeader: "[class*='frame']:has([class*='centerCol']) header[class*='_header']:not([data-slot])",
			crumbs: "[data-slot='conversation.session.header'] [class*='crumbs']",
			// 页签行
			tabsRow: "[data-slot='conversation.session.header'] [class$='_tabs']",
			viewTabs: "[data-slot='conversation.session.header'] [class$='viewTabs']",
			tab: "[data-slot='conversation.session.header'] [class$='_tab']",
			tabLabel: "[data-slot='conversation.session.header'] [class$='_tabLabel']",
			// 侧栏行（文字层级）
			sideSection: "[class*='sidebar'] :is([class*='sectionTitle'], [class*='sectionLabel'], [class*='groupTitle'], [class*='groupLabel'])",
			sideProjectTitle: "[class*='sidebar'] [class*='projectRow'] :is([class*='title'], [class*='projectText']), " + scope + " [class*='sidebar'] [class*='projectText'] > [class*='title']",
			sideProjectSvg: "[class*='sidebar'] [class*='projectRow'] svg",
			sideProjectRow: "[class*='sidebar'] [class*='projectRow']",
			sideLogoRow: "[class$='_logoRow']",
			sideBrand: "[class$='_brand']",
			sideNewSession: "[class$='_newSession']",
			sideSessionTitle: "[class*='sidebar'] :is([class*='sessionRow'], [class*='searchResultRow']) [class*='title']",
			sideSessionTime: "[class*='sidebar'] :is([class*='sessionRow'], [class*='searchResultRow']) [class*='time']",
			// 右栏（dockkit）
			rpPanel: "[data-sidebar-right-panel]",
			rpOpen: "[data-sidebar-right-panel][data-sidebar-right-open]",
			rpStrip: "[data-sidebar-right-panel] [class*='_tabHostHeader']",
			dockPane: "[data-sidebar-right-panel][data-sidebar-right-open] [data-dockkit-pane]",
			// 右栏开始页卡片（两种模块变体，2026-11-04 取证）
			entry: "[class$='_entry']",
			entryIcon: "[class$='_entryIcon']",
			shimmerDecoration: "[class*='_decoration_']",
			shimmerSweep: "[class*='_sweep_']",
			shimmerText: "[data-shimmer-text]",
			// 内容组件（fragile 哈希，同样收拢）
			bubble: "[class*='bubble']",
			composerCardish: "[class*='composerCard'], [class*='inputCard']",
			floating: "[class*='menu'], [class*='Menu'], [class*='dialog'], [class*='Dialog'], [class*='popover'], [class*='Popover']"
		})

		/* ---------------------------------------------------------------
		 * SPEC —— ZCode 设计规格层
		 *
		 * 全部视觉度量集中于此；改设计 = 改这里。
		 * 值的出处标注：[ZC源码] = ZCode 前端源码实测，
		 * [ZC截图] = 用户提供的 ZCode 参考截图实测，[DSH] = DSH 侧约束。
		 * 阶段 1（结构搬迁）先落当前值，保证零视觉变化；
		 * 阶段 2（右栏对齐）再改为 ZCode 值。
		 * --------------------------------------------------------------- */
		const SPEC = {
			radius: {
				panel: 6,      // [ZC截图] 参考图左上角弧 6px
				window: 8,     // [ZC截图] 窗口左上角
				card: 16,      // [DSH] composer 卡现状 16
				entryCard: 12, // [ZC截图] 右栏开始页卡片圆角（阶段2 已启用）
				iconTile: 8    // [ZC截图] 卡片图标块圆角
			},
			space: {
				cardGap: 10,       // [DSH] 阶段1=现状卡间距；阶段2 → 12-16（ZC）
				sectionGap: 24,    // [ZC截图] 分区之间
				stripPadX: 20,     // [DSH] 工具行/页签行左右内边距
				cardPadX: 14,      // [ZC截图] 卡片左右内边距
				cardPadY: 10       // [ZC截图] 卡片上下内边距
			},
			size: {
				iconTile: 36,      // [ZC截图] 卡片图标块
				entryIcon: 26,     // [DSH] 现状 entry 图标
				stripH: 38,        // [DSH] 右栏 dockkit 顶条实测 38px
				badge: 22          // [DSH] 头部徽标高
			},
			type: {
				sectionTitle: '600 15px',
				cardTitle: '500 13px',
				cardDesc: '400 12px'
			}
		}

		/* tokenOnly=true 时只返回「TNS:LAYOUT-BELOW」标记之前的部分：
		   纯配色（token + 少量颜色规则），不含任何布局改写。
		   降级模式下用它，保证新版界面结构不被改坏。 */
		const LAYOUT_MARK = '/* TNS:LAYOUT-BELOW'

		/* ---- P1 分组降级（2026-11-08）---------------------------------
		   旧实现：tokenOnly = degradeMode || plain，一刀切把 LAYOUT_MARK
		   之后约 36KB 布局层全部砍掉。官方升级改一个类名就会「整套功能缩减」，
		   与用户「升级后功能不失效、不缩减」的原则冲突。

		   新实现：CSS 模板文本与顺序一个字符都不改（视觉零变化），只在
		   buildCss 里按「已有的分组注释」作锚点把布局层切成 N 组；
		   每组带自己的 probe（稳定 data-* / ARIA / 类名 key），
		   probe 缺失只跳过该组，其余组照常注入。
		   · token 层（标记之前）永远注入；
		   · always 组（纯配色 / ARIA / bug 修复）不依赖结构性契约，永注入；
		   · 结构组（圆角 / 工具行 / 右栏…）按 probe 逐组判定；
		   · plain 皮肤仍只注入 token 层（款式1 语义不变）；
		   · effortGradientCss() 永远追加（4 套皮肤一致）。

		   锚点用 CSS 里已有注释字符串，全部经 _verify_anchors.cjs 验证唯一。 */
		const CSS_GROUPS = [
			{ id: 'token',            anchor: null,                                             always: true,  probe: null },
			/* strict 组：依赖「会话框架结构契约」（frame / centerCol / sessionHeader）。
			   只有这类契约明确缺失，才说明官方结构真的变了，才跳过对应组。 */
			{ id: 'window-radius',    anchor: '/* ---- 窗口左上角圆角 ----',                  always: false, strict: true, probe: ["[class*='frame']"] },
			{ id: 'panel-surface',    anchor: '/* 只有卡片本身是浅一档',                      always: true,  probe: null },
			{ id: 'rightbar',         anchor: '/* ---- 右栏 ---- */',                         always: true,  probe: null },
			{ id: 'panel-geometry',   anchor: '/* ---- 面板几何 ----',                        always: false, strict: true, probe: ["[class*='centerCol']"] },
			{ id: 'titlebar',         anchor: '/* ---- 标题栏 ----',                           always: true,  probe: null },
			{ id: 'sidebar',          anchor: '/* ---- 侧栏层级（参考图实测）----',            always: true,  probe: null },
			{ id: 'user-bubble',      anchor: '/* ---- 用户气泡（按参考图 ZCode 实测',         always: true,  probe: null },
			{ id: 'question-card',    anchor: '/* ---- 提问卡片折叠按钮（2026-11-06）----',    always: true,  probe: null },
			{ id: 'toolbar',          anchor: '/* ---- 会话头部：顶部窗口区与工作区共用一块面板', always: false, strict: true, probe: ["[data-slot='conversation.session.header']"] },
			{ id: 'tabs',             anchor: '/* 页签有多个视图时才由官方渲染。保持自然布局',    always: true,  probe: null },
			{ id: 'menu-fix',         anchor: '/* ---------------------------------------------------------------\n * 右上角「…」菜单显示不全', always: true, probe: null },
			{ id: 'composer',         anchor: '/* ---- 输入卡 ---- */',                         always: true,  probe: null },
			{ id: 'flow-gap',         anchor: '/* ---- 排版与自适应 ---- */',                   always: true,  probe: null },
			{ id: 'media',            anchor: '@media (max-width: 1000px)',                    always: true,  probe: null }
		]
		const GROUP_PROBE_CACHE = new Map()
		/** 最近一次重绘被跳过的组（供设置页状态外显，P1-5）。 */
		let GROUP_DISABLED = []
		function probeGroup(g) {
			/* 2026-11-08 真机事故修正：tabs / rightbar / user-bubble 等组的
			   选择器只在「特定视图」才渲染，用 querySelector 判存在会误砍
			   （设置页里显示「兼容模式：tabs」就是证据）。
			   现在只有 strict 组（依赖 frame/centerCol/sessionHeader 这类
			   会话框架结构契约）才做严格判定，其余一律保留。 */
			if (g.always || !g.probe || !g.strict) return true
			/* 会话视图不在场（设置页 / 空白页 / 首帧 / 离线测试桩）时，
			   DOM 契约缺的是「当前没渲染」，不是「官方结构变了」。保留。 */
			if (typeof conversationViewPresent === 'function' && !conversationViewPresent()) {
				GROUP_PROBE_CACHE.set(g.id, true)
				return true
			}
			try {
				for (const sel of g.probe) {
					if (document.querySelector(sel)) { GROUP_PROBE_CACHE.set(g.id, true); return true }
				}
			} catch (e) { /* 元素已卸载 */ }
			GROUP_PROBE_CACHE.set(g.id, false)
			return false
		}
		/** 供各 ctx.effect 守卫：该组当前是否可用。 */
		function groupEnabled(id) {
			const g = CSS_GROUPS.find((x) => x.id === id)
			if (!g) return true
			if (g.always) return true
			return GROUP_PROBE_CACHE.get(id) !== false
		}
		/** P1-4：effect 自带锚点探测，与它真正依赖的 DOM 严格对齐。
		    官方升级改了选择器时不插节点、不报错；锚点回来后由现有
		    MutationObserver / avatarsRescan 自愈机制自动补上。 */
		function effectProbe(sel) {
			try { return !!document.querySelector(sel) } catch (e) { return false }
		}
		/** 按锚点把布局层切成组段：
		      prelude = LAYOUT_MARK 注释到第一个组锚点之间（always，永注入）；
		      组段 i = [anchor_i, anchor_(i+1))，最后一段到末尾。
		      找不到锚点的组退化为「空段」（不丢 CSS，内容留在前一段里）。
		      全部段拼回去 = 原 css（正常态逐字节一致）。 */
		function splitCssGroups(css, layoutStart) {
			const token = css.slice(0, layoutStart)
			const layout = css.slice(layoutStart)
			const at = []
			for (let i = 1; i < CSS_GROUPS.length; i++) {
				const g = CSS_GROUPS[i]
				const from = at.length ? at[at.length - 1] : 0
				const p = g.anchor ? layout.indexOf(g.anchor, from) : -1
				at.push(p < 0 ? from : p)
			}
			const firstAt = at.length ? at[0] : layout.length
			const segments = [
				{ id: 'token', text: token },
				{ id: 'prelude', text: layout.slice(0, firstAt) }
			]
			for (let i = 1; i < CSS_GROUPS.length; i++) {
				const start = at[i - 1]
				const end = i < CSS_GROUPS.length - 1 ? at[i] : layout.length
				segments.push({ id: CSS_GROUPS[i].id, text: layout.slice(start, end) })
			}
			return segments
		}

		/**
		 * @param {object} p 已应用用户偏好（含 s.accent）的色板
		 * @param {string} baseAccent 色板原生的强调色（不随用户 accent 变）
		 *   2026-11-06 用户定调：强调色只作用于「局部特殊部分」（发送键、
		 *   选中态、下划线、滑块、链接），绝不能改变整体框架主体配色。
		 *   官方有些 token（brand-primary 等）会被大面积组件消费，
		 *   因此这些 token 一律喂色板原值，用户 accent 只写进
		 *   --buxu-user-accent 这个专用变量，供白名单控件使用。
		 */
		function buildCss(p, dark, tokenOnly, baseAccent) {
			const scope = dark ? 'body[data-ds-dark-theme]' : 'html:not([data-ds-dark-theme]) body'
			const frameAccent = baseAccent || p.accent
			const userAccent = p.accent
			const userAccentContrast = accentForeground(userAccent)
			const userAccentText = dark ? p.accent : accentForeground(p.accent)
			const S = SEL(scope)
			const css = `
/* 窗口四角底色：html/body 跟随侧栏色。
   frame 的 8px 圆角抠掉的楔形区露出的是 html/body 背景——
   之前是面板色 #161616，与侧栏 #2B2B2B 只差 8% 亮度，
   看起来就是「没有弧度的黑角」。刷成侧栏色后楔形成为侧栏的一部分，
   圆角轮廓由 frame 圆角 + 顶部细线伪元素共同勾出。

   **只能刷 html，不能刷 body**（实测教训）：
   body 是 centerCol 等面板内容的祖先，background 会被子元素继承透视，
   在 centerCol 内容未渲染（空白会话/懒加载）时整块主区露出侧栏色，
   审计 7 项 FAIL。html 元素不参与内容布局，只提供画布底色，
   补四角楔形区刚好且不会渗透到主区。 */
${dark ? 'html:not([data-ds-dark-theme])' : 'html:not([data-ds-dark-theme])'},
${dark ? 'body[data-ds-dark-theme]' : 'html:not([data-ds-dark-theme])'} {
  background: ${p.sidebar} !important;
}
${scope} {
  color-scheme: ${dark ? 'dark' : 'light'};
  color: ${p.text} !important;
  --dsw-alias-bg-base: ${p.bgBase} !important;
  --dsw-alias-bg-layer-1: ${p.bg1} !important;
  --dsw-alias-bg-layer-2: ${p.bg2} !important;
  --dsw-alias-bg-layer-3: ${p.bg3} !important;
  --dsw-alias-bg-overlay: ${p.bg3} !important;
  --dsw-alias-bg-module-platform: ${p.bg3} !important;
  --dsw-alias-label-primary: ${p.text} !important;
  --dsw-alias-label-secondary: ${p.text2} !important;
  --dsw-alias-label-tertiary: ${p.text3} !important;
  --dsw-alias-label-caption: ${p.caption} !important;
  --dsw-alias-label-dimmed: ${p.dimmed} !important;
  /* 文档 / PDF 预览表面（2026-11-05 深色实测发现）：
     官方在深色块里仍把 bg-document-preview 指到 neutral-bluish-100（浅色）
     —— PDF 纸张保持白色是合理的设计，但**整个预览容器**跟着刷成浅色，
     深色模式下右栏变成一大块刺眼的白。
     主题接管为面板档（深色即深灰），纸张本身的可读性由预览组件自身保证。 */
  --dsw-alias-bg-document-preview: ${p.bg2} !important;
  --dsw-alias-label-document-preview: ${p.text2} !important;
  --dsw-alias-bg-document-selection: color-mix(in srgb, ${frameAccent} 30%, transparent) !important;
  /* 官方 alias-bg 补齐（2026-11-05 终检 P3）：这些面板不常驻、易漏，
     一旦露出官方色，深色下会出现局部亮块（文档预览就是这么暴露的）。 */
  --dsw-alias-bg-skeleton: ${p.bg2} !important;
  --dsw-alias-bg-multi-select: color-mix(in srgb, ${frameAccent} 18%, transparent) !important;
  --dsw-alias-bg-mask-drop: color-mix(in srgb, ${p.sidebar} 72%, transparent) !important;
  --dsw-alias-bg-mask-photo: color-mix(in srgb, ${p.bgBase} 82%, transparent) !important;
  /* shimmer 扫光色（2026-11-04 重影修复）：官方默认深色档是
     color-mix(neutral-00 45%, transparent) 的白色半透明。ShimmerText 组件用
     ::after{content:attr(data-shimmer-text)} 把同一份文字复制到
     ._decoration_1rdzk_25 装饰层，靠这个 token 着色；主题把面板刷成中性灰后
     白色复制文字对比过强，动画停在中间帧时就是「重影」。
     改成与正文同色系的 22% 透明度：扫光仍能亮一下，但不再有白色鬼影。 */
  --dsw-alias-label-shimmer: color-mix(in srgb, ${p.text} 22%, transparent) !important;
  --dsw-alias-brand-primary: ${frameAccent} !important;
  /* 用户强调色：只给局部控件白名单消费，框架主体色一律不受它影响。
     2026-11-06 用户反馈「强调色把整体页面颜色都换了」的根治。 */
  --buxu-user-accent: ${userAccent} !important;
  /* 2026-11-07：插件内所有原本引用 state-business-primary 的地方
     已统一改用 --buxu-user-accent（用户强调色）。此 token 保留官方品牌蓝定义，
     仅供官方组件自身消费，避免改它波及整体框架配色。 */
  --dsw-alias-state-business-primary: var(--dsw-static-deepseek-400) !important;
  --dsw-alias-brand-text: ${p.text} !important;
  --dsw-alias-border-l1: ${p.border} !important;
  --dsw-alias-border-l2: ${p.border} !important;
  --dsw-alias-border-l3: ${p.border} !important;
  --dsw-alias-interactive-bg-active: ${p.select} !important;
  --dsw-alias-interactive-bg-hover: ${p.hover} !important;
  --dsw-alias-interactive-bg-hover-solid: ${p.hover} !important;
  --dsw-alias-scrollbar-bg-l1: ${p.bg2} !important;
  --dsw-alias-scrollbar-bg-l2: ${p.bg2} !important;
  --dsw-alias-scrollbar-hover-l1: ${p.select} !important;
  --dsw-alias-scrollbar-hover-l2: ${p.select} !important;
  --dsw-specific-sidebar-fill: ${p.sidebar} !important;
  --dsw-specific-sidebar-nav-item-active: ${p.select} !important;
  --dsw-specific-sidebar-nav-item-active-accent: ${frameAccent} !important;
  /* v0.2.2 起官方删除 --dsw-specific-sidebar-nav-item-hover（并入
     --dsw-alias-interactive-bg-hover，侧栏 .panelRow:hover 直接用后者）。
     保留声明只会是无效声明，直接移除。 */
  /* 按钮族（v0.2.2 新增，主题必须接管，否则「新会话」等控件露出官方底色）：
     .newSession 用 button-elevated-fill、hover 用 button-floating-hover。
     沿用主题既有的「最亮交互面」= composer 档，hover 走 hover 档。 */
  --dsw-alias-button-elevated-fill: ${p.composer} !important;
  --dsw-alias-button-floating-hover: ${p.hover} !important;
  --dsw-specific-input-major: ${p.composer} !important;
  --dsw-specific-bubble: ${p.bubble} !important;
  --dsw-specific-menu: ${p.bg3} !important;
  --dsw-specific-selector: ${p.bg2} !important;
  --dsw-specific-tip: ${p.bg3} !important;
  /* specific 补齐：气泡高亮（引用/搜索命中）与登录输入框，
     两者都会在特定流程出现，不补齐同样会露出官方色。 */
  --dsw-specific-bubble-highlight: color-mix(in srgb, ${frameAccent} 20%, ${p.bubble}) !important;
  --dsw-specific-login-input: ${p.composer} !important;
  /* 换肤弹窗专用表面（2026-11-05 第五版）。
     portal 节点挂在 body 下，属于本作用域的后代，能继承这里的变量。
     之前弹窗直接取 bg-layer-1，与它背后的主内容区完全同色，
     深浅两套都糊成一片 —— 用户反馈「没有层次感」。
     改法：弹窗表面取 bg2（与内容区 bg1 明确差一档），标题区取 bg1
     再差一档；外框与组间线取 panelEdge（比 7% 透明度的 border 强得多）；
     行间线取 panelEdge 的半透明版；阴影按深浅分别给足对比。 */
  --buxu-pop-surface: color-mix(in srgb, ${p.bg2} 92%, #FFFFFF 8%) !important;
  --buxu-pop-head: ${p.bg1} !important;
  --buxu-pop-border: ${p.panelEdge} !important;
  --buxu-pop-divider: color-mix(in srgb, ${p.panelEdge} 55%, transparent) !important;
  --buxu-pop-row-hover: ${p.hover} !important;
  --buxu-pop-row-active: ${p.select} !important;
  --buxu-pop-thumb-border: ${p.panelEdge} !important;
  --buxu-user-accent-contrast: ${userAccentContrast} !important;
  --buxu-user-accent-text: ${userAccentText} !important;
  --buxu-pop-shadow: ${dark ? '0 12px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4)' : '0 12px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)'} !important;
}

/* 文字选中色：DSH 默认是系统蓝，与中性灰主题冲突。
   ::selection 不能被继承，必须直接挂在元素上，
   所以用通配选择器覆盖（优先级靠 !important 保证）。 */
${scope} ::selection {
  background: ${p.select} !important;
  color: ${p.text} !important;
}
${scope} ::-moz-selection {
  background: ${p.select} !important;
  color: ${p.text} !important;
}

${scope} :is([class*='sidebar']) {
  background: ${p.sidebar} !important;
  background-image: none !important;
}

/* ---------------------------------------------------------------
 * 代码块头部角标（2026-11-05 第二版，用户否掉胶囊方案）
 *
 * 用户反馈：胶囊（浅底 + 描边 + 圆角）像个补丁，和周围不融，
 *   「太难看了」。改为**纯文字 / 裸图标**：不加任何容器。
 *
 * 范围：左上的语言标签（代码块 / css），右上的收起 + 复制两个按钮。
 *   头部容器、代码正文、交互逻辑全不动。
 *
 * 官方结构（index-lh_YM6sT.css，哈希类名用 [class*=] 通配避免失效）：
 *   [class*='_header_']    flex, space-between, padding:10px 18px 8px 22px
 *   [class*='_language_']  color:tertiary, 等宽字, 无底色
 *   [class*='_actions_']   flex, gap:4px
 *   [class*='_action_']    24x24, transparent, hover 才出底
 *
 * 设计：语言标签只保留小号等宽浅色文字，靠字重/字距/颜色与
 *   正文区分；按钮保持官方的透明裸图标，仅补一点间距、
 *   hover 淡底和焦点环。全部走 --dsw-alias-* token，深浅自动跟随。
 * --------------------------------------------------------------- */
/* 语言标签：纯文字，无底色无描边无圆角 */
${scope} [class*='_language_'] {
  display: inline !important;
  height: auto !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: var(--dsw-alias-label-tertiary) !important;
  font-family: var(--ds-font-family-code, var(--dsw-font-family)) !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  letter-spacing: 0.02em !important;
  line-height: 18px !important;
  white-space: nowrap !important;
}
/* 右侧按钮组：只拉开一点间距 */
${scope} [class*='_actions_'] {
  gap: 6px !important;
}
/* 单个操作按钮：官方的透明裸图标，只补 hover 与焦点环 */
${scope} [class*='_actions_'] [class*='_action_'] {
  border: 0 !important;
  border-radius: var(--dsw-radius-sm) !important;
  background: transparent !important;
  color: var(--dsw-alias-label-tertiary) !important;
  transition: background-color 120ms ease, color 120ms ease !important;
}
${scope} [class*='_actions_'] [class*='_action_']:hover {
  background: var(--dsw-alias-interactive-bg-hover) !important;
  color: var(--dsw-alias-label-primary) !important;
}
${scope} [class*='_actions_'] [class*='_action_']:focus-visible {
  outline: 2px solid var(--dsw-focus-ring-color, var(--buxu-user-accent)) !important;
  outline-offset: 2px !important;
}
@media (prefers-reduced-motion: reduce) {
  ${scope} [class*='_actions_'] [class*='_action_'] {
    transition: none !important;
  }
}
/* 头像 CSS 归入 token 层：plain 色板 / 降级模式也会输出，避免切配色后头像消失。 */
${scope} [data-chat-flow-kind='assistant-step'][data-chat-group-part='response'],
${scope} [data-chat-flow-kind='assistant-step']:not([data-chat-group-part]) {
  position: relative !important;
}
/* 头像留白只在「开启头像」时生效。
   **属性必须挂在 body 上，不能挂在 html 上**（2026-11-05 事故）：
   scope 本身已经以 html/body 开头（浅色态是
   [html:not([data-ds-dark-theme]) body]），若再前缀一个 html[...]
   就拼成 [html[...] html:not(...) body] —— 同一链里两个 html，
   **永远不匹配**。用户点「浅色」后留白规则整条失效，头像压到文字上。
   所以：属性挂 body，前缀就是 scope 后紧跟 [data-...]。
   注意：这个文件里的 CSS 全部在模板字符串内，
   **注释里绝对不能出现反引号**（会让整个模板字符串提前结束）。
   同理也不要写美元符号加花括号（会被当成插值求值）。 */
${scope}[data-dsh-theme-buxu-avatars='on'] [data-chat-flow-kind='assistant-step'][data-chat-group-part='response'],
${scope}[data-dsh-theme-buxu-avatars='on'] [data-chat-flow-kind='assistant-step']:not([data-chat-group-part]) {
  padding-left: ${GEO.avatarSize + 8}px !important;
}
/* 头像节点样式（由 JS 插入，带 data-tn-avatar 属性）
   **2026-11-05 修正**：初版直接 background-size:cover + border-radius:50%，
   实测显示为「圆角方形 + 白底」而不是圆形头像。
   原因：鲸鱼 webp 是**白底实心图**（不是透明 PNG），
   cover 把它按正方形铺满，白色就是图片内容本身，
   border-radius 只裁背景的绘制区域，图片的白底仍然填满整个方形。
   修法：用 mask 把整个节点裁成正圆 —— 连图片内容一起裁，
   白底与四角会一起消失，只留下圆形区域内的图案。 */
${scope} [data-tn-avatar] {
  position: absolute !important;
  left: 0 !important;
  top: 2px !important;
  width: ${GEO.avatarSize}px !important;
  height: ${GEO.avatarSize}px !important;
  /* 2026-11-05 定稿：用户提供的透明底鲸鱼图（1600x1562 PNG）
     处理链：裁透明包围盒 → 256px → 三色量化（透明/白/蓝 #0D50FF）→ 128px
     原图 522KB → 最终 4.0KB base64 5.4KB。
     眼睛与嘴是图里自带的白色，不再依赖 CSS 垫底或路径重组。

     圆角是**用户设置**（avatarRadius，0-50%，50% = 正圆），默认 12：
     26px 头像约 3px 收角，能看出圆角又不接近正圆；2% 实测只有
     0.5px，肉眼等于直角（用户反馈「不是圆角」）。用户换成方形
     自拍图时可以自己调大，50% 就是正圆，仍能避开鲸鱼鱼鳍。 */
  border-radius: ${GEO.avatarR}% !important;
  background-size: contain !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
  opacity: 0.95;
  pointer-events: none !important;
  flex: none !important;
  z-index: 1 !important;
}
/* ---- 2026-11-09 助手头像「首尾大 / 中间小」----
    scanDirect 按官方 data-chat-turn 分组给正文段打 data-buxu-avatar-edge=
    first|last|mid；只有 mid 缩到「和文字差不多大」，首尾保持用户设置尺寸。
    · 小头像 18px（2026-11-10：14→16→22→20→18，逐档试到用户满意；因内置图
      带透明留白、contain 下图案仅占节点约 73%，故放大节点而非裁图案，图案完整不裁边），
      仍随官方字号增量 --dsh-content-font-delta 一起变（practices.md:34）；
    · 留白 padding-left 不随 mid 改变（仍是 GEO.avatarSize+8），中间段文字不左右跳；
    · 小头像垂直居中到文字行，圆角仍跟 avatarRadius；
    · transition 缓和流式生成时「旧尾降级为 mid」的尺寸跳变，尊重 reduced-motion；
    · 只作用于助手头像，用户头像（data-tn-avatar=user）完全不变；
    · 全部用官方 data-* 属性 + 插件自有标记，零哈希类名。 */
${scope} [data-buxu-avatar-edge='mid'] [data-tn-avatar='assistant'] {
  width: calc(18px + var(--dsh-content-font-delta, 0px)) !important;
  height: calc(18px + var(--dsh-content-font-delta, 0px)) !important;
  top: calc((24px + var(--dsh-content-font-delta, 0px) - (18px + var(--dsh-content-font-delta, 0px))) / 2) !important;
  opacity: 0.8 !important;
}
${scope} [data-tn-avatar='assistant'] {
  transition: width .18s var(--ds-ease-in-out, ease), height .18s var(--ds-ease-in-out, ease), top .18s var(--ds-ease-in-out, ease), opacity .18s var(--ds-ease-in-out, ease) !important;
}
@media (prefers-reduced-motion: reduce) {
${scope} [data-tn-avatar='assistant'] { transition: none !important; }
}
${scope} [data-tn-avatar='assistant'] {
  background-image: url("data:image/png;base64,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") !important;
}
${scope} [data-tn-avatar='user'] {
  background-image: url("data:image/jpeg;base64,${AVATAR_USER}") !important;
}
/* 用户头像定位锚点：行容器本身设 relative。
   2026-11-06 起 JS 把头像挂到行容器（不再依赖内部 bubble 是否存在），
   所以这里必须给行容器留定位上下文；同时保留 bubble 的 relative，
   兼容旧版挂载位置。 */
${scope} [data-chat-flow-kind='user'] {
  position: relative !important;
}
${scope} [data-chat-flow-kind='user'] [class*='bubble'] {
  position: relative !important;
}
/* 右侧头像留白：只在开启头像时生效（属性挂 body，理由见上面那段注释） */
${scope}[data-dsh-theme-buxu-avatars='on'] [data-chat-flow-kind='user'] {
  padding-right: ${GEO.avatarSize + 46}px !important;
}
/* ---- 提问选择结果气泡（2026-11-06）----
   官方 QuestionReplyBubble 用 [data-question-reply] 作外层 row
   （flex column / align-items:flex-end），内部是
   [class*='bubbleWidth']（限宽、右对齐）包着 UserMessageBubble。
   它没有 data-chat-flow-kind='user'，所以头像扫描器要单独处理。

   **2026-11-06 修正「头像离气泡太远」**：
   初版给 row 加了 padding-right 想留白，但气泡本身是右对齐且限宽的，
   padding 会把整个气泡往左推、头像又锚在 row 右缘 → 中间空出约 250px。
   现在改为：row 不加任何 padding（气泡保持原位），
   把定位上下文移到 [class*='bubbleWidth'] 上，头像直接锚到它右缘，
   距离固定为一个头像宽度 + 8px，与标准用户消息一致。 */
${scope} [data-question-reply] {
  position: relative !important;
}
${scope} [data-question-reply] [class*='bubbleWidth'] {
  position: relative !important;
}
/* ---- 头部配色按钮（2026-11-05 第四版）----
    第三版是纯文字触发器，用户反馈「按钮没做」：看不出可点。
    这一版做成明确控件：当前色小色块 + 配色名 + 下拉箭头，
    细描边 + 轻底 + 4px 圆角（不是胶囊），hover 高亮。
    弹窗已改用 createPortal 挂到 body，不再依赖徽标做定位包含块，
    因此这里不需要 position:relative，也不再需要 overflow 补丁。

    **必须放在 LAYOUT_MARK 之前（token 层）**：plain 色板（石墨2/云白2）
    只注入标记之前的部分，若按钮样式落在布局层，选这两套时按钮会
    退化成没有描边/底色的裸 button —— 用户会看到「按钮不见了」。
    头像 CSS 同理，见上方注释。 */
${scope} .tn-header-badge {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  height: 24px !important;
  padding: 0 8px !important;
  margin-right: 8px !important;
  border: 1px solid var(--dsw-alias-border-l2) !important;
  border-radius: 4px !important;
  background: var(--dsw-alias-interactive-bg-hover) !important;
  color: var(--dsw-alias-label-secondary) !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  letter-spacing: 0.01em !important;
  line-height: 22px !important;
  white-space: nowrap !important;
  flex: none !important;
  align-self: center !important;
  user-select: none !important;
  pointer-events: auto !important;
  cursor: pointer !important;
  -webkit-app-region: no-drag !important;
}
@media (hover: hover) {
  ${scope} .tn-header-badge:hover {
    color: var(--dsw-alias-label-primary) !important;
    border-color: var(--buxu-user-accent) !important;
    background: var(--dsw-alias-bg-layer-1) !important;
  }
}
${scope} .tn-header-badge:focus-visible {
  outline: 2px solid var(--dsw-focus-ring-color, var(--buxu-user-accent)) !important;
  outline-offset: 2px !important;
}
/* 换装徽章：深色底 + 亮色 T 恤剪影 + 45 度长投影（用户参考图指定）。
   演变：12px 方块 → 14px 描边 T 恤 → 18px 结构线版 → 现在这版。
   用户 2026-11-05 给参考图：白色实心衣服、圆润 U 领、向右下的 45°
   长投影、深色背景。之前几版都在「描边 + 结构线」上使劲，方向就错了 ——
   参考图的力量来自**体块与投影**，不是线条细节。

   实现：SVG 内三层 —— 深色圆角底片、12 层同路径偏移副本叠出实心斜影、
   最上层亮色衣服剪影；SVG 根元素默认 overflow:hidden，投影越界自然裁切。
   颜色刻意固定、不随深浅主题变：这是一枚「徽章」（像 app 图标），
   两种主题下都要保持「深色底 + 亮衣服」的立体观感；若跟着主题反色，
   浅色主题下深色底片消失，长投影也就无从谈起。
   三层明度递进：底片 #262626 → 影 #0D0D0D（更深）→ 衣服 #F2F2F3（更亮）。 */
${scope} .tn-header-badge-swatch {
  width: 18px !important;
  height: 18px !important;
  flex: none !important;
  display: block !important;
  border: 0 !important;
  border-radius: 4px !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
  pointer-events: none !important;
}
${scope} .tn-header-badge-swatch [data-buxu-shirt='plate'] {
  fill: #262626 !important;
}
${scope} .tn-header-badge-swatch [data-buxu-shirt='shadow'] {
  fill: #000000 !important;
}
${scope} .tn-header-badge-swatch [data-buxu-shirt='body'] {
  fill: #F2F2F3 !important;
}
/* 悬停时底片微微提亮，给按钮一个轻微反馈，不改变剪影与投影 */
@media (hover: hover) {
  ${scope} .tn-header-badge:hover .tn-header-badge-swatch [data-buxu-shirt='plate'] {
    fill: #303030 !important;
  }
}
/* 下拉箭头：纯 SVG，跟随文字色 */
${scope} .tn-header-badge-chevron {
  width: 10px !important;
  height: 10px !important;
  flex: none !important;
  opacity: 0.75 !important;
  pointer-events: none !important;
  transition: transform 120ms ease !important;
}
${scope} [data-buxu-badge-open='true'] .tn-header-badge-chevron {
  transform: rotate(180deg) !important;
}
@media (prefers-reduced-motion: reduce) {
  ${scope} .tn-header-badge-chevron { transition: none !important; }
}
/* 弹窗字体与浏览器表面（craft-floor: 没画出来的部分也要带上设计系统）。
   弹窗挂在 body 下、属 scope 后代，这里用通配归零字体上下文，
   分隔线/滚动条/焦点环则由 scoped token 供给，深浅各自成立。 */
[data-buxu-popover] {
  font-family: inherit !important;
  font-size: 12px !important;
  white-space: normal !important;
  letter-spacing: normal !important;
  -webkit-app-region: no-drag !important;
  color: var(--dsw-alias-label-primary) !important;
}
[data-buxu-popover] ::-webkit-scrollbar {
  width: 8px !important;
}
[data-buxu-popover] ::-webkit-scrollbar-track {
  background: transparent !important;
}
[data-buxu-popover] ::-webkit-scrollbar-thumb {
  background: var(--buxu-pop-border) !important;
  border-radius: 4px !important;
  border: 2px solid var(--buxu-pop-surface) !important;
}
[data-buxu-popover] :focus-visible {
  outline: 2px solid var(--buxu-user-accent) !important;
  outline-offset: -2px !important;
}
[data-buxu-popover] ::selection {
  background: var(--buxu-pop-row-active) !important;
  color: var(--dsw-alias-label-primary) !important;
}
/* 行 hover：内联样式只能定静态态，hover 必须走样式表 */
[data-buxu-popover] [data-buxu-palette]:hover {
  background: var(--buxu-pop-row-hover) !important;
}
[data-buxu-popover] [data-buxu-palette][data-buxu-active='true']:hover {
  background: var(--buxu-pop-row-active) !important;
}
/* 思考/工具调用行文字淡化（用户 2026-11-04）：reasoning 段是辅助信息，
   降到 tertiary 档。
   **只能瞄准 _content_1rdzk 真实文本层**（2026-11-04 重影事故的正式修法）：
   官方工具行文本是双层结构 —— 内容层 + absolute 装饰层（_decoration_1rdzk_25，
   同矩形同文字、官方透明）。任何 :is(p, span, div) 级的 color !important
   都会把装饰层的透明改成可见 → 同款文字显形叠加 = 重影。
   单独瞄准内容层则装饰层不受影响，淡化安全。 */
/* 用官方半公开属性 data-shimmer-text 做唯一锚点：它就是被 ShimmerText 渲染、
   且会 ::after 复制文字的文本元素。content 类名在 4 个模块重名，不能单独用。 */
${scope} [data-chat-flow-kind='assistant-step'][data-chat-group-part='reasoning'] [data-shimmer-text] {
  color: ${p.text3} !important;
}

/* ShimmerText 装饰层防重影（2026-11-05 第三次修复，这次定位到根因）。
   官方 index-lh_YM6sT.css 的实际结构：
     ._sweep_1rdzk_34   position:absolute; inset:0;
                        color:var(--dsw-alias-label-shimmer);
                        mask-image:linear-gradient(...);
                        transform:translate(-100%);
                        animation: steps(48) infinite
     ._sweep_1rdzk_34 * { color:inherit !important }   ← 关键

   之前两版为什么没用：
   ① 给 [data-shimmer-text] 设色 —— decoration 层里没有带该属性的元素，
      选择器永远匹配不到。
   ② 给 _sweep_ 设 color:var(--dsw-alias-label-shimmer) !important
      —— 反而帮倒忙：_sweep_ * { color:inherit !important } 把这个颜色
      强制继承给所有后代复制文字，mask 停帧时就显形。
      steps(48) 动画停帧 / 截图合成瞬间 mask 没完全遮住 → 两份文字
      错开几像素叠在一起 = 用户反复报告的「重影」。

   修法：把 sweep 层里所有后代的 color 强制 transparent，
   用更高优先级压过官方的 !important。内容层与扫光动画不受影响。 */
${scope} [class*='_sweep_'] * {
  color: transparent !important;
}
/* 工具/命令/技能/推理行的摘要里还有 data-shimmer-decoration：
   官方 CSS 给了 background:currentColor，扫光停帧时会画出一个
   可见色块 + 复制文字，形成另一类重影（2026-11-05 第四次反馈，
   出现在「编辑 / eval verify-xxx」这类工具卡片里，不是普通正文）。
   上面把 color 设 transparent 后 currentColor 变透明，但为稳妥
   再显式压掉 background。 */
${scope} [data-shimmer-decoration] {
  background: transparent !important;
  color: transparent !important;
}
/* ShimmerText 防重影（2026-11-06 第五次，这次命中真凶）。
   官方 index-lh_YM6sT.css 原文（已从 app.asar 取出核对）：
     ._text_1rdzk_17[data-shimmer-text]::after { content: attr(data-shimmer-text) }
     ._decoration_1rdzk_25 { position:absolute; inset:0; overflow:clip }
   **复制文字的是 [data-shimmer-text] 元素自己的 ::after 伪元素**，
   不是 _sweep_ 的后代、也不是 [data-shimmer-decoration]（后者只是个
   分隔符小圆点 span）。之前四版把 sweep / decoration 透明化，
   伪元素 content 一直在，所以「偶发重影」从未根治 —— 用户三张截图里
   连【用户提问气泡】都出现两层文字错位，正是这个原因。

   修法：直接把伪元素的 content 置空。用 [data-shimmer-text] 这个
   官方半公开属性做锚点，跨模块（reasoning / tool / command / skill /
   用户气泡）通用，不依赖哈希类名。
   注意：只压 content，不动 color —— 内容层的文字颜色仍需保留，
   否则整个卡片文字会消失。 */
/* **2026-11-08 第九次（官方源码实证，推翻第五/六次的做法）**：
   官方 TextShimmer 的 Wp 实现（前端 bundle @641049）：
     const r = useContext(O1) === true && typeof e == "string"
     return span({ "data-shimmer-text": r ? e : undefined, children: r ? null : e })
   即 **data-shimmer-text 元素本身 children=null，文字完全靠
   ::after { content: attr(data-shimmer-text) } 渲染**。
   前两版把该伪元素 content 置空是错的 —— 抹掉的是主文字本体，
   扫光层若还在，就只剩半透明副本，看起来正是「双层描边 / 残影」。
   同理 [data-question-reply] *::after{content:none} 也会误伤官方气泡
   里靠伪元素渲染的文字。两条一并删除。

   真正的复制层是 C2 在 active 时渲染的第二份真实 DOM：
     content 层 + decoration > sweep > highlight 层
   它们带 _decoration_ / _sweep_ / _highlight_ 类名 key。
   正确修法：直接隐藏这三个真实复制层，主文字伪元素保持不动。
   全局不带 scope，覆盖 portal 挂载点与任何层叠上下文。 */
[class*='_decoration_'],
[class*='_sweep_'],
[class*='_highlight_'] {
  display: none !important;
}
/* 装饰层后代文字透明作为第二道保险（历史规则保留，与上面不冲突）。 */
[class*='_sweep_'] *,
[class*='_decoration_'] * {
  color: transparent !important;
}
/* 2026-11-07 第八次（真凶，官方代码实证）：
   推理过程块里每一行 ReasoningRow 收起态的 CSS 是
     .VJlF5q_root:not([data-expanded]){contain:size layout;height:calc(24px + ...)}
   且 root 自身**没有 overflow:hidden**（只有 .VJlF5q_row 有）。
   contain:size 把高度锁死 24px、contain:layout 建立独立层叠上下文，
   内容溢出后绘制到相邻行之上 → 展开过程块里「每行重影、相邻两行
   两段不同英文互叠、中文标签双描边」；顶部组标题无 contain:size 故不中招。

   行内 TextShimmer 调用都不带 active，decoration/sweep 复制层根本不生成，
   所以前面七版压 content/color/display 全压错了对象。

   修法：用稳定属性 data-variant='think'（ReasoningRow 根节点自带）定位，
   只作用于收起态 :not([data-expanded])：
     contain:none 解除尺寸/布局隔离，height:auto 让行按内容撑开，
     overflow:clip 兜底防溢出覆盖。展开态不受影响。 */
[data-variant='think']:not([data-expanded]) {
  contain: none !important;
  height: auto !important;
  overflow: clip !important;
}
/* ---- 推理等级强度条（2026-11-06）----
   官方 dsh-client-ui-model-selection 的模型菜单里，「推理等级」是
   role=menuitem 的 button.cell，内含 cellLabel / cellValue / cellChevron。
   用户给参考图（思考强度：渐变滑块 + 白圆点 + 快捷键），希望借鉴
   「强度可视化」但做成另一种设计、且**不要快捷键**。

   这里做成与滑块完全不同的形态：一条**细的静态渐变刻度轨**，
   位于菜单行下方，配一个按当前档位定位的小圆点；档位文本仍在右侧。
   档位是模型目录动态提供的（名称可本地化/自定义），所以不假设
   Off/Low/Medium/High，由 JS 读 cellValue 文本稳定 hash 出 0-100%
   写入 --buxu-effort-pos，CSS 据此放圆点。纯装饰性区分，不声称精确档位。
   类名用 key 通配 [class*='_cell']，不依赖 _9r0rkG_ 哈希前缀。 */
/* ---- 推理强度滑块（2026-11-06 v2，按用户四张参考图重做）----
   连续可拖的宽滑块：绿→蓝渐变填充 + 4 个均分档位刻度 +
   白色大圆点；最右端=最高档。松手时 JS 转发到官方档位按钮。
   真实 DOM 节点（不是伪元素），才能接收 pointer 拖动。
   **不做快捷键**（用户明确要求）。 */
/* 2026-11-07 二调：用户反馈「模型行 / 推理等级行 / 滑动条」三行都离得近。
   三段分别拉开：① 模型行下留白 ② 推理等级行上留白 ③ 文字行到滑块留白。 */
/* 模型行：推理等级行的紧邻前一个兄弟（:has 已在右栏规则里实证可用）。 */
[role='menuitem'][class*='_cell']:has(+ [role='menuitem'][data-buxu-effort]) {
  padding-bottom: 10px !important;
}
[role='menuitem'][data-buxu-effort] {
  position: relative !important;
  /* padding-top 拉开与上方「模型」行；padding-bottom 拉开与下方滑块。
     滑块 bottom:8px + 高 22px = 贴底 30px，故文字底到滑块顶约 56-30=26px。 */
  padding-top: 12px !important;
  padding-bottom: 56px !important;
}
[data-buxu-effort-slider] {
  position: absolute !important;
  left: 14px !important;
  right: 14px !important;
  bottom: 4px !important;
  height: 32px !important;
  display: flex !important;
  align-items: center !important;
  cursor: pointer !important;
  touch-action: none !important;
}
[data-buxu-effort-slider]:focus-visible {
  outline: 2px solid var(--buxu-user-accent) !important;
  outline-offset: 2px !important;
}
[data-buxu-effort-slider][aria-disabled='true'] {
  cursor: not-allowed !important;
  opacity: 0.55 !important;
}
[data-buxu-effort-slider][aria-busy='true'] {
  cursor: wait !important;
}
[data-buxu-effort-slider][data-buxu-effort-error]:not([data-buxu-effort-error=''])::after {
  content: attr(data-buxu-effort-error) !important;
  position: absolute !important;
  right: 0 !important;
  bottom: -15px !important;
  color: var(--dsw-alias-state-warn-label, #FF8A30) !important;
  font-size: 10px !important;
  line-height: 14px !important;
  white-space: nowrap !important;
}
/* 轨道底（未填充部分） */
[data-buxu-effort-track] {
  position: absolute !important;
  left: 0 !important;
  right: 0 !important;
  /* 2026-11-07：用户要求进度条再宽些（12px → 18px）。 */
  height: 18px !important;
  border-radius: 9px !important;
  background: var(--dsw-alias-bg-layer-2) !important;
  border: 1px solid var(--dsw-alias-border-l2) !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
}
/* 渐变填充：宽度由 --buxu-effort-pos 驱动，JS 直接写百分比字符串。
   具体色标由「设置页 → 进度条配色」决定，由 buildCss 追加覆盖；
   这里只留默认「单色蓝阶」作为兜底，保证尚未注入时轨道也不是空白。 */
[data-buxu-effort-fill] {
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
  bottom: 0 !important;
  width: var(--buxu-effort-pos, 0%) !important;
  border-radius: 9px 0 0 9px !important;
  background: linear-gradient(90deg, #8FB6E8 0%, #6B9BE0 34%, #4A7FD0 67%, #2E5FB8 100%) !important;
  overflow: hidden !important;   /* 气泡粒子的伪元素裁切在填充区内 */
  pointer-events: none !important;
}
/* 档位刻度点：JS 按真实档位数动态生成，每个用 --buxu-tick-pos 绝对定位
   （支持任意档数，不再写死 4 个 / space-between）。 */
[data-buxu-effort-ticks] {
  position: absolute !important;
  left: 0 !important;
  right: 0 !important;
  top: 0 !important;
  bottom: 0 !important;
  pointer-events: none !important;
}
[data-buxu-effort-tick] {
  position: absolute !important;
  top: 50% !important;
  left: var(--buxu-tick-pos, 50%) !important;
  transform: translate(-50%, -50%) !important;
  width: 4px !important;
  height: 4px !important;
  border-radius: 50% !important;
  background: var(--dsw-alias-label-tertiary) !important;
  opacity: 0.55 !important;
}
[data-buxu-effort-tick][data-on='true'] {
  background: #fff !important;
  opacity: 0.9 !important;
}
/* 白色大圆点 */
[data-buxu-effort-knob] {
  position: absolute !important;
  top: 50% !important;
  left: var(--buxu-effort-pos, 0%) !important;
  transform: translate(-50%, -50%) !important;
  width: 20px !important;
  height: 20px !important;
  border-radius: 50% !important;
  background: #FFFFFF !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35) !important;
  pointer-events: none !important;
  z-index: 1 !important;
}
@media (hover: hover) {
  [data-buxu-effort-slider]:hover [data-buxu-effort-knob] {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35), 0 0 0 4px rgba(255, 255, 255, 0.12) !important;
  }
}
/* 不做快捷键：官方若渲染 kbd 也不额外强调，保持默认，不新增任何键帽样式。 */
/* ---- 用户强调色白名单（2026-11-06）----
   只有这些「局部特殊部分」跟随用户选的强调色：
     发送/主按钮、链接、页签激活下划线、单选/多选选中态、
     滑块/进度条填充、滚动条 hover、选中文字背景。
   框架主体（侧栏/面板/卡片/气泡/输入卡底色、边框、正文色）
   一律不在这里，因此改强调色绝不会改变整体页面配色。 */
${scope} [data-slot='conversation.chat.flow'] a { color: var(--buxu-user-accent) !important; }
${scope} [data-slot='conversation.composer'] button[type='submit'],
${scope} [data-composer-card] button[aria-label*='发送'],
${scope} [data-composer-card] button[aria-label*='Send'] {
  background: var(--buxu-user-accent) !important;
}
${scope} input[type='range'],
${scope} input[type='checkbox']:checked,
${scope} input[type='radio']:checked { accent-color: var(--buxu-user-accent) !important; }
${scope} [role='tab'][aria-selected='true'],
${scope} [data-active='true'] { border-bottom-color: var(--buxu-user-accent) !important; }
${scope} [role='progressbar'] > * { color: var(--buxu-user-accent) !important; }
/* 2026-11-07：模型下拉菜单里的分组标题（DeepSeek 账号 / DeepSeek /
   WorkBuddy 模型 …）与当前选中项的 ✓ 用用户强调色，让层级归属与
   当前选择一眼可辨。选择器用官方稳定属性，不依赖哈希：
     分组标题 = [data-menu-group-heading]（共享包 MenuGroup 渲染）
     选中 ✓  = [role='menuitemradio'][aria-checked='true'] [class*='_check']
   只改文字/图标颜色，不动背景与布局，符合「强调色只作用于局部」原则。 */
${scope} [data-menu-group-heading] { color: var(--buxu-user-accent) !important; }
${scope} [role='menuitemradio'][aria-checked='true'] [class*='_check'] { color: var(--buxu-user-accent) !important; }
${scope} [role='menuitemradio'][aria-checked='true'] [class*='_check'] svg {
  color: var(--buxu-user-accent) !important;
  stroke: currentColor !important;
}
/* ---- 完全权限警示色（2026-11-07 从布局层移到 token 层）----
    安全警示属于功能本体，不该随款式变化：款式1（石墨1/云白1）此前
    只注入标记之前的 CSS，这条规则落在布局层里根本注入不到，于是
    完全权限在款式1 下没有橙色警示。四套色板的 warn 值本就成对相同
    （石墨1=石墨2，云白1=云白2），不需要改配色值，只要让规则进
    token 层，四套皮肤就都拿到与款式2 一致的警示色。
    读 aria-label 定位，只改文字与图标颜色，不动背景与布局。 */
${scope} button[aria-label*='完全权限'],
${scope} button[aria-label*='Full access'] {
  color: ${p.warn} !important;
}
${scope} button[aria-label*='完全权限'] svg,
${scope} button[aria-label*='Full access'] svg {
  color: ${p.warn} !important;
  filter: none !important;
}
/* ---- 任务条（TodoPanel）：2026-11-07 从布局层移到 token 层 ----
   原因：默认质肤石墨1 是 layout:plain / 降级模式 tokenOnly=true，
   buildCss 只返回 LAYOUT_MARK 之前的部分，布局层整套规则被裁掉，
   用户真机「任务 1 进行中 · 6 待处理」卡片完全没有进度条/百分比。
   移到 token 层后四套色板（含 plain/降级）都会注入。 */

/* ---- 任务条（TodoPanel），2026-11-06 v4 ----
    官方 DOM（已核对 dsh-client-ui-conversation 源码）：
      section[data-testid=todo-panel] > div.body
        > button.header（4 个 span：lead/title/progress/chevron）
        > ul.list > li.item（展开态才有）
    全部用结构选择器，不依赖 DXuOLW_* 哈希类名。
    v2 分段胶囊；v3 同色轻描边 + 独立槽内进度条 + 百分比；
    v4 整条可点（padding 移到 button）+ 展开态标签行与任务行拉开距离。 */
${scope} [data-testid='todo-panel'] {
  position: relative !important;
  border: 1px solid ${p.cardBorder} !important;
  border-radius: ${SPEC.radius.entryCard}px !important;
  background: ${p.card} !important;
  overflow: hidden !important;
}
/* 2026-11-07 v6：进度条从「section 贴底」移到「header 行下方的独立留白区」。
   用户真机反馈：贴底时收起态压在胶囊下沿、展开态压在任务列表最后一行下面。
   做法：给 button 底部留出 10px 空间（见下方 padding: 6px 12px 10px），
   用两层 background-image 画在这段留白里，与上方胶囊文字、下方任务列表分开。
   ① 上层完成段 --buxu-todo-fill 定宽、跟随用户强调色 ② 下层全宽淡灰轨道（p.select）。
   background 相对 padding-box，left bottom 即从内容区左缘贴底，天然带 12px 内边距。
   仍是纯背景层、零绝对定位、零 DOM 改动，不会被 overflow:hidden 裁文字。 */
${scope} [data-testid='todo-panel'] button {
  /* 2026-11-09：进度条完成段跟随用户强调色（一贯偏好，纠正上一轮"去发光"的扩大化）；
     轨道保持 p.select 淡灰、条高 3px、百分比文字保持中性灰（不发光）。 */
  background-image:
    linear-gradient(var(--buxu-user-accent), var(--buxu-user-accent)),
    linear-gradient(${p.select}, ${p.select}) !important;
  background-repeat: no-repeat, no-repeat !important;
  background-size: var(--buxu-todo-fill, 0%) 3px, 100% 3px !important;
  background-position: left bottom, left bottom !important;
}
/* body 不再持有 padding：它属于 div.body，点在那里不会触发 button。
   2026-11-06 用户反馈「缩起时只有三个标签位置能点」——
   把内边距全部移到 button 上，让点击区铺满整条卡片。 */
${scope} [data-testid='todo-panel'] > div {
  padding: 0 !important;
  min-height: 0 !important;
  box-sizing: border-box !important;
}
${scope} [data-testid='todo-panel'] button {
  /* 显式声明 flex：官方 header 是否 flex 由版本决定，不能假设。
     padding 写在这里而不是 body 上，保证整条区域都在 button 的命中区。 */
  display: flex !important;
  align-items: center !important;
  flex-direction: row !important;
  min-height: 40px !important;
  width: 100% !important;
  gap: 8px !important;
  /* 2026-11-09：底部 10px 留白用于画细进度条（不与上方胶囊/下方任务行相挤） */
  padding: 6px 12px 10px 12px !important;
  box-sizing: border-box !important;
  cursor: pointer !important;
}
/* ① 箭头推到最右 */
${scope} [data-testid='todo-panel'] button > span:last-child {
  margin-left: auto !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 24px !important;
  height: 24px !important;
  border-radius: 6px !important;
  color: ${p.text3} !important;
  flex: none !important;
}
@media (hover: hover) {
  ${scope} [data-testid='todo-panel'] button:hover > span:last-child {
    background: ${p.hover} !important;
    color: ${p.text} !important;
  }
}
/* ② 左侧「任务」徽标：与卡片同色 + 仅描边，去掉深灰块
   （2026-11-06 用户反馈「背景没对齐、灰色太深」） */
${scope} [data-testid='todo-panel'] button > span:nth-child(1) {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 26px !important;
  height: 26px !important;
  flex: none !important;
  border: 0 !important;
  background: transparent !important;
  color: ${p.text3} !important;
}
${scope} [data-testid='todo-panel'] button > span:nth-child(2) {
  display: inline-flex !important;
  align-items: center !important;
  height: 26px !important;
  padding: 0 6px 0 0 !important;
  margin-left: -2px !important;
  flex: none !important;
  border: 0 !important;
  background: transparent !important;
  color: ${p.text} !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  letter-spacing: 0.01em !important;
  box-sizing: border-box !important;
}
/* ③ 右侧进度胶囊：官方文本自带「 · 」分隔；
   ::after 显示 JS 写入的百分比（data-buxu-todo-label），把进度语义显性化。 */
${scope} [data-testid='todo-panel'] button > span:nth-child(3) {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  height: 26px !important;
  padding: 0 2px !important;
  flex: none !important;
  border: 0 !important;
  background: transparent !important;
  color: ${p.text3} !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  letter-spacing: 0.01em !important;
  white-space: nowrap !important;
  box-sizing: border-box !important;
}
${scope} [data-testid='todo-panel'] button > span:nth-child(3)[data-buxu-todo-label]::after {
  content: attr(data-buxu-todo-label) !important;
  color: ${p.text} !important;
  font-weight: 600 !important;
  font-size: 11px !important;
  font-variant-numeric: tabular-nums !important;
  padding-left: 6px !important;
  line-height: 14px !important;
}
/* ④ v5：进度条已移到 section 的 background-image / box-shadow（见上方），
   这里不再有任何绝对定位伪元素 —— 上一版正是 ::before 盖住 header 文字。
   保留一条 reduced-motion 兜底：关掉背景尺寸的过渡（若将来加的话）。 */
/* ---- 展开态（2026-11-06）：标签行与第一个任务行拉开距离 ----
   官方展开时 div.body 内是 button.header + ul.list 两个子元素。
   之前 CSS 只覆盖缩起态，展开后 ul 紧贴 button → 用户反馈「太近」。
   用结构选择器 ul / li，不依赖 DXuOLW_* 哈希类名。
   ① header 底部加 10px 留白（:has(ul) 只在展开态命中）；
   ② 一条极淡分隔线把「标签行」和「任务行」分组；
   ③ ul 顶部 10px 内边距 + 首行上方额外 4px，任务行间距 8px。 */
${scope} [data-testid='todo-panel'] > div:has(ul) button {
  padding-bottom: 10px !important;
  border-radius: 0 !important;
}
${scope} [data-testid='todo-panel'] ul {
  padding: 10px 12px 4px 12px !important;
  border-top: 1px solid ${p.hairline} !important;
  margin: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  box-sizing: border-box !important;
}
${scope} [data-testid='todo-panel'] ul > li {
  min-height: 20px !important;
  line-height: 20px !important;
}
/* v5：进度条是背景层，不需要任何额外 padding，展开/缩起都自然撑开。 */
/* ---- 2026-11-09 头像预览（设置页）：由头像尺寸/圆角滑块驱动 ----
    预览 span 用 data-buxu-avatar-preview 标记，尺寸与圆角读同一份 GEO，
    与对话里的真实头像保持一致；走现有 upsertStyle 实时链路，零 React 改动。
    官方无对话头像节点（chat/conversation 包 avatar 零命中），纯插件自有功能。 */
${scope} [data-buxu-avatar-preview] {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex: none !important;
  width: ${GEO.avatarSize}px !important;
  height: ${GEO.avatarSize}px !important;
  border-radius: ${GEO.avatarR}% !important;
  font-size: 10px !important;
  color: var(--dsw-alias-label-tertiary) !important;
  border: 1px solid var(--dsw-alias-border-l2) !important;
  background-color: var(--dsw-alias-bg-layer-2) !important;
  background-size: contain !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
  box-sizing: border-box !important;
}
/* ---- 已归档 A2（2026-11-09 重设计：官方列表式，去 AI 味）----
    用户真机反馈「卡片 AI 味重、和皮肤缺一致性」。复盘问题：每行独立
    12px 圆角描边卡片（AI 生成套路）、统计大字像指标卡、英文副标题、
    强调色竖线与图标方块都是纯装饰。官方皮肤的语言是：小圆角 8px、
    细线分隔、列表行直接铺在面板上、信息靠灰阶分层、强调色极少量。
    故整段重写为「官方列表面板」：300px 宽 / 一行一条 / 细线分隔 /
    标题行只写「已归档 28 项 · 3 个工作区」/ 零装饰。
    全部 var(--dsw-*)，自动跟随四套色板与深浅色。

    入口（footer.action）与官方 sectionHeader 同构：36px 高、
    --dsh-sidebar-row-padding、--dsw-alias-label-tertiary、--dsw-radius-md。 */
${scope} [data-buxu-archive-entry] {
  height: 36px !important; flex: none !important;
  display: flex !important; align-items: center !important; justify-content: flex-end !important;
  gap: 4px !important; box-sizing: border-box !important;
  padding: 0 8px 0 var(--dsh-sidebar-row-padding, 12px) !important;
  margin: 0 0 4px 0 !important; border: 0 !important;
  border-radius: var(--dsw-radius-md, 8px) !important;
  background: transparent !important; color: ${p.text3} !important;
  font: inherit !important; font-size: 11px !important; letter-spacing: .06em !important;
  cursor: pointer !important; position: relative !important; overflow: hidden !important;
  width: 100% !important; text-align: left !important;
}
${scope} [data-buxu-archive-entry]:hover { background: ${p.hover} !important; color: ${p.text2} !important; }
${scope} [data-buxu-archive-entry].is-open::before {
  content: '' !important; position: absolute !important; left: 0 !important; top: 7px !important; bottom: 7px !important;
  width: 2px !important; border-radius: 2px !important; background: ${p.text3} !important;
}
${scope} [data-buxu-archive-entry='wide'] .buxu-archive-entry-label {
  flex: 1 !important; min-width: 0 !important; display: flex !important; align-items: center !important; gap: 7px !important;
  white-space: nowrap !important; line-height: 20px !important;
}
${scope} .buxu-archive-entry-icon { display: inline-flex !important; color: ${p.text3} !important; }
${scope} .buxu-archive-entry-count {
  font-size: 10px !important; font-variant-numeric: tabular-nums !important;
  padding: 1px 6px !important; border-radius: 8px !important;
  color: ${p.text2} !important;
  background: ${p.bg2} !important;
}
${scope} .buxu-archive-entry-chevron { width: 28px !important; height: 28px !important; display: grid !important; place-items: center !important; border-radius: var(--dsw-radius-sm, 6px) !important; color: ${p.text2} !important; font-size: 12px !important; }
${scope} [data-buxu-archive-entry='rail'] {
  width: 36px !important; height: 36px !important; padding: 0 !important; margin: 0 auto 4px !important;
  justify-content: center !important; border-radius: 50% !important;
}
${scope} [data-buxu-archive-entry='rail'].is-open { background: ${p.hover} !important; }

/* 浮层：shell.overlay 容器默认 click-through，必须自己 pointer-events:auto。
   与官方 CordisPanel 同参数：fixed / z-index 30 / 8px 圆角。
   **2026-11-09 修复「浮层偏蓝」**：旧版用 --dsw-specific-menu，
   而本主题把它覆写成 p.bg3（深色 #1C1F24，蓝灰），官方深色菜单表面
   #303136 也是蓝灰 → 浮层明显偏蓝，与黑白灰主题不一致。
   改为只用主题自己的中性灰：表面 p.card、次级 p.bg2、描边 p.panelEdge。
   四套色板自动适配（石墨得深灰 / 云白得浅灰），将来带色主题也跟着 p.* 走。
   同时去掉 ::before 的 backdrop-filter —— 纯色表面不需要，模糊反而
   会把底下的蓝灰面板透上来。 */
${scope} [data-buxu-archive-panel] {
  position: fixed !important; left: 8px !important; bottom: 96px !important;
  width: 300px !important; max-width: calc(100vw - 24px) !important; max-height: 60vh !important;
  z-index: 30 !important; isolation: isolate !important; pointer-events: auto !important;
  display: flex !important; flex-direction: column !important; overflow: hidden !important;
  border: 1px solid ${p.panelEdge} !important; border-radius: 8px !important;
  background: ${p.card} !important;
  box-shadow: 0 14px 36px rgba(0,0,0,.5) !important;
  color: ${p.text} !important;
  font: inherit !important; font-size: 12px !important;
}
${scope} [data-buxu-archive-panel]::before {
  content: '' !important; position: absolute !important; inset: 0 !important;
  border-radius: inherit !important; z-index: -1 !important; pointer-events: none !important;
  background: ${p.card} !important;
}
/* 头部：一行标题 + 计数 + 关闭，无图标盒 / 无英文副标题 / 无强调色竖线 */
${scope} .buxu-archive-head {
  height: 36px !important; flex: none !important; display: flex !important; align-items: center !important;
  gap: 8px !important; padding: 0 12px !important; box-sizing: border-box !important;
  border-bottom: 1px solid ${p.panelEdge} !important;
}
${scope} .buxu-archive-head-title { font-size: 12px !important; font-weight: 600 !important; color: ${p.text} !important; }
${scope} .buxu-archive-head-count { font-size: 10.5px !important; color: ${p.text3} !important; }
${scope} .buxu-archive-close {
  margin-left: auto !important; width: 24px !important; height: 24px !important; flex: none !important;
  border: 0 !important; border-radius: 5px !important; background: transparent !important;
  color: ${p.text3} !important; cursor: pointer !important;
  display: grid !important; place-items: center !important; font-size: 13px !important;
}
${scope} .buxu-archive-close:hover { background: ${p.hover} !important; }
/* 工具行：只留搜索框 */
${scope} .buxu-archive-tools {
  height: 32px !important; flex: none !important; display: flex !important; align-items: center !important;
  padding: 0 10px !important; box-sizing: border-box !important;
  border-bottom: 1px solid ${p.panelEdge} !important;
}
${scope} .buxu-archive-search {
  flex: 1 !important; min-width: 0 !important; height: 22px !important; box-sizing: border-box !important;
  border: 1px solid ${p.panelEdge} !important; border-radius: 5px !important;
  background: ${p.bg2} !important; color: ${p.text} !important;
  padding: 0 7px !important; font: inherit !important; font-size: 10.5px !important; outline: none !important;
}
${scope} .buxu-archive-search::placeholder { color: ${p.text3} !important; }
/* 列表：整块铺开，行靠细线分隔，不再是一张张小卡片 */
${scope} .buxu-archive-list, ${scope} .buxu-archive-skeleton, ${scope} .buxu-archive-empty {
  flex: 1 !important; min-height: 0 !important; overflow-y: auto !important;
  padding: 2px 0 !important; box-sizing: border-box !important;
}
/* 2026-11-09 分组标识重设计（方案③ + 用户补的色差）：
   去掉橙色亮灯，用「淡底色带」做本周/更早的层次，「9px 灰阶方块」做分组标记
   （本周实心 / 更早空心），数量右对齐。强调色完全不出现在分组。 */
${scope} .buxu-archive-group-label {
  display: flex !important; align-items: center !important; gap: 8px !important;
  height: 30px !important; box-sizing: border-box !important;
  padding: 0 12px !important;
  font-size: 10px !important; letter-spacing: .04em !important; color: ${p.text3} !important;
  background: color-mix(in srgb, ${p.text} 4%, transparent) !important;
}
${scope} .buxu-archive-group + ${scope} .buxu-archive-group .buxu-archive-group-label {
  border-top: 1px solid ${p.panelEdge} !important;
  background: transparent !important;
}
${scope} .buxu-archive-group-sq {
  width: 9px !important; height: 9px !important; flex: none !important;
  border-radius: 2px !important; border: 1px solid ${p.panelEdge} !important;
  background: ${p.text3} !important; box-sizing: border-box !important;
}
${scope} .buxu-archive-group-sq.is-dim { background: transparent !important; opacity: .55 !important; }
${scope} .buxu-archive-group-name { font-size: 11px !important; font-weight: 600 !important; color: ${p.text2} !important; }
${scope} .buxu-archive-group-count { margin-left: auto !important; font-size: 9.5px !important; color: ${p.text3} !important; font-variant-numeric: tabular-nums !important; }
${scope} .buxu-archive-row {
  height: 34px !important; display: flex !important; align-items: center !important; gap: 8px !important;
  padding: 0 12px !important; box-sizing: border-box !important;
  border-bottom: 1px solid ${p.panelEdge} !important; position: relative !important;
}
${scope} .buxu-archive-row:last-child { border-bottom: 0 !important; }
${scope} .buxu-archive-row:hover { background: ${p.hover} !important; }
${scope} .buxu-archive-row.is-busy { opacity: .55 !important; }
${scope} .buxu-archive-row-text { flex: 1 !important; min-width: 0 !important; display: flex !important; align-items: center !important; }
/* 2026-11-09 用户「列表字太亮，要弱化」：真机像素采样行标题接近纯白
   （p90=250），与分组名(180)/头部(212)层级倒挂。改直接用主题自己的
   中性灰变量，彻底绕开 --dsw-alias-label-* 被官方覆盖的不确定性：
     行标题 = p.text2（次级灰，明显弱化）
     时间   = p.text3 再降一档透明度
     hover  = p.text（回到较亮，交互时才清晰）
   头部标题仍用 p.text，保持面板与列表的层级差。 */
${scope} .buxu-archive-row-title {
  font-size: 11.5px !important; color: ${p.text2} !important;
  white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;
}
${scope} .buxu-archive-row:hover .buxu-archive-row-title { color: ${p.text} !important; }
${scope} .buxu-archive-row-meta { font-size: 10px !important; color: ${p.text3} !important; opacity: .8 !important; flex: none !important; }
${scope} .buxu-archive-row:hover .buxu-archive-row-meta { display: none !important; }
${scope} .buxu-archive-rename-input {
  width: 100% !important; box-sizing: border-box !important; height: 22px !important;
  border: 1px solid var(--buxu-user-accent) !important; border-radius: 4px !important;
  background: ${p.bg2} !important; color: ${p.text} !important;
  padding: 0 6px !important; font: inherit !important; font-size: 11.5px !important; outline: none !important;
}
/* 操作：默认隐藏，hover 才出；强调色只用于「恢复」 */
${scope} .buxu-archive-row-actions { display: none !important; gap: 3px !important; flex: none !important; }
${scope} .buxu-archive-row:hover .buxu-archive-row-actions, ${scope} .buxu-archive-row:focus-within .buxu-archive-row-actions { display: flex !important; }
${scope} .buxu-archive-act {
  width: 22px !important; height: 22px !important; border: 1px solid ${p.panelEdge} !important;
  border-radius: 5px !important; background: ${p.card} !important;
  color: ${p.text2} !important; cursor: pointer !important;
  display: grid !important; place-items: center !important; font-size: 10px !important; padding: 0 !important;
}
${scope} .buxu-archive-act:hover { background: ${p.hover} !important; }
${scope} .buxu-archive-act.is-primary { color: var(--buxu-user-accent) !important; border-color: color-mix(in srgb, var(--buxu-user-accent) 35%, transparent) !important; }
${scope} .buxu-archive-act:disabled { opacity: .5 !important; cursor: default !important; }
/* ⋯ 小窗：官方菜单位置，细线分隔 */
${scope} .buxu-archive-menu {
  position: absolute !important; right: 6px !important; top: 30px !important; z-index: 2 !important;
  min-width: 150px !important; padding: 4px !important; box-sizing: border-box !important;
  border: 1px solid ${p.panelEdge} !important; border-radius: 6px !important;
  background: ${p.card} !important; box-shadow: 0 8px 24px rgba(0,0,0,.45) !important;
}
${scope} .buxu-archive-menu button {
  display: block !important; width: 100% !important; text-align: left !important;
  padding: 5px 8px !important; border: 0 !important; border-radius: 4px !important;
  background: transparent !important; color: ${p.text} !important;
  font: inherit !important; font-size: 11.5px !important; cursor: pointer !important;
}
${scope} .buxu-archive-menu button:hover { background: ${p.hover} !important; }
${scope} .buxu-archive-menu-path {
  padding: 5px 8px !important; font-size: 10px !important; color: ${p.text3} !important;
  white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;
  border-top: 1px solid ${p.panelEdge} !important;
}
/* 底栏：纯文字，无装饰线 */
${scope} .buxu-archive-foot {
  height: 30px !important; flex: none !important; display: flex !important; align-items: center !important;
  justify-content: space-between !important; gap: 8px !important;
  padding: 0 12px !important; box-sizing: border-box !important;
  border-top: 1px solid ${p.panelEdge} !important;
  font-size: 10px !important; color: ${p.text3} !important;
}
/* 骨架屏：细线条，不做卡片 */
${scope} .buxu-archive-skeleton-row {
  height: 34px !important; margin: 0 12px !important;
  border-bottom: 1px solid ${p.panelEdge} !important;
  background: linear-gradient(90deg, ${p.hover} 25%, ${p.bg2} 50%, ${p.hover} 75%) !important;
  background-size: 200% 100% !important; animation: buxu-archive-shimmer 1.4s ease-in-out infinite !important;
}
@keyframes buxu-archive-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) {
${scope} .buxu-archive-skeleton-row { animation: none !important; }
}
/* 空态：纯文字，无图标盒 */
${scope} .buxu-archive-empty {
  display: flex !important; flex-direction: column !important; align-items: center !important;
  justify-content: center !important; gap: 6px !important; text-align: center !important;
}
${scope} .buxu-archive-empty-title { font-size: 12px !important; color: ${p.text2} !important; }
${scope} .buxu-archive-empty-desc { font-size: 10.5px !important; color: ${p.text3} !important; line-height: 1.7 !important; }

/* /compact 模拟阶段提示已删除（2026-11-09）：官方无真实进度源，回到官方原样。 */
/* ---- 2026-11-09 侧栏导航行密度（BEGIN）----
    依据 dsh-client-ui-sidebar README.zh.md:42/83/85 与归档 CSS 实证：
    · 官方 4 个 --dsh-sidebar-* 变量只管左右内边距/图标间距/底色内缩，
      没有一个控制纵向高度；min-height:36px 与容器 gap:2px 是硬编码。
    · 因此压缩纵向只能走「语义结构覆盖」：panellist 是唯一的 nav[aria-label]，
      其直接子元素是行 button（PanelRow / PanelMoreMenu 共用同一结构）。
    · 契约纪律：选择器不含官方内部构建产物的哈希类名（README:89 明确私有，升级会变）、
      不加权声明（官方 sidebar 包零强制覆盖，后注入 + 更高特异性即可生效）、
      不硬编码中文 aria-label（多语言）、不按面板 id/label 文本匹配（注册项动态变化）。
    · 用 html:not([data-sidebar-collapsed]) 限定展开态：折叠态几何独立保留（README:83），
      且官方在 collapsed 时把 panelList 整体 display:none，本块天然不生效。
    · GEO.rowH 由设置页「侧栏行高」滑块写入（schema 24-40，默认 30），
      applySettings → applyGeometryFromSettings → buildCss 链路已通，这里首次真正消费。
    · 官方 regionArea 是 flex:1：导航区少占多少，工作区列表自动多占多少，无需手动加高。 */
html:not([data-sidebar-collapsed]) ${scope} nav[aria-label] {
  gap: 0;
  margin-bottom: 4px;
}
html:not([data-sidebar-collapsed]) ${scope} nav[aria-label] > button {
  min-height: ${GEO.rowH}px;
  padding-top: 4px;
  padding-bottom: 4px;
  line-height: 20px;
}
/* ---- 2026-11-09 侧栏导航行密度（END）---- */

/* TNS:LAYOUT-BELOW —— 此标记之上是纯 token 层（降级模式只注入这一部分），
   之下是官方 DOM 布局改写，仅在契约探针通过时注入。 */
`
			const markAt = css.indexOf(LAYOUT_MARK)
			/* P1：plain（款式1）永远只注入 token 层 —— 这是「1 与 2 不同」的
			   根本语义，绝不能受 degradeMode / 分组探测影响。
			   （2026-11-08 真机事故：旧写法 tokenOnly && !degradeMode 在
			   降级态下让 plain 也注入了布局层，四套皮肤看起来一样。已修正。） */
			if (tokenOnly) {
				const tokenOnlyCss = markAt < 0 ? css : css.slice(0, markAt)
				return tokenOnlyCss + effortGradientCss()
			}
			/* 按组组装：token 段永远在前；每组的 probe 决定该段是否注入。
			   找不到 LAYOUT_MARK 时退化为全量注入（不丢样式）。 */
			if (markAt < 0) return css + effortGradientCss()
			const segs = splitCssGroups(css, markAt)
			let out = ''
			const disabled = []
			for (const seg of segs) {
				const g = CSS_GROUPS.find((x) => x.id === seg.id)
				if (g && !probeGroup(g)) { disabled.push(seg.id); continue }
				out += seg.text
			}
			if (disabled.length) GROUP_DISABLED = disabled
			else GROUP_DISABLED = []
			/* 进度条配色追加在末尾：无论 full/plain/降级模式都要生效。 */
			return out + effortGradientCss()
		}

		function upsertStyle(css) {
			let el = document.getElementById(STYLE_ID)
			if (!el) {
				el = document.createElement('style')
				el.id = STYLE_ID
				document.head.appendChild(el)
			}
			if (el.textContent !== css) el.textContent = css
		}

		/** 推理等级进度条渐变 CSS（按设置生成，由 buildCss 追加到同一个 style 节点）。
		    配色由 effortGradient 决定；粒子由**独立开关** effortParticles 决定，
		    任意配色都能叠加（不再绑在某套方案上）。
		    2026-11-07 用户要求：去掉光影扫光（原 ::after），只保留气泡颗粒，
		    并把速度加快（6s → 2.4s）。
		    动画只用 CSS 伪元素 / @keyframes，不新建 DOM 节点、不触发 MutationObserver。 */
		function effortGradientCss() {
			const s = settingsValue()
			const g = effortGradientById(s.effortGradient)
			const stops = activeCssStops(g, s)
			let css = '\n/* ---- 推理等级进度条配色：' + g.label + ' ---- */\n' +
				'[data-buxu-effort-fill] {\n' +
				'  background: linear-gradient(90deg, ' + stops + ') !important;\n' +
				'}\n'
			if (s.effortParticles === true) {
				css += [
					'/* 气泡颗粒：纯 CSS，去掉光影、速度加快，尊重 reduced-motion */',
					'[data-buxu-effort-fill]::before {',
					'  content: ""; position: absolute; inset: 0;',
					'  background-image:',
					'    radial-gradient(circle at 18% 70%, rgba(255,255,255,.55) 0 1.5px, transparent 2px),',
					'    radial-gradient(circle at 42% 30%, rgba(255,255,255,.45) 0 1px, transparent 1.8px),',
					'    radial-gradient(circle at 68% 65%, rgba(255,255,255,.5) 0 1.5px, transparent 2px),',
					'    radial-gradient(circle at 86% 35%, rgba(255,255,255,.4) 0 1px, transparent 1.8px);',
					'  background-size: 60px 100%, 46px 100%, 72px 100%, 54px 100%;',
					'  animation: buxu-bubbles 2.4s linear infinite;',
					'  pointer-events: none;',
					'}',
					'@keyframes buxu-bubbles { from { background-position: 0 0, 0 0, 0 0, 0 0; } to { background-position: 60px 0, 46px 0, 72px 0, 54px 0; } }',
					'@media (prefers-reduced-motion: reduce) {',
					'  [data-buxu-effort-fill]::before { animation: none; }',
					'}'
				].join('\n') + '\n'
			}
			return css
		}

		/**
		 * 总开关「关闭」时彻底卸载主题（2026-11-06）。
		 * 目标：界面回到 DSH 官方原生皮肤，零残留。
		 * 清理范围（与插件所有注入点一一对应）：
		 *   ① 我们注入的 style 节点
		 *   ② applyColorMode 对 body 属性方法的拦截（必须还原，否则官方
		 *      深浅切换被永久劫持）
		 *   ③ html 上的 ROOT_ATTR、colorScheme、data-ds-theme-source
		 *   ④ body 上的 avatars 属性
		 *   ⑤ 所有 [data-tn-avatar] 真实节点
		 *   ⑥ 设置页/弹窗注入的 --buxu-* CSS 变量（挂在行元素上，随节点走，
		 *      但 style 节点移除后这些内联变量已无对应规则，无需单独清）
		 * 不移除官方 DOM、不触碰 React 组件 —— 只是把「我们加的」全部撤掉。
		 */
		function teardownTheme() {
			try {
				const el = document.getElementById(STYLE_ID)
				if (el && el.parentNode) el.parentNode.removeChild(el)
			} catch (e) { /* 忽略 */ }

			try {
				if (typeof darkOverrideRestore === 'function') darkOverrideRestore()
				darkOverrideRestore = null
			} catch (e) { /* 忽略 */ }
			/* **统一回滚所有行内样式/属性**：--tn-sidebar-w / --tn-center-right /
			   color-scheme / ROOT_ATTR / data-ds-theme-source / avatars 属性 /
			   TARGET_VAR / 官方行容器的 position:relative /
			   todo 与 effort 的 --buxu-* 变量与 data-* 属性，全部按登记清掉。
			   这一步是「完全回到原生结构」的关键 —— 只删 <style> 不够。 */
			buxuRollbackInline()
			try {
				document.querySelectorAll('[data-tn-avatar][data-buxu-owned="1"]').forEach((n) => n.remove())
			} catch (e) { /* 忽略 */ }
			try {
				for (const slider of document.querySelectorAll('[data-buxu-effort-slider]')) slider.remove()
			} catch (e) { /* 忽略 */ }
		}

		/** 头像扫描入口，由 avatars effect 注册；applyThemeTokens 重绘时也会调。
		   为什么需要：effect 的 cleanup 会删光所有头像节点，若 cordis 只跑 cleanup
		   不重跑 effect（切会话/槽位重挂载），节点就永久没了 —— 光靠 body 属性自愈
		   只能救 CSS，救不了 DOM。暴露这个入口让每次主题重绘都主动补一次。 */
		let avatarsRescan = null

		/* ---------------------------------------------------------------
		 * 契约探针 + 安全降级（2026-11-05，应对 DSH 后续升级）
		 *
		 * 主题对官方 DOM 做了布局级改写（工具行 fixed、header 压平、右栏留白、
		 * 页签盒模型）。这些依赖的类名/属性一旦随版本变化，改写就会落到错误位置，
		 * 把界面搞得比官方默认还糟。
		 * 因此启动时探测几个关键契约；缺失比例过高就降级为「只注入 token 层」
		 * —— 纯换色永远安全，布局改写只在确认契约齐全时才启用。
		 *
		 * 探针只读 DOM，不写任何东西；失败一律静默降级，绝不抛错。
		 * --------------------------------------------------------------- */
		const CONTRACTS = [
			{ name: 'frame', sel: "[class*='frame']:has([class*='centerCol'])" },
			{ name: 'centerCol', sel: "[class*='centerCol']" },
			{ name: 'sidebarCol', sel: "[class*='sidebarCol']" },
			{ name: 'sessionHeader', sel: "[data-slot='conversation.session.header']" },
			{ name: 'titleRow', sel: "[data-slot='conversation.session.header'] [class*='titleRow']" },
			{ name: 'composerCard', sel: "[data-composer-card]" },
			{ name: 'rightPanel', sel: "[data-sidebar-right-panel]" },
			{ name: 'chatFlow', sel: "[data-slot='conversation.chat.flow']" }
		]

		/* 返回缺失的契约名数组；全部在位返回空数组。
		   探针有等待窗口：DSH 首帧渲染是渐进的，刚 apply 时 DOM 还没齐。 */
		function probeContracts() {
			const missing = []
			for (const c of CONTRACTS) {
				try { if (!document.querySelector(c.sel)) missing.push(c.name) } catch (e) { missing.push(c.name) }
			}
			return missing
		}

		/* 会话视图是否在场（2026-11-08 修复「设置页里款式2 退化成款式1」）。
		   降级探针的用途是「DSH 升级改了官方 DOM 结构」，不是「当前没打开会话」。
		   打开设置页 / 空白页 / 首帧未渲染时，官方会话视图会被卸载，
		   frame/centerCol/titleRow/composerCard/chatFlow 等契约节点全都不存在，
		   旧实现会把这误判成结构变化 → degradeMode=true → 强制 tokenOnly，
		   于是精修布局（款式2）被裁掉，看起来和款式1 一样。
		   这里用会话流的稳定属性做门槛：视图不在场就跳过判定、保持上次状态，
		   不重绘、不改 degradeMode。回到会话页（DOM 齐备）后仍会正常恢复。 */
		function conversationViewPresent() {
			try {
				return !!(document.querySelector("[data-slot='conversation.chat.flow']") ||
					document.querySelector("[data-composer-card]") ||
					document.querySelector("[class*='centerCol']"))
			} catch (e) { return false }
		}

		/* 降级判定：缺 2 个以上关键契约就认为官方结构已变。
		   单个缺失可能只是当前视图没渲染（比如右栏没开时 rightPanel 不挂载），
		   两个以上同时缺失才说明是结构性问题。
		   **用户可以在设置里关掉 contractGuard**（2026-11-05 接通）：
		   关 = 不做降级，永远用完整布局（官方 DOM 真变了会看起来怪，
		   但不会被自动降级「保护」住；给高级用户自己判断的权力）。 */
		function shouldDegrade(missing) {
			const s = settingsValue()
			if (s.contractGuard === false) return false
			const structural = missing.filter((n) => n !== 'rightPanel')
			return structural.length >= 2
		}

		/* 延迟契约判定：官方 React 渲染是渐进的，插件激活瞬间 DOM 还不存在。
		   两次探测（900ms / 2200ms），**只要有一次通过就恢复到完整模式** ——
		   降级是安全兜底，不该是单向不可逆的判决。 */
		let contractTimer = null
		let contractObserver = null
		let contractCheckFrame = null
		let contractLastMissing = null
		function scheduleContractCheck() {
			if (contractTimer) return
			contractTimer = true
			const check = (final) => {
				/* 会话视图不在场（设置页/空白页/首帧）时不做判定：
				   契约缺的是「当前没渲染」，不是「官方结构变了」。保持上次状态。 */
				if (!conversationViewPresent()) return
				/* P1：逐组重判，不再用全局 degrade 一刀切砍 CSS。
				   只有「启用状态发生变化」才重绘，避免每次 DOM 变化都重建 style。 */
				const before = (GROUP_DISABLED || []).slice().sort().join(',')
				const disabled = []
				for (const g of CSS_GROUPS) {
					if (g.always || !g.probe) continue
					if (!probeGroup(g)) disabled.push(g.id)
				}
				const after = disabled.slice().sort().join(',')
				GROUP_DISABLED = disabled
				/* degradeMode 现在只表示「是否有任意组被禁用」，供 JS 几何同步参考；
				   不再参与 tokenOnly 判定（见 applyThemeTokens）。 */
				const anyDisabled = disabled.length > 0
				const changed = before !== after || anyDisabled !== !!degradeMode
				degradeMode = anyDisabled
				/* P1-5：合并式更新状态字段，不再整块覆盖 —— 解决
				   syncFormStatus() 把 degraded 冲掉导致提示闪一下就消失的问题。 */
				buxuFormStatus = Object.assign({}, configStatus(), {
					degraded: anyDisabled,
					degradeMessage: anyDisabled
						? '兼容模式：以下功能组因官方界面结构变化暂时跳过：' + disabled.join('、') + '。其余功能照常生效。'
						: null,
					disabledGroups: disabled.slice()
				})
				if (changed) {
					applyThemeTokens('contract:' + (anyDisabled ? 'group-degrade' : 'restore'))
				} else if (anyDisabled && final) {
					console.warn('[dsh-theme-buxu] 以下功能组的官方锚点仍缺失：' + disabled.join(', '))
				}
			}
			setTimeout(() => check(false), 900)
			setTimeout(() => check(true), 2200)
			if (typeof MutationObserver !== 'undefined' && document.body && !contractObserver) {
				contractObserver = new MutationObserver(() => {
					if (contractCheckFrame !== null) cancelAnimationFrame(contractCheckFrame)
					contractCheckFrame = requestAnimationFrame(() => {
						contractCheckFrame = null
						check(false)
					})
				})
				contractObserver.observe(document.body, { childList: true, subtree: true })
			}
		}
		function disposeContractCheck() {
			if (contractObserver) { contractObserver.disconnect(); contractObserver = null }
			if (contractCheckFrame !== null) { cancelAnimationFrame(contractCheckFrame); contractCheckFrame = null }
			contractTimer = null
		}

		/* 主题色变化时重绘 CSS，并同步根属性 */
		/* ================================================================
		 * 外观模式 => 强制深浅色（2026-11-05 接通 colorMode）
		 *
		 * 背景：官方 `ui-layout` 的 ThemePresenter 每次 theme/change 都会写
		 * `body[data-ds-dark-theme]`（有=深色，无=浅色），而 `ctx.theme`
		 * 只有 getTheme()/theme-change 事件，**没有 setter**。
		 * 所以「强制深色/浅色」只能在官方写完后再覆盖它。
		 *
		 * 做法：接管 body 上那三个属性方法（set/remove/has）——
		 *   这正是 ThemePresenter 用的 API，拦截是**同步**的，
		 *   不会出现「先闪一下浅色再变深色」。
		 * 用 MutationObserver 做不到这点（回调异步，必然闪）。
		 *
		 * system 模式下完全还原原生方法并返回 null，之后一切交还官方。
		 * ================================================================ */
		let darkOverrideRestore = null
		/* **原生方法只捕获一次，永不重新捕获**（2026-11-05 严重 bug 修复）：
		   原实现每次进 applyColorMode 都从 body 上抓一次 setAttribute，
		   但那时 body.setAttribute 可能已经是**上一轮包装过的版本**。
		   于是 orig.set 套 orig.set 套 ... 层层嵌套，
		   多切几次深浅色后调用栈深到爆栈（Maximum call stack size exceeded），
		   body 的属性写入链被彻底破坏 → data-dsh-theme-buxu-avatars 写不进去
		   → 头像 CSS 全部失效 → 两个头像都消失。
		   因此这里在模块加载时抓一次「真正的原生方法」，之后永远复用。 */
		const BODY_NATIVE = { captured: null, owner: null }
		function bodyNative() {
			const body = document.body
			if (!body) return null
			/* body 被替换（极少见，但 SPA 重挂载时可能）→ 重新抓一次，
			   用 owner 判定，避免把「包装过的版本」当成原生方法。 */
			if (BODY_NATIVE.captured && BODY_NATIVE.owner === body) return BODY_NATIVE.captured
			BODY_NATIVE.owner = body
			BODY_NATIVE.captured = {
				set: body.setAttribute.bind(body),
				remove: body.removeAttribute.bind(body),
				has: body.hasAttribute.bind(body)
			}
			return BODY_NATIVE.captured
		}

		/**
		 * 强制深浅色（2026-11-05 改为由选中色板的 scheme 驱动）。
		 * @param {boolean} wantDark true=深色 false=浅色
		 */
		function applyColorMode(wantDark) {
			/* 先撤回上一轮接管（换色板时都要还原一次） */
			if (darkOverrideRestore) {
				try { darkOverrideRestore() } catch (e) { /* 忽略 */ }
				darkOverrideRestore = null
			}
			const body = document.body
			if (!body) return null

			const KEY = 'data-ds-dark-theme'
			/* **用缓存的真·原生方法**，不要在这里重新从 body 上抓 */
			const orig = bodyNative()
			if (!orig) return null
			const isKey = (name) => String(name).toLowerCase() === KEY

			body.setAttribute = function (name, value) {
				if (isKey(name)) return orig.set(name, wantDark ? '' : value)
				return orig.set(name, value)
			}
			body.removeAttribute = function (name) {
				if (isKey(name) && wantDark) return orig.set(KEY, '')
				return orig.remove(name)
			}
			body.hasAttribute = function (name) {
				if (isKey(name)) return wantDark
				return orig.has(name)
			}
			darkOverrideRestore = () => {
				try {
					body.setAttribute = orig.set
					body.removeAttribute = orig.remove
					body.hasAttribute = orig.has
					if (wantDark) orig.set(KEY, '')
					else orig.remove(KEY)
				} catch (e) { /* 忽略 */ }
			}

			/* 立刻生效，不等下一次 theme/change */
			try {
				const real = orig.has(KEY)
				if (wantDark && !real) orig.set(KEY, '')
				else if (!wantDark && real) orig.remove(KEY)
				/* 同步 color-scheme 与来源属性：否则原生滚动条、表单控件、
				   Electron 标题栏仍是旧的深浅色 */
				buxuSetStyle(document.documentElement, 'color-scheme', wantDark ? 'dark' : 'light')
				buxuSetAttr(document.documentElement, 'data-ds-theme-source', wantDark ? 'dark' : 'light')
			} catch (e) { /* 忽略 */ }
			return wantDark
		}

		/* 主题色变化时重绘 CSS，并同步根属性 */
		function applyThemeTokens(where) {
			if (!document.body) return
			/* 重绘探针：记录每次重绘的 palette/深浅/降级/布局形态与入口来源。
			   探针只读状态、不干预任何行为；定位后删除。 */
			/* **总开关（2026-11-06）**：enabled=false 时彻底卸载，
			   界面回到 DSH 官方原生皮肤。每次重绘都先判，保证
			   切会话 / configForms 回调 / 系统深浅变化都不会把主题偷偷加回来。 */
			if (settingsValue().enabled === false) {
				teardownTheme()
				return
			}
			/* **2026-11-05 合并交互**：删掉独立的「外观模式」后，
			   深浅完全由**选中的色板**决定 —— 色板自带 scheme，
			   选石墨1/石墨2 就是深色，选云白1/云白2 就是浅色。
			   不再跟随系统、也不再有独立的 colorMode 字段。 */
			const cfg = settingsValue()
			const wanted = hasPalette(cfg.palette) ? PALETTES[cfg.palette] : PALETTES[DEFAULT_PALETTE_ID]
			applyColorMode(wanted.scheme === 'dark')
			const dark = document.body.hasAttribute('data-ds-dark-theme')
			/* **探针时机（2026-11-05 升级实测教训）**：applyThemeTokens 首次被调用时
			   React 还没渲染出界面，此刻探测必然读到空 DOM → 误判降级并被永久缓存，
			   升级后主题直接退回官方布局。
			   改为：首次用「宽松判定」立即上色（先保证有主题配色），
			   900ms/2200ms 后官方 DOM 就绪再正式判定，且**允许从降级恢复到完整模式**。 */
			if (degradeMode === null) {
				degradeMode = false
				scheduleContractCheck()
			} else if (settingsValue().contractGuard === false && degradeMode) {
				/* 用户主动关掉兼容性开关 = 明确要求「永远用完整布局」。
				   直接解除降级并停掉探针；不再 scheduleContractCheck()，
				   否则下一次探测又会把 degradeMode 判回 true（旧实现的循环）。 */
				degradeMode = false
				disposeContractCheck()
				buxuFormStatus = Object.assign({}, configStatus(), {
					degraded: false,
					degradeMessage: null
				})
			}
			const chosen = wanted
			activePaletteId = chosen.id
			/* 通知徽标刷新文案与色块（切换配色后立即生效，不等 React 重挂载） */
			badgeEmit()
			const colors = colorize(chosen.colors, settingsValue())
			/* 色板的 layout 字段决定布局形态：
			     'full'  = 完整布局改写（一体化工具行、6px 留边、描边）
			     'plain' = 只注入 token 层，保留官方默认的大圆角与铺满观感
			   降级时（degradeMode）也强制只出 token 层，保证安全。
			   云白1 / 石墨1 就是 layout:'plain' 的正式方案。 */
			/* P1：降级不再等于「砍掉整个布局层」。plain 皮肤仍只出 token 层；
			   degradeMode 时 buildCss 走按组门控，只跳过 probe 失败的组。 */
			const tokenOnly = chosen.layout === 'plain'
			/* 第 4 个参数传色板原生 accent：buildCss 用它喂所有可能被
			   框架大面积消费的 token，用户 accent 只走局部白名单。 */
			upsertStyle(buildCss(colors, dark, tokenOnly, chosen.colors.accent))
			/* 进度条配色已由 buildCss 追加进同一个 style 节点，无需独立节点。 */
			buxuSetAttr(document.documentElement, ROOT_ATTR, chosen.id)
			/* 头像开关写进 body 属性：CSS 靠它决定要不要留出头像位置。
			   为什么写 body 而不是 html：见 buildCss 里那段选择器注释
			   （scope 已含 html/body，前缀属性必须挂在 scope 的末端节点上）。
			   为什么不用 :has([data-tn-avatar])：关掉头像时节点已被移除，
			   永远匹配不到，留白就清不掉了。 */
			buxuSetAttr(document.body, 'data-dsh-theme-buxu-avatars', GEO.avatarsOn ? 'on' : 'off')
			/* 每次主题重绘都主动补一次头像节点。
			   拖滑块 / 切配色 / 切深浅都会走到这里；若 avatars effect 曾被
			   cleanup（节点删光且 observer 断开），这次重扫能把节点补回来。
			   用异步调度避免与当前渲染帧抢 DOM。 */
			if (typeof avatarsRescan === 'function') {
				try { avatarsRescan() } catch (e) { /* 忽略 */ }
			}
			if (!degradeMode) {
				syncSidebarWidth()
				syncCenterRight()
			}
		}

		let degradeMode = null
		const DEFAULT_SIDEBAR_WIDTH = GEO.sidebarW

		/* ---------------------------------------------------------------
		 * 侧栏宽度同步
		 *
		 * 官方 frame 会实时写 --dsh-windows-sidebar-width；优先消费它。
		 * 旧版无该变量时，ResizeObserver 读 sidebarCol 写 --tn-sidebar-w 兜底。
		 * 侧栏可拖宽，不能把某个宽度写死到标题栏位置计算里。
		 * --------------------------------------------------------------- */
		let sidebarObserver = null
		function syncSidebarWidth() {
			const col = document.querySelector("[class*='sidebarCol']")
			const root = document.documentElement
			if (!col) {
				buxuSetStyle(root, '--tn-sidebar-w', DEFAULT_SIDEBAR_WIDTH + 'px')
				return
			}
			const apply = () => {
				if (!themeEnabled()) return
				const w = Math.round(col.getBoundingClientRect().width)
				buxuSetStyle(root, '--tn-sidebar-w', (w || DEFAULT_SIDEBAR_WIDTH) + 'px')
			}
			apply()
			if (typeof ResizeObserver !== 'undefined' && !sidebarObserver) {
				sidebarObserver = new ResizeObserver(apply)
				sidebarObserver.observe(col)
			}
		}

		/* ---------------------------------------------------------------
		 * centerCol 右缘同步（titleRow 用，2026-11-04）
		 *
		 * titleRow 是 fixed 定位，右栏打开时不能横跨到右栏上（按钮叠在
		 * 右栏顶条上）。右栏宽度官方无 CSS 变量 —— ResizeObserver 观测
		 * centerCol，把右缘 x 写进 --tn-center-right；titleRow 的 right
		 * 用 calc(100vw - var(--tn-center-right) + 7px) 收进。
		 * 右栏开合 = centerCol 宽度变化，ResizeObserver 天然覆盖；
		 * 窗口缩放同理由（宽度不变则右缘不变，right 用 100vw 相对量自动跟随）。
		 * --------------------------------------------------------------- */
		let centerObserver = null
		function syncCenterRight() {
			const col = document.querySelector("[class*='centerCol']")
			const root = document.documentElement
			if (!col) return
			const frame = document.querySelector("[class*='frame']:has([class*='centerCol'])")
			const apply = () => {
				const r = Math.round(col.getBoundingClientRect().right)
				if (r > 0) buxuSetStyle(root, '--tn-center-right', r + 'px')
			}
			apply()
			/* 启动初期官方布局动画（右栏收起态的 0 宽列动画、侧栏宽度恢复）会让
			   首次读数偏小（实测 1279，稳定后 1282，titleRow 右缘缩进 3px）。
			   启动后 400ms/1200ms 各补测一次；ResizeObserver 覆盖后续变化。 */
			setTimeout(apply, 400)
			setTimeout(apply, 1200)
			if (typeof ResizeObserver !== 'undefined' && !centerObserver) {
				/* **2026-11-06 修复「右栏开合不丝滑」**：
				   官方对 frame[data-animating] 做 grid-template-columns 过渡
				   （--ds-transition-duration-slow，约 600ms），动画期间
				   centerCol 宽度逐帧变化 → ResizeObserver 每帧回调 →
				   每帧 getBoundingClientRect()（强制 layout）+ 写 CSS 变量
				   （触发 fixed titleRow 重算样式）= layout thrashing。
				   这正是「掉帧/顿挫」的主因。

				   修法：动画期间**只记录、不逐帧写**；等官方 transitionend
				   （或 600ms 兜底）后一次性 apply()。动画全程只有一次
				   强制布局，titleRow 在动画期间保持不动 —— 它本来就不该
				   跟着逐帧抖，官方动画结束再对齐即可。
				   frame 上 data-animating 由官方 React 挂载/移除，只读不写。 */
				let animating = false
				let settleTimer = null
				const onEnd = (e) => {
					if (e && e.target !== frame) return
					if (e && e.propertyName && e.propertyName !== 'grid-template-columns') return
					animating = false
					if (settleTimer) { clearTimeout(settleTimer); settleTimer = null }
					apply()
				}
				if (frame) {
					frame.addEventListener('transitionend', onEnd)
					/* 官方自己也有 600ms 兜底 settle，我们对齐这个量级 */
				}
				centerObserver = new ResizeObserver(() => {
					const now = !!(frame && frame.hasAttribute('data-animating'))
					if (now) {
						if (!animating) {
							animating = true
							/* 兜底：万一 transitionend 没来（被 reduce-motion 关掉等），
							   700ms 后强制对齐，避免 titleRow 永久错位 */
							settleTimer = setTimeout(() => {
								animating = false
								settleTimer = null
								apply()
							}, 700)
						}
						return
					}
					if (animating) return
					apply()
				})
				centerObserver.observe(col)
			}
		}

		/* ---------------------------------------------------------------
		 * 头部徽标组件（slots React 组件）
		 *
		 * 挂在 conversation.session.header.utilities —— 读源码确认它是
		 * 普通 renderSlot（不带 only 限制），可以叠加多个注册，
		 * 不像 conversation.chat.user.content 那样是 factory 单占位。
		 *
		 * 组件只渲染自己的元素，不碰宿主节点（practices.md:36）。
		 * React 来自浏览器模块表，用 require('react')，不额外安装。
		 * --------------------------------------------------------------- */
		const React = require('react')
		const h = React.createElement

		/* react-dom 只用于 createPortal（把换肤弹窗挂到 body，绕开工具行的
		   overflow / max-height / z-index 层叠困住）。官方包大量使用同一入口
		   （dsh-client-ui-conversation / -chat / -model-selection 等都 require
		   "react-dom" 后调 react_dom.createPortal），属于官方机制不是 hack。
		   拿不到时降级为内联渲染，插件其余功能不受影响。 */
		const ReactDOM2 = (() => {
			try { return require('react-dom') } catch (e) { return null }
		})()

		/** 有 createPortal 就 portal；否则原样返回（离线测试桩 / 老宿主）。 */
		function toBodyPortal(node) {
			if (ReactDOM2 && typeof ReactDOM2.createPortal === 'function' && document.body) {
				try { return ReactDOM2.createPortal(node, document.body) } catch (e) { /* 降级 */ }
			}
			return node
		}

		/* **必须定义在模块级**（2026-11-05 修复白屏）：
		   设置页组件 BuxuSettingsPage / PalettePreview / ChoiceCard 等都是
		   模块级函数，但原先 React2/h2 定义在 apply() 内部，
		   渲染时抛 ReferenceError: React2 is not defined → 设置页空白。
		   这里提到模块级，所有组件都能看到。 */
		const React2 = React
		const h2 = React2.createElement

		/* 头像相关工具（全部模块级，2026-11-05 从 apply 内提出）：
		   AvatarRow / BuxuSettingsPage 会引用这些，
		   留在 apply() 里会导致 ReferenceError → 设置页白屏。 */
		const AVATAR_KEY = (kind) => 'dsh-theme-buxu.avatar.' + kind

		/** Host 配置是头像的唯一事实源；旧 localStorage 只做一次性迁移，不能复活已清空头像。 */
		const AVATAR_DATA_RE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
		function validAvatarData(url) {
			return typeof url === 'string' && url.length <= 512 * 1024 && AVATAR_DATA_RE.test(url)
		}
		function readAvatar(kind) {
			const s = settingsValue()
			const field = kind === 'assistant' ? 'assistantAvatar' : 'userAvatar'
			const fromConfig = s[field]
			if (configStatus().status === 'ready' || typeof fromConfig === 'string') {
				return validAvatarData(fromConfig) ? fromConfig : null
			}
			try {
				const legacy = window.localStorage.getItem(AVATAR_KEY(kind))
				return validAvatarData(legacy) ? legacy : null
			} catch (e) { return null }
		}
		function clearLegacyAvatar(kind) {
			try { window.localStorage.removeItem(AVATAR_KEY(kind)) } catch (e) { /* 降级存储不可用时忽略 */ }
		}
		function persistAvatar(kind, url) {
			const field = kind === 'assistant' ? 'assistantAvatar' : 'userAvatar'
			if (!configWritable()) return Promise.resolve({ ok: false, unavailable: true })
			return persistSettings({ [field]: url || '' }, 'avatar:' + kind).then((result) => {
				if (result.ok) clearLegacyAvatar(kind)
				return result
			})
		}

		function applyAvatarOverrides() {
			for (const kind of ['assistant', 'user']) {
				const url = readAvatar(kind)
				const nodes = document.querySelectorAll('[data-tn-avatar="' + kind + '"]')
				for (const el of nodes) {
					try {
						if (url) el.style.setProperty('background-image', 'url("' + url + '")', 'important')
						else el.style.removeProperty('background-image')
					} catch (e) { /* 忽略 */ }
				}
			}
		}

		const AVATAR_MAX_FILE_BYTES = 8 * 1024 * 1024
		const AVATAR_MAX_PIXELS = 16 * 1024 * 1024
		const AVATAR_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
		/* ---- 2026-11-09 头像上传改为「先裁剪再保存」----
		   readAvatarSource：只做文件校验 + 解码，把原图 Image 交给裁剪器；
		   renderCroppedAvatar：确认后按用户拖动的偏移裁出 128×128 正方形 PNG。
		   存储的仍是 128×128 dataURL —— AVATAR_DATA 校验 / persistAvatar /
		   applyAvatarOverrides / config schema 全部不动，零新增字段。 */
		function readAvatarSource(file, done, token) {
			let finished = false
			let reader = null
			let img = null
			const finish = (image, error) => {
				if (finished) return
				finished = true
				try { if (reader) reader.onload = reader.onerror = null } catch (e) {}
				try { if (img) img.onload = img.onerror = null } catch (e) {}
				done(image, error, token)
			}
			try {
				if (!file || !AVATAR_MIME_TYPES.has(file.type)) {
					finish(null, '仅支持 PNG、JPEG、WebP 静态图片。')
					return
				}
				if (file.size <= 0 || file.size > AVATAR_MAX_FILE_BYTES) {
					finish(null, '图片需大于 0 且不超过 8 MB。')
					return
				}
				reader = new FileReader()
				reader.onload = () => {
					try {
						img = new Image()
						img.onload = () => {
							try {
								if (!(img.naturalWidth > 0 && img.naturalHeight > 0) || img.naturalWidth * img.naturalHeight > AVATAR_MAX_PIXELS) {
									finish(null, '图片尺寸无效或超过 1600 万像素。')
									return
								}
								finish(img, null)
							} catch (e) { finish(null, '图片解码失败，请换一张图片。') }
						}
						img.onerror = () => finish(null, '图片内容无法解码，请确认文件没有损坏。')
						img.src = String(reader.result)
					} catch (e) { finish(null, '图片读取失败，请重试。') }
				}
				reader.onerror = () => finish(null, '图片读取失败，请重试。')
				reader.readAsDataURL(file)
			} catch (e) { finish(null, '图片读取失败，请重试。') }
			return () => {
				try { if (reader && !finished && typeof reader.abort === 'function') reader.abort() } catch (e) {}
				finished = true
			}
		}

		/* 2026-11-09 加缩放：zoom 是相对 cover 的倍数，范围 [1, AVATAR_ZOOM_MAX]。
		   zoom=1 就是 cover（刚好铺满正方形）；>1 放大后仍保证 w/h >= S，
		   因此**任何缩放档都永不露白** —— 这是上一轮定下的硬约束，不因加缩放破坏。
		   预览与导出共用 avatarCropGeometry，避免两处算出不同结果。 */
		const AVATAR_ZOOM_MAX = 3
		function avatarCropGeometry(img, S, zoom) {
			const z = Math.min(AVATAR_ZOOM_MAX, Math.max(1, Number(zoom) || 1))
			const r = Math.max(S / img.naturalWidth, S / img.naturalHeight) * z
			const w = Math.max(S, Math.round(img.naturalWidth * r))
			const h = Math.max(S, Math.round(img.naturalHeight * r))
			return { w: w, h: h, minX: S - w, minY: S - h, zoom: z }
		}
		function clampAvatarOffset(off, geo) {
			return {
				x: Math.min(0, Math.max(geo.minX, off.x)),
				y: Math.min(0, Math.max(geo.minY, off.y))
			}
		}
		/** 任意锚点缩放：让视口内 (anchorU, anchorV) 比例处盯着同一块图片内容。
		    anchorU/V 取 0..1（0.5/0.5 = 中心，滑块用；鼠标位置 = 滚轮用）。
		    在【输出坐标系】(边长 S) 里推导：
		      锚点对应的图片绝对坐标 c = anchorU*S - off.x
		      缩放后该点应保持不动 → newOff = anchorU*S - c*(newW/oldW)
		                                = ax - (ax - off.x)*(newW/oldW)
		    最后按新几何钳制，保证不露白。 */
		function zoomAvatarAt(off, oldGeo, newGeo, anchorU, anchorV, S) {
			const ax = anchorU * S, ay = anchorV * S
			return clampAvatarOffset({
				x: ax - (ax - off.x) * (newGeo.w / oldGeo.w),
				y: ay - (ay - off.y) * (newGeo.h / oldGeo.h)
			}, newGeo)
		}

		/** 按当前偏移与缩放裁出 128×128 PNG；失败返回 null。 */
		function renderCroppedAvatar(img, off, zoom) {
			try {
				const S = 128
				const cv = document.createElement('canvas')
				cv.width = S
				cv.height = S
				const g = cv.getContext('2d')
				if (!g) return null
				const geo = avatarCropGeometry(img, S, zoom)
				const o = clampAvatarOffset(off, geo)
				g.clearRect(0, 0, S, S)
				g.drawImage(img, o.x, o.y, geo.w, geo.h)
				return cv.toDataURL('image/png')
			} catch (e) { return null }
		}

		/* ---- 2026-11-09 头像裁剪器（拖动 + 滑块/滚轮缩放 / cover 铺满 / 弹窗）----
		   用户选图后可拖动定位、用滑块或鼠标滚轮放大缩小（1~3 倍，最小 = cover），
		   滚轮以鼠标位置为锚。确认才导出 128×128 PNG 写入 config。
		   任何缩放档都保证 w/h >= S，正方形永远铺满、不会留白。
		   偏移钳制在 [S-w, 0] / [S-h, 0]。纯插件自有 UI，不碰官方 DOM/几何契约。 */
		const AVATAR_CROP_VIEW = 240   // 弹窗里视口的显示边长（视觉放大便于拖动）
		const AVATAR_CROP_OUT = 128    // 导出的正方形边长（与既有存储一致）
		function AvatarCropper(props) {
			const img = props.image
			const [offset, setOffset] = React2.useState({ x: 0, y: 0 })
			const [zoom, setZoom] = React2.useState(1)
			const dragRef = React2.useRef(null)
			const canvasRef = React2.useRef(null)
			const viewportRef = React2.useRef(null)
			/* 原生 wheel 监听在挂载时注册，闭包会拿到旧 state；用 ref 镜像最新值 */
			const stateRef = React2.useRef({ offset: { x: 0, y: 0 }, zoom: 1 })
			/* 几何按「输出尺寸」算，绘制时再等比放大到显示尺寸；zoom 参与 w/h */
			const geo = avatarCropGeometry(img, AVATAR_CROP_OUT, zoom)
			stateRef.current = { offset: offset, zoom: zoom }
			const scale = AVATAR_CROP_VIEW / AVATAR_CROP_OUT
			const drawW = geo.w * scale, drawH = geo.h * scale

			/* 初始居中：cover 后把多出的部分两边均分。
			   offset 是【输出尺寸】坐标系（128），必须用 geo.minX/Y；
			   若误用显示尺寸（240）的偏移量，宽图初始会偏到边界。
			   只在换图时重置，缩放引起的几何变化由 onZoom 单独处理。 */
			React2.useEffect(() => {
				setZoom(1)
				const g = avatarCropGeometry(img, AVATAR_CROP_OUT, 1)
				const o = { x: g.minX / 2, y: g.minY / 2 }
				setOffset(o)
				stateRef.current = { offset: o, zoom: 1 }
			}, [img])

			/* offset / zoom 变化都重绘 canvas（显示尺寸），与导出的 128 版同源 */
			React2.useEffect(() => {
				const cv = canvasRef.current
				if (!cv) return
				try {
					const g = cv.getContext('2d')
					if (!g) return
					g.clearRect(0, 0, AVATAR_CROP_VIEW, AVATAR_CROP_VIEW)
					g.drawImage(img, offset.x * scale, offset.y * scale, drawW, drawH)
				} catch (e) { /* 画布不可用时忽略预览，导出仍可用 */ }
			}, [offset.x, offset.y, zoom])

			const onDown = (e) => {
				try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) {}
				dragRef.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y }
			}
			const onMove = (e) => {
				const d = dragRef.current
				if (!d) return
				/* 显示坐标 → 输出坐标（除以 scale）；geo 已含当前 zoom */
				const nx = d.ox + (e.clientX - d.px) / scale
				const ny = d.oy + (e.clientY - d.py) / scale
				setOffset({
					x: Math.min(0, Math.max(geo.minX, nx)),
					y: Math.min(0, Math.max(geo.minY, ny))
				})
			}
			const onUp = () => { dragRef.current = null }

			/* 统一缩放入口：anchorU/V 为锚点比例（滑块用中心 0.5，滚轮用鼠标位置）。 */
			const applyZoom = (next, anchorU, anchorV) => {
				const cur = stateRef.current
				const oldGeo = avatarCropGeometry(img, AVATAR_CROP_OUT, cur.zoom)
				const newGeo = avatarCropGeometry(img, AVATAR_CROP_OUT, next)
				if (newGeo.zoom === cur.zoom) return
				const no = zoomAvatarAt(cur.offset, oldGeo, newGeo, anchorU, anchorV, AVATAR_CROP_OUT)
				stateRef.current = { offset: no, zoom: newGeo.zoom }
				setOffset(no)
				setZoom(newGeo.zoom)
			}
			/* 滑块：中心锚 */
			const onZoom = (e) => applyZoom(Number(e.target.value), 0.5, 0.5)

			/* 鼠标滚轮：以指针位置为锚放大缩小。
			   React 的 onWheel 在 React 17+ 是被动监听，preventDefault 无效，
			   必须用原生 addEventListener(passive:false) 才能阻止背景页面滚动。 */
			React2.useEffect(() => {
				const vp = viewportRef.current
				if (!vp || typeof vp.addEventListener !== 'function') return
				/* 2026-11-09 丝滑度修复：旧版固定 ±0.12 忽略滚轮幅度，
				   鼠标一格(deltaY≈100) 与触屏板轻扫(deltaY≈3) 跳同样多 → 顿挫。
				   改为：① deltaMode 归一到像素 ② 按量取指数(乘法而非加法)，
				   任意倍率下每单位滚动的相对变化一致 ③ 小 delta 累积，触屏板也连续。 */
				let wheelAcc = 0
				const onWheel = (e) => {
					if (e && typeof e.preventDefault === 'function') e.preventDefault()
					const rect = vp.getBoundingClientRect()
					const u = rect.width ? (e.clientX - rect.left) / rect.width : 0.5
					const v = rect.height ? (e.clientY - rect.top) / rect.height : 0.5
					const au = Math.min(1, Math.max(0, u)), av = Math.min(1, Math.max(0, v))
					let dy = Number(e.deltaY) || 0
					/* deltaMode: 0=像素 1=行(≈16px) 2=页(≈视口高) */
					const mode = Number(e.deltaMode) || 0
					if (mode === 1) dy *= 16
					else if (mode === 2) dy *= rect.height || 240
					/* 累积微小增量：触屏板轻扫也逐帧响应，不丢帧 */
					wheelAcc += dy
					if (Math.abs(wheelAcc) < 1) return
					const total = wheelAcc
					wheelAcc = 0
					/* 指数缩放：120px ≈ ×1.15（向上滚放大）。
					   乘法保证 zoom=1 与 zoom=3 时每格相对变化一致。 */
					const factor = Math.exp(-total / 800)
					const cur = stateRef.current
					applyZoom(cur.zoom * factor, au, av)
				}
				try { vp.addEventListener('wheel', onWheel, { passive: false }) } catch (err) { return }
				return () => { try { vp.removeEventListener('wheel', onWheel) } catch (err) {} }
			}, [img])

			/* practices.md:35「keep the behavior that users rely on, such as Modal
			   focus and Escape handling」。与插件其他弹窗（换肤 / A2 浮层）同模式：
			   原生 keydown 挂 Esc、打开时把焦点移进对话框、卸载时归还给触发元素。 */
			const cardRef = React2.useRef(null)
			React2.useEffect(() => {
				const previous = (typeof document !== 'undefined' && document.activeElement) || null
				const onKey = (e) => { if (e && e.key === 'Escape') props.onCancel() }
				try { document.addEventListener('keydown', onKey) } catch (err) {}
				try {
					if (cardRef.current && typeof cardRef.current.focus === 'function') cardRef.current.focus()
				} catch (err) {}
				return () => {
					try { document.removeEventListener('keydown', onKey) } catch (err) {}
					try { if (previous && typeof previous.focus === 'function') previous.focus() } catch (err) {}
				}
			}, [])

			const confirm = () => {
				const url = renderCroppedAvatar(img, offset, zoom)
				if (!url || !validAvatarData(url)) { props.onError('图片裁剪失败，请重试。'); return }
				props.onConfirm(url)
			}

			const overlay = {
				position: 'fixed', inset: 0, zIndex: 1200,
				background: 'rgba(0,0,0,0.6)',
				display: 'flex', alignItems: 'center', justifyContent: 'center',
				padding: '16px', boxSizing: 'border-box'
			}
			const card = {
				background: 'var(--dsw-alias-bg-layer-2)',
				border: '1px solid var(--dsw-alias-border-l2)',
				borderRadius: '12px', padding: '18px',
				boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
				display: 'flex', flexDirection: 'column', gap: '14px',
				alignItems: 'center', maxWidth: '100%'
			}
			const viewport = {
				width: AVATAR_CROP_VIEW + 'px', height: AVATAR_CROP_VIEW + 'px',
				position: 'relative', overflow: 'hidden',
				borderRadius: '8px', border: '1px solid var(--dsw-alias-border-l2)',
				background: 'var(--dsw-alias-bg-layer-1)',
				cursor: 'grab', touchAction: 'none', flex: 'none'
			}
			const btn = {
				font: 'inherit', fontSize: '12px', padding: '6px 16px',
				borderRadius: '6px', cursor: 'pointer',
				border: '1px solid var(--dsw-alias-border-l2)',
				background: 'var(--dsw-alias-interactive-bg-hover)',
				color: 'var(--dsw-alias-label-primary)'
			}
			const btnPrimary = Object.assign({}, btn, {
				background: 'var(--buxu-user-accent)', color: '#FFFFFF', border: 'none'
			})

			return toBodyPortal(
				h2('div', { style: overlay, onPointerDown: (e) => { if (e.target === e.currentTarget) props.onCancel() } },
					h2('div', { style: card, role: 'dialog', 'aria-modal': 'true', 'aria-label': '调整头像', ref: cardRef, tabIndex: -1 },
						h2('div', { style: { fontSize: '13px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, '调整头像'),
						h2('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-tertiary)' } }, '拖动图片定位；鼠标滚轮以指针处为中心缩放，也可用下方滑块调整'),
						h2('div', { style: viewport, ref: viewportRef,
							onPointerDown: onDown, onPointerMove: onMove,
							onPointerUp: onUp, onPointerCancel: onUp },
							h2('canvas', { ref: canvasRef, width: AVATAR_CROP_VIEW, height: AVATAR_CROP_VIEW,
								style: { display: 'block', width: '100%', height: '100%' } })
						),
						/* 缩放滑块：1 = 刚好铺满(cover)，3 = 放大 3 倍 */
						h2('label', { style: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', fontSize: '11px', color: 'var(--dsw-alias-label-tertiary)' } },
							h2('span', { style: { flex: 'none', width: '28px' } }, '缩放'),
							h2('input', {
								type: 'range', min: 1, max: AVATAR_ZOOM_MAX, step: 0.05, value: zoom,
								onChange: onZoom,
								'aria-label': '头像缩放',
								style: { flex: '1', accentColor: 'var(--buxu-user-accent)' }
							}),
							h2('span', { style: { flex: 'none', width: '34px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }, zoom.toFixed(1) + '×')
						),
						h2('div', { style: { display: 'flex', gap: '10px' } },
							h2('button', { type: 'button', onClick: props.onCancel, style: btn }, '取消'),
							h2('button', { type: 'button', onClick: confirm, style: btnPrimary }, '使用这张')
						)
					)
				)
			)
		}

		function AvatarRow(props) {
			const kind = props.kind
			const label = kind === 'assistant' ? '助手头像' : '我的头像'
			const [custom, setCustom] = React2.useState(readAvatar(kind))
			const [avatarError, setAvatarError] = React2.useState(null)
			const [avatarBusy, setAvatarBusy] = React2.useState(false)
			/* 待裁剪的原图 Image（非 dataURL）：选完文件先弹裁剪器，确认才保存 */
			const [cropImage, setCropImage] = React2.useState(null)
			const inputRef = React2.useRef(null)
			const operationRef = React2.useRef(0)
			const cancelRef = React2.useRef(null)
			React2.useEffect(() => {
				const unsubscribe = subscribeSettings(() => setCustom(readAvatar(kind)))
				return () => {
					operationRef.current++
					if (typeof cancelRef.current === 'function') cancelRef.current()
					unsubscribe()
				}
			}, [kind])

			const pick = () => {
				if (inputRef.current) inputRef.current.click()
			}
			/* 图片处理与保存分离：预览要等 Host 接受后才替换，失败不伪装成功。 */
			const onFile = (e) => {
				const f = e.target.files && e.target.files[0]
				if (!f) return
				const token = ++operationRef.current
				setAvatarError(null)
				setAvatarBusy(true)
				/* 2026-11-09：先解码原图交给裁剪器，不再自动 contain 居中压缩。 */
				cancelRef.current = readAvatarSource(f, (image, error, requestToken) => {
					if (requestToken !== operationRef.current) return
					setAvatarBusy(false)
					if (error || !image) {
						setAvatarError(error || '图片处理失败，请重试。')
						return
					}
					setCropImage(image)
				}, token)
				e.target.value = ''
			}
			/* 裁剪确认：拿到 128×128 PNG 后才写 config（沿用原有保存链路）。 */
			const onCropConfirm = (url) => {
				const token = ++operationRef.current
				setCropImage(null)
				setAvatarBusy(true)
				persistAvatar(kind, url).then((result) => {
					if (operationRef.current !== token) return
					setAvatarBusy(false)
					if (!result.ok) {
						setAvatarError('头像未能保存，原有头像已保留。请检查配置服务后重试。')
						return
					}
					setCustom(url)
					applyAvatarOverrides()
				}).catch(() => {
					if (operationRef.current !== token) return
					setAvatarBusy(false)
					setAvatarError('头像保存失败，原有头像已保留，请重试。')
				})
			}
			const onCropCancel = () => {
				operationRef.current++
				setCropImage(null)
				setAvatarBusy(false)
			}
			const reset = () => {
				operationRef.current++
				setAvatarError(null)
				setAvatarBusy(true)
				persistAvatar(kind, '').then((result) => {
					setAvatarBusy(false)
					if (!result.ok) {
						setAvatarError('未能恢复默认头像，原有自定义头像已保留，请重试。')
						return
					}
					setCustom(null)
					applyAvatarOverrides()
				}).catch(() => {
					setAvatarBusy(false)
					setAvatarError('恢复默认头像失败，请重试。')
				})
			}

			const box = {
				display: 'flex',
				alignItems: 'center',
				gap: '12px',
				padding: '12px 0'
			}
			const preview = {
				backgroundSize: 'contain',
				backgroundPosition: 'center',
				backgroundRepeat: 'no-repeat',
				flex: 'none',
				border: '1px solid var(--dsw-alias-border-l2)',
				backgroundColor: 'var(--dsw-alias-bg-layer-2)',
				backgroundImage: custom ? 'url("' + custom + '")' : undefined
			}
			/* 没有自定义图时预览是个空圆圈，用户会以为「头像没设置/坏了」
			   （实测反馈）。内置图以 base64 内联在 CSS 里、没有现成常量，
			   所以这里放一个「默认」文字占位，明确表示用内置图。 */
			const previewPlaceholder = custom ? null : h2('span', {
				style: {
					display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
					fontSize: '10px', color: 'var(--dsw-alias-label-tertiary)',
					flex: 'none', border: '1px solid var(--dsw-alias-border-l2)',
					background: 'var(--dsw-alias-bg-layer-2)'
				},
				'data-buxu-avatar-preview': 'placeholder',
				'aria-hidden': 'true'
			}, '默认')
			const btn = {
				font: 'inherit',
				fontSize: '12px',
				padding: '5px 12px',
				borderRadius: '6px',
				cursor: 'pointer',
				border: '1px solid var(--dsw-alias-border-l2)',
				background: 'var(--dsw-alias-interactive-bg-hover)',
				color: 'var(--dsw-alias-label-primary)'
			}
			const btnGhost = Object.assign({}, btn, { background: 'transparent' })

			return h2(
				'div',
				{ style: box },
				custom
					? h2('span', { style: preview, 'data-buxu-avatar-preview': 'custom', 'aria-hidden': 'true' })
					: previewPlaceholder,
				h2(
					'div',
					{ style: { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '0' } },
					h2('span', { style: { fontSize: '13px', fontWeight: 500 } }, label),
					h2(
						'div',
						{ style: { display: 'flex', gap: '8px' } },
						h2('button', { type: 'button', onClick: pick, disabled: avatarBusy, style: btn }, avatarBusy ? '处理中…' : (custom ? '更换图片' : '上传图片')),
						custom ? h2('button', { type: 'button', onClick: reset, disabled: avatarBusy, style: btnGhost }, '恢复默认') : null
					),
					avatarError ? h2('div', { role: 'alert', style: { color: 'var(--dsw-alias-state-warn-label, #FF8A30)', fontSize: '11px', lineHeight: '1.5' } }, avatarError) : null
				),
				h2('input', {
					ref: inputRef,
					type: 'file',
					accept: 'image/png,image/jpeg,image/webp',
					onChange: onFile,
					style: { display: 'none' }
				}),
				cropImage ? h2(AvatarCropper, {
					image: cropImage,
					onConfirm: onCropConfirm,
					onCancel: onCropCancel,
					onError: (msg) => setAvatarError(msg)
				}) : null
			)
		}

		/* 主题标识徽标：显示当前主题名，配色跟随主题 token。
		   文案从根属性实时解析（不依赖闭包时序）：applyThemeTokens
		   已先写 data-dsh-theme-buxu='dark|light'，此处据此查注册表。
		   注册表缺项时兜底深色名，保证重载边界也不空。 */
		/* 当前生效的色板 id —— 由 applyThemeTokens 写入，徽标读它显示名字。 */
		let activePaletteId = null

		/**
		 * 当前配色以**配置快照为准**，activePaletteId 只作兜底。
		 * 这样无论是弹窗 switchPalette、设置页 patch，还是 configForms 外部同步
		 * （另一个会话改了设置），徽标文案与衣服填充色都能一致；
		 * 若只信 activePaletteId，配置被外部改写而未走 applyThemeTokens 时
		 * 徽标会滞后（_qa_tshirt.cjs 实测暴露）。
		 */
		function currentPalette() {
			const cfg = settingsValue()
			const fromCfg = hasPalette(cfg.palette) ? PALETTES[cfg.palette] : null
			if (fromCfg) return fromCfg
			return (activePaletteId && hasPalette(activePaletteId) ? PALETTES[activePaletteId] : null) || PALETTES[DEFAULT_PALETTE_ID]
		}

		function currentLabel() {
			const p = currentPalette()
			return (p.label && (p.label.zh || p.label.en)) || '质肤'
		}

		/* 徽标需要随「换配色」立即改文字和色块，但 applyThemeTokens 只写 CSS/根属性，
		   不会触发 React 重渲染。这里做一个极小的外部订阅：applyThemeTokens 末尾
		   emit，ThemeBadge 用 useSyncExternalStore/useEffect 订阅后 setState。
		   不引入状态库，也不改设置页那条 configForms 订阅链路。 */
		const BADGE_LISTENERS = new Set()
		function badgeEmit() {
			for (const fn of BADGE_LISTENERS) {
				try { fn() } catch (e) { /* 单个订阅者异常不影响其他 */ }
			}
		}
		function badgeSubscribe(fn) {
			BADGE_LISTENERS.add(fn)
			return () => BADGE_LISTENERS.delete(fn)
		}

		/* **换肤弹窗开关提升到模块级**（2026-11-08 修复「点选一张皮肤后弹窗自己关了」）：
		   switchPalette 会经 applyThemeTokens → applyColorMode 改 body 的深浅属性，
		   官方 header 可能整棵重挂载，conversation.session.header.utilities 里注册的
		   ThemeBadge 随之卸载重建；组件内 useState 的 open / rect 会丢，表现就是
		   「点了一张卡片，弹窗没了」。模块级变量不随组件生命周期消失，重挂后
		   ThemeBadge 用它们作 useState 初值，弹窗继续开着、锚点也不丢。
		   这里只做状态保持，不改变「点选不关闭」本身的语义：PaletteOption.onPick
		   从第一版起就只调用 switchPalette，从不调用 onClose。 */
		let BADGE_OPEN = false
		let BADGE_RECT = null

		/* ================================================================
		 * 换肤弹窗（2026-11-05 新增）
		 *
		 * 需求（用户确认）：点顶栏当前配色名文字，在它下方弹出
		 * 固定 260×320 的浮层，里面是配色缩略图列表，点一张立即换肤，
		 * 超出可滚动 —— 这样今后配色加到十几套也不会一下铺开影响美观。
		 *
		 * 为什么独立实现而不跳设置页：设置页是整页表单，换肤是高频轻量
		 * 操作，不该让用户离开当前会话再回来。
		 *
		 * 结构（第四版）：ThemeBadge 是触发器（色块 + 名称 + 箭头），
		 * 弹窗经 ReactDOM.createPortal 挂到 document.body，用 position:fixed
		 * 按徽标 rect 定位。这样彻底绕开 header utilities 工具行的
		 * overflow / max-height:28px / z-index 层叠困住 —— 之前的 absolute
		 * 版本在这些祖先里会被裁掉，正是用户「按钮没做」的另一半原因。
		 * ================================================================ */

		/** 唯一的快照合并规则：有明确用户覆盖才覆盖本地；非法/缺失字段回退已确认值。 */
		function settingsFromSnapshot(snapshot, fallback) {
			if (!snapshot || snapshot.status !== 'ready') return Object.assign({}, fallback)
			const local = fallback && typeof fallback === 'object' ? fallback : settingsValue()
			const value = snapshot.value && typeof snapshot.value === 'object' ? snapshot.value : {}
			const merged = Object.assign({}, DEFAULTS_FOR_UI(), value)
			const backup = readPaletteBackup()
			const hasUserPalette = snapshot.user && hasPalette(snapshot.user.palette)
			const hasBasePalette = snapshot.base && hasPalette(snapshot.base.palette)
			if (hasPalette(local.palette) && !hasUserPalette && !hasBasePalette && !hasPalette(value.palette)) {
				merged.palette = local.palette
			} else if (!hasUserPalette && !hasBasePalette && !hasPalette(value.palette) && hasPalette(backup)) {
				merged.palette = backup
			} else if (!hasPalette(merged.palette)) {
				merged.palette = hasPalette(local.palette) ? local.palette : (backup || DEFAULT_PALETTE_ID)
			}
			return merged
		}
		/** 未完成事务的旧订阅不能覆盖新输入；空闲时采用同一份权威快照。 */
		function settingsFromSubscription(snapshot) {
			if (configStatus().pending) return Object.assign({}, settingsValue())
			return settingsFromSnapshot(snapshot, settingsValue())
		}

		/** 单次设置写入：只有最新操作可以处理完成回调，失败回读权威快照。 */
		async function persistSettings(kv, source) {
			const seq = ++settingsOperationSeq
			const previous = Object.assign({}, settingsValue())
			const next = Object.assign({}, previous, kv)
			applySettings(next, source || 'settings:optimistic')
			buxuFormStatus = Object.assign({}, configStatus(), {
				pending: true, pendingOperation: seq, pendingKeys: Object.keys(kv), error: null
			})
			notifySettingsListeners()
			if (!configWritable()) {
				buxuFormStatus = Object.assign({}, configStatus(), {
					pending: false,
					error: 'Host 配置未连接或为只读，当前仅作临时预览，重启后可能不会保留。'
				})
				notifySettingsListeners()
				return { ok: false, unavailable: true, value: next }
			}
			try {
				const entries = Object.entries(kv)
				let results = []
				if (entries.length > 1 && typeof buxuForm.mutate === 'function') {
					const accepted = await Promise.resolve(buxuForm.mutate(entries.map(([field, value]) => ({
						op: 'set', path: [field], value
					}))))
					results = entries.map(([field]) => ({ field, accepted: accepted !== false }))
				} else {
					for (const [field, value] of entries) {
						const accepted = await Promise.resolve(buxuForm.set(field, value))
						results.push({ field, accepted: accepted !== false })
					}
				}
				const rejected = results.filter((r) => !r.accepted).map((r) => r.field)
				if (seq !== settingsOperationSeq) return { ok: false, superseded: true, value: settingsValue() }
				const latest = readFormSnapshot()
				const latestValue = latest && latest.value && typeof latest.value === 'object' ? latest.value : {}
				/* Host 的写队列可能在一个 Promise resolve 后才发布快照；
				   不能用最后一条 set 的返回值代表整组已经可见。 */
				const mismatched = entries.filter(([field, value]) =>
					!Object.is(latestValue[field], value) &&
					!(Array.isArray(value) && JSON.stringify(latestValue[field]) === JSON.stringify(value))
				).map(([field]) => field)
				const failed = [...new Set(rejected.concat(mismatched))]
				const accepted = latest && latest.status === 'ready' && latest.writable === true && failed.length === 0
				applySettings(accepted
					? settingsFromSnapshot(latest, next)
					: settingsFromSnapshot(latest, previous), accepted ? 'settings:accepted-snapshot' : 'settings:rollback')
				buxuFormStatus = Object.assign({}, configStatus(), {
					pending: false,
					error: failed.length ? '以下设置未能保存：' + failed.join('、') + '。已恢复 Host 最近确认的值，请重试。' : null,
					lastSavedAt: accepted ? Date.now() : configStatus().lastSavedAt
				})
				notifySettingsListeners()
				return { ok: accepted, failed, value: settingsValue() }
			} catch (error) {
				if (seq !== settingsOperationSeq) return { ok: false, superseded: true, value: settingsValue() }
				const latest = readFormSnapshot()
				applySettings(settingsFromSnapshot(latest, previous), 'settings:rollback')
				buxuFormStatus = Object.assign({}, configStatus(), {
					pending: false,
					error: '设置保存失败：' + (error && error.message ? error.message : String(error)) + '。已恢复 Host 最近确认的值，请重试。'
				})
				notifySettingsListeners()
				return { ok: false, error, value: settingsValue() }
			}
		}

		/** 模块级换肤入口：预览与 Host 写入使用同一事务，旧请求不覆盖新选择。 */
		function switchPalette(id) {
			if (!hasPalette(id)) return
			persistSettings({ palette: id }, 'switchPalette:' + id).catch(() => {})
		}

		/**
		 * 弹窗网格几何（第六版）。
		 * 用户要求「窗口自适应、最小一排两个、最大一排三个」：
		 * 列数由可用视口宽度算出并严格夹在 2..3；窗口宽度 = 列数×卡片宽 +
		 * 间隙 + 内边距，窗口高度 = 表头 + 行数×卡片高 + 间隙，两者都随内容
		 * 与视口变化，不再是写死的 260/320/360。
		 *
		 * PREVIEW_W/H 也在本模块更靠后处声明（设置页缩略图共用），
		 * 这里不引用它，避免 const 的 TDZ 报错 —— 数值保持一致即可。
		 */
		const POP = {
			CARD_W: 152,       // 单卡宽度：与缩略图 152px 原生尺寸一致
			CARD_H: 138,       // 缩略图 95 + 文案区 43
			GAP: 10,           // 卡片间距（同时充当分隔线留白）
			PAD: 12,           // 列表内边距
			HEAD_H: 41,        // 标题栏高度
			MIN_COLS: 2,
			MAX_COLS: 3
		}
		const POP_THUMB_W = 152
		const POP_THUMB_H = 96
		const POP_THUMB_SCALE = (POP.CARD_W - 2) / POP_THUMB_W

		/** 一张配色卡片（竖排）：大缩略图 + 名称 + 深浅/布局副标题 + 选中勾。 */
		function PaletteOption({ id, active, colors, layout, onPick }) {
			const p = PALETTES[id]
			return h2('button', {
				type: 'button',
				'data-buxu-palette': id,
				'data-buxu-active': active ? 'true' : 'false',
				'aria-pressed': active,
				onClick: onPick,
				style: {
					position: 'relative',
					display: 'flex', flexDirection: 'column', alignItems: 'stretch',
					width: '100%', height: POP.CARD_H + 'px', boxSizing: 'border-box',
					padding: '0', borderRadius: '6px', cursor: 'pointer', overflow: 'hidden',
					border: (active ? '2px solid var(--buxu-user-accent)'
						: '1px solid var(--buxu-pop-divider)'),
					background: active ? 'var(--buxu-pop-row-active)' : 'var(--buxu-pop-surface)',
					color: 'var(--dsw-alias-label-primary)', font: 'inherit', textAlign: 'left'
				}
			},
				/* 缩略图：铺满卡宽，高度按等比算；下方一条细线分隔图文 */
				h2('div', {
					style: {
						flex: 'none', width: '100%', height: Math.round(POP_THUMB_H * POP_THUMB_SCALE) + 'px',
						overflow: 'hidden', borderBottom: '1px solid var(--buxu-pop-divider)',
						background: colors.sidebar || 'transparent'
					}
				},
					h2('div', {
						style: {
							width: POP_THUMB_W + 'px',
							transform: 'scale(' + POP_THUMB_SCALE + ')',
							transformOrigin: 'top left'
						}
					}, PalettePreview(colors, layout))
				),
				/* 文案区：名称 + 深浅·布局（分组取消后回到卡片自身） */
				h2('div', {
					style: {
						flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column',
						justifyContent: 'center', gap: '2px', padding: '0 9px'
					}
				},
					h2('span', {
						style: {
							fontSize: '12px', fontWeight: active ? 600 : 500, lineHeight: '16px',
							whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
						}
					}, (p.label && (p.label.zh || p.label.en)) || id),
					h2('span', {
						style: { fontSize: '10px', lineHeight: '14px', color: 'var(--dsw-alias-label-tertiary)' }
					}, (p.scheme === 'dark' ? '深色' : '浅色') + ' · ' +
						(p.layout === 'plain' ? '原生布局' : '精修布局'))
				),
				/* 选中勾：浮在缩略图右上角 */
				active ? h2('span', {
					style: {
						position: 'absolute', top: '6px', right: '6px',
						width: '16px', height: '16px', borderRadius: '50%',
						background: 'var(--buxu-user-accent)', color: 'var(--buxu-user-accent-contrast)',
						fontSize: '11px', lineHeight: '16px', textAlign: 'center', fontWeight: 700
					}
				}, '✓') : null
			)
		}

		/**
		 * 换肤浮层（第六版）：自适应尺寸 + 自适应网格，一排 2~3 张。
		 *
		 * 用户要求（2026-11-05 第六轮）：下边的小字不要；窗口可以再大一些；
		 * 里面自适应一行两个或一行三个；最小 2 列、最大 3 列。
		 *
		 * 尺寸推导：
		 *   cols = clamp(floor((可用宽 + GAP) / (CARD_W + GAP)), 2, 3)
		 *   W    = cols*CARD_W + (cols-1)*GAP + 2*PAD
		 *   rows = ceil(配色数 / cols)
		 *   H    = HEAD_H + rows*CARD_H + (rows-1)*GAP + 2*PAD
		 * 于是 4 套配色时：2 列 → 328×360，3 列 → 490×222；
		 * 今后加到 9 套仍是 3 列、高度增长到 3 行，列表超出部分滚动。
		 * 不再有深浅分组（信息与列数冲突），深浅/布局回到每张卡片副标题。
		 *
		 * 经 createPortal 挂 body，按 anchorRect 用 fixed 定位在徽标下方右对齐，
		 * 越界夹取：右缘/下缘不超出视口，空间不足时翻到徽标上方。
		 */
		function PalettePopover({ onClose, anchorRect }) {
			const [, forceUpdate] = React2.useState(0)
			React2.useEffect(() => subscribeSettings(() => forceUpdate((n) => n + 1)), [])
			const panelRef = React2.useRef(null)
			const s = settingsValue()
			const activeId = hasPalette(s.palette) ? s.palette : DEFAULT_PALETTE_ID
			const ids = paletteOrder()
			const vw = (typeof window !== 'undefined' && window.innerWidth) || 1280
			const vh = (typeof window !== 'undefined' && window.innerHeight) || 820
			/* 列数：由可用宽度算出，严格夹在 2..3。
			   可用宽同时受两件事约束：
			     ① 徽标右缘（弹窗右对齐，不能越过窗口右边界）
			     ② 视口宽度的 60% —— 避免窄窗口下 3 列 500px 几乎铺满整屏
			   取两者较小值，再减去安全边距与内边距。
			   60% 是刻意的：1296 宽 → 777 足够 3 列；700 宽 → 420 只够 2 列。 */
			const MAX_PANEL_RATIO = 0.6
			const rightEdge = anchorRect ? anchorRect.right : vw
			const avail = Math.max(0, Math.min(rightEdge, vw * MAX_PANEL_RATIO) - 8 - 2 * POP.PAD)
			let cols = Math.floor((avail + POP.GAP) / (POP.CARD_W + POP.GAP))
			const minCols = vw < 360 ? 1 : POP.MIN_COLS
			if (cols < minCols) cols = minCols
			if (cols > POP.MAX_COLS) cols = POP.MAX_COLS
			const rows = Math.ceil(ids.length / cols)
			const W = cols * POP.CARD_W + (cols - 1) * POP.GAP + 2 * POP.PAD
			let H = POP.HEAD_H + rows * POP.CARD_H + (rows - 1) * POP.GAP + 2 * POP.PAD
			/* 高度也要留出视口安全边距；超高时列表滚动而不是撑破屏幕 */
			if (H > vh - 16) H = Math.max(120, vh - 16)
			let left = (anchorRect ? anchorRect.right : vw - 16) - W
			let top = (anchorRect ? anchorRect.bottom : 48) + 8
			if (left + W > vw - 8) left = vw - 8 - W
			if (left < 8) left = 8
			if (top + H > vh - 8) top = Math.max(8, (anchorRect ? anchorRect.top : 48) - H - 8)
			/* Esc 关闭 + 点击浮层外部关闭。用 useEffect 挂原生监听，
			   避免依赖 React 合成事件的冒泡时序。 */
			React2.useEffect(() => {
				const onKey = (e) => { if (e.key === 'Escape') onClose() }
				const onDown = (e) => {
					try {
						if (e.target && e.target.closest && e.target.closest('[data-buxu-popover]')) return
						if (e.target && e.target.closest && e.target.closest('[data-buxu-badge]')) return
						onClose()
					} catch (err) { onClose() }
				}
				document.addEventListener('keydown', onKey)
				const current = panelRef.current && panelRef.current.querySelector('[aria-pressed="true"]')
				if (current && typeof current.focus === 'function') current.focus()
				/* 延迟一帧挂 pointerdown，避免打开弹窗的那次点击立刻把它关掉 */
				const t = setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0)
				return () => {
					clearTimeout(t)
					document.removeEventListener('keydown', onKey)
					document.removeEventListener('pointerdown', onDown, true)
				}
			}, [])

			const panel = h2('div', {
				ref: panelRef,
				'data-buxu-popover': '',
				'data-buxu-cols': cols,
				role: 'dialog',
				'aria-label': '切换配色',
				/* **2026-11-08 修复「点选一张皮肤后弹窗关闭」真根因**：
				   弹窗虽经 createPortal 挂到 document.body，但在 React 树里仍是
				   ThemeBadge 的 <button onClick={toggle}> 的子节点。React 官方规定
				   portal 里的事件沿 React 树冒泡、不沿 DOM 树，于是点卡片会冒泡到
				   徽标 button 的 toggle → setOpen(false) → 弹窗关闭。上轮把开关
				   提升到模块级无效，正是因为 toggle 主动把状态写成了 false。
				   在面板根节点截断 click 冒泡即可；不阻断 pointerdown（外部点击
				   关闭靠 document 上的捕获监听，本就在面板之外）。 */
				onClick: (e) => { if (e && typeof e.stopPropagation === 'function') e.stopPropagation() },
				style: {
					position: 'fixed', left: left + 'px', top: top + 'px',
					width: W + 'px', height: H + 'px', boxSizing: 'border-box',
					display: 'flex', flexDirection: 'column',
					background: 'var(--buxu-pop-surface)',
					border: '1px solid var(--buxu-pop-border)',
					borderRadius: '10px',
					boxShadow: 'var(--buxu-pop-shadow)',
					zIndex: 1100, overflow: 'hidden',
					fontFamily: 'inherit'
				}
			},
				/* 头部：标题 + 数量，下面一条实线（唯一的水平分隔线） */
				h2('div', {
					style: {
						flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
						height: POP.HEAD_H + 'px', boxSizing: 'border-box', padding: '0 14px',
						fontSize: '12px', fontWeight: 600,
						color: 'var(--dsw-alias-label-primary)',
						background: 'var(--buxu-pop-head)',
						borderBottom: '1px solid var(--buxu-pop-border)'
					}
				},
					h2('span', null, '切换配色'),
					h2('span', {
						style: { fontSize: '10px', fontWeight: 500, color: 'var(--dsw-alias-label-tertiary)' }
					}, String(ids.length) + ' 套可选')
				),
				/* 网格：列数由 cols 决定；卡片之间的 GAP 露出弹窗底色，
				   配合卡片自身 1px 描边形成分隔线，不需要额外画 border。 */
				h2('div', {
					'data-buxu-grid': '',
					style: {
						flex: '1', minHeight: '0', overflowY: 'auto',
						display: 'grid',
						gridTemplateColumns: 'repeat(' + cols + ', ' + POP.CARD_W + 'px)',
						gap: POP.GAP + 'px', padding: POP.PAD + 'px',
						justifyContent: 'center', alignContent: 'start'
					}
				},
					ids.map((id) => h2(PaletteOption, {
						key: id, id, active: activeId === id,
						colors: colorize(PALETTES[id].colors, s),
						layout: PALETTES[id].layout,
						onPick: () => switchPalette(id)
					}))
				)
			)
			return toBodyPortal(panel)
		}

		/**
		 * 头部配色按钮（2026-11-05 第四版）。
		 * 演变：胶囊 → 纯文字 → 纯文字可点 → 色块 + 名称 + 下拉箭头的明确按钮。
		 * 弹窗走 Portal，所以本组件只需提供 anchorRect，不再做定位包含块。
		 */
		function ThemeBadge() {
			/* 初值取模块级状态：官方 header 在换深浅时可能整棵重挂载，
			   组件内 useState 会丢，弹窗就"点一下自己关了"。 */
			const [open, setOpenState] = React2.useState(BADGE_OPEN)
			const [tick, setTick] = React2.useState(0)
			const [rect, setRectState] = React2.useState(BADGE_RECT)
			const setOpen = (v) => { BADGE_OPEN = !!v; setOpenState(!!v) }
			const setRect = (r) => { BADGE_RECT = r || null; setRectState(BADGE_RECT) }
			const ref = React2.useRef(null)
			/* 订阅配色变化：applyThemeTokens 不触发 React 重渲染，
			   靠它刷新文案与衣服内的当前配色 */
			React2.useEffect(() => badgeSubscribe(() => setTick((n) => n + 1)), [])
			/* 重挂载后锚点可能已经变了（窗口尺寸/侧栏宽度），重新量一次。
			   只在挂载时跑，不进依赖循环。 */
			React2.useEffect(() => {
				if (!BADGE_OPEN || !ref.current || !ref.current.getBoundingClientRect) return
				try { BADGE_RECT = ref.current.getBoundingClientRect(); setRectState(BADGE_RECT) } catch (e) { /* 忽略 */ }
			}, [])
			const p = currentPalette()
			const label = (p.label && (p.label.zh || p.label.en)) || '质肤'
			/* 衣服剪影按参考图固定亮色，不再随配色变：
			   深色底片 + 亮衣服 + 长投影的立体关系必须稳定，
			   反色后浅色主题下投影就无从谈起。 */
			const SHIRT_PATH = 'M8.6 3.4 Q9.2 3.1 9.9 3.35 Q12 5.0 14.1 3.35 Q14.8 3.1 15.4 3.4 ' +
				'L20.9 6.1 Q21.5 6.4 21.2 7.0 L18.8 11.0 Q18.5 11.5 17.95 11.2 L16.3 10.3 ' +
				'L16.3 19.6 Q16.3 20.8 15.1 20.8 L8.9 20.8 Q7.7 20.8 7.7 19.6 L7.7 10.3 ' +
				'L6.05 11.2 Q5.5 11.5 5.2 11.0 L2.8 7.0 Q2.5 6.4 3.1 6.1 Z'
			/* 45° 长投影：沿 (0.42, 0.42) 每格平移，12 层叠出实心斜影。
			   总长约 5 网格，与参考图里「向右下拖出一条长影」一致。 */
			const SHIRT_SHADOWS = []
			for (let k = 16; k >= 1; k--) {
				const o = (k * 0.62).toFixed(2)
				SHIRT_SHADOWS.push(h2('path', {
					'data-buxu-shirt': 'shadow',
					d: SHIRT_PATH,
					transform: 'translate(' + o + ' ' + o + ')',
					fill: 'none'
				}))
			}
			const toggle = () => {
				if (!open && ref.current && ref.current.getBoundingClientRect) {
					try { setRect(ref.current.getBoundingClientRect()) } catch (e) { setRect(null) }
				}
				setOpen(!open)
			}
			return h2(
				'button',
				{
					ref,
					type: 'button',
					className: 'tn-header-badge',
					'data-buxu-badge': '',
					'data-buxu-badge-open': open ? 'true' : 'false',
					title: '切换配色：' + label,
					'aria-label': '当前配色 ' + label + '，点击切换',
					'aria-haspopup': 'dialog',
					'aria-expanded': open,
					tabIndex: 0,
					onClick: toggle,
					onKeyDown: (e) => {
						if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() }
					}
				},
				/* 参考图版（2026-11-05 第八版）：深色底 + 45° 长投影 + 实心亮衣服。
				   三层顺序：底片 → 12 层偏移副本（叠成斜向长影）→ 顶层亮剪影。
				   SVG 根 overflow:hidden（CSS 给）让投影越界自然裁切，
				   像参考图里投影被圆形容器截断那样收住。 */
				h2('svg', {
					className: 'tn-header-badge-swatch',
					viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true'
				},
					h2('rect', {
						'data-buxu-shirt': 'plate',
						x: '0', y: '0', width: '24', height: '24', rx: '4', fill: 'none'
					}),
					/* 衣服整体缩到 82% 并居中，给右下的长投影留出画布空间 */
					h2('g', { transform: 'translate(2.2 1.4) scale(0.82)' },
						SHIRT_SHADOWS,
						h2('path', {
							'data-buxu-shirt': 'body',
							d: SHIRT_PATH,
							fill: 'none'
						})
					)
				),
				h2('span', null, label),
				h2('svg', {
					className: 'tn-header-badge-chevron',
					viewBox: '0 0 10 10', fill: 'none', 'aria-hidden': 'true'
				}, h2('path', {
					d: 'M1.5 3.5 L5 7 L8.5 3.5', stroke: 'currentColor',
					'stroke-width': '1.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
				})),
				open ? h2(PalettePopover, {
					anchorRect: rect,
					onClose: () => {
						setOpen(false)
						if (ref.current && typeof ref.current.focus === 'function') ref.current.focus()
					}
				}) : null
			)
		}

		/* ================================================================
		 * 已归档（A2，2026-11-08）
		 *
		 * 全部走官方公开契约，零 DOM 注入、零非公开远程端点、零私有 store：
		 *   · 入口   sidebar.footer.action（list / replaceRisk:none）
		 *   · 浮层   shell.overlay（list / replaceRisk:none，默认 click-through）
		 *   · 取数   槽组件 standardProps 注入的 useSessions / useWorkspaces
		 *             （官方 provideRoot + useSyncExternalStore，uSES 自动重渲染）
		 *   · 操作   uiWorkspace.unarchiveSession / forkSession / openSession /
		 *             sessions.using + session.rename / navigator.clipboard
		 *   · 挂载   两个官方槽：sidebar.footer.action + shell.overlay
		 *             （2026-11-09 移除第三个「右键菜单加项」槽：重复且多余）
		 *
		 * 官方不提供「删除会话」，也不向插件开放「在文件夹显示」所需的
		 * ctx.remote.session.openWorkspacePath —— 这两项不做，不编、不绕。
		 * 归档态官方拒绝直接 openSession（guardedOpen），故「打开」= 先取消归档再打开。
		 * ================================================================ */

		/* 模块级开关：入口（footer.action）与浮层（shell.overlay）是两个槽、
		   两棵 React 树，靠这个极小的外部 store 同步 open 状态，不跨 DOM 查询。 */
		const ARCHIVE_LISTENERS = new Set()
		let ARCHIVE_OPEN = false
		function archiveEmit() { for (const fn of ARCHIVE_LISTENERS) { try { fn() } catch (e) {} } }
		function archiveSetOpen(v) { ARCHIVE_OPEN = !!v; archiveEmit() }
		function archiveSubscribe(fn) { ARCHIVE_LISTENERS.add(fn); return () => ARCHIVE_LISTENERS.delete(fn) }

		/* 归档集合 = useWorkspaces 快照的 archivedSessionIds；会话元数据 =
		   useSessions 的 byId（运行时含 displayTitle/title/updatedAt/cwd）；
		   工作区 = useWorkspaces 的 items（WorkspaceView.title/sessionIds）。
		   三份数据都来自官方 provideRoot 注入的 hook，与官方侧栏筛选同源。 */
		function archiveRows(useSessions, useWorkspaces) {
			/* 返回 null = 数据尚未就绪（hook 不可用 / 快照未到），渲染骨架屏；
			   返回 [] = 已就绪但确实没有归档会话，渲染空态。两者必须区分。 */
			let archivedIds, byId
			try { archivedIds = useWorkspaces((s) => s.archivedSessionIds) } catch (e) { return null }
			try { byId = useSessions((s) => s.byId) } catch (e) { return null }
			if (!archivedIds || !byId) return null
			let items = []
			try { items = useWorkspaces((s) => s.items) || [] } catch (e) {}
			const seen = new Set()
			const rows = []
			for (const id of archivedIds) {
				if (!id || seen.has(id)) continue
				seen.add(id)
				const s = byId[id]
				if (!s) continue
				const ws = items.find((w) => w && Array.isArray(w.sessionIds) && w.sessionIds.indexOf(id) >= 0)
				rows.push({
					id: id,
					title: s.displayTitle || s.title || String(id),
					updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : 0,
					cwd: s.cwd || '',
					workspace: (ws && (ws.title || ws.path)) || ''
				})
			}
			rows.sort((a, b) => b.updatedAt - a.updatedAt)
			return rows
		}

		function archiveRelTime(ts, now) {
			if (!ts) return ''
			const d = Math.max(0, now - ts)
			const day = 86400000
			if (d < 3600000) return '刚刚'
			if (d < day) return Math.floor(d / 3600000) + ' 小时前'
			if (d < 7 * day) return Math.floor(d / day) + ' 天前'
			if (d < 30 * day) return Math.floor(d / (7 * day)) + ' 周前'
			return Math.floor(d / (30 * day)) + ' 个月前'
		}

		/* 内联 SVG：官方 IconArchive* 在 primitives 包里，插件不能 require
		   （practices.md:35），按官方 archive box 线性形态自绘。 */
		function ArchiveIcon(size) {
			return h2('svg', {
				width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
				stroke: 'currentColor', 'stroke-width': '1.6',
				'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true'
			},
				h2('rect', { x: '3', y: '4', width: '18', height: '4', rx: '1' }),
				h2('path', { d: 'M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8' }),
				h2('path', { d: 'M10 12h4' })
			)
		}

		/* 调用官方服务。全部 try/catch：服务缺失/被拒时静默，不让浮层崩。
		   服务方法在对象上（ctx.get(service)[method]），不是把方法名当参数。 */
		function archiveAction(ctx, service, method, ...args) {
			try {
				const svc = ctx && typeof ctx.get === 'function' ? ctx.get(service) : null
				if (svc && typeof svc[method] === 'function') return Promise.resolve(svc[method](...args))
			} catch (e) { /* 忽略 */ }
			return Promise.resolve(null)
		}
		function archiveRename(ctx, id, title) {
			try {
				const svc = ctx && typeof ctx.get === 'function' ? ctx.get('sessions') : null
				if (!svc || typeof svc.using !== 'function') return Promise.resolve(null)
				return Promise.resolve(svc.using(id, { source: 'controllerOperation' },
					(ref) => ref.binding.session.rename(title)))
			} catch (e) { return Promise.resolve(null) }
		}
		function archiveCopyId(id) {
			try {
				if (navigator.clipboard && navigator.clipboard.writeText) {
					return Promise.resolve(navigator.clipboard.writeText(id)).catch(() => false)
				}
			} catch (e) { /* 忽略 */ }
			return Promise.resolve(false)
		}

		/* ---- 入口组件：sidebar.footer.action ----
		   ownerProps.wide：展开态 true / 收起成 56px rail 时 false → 退化成
		   36×36 圆钮（与官方 CordisPanel 同构）。视觉与官方 sectionHeader 一致：
		   36px 高、--dsh-sidebar-row-padding、--dsw-alias-label-tertiary。 */
		function ArchiveEntry({ wide, useSessions, useWorkspaces }) {
			const [, force] = React2.useState(0)
			React2.useEffect(() => archiveSubscribe(() => force((n) => n + 1)), [])
			let count = 0
			try { count = (useWorkspaces((s) => s.archivedSessionIds) || []).length } catch (e) {}
			const open = ARCHIVE_OPEN
			const toggle = (e) => { if (e && e.stopPropagation) e.stopPropagation(); archiveSetOpen(!open) }
			if (wide === false) {
				return h2('button', {
					type: 'button', 'data-buxu-archive-entry': 'rail',
					'aria-label': '已归档' + (count ? '（' + count + '）' : ''),
					title: '已归档' + (count ? ' · ' + count : ''),
					'aria-expanded': open, 'aria-haspopup': 'dialog',
					onClick: toggle,
					className: 'buxu-archive-rail' + (open ? ' is-open' : '')
				}, ArchiveIcon(18))
			}
			return h2('button', {
				type: 'button', 'data-buxu-archive-entry': 'wide',
				'aria-expanded': open, 'aria-haspopup': 'dialog',
				onClick: toggle,
				className: 'buxu-archive-entry' + (open ? ' is-open' : '')
			},
				h2('span', { className: 'buxu-archive-entry-label' },
					h2('span', { className: 'buxu-archive-entry-icon' }, ArchiveIcon(15)),
					'已归档'
				),
				h2('span', { className: 'buxu-archive-entry-count' }, String(count)),
				h2('span', { className: 'buxu-archive-entry-chevron' }, open ? '⌃' : '⌄')
			)
		}

		/* ---- 浮层组件：shell.overlay ----
		   position:fixed + z-index:30（与官方 CordisPanel 同级，不抢 1100）；
		   pointer-events:auto（shell.overlay 容器默认 click-through）。
		   三态：加载骨架 / 空态 / 列表。统计项拿不到就整列不渲染，不编数字。 */
		function ArchivedPanel({ ctx, useSessions, useWorkspaces, usePanelInfo }) {
			const [, force] = React2.useState(0)
			const [query, setQuery] = React2.useState('')
			const [menuId, setMenuId] = React2.useState('')
			const [renameId, setRenameId] = React2.useState('')
			const [renameText, setRenameText] = React2.useState('')
			const [busy, setBusy] = React2.useState('')
			const [notice, setNotice] = React2.useState('')
			React2.useEffect(() => archiveSubscribe(() => force((n) => n + 1)), [])
			const open = ARCHIVE_OPEN
			const ref = React2.useRef(null)
			/* 2026-11-09：用 ref 记住当前展开的 ⋯ 菜单，让 document 监听
			   能关它而不必把 menuId 塞进 effect 依赖（避免反复重挂监听）。 */
			const menuRef = React2.useRef('')
			menuRef.current = menuId
			React2.useEffect(() => {
				if (!open) return
				const onKey = (e) => {
					if (!e || e.key !== 'Escape') return
					/* Esc 先关 ⋯ 小窗，再关整个浮层 */
					if (menuRef.current) { setMenuId(''); return }
					archiveSetOpen(false)
				}
				const onDown = (e) => {
					try {
						const t = e.target
						const inPanel = t && t.closest && t.closest('[data-buxu-archive-panel]')
						const inEntry = t && t.closest && t.closest('[data-buxu-archive-entry]')
						const inMenu = t && t.closest && t.closest('[data-buxu-archive-row-menu]')
						const onMoreBtn = t && t.closest && t.closest('[data-buxu-archive-more]')
						/* 点面板内、但既不在 ⋯ 菜单也不在 ⋯ 按钮上 → 关掉 ⋯ 小窗 */
						if (inPanel && !inMenu && !onMoreBtn && menuRef.current) { setMenuId(''); return }
						if (inPanel || inEntry) return
						archiveSetOpen(false)
					} catch (err) { archiveSetOpen(false) }
				}
				document.addEventListener('keydown', onKey)
				const t = setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0)
				return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown, true) }
			}, [open])

			/* **2026-11-09 真机修复「浮层只有骨架屏、没有内容」**：
			   useSessions / useWorkspaces 是 React hook，必须**无条件、
			   每次渲染都按相同顺序调用**。旧版把它们放在 `if (!open) return null`
			   之后，关闭态不调、打开态才调 → hook 数量变化 → React 抛
			   "Rendered more hooks than during the previous render"，组件渲染中断，
			   永远停在骨架屏（截图实测：入口计数 28 正常，浮层统计却是「·」/加载中）。
			   现在把取数提到提前返回之前；open 只决定是否渲染 UI。 */
			let rows = []
			let ready = false
			try {
				const r = archiveRows(useSessions, useWorkspaces)
				if (r !== null) { rows = r; ready = true }
			} catch (e) { rows = [] }
			const now = Date.now()
			if (!open) return null
			const q = (query || '').trim().toLowerCase()
			const shown = q ? rows.filter((r) => (r.title + ' ' + r.workspace).toLowerCase().indexOf(q) >= 0) : rows
			const groups = []
			const week = 7 * 86400000
			for (const r of shown) {
				const key = (r.updatedAt && (now - r.updatedAt) < week) ? '本周' : '更早'
				let g = groups.find((x) => x.key === key)
				if (!g) { g = { key: key, items: [], recent: key === '本周' }; groups.push(g) }
				g.items.push(r)
			}

			const act = async (id, service, method, ...args) => {
				setBusy(id); setMenuId('')
				await archiveAction(ctx, service, method, ...args)
				setBusy('')
				force((n) => n + 1)
			}
			const onRename = async (id) => {
				const t = (renameText || '').trim()
				if (!t) { setRenameId(''); return }
				setBusy(id)
				await archiveRename(ctx, id, t)
				setBusy(''); setRenameId(''); setRenameText('')
				force((n) => n + 1)
			}
			const onCopy = async (id) => {
				const ok = await archiveCopyId(id)
				setMenuId('')
				setNotice(ok ? 'Session ID 已复制' : '复制失败，请重试')
				setTimeout(() => setNotice(''), 1800)
			}
			const onOpen = async (id) => {
				setBusy(id); setMenuId('')
				await archiveAction(ctx, 'uiWorkspace', 'unarchiveSession', id)
				await archiveAction(ctx, 'uiWorkspace', 'openSession', id)
				setBusy('')
				archiveSetOpen(false)
			}

			const body = !ready
				? h2('div', { className: 'buxu-archive-skeleton' },
					h2('div', { className: 'buxu-archive-skeleton-row' }),
					h2('div', { className: 'buxu-archive-skeleton-row' }),
					h2('div', { className: 'buxu-archive-skeleton-row' }))
				: rows.length === 0
					? h2('div', { className: 'buxu-archive-empty' },
						h2('div', { className: 'buxu-archive-empty-title' }, '暂无已归档会话'),
						h2('div', { className: 'buxu-archive-empty-desc' }, '归档的会话会出现在这里，随时可以恢复到工作区。'))
					: shown.length === 0
						? h2('div', { className: 'buxu-archive-empty' },
							h2('div', { className: 'buxu-archive-empty-title' }, '无匹配结果'))
						: h2('div', { className: 'buxu-archive-list' }, groups.map((g) =>
							h2('div', { key: g.key, className: 'buxu-archive-group' + (g.recent ? ' is-recent' : '') },
								/* 2026-11-09：分组标识重设计（方案③）。去掉橙色亮灯，
								   用 9px 灰阶方块（本周实心 / 更早空心）+ 数量。
								   分组行本身用淡底色带做色差（CSS），文字量不增。 */
								h2('div', { className: 'buxu-archive-group-label' },
									h2('span', { className: 'buxu-archive-group-sq' + (g.recent ? '' : ' is-dim') }),
									h2('span', { className: 'buxu-archive-group-name' }, g.key),
									h2('span', { className: 'buxu-archive-group-count' }, String(g.items.length))
								),
								g.items.map((r) => h2('div', {
									key: r.id, className: 'buxu-archive-row' + (busy === r.id ? ' is-busy' : '')
								},
									/* 2026-11-09 重设计：去掉图标盒与两行堆叠，
									   改成官方列表式一行 —— 标题左、工作区·时间右。 */
									h2('div', { className: 'buxu-archive-row-text' },
										renameId === r.id
											? h2('input', {
												className: 'buxu-archive-rename-input', value: renameText,
												autoFocus: true,
												onChange: (e) => setRenameText(e && e.target ? e.target.value : ''),
												onKeyDown: (e) => {
													if (e && e.key === 'Enter') onRename(r.id)
													if (e && e.key === 'Escape') { setRenameId(''); setRenameText('') }
												},
												onBlur: () => onRename(r.id)
											})
											: h2('span', {
												className: 'buxu-archive-row-title',
												title: (r.workspace ? r.workspace + ' · ' : '') + r.title
											}, r.title)
									),
									/* 方案 B：行内只留相对时间，工作区移到 title 提示，减少文字量 */
									h2('span', { className: 'buxu-archive-row-meta' }, archiveRelTime(r.updatedAt, now)),
									h2('div', { className: 'buxu-archive-row-actions' },
										h2('button', {
											type: 'button', className: 'buxu-archive-act is-primary',
											title: '恢复到工作区', 'aria-label': '恢复',
											disabled: busy === r.id,
											onClick: () => act(r.id, 'uiWorkspace', 'unarchiveSession', r.id)
										}, '↩'),
										h2('button', {
											type: 'button', className: 'buxu-archive-act',
											title: '重命名', 'aria-label': '重命名',
											onClick: () => { setRenameId(r.id); setRenameText(r.title); setMenuId('') }
										}, '✎'),
										h2('button', {
											type: 'button', className: 'buxu-archive-act',
											'data-buxu-archive-more': r.id,
											title: '更多', 'aria-label': '更多', 'aria-expanded': menuId === r.id,
											onClick: () => setMenuId(menuId === r.id ? '' : r.id)
										}, '⋯')
									),
									menuId === r.id ? h2('div', { className: 'buxu-archive-menu', 'data-buxu-archive-row-menu': r.id },
										h2('button', { type: 'button', role: 'menuitem', onClick: () => act(r.id, 'uiWorkspace', 'forkSession', r.id) }, '分叉会话'),
										h2('button', { type: 'button', role: 'menuitem', onClick: () => onCopy(r.id) }, '复制 Session ID'),
										h2('button', { type: 'button', role: 'menuitem', onClick: () => onOpen(r.id) }, '恢复并打开'),
										r.cwd ? h2('div', { className: 'buxu-archive-menu-path', title: r.cwd }, '路径：' + r.cwd) : null
									) : null
								))
							)
						))

			return h2('section', {
				ref: ref, 'data-buxu-archive-panel': '', role: 'dialog',
				'aria-label': '已归档', className: 'buxu-archive-panel'
			},
				/* 2026-11-09 方案 B：头部只「已归档 28 项」+ 关闭，无橙竖线、
				   无图标盒、无英文副标题、无独立统计行。强调色从此只在恢复按钮。 */
				h2('div', { className: 'buxu-archive-head' },
					h2('span', { className: 'buxu-archive-head-title' }, '已归档'),
					h2('span', { className: 'buxu-archive-head-count' }, ready ? (rows.length + ' 项') : '·'),
					h2('button', {
						type: 'button', className: 'buxu-archive-close', 'aria-label': '关闭',
						onClick: () => archiveSetOpen(false)
					}, '✕')
				),
				h2('div', { className: 'buxu-archive-tools' },
					h2('input', {
						className: 'buxu-archive-search', type: 'text', placeholder: '搜索归档会话…',
						value: query, 'aria-label': '搜索归档会话',
						onChange: (e) => setQuery(e && e.target ? e.target.value : '')
					})
				),
				body,
				h2('div', { className: 'buxu-archive-foot' },
					h2('span', null, '点击行打开 · hover 出操作'),
					h2('span', null, ready ? String(rows.length) : (notice || '·'))
				)
			)
		}

		/* 2026-11-09 移除「官方右键菜单加项」：真机截图确认官方菜单本来就有
		   复制 Session ID 一项，我们加的那项功能重复、无图标、样式不齐，
		   反而显外挂。官方菜单已有归档/取消归档，A2 浮层也自带全部操作，
		   这个 Legacy 槽没有需要补的东西，不留占位。 */


		/* ================================================================
		 * 配置层（2026-11-05 引入 configForms）
		 *
		 * 值来自服务端 lib/index.js 的 Config schema，经 DSH 设置文档持久化。
		 * 拿不到服务（旧版/降级）时一律回落 GEO_DEFAULTS + 内置色板，
		 * 主题照常工作 —— 配置是增强，不是依赖。
		 * ================================================================ */
		/** Host 配置入口 ID：必须与 cordis.patch.yml 的 id 一致，不是 npm 包名。 */
		const SETTINGS_NS = 'ui-theme-buxu'

		/** 当前配置快照（字段见 lib/index.js 的 BuxuSettingsFields）。 */
		let buxuSettings = {}

		/**
		 * 当前配置表单（`ctx.configForms.get(ns)` 拿到的 scope）。
		 * 写设置必须经过它：`form.set(field, value)` 是官方唯一的持久化入口。
		 * 为 null 表示宿主没提供 form（旧版/降级）→ 设置只在内存里生效，不报错。
		 */
		let buxuForm = null

		/** 配置表单状态：对象存在不代表入口已服务、可写或已加载完成。 */
		let buxuFormStatus = { status: 'unavailable', writable: false, message: '配置服务尚未连接，当前改动仅作临时预览。' }
		const SETTINGS_LISTENERS = new Set()
		let settingsOperationSeq = 0

		function configStatus() { return buxuFormStatus }
		function configWritable() {
			const status = configStatus()
			return !!buxuForm && status.status === 'ready' && status.writable === true
		}
		function notifySettingsListeners() {
			for (const fn of SETTINGS_LISTENERS) {
				try { fn() } catch (e) { /* 单个订阅者不能阻断其他入口 */ }
			}
		}
		function subscribeSettings(fn) {
			SETTINGS_LISTENERS.add(fn)
			return () => SETTINGS_LISTENERS.delete(fn)
		}
		function readFormSnapshot() {
			if (!buxuForm || typeof buxuForm.getSnapshot !== 'function') return null
			try {
				const snapshot = buxuForm.getSnapshot()
				return snapshot && typeof snapshot === 'object' ? snapshot : null
			} catch (e) { return null }
		}

		/** 内容列宽度重算入口，由 'content width auto' effect 注册。 */
		let contentWidthReeval = null

		/** 取配置；拿不到就返回默认值。 */
		function settingsValue() {
			return buxuSettings && typeof buxuSettings === 'object' ? buxuSettings : {}
		}

		/* ---- 配色持久化双保险（2026-11-07）----
		   事故：冷启后 configForms 快照缺 palette 字段（探针实证
		   `effect:init palette=undefined`），read() 回落到 slate2 → 界面跳回石墨1。
		   根因是 form.set('palette', ...) 的写入未被持久化 / 服务端返回缺字段默认快照。
		   这里把用户**主动选择**的 palette 同步写一份 localStorage 兜底，
		   冷启 read() 时若服务端值非法/缺失，优先用这份备份填回。
		   只存 palette 一个字符串，不碰其它配置；所有读写都 try/catch。 */
		const PALETTE_BAK_KEY = 'dsh-theme-buxu.palette-backup'
		function readPaletteBackup() {
			try {
				const v = window.localStorage.getItem(PALETTE_BAK_KEY)
				return (v && hasPalette(v)) ? v : null
			} catch (e) { return null }
		}
		function writePaletteBackup(id) {
			if (!hasPalette(id)) return
			try { window.localStorage.setItem(PALETTE_BAK_KEY, id) } catch (e) { /* 忽略 */ }
		}
		/** 判断一次 applySettings 是否来自「用户主动换配色」，据此决定是否写备份。 */
		function isUserPaletteChoice(source) {
			return typeof source === 'string' && (
				source.indexOf('switchPalette:') === 0 ||
				source.indexOf('settings:patch:palette') >= 0
			)
		}

		/** 总开关快捷判定：关闭时所有 effect 都必须跳过工作，
		    否则 teardown 刚清掉的行内样式会被 observer 立刻写回来。 */
		function themeEnabled() {
			return settingsValue().enabled !== false
		}


		/**
		 * 应用一次配置：几何 + 色板 + 重绘。所有设置改动最终都汇到这里。
		 * @param {object} s 配置对象
		 * @param {string} source 调用来源（仅诊断用）
		 */
		function applySettings(s, source) {
			buxuSettings = s && typeof s === 'object' ? s : {}
			/* 用户主动选配色时立刻备份：不等 form.set 的异步结果，
			   即使服务端写入被拒/冷启丢字段，本地这份也能把选择找回来。 */
			if (isUserPaletteChoice(source)) {
				try { writePaletteBackup(buxuSettings.palette) } catch (e) { /* 忽略 */ }
			}
			applyGeometryFromSettings(buxuSettings)
			notifySettingsListeners()
			applyThemeTokens('applySettings:' + (source || '?'))
			/* 内容列宽度的上限/跟随开关不体现在 CSS 里，
			   必须让那个 effect 重新算一次（它是副作用式的，没有声明式依赖）。 */
			if (typeof contentWidthReeval === 'function') {
				try { contentWidthReeval() } catch (e) { /* 忽略 */ }
			}
		}


		/** 色底上的前景与浅底上的文字分开计算，默认橙色不再一律配白字。 */
		function accentForeground(hex) {
			const match = typeof hex === 'string' && hex.match(/^#([0-9a-f]{6})$/i)
			if (!match) return '#FFFFFF'
			const n = parseInt(match[1], 16)
			const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
				const c = v / 255
				return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
			})
			const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
			return luminance > 0.35 ? '#161616' : '#FFFFFF'
		}

		/* ================================================================
		 * 色板后处理：在「基础色板」上叠加用户偏好
		 *
		 * 用户只调两个高层旋钮，不逐个改 46 个颜色：
		 *   accent  强调色 —— 直接替换 accent 键
		 *   tone    灰阶倾向 —— cool/warm 给中性灰加极轻微色偏
		 *
		 * 这样色板本身保持纯净（作者给什么就是什么），
		 * 用户偏好作为一层薄薄的覆盖，且随时可撤销回「原色」。
		 * ================================================================ */
		const TONE_TINT = {
			neutral: null,
			cool: { r: 0, g: 4, b: 12 },   // 偏冷：蓝多一点
			warm: { r: 10, g: 3, b: -6 }   // 偏暖：红多一点、蓝少一点
		}

		const TINTABLE = ['bgBase', 'bg1', 'bg2', 'bg3', 'sidebar', 'composer',
			'bubble', 'right', 'card', 'select', 'hover', 'panelEdge', 'cardBorder']

		/** 给 #RRGGBB 加偏移，保持饱和度和亮度不被压爆。 */
		function shiftHex(hex, d) {
			if (typeof hex !== 'string' || hex[0] !== '#' || hex.length !== 7) return hex
			const n = parseInt(hex.slice(1), 16)
			const clamp = (v) => Math.max(0, Math.min(255, v))
			const r = clamp(((n >> 16) & 255) + d.r)
			const g = clamp(((n >> 8) & 255) + d.g)
			const b = clamp((n & 255) + d.b)
			return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase()
		}

		/**
		 * 在基础色板上应用 accent / tone。
		 * @param {object} base 色板 colors
		 * @param {object} s 配置
		 * @returns {object} 新色板（不改原对象）
		 */
		function colorize(base, s) {
			const out = Object.assign({}, base)
			const tone = s && s.tone
			const d = TONE_TINT[tone]
			if (d) {
				for (const k of TINTABLE) {
					if (out[k]) out[k] = shiftHex(out[k], d)
				}
			}
			if (s && typeof s.accent === 'string' && /^#[0-9A-Fa-f]{6}$/.test(s.accent)) {
				out.accent = s.accent
			}
			return out
		}


		/* ================================================================
		 * 设置页 UI（2026-11-05）
		 *
		 * 两大类可选项都带**缩略图**，让用户「看到再选」而不是猜：
		 *   · 配色方案：每套色板一张 SVG 线框图（用该色板的真实颜色画）
		 *   · 深浅模式：跟随系统 / 深色 / 浅色，每项用当前色板的对应 scheme 预览
		 *
		 * 缩略图为什么用 SVG 而不是图片文件：
		 *   桌面端插件读不到外部资源（require.asset 返回原串、
		 *   /plugins/.../assets/ 路由 404，均已实测），
		 *   而 SVG 线框图是代码画的，零资源依赖、改色板即改预览。
		 * 参考官方 skin 系统的 preview/*.svg 做法（同一套几何比例）。
		 * ================================================================ */

		const PREVIEW_W = 152
		const PREVIEW_H = 96

		/**
		 * 画一张**完整真实页面**缩略图（2026-11-06 重做）。
		 *
		 * 用户要求：不要抽象线框，要像一张缩放后的真实窗口截图：
		 *   · 顶栏（logo + 会话标题 + 右侧工具）
		 *   · 左侧栏有真实数据：logo 行、新会话按钮、工作区分组、
		 *     多条会话列表（图标 + 标题 + 时间）、底部用户行
		 *   · 主内容区 = 新建会话初始页（居中欢迎标题 + 说明 + 输入卡）
		 *   · **不画右侧栏、不留右侧空白**，主区一直铺到右边缘
		 *   · 全部用该色板的真实颜色；full/plain 布局差异也体现
		 *
		 * @param {object} colors 色板 colors
		 * @param {string} layout 'full' | 'plain'
		 */
		function PalettePreview(colors, layout) {
			const c = colors || {}
			const plain = layout === 'plain'
			const col = (k, fb) => c[k] || fb
			/* 内部用 480x300 坐标系画，靠 viewBox 等比缩到 152x96 */
			const W = 480, H = 300
			const SIDE = 132          // 左侧栏宽
			const TOP = 28            // 顶栏高
			const rect = (x, y, w, h, fill, extra) =>
				h2('rect', Object.assign({ x, y, width: w, height: h, fill }, extra || {}))
			const line = (x, y, w, h, fill, extra) => rect(x, y, w, h, fill, Object.assign({ rx: 3 }, extra || {}))
			const dot = (cx, cy, r0, fill) => h2('circle', { cx, cy, r: r0, fill })
			const edge = col('panelEdge', '#3A3A3A')
			const border = col('cardBorder', '#414141')
			const txt = col('text', '#D4D4D4')
			const txt2 = col('text2', '#B4B4B4')
			const txt3 = col('text3', '#939393')
			const proj = col('project', '#A0A0A0')
			const sel = col('select', '#414141')
			const hover = col('hover', '#333333')
			const accent = col('accent', '#68798C')

			/* ---- 会话列表行（有数据的左侧栏）---- */
			const listRows = []
			const rowDefs = [
				{ y: 96, active: true, w1: 70, w2: 30 },
				{ y: 122, active: false, w1: 58, w2: 24 },
				{ y: 148, active: false, w1: 76, w2: 30 },
				{ y: 174, active: false, w1: 52, w2: 26 },
				{ y: 200, active: false, w1: 66, w2: 22 },
				{ y: 226, active: false, w1: 60, w2: 28 }
			]
			for (const d of rowDefs) {
				listRows.push(
					/* 行底（选中行用 select 色） */
					rect(10, d.y - 3, SIDE - 20, 22,
						d.active ? sel : 'transparent', { rx: 4 }),
					/* 行首小图标（会话菱形/文件） */
					rect(16, d.y + 3, 7, 7, d.active ? accent : txt3, { rx: 1.5, transform: 'rotate(45 19.5 ' + (d.y + 6.5) + ')' }),
					/* 主标题 */
					line(28, d.y, d.w1, 6, d.active ? txt : txt2, { rx: 3 }),
					/* 右侧时间 */
					line(SIDE - 12 - d.w2, d.y + 9, d.w2, 4, txt3, { rx: 2 }),
					/* 副标题 */
					line(28, d.y + 9, d.w1 - 14, 4, txt3, { rx: 2 })
				)
			}

			/* ---- 主内容区：新建会话初始页（铺满到右边，无右栏）---- */
			const mainX = SIDE
			const mainW = W - SIDE
			const mainCenter = mainX + mainW / 2
			const welcome = [
				/* 居中品牌小标记 */
				dot(mainCenter, 96, 7, accent),
				/* 欢迎大标题（两条） */
				line(mainCenter - 62, 112, 124, 9, txt, { rx: 4 }),
				line(mainCenter - 40, 126, 80, 7, txt2, { rx: 3 }),
				/* 说明文字 */
				line(mainCenter - 70, 142, 140, 5, txt3, { rx: 2 }),
				/* 三个快捷入口卡片 */
				rect(mainCenter - 96, 160, 58, 30, col('card', '#1E1E1E'), { rx: 5, stroke: border, strokeWidth: 1 }),
				rect(mainCenter - 29, 160, 58, 30, col('card', '#1E1E1E'), { rx: 5, stroke: border, strokeWidth: 1 }),
				rect(mainCenter + 38, 160, 58, 30, col('card', '#1E1E1E'), { rx: 5, stroke: border, strokeWidth: 1 }),
				line(mainCenter - 88, 170, 38, 4, txt2, { rx: 2 }),
				line(mainCenter - 21, 170, 38, 4, txt2, { rx: 2 }),
				line(mainCenter + 46, 170, 38, 4, txt2, { rx: 2 }),
				line(mainCenter - 88, 178, 26, 3, txt3, { rx: 1.5 }),
				line(mainCenter - 21, 178, 26, 3, txt3, { rx: 1.5 }),
				line(mainCenter + 46, 178, 26, 3, txt3, { rx: 1.5 }),
				/* 底部输入卡 */
				rect(mainX + 24, H - 60, mainW - 48, 38, col('composer', '#2B2B2B'),
					Object.assign({ rx: 9 }, plain ? {} : { stroke: border, strokeWidth: 1 })),
				line(mainX + 38, H - 44, 120, 5, txt3, { rx: 2.5 }),
				/* 输入卡右侧发送按钮 */
				rect(mainX + mainW - 62, H - 48, 26, 20, accent, { rx: 6 })
			]

			/* ---- 组装完整窗口 ---- */
			return h2('svg', {
				width: PREVIEW_W, height: PREVIEW_H,
				viewBox: '0 0 ' + W + ' ' + H,
				style: { display: 'block', borderRadius: '4px' }
			},
				/* 整窗底：侧栏色（窗口四角楔形） */
				rect(0, 0, W, H, col('sidebar', '#2B2B2B')),
				/* 顶栏 */
				rect(0, 0, W, TOP, col('sidebar', '#2B2B2B')),
				/* 顶栏分隔线 */
				rect(0, TOP - 1, W, 1, edge),
				/* 顶栏左侧 logo 小方块 */
				rect(10, 8, 12, 12, accent, { rx: 3 }),
				/* 顶栏会话标题 */
				line(30, 11, 52, 6, txt, { rx: 3 }),
				/* 顶栏右侧工具按钮 */
				rect(W - 56, 8, 18, 12, hover, { rx: 3 }),
				rect(W - 34, 8, 18, 12, hover, { rx: 3 }),
				rect(W - 14, 8, 8, 12, hover, { rx: 2 }),

				/* 左侧栏底色 */
				rect(0, TOP, SIDE, H - TOP, col('sidebar', '#2B2B2B')),
				/* 左栏右缘细线 */
				rect(SIDE - 1, TOP, 1, H - TOP, edge),
				/* 新会话按钮 */
				rect(10, TOP + 8, SIDE - 20, 20, col('composer', '#2B2B2B'), { rx: 5, stroke: border, strokeWidth: 1 }),
				line(24, TOP + 15, 46, 5, txt, { rx: 2.5 }),
				/* 工作区分组标题 + 右侧小图标 */
				line(12, TOP + 40, 34, 5, proj, { rx: 2.5 }),
				rect(SIDE - 22, TOP + 39, 8, 6, txt3, { rx: 1.5 }),
				/* 会话列表（有数据） */
				listRows,
				/* 左栏底部用户行 */
				rect(0, H - 24, SIDE, 24, col('sidebar', '#2B2B2B')),
				rect(10, H - 19, 12, 12, col('select', '#414141'), { rx: 6 }),
				line(28, H - 16, 44, 5, txt2, { rx: 2.5 }),

				/* 主内容区底：plain 大圆角铺满 / full 小圆角 + 6px 留边 + 描边 */
				rect(mainX + (plain ? 0 : 2), TOP + (plain ? 0 : 2),
					mainW - (plain ? 0 : 4), H - TOP - (plain ? 0 : 4),
					col('bg1', '#161616'),
					Object.assign({ rx: plain ? 12 : 4 }, plain ? {} : { stroke: edge, strokeWidth: 1 })),
				/* full 布局顶部 6px 结构条 */
				plain ? null : rect(mainX + 2, TOP + 2, mainW - 4, 3, edge),
				/* 主区工具行（会话标题 + 模式） */
				line(mainX + 16, TOP + 12, 46, 5, txt, { rx: 2.5 }),
				line(mainX + 68, TOP + 12, 30, 4, txt3, { rx: 2 }),

				/* 新建会话初始页内容 */
				welcome
			)
		}

		/** 一张可选卡片（缩略图 + 标题 + 选中态）。 */
		function ChoiceCard(props) {
			const { selected, title, subtitle, onSelect, children, disabled } = props
			const [hover, setHover] = React2.useState(false)
			const style = {
				position: 'relative',
				display: 'flex',
				flexDirection: 'column',
				gap: '6px',
				padding: '6px',
				borderRadius: '8px',
				cursor: disabled ? 'default' : 'pointer',
				opacity: disabled ? 0.45 : 1,
				border: '2px solid ' + (selected
					? 'var(--buxu-user-accent)'
					: (hover ? 'var(--dsw-alias-border-l2)' : 'transparent')),
				background: hover && !disabled ? 'var(--dsw-alias-interactive-bg-hover)' : 'transparent',
				transition: 'border-color .12s, background .12s'
			}
			return h2(
				'div',
				{
					style,
					role: 'button',
					tabIndex: disabled ? -1 : 0,
					'aria-disabled': !!disabled,
					'aria-pressed': !!selected,
					onClick: disabled ? undefined : onSelect,
					onKeyDown: (e) => {
						if (disabled) return
						if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect && onSelect() }
					},
					onMouseEnter: () => setHover(true),
					onMouseLeave: () => setHover(false)
				},
				children,
				h2('div', { style: { display: 'flex', flexDirection: 'column', gap: '1px', paddingLeft: '2px' } },
					h2('span', { style: { fontSize: '12px', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, title),
					subtitle ? h2('span', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-tertiary)' } }, subtitle) : null
				),
				selected
					? h2('span', {
						style: {
							position: 'absolute', top: '10px', right: '10px',
							width: '16px', height: '16px', borderRadius: '50%',
							background: 'var(--buxu-user-accent)',
							color: 'var(--buxu-user-accent-contrast)', fontSize: '11px', lineHeight: '16px',
							textAlign: 'center', fontWeight: 700
						}
					}, '✓')
					: null
			)
		}

		/**
		 * 开关样式控件（2026-11-06）：替代原生 checkbox。
		 * 用真实 <button role="switch" aria-checked>，键盘可达、
		 * 点击整条轨道切换；视觉是「轨道 + 滑块」而非勾选框。
		 */
		function Toggle({ checked, onChange, label, dataAttr }) {
			const track = {
				position: 'relative', display: 'inline-flex', alignItems: 'center',
				width: '36px', height: '20px', flex: 'none',
				borderRadius: '10px', cursor: 'pointer', padding: '0',
				border: '1px solid ' + (checked
					? 'var(--buxu-user-accent)'
					: 'var(--dsw-alias-border-l2)'),
				background: checked
					? 'var(--buxu-user-accent)'
					: 'var(--dsw-alias-bg-layer-2)',
				transition: 'background-color 140ms ease, border-color 140ms ease',
				boxSizing: 'border-box'
			}
			const knob = {
				position: 'absolute', top: '2px',
				left: checked ? '18px' : '2px',
				width: '14px', height: '14px', borderRadius: '50%',
				background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
				transition: 'left 140ms ease', pointerEvents: 'none'
			}
			const btnProps = {
				type: 'button', role: 'switch', 'aria-checked': checked,
				'aria-label': label, style: track,
				onClick: () => onChange(!checked)
			}
			if (dataAttr) btnProps[dataAttr] = ''
			const toggle = h2('button', btnProps, h2('span', { style: knob }))
			return h2('label', {
				style: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', cursor: 'pointer' }
			}, toggle, h2('span', null, label))
		}

		/**
		 * 设置页分区容器（2026-11-07 用户要求「明确区域分区」）。
		 * 每个大区有编号 + 标题 + 一句作用说明，内容放在浅底卡片里，
		 * 大区之间有分隔线，用户一眼能看出各区块负责什么。
		 */
		function Section({ number, title, desc, children }) {
			return h2('section', {
				'aria-label': title,
				style: {
					display: 'flex', flexDirection: 'column', gap: '10px',
					paddingTop: '4px'
				}
			},
				h2('div', { style: { display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', rowGap: '4px' } },
					h2('span', {
						style: {
							display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
							minWidth: '20px', height: '20px', padding: '0 5px', borderRadius: '5px',
							background: 'var(--buxu-user-accent)',
							color: 'var(--buxu-user-accent-contrast)', fontSize: '11px', fontWeight: 700, flex: 'none'
						}
					}, String(number)),
					h2('h2', { style: { fontSize: '14px', fontWeight: 700, color: 'var(--dsw-alias-label-primary)', margin: 0 } }, title),
					h2('span', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-tertiary)' } }, '·  ' + desc)
				),
				h2('div', {
					style: {
						display: 'flex', flexDirection: 'column', gap: '12px',
						padding: '14px', borderRadius: '10px',
						background: 'var(--dsw-alias-bg-layer-1)',
						border: '1px solid var(--dsw-alias-border-l1)'
					}
				}, children)
			)
		}
		/** 分区内的子组标题（用于大区里再分小块）。 */
		function GroupTitle({ label, desc }) {
			return h2('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
				h2('div', { style: { fontSize: '12px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, label),
				desc ? h2('div', { style: { fontSize: '10px', color: 'var(--dsw-alias-label-tertiary)' } }, desc) : null
			)
		}

		function BuxuSettingsPage() {
			const [s, setS] = React2.useState(() => Object.assign({}, settingsValue()))
			const [status, setStatus] = React2.useState(configStatus)
			/* 所有配置入口共用同一份 store；外部修改也会更新当前页面。 */
			React2.useEffect(() => subscribeSettings(() => {
				setS(Object.assign({}, settingsValue()))
				setStatus(configStatus())
			}), [])

			/** 修改一组字段；异步结果由全局操作代次裁决，不让旧请求回滚新输入。 */
			const patch = (kv) => {
				persistSettings(kv, 'settings:patch:' + Object.keys(kv).join(',')).catch(() => {})
			}

			const rows = []

			/* ================= 1. 主题总开关 ================= */
			rows.push(
				h2(Section, { key: 'sec-master', number: 1, title: '主题总开关', desc: '一键启用 / 停用整套个性化' },
					h2('div', { style: subtitleStyle },
						'关闭后移除本插件的全部视觉与头像定制，界面回到 DSH 官方原生皮肤（即时生效，无需重启）。'),
					h2(Toggle, {
						checked: s.enabled !== false,
						onChange: (v) => patch({ enabled: v }),
						label: s.enabled === false ? '已关闭（原生皮肤）' : '已启用',
						dataAttr: 'data-buxu-enabled'
					})
				)
			)

			/* ================= 2. 整体配色 =================
			   色板自带深浅与布局；强调色/灰阶是局部旋钮。合并成一个大区，
			   避免和「进度条配色」混淆（后者只管那一根滑块）。 */
			const paletteKeys = paletteOrder()
			const activePid = hasPalette(s.palette) ? s.palette : DEFAULT_PALETTE_ID
			const disabled = s.enabled === false
			rows.push(
				h2(Section, { key: 'sec-palette', number: 2, title: '整体配色', desc: '决定整个界面的深浅与底色调' },
					h2(GroupTitle, { label: '配色方案', desc: '每套色板自带深浅与布局观感，点选即切换。' }),
					h2('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
						paletteKeys.map((k) =>
							h2(ChoiceCard, {
								key: k,
								selected: activePid === k,
								disabled,
								title: (PALETTES[k].label && PALETTES[k].label.zh) || k,
								subtitle: (PALETTES[k].scheme === 'dark' ? '深色' : '浅色') +
									(PALETTES[k].layout === 'plain' ? ' · 原生布局' : ' · 精修布局'),
								onSelect: () => patch({ palette: k })
							}, PalettePreview(colorize(PALETTES[k].colors, s), PALETTES[k].layout))
						),
						h2(ChoiceCard, {
							disabled: true, title: '更多配色', subtitle: '后续版本提供', onSelect: () => {}
						}, h2('div', {
							style: {
								width: PREVIEW_W + 'px', height: PREVIEW_H + 'px',
								borderRadius: '4px', border: '1px dashed var(--dsw-alias-border-l2)',
								display: 'flex', alignItems: 'center', justifyContent: 'center',
								color: 'var(--dsw-alias-label-tertiary)', fontSize: '20px'
							}
						}, '+'))
					),
					h2(GroupTitle, { label: '强调色与灰阶', desc: '强调色只作用于发送键、页签下划线等局部元素；不改整体框架配色。' }),
					h2('div', { style: { display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' } },
						h2('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' } },
							'强调色',
							h2('input', {
								type: 'color',
								value: /^#[0-9A-Fa-f]{6}$/.test(s.accent || '') ? s.accent : '#F56619',
								onChange: (e) => patch({ accent: e.target.value }),
								style: { width: '36px', height: '26px', border: 'none', background: 'none', cursor: 'pointer' }
							})
						),
						h2('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' } },
							'灰阶',
							h2('select', {
								value: s.tone || 'neutral',
								onChange: (e) => patch({ tone: e.target.value }),
								style: selectStyle
							},
								h2('option', { value: 'neutral' }, '中性'),
								h2('option', { value: 'cool' }, '偏冷'),
								h2('option', { value: 'warm' }, '偏暖')
							)
						)
					)
				)
			)

			/* ================= 3. 进度条配色 =================
			   8 套预置分「经典 / 冷色自然」两组 + 自定义 4 色取色器。
			   只影响「推理等级」那一根滑块，与上面的整体配色互不干扰。 */
			const activeGrad = (s.effortGradient && effortGradientById(s.effortGradient).id === s.effortGradient)
				? s.effortGradient : DEFAULT_EFFORT_GRADIENT
			const customColors = (Array.isArray(s.effortCustomColors) && s.effortCustomColors.length === 4)
				? s.effortCustomColors : DEFAULT_EFFORT_CUSTOM
			const gradCard = (g) =>
				h2('button', {
					key: g.id, type: 'button',
					'data-buxu-gradient': g.id,
					'aria-pressed': activeGrad === g.id,
					onClick: () => patch({ effortGradient: g.id }),
					style: {
						display: 'flex', flexDirection: 'column', gap: '5px',
						width: '116px', padding: '8px', borderRadius: '8px',
						border: '2px solid ' + (activeGrad === g.id
							? 'var(--buxu-user-accent)' : 'var(--dsw-alias-border-l2)'),
						background: 'var(--dsw-alias-bg-layer-2)',
						cursor: 'pointer', textAlign: 'left'
					}
				},
					h2('div', {
						style: {
							width: '100%', height: '14px', borderRadius: '7px',
							background: 'linear-gradient(90deg, ' + activeCssStops(g, s) + ')',
							border: '1px solid rgba(0,0,0,.12)'
						}
					}),
					h2('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-primary)' } }, g.label),
					h2('div', { style: { fontSize: '10px', color: 'var(--dsw-alias-label-tertiary)', lineHeight: '1.3' } }, g.desc)
				)
			/* 4 套预置（不同维度）+ 自定义，平铺；粒子是独立开关，不再绑在方案上。 */
			const presetCards = h2('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
				EFFORT_GRADIENTS.filter((g) => !g.custom).map(gradCard))
			const stopsLabel = ['起点 0%', '中段 34%', '中段 67%', '终点 100%']
			const customBlock = h2('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
				h2(GroupTitle, { label: '自定义渐变', desc: '挑 4 个颜色配一套专属渐变；改动后自动切换到「自定义」方案。' }),
				h2('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' } },
					customColors.map((c, i) =>
						h2('label', { key: i, style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' } },
							stopsLabel[i],
							h2('input', {
								type: 'color',
								value: /^#[0-9A-Fa-f]{6}$/.test(c) ? c : DEFAULT_EFFORT_CUSTOM[i],
								onChange: (e) => {
									const next = customColors.slice()
									next[i] = e.target.value
									patch({ effortCustomColors: next, effortGradient: 'custom' })
								},
								style: { width: '32px', height: '24px', border: 'none', background: 'none', cursor: 'pointer' }
							})
						)
					),
					gradCard(EFFORT_GRADIENTS.find((g) => g.id === 'custom'))
				)
			)
			rows.push(
				h2(Section, { key: 'sec-gradient', number: 3, title: '推理强度条配色', desc: '只影响模型菜单中的推理等级滑块' },
					h2('div', { style: subtitleStyle },
						'4 套预置（不同维度，默认单色蓝阶）+ 自定义。下方「气泡粒子」是独立开关，任意配色都能叠加。'),
					h2(GroupTitle, { label: '预置方案', desc: '单色明度 / 暖色升温 / 冷暖过渡 / 邻近冷色' }),
					presetCards,
					customBlock,
					h2('div', { style: { paddingTop: '10px', borderTop: '1px solid var(--dsw-alias-border-l1)' } },
						h2(Toggle, {
							checked: s.effortParticles === true,
							onChange: (v) => patch({ effortParticles: v }),
							label: '气泡粒子效果（可随任意配色叠加）',
							dataAttr: 'data-buxu-particles-toggle'
						}),
						h2('div', { style: { fontSize: '10px', color: 'var(--dsw-alias-label-tertiary)', marginTop: '4px' } },
							'开启后在任意配色上叠加轻微气泡颗粒；尊重系统「减少动态效果」设置，默认关闭。')
					)
				)
			)

			/* ---------- 几何调节 ---------- */
			const sliders = [
				['sidebarWidth', '侧栏宽度', 264, 420, 1, 'px'],
				['sidebarRowHeight', '侧栏行高', 24, 40, 1, 'px'],
				['avatarSize', '头像尺寸', 18, 40, 1, 'px'],
				['avatarRadius', '头像圆角', 0, 50, 1, '%'],
				['contentMaxWidth', '内容列最大宽度', 680, 1600, 10, 'px']
			]
			/* 设置字段名 → GEO 里的别名（名字不一致的几个） */
			const GEO_ALIAS = {
				sidebarWidth: 'sidebarW',
				sidebarRowHeight: 'rowH',
				avatarSize: 'avatarSize',
				avatarRadius: 'avatarR'
			}
			/* 有些滑块字段不属于 GEO（比如内容列最大宽度），
			   GEO_DEFAULTS 里没有它 —— 必须单独给默认值，
			   否则会显示成 undefinedpx（用户实测反馈）。 */
			const SLIDER_FALLBACK = {
				contentMaxWidth: 1400
			}
			const fallbackOf = (key) => {
				if (SLIDER_FALLBACK[key] !== undefined) return SLIDER_FALLBACK[key]
				const alias = GEO_ALIAS[key] || key
				return GEO_DEFAULTS[alias] !== undefined ? GEO_DEFAULTS[alias] : GEO_DEFAULTS[key]
			}
			const sliderValue = (key) => (typeof s[key] === 'number' ? s[key] : fallbackOf(key))
			rows.push(
				h2(Section, { key: 'sec-geometry', number: 4, title: '布局与尺寸', desc: '面板、侧栏、气泡与头像的精细尺寸' },
					h2('div', { style: subtitleStyle }, '拖动后立即生效，设置自动保存。几何调节仅作用于本插件自有元素，非官方契约，官方升级后可能需复核。'),
					sliders.map(([key, label, min, max, step, unit]) =>
						h2('label', { key, style: sliderRow },
							h2('span', { style: { width: '120px', flex: 'none', fontSize: '12px' } }, label),
							h2('input', {
								type: 'range', min, max, step,
								value: sliderValue(key),
								onChange: (e) => patch({ [key]: Number(e.target.value) }),
								style: { flex: '1', accentColor: 'var(--buxu-user-accent)' }
							}),
							h2('span', { style: { width: '54px', textAlign: 'right', fontSize: '11px', color: 'var(--dsw-alias-label-tertiary)' } },
								sliderValue(key) + unit)
						)
					),
					/* 内容列是否跟随窗口（关掉 = 完全用官方默认 920 上限） */
					h2(Toggle, {
						checked: s.contentFollowWindow !== false,
						onChange: (v) => patch({ contentFollowWindow: v }),
						label: '内容列宽度跟随窗口缩放'
					})
				)
			)

			/* ================= 5. 对话头像 =================
			   与「启用主题」总开关分开：总开关关 = 全部回原生；
			   这里只控制对话头像，不影响配色/布局等其它主题功能。 */
			rows.push(
				h2(Section, { key: 'sec-avatars', number: 5, title: '对话头像', desc: '独立的头像开关与自定义图片' },
					h2('div', { style: subtitleStyle }, '支持 PNG / JPEG / WebP，最大 8 MB、1600 万像素；上传后可拖动调整正方形内的显示位置，确认后保存。'),
					h2('div', { style: { marginBottom: '4px' } },
						h2(Toggle, {
							checked: s.avatarsEnabled !== false,
							onChange: (v) => patch({ avatarsEnabled: v }),
							label: '显示对话头像',
							dataAttr: 'data-buxu-avatars-toggle'
						})
					),
					h2(AvatarRow, { kind: 'assistant' }),
					h2(AvatarRow, { kind: 'user' })
				)
			)

			/* ================= 6. 高级 ================= */
			rows.push(
				h2(Section, { key: 'sec-advanced', number: 6, title: '高级', desc: '兼容性与重置' },
					h2(GroupTitle, { label: '兼容性', desc: 'DSH 升级后界面结构可能变化，插件会自动暂停部分布局定制。' }),
					status.degraded ? h2('div', { role: 'status', style: { fontSize: '11px', color: 'var(--dsw-alias-state-warn-label, #FF8A30)', lineHeight: '1.5' } }, status.degradeMessage) : null,
					h2(Toggle, {
						checked: s.contractGuard !== false,
						onChange: (v) => patch({ contractGuard: v }),
						label: '结构变化时自动降级布局定制'
					}),
					h2('div', { key: 'reset', style: { paddingTop: '10px', borderTop: '1px solid var(--dsw-alias-border-l1)' } },
						h2('button', {
							type: 'button',
							disabled: status.pending,
							title: '恢复主题、配色、几何、推理条和自定义头像的默认值',
							onClick: () => {
								if (status.pending) return
								if (window.confirm('恢复全部默认？这会重置主题设置、几何尺寸、推理条样式和自定义头像。')) {
									patch(DEFAULTS_FOR_UI())
								}
							},
							style: {
								font: 'inherit', fontSize: '12px', padding: '6px 14px', borderRadius: '6px',
								cursor: status.pending ? 'wait' : 'pointer', border: '1px solid var(--dsw-alias-border-l2)',
								background: 'transparent', color: 'var(--dsw-alias-label-primary)'
							}
						}, '恢复全部默认')
					)
				)
			)

			const statusNode = h2('div', {
				role: 'status',
				'aria-live': 'polite',
				style: {
					padding: '10px 12px', borderRadius: '7px', fontSize: '11px', lineHeight: '1.6',
					border: '1px solid var(--dsw-alias-border-l1)',
					background: status.pending ? 'var(--dsw-alias-bg-layer-2)' : 'transparent',
					color: status.error ? 'var(--dsw-alias-state-warn-label, #FF8A30)' : 'var(--dsw-alias-label-secondary)'
				}
			}, status.pending ? '正在保存设置…' : (status.error || (status.status === 'ready' && status.writable ? '设置会自动保存到 Host 配置。' : status.message || '配置尚未就绪，当前改动仅作临时预览。')))

			return h2('div', { style: { display: 'flex', flexDirection: 'column', gap: '22px', fontSize: '13px', paddingRight: '8px' } },
				statusNode,
				rows
			)
		}

		const sectionStyle = { display: 'flex', flexDirection: 'column', gap: '8px' }
		const titleStyle = { fontSize: '13px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' }
		const subtitleStyle = { fontSize: '11px', color: 'var(--dsw-alias-label-tertiary)', marginBottom: '2px' }
		const selectStyle = {
			font: 'inherit', fontSize: '12px', padding: '4px 8px', borderRadius: '6px',
			border: '1px solid var(--dsw-alias-border-l2)',
			background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-primary)'
		}
		const sliderRow = { display: 'flex', alignItems: 'center', gap: '10px' }

		/**
		 * 错误边界：设置页/面板渲染抛错时，把错误信息**画在面板上**，
		 * 而不是让 React 卸载整棵子树变成白屏。
		 *
		 * 为什么要这个：2026-11-05 设置页白屏排查了很久，
		 * 因为 React 捕获渲染异常后什么都不显示，只能靠离线 harness 复现。
		 * 有了它，线上任何渲染异常都会自曝堆栈。
		 */
		class BuxuBoundary extends React2.Component {
			constructor(props) {
				super(props)
				this.state = { err: null }
			}
			static getDerivedStateFromError(err) {
				return { err }
			}
			componentDidCatch(err, info) {
				console.error('[dsh-theme-buxu] 渲染失败:', err, info)
			}
			render() {
				if (!this.state.err) return this.props.children
				const e = this.state.err
				return h2('div', {
					style: {
						padding: '14px 16px', margin: '8px 0', borderRadius: '6px',
						border: '1px solid #B4232C', background: 'rgba(180,35,44,0.08)',
						color: '#D9505A', fontFamily: 'Consolas, monospace', fontSize: '11px',
						whiteSpace: 'pre-wrap', lineHeight: '1.6'
					}
				},
					h2('div', { style: { fontWeight: 600, marginBottom: '6px' } }, '不虚 · 质肤 渲染出错'),
					String(e && e.stack || e)
				)
			}
		}

		/** 设置页「恢复默认」用的默认值（与服务端 schema 保持一致）。 */
		function DEFAULTS_FOR_UI() {
			return {
				/* 与 lib/index.js schema 一致 */
				enabled: true,
				/* 默认「质肤·石墨1」= slate2 */
				palette: 'slate2', accent: '#F56619', tone: 'neutral',
				panelRadius: 6, panelGutter: 6, topStrip: 6, toolbarHeight: 48,
				sidebarWidth: 268, sidebarRowHeight: 30, bubbleRadius: 14,
				contentMaxWidth: 1400, contentFollowWindow: true,
				avatarsEnabled: true, avatarSize: 26, avatarRadius: 12,
				assistantAvatar: '', userAvatar: '',
				effortGradient: DEFAULT_EFFORT_GRADIENT,
				effortCustomColors: DEFAULT_EFFORT_CUSTOM.slice(),
				effortParticles: false,
				contractGuard: true
			}
		}


		/* ================================================================
		 * 侧栏入口（2026-11-05，参照 dsh-xdpool 的实现）
		 *
		 * 官方两个 slot 配合：
		 *   sidebar.panellist  侧栏列表里的一行（带图标）
		 *   main               点开后占据主区域的内容（key 与行 id 对应）
		 *
		 * 为什么要做：设置页适合「调参数」，但配色/头像这种
		 * 「想边看边调」的东西，塞在设置对话框里每次都要进出。
		 * 侧栏入口给一个常驻的、占满主区的预览台。
		 *
		 * **图标**：官方 settings.section 不带 icon 字段，
		 * 而 sidebar.panellist 的渲染器会调用组件的 size 属性，
		 * 所以这里自己画一个 24x24 的 SVG（与 XD Pool 同构）。
		 * ================================================================ */

		/** 侧栏图标：一滴墨（呼应「质肤」= 质感 + 皮肤）。 */
		function BuxuIcon({ size }) {
			const edge = typeof size === 'number' && size > 0 ? size : 16
			return h2('svg', {
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 24 24',
				width: edge,
				height: edge,
				'aria-hidden': 'true',
				focusable: 'false'
			},
				h2('path', { d: 'M12 2.6c3.6 4.2 6.4 7.6 6.4 11a6.4 6.4 0 1 1-12.8 0c0-3.4 2.8-6.8 6.4-11z', fill: 'currentColor' }),
				h2('circle', { cx: '10.1', cy: '13.4', r: '1.25', fill: 'var(--dsw-alias-bg-layer-1, #161616)' })
			)
		}

		/**
		 * 主区域页面：把设置页的组件包进一个可滚动容器。
		 *
		 * **必须自己管滚动**：官方 .centerCol 是
		 *   display:flex; flex-direction:column; overflow:hidden
		 * slot 渲染进去没有自己的滚动条，内容一多就直接裁掉。
		 * （xdpool 的注释里记了同一个坑）
		 */
		function BuxuPanelPage() {
			return h2('div', {
				style: {
					flex: '1',
					minHeight: '0',
					overflowY: 'auto',
					overflowX: 'hidden',
					padding: '20px 24px 40px',
					display: 'flex',
					flexDirection: 'column'
				}
			},
				h2('div', {
					style: {
						maxWidth: '860px',
						width: '100%',
						margin: '0 auto',
						display: 'flex',
						flexDirection: 'column',
						gap: '20px'
					}
				},
					h2('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
						h2('span', {
							style: {
								width: '28px',
								height: '28px',
								borderRadius: '8px',
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								background: 'var(--dsw-alias-bg-layer-2)',
								color: 'var(--dsw-alias-label-primary)',
								flex: 'none'
							}
						}, h2(BuxuIcon, { size: 18 })),
						h2('span', { style: { fontSize: '15px', fontWeight: 600 } }, '不虚 · 质肤'),
						h2('span', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)' } }, 'Buxu Skin')
					),
					h2(BuxuBoundary, null, h2(BuxuSettingsPage, null))
				)
			)
		}

		function apply(ctx) {
			let media = null

			/* ---- 配置接入（2026-11-05）----
			   服务端 lib/index.js 已用 schemastery 声明 Config；
			   这里通过 ctx.configForms 读快照并订阅变化。
			   拿不到 configForms（旧版 DSH / 降级）时静默跳过，
			   主题用内置默认值照常工作 —— 配置是增强，不是依赖。 */
			ctx.effect(() => {
				let form = null
				try {
					form = ctx.configForms && ctx.configForms.get
						? ctx.configForms.get(SETTINGS_NS)
						: null
				} catch (e) { form = null }
				if (!form) return
				buxuForm = form
				const syncFormStatus = () => {
					const snap = readFormSnapshot()
					/* P1-5：合并式更新，保留 degraded / degradeMessage / disabledGroups。
					   旧版整块覆盖会让契约检查写进去的降级提示闪一下就消失。 */
					buxuFormStatus = Object.assign({}, buxuFormStatus, {
						status: snap && snap.status ? snap.status : 'unavailable',
						writable: !!(snap && snap.writable === true),
						message: snap && snap.status === 'ready' && snap.writable === true
							? '设置会自动保存到 Host 配置。'
							: 'Host 配置未连接或为只读，当前仅作临时预览，重启后可能不会保留。'
					})
				}
				syncFormStatus()
				notifySettingsListeners()

				/**
				 * 读配置快照，**与本地已确认状态合并**（2026-11-06 修复
				 * 「任务中皮肤自己换成石墨」）。
				 *
				 * 旧版直接 return snap.value，而 applySettings 是整体替换
				 * buxuSettings。若服务端在写盘/重载/配置重连的瞬间返回
				 * 未合并用户值的默认快照（schema 里 palette 默认 slate），
				 * subscribe 回调就会把用户选的配色冲掉，界面自己跳回石墨。
				 *
				 * 修法：
				 *   ① Object.assign 以服务端值为准、本地值兜底，避免字段丢失；
				 *   ② palette 必须是 PALETTES 里的合法 id；服务端给了无效值
				 *      （空 / 未合并的默认）时，优先保留本地已确认的选择；
				 *   ③ 本地也没有有效值时，才回落到 schema 默认 slate2。
				 * 这样任何中间态都不会把用户的选择冲掉。
				 */
				let unsubscribe = null
				try {
					unsubscribe = form.subscribe(() => {
						const status = configStatus()
						if (status.pending) {
							/* 本次写事务的完成回调负责裁决；旧订阅值不得覆盖新操作。 */
							notifySettingsListeners()
							return
						}
						syncFormStatus()
						applySettings(settingsFromSubscription(readFormSnapshot()), 'configForms:subscribe')
						/* 色板 scheme 是本插件的显示意图；订阅回读后重绘一次，保证
						   与官方 ThemePresenter 的后续 body 属性投影保持一致。 */
						applyThemeTokens('configForms:repaint')
					})
				} catch (e) { unsubscribe = null }

				applySettings(settingsFromSnapshot(readFormSnapshot(), settingsValue()), 'configForms:initial')
				return () => {
					if (buxuForm === form) buxuForm = null
					/* P1-5：合并式重置，保留降级字段的结构一致性。 */
					buxuFormStatus = Object.assign({}, buxuFormStatus, {
						status: 'unavailable', writable: false,
						message: '配置服务尚未连接，当前改动仅作临时预览。'
					})
					if (typeof unsubscribe === 'function') unsubscribe()
					notifySettingsListeners()
				}
			}, 'dsh-theme-buxu: settings binding')
			ctx.effect(() => {
				/* 事件回调会收到 Event 对象，不能直接把 applyThemeTokens 当 handler
				   （否则 Event 被当成 where 字符串）。统一包一层写死来源，
				   同时保留同一引用供 removeEventListener 使用。 */
				const onDomReady = () => applyThemeTokens('domready')
				const onColorScheme = () => applyThemeTokens('media:prefers-color-scheme')
				if (!document.body) {
					document.addEventListener('DOMContentLoaded', onDomReady, { once: true })
				} else {
					applyThemeTokens('effect:init')
				}

				media = window.matchMedia('(prefers-color-scheme: dark)')
				media.addEventListener('change', onColorScheme)

				return () => {
					document.removeEventListener('DOMContentLoaded', onDomReady)
					if (media) media.removeEventListener('change', onColorScheme)
					disposeContractCheck()
					if (sidebarObserver) { sidebarObserver.disconnect(); sidebarObserver = null }
					if (centerObserver) { centerObserver.disconnect(); centerObserver = null }
					document.documentElement.style.removeProperty('--tn-sidebar-w')
					document.documentElement.style.removeProperty('--tn-center-right')
					const el = document.getElementById(STYLE_ID)
					if (el) el.remove()
					document.documentElement.removeAttribute(ROOT_ATTR)
					if (document.body) document.body.removeAttribute('data-dsh-theme-buxu-avatars')
					/* 还原 body 上被接管的属性方法，别把官方蒙在鼓里 */
					if (darkOverrideRestore) {
						try { darkOverrideRestore() } catch (e) { /* 忽略 */ }
						darkOverrideRestore = null
					}
				}
			}, 'dsh-theme-buxu: css')

			/* 会话内容列宽度偏好 —— **已撤回**（2026-11-04，用户明确「我说的排版不是内容
			   输入区，把内容列宽复原」）。此前写入的 820px 偏好仍在用户 localStorage 里，
			   这里负责把它清掉，交还给官方默认 clamp(680, col*0.64, 920) 与拖宽把手。 */
			ctx.effect(() => {
				try {
					const KEY = 'dsh.conversation.contentWidth'
					if (window.localStorage.getItem(KEY) === '820') {
						window.localStorage.removeItem(KEY)
					}
				} catch (e) { /* localStorage 不可用时跳过 */ }
			}, 'dsh-theme-buxu: content width revert')

			/* ---------------------------------------------------------------
			 * 内容列宽度自适应（P1，2026-11-05）
			 *
			 * **问题**：窗口从 1296 放大到 2576，内容列宽一像素不变（恒 684px），
			 * 超大窗口右侧空出一大片。用户报告「放大窗口后内容对话区没有跟着自适应」。
			 *
			 * **官方机制**（读 dsh-client-ui-conversation 源码）：
			 *   resolveContentWidth(column, pref) =
			 *     pref 非空 → min(max(pref, 640), max(640, column - 176))
			 *     pref 为空 → max(680, min(column * .64, 920))     ← 920 死上限
			 *   结果被写成**行内** --dsh-chat-user-width 到 .an3WzG_body 上，
			 *   再由 CSS 读进 --dsh-chat-content-width。
			 *
			 * **为什么 CSS 改不动**（已排除三版方案，全部留证）：
			 *   ① body 作用域读不到后代元素上的 --dsh-conversation-column-width
			 *      → var() 回落 0 → clamp(680,0,1400) 恒等 680。
			 *   ② 命中 .body 本体重写 --dsh-chat-content-width 也不行：
			 *      官方表达式是 var(--dsh-chat-user-width, clamp(...))，
			 *      语义是"用户宽度优先"，而官方恰恰把像素值写在那里 → 取到同一个值。
			 *   ③ 行内声明优先级高于任何样式表规则，!important 也改变不了这个次序
			 *      （!important 只比较样式表之间）。
			 *
			 * **本方案**：JS 直接往会话容器写行内
			 *     --dsh-chat-content-width: <px> !important
			 *   行内 + !important 是级联最高优先，能压过官方那条读 user 值的表达式。
			 *   值 = clamp(680, column * .64, 1400)：完全沿用官方的 0.64 比例，
			 *   只把 920 放宽到 1400（超宽屏一行过长伤阅读）。
			 *   官方 --dsh-composer-card-max-width = content + 32px，输入卡自动跟随。
			 *
			 * **尊重用户拖宽**：官方宽度把手的 pointerdown 一旦触发，就把标记写进
			 *   localStorage，此后永久让位给官方 JS（清掉我们的行内值），
			 *   主题不再介入 —— 用户的手动偏好不会被覆盖。
			 *   不碰 dsh.conversation.contentWidth（那是用户数据）。
			 * --------------------------------------------------------------- */
			ctx.effect(() => {
				const COLUMN_VAR = '--dsh-conversation-column-width'
				const TARGET_VAR = '--dsh-chat-content-width'
				const DRAGGED_KEY = 'dsh-theme-buxu.contentWidthUserDragged'
				const MIN = 680
				const RATIO = 0.64
				/* 上限与「是否跟随窗口」来自设置（2026-11-05 接通）。
				   关闭跟随时不写行内变量，完全交还官方默认（上限 920）。 */
				const maxWidthOf = () => {
					const s = settingsValue()
					return typeof s.contentMaxWidth === 'number' ? s.contentMaxWidth : 1400
				}
				const followsWindow = () => {
					const s = settingsValue()
					return s.contentFollowWindow !== false
				}

				const read = (k) => {
					try { return window.localStorage.getItem(k) } catch (e) { return null }
				}
				const write = (k, v) => {
					try { window.localStorage.setItem(k, v) } catch (e) { /* 忽略 */ }
				}
				let userDragged = read(DRAGGED_KEY) === '1'

				const findHost = () =>
					document.querySelector('[data-conversation-content]') ||
					document.querySelector("[class*='_body']:has([data-composer-seat])") ||
					document.querySelector("[data-slot='conversation.chat.flow']")?.closest("[class*='_body']") ||
					null

				let applied = null
				const clear = (host) => {
					if (!host) return
					try { host.style.removeProperty(TARGET_VAR) } catch (e) { /* 忽略 */ }
					applied = null
				}
				const evalNow = () => {
					if (!themeEnabled()) return
					const host = findHost()
					if (!host) return
					/* 用户拖过 → 交还官方 JS 全权处理 */
					if (userDragged) { clear(host); return }
					/* 设置里关掉「跟随窗口」→ 撤掉行内变量，交还官方默认 */
					if (!followsWindow()) { clear(host); return }
					let column = 0
					try {
						column = Number.parseFloat(getComputedStyle(host).getPropertyValue(COLUMN_VAR)) || 0
					} catch (e) { column = 0 }
					if (!(column > 0)) column = host.getBoundingClientRect().width || 0
					if (!(column > 0)) return
					const wanted = Math.round(Math.min(maxWidthOf(), Math.max(MIN, column * RATIO)))
					if (applied === wanted) return
					applied = wanted
					buxuSetStyle(host, TARGET_VAR, wanted + 'px', 'important')
				}

				/* 2026-11-07 提速：resize 是低频事件，改用 rAF 下一帧即算，
				   去掉 100ms 防抖延迟。同一帧多次 resize 仍被合并。 */
				let frame = null
				const schedule = () => {
					if (frame !== null) return
					frame = requestAnimationFrame(() => { frame = null; evalNow() })
				}

				/* 用户拖宽把手 → 永久让位 */
				const onPointerDown = (event) => {
					const t = event.target
					if (!(t instanceof Element)) return
					if (t.closest("[class*='widthHandle']") === null) return
					userDragged = true
					write(DRAGGED_KEY, '1')
					clear(findHost())
				}
				document.addEventListener('pointerdown', onPointerDown, true)

				evalNow()
				/* 提速：兜底重算从 600/1600ms 缩到 250/800ms（首帧已算，这只是补漏） */
				setTimeout(evalNow, 250)
				setTimeout(evalNow, 800)
				window.addEventListener('resize', schedule)
				/* 设置改变后由 applySettings 调它重算（effect 只跑一次） */
				contentWidthReeval = schedule

				let observer = null
				const host = findHost()
				if (host && typeof ResizeObserver !== 'undefined') {
					observer = new ResizeObserver(schedule)
					observer.observe(host)
				}
				return () => {
					document.removeEventListener('pointerdown', onPointerDown, true)
					window.removeEventListener('resize', schedule)
					if (frame !== null) cancelAnimationFrame(frame)
					if (observer) observer.disconnect()
					contentWidthReeval = null
					const h = findHost()
					if (h) clear(h)
				}
			}, 'dsh-theme-buxu: content width auto')

			/* ---------------------------------------------------------------
			 * 对话头像（2026-11-05，真实 DOM 节点方案）
			 *
			 * **为什么不用 ::before**：官方滚动容器是
			 *   overflow-x: clip; overflow-y: visible
			 * `overflow-x: clip` 会把伪元素这类不参与布局的绘制内容一并裁掉。
			 * 实测该伪元素的计算样式全部正确（content:"" / 26px / 有背景图），
			 * 但屏幕上一个像素都不显示；同图用真实 fixed 节点画则正常。
			 * → 头像必须是**参与布局的真实节点**。
			 *
			 * 做法：MutationObserver 监听会话流，给
			 *   · 每个「助手回复段」（assistant-step 且非 reasoning）
			 *     插入 <span data-tn-avatar="assistant">
			 *   · 每个用户气泡（data-chat-flow-kind="user"）插入
			 *     <span data-tn-avatar="user">
			 * 节点样式全在 buildCss 里，这里只负责建节点 + 去重。
			 * 幂等：先查是否已有头像节点，有就跳过（避免重复插入）。
			 * 只在序列化层面加节点，不碰官方 React 的 DOM 结构语义
			 * （span 无子节点、pointer-events:none，不影响点击与文本选择）。
			 * --------------------------------------------------------------- */
			ctx.effect(() => {
				const AV = 'data-tn-avatar'
				let observer = null
				let frame = null
				let stopped = false

				const ensure = (host, kind) => {
					if (!host) return
					/* 已有就不重复插（含别处插入的） */
					for (const child of host.children) {
						if (child.getAttribute && child.getAttribute(AV)) return
					}
					const span = document.createElement('span')
					span.setAttribute(AV, kind)
					span.setAttribute('data-buxu-owned', '1')
					span.setAttribute('aria-hidden', 'true')
					/* 插到最前面，配合 CSS 的 absolute left:0 落进 padding 区 */
					host.insertBefore(span, host.firstChild)
				}

				/* scanDirect = 真正的扫描逻辑，**不检查 stopped**。
				   scan = effect 内部用的包装（cleanup 后停止）。
				   avatarsRescan 指向 scanDirect，因此即使本 effect 死了，
				   applyThemeTokens 仍能靠它把头像节点补回来。 */
				const scanDirect = () => {
					/* **总开关守卫**：关闭主题时彻底停手，否则 observer 会把
					   teardown 刚清掉的 avatars 属性 / 头像节点立刻写回来。 */
					if (!themeEnabled()) return
					/* **属性自愈（2026-11-05 修复「头像反复消失」）**：
					   css effect 的 cleanup 会 removeAttribute(avatars)，
					   而 applyThemeTokens 不一定会重跑（切会话 / 右栏开合 / 槽位重挂载时
					   cordis 可能只跑 cleanup）。结果属性永久缺失 →
					   所有头像 CSS（尺寸/背景图/留白）整段不生效 → 头像消失，
					   且只能靠重启恢复（用户多次反馈）。

					   头像扫描器由 MutationObserver 驱动，DOM 一变就跑，
					   所以在这里补写属性是最可靠的自愈点：
					   只要有人删，下一次扫描就补回来。
					   用 getAttribute 判等，避免每帧无谓写 DOM。 */
					try {
						if (GEO.avatarsOn && document.body.getAttribute('data-dsh-theme-buxu-avatars') !== 'on') {
							buxuSetAttr(document.body, 'data-dsh-theme-buxu-avatars', 'on')
						}
					} catch (e) { /* 忽略：属性写入失败不影响后续插入 */ }

					/* 设置里关掉「显示对话头像」→ 移除已有节点并停止插入。
					   （2026-11-05 接通设置项，此前该开关没有任何效果） */
					if (!GEO.avatarsOn) {
						try {
							for (const el of document.querySelectorAll('[' + AV + '][data-buxu-owned="1"]')) el.remove()
						} catch (e) { /* 忽略 */ }
						return
					}
					try {
						/* 助手头像插入条件**必须与 CSS 留白条件完全一致**：
						   [data-chat-flow-kind='assistant-step'][data-chat-group-part='response']
						   [data-chat-flow-kind='assistant-step']:not([data-chat-group-part])
						   官方 data-chat-group-part 只有 3 态：缺失 / response / reasoning
						   （2026-11-09 归档实证；旧注释写的 tool/file 是误记）。 */
						const EDGE = 'data-buxu-avatar-edge'
						/* 2026-11-10 四次修正（用户「我发出信息下面的第一个助手发言不是大头像」）：
						   全局首尾把「首」判到了滚过去的更早回复上，用户当前提问后的
						   第一段成了 mid。改为**按最近一条用户消息分界**：
						   · 取 flow 容器内按 DOM 顺序的全部 [data-chat-flow-kind] 行；
						   · 找到最后一条 user 行的位置，只把它**之后**的合格助手正文段
						     纳入本轮集合 → 用户当前提问下的第一段必然是 first（大）；
						   · 本轮集合的最后一个为 last（大，即「最后总结」），其余 mid；
						   · 找不到 user 行时回退到全部合格段（空会话 / 纯助手视图）；
						   · 每次重算，用户发新消息后大头像自然跟到新一轮；
						   · 不依赖 turn 粒度 / 相邻连续性 / 切会话序号；全部官方 data-* 属性，
						     零哈希；每次扫描先清后设幂等，流式尾段顺延时旧尾自动降 mid。 */
						const flowRoot = document.querySelector("[data-slot='conversation.chat.flow']") || document
						const allRows = flowRoot.querySelectorAll('[data-chat-flow-kind]')
						let lastUserIndex = -1
						for (let i = 0; i < allRows.length; i++) {
							if (allRows[i].getAttribute('data-chat-flow-kind') === 'user') lastUserIndex = i
						}
						/* 2026-11-10 修正（用户「助手头像只有最近的对话有显示」）：
						   旧逻辑跳过历史轮又清掉全部 EDGE 标记 → 历史轮头像整片消失。
						   改为两段式：全部合格段一律 ensure() 插节点、历史轮统一 mid（小头像）；
						   仅最后一轮参与 first/last/mid 首尾判定。
						   2026-11-11：壁纸功能整体回滚后，单独移植本修复回基线。 */
						const allEligible = []
						const eligible = []
						for (let i = 0; i < allRows.length; i++) {
							const el = allRows[i]
							if (el.getAttribute('data-chat-flow-kind') !== 'assistant-step') continue
							const part = el.getAttribute('data-chat-group-part')
							if (!(part === 'response' || part === null || part === '')) continue
							if (el.hidden || (el.closest && el.closest('[hidden]'))) continue
							ensure(el, 'assistant')
							allEligible.push(el)
							if (i > lastUserIndex) eligible.push(el)   /* 仅最后一轮参与首尾 */
						}
						/* 打标：历史轮一律 mid（小头像），最后一轮首尾大、其余 mid。
						   2026-11-12 闪动修复：改为「只在目标值与当前值不同时才写」。
						   旧写法每次扫描都无条件 removeAttribute 全部 + setAttribute 全部
						   （几十段 × 2 次 DOM 写入），body 级 MutationObserver 在发消息/
						   hover 重绘时高频触发 → 反复样式重算 → 官方带 transition:all 的
						   消息操作栏按钮（复制等 28×28 图标）跟着闪。A/B 实测关掉插件
						   样式后不闪，确认插件造成。稳态下目标值不变，写入次数降为 0。 */
						const target = new Map()
						for (const el of allEligible) target.set(el, 'mid')
						const n = eligible.length
						if (n > 0) {
							target.set(eligible[0], 'first')
							if (n > 1) target.set(eligible[n - 1], 'last')
							for (let i = 1; i < n - 1; i++) target.set(eligible[i], 'mid')
						}
						/* 先清理不再合格的旧标记（同样判等，避免无谓写入） */
						for (const el of flowRoot.querySelectorAll('[' + EDGE + ']')) {
							if (!target.has(el) && el.getAttribute(EDGE) !== null) el.removeAttribute(EDGE)
						}
						/* 再按目标值写：值没变就完全不碰 DOM */
						for (const [el, val] of target) {
							if (el.getAttribute(EDGE) !== val) el.setAttribute(EDGE, val)
						}
						/* 用户气泡：头像要挂在气泡**右侧**，不能挂在行容器上
						   （行容器是 flex + justify-content:flex-end，
						   absolute 会落到容器左上角被内容压住）。
						   官方结构：row(userRow) > userStack > bubble，
						   我们在 userRow 里气泡之后插一个静态流节点，
						   flex 布局会把它排在气泡右边。 */
						const users = document.querySelectorAll("[data-chat-flow-kind='user']")
						for (const el of users) {
							if (el.querySelector('[data-tn-avatar]')) continue
							/* **2026-11-06 修复「这条发言没有头像」**：
							   提问气泡在「选中 / 带图片 / 卡片式」形态下，
							   内部可能没有类名含 bubble 的元素（用户第三张截图
							   就是会话选择后的提问卡）。旧代码 !bubble 直接
							   continue → 头像被静默跳过，且没有任何报错。
							   放宽为三级兜底：bubble → 任意子元素 → 行容器本身，
							   保证节点一定插入；定位统一锚到 el（行容器），
							   避免依赖内部结构。 */
							let host = el.querySelector('[data-message-bubble]') || el.querySelector("[class*='bubble']")
							if (!host) host = el.firstElementChild
							if (!host) host = el
							const span = document.createElement('span')
							span.setAttribute(AV, 'user')
							span.setAttribute('data-buxu-owned', '1')
							span.setAttribute('aria-hidden', 'true')
							/* 锚到行容器右侧：absolute + right 负值落在留白区。
							   行容器本身设 relative，不依赖内部 bubble 的定位。 */
							span.style.setProperty('position', 'absolute', 'important')
							span.style.setProperty('left', 'auto', 'important')
							span.style.setProperty('right', -(GEO.avatarSize + 8) + 'px', 'important')
							span.style.setProperty('top', '0', 'important')
							if (getComputedStyle(el).position === 'static') {
								buxuSetStyle(el, 'position', 'relative', 'important')
							}
							host.appendChild(span)
						}
						/* ---- 提问选择结果气泡（2026-11-06）----
						   dsh-client-ui-user-questions 的 QuestionReplyBubble
						   外层是 [data-question-reply]（官方自带属性，带 callId），
						   内部同样用 UserMessageBubble，但**没有**
						   data-chat-flow-kind='user'，所以上面的循环完全漏掉它。
						   用户反馈「因为是用户选择的执行方案，也要有用户头像」。

						   这个 row 是 flex column + align-items:flex-end，
						   气泡本身限宽且右对齐（[class*='bubbleWidth']），
						   row 右缘并不等于气泡右缘 —— 初版把头像锚在 row 上，
						   中间空出一大段（用户截图「和头像距离太远」）。

						   现在把头像 append 到冒泡宽容器里、relative 由 CSS 给，
						   right 固定 -(avatarSize+8)，紧贴气泡右缘。
						   找不到该容器时退回 row（此时不额外加 padding，
							   避免再把气泡推远）。 */
						const replies = document.querySelectorAll('[data-question-reply]')
						for (const el of replies) {
							if (el.querySelector('[data-tn-avatar]')) continue
							let host = el.querySelector("[class*='bubbleWidth']")
							if (!host) host = el
							const span = document.createElement('span')
							span.setAttribute(AV, 'user')
							span.setAttribute('data-buxu-owned', '1')
							span.setAttribute('aria-hidden', 'true')
							span.style.setProperty('position', 'absolute', 'important')
							span.style.setProperty('left', 'auto', 'important')
							span.style.setProperty('right', -(GEO.avatarSize + 8) + 'px', 'important')
							span.style.setProperty('top', '0', 'important')
							if (getComputedStyle(host).position === 'static') {
								buxuSetStyle(host, 'position', 'relative', 'important')
							}
							host.appendChild(span)
						}
					} catch (e) { /* 诊断失败不干扰界面 */ }
					for (const span of document.querySelectorAll('[' + AV + '][data-buxu-owned="1"]')) {
						if (span.getAttribute(AV) === 'user') span.style.setProperty('right', -(GEO.avatarSize + 8) + 'px', 'important')
					}
				}

				const scan = () => {
					if (stopped) return
					scanDirect()
				}

				/* 2026-11-07 提速：会话切换/头像补扫改用 rAF，下一帧即执行，
				   去掉 150ms 防抖延迟；同一帧多次 DOM 变化仍合并。 */
				const schedule = () => {
					if (frame !== null) return
					frame = requestAnimationFrame(() => { frame = null; scan() })
				}

				/* 注册全局重扫入口（applyThemeTokens 会调）。
				   用一个**不检查 stopped 的独立闭包**：即使本 effect 被 cleanup
				   （stopped=true、observer 断开、节点删光），这个入口仍能被
				   applyThemeTokens 调用把节点补回来。这正是「头像反复消失」
				   在拖滑块/切配色后复现的根因路径。 */
				avatarsRescan = () => {
					if (stopped) return
					try { scanDirect() } catch (e) { /* 忽略 */ }
				}

				scan()
				/* 提速：兜底补扫从 500/1500ms 缩到 200/700ms（首帧已扫，这只是补漏） */
				setTimeout(scan, 200)
				setTimeout(scan, 700)

				/* **2026-11-06 根治「切会话发指令后头像消失」**：
				   原先观测的目标是 [data-conversation-content]（当前会话的内容容器）。
				   切会话时 React 会把这个容器**整个卸载并换成新节点**，
				   而 MutationObserver 一旦观测目标被移出 DOM 就永久静默
				   （规范行为）—— 于是新会话的消息渲染时没有任何回调，
				   头像节点从未被插入；若此刻 cordis 还跑了 cleanup，
				   更会把所有头像删光且无人重建。用户实测复现路径正是
				   「切会话 → 发指令 → 头像没了」。

				   修法：观测 document.body（永远不会被替换），subtree:true
				   覆盖所有会话切换；同时额外检测 [data-conversation-content]
				   的节点引用是否变化，变了就**立即**补扫一次（不等 150ms 防抖），
				   让新会话第一批消息就能带上头像。
				   body 级回调次数虽多，但 schedule 有 150ms 防抖且
				   scanDirect 幂等，开销可忽略。 */
				let lastContentRoot = document.querySelector('[data-conversation-content]')
				if (typeof MutationObserver !== 'undefined' && document.body) {
					observer = new MutationObserver(() => {
						const nowRoot = document.querySelector('[data-conversation-content]')
						const hasNewContent = !!(nowRoot && (nowRoot.querySelector("[data-chat-flow-kind='user']") || nowRoot.querySelector("[data-chat-flow-kind='assistant-step']")))
						if (nowRoot && (nowRoot !== lastContentRoot || hasNewContent)) {
							lastContentRoot = nowRoot
							/* 会话容器换了：立即重扫，跳过防抖 */
							if (!stopped) {
								try { scanDirect() } catch (e) { /* 忽略 */ }
							}
							return
						}
						schedule()
					})
					observer.observe(document.body, { childList: true, subtree: true })
				}
				/* **body 属性观察器（自愈兜底）**：
				   上面那个 observer 只看会话子树，body 自身的属性变化不会触发它。
				   而 cleanup 删的正是 body 上的 avatars 属性 —— 若那一刻会话 DOM
				   恰好没变，就没有任何东西触发 scan 去补写。
				   这里单独观察 body 属性；发现 avatars 被改成 off/删掉且设置仍是
				   「开启」时，立即补回并扫一次。attributeFilter 限定，开销极小。 */
				let bodyAttrObserver = null
				if (typeof MutationObserver !== 'undefined' && document.body) {
					bodyAttrObserver = new MutationObserver(() => {
						if (stopped || !themeEnabled() || !GEO.avatarsOn) return
						try {
							if (document.body.getAttribute('data-dsh-theme-buxu-avatars') !== 'on') {
								buxuSetAttr(document.body, 'data-dsh-theme-buxu-avatars', 'on')
								schedule()
							}
						} catch (e) { /* 忽略 */ }
					})
					bodyAttrObserver.observe(document.body, {
						attributes: true,
						attributeFilter: ['data-dsh-theme-buxu-avatars']
					})
				}
				return () => {
					stopped = true
					avatarsRescan = null
					if (frame !== null) cancelAnimationFrame(frame)
					if (observer) observer.disconnect()
					if (bodyAttrObserver) bodyAttrObserver.disconnect()
					for (const el of document.querySelectorAll('[' + AV + ']')) {
						if (el.getAttribute('data-buxu-owned') === '1') el.remove()
					}
				}
			}, 'dsh-theme-buxu: avatars')

			/* 侧栏宽度偏好：官方展开时回到 280px，且 store 不持久化拖拽宽度。
			   主题记住用户拖到的宽度（默认 268），启动与展开时恢复。
			   layout 服务已在 exports.inject 声明；任何访问都 try/catch，
			   可选功能不允许再引发入口激活失败。 */
			ctx.effect(() => {
				const layout = ctx.layout
				if (!layout?.panels || typeof layout.panels.setSidebar !== 'function') return
				const STORE_KEY = 'dsh-theme-buxu.sidebar-width'
				const MIN = 264
				const MAX = 420
				let preferred = (() => {
					const configured = settingsValue().sidebarWidth
					if (typeof configured === 'number' && configured >= MIN && configured <= MAX) return configured
					try {
						const saved = Number.parseInt(window.localStorage.getItem(STORE_KEY) || '', 10)
						if (saved >= MIN && saved <= MAX) return saved
					} catch (e) { /* 旧偏好不可读时回默认值 */ }
					return DEFAULT_SIDEBAR_WIDTH
				})()
				const persist = (w) => {
					try { window.localStorage.setItem(STORE_KEY, String(w)) } catch (e) { /* 旧版降级偏好 */ }
					if (settingsValue().sidebarWidth !== w) persistSettings({ sidebarWidth: w }, 'sidebar:resize').catch(() => {})
				}
				const applyPreferred = () => {
					try { layout.panels.setSidebar(preferred) } catch (e) { /* 忽略 */ }
				}
				let applying = false
				let bootTimer = null
				let bootTries = 0
				let observer = null
				let resizeObserver = null
				let releaseTimer = null
				const releaseSoon = () => {
					if (releaseTimer) clearTimeout(releaseTimer)
					releaseTimer = setTimeout(() => { applying = false }, 300)
				}
				const boot = () => {
					const frame = document.querySelector("[class*='frame']:has([class*='centerCol'])")
					/* **重试有上限**（2026-11-05）：官方 DOM 契约缺失时（降级/视图未挂载）
					   原实现会每 200ms 无限重试，永不停止；虚拟 DOM 桩下甚至同步爆栈。
					   40 次 ≈ 8 秒足够等 React 首帧，之后安静放弃（不影响主题配色）。 */
					if (!frame) {
						if (++bootTries >= 40) return
						bootTimer = setTimeout(boot, 200)
						return
					}
					const col = frame.querySelector("[class*='sidebarCol']")
					if (!frame.hasAttribute('data-sidebar-collapsed')) {
						applying = true
						applyPreferred()
						releaseSoon()
					}
					if (col && typeof ResizeObserver !== 'undefined') {
						resizeObserver = new ResizeObserver(() => {
							if (applying) return
							const w = Math.round(col.getBoundingClientRect().width)
							if (w >= MIN && w <= MAX) { preferred = w; persist(w) }
						})
						resizeObserver.observe(col)
					}
					let wasCollapsed = frame.hasAttribute('data-sidebar-collapsed')
					observer = new MutationObserver(() => {
						const collapsed = frame.hasAttribute('data-sidebar-collapsed')
						if (collapsed) { wasCollapsed = true; return }
						if (!wasCollapsed) return
						wasCollapsed = false
						applying = true
						setTimeout(() => { applyPreferred(); releaseSoon() }, 0)
					})
					observer.observe(frame, { attributes: true, attributeFilter: ['data-sidebar-collapsed'] })
				}
				boot()
				const unsubscribeSettings = subscribeSettings(() => {
					const configured = settingsValue().sidebarWidth
					if (typeof configured !== 'number' || configured < MIN || configured > MAX || configured === preferred) return
					preferred = configured
					applying = true
					applyPreferred()
					releaseSoon()
				})
				return () => {
					unsubscribeSettings()
					if (bootTimer) clearTimeout(bootTimer)
					if (releaseTimer) clearTimeout(releaseTimer)
					if (observer) observer.disconnect()
					if (resizeObserver) resizeObserver.disconnect()
				}
			}, 'dsh-theme-buxu: sidebar width')

			/* ---- slots React 组件 ----
			   conversation.session.header.utilities 是普通 renderSlot
			   （读 dsh-client-ui-conversation 源码确认，不带 only 限制），
			   宿主已经用它渲染 open-in-app / schedule / session-log-export 的按钮，
			   说明可以叠加多个注册。

			   徽标放在这一带，位置由 headerUtilities 的 CSS 决定，
			   组件本身不写任何定位样式（practices.md:36）。

			   **F5 之后徽标消失的根因**（实测 document.title 诊断确认）：
			   ctx.slots.inject(ownerKey, cb) 的所有权回调在 F5 后的重载周期里
			   不执行（诊断显示：注册路径无异常 err=(none)、槽容器存在、
			   唯独徽标不在 DOM）。冷启动时插件树按依赖顺序装载，回调能跑到。
			   修法：不依赖 inject 的所有权回调，effect 内直接 register，
			   register 的返回值本身就是 dispose，正好当 effect cleanup。
			   带退避重试兜底：槽位声明（children 表）若晚于插件执行，
			   SlotCore.register 会抛 "slot is not declared"，重试直到宿主就绪。 */
			ctx.effect(() => {
				if (!ctx.slots) return
				let dispose = null
				let tries = 0
				let timer = null
				let stopped = false
				const attempt = () => {
					if (stopped) return
					try {
						dispose = ctx.slots.register(
							{
								name: 'conversation.session.header.utilities',
								id: 'dsh-theme-buxu-badge',
								order: 100
							},
							ThemeBadge
						)
					} catch (e) {
						if (++tries < 100 && !stopped) timer = setTimeout(attempt, 100)
					}
				}
				attempt()
				return () => {
					stopped = true
					if (timer) clearTimeout(timer)
					if (dispose) dispose()
				}
			}, 'dsh-theme-buxu: badge')

			/* ---------------------------------------------------------------
			 * 头像自定义（2026-11-05）
			 *
			 * 用户反馈：不该让每个用户自己去改代码换头像，应该在设置页里换。
			 *
			 * **存储**：localStorage，键 dsh-theme-buxu.avatar.{assistant|user}
			 *   值是 dataURL 字符串（上传时由 canvas 压到 128px 再编码）。
			 *   选 localStorage 而不是文件：实测桌面端插件读不到外部文件
			 *   （require.asset 返回原始字符串、/plugins/.../assets/ 路由 404），
			 *   base64 走 localStorage 是唯一在 desktop 上可靠的路。
			 *
			 * **应用**：CSS 里头像用 background-image 内联默认图；
			 *   自定义图存在时，本 effect 把 background-image 覆盖成用户的图
			 *   （行内 style + !important，压过样式表）。清空自定义则移除行内。
			 * --------------------------------------------------------------- */
			/* 注意：AVATAR_KEY / readAvatar / applyAvatarOverrides 三个
			   **必须留在模块级**（2026-11-05 修复）。
			   它们原先在这里（apply 内部），却被模块级的 AvatarRow 引用
			   → 渲染设置页时抛 ReferenceError: readAvatar is not defined
			   → React 卸载整子树 → 设置页白屏。
			   同样的坑这是第二次（第一次是 React2/h2/AvatarRow 本身）。
			   规矩：凡是「组件会引用」的东西，一律放模块级。 */

			/* 头像节点是动态插入的 → 用 MutationObserver 在插入后再套自定义图 */
			ctx.effect(() => {
				applyAvatarOverrides()
				let obs = null
				if (typeof MutationObserver !== 'undefined') {
					obs = new MutationObserver(() => applyAvatarOverrides())
					obs.observe(document.body, { childList: true, subtree: true })
				}
				const onStorage = (e) => {
					if (e && e.key && e.key.indexOf('dsh-theme-buxu.avatar.') !== 0) return
					applyAvatarOverrides()
				}
				window.addEventListener('storage', onStorage)
				return () => {
					if (obs) obs.disconnect()
					window.removeEventListener('storage', onStorage)
				}
			}, 'dsh-theme-buxu: avatar overrides')

			/* ---- 任务条真实进度（2026-11-06 新增）----
			   官方 TodoPanel 的 progress span 文本形如：
			     中文「2 已完成 · 1 进行中 · 3 待处理」
			     英文「2 completed · 1 in progress · 3 pending」
			   只按「N + 状态词」提取数字，与语言无关；算出完成率写进
			   --buxu-todo-pct，由 CSS 画底部进度条。
			   **只读 DOM、只写 CSS 变量**，不改官方结构、不持有节点引用；
			   cleanup 仅 disconnect observer，不删除变量 —— 避免 F5 后
			   旧 effect 与 DOM 状态打架（这是之前布局错乱的教训）。 */
			ctx.effect(() => {
				let obs = null
				let raf = null
				const TODO_SEL = "[data-testid='todo-panel']"
				const apply = () => {
					if (!themeEnabled()) return
					const panel = document.querySelector(TODO_SEL)
					if (!panel) return
					const spans = panel.querySelectorAll('button > span')
					if (spans.length < 3) return
					const txt = (spans[2].textContent || '').trim()
					/* 匹配「数字 + 空格 + 状态词」：中/英/日三种文案都能命中 */
					const nums = [...txt.matchAll(/(\d+)\s*(?:已完成|进行中|待处理|completed|in progress|pending|完了|件完了|件進行中|件保留中|保留中|進行中)/gi)]
						.map((m) => Number(m[1]))
					if (nums.length === 0) return
					const total = nums.reduce((a, b) => a + b, 0)
					if (total <= 0) return
					/* 第一段是「已完成」；若文案里没有已完成，完成率记 0 */
					const doneM = txt.match(/(\d+)\s*(?:已完成|completed|件完了|完了)/i)
					const done = doneM ? Number(doneM[1]) : 0
					const pct = Math.max(0, Math.min(100, Math.round(done / total * 100)))
					/* 2026-11-07 修复「百分比不显示」：
					   attr() 求的是**伪元素所属元素自身**的属性，不会读祖先。
					   旧版把 data-buxu-todo-label 只写在 section 上，而 ::after
					   挂在 button > span:nth-child(3) 上 → 永远读到空串。
					   现在把同一个标签也写到 span 自身，数字才真正显示。
					   三个输出共用同一个 pct，保证蓝条宽度与百分比文字完全一致。 */
					const label = pct + '%'
					buxuSetStyle(panel, '--buxu-todo-fill', label)
					buxuSetStyle(panel, '--buxu-todo-ratio', String(pct / 100))
					buxuSetStyle(panel, '--buxu-todo-pct', label)
					buxuSetAttr(panel, 'data-buxu-todo-label', label)
					/* 关键：写到 span 自身，供 ::after 的 attr() 读取。 */
					buxuSetAttr(spans[2], 'data-buxu-todo-label', label)
				}
				const schedule = () => {
					if (raf !== null) return
					raf = requestAnimationFrame(() => { raf = null; apply() })
				}
				apply()
				if (typeof MutationObserver !== 'undefined') {
					obs = new MutationObserver(schedule)
					obs.observe(document.body, {
						childList: true, subtree: true, characterData: true
					})
				}
				return () => {
					if (raf !== null) cancelAnimationFrame(raf)
					if (obs) obs.disconnect()
				}
			}, 'dsh-theme-buxu: todo progress')

			/* ---- 推理等级强度条（2026-11-06）----
			   官方模型菜单里「推理等级」与「模型」是同构的两个 menuitem，
			   DOM 无 data-effort 属性、类名是哈希。这里只读不写官方结构：
			   找出标签为「推理等级」的那一行，读它的 cellValue 文本，
			   稳定 hash 出 0..1 的位置写进 --buxu-effort-pos，
			   并打上 data-buxu-effort 让 CSS 画渐变轨与圆点。

			   定位用三重保险（跨语言 + 结构兜底）：
			     ① cellLabel 文本命中 4 种本地化「推理等级」；
			     ② 菜单根页恰有 2 个 menuitem 时，第二个即推理行；
			     ③ 都不满足就跳过，绝不误伤「模型」行。
			   MutationObserver 观测 body（菜单是 portal 挂到 body 的），
			   防抖 120ms；只写同一行的属性/变量，不触碰交互。 */
			ctx.effect(() => {
				let obs = null
				let timer = null
				const EFFORT_LABELS = ['推理等级', 'Effort', '強度', 'Effort']
				/* 真实档位数据（2026-11-07 精确复刻官方 effortChoices）：
				   官方 model-selection client.js L1223-1231 的列表是
				     [ ...(reasoning.defaultEffort === undefined
				          ? [{ key:'provider-default', effort:undefined, label:t('effort.providerDefault') }]
				          : []),
				       ...reasoning.efforts.map(e => ({ key:`effort:${e.id}`, effort:e.id, label:e.name })) ]
				   zh/en 的 effort.providerDefault 都是 "Default"（L1755/L1781）。
				   HY4 无 defaultEffort 且 efforts 只有 High → 恰好 2 项 [Default, High]。
				   之前只读 reasoning.efforts 漏了 Default，档数/映射都错位。 */
				let efforts = []          // [{ id, name, effort }]，effort 为提交给 select 的值
				let currentModel = null   // { provider, model }，select 需要
				let currentIndex = 0
				let unsubCatalog = null
				let rpcCatalog = null     // ctx.get('remote') 异步兜底
				let effectStopped = false
				let effortGeneration = 0
				const ownedSliders = new Set()
				const sliderDisposers = new Map()
				const SLIDER_ATTR = 'data-buxu-effort-slider'

				/** 根页「模型」行 cellValue 上的 data-provider-id / data-model-id
				   （官方 model-selection client.js L1442-1444）。 */
				const readModelKeys = () => {
					const items = document.querySelectorAll("[role='menuitem'][class*='_cell']")
					for (const it of items) {
						const val = it.querySelector("[class*='_cellValue']")
						if (!val) continue
						const p = val.querySelector('[data-provider-id]')
						const m = val.querySelector('[data-model-id]')
						if (p && m) return {
							provider: p.getAttribute('data-provider-id'),
							model: m.getAttribute('data-model-id')
						}
					}
					return null
				}

				/** 取 catalog：优先 ctx.get('modelDirectories').catalog.store 的
				   同步快照（服务构造时已 load()，与菜单开关无关）；
				   拿不到时用 remote.session.modelCatalog() 的异步结果兜底。 */
				const getCatalog = () => {
					let dirs = null
					try { dirs = ctx.get('modelDirectories') } catch (e) { dirs = null }
					if (!dirs) { try { dirs = ctx.modelDirectories } catch (e) { dirs = null } }
					let snap = null
					try {
						const store = dirs && dirs.catalog && dirs.catalog.store
						if (store && typeof store.getSnapshot === 'function') snap = store.getSnapshot()
					} catch (e) { snap = null }
					if (snap && snap.status === 'ready' && snap.value && Array.isArray(snap.value.groups))
						return snap.value
					return rpcCatalog
				}

				/** 从 catalog 精确复刻官方 effortChoices（含 provider-default 项）。 */
				const readEfforts = () => {
					const catalog = getCatalog()
					if (!catalog || !Array.isArray(catalog.groups)) { efforts = []; currentModel = null; return efforts }
					const keys = readModelKeys()
					let model = null
					let groupId = null
					const all = []
					for (const g of catalog.groups) {
						if (!g || !Array.isArray(g.models)) continue
						for (const m of g.models) {
							if (!m) continue
							all.push({ g, m })
							if (!model && keys && g.id === keys.provider && m.id === keys.model) { model = m; groupId = g.id }
							if (!model && !keys && catalog.default &&
								g.id === catalog.default.provider && m.id === catalog.default.model) { model = m; groupId = g.id }
						}
					}
					if (!model && all.length === 1) { model = all[0].m; groupId = all[0].g.id }
					currentModel = model ? { provider: groupId, model: model.id } : (keys || null)
					const r = model && model.reasoning
					if (!r || !Array.isArray(r.efforts)) { efforts = []; currentModel = null; return efforts }
					const list = []
					/* 官方 L1223-1226：defaultEffort 缺失时前置 provider-default 项。
					   effort: undefined 表示"清除显式档位、回落 adapter 默认"。 */
					if (r.defaultEffort === undefined) {
						list.push({ id: '__default__', name: 'Default', effort: undefined })
					}
					for (const x of r.efforts) {
						list.push({ id: String(x.id), name: String(x.name), effort: String(x.id) })
					}
					efforts = list
					return efforts
				}

				/** 子页 radio：commit 时点目标档位用。
				   模型子页的 menuitemradio 带 [data-provider-id]，跳过，
				   避免把模型列表误缓存成档位列表。 */
				const readSubpageRadios = () => {
					const radios = document.querySelectorAll("[role='menuitemradio']")
					const arr = []
					for (const r of radios) {
						if (r.querySelector('[data-provider-id]')) continue
						const nameEl = r.querySelector("[class*='_modelName']") || r
						arr.push({
							el: r,
							label: (nameEl.textContent || '').trim(),
							checked: r.getAttribute('aria-checked') === 'true'
						})
					}
					return arr
				}

				/** 当前档位索引：用 cellValue 文本匹配 efforts 的 name / id。
				   官方 cellValue 在"未指定档位"时显示 "Default"（zh/en 都如此），
				   对应我们复刻的 provider-default 项（id '__default__'）。 */
				const indexFromText = (text) => {
					if (!efforts.length) return 0
					const t = (text || '').trim().toLowerCase()
					let i = efforts.findIndex((x) => x.name.toLowerCase() === t || x.id.toLowerCase() === t)
					if (i < 0) i = efforts.findIndex((x) =>
						x.name.toLowerCase().indexOf(t) >= 0 || t.indexOf(x.name.toLowerCase()) >= 0)
					if (i < 0 && /default|默认|デフォルト|predeterminado|standard/i.test(t)) {
						i = efforts.findIndex((x) => x.id === '__default__')
					}
					return i >= 0 ? i : Math.max(0, Math.min(efforts.length - 1, currentIndex))
				}
				/** 档数 = 真实 efforts 长度；目录不可用时为 0（不画假刻度）。 */
				const effectiveCount = (text) => efforts.length
				/** 档位索引 → 滑块位置（均分；最右=最高档）。 */
				const posForIndex = (idx, count) => {
					if (count <= 1) return 50
					return Math.round(idx / (count - 1) * 100)
				}
				/** 滑块位置 → 最近档位索引。 */
				const indexForPos = (pos, count) => {
					if (count <= 1) return 0
					return Math.max(0, Math.min(count - 1, Math.round(pos / 100 * (count - 1))))
				}

				/** 当前会话 id：优先 sessions 服务，再退 localStorage。
				   官方 ModelDirectory.select 需要 sessionId；拿不到时整条直写通道
				   降级为点子页 radio（功能不丢，但会走官方关闭链）。 */
				const resolveSessionId = () => {
					try {
						const s = ctx.get('sessions')
						if (s) {
							if (typeof s.currentSessionId === 'function') return s.currentSessionId() || null
							if (s.currentSessionId) return s.currentSessionId
							if (s.current && s.current.id) return s.current.id
							if (typeof s.current === 'function') {
								const c = s.current()
								if (c && c.id) return c.id
							}
						}
					} catch (e) { /* 忽略，走兜底 */ }
					try {
						const raw = window.localStorage.getItem('dsh.sessions.current')
						if (raw) {
							const o = JSON.parse(raw)
							if (o && o.sessionId) return o.sessionId
						}
					} catch (e) { /* 忽略 */ }
					return null
				}

				/** 直接写官方服务改当前会话推理档位（需求3：菜单不关 + cellValue 自动同步）。
				   官方 model-selection client.js L869-918 / L946-979 / L1161：
				   directoryFor(sessionId).select({provider,model,reasoningEffort}) 绕开
				   chooseEffort→submit→settleSelection→closeAfterSelection→close 关闭链，
				   modelSelection 投影经 syncInputs 触发 useSyncExternalStore 重渲染 cellValue。
				   effort 为 undefined 时省略 reasoningEffort = 回落 adapter 默认(Default)。
				   返回 true 表示已走直写通道，调用方不必再点 radio。 */
				const selectEffort = async (effort) => {
					if (effectStopped || !currentModel || !currentModel.provider || !currentModel.model) return false
					const sel = { provider: currentModel.provider, model: currentModel.model }
					if (effort !== undefined) sel.reasoningEffort = effort
					try {
						const dirs = ctx.get('modelDirectories')
						const sid = resolveSessionId()
						if (dirs && sid && typeof dirs.directoryFor === 'function') {
							const d = dirs.directoryFor(sid)
							if (d && typeof d.select === 'function') {
								const result = await Promise.resolve(d.select(sel))
								return !!(result && result.ok === true)
							}
						}
					} catch (e) { /* 尝试官方 remote 通道 */ }
					try {
						const remote = ctx.get('remote')
						const sid = resolveSessionId()
						if (remote && sid && remote.session && typeof remote.session.selectModel === 'function') {
							const result = await Promise.resolve(remote.session.selectModel(Object.assign({ sessionId: sid }, sel)))
							return !!(result && result.ok === true)
						}
					} catch (e) { /* 最后使用官方 radio */ }
					return false
				}

				/** 松手：优先直写官方服务（菜单不关、根页文本自动同步）；
				   服务通道不可用时，降级为打开子页点目标 radio（官方会关闭菜单）。 */
				const commit = async (idx, targetRow, srcCount, slider, previousIndex) => {
					const generation = ++effortGeneration
					const want = efforts[idx]
					if (!want || !slider) return false
					buxuSetAttr(slider, 'aria-busy', 'true')
					try {
						if (await selectEffort(want.effort)) {
							if (!effectStopped && generation === effortGeneration) {
								currentIndex = idx
								buxuSetAttr(slider, 'data-buxu-effort-error', '')
								buxuSetAttr(slider, 'aria-valuenow', String(Math.round(posForIndex(idx, srcCount))))
								buxuSetAttr(slider, 'aria-valuetext', want.name)
							}
							return true
						}
						if (effectStopped || generation !== effortGeneration) return false
						/* 仅在直写明确失败后使用官方列表，不把发出请求当成成功。 */
						if (targetRow && typeof targetRow.click === 'function') targetRow.click()
						const clicked = await new Promise((resolve) => {
							requestAnimationFrame(() => {
								if (effectStopped || generation !== effortGeneration) { resolve(false); return }
								const lv = readSubpageRadios()
								const pick = want ? lv.find((r) => r.label.toLowerCase() === want.name.toLowerCase()) : null
								if (pick && pick.el && typeof pick.el.click === 'function') {
									pick.el.click()
									resolve(true)
								} else resolve(false)
							})
						})
						if (!clicked && !effectStopped && generation === effortGeneration) {
							currentIndex = previousIndex
							buxuSetAttr(slider, 'data-buxu-effort-error', '未能保存推理档位，请使用官方列表重试。')
						}
						return clicked
					} catch (e) {
						if (!effectStopped && generation === effortGeneration) {
							currentIndex = previousIndex
							buxuSetAttr(slider, 'data-buxu-effort-error', '推理档位未能保存，请使用官方列表重试。')
						}
						return false
					} finally {
						if (slider.isConnected !== false) buxuSetAttr(slider, 'aria-busy', 'false')
					}
				}

				/** 按真实档位数动态生成刻度点（自适应模型）。
				   count=0 表示 catalog 不可用 → 清空刻度，绝不画猜测的假档位。 */
				const refreshTicks = (slider, count) => {
					const ticks = slider.querySelector('[data-buxu-effort-ticks]')
					if (!ticks) return
					if (count <= 0) { while (ticks.firstChild) ticks.removeChild(ticks.firstChild); return }
					const n = Math.max(1, count)
					/* 数量不变就不重建，避免每次拖动都动 DOM */
					if (ticks.children.length === n) {
						for (let i = 0; i < n; i++) {
							const t = ticks.children[i]
							buxuSetStyle(t, '--buxu-tick-pos', (n <= 1 ? 50 : i / (n - 1) * 100).toFixed(1) + '%')
						}
						return
					}
					while (ticks.firstChild) ticks.removeChild(ticks.firstChild)
					for (let i = 0; i < n; i++) {
						const t = document.createElement('span')
						buxuSetAttr(t, 'data-buxu-effort-tick', '')
						buxuSetStyle(t, '--buxu-tick-pos', (n <= 1 ? 50 : i / (n - 1) * 100).toFixed(1) + '%')
						ticks.appendChild(t)
					}
				}

				/** 在推理等级行内插入/更新滑块 DOM。 */
				const buildSlider = (target, text) => {
					let slider = target.querySelector('[' + SLIDER_ATTR + ']')
					let sliderDisposer = slider ? sliderDisposers.get(slider) : null
					if (slider && !sliderDisposer) {
						/* 外来或未注册的旧节点只读取，不重复注册事件；重挂由统一清理负责。 */
						ownedSliders.add(slider)
					}
					/* 拖动吸附状态：dragIdx 记住当前吸附到的档位，lastHi 避免重复写 DOM。 */
					let dragIdx = 0
					let lastHi = -1
					/** 高亮第 idx 个刻度（data-on='true'），其余清除。
					   只在 idx 变化时写 DOM，避免拖动时刷屏 / 撑大 tracker。 */
					const highlightTick = (idx) => {
						if (idx === lastHi) return
						lastHi = idx
						if (!slider) return
						const ticks = slider.querySelector('[data-buxu-effort-ticks]')
						if (!ticks) return
						for (let i = 0; i < ticks.children.length; i++) {
							const t = ticks.children[i]
							if (i === idx) {
								if (t.getAttribute('data-on') !== 'true') buxuSetAttr(t, 'data-on', 'true')
							} else if (t.getAttribute('data-on') === 'true') {
								buxuSetAttr(t, 'data-on', 'false')
							}
						}
					}
					if (!slider) {
						slider = document.createElement('div')
						buxuSetAttr(slider, SLIDER_ATTR, '')
						buxuSetAttr(slider, 'role', 'slider')
						buxuSetAttr(slider, 'tabindex', '0')
						buxuSetAttr(slider, 'aria-label', '推理等级')
						buxuSetAttr(slider, 'aria-valuemin', '0')
						buxuSetAttr(slider, 'aria-valuemax', '100')
						buxuSetAttr(slider, 'aria-busy', 'false')
						buxuSetAttr(slider, 'data-buxu-effort-error', '')
						ownedSliders.add(slider)
						const track = document.createElement('div')
						buxuSetAttr(track, 'data-buxu-effort-track', '')
						const fill = document.createElement('div')
						buxuSetAttr(fill, 'data-buxu-effort-fill', '')
						const ticks = document.createElement('div')
						buxuSetAttr(ticks, 'data-buxu-effort-ticks', '')
						/* 刻度点由 refreshTicks 按真实档位数动态生成（自适应模型） */
						const knob = document.createElement('div')
						buxuSetAttr(knob, 'data-buxu-effort-knob', '')
						track.appendChild(fill)
						track.appendChild(ticks)
						slider.appendChild(track)
						slider.appendChild(knob)
						target.appendChild(slider)

						/* ---- 连续拖动 ---- */
						let dragging = false
						let pointerId = null
						let pos = 0
						let dragStartIndex = currentIndex
						let submitting = false
						const setPos = (v) => {
							pos = Math.max(0, Math.min(100, v))
							buxuSetStyle(slider, '--buxu-effort-pos', pos.toFixed(1) + '%')
						}
						const currentCount = () => {
							const cv = target.querySelector("[class*='_cellValue']")
							return effectiveCount(cv ? (cv.textContent || '').trim() : '')
						}
						const posFromEvent = (e) => {
							const r = slider.getBoundingClientRect()
							if (!r.width) return pos
							return (e.clientX - r.left) / r.width * 100
						}
						/* 拖动中就近吸附到档位点 + 高亮该刻度（需求1）。
						   滑块是连续的，但只在各档位点之间跳，带明显磁感；
						   松手即选中当前吸附档位（需求2）。 */
						const snapMove = (raw) => {
							const count = currentCount()
							if (count <= 0) { setPos(0); highlightTick(-1); return }
							const idx = indexForPos(Math.max(0, Math.min(100, raw)), count)
							dragIdx = idx
							setPos(posForIndex(idx, count))
							highlightTick(idx)
						}
						const onDown = (e) => {
							if (effectStopped || submitting || dragging || currentCount() <= 1 || (e.button !== undefined && e.button !== 0) || e.isPrimary === false) return
							dragging = true
							pointerId = e.pointerId
							dragStartIndex = currentIndex
							snapMove(posFromEvent(e))
							try { slider.setPointerCapture && slider.setPointerCapture(e.pointerId) } catch (err) {}
							e.preventDefault()
							e.stopPropagation()
						}
						const onMove = (e) => {
							if (!dragging) return
							snapMove(posFromEvent(e))
							e.preventDefault()
						}
						const onUp = (e) => {
							if (!dragging || e.pointerId !== pointerId) return
							dragging = false
							pointerId = null
							try { slider.releasePointerCapture && slider.releasePointerCapture(e.pointerId) } catch (err) {}
							const count = currentCount()
							if (count > 0 && !effectStopped) {
								const idx = Math.max(0, Math.min(count - 1, dragIdx))
								setPos(posForIndex(idx, count))
								highlightTick(idx)
								submitting = true
								Promise.resolve(commit(idx, target, count, slider, dragStartIndex)).then((ok) => {
									submitting = false
									if (!ok && !effectStopped) {
										currentIndex = dragStartIndex
										setPos(posForIndex(dragStartIndex, currentCount()))
										highlightTick(dragStartIndex)
										buxuSetAttr(slider, 'data-buxu-effort-error', '未能保存推理档位，请使用官方列表重试。')
									}
								}).catch(() => { submitting = false })
							}
							e.preventDefault()
							e.stopPropagation()
						}
						const onCancel = (e) => {
							if (!dragging || (e.pointerId !== undefined && e.pointerId !== pointerId)) return
							dragging = false
							pointerId = null
							currentIndex = dragStartIndex
							setPos(posForIndex(dragStartIndex, currentCount()))
							highlightTick(dragStartIndex)
							e.preventDefault()
							e.stopPropagation()
						}
						const onKeyDown = (e) => {
							if (effectStopped || submitting) return
							const count = currentCount()
							if (count <= 0) return
							let next = currentIndex
							if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next--
							else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next++
							else if (e.key === 'Home') next = 0
							else if (e.key === 'End') next = count - 1
							else if (e.key === 'Escape') {
								setPos(posForIndex(currentIndex, count))
								highlightTick(currentIndex)
								e.preventDefault()
								e.stopPropagation()
								return
							} else return
							next = Math.max(0, Math.min(count - 1, next))
							if (next === currentIndex) { e.preventDefault(); return }
							setPos(posForIndex(next, count))
							highlightTick(next)
							const beforeIndex = currentIndex
							submitting = true
							Promise.resolve(commit(next, target, count, slider, beforeIndex)).then((ok) => {
								submitting = false
								if (!ok && !effectStopped) {
									currentIndex = beforeIndex
									setPos(posForIndex(beforeIndex, currentCount()))
									highlightTick(beforeIndex)
								}
							}).catch(() => { submitting = false })
							e.preventDefault()
							e.stopPropagation()
						}
						const onBlur = () => {
							if (dragging) {
								dragging = false
								pointerId = null
								setPos(posForIndex(dragStartIndex, currentCount()))
								highlightTick(dragStartIndex)
							}
						}
						sliderDisposer = () => {
							onBlur()
							for (const [type, fn] of [
								['pointerdown', onDown], ['pointermove', onMove], ['pointerup', onUp],
								['pointercancel', onCancel], ['lostpointercapture', onCancel],
								['keydown', onKeyDown], ['blur', onBlur],
								['click', (e) => e.stopPropagation()]
							]) slider.removeEventListener(type, fn)
						}
						sliderDisposers.set(slider, sliderDisposer)
						slider.addEventListener('pointerdown', onDown)
						slider.addEventListener('pointermove', onMove)
						slider.addEventListener('pointerup', onUp)
						slider.addEventListener('pointercancel', onCancel)
						slider.addEventListener('lostpointercapture', onCancel)
						slider.addEventListener('keydown', onKeyDown)
						slider.addEventListener('blur', onBlur)
						/* 阻止冒泡到官方行（否则点滑块会触发 drill 打开子页） */
						slider.addEventListener('click', (e) => { e.stopPropagation() })
					}
					/* 同步当前档位到滑块位置：按真实档位数动态生成刻度。
					   目录不可用（count=0）时清空刻度、位置归零，绝不用猜测值。 */
					const count = effectiveCount(text)
					refreshTicks(slider, count)
					const idx = indexFromText(text)
					buxuSetAttr(slider, 'aria-valuenow', count > 0 ? String(Math.round(posForIndex(idx, count))) : '0')
					buxuSetAttr(slider, 'aria-valuetext', count > 0 ? (efforts[idx] ? efforts[idx].name : '未知档位') : '目录不可用')
					buxuSetAttr(slider, 'aria-disabled', count <= 1 ? 'true' : 'false')
					buxuSetAttr(slider, 'tabindex', count > 1 && !effectStopped ? '0' : '-1')
					buxuSetStyle(slider, '--buxu-effort-pos', count > 0 ? posForIndex(idx, count) + '%' : '0%')
					/* 刻度可能刚被 refreshTicks 重建，强制重算高亮。 */
					lastHi = -1
					highlightTick(count > 0 ? idx : -1)
					return slider
				}

				/** 绑定 catalog：同步 store 订阅 + remote RPC 异步兜底。
				   目录刷新（模型/适配器/凭据变更）时重读档位并重画刻度。 */
				const bindCatalog = () => {
					let dirs = null
					try { dirs = ctx.get('modelDirectories') } catch (e) { dirs = null }
					if (!dirs) { try { dirs = ctx.modelDirectories } catch (e) { dirs = null } }
					try {
						const store = dirs && dirs.catalog && dirs.catalog.store
						if (store && typeof store.subscribe === 'function') {
							unsubCatalog = store.subscribe(() => { readEfforts(); apply() })
						}
					} catch (e) { unsubCatalog = null }
					/* 即便同步 store 暂未 ready，也用官方 RPC 拉一次（异步兜底）。 */
					try {
						const remote = ctx.get('remote')
						if (remote && remote.session && typeof remote.session.modelCatalog === 'function') {
							const r = remote.session.modelCatalog()
							if (r && typeof r.then === 'function') r.then((resp) => {
								if (resp && resp.value) { rpcCatalog = resp.value; readEfforts(); apply() }
							}).catch(() => {})
						}
					} catch (e) { /* 无 remote 通道时忽略 */ }
				}

				const apply = () => {
					if (effectStopped || !themeEnabled()) return
					/* 从 catalog 读当前模型真实档位（根页同步，无需子页） */
					readEfforts()
					const items = document.querySelectorAll("[role='menuitem'][class*='_cell']")
					if (items.length === 0) return
					let target = null
					for (const it of items) {
						const label = it.querySelector("[class*='_cellLabel']")
						if (label && EFFORT_LABELS.indexOf((label.textContent || '').trim()) >= 0) {
							target = it
							break
						}
					}
					if (!target && items.length === 2) {
						const l2 = items[1].querySelector("[class*='_cellLabel']")
						const t2 = l2 ? (l2.textContent || '').trim() : ''
						if (!/^(模型|Model|モデル|modelo)$/i.test(t2)) target = items[1]
					}
					if (!target) return
					const val = target.querySelector("[class*='_cellValue']")
					const text = val ? (val.textContent || '').trim() : ''
					if (!text) return
					buxuSetAttr(target, 'data-buxu-effort', '')
					buildSlider(target, text)
				}
				/* 2026-11-07 提速：菜单弹出后滑块要"跟手"出现。
				   原来是 120ms setTimeout 防抖，菜单 DOM 就绪后还要等 120ms 才插入，
				   肉眼就是慢半拍。改用 requestAnimationFrame：下一帧（~16ms）即执行，
				   同一帧内多次 MutationObserver 回调仍被合并（防抖语义保留）。
				   并对回调做特征过滤：只有新增节点里含 menuitem 才真正调度，
				   避免打字/流式输出等无关 DOM 变化反复唤醒。 */
				const schedule = () => {
					if (timer !== null) return
					timer = requestAnimationFrame(() => { timer = null; apply() })
				}
				const shouldSchedule = (records) => {
					for (const rec of records) {
						const nodes = rec.addedNodes || []
						for (const n of nodes) {
							if (n.nodeType !== 1) continue
							if (n.matches && n.matches("[role='menuitem']")) return true
							if (n.querySelector && n.querySelector("[role='menuitem']")) return true
						}
					}
					return false
				}
				bindCatalog()
				apply()
				if (typeof MutationObserver !== 'undefined' && document.body) {
					obs = new MutationObserver((records) => { if (shouldSchedule(records)) schedule() })
					obs.observe(document.body, { childList: true, subtree: true })
				}
				return () => {
					effectStopped = true
					effortGeneration++
					if (timer !== null) cancelAnimationFrame(timer)
					if (obs) obs.disconnect()
					if (typeof unsubCatalog === 'function') { try { unsubCatalog() } catch (e) {} }
					unsubCatalog = null
					for (const slider of ownedSliders) {
						try { if (sliderDisposers.has(slider)) sliderDisposers.get(slider)() } catch (e) {}
						try { if (slider.parentNode) slider.parentNode.removeChild(slider) } catch (e) {}
					}
					ownedSliders.clear()
					sliderDisposers.clear()
				}
			}, 'dsh-theme-buxu: effort bar')

			/* ---- 头像设置页 ----
			   注册到 settings.section（官方设置页的左侧区块，dshmarket 同款做法）。
			   内容：两个头像的预览 + 选择文件 + 恢复默认。
			   选图用浏览器原生 <input type=file>（不依赖 desktop API），
			   读成 dataURL 后用 canvas 压到 128px，减小 localStorage 占用。 */


			function AvatarSettings() {
				return h2(
					'div',
					{ style: { display: 'flex', flexDirection: 'column', fontSize: '13px' } },
					h2('p', { style: { margin: '0 0 4px', color: 'var(--dsw-alias-label-secondary)' } },
						'自定义对话头像。图片会自动压缩到 128×128，仅保存在本地。'),
					h2(AvatarRow, { kind: 'assistant' }),
					h2(AvatarRow, { kind: 'user' })
				)
			}

			ctx.effect(() => {
				if (!ctx.slots) return
				let dispose = null
				let tries = 0
				let timer = null
				let stopped = false
				const attempt = () => {
					if (stopped) return
					try {
						dispose = ctx.slots.register(
							{
								name: 'settings.section',
								id: 'dsh-theme-buxu',
								order: 60,
								label: () => '不虚 · 质肤'
							},
							() => h2(BuxuBoundary, null, h2(BuxuSettingsPage, null))
						)
					} catch (e) {
						if (++tries < 100 && !stopped) timer = setTimeout(attempt, 100)
					}
				}
				attempt()
				return () => {
					stopped = true
					if (timer) clearTimeout(timer)
					if (dispose) dispose()
				}
			}, 'dsh-theme-buxu: settings section')



			/* ---- 侧栏入口注册（主侧栏那一行 + 点开后的主区页面）----
			   **踩过的坑（2026-11-05）**：一开始仿 xdpool 写成
			     ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(...))
			   结果侧栏没出现入口。原因两点：
			     ① inject 的回调是「槽声明就绪时」才触发，而且它的返回值
			        不是 dispose，我把它丢了 → 注册了也没法清理，更可能是
			        回调压根没触发（槽声明在插件之后才登记）。
			     ② register 抛错被 catch 静默吞掉，界面无提示。
			   改法：跟徽标那处一样，**直接 register + 退避重试**，
			   把 dispose 存进 disposers 供 cleanup 用，失败打日志不静默。 */
			ctx.effect(() => {
				if (!ctx.slots) return
				const disposers = []
				let tries = 0
				let timer = null
				let stopped = false
				/* 官方契约（读 dsh-client-ui-sidebar 的 slots.ts 得到）：
				     sidebar.panellist  kind=list scope=root
				     「Each list id addresses the matching main panel;
				       the sidebar owns the button and resolves its label from list metadata」
				   即：panellist 的 id 必须与 main 的 key 完全一致，
				   label 走 locale 元数据而非硬编码字符串。
				   并且**必须经 ctx.slots.inject 包一层** —— 这是框架的
				   「槽声明就绪后再登记」机制，直接 register 会成功但不上屏。 */
				const hasInject = typeof ctx.slots.inject === 'function'
				const attempt = () => {
					if (stopped) return
					let ok = true
					const regPanel = () => ctx.slots.register({
						name: 'sidebar.panellist',
						id: 'buxu',
						order: 30,
						label: () => '不虚 · 质肤'
					}, BuxuIcon)
					const regMain = () => ctx.slots.register({ name: 'main', key: 'buxu' }, BuxuPanelPage)
					try {
						const d = hasInject ? ctx.slots.inject('sidebar.panellist', regPanel) : regPanel()
						if (typeof d === 'function') disposers.push(d)
					} catch (e) {
						ok = false
						console.warn('[dsh-theme-buxu] sidebar.panellist 登记失败: ' + e)
					}
					try {
						const d = hasInject ? ctx.slots.inject('main', regMain) : regMain()
						if (typeof d === 'function') disposers.push(d)
					} catch (e) {
						ok = false
						console.warn('[dsh-theme-buxu] main 登记失败: ' + e)
					}
					if (!ok && ++tries < 40 && !stopped) {
						for (const d of disposers.splice(0)) { try { d() } catch (e) { /* 忽略 */ } }
						timer = setTimeout(attempt, 150)
					}
				}
				attempt()
				return () => {
					stopped = true
					if (timer) clearTimeout(timer)
					for (const d of disposers) { try { d() } catch (e) { /* 忽略 */ } }
				}
			}, 'dsh-theme-buxu: sidebar entry')

			/* ---- 已归档 A2：两个官方槽 ----
			   全部走 ctx.slots.inject（等待声明/卸载 dispose/恢复重注册 = 抗升级）。
			   ① sidebar.footer.action  入口（list / none，ownerProps.wide）
			   ② shell.overlay          浮层（list / none，默认 click-through）
			   2026-11-09 移除第三个「官方右键菜单加项」槽：真机确认官方菜单
			   本来就有「复制 Session ID」，重复且无图标显外挂，用户拍板删掉。
			   两个组件用闭包绑 ctx（服务调用需要），其余 props 由官方 standardKit 注入。
			   每个槽独立 disposer，失败互不牵连；退避重试上限 40 次。 */
			ctx.effect(() => {
				if (!ctx.slots) return
				const disposers = []
				let tries = 0
				let timer = null
				let stopped = false
				const hasInject = typeof ctx.slots.inject === 'function'
				const bind = (Comp) => (props) => h2(Comp, Object.assign({ ctx: ctx }, props || {}))
				const attempt = () => {
					if (stopped) return
					let ok = true
					const reg = (slot, def, Comp) => {
						try {
							const d = hasInject
								? ctx.slots.inject(slot, () => ctx.slots.register(def, bind(Comp)))
								: ctx.slots.register(def, bind(Comp))
							if (typeof d === 'function') disposers.push(d)
						} catch (e) { ok = false; console.warn('[dsh-theme-buxu] ' + slot + ' 登记失败: ' + e) }
					}
					reg('sidebar.footer.action',
						{ name: 'sidebar.footer.action', id: 'dsh-theme-buxu-archive', order: 90, label: () => '已归档' },
						ArchiveEntry)
					reg('shell.overlay',
						{ name: 'shell.overlay', id: 'dsh-theme-buxu-archive-panel', order: 90 },
						ArchivedPanel)
					if (!ok && ++tries < 40 && !stopped) {
						for (const d of disposers.splice(0)) { try { d() } catch (e) {} }
						timer = setTimeout(attempt, 150)
					}
				}
				attempt()
				return () => {
					stopped = true
					if (timer) clearTimeout(timer)
					for (const d of disposers) { try { d() } catch (e) {} }
					archiveSetOpen(false)
				}
			}, 'dsh-theme-buxu: archived A2')

		}
		exports.apply = apply
		/* inject 声明很关键：**locale 必须列进来**，否则 ctx.slots 拿到的是简化版，
		   ctx.slots.inject 为 undefined，侧栏入口注册会抛 TypeError 而不上屏。
		   这是实测踩到的坑（2026-11-05）：xdpool 与官方 schedule 都声明了 locale。
		   layout 用于侧栏宽度；configForms 必须显式声明，确保配置服务就绪后再绑定。 */
		/* A2 归档浮层需要 sessions / uiWorkspace / workspaces 三个服务
		   （ctx.get 取用），一并声明以便宿主按依赖顺序装载。 */
		exports.inject = ['slots', 'locale', 'layout', 'configForms', 'sessions', 'uiWorkspace', 'workspaces']
		return module.exports
	}
})
