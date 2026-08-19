// Browser half of @dsh-plugins/goal-tracker — client module format.
//
// Auto-generated twin of src/dynamic-client.js (verified live as gtrack-1
// pkg-19). Loaded by the DSH web app through the exports["./client"] bundle
// route and executed as a classic script.
//
// Features: control verbs via ctx.get("remote.goals"); completion-policy
// modes embedded in the objective (agent / run-all-rounds / hybrid min+max /
// true-unlimited — never self-completes, no button); agent mode cap input;
// editor prefills current mode; default 16 rounds + unlimited toggle;
// live round bridge via host goal/live (dynamic only); Goals history
// sub-tab; friendly blocked banner; completed-bar cleanup; elegant sheen
// sweep gated on prefers-reduced-motion.
window.__ModuleLoader__.load({
  id: "@dsh-plugins/goal-tracker",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    let react = require("react");

    const CSS = `\

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
.gt-gv-list{display:flex;flex-direction:column;gap:8px;padding:16px;max-width:760px;margin:0 auto;font-size:13px;color:var(--dsw-alias-label-primary)}
.gt-gv-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px}
.gt-gv-title{font-size:14px;font-weight:600}
.gt-gv-refresh{height:26px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:7px;cursor:pointer;font-size:12px}
.gt-gv-refresh:hover{border-color:var(--dsw-alias-state-business-primary)}
.gt-gv-row{display:grid;grid-template-columns:1fr 96px 88px;gap:10px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);cursor:pointer;align-items:center}
.gt-gv-row:hover{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-bg-layer-2)}
.gt-gv-row.active{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-bg-layer-2)}
.gt-gv-row-obj{min-width:0;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gt-gv-row-meta{font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}
.gt-gv-row-phase{font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;justify-self:end;text-align:center}
.gt-gv-row-phase-active{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent)}
.gt-gv-row-phase-paused{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 14%, transparent)}
.gt-gv-row-phase-blocked{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 14%, transparent)}
.gt-gv-row-phase-complete{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent)}
.gt-gv-detail{display:flex;flex-direction:column;gap:10px;padding:14px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}
.gt-gv-detail-header{display:flex;align-items:center;gap:10px;justify-content:space-between}
.gt-gv-back{height:26px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:7px;cursor:pointer;font-size:12px}
.gt-gv-back:hover{border-color:var(--dsw-alias-state-business-primary)}
.gt-gv-section-title{font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary);text-transform:uppercase;letter-spacing:.04em}
.gt-gv-timeline{display:flex;flex-direction:column;gap:4px;max-height:180px;overflow-y:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:6px 10px;background:var(--dsw-alias-bg-base)}
.gt-gv-tl-row{display:grid;grid-template-columns:120px 90px 1fr;gap:8px;font-size:12px;align-items:baseline}
.gt-gv-tl-time{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary)}
.gt-gv-tl-op{font-weight:600;color:var(--dsw-alias-label-secondary)}
.gt-gv-tl-rev{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.gt-gv-result{max-height:200px;overflow-y:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:8px 10px;background:var(--dsw-alias-bg-base);white-space:pre-wrap;line-height:1.5;font-size:12px}
.gt-gv-empty{color:var(--dsw-alias-label-secondary);text-align:center;padding:24px;font-size:12px}
`;
    const tagId = "@dsh-plugins/goal-tracker";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = tagId;
      tag.dataset.pluginCss = tagId;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

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
      activation: zh ? '自动续跑' : 'Auto-continue',
      activationArmed: zh ? '已武装' : 'armed',
      activationDisarmed: zh ? '未武装' : 'disarmed',
      pause: zh ? '暂停' : 'Pause',
      resume: zh ? '恢复' : 'Resume',
      raiseCap: zh ? '提高上限' : 'Raise cap',
      completeBtn: zh ? '完成' : 'Complete',
      edit: zh ? '编辑' : 'Edit',
      clear: zh ? '清除' : 'Clear',
      save: zh ? '保存' : 'Save',
      cancel: zh ? '取消' : 'Cancel',
      newGoal: zh ? '＋ 新建目标' : '+ New goal',
      objectivePh: zh ? '目标内容…' : 'Goal objective…',
      roundsPh: zh ? '轮数上限' : 'Round cap',
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
      exhaustedFriendly: zh ? '轮次已跑满，目标已自动受阻；提高上限可继续推进' : 'Round budget exhausted — the goal was auto-blocked. Raise the cap to continue',
      // Goals-history tab
      gvTabLabel: zh ? '目标' : 'Goals',
      gvTitle: zh ? '目标历史' : 'Goal history',
      gvRefresh: zh ? '刷新' : 'Refresh',
      gvEmpty: zh ? '当前会话暂无目标历史。创建一个目标试试。' : 'No goal history yet for this session. Create one to get started.',
      gvNoResult: zh ? '（无运行结果文本）' : '(no result text available)',
      gvBack: zh ? '← 返回列表' : '← Back to list',
      gvSectionObjective: zh ? '目标' : 'Objective',
      gvSectionPolicy: zh ? '完成策略' : 'Completion policy',
      gvSectionStatus: zh ? '状态' : 'Status',
      gvSectionTimeline: zh ? '修改记录' : 'Modification history',
      gvSectionResult: zh ? '运行结果' : 'Run result',
      gvRunMeta: zh ? '（AI 最终回复）' : '(AI final reply)',
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

    function formatShortClock(epochMs) {
      if (!(epochMs > 0)) return '—'
      const d = new Date(epochMs)
      const p = (n) => (n < 10 ? '0' + n : String(n))
      return (d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
    }

    function num(v) {
      const n = parseInt(String(v), 10)
      return Number.isFinite(n) && n > 0 ? n : 0
    }

    const POLICY_RE = /[\[［]完成策略：[^\]］]*[\]］]/g

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

    // ── GoalsHistoryView ────────────────────────────────────────────────────
    function GoalsHistoryView(props) {
      const sessionId = props.sessionId
      const [history, setHistory] = react.useState(null)
      const [loading, setLoading] = react.useState(false)
      const [error, setError] = react.useState(null)
      const [selectedId, setSelectedId] = react.useState(null)

      const load = react.useCallback(() => {
        if (!sessionId) return
        const h = typeof host !== 'undefined' && typeof host.call === 'function' ? host : null
        if (!h) { setError('host bridge unavailable'); return }
        setLoading(true); setError(null)
        h.call('goal/history', { sessionId: sessionId }).then((r) => {
          setLoading(false)
          if (r && r.ok && Array.isArray(r.goals)) {
            setHistory(r.goals)
            if (selectedId && !r.goals.find((g) => g.id === selectedId)) setSelectedId(null)
          } else {
            setError(r && r.message ? r.message : 'failed to load history')
            setHistory([])
          }
        }).catch((e) => { setLoading(false); setError(String(e && e.message || e)); setHistory([]) })
      }, [sessionId, selectedId])

      react.useEffect(() => { load() }, [load])

      const goals = history || []
      const selected = selectedId ? goals.find((g) => g.id === selectedId) : null

      const toolbar = react.createElement('div', { className: 'gt-gv-toolbar' }, [
        react.createElement('span', { key: 't', className: 'gt-gv-title' }, T.gvTitle + ' (' + goals.length + ')'),
        react.createElement('button', { key: 'r', className: 'gt-gv-refresh', onClick: load, disabled: loading },
          loading ? '…' : T.gvRefresh),
      ])

      if (selected) {
        const policy = parsePolicy(selected.objective || '')
        const opLabel = (op) => ({ create: T.create, edit: zh ? '编辑' : 'edit', pause: T.pause, resume: T.resume, complete: T.completeBtn, clear: T.clear, block: T.blocked }[op] || op)
        const timelineRows = (selected.revisions || []).map((rv) => react.createElement('div', { key: rv.seq, className: 'gt-gv-tl-row' }, [
          react.createElement('span', { className: 'gt-gv-tl-time' }, formatShortClock(rv.time)),
          react.createElement('span', { className: 'gt-gv-tl-op' }, opLabel(rv.operation)),
          react.createElement('span', { className: 'gt-gv-tl-rev' }, 'rev ' + rv.revision),
        ]))
        const modeLabel = policy.mode === 'rounds' ? T.modeRounds + '（' + (policy.max > 0 ? policy.max : selected.maxGoalRounds) + '）'
          : policy.mode === 'hybrid' ? T.modeHybrid + (policy.min > 0 ? '（最少 ' + policy.min + '）' : '') + (policy.max > 0 ? '（最多 ' + policy.max + '）' : '')
          : policy.mode === 'unlimited' ? T.modeUnlimited
          : T.modeAgent
        const rows = [
          [T.goal, selected.objective],
          [T.round, selected.roundsStarted + ' / ' + (selected.maxGoalRounds >= UNLIMITED ? T.unlimitedText : selected.maxGoalRounds)],
          [T.progress, (selected.maxGoalRounds >= UNLIMITED ? '' : Math.min(100, Math.round((selected.roundsStarted / selected.maxGoalRounds) * 100))) + '%'],
          [T.policy, modeLabel],
          [T.activation, selected.activation || '—'],
          [T.created, formatClock(selected.createdAt)],
          [T.updated, formatClock(selected.updatedAt)],
          [T.revision, String(selected.revision)],
        ]
        const detailRows = rows.map((pair) => react.createElement('div', { key: pair[0], className: 'gt-row' },
          react.createElement('span', { className: 'gt-row-k' }, pair[0]),
          react.createElement('span', { className: 'gt-row-v' }, String(pair[1] || '—'))))
        const resultText = selected.runResult && typeof selected.runResult.text === 'string' ? selected.runResult.text : null

        return react.createElement('div', { className: 'gt-gv-list' }, [
          react.createElement('div', { key: 'tb', className: 'gt-gv-toolbar' }, [
            react.createElement('button', { className: 'gt-gv-back', onClick: () => setSelectedId(null) }, T.gvBack),
            react.createElement('button', { className: 'gt-gv-refresh', onClick: load, disabled: loading }, loading ? '…' : T.gvRefresh),
          ]),
          react.createElement('div', { key: 'd', className: 'gt-gv-detail' }, [
            react.createElement('div', { key: 'h', className: 'gt-gv-section-title' }, T.gvSectionObjective + ' · ' + T.gvSectionStatus + ' · ' + T.gvSectionPolicy),
            ...detailRows,
            react.createElement('div', { key: 'tl', className: 'gt-gv-section-title', style: { marginTop: 6 } }, T.gvSectionTimeline),
            react.createElement('div', { className: 'gt-gv-timeline' }, timelineRows),
            react.createElement('div', { key: 'rr', className: 'gt-gv-section-title', style: { marginTop: 6 } }, T.gvSectionResult + ' ' + T.gvRunMeta),
            resultText
              ? react.createElement('div', { className: 'gt-gv-result' }, resultText)
              : react.createElement('div', { className: 'gt-gv-result', style: { color: 'var(--dsw-alias-label-secondary)' } }, T.gvNoResult),
          ]),
        ])
      }

      if (loading && history === null) {
        return react.createElement('div', { className: 'gt-gv-list' }, [
          toolbar,
          react.createElement('div', { className: 'gt-gv-empty' }, '…'),
        ])
      }
      if (error && goals.length === 0) {
        return react.createElement('div', { className: 'gt-gv-list' }, [
          toolbar,
          react.createElement('div', { className: 'gt-gv-empty' }, error),
        ])
      }
      if (goals.length === 0) {
        return react.createElement('div', { className: 'gt-gv-list' }, [
          toolbar,
          react.createElement('div', { className: 'gt-gv-empty' }, T.gvEmpty),
        ])
      }
      const listRows = goals.map((g) => {
        const objText = parsePolicy(g.objective || '').clean || g.objective || ''
        const updated = formatShortClock(g.updatedAt)
        return react.createElement('div', {
          key: g.id, className: 'gt-gv-row' + (selectedId === g.id ? ' active' : ''),
          onClick: () => setSelectedId(g.id),
        }, [
          react.createElement('span', { className: 'gt-gv-row-obj', title: objText }, objText || '—'),
          react.createElement('span', { className: 'gt-gv-row-meta' }, updated),
          react.createElement('span', { className: 'gt-gv-row-phase gt-gv-row-phase-' + g.phase }, g.phase === 'complete' ? T.complete : g.phase === 'active' ? T.running : g.phase === 'paused' ? T.paused : g.phase === 'blocked' ? T.blocked : g.phase),
        ])
      })
      return react.createElement('div', { className: 'gt-gv-list' }, [
        toolbar,
        ...listRows,
      ])
    }

    // ── GoalTracker (existing dock) ────────────────────────────────────────
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
      const [liveRounds, setLiveRounds] = react.useState(null)
      const pendingRef = react.useRef(false)
      const lastApplyAt = react.useRef(0)

      react.useEffect(() => {
        if (!timer) return undefined
        const dispose = timer.interval(() => {
          if (typeof Date !== 'undefined') setNow(Date.now())
        }, 1000)
        return dispose
      }, [])

      const parsedPolicyRef = react.useRef(null)
      react.useEffect(() => {
        if (!expanded) return
        const p = parsedPolicyRef.current
        if (!p) return
        setModeDraft(p.mode)
        setMinDraft(p.min > 0 ? String(p.min) : '')
        setMaxDraft(p.max > 0 ? String(p.max) : '')
      }, [expanded])

      const goal = projection && typeof projection === 'object' ? projection.goal : null
      const canRemote = !!(remoteGoals && sessionId)

      const goalId = goal ? goal.id : null
      react.useEffect(() => {
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
            if ((err.code === 'GOAL_INVALID_TRANSITION' || /exhausted/i.test(err.message || '')) && /maxGoalRounds|rounds/i.test(err.message || '')) {
              setActionError(T.exhaustedFriendly)
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
            react.createElement('input', { key: 'obj', className: 'gt-input', type: 'text', placeholder: T.objectivePh, value: createDraft, disabled: pending, onChange: (e) => setCreateDraft(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') doCreate() }, autoFocus: true }),
            react.createElement('input', { key: 'rounds', className: 'gt-input gt-input-num', type: 'number', min: '1', title: T.roundsTip, placeholder: '16', value: createUnlimited ? '' : createRounds, disabled: pending || createUnlimited, onChange: (e) => setCreateRounds(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') doCreate() } }),
            react.createElement('label', { key: 'unl', className: 'gt-check' },
              react.createElement('input', { type: 'checkbox', checked: createUnlimited, disabled: pending, onChange: (e) => setCreateUnlimited(e.target.checked) }),
              T.unlimitedToggle),
            react.createElement('button', { key: 'create', type: 'button', className: 'gt-icon-btn', title: T.create, 'aria-label': T.create, disabled: pending || createDraft.trim() === '', onClick: () => doCreate() }, '\uFF0B'),
            react.createElement('button', { key: 'cancel', type: 'button', className: 'gt-icon-btn', title: T.cancel, 'aria-label': T.cancel, disabled: pending, onClick: () => { setCreating(false); setCreateDraft(''); setCreateRounds('16'); setCreateUnlimited(false) } }, '\u00D7'),
          ]),
          actionError !== null && react.createElement('div', { key: 'err', className: 'gt-banner gt-banner-error', role: 'alert' }, actionError),
        ])
      }

      const rawObjective = typeof goal.objective === 'string' ? goal.objective : ''
      const policy = parsePolicy(rawObjective)
      parsedPolicyRef.current = policy
      const objective = policy.clean
      const phase = (goal.phase === 'active' || goal.phase === 'paused' || goal.phase === 'blocked' || goal.phase === 'complete')
        ? goal.phase : 'active'
      const maxRounds = typeof goal.maxGoalRounds === 'number' && goal.maxGoalRounds > 0 ? goal.maxGoalRounds : 1
      const unlimited = maxRounds >= UNLIMITED
      const rounds = typeof projection.roundsStarted === 'number' ? projection.roundsStarted : 0
      const displayRounds = liveRounds !== null && typeof liveRounds.roundsStarted === 'number' ? liveRounds.roundsStarted : rounds
      const activation = liveRounds !== null && typeof liveRounds.activation === 'string' ? liveRounds.activation : null
      const createdAt = typeof projection.createdAt === 'number' ? projection.createdAt : 0
      const updatedAt = typeof projection.updatedAt === 'number' ? projection.updatedAt : 0
      const revision = typeof goal.revision === 'number' ? goal.revision : 0
      const blocked = goal.blockedReason && typeof goal.blockedReason === 'object' ? goal.blockedReason : null
      const exhausted = blocked !== null && blocked.code === 'round-limit' && displayRounds >= maxRounds

      const percent = unlimited ? Math.min(100, Math.round((displayRounds / 9999) * 100)) : Math.min(100, Math.round((displayRounds / maxRounds) * 100))
      const elapsedMs = phase === 'complete' ? (updatedAt - createdAt) : (now - createdAt)
      const phaseLabel = phase === 'active' ? T.running : phase === 'paused' ? T.paused : phase === 'blocked' ? T.blocked : T.complete
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
      const iconBtn = (key, label, glyphText, onClick, disabled) => react.createElement('button', { key, type: 'button', className: 'gt-icon-btn', title: label, 'aria-label': label, disabled: disabled || pending, onClick: (e) => { stop(e); onClick() } }, glyphText)

      let policyShort = null
      if (policy.mode === 'rounds') policyShort = T.policyShortRounds + ' ' + (policy.max > 0 ? policy.max : maxRounds) + T.policyShortRoundsTail
      else if (policy.mode === 'hybrid') {
        const parts = []
        if (policy.min > 0) parts.push(T.policyShortHybridMin + ' ' + policy.min)
        if (policy.max > 0) parts.push(T.policyShortHybridMax + ' ' + policy.max)
        policyShort = parts.join('\u00B7')
      } else if (policy.mode === 'unlimited') policyShort = T.policyShortUnlimited
      else policyShort = T.policyShortAgent

      const modeLabel = policy.mode === 'rounds' ? T.modeRounds + '（' + (policy.max > 0 ? policy.max : maxRounds) + '）'
        : policy.mode === 'hybrid' ? T.modeHybrid + (policy.min > 0 ? '（最少 ' + policy.min + '）' : '') + (policy.max > 0 ? '（最多 ' + policy.max + '）' : '')
        : policy.mode === 'unlimited' ? T.modeUnlimited : T.modeAgent

      if (editing) {
        const saveEdit = () => {
          const trimmed = draft.trim()
          if (!trimmed) return
          const block = buildPolicy(policy.mode, policy.min, policy.max)
          const nextObjective = trimmed + (block ? '\n\n' + block : '')
          runAction(() => verbs.edit(nextObjective, roundsDraft)).then((result) => {
            if (result && result.ok === false) return
            setEditing(false); setDraft(''); setRoundsDraft('')
          })
        }
        const formChildren = [
          react.createElement('input', { key: 'obj', className: 'gt-input', type: 'text', placeholder: T.objectivePh, value: draft, disabled: pending, onChange: (e) => setDraft(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') saveEdit() }, autoFocus: true }),
          react.createElement('input', { key: 'rounds', className: 'gt-input gt-input-num', type: 'number', min: '1', title: T.roundsTip, placeholder: unlimited ? T.unlimitedText : String(maxRounds), value: unlimited && roundsDraft === '' ? '' : roundsDraft, disabled: pending, onChange: (e) => setRoundsDraft(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') saveEdit() } }),
          iconBtn('save', T.save, '\u2705', saveEdit, draft.trim() === ''),
          iconBtn('cancel', T.cancel, '\u00D7', () => { setEditing(false); setDraft(''); setRoundsDraft('') }),
        ]
        return react.createElement('div', { className: 'gt-dock' }, [
          react.createElement('div', { key: 'form', className: 'gt-form' }, formChildren),
          actionError !== null && react.createElement('div', { key: 'err', className: 'gt-banner gt-banner-error', role: 'alert' }, actionError),
        ])
      }

      const meta = react.createElement('div', { key: 'meta', className: 'gt-meta' }, [
        phase !== 'complete' && react.createElement('span', { key: 'rounds', className: 'gt-rounds', title: T.roundsTip }, T.round + ' ' + displayRounds + '/' + (unlimited ? T.unlimitedText : maxRounds)),
        phase !== 'complete' && react.createElement('div', { key: 'track', className: 'gt-track' }, react.createElement('div', { key: 'fill', className: 'gt-fill gt-fill-' + phase, style: { width: percent + '%' } })),
        phase !== 'complete' && react.createElement('span', { key: 'pct', className: 'gt-percent' }, percent + '%'),
        react.createElement('span', { key: 'elapsed', className: 'gt-elapsed' }, formatDuration(elapsedMs)),
        react.createElement('span', { key: 'rev', className: 'gt-rev', title: T.revTip }, 'rev ' + revision),
      ])

      const controls = []
      if (verbs) {
        if (phase === 'active' && verbs.pause) controls.push(iconBtn('pause', T.pause, '\u23F8', () => runAction(verbs.pause)))
        if (phase === 'blocked' && exhausted && verbs.edit) controls.push(iconBtn('raise', T.raiseCap, '\u21A5', () => { setDraft(objective); setRoundsDraft(''); setEditing(true) }))
        else if ((phase === 'paused' || phase === 'blocked') && verbs.resume) controls.push(iconBtn('resume', T.resume, '\u25B6', () => runAction(verbs.resume)))
        if (phase === 'active' && !unlimited && verbs.complete) controls.push(iconBtn('complete', T.completeBtn, '\u2705', () => runAction(verbs.complete)))
        if (verbs.edit) controls.push(iconBtn('edit', T.edit, '\u270E', () => { setDraft(objective); setRoundsDraft(''); setEditing(true) }))
        if (verbs.clear) controls.push(iconBtn('clear', T.clear, '\u00D7', () => runAction(verbs.clear)))
      }
      controls.push(react.createElement('span', { key: 'chevron', className: 'gt-chevron', onClick: (e) => { stop(e); setExpanded(!expanded) } }, expanded ? '\u25BE' : '\u25B8'))

      const bar = react.createElement('div', {
        className: 'gt-bar gt-bar-' + phase,
        role: 'button', tabIndex: 0, 'aria-expanded': expanded,
        title: phase === 'blocked' && blocked && typeof blocked.message === 'string' ? blocked.message : objective,
        onClick: () => setExpanded(!expanded),
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded) } },
      }, [
        react.createElement('span', { key: 'chip', className: 'gt-chip gt-chip-' + phase }, phaseLabel),
        react.createElement('span', { key: 'policy', className: 'gt-policy-chip', title: T.policy + '：' + modeLabel }, policyShort),
        react.createElement('span', { key: 'obj', className: 'gt-objective', title: objective }, objective),
        meta,
        react.createElement('div', { key: 'controls', className: 'gt-controls' }, controls),
      ])

      const banners = []
      if (blocked) {
        let blockedText = null
        if (exhausted) blockedText = (zh ? '轮次已跑满（' : 'Round budget exhausted (') + displayRounds + '/' + (unlimited ? T.unlimitedText : maxRounds) + (zh ? '），目标已自动受阻；提高上限可继续推进' : ') — the goal was auto-blocked. Raise the cap to continue')
        else if (typeof blocked.message === 'string' && blocked.message !== '') blockedText = blocked.message
        if (blockedText !== null) {
          banners.push(react.createElement('div', { key: 'blocked', className: 'gt-banner gt-banner-blocked', role: 'alert' }, [
            react.createElement('span', { key: 'code', className: 'gt-banner-code' }, T.blocked),
            react.createElement('span', { key: 'msg' }, blockedText),
          ]))
        }
      }
      if (actionError !== null) banners.push(react.createElement('div', { key: 'err', className: 'gt-banner gt-banner-error', role: 'alert' }, actionError))

      let detail = null
      if (expanded) {
        const rows = [
          [T.goal, objective],
        ]
        if (phase === 'complete') {
          rows.push([T.round, displayRounds + ' ' + (zh ? '轮' : 'rounds')])
        } else {
          rows.push([T.round, displayRounds + ' / ' + (unlimited ? T.unlimitedText : maxRounds)])
        }
        rows.push([T.progress, percent + '%'])
        rows.push([T.policy, modeLabel])
        rows.push([T.created, formatClock(createdAt)])
        rows.push([T.updated, formatClock(updatedAt) + ' (' + formatRelative(updatedAt, now) + ')'])
        rows.push([T.revision, String(revision)])
        if (activation !== null) rows.push([T.activation, activation === 'armed' ? T.activationArmed : T.activationDisarmed])
        if (phase === 'complete') rows.push([T.duration, formatDuration(updatedAt - createdAt)])
        const rowEls = rows.map((pair) => react.createElement('div', { key: pair[0], className: 'gt-row' },
          react.createElement('span', { className: 'gt-row-k' }, pair[0]),
          react.createElement('span', { className: 'gt-row-v' }, String(pair[1]))))
        const detailChildren = [rowEls]
        if (blocked) detailChildren.push(react.createElement('div', { key: 'blocked', className: 'gt-blocked' },
          react.createElement('span', { className: 'gt-row-k' }, T.reason + (typeof blocked.code === 'string' ? ' · ' + blocked.code : '')),
          react.createElement('span', { className: 'gt-row-v' }, typeof blocked.message === 'string' ? blocked.message : '')))
        if (verbs && verbs.edit) {
          const applyPolicy = () => {
            const t = typeof Date !== 'undefined' ? Date.now() : 0
            if (t - lastApplyAt.current < 800) return
            lastApplyAt.current = t
            const mMode = modeDraft
            const mMin = num(minDraft); const mMax = num(maxDraft)
            let nextMax = maxRounds
            if (mMode === 'rounds') nextMax = mMax > 0 ? mMax : 16
            else if (mMode === 'hybrid') nextMax = mMax > 0 ? mMax : maxRounds
            else if (mMode === 'unlimited') nextMax = UNLIMITED
            else nextMax = mMax > 0 ? mMax : maxRounds
            const block = buildPolicy(mMode, mMin, mMax)
            const nextObjective = objective + (block ? '\n\n' + block : '')
            runAction(() => verbs.edit(nextObjective, String(nextMax))).then((result) => {
              if (result && result.ok === false) return
              setExpanded(false)
            })
          }
          const policyChildren = [
            react.createElement('div', { key: 'row1', className: 'gt-policy-row' }, [
              react.createElement('span', { key: 'lbl', className: 'gt-row-k' }, T.policy),
              react.createElement('select', { key: 'mode', className: 'gt-select', value: modeDraft, disabled: pending, onChange: (e) => setModeDraft(e.target.value) }, [
                react.createElement('option', { key: 'agent', value: 'agent' }, T.modeAgent),
                react.createElement('option', { key: 'rounds', value: 'rounds' }, T.modeRounds),
                react.createElement('option', { key: 'hybrid', value: 'hybrid' }, T.modeHybrid),
                react.createElement('option', { key: 'unlimited', value: 'unlimited' }, T.modeUnlimited),
              ]),
              modeDraft !== 'unlimited' && react.createElement('input', { key: 'max', className: 'gt-input gt-input-num', type: 'number', min: '1', title: modeDraft === 'agent' ? T.maxRoundsLabel : T.maxLabel, placeholder: modeDraft === 'agent' ? T.maxRoundsLabel : T.maxLabel, value: maxDraft, disabled: pending, onChange: (e) => setMaxDraft(e.target.value) }),
              modeDraft === 'hybrid' && react.createElement('input', { key: 'min', className: 'gt-input gt-input-num', type: 'number', min: '1', title: T.minLabel, placeholder: T.minLabel, value: minDraft, disabled: pending, onChange: (e) => setMinDraft(e.target.value) }),
              react.createElement('button', { key: 'apply', type: 'button', className: 'gt-icon-btn', title: T.applyPolicy, 'aria-label': T.applyPolicy, disabled: pending, onClick: (e) => { stop(e); applyPolicy() } }, '\u2705'),
            ]),
            react.createElement('div', { key: 'hint', className: 'gt-policy-hint' }, T.policyHint),
          ]
          detailChildren.push(react.createElement('div', { key: 'policy', className: 'gt-policy' }, policyChildren))
        }
        detail = react.createElement('div', { key: 'detail', className: 'gt-detail' }, detailChildren)
      }

      return react.createElement('div', { className: 'gt-dock', 'data-goal-tracker': true }, [bar, banners, detail])
    }

    // ── Register slots ────────────────────────────────────────────────────
    slots.inject('conversation.input.dock', () => slots.register(
      { name: 'conversation.input.dock', id: 'goal-tracker', order: 20, inject: (sessionId) => ({ sessionId }) },
      (props) => react.createElement(GoalTracker, { useProjection: props.useProjection, sessionId: props.sessionId }),
    ))
    slots.inject('conversation.view', () => slots.register(
      { name: 'conversation.view', id: 'goals', order: 12, label: T.gvTabLabel, inject: (sessionId) => ({ sessionId }) },
      (props) => react.createElement(GoalsHistoryView, { sessionId: props.sessionId }),
    ))
  }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
