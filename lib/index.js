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
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

/** Host 配置入口 ID：必须与 cordis.patch.yml 的 id 一致，不是 npm 包名。 */
export const BUXU_SETTINGS_NAMESPACE = 'ui-theme-buxu'
/** 当前上架的配色 id。
    2026-11-09：2 系列石墨2/云白2 已剥离（完整定义存于维护者本地归档）。
    2026-11-17：新增 3 系列四套单色相配色（墨玉/藏青/石墨紫/宣纸）。
    原有 slate2 / cloud2 的 id 不变，已持久化的用户选择不失效；
    新增 id 只做向后兼容的追加，不改变既有语义。 */
export const PALETTE_IDS = [
  'slate2', 'cloud2',
  'inkjade', 'cangqing', 'shimozi', 'ricepaper'
]
const HEX_COLOR = z.string().pattern(/^#[0-9a-fA-F]{6}$/)
/** 自定义渐变色标：实色 #RRGGBB，或空串 = 「无/透明」（用相邻色补齐，渐变不断层）。
    只给 effortCustomColors 用，不放宽强调色等其它 #RRGGBB 字段。 */
const GRADIENT_STOP = z.union([z.const(''), HEX_COLOR])
const AVATAR_DATA = z.string().pattern(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).max(512 * 1024)
const EMPTY_AVATAR = z.const('')

/* ------------------------------------------------------------------ *
 * 配色
 * ------------------------------------------------------------------ */

/** 灰阶倾向：中性（原版）/ 偏冷 / 偏暖。影响侧栏与面板的色相偏移。 */
export const TONES = ['neutral', 'cool', 'warm']

/** 推理等级进度条色彩方案（与客户端 EFFORT_GRADIENTS 的 id 一致）。
    2026-11-07 精简为 4 套预置 + custom；
    2026-11-16 扩到 6 套预置（新增 graphite 石墨灰 / coral 珊瑚朱）+ custom。
    user:* 形如 user:1699999999999 的 id 由 effortUserPresets 动态提供，
    这里不枚举（schema 用字符串前缀校验代替）。 */
export const EFFORT_GRADIENT_IDS = [
  'blueramp', 'sunrise', 'ocean', 'indigo', 'graphite', 'coral', 'custom'
]

/** 用户自存预设的上限（含名称与 4 色）。 */
export const EFFORT_USER_PRESETS_MAX = 6

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
      2026-11-09：2 系列已剥离，1 系列显示名去掉数字后缀；
      id 保持不变，已持久化的用户选择不会失效。 */
  palette: z.union(PALETTE_IDS).default('slate2'),

  /** 强调色（发送键、页签激活下划线、链接等品牌语义元素）。
      2026-11-18：改为**跟随配色方案**。每套 palette 自带一个 accent，
      用户未手动改过时就使用配色自带值，改过则永久尊重用户选择
      （由下面的 accentUserSet 标记）。默认值仍保留橙，仅在
      「配色没有自带 accent」的兜底路径里使用。 */
  accent: HEX_COLOR.default('#F56619'),

  /** 用户是否手动改过强调色（2026-11-18）。
      false = 跟随当前配色方案自带的 accent；
      true  = 永久使用用户自己设的 accent，切换配色不再覆盖。 */
  accentUserSet: z.boolean().default(false),

  /** 灰阶倾向。 */
  tone: z.union(TONES).default('neutral'),

  /* ------------------------------------------------------------------ *
   * 【已停用的几何字段 · 2026-11-09】
   * 下面 5 个字段（panelRadius / panelGutter / topStrip / toolbarHeight /
   * bubbleRadius）原本驱动「2 系列精修布局」的 CSS 改写。该布局层已整体
   * 剥离（仅存于维护者本地归档），官方也没有任何几何量是第三方可覆盖
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
   * 2026-11-16：新增 user:<id> 形式，指向 effortUserPresets 里的用户自存预设。
   * 用 pattern 校验而非枚举 user:* 的具体 id（id 在运行时才生成）。
   */
  effortGradient: z.union([
    ...EFFORT_GRADIENT_IDS,
    z.string().pattern(/^user:\d{1,16}$/)
  ]).default('blueramp'),

  /** 用户是否手动选过推理条（2026-11-18）。
      false = 跟随当前配色方案自带的 effort 推荐值；
      true  = 永久使用用户自己选的方案，切换配色不再覆盖。 */
  effortUserSet: z.boolean().default(false),

  /** 自定义渐变：4 个 #RRGGBB 色标（0% / 34% / 67% / 100%）。 */
  effortCustomColors: z.array(GRADIENT_STOP).min(4).max(4).default(DEFAULT_EFFORT_CUSTOM),

  /** 用户自存的推理强度条预设（2026-11-16）。
      存 JSON 字符串：[{"id":"user:1699999999999","name":"我的蓝","colors":["#...","#...","#...","#..."]}]
      最多 EFFORT_USER_PRESETS_MAX 个。与 sessionMarks / 头像历史同款写法
      （schemastery 对 string 的 max/default 已实测可用）。
      解析失败时客户端回落空数组，不影响内置预设。 */
  effortUserPresets: z.string().max(8 * 1024).default('[]'),

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
/* ---- 一键冷启动 detached helper（2026-11-14）----
 * 用户要求「点一下按键就重新冷启动，不用桌面 bat」。链路：
 * Client 按钮 → ctx.remote.commands.execute('/buxu-restart-dry'|'/buxu-restart')
 * → Host handler spawn detached node -e <内联脚本>（detached + stdio:ignore + unref）
 * → helper 等旧 DSH 退出 → 清 cookie → 起新 exe → 30 秒超时回滚。
 *
 * 2026-11-14 真因修复：Windows DETACHED_PROCESS 下 pwsh.exe / powershell.exe
 * 起不来（实测 marker 全 MISSING），但 node.exe -e 多行脚本 + env + 写日志
 * 完全可行（_tmp_diag_node_detached.cjs）。故 helper 用 Node 实现、仍内联在
 * index.js（零外部文件、随 npm 包发布），DryRun 用 BUXU_RESTART_DRY 环境变量传。
 * 官方先例 dsh-host-open-in-app launchDetachedApp 注释 outlives dsh。 */
const BUXU_RESTART_DRY_COMMAND = 'buxu-restart-dry'
const BUXU_RESTART_COMMAND = 'buxu-restart'

/* 内联 Node helper（逐行拼接，避免模板字符串转义）。
   **2026-11-16 上架修复**：原先三条路径全是硬编码的
     LOG     = 'E:\\DSH\\_restart-helper.log'
     EXE     = 'E:\\DeepSeek Harness\\DeepSeek Harness.exe'
     CLEANER = 'C:\\Users\\Administrator\\wb-tools\\clean_dsh_auth_cookies.ps1'
   这只在本机成立。别人装到别的盘、没有 wb-tools、甚至不是桌面版时，
   点重启会「杀掉 DSH 却起不来」——比不提供该功能更糟。
   现在改为由 scheduleRestart 在运行时解析并注入环境变量：
     BUXU_EXE    新 DSH 可执行文件（必需，解析不到就不提供重启）
     BUXU_LOG    日志路径（默认系统临时目录）
     BUXU_CLEANER 清 cookie 脚本（可选，不存在则跳过清理而不是中止）
   并新增 BUXU_RESULT：把结果写成一行 JSON，供 Host 半在下次启动时
   或调用方读取，避免只能翻日志。 */
const RESTART_HELPER_SCRIPT = [
  'const fs = require(\'fs\')',
  'const cp = require(\'child_process\')',
  'const LOG = process.env.BUXU_LOG',
  'const EXE = process.env.BUXU_EXE',
  'const CLEANER = process.env.BUXU_CLEANER || \'\'',
  'const RESULT = process.env.BUXU_RESULT || \'\'',
  'const DRY = process.env.BUXU_RESTART_DRY === \'1\'',
  'function log(m) { try { fs.appendFileSync(LOG, new Date().toISOString() + \' \' + m + \'\\n\') } catch (e) {} }',
  'function finish(code, reason) {',
  '  try { if (RESULT) fs.writeFileSync(RESULT, JSON.stringify({ at: new Date().toISOString(), code, reason, dry: DRY }) + \'\\n\') } catch (e) {}',
  '  process.exit(code)',
  '}',
  'if (!LOG) { process.exit(1) }',
  '/* 2026-11-16：演练模式不中止，而是把「解析不到 EXE」当成演练结果报出来 ——',
  '   演练的意义正是提前发现这种问题。真实重启才必须硬性失败，',
  '   否则会重演「杀掉旧的却起不来」。 */',
  'if (!EXE) {',
  '  log(\'ERROR: BUXU_EXE not provided; ABORT\')',
  '  finish(1, DRY ? \'dry-no-exe\' : \'no-exe\')',
  '}',
  'function dshCount() {',
  '  try { const r = cp.execFileSync(\'tasklist\', [\'/FI\', \'IMAGENAME eq DeepSeek Harness.exe\', \'/NH\'], { encoding: \'utf8\', windowsHide: true })',
  '    return (r.match(/DeepSeek Harness\\.exe/gi) || []).length',
  '  } catch (e) { return 0 }',
  '}',
  'function parentInfo() {',
  '  try {',
  '    const r = cp.execFileSync(\'tasklist\', [\'/NH\', \'/FO\', \'CSV\'], { encoding: \'utf8\', windowsHide: true })',
  '    const line = r.split(/\\r?\\n/).find(x => x.includes(\'"\' + process.ppid + \'"\')) || \'\'',
  '    const name = (line.match(/^"([^"]+)"/) || [\'?\', \'?\'])[1]',
  '    log(\'  parent-pid=\' + process.ppid + \' parent-name=\' + name)',
  '  } catch (e) { log(\'  parent-pid=\' + process.ppid + \' parent-lookup-failed\') }',
  '}',
  'log(\'===== HELPER START (DryRun=\' + DRY + \' pid=\' + process.pid + \') =====\')',
  'parentInfo()',
  'if (DRY) {',
  '  for (let i = 1; i <= 4; i++) {',
  '    const start = Date.now()',
  '    while (Date.now() - start < 2000) {}',
  '    log(\'  [dry \' + i + \'] t=\' + (i * 2) + \'s DSH procs=\' + dshCount() + \' STILL-ALIVE\')',
  '  }',
  '  log(\'===== DRY FINISHED (no kill / no clean / no launch) =====\')',
  '  finish(0, \'dry-ok\')',
  '}',
  '/* 1) 直接按 PID 强杀旧 DSH（2026-11-15 提速：去掉 20 秒空等）。',
  '     真机实测：旧代码「等自己退出」白白耗了 26 秒，而 helper 是',
  '     detached、独立于 DSH，根本不必等；taskkill 后 0.3 秒即归零。',
  '     保留杀完的归零确认作为安全兜底。 */',
  'log(\'STEP 1/4: closing DSH (kill by PID, no /T)\')',
  'if (dshCount() > 0) {',
  '  /* 2026-11-15 真机事故修复：taskkill /T 会沿进程树向上杀到 helper 自己',
  '     （helper 的父进程正是 DSH Host 半），导致 helper 在强杀瞬间死亡、',
  '     后面「清 cookie → 起新 exe」全不执行、DSH 关掉却不自动重启。',
  '     改为只按映像名列出 PID、逐个 /F /PID 精确杀，不用 /T；helper 是',
  '     node.exe，映像名不匹配，不会被列进去。 */',
  '  try {',
  '    const r = cp.execFileSync(\'tasklist\', [\'/FI\', \'IMAGENAME eq DeepSeek Harness.exe\', \'/NH\', \'/FO\', \'CSV\'], { encoding: \'utf8\', windowsHide: true })',
  '    const pids = r.split(/\\r?\\n/).map(l => { const m = l.match(/^"[^"]*","(\\d+)"/); return m ? m[1] : null }).filter(Boolean)',
  '    for (const pid of pids) { try { cp.execFileSync(\'taskkill\', [\'/F\', \'/PID\', pid], { windowsHide: true }) } catch (e) {} }',
  '    log(\'  killed pids: \' + pids.join(\',\'))',
  '  } catch (e) { log(\'  kill-by-pid failed: \' + e.message) }',
  '  waited = 0',
  '  while (dshCount() > 0 && waited < 15000) { const t0 = Date.now(); while (Date.now() - t0 < 400) {} waited += 400 }',
  '  if (dshCount() > 0) { log(\'ERROR: could not stop DSH; ABORT (do not clean, do not launch)\'); process.exit(1) }',
  '}',
  'log(\'OK: old DSH fully stopped (procs=0)\')',
  '/* 2) 清 cookie（DSH 已停，cleaner 进程守卫才通过）',
  '     2026-11-16 上架修复：cleaner 是可选的用户自备脚本。',
  '     找不到时**跳过而不是中止** —— 纯 DSH Web 版本来就没有这个脚本，',
  '     不能因此让重启整个失败。 */',
  'log(\'STEP 2/4: cleaning auth cookies\')',
  'if (!CLEANER || !fs.existsSync(CLEANER)) {',
  '  log(\'SKIP: cleaner not configured or missing (\' + (CLEANER || \'(none)\') + \')\')',
  '} else {',
  '  let cleanExit = 1',
  '  try { const r = cp.spawnSync(\'powershell.exe\', [\'-NoProfile\', \'-ExecutionPolicy\', \'Bypass\', \'-File\', CLEANER], { encoding: \'utf8\', windowsHide: true }); cleanExit = r.status === null ? 1 : r.status } catch (e) { cleanExit = 1 }',
  '  log(\'cleaner exit=\' + cleanExit)',
  '  if (cleanExit !== 0) log(\'WARN: cleanup failed (exit=\' + cleanExit + \'); continuing to launch anyway\')',
  '}',
  '/* 3) 起新 DSH */',
  'log(\'STEP 3/4: launching new DSH\')',
  'if (!fs.existsSync(EXE)) { log(\'ERROR: exe missing: \' + EXE + \'; ABORT\'); finish(1, \'exe-missing\') }',
  'const env = Object.assign({}, process.env)',
  'delete env.ELECTRON_RUN_AS_NODE',
  'delete env.NODE_OPTIONS',
  '/* DSH_HOME 沿用原值；只有缺失时才回落到 ~/.dsh（不要覆盖用户自定义 home）。 */',
  'if (!env.DSH_HOME) env.DSH_HOME = require(\'path\').join(process.env.USERPROFILE || \'\', \'.dsh\')',
  'function launch() { return cp.spawn(EXE, [], { detached: true, stdio: \'ignore\', windowsHide: false, env }) }',
  'try { const c = launch(); c.unref(); log(\'launch requested\') } catch (e) { log(\'ERROR: launch failed: \' + e.message) }',
  '/* 4) 确认新实例起来（实测 0.3 秒即可，2026-11-15 提速：8 秒窗口足够），',
  '     没起来再起一次并留 20 秒兜底。只影响日志，不阻塞用户看到新窗口。 */',
  'log(\'STEP 4/4: confirming new DSH\')',
  'let up = false',
  'let w3 = 0',
  'while (w3 < 8000) { if (dshCount() > 0) { up = true; break } const t0 = Date.now(); while (Date.now() - t0 < 250) {} w3 += 250 }',
  'if (!up) {',
  '  log(\'WARN: no DSH 30s after launch; retry Start-Process once\')',
  '  try { const c = launch(); c.unref() } catch (e) {}',
  '  let w4 = 0',
  '  while (w4 < 20000) { if (dshCount() > 0) { up = true; break } const t0 = Date.now(); while (Date.now() - t0 < 500) {} w4 += 500 }',
  '}',
  'if (up) log(\'OK: new DSH is up (procs=\' + dshCount() + \')\')',
  'else log(\'ERROR: new DSH did not come up after retry\')',
  'log(\'===== HELPER END =====\')',
  'finish(up ? 0 : 1, up ? \'ok\' : \'not-up\')'
].join('\n')

/**
 * 解析「新 DSH 该用哪个可执行文件启动」。
 * **2026-11-16 上架修复**：原先 helper 里写死
 *   E:\\DeepSeek Harness\\DeepSeek Harness.exe
 * 换台机器、换安装盘、或用 Web 版就必然失败 —— 而且是「杀掉旧的却起不来」
 * 这种最糟的失败方式。这里改为运行时推导，顺序：
 *   1. 显式环境变量 BUXU_DSH_EXE（给特殊安装留口子）
 *   2. 桌面版：process.execPath 若文件名含 "DeepSeek Harness"
 *      （Host 半就是该 exe 的子进程，最可靠）
 *   3. 从 process.execPath 所在目录找同名 .exe
 * 全部落空返回 null —— 调用方据此**不提供**重启能力，而不是提供个必坏的功能。
 */
function resolveDshExecutable() {
  const explicit = process.env.BUXU_DSH_EXE
  if (explicit) {
    try { if (fs.existsSync(explicit)) return explicit } catch (e) {}
  }
  const self = process.execPath
  if (self && /DeepSeek Harness\.exe$/i.test(self)) {
    try { if (fs.existsSync(self)) return self } catch (e) {}
  }
  /* 有些打包方式下 execPath 指向 resources 内的 stub，尝试同级目录。 */
  if (self) {
    const dir = path.dirname(self)
    for (const name of ['DeepSeek Harness.exe', 'DeepSeekHarness.exe']) {
      const candidate = path.join(dir, name)
      try { if (fs.existsSync(candidate)) return candidate } catch (e) {}
    }
  }
  return null
}

/** helper 日志路径：系统临时目录，不写死在某个盘。 */
function restartLogPath() {
  return path.join(os.tmpdir(), 'dsh-theme-buxu-restart.log')
}

/** helper 结果文件：供调用方/下次启动判断上次重启是否成功。 */
function restartResultPath() {
  return path.join(os.tmpdir(), 'dsh-theme-buxu-restart.json')
}

/**
 * 可选的 cookie 清理脚本。
 * 桌面版 DSH 每次启动监听新随机端口，认证 cookie 名随之变化、30 天累积，
 * 约 70 条后 welcome 认证会失败（本机 2026-11-05 事故）。清理脚本属于
 * **用户自备**：设了 BUXU_CLEANER 或放在约定位置才用，找不到就跳过，
 * 绝不让整个重启失败。
 */
function resolveCleanerScript() {
  const explicit = process.env.BUXU_CLEANER
  if (explicit) {
    try { if (fs.existsSync(explicit)) return explicit } catch (e) {}
  }
  return ''
}

/**
 * 解析可当 Node 用的可执行文件。
 * 2026-11-14 真机根因：DSH 的 Host 半是 Electron exe 以
 * ELECTRON_RUN_AS_NODE=1 启动的子进程（main.js:11555,11787），
 * process.execPath = "DeepSeek Harness.exe"。若 delete 掉该环境变量，
 * spawn(process.execPath,['-e',...]) 会被当纯 GUI 应用启动、-e 被忽略，
 * 于是「状态行显示已排程」但 helper 什么都没干、日志不生成。
 * 解析顺序：process.execPath 本身是 node.exe → DSH_HOME 下捆绑 node.exe →
 * DSH_NODE_EXECUTABLE 仅当文件名是 node.exe → 回退 Electron exe（保留
 * ELECTRON_RUN_AS_NODE=1）。只认真正的 node.exe，避免 Electron exe 被误用。
 */
/* 2026-11-14 真机报错「require is not defined」修复：lib/index.js 是
   ESM（package.json type: module），函数内不能 require('node:path')。
   path / fs 已在文件顶部用 import 引入（工具会话验证脚本用
   new Function 注入了 require 才没暴露这个错误）。 */
function resolveNodeExecutable() {
  const home = process.env.DSH_HOME || path.join(process.env.USERPROFILE || '', '.dsh')
  /* 只认「真正的 node.exe」。DSH_NODE_EXECUTABLE / process.execPath 在
     desktop 上都是 "DeepSeek Harness.exe"（需 ELECTRON_RUN_AS_NODE=1 才当
     Node 用），若把它当普通 node 且删掉环境变量，-e 会被忽略、静默不执行。 */
  const candidates = [
    /node\.exe$/i.test(process.execPath) ? process.execPath : null,
    path.join(home, 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies', 'node', 'bin', 'node.exe'),
    process.env.DSH_NODE_EXECUTABLE && /node\.exe$/i.test(process.env.DSH_NODE_EXECUTABLE)
      ? process.env.DSH_NODE_EXECUTABLE : null
  ].filter(Boolean)
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return { exe: c, isElectron: false } } catch (e) {}
  }
  /* 兜底：Electron exe + 保留 ELECTRON_RUN_AS_NODE=1（对 GUI 应用无效，
     但至少 -e 在 Node 模式下有机会执行）。 */
  return { exe: process.env.DSH_NODE_EXECUTABLE || process.execPath, isElectron: true }
}

