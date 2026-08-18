// Dynamic-trial variant of @dsh-plugins/graph's client half.
//
// Paste this file's contents as `code.client` in a cordis_define call and
// pair it with src/dynamic-host.js as `code.host`, then cordis_run — the
// card mounts for the current process only. Functionally identical to
// client.js (keep the two in sync); differences are the wrapper (no
// window.__ModuleLoader__ envelope; this body IS the plugin) and the React
// source (a global in the dynamic evaluator, require("react") in the module
// format). The `host` global exists in the dynamic evaluator, so the live
// strip polls the host aggregator's `graph.live` RPC while a run is in
// flight.
//
// Card contents: layered topology (cycles legible), live agent chips while
// running (node, elapsed, completed output previews), and once settled the
// step scrubber with per-step outputs plus click-a-node output details —
// all from the frozen ToolCallBlock (argsRaw / presentationMeta `meta`) and
// the polled live snapshot.
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
.gvw-graphtab{display:grid;grid-template-columns:240px 1fr;gap:12px;height:100%;overflow-y:auto;padding:12px 16px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:12px;box-sizing:border-box}
.gvw-graphlist{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);padding:8px;display:flex;flex-direction:column;gap:6px;align-self:start}
.gvw-graphrow{padding:6px 8px;border-radius:6px;cursor:pointer;display:flex;flex-direction:column;gap:2px}
.gvw-graphrow:hover{background:var(--dsw-alias-bg-layer-2)}
.gvw-graphrow-sel{background:var(--dsw-alias-bg-layer-2);outline:1px solid var(--dsw-alias-brand-primary)}
.gvw-graphrow-name{font-weight:600;font-size:12px}
.gvw-graphview{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);padding:10px 12px;display:flex;flex-direction:column;gap:8px}
`;
const tagId = "@dsh-plugins/graph(dynamic)";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
  const tag = document.createElement("style");
  tag.dataset.plugin = tagId;
  tag.dataset.pluginCss = tagId;
  tag.textContent = CSS;
  document.head.appendChild(tag);
}

const inject = ["slots"];

function parseGraphArgs(block) {
  const raw = block && block.kind === "tool-result" ? (block.call && block.call.argsRaw) : (block && block.argsRaw);
  if (typeof raw !== "string") return null;
  try {
    const args = JSON.parse(raw);
    if (!args || !Array.isArray(args.nodes) || !Array.isArray(args.edges)) return null;
    return args;
  } catch (e) {
    return null;
  }
}

function parseGraphResult(block) {
  if (!block || block.kind !== "tool-result") return null;
  const meta = block.meta;
  if (meta && typeof meta === "object" && Array.isArray(meta.trace)) return meta;
  return null;
}

function outputOf(result, nodeId) {
  if (!result || typeof result !== "object") return null;
  const outputs = result.nodeOutputs;
  if (!outputs || typeof outputs !== "object") return null;
  return nodeId in outputs ? outputs[nodeId] : null;
}

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
  return { pos, width: PAD * 2 + layerCount * W + (layerCount - 1) * GX, height: PAD * 2 + maxRows * H + (maxRows - 1) * GY, entry };
}

function edgePath(a, b, back) {
  const x1 = a.x + a.w, y1 = a.y + a.h / 2;
  const x2 = b.x, y2 = b.y + b.h / 2;
  if (back) {
    const drop = Math.max(34, Math.abs(y1 - y2) / 2 + 30);
    return "M" + x1 + "," + y1 + " C" + (x1 + 34) + "," + (y1 + drop) + " " + (x2 - 34) + "," + (y2 + drop) + " " + x2 + "," + y2;
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

const END_CLASS = { "end": "gvw-dot-end", "max-steps": "gvw-dot-max-steps", "aborted": "gvw-dot-aborted", "error": "gvw-dot-error", "dry-run": "gvw-dot-dry-run" };

function makeGraphToolView(ctx) {
  return function GraphToolView(props) {
    const block = props.block;
    const running = !(block && block.kind === "tool-result");
    const errored = !!(block && block.kind === "tool-result" && block.isError);
    const args = parseGraphArgs(block);
    const result = parseGraphResult(block);
    const stepState = React.useState(0);
    const step = stepState[0], setStep = stepState[1];
    const openState = React.useState(false);
    const open = openState[0], setOpen = openState[1];
    const selState = React.useState(null);
    const selected = selState[0], setSelected = selState[1];
    const liveState = React.useState(null);
    const live = liveState[0], setLive = liveState[1];
    const h = React.createElement;

    React.useEffect(() => {
      if (!running || !args || typeof args.name !== "string") return undefined;
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
      h("marker", { key: "a", id: "gvw-arrow-dyn", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" },
        h("path", { d: "M0,0 L10,5 L0,10 z", fill: "var(--dsw-alias-label-secondary)" })),
      h("marker", { key: "ah", id: "gvw-arrow-hot-dyn", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" },
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
          markerEnd: "url(#gvw-arrow-dyn" + (hot ? "-hot" : "") + ")",
        }));
      } else {
        edgeEls.push(h("path", { key: "e" + edgeEls.length, className: "gvw-edge gvw-edge-cond", d: "M" + (a.x + a.w) + "," + (a.y + a.h / 2) + " l38,0", markerEnd: "url(#gvw-arrow-dyn)" }));
        edgeEls.push(h("text", { key: "t" + edgeEls.length, className: "gvw-ntype", x: a.x + a.w + 6, y: a.y + a.h / 2 - 6 }, "route"));
      }
    }

    const nodeEls = (args.nodes || []).map((n) => {
      const p = layout.pos.get(n.id);
      const s = stats.get(n.id);
      const hot = hotNodes.has(n.id);
      const err = s && s.errored;
      const cls = "gvw-node gvw-node-" + (n.type === "agent" ? "agent" : "js") + (hot ? " gvw-node-hot" : err ? " gvw-node-err" : "") + (selected === n.id ? " gvw-node-sel" : "");
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
      return h("g", { key: n.id, style: { cursor: "pointer" }, onClick: () => setSelected(selected === n.id ? null : n.id) }, children);
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
      notice = h("div", { className: "gvw-json" }, result.loops ? h("div", { key: "loops" }, result.loops) : null, issues);
    }

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
        h("div", { key: "t", className: "gvw-sub" }, "live · " + liveRun.agents.length + " agent run(s), " + done + " done"),
        chips,
      ]);
    }

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

    let scrubber = null;
    if (result && result.steps > 0 && Array.isArray(result.trace) && result.trace.length > 0) {
      scrubber = h("div", { className: "gvw-scrub" }, [
        h("span", { key: "l", className: "gvw-sub" }, "step"),
        h("input", { key: "r", type: "range", min: 0, max: result.steps, value: scrub, onChange: (ev) => setStep(Number(ev.target.value)) }),
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

/**
 * Render a topology SVG (defs + edges + nodes) into an array of React
 * elements. Shared between the per-call tool card and the Graphs tab
 * viewer so layout/drawing rules stay in lockstep.
 * @param args graph spec
 * @param opts { selected, hotNodes, hotNext, hotSelf, onClick, markerBase, entryRing }
 * @param h React.createElement
 * @returns array of elements
 */
function renderTopology(args, opts, h) {
  const layout = computeLayout(args);
  const markerBase = opts.markerBase || "gvw-arrow";
  const entryRing = opts.entryRing === true;
  const edgeEls = [];
  for (const e of args.edges || []) {
    const a = layout.pos.get(e.from);
    if (!a) continue;
    if (e.to !== undefined) {
      const b = layout.pos.get(e.to);
      if (!b) continue;
      const self = e.to === e.from;
      const back = !self && b.x <= a.x;
      const hot = opts.hotNodes && opts.hotNodes.has(e.from) && ((opts.hotNext && opts.hotNext.has(e.to)) || (self && opts.hotSelf));
      edgeEls.push(h("path", {
        key: "e" + edgeEls.length,
        className: "gvw-edge" + (hot ? " gvw-edge-hot" : ""),
        d: self ? selfLoopPath(a) : edgePath(a, b, back),
        markerEnd: "url(#" + markerBase + (hot ? "-hot" : "") + ")",
      }));
    } else {
      edgeEls.push(h("path", { key: "e" + edgeEls.length, className: "gvw-edge gvw-edge-cond", d: "M" + (a.x + a.w) + "," + (a.y + a.h / 2) + " l38,0", markerEnd: "url(#" + markerBase + ")" }));
      edgeEls.push(h("text", { key: "t" + edgeEls.length, className: "gvw-ntype", x: a.x + a.w + 6, y: a.y + a.h / 2 - 6 }, "route"));
    }
  }
  const nodeEls = (args.nodes || []).map((n) => {
    const p = layout.pos.get(n.id);
    const hot = opts.hotNodes && opts.hotNodes.has(n.id);
    const err = opts.erroredIds && opts.erroredIds.has(n.id);
    const cls = "gvw-node gvw-node-" + (n.type === "agent" ? "agent" : "js") + (hot ? " gvw-node-hot" : err ? " gvw-node-err" : "") + (opts.selected === n.id ? " gvw-node-sel" : "");
    const children = [
      h("rect", { key: "r", className: cls, x: p.x, y: p.y, width: p.w, height: p.h, rx: 8 }),
      h("text", { key: "l", className: "gvw-nlabel", x: p.x + p.w / 2, y: p.y + 18, textAnchor: "middle" }, n.id),
      h("text", { key: "t", className: "gvw-ntype", x: p.x + p.w / 2, y: p.y + 32, textAnchor: "middle" },
        (n.type === "agent" ? "◆ agent" : "◇ js") + (n.id === layout.entry ? " · entry" : "")),
    ];
    if (opts.runCounts && opts.runCounts.get && opts.runCounts.get(n.id)) {
      const s = opts.runCounts.get(n.id);
      children.push(h("text", { key: "c", className: "gvw-count", x: p.x + p.w - 4, y: p.y + 10, textAnchor: "end" },
        "×" + s.runs + (s.ms ? " " + (s.ms < 1000 ? s.ms + "ms" : (s.ms / 1000).toFixed(1) + "s") : "")));
    }
    return h("g", {
      key: n.id,
      style: { cursor: "pointer" },
      onClick: opts.onClick ? () => opts.onClick(n.id) : undefined,
    }, children);
  });
  const defs = h("defs", null,
    h("marker", { key: "a", id: markerBase, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" },
      h("path", { d: "M0,0 L10,5 L0,10 z", fill: "var(--dsw-alias-label-secondary)" })),
    h("marker", { key: "ah", id: markerBase + "-hot", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" },
      h("path", { d: "M0,0 L10,5 L0,10 z", fill: "var(--dsw-alias-state-success-primary)" })));
  return { defs, edgeEls, nodeEls, layout };
}

/**
 * Conversation-view tab: browse all graphs (live + saved), enter one to
 * inspect its topology and per-node info, and (for live runs) open the
 * child agent's session via sessions.openSubagent. Edit operations (drag,
 * connect, create, persist edits) are deferred to a future round; this
 * round ships the read-only viewer + persistent library.
 */
function makeGraphsView(ctx) {
  return function GraphsView() {
    const liveState = React.useState(null);
    const live = liveState[0], setLive = liveState[1];
    const savedState = React.useState([]);
    const saved = savedState[0], setSaved = savedState[1];
    const selState = React.useState(null);
    const selected = selState[0], setSelected = selState[1];
    const nodeSelState = React.useState(null);
    const nodeSelected = nodeSelState[0], setNodeSelected = nodeSelState[1];
    const cacheState = React.useState({});
    const savedCache = cacheState[0], setSavedCache = cacheState[1];
    const h = React.createElement;

    // Saved-graph fetch — unconditional hook, keyed by selected key.
    const selKey = selected;
    React.useEffect(() => {
      if (selKey === null || typeof selKey !== "string" || selKey.indexOf("saved@") !== 0) return undefined;
      const id = selKey.slice("saved@".length);
      let cancelled = false;
      host.call("graphLibrary.get", { id: id }).then(function (v) {
        if (cancelled || !v) return;
        setSavedCache(function (prev) { var next = Object.assign({}, prev); next[id] = v; return next; });
      }).catch(function () {});
      return function () { cancelled = true; };
    }, [selKey]);

    // Live + saved list polling.
    React.useEffect(() => {
      const timer = ctx && typeof ctx.get === "function" ? ctx.get("timer") : undefined;
      const refresh = () => {
        try {
          host.call("graph.live").then(function (v) {
            if (v && typeof v === "object" && Array.isArray(v.runs)) setLive(v);
          }).catch(function () {});
          host.call("graphLibrary.list").then(function (v) {
            if (Array.isArray(v)) setSaved(v);
          }).catch(function () {});
        } catch (e) { /* ignore */ }
      };
      refresh();
      if (!timer) return undefined;
      return timer.interval(refresh, 2500);
    }, []);

    const liveRuns = live && Array.isArray(live.runs) ? live.runs : [];
    const liveByKey = {};
    for (const r of liveRuns) {
      liveByKey[(r.name || "?") + "@" + (r.parentSession || "?")] = r;
    }

    const allKeys = [];
    const seen = new Set();
    for (const r of liveRuns) {
      const k = (r.name || "?") + "@" + (r.parentSession || "?");
      if (!seen.has(k)) { allKeys.push({ kind: "live", key: k, ref: r }); seen.add(k); }
    }
    for (const s of saved) {
      const k = "saved@" + s.id;
      if (!seen.has(k)) { allKeys.push({ kind: "saved", key: k, ref: s }); seen.add(k); }
    }

    function pickSelection() {
      if (selected === null || selected === undefined) return null;
      for (let i = 0; i < allKeys.length; i += 1) if (allKeys[i].key === selected) return allKeys[i];
      return null;
    }
    const sel = pickSelection();
    const selSpec = sel && sel.kind === "live" ? (sel.ref && sel.ref.spec) : null;
    const selLive = sel && sel.kind === "live" ? sel.ref : null;
    const selSaved = sel && sel.kind === "saved" ? sel.ref : null;
    const selSavedFull = selSaved && selSaved.id && savedCache[selSaved.id] ? savedCache[selSaved.id] : null;

    const liveAgents = selLive && Array.isArray(selLive.agents) ? selLive.agents : [];
    const agentByNode = new Map();
    for (const a of liveAgents) agentByNode.set(a.node, a);
    const erroredIds = new Set();
    for (const a of liveAgents) if (a.status === "failed") erroredIds.add(a.node);

    function openAgent(agent) {
      if (!agent || !agent.childId || !selLive || !selLive.parentSession) return;
      const sessions = ctx && typeof ctx.get === "function" ? ctx.get("sessions") : null;
      if (!sessions || typeof sessions.openSubagent !== "function") return;
      sessions.openSubagent({
        parentSessionId: selLive.parentSession,
        childSessionId: agent.childId,
        mode: "one-shot",
      });
    }

    // Render
    const listChildren = allKeys.map(function (item) {
      const isSel = selected === item.key;
      const meta = item.kind === "live" ? item.ref : item.ref;
      const name = item.kind === "live" ? item.ref.name : item.ref.name;
      const sub = item.kind === "live"
        ? (item.ref.endedAt === null ? "running" : "ended · " + (item.ref.endReason || "?"))
        : (item.ref.nodeCount + " nodes · " + item.ref.edgeCount + " edges · saved " + (item.ref.savedAt || "").slice(0, 19));
      const cls = "gvw-graphrow" + (isSel ? " gvw-graphrow-sel" : "");
      return h("div", { key: item.key, className: cls, onClick: function () { setSelected(item.key); setNodeSelected(null); } }, [
        h("div", { key: "n", className: "gvw-graphrow-name" }, (item.kind === "saved" ? "� " : "● ") + (name || "graph")),
        h("div", { key: "s", className: "gvw-sub" }, sub),
      ]);
    });

    const listPanel = h("div", { className: "gvw-graphlist" }, [
      h("div", { key: "t", className: "gvw-head" }, [
        h("span", { key: "title", className: "gvw-name" }, "graphs"),
        h("span", { key: "r", className: "gvw-badge" }, liveRuns.length + " live"),
        h("span", { key: "s", className: "gvw-badge" }, saved.length + " saved"),
      ]),
      listChildren.length === 0
        ? h("div", { key: "e", className: "gvw-muted" }, "no graphs yet. call the graph tool with persist: true to save one.")
        : h("div", { key: "l" }, listChildren),
    ]);

    let viewer = null;
    const viewSpec = selSpec || (selSavedFull && selSavedFull.spec);
    if (sel && viewSpec && Array.isArray(viewSpec.nodes) && Array.isArray(viewSpec.edges)) {
      const top = renderTopology(viewSpec, {
        selected: nodeSelected,
        hotNodes: null,
        hotNext: null,
        hotSelf: false,
        markerBase: "gvw-arrow-tab",
        onClick: function (id) { setNodeSelected(nodeSelected === id ? null : id); },
        erroredIds: erroredIds.size > 0 ? erroredIds : null,
      }, h);
      const svg = h("div", { className: "gvw-svgwrap" },
        h("svg", { className: "gvw-svg", viewBox: "0 0 " + top.layout.width + " " + top.layout.height, width: top.layout.width, height: top.layout.height },
          top.defs, top.edgeEls, top.nodeEls));

      let nodeInfo = null;
      if (nodeSelected) {
        const node = viewSpec.nodes.find(function (n) { return n.id === nodeSelected; });
        const agent = agentByNode.get(nodeSelected);
        if (node) {
          const lines = [];
          if (node.type) lines.push(node.type + (node.id === viewSpec.entry ? " · entry" : ""));
          if (node.writeTo) lines.push("writes → " + node.writeTo);
          if (node.description) lines.push(node.description);
          if (agent) {
            const el = agent.status === "running" ? "running" : (agent.ms ? (agent.ms < 1000 ? agent.ms + "ms" : (agent.ms / 1000).toFixed(1) + "s") : "?");
            lines.push("agent: " + agent.status + " · " + el);
          }
          const body = h("div", null, [
            node.prompt
              ? h("pre", { key: "p", className: "gvw-json" }, String(node.prompt).slice(0, 1200))
              : null,
            node.code
              ? h("pre", { key: "c", className: "gvw-json" }, String(node.code).slice(0, 1200))
              : null,
            node.outputSchema
              ? h("pre", { key: "o", className: "gvw-json" }, prettyOutput(node.outputSchema))
              : null,
            agent && agent.preview
              ? h("pre", { key: "pr", className: "gvw-json" }, (agent.preview.kind === "structured" ? prettyOutput(agent.preview.value) : agent.preview.value).slice(0, 1200))
              : (!node.prompt && !node.code && !agent ? h("span", { key: "none", className: "gvw-muted" }, "no prompt/code/output yet") : null),
          ]);
          nodeInfo = h("div", { className: "gvw-sel" }, [
            h("div", { key: "h", className: "gvw-head" },
              h("span", { key: "n", className: "gvw-name" }, nodeSelected),
              h("span", { key: "s", className: "gvw-sub" }, lines.join(" · "))),
            body,
            agent && agent.childId && selLive && selLive.parentSession
              ? h("button", { key: "open", className: "gvw-badge", style: { cursor: "pointer", marginTop: "6px" }, onClick: function () { openAgent(agent); } }, "open agent session")
              : null,
          ]);
        }
      }

      viewer = h("div", { className: "gvw-graphview" }, [
        h("div", { key: "h", className: "gvw-head" }, [
          h("span", { key: "n", className: "gvw-name" }, (sel.kind === "live" ? "live · " : "saved · ") + (viewSpec.name || "graph")),
          h("span", { key: "m", className: "gvw-sub" }, (viewSpec.nodes || []).length + " nodes · " + (viewSpec.edges || []).length + " edges · entry " + viewSpec.entry),
        ]),
        svg,
        nodeInfo,
        h("div", { key: "edit", className: "gvw-muted" }, "editing (drag / connect / create) lands in a future round."),
      ]);
    }

    return h("div", { className: "gvw-graphtab" }, [listPanel, viewer]);
  };
}

return {
  inject: inject,
  apply(ctx) {
    const slots = ctx.slots;
    if (slots === undefined) return;
    slots.inject("tool.call.toolview", () => slots.register(
      { name: "tool.call.toolview", key: "graph" },
      makeGraphToolView(ctx),
    ));
    slots.inject("conversation.view", () => slots.register(
      { name: "conversation.view", id: "graphs", order: 20, label: "Graphs" },
      makeGraphsView(ctx),
    ));
  },
}
