// Node half of the @dsh-plugins/workflow-visualizer surface plugin.
//
// Pure client plugin: the empty apply exists so the package can be mounted as
// a row in the host composition (cordis.yml / cordis.patch.yml) and appear in
// the Cordis Loader. The browser half ships via exports["./client"] and is
// discovered through the package.json dsh.client declaration by the web
// app's client-modules scanner.
//
// No host-side aggregation is needed for the installable form: the workflow
// engine already appends durable `tool-workflow/*` session events, and the
// shipped conversation machinery folds them into `workflow-run` chat nodes —
// the client half reads that fold directly. (The dynamic variant in
// src/dynamic-host.js additionally aggregates the in-memory `workflow/*`
// Cordis events for elapsed-time and script-log enrichment.)
export function apply() {}
