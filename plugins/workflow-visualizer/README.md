# 🎛️ @dsh-plugins/workflow-visualizer

![License](https://img.shields.io/badge/license-MIT-green.svg)
![DSH](https://img.shields.io/badge/DSH-%3E%3D%200.1.0--rc.7-blue.svg)
![Platform](https://img.shields.io/badge/platform-web-purple.svg)
![Version](https://img.shields.io/badge/version-0.1.0-orange.svg)

> **把 DSH 的 workflow 引擎变成看得见的流水线。** 参照 Claude Code 的[动态工作流](https://code.claude.com/docs/zh-CN/workflows)
> 观看体验，为 DeepSeek Harness Web GUI 提供实时、可下钻的 workflow 运行可视化。

DSH 的 `workflow` 工具负责执行多代理编排（扇出审计、大规模迁移、交叉研究……），但它跑起来
时像一台黑箱。本插件把黑箱的盖子掀开：**每个阶段、每个子代理、每一步进展，都实时呈现在
界面上**，还能一键跳进某个子代理的会话，看它到底干了什么。

---

## ✨ 特性一览

| 特性 | 说明 |
| --- | --- |
| 🗂️ **Workflows 视图标签** | 会话头部新增独立标签页，与 chat / trajectory 并列，集中回看所有运行 |
| 🏷️ **运行卡片** | 状态呼吸灯 + 状态胶囊、描述、耗时、元信息条（代理完成数 / 实时并发 / 均耗 / 吞吐 / 阶段数） |
| 📊 **阶段手风琴** | 每个阶段独立进度条与 ✓✗↻⊘ 计数，点击展开该阶段的代理列表；未开始的阶段灰显 |
| 🔍 **代理明细下钻** | 点击任意代理：live 待命/运行态、起止时钟、耗时、子会话 id |
| 🚪 **打开子会话** | 一键跳转到子代理的完整会话，查看它的提示词、工具调用与结果 |
| 📜 **脚本日志** | 展开查看脚本 `log()` 叙述行（带相对时间戳） |
| 🎯 **输入框实时进度条** | 有运行进行中时，composer 上方出现一行摘要（名称 + 当前阶段 + 进度）；无运行时自动隐藏 |
| 🚫 **隐藏默认卡片** | 顶掉 DSH 自带的 `workflow-run` 聊天面板，会话流保持干净（数据折叠保留） |
| 🌗 **主题自适应** | 全部使用 `--dsw-alias-*` 主题变量，明暗模式自动跟随；文案中英双语（跟随 locale） |

---

## 🖼️ 界面长什么样

### Workflows 标签页

```
┌─ Workflows ──────────────────── 3 runs · 1 active ────────────┐
│                                                                │
│  ● viz-v2-check                        COMPLETED   1m 24s 日志 │
│  multi-phase verification run                                  │
│  代理 4/4 · 均耗 21s · 吞吐 2.9个/分 · 阶段 3                  │
│  ████████████████████████░░░░░░░░░░ (总进度)                    │
│                                                                │
│  [1] fan-out          ✓ 3   3/3          [2] verify  ✓ 1  1/1  │
│      ████████████         ── 展开 ──▶  #1 probe-alpha  完成 21s │
│                                       #2 probe-beta   完成 19s │
│                                       #3 probe-gamma  完成 22s │
│  [3] report           ↻ 1   1/1                                │
│      ████████████                                             │
└────────────────────────────────────────────────────────────────┘
```

### 输入框实时进度条

```
┌───────────────────────────────────────────────────────────────┐
│ ● viz-v2-check   report   ████████████████░░░   代理 3/4 · 1m 12s │
└───────────────────────────────────────────────────────────────┘
```

---

## 🧭 工作原理

DSH 的 workflow 引擎在运行时会同时发出**两路信号**，本插件两种形态各吃一路：

```
                        ┌──────────────────────────────┐
 workflow 引擎执行脚本 ──▶ │  workflow/*  进程内 Cordis 事件 │──▶ 动态版宿主半聚合
    (workflow 工具)       │  (start/phase/log/agent-*)  │     → 包私有 RPC
                        ├──────────────────────────────┤     → 浏览器轮询 1s
                        │  tool-workflow/* 持久会话事件   │──▶ 官方 conversationEvents
                        │  (写进 session log)          │     折叠为 workflow-run 节点
                        └──────────────────────────────┘     → 安装版直接读取
```

| 信号 | 形式 | 内容 | 谁消费 |
| --- | --- | --- | --- |
| `workflow/*` | 进程内事件（内存，重启即失） | 全部字段 + `phase()` 切换 + `log()` 叙述 + **起止时间戳** | 动态版（`src/dynamic-host.js`） |
| `tool-workflow/*` | 持久会话事件（随 session 存档） | run-start（名称）、agent-start（label/phase）、agent-end（outcome）、run-end（stopReason），**无时间戳** | 安装版（`client.js`） |

因此两种形态的能力略有差异，见下方对照表。

---

## 🚀 快速开始

### 方式 A：动态插件（单会话试用，免重启，推荐先试这个）

在任意挂载了 **cordis 预设**的 DSH 会话中，让 agent 执行：

1. 读取 `src/dynamic-host.js` 与 `src/dynamic-client.js`；
2. 分别作为 `cordis_define` 的 `code.host` / `code.client`（`plugin.kind: "new"`，idPrefix 如 `wfviz`）；
3. 对返回的 `pluginId/packageId` 调用 `cordis_run` 并授权（双勾授权未来版本）。

⚠️ 动态插件只活在当前进程，**重启 `dsh web` 后消失**——源码就在本仓库，随时可重新拉起来。

### 方式 B：客户端模块（正式安装，重启常驻）

```sh
# 本地路径（开发，或用软链：ln -s 到 profile 的 node_modules）
dsh plugin --profile web add file:/path/to/dsh-plugins/plugins/workflow-visualizer
# 发布到 npm 后
dsh plugin --profile web add @dsh-plugins/workflow-visualizer
```

在 `~/.dsh/profiles/web/cordis.patch.yml` 挂一行：

```yaml
- insert:
    - id: workflow-visualizer
      name: '@dsh-plugins/workflow-visualizer'
```

重启 `dsh web`。安装版的客户端模块会被 web 的 `dsh.client` 扫描器自动发现（无需宿主逻辑，
`index.js` 只是空 `apply`）。

> ⚠️ 两种形态使用相同的 slot id（`workflows` / `workflow-live`），**同一会话不要同时启用**。
> 动态版重启后消失、安装版重启后接管，天然错峰，不冲突。

### 验证

跑一个 workflow（对 agent 说「用 workflow 并行总结……」），然后：

1. 看 composer 上方的实时进度条是否出现；
2. 切到 **Workflows** 标签页，展开阶段 → 点击代理 → 按「打开子会话」；
3. 对比聊天流：默认的 workflow 面板应已消失，只剩工具调用折叠行。

---

## 🧩 能力对照表

| | 安装版（client 模块） | 动态版（cordis 工具集） |
| --- | --- | --- |
| 数据源 | 官方折叠的 `workflow-run` 聊天节点 | 宿主半聚合 `workflow/*` 事件 + 包私有 RPC |
| 宿主半 | 无（空 `apply`） | 有（事件聚合器） |
| 阶段手风琴（分相计数/进度条/可展开） | ✅ | ✅ |
| 代理明细下钻（状态、子会话 id） | ✅ | ✅（另含 live 待命/运行态、起止时钟、耗时） |
| 一键打开子会话 | ✅ | ✅ |
| 运行耗时 / 均耗 / 吞吐 | ❌（持久事件无时间戳） | ✅ |
| `log()` 叙述行 | ❌ | ✅ |
| 重启后存活 | ✅ | ❌ |

**为什么安装版没有耗时/日志？** 这是引擎数据面的边界：持久会话事件（`tool-workflow/*`）
本身不带时间戳与 log 内容，浏览器端无法凭空造出来。动态版额外消费内存事件流，所以都有。

---

## 🚫 关于「隐藏默认卡片」

DSH 自带 `dsh-client-ui-workflow-run`，会在会话流里渲染一个 workflow 运行面板。本插件在
`conversation.chat.node` 的 `workflow-run` key 上以 **`priority: -1`** 注册 null 渲染器
（keyed slot 同 key 低优先级胜出），把默认面板顶掉，让会话流干净。

**官方插件的事件折叠被完整保留**——安装版的数据源正是它，所以两者是协作关系而非替代。

**想恢复默认卡片？** 删掉源码里 `conversation.chat.node` 的注册（`src/dynamic-client.js`
与 `client.js` 各一处）即可。

---

## ❓ 常见问题

**Q：重启后标签页没了？**
动态版是进程内临时插件，重启即失。用方式 B 安装即可常驻，或从 `src/` 重新拉起动态版。

**Q：为什么有的代理显示「待命」？**
子代理被 spawn 后、真正开始工作前可能处于 idle；`agent/status` 事件会实时精修这个状态。

**Q：进度条不更新？**
检查 Workflows 标签页是否打开（轮询 1s）；进度条 2.5s 刷新一次。若标签页空白显示
「connecting to host…」，说明宿主半未激活——动态版请确认 `cordis_run` 已成功。

**Q：与官方默认面板重复显示？**
安装本插件后不会：默认卡片被 shadow 注册顶掉（见上节）。若升级后复现，确认插件已加载
（Workflows 标签页存在即已加载）。

---

## 🛠️ 开发与发布

```sh
# 校验语法（动态版源码是 cordis_define 函数体，用 new Function 编译验证）
node -e "const fs=require('fs');for(const f of ['src/dynamic-host.js','src/dynamic-client.js','client.js']){new Function(fs.readFileSync(f,'utf8'));console.log('OK',f)}"

# 发布到 npm（包已配置 publishConfig.access=public）
cd plugins/workflow-visualizer
npm publish
```

## 📄 License

MIT © Max-LiQingYang
