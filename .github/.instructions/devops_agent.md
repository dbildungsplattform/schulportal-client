# DevOps & Runtime Environment

> **CRITICAL RULE FOR AI:** You MUST NOT run any command listed in this file without first asking the user for explicit confirmation. This applies to every command — including installs, builds, server starts, and Docker operations. Always describe what the command will do and ask: "Should I run this?" before proceeding.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | `24.x` (exact: `24.16.0`) | Check with `node -v` |
| npm | `>=11.10.0` | Check with `npm -v` |
| Docker + Docker Compose | any recent version | Required for all local backing services |
| git `autocrlf` | MUST be `false` | Kafka will not run correctly otherwise — set with `git config --global core.autocrlf false` |

---

## Local Service Architecture

The full local stack spans two repos. All backing services run in Docker; application code runs on the host.

```
┌─────────────────────────────────────────────────┐
│  Host (your machine)                            │
│                                                 │
│  schulportal-client        :8099  (npm run dev) │
│  dbildungs-iam-server      :9090  (npm run start)│
└────────────────┬────────────────────────────────┘
                 │ Docker (compose.yaml in dbildungs-iam-server/)
                 ▼
┌────────────────────────────────────────────────────────────┐
│  PostgreSQL 15.3          :5432  (container: db)           │
│  Keycloak (custom image)  :8080  (container: keycloak)     │
│  Redis 7.2.2              :6379  (container: redis)        │
│  Kafka (optional)         :9094  (profile: third-party)    │
│  privacyIDEA (optional)          (profile: third-party)    │
└────────────────────────────────────────────────────────────┘
```

### Local URLs (development)

| Service | URL | Default credentials |
|---|---|---|
| Frontend (Vue SPA) | `https://localhost:8099` | n/a |
| Backend API | `http://localhost:9090/api` | n/a |
| Swagger UI | `http://localhost:9090/docs` | n/a |
| Keycloak admin | `http://localhost:8080` | `admin` / `admin` |
| PostgreSQL | `localhost:5432` | `admin` / `password`, DB: `dbildungs-iam-server` |
| Redis | `localhost:6379` | password: `password` |

> Credentials listed here are **local development only** — they live in `dbildungs-iam-server/config/config.json` and are not used in any deployed environment.

The frontend dev server proxies all `/api` requests to `http://localhost:9090` — this is configured in `vite.config.ts`.

---

## First-Time Setup

> **AI:** Do not run any of these steps automatically. Present this list and ask which steps the user needs.

### Step 1 — Clone & configure git (one-time per machine)
```bash
git config --global core.autocrlf false
```

### Step 2 — Install dependencies (both repos)
```bash
# In schulportal-client/
npm ci

# In dbildungs-iam-server/
npm ci
```

### Step 3 — Start backing services (in `dbildungs-iam-server/`)
```bash
# Minimum required services: PostgreSQL + Keycloak + Redis
docker compose up -d

# Optional: also start Kafka and other third-party services
docker compose --profile third-party up -d
```

### Step 4 — Initialise the database + seed data (in `dbildungs-iam-server/`)
```bash
npm run setup
```
This runs `db:migration-apply` + `keycloak:update-clients` + `db:seed dev` in sequence. **It will reset the database.**

### Step 5 — Start the backend (in `dbildungs-iam-server/`)
```bash
npm run start
# or with debug port open on 9229:
npm run start:debug
```

### Step 6 — Start the frontend (in `schulportal-client/`)
```bash
npm run dev
```

---

## Command Reference

> **AI:** List relevant commands and ask the user which one to run. Never execute without confirmation.

### `schulportal-client`

| Command | Effect |
|---|---|
| `npm ci` | Install exact dependency versions from `package-lock.json` |
| `npm run dev` | Start Vite dev server on `:8099` with hot reload; proxies `/api` → `:9090` |
| `npm run build` | Type-check + production build into `dist/` |
| `npm run build-only` | Production build without type-check |
| `npm run preview` | Serve the production build locally on `:8099` |
| `npm run lint` | Run ESLint with auto-fix |
| `npm run check-format` | Check Prettier formatting (no write) |
| `npm run format` | Write Prettier formatting |
| `npm run type-check` | Run `vue-tsc --noEmit` only |
| `npm test` | Run Vitest in watch mode |
| `npm run test:ci` | Run all tests once + generate coverage |
| `npm run coverage` | Alias for `test:ci` |
| `npm run generate-client` | Regenerate `src/api-client/generated/` from the OpenAPI spec |

