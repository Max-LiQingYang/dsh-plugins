// @dsh-plugins/goal-tracker — dynamic-plugin source for cordis_define.
//
// This file is the `code.client` body verified live in a DSH session
// (pluginId gtrack-1, package pkg-7; this copy merges two equivalent
// phase-condition lines and drops an unused translation key). It renders the
// enhanced OpenCode-style goal tracker as the installable client module
// (../client.js), but through the dynamic-plugin toolset — no host
// composition change, no restart.
//
// Usage: paste everything below into the `code.client` field of a
// cordis_define call (plugin.kind: "new", idPrefix: e.g. "gtrack"), then
// cordis_run the returned pluginId/packageId and authorize the client half.
// The body relies on the dynamic-client builtins only: React, styles, ctx.
// It vanishes when the DSH process restarts.
//
// Features:
// - Control verbs through the product remote service `ctx.get('remote.goals')`
//   (optional — the tracker degrades to read-only when absent): pause /
//   resume / complete / clear, inline edit of objective + max rounds, and a
//   "new goal" entry when no goal exists.
// - Status: phase badge, round stepper, percent, progress bar, live elapsed
//   time, revision chip, always-visible blocked banner, relative update time.
// - OpenCode-style visuals: phase accent border, circular badge, hover
//   layers, gradient progress, focus ring.
//
// Requires: DSH >= 0.1.0-rc.7 with the goal service mounted (dsh-base), the
// web app's `conversation.input.dock` slot, and dsh-api-remotes for the
// control verbs.

