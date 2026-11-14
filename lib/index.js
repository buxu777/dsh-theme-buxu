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

/** 需要 settings 服务才能持久化配置；拿不到时主题仍可运行（用默认值）。
    2026-11-14 加 commands：注册 /buxu-rewind 回退命令（Host 半）。
    session 通过命令 invocation.agent.session 注入，无需额外声明。 */
export const inject = ['commands']

/** ---------------------------------------------------------------
 * 回退对话（2026-11-14）
 *
 * 机制：与官方 /compact 同源的 surface replacement —— 不删除、不重写
 * 会话日志，只 append 一条 marker 事件把目标用户消息及其后全部内容
 * 从「模型可见 surface」与界面中遮蔽。参考 dsh-rewind-plugin 0.22.1
 * (SiriLee/dsh-rewind) 的 executeRewind，已在本机 asar 核实各契约。
 *
 * 零新增依赖：marker 手写等价对象（不 import @deepseek-ai/dsh-llm 的
 * createUserMessage）；不用文件回滚 / 快照 / RPC 预览。
 * --------------------------------------------------------------- */
const BUXU_REWIND_COMMAND = 'buxu-rewind'
const REWIND_MARKER = Object.freeze({
  content: [{ type: 'text', text: '(empty message)' }],
  source: { kind: 'buxu-rewind' }
})

/** 一条事件是否为「真人用户消息」。 */
function isHumanUserMessage(event) {
  return event && event.type === 'user/message' && event.data &&
    event.data.source && event.data.source.kind === 'user'
}

/** surface 上从后往前找最后一条真人用户消息（回退目标）。 */
function lastRewindCandidate(events, surface) {
  const onSurface = new Set(Array.isArray(surface) ? surface : [])
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]
    if (isHumanUserMessage(event) && onSurface.has(event.seq)) return event
  }
  return null
}

/** 计算 surfaceOp.replace 的边界（照 0.22.1 的 planRewind）。 */
function planRewind(events, surface) {
  const target = lastRewindCandidate(events, surface)
  if (!target) return { error: '没有可回退的用户消息' }
  const index = surface.indexOf(target.seq)
  if (index < 0) return { error: '目标消息已被压缩遮蔽，无法回退' }
  const shadowed = surface.slice(index)
  if (shadowed.length === 0) return { error: '回退目标为空' }
  return {
    targetSeq: target.seq,
    startSeq: shadowed[0],
    endSeq: shadowed[shadowed.length - 1],
    shadowedSeqs: shadowed.slice()
  }
}

/** 等 agent 进入 idle（运行中先 cancel）。用官方 whenIdle()，不轮询 status
 *  （practices.md:28 明确 Do not poll agent/status；照 0.22.1 的 race 超时）。 */
async function waitForIdle(agent, signal) {
  if (agent.status !== 'idle') {
    agent.cancel({ kind: 'user' }, { keepInbox: true })
  }
  if (!signal || typeof agent.whenIdle !== 'function') return agent.status === 'idle'
  let timer
  let onAbort
  try {
    await Promise.race([
      agent.whenIdle(),
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('idle wait timed out')), 15000)
        onAbort = () => reject(new Error('idle wait aborted'))
        signal.addEventListener('abort', onAbort, { once: true })
      })
    ])
    return true
  } catch (error) {
    return false
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    if (onAbort !== undefined) signal.removeEventListener('abort', onAbort)
  }
}

/** 清掉待处理的 steering，避免回退后旧输入复活（照 0.22.1）。 */
function dropPendingSteering(agent) {
  try {
    const inbox = agent.inbox
    if (inbox && Array.isArray(inbox.nextStep) && typeof inbox.remove === 'function') {
      for (const message of [...inbox.nextStep]) inbox.remove(message.id)
    }
  } catch (error) { /* 忽略：清 steering 失败不阻断回退 */ }
}

/** 命令 handler：执行回退，返回 strict result schema 允许的 {kind,text}。 */
async function handleBuxuRewind(invocation) {
  try {
    const agent = invocation && invocation.agent
    const session = agent && agent.session
    if (!session || typeof session.append !== 'function') {
      return { kind: 'error', text: '回退不可用：会话服务未就绪' }
    }
    const idle = await waitForIdle(agent, invocation.signal)
    if (!idle) return { kind: 'error', text: '回退取消：会话仍在运行或已被中断' }
    dropPendingSteering(agent)
    const events = typeof session.snapshotEvents === 'function' ? session.snapshotEvents() : []
    const surface = session.surface && Array.isArray(session.surface.nodes) ? session.surface.nodes : []
    const plan = planRewind(events, surface)
    if (plan.error) return { kind: 'error', text: '回退失败：' + plan.error }
    session.append('user/message', REWIND_MARKER, {
      surfaceOp: { op: 'replace', startSeq: plan.startSeq, endSeq: plan.endSeq },
      sourceEventSeqs: plan.shadowedSeqs
    })
    return { kind: 'success', text: '已回退到上一条用户消息' }
  } catch (error) {
    return { kind: 'error', text: '回退失败：' + (error && error.message ? error.message : String(error)) }
  }
}

export const BUXU_REWIND_HELPERS = Object.freeze({
  isHumanUserMessage, lastRewindCandidate, planRewind, handleBuxuRewind
})

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
  /* 回退命令：generator effect + yield 注册，卸载时自动 dispose。 */
  ctx.effect(function* () {
    try {
      yield ctx.commands.register({
        name: BUXU_REWIND_COMMAND,
        description: '回退对话到上一条用户消息，并把内容放回输入框',
        handler: handleBuxuRewind
      })
    } catch (error) {
      /* commands 服务不可用（旧版宿主）：静默降级，不影响主题其余功能 */
    }
  }, 'dsh-theme-buxu: rewind command')
}
