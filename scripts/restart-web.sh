#!/usr/bin/env bash
#
# restart-web.sh — one-command restart for `dsh web`.
#
# Why: composition patches (cordis.patch.yml) only take effect at process
# start, and `dsh web` usually runs in a foreground terminal. This helper
# kills the running instance, waits for the port to free up, and relaunches
# the server detached (nohup) so you don't need to keep a terminal attached.
#
# Usage:
#   bash restart-web.sh [port]        # default port 3080
#
# Notes:
# - Finds the dsh web process by matching its command line, not by PID, so
#   it works across restarts.
# - Logs go to /tmp/dsh-web-restart.log (also printed on failure).
# - The web profile is taken from `dsh --profile web`; override with
#   DSH_PROFILE env if your profile differs.
set -euo pipefail

PORT="${1:-3080}"
PROFILE="${DSH_PROFILE:-web}"
BIN="$(command -v dsh || echo "$HOME/.npm/_npx/1e7f6d9597241db0/node_modules/.bin/dsh")"
LOG="/tmp/dsh-web-restart.log"

echo "== dsh web restart helper (port ${PORT}, profile ${PROFILE}) =="

# 1) Find and stop the running instance (match the launcher, ignore self).
PIDS="$(pgrep -f "\.bin/dsh web" || true)"
if [ -n "$PIDS" ]; then
  echo "stopping: $(echo $PIDS | tr '\n' ' ')"
  # SIGINT first (graceful), then SIGKILL after a short grace period.
  kill -INT $PIDS 2>/dev/null || true
  sleep 2
  PIDS="$(pgrep -f "\.bin/dsh web" || true)"
  if [ -n "$PIDS" ]; then
    echo "still alive, sending SIGKILL: $(echo $PIDS | tr '\n' ' ')"
    kill -KILL $PIDS 2>/dev/null || true
  fi
else
  echo "no running dsh web found (nothing to stop)"
fi

# 2) Wait for the port to free up.
for i in $(seq 1 20); do
  if ! lsof -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done
if lsof -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "ERROR: port ${PORT} still in use; refusing to start a second instance." >&2
  exit 1
fi

# 3) Relaunch detached.
echo "starting detached: ${BIN} --profile ${PROFILE} > ${LOG} 2>&1 &"
nohup "$BIN" --profile "$PROFILE" >"$LOG" 2>&1 &
echo "started pid $! — log: ${LOG}"
echo "waiting for http://127.0.0.1:${PORT} ..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null --max-time 2 "http://127.0.0.1:${PORT}"; then
    echo "OK: http://127.0.0.1:${PORT} is up."
    exit 0
  fi
  sleep 1
done
echo "WARNING: server not responding after 30s — check ${LOG}" >&2
exit 1
