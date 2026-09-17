# Project Tech Stack & Architecture — dBildungs IAM / Schulportal

> **Scope:** Applies to all three repositories that form this platform:
> - `schulportal-client` — Vue 3 SPA frontend
> - `dbildungs-iam-server` — NestJS backend (IAM server)
> - `schulportal-testautomatisierung` — Playwright E2E test suite

---

## Global Rules

- **Language:** All code, comments, commit messages, and agent instructions are in **English**. Exception: domain object names and route paths that reflect official German administrative terminology (e.g. `Personenkontext`, `Schulstrukturknoten`, `Befristung`) are kept in German.
- **Node.js version:** `24.x` across all three repositories (pinned to `24.16.0` in Docker images).
- **Package manager:** `npm` (npm `>=11.10.0`). Never use `yarn` or `pnpm`.
- **License:** EUPL-1.2 across all repos.
- **Code quality:** SonarCloud is used for static analysis. Coverage reports use Istanbul/lcov.
- **Container runtime:** All services are containerised with Docker; images are based on `node:24.16.0-alpine3.24`.
- **Orchestration:** Kubernetes via Helm charts (one chart per repo under `charts/`).
- **CI/CD:** GitHub Actions. Shared workflows are consumed from `dBildungsplattform/dbp-github-workflows`.

---

## Repository Overview

### 1. `schulportal-client` — Frontend SPA

| Category | Technology |
|---|---|
| Framework | Vue 3 `^3.5` (Composition API, `<script setup>`) |
| Language | TypeScript `^5.9` (strict, `@typescript-eslint/typedef`) |
| UI Library | Vuetify 3 `^3.7`, Material Design Icons (`@mdi/font`) |
| State | Pinia `^3.0` |
| Routing | Vue Router `^5.1` |
| i18n | Vue I18n `^11.4` (locale: `de`, all strings in `de-DE.json`) |
| Forms | vee-validate `^4.15` + yup `^1.7` + `@vee-validate/yup` |
| HTTP | Axios `^1.17` (singleton `ApiService.ts`; auto CSRF + 401 redirect) |
| Date utilities | date-fns `^4.4` |
| Build | Vite `^8.0` |
| Tests | Vitest `^4.1`, jsdom, `@vue/test-utils`, `axios-mock-adapter` |
| Test data | `@faker-js/faker` via `test/DoFactory.ts` |
| Linting | ESLint 9 flat config + `eslint-plugin-vue` + `typescript-eslint` |
| Formatting | Prettier `^3.8` |
| Web server | Nginx `1.31.1-alpine` (serves static build; proxies `/api` to backend) |
| API contract | OpenAPI spec auto-generated client under `src/api-client/generated/` via `openapi-generator-cli` |

**Key architecture notes:**
- Routes carry `AppRouteMeta` with `requiresAuth`, `layout`, `requiredStepUpLevel` (`NONE`/`SILVER`/`GOLD`), and `requiresPermission`.
- Two layouts: `AdminLayout` (authenticated admin area) and `DefaultLayout` (public).
- CSRF token is injected into every outbound request by an Axios request interceptor; token is fetched from the backend on login and stored in `AuthStore`.
- The Vuetify theme is named `shTheme` and defined in `src/plugins/vuetify.ts`.
- CSP nonces for inline scripts are injected by Nginx via `$request_id` (see `nginx-vue.conf`).

---

### 2. `dbildungs-iam-server` — Backend (IAM Server)

| Category | Technology |
|---|---|
| Runtime | Node.js `24.16.0` |
| Framework | NestJS `^11` (monorepo, multiple apps) |
| Language | TypeScript `^5` (ESM, `"type": "module"`) |
| HTTP server | Express `^5` via `@nestjs/platform-express` |
| ORM | MikroORM `^7` with PostgreSQL driver (`@mikro-orm/postgresql`) |
| Database | PostgreSQL `15.3` |
| Migrations | MikroORM migrations (TypeScript files in `migrations/`) |
| Seeding | Custom CLI via `nest-commander` (`npm run db:seed`) |
| Cache | Redis `7.2.2` (`redis`, `@keyv/redis`, `connect-redis`) |
| Session | `express-session` backed by Valkey |
| Auth | Passport `^0.7` with JWT strategy (`passport-jwt`), OpenID Connect (`openid-client`), API key (`passport-headerapikey`), JWKS (`jwks-rsa`) |
| IAM | Keycloak (custom image `dbildungs-iam-keycloak`); managed via `@keycloak/keycloak-admin-client` |
| 2FA | privacyIDEA (HTTP API via `PrivacyIdeaAdministrationModule`) |
| Messaging | Kafka (`@confluentinc/kafka-javascript`) — internal event bus via `EventModule` / `KafkaEventService` |
| LDAP | `ldapts ^8` — `LdapModule` syncs person/organisation data |
| Email | Dedicated NestJS app (`email` entrypoint); webhook-driven via `EmailMicroserviceModule` |
| OX | OX App Suite integration via HTTP (`OxModule`) |
| ItsLearning | IMS ES API over HTTP (`ItsLearningModule`) |
| VIDIS | HTTP integration (`VidisModule`) |
| SchulConneX | Standard interface (`SchulconnexModule`) — exposes `/personeninfo` and `/personinfo` |
| Validation | `class-validator` + `class-transformer` (global pipe `GlobalValidationPipe`) |
| API docs | Swagger/OpenAPI (`@nestjs/swagger`), served at `/docs`; used to generate frontend client |
| Metrics | Prometheus via `prom-client` (`ReporterModule`), exposed at `/metrics` |
| Health | `@nestjs/terminus` at `/health` |
| Logging | Winston `^3` via custom `ClassLogger` / `NestLogger` |
| Tests | Vitest `^4` (two projects: `unit`, `integration`); `@testcontainers/postgresql` for integration tests |
| Linting | ESLint 9 flat config + `typescript-eslint` |
| Formatting | Prettier `^3` |

