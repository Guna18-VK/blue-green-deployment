#!/bin/bash
# ── Rollback Script ───────────────────────────────────────────────────────────
# Switches traffic back to the previous (stable) environment
# Usage: ./scripts/rollback.sh <current_active_env>

CURRENT="${1:?Usage: $0 <current_active_env: blue|green>}"

if [ "$CURRENT" = "green" ]; then
    ROLLBACK_TARGET="blue"
elif [ "$CURRENT" = "blue" ]; then
    ROLLBACK_TARGET="green"
else
    echo "Error: must be 'blue' or 'green'"
    exit 1
fi

echo "⚠️  Rolling back from $CURRENT → $ROLLBACK_TARGET"
echo "────────────────────────────────────────"

bash "$(dirname "$0")/switch-traffic.sh" "$ROLLBACK_TARGET"

echo "✅ Rollback complete. Traffic is now on: $ROLLBACK_TARGET"
