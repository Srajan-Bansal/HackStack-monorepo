# HackStack Monorepo

Turborepo monorepo containing the web frontend, backend API, and submission webhook for [HackStack](https://github.com/Srajan-Bansal/HackStack) — a competitive programming platform.

## Architecture

![HackStack Architecture](https://github.com/user-attachments/assets/dd3ec65c-3dff-43ee-adce-235de062ab6a)

## Apps

| App | Description | Port |
|-----|-------------|------|
| **web** | React + Vite frontend with Monaco Editor | 5173 |
| **http-backend** | Express REST API (auth, problems, submissions) | 3000 |
| **submission-webhook** | Kafka consumer that processes execution results | 3001 |
| **boilerplate-generator** | CLI tool to generate code templates from problem definitions | — |

## Shared Packages

- **@repo/db** — Prisma client and schema (PostgreSQL)
- **@repo/common-zod** — Shared Zod validation schemas
- **@repo/language** — Language configuration and mappings
- **@repo/redis-client** — Redis client wrapper
- **@repo/ui** — Shared React components (Radix UI + TailwindCSS)

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm 9
- PostgreSQL
- Redis
- Kafka

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/http-backend/.env.example apps/http-backend/.env
cp apps/submission-webhook/.env.example apps/submission-webhook/.env
cp apps/web/.env.example apps/web/.env
cp packages/db/.env.example packages/db/.env
# Edit .env files with your values

# Generate Prisma client & run migrations
pnpm prisma:generate
pnpm prisma:migrate

# Seed data
pnpm prisma:seedLanguage
pnpm prisma:seedProblem

# Start all apps
pnpm dev

# Or start selectively
pnpm web       # frontend + backend (no webhook)
pnpm backend   # backend only
```

## Other Commands

```bash
pnpm build        # Build all apps
pnpm lint         # Lint all apps
pnpm type-check   # Type check all apps
pnpm format       # Format code with Prettier
```

## Related Repositories

- [HackStack](https://github.com/Srajan-Bansal/HackStack) — Parent repository
- [hackstack-problems](https://github.com/Srajan-Bansal/hackstack-problems) — Problem definitions and test cases
- [OpenExecutor](https://github.com/Srajan-Bansal/OpenExecutor) — Code execution engine