**NestJS application entrypoints (monorepo):**

| App | Entrypoint | Purpose |
|---|---|---|
| `server` | `src/server/main.ts` | Main HTTP API + Swagger |
| `email` | `src/email/main.ts` | Email sending microservice |
| `console` | `src/console/main.ts` | CLI (migrations, seeding, Keycloak client sync) |
| `kc-db-microservice` | `src/apps/kc-db-microservice/main.ts` | Keycloak ↔ DB health bridge microservice |

**Core domain modules:**
`person`, `personenkontext`, `organisation`, `rolle`, `service-provider`, `authentication`, `permission`, `import`, `meldung`, `landesbediensteter`, `status`, `spshconfig`, `keycloak-administration`, `keycloak-handler`, `privacy-idea-administration`, `cron`

**Infrastructure / integration modules:**
`ldap` (core), `email`, `email-microservice`, `itslearning`, `ox`, `vidis`, `schulconnex`, `metrics`, `health`, `kc-db-health`

**Key architecture notes:**
- Internal cross-module communication uses an event bus (`EventModule`) that routes events both in-process and via Kafka.
- All config is loaded from JSON config files (path resolved via `JsonConfig`) with class-validator-validated config classes (e.g. `KeycloakConfig`, `DbConfig`, `RedisConfig`).
- URI versioning is enabled: all routes are prefixed `/api/v1/…` except `/health`, `/metrics`, and `/keycloakinternal/…`.
- The Keycloak realm configuration (`dev-realm-spsh.json`) is imported at startup in local development.

---

### 3. `schulportal-testautomatisierung` — E2E Test Suite

| Category | Technology |
|---|---|
| Framework | Playwright `^1.58` |
| Language | TypeScript `^5.6` (ESM) |
| Pattern | Page Object Model (POM) — pages in `pages/`, specs in `tests/` |
| Browsers | Chromium, Firefox, WebKit (all run in CI) |
| API client | Auto-generated from OpenAPI spec (`base/api/generated/`) via `openapi-generator-cli` |
| Test data | `@faker-js/faker` |
| 2FA | `totp-generator` + `jsqr` + `pngjs` for QR code-based TOTP setup |
| CSV | `@fast-csv/format` + `@fast-csv/parse` for import/export test files |
| LDAP | `ldapts ^7` (direct LDAP queries in assertions) |
| Date utilities | `date-fns ^4`, `moment ^2` |
| Password gen | `generate-password-ts` |
| Linting | ESLint 9 + `eslint-plugin-playwright` |
| Formatting | Prettier `^3.8` |

**Test execution:**
- `globalSetup` bootstraps admin users via the backend API before any test runs.
- `globalTeardown` cleans up test data after the full run.
- 4 workers by default; retries on CI.
- Target environment is configured via `.env.dev` / `.env.local` / `.env.stage` (variable: `FRONTEND_URL`).
- `playwright-report/` holds HTML reports; `test-downloads/` holds files downloaded during tests.

**Test areas covered:**
`Authentifizierung`, `Klassen`, `Navigation`, `Personen`, `Profile`, `Rollen`, `Schulen`, `Start`, `ZweiFaktorAuth`, `InbetriebnahmePasswort`, `LandesbedienstetenSuchenUndHinzufügen`

---

## Infrastructure & Deployment

| Component | Technology | Notes |
|---|---|---|
| Container images | Docker (Alpine-based) | `node:24.16.0-alpine3.24` builder; `nginx:1.31.1-alpine` frontend server |
| Orchestration | Kubernetes + Helm | Charts under `charts/` in each repo |
| Image registry | GitHub Container Registry (`ghcr.io/dbildungsplattform/`) | |
| CI/CD | GitHub Actions | Shared workflows from `dBildungsplattform/dbp-github-workflows@8` |
| Security scanning | Trivy (container CVE scanning) | Runs on push + nightly cron |
| Code analysis | SonarCloud (CodeQL for JS) | Runs on push |
| Frontend web server | Nginx | Serves Vue SPA; proxies `/api` to backend; enforces CSP nonces |
| Backend reverse proxy | Nginx (in cluster) | |
| Local dev stack | Docker Compose (`compose.yaml`) | Services: `db`, `keycloak`, `redis`, `backend`, `keycloak-db-microservice` |
| Database | PostgreSQL `15.3` | |
| Session / cache | Redis `7.2.2` | |
| IAM | Keycloak (custom `dbildungs-iam-keycloak` image) | |
| 2FA | privacyIDEA | Integrated via HTTP from backend |
