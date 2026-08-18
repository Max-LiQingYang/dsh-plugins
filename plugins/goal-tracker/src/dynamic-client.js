// @dsh-plugins/goal-tracker — dynamic-plugin source for cordis_define.
//
// This file is the exact `code.client` body that was verified live in a DSH
// session (pluginId gtrack-1, package pkg-2). It renders the same
// OpenCode-style goal tracker as the installable client module
// (../client.js), but through the dynamic-plugin toolset — no host
// composition change, no restart.
//
// Usage: paste everything below into the `code.client` field of a
// cordis_define call (plugin.kind: "new", idPrefix: e.g. "gtrack"), then
// cordis_run the returned pluginId/packageId and authorize the client half.
// The body relies on the dynamic-client builtins only: React, styles, ctx.
// It vanishes when the DSH process restarts.
//
// Requires: DSH >= 0.1.0-rc.7 with the goal service mounted (dsh-base) and
// the web app's `conversation.input.dock` slot.

const CSS = `
.gt-dock{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance) - var(--dsh-composer-side-clearance) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));margin:0 auto}
.gt-bar{box-sizing:border-box;width:100%;max-width:calc(var(--dsh-composer-card-max-width) - 4 * var(--dsh-composer-dock-inset));display:flex;align-items:center;gap:8px;height:36px;margin:0 auto;padding:0 12px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:12px;cursor:pointer;user-select:none}
.gt-bar:hover{border-color:var(--dsw-alias-border-l2)}
.gt-dot{width:8px;height:8px;border-radius:50%;flex:none}
.gt-dot-active{background:var(--dsw-alias-state-success-primary);animation:gt-pulse 1.6s ease-in-out infinite}
.gt-dot-paused{background:var(--dsw-alias-state-warn-primary)}
.gt-dot-blocked{background:var(--dsw-alias-state-error-primary);animation:gt-pulse 1.1s ease-in-out infinite}
.gt-dot-complete{background:var(--dsw-alias-state-success-primary)}
@keyframes gt-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.gt-chip{flex:none;font-size:11px;font-weight:600;line-height:20px;padding:0 8px;border-radius:999px;letter-spacing:.02em}
.gt-chip-active{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent)}
.gt-chip-paused{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 14%, transparent)}
.gt-chip-blocked{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 14%, transparent)}
.gt-chip-complete{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent)}
.gt-objective{flex:1;min-width:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gt-rounds{flex:none;font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}
.gt-track{flex:none;width:72px;height:4px;border-radius:2px;background:var(--dsw-alias-border-l1);overflow:hidden}
.gt-fill{height:100%;border-radius:2px;transition:width .3s ease}
.gt-fill-active{background:var(--dsw-alias-state-success-primary)}
.gt-fill-paused{background:var(--dsw-alias-state-warn-primary)}
.gt-fill-blocked{background:var(--dsw-alias-state-error-primary)}
.gt-fill-complete{background:var(--dsw-alias-state-success-primary)}
.gt-elapsed{flex:none;font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}
.gt-chevron{flex:none;font-size:11px;color:var(--dsw-alias-label-secondary)}
.gt-detail{box-sizing:border-box;width:100%;max-width:calc(var(--dsh-composer-card-max-width) - 4 * var(--dsh-composer-dock-inset));margin:4px auto 0;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;gap:6px}
.gt-row{display:flex;gap:10px;font-size:12px;line-height:18px}
.gt-row-k{flex:none;width:76px;color:var(--dsw-alias-label-secondary)}
.gt-row-v{min-width:0;flex:1;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.gt-blocked{border-top:1px solid var(--dsw-alias-border-l1);padding-top:6px;display:flex;gap:10px;font-size:12px;line-height:18px}
`

