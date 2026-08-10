#!/bin/zsh

set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

if [[ "${ALLOW_PRODUCTION_DEPLOY:-}" != "1" ]]; then
  echo "本番デプロイは停止中です。確認済みmainを反映するときだけ ALLOW_PRODUCTION_DEPLOY=1 を指定してください。" >&2
  exit 1
fi

SCRIPT_DIR="${0:A:h}"
SITE_DIR="${SCRIPT_DIR:h}"
WRANGLER_BIN="${WRANGLER_BIN:-/opt/homebrew/bin/wrangler}"
PROJECT_NAME="chikushino-driving-school"

cd "$SITE_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "安全のため停止しました: 未コミット変更があります。" >&2
  exit 1
fi

git fetch origin main --quiet
HEAD_COMMIT="$(git rev-parse HEAD)"
ORIGIN_MAIN_COMMIT="$(git rev-parse origin/main)"
if [[ "$HEAD_COMMIT" != "$ORIGIN_MAIN_COMMIT" ]]; then
  echo "安全のため停止しました: 対象checkoutとorigin/mainが一致していません。" >&2
  exit 1
fi

if [[ "$("$WRANGLER_BIN" --version)" != 4.* ]]; then
  echo "安全のため停止しました: Wrangler 4.x が必要です。" >&2
  exit 1
fi

/opt/homebrew/bin/node tests/recovery-client-fixes-20260810.cjs

"$WRANGLER_BIN" pages deploy "$SITE_DIR" \
  --project-name "$PROJECT_NAME" \
  --branch main \
  --commit-hash "$HEAD_COMMIT" \
  --commit-message "検証済みorigin/mainを安全配備"
