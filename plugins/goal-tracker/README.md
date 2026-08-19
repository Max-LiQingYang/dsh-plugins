# @dsh-plugins/goal-tracker

OpenCode 风格的 Goal 追踪器，用于 DeepSeek Harness（DSH）Web GUI。参照 opencode
的 goal 模式（Codex 风格持久目标 + 跨轮自主推进 + 进度可视化），把 DSH 原生的 goal
服务状态渲染成 composer 上方的可视化追踪条，并直接在追踪条上提供完整的 goal 控制。

## 效果

当会话存在目标时，composer 上方出现一行追踪条（与 DSH 自带的 GoalBar 并存）：

```
[●] [进行中] 修复 flaky 测试并在 goal 报告中保留证据…  轮次 3/8  [███████░░░]  38%  耗时 0:12:34  rev 4   [⏸][✓][✎][×] ▸
```

### 可视化（展示更多状态）

- **状态徽章**：圆形徽章 + 相位标签（进行中=绿色呼吸 / 已暂停=琥珀 / 受阻=红色呼吸 /
  已完成=绿色 ✓），相位色左边框强调
- **轮次与进度**：`roundsStarted / maxGoalRounds`（**创建默认 16 轮，可选无限**）+
  渐变进度条 + 百分比
- **实时耗时**：每秒跳动（client `timer` 服务驱动）
- **修订号**：`rev N` 徽章（目标修订号：每次修改 +1）
- **受阻横幅**：`blocked` 时条下方常显红色横幅（code + message），不再需要展开才可见
- **相对时间**：展开详情中显示「更新于 2 分钟前」等相对时间
- **完成态总结**：绿色 ✓ + 总轮次 + 总耗时（内置 GoalBar 在 complete 时不渲染，本插件补上）
- **通俗 tooltip**：`rev` 悬停「目标修订号：每次修改 +1」，轮次悬停「已执行轮数 / 轮数上限」

### 控制（更多控制 goal 的功能）

控制动词通过产品远程服务 `ctx.get('remote.goals')` 调用（dsh-api-remotes 提供），
每次操作携带 CAS ref（id + revision），失败显示错误横幅：

| 相位 | 可用操作 |
|---|---|
| active | ⏸ 暂停 · ✓ 完成 · ✎ 编辑 · × 清除 |
| paused / blocked | ▶ 恢复 · ✎ 编辑 · × 清除 |
| complete | × 清除 |
| 任意 | ✎ 编辑（内联表单：目标文本 + 轮次上限） |
| 无目标 | 「＋ 新建目标」入口（目标文本 + 可选轮次上限） |

远程服务不可用时自动降级为只读追踪条（不渲染任何控制按钮）。

### 完成策略（Goal 模式）

展开详情面板可编辑「完成策略」，策略以 `［完成策略：…］` 块写入目标文本（agent
每轮都会读到并遵守），轮次上限同时写入真实的 `maxGoalRounds` 字段（硬约束）：

| 模式 | 行为 | 存储 |
|---|---|---|
| 由 agent 决定是否完成 | 默认；agent 自行判断完成时机 | 无策略块，上限保留 |
| 必须执行完指定轮次 | agent 不得提前完成；轮次跑满后自动停（需手动完成或改上限） | `［完成策略：必须执行完 N 轮后才可完成］` + `maxGoalRounds=N` |
| agent 决定 + 最少/最多轮数 | 最少/最多可分别留空；最少是软约束（agent 遵守文本），最多是硬约束 | `［完成策略：agent 决定完成时机，但最少 X 轮、最多 Y 轮］` + `maxGoalRounds=Y` |
| 无限执行（不自行完成） | **真正无限**：每轮持续推进，agent 永不自行完成，直到用户暂停/清除；工具栏不显示 ✓ 完成按钮 | `［完成策略：无限执行，持续推进直到用户手动停止，不得自行完成］` + `maxGoalRounds=999999` |

创建表单默认轮数 **16**，可勾选「无限轮次」直接创建无限目标；详情面板可随时改策略。

工具栏（composer 上方追踪条）布局：`[状态文字] [策略 chip] 目标… 轮次 进度 耗时 rev 控制`——无圆形徽章；进行中/受阻状态 chip 与进度条带有缓慢的**光泽扫过（sheen）**动效（每 3-4 秒一次，系统开启减弱动态时自动静止）；策略 chip 显示「agent 决定 / 跑满 N 轮 / 最少·最多 / 无限」。
注意：`defaultMaxGoalRounds` 服务默认值需在组合层补丁（见下）。

## 工作原理

- 数据源：宿主计算的 **`goal` 会话投影**。每次目标变更（`goal/change` 事件）都携带
  完整后置状态，投影折叠为 last-wins 整值——UI 无需轮询或 RPC。
- **实时轮次桥接**：客户端投影只在变更事件时刷新，轮次准入事件不会推动它——所以
  动态插件版本带一个宿主半（`src/dynamic-host.js`），通过包私有 RPC `goal/live`
  （按 sessionId 解析 `goals.get(agent)` 的实时 GoalView）每 2 秒轮询，轮次/进度/
  激活态（armed/disarmed）始终与宿主对齐。客户端模块安装版无 `host` 内置，自动
  降级为投影值（下次变更时收敛）。
- 渲染：注册进 `conversation.input.dock` slot（list 类型，`id: "goal-tracker"`，
  `order: 20`），通过 slot 标准 props 里的 `useProjection('goal')` 钩子订阅投影；
  sessionId 通过注册选项 `inject: (sessionId) => ({ sessionId })` 注入。
