# Changelog

All notable changes to `@dsh-plugins/graph` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres
to [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-08-18

### Added
- **Interactive graph editor** in the Graphs tab (saved graphs only):
  - Drag nodes around the canvas.
  - Drag from a port circle on a node to another port to create an edge.
  - Toolbar: `+ agent`, `+ js`, `reset layout`.
  - Click a node → details panel (prompt, code, output schema, live preview).
  - Click an edge → edit panel (toggle static ↔ router, target dropdown, router code textarea, delete).
  - Keyboard `Delete` / `Backspace` removes the current selection (guarded against text inputs).
  - "Save changes" persists the working copy back to the library via `graphLibrary.update`.
- **Persistent graph library** (`lib/library.js`):
  - FS-backed JSON store at `$DSH_HOME/graphs/` or `~/.dsh/graphs/`.
  - Atomic writes (`.tmp` + rename), slug de-duplication, broken-file resilience.
  - New `persist: true` parameter on the `graph` tool saves the spec after a real run.
  - Host registers a `graphLibrary` Cordis Service with `list` / `get` / `save` / `update` / `remove`.
  - Dynamic host exposes `graphLibrary.list` / `.get` / `.count` / `.update` RPCs.
- **Pure editing primitives** (`lib/editor.js`): `applyEdit(spec, edit)` plus
  `defaultNodePosition` — fully testable headlessly.
- **Graphs conversation-view tab** (`src/dynamic-client.js`):
  - Two-pane layout: live + saved list on the left, viewer on the right.
  - Live runs: streaming agent chips (running / done / failed with elapsed + output preview).
  - Saved runs: read-only by default, editable on click.
  - "Open agent session" deep link via `sessions.openSubagent({parentSessionId, childSessionId, mode: 'one-shot'})` for live runs.
- **Presentation metadata projection** (`output: { presentationMeta }`):
  - The host now projects `nodeOutputs` (per-node final outputs, capped at ~4 KB each) so the card can render full agent results without re-parsing render text.
- **Step-replay scrubber** in the tool card: replays each super-step with the
  traversed edge highlighted — cycles visibly walk backwards.

### Changed
- The host tool now emits a richer set of Cordis events on the `graph/*` bus:
  `graph/run-start` (with the full `spec`), `graph/node-start`, `graph/node-end`
  (with capped output previews), `graph/run-end`, and `graph/saved`.
- `renderTopology` accepts an optional `positions` override and `edgeDraft`,
  enabling drag-to-move and in-progress edge drawing in the editor.
- The CSS for the tool card and editor is grouped into theme-token classes
  (`--dsw-alias-*`, `--dsh-composer-*`) and uses CSS custom properties only —
  no inline colors.

### Tests
- 110 headless assertions across five suites:
  - `engine.test.mjs` — 24 (cycles, routing, fan-out, maxSteps, abort).
  - `client.test.mjs` — 27 (card helpers: parse / layout / fold / outputs / live-pick).
  - `dynamic-host.test.mjs` — 10 (live aggregator fold: events → `graph.live` snapshot, spec carried).
  - `library.test.mjs` — 23 (FS library save / list / get / remove / atomicity / dedup / update).
  - `editor.test.mjs` — 26 (pure graph-edit operations).
- Run them all with `npm test` or individually with `node test/<suite>.test.mjs`.

### Compatibility
- Node ≥ 18, React ^18.2.0 (peer dependency for the client module).
- DSH runtime ≥ 0.1.0-rc.7.

## [0.2.0] — earlier

Initial graph engine + tool card + toolcard live aggregator. Superseded by 1.0.0.

## [0.1.0] — earlier

Skeleton package — engine, tool registration, tool card prototype.
