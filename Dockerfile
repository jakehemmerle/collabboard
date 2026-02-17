FROM oven/bun:1.3 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/
RUN bun install --frozen-lockfile

# Copy source
COPY apps/web/ apps/web/

# Build
RUN bun run --cwd apps/web build

# Serve with a lightweight static server
FROM oven/bun:1.3-slim
WORKDIR /app
RUN mkdir -p /app/server && cd /app/server && bun init -y && bun add serve
COPY --from=base /app/apps/web/dist ./dist
EXPOSE 3000
CMD ["/app/server/node_modules/.bin/serve", "dist", "-l", "3000", "-s"]
