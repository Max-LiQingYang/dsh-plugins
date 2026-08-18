/**
 * Pure graph engine for `@dsh-plugins/graph`. Zero dependencies: no imports at all.
 *
 * LangGraph-style state machine over super-steps (Pregel semantics):
 *  - the nodes of one step all read the SAME step-start state snapshot;
 *  - their writes merge into state at the END of the step;
 *  - routing then computes the next frontier from static edges and router
 *    functions, and CYCLES ARE FIRST-CLASS — the loop runs until the frontier
 *    empties (every branch reached END), a step budget trips, or the caller
 *    aborts. `maxSteps: 0` means genuinely unbounded.
 *
 * Everything environment-specific (subagents, timers, logging) is injected
 * through `hooks`, so the engine is unit-testable headlessly with fakes.
 */

const END = 'END'

class GraphError extends Error {
  constructor(message, nodeId) {
    super(nodeId === undefined ? message : `${message} (at node "${nodeId}")`)
    this.name = 'GraphError'
    this.nodeId = nodeId
  }
}

/** True for plain objects (not arrays, not null). */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Read a dotted path like "review.verdict" from state; undefined when absent. */
function readPath(state, path) {
  let current = state
  for (const part of path.split('.')) {
    if (!isPlainObject(current)) return undefined
    current = current[part]
  }
  return current
}

/** String form of a template value: objects JSON, others String(). */
function templateValue(value) {
  if (value === undefined) return 'undefined'
  if (isPlainObject(value) || Array.isArray(value)) return JSON.stringify(value)
  return String(value)
}

/**
 * Interpolate `{{ path.to.value }}` references against state. Unknown paths
 * interpolate as `undefined` (visible to the model, better than failing).
 */
function interpolate(template, state) {
  return template.replace(/\{\{\s*([A-Za-z0-9_.$-]+)\s*\}\}/g, (_m, path) =>
    templateValue(readPath(state, path)),
  )
}

/** Compile a user JS body into an async-capable function of (state, info). */
function compileUserCode(code, kind, nodeId) {
  if (typeof code !== 'string' || code.trim() === '') {
    throw new GraphError(`${kind} requires a non-empty code string`, nodeId)
  }
  try {
    return new Function('state', 'info', `"use strict"\n${code}`)
  } catch (error) {
    throw new GraphError(`${kind} code failed to compile: ${error.message}`, nodeId)
  }
}

/** Await a sync-or-thenable user result; reject GraphError on throw. */
async function invokeUser(fn, state, info, kind, nodeId) {
  let value
  try {
    value = fn(state, info)
    if (value && typeof value.then === 'function') value = await value
  } catch (error) {
    throw new GraphError(`${kind} threw: ${error?.message ?? String(error)}`, nodeId)
  }
  return value
}

/** Concatenated text of a ContentBlock[] (text blocks only). */
function textOfBlocks(blocks) {
  if (!Array.isArray(blocks)) return ''
  return blocks
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n')
}

/** First ~200 chars of a node result, for the trace. */
function summarizeValue(value) {
  let text
  if (isPlainObject(value) || Array.isArray(value)) text = JSON.stringify(value)
  else if (value === undefined) text = 'undefined'
  else text = String(value)
  return text.length > 200 ? `${text.slice(0, 200)}…` : text
}

/**
 * Structural validation shared by dry-run and execution.
 * @returns {string[]} issues; empty means the graph is executable.
 */
