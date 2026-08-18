// @dsh-plugins/graph — dynamic-plugin HOST source for cordis_define.
//
// Live-run aggregator + saved-graph facade for the Graphs tab. Paste the
// whole file below into the `code.host` field of a cordis_define call
// (plugin.kind: "new", idPrefix: e.g. "gviz"), pairing it with
// src/dynamic-client.js as `code.client`. Then cordis_run the returned
// pluginId/packageId and authorize the client half.
//
// Two facets:
//
//  1. Live aggregator — the graph tool broadcasts `graph/*` lifecycle events
//     (run-start, node-start, node-end, run-end) over the host Cordis bus.
//     `foldGraphEvents` keeps each in-flight run's full spec, agent states
//     with child session ids, and ended reason. The snapshot is exposed via
//     the package-private RPC `graph.live`.
//
//  2. Saved-graph facade — reads the FS-backed graph library
//     (`~/.dsh/graphs/` by default; `$DSH_HOME/graphs/` when set). The
//     browser reaches it through `graphLibrary.list` / `.get` / `.count`
//     RPCs; the implementation resolves the directory in the same way the
//     host tool plugin does so the two views agree on paths.
//
// Pure functions are exported for headless tests; the plugin body itself is
// the same code that runs.

function resolveLibraryDir() {
  // The dynamic-host evaluator may not expose `process`; guard every env read.
  function env(name) {
    try {
      if (typeof process !== 'undefined' && process && process.env) return process.env[name]
    } catch (e) {}
    return undefined
  }
  var home = env('DSH_HOME')
  if (home !== undefined && home !== '') return home + '/graphs'
  var fb = env('HOME') || env('USERPROFILE') || '.'
  return fb + '/.dsh/graphs'
}

var fs = null
try { fs = require('node:fs/promises') } catch (e) {}

function parseGraphLabel(label) {
  if (typeof label !== 'string' || label.indexOf('graph:') !== 0) return null
  var rest = label.slice('graph:'.length)
  var slash = rest.indexOf('/')
  if (slash === -1) return { name: 'graph', node: rest }
  var name = rest.slice(0, slash)
  return { name: name === '' ? 'graph' : name, node: rest.slice(slash + 1) }
}

function foldGraphEvents(store, name, payload) {
  if (payload === null || typeof payload !== 'object') return
  var runName = typeof payload.name === 'string' && payload.name !== '' ? payload.name : 'graph'
  var parent = typeof payload.parentSession === 'string' ? payload.parentSession : null
  if (name === 'graph/run-start') {
    store.runs.unshift({
      name: runName,
      parentSession: parent,
      startedAt: typeof payload.startedAt === 'number' ? payload.startedAt : Date.now(),
      endedAt: null,
      endReason: null,
      entry: typeof payload.entry === 'string' ? payload.entry : null,
      spec: payload.spec && typeof payload.spec === 'object' ? payload.spec : null,
      agents: [],
    })
    if (store.runs.length > store.maxRuns) store.runs.length = store.maxRuns
    return
  }
  var run = store.runs.find(function (r) { return r.endedAt === null && r.name === runName && r.parentSession === parent })
  if (run === undefined) return
  if (name === 'graph/node-start') {
    var node = typeof payload.node === 'string' ? payload.node : '?'
    run.agents.push({
      node: node,
      childId: typeof payload.childId === 'string' ? payload.childId : null,
      status: 'running',
      stopReason: null,
      startedAt: typeof payload.startedAt === 'number' ? payload.startedAt : Date.now(),
      endedAt: null,
      ms: null,
      preview: null,
    })
  } else if (name === 'graph/node-end') {
    var endNode = typeof payload.node === 'string' ? payload.node : null
    for (var i = run.agents.length - 1; i >= 0; i -= 1) {
      var a = run.agents[i]
      if (a.status === 'running' && (endNode === null || a.node === endNode)) {
        a.status = payload.stopReason === 'completed' ? 'completed' : 'failed'
        a.stopReason = typeof payload.stopReason === 'string' ? payload.stopReason : 'error'
        a.endedAt = Date.now()
        a.ms = typeof payload.ms === 'number' ? payload.ms : null
        if (payload.structuredPreview !== undefined) a.preview = { kind: 'structured', value: payload.structuredPreview }
        else if (typeof payload.textPreview === 'string') a.preview = { kind: 'text', value: payload.textPreview }
        break
      }
    }
  } else if (name === 'graph/run-end') {
    run.endedAt = Date.now()
    run.endReason = typeof payload.endReason === 'string' ? payload.endReason : 'end'
    run.ms = typeof payload.ms === 'number' ? payload.ms : null
    run.detail = typeof payload.detail === 'string' ? payload.detail : null
    for (var j = 0; j < run.agents.length; j += 1) {
      if (run.agents[j].status === 'running') run.agents[j].status = 'failed'
    }
  }
}

