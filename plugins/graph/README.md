# @dsh-plugins/graph

A **graph work mode** for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), modeled on
[LangGraph](https://langchain-ai.github.io/langgraph/): the agent authors a state graph — nodes, static and
conditional edges, **cycles allowed** — and the `graph` tool executes it to completion. Unlike the repo's
client plugins, this is a **host-plane tool plugin**: it registers a model-facing Cordis tool and delegates
`agent` nodes to real subagents through the host `subagents` registry (`spawn` provider).

## Semantics (super-step / Pregel, like LangGraph)

- Every step runs the whole frontier **concurrently** (bounded by `maxParallel`, default 6).
- Nodes of one step all read the SAME step-start state snapshot; writes merge at step end.
- Routing then computes the next frontier — cycles are first-class, so loops
  (draft → review → revise …) run until routing reaches `END`.
- `maxSteps` defaults to 100 as a safety valve; `maxSteps: 0` is **genuinely unbounded**.
- A failed node fails the run LangGraph-style, returning partial state and a full step trace.
- `dryRun: true` validates the graph and reports cycle detection without executing.

### Node types

| type | runs | writes |
|---|---|---|
| `agent` | one subagent delegation (`outputSchema`, `persona`, `{{state.path}}` prompt template) | `structured ?? text` under `writeTo ?? id` |
| `js` | pure `(state, info) => patchObject \| value` | patch shallow-merged, or value under `writeTo ?? id` |

### Edges

- static: `{ from, to }` — `to: "END"` ends that branch;
- conditional: `{ from, router }` — synchronous `(state, info) => nodeId | "END" | [nodeIds]`;
  fan-out arrays are supported, and several edges may leave one node (all are taken).

Example — the classic revise loop:

```json
{
  "name": "revise-loop",
  "entry": "writer",
  "maxSteps": 0,
  "nodes": [
    { "id": "writer",   "type": "agent", "prompt": "Revise per review: {{review.comment}}" },
    { "id": "reviewer", "type": "agent",
      "outputSchema": { "type": "object", "properties": { "pass": { "type": "boolean" }, "comment": { "type": "string" } },
                        "required": ["pass", "comment"], "additionalProperties": false } }
  ],
  "edges": [
    { "from": "writer",   "to": "reviewer" },
    { "from": "reviewer", "router": "return state.reviewer.pass ? \"END\" : \"writer\"" }
  ]
}
```

## Install

### Option A — dynamic plugin (single session, no restart)

Read `lib/index.js` and use the Cordis toolset (`cordis_define` / `cordis_run`) to register it as a
dynamic host plugin for the current process.

### Option B — composition row (persistent)

The package is deliberately **zero-dependency** (it imports nothing and consumes only injected
Cordis services `tools` and `subagents`), so it can be linked into the profile's module pool
without duplicating a module instance of the runtime's own packages:

```sh
# from this repo's root
ln -s "$PWD/plugins/graph" ~/.dsh/profiles/node_modules/@dsh-plugins/graph
```

Then mount it HOST-PLANE in the profile's `~/.dsh/profiles/web/cordis.patch.yml`, so
EVERY agent in every preset gets the `graph` tool as an ordinary harness tool. New
top-level rows go in an id-less `insert` entry (a bare `- id: …` patch entry is an
override of an existing row, not an insert):

```yaml
- insert:
    - id: tool-graph
      name: '@dsh-plugins/graph'
      config:
        provider: spawn     # host subagent provider
        maxParallel: 6      # agent-node concurrency cap per super-step
```

Verify without booting with `dsh --profile web --dump-config`, then restart `dsh web`.
The row publishes no services, so it needs no isolate realm; the `subagents` registry
and its providers stay on the host plane, and the tool registers into the layered
`tools` registry where every agent sees it.

## Config

| field | default | meaning |
|---|---|---|
| `provider` | `spawn` | host `subagents` provider used by `agent` nodes |
| `maxParallel` | `6` | concurrent agent nodes per super-step |

## Visualization (web tool card)

The package ships a client half (`client.js`, declared via `dsh.client`) that
registers a keyed `tool.call.toolview` for the wire tool name `graph`, so every
`graph` call renders as a card in the DSH web conversation instead of the
generic JSON row:

- **Topology** — layered layout by BFS distance from the entry (cycles stay
  legible: back-edges dip below as bezier arcs, self-loops arc overhead).
  `agent` nodes are brand-stroked ◆, `js` nodes plain ◇, the entry is labeled,
  static edges are solid arrows, conditional `router` edges dashed stubs.
- **Live state** — while the call runs the card pulses with the topology
  parsed straight from the frozen call args (`argsRaw`).
- **Settled replay** — the structured result reaches the card through the
  host tool's `presentationMeta` projection (the `meta` of the tool/result
  node): per-node run counts and durations (`×3 4.2s`), an endReason badge,
  and a **step scrubber** that replays each super-step (which frontier ran,
  where routing went) with the traversed edge highlighted — loops visibly
  walk backwards. `state & trace` expands the final state JSON.
- **Agent outputs** — the projection also carries `nodeOutputs` (per-node
  final values, ~4KB capped each): the scrubber shows what every node of the
  current step produced, and clicking a node (or its output row) opens its
  full output panel.
- **Runtime info (dynamic variant)** — the host tool broadcasts `graph/*`
  lifecycle events (run-start, node-start, node-end, run-end) over the Cordis
  bus; `src/dynamic-host.js` folds them and serves a `graph.live` package
  RPC, which the card polls while its call runs: live agent chips show which
  node's agent is running, its elapsed time, and completed outputs as they
  land (capped previews). The module variant degrades to topology + pulse
  while running.
- Dry-run calls render their validation issues and cycle report; failed calls
  render the error text.

The card needs no host events or polling: it is a pure function of the frozen
`ToolCallBlock`. Load it either as a client module (the `dsh.client` scan, after
restart) or as a dynamic single-process trial: paste `src/dynamic-client.js`
into a `cordis_define` `code.client` and `cordis_run` it. The two variants are
functionally identical — keep them in sync.

## Test

```sh
node test/engine.test.mjs        # 24 assertions: cycles, routing, fan-out, maxSteps, abort
node test/client.test.mjs        # 27 assertions: card helpers (parse/layout/fold/outputs/live-pick)
node test/dynamic-host.test.mjs  # 9 assertions: live aggregator fold (events → graph.live snapshot)
```

## Trust

`js` node and `router` code is model-authored JavaScript executed in the harness host process —
the same trust boundary as the `bash` tool. Keep it pure (state in, value out); agents do the
real work.