return {
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    const timer = ctx.get('timer')

    // Best-effort locale probe (zh vs en).
    let zh = true
    const locale = ctx.get('locale')
    if (locale) {
      try {
        const snap = typeof locale.getSnapshot === 'function'
          ? locale.getSnapshot()
          : typeof locale.getLocale === 'function' ? locale.getLocale() : undefined
        if (snap && typeof snap.id === 'string') zh = snap.id.indexOf('zh') === 0
      } catch (e) { /* best effort */ }
    }

    const T = {
      running: zh ? '进行中' : 'Running',
      paused: zh ? '已暂停' : 'Paused',
      blocked: zh ? '受阻' : 'Blocked',
      complete: zh ? '已完成' : 'Completed',
      round: zh ? '轮次' : 'Round',
      elapsed: zh ? '耗时' : 'elapsed',
      goal: zh ? '目标' : 'GOAL',
      created: zh ? '创建于' : 'Created',
      updated: zh ? '更新于' : 'Updated',
      duration: zh ? '总耗时' : 'duration',
      reason: zh ? '受阻原因' : 'Block reason',
    }

    function formatDuration(ms) {
      if (!(ms > 0)) return '0:00'
      const total = Math.floor(ms / 1000)
      const h = Math.floor(total / 3600)
      const m = Math.floor((total % 3600) / 60)
      const s = total % 60
      const mm = m < 10 ? '0' + m : String(m)
      const ss = s < 10 ? '0' + s : String(s)
      return h > 0 ? h + ':' + mm + ':' + ss : mm + ':' + ss
    }

    function formatClock(epochMs) {
      if (!(epochMs > 0)) return '—'
      const d = new Date(epochMs)
      const p = (n) => (n < 10 ? '0' + n : String(n))
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
    }

    function GoalTracker(props) {
      // Unconditional hooks first (React rules): the slot-provided projection
      // hook, ticking clock state, and the expand/collapse flag.
      const projection = typeof props.useProjection === 'function' ? props.useProjection('goal') : null
      const [now, setNow] = React.useState(() => (typeof Date !== 'undefined' ? Date.now() : 0))
      const [expanded, setExpanded] = React.useState(false)

      React.useEffect(() => {
        if (!timer) return undefined
        const dispose = timer.interval(() => {
          if (typeof Date !== 'undefined') setNow(Date.now())
        }, 1000)
        return dispose
      }, [])

      if (!projection || typeof projection !== 'object' || !projection.goal) return null
      const goal = projection.goal
      const objective = typeof goal.objective === 'string' ? goal.objective : ''
      const phase = (goal.phase === 'active' || goal.phase === 'paused' || goal.phase === 'blocked' || goal.phase === 'complete')
        ? goal.phase
        : 'active'
      const maxRounds = typeof goal.maxGoalRounds === 'number' && goal.maxGoalRounds > 0 ? goal.maxGoalRounds : 1
      const rounds = typeof projection.roundsStarted === 'number' ? projection.roundsStarted : 0
      const createdAt = typeof projection.createdAt === 'number' ? projection.createdAt : 0
      const updatedAt = typeof projection.updatedAt === 'number' ? projection.updatedAt : 0
      const blocked = goal.blockedReason && typeof goal.blockedReason === 'object' ? goal.blockedReason : null

      const percent = Math.min(100, Math.round((rounds / maxRounds) * 100))
      const elapsedMs = phase === 'complete' ? (updatedAt - createdAt) : (now - createdAt)
      const phaseLabel = phase === 'active' ? T.running : phase === 'paused' ? T.paused : phase === 'blocked' ? T.blocked : T.complete

      const bar = React.createElement('div', {
        className: 'gt-bar',
        role: 'button',
        tabIndex: 0,
        'aria-expanded': expanded,
        title: phase === 'blocked' && blocked && typeof blocked.message === 'string' ? blocked.message : objective,
        onClick: () => setExpanded(!expanded),
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded(!expanded)
          }
        },
      }, [
        React.createElement('span', { key: 'dot', className: 'gt-dot gt-dot-' + phase }),
        React.createElement('span', { key: 'chip', className: 'gt-chip gt-chip-' + phase }, phaseLabel),
        React.createElement('span', { key: 'obj', className: 'gt-objective', title: objective }, objective),
        React.createElement('span', { key: 'rounds', className: 'gt-rounds' }, T.round + ' ' + rounds + '/' + maxRounds),
        React.createElement('div', { key: 'track', className: 'gt-track' },
          React.createElement('div', { key: 'fill', className: 'gt-fill gt-fill-' + phase, style: { width: percent + '%' } })),
        React.createElement('span', { key: 'elapsed', className: 'gt-elapsed' }, T.elapsed + ' ' + formatDuration(elapsedMs)),
        React.createElement('span', { key: 'chevron', className: 'gt-chevron' }, expanded ? '▾' : '▸'),
      ])

      let detail = null
      if (expanded) {
        const rows = [
          [T.goal, objective],
          [T.round, rounds + ' / ' + maxRounds],
          [T.created, formatClock(createdAt)],
          [T.updated, formatClock(updatedAt)],
        ]
        if (phase === 'complete') rows.push([T.duration, formatDuration(updatedAt - createdAt)])
        const rowEls = rows.map((pair) => React.createElement('div', { key: pair[0], className: 'gt-row' },
          React.createElement('span', { className: 'gt-row-k' }, pair[0]),
          React.createElement('span', { className: 'gt-row-v' }, String(pair[1]))))
        const detailChildren = [rowEls]
        if (blocked) {
          detailChildren.push(React.createElement('div', { key: 'blocked', className: 'gt-blocked' },
            React.createElement('span', { className: 'gt-row-k' },
              T.reason + (typeof blocked.code === 'string' ? ' · ' + blocked.code : '')),
            React.createElement('span', { className: 'gt-row-v' },
              typeof blocked.message === 'string' ? blocked.message : '')))
        }
        detail = React.createElement('div', { key: 'detail', className: 'gt-detail' }, detailChildren)
      }

      return React.createElement('div', { className: 'gt-dock', 'data-goal-tracker': true }, [bar, detail])
    }

    styles.insert(CSS)
    slots.inject('conversation.input.dock', () => slots.register(
      { name: 'conversation.input.dock', id: 'goal-tracker', order: 20 },
      (props) => React.createElement(GoalTracker, { useProjection: props.useProjection }),
    ))
  },
}
