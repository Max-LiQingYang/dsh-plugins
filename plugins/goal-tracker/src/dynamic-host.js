// @dsh-plugins/goal-tracker — dynamic-plugin HOST half for cordis_define.
//
// Auto-generated twin of the verified host half from pkg-19 (gtrack-1). Paste
// into the `code.host` field of a cordis_define call alongside the matching
// src/dynamic-client.js.
//
// Provides two package-private RPCs to the client half:
//   goal/live(sessionId)   -> live GoalView snapshot for the tracker dock
//   goal/history(sessionId) -> grouped goal/change history (for the Goals tab)
//
// All unicode characters in client-facing strings use \uXXXX escapes to
// survive serialization round-trips without substitution.
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
      harness.handle('goal/history', async (args) => {
        try {
          const sessionId = args && typeof args === 'object' ? args.sessionId : null
          if (typeof sessionId !== 'string' || sessionId === '') return { ok: false, message: 'invalid sessionId' }
          const loaded = await sessionQuery.readSession(sessionId)
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
          const goals2 = []
          for (const grp of groups.values()) {
            grp.events.sort((a, b) => a.seq - b.seq)
            const first = grp.events[0]
            const last = grp.events[grp.events.length - 1]
            const lastGoal = last.goal
            const rec = {
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
            goals2.push(rec)
          }
          goals2.sort((a, b) => b.createdAt - a.createdAt)
          return { ok: true, goals: goals2 }
        } catch (e) { return { ok: false, message: e && e.message ? e.message : 'history error' } }
      })
    }
  },
}
