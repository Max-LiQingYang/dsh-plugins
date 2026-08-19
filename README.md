# dsh-plugins 🧩

> DeepSeek Harness（DSH）Web GUI 的社区插件集合。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![DSH](https://img.shields.io/badge/DSH-%E2%89%A5%200.1.0--rc.7-blue)](#依赖与要求)
[![React](https://img.shields.io/badge/React-%5E18.2.0-61dafb)](#依赖与要求)

DSH 的运行时基于 [Cordis](https://cordis.js.org)：**一切能力都是组合中的一行插件**。
本仓库收录开箱即用的 DSH 插件——它们既能以「客户端模块」方式正式安装进 `dsh web`
profile（持久生效），也能以「动态插件」方式在单个会话中即用即弃（零安装、零重启）。

## ✨ 特性速览

| 插件 | 类型 | 一句话 |
|---|---|---|
| [`goal-tracker`](./plugins/goal-tracker/README.md) | 浏览器 UI | OpenCode 风格 Goal 追踪条 + **目标历史子 Tab**（跨会话） |
| [`workflow-visualizer`](./plugins/workflow-visualizer/README.md) | 浏览器 UI | Claude 风格 workflow 运行可视化 |
| [`graph`](./plugins/graph/README.md) | 宿主工具 | LangGraph 风格 `graph` 工具：把节点编排为真实子代理 |

---

## 📚 目录结构

```
dsh-plugins/
├── plugins/
│   ├── goal-tracker/          # 🎯 本仓库主打：Goal 追踪条 + 历史 Tab（见其 README）
│   ├── workflow-visualizer/   # 📊 workflow 运行可视化
│   └── graph/                 # 🕸️ LangGraph 风格宿主工具
├── scripts/
│   └── restart-web.sh         # 一键重启 `dsh web` 的辅助脚本
├── package.json               # pnpm workspace 根（workspaces: plugins/*）
└── README.md                  # 本文件
```

---

## 🚀 安装一个插件

每个插件都支持**两种安装方式**，按需选择：

### 方式 A：动态插件（最快 · 单会话 · 零重启）

在任意 DSH 会话中，让 agent 用 Cordis 工具集定义插件：

1. 读取对应插件的 `src/dynamic-client.js` 内容；
2. 原样作为 `cordis_define` 的 `code.client` 传入（`plugin.kind: new`）；
3. 对返回的 `pluginId/packageId` 执行 `cordis_run` 并授权。

> ⚠️ 动态插件**只活在当前进程**，重启 `dsh web` 后消失。适合试用与验证。

### 方式 B：客户端模块（正式 · 持久生效）

插件包声明了 `dsh.client`（`platform: "web"`）并导出 `./client` bundle，`dsh web`
的 client-modules 扫描器会自动发现并挂载：

```sh
# 1. 装进 web profile（本地路径；发布到 npm 后换成包名）
dsh plugin --profile web add file:/path/to/dsh-plugins/plugins/goal-tracker
```

```yaml
# 2. 在 ~/.dsh/profiles/web/cordis.patch.yml 挂载插件行
- id: goal-tracker
  name: '@dsh-plugins/goal-tracker'
```

```sh
# 3. 重启 dsh web
bash scripts/restart-web.sh   # 或手动 Ctrl+C 后重新 `dsh web`
```

> 宿主半（`index.js`）通常是空 `apply`——只为让插件行出现在 Cordis Loader 中；真正
> 的 UI 通过 `exports["./client"]` 在浏览器端加载。

---

## 🧭 手动安装（不使用 dsh-plugin CLI）

如果你更习惯手动管理 profile：

1. 把插件目录复制/链接到 profile 的依赖（`~/.dsh/profiles/web/package.json`）；
2. 在 `cordis.patch.yml` 添加对应插件行；
3. 重启 `dsh web`。

---

## 🛠️ 开发指南

### 插件包格式（客户端模块）

| 文件 | 说明 |
|---|---|
| `package.json` | 必须声明 `dsh.client: { platform: "web" }` + `exports["./client"]` |
| `client.js` | 浏览器半：`window.__ModuleLoader__.load({ id, factory })` 格式，`factory(require)` 返回 `{ apply, inject }` |
| `index.js` | 宿主半：空 `apply`，仅用于 Loader 挂载 |
| `src/dynamic-*.js` | 同一实现的动态插件源码（免打包直接喂给 `cordis_define`） |

样式：注入带 `data-plugin` / `data-plugin-css` 属性的 `<style>` 标签，便于运行时
HMR 归集；颜色优先用 DSW 主题变量（`--dsw-alias-*`、`--dsh-composer-*`）。

> 💡 仓库里每个插件都有「动态源码（`src/dynamic-*.js`）」与「模块构建（`client.js`）」
> 两份。模块版 `client.js` 通常由 `src/dynamic-client.js` 脚本化生成，改动源码后记得
> 重新生成（各插件 README 内有说明）。

### 常见任务速查

- **换 profile**：`dsh --profile web` 改为你的 profile 名（README 与脚本都支持 `DSH_PROFILE` 环境变量覆盖）。
- **重启**：`bash scripts/restart-web.sh [port]`——优雅停止 → 等端口释放 → nohup 后台拉起 → 30s 内探测恢复。

---

## 🧠 插件一览

### 🎯 goal-tracker

OpenCode 风格 Goal 追踪器——把 DSH 原生 goal 服务渲染成 composer 上方的可视化追踪条，并提供完整控制与历史浏览。

- **追踪条**：相位徽章、策略 chip、轮次/进度/百分比、实时耗时、修订号、控制按钮
- **控制**：暂停 / 恢复 / 完成 / 清除 / 编辑（目标 + 轮次上限）/ 新建（默认 16 轮、可无限）
- **完成策略**：agent 决定 / 必须跑满 N 轮 / 最少·最多混合 / 无限（不自行完成）
- **目标历史 Tab**：`conversation.view` 新增「目标」Tab，列表展示全部目标（目标文本 + 时间 + 相位），点击展开详情（目标 / 轮次 / 状态 / 修改记录时间线 / **运行结果 AI 最终回复**）
- **跨会话**：Tab 内下拉框切换会话，或「全部会话（合并）」聚合浏览

详见 [`plugins/goal-tracker/README.md`](./plugins/goal-tracker/README.md)。

### 📊 workflow-visualizer

Claude 风格 workflow 运行可视化——为 workflow 运行提供「Workflows」视图 Tab 与输入区实时进度条。

- **Workflows Tab**：运行卡片（状态胶囊 / 描述 / 耗时 / 均耗 / 吞吐 / 实时并发）+ **阶段手风琴**（分相 ✓✗↻ 计数与进度条，展开即见该阶段代理）+ **代理下钻**（live 待命/运行态、起止时钟、耗时、子会话 id，一键「打开子会话」看完整执行）+ 脚本 `log()` 叙述
- **输入框实时进度条**：运行进行中显示名称 / 当前阶段 / 进度摘要，无运行自动隐藏
- **隐藏默认卡片**：以 `priority: -1` 顶掉 DSH 自带的 workflow-run 聊天面板（数据折叠保留）
- **双形态**：动态插件（含耗时与日志）或客户端模块（重启常驻）；中英双语，明暗自适应

详见 [`plugins/workflow-visualizer/README.md`](./plugins/workflow-visualizer/README.md)。

### 🕸️ graph

LangGraph 风格 `graph` 工作模式——注册宿主平面 `graph` 工具，把节点编排为真实子代理（含交互式编辑器）。这是**宿主工具**插件，非 UI 插件。

---

## 📦 发布到 npm

三个包均已配置好 `publishConfig.access: public` 与 `repository`，可直接发布：

```sh
cd plugins/workflow-visualizer   # 或 goal-tracker / graph
npm publish
```

发布后用户即可 `dsh plugin --profile web add @dsh-plugins/workflow-visualizer` 直接安装。

> 需要 npm 账号已登录（`npm login`），并确认包名未被占用。

---

## ⚙️ 依赖与要求

- **DSH** `>= 0.1.0-rc.7`（需 `dsh-base` 与 `dsh-web-app` 组合包）
- **Node** >= 18（`dsh` 运行环境）
- **React** `^18.2.0`（插件 peerDependency）
- 浏览器：现代 Chromium / Firefox / Safari（用到 `color-mix()`、CSS 变量）

---

## 🧪 测试与验证

- 每个插件在仓库内都有 `node --check` 语法验证与浏览器实测（见各插件 README）。
- 动态插件改动后重新定义即生效；模块版需重新生成 `client.js`。

---

## 🗂️ 相关链接

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- [Cordis](https://cordis.js.org)
- [OpenCode](https://opencode.ai)

---

## 📄 License

MIT — 见 [LICENSE](LICENSE)。
