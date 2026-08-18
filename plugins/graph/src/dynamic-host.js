// @dsh-plugins/graph — dynamic-plugin HOST source for cordis_define.
//
// Live-run aggregator for the graph tool card. Paste everything below into
// the `code.host` field of a cordis_define call (plugin.kind: "new",
// idPrefix: e.g. "gviz"), pairing it with src/dynamic-client.js as
// `code.client`. Then cordis_run the returned pluginId/packageId and
// authorize the client half.
//
// The graph tool broadcasts `graph/*` lifecycle events (run-start,
// node-start, node-end, run-end) over the host Cordis bus. This half folds
// them into plain owned data — which node's agent is live, how long it has
// run, what it produced when it ended (capped previews) — and serves it to
// the browser through the package-private RPC `graph.live`. The card polls
// that endpoint while its call is running, so runtime state and agent
// outputs stream in live; the settle-time presentationMeta projection
// remains the authoritative full picture.
//
// Pure functions are exported for headless tests; the plugin body itself is
// the same code that runs.

function parseGraphLabel(label) {
  // labels are "graph:<name>/<node>" or "graph:<node>" (unnamed graphs).
  if (typeof label !== 'string' || label.indexOf('graph:') !== 0) return null
  const rest = label.slice('graph:'.length)
  const slash = rest.indexOf('/')
  if (slash === -1) return { name: 'graph', node: rest }
  const name = rest.slice(0, slash)
  return { name: name === '' ? 'graph' : name, node: rest.slice(slash + 1) }
}

function foldGraphEvents(store, name, payload) {
  if (payload === null || typeof payload !== 'object') return
  const runName = typeof payload.name === 'string' && payload.name !== '' ? payload.name : 'graph'
  const parent = typeof payload.parentSession === 'string' ? payload.parentSession : null
  if (name === 'graph/run-start') {
    store.runs.unshift({
      name: runName,
      parentSession: parent,
      startedAt: typeof payload.startedAt === 'number' ? payload.startedAt : Date.now(),
      endedAt: null,
      endReason: null,
      entry: typeof payload.entry === 'string' ? payload.entry : null,
      agents: [],
    })
    if (store.runs.length > store.maxRuns) store.runs.length = store.maxRuns
    return
  }
  const run = store.runs.find((r) => r.endedAt === null && r.name === runName && r.parentSession === parent)
  if (run === undefined) return
  if (name === 'graph/node-start') {
    const node = typeof payload.node === 'string' ? payload.node : '?'
    run.agents.push({
      node,
      childId: typeof payload.childId === 'string' ? payload.childId : null,
      status: 'running',
      stopReason: null,
      startedAt: typeof payload.startedAt === 'number' ? payload.startedAt : Date.now(),
      endedAt: null,
      ms: null,
      preview: null,
    })
  } else if (name === 'graph/node-end') {
    const node = typeof payload.node === 'string' ? payload.node : null
    for (let i = run.agents.length - 1; i >= 0; i -= 1) {
      const a = run.agents[i]
      if (a.status === 'running' && (node === null || a.node === node)) {
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
    for (let i = 0; i < run.agents.length; i += 1) {
      if (run.agents[i].status === 'running') run.agents[i].status = 'failed'
    }
  }
}

function graphLiveSnapshot(store) {
  const runs = store.runs.map((r) => ({
    name: r.name,
    parentSession: r.parentSession,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    endReason: r.endReason,
    entry: r.entry,
    ms: r.ms,
    detail: r.detail,
    agents: r.agents.slice(-200).map((a) => ({
      node: a.node,
      childId: a.childId,
      status: a.status,
      stopReason: a.stopReason,
      startedAt: a.startedAt,
      endedAt: a.endedAt,
      ms: a.ms,
      preview: a.preview,
    })),
  }))
  return { now: Date.now(), runs }
}

return {
  apply(ctx) {
    var store = { runs: [], maxRuns: 30 }
    ctx.on('graph/run-start', function (payload) { foldGraphEvents(store, 'graph/run-start', payload) })
    ctx.on('graph/node-start', function (payload) { foldGraphEvents(store, 'graph/node-start', payload) })
    ctx.on('graph/node-end', function (payload) { foldGraphEvents(store, 'graph/node-end', payload) })
    ctx.on('graph/run-end', function (payload) { foldGraphEvents(store, 'graph/run-end', payload) })
    ctx.effect(function () {
      return harness.handle('graph.live', function () { return graphLiveSnapshot(store) })
    })
  },
}
