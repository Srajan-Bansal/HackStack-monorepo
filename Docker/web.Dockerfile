# Stage 1: Prune monorepo to only web and its dependencies
FROM oven/bun:1 AS pruner

WORKDIR /app

RUN bun install turbo --global

COPY . .

RUN turbo prune web --docker

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

ARG VITE_BACKEND_URL=http://localhost:3000
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

RUN bun run build --filter=web

# Stage 4: Serve with nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY --from=pruner /app/Docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