/** spawn 一个 detached node -e helper；返回是否已排程。 */
function scheduleRestart(dryRun) {
  try {
    /* **2026-11-16 上架必需**：解析不到「新 DSH 该启动哪个 exe」时，
       宁可明确报错也不要排出一次「杀掉却起不来」的重启。
       演练（dryRun）不需要真启动，故不阻断。 */
    const dshExe = resolveDshExecutable()
    if (!dshExe && !dryRun) {
      return { ok: false, error: '找不到 DSH 可执行文件；可设置环境变量 BUXU_DSH_EXE 指向它后重试' }
    }
    const { exe, isElectron } = resolveNodeExecutable()
    const env = Object.assign({}, process.env)
    /* 回退到 Electron exe 时必须保留 ELECTRON_RUN_AS_NODE=1，否则 -e 不执行；
       对真正的 node.exe 该变量会被忽略，无害。 */
    if (isElectron) env.ELECTRON_RUN_AS_NODE = '1'
    else delete env.ELECTRON_RUN_AS_NODE
    delete env.NODE_OPTIONS
    env.BUXU_RESTART_DRY = dryRun ? '1' : '0'
    /* 运行时注入三条路径，取代原先写死在 helper 里的本机绝对路径。 */
    env.BUXU_LOG = restartLogPath()
    env.BUXU_RESULT = restartResultPath()
    env.BUXU_EXE = dshExe || ''
    env.BUXU_CLEANER = resolveCleanerScript()
    const child = spawn(exe, ['-e', RESTART_HELPER_SCRIPT], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env
    })
    child.unref()
    return { ok: true, pid: child.pid }
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : String(error) }
  }
}
/** 命令 handler：返回 strict result schema 允许的 {kind,text}。 */
function handleBuxuRestart(dryRun) {
  /* 演练模式即使解析不到 EXE 也要排程（让用户从结果文件看到具体原因），
     真实重启则必须先确认能解析到 EXE，否则会「杀掉却起不来」。 */
  const dshExe = resolveDshExecutable()
  const result = scheduleRestart(dryRun)
  if (!result.ok) return { kind: 'error', text: '重启排程失败：' + result.error }
  if (dryRun) {
    return dshExe
      ? { kind: 'success', text: '演练已排程：日志 ' + restartLogPath() }
      : { kind: 'error', text: '演练发现无法定位 DSH 可执行文件；真实重启会被拒绝。可设置 BUXU_DSH_EXE，日志见 ' + restartLogPath() }
  }
  return { kind: 'success', text: '冷重启已排程：稍后 DSH 会自动关闭并重新启动' }
}