function graphLiveSnapshot(store) {
  var runs = store.runs.map(function (r) {
    return {
      name: r.name,
      parentSession: r.parentSession,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      endReason: r.endReason,
      entry: r.entry,
      ms: r.ms,
      detail: r.detail,
      spec: r.spec,
      agents: r.agents.slice(-200).map(function (a) {
        return {
          node: a.node,
          childId: a.childId,
          status: a.status,
          stopReason: a.stopReason,
          startedAt: a.startedAt,
          endedAt: a.endedAt,
          ms: a.ms,
          preview: a.preview,
        }
      }),
    }
  })
  return { now: Date.now(), runs: runs }
}

async function readLibraryList(dir) {
  if (!fs) return []
  try {
    var files = await fs.readdir(dir)
  } catch (e) { return [] }
  var out = []
  for (var i = 0; i < files.length; i += 1) {
    var file = files[i]
    if (!file.endsWith('.json') || file.endsWith('.tmp')) continue
    try {
      var text = await fs.readFile(dir + '/' + file, 'utf8')
      var data = JSON.parse(text)
      if (!data || typeof data !== 'object' || typeof data.id !== 'string') continue
      out.push({
        id: data.id,
        name: data.name,
        savedAt: data.savedAt,
        updatedAt: data.updatedAt,
        nodeCount: Array.isArray(data.spec && data.spec.nodes) ? data.spec.nodes.length : 0,
        edgeCount: Array.isArray(data.spec && data.spec.edges) ? data.spec.edges.length : 0,
        runtime: data.runtime || null,
      })
    } catch (e) { /* skip malformed */ }
  }
  out.sort(function (a, b) {
    var ak = a.updatedAt || a.savedAt || ''
    var bk = b.updatedAt || b.savedAt || ''
    if (ak !== bk) return ak < bk ? 1 : -1
    return (a.id || '') < (b.id || '') ? 1 : -1
  })
  return out
}

async function readLibraryOne(dir, id) {
  if (!fs) return null
  try {
    var text = await fs.readFile(dir + '/' + id + '.json', 'utf8')
    var data = JSON.parse(text)
    if (!data || typeof data !== 'object' || typeof data.id !== 'string') return null
    return {
      id: data.id,
      name: data.name,
      savedAt: data.savedAt,
      updatedAt: data.updatedAt,
      spec: data.spec,
      runtime: data.runtime || null,
    }
  } catch (e) {
    return null
  }
}

return {
  apply(ctx) {
    var store = { runs: [], maxRuns: 30 }
    var libDir = resolveLibraryDir()
    ctx.on('graph/run-start', function (payload) { foldGraphEvents(store, 'graph/run-start', payload) })
    ctx.on('graph/node-start', function (payload) { foldGraphEvents(store, 'graph/node-start', payload) })
    ctx.on('graph/node-end', function (payload) { foldGraphEvents(store, 'graph/node-end', payload) })
    ctx.on('graph/run-end', function (payload) { foldGraphEvents(store, 'graph/run-end', payload) })
    ctx.effect(function () {
      var disp1 = harness.handle('graph.live', function () { return graphLiveSnapshot(store) })
      var disp2 = harness.handle('graphLibrary.list', async function () { return await readLibraryList(libDir) })
      var disp3 = harness.handle('graphLibrary.get', async function (args) {
        return await readLibraryOne(libDir, args && args.id)
      })
      var disp4 = harness.handle('graphLibrary.count', async function () {
        var list = await readLibraryList(libDir)
        return { count: list.length, dir: libDir }
      })
      return function () { disp1(); disp2(); disp3(); disp4() }
    })
  },
}