const CSS = `
.gt-dock{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance) - var(--dsh-composer-side-clearance) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));margin:0 auto}
.gt-bar{box-sizing:border-box;width:100%;max-width:calc(var(--dsh-composer-card-max-width) - 4 * var(--dsh-composer-dock-inset));display:flex;align-items:center;gap:10px;min-height:40px;margin:0 auto;padding:6px 8px 6px 12px;border:1px solid var(--dsw-alias-border-l1);border-left:3px solid transparent;background:var(--dsw-alias-bg-layer-1);border-radius:12px;cursor:pointer;user-select:none;transition:border-color .15s ease, background .15s ease}
.gt-bar:hover{background:var(--dsw-alias-bg-layer-2)}
.gt-bar:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.gt-bar-active{border-left-color:var(--dsw-alias-state-success-primary)}
.gt-bar-paused{border-left-color:var(--dsw-alias-state-warn-primary)}
.gt-bar-blocked{border-left-color:var(--dsw-alias-state-error-primary)}
.gt-bar-complete{border-left-color:var(--dsw-alias-state-success-primary)}
.gt-badge{flex:none;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;line-height:1;color:var(--dsw-alias-bg-base)}
.gt-badge-active{background:var(--dsw-alias-state-success-primary);animation:gt-pulse 1.6s ease-in-out infinite}
.gt-badge-paused{background:var(--dsw-alias-state-warn-primary)}
.gt-badge-blocked{background:var(--dsw-alias-state-error-primary);animation:gt-pulse 1.1s ease-in-out infinite}
.gt-badge-complete{background:var(--dsw-alias-state-success-primary)}
@keyframes gt-pulse{0%,100%{opacity:1}50%{opacity:.55}}
.gt-chip{flex:none;font-size:11px;font-weight:600;line-height:20px;padding:0 8px;border-radius:999px;letter-spacing:.02em}
.gt-chip-active{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent)}
.gt-chip-paused{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 14%, transparent)}
.gt-chip-blocked{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 14%, transparent)}
.gt-chip-complete{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent)}
.gt-objective{flex:1;min-width:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gt-meta{flex:none;display:flex;align-items:center;gap:8px}
.gt-rounds{font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}
.gt-percent{font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;white-space:nowrap;min-width:30px;text-align:right}
.gt-track{width:64px;height:5px;border-radius:3px;background:var(--dsw-alias-border-l1);overflow:hidden}
.gt-fill{height:100%;border-radius:3px;transition:width .3s ease}
.gt-fill-active{background:linear-gradient(90deg, var(--dsw-alias-state-success-primary), color-mix(in srgb, var(--dsw-alias-state-success-primary) 55%, var(--dsw-alias-brand-primary)))}
.gt-fill-paused{background:var(--dsw-alias-state-warn-primary)}
.gt-fill-blocked{background:var(--dsw-alias-state-error-primary)}
.gt-fill-complete{background:var(--dsw-alias-state-success-primary)}
.gt-elapsed{font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}
.gt-rev{flex:none;font-size:10px;color:var(--dsw-alias-label-tertiary);border:1px solid var(--dsw-alias-border-l1);border-radius:4px;padding:0 4px;line-height:14px;white-space:nowrap;font-variant-numeric:tabular-nums}
.gt-controls{flex:none;display:flex;align-items:center;gap:2px}
.gt-icon-btn{width:26px;height:26px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;line-height:1;padding:0;font-family:inherit}
.gt-icon-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.gt-icon-btn:disabled{opacity:.4;cursor:default}
.gt-chevron{flex:none;font-size:11px;color:var(--dsw-alias-label-tertiary)}
.gt-banner{box-sizing:border-box;width:100%;max-width:calc(var(--dsh-composer-card-max-width) - 4 * var(--dsh-composer-dock-inset));margin:4px auto 0;padding:6px 12px;border-radius:10px;font-size:12px;line-height:18px;display:flex;gap:8px;align-items:baseline}
.gt-banner-blocked{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);border:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent);color:var(--dsw-alias-state-error-primary)}
.gt-banner-error{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);border:1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 30%, transparent);color:var(--dsw-alias-state-warn-primary)}
.gt-banner-code{font-weight:600;flex:none}
.gt-form{box-sizing:border-box;width:100%;max-width:calc(var(--dsh-composer-card-max-width) - 4 * var(--dsh-composer-dock-inset));margin:0 auto;display:flex;align-items:center;gap:8px;min-height:40px;padding:6px 8px 6px 12px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:12px}
.gt-input{flex:1;min-width:0;height:26px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:7px;outline:none;padding:0 8px;font-size:13px}
.gt-input:focus{border-color:var(--dsw-alias-state-business-primary)}
.gt-input-num{flex:none;width:72px}
.gt-trigger{box-sizing:border-box;width:100%;max-width:calc(var(--dsh-composer-card-max-width) - 4 * var(--dsh-composer-dock-inset));display:flex;align-items:center;gap:8px;min-height:36px;margin:0 auto;padding:0 12px;border:1px dashed var(--dsw-alias-border-l2);background:transparent;border-radius:12px;color:var(--dsw-alias-label-secondary);font-size:13px;cursor:pointer;transition:border-color .15s ease, color .15s ease}
.gt-trigger:hover{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary)}
.gt-detail{box-sizing:border-box;width:100%;max-width:calc(var(--dsh-composer-card-max-width) - 4 * var(--dsh-composer-dock-inset));margin:4px auto 0;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;gap:6px}
.gt-row{display:grid;grid-template-columns:92px 1fr;gap:2px 10px;font-size:12px;line-height:18px}
.gt-row-k{color:var(--dsw-alias-label-secondary)}
.gt-row-v{min-width:0;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.gt-blocked{border-top:1px solid var(--dsw-alias-border-l1);padding-top:6px;display:grid;grid-template-columns:92px 1fr;gap:2px 10px;font-size:12px;line-height:18px}
`

