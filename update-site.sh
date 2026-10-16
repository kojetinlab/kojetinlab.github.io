#!/usr/bin/env bash
# Preview by default; add --apply to copy the planned update.
# Run from your GitHub clone. See docs/release-updates.md.
set -euo pipefail
updater_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
if ! command -v python3 >/dev/null 2>&1; then
  echo "This updater needs Python 3.9 or later. See docs/release-updates.md." >&2
  exit 1
fi
exec python3 "$updater_dir/scripts/update_from_release.py" "$@"