- **宿主半 RPC**（动态插件版，`src/dynamic-host.js`）：
  - `goal/live(sessionId)` — 实时 GoalView（轮次/相位/激活态），供追踪条 2s 轮询
  - `goal/sessions({maxN})` — 会话下拉框列表（id + 标题）
  - `goal/history({sessionId|sessionIds[]})` — 目标历史（分组 + 时间线 + 运行结果）
- 与内置 GoalBar（`id: "goal"`, `order: 10`）互不冲突，职责互补：内置版负责基础
  操作，本插件负责可视化 + 完整控制（含完成/新建/轮次上限编辑）。
- **Unicode 约定**：源码中所有图形字符一律使用 `\uXXXX` 转义（如 `\u23F8`、`\u2705`），
  避免在序列化往返中被替换成「豆腐」字符。

### 去掉内置 GoalBar（可选）

如果只想要本插件的追踪条，可以在 web profile 的组合层禁用内置 goal UI 插件
（`~/.dsh/profiles/web/cordis.patch.yml`）：

```yaml
- id: ui-goal
  disabled: true
```

重启 `dsh web` 后内置 GoalBar 与 `/goal` 命令的自定义输入气泡不再渲染（`/goal`
命令本身是宿主侧功能，不受影响）。注意：动态插件按进程存活，重启后需重新激活
`gtrack-1`（或用方式 B 安装为客户端模块以获得持久效果）。

## 📂 目标历史子 Tab（Goals）

除了 composer 上方的追踪条，插件还在会话视图注册了一个**「目标」子 Tab**
（`conversation.view`，紧邻「对话」之后）。它把会话内所有目标（含已清除、已完成）
聚合展示，方便回顾——不用再往上翻聊天记录。

```
[对话] [轨迹] [目标] [Workflows]        ← 视图 Tab 栏
```

### 列表

| 列 | 说明 |
|---|---|
| 目标 | 目标文本（自动剥离「完成策略」块） |
| 时间 | 最近变更时间 |
| 相位 | 进行中 / 已暂停 / 受阻 / 已完成（彩色徽章） |

### 详情（点击某一行）

- **目标**：完整文本（含策略块原文）
- **轮次 / 进度 / 完成策略 / 自动续跑 / 创建 / 更新 / 修订**
- **修改记录**：时间线（时间 + 操作 + 修订号），如 `创建 → 编辑 → 受阻 → 恢复 → 完成`
- **运行结果**：已完成目标显示 **AI 最终回复** 文本（自动从会话事件检索，无需滚动）

### 跨会话

Tab 顶部有一个**会话下拉框**：

- 默认 = 当前会话
- **「全部会话（合并）」** = 聚合 workspace 内最近会话的目标，按创建时间倒序
- 其他会话 = 切换后只看该会话的目标

来自其他会话的目标行会略微淡化，并附短会话标题，便于区分。

> 数据来源：宿主半 RPC `goal/history`（按 sessionId 或 sessionIds[] 读取持久化会话
> 事件，按 `goalId` 分组）+ `goal/sessions`（会话下拉框列表）。目标历史基于
> **持久化事件**，因此重启后依然可查。

## 安装

### 方式 A：动态插件（单会话快速试用）

把 [`src/dynamic-client.js`](./src/dynamic-client.js) 的内容作为 `cordis_define` 的
`code.client` 传入，对返回的 package 执行 `cordis_run` 并授权。动态插件在进程重启后
消失，适合试用。

### 方式 B：客户端模块（正式安装）

包已声明 `dsh.client`（`platform: "web"`）并导出 `./client` bundle，会被 `dsh web`
的 client-modules 扫描器发现：

1. 安装到 web profile：

   ```sh
   dsh plugin --profile web add file:/path/to/dsh-plugins/plugins/goal-tracker
   ```

   （发布到 npm 后可直接 `dsh plugin --profile web add @dsh-plugins/goal-tracker`）

2. 在 `~/.dsh/profiles/web/cordis.patch.yml` 挂载插件行：

   ```yaml
   - id: goal-tracker
     name: '@dsh-plugins/goal-tracker'
   ```

3. 重启 `dsh web`。

> 宿主半（`index.js`）是空 `apply`，仅用于让插件行出现在 Cordis Loader 中；浏览器半
> 通过 `exports["./client"]` 提供。样式以带 `data-plugin` 属性的 `<style>` 注入，便于
> client-modules 的 HMR 归集。

## 依赖与要求

- DSH `>= 0.1.0-rc.7`（需要 `dsh-base` 的 goal 服务与 `dsh-web-app` 的
  `conversation.input.dock` slot）
- `react ^18`（peerDependency）
- 控制动词需要 `dsh-api-remotes`（`remote.goals` 服务）；缺失时自动只读
- 可选：`timer` 服务（用于秒级跳动；缺失时耗时退化为静态值）

## 数据结构参考（goal 投影，`useProjection('goal')`）

```ts
interface GoalProjection {
  goal: GoalSnapshot;      // id / revision / objective / phase / maxGoalRounds / blockedReason?
  roundsStarted: number;   // 已准入轮次
  createdAt: number;       // epoch ms
  updatedAt: number;       // epoch ms
}
type GoalPhase = 'active' | 'paused' | 'blocked' | 'complete';
```

注意：`activation`（armed/disarmed，进程本地值）刻意不在投影中，客户端不可见；如需
展示可加 Host 半桥接 `goals.get(agent)` 的 `GoalView`。

## License

MIT
