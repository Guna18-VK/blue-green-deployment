#!/bin/bash
# ── Health Check Script ───────────────────────────────────────────────────────
# Usage: ./scripts/health-check.sh <host> [retries] [interval]

HOST="${1:?Usage: $0 <host> [retries] [interval_seconds]}"
RETRIES="${2:-10}"
INTERVAL="${3:-15}"

echo "Checking health of http://${HOST}/health"
echo "Retries: ${RETRIES} | Interval: ${INTERVAL}s"
echo "────────────────────────────────────────"

for i in $(seq 1 "$RETRIES"); do
    echo "[$(date +%T)] Attempt $i / $RETRIES..."

    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${HOST}/health" 2>/dev/null)

    if [ "$HTTP_STATUS" = "200" ]; then
        BODY=$(curl -s "http://${HOST}/health")
        echo "✅ Health check PASSED (HTTP $HTTP_STATUS)"
        echo "Response: $BODY"
        exit 0
    fi

    echo "   Not ready (HTTP $HTTP_STATUS). Waiting ${INTERVAL}s..."
    sleep "$INTERVAL"
done

echo "❌ Health check FAILED after $RETRIES attempts"
exit 1