const BUXU_REWIND_COMMAND = 'buxu-rewind'
/**
 * 2026-11-15 会话损坏事故修复：官方 dsh-session 的
 * assertMessageEventShape 对 user/message 要求 data 本身是带
 * id（非空字符串）、role==='user'、source.kind、content 数组的 message。
 * 参考插件用 createUserMessage({content, source}) 自动补 id/role；
 * 这里为了零外部依赖手写，必须自己补，且每次回退用新的随机 id，
 * 避免多条回退标记共用同一 message id。
 */
function rewindMarker() {
  return Object.freeze({
    id: randomUUID(),
    role: 'user',
    content: [{ type: 'text', text: '(empty message)' }],
    source: { kind: 'buxu-rewind' }
  })
}

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
    session.append('user/message', rewindMarker(), {
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
export const BUXU_RESTART_HELPERS = Object.freeze({ scheduleRestart, handleBuxuRestart })

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
  /* 冷启动命令：演练（-DryRun，安全）+ 真冷启动（会强杀进程）。
     两者都只在用户显式点按钮时触发，绝不自动执行。 */
  ctx.effect(function* () {
    try {
      yield ctx.commands.register({
        name: BUXU_RESTART_DRY_COMMAND,
        description: '冷重启演练（只写日志，验证 detached helper 存活）',
        handler: () => handleBuxuRestart(true)
      })
      yield ctx.commands.register({
        name: BUXU_RESTART_COMMAND,
        description: '冷重启 DSH（关闭并重新启动应用，清理认证 cookie）',
        handler: () => handleBuxuRestart(false)
      })
    } catch (error) {
      /* 静默降级 */
    }
  }, 'dsh-theme-buxu: restart command')
}
