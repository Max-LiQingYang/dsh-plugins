// Browser half of @dsh-plugins/workflow-visualizer — client module format.
//
// Loaded by the DSH web app through the exports["./client"] bundle route and
// executed as a classic script: window.__ModuleLoader__.load registers this
// package's factory; the client runtime materializes it as a Cordis plugin
// whose hard service dependencies come from the exported `inject` list.
//
// v2 UI (matching src/dynamic-client.js): restyled run cards with status
// pill + meta strip, a per-phase accordion with ✓/✗/↻ counts and progress
// bars, per-agent drill-down with child session id and a one-click "open
// child session" action (ctx.sessions.open(childId)), zh/en labels.
//
// Data source: the shipped conversation machinery folds the durable
// `tool-workflow/*` session events into `workflow-run` chat nodes; this
// plugin re-reads that fold (`session.getSnapshot().nodes`) on a 1s timer.
// The durable events carry no timestamps, so elapsed times and log()
// narration exist only in the dynamic variant (src/dynamic-*.js).
window.__ModuleLoader__.load({
  id: "@dsh-plugins/workflow-visualizer",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    let react = require("react");

    // ── styles (tagged for the client-modules HMR bookkeeping) ──────────────
    const CSS = `\
.wfz-root{display:flex;flex-direction:column;gap:14px;height:100%;overflow-y:auto;padding:18px 20px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;box-sizing:border-box;font-variant-numeric:tabular-nums}
.wfz-title{font-weight:650;font-size:15px;display:flex;align-items:baseline;gap:10px;letter-spacing:.01em}
.wfz-sub{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:400}
.wfz-empty{color:var(--dsw-alias-label-secondary);border:1px dashed var(--dsw-alias-border-l2);border-radius:14px;padding:36px 24px;text-align:center;line-height:1.8}
.wfz-run{border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);padding:14px 16px;display:flex;flex-direction:column;gap:10px;overflow:hidden}
.wfz-runhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.wfz-dot{width:9px;height:9px;border-radius:50%;flex:none;box-shadow:0 0 0 3px color-mix(in srgb,currentColor 12%,transparent)}
.wfz-dot-running{color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary);animation:wfz-pulse 1.4s ease-in-out infinite}
.wfz-dot-interrupted{color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-state-warn-primary)}
.wfz-dot-completed{color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-state-success-primary)}
.wfz-dot-cancelled{color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-state-warn-primary)}
.wfz-dot-failed{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-state-error-primary)}
@keyframes wfz-pulse{0%,100%{opacity:1}50%{opacity:.3}}
.wfz-name{font-weight:650;font-size:14px;letter-spacing:.01em}
.wfz-pill{font-size:11px;font-weight:600;line-height:18px;padding:0 9px;border-radius:999px;letter-spacing:.03em;text-transform:uppercase}
.wfz-pill-running{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 13%,transparent)}
.wfz-pill-interrupted{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 13%,transparent)}
.wfz-pill-completed{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 13%,transparent)}
.wfz-pill-cancelled{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 13%,transparent)}
.wfz-pill-failed{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 13%,transparent)}
.wfz-meta{display:flex;gap:14px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary);font-size:11.5px}
.wfz-meta b{color:var(--dsw-alias-label-primary);font-weight:600}
.wfz-bar{display:flex;height:5px;border-radius:3px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);gap:1px}
.wfz-seg-done{background:var(--dsw-alias-state-success-primary)}
.wfz-seg-fail{background:var(--dsw-alias-state-error-primary)}
.wfz-seg-run{background:var(--dsw-alias-brand-primary);animation:wfz-pulse 1.4s ease-in-out infinite}
.wfz-seg-can{background:var(--dsw-alias-state-warn-primary);opacity:.55}
.wfz-phlist{display:flex;flex-direction:column;gap:2px}
.wfz-ph{border:1px solid transparent;border-radius:10px}
.wfz-ph:hover{border-color:var(--dsw-alias-border-l1)}
.wfz-phhead{display:flex;align-items:center;gap:9px;padding:6px 8px;cursor:pointer;user-select:none;border-radius:10px}
.wfz-phhead:hover{background:var(--dsw-alias-bg-layer-2)}
.wfz-phidx{flex:none;width:20px;height:20px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600;display:inline-flex;align-items:center;justify-content:center}
.wfz-phtitle{flex:1;min-width:0;font-weight:550;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wfz-phtitle.pending{color:var(--dsw-alias-label-secondary);font-weight:400}
.wfz-phcounts{display:flex;gap:8px;align-items:center;font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.wfz-cok{color:var(--dsw-alias-state-success-primary);font-weight:600}
.wfz-cfail{color:var(--dsw-alias-state-error-primary);font-weight:600}
.wfz-crun{color:var(--dsw-alias-brand-primary);font-weight:600}
.wfz-chev{flex:none;color:var(--dsw-alias-label-secondary);font-size:10px;width:14px;text-align:center;transition:transform .15s ease}
.wfz-chev.open{transform:rotate(90deg)}
.wfz-aglist{margin:0 8px 6px 28px;padding:2px 0 0 10px;border-left:2px solid var(--dsw-alias-border-l1);display:flex;flex-direction:column;gap:1px}
.wfz-ag{border-radius:8px}
.wfz-ag:hover{background:var(--dsw-alias-bg-layer-2)}
.wfz-agrow{display:grid;grid-template-columns:30px 1fr auto;gap:8px;align-items:center;font-size:12px;padding:3px 8px;cursor:pointer;user-select:none}
.wfz-aglabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wfz-chip{font-size:10.5px;font-weight:600;line-height:17px;padding:0 7px;border-radius:999px;letter-spacing:.02em}
.wfz-chip-completed{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}
.wfz-chip-failed{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
.wfz-chip-cancelled,.wfz-chip-interrupted{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent)}
.wfz-chip-running{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
.wfz-agdetail{margin:0 8px 4px 38px;padding:8px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);display:flex;flex-direction:column;gap:5px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.wfz-kv{display:flex;gap:8px;align-items:baseline}
.wfz-kv b{flex:none;width:64px;color:var(--dsw-alias-label-secondary);font-weight:500}
.wfz-kv span{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.wfz-open{align-self:flex-start;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-brand-primary);border-radius:7px;padding:3px 10px;font-size:11px;font-weight:600}
.wfz-open:hover{border-color:var(--dsw-alias-brand-primary)}
.wfz-dock{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance) - var(--dsh-composer-side-clearance) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));margin:0 auto;display:flex;align-items:center;gap:10px;padding:6px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);font-size:12px;font-variant-numeric:tabular-nums}
.wfz-dockname{font-weight:600;white-space:nowrap}
.wfz-dockbar{flex:1;display:flex;height:5px;border-radius:3px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);gap:1px;min-width:80px}
`;
    const tagId = "@dsh-plugins/workflow-visualizer";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = tagId;
      tag.dataset.pluginCss = tagId;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    /** Hard service dependencies resolved by the client runtime. */
    const inject = ["slots", "sessions"];

    // ── data: fold the shipped `workflow-run` chat nodes into view models ────

    function phaseTitle(phase) {
      if (phase === null || phase === undefined) return "(unphased)";
      return phase === "" ? "(empty)" : phase;
    }

    function readRuns(ctx, sessionId) {
      const binding = ctx.sessions.binding(sessionId);
      const session = binding && binding.session;
      if (!session || typeof session.getSnapshot !== "function") return [];
      let snap;
      try {
        snap = session.getSnapshot();
      } catch (e) {
        return [];
      }
      const nodes = snap && Array.isArray(snap.nodes) ? snap.nodes : [];
      const runs = [];
      for (const node of nodes) {
        if (!node || node.kind !== "workflow-run" || !node.data) continue;
        const data = node.data;
        const phases = [];
        const agents = [];
        let total = { total: 0, completed: 0, failed: 0, cancelled: 0, running: 0 };
        const groups = Array.isArray(data.phases) ? data.phases : [];
        for (const group of groups) {
          const members = Array.isArray(group.members) ? group.members : [];
          const counts = { total: 0, completed: 0, failed: 0, cancelled: 0, running: 0 };
          const title = phaseTitle(group.phase);
          for (const m of members) {
            const status = m.status === "interrupted" ? "cancelled" : m.status;
            counts.total++;
            if (status === "completed") counts.completed++;
            else if (status === "failed") counts.failed++;
            else if (status === "cancelled") counts.cancelled++;
            else counts.running++;
            agents.push({ seq: m.seq, label: m.label, phase: title, status, childId: m.childId });
          }
          phases.push({ title, counts });
          total.total += counts.total;
          total.completed += counts.completed;
          total.failed += counts.failed;
          total.cancelled += counts.cancelled;
          total.running += counts.running;
        }
        // A fresh run-start with no members yet still renders: an empty card
        // in `running` state is the honest first paint of a live run.
        runs.push({
          id: String(node.id !== undefined ? node.id : node.key),
          name: typeof data.name === "string" ? data.name : "workflow",
          status: typeof data.status === "string" ? data.status : "running",
          counts: total,
          phases,
          agents,
        });
      }
      // Conversation order is oldest-first; the tab lists newest-first.
      runs.reverse();
      return runs;
    }

    function Bar(props) {
      const total = props.total;
      if (!total) return react.createElement("div", { className: "wfz-bar" });
      const pct = (n) => (n / total) * 100 + "%";
      const segs = [];
      if (props.completed) segs.push(react.createElement("div", { key: "d", className: "wfz-seg-done", style: { width: pct(props.completed) } }));
      if (props.failed) segs.push(react.createElement("div", { key: "f", className: "wfz-seg-fail", style: { width: pct(props.failed) } }));
      if (props.cancelled) segs.push(react.createElement("div", { key: "c", className: "wfz-seg-can", style: { width: pct(props.cancelled) } }));
      if (props.running) segs.push(react.createElement("div", { key: "r", className: "wfz-seg-run", style: { width: pct(props.running) } }));
      return react.createElement("div", { className: "wfz-bar" }, segs);
    }

    function apply(ctx) {
      const slots = ctx.slots;
      if (slots === undefined) return;
      const sessions = ctx.sessions;

      // Best-effort locale probe (zh vs en).
      let zh = true;
      const locale = ctx.get("locale");
      if (locale) {
        try {
          const snap = typeof locale.getSnapshot === "function" ? locale.getSnapshot() : undefined;
          if (snap && typeof snap.id === "string") zh = snap.id.indexOf("zh") === 0;
        } catch (e) { /* best effort */ }
      }
      const T = {
        runs: zh ? "个运行" : "runs",
        active: zh ? "进行中" : "active",
        agents: zh ? "代理" : "agents",
        running: zh ? "运行中" : "running",
        completed: zh ? "完成" : "completed",
        failed: zh ? "失败" : "failed",
        cancelled: zh ? "已取消" : "cancelled",
        pending: zh ? "未开始" : "pending",
        unphased: zh ? "未分组" : "unphased",
        phase: zh ? "阶段" : "phase",
        childId: zh ? "子会话" : "child",
        openSession: zh ? "打开子会话查看执行过程 →" : "Open child session →",
        empty: zh
          ? "还没有 workflow 运行。\n让 agent 通过 workflow 工具运行多代理编排，阶段、代理与进度会实时出现在这里。"
          : "No workflow runs yet.\nAsk the agent to run a multi-agent workflow; phases, agents and progress will appear here live.",
      };

      function AgentRow(props) {
        const a = props.agent;
        const open = props.openSeq === a.seq;
        const chipLabel = T[a.status] || a.status;
        const row = react.createElement("div", {
          className: "wfz-agrow",
          onClick: () => props.setOpenSeq(open ? null : a.seq),
        }, [
          react.createElement("span", { key: "s", className: "wfz-sub" }, "#" + a.seq),
          react.createElement("span", { key: "l", className: "wfz-aglabel", title: a.label }, a.label),
          react.createElement("span", { key: "c", className: "wfz-chip wfz-chip-" + a.status }, chipLabel),
        ]);
        if (!open) return react.createElement("div", { className: "wfz-ag" }, row);
        const detail = react.createElement("div", { className: "wfz-agdetail" }, [
          react.createElement("div", { key: "p", className: "wfz-kv" },
            react.createElement("b", null, T.phase),
            react.createElement("span", null, a.phase || T.unphased)),
          a.childId
            ? react.createElement("div", { key: "c", className: "wfz-kv" },
                react.createElement("b", null, T.childId),
                react.createElement("span", null, String(a.childId)))
            : null,
          a.childId && typeof sessions.open === "function"
            ? react.createElement("button", {
                key: "o", className: "wfz-open",
                onClick: (e) => { e.stopPropagation(); try { sessions.open(a.childId); } catch (err) { /* best effort */ } },
              }, T.openSession)
            : null,
        ]);
        return react.createElement("div", { className: "wfz-ag" }, [row, detail]);
      }

      function PhaseBlock(props) {
        const p = props.phase;
        const idx = props.idx;
        const open = props.openTitle === p.title;
        const pending = p.counts.total === 0;
        const c = p.counts;
        const done = c.completed + c.failed + c.cancelled;
        const counts = [];
        if (c.completed) counts.push(react.createElement("span", { key: "ok", className: "wfz-cok" }, "✓ " + c.completed));
        if (c.failed) counts.push(react.createElement("span", { key: "fl", className: "wfz-cfail" }, "✗ " + c.failed));
        if (c.running) counts.push(react.createElement("span", { key: "rn", className: "wfz-crun" }, "↻ " + c.running));
        if (c.cancelled) counts.push(react.createElement("span", { key: "cn", className: "wfz-sub" }, "⊘ " + c.cancelled));
        counts.push(react.createElement("span", { key: "tt", className: "wfz-sub" }, done + "/" + c.total));
        const head = react.createElement("div", {
          className: "wfz-phhead",
          onClick: () => props.setOpenTitle(open ? null : p.title),
        }, [
          react.createElement("span", { key: "i", className: "wfz-phidx" }, String(idx)),
          react.createElement("span", { key: "t", className: "wfz-phtitle" + (pending ? " pending" : ""), title: p.title }, p.title),
          react.createElement("span", { key: "c", className: "wfz-phcounts" },
            pending ? [react.createElement("span", { key: "pd" }, T.pending)] : counts),
          react.createElement("span", { key: "v", className: "wfz-chev" + (open ? " open" : "") }, "▶"),
        ]);
        let body = null;
        if (open && props.agents.length > 0) {
          body = react.createElement("div", { className: "wfz-aglist" }, props.agents.map((a) =>
            react.createElement(AgentRow, { key: a.seq, agent: a, openSeq: props.openSeq, setOpenSeq: props.setOpenSeq })));
        } else if (open) {
          body = react.createElement("div", { className: "wfz-aglist" },
            react.createElement("span", { className: "wfz-sub", style: { padding: "2px 8px" } }, T.pending));
        }
        return react.createElement("div", { className: "wfz-ph" }, [head,
          open ? react.createElement("div", { key: "pb", style: { padding: "0 8px 6px" } },
            react.createElement(Bar, c)) : null,
          body]);
      }

      function RunCard(props) {
        const run = props.run;
        const [openTitle, setOpenTitle] = react.useState(null);
        const [openSeq, setOpenSeq] = react.useState(null);
        const c = run.counts;
        const done = c.completed + c.failed + c.cancelled;
        const head = react.createElement("div", { className: "wfz-runhead" }, [
          react.createElement("span", { key: "d", className: "wfz-dot wfz-dot-" + run.status }),
          react.createElement("span", { key: "n", className: "wfz-name" }, run.name),
          react.createElement("span", { key: "p", className: "wfz-pill wfz-pill-" + run.status }, run.status),
          react.createElement("span", { key: "sp", style: { flex: 1 } }),
        ]);
        const meta = react.createElement("div", { className: "wfz-meta" }, [
          react.createElement("span", { key: "a" }, T.agents + " ", react.createElement("b", null, done + "/" + c.total),
            c.running > 0 ? react.createElement("span", { key: "r", className: "wfz-crun" }, " · ↻ " + c.running) : null),
          c.failed > 0 ? react.createElement("span", { key: "f", className: "wfz-cfail" }, "✗ " + c.failed) : null,
          react.createElement("span", { key: "ph" }, T.phase + " ", react.createElement("b", null, String(run.phases.length))),
        ]);
        const overall = react.createElement(Bar, c);
        const phaseBlocks = run.phases.map((p, i) => {
          const agents = run.agents.filter((a) => a.phase === p.title);
          return react.createElement(PhaseBlock, {
            key: p.title, phase: p, idx: i + 1, agents,
            openTitle, setOpenTitle, openSeq, setOpenSeq,
          });
        });
        return react.createElement("div", { className: "wfz-run" }, [
          head, meta, overall,
          run.phases.length > 0 ? react.createElement("div", { key: "phs", className: "wfz-phlist" }, phaseBlocks) : null,
        ]);
      }

      /** Poll `readRuns` on the timer service (1s) and render the run list. */
      function makePollingView(ctx, pollMs, render) {
        return function PollingView(props) {
          const read = props.readRuns;
          const [runs, setRuns] = react.useState(() => (typeof read === "function" ? read() : []));
          react.useEffect(() => {
            if (typeof read !== "function") return undefined;
            const timer = ctx.get("timer");
            setRuns(read());
            if (timer === undefined) return undefined;
            return timer.interval(() => setRuns(read()), pollMs);
          }, [read]);
          return render(runs);
        };
      }

      const WorkflowsView = makePollingView(ctx, 1000, (runs) => {
        const active = runs.filter((r) => r.status === "running" || r.status === "interrupted").length;
        const children = [react.createElement("div", { key: "t", className: "wfz-title" }, "Workflows",
          react.createElement("span", { key: "s", className: "wfz-sub" },
            runs.length + " " + T.runs + " · " + active + " " + T.active))];
        if (runs.length === 0) {
          children.push(react.createElement("div", { key: "e", className: "wfz-empty", style: { whiteSpace: "pre-line" } }, T.empty));
        } else {
          for (const run of runs) children.push(react.createElement(RunCard, { key: run.id, run }));
        }
        return react.createElement("div", { className: "wfz-root" }, children);
      });

      const DockStrip = makePollingView(ctx, 2500, (runs) => {
        const activeRuns = runs.filter((r) => r.status === "running" || r.status === "interrupted");
        if (activeRuns.length === 0) return null;
        const run = activeRuns[0];
        const c = run.counts;
        const done = c.completed + c.failed + c.cancelled;
        const extra = activeRuns.length - 1;
        const lastPhase = run.phases.length > 0 ? run.phases[run.phases.length - 1].title : "";
        const segs = [];
        if (c.completed) segs.push(react.createElement("div", { key: "d", className: "wfz-seg-done", style: { width: (c.completed / c.total) * 100 + "%" } }));
        if (c.failed) segs.push(react.createElement("div", { key: "f", className: "wfz-seg-fail", style: { width: (c.failed / c.total) * 100 + "%" } }));
        if (c.running) segs.push(react.createElement("div", { key: "r", className: "wfz-seg-run", style: { width: (c.running / c.total) * 100 + "%" } }));
        return react.createElement("div", { className: "wfz-dock" }, [
          react.createElement("span", { key: "dot", className: "wfz-dot wfz-dot-running" }),
          react.createElement("span", { key: "name", className: "wfz-dockname" }, run.name),
          lastPhase ? react.createElement("span", { key: "p", className: "wfz-sub" }, lastPhase) : null,
          react.createElement("div", { key: "bar", className: "wfz-dockbar" }, segs),
          react.createElement("span", { key: "count", className: "wfz-sub" },
            T.agents + " " + done + "/" + c.total + (extra > 0 ? " · +" + extra : "")),
        ]);
      });

      slots.inject("conversation.view", () => slots.register(
        {
          name: "conversation.view",
          id: "workflows",
          order: 15,
          label: "Workflows",
          inject: (sessionId) => ({ readRuns: () => readRuns(ctx, sessionId) }),
        },
        WorkflowsView,
      ));

      slots.inject("conversation.input.dock", () => slots.register(
        {
          name: "conversation.input.dock",
          id: "workflow-live",
          order: 5,
          label: "Workflows live",
          inject: (sessionId) => ({ readRuns: () => readRuns(ctx, sessionId) }),
        },
        DockStrip,
      ));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
