// @dsh-plugins/goal-tracker — dynamic-plugin HOST half for cordis_define.
//
// Auto-generated twin of the verified host half from pkg-21 (gtrack-1). Paste
// into the `code.host` field of a cordis_define call alongside the matching
// src/dynamic-client.js.
//
// RPCs:
//   goal/live(sessionId)       -> live GoalView snapshot (current goal dock)
//   goal/sessions({maxN?})     -> recent sessions for the cross-session
//                                  dropdown (id + title + createdAt)
//   goal/history(args)          -> grouped goal/change history; args accepts
//                                  either { sessionId } (single) or { sessionIds[] }
//                                  (multi); multi aggregates goals from every
//                                  listed session.

return {
  apply(ctx) {
    const goals = ctx.get('goals')
    const agents = ctx.get('agents')
    const sessionQuery = ctx.get('sessionQuery')
    if (goals === undefined || agents === undefined) return

    harness.handle('goal/live', async (args) => {
      try {
        const sessionId = args && typeof args === 'object' ? args.sessionId : null
        if (typeof sessionId !== 'string' || sessionId === '') return null
        const agent = agents.get(sessionId)
        if (agent === undefined) return null
        const view = goals.get(agent)
        if (view === undefined || view === null) return null
        return {
          roundsStarted: typeof view.roundsStarted === 'number' ? view.roundsStarted : 0,
          phase: typeof view.phase === 'string' ? view.phase : null,
          revision: typeof view.revision === 'number' ? view.revision : 0,
          activation: typeof view.activation === 'string' ? view.activation : null,
          maxGoalRounds: typeof view.maxGoalRounds === 'number' ? view.maxGoalRounds : 0,
        }
      } catch (e) { return null }
    })

    if (sessionQuery !== undefined) {
      // Recent session list for the cross-session dropdown. Reads at most
      // maxN session titles (default 20, cap 50). Tolerant of failures.
      harness.handle('goal/sessions', async (args) => {
        try {
          const requested = args && typeof args.maxN === 'number' ? args.maxN : 0
          const maxN = requested > 0 && requested <= 50 ? requested : 20
          const sessionList = await sessionQuery.listSessions()
          const recent = Array.isArray(sessionList) ? sessionList.slice(0, maxN) : []
          const ids = []
          for (const s of recent) if (s && typeof s.id === 'string') ids.push(s.id)
          let titles = []
          if (ids.length > 0) {
            try { titles = await sessionQuery.readTitleSnapshots(ids) } catch (e) { titles = [] }
          }
          const titleMap = new Map()
          for (const r of titles) {
            if (r && r.status === 'fulfilled' && r.value && typeof r.value.session === 'object') {
              titleMap.set(r.value.session.id, typeof r.value.title === 'string' ? r.value.title : '')
            }
          }
          const out = []
          for (const s of recent) {
            if (!s || typeof s.id !== 'string') continue
            out.push({
              id: s.id,
              title: titleMap.get(s.id) || '',
              createdAt: typeof s.createdAt === 'number' ? s.createdAt : null,
            })
          }
          return { ok: true, sessions: out }
        } catch (e) { return { ok: false, message: e && e.message ? e.message : 'sessions error' } }
      })

      // Group goals from one or many sessions. args: { sessionId } | { sessionIds[] }
      const extractAssistantText = (ev) => {
        const msg = ev && ev.data && ev.data.message
        const c = msg && msg.content
        if (!Array.isArray(c)) return ''
        let out = ''
        for (const b of c) {
          if (!b) continue
          if (typeof b === 'string') { out += b; continue }
          if (b.type === 'text' && typeof b.text === 'string') { out += b.text; continue }
          if (typeof b.text === 'string') { out += b.text }
        }
        return out
      }

      harness.handle('goal/history', async (args) => {
        try {
          let sessionIds = []
          if (args && Array.isArray(args.sessionIds) && args.sessionIds.length > 0) {
            for (const x of args.sessionIds) if (typeof x === 'string' && x) sessionIds.push(x)
          } else if (args && typeof args.sessionId === 'string' && args.sessionId) {
            sessionIds = [args.sessionId]
          }
          if (sessionIds.length === 0) return { ok: false, message: 'sessionId or sessionIds required' }
          const goalsOut = []
          for (const sid of sessionIds) {
            try {
              const loaded = await sessionQuery.readSession(sid)
              const events = loaded && Array.isArray(loaded.events) ? loaded.events : []
              const groups = new Map()
              for (const e of events) {
                if (!e || e.type !== 'goal/change') continue
                const d = e.data || {}
                const g = d.goal
                if (!g || typeof g.id !== 'string') continue
                let grp = groups.get(g.id)
                if (!grp) { grp = { id: g.id, events: [] }; groups.set(g.id, grp) }
                grp.events.push({
                  seq: e.seq,
                  time: e.time,
                  operation: typeof d.operation === 'string' ? d.operation : null,
                  goal: g,
                  roundsStarted: typeof d.roundsStarted === 'number' ? d.roundsStarted : null,
                })
              }
              for (const grp of groups.values()) {
                grp.events.sort((a, b) => a.seq - b.seq)
                const first = grp.events[0]
                const last = grp.events[grp.events.length - 1]
                const lastGoal = last.goal
                const rec = {
                  sessionId: sid,
                  id: grp.id,
                  objective: typeof lastGoal.objective === 'string' ? lastGoal.objective : '',
                  phase: typeof lastGoal.phase === 'string' ? lastGoal.phase : null,
                  roundsStarted: typeof last.roundsStarted === 'number' ? last.roundsStarted : 0,
                  maxGoalRounds: typeof lastGoal.maxGoalRounds === 'number' ? lastGoal.maxGoalRounds : 0,
                  revision: typeof lastGoal.revision === 'number' ? lastGoal.revision : 0,
                  blockedReason: lastGoal.blockedReason || null,
                  activation: typeof lastGoal.activation === 'string' ? lastGoal.activation : null,
                  createdAt: first.time,
                  updatedAt: last.time,
                  revisions: grp.events.map((ev) => ({
                    seq: ev.seq,
                    time: ev.time,
                    operation: ev.operation,
                    revision: ev.goal.revision,
                  })),
                }
                if (rec.phase === 'complete') {
                  let lastAst = null
                  for (let i = events.length - 1; i >= 0; i--) {
                    const ev = events[i]
                    if (!ev || ev.type !== 'assistant/message') continue
                    if (typeof ev.time === 'number' && ev.time >= last.time) { lastAst = ev; break }
                    if (typeof ev.time === 'number' && ev.time < last.time) break
                  }
                  if (lastAst) rec.runResult = { seq: lastAst.seq, time: lastAst.time, text: extractAssistantText(lastAst) }
                }
                goalsOut.push(rec)
              }
            } catch (e) { /* skip unreadable sessions */ }
          }
          goalsOut.sort((a, b) => b.createdAt - a.createdAt)
          return { ok: true, goals: goalsOut }
        } catch (e) { return { ok: false, message: e && e.message ? e.message : 'history error' } }
      })
    }
  },
}
