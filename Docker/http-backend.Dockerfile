# Stage 1: Prune monorepo to only http-backend and its dependencies
FROM oven/bun:1 AS pruner

WORKDIR /app

RUN bun install turbo --global

COPY . .

RUN turbo prune http-backend --docker

# Stage 2: Install dependencies from pruned output
FROM oven/bun:1 AS installer

WORKDIR /app

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock

RUN bun install --frozen-lockfile

# Stage 3: Build
FROM oven/bun:1 AS builder

WORKDIR /app

COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .

RUN packages/db/node_modules/.bin/prisma generate --schema packages/db/prisma/schema.prisma
RUN bun run build --filter=http-backend

# Stage 4: Production runtime
FROM oven/bun:1-alpine AS runner

WORKDIR /app

COPY --from=builder /app/apps/http-backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/packages/common ./packages/common
COPY --from=pruner /app/Docker/entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
