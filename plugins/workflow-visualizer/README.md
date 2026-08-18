# @dsh-plugins/workflow-visualizer

Claude Code 风格的 workflow 运行可视化：参照 Claude Code
[动态工作流](https://code.claude.com/docs/zh-CN/workflows)的观看体验，为 DSH Web GUI
提供两块界面：

- **Workflows 视图标签**（`conversation.view`，与 chat / trajectory 并列）：每个
  workflow 运行一张卡片——状态呼吸灯、总体与分阶段进度条、代理计数，可展开每个
  代理的明细列表；动态版还带耗时与脚本 `log()` 叙述行。
- **输入框上方实时进度条**（`conversation.input.dock`）：任意运行进行中时出现的一
  行摘要（名称 + 进度 + 计数），无运行时自动隐藏。

配色全部使用 DSW 主题变量（`--dsw-alias-*`），自动适配明暗主题。

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
| 阶段进度 / 代理明细 | ✅ | ✅ |
| 运行与代理耗时 | ❌（持久事件无时间戳） | ✅ |
| `log()` 叙述行 | ❌ | ✅ |
| 重启后存活 | ✅（随 profile 安装） | ❌（进程内临时） |

## 安装

### 方式 A：动态插件（最快，单会话试用，无需重启）

在任意挂了 cordis 预设的 DSH 会话中，让 agent：

1. 读取 `src/dynamic-host.js` 与 `src/dynamic-client.js`；
2. 分别作为 `cordis_define` 的 `code.host` / `code.client`（`plugin.kind: "new"`，
   idPrefix 如 `wfviz`）；
3. 对返回的 `pluginId/packageId` 调用 `cordis_run` 并授权。

（这组代码在 DSH 0.1.0-rc.7 上完整验证过：`wfviz-2/pkg-4`，run-4 成功，并用一个
两阶段三代理的演示 workflow 端到端跑通。）

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
