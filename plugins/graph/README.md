# @dsh-plugins/graph

> LangGraph-style **graph work mode** for the
> [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) Web GUI.

Run state graphs of subagents and pure-JS nodes with static and conditional edges,
first-class cycles, and unbounded loops — plus a web tool card visualising live
execution and an interactive **Graphs tab** with a drag-to-edit editor and an
FS-backed persistent library.

```
┌── chat ──────────────┐  ┌── Graphs tab ──────────────────────┐
│ …                    │  │ graphs  3 live   17 saved        │
│ ▸ graph: revise-loop │  │ �──────────┐  ┌─────────────────�│
│   ● running 1m12s    │  │ ● revise  │  │ edit · revise   ││
│   ◆ writer  ● 412ms  │  │ ● loop    │  │ ◆ writer ◆ rev… ││
│   ◇ bump    ✓ 18ms   │  │ ✓ demo    │  │ ┌─[SVG]────────┐││
│   ◆ reviewer ● ...   │  │ ✓ arch    │  │ │ ●─→●        │││
│   ↳ step scrubber ▬○─ │  │ ✓ …       │  │ │ ▲   ↺  ●─→● │││
│   ▸ output: {…}      │  │ …         │  │ └──────────────┘││
│                     │  │           │  │ [+ agent][+ js]│
│                     │  │           │  │ [save changes] │
└─────────────────────┘  └───────────┴──┴─────────────────┘
```

---

## Table of contents

