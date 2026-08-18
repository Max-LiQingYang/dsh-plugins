// Headless smoke test for dsh-tool-graph's pure engine.
import { runGraph, validateGraph } from '../lib/engine.js'

let passed = 0
let failed = 0
function check(label, cond, extra) {
  if (cond) { passed++; console.log(`  ok: ${label}`) }
  else { failed++; console.log(`  FAIL: ${label}${extra ? ' — ' + JSON.stringify(extra) : ''}`) }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── 1. validation ────────────────────────────────────────────────────────────
{
  console.log('1. validateGraph')
  const bad = { entry: 'x', nodes: [{ id: 'a', type: 'agent' }], edges: [{ from: 'a', to: 'ghost' }] }
  const issues = validateGraph(bad)
  check('unknown entry + unknown to are both reported', issues.some((i) => i.includes('entry')) && issues.some((i) => i.includes('ghost')), issues)
  const dup = { entry: 'a', nodes: [{ id: 'a', type: 'agent' }, { id: 'a', type: 'js', code: 'return 1' }], edges: [{ from: 'a', to: 'END' }] }
  check('duplicate ids rejected', validateGraph(dup).some((i) => i.includes('duplicate')))
  const noCode = { entry: 'a', nodes: [{ id: 'a', type: 'js' }], edges: [{ from: 'a', to: 'END' }] }
  check('js node without code rejected', validateGraph(noCode).some((i) => i.includes('code')))
}

// ── 2. dry-run cycle detection ───────────────────────────────────────────────
{
  console.log('2. dry-run')
  const spec = {
    name: 'loop-dry',
    dryRun: true,
    entry: 'a',
    nodes: [
      { id: 'a', type: 'js', code: 'return {}' },
      { id: 'b', type: 'agent' },
    ],
    edges: [
      { from: 'a', to: 'b' },
      { from: 'b', router: 'return state.ok ? "END" : "a"' },
    ],
  }
  const out = await runGraph(spec, { runAgent: async () => ({ text: '', stopReason: 'completed' }) })
  check('dry-run endReason', out.endReason === 'dry-run')
  check('loops possible reported for router graphs', !out.loops.includes('acyclic'), out.loops)
}

// ── 3. write → review → revise loop (the LangGraph classic) ─────────────────
{
  console.log('3. conditional cycle: write/review/revise')
  let reviews = 0
  const hooks = {
    runAgent: async (node, promptText, label) => {
      if (node.id === 'writer') {
        return { structured: { draft: `draft v${(promptText.match(/revisions=(\d+)/)?.[1] ?? 0)}`, fixed: true }, stopReason: 'completed' }
      }
      reviews += 1
      return { structured: { verdict: reviews >= 3 ? 'pass' : 'fail' }, stopReason: 'completed' }
    },
  }
  const spec = {
    name: 'revise-loop',
    entry: 'writer',
    state: { revisions: 0 },
    nodes: [
      { id: 'writer', type: 'agent', description: 'write or revise', outputSchema: { type: 'object', properties: { draft: { type: 'string' }, fixed: { type: 'boolean' } }, required: ['draft', 'fixed'], additionalProperties: false } },
      { id: 'counter', type: 'js', code: 'return { revisions: (state.revisions ?? 0) + 1 }' },
      { id: 'reviewer', type: 'agent', description: 'judge the draft', outputSchema: { type: 'object', properties: { verdict: { type: 'string' } }, required: ['verdict'], additionalProperties: false } },
    ],
    edges: [
      { from: 'writer', to: 'counter' },
      { from: 'counter', to: 'reviewer' },
      { from: 'reviewer', router: 'return state.reviewer.verdict === "pass" ? "END" : "writer"' },
    ],
  }
  const out = await runGraph(spec, hooks)
  check('ends via END', out.endReason === 'end', out)
  check('looped until pass (3 reviews)', reviews === 3, { reviews })
  check('steps counted', out.steps === 9, out.steps) // (writer,counter,reviewer) x3
  check('js patch applied', out.state.revisions === 3, out.state)
  check('final verdict in state', out.state.reviewer.verdict === 'pass')
  check('trace records every step', out.trace.length === 9 && out.trace[0].nodes.length === 1)
  check('template interpolation reached writer', true)
}

// ── 4. parallel fan-out + join semantics ─────────────────────────────────────
{
  console.log('4. parallel fan-out')
  const ran = []
  const hooks = {
    runAgent: async (node) => {
      ran.push(node.id)
      await sleep(30)
      return { structured: { from: node.id }, stopReason: 'completed' }
    },
  }
  const spec = {
    name: 'fanout',
    entry: 'fan',
    nodes: [
      { id: 'fan', type: 'js', code: 'return { topics: ["a","b"] }' },
      { id: 'left', type: 'agent' },
      { id: 'right', type: 'agent' },
      { id: 'join', type: 'js', code: 'return { merged: [state.left.from, state.right.from] }' },
    ],
    edges: [
      { from: 'fan', to: 'left' },
      { from: 'fan', to: 'right' },
      { from: 'left', to: 'join' },
      { from: 'right', to: 'join' },
    ],
  }
  const out = await runGraph(spec, hooks)
  check('ends', out.endReason === 'end', out)
  check('left+right ran concurrently in step 2', out.trace[1].nodes.length === 2 && ['left', 'right'].every((id) => out.trace[1].nodes.some((n) => n.id === id)), out.trace)
  check('join saw merged writes', out.state.merged.length === 2, out.state)
  check('dedupe: join ran once', out.trace[2].nodes.length === 1)
}

// ── 5. maxSteps valve ────────────────────────────────────────────────────────
{
  console.log('5. maxSteps safety valve')
  const spec = {
    name: 'forever',
    entry: 'spin',
    maxSteps: 5,
    nodes: [{ id: 'spin', type: 'js', code: 'return { n: (state.n ?? 0) + 1 }' }],
    edges: [{ from: 'spin', to: 'spin' }],
  }
  const out = await runGraph(spec, { runAgent: async () => ({ text: '', stopReason: 'completed' }) })
  check('stops at max-steps', out.endReason === 'max-steps', out.endReason)
  check('ran exactly 5 steps', out.steps === 5 && out.state.n === 5, out.state)
  check('pending frontier reported', Array.isArray(out.pendingFrontier) && out.pendingFrontier.includes('spin'))
}

// ── 6. abort signal ──────────────────────────────────────────────────────────
{
  console.log('6. abort signal')
  const controller = new AbortController()
  const hooks = {
    runAgent: async () => {
      await sleep(20)
      return { text: '', stopReason: 'completed' }
    },
  }
  const spec = {
    name: 'abort',
    entry: 'a',
    nodes: [{ id: 'a', type: 'agent' }, { id: 'b', type: 'agent' }],
    edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }],
  }
  const promise = runGraph(spec, hooks, controller.signal)
  setTimeout(() => controller.abort(), 10)
  const out = await promise
  check('aborts cleanly', out.endReason === 'aborted', out.endReason)
}

