# ── Stage 1: Install dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package files first to leverage Docker layer caching
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: Production image ───────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy installed modules and source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

# Default env vars (overridden at runtime)
ENV PORT=5000 \
    APP_VERSION=v1 \
    ENVIRONMENT=blue

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "server.js"]