export function validateGraph(spec) {
  const issues = []
  const nodes = spec?.nodes
  if (!Array.isArray(nodes) || nodes.length === 0) {
    issues.push('nodes must be a non-empty array')
    return issues
  }
  const ids = new Set()
  for (const node of nodes) {
    if (!isPlainObject(node)) { issues.push('every node must be an object'); continue }
    if (typeof node.id !== 'string' || node.id === '') issues.push(`node id must be a non-empty string: ${JSON.stringify(node.id)}`)
    else if (ids.has(node.id)) issues.push(`duplicate node id "${node.id}"`)
    else ids.add(node.id)
    if (node.type !== 'agent' && node.type !== 'js') issues.push(`node "${node.id}": type must be "agent" or "js"`)
    if (node.type === 'js' && (typeof node.code !== 'string' || node.code.trim() === '')) issues.push(`js node "${node.id}" requires code`)
    if (node.type === 'agent' && typeof node.prompt !== 'undefined' && typeof node.prompt !== 'string') issues.push(`agent node "${node.id}": prompt must be a string`)
    if (typeof node.writeTo !== 'undefined') {
      if (typeof node.writeTo !== 'string' || node.writeTo === '' || node.writeTo.includes('.')) issues.push(`node "${node.id}": writeTo must be a plain key without dots`)
      else if (node.writeTo === 'END') issues.push(`node "${node.id}": writeTo may not be "END"`)
    }
  }
  if (typeof spec.entry !== 'string' || !ids.has(spec.entry)) issues.push(`entry "${spec.entry}" is not a known node id`)
  const edges = spec?.edges
  if (!Array.isArray(edges) || edges.length === 0) issues.push('edges must be a non-empty array')
  else {
    for (let i = 0; i < edges.length; i += 1) {
      const edge = edges[i]
      if (!isPlainObject(edge)) { issues.push(`edge #${i} must be an object`); continue }
      if (typeof edge.from !== 'string' || !ids.has(edge.from)) issues.push(`edge #${i}: from "${edge.from}" is not a known node id`)
      const hasTo = typeof edge.to !== 'undefined'
      const hasRouter = typeof edge.router !== 'undefined'
      if (hasTo === hasRouter) issues.push(`edge #${i} (from "${edge.from}"): exactly one of to or router is required`)
      if (hasTo && edge.to !== END && !ids.has(edge.to)) issues.push(`edge #${i}: to "${edge.to}" is neither a known node id nor "END"`)
      if (hasRouter && typeof edge.router !== 'string') issues.push(`edge #${i}: router must be a code string`)
    }
  }
  if (spec.state !== undefined && !isPlainObject(spec.state)) issues.push('state must be a plain JSON object')
  if (spec.maxSteps !== undefined && (typeof spec.maxSteps !== 'number' || !Number.isInteger(spec.maxSteps) || spec.maxSteps < 0)) issues.push('maxSteps must be a non-negative integer (0 = unlimited)')
  return issues
}

/** Whether the edge graph contains at least one cycle (reported on dry-run). */
export function hasCycle(spec) {
  const ids = spec.nodes.map((n) => n.id)
  const adjacency = new Map(ids.map((id) => [id, []]))
  for (const edge of spec.edges ?? []) {
    if (typeof edge.from === 'string' && typeof edge.to === 'string' && edge.to !== END) {
      adjacency.get(edge.from)?.push(edge.to)
    }
  }
  const state = new Map()
  const visit = (id) => {
    const mark = state.get(id)
    if (mark === 1) return true
    if (mark === 2) return false
    state.set(id, 1)
    for (const next of adjacency.get(id) ?? []) if (visit(next)) return true
    state.set(id, 2)
    return false
  }
  return ids.some(visit)
}

/**
 * Run a graph to completion.
 *
 * @param spec   validated graph spec: { name?, entry, nodes[], edges[], state?, maxSteps?, dryRun? }
 * @param hooks  { runAgent(node, promptText, label) -> { structured?, text, stopReason } }
 *               Called for agent nodes; must forward abort signals itself.
 * @param signal optional AbortSignal; checked every step and between awaits.
 * @returns      { endReason, steps, state, trace, error?, issues? }
 */
