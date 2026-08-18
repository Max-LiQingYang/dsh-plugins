/**
 * Pure graph editing helpers — produce a NEW spec from an old spec + an
 * edit descriptor. No imports, no side effects, fully testable headlessly.
 *
 * Edit shapes:
 *   { type: 'addNode', nodeType: 'agent' | 'js', id?: string }
 *   { type: 'deleteNode', id }
 *   { type: 'moveNode', id, x, y }              → positions layer (not in spec)
 *   { type: 'addEdge', from, to, kind: 'static' | 'router', router?: string }
 *   { type: 'deleteEdge', index }
 *   { type: 'setEdgeStatic', index, to }
 *   { type: 'setEdgeRouter', index, router }
 *   { type: 'setName', name }
 *   { type: 'setEntry', entry }
 *
 * `applyEdit(spec, edit)` returns a new spec object (or the same object
 * when the edit is a no-op). Every operation validates ids and indices so a
 * bad edit does not throw inside a render path; instead the spec is
 * returned unchanged.
 */

function cloneSpec(spec) {
  return {
    name: spec.name,
    entry: spec.entry,
    nodes: (spec.nodes || []).map(function (n) {
      var c = { id: n.id, type: n.type }
      if (n.writeTo) c.writeTo = n.writeTo
      if (n.description) c.description = n.description
      if (n.prompt) c.prompt = n.prompt
      if (n.code) c.code = n.code
      if (n.persona) c.persona = n.persona
      if (n.outputSchema) c.outputSchema = n.outputSchema
      return c
    }),
    edges: (spec.edges || []).map(function (e) {
      var c = { from: e.from }
      if (typeof e.to === 'string') c.to = e.to
      if (typeof e.router === 'string') c.router = e.router
      return c
    }),
    maxSteps: spec.maxSteps,
  }
}

function nodeIndex(spec, id) {
  return (spec.nodes || []).findIndex(function (n) { return n && n.id === id })
}

function edgeAt(spec, index) {
  return (spec.edges || [])[index]
}

function edgeMatches(edge, from, to) {
  if (!edge || edge.from !== from) return false
  if (typeof to === 'string' && edge.to === to) return true
  if (typeof edge.router === 'string' && to === 'END') return true
  return false
}

function nextDefaultId(spec, base) {
  var n = 1
  var candidate = base + n
  while (nodeIndex(spec, candidate) !== -1) { n += 1; candidate = base + n }
  return candidate
}

export function applyEdit(spec, edit) {
  if (!spec || typeof spec !== 'object') return spec
  if (!edit || typeof edit !== 'object') return spec
  var next = cloneSpec(spec)
  switch (edit.type) {
    case 'setName':
      if (typeof edit.name === 'string') next.name = edit.name
      return next
    case 'setEntry':
      if (typeof edit.entry === 'string' && nodeIndex(next, edit.entry) !== -1) next.entry = edit.entry
      return next
    case 'addNode': {
      var id = typeof edit.id === 'string' && edit.id !== '' ? edit.id : nextDefaultId(next, edit.nodeType === 'js' ? 'js' : 'node')
      if (nodeIndex(next, id) !== -1) return spec
      var node = { id: id, type: edit.nodeType === 'js' ? 'js' : 'agent' }
      if (edit.nodeType === 'js') node.code = 'return {}'
      else node.prompt = ''
      next.nodes.push(node)
      return next
    }
    case 'deleteNode': {
      var idx = nodeIndex(next, edit.id)
      if (idx === -1) return spec
      next.nodes.splice(idx, 1)
      next.edges = next.edges.filter(function (e) {
        return e.from !== edit.id && (typeof e.to !== 'string' || e.to !== edit.id)
      })
      if (next.entry === edit.id && next.nodes.length > 0) next.entry = next.nodes[0].id
      return next
    }
    case 'addEdge': {
      if (typeof edit.from !== 'string' || nodeIndex(next, edit.from) === -1) return spec
      var from = edit.from
      if (edit.kind === 'router') {
        var dup = next.edges.some(function (e) {
          return e.from === from && typeof e.router === 'string' && e.router === (edit.router || '')
        })
        if (dup) return spec
        next.edges.push({ from: from, router: typeof edit.router === 'string' && edit.router !== '' ? edit.router : 'return "END"' })
      } else {
        if (typeof edit.to !== 'string' || nodeIndex(next, edit.to) === -1) return spec
        var dup2 = next.edges.some(function (e) { return e.from === from && typeof e.to === 'string' && e.to === edit.to })
        if (dup2) return spec
        next.edges.push({ from: from, to: edit.to })
      }
      return next
    }
    case 'deleteEdge': {
      if (typeof edit.index !== 'number' || edit.index < 0 || edit.index >= next.edges.length) return spec
      next.edges.splice(edit.index, 1)
      return next
    }
    case 'setEdgeStatic': {
      if (typeof edit.index !== 'number' || edit.index >= next.edges.length) return spec
      if (typeof edit.to !== 'string' || nodeIndex(next, edit.to) === -1) return spec
      next.edges[edit.index] = { from: next.edges[edit.index].from, to: edit.to }
      return next
    }
    case 'setEdgeRouter': {
      if (typeof edit.index !== 'number' || edit.index >= next.edges.length) return spec
      if (typeof edit.router !== 'string' || edit.router.trim() === '') return spec
      next.edges[edit.index] = { from: next.edges[edit.index].from, router: edit.router }
      return next
    }
    case 'moveNode':
      // positions live outside the spec; applyEdit handles spec-side edits only.
      return spec
    default:
      return spec
  }
}

export function defaultNodePosition(spec, id) {
  // Mirrors the BFS layout enough to pick a fresh position when the user
  // adds a node — append to the last column.
  var layout = (function () {
    var nodes = spec.nodes || []
    var edges = spec.edges || []
    var ids = nodes.map(function (n) { return n.id })
    var idSet = new Set(ids)
    var out = new Map()
    for (var i = 0; i < nodes.length; i += 1) out.set(nodes[i].id, { to: [], routers: 0 })
    for (var j = 0; j < edges.length; j += 1) {
      var e = edges[j]
      if (!idSet.has(e.from)) continue
      if (typeof e.to === 'string' && idSet.has(e.to)) out.get(e.from).to.push(e.to)
    }
    var entry = typeof spec.entry === 'string' && idSet.has(spec.entry) ? spec.entry : ids[0]
    var layer = new Map()
    var q = [entry]
    layer.set(entry, 0)
    for (var k = 0; k < q.length; k += 1) {
      var id2 = q[k]
      for (var n = 0; n < out.get(id2).to.length; n += 1) {
        var nx = out.get(id2).to[n]
        if (!layer.has(nx)) { layer.set(nx, layer.get(id2) + 1); q.push(nx) }
      }
    }
    return layer
  })()
  var layers = []
  layout.forEach(function (l, id) { (layers[l] = layers[l] || []).push(id) })
  var lastLayer = layers.filter(function (x) { return x }).pop() || []
  var lastCol = lastLayer
  var idxInLayer = lastCol.indexOf(id)
  var W = 150, H = 44, GX = 56, GY = 22, PAD = 14
  var col = layers.filter(function (x) { return x }).length
  var row = idxInLayer >= 0 ? idxInLayer : lastCol.length
  return { x: PAD + col * (W + GX), y: PAD + row * (H + GY), w: W, h: H }
}
