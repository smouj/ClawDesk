#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
DOCS_DIR="$ROOT_DIR/docs"
DASHBOARD_DIR="$DOCS_DIR/dashboard"

mkdir -p "$DASHBOARD_DIR"

rsync -av --delete "$ROOT_DIR/app/" "$DASHBOARD_DIR/"

echo "docs/dashboard actualizado desde app/ (landing intacto en docs/index.html)"
