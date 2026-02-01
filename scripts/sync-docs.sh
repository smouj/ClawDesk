#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

rsync -av --delete "$ROOT_DIR/app/" "$ROOT_DIR/docs/"

echo "docs/ actualizado desde app/"
