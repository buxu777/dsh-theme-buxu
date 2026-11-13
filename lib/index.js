/**
 * 不虚 · Buxu — Host half.
 *
 * 主题的视觉全部在浏览器端（CSS 变量 + 头像节点注入），
 * 但**配置**必须落在这里：DSH 的设置体系是
 *   服务端 `Config` schema（schemastery）
 *     → 设置文档（user-settings）
 *       → 客户端 `ctx.configForms.get(namespace)`
 * 只有在这里声明了字段，设置页才有东西可渲染、值才能持久化到
 * `cordis.patch.yml` 同级的用户设置文档里（而不是 localStorage 那种易失存储）。
 *
 * 参照官方 `@deepseek-ai/dsh-client-ui-chat` 的做法：
 *   - 用 `z.object({...})` 定义字段（带 default，老用户无值时也能跑）
 *   - `apply` 里 `ctx.inject(['settings'], ...)` 后 `settings.configure`
 *
 * @module dsh-theme-buxu
 */

import z from '@deepseek-ai/schemastery'

/** Host 配置入口 ID：必须与 cordis.patch.yml 的 id 一致，不是 npm 包名。 */
export const BUXU_SETTINGS_NAMESPACE = 'ui-theme-buxu'
/** 当前上架的配色 id（2026-11-09：2 系列石墨2/云白2 已剥离，
    完整定义存于 E:\DSH\_archive\series2\，见 RESTORE.md 可加回）。
    仅保留 1 系列两套，id 不变，已持久化的用户选择不失效。 */
