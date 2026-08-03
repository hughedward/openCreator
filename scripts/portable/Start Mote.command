#!/bin/zsh

set -u

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$ROOT_DIR/app"
PORT="${MOTE_PORT:-3000}"
PID_FILE="$ROOT_DIR/.mote.pid"
LOG_FILE="$ROOT_DIR/mote.log"
URL="http://127.0.0.1:$PORT"

if [[ -f "$PID_FILE" ]]; then
  MOTE_PID="$(<"$PID_FILE")"
  if [[ "$MOTE_PID" == <-> ]] && /bin/kill -0 "$MOTE_PID" 2>/dev/null; then
    /usr/bin/open "$URL"
    exit 0
  fi
  /bin/rm -f "$PID_FILE"
fi

echo "正在启动 Mote…"
cd "$APP_DIR" || exit 1
MOTE_STORAGE_ROOT="$ROOT_DIR" HOSTNAME="127.0.0.1" PORT="$PORT" \
  /usr/bin/nohup "$ROOT_DIR/runtime/node" server.js >>"$LOG_FILE" 2>&1 &
MOTE_PID=$!
echo "$MOTE_PID" >"$PID_FILE"

for attempt in {1..60}; do
  if /usr/bin/curl --silent --fail --max-time 1 "$URL" >/dev/null 2>&1; then
    echo "Mote 已启动：$URL"
    /usr/bin/open "$URL"
    exit 0
  fi
  if ! /bin/kill -0 "$MOTE_PID" 2>/dev/null; then
    break
  fi
  /bin/sleep 0.5
done

echo "Mote 启动失败，请查看：$LOG_FILE"
/bin/rm -f "$PID_FILE"
echo "按回车键关闭窗口。"
read -r
exit 1
