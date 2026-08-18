// Headless smoke test for the graph tool-card client module's pure helpers.
// Loads client.js as a classic script via a fake module loader, then exercises
// the exported __test hooks with real graph shapes (cyclic, fan-out, error).
import { readFileSync } from 'node:fs'

let captured = null
globalThis.window = { __ModuleLoader__: { load: (m) => { captured = m } } }
const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
// Classic-script semantics: evaluate in global scope via indirect Function.
const run = new Function('window', source + '\n')
run(globalThis.window)
if (!captured || captured.id !== '@dsh-plugins/graph') throw new Error('module did not register')
const reactStub = { createElement: () => null }
const api = captured.factory((id) => {
  if (id === 'react') return reactStub
  throw new Error('unexpected require: ' + id)
})

let passed = 0, failed = 0
function check(label, cond, extra) {
  if (cond) { passed++; console.log('  ok: ' + label) }
  else { failed++; console.log('  FAIL: ' + label + (extra ? ' — ' + JSON.stringify(extra) : '')) }
}
const t = api.__test

// 1. args parsing, running vs settled
{
  console.log('1. parseGraphArgs / parseGraphResult')
  const args = { name: 'g', entry: 'a', nodes: [{ id: 'a', type: 'js', code: 'return {}' }], edges: [{ from: 'a', to: 'END' }] }
  const running = { callId: 'c1', name: 'graph', argsRaw: JSON.stringify(args) }
  const parsed = t.parseGraphArgs(running)
  check('running args parse', parsed && parsed.entry === 'a' && parsed.nodes.length === 1)
  const settled = {
    kind: 'tool-result', callId: 'c1', isError: false, content: [],
    call: { name: 'graph', argsRaw: JSON.stringify(args) },
    meta: { endReason: 'end', steps: 2, state: { a: 1 }, trace: [{ step: 1, nodes: [{ id: 'a', status: 'ok', ms: 3 }], next: [] }] },
  }
  check('settled args parse', t.parseGraphArgs(settled).entry === 'a')
  const result = t.parseGraphResult(settled)
  check('meta projection read', result && result.endReason === 'end' && result.steps === 2)
  check('running block has no result', t.parseGraphResult(running) === null)
  check('garbage args rejected', t.parseGraphArgs({ argsRaw: '{oops' }) === null)
  check('non-graph args rejected', t.parseGraphArgs({ argsRaw: '{"x":1}' }) === null)
}

// 2. layout: cycle + unreachable + fan-out
{
  console.log('2. computeLayout')
  const args = {
    entry: 'writer',
    nodes: [
      { id: 'writer', type: 'agent' },
      { id: 'bump', type: 'js', code: '' },
      { id: 'reviewer', type: 'agent' },
      { id: 'orphan', type: 'js', code: '' },
    ],
    edges: [
      { from: 'writer', to: 'bump' },
      { from: 'bump', to: 'reviewer' },
      { from: 'reviewer', router: 'return state.ok ? "END" : "writer"' },
      { from: 'orphan', to: 'END' },
    ],
  }
  const lay = t.computeLayout(args)
  check('entry resolved', lay.entry === 'writer')
  check('cycle layers finite', lay.pos.get('writer').x < lay.pos.get('bump').x && lay.pos.get('bump').x < lay.pos.get('reviewer').x)
  check('back-edge target left of source (cycle legible)', lay.pos.get('writer').x <= lay.pos.get('reviewer').x)
  check('unreachable node laid out', lay.pos.get('orphan') !== undefined)
  check('positive canvas', lay.width > 0 && lay.height > 0)
  // self-loop graph
  const loop = t.computeLayout({ entry: 's', nodes: [{ id: 's', type: 'js', code: '' }], edges: [{ from: 's', to: 's' }] })
  check('self-loop single node', loop.pos.get('s') !== undefined && loop.width > 0)
  // fan-out rows stack vertically
  const fan = t.computeLayout({
    entry: 'f',
    nodes: [{ id: 'f', type: 'js', code: '' }, { id: 'l', type: 'agent' }, { id: 'r', type: 'agent' }],
    edges: [{ from: 'f', to: 'l' }, { from: 'f', to: 'r' }],
  })
  check('fan-out rows stacked', fan.pos.get('l').x === fan.pos.get('r').x && fan.pos.get('l').y !== fan.pos.get('r').y)
}

// 3. trace folding
{
  console.log('3. nodeStats')
  const result = {
    trace: [
      { step: 1, nodes: [{ id: 'a', status: 'ok', ms: 10 }], next: ['b'] },
      { step: 2, nodes: [{ id: 'b', status: 'ok', ms: 20 }], next: ['a'] },
      { step: 3, nodes: [{ id: 'a', status: 'ok', ms: 5 }, { id: 'b', status: 'error', ms: 1 }], next: [] },
    ],
  }
  const stats = t.nodeStats(result)
  check('a ran twice', stats.get('a').runs === 2 && stats.get('a').ok === 2 && stats.get('a').ms === 15)
  check('b errored flag', stats.get('b').runs === 2 && stats.get('b').errored === true)
  check('empty result tolerated', t.nodeStats(null).size === 0)
}

// 4. agent outputs (presentationMeta nodeOutputs)
{
  console.log('4. outputOf / prettyOutput')
  const settled = {
    kind: 'tool-result', callId: 'c1', isError: false, content: [],
    call: { name: 'graph', argsRaw: '{}' },
    meta: {
      endReason: 'end', steps: 1, state: { writer: { draft: 'hello' } }, trace: [],
      nodeOutputs: { writer: { draft: 'hello' } },
    },
  }
  const result = t.parseGraphResult(settled)
  check('nodeOutputs reachable via meta', t.outputOf(result, 'writer') !== null)
  check('unknown node → null', t.outputOf(result, 'nope') === null)
  check('no nodeOutputs → null', t.outputOf({ ...result, nodeOutputs: undefined }, 'writer') === null)
  check('pretty object', t.prettyOutput({ a: 1 }).includes('"a": 1'))
  check('pretty long string capped', t.prettyOutput('x'.repeat(5000)).length <= 2005)
}

// 5. live run picking (dynamic host RPC snapshot)
{
  console.log('5. pickLiveRun')
  const snap = {
    now: 1000,
    runs: [
      { name: 'other', endedAt: null, agents: [] },
      { name: 'loop', endedAt: null, agents: [{ node: 'a', status: 'running', startedAt: 100 }] },
      { name: 'loop', endedAt: 900, endReason: 'end', agents: [] },
    ],
  }
  const picked = t.pickLiveRun(snap, 'loop')
  check('prefers in-flight run', picked && picked.endedAt === null && picked.agents[0].node === 'a')
  check('fallback newest when none live', t.pickLiveRun({ runs: [{ name: 'x', endedAt: 1 }] }, 'x').endedAt === 1)
  check('name mismatch → null', t.pickLiveRun(snap, 'ghost') === null)
  check('empty snapshot → null', t.pickLiveRun(null, 'loop') === null)
}

// 6. plugin surface
{
  console.log('6. plugin surface')
  check('apply exported', typeof api.apply === 'function')
  check('inject slots', Array.isArray(api.inject) && api.inject[0] === 'slots')
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
