/**
 * `@dsh-plugins/graph` — a LangGraph-style graph work mode for DeepSeek Harness.
 *
 * Registers one model-facing tool, `graph`: the model authors a state graph
 * (nodes, static and conditional edges, cycles allowed) and the tool executes
 * it over super-steps. `agent` nodes are real subagent delegations through the
 * host `subagents` registry; `js` nodes and routers are pure state functions.
 *
 * The package is deliberately ZERO-DEPENDENCY: it imports nothing, so it can
 * be linked into any profile without duplicating a module instance of the
 * runtime's own packages. It consumes only injected Cordis services
 * (`tools`, `subagents`) and publishes no services, so its preset row needs
 * no isolate realm.
 *
 * Plugin shape mirrors `@deepseek-ai/dsh-tool-todo`: named exports
 * `name` / `inject` / `apply`.
 */

import { runGraph, validateGraph, textOfBlocks } from './engine.js'

export const name = 'tool-graph'

export const inject = ['tools', 'subagents']

const DESCRIPTION = `Run a LangGraph-style state graph that orchestrates subagents. Use it when the work is a GRAPH, not a pipeline: iterative loops (draft → review → revise until a verdict passes), state machines with conditional routing, or parallel branches that merge. For simple one-shot fan-out, plain subagent calls or the workflow tool fit better.

The graph rides the parameters as JSON:
- nodes: { id, type } where type is:
  - "agent" — one subagent delegation. Optional: prompt (template, {{dotted.state.path}} interpolates from shared state; omit for an auto prompt embedding the state), outputSchema (object-rooted JSON Schema for structured output), writeTo (state key for the result; default the node id), persona, description (label).
  - "js" — a pure transform. code is the body of (state, info) => value: return a plain object to PATCH state (shallow merge), or any other value to store under writeTo ?? id. info = { step, graph, node, visited }.
- edges: { from, to } static (to: "END" ends that branch) or { from, router } conditional — router is the body of a SYNCHRONOUS (state, info) => nodeId | "END" | [nodeIds] function; several edges may leave one node and all are taken (static ∪ router results) for parallel fan-out.
- entry: the starting node id. state: initial shared JSON object. maxSteps: super-step budget, default 100; set 0 for UNLIMITED — cycles are first-class and the graph loops until routing reaches END or the call is cancelled.
- dryRun: validate without executing (returns issues and whether cycles exist).

Semantics: super-step execution like LangGraph/Pregel. Every step runs all frontier nodes CONCURRENTLY (bounded), each reading the SAME step-start state snapshot; writes merge at step end (later node ids in the frontier overwrite shared keys). A failed node fails the run with partial state and a full trace, LangGraph-style. Results: { endReason: end | max-steps | aborted | error | dry-run, steps, state, trace }.

js node and router code run inside the harness host process — keep them pure (state in, value out), no I/O; the agents do the work.`

const PARAMETERS = {
  type: 'object',
  additionalProperties: false,
  required: ['entry', 'nodes', 'edges'],
  properties: {
    name: { type: 'string', description: 'Short kebab-case graph name, used in labels and trace.' },
    dryRun: { type: 'boolean', description: 'Validate the graph without executing nodes. Returns issues and cycle detection.' },
    entry: { type: 'string', description: 'Node id where execution starts.' },
    state: { type: 'object', additionalProperties: true, description: 'Initial shared state (plain JSON object).' },
    maxSteps: { type: 'integer', description: 'Super-step budget. Default 100. 0 = unlimited (truly unbounded loop until END routing or cancellation).' },
    nodes: {
      type: 'array',
      description: 'Graph nodes. agent = subagent delegation; js = pure state transform.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'type'],
        properties: {
          id: { type: 'string', description: 'Unique node id; also the default state key for its result.' },
          type: { type: 'string', enum: ['agent', 'js'], description: 'agent runs a subagent; js runs code.' },
          description: { type: 'string', description: 'Short human label for the node.' },
          prompt: { type: 'string', description: 'agent: prompt template; {{state.path}} interpolates from shared state.' },
          outputSchema: { type: 'object', additionalProperties: true, description: 'agent: object-rooted JSON Schema for structured output (recommended: routed graphs read structured verdicts, not prose).' },
          writeTo: { type: 'string', description: 'State key to store this node result under (default: node id; required for non-patch js returns to avoid collisions).' },
          persona: { type: 'string', description: 'agent: per-child persona shadowing the deployment persona.' },
          code: { type: 'string', description: 'js: body of (state, info) => patchObject | value.' },
        },
      },
    },
    edges: {
      type: 'array',
      description: 'Static and conditional edges. Exactly one of to | router per edge.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['from'],
        properties: {
          from: { type: 'string', description: 'Source node id.' },
          to: { type: 'string', description: 'Static target node id, or "END" to finish this branch.' },
          router: { type: 'string', description: 'Conditional: body of sync (state, info) => nodeId | "END" | [nodeIds].' },
        },
      },
    },
  },
}

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['endReason', 'steps', 'state', 'trace'],
  properties: {
    endReason: { type: 'string', enum: ['end', 'max-steps', 'aborted', 'error', 'dry-run'] },
    steps: { type: 'integer' },
    state: { type: 'object', additionalProperties: true },
    trace: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['step', 'nodes', 'next'],
        properties: {
          step: { type: 'integer' },
          nodes: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'status'],
              properties: {
                id: { type: 'string' },
                status: { type: 'string', enum: ['ok', 'error'] },
                ms: { type: 'integer' },
                summary: { type: 'string' },
              },
            },
          },
          next: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    issues: { type: 'array', items: { type: 'string' } },
    loops: { type: 'string' },
    error: { type: 'string' },
    pendingFrontier: { type: 'array', items: { type: 'string' } },
  },
}

