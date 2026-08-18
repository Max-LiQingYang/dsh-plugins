// Browser half of @dsh-plugins/workflow-visualizer — client module format.
//
// Loaded by the DSH web app through the exports["./client"] bundle route and
// executed as a classic script: window.__ModuleLoader__.load registers this
// package's factory; the client runtime materializes it as a Cordis plugin
// whose hard service dependencies come from the exported `inject` list.
//
// The plugin contributes two slots, modeled on Claude Code's dynamic-workflow
// watching experience:
//
//   1. `conversation.view` (id "workflows") — a dedicated view tab beside
//      chat/trajectory: one card per workflow run with overall and per-phase
//      progress bars, expandable agent lists, and status badges.
//   2. `conversation.input.dock` (id "workflow-live") — a one-line live
//      progress strip above the composer while any run is active; hidden
//      when no run is in flight.
//
// Data source: the shipped conversation machinery folds the durable
// `tool-workflow/*` session events into `workflow-run` chat nodes; this
// plugin re-reads that fold (`session.getSnapshot().nodes`) on a 1s timer.
// No package-private RPC and no host half are needed. The dynamic variant
// (src/dynamic-*.js) additionally shows elapsed times and script logs via a
// host-side Cordis-event aggregator.
window.__ModuleLoader__.load({
  id: "@dsh-plugins/workflow-visualizer",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    let react = require("react");

    // ── styles (tagged for the client-modules HMR bookkeeping) ──────────────
    const CSS = `\
.wfz-root{display:flex;flex-direction:column;gap:12px;height:100%;overflow-y:auto;padding:16px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;box-sizing:border-box}
.wfz-title{font-weight:600;font-size:14px;display:flex;align-items:center;gap:8px}
.wfz-sub{color:var(--dsw-alias-label-secondary);font-size:12px}
.wfz-card{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.wfz-runhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.wfz-dot{width:8px;height:8px;border-radius:50%;flex:none}
.wfz-dot-running,.wfz-dot-interrupted{background:var(--dsw-alias-brand-primary);animation:wfz-pulse 1.2s ease-in-out infinite}
.wfz-dot-completed{background:var(--dsw-alias-state-success-primary)}
.wfz-dot-cancelled{background:var(--dsw-alias-state-warn-primary)}
.wfz-dot-failed{background:var(--dsw-alias-state-error-primary)}
@keyframes wfz-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.wfz-name{font-weight:600}
.wfz-badge{font-size:11px;padding:1px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.wfz-bar{display:flex;height:6px;border-radius:3px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);min-width:60px}
.wfz-seg-done{background:var(--dsw-alias-state-success-primary)}
.wfz-seg-fail{background:var(--dsw-alias-state-error-primary)}
.wfz-seg-run{background:var(--dsw-alias-brand-primary);animation:wfz-pulse 1.2s ease-in-out infinite}
.wfz-phases{display:flex;flex-direction:column;gap:5px}
.wfz-phase{display:grid;grid-template-columns:minmax(110px,220px) 1fr auto;gap:10px;align-items:center}
.wfz-phaselabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:12px}
.wfz-phasecount{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.wfz-agents{border-top:1px dashed var(--dsw-alias-border-l1);padding-top:6px;display:flex;flex-direction:column;gap:2px;max-height:240px;overflow-y:auto}
.wfz-agentrow{display:grid;grid-template-columns:32px 1fr auto;gap:8px;align-items:center;font-size:12px;padding:2px 0}
.wfz-agentlabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wfz-out{font-size:11px;padding:0 7px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1)}
.wfz-out-completed{color:var(--dsw-alias-state-success-primary)}
.wfz-out-failed{color:var(--dsw-alias-state-error-primary)}
.wfz-out-cancelled{color:var(--dsw-alias-state-warn-primary)}
.wfz-out-running,.wfz-out-interrupted{color:var(--dsw-alias-brand-primary)}
.wfz-btn{cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;padding:2px 9px;font-size:11px}
.wfz-btn:hover{color:var(--dsw-alias-label-primary)}
.wfz-dock{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance) - var(--dsh-composer-side-clearance) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));margin:0 auto;display:flex;align-items:center;gap:10px;padding:5px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);font-size:12px}
.wfz-dockbar{flex:1;display:flex;height:5px;border-radius:3px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);min-width:80px}
.wfz-empty{color:var(--dsw-alias-label-secondary);border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;padding:28px 20px;text-align:center}
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

    function tally(members) {
      const counts = { total: members.length, completed: 0, failed: 0, cancelled: 0, running: 0 };
      for (const m of members) {
        if (m.status === "completed") counts.completed++;
        else if (m.status === "failed") counts.failed++;
        else if (m.status === "cancelled" || m.status === "interrupted") counts.cancelled++;
        else counts.running++;
      }
      return counts;
    }

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
          const counts = tally(members);
          const title = phaseTitle(group.phase);
          phases.push({ title, counts });
          for (const m of members) {
            agents.push({ seq: m.seq, label: m.label, phase: title, status: m.status });
          }
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
      if (props.cancelled) segs.push(react.createElement("div", { key: "c", className: "wfz-seg-fail", style: { width: pct(props.cancelled), opacity: 0.5 } }));
      if (props.running) segs.push(react.createElement("div", { key: "r", className: "wfz-seg-run", style: { width: pct(props.running) } }));
      return react.createElement("div", { className: "wfz-bar" }, segs);
    }

    function RunCard(props) {
      const run = props.run;
      const [open, setOpen] = react.useState(false);
      const c = run.counts;
      const done = c.completed + c.failed + c.cancelled;
      const head = react.createElement("div", { className: "wfz-runhead" }, [
        react.createElement("span", { key: "dot", className: "wfz-dot wfz-dot-" + run.status }),
        react.createElement("span", { key: "name", className: "wfz-name" }, run.name),
        react.createElement("span", { key: "badge", className: "wfz-badge" }, run.status),
        react.createElement("span", { key: "agents", className: "wfz-sub" }, "agents " + done + "/" + c.total),
        react.createElement("span", { key: "spacer", style: { flex: 1 } }),
        react.createElement("button", {
          key: "toggle", className: "wfz-btn", onClick: () => setOpen(!open),
        }, open ? "hide agents" : "agents (" + c.total + ")"),
      ]);
      const overall = react.createElement(Bar, c);
      const phaseRows = run.phases.map((p, i) => {
        const pdone = p.counts.completed + p.counts.failed + p.counts.cancelled;
        return react.createElement("div", { className: "wfz-phase", key: i }, [
          react.createElement("span", { key: "l", className: "wfz-phaselabel", title: p.title }, p.title),
          react.createElement(Bar, Object.assign({ key: "b" }, p.counts)),
          react.createElement("span", { key: "c", className: "wfz-phasecount" },
            p.counts.total === 0 ? "pending" : pdone + "/" + p.counts.total + (p.counts.failed ? " · " + p.counts.failed + " failed" : "")),
        ]);
      });
      let agentRows = null;
      if (open) {
        agentRows = react.createElement("div", { className: "wfz-agents" }, run.agents.map((a) =>
          react.createElement("div", { className: "wfz-agentrow", key: a.seq }, [
            react.createElement("span", { key: "s", className: "wfz-sub" }, "#" + a.seq),
            react.createElement("span", { key: "l", className: "wfz-agentlabel", title: a.label }, a.label),
            react.createElement("span", { key: "o", className: "wfz-out wfz-out-" + a.status }, a.status),
          ])));
      }
      return react.createElement("div", { className: "wfz-card" }, [head, overall,
        run.phases.length > 0 ? react.createElement("div", { key: "phases", className: "wfz-phases" }, phaseRows) : null,
        agentRows]);
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

    function apply(ctx) {
      const slots = ctx.slots;
      if (slots === undefined) return;

      // Best-effort locale probe for the empty-state copy (zh vs en).
      let zh = true;
      const locale = ctx.get("locale");
      if (locale) {
        try {
          const snap = typeof locale.getSnapshot === "function" ? locale.getSnapshot() : undefined;
          if (snap && typeof snap.id === "string") zh = snap.id.indexOf("zh") === 0;
        } catch (e) { /* best effort */ }
      }

      const WorkflowsView = makePollingView(ctx, 1000, (runs) => {
        const active = runs.filter((r) => r.status === "running" || r.status === "interrupted").length;
        const children = [react.createElement("div", { key: "t", className: "wfz-title" }, "Workflows",
          react.createElement("span", { key: "s", className: "wfz-sub" },
            runs.length + " run" + (runs.length === 1 ? "" : "s") + " · " + active + " active"))];
        if (runs.length === 0) {
          children.push(react.createElement("div", { key: "e", className: "wfz-empty" }, zh
            ? "还没有 workflow 运行。让 agent 通过 workflow 工具运行多代理编排，阶段、代理与进度会实时出现在这里。"
            : "No workflow runs yet. Ask the agent to run a multi-agent workflow, and live phases, agents and progress will appear here."));
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
        const segs = [];
        if (c.completed) segs.push(react.createElement("div", { key: "d", className: "wfz-seg-done", style: { width: (c.completed / c.total) * 100 + "%" } }));
        if (c.failed) segs.push(react.createElement("div", { key: "f", className: "wfz-seg-fail", style: { width: (c.failed / c.total) * 100 + "%" } }));
        if (c.running) segs.push(react.createElement("div", { key: "r", className: "wfz-seg-run", style: { width: (c.running / c.total) * 100 + "%" } }));
        return react.createElement("div", { className: "wfz-dock" }, [
          react.createElement("span", { key: "dot", className: "wfz-dot wfz-dot-running" }),
          react.createElement("span", { key: "name", style: { fontWeight: 600 } }, run.name),
          react.createElement("div", { key: "bar", className: "wfz-dockbar" }, segs),
          react.createElement("span", { key: "count", className: "wfz-sub" },
            "agents " + done + "/" + c.total + (extra > 0 ? " · +" + extra + " more" : "")),
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
