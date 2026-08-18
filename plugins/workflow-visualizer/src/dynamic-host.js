// @dsh-plugins/workflow-visualizer — dynamic-plugin HOST source for cordis_define.
//
// This file is the exact `code.host` body verified live in a DSH session
// (pluginId wfviz-2, package pkg-4, run-4: completed). It aggregates the
// in-memory `workflow/*` Cordis events (start/phase/log/agent-start/
// agent-end/end) plus `agent/status` into plain owned data, and serves a
// `workflows.state` snapshot to the browser half through the dynamic
// plugin's package-private RPC.
//
// Usage: paste everything below into the `code.host` field of a
// cordis_define call (plugin.kind: "new", idPrefix: e.g. "wfviz"), pairing
// it with src/dynamic-client.js as `code.client`. Then cordis_run the
// returned pluginId/packageId and authorize the client half.
//
// Compared with the installable client module (../client.js), the dynamic
// host half additionally captures what the durable session events do not
// carry: elapsed/duration timestamps per run and per agent, and the
// script's `log()` narration lines.

return {
  apply(ctx) {
    var MAX_RUNS = 50
    var runs = new Map()

    function record(info) {
      if (info === null || typeof info !== 'object' || typeof info.id !== 'string') return null
      var existing = runs.get(info.id)
      if (existing !== undefined) return existing
      var meta = (info && info.meta) || {}
      var declared = Array.isArray(meta.phases) ? meta.phases : []
      var r = {
        id: info.id,
        name: typeof meta.name === 'string' && meta.name !== '' ? meta.name : 'workflow',
        description: typeof meta.description === 'string' ? meta.description : '',
        declaredPhases: declared.map(function (p) {
          return p !== null && typeof p === 'object' && typeof p.title === 'string' ? p.title : String(p)
        }),
        phasesSeen: [],
        agents: [],
        logs: [],
        startedAt: Date.now(),
        endedAt: null,
        stopReason: null,
        error: null,
      }
      runs.set(info.id, r)
      if (runs.size > MAX_RUNS) {
        var ordered = []
        runs.forEach(function (v) { ordered.push(v) })
        ordered.sort(function (a, b) { return a.startedAt - b.startedAt })
        for (var i = 0; i < ordered.length && runs.size > MAX_RUNS; i++) {
          if (ordered[i].stopReason !== null) runs.delete(ordered[i].id)
        }
      }
      return r
    }

    ctx.on('workflow/start', function (info) { record(info) })

    ctx.on('workflow/phase', function (info, title) {
      var r = record(info)
      if (r === null || typeof title !== 'string') return
      if (r.phasesSeen.indexOf(title) === -1) r.phasesSeen.push(title)
    })

    ctx.on('workflow/log', function (info, message) {
      var r = record(info)
      if (r === null) return
      r.logs.push({ ts: Date.now(), message: typeof message === 'string' ? message : String(message) })
      if (r.logs.length > 200) r.logs.splice(0, r.logs.length - 200)
    })

    ctx.on('workflow/agent-start', function (info, agent) {
      var r = record(info)
      if (r === null || agent === null || typeof agent !== 'object') return
      var phase = typeof agent.phase === 'string' && agent.phase !== ''
        ? agent.phase
        : (r.phasesSeen.length > 0 ? r.phasesSeen[r.phasesSeen.length - 1] : null)
      if (phase !== null && r.phasesSeen.indexOf(phase) === -1) r.phasesSeen.push(phase)
      r.agents.push({
        seq: typeof agent.seq === 'number' ? agent.seq : r.agents.length + 1,
        label: typeof agent.label === 'string' ? agent.label : 'agent',
        phase: phase,
        childId: typeof agent.childId === 'string' ? agent.childId : null,
        outcome: null,
        startedAt: Date.now(),
        endedAt: null,
      })
    })

    ctx.on('workflow/agent-end', function (info, agent) {
      var r = record(info)
      if (r === null || agent === null || typeof agent !== 'object') return
      for (var i = r.agents.length - 1; i >= 0; i--) {
        var a = r.agents[i]
        if (a.outcome === null && (a.seq === agent.seq || (a.childId !== null && a.childId === agent.childId))) {
          a.outcome = agent.outcome === 'completed' || agent.outcome === 'failed' || agent.outcome === 'cancelled' ? agent.outcome : 'completed'
          a.endedAt = Date.now()
          break
        }
      }
    })

    ctx.on('workflow/end', function (info, result) {
      var r = record(info)
      if (r === null) return
      r.endedAt = Date.now()
      r.stopReason = result !== null && typeof result === 'object' && typeof result.stopReason === 'string' ? result.stopReason : 'completed'
      r.error = result !== null && typeof result === 'object' && typeof result.error === 'string' ? result.error : null
      for (var i = 0; i < r.agents.length; i++) {
        if (r.agents[i].outcome === null) r.agents[i].outcome = 'cancelled'
      }
    })

    // live idle/running refinement for still-open children (leaf fields only)
    ctx.on('agent/status', function (payload) {
      if (payload === null || typeof payload !== 'object') return
      var agent = payload.agent
      var id = agent !== null && typeof agent === 'object' && typeof agent.id === 'string' ? agent.id : null
      var status = typeof payload.status === 'string' ? payload.status : null
      if (id === null || status === null) return
      runs.forEach(function (r) {
        if (r.stopReason !== null) return
        for (var i = 0; i < r.agents.length; i++) {
          var a = r.agents[i]
          if (a.outcome === null && a.childId === id) a.live = status
        }
      })
    })

    function snapshot() {
      var list = []
      runs.forEach(function (r) {
        var counts = { total: r.agents.length, completed: 0, failed: 0, cancelled: 0, running: 0 }
        var phaseMap = {}
        var phases = []
        var seen = r.phasesSeen.slice()
        for (var d = 0; d < r.declaredPhases.length; d++) {
          if (seen.indexOf(r.declaredPhases[d]) === -1) seen.push(r.declaredPhases[d])
        }
        function slot(title) {
          var p = phaseMap[title]
          if (p === undefined) {
            p = { title: title, total: 0, completed: 0, failed: 0, cancelled: 0, running: 0 }
            phaseMap[title] = p
            phases.push(p)
          }
          return p
        }
        for (var i = 0; i < r.agents.length; i++) {
          var a = r.agents[i]
          var p = slot(a.phase !== null && a.phase !== undefined ? a.phase : '(unphased)')
          p.total++
          if (a.outcome === null) { counts.running++; p.running++ }
          else { counts[a.outcome]++; p[a.outcome]++ }
        }
        var agents = r.agents.slice(-400).map(function (a) {
          return {
            seq: a.seq,
            label: a.label,
            phase: a.phase,
            outcome: a.outcome,
            startedAt: a.startedAt,
            endedAt: a.endedAt,
          }
        })
        list.push({
          id: r.id,
          name: r.name,
          description: r.description,
          startedAt: r.startedAt,
          endedAt: r.endedAt,
          stopReason: r.stopReason,
          error: r.error,
          agentCounts: counts,
          phases: phases,
          agents: agents,
          logs: r.logs.slice(-60),
        })
      })
      list.sort(function (a, b) { return b.startedAt - a.startedAt })
      return { now: Date.now(), runs: list }
    }

    ctx.effect(function () {
      return harness.handle('workflows.state', function () { return snapshot() })
    })
  },
}
