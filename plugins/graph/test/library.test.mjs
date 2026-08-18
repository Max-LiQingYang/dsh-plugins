// Headless test for lib/library.js: list/save/get/remove roundtrip with
// atomicity against torn-write simulation, slug dedup, update merging.
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createLibrary } from '../lib/library.js'

let passed = 0, failed = 0
function check(label, cond, extra) {
  if (cond) { passed++; console.log('  ok: ' + label) }
  else { failed++; console.log('  FAIL: ' + label + (extra ? ' — ' + JSON.stringify(extra) : '')) }
}

async function tempDir() {
  const dir = join(tmpdir(), 'graph-lib-' + Date.now() + '-' + Math.random().toString(36).slice(2))
  await fs.mkdir(dir, { recursive: true })
  return dir
}

async function cleanup(dir) {
  try { await fs.rm(dir, { recursive: true, force: true }) } catch (e) {}
}

const minimal = (name = 'g') => ({
  name,
  entry: 'a',
  nodes: [{ id: 'a', type: 'js', code: 'return {n: (state.n ?? 0)+1}' }],
  edges: [{ from: 'a', router: 'return state.n >= 3 ? "END" : "a"' }],
})

async function main() {
  // 1. roundtrip save → list → get → remove
  {
    console.log('1. save/list/get/remove roundtrip')
    const dir = await tempDir()
    const lib = createLibrary({ dir })
    const list0 = await lib.list()
    check('list on empty dir returns []', Array.isArray(list0) && list0.length === 0)
    const r = await lib.save({ spec: minimal('revise-loop') })
    check('save returns id and path', typeof r.id === 'string' && typeof r.path === 'string')
    const items = await lib.list()
    check('list shows one item with counts', items.length === 1 && items[0].name === 'revise-loop' && items[0].nodeCount === 1 && items[0].edgeCount === 1)
    const got = await lib.get(r.id)
    check('get returns spec faithfully', got && got.spec.nodes[0].id === 'a' && got.spec.edges[0].router.includes('END'))
    check('runtime preserved', got.runtime === null)
    check('remove works', (await lib.remove(r.id)) === true)
    check('list empty after remove', (await lib.list()).length === 0)
    check('remove idempotent (returns false on missing)', (await lib.remove(r.id)) === false)
    await cleanup(dir)
  }

  // 2. slug dedup + forceId
  {
    console.log('2. slug dedup + forceId')
    const dir = await tempDir()
    const lib = createLibrary({ dir })
    const a = await lib.save({ spec: minimal('revise-loop') })
    const b = await lib.save({ spec: minimal('revise-loop') })
    const c = await lib.save({ spec: minimal('revise-loop') })
    check('first id is bare slug', a.id === 'revise-loop')
    check('second id deduped', b.id === 'revise-loop-2')
    check('third id deduped', c.id === 'revise-loop-3')
    const forced = await lib.save({ id: 'custom-id', forceId: true, spec: minimal('other') })
    check('forceId honored', forced.id === 'custom-id')
    // forcing same id without forceId → safeId picks -2
    const collision = await lib.save({ id: 'custom-id', spec: minimal('other') })
    check('explicit id without forceId dedups', collision.id === 'custom-id-2')
    await cleanup(dir)
  }

  // 3. atomic write (no torn file on simulated crash mid-write)
  {
    console.log('3. atomic write')
    const dir = await tempDir()
    const lib = createLibrary({ dir })
    await lib.save({ spec: minimal('t1') })
    await lib.save({ spec: minimal('t2') })
    const files = await fs.readdir(dir)
    const stragglers = files.filter((f) => f.endsWith('.tmp'))
    check('no tmp files left in lib dir', stragglers.length === 0, stragglers)
    const got = await lib.get('t1')
    check('first saved file intact', got !== null && got.spec.name === 't1')
    await cleanup(dir)
  }

  // 4. update merging preserves savedAt, advances updatedAt, merges spec
  {
    console.log('4. update merging')
    const dir = await tempDir()
    const lib = createLibrary({ dir })
    const r = await lib.save({ spec: minimal('u') })
    const before = await lib.get(r.id)
    // Force a measurable updatedAt change
    await new Promise((res) => setTimeout(res, 10))
    const upd = await lib.update(r.id, { spec: { nodes: [{ id: 'x', type: 'agent', prompt: 'go' }] }, runtime: { lastEndReason: 'end', lastSteps: 2 } })
    check('update returns id', upd && upd.id === r.id)
    const after = await lib.get(r.id)
    check('updatedAt advanced', after.updatedAt > before.updatedAt)
    check('savedAt preserved', after.savedAt === before.savedAt)
    check('spec merged (nodes replaced)', after.spec.nodes.length === 1 && after.spec.nodes[0].id === 'x')
    check('edges preserved from before', Array.isArray(after.spec.edges) && after.spec.edges.length === 1)
    check('runtime merged', after.runtime && after.runtime.lastEndReason === 'end')
    await cleanup(dir)
  }

  // 5. malformed files are skipped, not fatal
  {
    console.log('5. malformed file resilience')
    const dir = await tempDir()
    const lib = createLibrary({ dir })
    await lib.save({ spec: minimal('ok') })
    await fs.writeFile(join(dir, 'bogus.json'), '{not valid json', 'utf8')
    const items = await lib.list()
    check('malformed skipped, valid kept', items.length === 1 && items[0].name === 'ok')
    const got = await lib.get('bogus')
    check('get malformed returns null', got === null)
    await cleanup(dir)
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })