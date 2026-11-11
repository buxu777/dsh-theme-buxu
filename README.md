# dsh-theme-buxu · 不虚 · 质肤

DeepSeek Harness 的主题与界面个性化插件。它不是独立网页，而是通过 DSH 插件运行时提供配色、局部几何、头像和推理等级滑块。

## 功能

- **两套色板**：质肤·石墨（深色）、质肤·云白（浅色）；深浅由色板决定，不跟随系统。布局保持 DSH 官方原生形态，插件只注入配色 token 与少量功能层样式。
- **历史配色**：石墨2 / 云白2（精修布局版）已暂时下架，完整定义与布局层 CSS 存于开发工作区的 `_archive/series2/`，需要时可按 `RESTORE.md` 加回。
- **主题设置**：总开关、强调色、灰阶、面板几何、侧栏尺寸、内容列宽度和对话头像均在独立设置页管理。
- **换肤入口**：会话头部「当前配色」按钮打开自适应网格弹窗；支持键盘关闭、焦点归还和窄屏布局。
- **侧栏**：拖拽宽度通过 Host 设置持久化，设置变化会同步到官方布局服务。
- **头像**：助手正文和用户气泡使用真实 DOM 节点；上传 PNG/JPEG/WebP，限制 8 MB 和 1600 万像素，压缩为 128×128 PNG 后保存。只有 Host 接受后才替换预览。
- **推理等级**：从当前会话模型目录读取真实档位，提交等待官方服务结果；支持方向键、Home/End、取消和失败回退。
- **兼容性**：配色通过官方 token 覆盖实现，不改写官方布局；关键 DOM 契约探针保留作为升级后功能自检，在高级设置中显示状态。

## 配置与持久化

Host 配置入口为 `ui-theme-buxu`，与 `cordis.patch.yml` 一致；npm 包名为 `dsh-theme-buxu`，两者不能混用。

客户端通过 `ctx.configForms.get('ui-theme-buxu')` 读取快照和写入。设置采用乐观预览、最新操作代次裁决、Host 接受校验和失败回读；多字段恢复默认使用单次 `mutate`。配置不可用或只读时，界面明确显示「临时预览」，不承诺重启后保留。

配色备份仅用于缺失/非法快照的恢复，不覆盖 Host 的明确合法值。自定义头像以 Host 配置为准，旧 localStorage 只作迁移/兼容回退。

## 安装与卸载

在开发工作区安装本地包：

```sh
dsh plugin --profile desktop add E:/DSH/dsh-theme-buxu
```

卸载：

```sh
dsh plugin --profile desktop remove dsh-theme-buxu
```

修改客户端代码后可在现有窗口按 F5 重新加载；修改插件注入声明、包元数据或 Host 入口后，需要按 DSH 流程重启。不要启动替代 Web 服务器来验证桌面插件。

## 扩展

`lib/client.js` 的 `PALETTES` 注册表管理色板；几何默认值由 `GEO` 管理。`lib/index.js` 声明 Host 配置 schema，客户端和服务端的字段、默认值及 Host 入口必须保持一致。

配置 schema 使用 Host 提供的 Schemastery 原生约束：palette union、颜色 pattern、头像 data URL 类型/长度限制、四段渐变的数组长度限制。实际运行时仍需由客户端解码并校验图片。

## 生命周期与安全边界

插件只清理自己创建的样式、头像和滑块节点，登记并恢复被改写的行内属性，停止观察器、定时器和动画帧，归还官方深浅属性方法。槽位注册和重试均有卸载清理。

上传限制包括 MIME/扩展名、文件大小、像素数和 canvas 重编码；Host 保存失败会显示错误并保留旧预览。Base64 内容不是独立的魔法字节校验器，不能把它当作完整上传安全方案。

## 验证

工作区中的 `_qa_*.cjs` 使用隔离 DOM/React/Host 桩，覆盖配色、配置快照、保存拒绝、侧栏、头像、推理控件、任务进度和卸载。运行：

```sh
node --check E:/DSH/dsh-theme-buxu/lib/client.js
node --check E:/DSH/dsh-theme-buxu/lib/index.js
node E:/DSH/_qa_all.cjs
```

真实桌面验证使用现有 DSH 窗口的 F5 和截图；测试桩不会替代真实 Host 持久化、上传和模型服务。发布前必须核对源码与安装目录哈希，并单独完成 `npm pack --dry-run`。本修复过程不自动发布。

## 许可

MIT
