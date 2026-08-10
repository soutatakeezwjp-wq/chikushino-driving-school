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

if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "安全のため停止しました: mainブランチ以外から本番へ配備できません。" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "安全のため停止しました: 未コミット変更があります。" >&2
  exit 1
fi

git fetch origin main --quiet
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]]; then
  echo "安全のため停止しました: ローカルmainとorigin/mainが一致していません。" >&2
  exit 1
fi

if [[ "$("$WRANGLER_BIN" --version)" != 4.* ]]; then
  echo "安全のため停止しました: Wrangler 4.x が必要です。" >&2
  exit 1
fi

/opt/homebrew/bin/node tests/recovery-client-fixes-20260810.cjs

"$WRANGLER_BIN" pages deploy "$SITE_DIR" \
  --project-name "$PROJECT_NAME" \
  --branch main
