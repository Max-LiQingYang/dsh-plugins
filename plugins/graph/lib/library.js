/**
 * FS-backed JSON store for saved graph definitions.
 *
 * Pure module: no Cordis dependency, no imports. Instantiated by the host
 * tool plugin with a directory path (defaults to `$DSH_HOME/graphs/` or
 * `~/.dsh/graphs/`); exposed as the `graphLibrary` Cordis Service to other
 * host plugins (and, via package-private RPC bridges, to the browser).
 *
 * Wire format per file `<id>.json`:
 *
 *   {
   id, name, savedAt, updatedAt, spec: { nodes, edges, entry, ... },
 *   runtime: { lastEndReason?, lastSteps?, lastRunAt? }
 * }
 *
 * Writes go to `<id>.json.tmp` then renamed atomically, so a crash mid-write
 * never leaves a torn file visible to a subsequent `list()`.
 */

import { promises as fs, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir as osTmpdir } from 'node:os'

const MANIFEST_VERSION = 'graph-library@1'

function defaultDir() {
  const home = process.env.DSH_HOME || ''
  if (home !== '') return resolve(home, 'graphs')
  // Fallback: best-effort home dir resolution (avoids ESM-only import here).
  return resolve(process.env.HOME || process.env.USERPROFILE || '.', '.dsh', 'graphs')
}

function slugify(name) {
  const base = typeof name === 'string' ? name.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') : ''
  return (base === '' ? 'graph' : base).slice(0, 64)
}

function nowIso() {
  return new Date().toISOString()
}

function safeId(candidate, exists) {
  let id = candidate
  let n = 1
  while (exists(id)) {
    n += 1
    id = candidate + '-' + n
  }
  return id
}

/**
 * Create a library bound to `dir (string)`. Returns {list, get, save, remove, dir}.
 * `dir` is created on demand.
 */
export function createLibrary(opts) {
  const dir = resolve(opts && opts.dir ? opts.dir : defaultDir())

  async function ensureDir() {
    await fs.mkdir(dir, { recursive: true })
  }

  async function readOne(file) {
    try {
      const text = await fs.readFile(join(dir, file), 'utf8')
      const data = JSON.parse(text)
      if (!data || typeof data !== 'object' || typeof data.id !== 'string') return null
      return data
    } catch (e) {
      return null
    }
  }

  async function listRaw() {
    await ensureDir()
    let files
    try {
      files = await fs.readdir(dir)
    } catch (e) {
      return []
    }
    const out = []
    for (const file of files) {
      if (!file.endsWith('.json') || file.endsWith('.tmp')) continue
      const data = await readOne(file)
      if (data === null) continue
      out.push(data)
    }
    // newest first by updatedAt, falling back to savedAt, then by id
    out.sort((a, b) => {
      const ak = a.updatedAt || a.savedAt || ''
      const bk = b.updatedAt || b.savedAt || ''
      if (ak !== bk) return ak < bk ? 1 : -1
      return (a.id || '') < (b.id || '') ? 1 : -1
    })
    return out
  }

  function existsId(id) {
    return existsSync(join(dir, id + '.json'))
  }

  return {
    dir,
    version: MANIFEST_VERSION,
    async list() {
      const items = await listRaw()
      return items.map((d) => ({
        id: d.id,
        name: d.name,
        savedAt: d.savedAt,
        updatedAt: d.updatedAt,
        nodeCount: Array.isArray(d.spec && d.spec.nodes) ? d.spec.nodes.length : 0,
        edgeCount: Array.isArray(d.spec && d.spec.edges) ? d.spec.edges.length : 0,
        runtime: d.runtime || null,
      }))
    },
    async get(id) {
      if (typeof id !== 'string' || id === '') return null
      const data = await readOne(id + '.json')
      return data === null ? null : {
        id: data.id,
        name: data.name,
        savedAt: data.savedAt,
        updatedAt: data.updatedAt,
        spec: data.spec,
        runtime: data.runtime || null,
      }
    },
    async save(opts) {
      await ensureDir()
      if (!opts || typeof opts !== 'object') throw new Error('library.save: opts required')
      const spec = opts.spec
      if (!spec || !Array.isArray(spec.nodes) || !Array.isArray(spec.edges)) throw new Error('library.save: spec must contain nodes[] and edges[]')
      const requestedName = typeof spec.name === 'string' && spec.name !== '' ? spec.name : 'graph'
      const slug = slugify(requestedName)
      const candidate = typeof opts.id === 'string' && opts.id !== '' ? opts.id : slug
      const id = opts.forceId === true ? candidate : safeId(candidate, existsId)
      const now = nowIso()
      const record = {
        version: MANIFEST_VERSION,
        id,
        name: requestedName,
        savedAt: now,
        updatedAt: now,
        spec: {
          name: requestedName,
          entry: spec.entry,
          nodes: spec.nodes,
          edges: spec.edges,
          maxSteps: spec.maxSteps,
        },
        runtime: opts.runtime && typeof opts.runtime === 'object' ? opts.runtime : null,
      }
      const finalPath = join(dir, id + '.json')
      const tmpPath = join(osTmpdir(), id + '.json.' + process.pid + '.' + Date.now() + '.tmp')
      await fs.writeFile(tmpPath, JSON.stringify(record, null, 2), 'utf8')
      await fs.rename(tmpPath, finalPath)
      return { id, name: requestedName, savedAt: now, updatedAt: now, path: finalPath }
    },
    async update(id, patch) {
      if (typeof id !== 'string' || id === '') throw new Error('library.update: id required')
      const current = await readOne(id + '.json')
      if (current === null) return null
      const merged = { ...current }
      if (patch && typeof patch === 'object') {
        if (typeof patch.name === 'string') merged.name = patch.name
        if (patch.spec && typeof patch.spec === 'object') merged.spec = { ...current.spec, ...patch.spec }
        if (patch.runtime && typeof patch.runtime === 'object') merged.runtime = { ...(current.runtime || {}), ...patch.runtime }
      }
      merged.updatedAt = nowIso()
      const finalPath = join(dir, id + '.json')
      const tmpPath = join(osTmpdir(), id + '.json.' + process.pid + '.' + Date.now() + '.tmp')
      await fs.writeFile(tmpPath, JSON.stringify(merged, null, 2), 'utf8')
      await fs.rename(tmpPath, finalPath)
      return { id, name: merged.name, savedAt: merged.savedAt, updatedAt: merged.updatedAt, path: finalPath }
    },
    async remove(id) {
      if (typeof id !== 'string' || id === '') return false
      try {
        await fs.unlink(join(dir, id + '.json'))
        return true
      } catch (e) {
        return false
      }
    },
  }
}