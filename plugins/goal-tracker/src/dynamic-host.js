// @dsh-plugins/goal-tracker — dynamic-plugin HOST half for cordis_define.
//
// Verified live in a DSH session (pluginId gtrack-1, package pkg-14). Paste
// this body into the `code.host` field of the SAME cordis_define call that
// uses src/dynamic-client.js as `code.client`.
//
// Why it exists: the browser-side goal projection only refreshes on
// goal/change (mutation) events, so round admissions never move the
// displayed count. The host half answers a package-private `goal/live` RPC
// with the LIVE GoalView (roundsStarted / phase / revision / activation)
// resolved by session id — the client polls it every 2s.
//
// Requires: the goals and agents services (dsh-base). The host half mounts
// on the root context, where `agents.get(sessionId)` resolves the session's
// agent and `goals.get(agent)` returns the live view.
return {
  apply(ctx) {
    const goals = ctx.get('goals')
    const agents = ctx.get('agents')
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
      } catch (e) {
        return null
      }
    })
  },
}
