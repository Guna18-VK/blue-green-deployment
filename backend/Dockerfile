# ── Stage 1: Install dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps

# Declare build arg so Jenkins --build-arg APP_VERSION=vN is accepted
ARG APP_VERSION=v1

WORKDIR /app

# Copy only package files first to leverage Docker layer caching
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: Production image ───────────────────────────────────────────────
FROM node:20-alpine

# Re-declare ARG so it's available in this stage
ARG APP_VERSION=v1

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

# Bake APP_VERSION from build-arg into the image as an env var
# Can still be overridden at runtime with docker run -e APP_VERSION=vN
ENV PORT=5000 \
    APP_VERSION=${APP_VERSION} \
    ENVIRONMENT=blue

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "server.js"]