const STATE_BYTE_CAP = 200000

/** Cap an oversized final state instead of blowing the tool-result budget. */
function capState(state) {
  const text = JSON.stringify(state)
  if (text.length <= STATE_BYTE_CAP) return state
  return { __truncated: true, preview: text.slice(0, STATE_BYTE_CAP) }
}

/** Bounded-concurrency gate for agent nodes within one super-step. */
function limiter(max) {
  let active = 0
  const queue = []
  const pump = () => {
    while (queue.length > 0 && active < max) {
      active += 1
      queue.shift()()
    }
  }
  return async function run(fn) {
    await new Promise((resolve) => {
      queue.push(resolve)
      pump()
    })
    try {
      return await fn()
    } finally {
      active -= 1
      pump()
    }
  }
}

export function apply(ctx, config) {
  const provider = config?.provider ?? 'spawn'
  const maxParallel = typeof config?.maxParallel === 'number' && config.maxParallel > 0 ? config.maxParallel : 6

  ctx.tools.register({
    name: 'graph',
    description: DESCRIPTION,
    parameters: PARAMETERS,
    output: {
      schema: OUTPUT_SCHEMA,
      // Pure projection riding the tool/result event as `meta`, so the web
      // tool card (client.js, key "graph") renders the structured outcome —
      // trace, state, endReason — instead of parsing render() text.
      presentationMeta: (_args, value) => value,
      render: (_args, value) => {
        const name = _args?.name ?? 'graph'
        const parts = [`${name}: ${value.endReason} after ${value.steps} step(s)`]
        if (value.error !== undefined) parts.push(`error: ${value.error}`)
        if (Array.isArray(value.issues) && value.issues.length > 0) parts.push(`issues: ${value.issues.length}`)
        if (value.loops !== undefined) parts.push(value.loops)
        const keys = value.state && typeof value.state === 'object' ? Object.keys(value.state).join(', ') : ''
        if (keys !== '') parts.push(`state: ${keys}`)
        return [{ type: 'text', text: parts.join(' | ') }]
      },
    },
    isConcurrencySafe: () => true,
    presentCall: (args) => {
      if (typeof args !== 'object' || args === null) return undefined
      return {
        card: 'generic',
        title: `graph: ${args.name ?? '(unnamed)'}`,
        kind: 'other',
        rawInput: {
          nodes: Array.isArray(args.nodes) ? args.nodes.length : 0,
          edges: Array.isArray(args.edges) ? args.edges.length : 0,
          entry: args.entry,
          dryRun: args.dryRun === true,
        },
      }
    },
    async execute(args, exec) {
      const issues = validateGraph(args)
      if (issues.length > 0) {
        return {
          endReason: 'dry-run',
          steps: 0,
          state: {},
          trace: [],
          issues,
        }
      }
      if (!exec.agent) throw new Error('graph requires a calling agent session (exec.agent was undefined)')

      const gate = limiter(maxParallel)
      const hooks = {
        runAgent: (node, promptText, label) => gate(async () => {
          const run = await ctx.subagents.start(provider, {
            label: `graph:${label}`,
            prompt: [{ type: 'text', text: promptText }],
            parent: exec.agent,
            signal: exec.signal,
            ...(node.outputSchema !== undefined ? { outputSchema: node.outputSchema } : {}),
            ...(node.persona !== undefined ? { persona: node.persona } : {}),
          })
          try {
            const result = await run.result
            return {
              structured: result.structured,
              text: textOfBlocks(result.output),
              stopReason: result.stopReason,
            }
          } finally {
            await Promise.resolve(run.dispose()).catch(() => {})
          }
        }),
      }

      const outcome = await runGraph(args, hooks, exec.signal)
      const state = capState(outcome.state)
      return { ...outcome, state }
    },
  })
}
