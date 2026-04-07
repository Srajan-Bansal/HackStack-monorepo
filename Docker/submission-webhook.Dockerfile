# Stage 1: Prune monorepo to only submission-webhook and its dependencies
FROM oven/bun:1 AS pruner

WORKDIR /app

RUN bun install turbo --global

COPY . .

RUN turbo prune submission-webhook --docker

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
RUN bun run build --filter=submission-webhook

# Stage 4: Production runtime
FROM oven/bun:1-alpine AS runner

WORKDIR /app

COPY --from=builder /app/apps/submission-webhook/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/prisma ./prisma

EXPOSE 3001

CMD ["bun", "dist/index.js"]