### `dbildungs-iam-server`

| Command | Effect |
|---|---|
| `npm ci` | Install exact dependency versions |
| `npm run build` | Compile TypeScript via NestJS CLI |
| `npm run start` | Start main HTTP server on `:9090` |
| `npm run start:debug` | Start server with debug port on `9229` |
| `npm run start:prod` | Start compiled production build |
| `npm run lint` | ESLint — zero warnings allowed |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run check-format` | Check Prettier formatting |
| `npm run format` | Write Prettier formatting |
| `npm test` | Vitest watch mode (all tests) |
| `npm run test:unit` | Run only unit tests (`*.spec.ts`) |
| `npm run test:integration` | Run only integration tests (`*.integration-spec.ts`) — requires Docker |
| `npm run test:ci` | All tests + coverage |
| `npm run setup` | `db:migration-apply` + `keycloak:update-clients` + `db:seed dev` — **resets DB** |
| `npm run db:migration-apply` | Apply pending MikroORM migrations |
| `npm run db:migration-create` | Generate a new migration file |
| `npm run db:seed` | Seed the database with dev data |

### Docker Compose profiles (run from `dbildungs-iam-server/`)

| Command | Profile(s) | Effect |
|---|---|---|
| `docker compose up -d` | _(none)_ | Start core services: db, keycloak, redis |
| `docker compose --profile third-party up -d` | `third-party` | Add Kafka, privacyIDEA, and other optional services |
| `docker compose --profile backend up -d` | `backend` | Run the backend itself in Docker (uses published image) |
| `docker compose --profile frontend up -d` | `frontend` | Run the frontend + Nginx ingress in Docker |
| `docker compose --profile db-init up` | `db-init` | Initialise DB schema without seeding |
| `docker compose --profile db-migrate up` | `db-migrate` | Apply schema migrations |
| `docker compose --profile db-seed up` | `db-seed` | Seed the database |
| `docker compose --profile keycloak-client-update up` | `keycloak-client-update` | Sync Keycloak clients |
| `docker compose down` | — | Stop and remove all containers |
| `docker compose logs -f <service>` | — | Tail logs for a specific service (e.g. `keycloak`, `db`) |
| `docker system prune -a` | — | **Destructive** — removes all unused images, containers, volumes |

---

## CI/CD

All CI runs on **GitHub Actions**. Shared reusable workflows are consumed from `dBildungsplattform/dbp-github-workflows@8`.

Pipeline file: `dbildungs-iam-server/.github/workflows/image-and-helm-publish-check-deploy-on-push-scheduled.yml`

| Job | Trigger | What it does |
|---|---|---|
| Linting | push | ESLint zero-warnings check |
| Prettier check | push | Formatting check |
| Tests + SonarCloud | push | Full test run + coverage upload |
| CodeQL | push | JavaScript security analysis |
| Build + Trivy scan | push (clearance check) | Build Docker image, scan for CVEs |
| Helm publish | push to main | Publish Helm chart |
| Deploy | push (clearance check) | Deploy to dev environment |
| Nightly Trivy | cron `0 2 * * *` | Scheduled CVE re-scan |

A PR label `prevent_auto_deployment` blocks the deploy job while allowing all other checks to run.

Container images are published to `ghcr.io/dbildungsplattform/`.

---

## Troubleshooting

> **AI:** Diagnose using read-only commands (`docker compose ps`, `docker compose logs`, `lsof`). Ask the user before running any fix command.

| Symptom | Diagnosis command | Likely fix |
|---|---|---|
| Frontend shows network errors | Check if backend is running | Start `npm run start` in `dbildungs-iam-server/` |
| `/api` returns 502 | `docker compose ps` — check `keycloak` and `redis` status | `docker compose up -d` |
| Port `:8099` or `:9090` in use | `lsof -i :8099` / `lsof -i :9090` | Kill the occupying process, or stop the conflicting service |
| DB connection refused | `docker compose ps db` | `docker compose up -d db` |
| Keycloak login fails locally | `docker compose logs keycloak` | Wait for realm import to finish; check `config/dev-realm-spsh.json` |
| Integration tests fail | Docker daemon not running | Start Docker Desktop / Rancher Desktop |
| `Error response from daemon: network … not found` | Stale Docker network | `docker system prune -a` — **ask user first**, this is destructive |
| `git autocrlf` warning on clone | `git config core.autocrlf` returns `true` | `git config --global core.autocrlf false` then re-clone |
