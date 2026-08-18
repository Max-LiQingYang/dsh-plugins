// Node half of the @dsh-plugins/goal-tracker surface plugin.
//
// Pure UI plugin: the empty apply exists so the package can be mounted as a
// row in the host composition (cordis.yml / cordis.patch.yml) and appear in
// the Cordis Loader. The browser half ships via exports["./client"] and is
// discovered through the package.json dsh.client declaration by the web
// app's client-modules scanner.
export function apply() {}
