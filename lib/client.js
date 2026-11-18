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

		/* ---- 会话手动标记（2026-11-12）----
		   待办 = 小方块（蓝 #4A7FD0）；重要 = 菱形（橙 #F7630C）。
		   「锦上添花、不喧宾夺主」：官方 schedule-mark 是 16×20 中性灰图标，
		   官方状态圆点/角标是 6px。我们取 6px、70% 不透明度，比官方更收敛；
		   不发光、不加边框动画、没标记时什么都不渲染。
		   尺寸/颜色集中在这里，真机探针结果不同时只改这几行。 */
		const SESSION_MARK_SIZE = 6
		const SESSION_MARK_OPACITY = 0.7
		/* 2026-11-18：标记色改为**按当前配色深浅自适应**。
		   原来固定 #4A7FD0 / #F7630C，在云白/宣纸两套浅色主题下
		   重要色对比度只有 2.41 / 2.49:1（低于非文本元素 3:1 标准），
		   小菱形几乎看不见。
		   语义色相保持不变（待办仍是蓝、重要仍是橙）—— 它们是功能标识，
		   不是装饰，所以不做「跟着配色色相走」；只按深浅给两个明度档：
		     深色主题：亮档（蓝 #6294DA / 橙 #EC823C）
		     浅色主题：暗档（蓝 #2960AE / 橙 #B05111）
		   六套实测 vs 侧栏与 vs hover 均 >= 3:1（最差 3.67:1）。 */
		const SESSION_MARK_TODO_DARK = '#6294DA'
		const SESSION_MARK_IMPORTANT_DARK = '#EC823C'
		const SESSION_MARK_TODO_LIGHT = '#2960AE'
		const SESSION_MARK_IMPORTANT_LIGHT = '#B05111'
		/** 取当前配色对应的标记色。 */
		function sessionMarkColor(kind) {
			let isDark = true
			try {
				const st = settingsValue()
				const pid = (st && st.palette) || DEFAULT_PALETTE_ID
				const pal = PALETTES[pid]
				isDark = !pal || pal.scheme !== 'light'
			} catch (e) { /* 取不到设置时按深色处理 */ }
			const wantImportant = kind === 'important'
			if (isDark) return wantImportant ? SESSION_MARK_IMPORTANT_DARK : SESSION_MARK_TODO_DARK
			return wantImportant ? SESSION_MARK_IMPORTANT_LIGHT : SESSION_MARK_TODO_LIGHT
		}
		const SESSION_MARK_FIELD = 'sessionMarks'

		/** 解析 sessionMarks JSON，永不抛错；非法值回落空对象。 */
		function readSessionMarks() {
			try {
				const raw = settingsValue()[SESSION_MARK_FIELD]
				if (typeof raw !== 'string' || !raw) return {}
				const obj = JSON.parse(raw)
				return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {}
			} catch (e) { return {} }
		}
		/** 读单个会话的标记：'' | 'todo' | 'important' | 'both'。 */
		function sessionMarkOf(id) {
			const v = readSessionMarks()[id]
			return v === 'todo' || v === 'important' || v === 'both' ? v : ''
		}
		/** 切换某个位；写回走 persistSettings（与设置页同一持久化链路）。 */
		function toggleSessionMark(id, bit) {
			if (!id) return
			const all = readSessionMarks()
			const cur = all[id] === 'todo' || all[id] === 'important' || all[id] === 'both' ? all[id] : ''
			let hasTodo = cur === 'todo' || cur === 'both'
			let hasImportant = cur === 'important' || cur === 'both'
			if (bit === 'todo') hasTodo = !hasTodo
			else hasImportant = !hasImportant
			const next = hasTodo && hasImportant ? 'both' : hasTodo ? 'todo' : hasImportant ? 'important' : ''
			if (next) all[id] = next
			else delete all[id]
			let text
			try { text = JSON.stringify(all) } catch (e) { return }
			persistSettings({ [SESSION_MARK_FIELD]: text }, 'sessionMarks:toggle').catch(() => {})
		}

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

	/* ================================================================
	 * body 级 MutationObserver 单一派发器（2026-11-15 轻量化组 A）
	 *
	 * 之前 5 个 effect 各建一个 observe(document.body, {subtree:true}) 的
	 * observer：兼容契约检查 / 头像扫描 / 头像覆盖 / TodoPanel / 推理条。
	 * 浏览器每批 DOM 变化都要派发 5 次回调，是常驻开销的主要来源。
	 * 现在合并为一个实例，把同一批 records 分发给所有订阅者；每个订阅者
	 * 原有的 shouldSchedule / 判等 / rAF 防抖逻辑一律保留，只是回调入口
	 * 从「各自 new MutationObserver」改成「订阅 hub」。
	 *
	 * 懒创建：第一个订阅者来时 observe，最后一个 unsubscribe 时 disconnect。
	 * options 取并集（childList + subtree + characterData）；只观察 body
	 * 属性的契约（attributeFilter）和 frame 元素的契约保持独立，不并入。
	 * ================================================================ */
	let _bodyHub = null
	let _bodyHubSubs = []
	function subscribeBodyMutations(cb) {
		if (typeof cb !== 'function') return () => {}
		const sub = { cb: cb }
		_bodyHubSubs.push(sub)
		if (!_bodyHub && typeof MutationObserver !== 'undefined' && document.body) {
			_bodyHub = new MutationObserver((records) => {
				const list = _bodyHubSubs.slice()
				for (let i = 0; i < list.length; i++) {
					try { list[i].cb(records) } catch (e) { /* 单个订阅者异常不拖垮其它 */ }
				}
			})
			try {
				_bodyHub.observe(document.body, { childList: true, subtree: true, characterData: true })
			} catch (e) { _bodyHub = null }
		}
		return () => {
			const at = _bodyHubSubs.indexOf(sub)
			if (at >= 0) _bodyHubSubs.splice(at, 1)
			if (_bodyHubSubs.length === 0 && _bodyHub) {
				try { _bodyHub.disconnect() } catch (e) {}
				_bodyHub = null
			}
		}
	}

		/* 头像资源说明（内置默认图 = 「恢复默认」回落到这两张）
		   2026-11-12：把两张内置图提取成模块级常量，CSS 与 JS 共用同一数据源，
		   并在 applyAvatarOverrides 里显式写回，不再依赖 removeProperty 的隐式层叠。
		   用户在设置里上传的头像走 configForms 持久化到 cordis.patch.yml，
		   由 applyAvatarOverrides() 覆写，与这里的内置默认图互不影响。 */
		/* 两张内置默认图 = 「恢复默认」的唯一目标，CSS 与 JS 共用同一份数据。
		   助手：透明底鲸鱼（原内联在 CSS 里，现提取成常量）；
		   用户：桌面 111.png 重采样成 128×128 的浅黄绿纯色 PNG。
		   用户自定义头像走 configForms 存 cordis.patch.yml，与本常量互不影响。 */
		const BUILTIN_AVATAR_ASSISTANT = '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'
		/* ---- 默认用户头像：用户的「我.png」，六套配色各一版（2026-11-18）----
		   设计：头像色 = 当前配色强调色的压深版，保留原图「深底白字」语言，
		        白字对比全部 >= 4.5:1（见 _tmp_design_avatar_colors2.py 的校验）。
		   体积：200×200 原图 base64 需 131 KB，缩到 64×64 + 量化 64 色后
		        每张约 4.5 KB，六张合计 35.4 KB（client.js 增加约 9%）。
		        64px 足够：头像实际显示 26~40px，已覆盖 2× 高分屏。 */
		/* 石墨 #4B5B6C（中性：饱和 18%，与藏青饱和蓝区分） */
		const AVATAR_ME_SLATE2 =
			'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'
		/* 墨玉 #2D8659 */
		const AVATAR_ME_INKJADE =
			'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'
		/* 藏青 #4578BA */
		const AVATAR_ME_CANGQING =
			'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'
		/* 石墨紫 #7D6EA6 */
		const AVATAR_ME_SHIMOZI =
			'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'
		/* 云白 #324452 */
		const AVATAR_ME_CLOUD2 =
			'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'
		/* 宣纸 #504135 */
		const AVATAR_ME_RICEPAPER =
			'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'
		const BUILTIN_AVATAR_USER = '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'

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
				/* 2026-11-18：配色自带强调色与推荐推理条。
				   用户未手动改过时跟随这些值（见 accentUserSet / effortUserSet），
				   保证切换配色时整体主题一致，而不是只有底色变。 */
				/* 2026-11-18：26% → 10% 饱和。
				   石墨是「中性」主题，强调色本就不该有明显色相；
				   原 #859EB7 与藏青 #5D8AC6 的色相只差 4°，切换时几乎看不出变化。
				   降饱和后与藏青的饱和度差从 22% 拉到 37.5%，
				   区分变成「中性 vs 有彩色」的语义差异，而不是硬拉色相。
				   对比度同时从 6.52:1 提升到 7.97:1。 */
				accent: '#A5ADB6',
				effort: 'graphite',
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
				/* 2026-11-18：配色自带强调色与推荐推理条。
				   用户未手动改过时跟随这些值（见 accentUserSet / effortUserSet），
				   保证切换配色时整体主题一致，而不是只有底色变。 */
				accent: '#465F72',
				effort: 'graphite',
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
			},

			/* ---- 3 系列：单色相（2026-11-17 新增四套）----
			   设计原则：
			     · 平面：纯色块，无渐变/玻璃/背景图
			     · 单色相：靠明度构层次，色相饱和度极低（8~15%）
			     · 文字不跟着色相走 —— 避免正文发绿/发蓝/发紫，
			       那样会让长文阅读疲劳（VSCode 生态里 Gruvbox 的字色偏黄
			       就是典型反例，故此处一律用中性暖灰/冷灰）
			     · 强调色单独取更饱和的值，只用于小面积点睛
			   对比度已离线校验：正文/底 >=13:1（AAA）、次级 >=8.6:1、
			   相邻层级区分度 >=1.03:1、侧栏与卡片不同色。 */

			/* 墨玉：墨绿灰底，青绿点睛。墨绿压得很淡，远看是深灰。 */
			'inkjade': {
				id: 'inkjade',
				scheme: 'dark',
				layout: 'plain',
				label: { zh: '质肤·墨玉', en: 'Buxu Ink Jade' },
				/* 2026-11-18：配色自带强调色与推荐推理条。
				   用户未手动改过时跟随这些值（见 accentUserSet / effortUserSet），
				   保证切换配色时整体主题一致，而不是只有底色变。 */
				accent: '#62BC8F',
				effort: 'ocean',
				colors: {
					bgBase: '#0E1310', bg1: '#0E1310', bg2: '#171E1A', bg3: '#1F2823',
					sidebar: '#131A16', composer: '#1D2621', bubble: '#161D19', right: '#0E1310',
					select: '#27322B', hover: '#1E2722',
					text: '#D9DDD9', text2: '#AEB5B0', text3: '#868E89',
					project: '#9AA29C', card: '#171E1A',
					caption: '#868E89', dimmed: '#868E89',
					accent: '#6E9C82', border: 'rgba(255,255,255,0.07)',
					cardBorder: '#26302A', warn: '#E9A660',
					hairline: '#1A211D', panelEdge: '#2B352F'
				}
			},

			/* 藏青：深靛蓝灰底，静蓝点睛。
			   蓝偏移刻意比 GitHub Dark 更大（#0D1220 而非 #0D1117），
			   否则与质肤·石墨（#161616）区分不出来。 */
			'cangqing': {
				id: 'cangqing',
				scheme: 'dark',
				layout: 'plain',
				label: { zh: '质肤·藏青', en: 'Buxu Indigo' },
				/* 2026-11-18：配色自带强调色与推荐推理条。
				   用户未手动改过时跟随这些值（见 accentUserSet / effortUserSet），
				   保证切换配色时整体主题一致，而不是只有底色变。 */
				accent: '#5D8AC6',
				effort: 'blueramp',
				colors: {
					bgBase: '#0C1220', bg1: '#0C1220', bg2: '#151D2C', bg3: '#1D2635',
					sidebar: '#111828', composer: '#1B2434', bubble: '#141B29', right: '#0C1220',
					select: '#25303F', hover: '#1A2230',
					text: '#D6DAE2', text2: '#ABB2BE', text3: '#838B98',
					project: '#979FAE', card: '#151D2C',
					caption: '#838B98', dimmed: '#838B98',
					accent: '#5B83B8', border: 'rgba(255,255,255,0.07)',
					cardBorder: '#222C3D', warn: '#E2A15C',
					hairline: '#171F2E', panelEdge: '#273244'
				}
			},

			/* 石墨紫：紫灰底，紫点睛。
			   底色 R18 G17 B22，蓝紫偏移仅 4 —— 远看就是中性深灰，
			   凑近才有一点紫。强调色 #8B7BC8 才是真正的紫。
			   这样避免「大面积铺紫」的夜店感（Dracula 在 VSCode 里也是这个做法：
			   底色近中性，只有语法高亮是紫的）。 */
			'shimozi': {
				id: 'shimozi',
				scheme: 'dark',
				layout: 'plain',
				label: { zh: '质肤·石墨紫', en: 'Buxu Graphite Violet' },
				/* 2026-11-18：配色自带强调色与推荐推理条。
				   用户未手动改过时跟随这些值（见 accentUserSet / effortUserSet），
				   保证切换配色时整体主题一致，而不是只有底色变。 */
				accent: '#9681CF',
				effort: 'indigo',
				colors: {
					bgBase: '#121116', bg1: '#121116', bg2: '#1D1C25', bg3: '#262530',
					sidebar: '#17161C', composer: '#24232E', bubble: '#1B1A22', right: '#121116',
					select: '#2E2C3A', hover: '#232230',
					text: '#DBD9E0', text2: '#B1AEB8', text3: '#898691',
					project: '#9E9BA6', card: '#1D1C25',
					caption: '#898691', dimmed: '#898691',
					accent: '#8B7BC8', border: 'rgba(255,255,255,0.07)',
					cardBorder: '#2A2836', warn: '#E39E5E',
					hairline: '#1B1A21', panelEdge: '#302E3D'
				}
			},

			/* 宣纸：暖米纸感，棕褐点睛。浅色系，与云白形成「冷白 / 暖米」对照。 */
			'ricepaper': {
				id: 'ricepaper',
				scheme: 'light',
				layout: 'plain',
				label: { zh: '质肤·宣纸', en: 'Buxu Rice Paper' },
				/* 2026-11-18：配色自带强调色与推荐推理条。
				   用户未手动改过时跟随这些值（见 accentUserSet / effortUserSet），
				   保证切换配色时整体主题一致，而不是只有底色变。 */
				accent: '#8D5E35',
				effort: 'sunrise',
				colors: {
					bgBase: '#F7F3EC', bg1: '#F7F3EC', bg2: '#F0EAE0', bg3: '#FDFAF5',
					sidebar: '#ECE5D9', composer: '#FFFDF9', bubble: '#F1EBE0', right: '#F7F3EC',
					select: '#DDD3C3', hover: '#E8DFD1',
					text: '#2E2A24', text2: '#57514A', text3: '#736C62',
					project: '#5E574E', card: '#FDFAF5',
					caption: '#736C62', dimmed: '#736C62',
					accent: '#96663F', border: 'rgba(0,0,0,0.08)',
					cardBorder: '#DCD2C2', warn: '#B4562A',
					hairline: '#EEE8DD', panelEdge: '#D2C7B5'
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
		 * 2 系列（石墨2/云白2）已剥离，定义存于维护者的本地归档，
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
			/* 2026-11-17：新增四套单色相配色，按「深 → 浅」交替排列，
			   便于用户对比切换。石墨（中性深）打头作为默认，宣纸收尾（最后一个浅色）。 */
			const preferred = ['slate2', 'inkjade', 'cangqing', 'shimozi', 'cloud2', 'ricepaper']
			const rest = Object.keys(PALETTES).filter((k) => preferred.indexOf(k) < 0)
			return preferred.filter((k) => PALETTES[k]).concat(rest)
		}

		/* ---- 推理等级进度条色彩方案（2026-11-07 起用，2026-11-16 扩到 6 套）----
		   6 套从**不同维度**设计，默认「单色蓝阶」：
		     ① 单色蓝阶 —— 纯明度变化（同一色相，最克制）
		     ② 暖阳     —— 暖色升温（黄→橙→珊瑚红）
		     ③ 青蓝绿   —— 冷暖过渡（蓝→青→绿）
		     ④ 靛紫粉   —— 邻近冷色（靛→紫→粉）
		     ⑤ 石墨灰   —— 无彩灰阶，最不抢眼，适合配任何色板
		     ⑥ 珊瑚朱   —— 暖红系强对比，进度感最醒目
		   粒子效果改为**独立开关** effortParticles，任意配色都能叠加，
		   不再是某套配色自带。另有 custom：4 个取色器自定义渐变。
		   2026-11-16 新增「用户预设」：自定义配好后可存成自己的预设
		   （命名、可选、可删），存在 effortUserPresets，最多 6 个。
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
			{
				id: 'graphite', label: '石墨灰',
				desc: '无彩灰阶，最不抢眼，任何色板都压得住',
				cssStops: '#C9CDD4 0%, #9BA1AB 34%, #6E7580 67%, #464C55 100%'
			},
			{
				id: 'coral', label: '珊瑚朱',
				desc: '朱红强对比，进度感最醒目',
				cssStops: '#FFB07A 0%, #FF8A5C 34%, #F2603F 67%, #C93B2E 100%'
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
		/** 当前生效的推理条 id（2026-11-18）。
		    用户没手动选过（effortUserSet !== true）时，跟随配色方案自带的
		    effort 推荐值 —— 否则换配色只变底色、推理条仍是旧的，整体不协调。 */
		/** 用户是否「真正设过」推理条。
		 *  与 accent 同样需要向后兼容：effortUserSet 是新增字段，
		 *  老配置里没有 → 会被填成 false。
		 *
		 *  但这里**不能**用「不等于默认 blueramp」来判断 ——
		 *  藏青的推荐值恰好也是 blueramp，会误判。
		 *  改用：值不等于**任何一套配色的推荐 effort** 时，才视为用户自选。
		 *  （用户自选的内置方案如 sunrise/coral/indigo 都属于"某套推荐"，
		 *   会被判成非自选 —— 这是可接受的折中：结果是跟随配色，
		 *   用户若在意可以点一次「恢复跟随配色」旁的选项重新设定。）
		 */
		function effortOwnedByUser(s) {
			if (!s) return false
			if (s.effortUserSet === true) return true
			const cur = s.effortGradient
			if (typeof cur !== 'string') return false
			// custom / user:* 一定是用户自己弄的
			if (cur === 'custom' || cur.startsWith('user:')) return true
			// 内置方案：如果它不是任何配色的推荐值，说明用户特意选过
			for (const pid of Object.keys(PALETTES)) {
				if (PALETTES[pid] && PALETTES[pid].effort === cur) return false
			}
			return true
		}
		function effectiveEffortId(s2) {
			const st = s2 || settingsValue()
			if (effortOwnedByUser(st) && typeof st.effortGradient === 'string') {
				return st.effortGradient
			}
			const pid = (st && st.palette) || DEFAULT_PALETTE_ID
			const pal = PALETTES[pid]
			if (pal && typeof pal.effort === 'string') return pal.effort
			return (st && st.effortGradient) || DEFAULT_EFFORT_GRADIENT
		}
		/** 当前生效的推理条对象。 */
		function effectiveEffort(s2) {
			return effortGradientById(effectiveEffortId(s2))
		}
		/** 当前生效的强调色（2026-11-18）。
		    用户手动设过（含老配置推断，见 accentOwnedByUser）→ 用 s.accent；
		    否则用当前配色自带的 palette.accent，再退回色板 colors.accent。 */
		function effectiveAccent(s2) {
			const st = s2 || settingsValue()
			if (accentOwnedByUser(st) && typeof st.accent === 'string' && /^#[0-9A-Fa-f]{6}$/.test(st.accent)) {
				return st.accent
			}
			const pid = (st && st.palette) || DEFAULT_PALETTE_ID
			const pal = PALETTES[pid]
			if (pal && typeof pal.accent === 'string') return pal.accent
			if (pal && pal.colors && typeof pal.colors.accent === 'string') return pal.colors.accent
			return (st && st.accent) || '#F56619'
		}
		/** 生成自定义方案的色标串。
		    空串 = 「无/透明」：**跳过该站**，只把有色站按原百分比（0/34/67/100）
		    输出，CSS linear-gradient 会在前后两个有色站之间自动平滑过渡
		    —— 即「从前一个颜色过渡到下一个」，而不是补成同色的平段
		    （2026-11-14 真机反馈后修正）。4 站全空时回退默认实色。 */
		function customCssStops(colors) {
			const arr = Array.isArray(colors) && colors.length === 4 ? colors : DEFAULT_EFFORT_CUSTOM
			const ok = (c) => /^#[0-9A-Fa-f]{6}$/.test(c)
			const at = [0, 34, 67, 100]
			const stops = []
			for (let i = 0; i < 4; i++) {
				const x = arr[i]
				if (x === '') continue                 /* 无色站跳过 */
				stops.push((ok(x) ? x : DEFAULT_EFFORT_CUSTOM[i]) + ' ' + at[i] + '%')
			}
			if (stops.length === 0) return DEFAULT_EFFORT_CUSTOM.map((c, i) => c + ' ' + at[i] + '%').join(', ')
			/* 少于 2 个色标时 linear-gradient 不会过渡：补一个终点，保证始终有渐变 */
			if (stops.length === 1) stops.push(stops[0].split(' ')[0] + ' 100%')
			return stops.join(', ')
		}
		/** 当前生效的色标串：自定义方案从配置读，其余用预置。 */
		function activeCssStops(g, settings) {
			return g.custom ? customCssStops(settings && settings.effortCustomColors) : g.cssStops
		}

		/* ---- 用户自存预设（2026-11-16）----
		   存在 effortUserPresets（JSON 字符串），形如：
		     [{"id":"user:1699999999999","name":"我的蓝","colors":["#..","#..","#..","#.."]}]
		   设计约束：
		     · 只存 4 个色值（与内置预设同构），用 customCssStops 生成渐变；
		     · 解析失败一律回落空数组 —— 坏数据不能连累内置预设；
		     · 最多 EFFORT_USER_PRESETS_MAX 个，超出时丢弃最旧的；
		     · id 用 user:<毫秒时间戳>，与 Host schema 的 /^user:\d{1,16}$/ 对齐。 */
		const EFFORT_USER_PRESETS_MAX = 6
		function parseUserPresets(raw) {
			if (typeof raw !== 'string' || raw === '') return []
			let arr
			try { arr = JSON.parse(raw) } catch (e) { return [] }
			if (!Array.isArray(arr)) return []
			const out = []
			for (const it of arr) {
				if (!it || typeof it !== 'object') continue
				const id = typeof it.id === 'string' ? it.id : ''
				if (!/^user:\d{1,16}$/.test(id)) continue
				const colors = Array.isArray(it.colors) ? it.colors : null
				if (!colors || colors.length !== 4) continue
				const okColors = colors.every((c) => c === '' || /^#[0-9A-Fa-f]{6}$/.test(c))
				if (!okColors) continue
				const name = (typeof it.name === 'string' && it.name.trim()) ? it.name.trim().slice(0, 24) : '未命名'
				out.push({ id, name, colors: colors.slice() })
			}
			return out.slice(-EFFORT_USER_PRESETS_MAX)
		}
		/** 把用户预设转成与内置同构的 gradient 对象，便于复用 gradCard / activeCssStops。 */
		function userPresetToGradient(p) {
			return {
				id: p.id, label: p.name,
				desc: '用户预设',
				cssStops: customCssStops(p.colors),
				custom: false,
				userPreset: true,
				colors: p.colors
			}
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
  /* ===== 2026-11-18 全量排查：补齐「不跟随主题」的官方 token =====
     审计发现官方定义 138 个 --dsw-alias-*，插件原只覆盖 36 个，
     其中 42 个带颜色语义的未覆盖 —— 换配色后这些仍是 DeepSeek 蓝/固定灰。
     按语义分三类处理，下面只补 A、C 两组：
       A 品牌色 → 跟随配色强调色（原本是蓝，不跟随会「按钮还是蓝的」）
       C 表面色 → 跟随底色阶梯（卡片/工具栏底色，不协调最明显）
       B 功能语义色（错误红/成功绿/警告橙）**刻意不覆盖** ——
         它们表达状态而非品牌，随主题变色会让「错误」看起来不严重。
         其明度已在各配色 warn 字段里按深浅分档。 */

  /* ---- A 品牌色：跟随强调色 ---- */
  --dsw-alias-brand-primary-invert: ${userAccent} !important;
  --dsw-alias-brand-primary-new-colorprimary-new-color: ${userAccent} !important;
  --dsw-alias-button-primary-fill: ${userAccent} !important;
  --dsw-alias-button-primary-hover: color-mix(in srgb, ${userAccent} 88%, #FFFFFF) !important;
  --dsw-alias-button-primary-dimmed: color-mix(in srgb, ${userAccent} 55%, ${p.bg2}) !important;
  --dsw-alias-state-business-tertiary: color-mix(in srgb, ${userAccent} 22%, ${p.bg2}) !important;
  --dsw-alias-interactive-bg-hover-accent: color-mix(in srgb, ${userAccent} 16%, ${p.hover}) !important;
  --dsw-alias-link: ${userAccent} !important;
  --dsw-alias-onboarding-accent: ${userAccent} !important;
  --dsw-alias-label-primary-bluish: ${userAccent} !important;

  /* ---- C 表面色：跟随底色阶梯 ---- */
  --dsw-alias-card-fill: ${p.card} !important;
  --dsw-alias-card-fill-hover: ${p.hover} !important;
  --dsw-alias-card-tile-fill: ${p.bg2} !important;
  --dsw-alias-settings-card-fill: ${p.card} !important;
  --dsw-alias-button-floating-fill: ${p.composer} !important;
  --dsw-alias-button-ghost-active-fill: ${p.select} !important;
  --dsw-alias-button-tool-bar-fill: ${p.composer} !important;
  --dsw-alias-button-tool-bar-fill-invisible: transparent !important;
  --dsw-alias-button-contrast-fill: ${p.bg3} !important;
  --dsw-alias-menu-group-header-fill: ${p.bg3} !important;
  --dsw-alias-markdown-tag: ${p.bg3} !important;
  /* 用户强调色：只给局部控件白名单消费，框架主体色一律不受它影响。
     2026-11-06 用户反馈「强调色把整体页面颜色都换了」的根治。 */
  --buxu-user-accent: ${userAccent} !important;
  /* 2026-11-18：发送按钮跟随强调色。
     官方 InputBar.module.css 里发送圆圈是
       .primary { background: var(--dsw-alias-button-info-fill) }
       .primary:hover { background: var(--dsw-alias-button-info-hover) }
     默认是 #3964FE(浅) / #679EFE(深) 的「info-fill 对」，与主题无关。
     之前用 [button[type=submit]] 选择器完全没命中（官方不用 submit）。
     改为直接覆盖这两个 token —— 官方读 token，不依赖 CSS Module 哈希类名。
     hover 提亮 12%，对应官方 .primary:hover 的行为。 */
  --dsw-alias-button-info-fill: ${userAccent} !important;
  --dsw-alias-button-info-hover: color-mix(in srgb, ${userAccent} 88%, #FFFFFF) !important;
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

 /* ---- 会话右键主菜单浮层：跟主题走中性灰（2026-11-13）----
    官方 [data-context-menu][role=menu] 容器自身不写 background，靠外层材质，
    深色下是官方蓝灰、与黑白灰主题不一致；云白下更会露出深色底。
    这里用主题自己的 --buxu-pop-* 中性灰 token 覆写表面/描边/阴影/文字，
    与归档面板、换肤弹窗、复制到工作区子菜单同一套，深浅自动跟随。
    选择器只用官方稳定属性（data-context-menu + role=menu），零哈希类名。
    菜单项 hover 仍由官方 --dsw-alias-interactive-bg-hover 处理（主题已在
    token 层把该变量覆写成 p.hover，云白下自动变浅）。 */
 ${scope} [data-context-menu][role='menu'] {
   background: var(--buxu-pop-surface) !important;
   border: 1px solid var(--buxu-pop-border) !important;
   box-shadow: var(--buxu-pop-shadow) !important;
   color: ${p.text} !important;
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
/* 2026-11-15 闪动修复（第三轮）：这整段原本是给**代码块头部**按钮设计的
   （见上面 720-724 的官方结构注释），但 [class*='_actions_'] 通配会误伤
   用户消息下方的 MessageIconActions 操作栏（复制等 28×28 按钮，官方自带
   transition: all）。质肤的 background/transition !important 与官方 hover
   打架 → 鼠标放上去就闪。
   代码块头部必有 [class*='_language_'] 语言标签，消息操作栏没有，
   用 :has() 把 6 条规则全部收窄到代码块头部，彻底不碰消息操作栏。
   :has() 在本文件 356 行起已大量使用，宿主支持。 */
/* 右侧按钮组：只拉开一点间距 */
${scope} [class*='_header_']:has([class*='_language_']) [class*='_actions_'] {
  gap: 6px !important;
}
/* 单个操作按钮：官方的透明裸图标，只补 hover 与焦点环 */
${scope} [class*='_header_']:has([class*='_language_']) [class*='_actions_'] [class*='_action_'] {
  border: 0 !important;
  border-radius: var(--dsw-radius-sm) !important;
  background: transparent !important;
  color: var(--dsw-alias-label-tertiary) !important;
  transition: background-color 120ms ease, color 120ms ease !important;
}
${scope} [class*='_header_']:has([class*='_language_']) [class*='_actions_'] [class*='_action_']:hover {
  background: var(--dsw-alias-interactive-bg-hover) !important;
  color: var(--dsw-alias-label-primary) !important;
}
${scope} [class*='_header_']:has([class*='_language_']) [class*='_actions_'] [class*='_action_']:focus-visible {
  outline: 2px solid var(--dsw-focus-ring-color, var(--buxu-user-accent)) !important;
  outline-offset: 2px !important;
}
@media (prefers-reduced-motion: reduce) {
  ${scope} [class*='_header_']:has([class*='_language_']) [class*='_actions_'] [class*='_action_'] {
    transition: none !important;
  }
}
/* 消息操作栏（MessageIconActions，按钮带 data-clock）不匹配上面的
   :has([class*='_language_']) 限定，因此完全不被质肤接管，交还官方
   自己的 hover / transition: all —— 这是「不闪」的根本。 */
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
  background-image: url("data:image/png;base64,${BUILTIN_AVATAR_ASSISTANT}") !important;
}
${scope} [data-tn-avatar='user'] {
  background-image: url("data:image/png;base64,${userAvatarForPalette()}") !important;
}
/* 用户头像定位锚点：行容器本身设 relative。
   2026-11-06 起 JS 把头像挂到行容器（不再依赖内部 bubble 是否存在），
   所以这里必须给行容器留定位上下文；同时保留 bubble 的 relative，
   兼容旧版挂载位置。 */
/* **2026-11-16 补 pending 回声（「头像慢半拍」根因）**：
   官方用户气泡有两个生命周期阶段，DOM 标记完全不同 ——
   ① 按下发送 → Host 回传前：UserStyleBubble 直接渲染进 flow
      （chat/lib/client.js:6178），行容器是 .userRow 并带
      data-submission-echo（本地回声，:6181）或 data-pending-steering
      （Host 待处理 steering，:6180）；**没有** data-chat-flow-kind。
   ② Host 回传后（durable）：由 chatNode 包一层 flowItem，
      data-chat-flow-kind 挂在那层上（:4589）。
   旧选择器只认 ②，所以从点发送到回传这段往返里气泡已经上屏、
   却没有头像 —— 肉眼就是「头像慢半拍才出来」。
   把 ① 的两种行容器一并纳入，头像与留白即刻生效。 */
/* 注意：本段在模板字符串内，不能写 const / 反引号 / 美元花括号插值以外的 JS。 */
${scope} :is([data-chat-flow-kind='user'], [data-chat-flow-kind='steering'], [data-submission-echo], [data-pending-steering]) {
  position: relative !important;
}
${scope} :is([data-chat-flow-kind='user'], [data-chat-flow-kind='steering'], [data-submission-echo], [data-pending-steering]) [class*='bubble'] {
  position: relative !important;
}
/* 右侧头像留白：只在开启头像时生效（属性挂 body，理由见上面那段注释） */
${scope}[data-dsh-theme-buxu-avatars='on'] :is([data-chat-flow-kind='user'], [data-chat-flow-kind='steering'], [data-submission-echo], [data-pending-steering]) {
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
/* 2026-11-18：发送按钮真正的上色点在 token 层
   （--dsw-alias-button-info-fill，见上方）。这三条选择器在官方当前版本
   下不命中，保留作兜底：万一某些版本改用 submit / aria-label。 */
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
  /* 2026-11-18：阴影按深浅分别给强度 ——
     深色主题需要重阴影才有层次；浅色主题用重阴影会显得脏、
     像一圈黑边。原来固定 rgba(0,0,0,.5) 在云白/宣纸下过重。 */
  box-shadow: ${dark ? '0 14px 36px rgba(0,0,0,.5)' : '0 12px 28px rgba(0,0,0,.14)'} !important;
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
  background: ${p.card} !important; box-shadow: ${dark ? '0 8px 24px rgba(0,0,0,.45)' : '0 6px 18px rgba(0,0,0,.12)'} !important;
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
				return tokenOnlyCss + effortGradientCss() + menuHoverCss() + reloadBtnHoverCss()
			}
			/* 按组组装：token 段永远在前；每组的 probe 决定该段是否注入。
			   找不到 LAYOUT_MARK 时退化为全量注入（不丢样式）。 */
			if (markAt < 0) return css + effortGradientCss() + menuHoverCss() + reloadBtnHoverCss()
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
			return out + effortGradientCss() + menuHoverCss() + reloadBtnHoverCss()
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
			const g = effectiveEffort(s)
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

		/** 会话右键菜单项的 hover / 键盘焦点反馈（2026-11-13）。
		   官方 primitives.Menu 的 ._item_1p5el_105:hover:not(:disabled) 用
		   --dsw-alias-interactive-bg-hover，:focus-visible 同色且 outline:none。
		   插件项是内联 style 的 button，无法写伪类，故由这里注入纯属性选择器 CSS；
		   不带 scope 前缀（子菜单 portal 到 body，且官方菜单规则本就全局）。
		   纯 CSS，不触发 React 重渲染，@media(hover:hover) 与官方一致。 */
		function menuHoverCss() {
			return [
				'/* ---- 会话右键自定义菜单项 hover（与官方 primitives.Menu 一致） ---- */',
				'@media (hover: hover) {',
				'  [data-buxu-menu-item]:hover:not(:disabled):not([aria-disabled="true"]) {',
				'    background: var(--dsw-alias-interactive-bg-hover, var(--buxu-pop-row-hover)) !important;',
				'  }',
				'}',
				'[data-buxu-menu-item]:focus-visible:not(:disabled) {',
				'  background: var(--dsw-alias-interactive-bg-hover, var(--buxu-pop-row-hover)) !important;',
				'  outline: none;',
				'}',
				'[data-buxu-menu-item] {',
				'  border-radius: var(--dsw-radius-md, 6px) !important;',
				'  transition: background-color .12s var(--ds-ease-in-out, ease);',
				'}',
				'@media (prefers-reduced-motion: reduce) {',
				'  [data-buxu-menu-item] { transition: none; }',
				'}'
			].join('\n') + '\n'
		}
		/** 弹窗内可点元素的 hover（2026-11-18 重设计后重写）。
		    旧版针对「4 个按钮 + go 用 brightness 提亮」；
		    新版是「两行条目（go / restart）+ 确认按钮组（restart-go / restart-back / cancel）」，
		    统一走 --buxu-pop-row-hover（与官方 primitives.Menu 同款观感），
		    行式条目整行高亮、按钮给底色，focus-visible 同等对待。 */
		function reloadBtnHoverCss() {
			const ROW = "[data-buxu-reload='go'], [data-buxu-reload='restart']"
			const BTN = "[data-buxu-reload='restart-go'], [data-buxu-reload='restart-back'], [data-buxu-reload='cancel']"
			return [
				'/* ---- 重载/冷重启弹窗：行条目与按钮的 hover ---- */',
				/* 2026-11-18：强制两行条目默认透明。
				   用户反馈「默认就有底色」——即便内联样式写了 transparent，
				   仍可能被更外层/更高优先级的规则染上底色。这里用 !important
				   兜底，确保「平时透明、只在 hover 时变色」。 */
				"[data-buxu-reload='go'], [data-buxu-reload='restart'] {",
				'  background-color: transparent !important;',
				'  background-image: none !important;',
				'}',
				ROW + ',',
				BTN + ' {',
				'  border-radius: var(--dsw-radius-md, 6px) !important;',
				'  transition: background-color .12s var(--ds-ease-in-out, ease);',
				'}',
				/* 用户 2026-11-18 两次要求「不要这个白色框」：
				   第一次把实心白 outline 降为 1px 弱色，仍能看出是一圈框；
				   第二次改成 inset 阴影，看起来还是框。
				   结论：这些条目不需要任何焦点视觉 —— 弹窗本身已有明确的
				   两行选项 + 语义 role=dialog，键盘焦点靠浏览器默认行为即可。
				   注意：这里绝对不写 background，否则会覆盖后面的 :hover 底色
				   （同优先级时后声明者胜），导致「鼠标移上去没反应」。 */
				'  ' + ROW + ':focus-visible:not(:disabled),',
				'  ' + BTN + ':focus-visible:not(:disabled) {',
				'    outline: none !important;',
				'    box-shadow: none !important;',
				'  }',
				/* 2026-11-18：以下 hover 规则**不再包 @media (hover: hover)**。
				   该媒体查询在浏览器判定主指针不支持悬停时不生效
				   （触屏笔记本 / 远程桌面 / 部分驱动会把整个桌面判为 hover:none），
				   结果就是「鼠标移上去完全没反应」——用户实际遇到的正是这个。
				   去掉包裹后，鼠标设备体验不变，被误判的环境也能得到反馈。 */
				/* 右上角 × 的 hover：极淡底色 + 文字变亮 */
				"  [data-buxu-reload='cancel']:hover:not(:disabled) {",
				'    color: var(--dsw-alias-label-primary) !important;',
				'    background: color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent) !important;',
				'  }',
				/* 主按钮（确认重启）：实心强调色，hover 提亮 8%。
				   同时用 !important 锁住背景与前景 —— 否则上一条通用的
				   「hover 给 9% 白底」会把它盖成半透明白，
				   深色文字落在浅底上就看不清了（用户实测反馈）。 */
				"  [data-buxu-reload='restart-go']:hover:not(:disabled) {",
				'    filter: brightness(1.08);',
				'    background: var(--buxu-user-accent) !important;',
				'    color: var(--buxu-user-accent-contrast) !important;',
				'  }',
				/* 次按钮（再想想）：透明底，hover 给极淡底色 */
				"  [data-buxu-reload='restart-back']:hover:not(:disabled) {",
				'    background: color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent) !important;',
				'  }',
				/* hover 时右侧箭头右移 2px，给出「可点」的反馈 */
				'  ' + ROW + ':hover:not(:disabled) [data-buxu-reload-chevron] {',
				'    transform: translateX(2px);',
				'    color: var(--dsw-alias-label-primary);',
				'  }',
				'@media (prefers-reduced-motion: reduce) {',
				'  ' + ROW + ',',
				'  ' + BTN + ' { transition: none; }',
				'  ' + ROW + ':hover:not(:disabled) [data-buxu-reload-chevron] { transform: none; }',
				'}',
				/* hover 底色：放在最后声明，确保与 :focus-visible 同优先级时后者不覆盖它。
				   2026-11-18 修复「确认重启看不清」：
				   规则末尾用 :not([data-buxu-reload='restart-go']) 排除主按钮 ——
				   主按钮是强调色实心 + 深色文字，若被这条 9% 白底覆盖，
				   会变成「半透明白底 + 深色字」，看上去只剩一圈绿描边、字发灰。
				   主按钮的 hover 只做 brightness 提亮（见上方）。 */
				'  ' + ROW + ':hover:not(:disabled),',
				'  ' + BTN + ":hover:not(:disabled):not([data-buxu-reload='restart-go']) {",
				'    background: color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent) !important;',
				'  }'
			].join('\n') + '\n'
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
			if (!contractObserver && typeof subscribeBodyMutations === 'function') {
				/* 2026-11-15 轻量化组 A：并入 body 单一派发器 */
				contractObserver = subscribeBodyMutations(() => {
					if (contractCheckFrame !== null) cancelAnimationFrame(contractCheckFrame)
					contractCheckFrame = requestAnimationFrame(() => {
						contractCheckFrame = null
						check(false)
					})
				})
			}
		}
		function disposeContractCheck() {
			if (contractObserver) { contractObserver(); contractObserver = null }
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
			/* 2026-11-18：把配色级 accent（palette.accent，新增字段）注入到
			   colors 上，再交给 colorize —— 这样用户没手动设过强调色时，
			   colorize 会保留配色自带的那个值，实现「换配色强调色跟着变」。
			   palette.accent 缺失时退回 colors.accent（老字段），再退回原值。 */
			const withPaletteAccent = (chosen && chosen.accent)
				? Object.assign({}, chosen.colors, { accent: chosen.accent })
				: chosen.colors
			const colors = colorize(withPaletteAccent, settingsValue())
			/* 色板的 layout 字段决定布局形态：
			     'full'  = 完整布局改写（一体化工具行、6px 留边、描边）
			     'plain' = 只注入 token 层，保留官方默认的大圆角与铺满观感
			   降级时（degradeMode）也强制只出 token 层，保证安全。
			   云白1 / 石墨1 就是 layout:'plain' 的正式方案。 */
			/* P1：降级不再等于「砍掉整个布局层」。plain 皮肤仍只出 token 层；
			   degradeMode 时 buildCss 走按组门控，只跳过 probe 失败的组。 */
			const tokenOnly = chosen.layout === 'plain'
			/* 第 4 个参数传色板原生 accent：buildCss 用它喂所有可能被
			   框架大面积消费的 token，用户 accent 只走局部白名单。
			   2026-11-18：优先用配色自带 accent（palette.accent），
			   用户手动设过时 colors.accent 已被 colorize 覆盖为用户值。 */
			upsertStyle(buildCss(colors, dark, tokenOnly, colors.accent))
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
		/* ---- 头像「最近使用」历史（2026-11-13）----
		   各自最多 3 张、只记上传过的自定义图；存 JSON 字符串（Host schema
		   assistantAvatarHistory / userAvatarHistory，default '[]'）。
		   去重：新图若已在历史里，先移除再 unshift，保证最新排最前。 */
		const AVATAR_HISTORY_MAX = 3
		function avatarHistoryField(kind) {
			return kind === 'assistant' ? 'assistantAvatarHistory' : 'userAvatarHistory'
		}
		function readAvatarHistory(kind) {
			try {
				const raw = settingsValue()[avatarHistoryField(kind)]
				if (typeof raw !== 'string' || !raw) return []
				const arr = JSON.parse(raw)
				if (!Array.isArray(arr)) return []
				return arr.filter((u) => validAvatarData(u)).slice(0, AVATAR_HISTORY_MAX)
			} catch (e) { return [] }
		}
		/** 计算加入一张自定义图后的历史（最多 3 张、去重、最新在前）。 */
		function avatarHistoryWith(kind, url) {
			if (!validAvatarData(url)) return null
			const next = [url].concat(readAvatarHistory(kind).filter((u) => u !== url))
				.slice(0, AVATAR_HISTORY_MAX)
			return JSON.stringify(next)
		}
		/** 头像与历史一次写入：避免两次 persistSettings 的代次竞态
		    （persistSettings 用 settingsOperationSeq 裁决，连续两次独立写会互相
		    supersede）。恢复默认 url='' 时只写头像字段，不动历史。 */
		function persistAvatar(kind, url) {
			const field = kind === 'assistant' ? 'assistantAvatar' : 'userAvatar'
			if (!configWritable()) return Promise.resolve({ ok: false, unavailable: true })
			const kv = { [field]: url || '' }
			const history = url ? avatarHistoryWith(kind, url) : null
			if (history !== null) kv[avatarHistoryField(kind)] = history
			return persistSettings(kv, 'avatar:' + kind).then((result) => {
				if (result.ok) clearLegacyAvatar(kind)
				return result
			})
		}

		/* 「恢复默认」= 配置字段清空 → readAvatar 返回 null → 这里显式写回内置图。
		   旧写法是 removeProperty 让 CSS !important 兜底（隐式层叠，时序/层叠一变就
		   可能不稳）；现在 CSS 与 JS 共用 BUILTIN_AVATAR_* 常量，回落是显式、可验证的。 */
		/** 六套配色的「我」头像常量表。 */
		const AVATAR_ME_BY_PALETTE = {
			slate2: AVATAR_ME_SLATE2,
			inkjade: AVATAR_ME_INKJADE,
			cangqing: AVATAR_ME_CANGQING,
			shimozi: AVATAR_ME_SHIMOZI,
			cloud2: AVATAR_ME_CLOUD2,
			ricepaper: AVATAR_ME_RICEPAPER
		}
		/** 取当前配色对应的「我」头像 base64。
		    2026-11-18：默认用户头像改为用户的「我.png」，并按配色切换颜色
		    （方案 A）。取不到配色时回落石墨版。 */
		function userAvatarForPalette() {
			let pid = DEFAULT_PALETTE_ID
			try {
				const st = settingsValue()
				if (st && typeof st.palette === 'string' && AVATAR_ME_BY_PALETTE[st.palette] && PALETTES[st.palette]) {
					pid = st.palette
				}
			} catch (e) { /* 取不到设置时用默认 */ }
			return AVATAR_ME_BY_PALETTE[pid] || AVATAR_ME_SLATE2
		}
		function builtinAvatar(kind) {
			return kind === 'assistant' ? BUILTIN_AVATAR_ASSISTANT : userAvatarForPalette()
		}
		function builtinAvatarUrl(kind) {
			return 'data:image/png;base64,' + builtinAvatar(kind)
		}
		/* 2026-11-15 闪动修复（第四轮 · 真因）：
		   第二轮用 `getPropertyValue('background-image') !== cssValue` 判等，
		   但浏览器会把 `url("data:...")` 序列化成 `url(data:...)` 或规范化
		   data URL 中的字符 → 返回值与写入值**永不逐字相等** → 判等形同虚设。
		   用户自定义头像 data URL 达 23KB，每次 hover（官方 Tooltip 插节点 →
		   body observer 触发）都重写 23KB inline style → 反复解码/重绘 →
		   复制按钮闪。A/B 实证：有用户头像的闪、还没插头像的不闪。
		   修法：改用节点上的自有标记 data-buxu-avatar-applied 记录已应用的
		   指纹（kind + 长度 + 首尾片段），只在指纹变化时才写，彻底绕开
		   CSS 序列化差异；稳态零写入。 */
		const AVATAR_APPLIED_ATTR = 'data-buxu-avatar-applied'
		function avatarFingerprint(kind, url) {
			return kind + ':' + url.length + ':' + url.slice(0, 24) + ':' + url.slice(-24)
		}
		function applyAvatarOverrides() {
			for (const kind of ['assistant', 'user']) {
				const url = readAvatar(kind)
				const finalUrl = url || builtinAvatarUrl(kind)
				const cssValue = 'url("' + finalUrl + '")'
				const fp = avatarFingerprint(kind, finalUrl)
				const nodes = document.querySelectorAll('[data-tn-avatar="' + kind + '"]')
				for (const el of nodes) {
					try {
						if (el.getAttribute(AVATAR_APPLIED_ATTR) === fp) continue
						el.style.setProperty('background-image', cssValue, 'important')
						el.setAttribute(AVATAR_APPLIED_ATTR, fp)
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
			/* 历史缩略图随设置变化即时刷新（上传新图后要立刻出现）。 */
			const [history, setHistory] = React2.useState(() => readAvatarHistory(kind))
			const inputRef = React2.useRef(null)
			const operationRef = React2.useRef(0)
			const cancelRef = React2.useRef(null)
			React2.useEffect(() => {
				/* 一次订阅同时刷新当前头像与历史，避免两个 effect 重复挂载。 */
				const unsubscribe = subscribeSettings(() => {
					setCustom(readAvatar(kind))
					setHistory(readAvatarHistory(kind))
				})
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
			/* 点历史缩略图：直接保存为当前头像，不弹裁剪器。 */
			const onPickHistory = (url) => {
				if (avatarBusy || !validAvatarData(url) || url === custom) return
				const token = ++operationRef.current
				setAvatarError(null)
				setAvatarBusy(true)
				persistAvatar(kind, url).then((result) => {
					if (operationRef.current !== token) return
					setAvatarBusy(false)
					if (!result.ok) { setAvatarError('头像未能切换，请重试。'); return }
					setCustom(url)
					applyAvatarOverrides()
				}).catch(() => {
					if (operationRef.current !== token) return
					setAvatarBusy(false)
					setAvatarError('头像切换失败，请重试。')
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
			/* 默认态预览直接显示内置图：与 applyAvatarOverrides 的回落目标同一份数据，
			   让用户能一眼确认「恢复默认会回到哪张」，而不是一个灰底「默认」方块。
			   2026-11-12 加固：BUILTIN_AVATAR_* 已提取成模块级常量。 */
			const previewUrl = custom ? custom : builtinAvatarUrl(kind)
			const preview = {
				backgroundSize: 'contain',
				backgroundPosition: 'center',
				backgroundRepeat: 'no-repeat',
				flex: 'none',
				border: '1px solid var(--dsw-alias-border-l2)',
				backgroundColor: 'var(--dsw-alias-bg-layer-2)',
				backgroundImage: 'url("' + previewUrl + '")'
			}
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
				h2('span', { style: preview,
					'data-buxu-avatar-preview': custom ? 'custom' : 'builtin',
					'aria-hidden': 'true' }),
				h2(
					'div',
					{ style: { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '0' } },
					h2('span', { style: { fontSize: '13px', fontWeight: 500 } }, label),
					h2(
						'div',
						{ style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
						h2('button', { type: 'button', onClick: pick, disabled: avatarBusy, style: btn }, avatarBusy ? '处理中…' : (custom ? '更换图片' : '上传图片')),
						custom ? h2('button', { type: 'button', onClick: reset, disabled: avatarBusy, style: btnGhost }, '恢复默认') : null,
						/* 最近使用：最多 3 张，点一下直接换；当前选中的带高亮描边。
						   与官方「小标不喧宾夺主」同调：小方块、低对比边框、无发光。 */
						history.length ? h2('span', {
							'data-buxu-avatar-history': kind,
							style: { display: 'inline-flex', gap: '6px', marginLeft: '4px' }
						}, history.map((u) => h2('button', {
							type: 'button', key: u.slice(-24),
							'data-buxu-avatar-history-item': '1',
							'data-buxu-avatar-history-active': u === custom ? '1' : '0',
							title: '使用这张头像',
							'aria-label': '使用这张头像',
							disabled: avatarBusy,
							onClick: () => onPickHistory(u),
							style: {
								width: '26px', height: '26px', flex: 'none', padding: '0',
								/* 2026-11-18：原来用 var(--dsw-alias-state-business-primary)，
								   那是**官方品牌蓝**，不跟随用户配色 —— 六套配色下
								   这个选中框永远是蓝的，与主题脱节。
								   改走插件自己的强调色变量（随配色切换）。 */
								border: u === custom ? '2px solid var(--buxu-user-accent)' : '1px solid var(--dsw-alias-border-l2)',
								borderRadius: '6px', cursor: 'pointer',
								backgroundImage: 'url("' + u + '")',
								backgroundSize: 'cover', backgroundPosition: 'center',
								backgroundRepeat: 'no-repeat', opacity: avatarBusy ? 0.5 : 1
							}
						}))) : null
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
			/* 列数：取「可用宽度能放下几列」与「皮肤数量」的较小值。
			   **2026-11-16 修复「2 个皮肤占 3 格」**：原先只按可用宽度算，
			   再夹到 MIN_COLS..MAX_COLS，与 ids.length 无关 ——
			   于是只有两套皮肤时也算出 3 列，右侧空出一格难看。
			   现在先按数量封顶（不超过 ids.length），再保证至少 1 列。
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
			/* 数量上限优先于 MIN_COLS：只有 1 套皮肤时不该硬撑成 2 列。 */
			const byCount = Math.max(1, Math.min(ids.length, POP.MAX_COLS))
			if (cols < minCols) cols = minCols
			if (cols > POP.MAX_COLS) cols = POP.MAX_COLS
			if (cols > byCount) cols = byCount
			if (cols < 1) cols = 1
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
						colors: resolvePaletteColors(id, s),
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
		 *
		 * 2026-11-18（方案 B）：强调色改为**默认跟随配色方案**。
		 *   · s.accentUserSet !== true → 用色板自带的 accent（palette.accent）
		 *     没有自带值时退回 base.accent（色板 colors.accent）
		 *   · s.accentUserSet === true → 用用户自己设的 s.accent，永久不覆盖
		 * 这样切换配色时强调色会一起变，整体主题不会「只有底色变了」。
		 * @param {object} base 色板 colors（已含 palette.accent 的坑位由调用方注入）
		 * @param {object} s 配置
		 * @returns {object} 新色板（不改原对象）
		 */
		/** 用户是否「真正设过」强调色（2026-11-18 自检补的向后兼容）。
		 *
		 * 问题：accentUserSet 是本次新增字段，老配置里没有它 → schema 填默认 false。
		 * 老用户如果早就改过强调色（比如 #22AA66），标记却是 false，
		 * 升级后就会被配色自带的 accent 覆盖 —— 白丢用户设置。
		 *
		 * 迁移策略（推断式，无需写配置）：
		 *   · accentUserSet === true           → 用户设过（新逻辑写入的标记）
		 *   · accent 存在且 != 默认橙 #F56619  → 视为用户设过（老配置推断）
		 * 这样老用户的自定义色得以保留；从没改过的用户（值仍是默认橙）
		 * 则正确进入「跟随配色」。
		 */
		const DEFAULT_ACCENT_FALLBACK = '#F56619'
		function accentOwnedByUser(s) {
			if (!s) return false
			if (s.accentUserSet === true) return true
			// 老配置推断：有值且不等于默认橙，说明用户手动改过
			if (typeof s.accent === 'string' && /^#[0-9A-Fa-f]{6}$/.test(s.accent)) {
				return s.accent.toUpperCase() !== DEFAULT_ACCENT_FALLBACK
			}
			return false
		}
		function colorize(base, s) {
			const out = Object.assign({}, base)
			const tone = s && s.tone
			const d = TONE_TINT[tone]
			if (d) {
				for (const k of TINTABLE) {
					if (out[k]) out[k] = shiftHex(out[k], d)
				}
			}
			const userOwns = accentOwnedByUser(s)
			if (userOwns && typeof s.accent === 'string' && /^#[0-9A-Fa-f]{6}$/.test(s.accent)) {
				out.accent = s.accent
			}
			/* 否则保留 base.accent —— 调用方已把 palette.accent 注进去 */
			return out
		}
		/** 取某套配色「实际生效」的颜色（2026-11-18 补）。
		 *
		 *  之前两处缩略图直接调 colorize(PALETTES[id].colors, s)，
		 *  没有注入顶层 palette.accent，导致设置页缩略图显示的是
		 *  colors.accent（旧值），而实际切换后用的是顶层 accent —— 两者不一致。
		 *  这里统一处理：注入顶层 accent → colorize（含 tone 与用户覆盖）。
		 *  @param {string} id 配色 id
		 *  @param {object} st 配置（默认取 settingsValue()）
		 */
		function resolvePaletteColors(id, st) {
			const pal = PALETTES[id]
			if (!pal) return {}
			const cfg = st || settingsValue()
			const base = pal.accent
				? Object.assign({}, pal.colors, { accent: pal.accent })
				: pal.colors
			return colorize(base, cfg)
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
		/** 2026-11-14 重设计：去掉金色编号块（颜色杂乱、分不出主次），
		    标题前用一个中性灰小竖条做「区域标记」；卡片边框加强、
		    背景与边框拉开层次。强调色只留给激活态控件。 */
		function Section({ number, title, desc, children }) {
			return h2('section', {
				'aria-label': title,
				style: {
					display: 'flex', flexDirection: 'column', gap: '8px',
					paddingTop: '2px'
				}
			},
				h2('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
					h2('span', {
						style: { width: '3px', height: '14px', borderRadius: '2px', flex: 'none',
							background: 'var(--dsw-alias-label-tertiary)' }
					}),
					h2('h2', { style: { fontSize: '13px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)', margin: 0 } }, title)
				),
				h2('div', {
					style: {
						display: 'flex', flexDirection: 'column', gap: '8px',
						padding: '12px', borderRadius: '8px',
						background: 'var(--dsw-alias-bg-layer-2)',
						border: '1px solid var(--dsw-alias-border-l2)'
					}
				}, children)
			)
		}
		/** 分区内的子组标题（用于大区里再分小块）。 */
		function GroupTitle({ label, desc }) {
			return h2('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
				h2('div', { style: { fontSize: '12px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, label)
			)
		}

		/* ================================================================
		 * 会话手动标记（2026-11-12）
		 *
		 * 右键菜单两项走官方 sidebar.workspaces.session.menu.item 槽；
		 * 会话前小标走官方 sidebar.session.row.leading 槽（16px inline 单元格）。
		 * 两者都只消费官方传入的 props，不写组件外 DOM，符合 practices.md:36。
		 * 标记值从 settingsValue() 读（configForms 持久化），并通过
		 * subscribeSettings 订阅变化，切换后立即刷新。
		 * ================================================================ */

		/** 用订阅让函数组件随设置变化重渲染（与 BuxuSettingsPage 同构）。 */
		function useSessionMarks() {
			const [, setTick] = React2.useState(0)
			React2.useEffect(() => subscribeSettings(() => setTick((n) => n + 1)), [])
			return readSessionMarks()
		}

		/** 小标的公共容器：与官方状态圆点同量级，居中、不发光、不占位空白。 */
		function SessionMarkGlyph({ kind }) {
			const size = SESSION_MARK_SIZE + 'px'
			const color = sessionMarkColor(kind)
			const common = {
				width: size, height: size, flex: 'none',
				display: 'block', background: color,
				opacity: SESSION_MARK_OPACITY,
				/* 菱形用 45° 旋转，外接盒仍是 6px，视觉面积与官方 6px 圆点同量级 */
				transform: kind === 'important' ? 'rotate(45deg)' : 'none',
				borderRadius: '1px'
			}
			return h2('span', {
				'data-buxu-session-mark': kind,
				'aria-hidden': 'true',
				title: kind === 'important' ? '重要' : '待办',
				style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
					width: size, height: size, flex: 'none' }
			}, h2('span', { style: common }))
		}

		/** leading 槽组件：按当前会话标记渲染 ◆ / ■；无标记返回 null（前面什么都没有）。 */
		function SessionMarkLeading(props) {
			const id = props && props.sessionId
			useSessionMarks()
			if (!id) return null
			const mark = sessionMarkOf(id)
			if (!mark) return null
			const showImportant = mark === 'important' || mark === 'both'
			const showTodo = mark === 'todo' || mark === 'both'
			return h2('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '2px' } },
				showImportant ? h2(SessionMarkGlyph, { kind: 'important' }) : null,
				showTodo ? h2(SessionMarkGlyph, { kind: 'todo' }) : null
			)
		}

		/** 右键菜单项：切换「待办」或「重要」，文案随当前状态变化。 */
		function SessionMarkMenuItem(props) {
			const id = props && props.sessionId
			const bit = props && props.bit
			const useMenuOpenState = props && props.useMenuOpenState
			useSessionMarks()
			if (!id || (bit !== 'todo' && bit !== 'important')) return null
			const mark = sessionMarkOf(id)
			const active = bit === 'todo'
				? (mark === 'todo' || mark === 'both')
				: (mark === 'important' || mark === 'both')
			const label = bit === 'todo'
				? (active ? '取消待办' : '显示待办')
				: (active ? '取消重要' : '标记重要')
			const onClick = () => {
				toggleSessionMark(id, bit)
				/* 官方菜单要求点完关闭；useMenuOpenState 由槽位注入，可能缺失则静默 */
				try {
					if (typeof useMenuOpenState === 'function') {
						const [, setOpen] = useMenuOpenState()
						if (typeof setOpen === 'function') setOpen(false)
					}
				} catch (e) { /* 忽略 */ }
			}
			/* 与官方 primitives.Menu 一致：14px 图标 + 6px gap + 13px 字 + 34px 行高。
			   2026-11-12：删掉原先那个 6px 状态色实心块 —— 它既不是官方菜单样式，
			   又和新增的 16px 图标重复，两个图标并排显得乱。激活态改用图标描边色
			   表达（--dsw-alias-menu-icon 之外再叠一点强调色），不再画实心小标。 */
			const button = h2('button', {
				type: 'button', role: 'menuitem', 'data-buxu-menu-item': '1', onClick,
				style: { display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
					padding: '6px 8px', minHeight: '34px', boxSizing: 'border-box',
					background: 'transparent', border: '0',
					color: 'var(--dsw-alias-label-primary)', font: 'inherit', fontSize: '13px',
					lineHeight: '20px', cursor: 'pointer', textAlign: 'left' }
			},
				h2(MenuItemIconSlot, { kind: bit, active }),
				label
			)
			/* 官方在「复制 Session ID」前、以及「归档会话」前都有分隔线
			   （primitives Menu CSS：height .5px / margin 3px 8px /
			   background var(--dsw-alias-border-l2)）。插件三项是外部 legacy 行，
			   官方不会自动给加，所以在第一项「显示待办」前补一条同样的分隔线，
			   让官方项与插件项之间的边界和官方内部边界一致。
			   只挂在 todo（第一项）前，important / 复制两项不加，避免出现两条。 */
			if (bit !== 'todo') return button
			return h2('div', { 'data-buxu-menu-wrap': 'first' },
				h2('div', { role: 'separator', 'data-buxu-menu-separator': '1',
					style: { height: '0.5px', margin: '3px 8px',
						background: 'var(--dsw-alias-border-l2)' } }),
				button
			)
		}

		/* 会话右键菜单项的线性小图标（2026-11-12，2026-11-13 校正尺寸）
		   会话右键菜单用的是 primitives.Menu（不是账号菜单），实测 CSS：
		   ._itemIcon_1p5el_165 { width:14px;height:14px; svg 14×14 }，
		   ._item_1p5el_105 { gap:6px;min-height:34px;padding:6px 8px;
		   font-size:13px;line-height:20px }。
		   之前误用 AccountMenu 的 16/8/40/14，图标偏大、文字偏右、行距偏疏，
		   用户反馈「排整齐」后按此处真实数值统一。
		   插件不能 require 官方图标包（practices.md:35），按同一契约自绘。 */
		function MenuItemIcon({ kind, inheritColor }) {
			const common = {
				width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none',
				stroke: 'currentColor', 'stroke-width': '1.3',
				'stroke-linecap': 'round', 'stroke-linejoin': 'round',
				'aria-hidden': 'true', flex: 'none',
				style: { display: 'block', width: '14px', height: '14px',
					/* inheritColor=真时交给父 span 决定颜色（激活态染色），
					   否则用官方菜单图标色 */
					color: inheritColor ? 'inherit' : 'var(--dsw-alias-menu-icon, var(--dsw-alias-label-tertiary))' }
			}
			if (kind === 'todo') {
				return h2('svg', Object.assign({}, common, { 'data-buxu-menu-icon': 'todo' }),
					h2('rect', { x: 3.5, y: 3.5, width: 9, height: 9, rx: 1.5 }))
			}
			if (kind === 'important') {
				return h2('svg', Object.assign({}, common, { 'data-buxu-menu-icon': 'important' }),
					h2('path', { d: 'M8 2 L14 8 L8 14 L2 8 Z' }))
			}
			if (kind === 'copy') {
				/* 两个叠加圆角方框 = 复制到另一处，与官方 fork/copy 线性同构 */
				return h2('svg', Object.assign({}, common, { 'data-buxu-menu-icon': 'copy' }),
					h2('rect', { x: 5.5, y: 5.5, width: 8, height: 8, rx: 1.5 }),
					h2('path', { d: 'M10.5 3.5 H4 A1.5 1.5 0 0 0 2.5 5 V11.5' }))
			}
			if (kind === 'workspace') {
				/* 工作区：文件夹线性图标，与官方「在文件夹显示」同构 */
				return h2('svg', Object.assign({}, common, { 'data-buxu-menu-icon': 'workspace' }),
					h2('path', { d: 'M2.5 4.5 A1 1 0 0 1 3.5 3.5 H6.5 L8 5 H12.5 A1 1 0 0 1 13.5 6 V11.5 A1 1 0 0 1 12.5 12.5 H3.5 A1 1 0 0 1 2.5 11.5 Z' }))
			}
			if (kind === 'chevron') {
				/* 子菜单右箭头：官方 IconChevron* 同款细线 */
				return h2('svg', Object.assign({}, common, { 'data-buxu-menu-icon': 'chevron',
					width: 12, height: 12, viewBox: '0 0 16 16',
					style: Object.assign({}, common.style, { width: '12px', height: '12px',
						marginLeft: 'auto', opacity: 0.7 }) }),
					h2('path', { d: 'M6 3.5 L10.5 8 L6 12.5' }))
			}
			return null
		}
		
		/* 菜单项统一的「图标位」：14px 槽，和官方 primitives.Menu 对齐。
		   active 时只给线性图标染一点强调色（opacity 0.7，不画实心、不发光），
		   用于区分「已标记 / 未标记」，保持锦上添花不喧宾夺主。 */
		function MenuItemIconSlot({ kind, active }) {
			const tint = active ? sessionMarkColor(kind) : null
			return h2('span', { style: { width: '14px', height: '14px', flex: 'none',
				display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
				color: tint || undefined, opacity: tint ? 0.85 : undefined } },
				h2(MenuItemIcon, { kind, inheritColor: !!tint }))
		}

		/* ================================================================
		 * 回退对话：每条用户消息操作栏内联 ↶ 按钮（2026-11-14）
		 *
		 * 位置：官方没有「用户消息操作栏」公开槽（116 个 key 全查过）；
		 * MessageIconActions 的 extraActions 只在助手侧被填充。
		 * 照 dsh-rewind-plugin 0.22.1 的 element-tree mount：包装官方
		 * conversation.chat.node 的 user/steering entry.component，用
		 * cloneElement 把 ↶ 注入 extraActions —— 不读 DOM、不 observer、
		 * 不 portal，按钮成为官方操作栏的 React 子节点。
		 *
		 * 依赖（rc.3 已核实）：ctx.slots.entries()/subscribe()、
		 * StoredEntry{component,options.key/priority}、row.props.actions、
		 * MessageIconActions.props.extraActions、node.data.seq。
		 * 全部是未公开内部契约 → 全链路 try/catch + 形状校验，
		 * 任一不满足就静默不显示、不报错、不碰官方 UI；卸载还原。
		 * ================================================================ */
		const BUXU_REWIND_SLOT = 'conversation.chat.node'
		const BUXU_REWIND_ROW_KEYS = ['user', 'steering']
		const BUXU_REWIND_TICK_KEY = 'dsh-theme-buxu:rewind-tick'
		const BUXU_REWIND_SHIPPED_PRIORITY = 0
		const NO_SLOT_CHAIN = () => null

		/** 从官方 renderer 返回的 element 里取组件函数。 */
		function rewindRendererOf(component) {
			if (typeof component === 'function') return component
			if (component === null || typeof component !== 'object') return null
			return typeof component.type === 'function' ? component.type : null
		}

		/** 目标：sessionId + 消息 seq + 原文（回退用 seq、回填用 text）。 */
		function rewindTargetOf(props) {
			const sessionId = props && props.sessionId
			const data = props && props.node && props.node.data
			if (typeof sessionId !== 'string' || !data || typeof data.seq !== 'number') return null
			/* 文本从 content 的 text block join（照官方 contentParts 的形状） */
			let text = ''
			try {
				const content = Array.isArray(data.content) ? data.content : []
				text = content.map((b) => b && b.type === 'text' && typeof b.text === 'string' ? b.text : '').join('')
			} catch (e) { text = '' }
			return { sessionId: sessionId, seq: data.seq, text: text }
		}

		/** 把内容放回输入框（官方公开 API，4 个参考包同款）；失败静默。 */
		function rewindFillComposer(ctx, sessionId, text) {
			try {
				const conversation = ctx.get('conversation')
				const sessions = ctx.get('sessions')
				if (!conversation || !conversation.input || !sessions || typeof sessions.scope !== 'function') return false
				const scope = sessions.scope(sessionId)
				if (!scope) return false
				const input = conversation.input.for(scope)
				if (!input || typeof input.setDraft !== 'function') return false
				input.setDraft(text)
				if (typeof input.focus === 'function') input.focus()
				return true
			} catch (e) { return false }
		}

		/** ↶ 按钮：自绘 15px 线性 SVG，不 require 官方 primitives。 */
		function BuxuRewindAction(props) {
			const ctx = props && props.ctx
			const target = props && props.target
			const [busy, setBusy] = React2.useState(false)
			if (!ctx || !target) return null
			/* 2026-11-15 真机反馈「点撤销没反应」：和冷启动按钮同款坑。
			   Client 半必须用 ctx.remote.commands.execute 属性链（官方 ui-plan
			   写法），ctx.get('remote') 取到的对象不带注入的嵌套属性，
			   .commands 访问会抛 without inject 并被下面的 catch 静默吞掉。
			   exports.inject 已声明 'remote' + 'remote.commands'。 */
			const onClick = async () => {
				if (busy) return
				setBusy(true)
				try {
					if (!ctx.remote || !ctx.remote.commands ||
						typeof ctx.remote.commands.execute !== 'function') return
					const result = await Promise.resolve(
						ctx.remote.commands.execute(target.sessionId, '/buxu-rewind', []))
					/* commands/execute 对未注册命令返回 value:undefined，别误判成功 */
					if (result && result.ok && result.value !== undefined) {
						rewindFillComposer(ctx, target.sessionId, target.text)
					}
				} catch (e) { /* 静默：命令不可用/失败不弹错、不动界面 */ }
				finally { setBusy(false) }
			}
			return h2('button', {
				type: 'button', 'data-buxu-rewind': 'action', onClick: onClick,
				title: '回退到这条消息（内容放回输入框）',
				'aria-label': '回退到这条消息', disabled: busy,
				style: {
					display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
					width: '24px', height: '24px', padding: '0', flex: 'none',
					border: '0', borderRadius: '4px', cursor: busy ? 'default' : 'pointer',
					background: 'transparent', color: 'var(--dsw-alias-label-tertiary)',
					opacity: busy ? 0.5 : 1
				}
			}, h2('svg', {
				width: 15, height: 15, viewBox: '0 0 16 16', fill: 'none',
				stroke: 'currentColor', 'stroke-width': '1.25',
				'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true'
			},
				h2('path', { d: 'M6.5 2.5 2.5 6.5l4 4' }),
				h2('path', { d: 'M2.5 6.5h7a4 4 0 0 1 4 4v1.5' })
			))
		}

		/** 包装官方 row renderer：cloneElement 注入 extraActions（照 0.22.1）。 */
		function rewindRowWithAction(official, ctx) {
			return function BuxuRewindRow(props) {
				let row
				try {
					row = official(typeof props.renderSlotChain === 'function'
						? props : Object.assign({}, props, { renderSlotChain: NO_SLOT_CHAIN }))
				} catch (e) { return null }
				if (!React2.isValidElement(row)) return row
				const target = rewindTargetOf(props)
				const actions = row.props && row.props.actions
				if (!target || typeof actions !== 'function') return row
				const withAction = (text) => {
					let actionsRow
					try { actionsRow = actions(text) } catch (e) { return null }
					if (!React2.isValidElement(actionsRow)) return actionsRow
					try {
						const existing = actionsRow.props && actionsRow.props.extraActions
						const element = h2(BuxuRewindAction, { ctx: ctx, target: Object.assign({}, target, { text: text }) })
						return React2.cloneElement(actionsRow, {
							extraActions: h2(React2.Fragment, null, existing, element)
						})
					} catch (e) { return actionsRow }
				}
				try { return React2.cloneElement(row, { actions: withAction }) }
				catch (e) { return row }
			}
		}

		/** 安装/卸载：扫描官方 entry → 包装 → subscribe 重装 → 卸载还原。 */
		function installRewindRowAction(ctx) {
			const slots = ctx && ctx.slots
			if (!slots || typeof slots.entries !== 'function' || typeof slots.subscribe !== 'function') {
				return () => {}   /* 静默降级：无内部契约就不显示按钮 */
			}
			const taken = new Map()
			const takeOver = (entry) => {
				if (taken.has(entry)) return false
				try {
					const official = rewindRendererOf(entry.component)
					if (!official) return false
					const replacement = rewindRowWithAction(official, ctx)
					taken.set(entry, { original: entry.component, replacement: replacement })
					entry.component = replacement
					return true
				} catch (e) { return false }
			}
			const tick = () => {
				try {
					if (typeof slots.register === 'function') {
						const dispose = slots.register({ name: BUXU_REWIND_SLOT, key: BUXU_REWIND_TICK_KEY }, () => null)
						if (typeof dispose === 'function') dispose()
					}
				} catch (e) { /* 忽略 */ }
			}
			const sync = () => {
				let changed = false
				try {
					const entries = slots.entries(BUXU_REWIND_SLOT) || []
					for (const entry of entries) {
						const options = entry && entry.options
						if (!options || BUXU_REWIND_ROW_KEYS.indexOf(options.key) < 0) continue
						if ((options.priority === undefined ? BUXU_REWIND_SHIPPED_PRIORITY : options.priority) !== BUXU_REWIND_SHIPPED_PRIORITY) continue
						if (takeOver(entry)) changed = true
					}
				} catch (e) { /* 忽略 */ }
				if (changed) tick()
			}
			let unsubscribe = null
			try { sync() } catch (e) { /* 忽略 */ }
			try { unsubscribe = slots.subscribe(BUXU_REWIND_SLOT, sync) } catch (e) { unsubscribe = null }
			return () => {
				try { if (typeof unsubscribe === 'function') unsubscribe() } catch (e) {}
				for (const [entry, record] of taken) {
					try { if (entry.component === record.replacement) entry.component = record.original } catch (e) {}
				}
				taken.clear()
			}
		}

		/* ================================================================
		 * 右上角「重载页面」按钮（2026-11-13）
		 *
		 * 槽 conversation.session.header.utilities：list / scope:session /
		 * replaceRisk:none，官方右上角日程/Forge/共享三个按钮都挂这里。
		 * 行为用官方同款 globalThis.location.reload()（settings-general 的
		 * reloadPage、liveshare 的 act('reload') 都这么写），重载整个 renderer
		 * 会重新执行全部 Client 插件代码，让刚部署的 client.js / 新配置生效。
		 *
		 * 诚实边界：app 级冷重启（换 Host 半、清 dsh-auth-* cookie）做不到 ——
		 * app.relaunch() 只在 development 菜单、ipcRenderer 未暴露、bat 在 DSH
		 * 运行时会 SKIP。故点击前弹确认，附完整冷重启指引 + 复制命令。
		 * 样式对齐官方 HeaderButton.module.css：28px 图标按钮、secondary 字色、
		 * hover 走 --dsw-alias-interactive-bg-hover。零官方 require。
		 * ================================================================ */
		/* 用户提供的重启图标（234.png）：红底白色回转箭头圆形，
		   214×214 原图 → LANCZOS 压成 28×28 PNG 内联 data URL（零外部资源依赖）。
		   放在右上角 28px 按钮里，替换原来的自绘线性 SVG。 */
		const RELOAD_ICON_DATA = 'data:image/png;base64,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'

		function ReloadPageButton(props) {
			const ctx = props && props.ctx
			const sessionId = props && props.sessionId
			const [confirming, setConfirming] = React2.useState(false)
			const [anchorRect, setAnchorRect] = React2.useState(null)
			const [status, setStatus] = React2.useState('')
			/* 2026-11-18：二次确认态。点「重启应用」先跑前置检查，
			   通过才把 askingRestart 置 true 显示确认块。 */
			const [askingRestart, setAskingRestart] = React2.useState(false)
			const [busy, setBusy] = React2.useState(false)
			const triggerRef = React2.useRef(null)
			/* 弹窗容器 ref：打开后把焦点移到这里，避免焦点落在第一个条目上。 */
			const dialogRef = React2.useRef(null)
			const doReload = () => {
				try { globalThis.location.reload() } catch (e) { /* 忽略 */ }
			}
			/* 调 Host 半命令（演练 / 真冷启动）。sessionId 由槽 standardProps 注入。
			   2026-11-14 真机报错「cannot get property ... without inject」：
			   Client 半不能用 get 方法取 remote 服务，必须按官方 ui-plan 的写法
			   用属性链访问命令服务，并在 exports.inject 声明对应依赖。 */
			const runRestart = async (dryRun) => {
				if (busy) return
				/* 2026-11-15 用户反馈「等这几秒不踏实」：点按钮后立刻给进度反馈，
				   不要等命令往返才更新状态行。真冷启动会强杀 DSH，之后界面会消失，
				   所以这一行是用户离开前唯一能看到的确认。 */
				setBusy(true)
				setStatus(dryRun ? '正在排程演练…' : '正在关闭并重启 DSH…（约 2 秒）')
				try {
					if (!ctx || !ctx.remote || !ctx.remote.commands ||
						typeof ctx.remote.commands.execute !== 'function' || !sessionId) {
						setStatus('重启不可用：会话信息缺失'); return
					}
					const line = dryRun ? '/buxu-restart-dry' : '/buxu-restart'
					const result = await Promise.resolve(ctx.remote.commands.execute(sessionId, line, []))
					/* commands/execute 对「命令未注册」返回 value:undefined（官方 plan 插件
					   就用这个判空）。冷重启前 Host 半还是旧代码、没注册这两个命令时，
					   必须明确提示，不能误报「已排程」。 */
					if (result && result.ok && result.value === undefined) {
						setStatus('命令未就绪：请完全退出 DSH 后重新启动，以加载新版插件'); return
					}
					if (result && result.ok) {
						/* 2026-11-16 上架修复：不再写死本机日志路径。
						   Host 半的 handler 会在 text 里给出真实日志位置
						   （restartLogPath() 动态解析，默认系统临时目录），
						   优先用它；拿不到就退回到不含路径的通用文案。 */
						const hostText = result.value && result.value.result && typeof result.value.result.text === 'string'
							? result.value.result.text : ''
						setStatus(hostText ||
							(dryRun ? '演练已排程：仅写日志，不会重启' : '已排程：DSH 正在关闭，稍后自动重新启动'))
					} else {
						const errText = result && result.value && result.value.result && typeof result.value.result.text === 'string'
							? result.value.result.text : ''
						setStatus(errText || ('重启排程失败：' + (result && result.error ? result.error.message : '未知错误')))
					}
				} catch (e) {
					setStatus('重启排程失败：' + (e && e.message ? e.message : '未知错误'))
				} finally { setBusy(false) }
			}
			/* 2026-11-18：点「重启应用」先静默跑一次前置检查（调 dry 命令）。
			   dry 在 Host 半会解析 DSH 可执行文件、排程一次「只写日志」的探针；
			   返回 error 说明真实重启会失败（找不到 exe 等），此时直接显示原因，
			   不进入二次确认 —— 用户不必先点「演练」才知道能不能重启。 */
			const prepareRestart = async () => {
				if (busy) return
				setBusy(true); setStatus('')
				try {
					if (!ctx.remote || !ctx.remote.commands ||
						typeof ctx.remote.commands.execute !== 'function' || !sessionId) {
						setStatus('现在无法重启：会话信息不可用'); setBusy(false); return
					}
					const check = await Promise.resolve(ctx.remote.commands.execute(sessionId, '/buxu-restart-dry', []))
					const txt = check && check.value && check.value.result && typeof check.value.result.text === 'string'
						? check.value.result.text : ''
					if (!check || !check.ok || (check.value && check.value.result && check.value.result.kind === 'error')) {
						setStatus(txt || '现在无法重启：环境检查未通过')
						setBusy(false)
						return
					}
					if (check && check.ok && check.value === undefined) {
						setStatus('命令未就绪：请完全退出 DSH 后重新启动，以加载新版插件')
						setBusy(false)
						return
					}
					setAskingRestart(true)
				} catch (e) {
					setStatus('现在无法重启：' + (e && e.message ? e.message : '未知错误'))
				} finally { setBusy(false) }
			}
			/* 弹窗挂载后把焦点移到容器：条目不再自动获得 :focus-visible，
			   只有用户按 Tab 主动进入时才出现焦点指示。 */
			React2.useEffect(() => {
				if (!confirming) return
				/* 必须等一帧：portal 刚挂载时 dialogRef.current 可能还是 null，
				   同步 focus 会静默失败，焦点留在第一个条目上 → 出现白框。
				   下一帧再取 ref；仍取不到就退回 trigger（不留在条目上）。 */
				let raf = 0, timer = 0
				const take = () => {
					try {
						const el = dialogRef.current
						if (el && typeof el.focus === 'function') { el.focus({ preventScroll: true }); return true }
					} catch (e) { /* 忽略 */ }
					return false
				}
				try {
					if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(() => { if (!take()) { try { triggerRef.current && triggerRef.current.focus({ preventScroll: true }) } catch (e) {} } })
					else timer = setTimeout(() => { if (!take()) { try { triggerRef.current && triggerRef.current.focus({ preventScroll: true }) } catch (e) {} } }, 0)
				} catch (e) { timer = setTimeout(take, 0) }
				return () => {
					try { if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf) } catch (e) {}
					try { if (timer) clearTimeout(timer) } catch (e) {}
				}
			}, [confirming])
			const openConfirm = () => {
				try {
					const r = triggerRef.current && triggerRef.current.getBoundingClientRect
						? triggerRef.current.getBoundingClientRect() : null
					if (r) setAnchorRect({ top: r.bottom, right: r.right, left: r.left, bottom: r.bottom })
				} catch (e) { setAnchorRect(null) }
				setStatus('')
				setAskingRestart(false)
				setConfirming(true)
			}
			React2.useEffect(() => {
				if (!confirming) return
				const onKey = (e) => { if (e && e.key === 'Escape') setConfirming(false) }
				const onDown = (e) => {
					try {
						const t = e.target
						if (t && t.closest && (t.closest('[data-buxu-reload="confirm"]') || t.closest('[data-buxu-reload="trigger"]'))) return
						setConfirming(false)
					} catch (err) { setConfirming(false) }
				}
				document.addEventListener('keydown', onKey, true)
				const tm = setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0)
				return () => { clearTimeout(tm); document.removeEventListener('keydown', onKey, true); document.removeEventListener('pointerdown', onDown, true) }
			}, [confirming])
			const trigger = h2('button', {
				type: 'button', 'data-buxu-reload': 'trigger', ref: triggerRef,
				title: '重载页面 / 冷重启 DSH', 'aria-label': '重载页面 / 冷重启 DSH',
				onClick: () => { if (confirming) { setConfirming(false); return } openConfirm() },
				style: {
					position: 'relative', flex: 'none', width: '28px', height: '28px',
					display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
					padding: '0', border: '0', borderRadius: '6px', cursor: 'pointer',
					background: 'transparent', color: 'var(--dsw-alias-label-secondary)',
					overflow: 'visible'
				}
			}, h2('img', {
				src: RELOAD_ICON_DATA, width: 20, height: 20, alt: '',
				'aria-hidden': 'true', 'data-buxu-reload-icon': '1',
				/* 2026-11-15：石墨（深色）下图标中心偏下、云白（浅色）正常。
				   外部 headerUtilities 容器在两套皮肤下的行高/基线继承不同，
				   flex 居中会被容器的 inline 布局偏移带偏。改为相对按钮
				   （position:relative）绝对居中，不依赖外部容器，深浅一致。 */
				style: { display: 'block', position: 'absolute', top: '50%', left: '50%',
					transform: 'translate(-50%, -50%)',
					width: '20px', height: '20px', objectFit: 'contain',
					borderRadius: '50%', pointerEvents: 'none' }
			}))
			if (!confirming) return trigger
			const W = 288
			const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
			let left = anchorRect ? anchorRect.right - W : vw - W - 12
			if (left < 8) left = 8
			if (left + W > vw - 8) left = Math.max(8, vw - W - 8)
			const top = anchorRect ? anchorRect.bottom + 8 : 48
			/* ===== 2026-11-18 重设计：两个卡片式选项 + 取消 =====
			   旧版是 4 个平级按钮（立即重载/演练/冷重启/取消）+ 3 行说明，
			   新人第一眼看不懂、且「演练」对用户无意义（那是维护者的自测手段）。
			   新版：
			     · 「刷新页面」「重启应用」做成整块可点的卡片，各带一句人话说明
			     · 去掉演练；点「重启应用」时先静默跑一次前置检查，
			       通过才弹二次确认，不通过直接说原因
			     · 文案里不出现 detached / cookie / Host 半 等内部术语 */
			/* 行式条目：对齐官方 primitives.Menu 的观感 —— 无边框、整行可点、
			   只有 hover 时的极淡底色。完全不使用强调色（旧版用 user-accent
			   导致整块发黄、两个大边框盒子显得笨重）。 */
			/* 行内左侧图标：刷新（逆时针圆弧 + 箭头）与电源（竖线 + 开口环）。
			   统一 14px、stroke 1.5、currentColor —— 与官方图标粗细一致，
			   不引入新配色，深浅主题自动跟随。 */
			const rowIcon = (kind) => {
				const base = {
					width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none',
					stroke: 'currentColor', 'stroke-width': '1.5',
					'stroke-linecap': 'round', 'stroke-linejoin': 'round',
					'aria-hidden': 'true', flex: 'none'
				}
				if (kind === 'power') {
					return h2('svg', base,
						h2('path', { d: 'M8 2v6' }),
						h2('path', { d: 'M11.6 4.2a5 5 0 1 1-7.2 0' })
					)
				}
				return h2('svg', base,
					h2('path', { d: 'M13.2 8a5.2 5.2 0 1 1-1.6-3.7' }),
					h2('path', { d: 'M13.2 2.6v3.2h-3.2' })
				)
			}
			/* 横向三栏：图标 + 文字块 + 右侧箭头。
			   之前是纯竖向两行文字、右侧全空，所以「呆」。
			   箭头给「可点击」的暗示；hover 时右移 2px（CSS 里做）。 */
			const optRow = (dataAttr, title, desc, iconKind, onClick, disabledNow) => h2('button', {
				type: 'button', 'data-buxu-reload': dataAttr, disabled: disabledNow,
				onClick,
				style: {
					display: 'flex', alignItems: 'center',
					gap: '9px', width: '100%', textAlign: 'left',
					font: 'inherit', padding: '7px 8px', borderRadius: '6px',
					cursor: disabledNow ? 'default' : 'pointer',
					border: '0',
					background: 'transparent',
					color: 'var(--dsw-alias-label-secondary)',
					opacity: disabledNow ? 0.55 : 1,
					transition: 'background-color .12s'
				}
			},
				h2('span', { style: { display: 'inline-flex', flex: 'none',
					color: 'var(--dsw-alias-label-tertiary)' } }, rowIcon(iconKind)),
				h2('span', { style: { display: 'flex', flexDirection: 'column',
					gap: '2px', minWidth: '0', flex: '1 1 auto', width: '100%',
					alignItems: 'flex-start', overflow: 'hidden' } },
					h2('span', { style: { fontSize: '12px', fontWeight: 600, lineHeight: '1.35',
						color: 'var(--dsw-alias-label-primary)' } }, title),
					h2('span', { style: { fontSize: '10.5px', lineHeight: '1.35',
						color: 'var(--dsw-alias-label-tertiary)' } }, desc)
				),
				h2('span', { 'data-buxu-reload-chevron': '1', 'aria-hidden': 'true',
					style: { flex: 'none', fontSize: '12px', lineHeight: '1',
						color: 'var(--dsw-alias-label-tertiary)',
						transition: 'transform .12s' } }, '›')
			)

			/* 关闭按钮：右上角 ×。比底部「取消」整行省约 32px 高，
			   也符合弹窗的通用关闭位置。保留 aria-label 供读屏与键盘使用。 */
			const cancelBtn = h2('button', {
				type: 'button', 'data-buxu-reload': 'cancel', disabled: busy,
				'aria-label': '取消', title: '取消',
				onClick: () => { setAskingRestart(false); setConfirming(false) },
				style: {
					flex: 'none', width: '20px', height: '20px', padding: '0',
					display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
					border: '0', borderRadius: '5px', background: 'transparent',
					cursor: busy ? 'default' : 'pointer',
					color: 'var(--dsw-alias-label-tertiary)',
					font: 'inherit', fontSize: '14px', lineHeight: '1',
					marginLeft: '6px', marginTop: '-1px',
					transition: 'background-color .12s, color .12s'
				}
			}, '\u00d7')

			/* 顶部区：左「标题 + 提示」，右「×」并排。
			   之前标题/提示各自占一整行、取消在最底下，纵向白白多出两段。 */
			const headBlock = h2('div', {
				style: { display: 'flex', alignItems: 'flex-start', gap: '8px',
					marginBottom: '6px' }
			},
				h2('div', { style: { display: 'flex', flexDirection: 'column',
					gap: '1px', minWidth: '0', flex: '1 1 auto' } },
					h2('div', { style: { fontWeight: 600, fontSize: '12.5px',
						lineHeight: '1.3', color: 'var(--dsw-alias-label-primary)' } }, '刷新或重启'),
					h2('div', { style: { fontSize: '10.5px', lineHeight: '1.45',
						color: 'var(--dsw-alias-label-tertiary)' } }, '界面没更新时用')
				),
				cancelBtn
			)

			/* 弹窗打开时不给任何条目焦点：列表容器加 tabIndex=-1 并在弹窗
			   挂载后由 card 自身持有焦点，避免第一行出现「像被选中」的底色。
			   键盘用户按 Tab 仍可正常进入条目。 */
			/* 主题色渐变分割线：两端淡出、中间最亮。
			   比纯灰 border 精致，且不用改结构。 */
			const divider = h2('div', {
				'data-buxu-reload': 'divider', 'aria-hidden': 'true',
				style: {
					height: '1px',
					margin: '5px 8px',
					flex: 'none',
					/* 透明 → 主题色 → 透明；用 55% 而非纯色，避免抢眼 */
					background: 'linear-gradient(90deg, transparent 0%, ' +
						'color-mix(in srgb, var(--buxu-user-accent, var(--dsw-alias-label-primary)) 55%, transparent) 22%, ' +
						'color-mix(in srgb, var(--buxu-user-accent, var(--dsw-alias-label-primary)) 55%, transparent) 78%, ' +
						'transparent 100%)'
				}
			})
			const listBlock = h2('div', { style: { display: 'flex', flexDirection: 'column' } },
				optRow('go', '刷新页面',
					'重新加载界面，对话不会丢失',
					'refresh', doReload, busy),
				divider,
				optRow('restart', '重启应用',
					'完全关闭后重新打开。刷新无效时再用',
					'power', () => { prepareRestart() }, busy)
			)

			/* 二次确认：点「重启应用」且前置检查通过后才出现。 */
			const confirmBlock = h2('div', { 'data-buxu-reload': 'restart-confirm',
				style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
				h2('div', { style: { fontSize: '11.5px', lineHeight: '1.55',
					color: 'var(--dsw-alias-label-secondary)' } },
					'应用会关闭几秒后自动重新打开，对话记录会保留。现在重启吗？'),
				h2('div', { style: { display: 'flex', gap: '8px' } },
					h2('button', { type: 'button', 'data-buxu-reload': 'restart-go', disabled: busy,
						onClick: () => { setAskingRestart(false); runRestart(false) },
						style: { font: 'inherit', fontSize: '12px', padding: '6px 14px', borderRadius: '6px',
							cursor: busy ? 'default' : 'pointer',
							/* 2026-11-18 修复「确认重启看不清」：
							   旧版用 label-primary 作背景（深色主题下是近白 #D9DDD9），
							   pop-surface 作文字（深灰），白底深灰字在深色弹窗里
							   既刺眼又发糊，六套配色下都不够看。
							   改为：**当前配色的强调色实心** + 按亮度自动选前景。
							   六套实测对比度 5.12~7.88:1，全部达 AA。
							   颜色跟随主题（墨玉=青绿、藏青=蓝、石墨紫=紫、宣纸=棕褐），
							   不再是全局金黄；与「再想想」（透明描边）形成清晰主次。 */
							border: '1px solid var(--buxu-user-accent)',
							background: 'var(--buxu-user-accent)',
							color: 'var(--buxu-user-accent-contrast)',
							fontWeight: 600 } },
					busy ? '正在重启…' : '确认重启'),
					h2('button', { type: 'button', 'data-buxu-reload': 'restart-back', disabled: busy,
						onClick: () => { setAskingRestart(false); setStatus('') },
						style: { font: 'inherit', fontSize: '12px', padding: '6px 14px', borderRadius: '6px',
							cursor: busy ? 'default' : 'pointer',
							/* 次要按钮：透明底 + 描边，与主按钮的实心强调色形成主次 */
							border: '1px solid var(--buxu-pop-border, var(--dsw-alias-border-l2))',
							background: 'transparent',
							color: 'var(--dsw-alias-label-primary)' } }, '再想想')
				)
			)

			/* 2026-11-18：容器可聚焦但不进 Tab 顺序（tabIndex=-1），
			   打开时由 effect 把焦点移到这里 —— 否则第一个 autoFocus 条目
			   会出现白色焦点框，看着像「默认选中」。 */
			const card = h2('div', {
				'data-buxu-reload': 'confirm', role: 'dialog', 'aria-label': '刷新或重启',
				ref: dialogRef, tabIndex: -1,
				style: {
					position: 'fixed', left: left + 'px', top: top + 'px', zIndex: 1200,
					width: W + 'px', maxWidth: 'calc(100vw - 16px)', padding: '10px 10px 8px',
					boxSizing: 'border-box',
					background: 'var(--buxu-pop-surface, var(--dsw-alias-bg-layer-2))',
					border: '1px solid var(--buxu-pop-border, var(--dsw-alias-border-l2))',
					borderRadius: '8px', boxShadow: 'var(--buxu-pop-shadow, 0 8px 24px rgba(0,0,0,.3))',
					color: 'var(--dsw-alias-label-primary)', fontSize: '12px', lineHeight: '1.6'
				}
			},
				headBlock,
				askingRestart ? confirmBlock : listBlock,
				status ? h2('div', { role: 'status', style: { marginTop: '6px', fontSize: '10.5px',
					lineHeight: '1.5', color: 'var(--dsw-alias-label-secondary)' } }, status) : null
			)
			/* 2026-11-18：重写渲染段时漏掉了这一行 return —— 会让组件返回 undefined
			   直接崩掉整个 header。补回（并加注释防复发）。 */
			return h2('div', { 'data-buxu-reload': 'root' }, trigger, toBodyPortal(card))
		}
		/* ================================================================
		 * 复制到工作区（2026-11-12）
		 *
		 * 官方 Client 公开面没有「跨工作区移动会话」：归属由 Workspace.sessionIds
		 * 表达，会话 header 的 cwd 必须等于 workspace.path 且不可变，
		 * forkWorkspace() 也把子会话 attach 回源工作区 —— 真移动必须改 Host。
		 * 因此本项按用户确认的语义实现为「复制」：在目标工作区新建一个空白
		 * 会话，标题派生自原标题并加后缀「（新）」，原会话与聊天历史都不动。
		 *
		 * API（均为本机 asar 静态源码核实）：
		 *   · ctx.get('sessions').create({ workspaceId }) → 新建并 attach 到目标
		 *     工作区（dsh-api-session-controller/lib/types/commands.js 的 create）
		 *   · ctx.get('sessions').using(id, …).binding.session.rename(title)
		 *     （沿用本插件 archiveRename 的既有形状）
		 *   · useWorkspaces(s => s.items) 拿目标列表（standardProps 注入）
		 *   · props.useMenuOpenState() 点完 setOpen(false) 关菜单
		 *
		 * 失败一律就地提示、不新建脏数据；不跳转、不改配置、不新增 schema 字段。
		 * ================================================================ */
		
		/** 当前会话归属哪个工作区：用官方快照反查（与官方侧栏同源）。 */
		function owningWorkspaceId(items, sessionId) {
			for (const w of items || []) {
				if (w && Array.isArray(w.sessionIds) && w.sessionIds.indexOf(sessionId) >= 0) return w.workspaceId
			}
			return ''
		}
		
		/** 派生副本标题：原标题 + 「（新）」，超长截断，避免把菜单撑爆。 */
		function copySessionTitle(displayTitle) {
			const base = String(displayTitle || '新会话').trim().slice(0, 60) || '新会话'
			return base + '（新）'
		}
		
		/** 在目标工作区新建空白副本会话；返回新会话 id。全部 try/catch 由调用方兜。 */
		async function createCopySession(ctx, workspaceId, title) {
			const sessions = ctx && typeof ctx.get === 'function' ? ctx.get('sessions') : null
			if (!sessions || typeof sessions.create !== 'function') throw new Error('sessions 服务不可用')
			const newId = await Promise.resolve(sessions.create({ workspaceId: workspaceId }))
			if (!newId) throw new Error('未返回新会话 id')
			/* 改名失败不算整体失败：会话已建好，保留官方默认标题即可。
			   using() 需要该会话已 catalogue；create() 内部 projectList 已保证。 */
			if (typeof sessions.using === 'function') {
				try {
					await Promise.resolve(sessions.using(newId, { source: 'controllerOperation' },
						(ref) => ref.binding.session.rename(title)))
				} catch (e) { /* 改名失败：副本仍在，忽略 */ }
			}
			return newId
		}
		
		/** 右键菜单项：一级「复制到工作区…」→ 二级目标工作区列表。
		 *  排除当前归属工作区；建完不跳转；点完关菜单；失败就地显示一行小字。 */
		function CopyToWorkspaceMenuItem(props) {
			const ctx = props && props.ctx
			const sessionId = props && props.sessionId
			const displayTitle = props && props.displayTitle
			const useMenuOpenState = props && props.useMenuOpenState
			const useWorkspaces = props && props.useWorkspaces
			const [submenu, setSubmenu] = React2.useState(null)  /* { x, y } 视口坐标 */
			const [busy, setBusy] = React2.useState('')
			const [error, setError] = React2.useState('')
			const toggleRef = React2.useRef(null)
			/* useWorkspaces 是真 hook，必须无条件调用（与 archiveRows 同构）。
			   下面的 useEffect 也必须放在任何提前 return 之前，保证 hook 数量稳定。 */
			let items = []
			try { items = useWorkspaces((snap) => snap && snap.items) || [] } catch (e) { items = [] }
			/* 子菜单 Escape / 点外部关闭；监听在打开期间挂载，卸载时清理。 */
			React2.useEffect(() => {
				if (!submenu) return
				const onKey = (e) => { if (e && e.key === 'Escape') { setSubmenu(null); e.stopPropagation() } }
				const onDown = (e) => {
					try {
						const t = e.target
						if (t && t.closest && (t.closest('[data-buxu-copy-submenu]') || t.closest('[data-buxu-copy-to-workspace=toggle]'))) return
						setSubmenu(null)
					} catch (err) { setSubmenu(null) }
				}
				document.addEventListener('keydown', onKey, true)
				const timer = setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0)
				return () => { clearTimeout(timer); document.removeEventListener('keydown', onKey, true); document.removeEventListener('pointerdown', onDown, true) }
			}, [submenu])
			if (!sessionId) return null
			const current = owningWorkspaceId(items, sessionId)
			const targets = (items || []).filter((w) => w && w.workspaceId && w.workspaceId !== current)
			const closeMenu = () => {
				try {
					if (typeof useMenuOpenState === 'function') {
						const [, setOpen] = useMenuOpenState()
						if (typeof setOpen === 'function') setOpen(false)
					}
				} catch (e) { /* 忽略 */ }
			}
			/* 点一级项：取按钮右缘，弹出式子菜单（不就地撑高官方菜单）。 */
			const onToggle = (e) => {
				e.preventDefault(); e.stopPropagation()
				/* 官方菜单在 pointerdown / click 时会 dismiss 整份菜单；
				   我们的一级项要「弹出子菜单」而不是「执行动作并关菜单」，
				   所以必须拦住冒泡，否则刚 setSubmenu 组件就被卸载。 */
				setError('')
				if (submenu) { setSubmenu(null); return }
				try {
					const r = (toggleRef.current || e.currentTarget).getBoundingClientRect()
					/* 水平：靠屏幕右缘时往左翻（官方 anchored 菜单同思路）。 */
					let sx = Math.round(r.right + 4)
					if (typeof window !== 'undefined' && sx + 200 > window.innerWidth - 8) {
						sx = Math.max(8, Math.round(r.left - 204))
					}
					/* 垂直：估算列表高度（每项约 36px + 8px padding），底部放不下就
					   向上翻到「按钮底部往上」对齐，再由浮层 maxHeight + overflowY
					   兜底滚动。2026-11-12 真机反馈「超出窗口」即由此修复。 */
					const estH = Math.min(8 + Math.max(targets.length, 1) * 36 + (error ? 36 : 0), 320)
					const vh = typeof window !== 'undefined' ? window.innerHeight : 10000
					let sy = Math.round(r.top)
					if (sy + estH > vh - 8) {
						sy = Math.max(8, Math.round(r.bottom - estH))
					}
					setSubmenu({ x: sx, y: sy })
				} catch (err) { setSubmenu({ x: 0, y: 0 }) }
			}
			const onPick = async (w) => {
				if (busy) return
				setBusy(w.workspaceId); setError('')
				try {
					await createCopySession(ctx, w.workspaceId, copySessionTitle(displayTitle))
					setSubmenu(null)
					closeMenu()
				} catch (err) {
					setError('复制失败：' + (err && err.message ? err.message : '未知错误'))
				} finally { setBusy('') }
			}
			const rowStyle = { display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
				padding: '6px 8px', background: 'transparent', border: '0',
				color: 'var(--dsw-alias-label-primary)', font: 'inherit', fontSize: '13px',
				lineHeight: '20px', minHeight: '34px', cursor: 'pointer', textAlign: 'left',
				boxSizing: 'border-box' }
			const subItemStyle = Object.assign({}, rowStyle, {})
			const panel = submenu ? h2('div', {
				'data-buxu-copy-submenu': 'panel', role: 'menu',
				/* 子菜单挂在 body，pointerdown 冒泡到官方菜单会把它 dismiss 掉；
				   这里拦住冒泡，让点击目标工作区的 onClick 能正常执行。 */
				onPointerDown: (e) => { if (e && e.stopPropagation) e.stopPropagation() },
				/* 容器对齐官方 _list_/_submenu_ 的列表设计：border:0 + elevation 阴影，
				   padding 4px、flex column、gap 0。官方不写死背景色，靠 elevation token；
				   这里保留菜单底色兜底，避免旧宿主缺 token 时透明。 */
				style: { position: 'fixed', left: submenu.x + 'px', top: submenu.y + 'px',
					zIndex: 1100, minWidth: '180px', maxWidth: '280px',
					boxSizing: 'border-box', padding: '4px',
					display: 'flex', flexDirection: 'column', gap: '0',
					maxHeight: 'min(320px, calc(100vh - 16px))', overflowY: 'auto',
					background: 'var(--buxu-pop-surface)',
					border: '1px solid var(--buxu-pop-border)',
					borderRadius: 'var(--dsw-radius-md, 6px)',
					boxShadow: 'var(--buxu-pop-shadow)',
					color: 'var(--dsw-alias-label-primary)' } },
					targets.length === 0
						? h2('div', { style: Object.assign({}, subItemStyle, {
							color: 'var(--dsw-alias-label-tertiary)', cursor: 'default' }) },
							h2(MenuItemIconSlot, { kind: 'workspace' }), '没有其他工作区')
						: targets.map((w) => h2('button', {
							type: 'button', role: 'menuitem', 'data-buxu-menu-item': '1', key: w.workspaceId,
							'data-buxu-copy-to-workspace': 'target',
							'data-buxu-workspace-id': w.workspaceId,
							disabled: !!busy, style: subItemStyle,
							onClick: () => onPick(w)
						  },
							h2(MenuItemIconSlot, { kind: 'workspace' }),
							busy === w.workspaceId ? '处理中…' : (w.title || w.path || w.workspaceId))),
					error ? h2('div', { role: 'alert', style: Object.assign({}, subItemStyle, {
						color: 'var(--dsw-alias-state-warn-label, #FF8A30)', cursor: 'default' }) }, error) : null
			) : null
			return h2('div', { 'data-buxu-copy-to-workspace': 'root' },
				h2('button', {
					type: 'button', role: 'menuitem', 'data-buxu-menu-item': '1', ref: toggleRef,
					'aria-haspopup': 'menu', 'aria-expanded': submenu ? 'true' : 'false',
					'data-buxu-copy-to-workspace': 'toggle',
					style: rowStyle, onClick: onToggle
				},
					h2(MenuItemIconSlot, { kind: 'copy' }),
					h2('span', { style: { flex: 1 } }, '复制到工作区…'),
					h2(MenuItemIcon, { kind: 'chevron' })
				),
				toBodyPortal(panel)
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
					h2(GroupTitle, { label: '配色方案' }),
					h2('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
						paletteKeys.map((k) =>
							h2(ChoiceCard, {
								key: k,
								selected: activePid === k,
								disabled,
								title: (PALETTES[k].label && PALETTES[k].label.zh) || k,
								subtitle: (PALETTES[k].scheme === 'dark' ? '深色' : '浅色') +
									(PALETTES[k].layout === 'plain' ? ' · 原生布局' : ' · 精修布局'),
								onSelect: () => {
									/* 2026-11-18：换配色时，若用户没手动设过强调色 / 推理条，
									   一并把这两个值切成新配色自带的（palette.accent / palette.effort）。
									   这样「换主题」是整体换，而不是只换底色。
									   用户手动设过的（*UserSet === true）不动。 */
									const kv = { palette: k }
									const np = PALETTES[k]
									if (s.accentUserSet !== true && np && typeof np.accent === 'string') {
										kv.accent = np.accent
									}
									if (s.effortUserSet !== true && np && typeof np.effort === 'string') {
										kv.effortGradient = np.effort
									}
									patch(kv)
								}
							}, PalettePreview(resolvePaletteColors(k, s), PALETTES[k].layout))
						)
					),
					h2(GroupTitle, { label: '强调色与灰阶' }),
					h2('div', { style: { display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' } },
						h2('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' } },
							'强调色',
							h2('input', {
								type: 'color',
								/* 2026-11-18：显示「当前实际生效」的强调色 ——
								   用户没手动设过时就是配色自带的那个。 */
								value: /^#[0-9A-Fa-f]{6}$/.test(effectiveAccent(s) || '') ? effectiveAccent(s) : '#F56619',
								/* 用户一改就置 accentUserSet，之后切换配色不再覆盖 */
								onChange: (e) => patch({ accent: e.target.value, accentUserSet: true }),
								style: { width: '36px', height: '26px', border: 'none', background: 'none', cursor: 'pointer' }
							})
						),
						/* 跟随状态提示 + 一键恢复跟随 */
						s.accentUserSet === true
							? h2('button', {
								type: 'button',
								onClick: () => patch({ accentUserSet: false, accent: effectiveAccent(Object.assign({}, s, { accentUserSet: false })) }),
								style: { font: 'inherit', fontSize: '11px', padding: '3px 8px',
									border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '5px',
									background: 'transparent', color: 'var(--dsw-alias-label-secondary)', cursor: 'pointer' }
							}, '恢复跟随配色')
							: h2('span', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-tertiary)' } },
								'跟随当前配色'),
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
			/* 2026-11-18：当前生效的推理条改走 effectiveEffortId ——
			   用户没手动选过（effortUserSet !== true）时跟随配色方案自带的
			   effort 推荐值，所以这里显示的是「实际生效的那个」。
			   用户点选时同时置 effortUserSet = true，之后不再被配色覆盖。 */
			const activeGrad = effectiveEffortId(s)
			const effortFollowing = s.effortUserSet !== true
			const customColors = (Array.isArray(s.effortCustomColors) && s.effortCustomColors.length === 4)
				? s.effortCustomColors : DEFAULT_EFFORT_CUSTOM
			const gradCard = (g) =>
				h2('button', {
					key: g.id, type: 'button',
					'data-buxu-gradient': g.id,
					'aria-pressed': activeGrad === g.id,
					/* 2026-11-18：用户手动选推理条 → 置 effortUserSet，
					   之后切换配色不再覆盖这个选择。 */
					onClick: () => patch({ effortGradient: g.id, effortUserSet: true }),
					style: {
						display: 'flex', flexDirection: 'column', gap: '4px',
						width: '104px', padding: '6px', borderRadius: '8px',
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
							/* 2026-11-18：原为写死 rgba(0,0,0,.12) ——
							   深色主题下这条描边几乎看不见，浅色下又偏重。
							   改用主题 token，六套配色各自合适。 */
							border: '1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.12))'
						}
					}),
					h2('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-primary)' } }, g.label)
				)
			/* 6 套内置预置（不同维度）+ 用户自存 + 自定义，平铺；
			   粒子是独立开关，不再绑在方案上。 */
			const userPresets = parseUserPresets(s.effortUserPresets)
			const userGradients = userPresets.map(userPresetToGradient)
			const allGradients = EFFORT_GRADIENTS.filter((g) => !g.custom).concat(userGradients)
			/* 2026-11-18：推理条默认跟随配色方案。这里显示跟随状态，
			   并给一个「恢复跟随配色」的入口（手动选过之后才会出现）。 */
			const effortFollowBar = h2('div', {
				style: { display: 'flex', alignItems: 'center', gap: '8px',
					marginBottom: '8px', fontSize: '11px' }
			},
				effortFollowing
					? h2('span', { style: { color: 'var(--dsw-alias-label-tertiary)' } },
						'跟随当前配色（' + (PALETTES[activePid] && PALETTES[activePid].label
							? PALETTES[activePid].label.zh : activePid) + '）：' + effortGradientById(activeGrad).label)
					: h2('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, '已手动设定'),
				effortFollowing
					? null
					: h2('button', {
						type: 'button',
						onClick: () => patch({ effortUserSet: false, effortGradient: effectiveEffortId(Object.assign({}, s, { effortUserSet: false })) }),
						style: { font: 'inherit', fontSize: '11px', padding: '3px 8px',
							border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '5px',
							background: 'transparent', color: 'var(--dsw-alias-label-secondary)', cursor: 'pointer' }
					}, '恢复跟随配色')
			)
			const presetCards = h2('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
				allGradients.map((g) => {
					const card = gradCard(g)
					/* 给用户预设挂删除按钮：直接包一层，不动 gradCard 本身 */
					if (!g.userPreset) return card
					return h2('div', { key: 'u-' + g.id, style: { position: 'relative' } },
						card,
						h2('button', {
							type: 'button',
							'data-buxu-preset-del': g.id,
							title: '删除这个预设',
							'aria-label': '删除预设 ' + g.label,
							onClick: (e) => {
								if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
								const next = userPresets.filter((p) => p.id !== g.id)
								const stillActive = activeGrad === g.id
								patch({
									effortUserPresets: JSON.stringify(next),
									/* 删掉正在用的预设 → 回落到默认，避免配置指向不存在的 id */
									...(stillActive ? { effortGradient: DEFAULT_EFFORT_GRADIENT } : {})
								})
							},
							style: {
								position: 'absolute', top: '-6px', right: '-6px',
								width: '18px', height: '18px', borderRadius: '50%',
								border: '1px solid var(--dsw-alias-border-l2)',
								background: 'var(--dsw-alias-bg-layer-3)',
								color: 'var(--dsw-alias-label-secondary)',
								fontSize: '11px', lineHeight: '1', cursor: 'pointer',
								display: 'flex', alignItems: 'center', justifyContent: 'center',
								padding: '0'
							}
						}, '×')
					)
				})
			)
			const stopsLabel = ['起点 0%', '中段 34%', '中段 67%', '终点 100%']
			const customBlock = h2('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
				h2(GroupTitle, { label: '自定义渐变' }),
				h2('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' } },
					customColors.map((c, i) => {
						const isNone = c === ''
						const shownColor = /^#[0-9A-Fa-f]{6}$/.test(c) ? c : DEFAULT_EFFORT_CUSTOM[i]
						return h2('span', { key: i, style: { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px' } },
							h2('span', { style: { color: 'var(--dsw-alias-label-tertiary)' } }, stopsLabel[i].split(' ')[0]),
							h2('button', {
								type: 'button',
								'data-buxu-gradient-none': isNone ? '1' : '0',
								'data-buxu-gradient-stop': String(i),
								title: isNone ? '恢复颜色' : '设为无色',
								'aria-label': isNone ? '恢复颜色' : '设为无色',
								onClick: () => {
									const next = customColors.slice()
									next[i] = isNone ? shownColor : ''
									patch({ effortCustomColors: next, effortGradient: 'custom' })
								},
								style: { position: 'relative', width: '32px', height: '24px', padding: '0',
									border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '4px',
									background: isNone ? 'var(--dsw-alias-bg-layer-2)' : shownColor,
									cursor: 'pointer', flex: 'none', overflow: 'hidden' }
							}, isNone ? h2('span', { 'aria-hidden': 'true',
								style: { position: 'absolute', inset: '0', display: 'flex',
									alignItems: 'center', justifyContent: 'center', fontSize: '15px',
									color: 'var(--dsw-alias-label-secondary)',
									background: 'linear-gradient(45deg, transparent 44%, currentColor 44%, currentColor 56%, transparent 56%)' } }) : null),
							h2('input', {
								type: 'color',
								value: shownColor,
								onChange: (e) => {
									const next = customColors.slice()
									next[i] = e.target.value
									patch({ effortCustomColors: next, effortGradient: 'custom' })
								},
								style: { width: '22px', height: '22px', border: 'none', background: 'none', cursor: 'pointer', padding: '0' }
							})
						)
					}),
					gradCard(EFFORT_GRADIENTS.find((g) => g.id === 'custom'))
				),
				/* 「存为预设」行：把当前 4 个自定义色存成一个可复用的命名预设。
				   输入框 + 按钮内联排布，不用弹窗打断操作。
				   达到上限时按钮禁用并提示（HOST 端上限 EFFORT_USER_PRESETS_MAX）。 */
				h2('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
					h2('input', {
						type: 'text',
						'data-buxu-preset-name': '',
						placeholder: '预设名称',
						maxLength: 24,
						defaultValue: '',
						style: {
							width: '120px', height: '26px', padding: '0 8px',
							fontSize: '11px', borderRadius: '6px',
							border: '1px solid var(--dsw-alias-border-l2)',
							background: 'var(--dsw-alias-bg-layer-2)',
							color: 'var(--dsw-alias-label-primary)'
						}
					}),
					h2('button', {
						type: 'button',
						'data-buxu-preset-save': '',
						disabled: userPresets.length >= EFFORT_USER_PRESETS_MAX,
						title: userPresets.length >= EFFORT_USER_PRESETS_MAX
							? '最多 ' + EFFORT_USER_PRESETS_MAX + ' 个预设，请先删除一个'
							: '把当前自定义配色存为预设',
						onClick: (e) => {
							const btn = e && e.currentTarget
							const row = btn && btn.parentNode
							const input = row && row.querySelector('[data-buxu-preset-name]')
							const name = (input && input.value ? String(input.value) : '').trim().slice(0, 24)
							if (!name) {
								if (input && typeof input.focus === 'function') input.focus()
								return
							}
							const id = 'user:' + Date.now()
							const entry = { id, name, colors: customColors.slice() }
							const next = userPresets.concat([entry]).slice(-EFFORT_USER_PRESETS_MAX)
							patch({ effortUserPresets: JSON.stringify(next), effortGradient: id })
							if (input) input.value = ''
						},
						style: {
							height: '26px', padding: '0 12px', fontSize: '11px',
							borderRadius: '6px', cursor: 'pointer',
							border: '1px solid var(--dsw-alias-border-l2)',
							background: userPresets.length >= EFFORT_USER_PRESETS_MAX
								? 'var(--dsw-alias-bg-layer-1)' : 'var(--dsw-alias-bg-layer-3)',
							color: userPresets.length >= EFFORT_USER_PRESETS_MAX
								? 'var(--dsw-alias-label-tertiary)' : 'var(--dsw-alias-label-primary)'
						}
					}, '存为预设'),
					h2('span', { style: { fontSize: '10px', color: 'var(--dsw-alias-label-tertiary)' } },
						userPresets.length + '/' + EFFORT_USER_PRESETS_MAX)
				)
			)
			rows.push(
				h2(Section, { key: 'sec-gradient', number: 3, title: '推理强度条配色', desc: '只影响模型菜单中的推理等级滑块' },
					h2(GroupTitle, { label: '预置方案' }),
					effortFollowBar,
					presetCards,
					customBlock,
					h2('div', { style: { paddingTop: '10px', borderTop: '1px solid var(--dsw-alias-border-l1)' } },
						h2(Toggle, {
							checked: s.effortParticles === true,
							onChange: (v) => patch({ effortParticles: v }),
							label: '气泡粒子效果（可随任意配色叠加）',
							dataAttr: 'data-buxu-particles-toggle'
						}),
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
					h2(GroupTitle, { label: '兼容性' }),
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

			/* 2026-11-14 重设计：6 区归 3 组（外观 / 内容与布局 / 系统），
			   每组组标题 + 细分隔线，组内两列独立堆叠（不联动高度）。
			   整体配色排最前、作为视觉重点；强调色只给激活态控件。 */
			const groupHeader = (label) => h2('div', {
				'data-buxu-settings-group': label,
				style: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }
			},
				h2('span', { style: { fontSize: '11px', fontWeight: 700, letterSpacing: '1px',
					color: 'var(--dsw-alias-label-secondary)', flex: 'none' } }, label),
				h2('span', { style: { flex: '1', height: '1px',
					background: 'var(--dsw-alias-border-l2)' } })
			)
			/* 2026-11-14 真机白屏修复：React 的 key 是特殊属性，不会进 props，
			   用 r.props.key 查找会全部返回 null（只剩组标题横线、六个分区全空）。
			   rows 是按 1~6 顺序 push 的，直接按下标取：
			   0=总开关 1=整体配色 2=推理条配色 3=布局尺寸 4=对话头像 5=高级 */
			const master = rows[0]
			const palette = rows[1]
			const gradient = rows[2]
			const geometry = rows[3]
			const avatars = rows[4]
			const advanced = rows[5]
			const twoCol = (a, b) => h2('div', {
				style: { display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start' }
			},
				h2('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', flex: '1 1 320px', minWidth: '0' } }, a),
				h2('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', flex: '1 1 320px', minWidth: '0' } }, b)
			)
			const groups = h2('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
				groupHeader('外观'),
				twoCol(palette, gradient),
				groupHeader('内容与布局'),
				twoCol(geometry, avatars),
				groupHeader('系统'),
				twoCol(master, advanced)
			)
			return h2('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', paddingRight: '8px' } },
				statusNode,
				groups
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
				/* 2026-11-18：崩溃兜底面板的颜色**刻意写死** ——
				   走到这里说明主题层可能已经不可用，不能再依赖 --dsw-* token。
				   但必须同时适配深浅两套：优先用官方 token（正常可用时跟随主题），
				   token 缺失时用写死的红；文字色用 light-dark() 让深浅各自可读。
				   light-dark() 在 Chromium 123+ 可用（DSH 桌面版满足），
				   不支持时退回原红色，不影响可读性。 */
				return h2('div', {
					style: {
						padding: '14px 16px', margin: '8px 0', borderRadius: '6px',
						border: '1px solid var(--dsw-alias-state-error-border, #B4232C)',
						background: 'var(--dsw-alias-state-error-bg, rgba(180,35,44,0.08))',
						color: 'var(--dsw-alias-state-error-label, #D9505A)',
						fontFamily: 'Consolas, monospace', fontSize: '11px',
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
				assistantAvatarHistory: '[]', userAvatarHistory: '[]', sessionMarks: '{}',
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

			/* 回退对话：安装 row action（element-tree mount）。
			   effect 返回的 disposer 会在卸载时还原 entry.component。 */
			ctx.effect(() => installRewindRowAction(ctx), 'dsh-theme-buxu: rewind row action')

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
						/* 2026-11-16：四种行容器都要插用户头像 ——
						   durable（user / steering）+ pending（本地回声 / 待处理 steering）。
						   pending 阶段气泡已上屏但没有 data-chat-flow-kind，
						   只认前两种会让头像「慢半拍」到 Host 回传后才出现。 */
						const users = document.querySelectorAll(
							"[data-chat-flow-kind='user'], [data-chat-flow-kind='steering'], [data-submission-echo], [data-pending-steering]"
						)
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
					/* 2026-11-15 闪动修复（第二轮）：同样判等，避免每帧无条件写 right。 */
					const userRight = -(GEO.avatarSize + 8) + 'px'
					for (const span of document.querySelectorAll('[' + AV + '][data-buxu-owned="1"]')) {
						if (span.getAttribute(AV) !== 'user') continue
						if (span.style.getPropertyValue('right') !== userRight ||
							span.style.getPropertyPriority('right') !== 'important') {
							span.style.setProperty('right', userRight, 'important')
						}
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
				/* 2026-11-15 轻量化（组 B）：原 200ms + 700ms 两次兜底补扫，
				   200ms 那次与首帧 scan() / observer 的 rAF 补扫高度重叠，且
				   scanDirect 已全面判等（稳态零写入），重复跑只是白耗一次
				   全量 querySelectorAll。合并为单次 700ms 兜底。 */
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
				if (typeof subscribeBodyMutations === 'function' && document.body) {
					observer = subscribeBodyMutations(() => {
						const nowRoot = document.querySelector('[data-conversation-content]')
						/* 2026-11-15 闪动修复（第二轮）：旧写法 hasNewContent 几乎恒为
						   true（会话里总有 user/assistant 行），导致 body 上任何子节点
						   变化（含 hover Tooltip）都**跳过防抖立即全量 scanDirect**。
						   现在只在会话容器引用真的换了（切会话）时立即补扫，其余一律
						   走 rAF 防抖；配合下面各写入点的判等，稳态 hover 零 DOM 写入。 */
						if (nowRoot && nowRoot !== lastContentRoot) {
							lastContentRoot = nowRoot
							/* 会话容器换了：立即重扫，跳过防抖 */
							if (!stopped) {
								try { scanDirect() } catch (e) { /* 忽略 */ }
							}
							return
						}
						schedule()
					})
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
					if (observer) observer()   /* hub unsubscribe */
					if (bodyAttrObserver) bodyAttrObserver.disconnect() /* 属性观察保持独立 */
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

			/* 头像节点是动态插入的 → 用 MutationObserver 在插入后再套自定义图。
			   2026-11-15 闪动修复（第二轮）：旧写法对 body 的**任何**子节点变化
			   都无条件跑 applyAvatarOverrides()；hover 复制按钮时官方 Tooltip
			   插节点就会触发全量 background-image 写入，配合官方 transition:all
			   让 28×28 操作按钮闪。改为只在「新增节点里真的有头像」时才跑；
			   稳态 hover 不再触发本 observer 的回调工作。 */
			ctx.effect(() => {
				applyAvatarOverrides()
				let obs = null
				if (typeof subscribeBodyMutations === 'function') {
					obs = subscribeBodyMutations((records) => {
						let hasAvatar = false
						for (const r of records) {
							if (r.type !== 'childList' || !r.addedNodes) continue
							for (const n of r.addedNodes) {
								if (!n || n.nodeType !== 1) continue
								if (n.matches && n.matches('[data-tn-avatar]')) { hasAvatar = true; break }
								if (n.querySelector && n.querySelector('[data-tn-avatar]')) { hasAvatar = true; break }
							}
							if (hasAvatar) break
						}
						if (hasAvatar) applyAvatarOverrides()
					})
				}
				const onStorage = (e) => {
					if (e && e.key && e.key.indexOf('dsh-theme-buxu.avatar.') !== 0) return
					applyAvatarOverrides()
				}
				window.addEventListener('storage', onStorage)
				return () => {
					if (obs) obs()   /* hub unsubscribe */
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
					/* 2026-11-15：后台任务持续输出文字时，body 的 characterData
					   observer 会高频触发本 apply()。旧写法每次都无条件写 5 个
					   属性（3 个 CSS 变量 + 2 个 data 属性，且 buxuSetStyle/Attr
					   不判等还做 tracking），造成周期性样式失效/重绘。
					   实测探针里那些 0% 写入就是这里。现在值没变就一个字都不写：
					   稳态下后台任务再怎么跑，这里零 DOM 写入。 */
					if (panel.getAttribute('data-buxu-todo-label') !== label) {
						buxuSetStyle(panel, '--buxu-todo-fill', label)
						buxuSetStyle(panel, '--buxu-todo-ratio', String(pct / 100))
						buxuSetStyle(panel, '--buxu-todo-pct', label)
						buxuSetAttr(panel, 'data-buxu-todo-label', label)
						/* 关键：写到 span 自身，供 ::after 的 attr() 读取。 */
						buxuSetAttr(spans[2], 'data-buxu-todo-label', label)
					}
				}
				const schedule = () => {
					if (raf !== null) return
					raf = requestAnimationFrame(() => { raf = null; apply() })
				}
				apply()
				if (typeof MutationObserver !== 'undefined') {
					/* 2026-11-15：只关心 todo-panel 自身的变化。旧写法观测整个 body
					   的 characterData，后台任务/流式输出任何文字都会每帧调度一次，
					   即便 apply 判等不写也白白产生 rAF 风暴。 */
					const inTodo = (node) => {
						if (!node) return false
						if (node.nodeType === 1) {
							if (node.matches && node.matches(TODO_SEL)) return true
							if (node.closest && node.closest(TODO_SEL)) return true
						} else if (node.parentElement && node.parentElement.closest) {
							return !!node.parentElement.closest(TODO_SEL)
						}
						return false
					}
					const shouldSchedule = (records) => {
						for (const r of records) {
							if (inTodo(r.target)) return true
							if (r.addedNodes) {
								for (const n of r.addedNodes) if (inTodo(n)) return true
							}
						}
						return false
					}
					obs = subscribeBodyMutations((records) => {
						if (shouldSchedule(records)) schedule()
					})
				}
				return () => {
					if (raf !== null) cancelAnimationFrame(raf)
					if (obs) obs()   /* hub unsubscribe */
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
				if (typeof subscribeBodyMutations === 'function' && document.body) {
					obs = subscribeBodyMutations((records) => { if (shouldSchedule(records)) schedule() })
				}
				return () => {
					effectStopped = true
					effortGeneration++
					if (timer !== null) cancelAnimationFrame(timer)
					if (obs) obs()   /* hub unsubscribe */
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
					/* 会话手动标记：两个右键菜单项 + 一个 leading 小标，全部走官方 list 槽。
					   bit 通过包装组件绑定，不改动 bind() 的通用透传逻辑。 */
					const TodoMenuItem = (p) => h2(SessionMarkMenuItem, Object.assign({ bit: 'todo' }, p || {}))
					const ImportantMenuItem = (p) => h2(SessionMarkMenuItem, Object.assign({ bit: 'important' }, p || {}))
					reg('sidebar.workspaces.session.menu.item',
						{ name: 'sidebar.workspaces.session.menu.item', id: 'dsh-theme-buxu-mark-todo', order: 480 },
						TodoMenuItem)
					reg('sidebar.workspaces.session.menu.item',
						{ name: 'sidebar.workspaces.session.menu.item', id: 'dsh-theme-buxu-mark-important', order: 490 },
						ImportantMenuItem)
					reg('sidebar.workspaces.session.menu.item',
						{ name: 'sidebar.workspaces.session.menu.item', id: 'dsh-theme-buxu-copy-to-workspace', order: 500 },
						CopyToWorkspaceMenuItem),
					/* 右上角「重载页面」：官方 utilities 槽，加自有 id 并列，不替换内置项。 */
					reg('conversation.session.header.utilities',
						{ name: 'conversation.session.header.utilities', id: 'dsh-theme-buxu-reload-page', order: 900 },
						ReloadPageButton),
					reg('sidebar.session.row.leading',
						{ name: 'sidebar.session.row.leading', id: 'dsh-theme-buxu-session-marks', order: 100 },
						SessionMarkLeading)
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
		/* 冷启动按钮要用 remote 命令服务的属性链访问（官方 ui-plan 同款），
		   必须显式声明对应依赖，否则 Cordis Proxy 抛「without inject」。 */
		exports.inject = ['slots', 'locale', 'layout', 'configForms', 'sessions', 'uiWorkspace', 'workspaces', 'conversation', 'remote', 'remote.commands']
		return module.exports
	}
})
