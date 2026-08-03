#!/bin/zsh

set -u

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$ROOT_DIR/.mote.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "Mote 当前没有运行。"
  exit 0
fi

MOTE_PID="$(<"$PID_FILE")"
if [[ "$MOTE_PID" == <-> ]] && /bin/kill -0 "$MOTE_PID" 2>/dev/null; then
  /bin/kill "$MOTE_PID"
  echo "Mote 已停止。"
else
  echo "Mote 当前没有运行。"
fi

/bin/rm -f "$PID_FILE"
