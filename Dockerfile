# Malamar - Single-binary, zero-configuration autonomous task orchestration system
# Multi-stage Dockerfile for containerized deployment

# =============================================================================
# Build Stage
# =============================================================================
FROM oven/bun:1.1 AS builder

WORKDIR /app

# Copy package files
COPY server/package.json server/bun.lock* ./server/

# Install dependencies
WORKDIR /app/server
RUN bun install --frozen-lockfile

# Copy source code
COPY server/src ./src
COPY server/migrations ./migrations
COPY server/tsconfig.json ./

# Build the binary for Linux x64
RUN bun build --compile --target=bun-linux-x64 --outfile /app/malamar ./src/index.ts

# =============================================================================
# Runtime Stage
# =============================================================================
FROM debian:bookworm-slim AS runtime

# Install minimal dependencies (curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash malamar

# Set up data directory
RUN mkdir -p /home/malamar/.malamar && chown -R malamar:malamar /home/malamar/.malamar

# Copy the binary from builder
COPY --from=builder /app/malamar /usr/local/bin/malamar
RUN chmod +x /usr/local/bin/malamar

# Switch to non-root user
USER malamar
WORKDIR /home/malamar

# Environment variables
ENV HOME=/home/malamar
ENV PORT=3456

# Expose the default port
EXPOSE 3456

# Data volume
VOLUME ["/home/malamar/.malamar"]

# Health check - verify server is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Run the server
CMD ["malamar"]
