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
- **轮次与进度**：`roundsStarted / maxGoalRounds` + 渐变进度条 + 百分比
- **实时耗时**：每秒跳动（client `timer` 服务驱动）
- **修订号**：`rev N` 徽章（每次变更 +1，CAS 语义可见）
- **受阻横幅**：`blocked` 时条下方常显红色横幅（code + message），不再需要展开才可见
- **相对时间**：展开详情中显示「更新于 2 分钟前」等相对时间
- **完成态总结**：绿色 ✓ + 总轮次 + 总耗时（内置 GoalBar 在 complete 时不渲染，本插件补上）

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

## 工作原理

- 数据源：宿主计算的 **`goal` 会话投影**。每次目标变更（`goal/change` 事件）都携带
  完整后置状态，投影折叠为 last-wins 整值——UI 无需轮询或 RPC。
- 渲染：注册进 `conversation.input.dock` slot（list 类型，`id: "goal-tracker"`，
  `order: 20`），通过 slot 标准 props 里的 `useProjection('goal')` 钩子订阅投影；
  sessionId 通过注册选项 `inject: (sessionId) => ({ sessionId })` 注入。
- 与内置 GoalBar（`id: "goal"`, `order: 10`）互不冲突，职责互补：内置版负责基础
  操作，本插件负责可视化 + 完整控制（含完成/新建/轮次上限编辑）。

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
