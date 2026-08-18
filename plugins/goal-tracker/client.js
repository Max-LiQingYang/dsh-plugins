// Browser half of @dsh-plugins/goal-tracker — client module format.
//
// Auto-generated twin of src/dynamic-client.js (verified live as gtrack-1
// pkg-5). Loaded by the DSH web app through the exports["./client"] bundle
// route and executed as a classic script: window.__ModuleLoader__.load
// registers this package's factory; the client runtime materializes it as a
// Cordis plugin whose hard service dependencies come from the exported
// `inject` list.
//
// Features: control verbs via ctx.get("remote.goals") (pause/resume/complete/
// clear/edit/create), completion-policy modes embedded in the objective
// (agent / run-all-rounds / hybrid min+max / unlimited), default 16 rounds
// with an unlimited toggle, plain tooltips, live elapsed time, blocked
// banner, and relative update times.
window.__ModuleLoader__.load({
  id: "@dsh-plugins/goal-tracker",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    let react = require("react");

    // ── styles (tagged for the client-modules HMR bookkeeping) ──────────────
    const CSS = `\

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
.gt-rounds{font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;cursor:help}
.gt-percent{font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;white-space:nowrap;min-width:30px;text-align:right}
.gt-track{width:64px;height:5px;border-radius:3px;background:var(--dsw-alias-border-l1);overflow:hidden}
.gt-fill{height:100%;border-radius:3px;transition:width .3s ease}
.gt-fill-active{background:linear-gradient(90deg, var(--dsw-alias-state-success-primary), color-mix(in srgb, var(--dsw-alias-state-success-primary) 55%, var(--dsw-alias-brand-primary)))}
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
`;
    const tagId = "@dsh-plugins/goal-tracker";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = tagId;
      tag.dataset.pluginCss = tagId;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    /** Hard service dependencies resolved by the client runtime. */
    const inject = ["slots"];

function apply(ctx){
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
      pause: zh ? '暂停' : 'Pause',
      resume: zh ? '恢复' : 'Resume',
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
      modeAgent: zh ? '由 agent 决定是否完成' : 'Agent decides',
      modeRounds: zh ? '必须执行完指定轮次' : 'Run all rounds',
      modeHybrid: zh ? 'agent 决定 + 最少/最多轮数' : 'Agent + min/max rounds',
      modeUnlimited: zh ? '无限执行，由 agent 决定' : 'Unlimited',
      minLabel: zh ? '最少轮数' : 'Min rounds',
      maxLabel: zh ? '最多轮数' : 'Max rounds',
      applyPolicy: zh ? '应用策略' : 'Apply',
      unlimitedToggle: zh ? '无限轮次' : 'Unlimited rounds',
      unlimitedText: zh ? '无限' : '∞',
      policyHint: zh ? '策略会写入目标文本，agent 每轮都会看到并遵守' : 'The policy is written into the objective so the agent sees it every round',
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
      if (mode === 'unlimited') return '［完成策略：无限执行，由 agent 决定完成时机］'
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
      const [now, setNow] = react.useState(() => (typeof Date !== 'undefined' ? Date.now() : 0))
      const [expanded, setExpanded] = react.useState(false)
      const [editing, setEditing] = react.useState(false)
      const [draft, setDraft] = react.useState('')
      const [roundsDraft, setRoundsDraft] = react.useState('')
      const [creating, setCreating] = react.useState(false)
      const [createDraft, setCreateDraft] = react.useState('')
      const [createRounds, setCreateRounds] = react.useState('16')
      const [createUnlimited, setCreateUnlimited] = react.useState(false)
      const [modeDraft, setModeDraft] = react.useState('agent')
      const [minDraft, setMinDraft] = react.useState('')
      const [maxDraft, setMaxDraft] = react.useState('')
      const [pending, setPending] = react.useState(false)
      const [actionError, setActionError] = react.useState(null)
      const pendingRef = react.useRef(false)
      const lastApplyAt = react.useRef(0)

      react.useEffect(() => {
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

      // ── no goal: create entry ─────────────────────────────────────────────
      if (!goal) {
        if (!canRemote || typeof remoteGoals.create !== 'function') return null
        if (!creating) {
          return react.createElement('button', {
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
        return react.createElement('div', { className: 'gt-dock' }, [
          react.createElement('div', { key: 'form', className: 'gt-form' }, [
            react.createElement('input', {
              key: 'obj', className: 'gt-input', type: 'text',
              placeholder: T.objectivePh, value: createDraft,
              disabled: pending,
              onChange: (e) => setCreateDraft(e.target.value),
              onKeyDown: (e) => { if (e.key === 'Enter') doCreate() },
              autoFocus: true,
            }),
            react.createElement('input', {
              key: 'rounds', className: 'gt-input gt-input-num', type: 'number', min: '1',
              title: T.roundsTip, placeholder: '16', value: createUnlimited ? '' : createRounds,
              disabled: pending || createUnlimited,
              onChange: (e) => setCreateRounds(e.target.value),
              onKeyDown: (e) => { if (e.key === 'Enter') doCreate() },
            }),
            react.createElement('label', { key: 'unl', className: 'gt-check' },
              react.createElement('input', {
                type: 'checkbox', checked: createUnlimited,
                disabled: pending,
                onChange: (e) => setCreateUnlimited(e.target.checked),
              }),
              T.unlimitedToggle),
            react.createElement('button', {
              key: 'create', type: 'button', className: 'gt-icon-btn',
              title: T.create, 'aria-label': T.create,
              disabled: pending || createDraft.trim() === '',
              onClick: () => doCreate(),
            }, '＋'),
            react.createElement('button', {
              key: 'cancel', type: 'button', className: 'gt-icon-btn',
              title: T.cancel, 'aria-label': T.cancel,
              disabled: pending,
              onClick: () => { setCreating(false); setCreateDraft(''); setCreateRounds('16'); setCreateUnlimited(false) },
            }, '×'),
          ]),
          actionError !== null && react.createElement('div', { key: 'err', className: 'gt-banner gt-banner-error', role: 'alert' }, actionError),
        ])
      }

      // ── goal exists ────────────────────────────────────────────────────────
      const rawObjective = typeof goal.objective === 'string' ? goal.objective : ''
      const policy = parsePolicy(rawObjective)
      const objective = policy.clean
      const phase = (goal.phase === 'active' || goal.phase === 'paused' || goal.phase === 'blocked' || goal.phase === 'complete')
        ? goal.phase
        : 'active'
      const maxRounds = typeof goal.maxGoalRounds === 'number' && goal.maxGoalRounds > 0 ? goal.maxGoalRounds : 1
      const unlimited = maxRounds >= UNLIMITED
      const rounds = typeof projection.roundsStarted === 'number' ? projection.roundsStarted : 0
      const createdAt = typeof projection.createdAt === 'number' ? projection.createdAt : 0
      const updatedAt = typeof projection.updatedAt === 'number' ? projection.updatedAt : 0
      const revision = typeof goal.revision === 'number' ? goal.revision : 0
      const blocked = goal.blockedReason && typeof goal.blockedReason === 'object' ? goal.blockedReason : null

      const percent = unlimited ? Math.min(100, Math.round((rounds / 9999) * 100)) : Math.min(100, Math.round((rounds / maxRounds) * 100))
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
      const iconBtn = (key, label, glyphText, onClick, disabled) => react.createElement('button', {
        key, type: 'button', className: 'gt-icon-btn',
        title: label, 'aria-label': label,
        disabled: disabled || pending,
        onClick: (e) => { stop(e); onClick() },
      }, glyphText)

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
          react.createElement('input', {
            key: 'obj', className: 'gt-input', type: 'text',
            placeholder: T.objectivePh, value: draft,
            disabled: pending,
            onChange: (e) => setDraft(e.target.value),
            onKeyDown: (e) => { if (e.key === 'Enter') saveEdit() },
            autoFocus: true,
          }),
          react.createElement('input', {
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
        return react.createElement('div', { className: 'gt-dock' }, [
          react.createElement('div', { key: 'form', className: 'gt-form' }, formChildren),
          actionError !== null && react.createElement('div', { key: 'err', className: 'gt-banner gt-banner-error', role: 'alert' }, actionError),
        ])
      }

      // normal bar
      const meta = react.createElement('div', { key: 'meta', className: 'gt-meta' }, [
        react.createElement('span', { key: 'rounds', className: 'gt-rounds', title: T.roundsTip },
          T.round + ' ' + rounds + '/' + (unlimited ? T.unlimitedText : maxRounds)),
        react.createElement('div', { key: 'track', className: 'gt-track' },
          react.createElement('div', { key: 'fill', className: 'gt-fill gt-fill-' + phase, style: { width: percent + '%' } })),
        react.createElement('span', { key: 'pct', className: 'gt-percent' }, percent + '%'),
        react.createElement('span', { key: 'elapsed', className: 'gt-elapsed' },
          T.elapsed + ' ' + formatDuration(elapsedMs)),
        react.createElement('span', { key: 'rev', className: 'gt-rev', title: T.revTip }, 'rev ' + revision),
      ])

      const controls = []
      if (verbs) {
        if (phase === 'active' && verbs.pause) controls.push(iconBtn('pause', T.pause, '⏸', () => runAction(verbs.pause)))
        if ((phase === 'paused' || phase === 'blocked') && verbs.resume) controls.push(iconBtn('resume', T.resume, '▶', () => runAction(verbs.resume)))
        if (phase === 'active' && verbs.complete) controls.push(iconBtn('complete', T.completeBtn, '✓', () => runAction(verbs.complete)))
        if (verbs.edit) controls.push(iconBtn('edit', T.edit, '✎', () => { setDraft(objective); setRoundsDraft(''); setEditing(true) }))
        if (verbs.clear) controls.push(iconBtn('clear', T.clear, '×', () => runAction(verbs.clear)))
      }
      controls.push(react.createElement('span', {
        key: 'chevron', className: 'gt-chevron',
        onClick: (e) => { stop(e); setExpanded(!expanded) },
      }, expanded ? '▾' : '▸'))

      const bar = react.createElement('div', {
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
        react.createElement('span', { key: 'badge', className: 'gt-badge gt-badge-' + phase }, glyph),
        react.createElement('span', { key: 'chip', className: 'gt-chip gt-chip-' + phase }, phaseLabel),
        react.createElement('span', { key: 'obj', className: 'gt-objective', title: objective }, objective),
        meta,
        react.createElement('div', { key: 'controls', className: 'gt-controls' }, controls),
      ])

      const banners = []
      if (blocked) {
        banners.push(react.createElement('div', { key: 'blocked', className: 'gt-banner gt-banner-blocked', role: 'alert' }, [
          react.createElement('span', { key: 'code', className: 'gt-banner-code' },
            T.blocked + (typeof blocked.code === 'string' ? ' · ' + blocked.code : '')),
          react.createElement('span', { key: 'msg' }, typeof blocked.message === 'string' ? blocked.message : ''),
        ]))
      }
      if (actionError !== null) {
        banners.push(react.createElement('div', { key: 'err', className: 'gt-banner gt-banner-error', role: 'alert' }, actionError))
      }

      let detail = null
      if (expanded) {
        const rows = [
          [T.goal, objective],
          [T.round, rounds + ' / ' + (unlimited ? T.unlimitedText : maxRounds)],
          [T.progress, percent + '%'],
          [T.policy, modeLabel],
          [T.created, formatClock(createdAt)],
          [T.updated, formatClock(updatedAt) + ' (' + formatRelative(updatedAt, now) + ')'],
          [T.revision, String(revision)],
        ]
        if (phase === 'complete') rows.push([T.duration, formatDuration(updatedAt - createdAt)])
        const rowEls = rows.map((pair) => react.createElement('div', { key: pair[0], className: 'gt-row' },
          react.createElement('span', { className: 'gt-row-k' }, pair[0]),
          react.createElement('span', { className: 'gt-row-v' }, String(pair[1]))))
        const detailChildren = [rowEls]
        if (blocked) {
          detailChildren.push(react.createElement('div', { key: 'blocked', className: 'gt-blocked' },
            react.createElement('span', { className: 'gt-row-k' },
              T.reason + (typeof blocked.code === 'string' ? ' · ' + blocked.code : '')),
            react.createElement('span', { className: 'gt-row-v' },
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
            const block = buildPolicy(mMode, mMin, mMax)
            const nextObjective = objective + (block ? '\n\n' + block : '')
            runAction(() => verbs.edit(nextObjective, String(nextMax))).then((result) => {
              if (result && result.ok === false) return
              // Keep the editor state as applied (no reset race); close panel.
              setExpanded(false)
            })
          }
          const policyChildren = [
            react.createElement('div', { key: 'row1', className: 'gt-policy-row' }, [
              react.createElement('span', { key: 'lbl', className: 'gt-row-k' }, T.policy),
              react.createElement('select', {
                key: 'mode', className: 'gt-select', value: modeDraft,
                disabled: pending,
                onChange: (e) => setModeDraft(e.target.value),
              }, [
                react.createElement('option', { key: 'agent', value: 'agent' }, T.modeAgent),
                react.createElement('option', { key: 'rounds', value: 'rounds' }, T.modeRounds),
                react.createElement('option', { key: 'hybrid', value: 'hybrid' }, T.modeHybrid),
                react.createElement('option', { key: 'unlimited', value: 'unlimited' }, T.modeUnlimited),
              ]),
              (modeDraft === 'rounds' || modeDraft === 'hybrid') && react.createElement('input', {
                key: 'max', className: 'gt-input gt-input-num', type: 'number', min: '1',
                title: T.maxLabel, placeholder: T.maxLabel, value: maxDraft,
                disabled: pending,
                onChange: (e) => setMaxDraft(e.target.value),
              }),
              modeDraft === 'hybrid' && react.createElement('input', {
                key: 'min', className: 'gt-input gt-input-num', type: 'number', min: '1',
                title: T.minLabel, placeholder: T.minLabel, value: minDraft,
                disabled: pending,
                onChange: (e) => setMinDraft(e.target.value),
              }),
              react.createElement('button', {
                key: 'apply', type: 'button', className: 'gt-icon-btn',
                title: T.applyPolicy, 'aria-label': T.applyPolicy,
                disabled: pending,
                onClick: (e) => { stop(e); applyPolicy() },
              }, '✓'),
            ]),
            react.createElement('div', { key: 'hint', className: 'gt-policy-hint' }, T.policyHint),
          ]
          detailChildren.push(react.createElement('div', { key: 'policy', className: 'gt-policy' }, policyChildren))
        }
        detail = react.createElement('div', { key: 'detail', className: 'gt-detail' }, detailChildren)
      }

      return react.createElement('div', { className: 'gt-dock', 'data-goal-tracker': true }, [bar, banners, detail])
    }

    slots.inject('conversation.input.dock', () => slots.register(
      { name: 'conversation.input.dock', id: 'goal-tracker', order: 20, inject: (sessionId) => ({ sessionId }) },
      (props) => react.createElement(GoalTracker, { useProjection: props.useProjection, sessionId: props.sessionId }),
    ))
  }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
