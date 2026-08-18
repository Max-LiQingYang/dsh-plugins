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

Then add a row — in an **agent preset** (recommended; see below) or in the profile's
`cordis.patch.yml`:

```yaml
- id: tool-graph
  name: '@dsh-plugins/graph'
  config:
    provider: spawn     # host subagent provider
    maxParallel: 6      # agent-node concurrency cap per super-step
```

The row publishes no services, so it needs no isolate realm; the `subagents` registry and its
providers stay on the host plane. Start a session on the preset and the `graph` tool is callable.

> If you mount it via a copied `cordis` preset, note `tool-cordis` registers fixed-id providers in
> the process-global inspect registry, so that copy cannot mount while a stock `cordis`-preset
> session is live in the same process. Keep `tool-cordis` disabled in such copies.

## Config

| field | default | meaning |
|---|---|---|
| `provider` | `spawn` | host `subagents` provider used by `agent` nodes |
| `maxParallel` | `6` | concurrent agent nodes per super-step |

## Test

```sh
node test/engine.test.mjs   # 24 headless assertions: cycles, routing, fan-out, maxSteps, abort
```

## Trust

`js` node and `router` code is model-authored JavaScript executed in the harness host process —
the same trust boundary as the `bash` tool. Keep it pure (state in, value out); agents do the
real work.
