// Browser half of @dsh-plugins/graph — client module format.
//
// Loaded by the DSH web app through the exports["./client"] bundle route and
// executed as a classic script: window.__ModuleLoader__.load registers this
// package's factory; the client runtime materializes it as a Cordis plugin
// (hard service dependencies from the exported `inject` list).
//
// Contribution: one KEYED `tool.call.toolview` registration with key "graph",
// owning how `graph` tool calls render inside a turn:
//
//  - topology: layered BFS layout (cycles legible: back-edges dip, self-loops
//    arc overhead); agent nodes ◆ brand-stroked, js nodes ◇, entry labeled;
//    static edges solid, conditional routers dashed stubs;
//  - runtime info: while the call runs, the card pulses over the argsRaw
//    topology; the dynamic variant additionally polls the host aggregator
//    (`graph.live` package-private RPC) and streams live agent chips —
//    which node's agent is running, elapsed time, and completed outputs as
//    they land;
//  - agent outputs: once settled, the host's presentationMeta projection
//    (ToolResultNode.meta) carries per-node final outputs (`nodeOutputs`);
//    the step scrubber replays each super-step with the outputs produced in
//    it, and clicking a node shows its output.
//
// The view stays a pure function of the frozen ToolCallBlock plus (dynamic
// variant only) the polled live snapshot — no session-event fold required.
window.__ModuleLoader__.load({
  id: "@dsh-plugins/graph",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    let react = require("react");

    // ── styles (tagged for the client-modules HMR bookkeeping) ──────────────
    const CSS = `\
.gvw-root{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);font-size:12px;display:flex;flex-direction:column;gap:8px;padding:10px 12px}
.gvw-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.gvw-name{font-weight:600}
.gvw-dot{width:8px;height:8px;border-radius:50%;flex:none}
.gvw-dot-run{background:var(--dsw-alias-brand-primary);animation:gvw-pulse 1.2s ease-in-out infinite}
.gvw-dot-end{background:var(--dsw-alias-state-success-primary)}
.gvw-dot-max-steps,.gvw-dot-dry-run{background:var(--dsw-alias-state-warn-primary)}
.gvw-dot-aborted{background:var(--dsw-alias-label-secondary)}
.gvw-dot-error{background:var(--dsw-alias-state-error-primary)}
@keyframes gvw-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.gvw-badge{font-size:11px;padding:1px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.gvw-sub{color:var(--dsw-alias-label-secondary);font-size:11px}
.gvw-svgwrap{border:1px dashed var(--dsw-alias-border-l1);border-radius:8px;padding:6px;overflow-x:auto;background:var(--dsw-alias-bg-base)}
.gvw-svg{display:block;max-width:100%;height:auto}
.gvw-node{fill:var(--dsw-alias-bg-layer-2);stroke:var(--dsw-alias-label-secondary);stroke-width:1}
.gvw-node-agent{stroke:var(--dsw-alias-brand-primary)}
.gvw-node-hot{stroke:var(--dsw-alias-state-success-primary);stroke-width:2}
.gvw-node-err{stroke:var(--dsw-alias-state-error-primary);stroke-width:2}
.gvw-node-sel{stroke:var(--dsw-alias-brand-primary);stroke-width:2.5}
.gvw-nlabel{font-size:11px;fill:var(--dsw-alias-label-primary);font-family:inherit;pointer-events:none}
.gvw-ntype{font-size:9px;fill:var(--dsw-alias-label-secondary);font-family:inherit;pointer-events:none}
.gvw-edge{fill:none;stroke:var(--dsw-alias-label-secondary);stroke-width:1.2}
.gvw-edge-cond{stroke-dasharray:4 3}
.gvw-edge-hot{stroke:var(--dsw-alias-state-success-primary);stroke-width:2}
.gvw-count{font-size:9px;fill:var(--dsw-alias-label-secondary);font-family:inherit;pointer-events:none}
.gvw-scrub{display:flex;align-items:center;gap:10px}
.gvw-scrub input[type=range]{flex:1;accent-color:var(--dsw-alias-brand-primary)}
.gvw-stepinfo{white-space:nowrap}
.gvw-err{color:var(--dsw-alias-state-error-primary);white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px}
.gvw-json{max-height:220px;overflow:auto;white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:var(--dsw-alias-label-secondary)}
.gvw-muted{color:var(--dsw-alias-label-secondary)}
.gvw-live{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:6px 8px;display:flex;flex-direction:column;gap:4px}
.gvw-livechip{display:flex;align-items:center;gap:7px;font-size:11px;flex-wrap:wrap}
.gvw-chipdot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-brand-primary);animation:gvw-pulse 1.2s ease-in-out infinite;flex:none}
.gvw-chipdot-done{background:var(--dsw-alias-state-success-primary);animation:none}
.gvw-chipdot-fail{background:var(--dsw-alias-state-error-primary);animation:none}
.gvw-preview{color:var(--dsw-alias-label-secondary);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;max-width:560px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gvw-outexp{border-top:1px dashed var(--dsw-alias-border-l1);padding-top:6px;display:flex;flex-direction:column;gap:4px;max-height:260px;overflow-y:auto}
.gvw-outrow{display:grid;grid-template-columns:minmax(90px,170px) 1fr;gap:8px;align-items:start;cursor:pointer}
.gvw-outrow:hover{background:var(--dsw-alias-bg-layer-2);border-radius:6px}
.gvw-sel{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:6px 8px;display:flex;flex-direction:column;gap:4px}
`;
    const tagId = "@dsh-plugins/graph";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = tagId;
      tag.dataset.pluginCss = tagId;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    /** Hard service dependencies resolved by the client runtime. */
    const inject = ["slots"];

    // ── pure helpers (exported for tests via exports.__test) ────────────────

    /** Parse the graph args out of a frozen ToolCallBlock (running or settled). */
    function parseGraphArgs(block) {
      const raw = block && block.kind === "tool-result"
        ? (block.call && block.call.argsRaw)
        : (block && block.argsRaw);
      if (typeof raw !== "string") return null;
      try {
        const args = JSON.parse(raw);
        if (!args || !Array.isArray(args.nodes) || !Array.isArray(args.edges)) return null;
        return args;
      } catch (e) {
        return null;
      }
    }

    /** The structured result: presentationMeta projection on `meta`, if any. */
    function parseGraphResult(block) {
      if (!block || block.kind !== "tool-result") return null;
      const meta = block.meta;
      if (meta && typeof meta === "object" && Array.isArray(meta.trace)) return meta;
      return null;
    }

    /** Per-node final output from the meta projection, or null. */
    function outputOf(result, nodeId) {
      if (!result || typeof result !== "object") return null;
      const outputs = result.nodeOutputs;
      if (!outputs || typeof outputs !== "object") return null;
      return nodeId in outputs ? outputs[nodeId] : null;
    }

    /** Render one output value as display text (pretty JSON for objects). */
    function prettyOutput(value) {
      if (value === null || value === undefined) return "null";
      if (typeof value === "string") return value.length > 2000 ? value.slice(0, 2000) + "…" : value;
      try {
        const text = JSON.stringify(value, null, 2);
        return text.length > 2000 ? text.slice(0, 2000) + "…" : text;
      } catch (e) {
        return String(value);
      }
    }

    /**
     * Pick the live run a running card should display: among snapshot runs
     * whose name matches, prefer one still in flight, else the newest.
     */
    function pickLiveRun(snapshot, name) {
      if (!snapshot || !Array.isArray(snapshot.runs)) return null;
      const matches = snapshot.runs.filter((r) => r && r.name === name);
      if (matches.length === 0) return null;
      const live = matches.find((r) => r.endedAt === null);
      return live !== undefined ? live : matches[0];
    }

    function firstText(blocks) {
      if (!Array.isArray(blocks)) return "";
      const parts = [];
      for (const b of blocks) if (b && b.type === "text" && typeof b.text === "string") parts.push(b.text);
      return parts.join("\n");
    }

    /**
     * Layered layout by BFS distance from the entry (well-defined even with
     * cycles). Nodes unreachable from the entry form a trailing layer, in
     * input order. Router edges carry no static target and never affect
     * layering.
     */
    function computeLayout(args) {
      const nodes = args.nodes || [];
      const edges = args.edges || [];
      const ids = nodes.map((n) => n.id);
      const idSet = new Set(ids);
      const out = new Map();
      for (const n of nodes) out.set(n.id, { to: [], routers: 0 });
      for (const e of edges) {
        if (!idSet.has(e.from)) continue;
        if (e.to !== undefined && idSet.has(e.to)) out.get(e.from).to.push(e.to);
        else if (e.router !== undefined) out.get(e.from).routers += 1;
      }
      const entry = typeof args.entry === "string" && idSet.has(args.entry) ? args.entry : ids[0];
      const layer = new Map();
      const queue = [entry];
      layer.set(entry, 0);
      for (let qi = 0; qi < queue.length; qi += 1) {
        const id = queue[qi];
        for (const next of out.get(id).to) {
          if (!layer.has(next)) {
            layer.set(next, layer.get(id) + 1);
            queue.push(next);
          }
        }
      }
      let extra = -1;
      for (const id of ids) {
        if (!layer.has(id)) {
          if (extra < 0) extra = Math.max(0, ...[...layer.values()]) + 1;
          layer.set(id, extra);
        }
      }
      const columns = new Map();
      for (const id of ids) {
        const l = layer.get(id) || 0;
        if (!columns.has(l)) columns.set(l, []);
        columns.get(l).push(id);
      }
      const W = 150, H = 44, GX = 56, GY = 22, PAD = 14;
      const pos = new Map();
      let maxRows = 1;
      for (const l of [...columns.keys()].sort((a, b) => a - b)) {
        const col = columns.get(l);
        if (col.length > maxRows) maxRows = col.length;
        col.forEach((id, i) => pos.set(id, { x: PAD + l * (W + GX), y: PAD + i * (H + GY), w: W, h: H }));
      }
      const layerCount = columns.size || 1;
      return {
        pos,
        width: PAD * 2 + layerCount * W + (layerCount - 1) * GX,
        height: PAD * 2 + maxRows * H + (maxRows - 1) * GY,
        entry,
      };
    }

    function edgePath(a, b, back) {
      const x1 = a.x + a.w, y1 = a.y + a.h / 2;
      const x2 = b.x, y2 = b.y + b.h / 2;
      if (back) {
        const drop = Math.max(34, Math.abs(y1 - y2) / 2 + 30);
        return "M" + x1 + "," + y1 +
          " C" + (x1 + 34) + "," + (y1 + drop) + " " + (x2 - 34) + "," + (y2 + drop) + " " + x2 + "," + y2;
      }
      const mx = (x1 + x2) / 2;
      return "M" + x1 + "," + y1 + " C" + mx + "," + y1 + " " + mx + "," + y2 + " " + x2 + "," + y2;
    }

    function selfLoopPath(a) {
      const x = a.x + a.w / 2, y = a.y;
      return "M" + (x - 12) + "," + y + " C" + (x - 26) + "," + (y - 30) + " " + (x + 26) + "," + (y - 30) + " " + (x + 12) + "," + y;
    }

    function nodeStats(result) {
      const stats = new Map();
      if (!result || !Array.isArray(result.trace)) return stats;
      for (const step of result.trace) {
        for (const n of step.nodes || []) {
          const s = stats.get(n.id) || { runs: 0, ok: 0, ms: 0, lastStep: 0, errored: false };
          s.runs += 1;
          s.ms += typeof n.ms === "number" ? n.ms : 0;
          s.lastStep = step.step;
          if (n.status === "ok") s.ok += 1;
          else s.errored = true;
          stats.set(n.id, s);
        }
      }
      return stats;
    }

    const END_CLASS = {
      "end": "gvw-dot-end",
      "max-steps": "gvw-dot-max-steps",
      "aborted": "gvw-dot-aborted",
      "error": "gvw-dot-error",
      "dry-run": "gvw-dot-dry-run",
    };

    // ── the keyed tool view (component factory closes over ctx for the
    //    live-poll timer; the module variant simply has no `host` global,
    //    so its running card degrades to topology + pulse) ────────────────

    function makeGraphToolView(ctx) {
      return function GraphToolView(props) {
        const block = props.block;
        const running = !(block && block.kind === "tool-result");
        const errored = !!(block && block.kind === "tool-result" && block.isError);
        const args = parseGraphArgs(block);
        const result = parseGraphResult(block);
        const [step, setStep] = react.useState(0);
        const [open, setOpen] = react.useState(false);
        const [selected, setSelected] = react.useState(null);
        const [live, setLive] = react.useState(null);
        const h = react.createElement;

        // Live poll (dynamic variant only): host.call('graph.live') via timer.
        react.useEffect(() => {
          if (!running || typeof host === "undefined" || !args || typeof args.name !== "string") return undefined;
          const timer = ctx && typeof ctx.get === "function" ? ctx.get("timer") : undefined;
          if (!timer) return undefined;
          const refresh = () => {
            try {
              host.call("graph.live").then((v) => {
                if (v && typeof v === "object" && Array.isArray(v.runs)) setLive(v);
              }).catch(() => {});
            } catch (e) { /* ignore */ }
          };
          refresh();
          return timer.interval(refresh, 1200);
        }, [running, args && args.name]);

        if (!args) {
          return h("div", { className: "gvw-root" },
            h("div", { className: "gvw-head" },
              h("span", { className: "gvw-name" }, "graph"),
              h("span", { className: "gvw-sub" }, running ? "running (args unavailable)" : firstText(block && block.content).slice(0, 300))));
        }

        const layout = computeLayout(args);
        const stats = nodeStats(result);
        const steps = result ? result.steps : 0;
        const scrub = Math.min(step, Math.max(0, steps));
        const stepInfo = result && Array.isArray(result.trace) && result.trace[scrub - 1];
        const hotNodes = new Set(stepInfo ? (stepInfo.nodes || []).map((n) => n.id) : []);
        const hotNext = new Set(stepInfo ? (stepInfo.next || []) : []);
        const liveRun = pickLiveRun(live, args.name);

        const markerDefs = h("defs", null,
          h("marker", { key: "a", id: "gvw-arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" },
            h("path", { d: "M0,0 L10,5 L0,10 z", fill: "var(--dsw-alias-label-secondary)" })),
          h("marker", { key: "ah", id: "gvw-arrow-hot", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" },
            h("path", { d: "M0,0 L10,5 L0,10 z", fill: "var(--dsw-alias-state-success-primary)" })));

        const edgeEls = [];
        for (const e of args.edges || []) {
          const a = layout.pos.get(e.from);
          if (!a) continue;
          if (e.to !== undefined) {
            const b = layout.pos.get(e.to);
            if (!b) continue;
            const self = e.to === e.from;
            const back = !self && b.x <= a.x;
            const hot = stepInfo && ((hotNodes.has(e.from) && hotNext.has(e.to)) || (self && hotNodes.has(e.from)));
            edgeEls.push(h("path", {
              key: "e" + edgeEls.length,
              className: "gvw-edge" + (hot ? " gvw-edge-hot" : ""),
              d: self ? selfLoopPath(a) : edgePath(a, b, back),
              markerEnd: "url(#gvw-arrow" + (hot ? "-hot" : "") + ")",
            }));
          } else {
            edgeEls.push(h("path", {
              key: "e" + edgeEls.length,
              className: "gvw-edge gvw-edge-cond",
              d: "M" + (a.x + a.w) + "," + (a.y + a.h / 2) + " l38,0",
              markerEnd: "url(#gvw-arrow)",
            }));
            edgeEls.push(h("text", {
              key: "t" + edgeEls.length,
              className: "gvw-ntype",
              x: a.x + a.w + 6, y: a.y + a.h / 2 - 6,
            }, "route"));
          }
        }

        const nodeEls = (args.nodes || []).map((n) => {
          const p = layout.pos.get(n.id);
          const s = stats.get(n.id);
          const hot = hotNodes.has(n.id);
          const err = s && s.errored;
          const cls = "gvw-node gvw-node-" + (n.type === "agent" ? "agent" : "js") +
            (hot ? " gvw-node-hot" : err ? " gvw-node-err" : "") +
            (selected === n.id ? " gvw-node-sel" : "");
          const children = [
            h("rect", { key: "r", className: cls, x: p.x, y: p.y, width: p.w, height: p.h, rx: 8 }),
            h("text", { key: "l", className: "gvw-nlabel", x: p.x + p.w / 2, y: p.y + 18, textAnchor: "middle" }, n.id),
            h("text", { key: "t", className: "gvw-ntype", x: p.x + p.w / 2, y: p.y + 32, textAnchor: "middle" },
              (n.type === "agent" ? "◆ agent" : "◇ js") + (n.id === layout.entry ? " · entry" : "")),
          ];
          if (s && s.runs > 0) {
            children.push(h("text", { key: "c", className: "gvw-count", x: p.x + p.w - 4, y: p.y + 10, textAnchor: "end" },
              "×" + s.runs + (s.ms ? " " + (s.ms < 1000 ? s.ms + "ms" : (s.ms / 1000).toFixed(1) + "s") : "")));
          }
          return h("g", {
            key: n.id,
            style: { cursor: "pointer" },
            onClick: () => setSelected(selected === n.id ? null : n.id),
          }, children);
        });

        const svg = h("div", { className: "gvw-svgwrap" },
          h("svg", { className: "gvw-svg", viewBox: "0 0 " + layout.width + " " + layout.height, width: layout.width, height: layout.height },
            markerDefs, edgeEls, nodeEls));

        const name = typeof args.name === "string" && args.name ? args.name : "graph";
        const endReason = result ? result.endReason : (running ? "running" : errored ? "error" : "settled");
        const dotCls = running ? "gvw-dot-run" : (END_CLASS[endReason] || "gvw-dot-run");
        const head = h("div", { className: "gvw-head" }, [
          h("span", { key: "dot", className: "gvw-dot " + dotCls }),
          h("span", { key: "name", className: "gvw-name" }, "graph: " + name),
          h("span", { key: "badge", className: "gvw-badge" }, endReason),
          h("span", { key: "meta", className: "gvw-sub" },
            (args.nodes || []).length + " nodes · " + (args.edges || []).length + " edges · entry " + args.entry +
            (result ? " · " + result.steps + " step(s)" : "") +
            (args.dryRun ? " · dry-run" : "")),
        ]);

        let notice = null;
        if (errored) {
          notice = h("div", { className: "gvw-err" }, (result && result.error) || firstText(block.content) || "graph run failed");
        } else if (result && result.endReason === "dry-run") {
          const issues = Array.isArray(result.issues) && result.issues.length > 0
            ? result.issues.map((s, i) => h("div", { key: i }, "• " + s))
            : [h("div", { key: "ok" }, "no issues")];
          notice = h("div", { className: "gvw-json" },
            result.loops ? h("div", { key: "loops" }, result.loops) : null, issues);
        }

        // ── live strip (running, dynamic variant with host RPC) ────────────
        let liveStrip = null;
        if (running && liveRun && liveRun.agents.length > 0) {
          const now = live && typeof live.now === "number" ? live.now : Date.now();
          const chips = liveRun.agents.slice(-30).map((a) => {
            const el = a.status === "running" ? Math.max(0, now - a.startedAt) : (a.ms || 0);
            const elText = el < 1000 ? el + "ms" : (el / 1000).toFixed(1) + "s";
            const cls = "gvw-chipdot" + (a.status === "running" ? "" : a.status === "completed" ? " gvw-chipdot-done" : " gvw-chipdot-fail");
            return h("div", { key: a.node + a.startedAt, className: "gvw-livechip" }, [
              h("span", { key: "d", className: cls }),
              h("span", { key: "n", style: { fontWeight: 600 } }, a.node),
              h("span", { key: "s", className: "gvw-sub" }, a.status === "running" ? "running " + elText : a.status + " " + elText),
              a.preview ? h("span", { key: "p", className: "gvw-preview" },
                (a.preview.kind === "structured" ? "→ " + prettyOutput(a.preview.value).slice(0, 160) : "→ " + a.preview.value)) : null,
            ]);
          });
          const done = liveRun.agents.filter((a) => a.status !== "running").length;
          liveStrip = h("div", { className: "gvw-live" }, [
            h("div", { key: "t", className: "gvw-sub" },
              "live · " + liveRun.agents.length + " agent run(s), " + done + " done"),
            chips,
          ]);
        }

        // ── step outputs (settled): what each node of step k produced ──────
        let stepPanel = null;
        if (result && stepInfo && scrub > 0) {
          const rows = (stepInfo.nodes || []).map((n) => {
            const value = outputOf(result, n.id);
            const label = h("span", { key: "l", className: "gvw-sub", style: { fontWeight: 600 } },
              n.id + (n.status === "ok" ? "" : " ✗") + (n.ms !== undefined ? " " + (n.ms < 1000 ? n.ms + "ms" : (n.ms / 1000).toFixed(1) + "s") : ""));
            const body = value !== null
              ? h("span", { key: "v", className: "gvw-json", style: { maxHeight: 90 } }, prettyOutput(value))
              : h("span", { key: "v", className: "gvw-muted" }, "patch / no keyed output");
            return h("div", { key: n.id, className: "gvw-outrow", onClick: () => setSelected(selected === n.id ? null : n.id) }, [label, body]);
          });
          stepPanel = h("div", { className: "gvw-outexp" }, [
            h("div", { key: "t", className: "gvw-sub" }, "outputs · step #" + scrub),
            rows,
          ]);
        }

        // ── selected-node detail ──────────────────────────────────────────
        let selPanel = null;
        if (selected && (args.nodes || []).some((n) => n.id === selected)) {
          const value = outputOf(result, selected);
          const liveAgent = liveRun ? liveRun.agents.find((a) => a.node === selected) : null;
          const s = stats.get(selected);
          const lines = [];
          if (s) lines.push("ran ×" + s.runs + (s.ms ? " · " + (s.ms < 1000 ? s.ms + "ms" : (s.ms / 1000).toFixed(1) + "s") : "") + (s.errored ? " · errored" : ""));
          if (liveAgent) lines.push(liveAgent.status === "running" ? "live: running" : "live: " + liveAgent.status);
          const body = value !== null
            ? h("pre", { key: "v", className: "gvw-json" }, prettyOutput(value))
            : (liveAgent && liveAgent.preview
              ? h("pre", { key: "v", className: "gvw-json" }, (liveAgent.preview.kind === "structured" ? prettyOutput(liveAgent.preview.value) : liveAgent.preview.value))
              : h("span", { key: "v", className: "gvw-muted" }, "no keyed output for this node"));
          selPanel = h("div", { className: "gvw-sel" }, [
            h("div", { key: "h", className: "gvw-head" },
              h("span", { key: "n", className: "gvw-name" }, selected),
              h("span", { key: "s", className: "gvw-sub" }, lines.join(" · "))),
            body,
          ]);
        }

        // ── step scrubber (settled, executed) ─────────────────────────────
        let scrubber = null;
        if (result && result.steps > 0 && Array.isArray(result.trace) && result.trace.length > 0) {
          scrubber = h("div", { className: "gvw-scrub" }, [
            h("span", { key: "l", className: "gvw-sub" }, "step"),
            h("input", {
              key: "r", type: "range", min: 0, max: result.steps, value: scrub,
              onChange: (ev) => setStep(Number(ev.target.value)),
            }),
            h("span", { key: "i", className: "gvw-stepinfo gvw-sub" },
              scrub === 0
                ? "initial state"
                : "#" + scrub + " ran " + (stepInfo ? (stepInfo.nodes || []).map((n) => n.id).join(", ") : "?") +
                  (stepInfo && (stepInfo.next || []).length > 0 ? " → " + (stepInfo.next || []).join(", ") : " → ∅")),
          ]);
        }

        let detail = null;
        if (result) {
          const stateJson = result.state !== undefined ? JSON.stringify(result.state, null, 2) : "";
          detail = h("div", null, [
            h("button", { key: "b", className: "gvw-badge", style: { cursor: "pointer", background: "transparent" }, onClick: () => setOpen(!open) },
              open ? "hide state & trace" : "state & trace"),
            open ? h("div", { key: "j", className: "gvw-json" }, stateJson) : null,
          ]);
        }

        return h("div", { className: "gvw-root" }, [head, svg, notice, liveStrip, scrubber, stepPanel, selPanel, detail]);
      };
    }

    function apply(ctx) {
      const slots = ctx.slots;
      if (slots === undefined) return;
      slots.inject("tool.call.toolview", () => slots.register(
        { name: "tool.call.toolview", key: "graph" },
        makeGraphToolView(ctx),
      ));
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.__test = { parseGraphArgs, parseGraphResult, outputOf, prettyOutput, pickLiveRun, computeLayout, nodeStats, firstText };
    return module.exports;
  },
});
