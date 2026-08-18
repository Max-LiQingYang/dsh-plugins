// @dsh-plugins/workflow-visualizer — dynamic-plugin CLIENT source for cordis_define.
//
// This file is the exact `code.client` body of the v2 visualizer, verified
// live as wfviz-2/pkg-6 (run-8: completed), paired with src/dynamic-host.js.
//
// v2 highlights:
//   - restyled run cards: status pill, description, meta strip (agents done,
//     running now, average agent duration, throughput per minute, phase count)
//   - phase accordion: per-phase ✓/✗/↻ counts, progress bar, expandable
//   - per-agent drill-down: live status (running/idle), start/end clocks,
//     duration, child session id, and a one-click "open child session"
//     (ctx.sessions.open(childId)) to inspect the subagent's full execution
//   - script log() narration panel with relative timestamps
//   - zh/en labels via the locale service
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
      '.wfz-root{display:flex;flex-direction:column;gap:14px;height:100%;overflow-y:auto;padding:18px 20px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;box-sizing:border-box;font-variant-numeric:tabular-nums;}',
      '.wfz-title{font-weight:650;font-size:15px;display:flex;align-items:baseline;gap:10px;letter-spacing:.01em;}',
      '.wfz-sub{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:400;}',
      '.wfz-empty{color:var(--dsw-alias-label-secondary);border:1px dashed var(--dsw-alias-border-l2);border-radius:14px;padding:36px 24px;text-align:center;line-height:1.8;}',
      '.wfz-run{border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);padding:14px 16px;display:flex;flex-direction:column;gap:10px;overflow:hidden;}',
      '.wfz-runhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}',
      '.wfz-dot{width:9px;height:9px;border-radius:50%;flex:none;box-shadow:0 0 0 3px color-mix(in srgb,currentColor 12%,transparent);}',
      '.wfz-dot-running{color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary);animation:wfz-pulse 1.4s ease-in-out infinite;}',
      '.wfz-dot-completed{color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-state-success-primary);}',
      '.wfz-dot-cancelled{color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-state-warn-primary);}',
      '.wfz-dot-error{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-state-error-primary);}',
      '@keyframes wfz-pulse{0%,100%{opacity:1}50%{opacity:.3}}',
      '.wfz-name{font-weight:650;font-size:14px;letter-spacing:.01em;}',
      '.wfz-pill{font-size:11px;font-weight:600;line-height:18px;padding:0 9px;border-radius:999px;letter-spacing:.03em;text-transform:uppercase;}',
      '.wfz-pill-running{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 13%,transparent);}',
      '.wfz-pill-completed{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 13%,transparent);}',
      '.wfz-pill-cancelled{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 13%,transparent);}',
      '.wfz-pill-error{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 13%,transparent);}',
      '.wfz-desc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
      '.wfz-meta{display:flex;gap:14px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary);font-size:11.5px;}',
      '.wfz-meta b{color:var(--dsw-alias-label-primary);font-weight:600;}',
      '.wfz-bar{display:flex;height:5px;border-radius:3px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);gap:1px;}',
      '.wfz-seg-done{background:var(--dsw-alias-state-success-primary);}',
      '.wfz-seg-fail{background:var(--dsw-alias-state-error-primary);}',
      '.wfz-seg-run{background:var(--dsw-alias-brand-primary);animation:wfz-pulse 1.4s ease-in-out infinite;}',
      '.wfz-seg-can{background:var(--dsw-alias-state-warn-primary);opacity:.55;}',
      '.wfz-phlist{display:flex;flex-direction:column;gap:2px;}',
      '.wfz-ph{border:1px solid transparent;border-radius:10px;}',
      '.wfz-ph:hover{border-color:var(--dsw-alias-border-l1);}',
      '.wfz-phhead{display:flex;align-items:center;gap:9px;padding:6px 8px;cursor:pointer;user-select:none;border-radius:10px;}',
      '.wfz-phhead:hover{background:var(--dsw-alias-bg-layer-2);}',
      '.wfz-phidx{flex:none;width:20px;height:20px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;}',
      '.wfz-phtitle{flex:1;min-width:0;font-weight:550;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.wfz-phtitle.pending{color:var(--dsw-alias-label-secondary);font-weight:400;}',
      '.wfz-phcounts{display:flex;gap:8px;align-items:center;font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;}',
      '.wfz-cok{color:var(--dsw-alias-state-success-primary);font-weight:600;}',
      '.wfz-cfail{color:var(--dsw-alias-state-error-primary);font-weight:600;}',
      '.wfz-crun{color:var(--dsw-alias-brand-primary);font-weight:600;}',
      '.wfz-chev{flex:none;color:var(--dsw-alias-label-secondary);font-size:10px;width:14px;text-align:center;transition:transform .15s ease;}',
      '.wfz-chev.open{transform:rotate(90deg);}',
      '.wfz-aglist{margin:0 8px 6px 28px;padding:2px 0 0 10px;border-left:2px solid var(--dsw-alias-border-l1);display:flex;flex-direction:column;gap:1px;}',
      '.wfz-ag{border-radius:8px;}',
      '.wfz-ag:hover{background:var(--dsw-alias-bg-layer-2);}',
      '.wfz-agrow{display:grid;grid-template-columns:30px 1fr auto auto;gap:8px;align-items:center;font-size:12px;padding:3px 8px;cursor:pointer;user-select:none;}',
      '.wfz-aglabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.wfz-chip{font-size:10.5px;font-weight:600;line-height:17px;padding:0 7px;border-radius:999px;letter-spacing:.02em;}',
      '.wfz-chip-completed{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);}',
      '.wfz-chip-failed{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);}',
      '.wfz-chip-cancelled{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent);}',
      '.wfz-chip-running{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);}',
      '.wfz-agdetail{margin:0 8px 4px 38px;padding:8px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);display:flex;flex-direction:column;gap:5px;font-size:11.5px;color:var(--dsw-alias-label-secondary);}',
      '.wfz-kv{display:flex;gap:8px;align-items:baseline;}',
      '.wfz-kv b{flex:none;width:64px;color:var(--dsw-alias-label-secondary);font-weight:500;}',
      '.wfz-kv span{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;}',
      '.wfz-open{align-self:flex-start;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-brand-primary);border-radius:7px;padding:3px 10px;font-size:11px;font-weight:600;}',
      '.wfz-open:hover{border-color:var(--dsw-alias-brand-primary);}',
      '.wfz-logs{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;background:var(--dsw-alias-bg-layer-2);border-radius:10px;padding:9px 12px;max-height:200px;overflow-y:auto;color:var(--dsw-alias-label-secondary);display:flex;flex-direction:column;gap:2px;}',
      '.wfz-logts{color:var(--dsw-alias-brand-primary);opacity:.7;}',
      '.wfz-err{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent);border-radius:8px;padding:7px 10px;overflow-wrap:anywhere;}',
      '.wfz-btn{cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:7px;padding:2px 10px;font-size:11px;font-weight:550;}',
      '.wfz-btn:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-secondary);}',
      '.wfz-dock{box-sizing:border-box;display:flex;align-items:center;gap:10px;padding:6px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);font-size:12px;font-variant-numeric:tabular-nums;}',
      '.wfz-dockname{font-weight:600;white-space:nowrap;}',
      '.wfz-dockbar{flex:1;display:flex;height:5px;border-radius:3px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);gap:1px;min-width:80px;}',
    ].join('\n')

    // ── i18n (zh default, en fallback) ─────────────────────────────────
    var zh = true
    var locale = ctx.get('locale')
    if (locale !== undefined) {
      try {
        var lsnap = typeof locale.getSnapshot === 'function' ? locale.getSnapshot() : undefined
        if (lsnap !== undefined && typeof lsnap.id === 'string') zh = lsnap.id.indexOf('zh') === 0
      } catch (e) {}
    }
    var T = {
      runs: zh ? '个运行' : 'runs',
      active: zh ? '进行中' : 'active',
      agents: zh ? '代理' : 'agents',
      avg: zh ? '均耗' : 'avg',
      rate: zh ? '吞吐' : 'rate',
      perMin: zh ? '个/分' : '/min',
      running: zh ? '运行中' : 'running',
      idle: zh ? '待命' : 'idle',
      completed: zh ? '完成' : 'completed',
      failed: zh ? '失败' : 'failed',
      cancelled: zh ? '已取消' : 'cancelled',
      pending: zh ? '未开始' : 'pending',
      unphased: zh ? '未分组' : 'unphased',
      logs: zh ? '日志' : 'log',
      agent: zh ? '代理' : 'agent',
      phase: zh ? '阶段' : 'phase',
      childId: zh ? '子会话' : 'child',
      started: zh ? '开始' : 'started',
      ended: zh ? '结束' : 'ended',
      duration: zh ? '耗时' : 'duration',
      openSession: zh ? '打开子会话查看执行过程 →' : 'Open child session →',
      empty: zh ? '还没有 workflow 运行。\n让 agent 通过 workflow 工具运行多代理编排，阶段、代理与进度会实时出现在这里。' : 'No workflow runs yet.\nAsk the agent to run a multi-agent workflow; phases, agents and progress will appear here live.',
      connecting: zh ? '正在连接宿主…' : 'connecting to host…',
    }

    var sessions = ctx.get('sessions')

    function fmtDuration(ms) {
      if (ms === null || ms === undefined || ms < 0) ms = 0
      var s = Math.floor(ms / 1000)
      var m = Math.floor(s / 60)
      var h = Math.floor(m / 60)
      if (h > 0) return h + 'h ' + (m % 60) + 'm'
      if (m > 0) return m + 'm ' + (s % 60) + 's'
      return s + 's'
    }

    function fmtClock(ts) {
      if (ts === null || ts === undefined) return '—'
      var d = new Date(ts)
      var p = function (n) { return n < 10 ? '0' + n : String(n) }
      return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
    }

    function Bar(props) {
      var total = props.total
      if (!total) return React.createElement('div', { className: 'wfz-bar' })
      var pct = function (n) { return (n / total) * 100 + '%' }
      var segs = []
      if (props.completed) segs.push(React.createElement('div', { key: 'd', className: 'wfz-seg-done', style: { width: pct(props.completed) } }))
      if (props.failed) segs.push(React.createElement('div', { key: 'f', className: 'wfz-seg-fail', style: { width: pct(props.failed) } }))
      if (props.cancelled) segs.push(React.createElement('div', { key: 'c', className: 'wfz-seg-can', style: { width: pct(props.cancelled) } }))
      if (props.running) segs.push(React.createElement('div', { key: 'r', className: 'wfz-seg-run', style: { width: pct(props.running) } }))
      return React.createElement('div', { className: 'wfz-bar' }, segs)
    }

    function agentStatus(a) {
      if (a.outcome !== null && a.outcome !== undefined) return a.outcome
      return 'running'
    }

    function AgentRow(props) {
      var a = props.agent
      var now = props.now
      var open = props.openSeq === a.seq
      var status = agentStatus(a)
      var live = a.outcome === null || a.outcome === undefined
        ? (a.live === 'idle' ? T.idle : T.running)
        : null
      var dur = (a.outcome === null || a.outcome === undefined ? now : a.endedAt) - a.startedAt
      var chipLabel = status === 'running' ? (live || T.running) : T[status] || status
      var rows = []
      rows.push(React.createElement('span', { key: 's', className: 'wfz-sub' }, '#' + a.seq))
      rows.push(React.createElement('span', { key: 'l', className: 'wfz-aglabel', title: a.label }, a.label))
      rows.push(React.createElement('span', { key: 'c', className: 'wfz-chip wfz-chip-' + status }, chipLabel))
      rows.push(React.createElement('span', { key: 'd', className: 'wfz-sub' }, fmtDuration(dur)))
      var el = React.createElement('div', {
        className: 'wfz-agrow',
        onClick: function () { props.setOpenSeq(open ? null : a.seq) },
      }, rows)
      if (!open) return React.createElement('div', { className: 'wfz-ag' }, el)
      var detail = React.createElement('div', { className: 'wfz-agdetail' }, [
        React.createElement('div', { key: 'p', className: 'wfz-kv' },
          React.createElement('b', null, T.phase),
          React.createElement('span', null, a.phase || T.unphased)),
        React.createElement('div', { key: 't', className: 'wfz-kv' },
          React.createElement('b', null, T.duration),
          React.createElement('span', null,
            fmtClock(a.startedAt) + ' → ' + (a.endedAt !== null && a.endedAt !== undefined ? fmtClock(a.endedAt) : '…') +
            ' (' + fmtDuration(dur) + ')')),
        a.childId
          ? React.createElement('div', { key: 'c', className: 'wfz-kv' },
              React.createElement('b', null, T.childId),
              React.createElement('span', null, a.childId))
          : null,
        a.childId && sessions !== undefined && typeof sessions.open === 'function'
          ? React.createElement('button', {
              key: 'o', className: 'wfz-open',
              onClick: function (e) { e.stopPropagation(); try { sessions.open(a.childId) } catch (err) {} },
            }, T.openSession)
          : null,
      ])
      return React.createElement('div', { className: 'wfz-ag' }, [el, detail])
    }

    function PhaseBlock(props) {
      var p = props.phase
      var idx = props.idx
      var agents = props.agents
      var open = props.openTitle === p.title
      var pending = p.total === 0
      var done = p.completed + p.failed + p.cancelled
      var counts = []
      if (p.completed) counts.push(React.createElement('span', { key: 'ok', className: 'wfz-cok' }, '✓ ' + p.completed))
      if (p.failed) counts.push(React.createElement('span', { key: 'fl', className: 'wfz-cfail' }, '✗ ' + p.failed))
      if (p.running) counts.push(React.createElement('span', { key: 'rn', className: 'wfz-crun' }, '↻ ' + p.running))
      if (p.cancelled) counts.push(React.createElement('span', { key: 'cn', className: 'wfz-sub' }, '⊘ ' + p.cancelled))
      counts.push(React.createElement('span', { key: 'tt', className: 'wfz-sub' }, done + '/' + p.total))
      var head = React.createElement('div', {
        className: 'wfz-phhead',
        onClick: function () { props.setOpenTitle(open ? null : p.title) },
      }, [
        React.createElement('span', { key: 'i', className: 'wfz-phidx' }, String(idx)),
        React.createElement('span', { key: 't', className: 'wfz-phtitle' + (pending ? ' pending' : ''), title: p.title }, p.title),
        React.createElement('span', { key: 'c', className: 'wfz-phcounts' },
          pending ? [React.createElement('span', { key: 'pd' }, T.pending)] : counts),
        React.createElement('span', { key: 'v', className: 'wfz-chev' + (open ? ' open' : '') }, '▶'),
      ])
      var body = null
      if (open && agents.length > 0) {
        body = React.createElement('div', { className: 'wfz-aglist' }, agents.map(function (a) {
          return React.createElement(AgentRow, { key: a.seq, agent: a, now: props.now, openSeq: props.openSeq, setOpenSeq: props.setOpenSeq })
        }))
      } else if (open) {
        body = React.createElement('div', { className: 'wfz-aglist' },
          React.createElement('span', { className: 'wfz-sub', style: { padding: '2px 8px' } }, T.pending + ' · ' + T.agents + ' 0'))
      }
      return React.createElement('div', { className: 'wfz-ph' }, [head,
        open ? React.createElement('div', { key: 'pb', style: { padding: '0 8px 6px' } },
          React.createElement(Bar, { total: p.total, completed: p.completed, failed: p.failed, cancelled: p.cancelled, running: p.running })) : null,
        body])
    }

    function RunCard(props) {
      var run = props.run
      var now = props.now
      var stO = React.useState(null)
      var openTitle = stO[0]
      var setOpenTitle = stO[1]
      var stA = React.useState(null)
      var openSeq = stA[0]
      var setOpenSeq = stA[1]
      var stL = React.useState(false)
      var logsOpen = stL[0]
      var setLogsOpen = stL[1]

      var status = run.stopReason === null ? 'running' : run.stopReason
      var c = run.agentCounts
      var done = c.completed + c.failed + c.cancelled
      var elapsed = (run.stopReason === null ? now : run.endedAt) - run.startedAt
      var avg = 0, avgN = 0
      for (var i = 0; i < run.agents.length; i++) {
        var a = run.agents[i]
        if (a.endedAt !== null && a.endedAt !== undefined) { avg += a.endedAt - a.startedAt; avgN++ }
      }
      if (avgN > 0) avg = avg / avgN
      var rate = elapsed > 3000 ? (done / (elapsed / 60000)) : 0

      var head = React.createElement('div', { className: 'wfz-runhead' }, [
        React.createElement('span', { key: 'd', className: 'wfz-dot wfz-dot-' + status }),
        React.createElement('span', { key: 'n', className: 'wfz-name' }, run.name),
        React.createElement('span', { key: 'p', className: 'wfz-pill wfz-pill-' + status }, status),
        React.createElement('span', { key: 'sp', style: { flex: 1 } }),
        React.createElement('span', { key: 't', className: 'wfz-sub' }, fmtDuration(elapsed)),
        run.logs.length > 0
          ? React.createElement('button', { key: 'lg', className: 'wfz-btn', onClick: function () { setLogsOpen(!logsOpen) } }, T.logs + ' (' + run.logs.length + ')')
          : null,
      ])

      var desc = run.description ? React.createElement('div', { className: 'wfz-desc', title: run.description }, run.description) : null

      var meta = React.createElement('div', { className: 'wfz-meta' }, [
        React.createElement('span', { key: 'a' }, T.agents + ' ', React.createElement('b', null, done + '/' + c.total),
          c.running > 0 ? React.createElement('span', { key: 'r', className: 'wfz-crun' }, ' · ↻ ' + c.running) : null),
        c.failed > 0 ? React.createElement('span', { key: 'f', className: 'wfz-cfail' }, '✗ ' + c.failed) : null,
        avgN > 0 ? React.createElement('span', { key: 'v' }, T.avg + ' ', React.createElement('b', null, fmtDuration(avg))) : null,
        rate >= 1 ? React.createElement('span', { key: 'rt' }, T.rate + ' ', React.createElement('b', null, Math.round(rate * 10) / 10 + T.perMin)) : null,
        React.createElement('span', { key: 'ph' }, T.phase + ' ', React.createElement('b', null, String(run.phases.length))),
      ])

      var overall = React.createElement(Bar, c)

      var phaseIdx = 0
      var phaseBlocks = run.phases.map(function (p) {
        phaseIdx++
        var ags = []
        for (var j = 0; j < run.agents.length; j++) {
          var at = run.agents[j].phase
          var atTitle = at !== null && at !== undefined ? at : T.unphased
          if (atTitle === p.title) ags.push(run.agents[j])
        }
        return React.createElement(PhaseBlock, { key: p.title, phase: p, idx: phaseIdx, agents: ags, now: now, openTitle: openTitle, setOpenTitle: setOpenTitle, openSeq: openSeq, setOpenSeq: setOpenSeq })
      })

      var logs = null
      if (logsOpen && run.logs.length > 0) {
        logs = React.createElement('div', { className: 'wfz-logs' }, run.logs.map(function (l, i2) {
          return React.createElement('span', { key: i2 },
            React.createElement('span', { className: 'wfz-logts' }, '[' + fmtDuration(l.ts - run.startedAt) + '] '), l.message)
        }))
      }

      return React.createElement('div', { className: 'wfz-run' }, [
        head, desc, meta, overall,
        run.phases.length > 0 ? React.createElement('div', { key: 'phs', className: 'wfz-phlist' }, phaseBlocks) : null,
        run.error !== null && run.error !== undefined
          ? React.createElement('div', { key: 'er', className: 'wfz-err' }, String(run.error))
          : null,
        logs,
      ])
    }

    function WorkflowsView() {
      var data = useWorkflows(1000)
      if (data === null) {
        return React.createElement('div', { className: 'wfz-root' },
          React.createElement('div', { className: 'wfz-empty' }, T.connecting))
      }
      var runs = data.runs
      var active = 0
      for (var i = 0; i < runs.length; i++) if (runs[i].stopReason === null) active++
      var children = [React.createElement('div', { key: 't', className: 'wfz-title' },
        'Workflows',
        React.createElement('span', { className: 'wfz-sub' },
          runs.length + ' ' + T.runs + ' · ' + active + ' ' + T.active))]
      if (runs.length === 0) {
        children.push(React.createElement('div', { key: 'e', className: 'wfz-empty', style: { whiteSpace: 'pre-line' } }, T.empty))
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
      var lastPhase = run.phases.length > 0 ? run.phases[run.phases.length - 1].title : ''
      return React.createElement('div', { className: 'wfz-dock' }, [
        React.createElement('span', { key: 'd', className: 'wfz-dot wfz-dot-running' }),
        React.createElement('span', { key: 'n', className: 'wfz-dockname' }, run.name),
        lastPhase ? React.createElement('span', { key: 'p', className: 'wfz-sub' }, lastPhase) : null,
        React.createElement('div', { key: 'b', className: 'wfz-dockbar' }, [
          c.completed > 0 ? React.createElement('div', { key: 'd1', className: 'wfz-seg-done', style: { width: (c.completed / c.total) * 100 + '%' } }) : null,
          c.failed > 0 ? React.createElement('div', { key: 'f', className: 'wfz-seg-fail', style: { width: (c.failed / c.total) * 100 + '%' } }) : null,
          c.running > 0 ? React.createElement('div', { key: 'r', className: 'wfz-seg-run', style: { width: (c.running / c.total) * 100 + '%' } }) : null,
        ]),
        React.createElement('span', { key: 'c', className: 'wfz-sub' },
          T.agents + ' ' + done + '/' + c.total + ' · ' + fmtDuration(data.now - run.startedAt) + (extra > 0 ? ' · +' + extra : '')),
      ])
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
