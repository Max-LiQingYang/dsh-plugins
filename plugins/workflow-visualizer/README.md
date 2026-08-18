# @dsh-plugins/workflow-visualizer

Claude Code 风格的 workflow 运行可视化：参照 Claude Code
[动态工作流](https://code.claude.com/docs/zh-CN/workflows)的观看体验，为 DSH Web GUI
提供两块界面：

- **Workflows 视图标签**（`conversation.view`，与 chat / trajectory 并列）：每个
  workflow 运行一张卡片——状态呼吸灯与状态胶囊、描述、元信息条（代理完成数、
  实时并发、均耗、吞吐、阶段数）、总体进度条；**阶段手风琴**（每阶段 ✓/✗/↻ 计数
  与进度条，点击展开该阶段的代理列表）；**代理明细下钻**（live 待命/运行态、起止
  时钟、耗时、子会话 id，一键「打开子会话」查看该子代理的完整执行过程）；动态版
  还带脚本 `log()` 叙述行。
- **输入框上方实时进度条**（`conversation.input.dock`）：任意运行进行中时出现的一
  行摘要（名称 + 当前阶段 + 进度 + 计数），无运行时自动隐藏。
- **隐藏 DSH 默认的 workflow 聊天卡片**：插件同时以 `priority: -1` 在
  `conversation.chat.node` 的 `workflow-run` key 上注册 null 渲染器，把自带的
  `dsh-client-ui-workflow-run` 面板从会话流里顶掉（keyed slot 同 key 低优先级
  胜出）。官方插件的事件折叠保留——本插件的数据源不受影响。想恢复默认卡片，
  删掉两处源码里 `conversation.chat.node` 的注册即可。

配色全部使用 DSW 主题变量（`--dsw-alias-*`），自动适配明暗主题；文案中英双语
（跟随 locale）。

## 数据来源

DSH 的 workflow 引擎在运行时同时输出两路信号：

| 信号 | 形式 | 内容 |
| --- | --- | --- |
| `tool-workflow/*` | 持久会话事件（写进 session log） | run-start（名称）、agent-start（label/phase）、agent-end（outcome）、run-end（stopReason） |
| `workflow/*` | 进程内 Cordis 事件（内存） | 上述全部 + `phase()` 切换、`log()` 叙述、起止时间戳 |

两种安装形态各吃一路信号，能力略有差异：

| | 安装版（client 模块） | 动态版（cordis 工具集） |
| --- | --- | --- |
| 数据源 | 浏览器端折叠好的 `workflow-run` 聊天节点 | 宿主半聚合 `workflow/*` 事件 + 包私有 RPC |
| 宿主半 | 无（空 `apply`） | 有（事件聚合器） |
| 阶段手风琴（分相计数/进度条/可展开） | ✅ | ✅ |
| 代理明细下钻（状态、子会话 id） | ✅ | ✅（另含 live 待命/运行态、起止时钟、耗时） |
| 一键打开子会话查看子代理完整执行 | ✅ | ✅ |
| 运行耗时 / 均耗 / 吞吐 | ❌（持久事件无时间戳） | ✅ |
| `log()` 叙述行 | ❌ | ✅ |
| 重启后存活 | ✅（随 profile 安装） | ❌（进程内临时） |

## 安装

### 方式 A：动态插件（最快，单会话试用，无需重启）

在任意挂了 cordis 预设的 DSH 会话中，让 agent：

1. 读取 `src/dynamic-host.js` 与 `src/dynamic-client.js`；
2. 分别作为 `cordis_define` 的 `code.host` / `code.client`（`plugin.kind: "new"`，
   idPrefix 如 `wfviz`）；
3. 对返回的 `pluginId/packageId` 调用 `cordis_run` 并授权。

（这组代码在 DSH 0.1.0-rc.7 上完整验证过：v2 为 `wfviz-2/pkg-6`，run-8 成功；
初版为 `wfviz-2/pkg-4`，run-4 成功，并用一个两阶段三代理的演示 workflow 端到端
跑通。）

### 方式 B：客户端模块（正式安装，持久生效）

1. 装进 web profile：

   ```sh
   # 本地路径（开发）
   dsh plugin --profile web add file:/path/to/dsh-plugins/plugins/workflow-visualizer
   # 或发布到 npm 后
   dsh plugin --profile web add @dsh-plugins/workflow-visualizer
   ```

2. 在 `~/.dsh/profiles/web/cordis.patch.yml` 挂一行：

   ```yaml
   - id: workflow-visualizer
     name: '@dsh-plugins/workflow-visualizer'
   ```

3. 重启 `dsh web`。

> 注意：两种形态使用相同的 slot id（`workflows` / `workflow-live`），同一会话里不要
> 同时启用，否则后注册者会顶掉前者。

## 要求

- DSH ≥ 0.1.0-rc.7（workflow 引擎与 `conversation.view` 视图标签机制就绪）
- 动态版需要会话挂载 cordis 预设（动态 Cordis 工具集）
- 浏览器端组件要求安装版的 `workflow` 工具在模型工具目录中可用（`dsh-base` +
  `cordis`/`code` 预设默认满足）

## License

MIT