export const PALETTE_IDS = ['slate2', 'cloud2']
const HEX_COLOR = z.string().pattern(/^#[0-9a-fA-F]{6}$/)
const AVATAR_DATA = z.string().pattern(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).max(512 * 1024)
const EMPTY_AVATAR = z.const('')

/* ------------------------------------------------------------------ *
 * 配色
 * ------------------------------------------------------------------ */

/** 灰阶倾向：中性（原版）/ 偏冷 / 偏暖。影响侧栏与面板的色相偏移。 */
export const TONES = ['neutral', 'cool', 'warm']

/** 推理等级进度条色彩方案（与客户端 EFFORT_GRADIENTS 的 id 一致）。
    2026-11-07 精简为 4 套预置（不同维度）+ custom。 */
export const EFFORT_GRADIENT_IDS = [
  'blueramp', 'sunrise', 'ocean', 'indigo', 'custom'
]

/** 自定义渐变色标默认值（4 段：0% / 34% / 67% / 100%）。 */
export const DEFAULT_EFFORT_CUSTOM = ['#4A6FD4', '#7C5FD0', '#A85BC4', '#D1569E']

/* ------------------------------------------------------------------ *
 * 字段定义
 *   每个字段都必须有 default —— 用户从未打开过设置页时也要有值。
 * ------------------------------------------------------------------ */

export const BuxuSettingsFields = {
  /**
   * 总开关：关闭后客户端彻底卸载主题（移除注入的 CSS、头像节点、
   * 深浅覆盖与所有根属性），界面回到 DSH 官方原生皮肤。
   * 默认开启；即时生效，不需要重启。
   */
  enabled: z.boolean().default(true),

  /**
   * 配色方案 id（PALETTES 的 key）。
   * **2026-11-05 补上**：此前设置页一直在写 `palette`，但 schema 里没声明，
   * Host 的 form.set 可能拒收 → 切配色不持久化。色板自带 scheme，
   * 选中哪套就决定深浅，取代原 colorMode 字段。
   */
  /** 默认「质肤·石墨」= slate2（深色·原生布局）。
      2026-11-09：2 系列已剥离，1 系列显示名去掉数字后缀（存档见 _archive/series2）；
      id 保持不变，已持久化的用户选择不会失效。 */
  palette: z.union(PALETTE_IDS).default('slate2'),

  /** 强调色（发送键、页签激活下划线、链接等品牌语义元素）。 */
  accent: HEX_COLOR.default('#F56619'),

  /** 灰阶倾向。 */
  tone: z.union(TONES).default('neutral'),

  /* ------------------------------------------------------------------ *
   * 【已停用的几何字段 · 2026-11-09】
   * 下面 5 个字段（panelRadius / panelGutter / topStrip / toolbarHeight /
   * bubbleRadius）原本驱动「2 系列精修布局」的 CSS 改写。该布局层已整体
   * 剥离（存档见 _archive/series2/），官方也没有任何几何量是第三方可覆盖
   * 契约（practices.md:34/35、ui-theme README.zh L137-138），故设置页不再
   * 显示这 5 个滑块。
   * **字段保留不删**：老用户配置文档里可能已有这些值，schema 继续接受可避免
   * 启动时解析失败 / 值被冲掉；它们只是不再被客户端消费。
   * ------------------------------------------------------------------ */

  /** @deprecated 2026-11-09 布局层已剥离，设置页已移除，保留仅为兼容旧配置。 */
  panelRadius: z.number().min(0).max(16).step(1).default(6),

  /** @deprecated 2026-11-09 同上。 */
  panelGutter: z.number().min(0).max(12).step(1).default(6),

  /** @deprecated 2026-11-09 同上。 */
  topStrip: z.number().min(0).max(12).step(1).default(6),

  /** @deprecated 2026-11-09 同上。 */
  toolbarHeight: z.number().min(36).max(64).step(1).default(48),

  /** 侧栏推荐宽度 px（官方范围 264–420）。契约：ctx.layout.panels.setSidebar。 */
  sidebarWidth: z.number().min(264).max(420).step(1).default(268),

  /** 侧栏行高 px（仅作用于本插件的侧栏导航行密度，非官方契约）。 */
  sidebarRowHeight: z.number().min(24).max(40).step(1).default(30),

  /** @deprecated 2026-11-09 布局层已剥离，设置页已移除，保留仅为兼容旧配置。 */
  bubbleRadius: z.number().min(0).max(24).step(1).default(14),

  /** 内容列最大宽度 px（超出则不再跟随窗口）。 */
  contentMaxWidth: z.number().min(680).max(1600).step(10).default(1400),

  /** 内容列是否跟随窗口宽度。关掉则完全交给官方默认（920 上限）。 */
  contentFollowWindow: z.boolean().default(true),

  /** 是否渲染对话头像。 */
  avatarsEnabled: z.boolean().default(true),

  /** 头像尺寸 px。 */
  avatarSize: z.number().min(18).max(40).step(1).default(26),

  /**
   * 头像圆角比例（0 = 方形，50 = 正圆）。
   * 用百分比而不是 px：头像尺寸是可调的，百分比能自动跟随，
   * 且 50% 天然等于正圆（不用除以 2）。
   * 默认 12 —— 26px 头像约 3px 圆角，能明显看出收角、消掉生硬直角，
   * 又不会切到内置鲸鱼图的鱼鳍和尾巴（用户反馈 2% 只有 0.5px，等于没圆角）。
   */
  avatarRadius: z.number().min(0).max(50).step(1).default(12),

  /** 助手头像自定义图（data URL）；空字符串表示用内置鲸鱼图。 */
  assistantAvatar: z.union([EMPTY_AVATAR, AVATAR_DATA]).default(''),

  /** 用户头像自定义图（data URL）；空字符串表示用内置狗狗图。 */
  userAvatar: z.union([EMPTY_AVATAR, AVATAR_DATA]).default(''),
  /** 「最近使用」头像历史（2026-11-13）：各自最多 3 张，只记用户上传过的自定义图。
      存 JSON 字符串数组（与 sessionMarks 同款写法：schemastery 对 string 的
      max/default 已实测可用，数组类型的校验行为未实测）。点缩略图即换，
      「恢复默认」不写入历史（用户确认只存上传过的自定义图）。
      每项仍是完整 data URL，受 persistSettings/configForms 持久化，跨重启保留。 */
  assistantAvatarHistory: z.string().max(512 * 3 * 1024).default('[]'),
  userAvatarHistory: z.string().max(512 * 3 * 1024).default('[]'),

  /**
   * 推理等级进度条色彩方案。默认「单色蓝阶」（用户 2026-11-07 指定）。
   * custom 表示使用下方 effortCustomColors 的 4 个色值。
   */
  effortGradient: z.union(EFFORT_GRADIENT_IDS).default('blueramp'),

  /** 自定义渐变：4 个 #RRGGBB 色标（0% / 34% / 67% / 100%）。 */
  effortCustomColors: z.array(HEX_COLOR).min(4).max(4).default(DEFAULT_EFFORT_CUSTOM),

  /** 气泡粒子效果独立开关：任意配色都可叠加，默认关（静态零开销）。 */
  effortParticles: z.boolean().default(false),

  /** 契约探针：官方 DOM 结构变化时是否自动降级为「仅配色」。 */
  contractGuard: z.boolean().default(true),

  /** 会话手动标记（2026-11-12）：存 JSON 字符串
      {"<sessionId>":"todo|important|both"}，空对象表示无标记。
      用字符串而非 z.record：项目既有写法验证过，schemastery 对 record 的支持未实测。
      走 configForms 持久化，跨重启保留。 */
  sessionMarks: z.string().max(64 * 1024).default('{}')
}

/** 对外暴露的 Config：与字段表一致，供 DSH 设置体系读取。 */
export const Config = z.object(BuxuSettingsFields).volatile()

/** Stable cordis plugin name (matches the id in cordis.patch.yml). */
export const name = 'ui-theme-buxu'

/** 需要 settings 服务才能持久化配置；拿不到时主题仍可运行（用默认值）。 */
export const inject = []

/**
 * Mount the host half.
 *
 * 只做一件事：把上面的 Config 注册进 DSH 的设置体系。
 * `auto: false` 表示不自动创建配置节点，沿用官方 chat 插件的写法。
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx - host context.
 */
export function apply(ctx) {
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })
}