return {
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    const timer = ctx.get('timer')
    // Product service: goal mutation verbs exposed to the browser by the
    // api gateway (edit/pause/resume/complete/clear/create). Optional — the
    // tracker degrades to read-only when absent.
    const remoteGoals = ctx.get('remote.goals')

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
      revision: zh ? '修订' : 'Revision',
      progress: zh ? '进度' : 'Progress',
      pause: zh ? '暂停' : 'Pause',
      resume: zh ? '恢复' : 'Resume',
      completeBtn: zh ? '完成' : 'Complete',
      edit: zh ? '编辑' : 'Edit',
      clear: zh ? '清除' : 'Clear',
      save: zh ? '保存' : 'Save',
      cancel: zh ? '取消' : 'Cancel',
      newGoal: zh ? '＋ 新建目标' : '+ New goal',
      objectivePh: zh ? '目标内容…' : 'Goal objective…',
      roundsPh: zh ? '轮次上限' : 'Max rounds',
      justNow: zh ? '刚刚' : 'just now',
      minAgo: zh ? '分钟前' : 'min ago',
      hrAgo: zh ? '小时前' : 'h ago',
      daysAgo: zh ? '天前' : 'd ago',
      create: zh ? '创建' : 'Create',
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

    function formatRelative(epochMs, now) {
      if (!(epochMs > 0)) return '—'
      const diff = Math.max(0, now - epochMs)
      const s = Math.floor(diff / 1000)
      if (s < 60) return T.justNow
      const m = Math.floor(s / 60)
      if (m < 60) return m + ' ' + T.minAgo
      const h = Math.floor(m / 60)
      if (h < 24) return h + ' ' + T.hrAgo
      return Math.floor(h / 24) + ' ' + T.daysAgo
    }

    function GoalTracker(props) {
      const sessionId = props.sessionId
      // Unconditional hooks first (React rules).
      const projection = typeof props.useProjection === 'function' ? props.useProjection('goal') : null
      const [now, setNow] = React.useState(() => (typeof Date !== 'undefined' ? Date.now() : 0))
      const [expanded, setExpanded] = React.useState(false)
      const [editing, setEditing] = React.useState(false)
      const [draft, setDraft] = React.useState('')
      const [roundsDraft, setRoundsDraft] = React.useState('')
      const [creating, setCreating] = React.useState(false)
      const [createDraft, setCreateDraft] = React.useState('')
      const [createRounds, setCreateRounds] = React.useState('')
      const [pending, setPending] = React.useState(false)
      const [actionError, setActionError] = React.useState(null)
      const pendingRef = React.useRef(false)

      React.useEffect(() => {
        if (!timer) return undefined
        const dispose = timer.interval(() => {
          if (typeof Date !== 'undefined') setNow(Date.now())
        }, 1000)
        return dispose
      }, [])

      const goal = projection && typeof projection === 'object' ? projection.goal : null
      const canRemote = !!(remoteGoals && sessionId)

      const runAction = async (action) => {
        if (pendingRef.current) return null
        pendingRef.current = true
        setPending(true)
        setActionError(null)
        try {
          const result = await action()
          if (result && result.ok === false) {
            const err = result.error || {}
            setActionError((err.message || '') + (err.code ? ' (' + err.code + ')' : ''))
          }
          return result
        } catch (e) {
          setActionError(e && e.message ? String(e.message) : String(e))
          return null
        } finally {
          pendingRef.current = false
          setPending(false)
        }
      }

      // ── no goal: offer create when the remote service allows it ────────────
      if (!goal) {
        if (!canRemote || typeof remoteGoals.create !== 'function') return null
        if (!creating) {
          return React.createElement('button', {
            type: 'button',
            className: 'gt-trigger',
            onClick: () => setCreating(true),
          }, T.newGoal)
        }
        const doCreate = () => {
          const objective = createDraft.trim()
          if (!objective) return
          const request = { objective }
          const n = parseInt(createRounds, 10)
          if (Number.isFinite(n) && n > 0) request.maxGoalRounds = n
          runAction(() => remoteGoals.create(sessionId, request)).then((result) => {
            if (result && result.ok === false) return
            setCreating(false)
            setCreateDraft('')
            setCreateRounds('')
          })
        }
        return React.createElement('div', { className: 'gt-dock' }, [
          React.createElement('div', { key: 'form', className: 'gt-form' }, [
            React.createElement('input', {
              key: 'obj', className: 'gt-input', type: 'text',
              placeholder: T.objectivePh, value: createDraft,
              disabled: pending,
              onChange: (e) => setCreateDraft(e.target.value),
              onKeyDown: (e) => { if (e.key === 'Enter') doCreate() },
              autoFocus: true,
            }),
            React.createElement('input', {
              key: 'rounds', className: 'gt-input gt-input-num', type: 'number', min: '1',
              placeholder: T.roundsPh, value: createRounds,
              disabled: pending,
              onChange: (e) => setCreateRounds(e.target.value),
              onKeyDown: (e) => { if (e.key === 'Enter') doCreate() },
            }),
            React.createElement('button', {
              key: 'create', type: 'button', className: 'gt-icon-btn',
              title: T.create, 'aria-label': T.create,
              disabled: pending || createDraft.trim() === '',
              onClick: () => doCreate(),
            }, '＋'),
            React.createElement('button', {
              key: 'cancel', type: 'button', className: 'gt-icon-btn',
              title: T.cancel, 'aria-label': T.cancel,
              disabled: pending,
              onClick: () => { setCreating(false); setCreateDraft(''); setCreateRounds('') },
            }, '×'),
          ]),
          actionError !== null && React.createElement('div', { key: 'err', className: 'gt-banner gt-banner-error', role: 'alert' }, actionError),
        ])
      }

      // ── goal exists ────────────────────────────────────────────────────────
      const objective = typeof goal.objective === 'string' ? goal.objective : ''
      const phase = (goal.phase === 'active' || goal.phase === 'paused' || goal.phase === 'blocked' || goal.phase === 'complete')
        ? goal.phase
        : 'active'
      const maxRounds = typeof goal.maxGoalRounds === 'number' && goal.maxGoalRounds > 0 ? goal.maxGoalRounds : 1
      const rounds = typeof projection.roundsStarted === 'number' ? projection.roundsStarted : 0
      const createdAt = typeof projection.createdAt === 'number' ? projection.createdAt : 0
      const updatedAt = typeof projection.updatedAt === 'number' ? projection.updatedAt : 0
      const revision = typeof goal.revision === 'number' ? goal.revision : 0
      const blocked = goal.blockedReason && typeof goal.blockedReason === 'object' ? goal.blockedReason : null

      const percent = Math.min(100, Math.round((rounds / maxRounds) * 100))
      const elapsedMs = phase === 'complete' ? (updatedAt - createdAt) : (now - createdAt)
      const phaseLabel = phase === 'active' ? T.running : phase === 'paused' ? T.paused : phase === 'blocked' ? T.blocked : T.complete
      const glyph = phase === 'active' ? '●' : phase === 'paused' ? '⏸' : phase === 'blocked' ? '⚠' : '✓'
      const refOf = { id: goal.id, revision }

      const verbs = canRemote ? {
        pause: typeof remoteGoals.pause === 'function' ? () => remoteGoals.pause(sessionId, refOf) : null,
        resume: typeof remoteGoals.resume === 'function' ? () => remoteGoals.resume(sessionId, refOf) : null,
        complete: typeof remoteGoals.complete === 'function' ? () => remoteGoals.complete(sessionId, refOf) : null,
        clear: typeof remoteGoals.clear === 'function' ? () => remoteGoals.clear(sessionId, refOf) : null,
        edit: typeof remoteGoals.edit === 'function' ? (obj, maxR) => {
          const req = { objective: obj }
          const n = parseInt(maxR, 10)
          if (Number.isFinite(n) && n > 0) req.maxGoalRounds = n
          return remoteGoals.edit(sessionId, refOf, req)
        } : null,
      } : null

      const stop = (e) => { e.stopPropagation() }
      const iconBtn = (key, label, glyphText, onClick, disabled) => React.createElement('button', {
        key, type: 'button', className: 'gt-icon-btn',
        title: label, 'aria-label': label,
        disabled: disabled || pending,
        onClick: (e) => { stop(e); onClick() },
      }, glyphText)

      // edit mode: inline form replacing the bar
      if (editing) {
        const saveEdit = () => {
          const trimmed = draft.trim()
          if (!trimmed) return
          runAction(() => verbs.edit(trimmed, roundsDraft)).then((result) => {
            if (result && result.ok === false) return
            setEditing(false)
            setDraft('')
            setRoundsDraft('')
          })
        }
        const formChildren = [
          React.createElement('input', {
            key: 'obj', className: 'gt-input', type: 'text',
            placeholder: T.objectivePh, value: draft,
            disabled: pending,
            onChange: (e) => setDraft(e.target.value),
            onKeyDown: (e) => { if (e.key === 'Enter') saveEdit() },
            autoFocus: true,
          }),
          React.createElement('input', {
            key: 'rounds', className: 'gt-input gt-input-num', type: 'number', min: '1',
            placeholder: String(maxRounds), value: roundsDraft,
            disabled: pending,
            onChange: (e) => setRoundsDraft(e.target.value),
            onKeyDown: (e) => { if (e.key === 'Enter') saveEdit() },
          }),
          iconBtn('save', T.save, '✓', saveEdit, draft.trim() === ''),
          iconBtn('cancel', T.cancel, '×', () => { setEditing(false); setDraft(''); setRoundsDraft('') }),
        ]
        return React.createElement('div', { className: 'gt-dock' }, [
          React.createElement('div', { key: 'form', className: 'gt-form' }, formChildren),
          actionError !== null && React.createElement('div', { key: 'err', className: 'gt-banner gt-banner-error', role: 'alert' }, actionError),
        ])
      }

      // normal bar
      const meta = React.createElement('div', { key: 'meta', className: 'gt-meta' }, [
        React.createElement('span', { key: 'rounds', className: 'gt-rounds' },
          T.round + ' ' + rounds + '/' + maxRounds),
        React.createElement('div', { key: 'track', className: 'gt-track' },
          React.createElement('div', { key: 'fill', className: 'gt-fill gt-fill-' + phase, style: { width: percent + '%' } })),
        React.createElement('span', { key: 'pct', className: 'gt-percent' }, percent + '%'),
        React.createElement('span', { key: 'elapsed', className: 'gt-elapsed' },
          T.elapsed + ' ' + formatDuration(elapsedMs)),
        React.createElement('span', { key: 'rev', className: 'gt-rev' }, 'rev ' + revision),
      ])

      const controls = []
      if (verbs) {
        if (phase === 'active' && verbs.pause) controls.push(iconBtn('pause', T.pause, '⏸', () => runAction(verbs.pause)))
        if ((phase === 'paused' || phase === 'blocked') && verbs.resume) controls.push(iconBtn('resume', T.resume, '▶', () => runAction(verbs.resume)))
        if (phase === 'active' && verbs.complete) controls.push(iconBtn('complete', T.completeBtn, '✓', () => runAction(verbs.complete)))
        if (verbs.edit) controls.push(iconBtn('edit', T.edit, '✎', () => { setDraft(objective); setRoundsDraft(String(maxRounds)); setEditing(true) }))
        if (verbs.clear) controls.push(iconBtn('clear', T.clear, '×', () => runAction(verbs.clear)))
      }
      controls.push(React.createElement('span', {
        key: 'chevron', className: 'gt-chevron',
        onClick: (e) => { stop(e); setExpanded(!expanded) },
      }, expanded ? '▾' : '▸'))

      const bar = React.createElement('div', {
        className: 'gt-bar gt-bar-' + phase,
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
        React.createElement('span', { key: 'badge', className: 'gt-badge gt-badge-' + phase }, glyph),
        React.createElement('span', { key: 'chip', className: 'gt-chip gt-chip-' + phase }, phaseLabel),
        React.createElement('span', { key: 'obj', className: 'gt-objective', title: objective }, objective),
        meta,
        React.createElement('div', { key: 'controls', className: 'gt-controls' }, controls),
      ])

      const banners = []
      if (blocked) {
        banners.push(React.createElement('div', { key: 'blocked', className: 'gt-banner gt-banner-blocked', role: 'alert' }, [
          React.createElement('span', { key: 'code', className: 'gt-banner-code' },
            T.blocked + (typeof blocked.code === 'string' ? ' · ' + blocked.code : '')),
          React.createElement('span', { key: 'msg' }, typeof blocked.message === 'string' ? blocked.message : ''),
        ]))
      }
      if (actionError !== null) {
        banners.push(React.createElement('div', { key: 'err', className: 'gt-banner gt-banner-error', role: 'alert' }, actionError))
      }

      let detail = null
      if (expanded) {
        const rows = [
          [T.goal, objective],
          [T.round, rounds + ' / ' + maxRounds],
          [T.progress, percent + '%'],
          [T.created, formatClock(createdAt)],
          [T.updated, formatClock(updatedAt) + ' (' + formatRelative(updatedAt, now) + ')'],
          [T.revision, String(revision)],
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

      return React.createElement('div', { className: 'gt-dock', 'data-goal-tracker': true }, [bar, banners, detail])
    }

    styles.insert(CSS)
    slots.inject('conversation.input.dock', () => slots.register(
      { name: 'conversation.input.dock', id: 'goal-tracker', order: 20, inject: (sessionId) => ({ sessionId }) },
      (props) => React.createElement(GoalTracker, { useProjection: props.useProjection, sessionId: props.sessionId }),
    ))
  },
}
