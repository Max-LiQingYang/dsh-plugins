# dsh-plugins 🧩

> Community plugin collection for the
> [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) Web GUI.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![DSH](https://img.shields.io/badge/DSH-%E2%89%A5%200.1.0--rc.7-blue)](#dependencies--requirements)
[![React](https://img.shields.io/badge/React-%5E18.2.0-61dafb)](#dependencies--requirements)

DSH's runtime is built on [Cordis](https://cordis.js.org): **every capability is
a plugin row in a composition**. This repo collects reusable DSH plugins — they
can be installed as **client modules** (persistent, loaded by the `dsh.client`
scan on `dsh web` start) or mounted as **dynamic plugins** in a single session
(zero install, zero restart).

---

## 📦 Plugins at a glance

| Plugin | Version | Type | One-liner |
|---|---|---|---|
| [**`graph`** · *flagship*](./plugins/graph/README.md) | **1.0.0** ✅ | **host tool** + browser UI | LangGraph-style `graph` model tool: state-machine orchestration with cycles, unbounded loops, interactive editor, persistent library. |
| [`goal-tracker`](./plugins/goal-tracker/README.md) | 0.4.x | browser UI | OpenCode-style Goal tracking bar + cross-session Goals history tab. |
| [`workflow-visualizer`](./plugins/workflow-visualizer/README.md) | 0.2.x | browser UI | Claude-style workflow runs: status pills, per-phase progress, agent drill-down, "open child session". |

> **Flagship** = `@dsh-plugins/graph`. It ships a model-facing tool (host-plane row)
> + a browser visualizer (client module) + a persistent FS library. It's the
> most complete example of the two-mounting-mechanisms workflow.

---

## 🧭 What `@dsh-plugins/graph` does

You call one tool with a spec like:

```json
{
  "name": "revise-loop",
  "entry": "writer",
  "maxSteps": 0,
  "persist": true,
  "nodes": [
    { "id": "writer",   "type": "agent", "prompt": "Write a draft." },
    { "id": "counter",  "type": "js",    "code": "return {n: (state.n ?? 0) + 1}" },
    { "id": "reviewer", "type": "agent", "outputSchema": { "type": "object", "properties": { "pass": { "type": "boolean" } } } }
  ],
  "edges": [
    { "from": "writer",   "to": "counter" },
    { "from": "counter",  "to": "reviewer" },
    { "from": "reviewer", "router": "return state.reviewer.pass ? 'END' : 'writer'" }
  ]
}
```

…and the tool runs the whole **draft → review → revise → review → ship** loop as
a single call. The user sees the loop visualized in the tool card *and* in the
**Graphs tab** beside the conversation, with a drag-to-edit canvas that
persists the definition to disk.

```
┌── chat ──────────────┐  ┌── Graphs tab ──────────────────────┐
│ ▸ graph: revise-loop │  │ graphs  3 live   17 saved        │
│   ● running 1m12s    │  │ ● revise    ✓ demo              │
│   ◆ writer  ● 412ms  │  │ ● loop      ✓ arch              │
│   ◇ bump    ✓ 18ms   │  │ + live …    ✓ …                 │
│   ◆ reviewer ● ...   │  │ ───────────┐  ┌─────────────────┐│
│   ↳ step scrubber ▬○─ │  │            │  │ edit · revise  ││
│   ▸ output: {…}      │  │            │  │ ◆ writer ◆ rev…││
└─────────────────────┘  └────────────�──┴─────────────────┘
```

Full install + usage in [`plugins/graph/README.md`](./plugins/graph/README.md).

---

## 🗂️ Layout

```
dsh-plugins/
├── plugins/
│   ├── graph/                 # 🕸️  flagship — LangGraph-style tool + visualizer + library
│   ├── goal-tracker/          # 🎯  OpenCode-style Goal tracking + history tab
│   └── workflow-visualizer/   # 📊  Claude-style workflow run visualization
├── scripts/
│   └── restart-web.sh         # one-shot dsh web restart helper
├── package.json               # pnpm workspace root (workspaces: plugins/*)
├── README.md                  # this file
└── LICENSE                    # MIT
```

---

## 🚀 Installing a plugin

Each plugin supports **two mounting strategies** — pick by use case.

### Way A — Dynamic plugin (fastest, single-session, no restart)

In any DSH session, have the agent call the Cordis toolset:

1. Read the plugin's `src/dynamic-client.js` (and `src/dynamic-host.js` if it has one).
2. Pass them as `code.client` / `code.host` to `cordis_define` (`plugin.kind: "new"`).
3. `cordis_run` the returned package and authorize the client half.

> Dynamic plugins live only in the current process; gone after `dsh web` restart.
> Use them for trying things out.

### Way B — Client module + host row (persistent, persistent across restarts)

The plugin package declares `dsh.client: { platform: "web" }` and exports a
`./client` bundle. After install, `dsh web`'s client-modules scanner picks it up.

#### Quickest path: symlink the workspace into the profile

```sh
# 1. Make the package discoverable
ln -sfn "$PWD/plugins/graph" \
        ~/.dsh/profiles/node_modules/@dsh-plugins/graph

# (also into the specific profile, for scanner visibility)
mkdir -p ~/.dsh/profiles/web/node_modules/@dsh-plugins
ln -sfn "$PWD/plugins/graph" \
        ~/.dsh/profiles/web/node_modules/@dsh-plugins/graph
```

#### Add the host row to your profile's patch layer

Edit `~/.dsh/profiles/web/cordis.patch.yml`:

```yaml
# LangGraph-style `graph` tool — host-plane, visible to every session.
- insert:
    - id: tool-graph
      name: '@dsh-plugins/graph'
      config:
        provider: spawn
        maxParallel: 6
```

#### Restart

```sh
bash scripts/restart-web.sh
```

After restart:

- Every session's agent can call the `graph` tool.
- The tool card (browser-side, `client.js`) auto-renders with topology + step scrubber + per-node outputs.
- The Graphs tab (browser-side, dynamic `src/dynamic-client.js`) is **not** auto-mounted by the static row — to get it, either republish with the dynamic half wired in, or mount it dynamically in a session (Way A).

> Why two halves? `client.js` is the always-on, restart-safe part of the package.
> The dynamic half (`src/dynamic-client.js`) is the heavier, session-scoped
> part that includes the interactive editor — DSH loads it when explicitly mounted.

---

## 🧠 Quick tour of the flagship plugin

Read [`plugins/graph/README.md`](./plugins/graph/README.md) for the full
reference. The at-a-glance:

- **Concept**: one tool that runs a whole super-step state machine. Nodes run
  in a topological frontier, writes merge at step end, routing can branch
  back — cycles are first-class.
- **Node kinds**: `agent` (delegates to a subagent with prompt + optional
  output schema) and `js` (pure `(state, info) => value`).
- **Edge kinds**: static (`a → b` or `→ "END"`) or router
  (`(state, info) => nodeId | "END" | [nodeIds]`).
- **Persistence**: `persist: true` writes `<id>.json` under `$DSH_HOME/graphs/`.
  The host registers a `graphLibrary` Cordis Service (`list`/`get`/`save`/`update`/`remove`).
- **Editor**: click a saved graph in the Graphs tab → drag nodes, drag-port-to-port
  to create edges, click to edit static target / router code, **Save changes**
  writes back via `graphLibrary.update`.
- **Live**: while a run is in flight, the card pulses; the Graphs tab streams
  agent chips (running/done/failed with elapsed + output previews); clicking a
  live node's "open agent session" jumps to that child session.

---

## 📝 Writing your own plugin

The repo has **three plugins** you can copy from. The pattern:

| File in your plugin | What it is |
|---|---|
| `package.json` | Must declare `dsh.client: { platform: "web" }` and `exports["./client"]`. |
| `client.js` | Browser half: classic script wrapping `window.__ModuleLoader__.load({ id, factory(require) })` returning `{ apply, inject }`. |
| `index.js` | Host half: usually a no-op `apply`; just exists so Cordis Loader can mount the row. |
| `src/dynamic-client.js` / `src/dynamic-host.js` | Single-source variants of the same UI/logic, pasted directly into `cordis_define`'s `code.*` fields for instant trials. |
| `test/*.test.mjs` | Headless test suite (`node test/engine.test.mjs` — `npm test` runs all). |

**Style**: inject a `<style>` tag with `data-plugin-css` for HMR bookkeeping;
prefer DSW theme variables (`--dsw-alias-*`, `--dsh-composer-*`) over inline colors;
write React code with `React.createElement` — never JSX.

The `plugins/graph/` plugin demonstrates the full two-mounting-mechanism
workflow (host row + dynamic visualizer + persistent library) — read its
README before writing a new one.

---

## 🛠️ Development workflow

### Common tasks

- **Switch profile**: `dsh --profile <name>` — README and scripts both honour
  the `DSH_PROFILE` env var.
- **Restart**: `bash scripts/restart-web.sh [port]` — graceful stop → wait for
  the port to free → nohup relaunch in the background → readiness probe within
  30 s.
- **Run plugin tests**:

  ```sh
  npm test
  # or per plugin
  node plugins/graph/test/engine.test.mjs
  node plugins/graph/test/client.test.mjs
  node plugins/graph/test/dynamic-host.test.mjs
  node plugins/graph/test/library.test.mjs
  node plugins/graph/test/editor.test.mjs
  ```

- **Try the dynamic variant of any plugin**: ask the agent
  "mount `<plugin>`'s dynamic variant in this session" — it reads the `src/`
  files and wires them up.

---

## 📦 Publishing to npm

Every plugin in this repo is set up for public npm publishing out of the box:

```sh
cd plugins/graph                 # or goal-tracker / workflow-visualizer
npm publish                      # needs npm login on your machine
```

After publishing, users install with one command:

```sh
dsh plugin --profile web add @dsh-plugins/graph
```

The release workflow per plugin:

1. Bump `version` in `plugins/<name>/package.json` (we follow semver).
2. Update `plugins/<name>/CHANGELOG.md` (we follow [Keep a Changelog](https://keepachangelog.com)).
3. Commit + push + `git tag @dsh-plugins/<name>@<version>`.
4. `npm publish` from the package directory.

> Each plugin has `publishConfig.access: "public"`, a `repository` block,
> and (for `@dsh-plugins/graph`) a `bugs` / `homepage` field — once
> you `npm login`, the package is one `npm publish` away.

---

## 🔍 Dependencies & requirements

- **DSH** `>= 0.1.0-rc.7` (needs the `dsh-base` and `dsh-web-app` bundles).
- **Node** `>= 18` (DSH runtime).
- **React** `^18.2.0` (peer dependency for the client modules).
- Browser: modern Chromium / Firefox / Safari (uses `color-mix()`, CSS variables).

---

## 🗂️ Related links

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- [Cordis](https://cordis.js.org)
- [OpenCode](https://opencode.ai)

---

## 📄 License

[MIT](LICENSE).
