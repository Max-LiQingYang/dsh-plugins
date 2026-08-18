// @dsh-plugins/goal-tracker — dynamic-plugin source for cordis_define.
//
// This file is the `code.client` body verified live in a DSH session
// (pluginId gtrack-1, package pkg-17; requires the pkg-14 host half for the live-round bridge). It renders the enhanced OpenCode-style
// goal tracker as the installable client module (../client.js), but through
// the dynamic-plugin toolset — no host composition change, no restart.
//
// Usage: paste everything below into the `code.client` field of a
// cordis_define call (plugin.kind: "new", idPrefix: e.g. "gtrack"), then
// cordis_run the returned pluginId/packageId and authorize the client half.
// The body relies on the dynamic-client builtins only: React, styles, ctx.
// It vanishes when the DSH process restarts.
//
// Features:
// - Control verbs through the product remote service `ctx.get('remote.goals')`
//   (optional — degrades to read-only when absent): pause / resume / complete /
//   clear, inline edit of objective + rounds, "new goal" entry.
// - Completion policy modes, written into the objective as an agent-readable
//   block and enforced via maxGoalRounds: agent-decides (default) / run-all-
//   rounds / agent + min-max rounds (hybrid) / unlimited (sentinel 999999).
// - Rounds default 16 in the create form; "unlimited rounds" toggle.
// - Status: phase badge, rounds, percent, progress bar, live elapsed time,
//   revision chip, always-visible blocked banner, relative update time.
//
// Requires: DSH >= 0.1.0-rc.7 with the goal service mounted (dsh-base), the
// web app's `conversation.input.dock` slot, and dsh-api-remotes for verbs.

const CSS = `
.gt-dock{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance) - var(--dsh-composer-side-clearance) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));margin:0 auto}
.gt-bar{box-sizing:border-box;width:100%;max-width:calc(var(--dsh-composer-card-max-width) - 4 * var(--dsh-composer-dock-inset));display:flex;align-items:center;gap:10px;min-height:40px;margin:0 auto;padding:6px 8px 6px 12px;border:1px solid var(--dsw-alias-border-l1);border-left:3px solid transparent;background:var(--dsw-alias-bg-layer-1);border-radius:12px;cursor:pointer;user-select:none;transition:border-color .15s ease, background .15s ease}
.gt-bar:hover{background:var(--dsw-alias-bg-layer-2)}
.gt-bar:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.gt-bar-active{border-left-color:var(--dsw-alias-state-success-primary)}
.gt-bar-paused{border-left-color:var(--dsw-alias-state-warn-primary)}
.gt-bar-blocked{border-left-color:var(--dsw-alias-state-error-primary)}
.gt-bar-complete{border-left-color:var(--dsw-alias-state-success-primary)}
@keyframes gt-sheen{0%{transform:translateX(-100%)}55%,100%{transform:translateX(100%)}}
.gt-chip{flex:none;position:relative;overflow:hidden;font-size:11px;font-weight:600;line-height:20px;padding:0 8px;border-radius:999px;letter-spacing:.02em}
.gt-chip-active{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent)}
.gt-chip-paused{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 14%, transparent)}
.gt-chip-blocked{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 14%, transparent)}
.gt-chip-complete{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent)}
@media (prefers-reduced-motion: no-preference){
  .gt-chip-active::after,.gt-chip-blocked::after,.gt-fill-active::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 42%,rgba(255,255,255,.38) 50%,transparent 58%);transform:translateX(-100%);animation:gt-sheen 3.2s ease-in-out infinite;pointer-events:none}
  .gt-chip-blocked::after{animation-duration:3.9s}
  .gt-fill-active::after{animation-duration:4.4s}
}
.gt-policy-chip{flex:none;font-size:10px;line-height:18px;padding:0 6px;border-radius:6px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);white-space:nowrap;font-variant-numeric:tabular-nums}
.gt-objective{flex:1;min-width:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gt-meta{flex:none;display:flex;align-items:center;gap:8px}
.gt-rounds{font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;cursor:help}
.gt-percent{font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;white-space:nowrap;min-width:30px;text-align:right}
.gt-track{width:64px;height:5px;border-radius:3px;background:var(--dsw-alias-border-l1);overflow:hidden}
.gt-fill{height:100%;border-radius:3px;transition:width .3s ease}
.gt-fill-active{position:relative;overflow:hidden;background:linear-gradient(90deg, var(--dsw-alias-state-success-primary), color-mix(in srgb, var(--dsw-alias-state-success-primary) 55%, var(--dsw-alias-brand-primary)))}
.gt-fill-paused{background:var(--dsw-alias-state-warn-primary)}
.gt-fill-blocked{background:var(--dsw-alias-state-error-primary)}
.gt-fill-complete{background:var(--dsw-alias-state-success-primary)}
.gt-elapsed{font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}
.gt-rev{flex:none;font-size:10px;color:var(--dsw-alias-label-tertiary);border:1px solid var(--dsw-alias-border-l1);border-radius:4px;padding:0 4px;line-height:14px;white-space:nowrap;font-variant-numeric:tabular-nums;cursor:help}
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
.gt-policy{border-top:1px solid var(--dsw-alias-border-l1);padding-top:6px;display:flex;flex-direction:column;gap:6px;font-size:12px}
.gt-policy-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.gt-select{height:26px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:7px;outline:none;padding:0 6px;font-size:12px}
.gt-check{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--dsw-alias-label-secondary);cursor:pointer}
.gt-check input{accent-color:var(--dsw-alias-state-business-primary)}
.gt-policy-hint{font-size:11px;color:var(--dsw-alias-label-caption)}
`