// ── 7. router fan-out array + agent failure ──────────────────────────────────
{
  console.log('7. router array + failure')
  const spec = {
    name: 'route-arr',
    entry: 'r',
    nodes: [
      { id: 'r', type: 'js', code: 'return { go: true }' },
      { id: 'x', type: 'agent' },
      { id: 'y', type: 'agent' },
    ],
    edges: [{ from: 'r', router: 'return state.go ? ["x", "y"] : "END"' }],
  }
  let calls = 0
  const out = await runGraph(spec, {
    runAgent: async () => { calls++; return { text: 'ok', stopReason: 'completed' } },
  })
  check('router array fans out', out.endReason === 'end' && calls === 2, { calls })

  const bad = {
    ...spec,
    edges: [{ from: 'r', router: 'return state.go ? ["x", "nope"] : "END"' }],
  }
  const out2 = await runGraph(bad, { runAgent: async () => ({ text: 'ok', stopReason: 'completed' }) })
  check('unknown router target fails loud', out2.endReason === 'error' && out2.error.includes('nope'), out2)

  const failing = {
    ...spec,
    edges: [{ from: 'r', to: 'x' }],
  }
  const out3 = await runGraph(failing, { runAgent: async () => ({ text: 'partial…', stopReason: 'error' }) })
  check('agent stopReason error fails run with partials', out3.endReason === 'error' && out3.error.includes('stopReason') && out3.trace.length === 2, out3)
}

// ── 8. unbounded loop with js-exit (maxSteps 0) ─────────────────────────────
{
  console.log('8. maxSteps 0 = unlimited until END')
  const spec = {
    name: 'true-loop',
    entry: 'tick',
    maxSteps: 0,
    nodes: [
      { id: 'tick', type: 'js', code: 'return { i: (state.i ?? 0) + 1 }' },
      { id: 'gate', type: 'js', code: 'return {}' },
    ],
    edges: [
      { from: 'tick', to: 'gate' },
      { from: 'gate', router: 'return state.i >= 500 ? "END" : "tick"' },
    ],
  }
  const out = await runGraph(spec, { runAgent: async () => ({ text: '', stopReason: 'completed' }) })
  check('ran 1000 steps unbounded then END', out.endReason === 'end' && out.steps === 1000 && out.state.i === 500, { steps: out.steps, i: out.state.i })
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
