// @dsh-plugins/workflow-visualizer — dynamic-plugin CLIENT source for cordis_define.
//
// This file is the exact `code.client` body verified live in a DSH session
// (pluginId wfviz-2, package pkg-4, run-4: completed), paired with
// src/dynamic-host.js. It registers two slots:
//
//   - conversation.view (id "workflows") — the Workflows view tab: per-run
//     cards with status, elapsed time, overall + per-phase progress bars,
//     expandable agent details, and the script's log() narration lines;
//   - conversation.input.dock (id "workflow-live") — a live progress strip
//     above the composer while any run is active.
//
// Usage: paste everything below into the `code.client` field of a
// cordis_define call (plugin.kind: "new", idPrefix: e.g. "wfviz"), with
// src/dynamic-host.js as `code.host`. Then cordis_run the returned
// pluginId/packageId and authorize the client half.
//
// The body relies on the dynamic-client builtins only: React, styles, host,
// ctx (as the apply parameter) — and the `timer` service via inject.

return {
  inject: ['timer'],
  apply(ctx) {
    var CSS = [
      '.wfz-root{display:flex;flex-direction:column;gap:12px;height:100%;overflow-y:auto;padding:16px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;box-sizing:border-box;}',
      '.wfz-title{font-weight:600;font-size:14px;display:flex;align-items:center;gap:8px;}',
      '.wfz-sub{color:var(--dsw-alias-label-secondary);font-size:12px;}',
      '.wfz-card{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:12px 14px;display:flex;flex-direction:column;gap:8px;}',
      '.wfz-runhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}',
      '.wfz-dot{width:8px;height:8px;border-radius:50%;flex:none;}',
      '.wfz-dot.running{background:var(--dsw-alias-brand-primary);animation:wfz-pulse 1.2s ease-in-out infinite;}',
      '.wfz-dot.completed{background:var(--dsw-alias-state-success-primary);}',
      '.wfz-dot.cancelled{background:var(--dsw-alias-state-warn-primary);}',
      '.wfz-dot.error{background:var(--dsw-alias-state-error-primary);}',
      '@keyframes wfz-pulse{0%,100%{opacity:1}50%{opacity:.35}}',
      '.wfz-name{font-weight:600;}',
      '.wfz-badge{font-size:11px;padding:1px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);}',
      '.wfz-bar{display:flex;height:6px;border-radius:3px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);min-width:60px;}',
      '.wfz-seg-done{background:var(--dsw-alias-state-success-primary);}',
      '.wfz-seg-fail{background:var(--dsw-alias-state-error-primary);}',
      '.wfz-seg-run{background:var(--dsw-alias-brand-primary);animation:wfz-pulse 1.2s ease-in-out infinite;}',
      '.wfz-phases{display:flex;flex-direction:column;gap:5px;}',
      '.wfz-phase{display:grid;grid-template-columns:minmax(110px,220px) 1fr auto;gap:10px;align-items:center;}',
      '.wfz-phaselabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:12px;}',
      '.wfz-phasecount{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;}',
      '.wfz-agents{border-top:1px dashed var(--dsw-alias-border-l1);padding-top:6px;display:flex;flex-direction:column;gap:2px;max-height:240px;overflow-y:auto;}',
      '.wfz-agentrow{display:grid;grid-template-columns:32px 1fr auto auto;gap:8px;align-items:center;font-size:12px;padding:2px 0;}',
      '.wfz-agentlabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.wfz-out{font-size:11px;padding:0 7px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);}',
      '.wfz-out.completed{color:var(--dsw-alias-state-success-primary);}',
      '.wfz-out.failed{color:var(--dsw-alias-state-error-primary);}',
      '.wfz-out.cancelled{color:var(--dsw-alias-state-warn-primary);}',
      '.wfz-out.running{color:var(--dsw-alias-brand-primary);}',
      '.wfz-logs{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;background:var(--dsw-alias-bg-layer-2);border-radius:8px;padding:8px 10px;max-height:180px;overflow-y:auto;color:var(--dsw-alias-label-secondary);display:flex;flex-direction:column;gap:2px;}',
      '.wfz-btn{cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;padding:2px 9px;font-size:11px;}',
      '.wfz-btn:hover{color:var(--dsw-alias-label-primary);}',
      '.wfz-dock{display:flex;align-items:center;gap:10px;padding:5px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);font-size:12px;width:100%;box-sizing:border-box;}',
      '.wfz-dockbar{flex:1;display:flex;height:5px;border-radius:3px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);min-width:80px;}',
      '.wfz-empty{color:var(--dsw-alias-label-secondary);border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;padding:28px 20px;text-align:center;}',
    ].join('\n')

    function fmtDuration(ms) {
      if (ms === null || ms === undefined || ms < 0) ms = 0
      var s = Math.floor(ms / 1000)
      var m = Math.floor(s / 60)
      var h = Math.floor(m / 60)
      if (h > 0) return h + 'h ' + (m % 60) + 'm'
      if (m > 0) return m + 'm ' + (s % 60) + 's'
      return s + 's'
    }

    function Bar(props) {
      var total = props.total
      if (!total) return React.createElement('div', { className: 'wfz-bar' })
      var pct = function (n) { return (n / total) * 100 + '%' }
      var segs = []
      if (props.completed) segs.push(React.createElement('div', { key: 'd', className: 'wfz-seg-done', style: { width: pct(props.completed) } }))
      if (props.failed) segs.push(React.createElement('div', { key: 'f', className: 'wfz-seg-fail', style: { width: pct(props.failed) } }))
      if (props.cancelled) segs.push(React.createElement('div', { key: 'c', className: 'wfz-seg-fail', style: { width: pct(props.cancelled), opacity: 0.5 } }))
      if (props.running) segs.push(React.createElement('div', { key: 'r', className: 'wfz-seg-run', style: { width: pct(props.running) } }))
      return React.createElement('div', { className: 'wfz-bar' }, segs)
    }

    function RunCard(props) {
      var run = props.run
      var now = props.now
      var st = React.useState(false)
      var open = st[0]
      var setOpen = st[1]
      var lt = React.useState(false)
      var logsOpen = lt[0]
      var setLogsOpen = lt[1]

      var status = run.stopReason === null ? 'running' : run.stopReason
      var c = run.agentCounts
      var done = c.completed + c.failed + c.cancelled
      var elapsed = (run.stopReason === null ? now : run.endedAt) - run.startedAt

      var head = React.createElement('div', { className: 'wfz-runhead' },
        React.createElement('span', { className: 'wfz-dot ' + status }),
        React.createElement('span', { className: 'wfz-name' }, run.name),
        React.createElement('span', { className: 'wfz-badge' }, status),
        React.createElement('span', { className: 'wfz-sub' }, 'agents ' + done + '/' + c.total),
        React.createElement('span', { className: 'wfz-sub' }, fmtDuration(elapsed)),
        React.createElement('span', { style: { flex: 1 } }),
        React.createElement('button', { className: 'wfz-btn', onClick: function () { setOpen(!open) } }, open ? 'hide agents' : 'agents (' + c.total + ')'),
        run.logs.length > 0
          ? React.createElement('button', { className: 'wfz-btn', onClick: function () { setLogsOpen(!logsOpen) } }, logsOpen ? 'hide log' : 'log (' + run.logs.length + ')')
          : null,
      )

      var overall = React.createElement(Bar, { total: c.total, completed: c.completed, failed: c.failed, cancelled: c.cancelled, running: c.running })

      var phaseRows = run.phases.map(function (p, i) {
        var pdone = p.completed + p.failed + p.cancelled
        return React.createElement('div', { className: 'wfz-phase', key: i },
          React.createElement('span', { className: 'wfz-phaselabel', title: p.title }, p.title),
          React.createElement(Bar, { total: p.total, completed: p.completed, failed: p.failed, cancelled: p.cancelled, running: p.running }),
          React.createElement('span', { className: 'wfz-phasecount' }, p.total === 0 ? 'pending' : pdone + '/' + p.total + (p.failed ? ' · ' + p.failed + ' failed' : '')),
        )
      })

      var agentRows = null
      if (open) {
        agentRows = React.createElement('div', { className: 'wfz-agents' }, run.agents.map(function (a) {
          var aStatus = a.outcome === null ? 'running' : a.outcome
          var dur = (a.outcome === null ? now : a.endedAt) - a.startedAt
          return React.createElement('div', { className: 'wfz-agentrow', key: a.seq },
            React.createElement('span', { className: 'wfz-sub' }, '#' + a.seq),
            React.createElement('span', { className: 'wfz-agentlabel', title: a.label }, a.label),
            React.createElement('span', { className: 'wfz-out ' + aStatus }, aStatus),
            React.createElement('span', { className: 'wfz-sub' }, fmtDuration(dur)),
          )
        }))
      }

      var logs = null
      if (logsOpen) {
        logs = React.createElement('div', { className: 'wfz-logs' }, run.logs.map(function (l, i) {
          return React.createElement('span', { key: i }, '[' + fmtDuration(l.ts - run.startedAt) + '] ' + l.message)
        }))
      }

      return React.createElement('div', { className: 'wfz-card' },
        head,
        overall,
        run.phases.length > 0 ? React.createElement('div', { className: 'wfz-phases' }, phaseRows) : null,
        run.error !== null && run.error !== undefined
          ? React.createElement('div', { style: { color: 'var(--dsw-alias-state-error-primary)', fontSize: '12px' } }, String(run.error))
          : null,
        agentRows,
        logs,
      )
    }

    function WorkflowsView() {
      var data = useWorkflows(1000)
      if (data === null) {
        return React.createElement('div', { className: 'wfz-root' },
          React.createElement('div', { className: 'wfz-empty' }, 'connecting to host…'))
      }
      var runs = data.runs
      var active = 0
      for (var i = 0; i < runs.length; i++) if (runs[i].stopReason === null) active++
      var children = [React.createElement('div', { key: 't', className: 'wfz-title' },
        'Workflows',
        React.createElement('span', { className: 'wfz-sub' }, runs.length + ' run' + (runs.length === 1 ? '' : 's') + ' · ' + active + ' active'))]
      if (runs.length === 0) {
        children.push(React.createElement('div', { key: 'e', className: 'wfz-empty' },
          'No workflow runs yet. Ask the agent to run a multi-agent workflow (the workflow tool), and live phases, agents and logs will appear here.'))
      } else {
        for (var j = 0; j < runs.length; j++) {
          children.push(React.createElement(RunCard, { key: runs[j].id, run: runs[j], now: data.now }))
        }
      }
      return React.createElement('div', { className: 'wfz-root' }, children)
    }

    function DockStrip() {
      var data = useWorkflows(2500)
      if (data === null) return null
      var activeRuns = []
      for (var i = 0; i < data.runs.length; i++) {
        if (data.runs[i].stopReason === null) activeRuns.push(data.runs[i])
      }
      if (activeRuns.length === 0) return null
      var run = activeRuns[0]
      var c = run.agentCounts
      var done = c.completed + c.failed + c.cancelled
      var extra = activeRuns.length - 1
      return React.createElement('div', { className: 'wfz-dock' },
        React.createElement('span', { className: 'wfz-dot running' }),
        React.createElement('span', { style: { fontWeight: 600 } }, run.name),
        React.createElement('div', { className: 'wfz-dockbar' },
          c.completed > 0 ? React.createElement('div', { className: 'wfz-seg-done', style: { width: (c.completed / c.total) * 100 + '%' } }) : null,
          c.failed > 0 ? React.createElement('div', { className: 'wfz-seg-fail', style: { width: (c.failed / c.total) * 100 + '%' } }) : null,
          c.running > 0 ? React.createElement('div', { className: 'wfz-seg-run', style: { width: (c.running / c.total) * 100 + '%' } }) : null),
        React.createElement('span', { className: 'wfz-sub' }, 'agents ' + done + '/' + c.total + ' · ' + fmtDuration(data.now - run.startedAt) + (extra > 0 ? ' · +' + extra + ' more' : '')),
      )
    }

    function useWorkflows(pollMs) {
      var st = React.useState(null)
      var data = st[0]
      var setData = st[1]
      React.useEffect(function () {
        var alive = true
        var tick = function () {
          host.call('workflows.state').then(function (next) {
            if (alive) setData(next)
          }, function () {})
        }
        tick()
        var stop = ctx.interval(tick, pollMs)
        return function () { alive = false; stop() }
      }, [pollMs])
      return data
    }

    var slots = ctx.get('slots')
    if (slots === undefined) return

    ctx.effect(function () { return styles.insert(CSS) })

    slots.inject('conversation.view', function () {
      slots.register(
        { name: 'conversation.view', id: 'workflows', order: 15, label: 'Workflows' },
        WorkflowsView,
      )
    })

    slots.inject('conversation.input.dock', function () {
      slots.register(
        { name: 'conversation.input.dock', id: 'workflow-live', order: 5, label: 'Workflows live' },
        DockStrip,
      )
    })
  },
}