export async function runGraph(spec, hooks, signal) {
  if (spec.dryRun) {
    const issues = validateGraph(spec)
    const hasRouter = (spec.edges ?? []).some((e) => typeof e?.router === 'string')
    const loops = hasCycle(spec)
      ? 'graph contains static cycles — loops are supported'
      : hasRouter
        ? 'conditional edges present — loops possible depending on routing'
        : 'acyclic (no static cycle, no conditional edge)'
    return {
      endReason: 'dry-run',
      steps: 0,
      state: spec.state ?? {},
      trace: [],
      issues,
      loops,
    }
  }

  const issues = validateGraph(spec)
  if (issues.length > 0) {
    const error = issues.map((s) => `- ${s}`).join('\n')
    throw new GraphError(`invalid graph:\n${error}`)
  }

  const nodesById = new Map(spec.nodes.map((n) => [n.id, n]))
  const edgesByFrom = new Map(spec.nodes.map((n) => [n.id, []]))
  for (const edge of spec.edges) edgesByFrom.get(edge.from).push(edge)

  const routerFns = new Map()
  for (const edge of spec.edges) {
    if (edge.router !== undefined) routerFns.set(edge, compileUserCode(edge.router, 'router', edge.from))
  }

  const maxSteps = spec.maxSteps ?? 100 // 0 = unlimited
  let state = state0(isPlainObject(spec.state) ? spec.state : {})
  let frontier = [spec.entry]
  const trace = []
  const visited = new Map()
  let steps = 0

  while (frontier.length > 0) {
    if (signal?.aborted) return { endReason: 'aborted', steps, state, trace }
    if (maxSteps > 0 && steps >= maxSteps) {
      return { endReason: 'max-steps', steps, state, trace, pendingFrontier: [...frontier] }
    }

    const snapshot = state
    const results = await Promise.allSettled(frontier.map((id) => runNode(id, snapshot)))
    const patch = {}
    const stepTrace = { step: steps + 1, nodes: [], next: [] }
    let failure = undefined

    for (let i = 0; i < results.length; i += 1) {
      const id = frontier[i]
      const outcome = results[i]
      if (outcome.status === 'fulfilled') {
        const { writes, summary } = outcome.value
        Object.assign(patch, writes)
        stepTrace.nodes.push({ id, status: 'ok', ms: outcome.value.ms, summary })
      } else {
        failure = outcome.reason
        stepTrace.nodes.push({ id, status: 'error', ms: 0, summary: String(outcome.reason?.message ?? outcome.reason) })
      }
    }

    state = Object.assign({}, state, patch)
    steps += 1

    if (failure !== undefined) {
      stepTrace.next = []
      trace.push(stepTrace)
      return { endReason: 'error', steps, state, trace, error: String(failure?.message ?? failure) }
    }

    const next = new Set()
    let routingError = undefined
    for (const id of frontier) {
      let targets
      try {
        targets = routeFrom(id)
      } catch (error) {
        routingError = error
        break
      }
      for (const target of targets) {
        if (target !== END) next.add(target)
      }
    }
    if (routingError !== undefined) {
      return { endReason: 'error', steps, state, trace, error: String(routingError?.message ?? routingError) }
    }
    stepTrace.next = [...next]
    trace.push(stepTrace)
    frontier = [...next]
  }

  return { endReason: 'end', steps, state, trace }

  async function runNode(id, snapshot) {
    const node = nodesById.get(id)
    const started = Date.now()
    visited.set(id, (visited.get(id) ?? 0) + 1)
    const info = { step: steps + 1, graph: spec.name ?? 'graph', node: id, from: id, visited: Object.fromEntries(visited) }

    if (node.type === 'js') {
      const fn = compileUserCode(node.code, 'js node', id)
      const value = await invokeUser(fn, snapshot, info, `js node "${id}"`, id)
      const ms = Date.now() - started
      if (isPlainObject(value) && node.writeTo === undefined) {
        return { writes: value, summary: `patch ${Object.keys(value).join(', ') || '(empty)'}`, ms }
      }
      const key = node.writeTo ?? id
      return { writes: { [key]: value }, summary: `${key} = ${summarizeValue(value)}`, ms }
    }

    const promptText = interpolate(
      node.prompt ?? `You are one node of graph "${spec.name ?? 'graph'}". Node id: "${id}"${node.description ? ` (${node.description})` : ''}.\nCurrent shared state (JSON):\n${JSON.stringify(snapshot)}\nPerform exactly this node's job and answer concisely.`,
      snapshot,
    )
    const label = `${spec.name ? `${spec.name}/` : ''}${id}`
    const result = await hooks.runAgent(node, promptText, label)
    const ms = Date.now() - started
    if (result.stopReason !== 'completed') {
      throw new GraphError(`agent node failed with stopReason "${result.stopReason}"`, id)
    }
    const value = result.structured !== undefined ? result.structured : result.text
    const key = node.writeTo ?? id
    return { writes: { [key]: value }, summary: `${key} = ${summarizeValue(value)}`, ms }
  }

  function routeFrom(id) {
    const targets = []
    for (const edge of edgesByFrom.get(id) ?? []) {
      if (edge.to !== undefined) { targets.push(edge.to); continue }
      const fn = routerFns.get(edge)
      // Routers run synchronously over the POST-step state; async routers are
      // not awaited here by design (keep routing cheap and deterministic).
      let value
      try {
        value = fn(state, { step: steps, graph: spec.name ?? 'graph', from: id, node: id, visited: Object.fromEntries(visited) })
      } catch (error) {
        throw new GraphError(`router threw: ${error?.message ?? String(error)}`, id)
      }
      if (value !== undefined && value !== null && typeof value.then === 'function') {
        throw new GraphError('router returned a Promise; routers must be synchronous', id)
      }
      const list = Array.isArray(value) ? value : [value]
      for (const item of list) {
        if (typeof item !== 'string') throw new GraphError(`router returned ${typeof item} instead of a node id or "END"`, id)
        if (item !== END && !nodesById.has(item)) throw new GraphError(`router returned unknown node id "${item}"`, id)
        targets.push(item)
      }
    }
    return targets
  }
}

function state0(state) {
  return JSON.parse(JSON.stringify(state))
}

export { END, GraphError, interpolate, textOfBlocks }
