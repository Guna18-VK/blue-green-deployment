#!/bin/bash
# ── Switch ALB Traffic ────────────────────────────────────────────────────────
# Usage: ./scripts/switch-traffic.sh <blue|green>
# Runs terraform apply to update the active_environment variable

TARGET="${1:?Usage: $0 <blue|green>}"

if [[ "$TARGET" != "blue" && "$TARGET" != "green" ]]; then
    echo "Error: target must be 'blue' or 'green'"
    exit 1
fi

echo "Switching ALB traffic to: $TARGET"
echo "────────────────────────────────────────"

cd "$(dirname "$0")/../terraform" || exit 1

terraform init -input=false

terraform apply -auto-approve \
    -var="active_environment=${TARGET}"

echo "✅ Traffic switched to $TARGET"
