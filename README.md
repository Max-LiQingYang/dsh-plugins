# dsh-plugins

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）Web GUI 的社区插件库。

DSH 的运行时基于 [Cordis](https://cordis.js.org)：一切能力都是组合中的一行插件。本仓库收录可复用的
DSH 插件——它们以「客户端模块」的形式安装到 `dsh web` profile，也可以作为动态插件（cordis 工具集）
在单个会话中快速试用。

## 目录结构

```
dsh-plugins/
├── plugins/
│   ├── goal-tracker/          # OpenCode 风格 Goal 追踪器（见 plugins/goal-tracker/README.md）
│   └── workflow-visualizer/   # Claude 风格 workflow 运行可视化（见 plugins/workflow-visualizer/README.md）
└── package.json               # pnpm workspace 根（workspaces: plugins/*）
```

## 安装一个插件（以 goal-tracker 为例）

每个插件都支持两种安装方式：

### 方式 A：动态插件（最快，单会话试用，无需重启）

在任意 DSH 会话中，让 agent 使用 Cordis 工具集定义插件：

1. 读取 `plugins/goal-tracker/src/dynamic-client.js` 的内容；
2. 将其原样作为 `cordis_define` 的 `code.client` 传入（`plugin.kind: new`）；
3. 对返回的 `pluginId/packageId` 调用 `cordis_run` 并授权。

动态插件只活在当前进程，重启 `dsh web` 后消失。

### 方式 B：客户端模块（正式安装，持久生效）

插件包声明了 `dsh.client`（`platform: "web"`）并导出 `./client` bundle，`dsh web` 的
client-modules 扫描器会自动发现并挂载。

1. 把插件装进 web profile 的依赖：

   ```sh
   # 本地路径（开发）
   dsh plugin --profile web add file:/path/to/dsh-plugins/plugins/goal-tracker
   # 或发布到 npm 后
   dsh plugin --profile web add @dsh-plugins/goal-tracker
   ```

2. 在 profile 的宿主组合中挂载一行（`~/.dsh/profiles/web/cordis.patch.yml`）：

   ```yaml
   - id: goal-tracker
     name: '@dsh-plugins/goal-tracker'
   ```

3. 重启 `dsh web`。

> 宿主半（`index.js`）是一个空 `apply`，仅用于让插件行出现在 Cordis Loader 中；真正的 UI
> 通过 `exports["./client"]` 在浏览器端加载。

## 开发新插件

- 包格式：`package.json` 需声明 `dsh.client: { platform: "web" }` 与 `exports["./client"]`
  （string 或 `{ default }` 均可）；
- 浏览器半：`client.js` 使用 `window.__ModuleLoader__.load({ id, factory })` 格式，
  `factory(require)` 返回 `{ apply, inject }`（可参考 `plugins/goal-tracker/client.js`）；
- 样式：注入带 `data-plugin` / `data-plugin-css` 属性的 `<style>` 标签，便于运行时的
  HMR 归集；颜色优先使用 DSW 主题变量（`--dsw-alias-*`、`--dsh-composer-*`）。
- 依赖：`react`（peerDependency）；Slot / 投影等能力通过 `inject` 或 `ctx.get()` 获取，
  先查询对应平台的 Inspect Provider 再编码。

## License

MIT