1. [Why this plugin](#why-this-plugin)
2. [Concepts](#concepts)
3. [Installation](#installation)
4. [Quick start](#quick-start)
5. [The `graph` tool — full reference](#the-graph-tool--full-reference)
6. [The Graphs tab — what the user sees](#the-graphs-tab--what-the-user-sees)
7. [The interactive editor](#the-interactive-editor)
8. [Persistence on disk](#persistence-on-disk)
9. [For plugin authors — the engine API](#for-plugin-authors--the-engine-api)
10. [Troubleshooting](#troubleshooting)
11. [Compatibility & limitations](#compatibility--limitations)
12. [License](#license)

---

## Why this plugin

Out of the box, DSH gives you one tool per atomic capability (`bash`, `read`,
`web_search`, …). The agent calls tools one after another. For tasks that are
*intrinsically iterative* or *stateful across many steps* — "draft → review →
revise → review → ship" being the canonical example — that model is awkward:
each turn is independent, each tool result is discarded unless the agent
remembers to stuff it into the prompt.

`graph` adds one **model-facing tool** that runs a *whole subprogram* of
agent + JS steps as a single call:

- **State machine semantics**, not a flat pipeline. Nodes run in a topological
  *frontier*; routing can branch back, so cycles and "loop until convergence"
  are first-class. `maxSteps: 0` is genuinely unbounded.
- **Two node kinds**. `agent` nodes delegate to a subagent with its own prompt
  and optional output schema; `js` nodes are pure functions of state.
- **Conditional edges**. An edge can be static (`a → b`) or a router — a small
  JS expression that decides the next node from state.
- **Live visualisation**. A built-in tool card shows topology + per-node state +
  step scrubber. A separate Graphs tab lists every live + saved run and lets
  you open a full editor.
- **Long-term library**. Pass `persist: true` and the definition is saved as
  `<id>.json` under `$DSH_HOME/graphs/`. Open it next session, drag nodes
  around, click to edit code, save back.

If you've used [LangGraph](https://langchain-ai.github.io/langgraph/),
this will feel familiar: same super-step model, same Pregel-style frontier
execution, same "routers are functions" idea.

---

## Concepts

| Term | Meaning |
|---|---|
| **Graph** | A spec: `name`, `entry`, `nodes[]`, `edges[]`, `maxSteps?`. Lives either transiently (one-shot) or on disk (`.json` in the library). |
| **Node** | Either `type: "agent"` (delegates to a subagent) or `type: "js"` (pure state transform). Has `id`, `writeTo?`, `prompt`/`code`, `outputSchema?`. |
| **Edge** | Either `{from, to}` (static) or `{from, router}` (conditional — runs a JS expression `(state, info) => nodeId \| "END" \| [nodeIds]`). |
| **Super-step** | One frontier execution: all currently-frontier nodes run **in parallel**, all read the same step-start state, writes merge at step end. |
| **Routing** | After each super-step, every just-finished node's outgoing edges (static ∪ router result) determine the next frontier. Loops form naturally. |
| **`END`** | Reserved edge target meaning "this branch finished." The run ends when every branch hits END. |
| **One-shot vs persistent** | Default runs are ephemeral. Pass `persist: true` and the spec survives in the library. |
| **Library** | The on-disk store of saved graphs. Each file is one graph, keyed by id (default: derived from `name`). |
| **Graphs tab** | The conversation-view sidebar panel that lists live + saved graphs and opens the editor/viewer. |

---

## Installation

The package is **host-plane + client module**. DSH loads it as soon as the
package is visible to the profile and the profile has a row that mounts it.

### 1. Make the package visible

Add the package to the profile's module pool. The cleanest way is a symlink
into the shared pool (matches what `dsh plugin` does):

```sh
# Symlink the plugin into the shared pool
ln -sfn /Users/max_yang/Projects/AI_Projects/dsh-plugins/plugins/graph \
        ~/.dsh/profiles/node_modules/@dsh-plugins/graph

# (Optionally also into the specific profile)
mkdir -p ~/.dsh/profiles/web/node_modules/@dsh-plugins
ln -sfn /Users/max_yang/Projects/AI_Projects/dsh-plugins/plugins/graph \
        ~/.dsh/profiles/web/node_modules/@dsh-plugins/graph
```

> The package ships with a `publishConfig.access: "public"`, so it's also
> publishable to npm with `npm publish --workspace=@dsh-plugins/graph`.

### 2. Add the host row

Append to `~/.dsh/profiles/web/cordis.patch.yml` (or any patch layer the profile
composes — bundles resolve first, then per-profile patches). Use the
**id-less insert** form so the row is appended to the top-level list:

```yaml
# ~/.dsh/profiles/web/cordis.patch.yml

# LangGraph-style `graph` model tool — agent + JS state graphs with cycles
# and unbounded loops. Host-plane, visible to every agent in every preset.
- insert:
    - id: tool-graph
      name: '@dsh-plugins/graph'
      config:
        provider: spawn     # subagent backend: spawn-in-process
        maxParallel: 6      # agent nodes concurrently per super-step
```

> The tool publishes no Cordis Service and registers no slots, so it sits
> loose in the host composition without needing an isolate realm.

### 3. Restart `dsh web`

```sh
dsh web --profile web
```

The host row mounts, the `graph` tool becomes callable in every session, and
the `dsh.client` module scan picks up `client.js` and renders the tool card.

To also get the **Graphs tab** (interactive editor + saved-graph viewer),
mount the dynamic variant — see
[Mounting the Graphs tab](#mounting-the-graphs-tab) below.

---

## Quick start

In any DSH session, ask the agent to run a simple graph:

> Please call the `graph` tool with this spec, with `persist: true`:
>
> - name: "hello-loop"
> - entry: "greet"
> - nodes:
>   - {id: "greet", type: "js", code: "return {n: (state.n ?? 0) + 1, msg: 'hello #' + (state.n ?? 0 + 1)}"}
> - edges:
>   - {from: "greet", router: "return state.n >= 3 ? 'END' : 'greet'"}
> - maxSteps: 0

Watch the tool card render:

- A pulsing **running** badge.
- The static topology with the entry node lit up.
- A **step scrubber** at the bottom — drag it to replay each super-step.
- The `js` node outputs (the `n` counter and `msg` text) once it settles.
- The `endReason` flips to `end` and the badge turns green.

Now click **Graphs** in the conversation's right rail. You'll see the run listed
under "live", settle into "saved" with name **hello-loop**, and be openable
for editing.

---

## The `graph` tool — full reference

### Parameters

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `name` | string | no | `"graph"` | Display label; used to derive the persisted id (when `persist: true`). |
| `entry` | string | **yes** | — | The node id that runs first. |
| `nodes` | array | **yes** | — | At least one node. |
| `edges` | array | no | `[]` | Routing edges. |
| `state` | object | no | `{}` | Initial shared state (any plain JSON value). |
| `maxSteps` | integer | no | `100` | Super-step budget. `0` = unlimited. |
| `persist` | boolean | no | `false` | When `true` and `steps > 0`, saves the spec to the library. |
| `dryRun` | boolean | no | `false` | Validate only, returns `{endReason: "dry-run", issues, loops}`. |

**Node** schema:

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique within the graph. |
| `type` | `"agent"` \| `"js"` | Required. |
| `writeTo` | string | State key to store the node's output under. Defaults to the node id. |
| `description` | string | Free-form label. |
| `prompt` | string | (agent only) Template; `{{state.path.to.value}}` interpolates from the step-start state. |
| `outputSchema` | object | (agent only) Object-rooted JSON schema; the subagent's structured result is captured. |
| `persona` | string | (agent only) Per-node persona overriding the parent's persona for this child only. |
| `code` | string | (js only) Function body `(state, info) => value`. Async is awaited; plain objects are shallow-merged into state. |

**Edge** schema:

| Field | Type | Notes |
|---|---|---|
| `from` | string | Required. |
| `to` | string | Static target — the id of another node, or `"END"`. |
| `router` | string | Conditional: function body `(state, info) => nodeId \| "END" \| [nodeIds]`. Return an array for fan-out. Mutually exclusive with `to`. |

### Return schema (canonical)

```json
{
  "endReason": "end" | "max-steps" | "aborted" | "error" | "dry-run",
  "steps": 0,
  "state": { "...": "..." },
  "trace": [
    {
      "step": 1,
      "nodes": [
        { "id": "writer", "status": "ok" | "error", "ms": 412 }
      ],
      "next": ["reviewer"]
    }
  ],
  "issues": ["..."],          // only on dry-run
  "loops": "acyclic | ...",   // only on dry-run
  "error": "..."              // only on error
}
```

The host adds a `nodeOutputs` projection into `ToolResultNode.meta` (so the web
card can render full values without parsing the render text). It's `{nodeId: value}`
with each value capped at ~4 KB; values longer than that are replaced by
`{__truncated: true, preview: "..."}`.

### Edge cases & guarantees

- **Cycles are allowed.** `maxSteps: 0` is genuinely unbounded — the run ends only
  on `END` routing, exec signal abort, or a thrown error.
- **All-frontier nodes run in parallel** in each super-step, up to `maxParallel`
  (default 6 agent slots per step). `js` nodes also respect this gate.
- **Router expressions are sync.** Returning a Promise is a hard error.
- **Dry-run never executes nodes.** It returns `{endReason: "dry-run", issues, loops}`
  where `loops` describes whether the static graph is acyclic / has static cycles /
  has conditional edges.
- **JS node contract**: the `code` body receives `(state, info)` and returns
  - a plain object → shallow-merged into state (when `writeTo` is unset),
  - any other value → stored under `writeTo ?? id` in state,
  - a Promise → awaited.

---

## The Graphs tab — what the user sees

The dynamic variant (`src/dynamic-client.js`) adds a `conversation.view` slot
with key `"graphs"`. Once mounted, a **Graphs** tab appears in the
conversation's right rail showing:

- **Header** — live count, saved count.
- **Left pane (list)** — one row per graph:
  - `● name` for live runs (still in flight)
  - `✓ name` for saved graphs (in the library)
  - sub-line: status / node+edge count / `savedAt` timestamp.
- **Right pane (viewer)** — once you click a row:
  - Static topology (BFS layered, cycles legible, conditional routers as dashed stubs).
  - **Live**: a streaming chips strip showing which agent nodes are running,
    their elapsed time, and a capped preview of what each finished node produced.
  - **Saved (edit mode)**: a draggable canvas with node port circles.
  - A details panel below the SVG for the currently selected node or edge.
  - **open agent session** button on live nodes — opens the child session in the
    main conversation view via `sessions.openSubagent`.

### Mounting the Graphs tab

The host row installs the *tool* but not the *tab*. To mount the tab (and the
interactive editor), you need the dynamic variant running.

The package ships the dynamic half under `src/dynamic-host.js` +
`src/dynamic-client.js`. They are designed to be pasted into a
`cordis_define` + `cordis_run` cycle inside any session.

If you want the tab in the current session right now, just ask the agent:

> Please mount the `@dsh-plugins/graph` dynamic variant in this session.
> Read `src/dynamic-host.js` and `src/dynamic-client.js` from
> `~/.d.../plugins/graph/` and pass them as `code.host` / `code.client` to a
> `cordis_define` call. Then `cordis_run` the returned package id.

The agent has the file-reading tools to do it without you transcribing 65 KB.

---

## The interactive editor

Click any saved graph → the right pane shows the **edit** badge. You can:

- **Drag a node** — pointer-down anywhere on the node body, drag, release.
- **Drag from a port** — the small circle at each node's left or right edge.
  Drop on another node's port to create a static edge.
- **Add a node** — `+ agent` / `+ js` buttons. The new node gets a unique id
  (`node1`, `node2`, … or `js1`, …) and lands at a default position.
- **Delete** — select a node or edge and press `Delete` / `Backspace`, or use the
  red button in the side panel. Deleting a node also deletes every edge that
  references it (from or to) and reassigns the entry if it was the entry.
- **Edit an edge** — click it. The panel shows:
  - **static** mode → pick the target node from a dropdown (default: the entry).
  - **router** mode → write a JS expression in a textarea; defaults to `return "END"`.
  - Delete the edge.
- **Reset layout** — discards drag offsets and recomputes the BFS layout.
- **Save changes** — writes the working copy back via `graphLibrary.update`.
  The button is dirty-tinted until you save; press it to persist; the underlying
  file's `updatedAt` advances.

The editor is read-only while it loads (no half-rendered state mid-fetch).

---

## Persistence on disk

When `persist: true` is set, the host saves a JSON file under:

```
$DSH_HOME/graphs/<id>.json   # primary
~/.dsh/graphs/<id>.json      # fallback when DSH_HOME is unset
```

File format (atomic write via `tmp` + `rename`):

```json
{
  "version": "graph-library@1",
  "id": "hello-loop",
  "name": "hello-loop",
  "savedAt": "2026-08-18T17:30:11.502Z",
  "updatedAt": "2026-08-18T17:42:03.811Z",
  "spec": {
    "name": "hello-loop",
    "entry": "greet",
    "nodes": [{ "id": "greet", "type": "js", "code": "return {n: ...}" }],
    "edges": [{ "from": "greet", "router": "return state.n >= 3 ? 'END' : 'greet'" }],
    "maxSteps": 0
  },
  "runtime": {
    "lastEndReason": "end",
    "lastSteps": 4,
    "lastRunAt": "2026-08-18T17:30:11.490Z",
    "lastEditedAt": "2026-08-18T17:42:03.808Z"
  }
}
```

The `runtime` block is preserved across edits — only `spec` changes when you save.
Malformed files (bad JSON, missing `id`) are skipped by `list` — they don't
crash the tab, they just disappear from the count.

To delete a saved graph by hand:

```sh
rm ~/.dsh/graphs/<id>.json
```

---

## For plugin authors — the engine API

If you want to embed the graph engine in your own plugin (the host tool is just
a thin wrapper), `lib/engine.js` and `lib/editor.js` are both importable,
zero-dependency, fully testable modules.

### `runGraph(spec, hooks, signal)`

Executes a graph spec to completion with the supplied hooks.

```js
import { runGraph } from "@dsh-plugins/graph/engine";

const outcome = await runGraph(spec, {
  runAgent: async (node, promptText, label) => {
    // delegate to your subagent backend; return
    // { structured?, text, stopReason }
  },
}, execSignal);
// outcome: { endReason, steps, state, trace, error? }
```

### `applyEdit(spec, edit)` and `defaultNodePosition(spec, id)`

Pure graph editing primitives used by the editor. Useful if you want to build
your own UI on top.

```js
import { applyEdit, defaultNodePosition } from "@dsh-plugins/graph/engine";

const next = applyEdit(current, {
  type: "addNode",
  nodeType: "agent",
});
const pos = defaultNodePosition(next, "node3");
```

Supported edit types: `setName`, `setEntry`, `addNode`, `deleteNode`,
`addEdge` (static or router), `deleteEdge`, `setEdgeStatic`, `setEdgeRouter`.
Bad edits (unknown id, duplicate edge, invalid router code) are no-ops.

### Host-side: the `graphLibrary` Cordis Service

```js
ctx.provide("graphLibrary", libraryInstance);
// library methods: list, get(id), save({spec, runtime?, id?, forceId?}),
// update(id, patch), remove(id)
```

Other host plugins can inject `ctx.graphLibrary` to read or modify saved graphs
— for example, a "graph-of-the-week" digest, an export-to-dot command, etc.

---

## Troubleshooting

**The graph tool isn't available in any session.**
The host row wasn't loaded. Check that `cordis.patch.yml` (or your profile's
patch layer) has the `- insert: [{id: tool-graph, name: '@dsh-plugins/graph', config: {...}}]`
form, then restart `dsh web`.

**The Graphs tab is missing.**
The static row mounts the tool, not the tab. The tab needs the dynamic variant.
Mount `src/dynamic-client.js` as a cordis plugin in your session, or publish
the package to npm and let the dsh.client scan pick it up after restart.

**A saved graph disappeared.**
Files at `$DSH_HOME/graphs/` (or `~/.dsh/graphs/`) — the file might be
malformed (invalid JSON). The library skips malformed files silently. Run
`node -e 'JSON.parse(require("fs").readFileSync(".../<id>.json", "utf8"))'`
to confirm.

**Drag-and-connect doesn't work in the editor.**
Make sure you're dragging from a **port circle** (the small dot at the node's
left or right edge). Dragging the node body moves the node; dragging the
port draws a temporary dashed edge.

**Save fails with "save returned no record".**
The dynamic host RPC `graphLibrary.update` isn't mounted. The most likely
cause: your dynamic plugin only has the *client* half (client.js is loaded
automatically) but no *host* half registering the RPCs. Re-mount the
dynamic variant — both halves are required for the editor to save.

**The router returned the wrong node.**
Router expressions must be **synchronous** and **return a string** (or `"END"`,
or an array of strings). Returning a Promise is a hard error. Use `state.<key>`
(not `getState()`) — the router receives a frozen state snapshot.

**An agent node is hanging forever.**
The engine passes `exec.signal` into `hooks.runAgent`. Make sure your backend
forwards the signal to its subagent and respects abort. By default the agent
loop's own abort handling kicks in when the parent call is cancelled.

---

## Compatibility & limitations

- DSH runtime ≥ `0.1.0-rc.7` (the version this plugin was built against).
- Node ≥ 18, React ≥ 18.2.0 (peer).
- The graph engine is **single-process**. There is no clustering, no
  cross-process run state. Live aggregation is in-memory.
- The library is **per-`DSH_HOME`**. There is no multi-user isolation and no
  encryption at rest. Treat `~/.dsh/graphs/` like a workspace artifact, not a
  secret store.
- The library **skips malformed files** silently — it doesn't quarantine them.
  If you need that, run your own sweep on the dir.
- No multi-tenant write serialization — two agents editing the same graph
  in parallel will race. The editor is designed for single-user interaction.

---

## License

[MIT](../../LICENSE) — see the repository root.
