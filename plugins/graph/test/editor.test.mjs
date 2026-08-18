// Headless tests for lib/editor.js — pure graph editing helpers.
import { applyEdit, defaultNodePosition } from '../lib/editor.js'

let passed = 0, failed = 0
function check(label, cond, extra) {
  if (cond) { passed++; console.log('  ok: ' + label) }
  else { failed++; console.log('  FAIL: ' + label + (extra ? ' — ' + JSON.stringify(extra) : '')) }
}

function minimal(name) {
  return {
    name: name || 'g',
    entry: 'a',
    nodes: [{ id: 'a', type: 'agent', prompt: 'go' }],
    edges: [],
    maxSteps: 100,
  }
}

// 1. setName / setEntry
{
  console.log('1. setName / setEntry')
  let s = applyEdit(minimal(), { type: 'setName', name: 'rename' })
  check('setName applied', s.name === 'rename')
  let s2 = applyEdit(s, { type: 'setEntry', entry: 'nonexistent' })
  check('setEntry with invalid id rejected (entry stays)', s2.entry === 'a')
  let s3 = applyEdit(minimal(), { type: 'setEntry', entry: 'a' })
  check('setEntry with valid id applied', s3.entry === 'a')
}

// 2. addNode
{
  console.log('2. addNode')
  let s = applyEdit(minimal(), { type: 'addNode', nodeType: 'agent' })
  check('agent added with default id', s.nodes.length === 2 && /node\d+/.test(s.nodes[1].id))
  let s2 = applyEdit(minimal(), { type: 'addNode', nodeType: 'js' })
  check('js node uses js-prefix', s2.nodes[1].id.indexOf('js') === 0 && s2.nodes[1].type === 'js')
  let s3 = applyEdit(s, { type: 'addNode', nodeType: 'agent', id: 'custom' })
  check('explicit id honored', s3.nodes[s3.nodes.length - 1].id === 'custom')
  let s4 = applyEdit(s3, { type: 'addNode', nodeType: 'agent', id: 'custom' })
  check('duplicate id rejected (no-op)', s4.nodes.length === s3.nodes.length)
  check('addNode default agent prompt present', s.nodes[1].prompt === '')
  check('addNode default js code present', s2.nodes[1].code === 'return {}')
}

// 3. deleteNode + edge cleanup
{
  console.log('3. deleteNode + edge cleanup')
  let s = {
    name: 'g',
    entry: 'a',
    nodes: [
      { id: 'a', type: 'agent' },
      { id: 'b', type: 'agent' },
      { id: 'c', type: 'agent' },
    ],
    edges: [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
      { from: 'a', router: 'return "END"' },
    ],
  }
  let s2 = applyEdit(s, { type: 'deleteNode', id: 'b' })
  check('node removed', s2.nodes.length === 2)
  check('edges referencing deleted node removed', s2.edges.length === 1 && s2.edges[0].from === 'a' && typeof s2.edges[0].router === 'string')
  check('entry reassigned when entry deleted', s2.entry !== 'b')
  let s3 = applyEdit(s, { type: 'deleteNode', id: 'nonexistent' })
  check('deleteNode unknown id is no-op', s3.nodes.length === 3)
}

// 4. addEdge (static and router)
{
  console.log('4. addEdge')
  let s = {
    name: 'g', entry: 'a',
    nodes: [{ id: 'a', type: 'agent' }, { id: 'b', type: 'agent' }, { id: 'c', type: 'agent' }],
    edges: [],
  }
  let s2 = applyEdit(s, { type: 'addEdge', from: 'a', to: 'b', kind: 'static' })
  check('static edge added', s2.edges.length === 1 && s2.edges[0].to === 'b')
  let s3 = applyEdit(s2, { type: 'addEdge', from: 'a', to: 'b', kind: 'static' })
  check('duplicate static edge rejected', s3.edges.length === 1)
  let s4 = applyEdit(s, { type: 'addEdge', from: 'a', kind: 'router', router: 'return state.x > 3 ? "c" : "END"' })
  check('router edge added', s4.edges[0].router && s4.edges[0].from === 'a')
  let s5 = applyEdit(s, { type: 'addEdge', from: 'a', kind: 'router' })
  check('router edge default code', s5.edges[0].router === 'return "END"')
  check('addEdge with bad from rejected', applyEdit(s, { type: 'addEdge', from: 'x', to: 'b', kind: 'static' }).edges.length === 0)
  check('addEdge with bad to rejected', applyEdit(s, { type: 'addEdge', from: 'a', to: 'z', kind: 'static' }).edges.length === 0)
}

// 5. deleteEdge + setEdgeStatic / setEdgeRouter
{
  console.log('5. deleteEdge + setEdge')
  let s = {
    name: 'g', entry: 'a',
    nodes: [{ id: 'a', type: 'agent' }, { id: 'b', type: 'agent' }, { id: 'c', type: 'agent' }],
    edges: [{ from: 'a', to: 'b' }, { from: 'a', router: 'return "b"' }],
  }
  let s2 = applyEdit(s, { type: 'deleteEdge', index: 0 })
  check('edge deleted', s2.edges.length === 1 && typeof s2.edges[0].router === 'string')
  let s3 = applyEdit(s, { type: 'setEdgeStatic', index: 1, to: 'c' })
  check('router → static', s3.edges[1].to === 'c' && typeof s3.edges[1].router === 'undefined')
  let s4 = applyEdit(s3, { type: 'setEdgeRouter', index: 1, router: 'return "END"' })
  check('static → router', typeof s4.edges[1].router === 'string' && typeof s4.edges[1].to === 'undefined')
  check('setEdgeRouter empty code rejected', applyEdit(s3, { type: 'setEdgeRouter', index: 1, router: '   ' }).edges[1].to === 'c')
  check('deleteEdge invalid index no-op', applyEdit(s, { type: 'deleteEdge', index: 99 }).edges.length === 2)
}

// 6. unknown edits are no-ops
{
  console.log('6. unknown edits are no-ops')
  let s = minimal()
  let same = applyEdit(s, { type: '???', weird: true })
  check('unknown type returns input', same === s)
}

// 7. defaultNodePosition picks a fresh spot
{
  console.log('7. defaultNodePosition')
  let s = {
    name: 'g', entry: 'a',
    nodes: [{ id: 'a', type: 'agent' }, { id: 'b', type: 'agent' }],
    edges: [{ from: 'a', to: 'b' }],
  }
  let pos = defaultNodePosition(s, 'b')
  check('returns x/y', typeof pos.x === 'number' && typeof pos.y === 'number')
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