return {
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    const timer = ctx.get('timer')
    const remoteGoals = ctx.get('remote.goals')

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

    const UNLIMITED = 999999

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
      activation: zh ? '自动续跑' : 'Auto-continue',
      activationArmed: zh ? '已武装' : 'armed',
      activationDisarmed: zh ? '未武装' : 'disarmed',
      pause: zh ? '暂停' : 'Pause',
      resume: zh ? '恢复' : 'Resume',
      raiseCap: zh ? '提高上限' : 'Raise cap',
      exhaustedHint: zh ? '轮次已耗尽，请先提高轮数上限（✎ 编辑或完成策略）后再恢复' : 'Round budget exhausted — raise the cap (✎ edit or policy) before resuming',
      completeBtn: zh ? '完成' : 'Complete',
      edit: zh ? '编辑' : 'Edit',
      clear: zh ? '清除' : 'Clear',
      save: zh ? '保存' : 'Save',
      cancel: zh ? '取消' : 'Cancel',
      newGoal: zh ? '＋ 新建目标' : '+ New goal',
      objectivePh: zh ? '目标内容…' : 'Goal objective…',
      roundsPh: zh ? '轮数上限' : 'Max rounds',
      justNow: zh ? '刚刚' : 'just now',
      minAgo: zh ? '分钟前' : 'min ago',
      hrAgo: zh ? '小时前' : 'h ago',
      daysAgo: zh ? '天前' : 'd ago',
      create: zh ? '创建' : 'Create',
      revTip: zh ? '目标修订号：每次修改 +1' : 'Goal revision: +1 per update',
      roundsTip: zh ? '已执行轮数 / 轮数上限' : 'Rounds run / cap',
      policy: zh ? '完成策略' : 'Completion policy',
      policyShortAgent: zh ? 'agent 决定' : 'agent decides',
      policyShortRounds: zh ? '跑满' : 'run',
      policyShortRoundsTail: zh ? '轮' : ' rounds',
      policyShortHybridMin: zh ? '最少' : 'min',
      policyShortHybridMax: zh ? '最多' : 'max',
      policyShortUnlimited: zh ? '无限' : '∞',
      modeAgent: zh ? '由 agent 决定是否完成' : 'Agent decides',
      modeRounds: zh ? '必须执行完指定轮次' : 'Run all rounds',
      modeHybrid: zh ? 'agent 决定 + 最少/最多轮数' : 'Agent + min/max rounds',
      modeUnlimited: zh ? '无限执行（不自行完成）' : 'Unlimited (never self-completes)',
      minLabel: zh ? '最少轮数' : 'Min rounds',
      maxLabel: zh ? '最多轮数' : 'Max rounds',
      maxRoundsLabel: zh ? '轮数上限' : 'Round cap',
      applyPolicy: zh ? '应用策略' : 'Apply',
      unlimitedToggle: zh ? '无限轮次' : 'Unlimited rounds',
      unlimitedText: zh ? '无限' : '∞',
      policyHint: zh ? '策略会写入目标文本，agent 每轮都会看到并遵守；轮次上限由驱动器硬性执行（跑满自动受阻）；无限模式永不自行完成，直到用户暂停/清除' : 'The policy is written into the objective so the agent sees it every round; the round cap is enforced by the driver (auto-blocked when exhausted); unlimited mode never self-completes until the user pauses or clears',
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

    function num(v) {
      const n = parseInt(String(v), 10)
      return Number.isFinite(n) && n > 0 ? n : 0
    }

    // Completion-policy block embedded in the objective (agent-readable).
    // Uses full-width brackets ［］ in stored text; parsing accepts both.
    const POLICY_RE = /[\[［]完成策略：[^\]］]*[\]］]/g

    function buildPolicy(mode, min, max) {
      if (mode === 'rounds') return '［完成策略：必须执行完 ' + (max > 0 ? max : 16) + ' 轮后才可完成］'
      if (mode === 'hybrid') {
        const parts = []
        if (min > 0) parts.push('最少 ' + min + ' 轮')
        if (max > 0) parts.push('最多 ' + max + ' 轮')
        if (parts.length === 0) return ''
        return '［完成策略：agent 决定完成时机，但' + parts.join('、') + '］'
      }
      if (mode === 'unlimited') return '［完成策略：无限执行，持续推进直到用户手动停止，不得自行完成］'
      return ''
    }

    function parsePolicy(objective) {
      const blocks = objective.match(POLICY_RE) || []
      const clean = objective.replace(POLICY_RE, '').replace(/\n{3,}/g, '\n\n').trim()
      const block = blocks.length > 0 ? blocks[blocks.length - 1] : ''
      if (block.indexOf('必须执行完') >= 0) {
        const m = block.match(/\d+/)
        return { mode: 'rounds', min: 0, max: m ? num(m[0]) : 16, clean: clean }
      }
      if (block.indexOf('无限') >= 0) return { mode: 'unlimited', min: 0, max: 0, clean: clean }
      if (block.indexOf('最少') >= 0 || block.indexOf('最多') >= 0) {
        const mi = block.match(/最少 (\d+)/)
        const ma = block.match(/最多 (\d+)/)
        return { mode: 'hybrid', min: mi ? num(mi[1]) : 0, max: ma ? num(ma[1]) : 0, clean: clean }
      }
      return { mode: 'agent', min: 0, max: 0, clean: clean }
    }

    function GoalTracker(props) {
      const sessionId = props.sessionId
      const projection = typeof props.useProjection === 'function' ? props.useProjection('goal') : null
      const [now, setNow] = React.useState(() => (typeof Date !== 'undefined' ? Date.now() : 0))
      const [expanded, setExpanded] = React.useState(false)
      const [editing, setEditing] = React.useState(false)
      const [draft, setDraft] = React.useState('')
      const [roundsDraft, setRoundsDraft] = React.useState('')
      const [creating, setCreating] = React.useState(false)
      const [createDraft, setCreateDraft] = React.useState('')
      const [createRounds, setCreateRounds] = React.useState('16')
      const [createUnlimited, setCreateUnlimited] = React.useState(false)
      const [modeDraft, setModeDraft] = React.useState('agent')
      const [minDraft, setMinDraft] = React.useState('')
      const [maxDraft, setMaxDraft] = React.useState('')
      const [pending, setPending] = React.useState(false)
      const [actionError, setActionError] = React.useState(null)
      const [liveRounds, setLiveRounds] = React.useState(null)
      const pendingRef = React.useRef(false)
      const lastApplyAt = React.useRef(0)

      React.useEffect(() => {
        if (!timer) return undefined
        const dispose = timer.interval(() => {
          if (typeof Date !== 'undefined') setNow(Date.now())
        }, 1000)
        return dispose
      }, [])

      // Prefill the policy editor with the goal's CURRENT mode when opened,
      // so a stray apply cannot silently strip or change the policy.
      const parsedPolicyRef = React.useRef(null)
      React.useEffect(() => {
        if (!expanded) return
        const p = parsedPolicyRef.current
        if (!p) return
        setModeDraft(p.mode)
        setMinDraft(p.min > 0 ? String(p.min) : '')
        setMaxDraft(p.max > 0 ? String(p.max) : '')
      }, [expanded])

      const goal = projection && typeof projection === 'object' ? projection.goal : null
      const canRemote = !!(remoteGoals && sessionId)

      // Live rounds bridge: the client goal projection only refreshes on
      // goal/change mutations, so poll the host GoalView for the live round
      // count (and activation) while a goal exists.
      const goalId = goal ? goal.id : null
      React.useEffect(() => {
        // `host` is a dynamic-package builtin; the static client module does
        // not provide it, so the bridge silently degrades to the projection.
        const h = typeof host !== 'undefined' && typeof host.call === 'function' ? host : null
        if (!goalId || !sessionId || !h) return undefined
        let alive = true
        const poll = () => {
          h.call('goal/live', { sessionId: sessionId }).then((r) => {
            if (alive && r && typeof r === 'object' && typeof r.roundsStarted === 'number') setLiveRounds(r)
          }).catch(() => {})
        }
        poll()
        if (!timer) return () => { alive = false }
        const dispose = timer.interval(poll, 2000)
        return () => { alive = false; dispose() }
      }, [goalId, sessionId])

      const runAction = async (action) => {
        if (pendingRef.current) return null
        pendingRef.current = true
        setPending(true)
        setActionError(null)
        try {
          const result = await action()
          if (result && result.ok === false) {
            const err = result.error || {}
            const raw = (err.message || '') + (err.code ? ' (' + err.code + ')' : '')
            // Friendly mapping for the exhausted-round resume rejection.
            if ((err.code === 'GOAL_INVALID_TRANSITION' || /exhausted/i.test(err.message || '')) && /maxGoalRounds|rounds/i.test(err.message || '')) {
              setActionError(T.exhaustedHint)
            } else {
              setActionError(raw)
            }
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

      // ── no goal: create entry ─────────────────────────────────────────────
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
          const request = { objective: objective }
          if (createUnlimited) {
            request.maxGoalRounds = UNLIMITED
            request.objective = objective + '\n\n' + buildPolicy('unlimited', 0, 0)
          } else {
            const n = num(createRounds)
            request.maxGoalRounds = n > 0 ? n : 16
          }
          runAction(() => remoteGoals.create(sessionId, request)).then((result) => {
            if (result && result.ok === false) return
            setCreating(false)
            setCreateDraft('')
            setCreateRounds('16')
            setCreateUnlimited(false)
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
              title: T.roundsTip, placeholder: '16', value: createUnlimited ? '' : createRounds,
              disabled: pending || createUnlimited,
              onChange: (e) => setCreateRounds(e.target.value),
              onKeyDown: (e) => { if (e.key === 'Enter') doCreate() },
            }),
            React.createElement('label', { key: 'unl', className: 'gt-check' },
              React.createElement('input', {
                type: 'checkbox', checked: createUnlimited,
                disabled: pending,
                onChange: (e) => setCreateUnlimited(e.target.checked),
              }),
              T.unlimitedToggle),
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
              onClick: () => { setCreating(false); setCreateDraft(''); setCreateRounds('16'); setCreateUnlimited(false) },
            }, '×'),
          ]),
          actionError !== null && React.createElement('div', { key: 'err', className: 'gt-banner gt-banner-error', role: 'alert' }, actionError),
        ])
      }

      // ── goal exists ────────────────────────────────────────────────────────
      const rawObjective = typeof goal.objective === 'string' ? goal.objective : ''
      const policy = parsePolicy(rawObjective)
      parsedPolicyRef.current = policy
      const objective = policy.clean
      const phase = (goal.phase === 'active' || goal.phase === 'paused' || goal.phase === 'blocked' || goal.phase === 'complete')
        ? goal.phase
        : 'active'
      const maxRounds = typeof goal.maxGoalRounds === 'number' && goal.maxGoalRounds > 0 ? goal.maxGoalRounds : 1
      const unlimited = maxRounds >= UNLIMITED
      const rounds = typeof projection.roundsStarted === 'number' ? projection.roundsStarted : 0
      const displayRounds = liveRounds !== null && typeof liveRounds.roundsStarted === 'number' ? liveRounds.roundsStarted : rounds
      const activation = liveRounds !== null && typeof liveRounds.activation === 'string' ? liveRounds.activation : null
      const createdAt = typeof projection.createdAt === 'number' ? projection.createdAt : 0
      const updatedAt = typeof projection.updatedAt === 'number' ? projection.updatedAt : 0
      const revision = typeof goal.revision === 'number' ? goal.revision : 0
      const blocked = goal.blockedReason && typeof goal.blockedReason === 'object' ? goal.blockedReason : null
      // Exhausted only while the CURRENT cap is still reached: raising the cap
      // makes resume legal again even though the blocked reason still says round-limit.
      const exhausted = blocked !== null && blocked.code === 'round-limit' && displayRounds >= maxRounds

      const percent = unlimited ? Math.min(100, Math.round((displayRounds / 9999) * 100)) : Math.min(100, Math.round((displayRounds / maxRounds) * 100))
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
          const n = num(maxR)
          if (n > 0) req.maxGoalRounds = n
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

      let policyShort = null
      if (policy.mode === 'rounds') policyShort = T.policyShortRounds + ' ' + (policy.max > 0 ? policy.max : maxRounds) + T.policyShortRoundsTail
      else if (policy.mode === 'hybrid') {
        const parts = []
        if (policy.min > 0) parts.push(T.policyShortHybridMin + ' ' + policy.min)
        if (policy.max > 0) parts.push(T.policyShortHybridMax + ' ' + policy.max)
        policyShort = parts.join('·')
      } else if (policy.mode === 'unlimited') policyShort = T.policyShortUnlimited
      else policyShort = T.policyShortAgent

      const modeLabel = policy.mode === 'rounds'
        ? T.modeRounds + '（' + (policy.max > 0 ? policy.max : maxRounds) + '）'
        : policy.mode === 'hybrid'
          ? T.modeHybrid + (policy.min > 0 ? '（最少 ' + policy.min + '）' : '') + (policy.max > 0 ? '（最多 ' + policy.max + '）' : '')
          : policy.mode === 'unlimited' ? T.modeUnlimited : T.modeAgent

      // edit mode: inline form replacing the bar
      if (editing) {
        const saveEdit = () => {
          const trimmed = draft.trim()
          if (!trimmed) return
          const block = buildPolicy(policy.mode, policy.min, policy.max)
          const nextObjective = trimmed + (block ? '\n\n' + block : '')
          runAction(() => verbs.edit(nextObjective, roundsDraft)).then((result) => {
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
            title: T.roundsTip, placeholder: unlimited ? T.unlimitedText : String(maxRounds),
            value: unlimited && roundsDraft === '' ? '' : roundsDraft,
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
        React.createElement('span', { key: 'rounds', className: 'gt-rounds', title: T.roundsTip },
          T.round + ' ' + displayRounds + '/' + (unlimited ? T.unlimitedText : maxRounds)),
        React.createElement('div', { key: 'track', className: 'gt-track' },
          React.createElement('div', { key: 'fill', className: 'gt-fill gt-fill-' + phase, style: { width: percent + '%' } })),
        React.createElement('span', { key: 'pct', className: 'gt-percent' }, percent + '%'),
        React.createElement('span', { key: 'elapsed', className: 'gt-elapsed' },
          T.elapsed + ' ' + formatDuration(elapsedMs)),
        React.createElement('span', { key: 'rev', className: 'gt-rev', title: T.revTip }, 'rev ' + revision),
      ])

      const controls = []
      if (verbs) {
        if (phase === 'active' && verbs.pause) controls.push(iconBtn('pause', T.pause, '⏸', () => runAction(verbs.pause)))
        if (phase === 'blocked' && exhausted && verbs.edit) {
          // Round budget exhausted: resume would be rejected; offer raising the cap.
          controls.push(iconBtn('raise', T.raiseCap, '↥', () => { setDraft(objective); setRoundsDraft(''); setEditing(true) }))
        } else if ((phase === 'paused' || phase === 'blocked') && verbs.resume) {
          controls.push(iconBtn('resume', T.resume, '▶', () => runAction(verbs.resume)))
        }
        // In unlimited mode the goal must never be completed: no ✓ button.
        if (phase === 'active' && !unlimited && verbs.complete) controls.push(iconBtn('complete', T.completeBtn, '✓', () => runAction(verbs.complete)))
        if (verbs.edit) controls.push(iconBtn('edit', T.edit, '✎', () => { setDraft(objective); setRoundsDraft(''); setEditing(true) }))
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
        React.createElement('span', { key: 'chip', className: 'gt-chip gt-chip-' + phase }, phaseLabel),
        React.createElement('span', { key: 'policy', className: 'gt-policy-chip', title: T.policy + '：' + modeLabel }, policyShort),
        React.createElement('span', { key: 'obj', className: 'gt-objective', title: objective }, objective),
        meta,
        React.createElement('div', { key: 'controls', className: 'gt-controls' }, controls),
      ])

      const banners = []
      if (blocked) {
        banners.push(React.createElement('div', { key: 'blocked', className: 'gt-banner gt-banner-blocked', role: 'alert' }, [
          React.createElement('span', { key: 'code', className: 'gt-banner-code' },
            T.blocked + (typeof blocked.code === 'string' ? ' · ' + blocked.code : '')),
          React.createElement('span', { key: 'msg' },
            (typeof blocked.message === 'string' ? blocked.message : '') + (exhausted ? ' — ' + T.exhaustedHint : '')),
        ]))
      }
      if (actionError !== null) {
        banners.push(React.createElement('div', { key: 'err', className: 'gt-banner gt-banner-error', role: 'alert' }, actionError))
      }

      let detail = null
      if (expanded) {
        const rows = [
          [T.goal, objective],
          [T.round, displayRounds + ' / ' + (unlimited ? T.unlimitedText : maxRounds)],
          [T.progress, percent + '%'],
          [T.policy, modeLabel],
          [T.created, formatClock(createdAt)],
          [T.updated, formatClock(updatedAt) + ' (' + formatRelative(updatedAt, now) + ')'],
          [T.revision, String(revision)],
        ]
        if (activation !== null) rows.push([T.activation, activation === 'armed' ? T.activationArmed : T.activationDisarmed])
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
        // completion-policy editor
        if (verbs && verbs.edit) {
          const applyPolicy = () => {
            // Debounce: ignore re-entrant applies within 800ms (a duplicated
            // click must not run the mutation twice with reset state).
            const t = typeof Date !== 'undefined' ? Date.now() : 0
            if (t - lastApplyAt.current < 800) return
            lastApplyAt.current = t
            const mMode = modeDraft
            const mMin = num(minDraft)
            const mMax = num(maxDraft)
            let nextMax = maxRounds
            if (mMode === 'rounds') nextMax = mMax > 0 ? mMax : 16
            else if (mMode === 'hybrid') nextMax = mMax > 0 ? mMax : maxRounds
            else if (mMode === 'unlimited') nextMax = UNLIMITED
            else nextMax = mMax > 0 ? mMax : maxRounds // agent: cap adjustable, no policy block
            const block = buildPolicy(mMode, mMin, mMax)
            const nextObjective = objective + (block ? '\n\n' + block : '')
            runAction(() => verbs.edit(nextObjective, String(nextMax))).then((result) => {
              if (result && result.ok === false) return
              // Keep the editor state as applied (no reset race); close panel.
              setExpanded(false)
            })
          }
          const policyChildren = [
            React.createElement('div', { key: 'row1', className: 'gt-policy-row' }, [
              React.createElement('span', { key: 'lbl', className: 'gt-row-k' }, T.policy),
              React.createElement('select', {
                key: 'mode', className: 'gt-select', value: modeDraft,
                disabled: pending,
                onChange: (e) => setModeDraft(e.target.value),
              }, [
                React.createElement('option', { key: 'agent', value: 'agent' }, T.modeAgent),
                React.createElement('option', { key: 'rounds', value: 'rounds' }, T.modeRounds),
                React.createElement('option', { key: 'hybrid', value: 'hybrid' }, T.modeHybrid),
                React.createElement('option', { key: 'unlimited', value: 'unlimited' }, T.modeUnlimited),
              ]),
              modeDraft !== 'unlimited' && React.createElement('input', {
                key: 'max', className: 'gt-input gt-input-num', type: 'number', min: '1',
                title: modeDraft === 'agent' ? T.maxRoundsLabel : T.maxLabel,
                placeholder: modeDraft === 'agent' ? T.maxRoundsLabel : T.maxLabel,
                value: maxDraft,
                disabled: pending,
                onChange: (e) => setMaxDraft(e.target.value),
              }),
              modeDraft === 'hybrid' && React.createElement('input', {
                key: 'min', className: 'gt-input gt-input-num', type: 'number', min: '1',
                title: T.minLabel, placeholder: T.minLabel, value: minDraft,
                disabled: pending,
                onChange: (e) => setMinDraft(e.target.value),
              }),
              React.createElement('button', {
                key: 'apply', type: 'button', className: 'gt-icon-btn',
                title: T.applyPolicy, 'aria-label': T.applyPolicy,
                disabled: pending,
                onClick: (e) => { stop(e); applyPolicy() },
              }, '✓'),
            ]),
            React.createElement('div', { key: 'hint', className: 'gt-policy-hint' }, T.policyHint),
          ]
          detailChildren.push(React.createElement('div', { key: 'policy', className: 'gt-policy' }, policyChildren))
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
