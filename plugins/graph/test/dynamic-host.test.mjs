// Headless test for the dynamic-host live aggregator (src/dynamic-host.js).
// Evaluates the file as a plugin function body against a fake ctx, drives the
// graph/* event flow, and asserts the graph.live RPC snapshot.
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/dynamic-host.js', import.meta.url), 'utf8')
const handlers = {}
let globalHandle
globalThis.harness = {
  handle: (method, fn) => {
    handlers[method] = fn
    globalHandle = (m) => handlers[m]
    return () => {}
  },
}
const plugin = new Function(source + '\n')()
const listeners = {}
const fakeCtx = {
  on: (name, fn) => { listeners[name] = fn },
  effect: (fn) => { const d = fn(); return () => typeof d === 'function' && d() },
}
plugin.apply(fakeCtx)

function callRpc(method, args) {
  return handlers[method](args)
}

let passed = 0, failed = 0
function check(label, cond, extra) {
  if (cond) { passed++; console.log('  ok: ' + label) }
  else { failed++; console.log('  FAIL: ' + label + (extra ? ' — ' + JSON.stringify(extra) : '')) }
}

// 1. event flow → live snapshot
{
  console.log('1. run/node event flow')
  listeners['graph/run-start']({
    name: 'revise', parentSession: 's1', startedAt: 1000,
    spec: { name: 'revise', entry: 'writer', nodes: [{ id: 'writer', type: 'agent' }], edges: [] },
  })
  listeners['graph/node-start']({ name: 'revise', parentSession: 's1', node: 'writer', childId: 'c1', startedAt: 1100 })
  listeners['graph/node-start']({ name: 'revise', parentSession: 's1', node: 'reviewer', childId: 'c2', startedAt: 1200 })
  listeners['graph/node-end']({ name: 'revise', parentSession: 's1', node: 'writer', childId: 'c1', stopReason: 'completed', ms: 400, structuredPreview: { draft: 'v1' } })
  const snap1 = callRpc('graph.live')
  check('one live run tracked', snap1.runs.length === 1 && snap1.runs[0].endedAt === null)
  const run = snap1.runs[0]
  check('writer completed with preview', run.agents.find((a) => a.node === 'writer').status === 'completed' && run.agents.find((a) => a.node === 'writer').preview.value.draft === 'v1')
  check('reviewer still running', run.agents.find((a) => a.node === 'reviewer').status === 'running')
  check('parentSession carried', run.parentSession === 's1')
  check('spec carried into snapshot', run.spec && run.spec.entry === 'writer' && Array.isArray(run.spec.nodes))
}

// 2. run-end closes the run and fails stragglers
{
  console.log('2. run-end')
  listeners['graph/run-end']({ name: 'revise', parentSession: 's1', endReason: 'end', steps: 3, ms: 5000 })
  const snap = callRpc('graph.live')
  check('run ended', snap.runs[0].endedAt !== null && snap.runs[0].endReason === 'end')
  check('straggler marked failed', snap.runs[0].agents.find((a) => a.node === 'reviewer').status === 'failed')
}

// 3. separate runs with the same name but different parents stay apart
{
  console.log('3. parent isolation')
  listeners['graph/run-start']({ name: 'revise', parentSession: 's2', startedAt: 9000 })
  listeners['graph/node-start']({ name: 'revise', parentSession: 's2', node: 'gen', childId: 'c9', startedAt: 9100 })
  const snap = callRpc('graph.live')
  const s1 = snap.runs.filter((r) => r.parentSession === 's1')
  const s2 = snap.runs.filter((r) => r.parentSession === 's2')
  check('s1 closed run unaffected', s1.length === 1 && s1[0].endedAt !== null)
  check('s2 has its own live run', s2.length === 1 && s2[0].endedAt === null && s2[0].agents.length === 1)
}

// 4. cap behavior: old ended runs evicted beyond maxRuns
{
  console.log('4. bounded store')
  for (let i = 0; i < 40; i += 1) {
    listeners['graph/run-start']({ name: 'r' + i, parentSession: 'p' + i, startedAt: 10000 + i })
    listeners['graph/run-end']({ name: 'r' + i, parentSession: 'p' + i, endReason: 'end', steps: 1, ms: 1 })
  }
  const snap = callRpc('graph.live')
  check('store capped at 30', snap.runs.length === 30)
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
