// Browser half of @dsh-plugins/graph — client module format.
//
// Loaded by the DSH web app through the exports["./client"] bundle route and
// executed as a classic script: window.__ModuleLoader__.load registers this
// package's factory; the client runtime materializes it as a Cordis plugin
// (hard service dependencies from the exported `inject` list).
//
// Contribution: one KEYED `tool.call.toolview` registration with key "graph",
// owning how `graph` tool calls render inside a turn — a topology view of the
// authored graph (agent nodes as filled diamonds, js nodes as hollow ones,
// static edges solid, conditional routers dashed) plus, once the call settles,
// a step scrubber replaying the super-step trace (which frontier ran, where
// routing went) and a collapsible state/trace section. While the call runs,
// the same topology renders with a live pulse — data comes solely from the
// frozen ToolCallBlock (argsRaw while running; presentationMeta projection as
// `meta` once settled), so no host events or polling are needed.
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
.gvw-entryring{fill:none;stroke:var(--dsw-alias-brand-primary);stroke-width:1.5;stroke-dasharray:3 2}
.gvw-nlabel{font-size:11px;fill:var(--dsw-alias-label-primary);font-family:inherit}
.gvw-ntype{font-size:9px;fill:var(--dsw-alias-label-secondary);font-family:inherit}
.gvw-edge{fill:none;stroke:var(--dsw-alias-label-secondary);stroke-width:1.2}
.gvw-edge-cond{stroke-dasharray:4 3}
.gvw-edge-hot{stroke:var(--dsw-alias-state-success-primary);stroke-width:2}
.gvw-count{font-size:9px;fill:var(--dsw-alias-label-secondary);font-family:inherit}
.gvw-scrub{display:flex;align-items:center;gap:10px}
.gvw-scrub input[type=range]{flex:1;accent-color:var(--dsw-alias-brand-primary)}
.gvw-stepinfo{white-space:nowrap}
.gvw-err{color:var(--dsw-alias-state-error-primary);white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px}
.gvw-json{max-height:220px;overflow:auto;white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:var(--dsw-alias-label-secondary)}
.gvw-muted{color:var(--dsw-alias-label-secondary)}
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
      // BFS layering from entry.
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
      // Unreachable nodes: one trailing layer, input order.
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

    /** Cubic bezier from the source's right side to the target's left side;
     *  back-edges (target layer not after source) dip below to stay legible. */
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

    /** Fold the settled trace into per-node run stats: { runs, ok, ms, lastStep }. */
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

    // ── the keyed tool view ──────────────────────────────────────────────────

    function GraphToolView(props) {
      const block = props.block;
      const running = !(block && block.kind === "tool-result");
      const errored = !!(block && block.kind === "tool-result" && block.isError);
      const args = parseGraphArgs(block);
      const result = parseGraphResult(block);
      const [step, setStep] = react.useState(0);
      const [open, setOpen] = react.useState(false);
      const h = react.createElement;

      if (!args) {
        // Nothing renderable (malformed args or an argsRaw window cut): the
        // honest fallback is a one-line card, never a broken layout.
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

      const byId = new Map((args.nodes || []).map((n) => [n.id, n]));
      const errText = errored ? firstText(block.content) : (result && result.error) || "";

      // ── SVG pieces
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
          const hot = stepInfo && ((hotNodes.has(e.from) && hotNext.has(e.to)) || (hotNodes.has(e.to) && hotNodes.has(e.from) && false));
          edgeEls.push(h("path", {
            key: "e" + edgeEls.length,
            className: "gvw-edge" + (hot ? " gvw-edge-hot" : ""),
            d: self ? selfLoopPath(a) : edgePath(a, b, back),
            markerEnd: "url(#gvw-arrow" + (hot ? "-hot" : "") + ")",
          }));
        } else {
          // Conditional router edge: a short dashed stub with a route glyph.
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
          (hot ? " gvw-node-hot" : err ? " gvw-node-err" : "");
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
        return h("g", { key: n.id }, children);
      });

      const svg = h("div", { className: "gvw-svgwrap" },
        h("svg", { className: "gvw-svg", viewBox: "0 0 " + layout.width + " " + layout.height, width: layout.width, height: layout.height },
          markerDefs, edgeEls, nodeEls));

      // ── header
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

      // ── dry-run / error readouts
      let notice = null;
      if (errored) {
        notice = h("div", { className: "gvw-err" }, errText || "graph run failed");
      } else if (result && result.endReason === "dry-run") {
        const issues = Array.isArray(result.issues) && result.issues.length > 0
          ? result.issues.map((s, i) => h("div", { key: i }, "• " + s))
          : [h("div", { key: "ok" }, "no issues")];
        notice = h("div", { className: "gvw-json" },
          result.loops ? h("div", { key: "loops" }, result.loops) : null, issues);
      }

      // ── step scrubber (settled, executed)
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

      // ── collapsible state / trace
      let detail = null;
      if (result) {
        const stateJson = result.state !== undefined ? JSON.stringify(result.state, null, 2) : "";
        detail = h("div", null, [
          h("button", { key: "b", className: "gvw-badge", style: { cursor: "pointer", background: "transparent" }, onClick: () => setOpen(!open) },
            open ? "hide state & trace" : "state & trace"),
          open ? h("div", { key: "j", className: "gvw-json" }, stateJson) : null,
        ]);
      }

      return h("div", { className: "gvw-root" }, [head, svg, notice, scrubber, detail]);
    }

    function apply(ctx) {
      const slots = ctx.slots;
      if (slots === undefined) return;
      slots.inject("tool.call.toolview", () => slots.register(
        { name: "tool.call.toolview", key: "graph" },
        GraphToolView,
      ));
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.__test = { parseGraphArgs, parseGraphResult, computeLayout, nodeStats, firstText };
    return module.exports;
  },
});
