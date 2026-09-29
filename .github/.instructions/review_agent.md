# Code Review — schulportal-client

> **Scope:** All PRs touching `src/`. Rules are mandatory. Defer to `frontend_agent.md` for coding conventions; this file governs *how to review*.

---

## Behaviour Rules

**MUST NOT** comment unless confidence is >80%. When uncertain, stay silent.

**MUST** raise each problem as a **separate comment** — never bundle multiple issues.

**MUST NOT** report anything that CI already catches: Prettier formatting, TypeScript compile errors, ESLint violations, failing tests, outdated dependencies.

**MUST NOT** comment on:
- Naming style that does not cause a bug
- Missing code comments on self-documenting code
- Refactors not requested by the author
- Logging additions unless their absence creates a security or correctness gap

---

## Priority Order

Evaluate in this order. Report the highest-priority finding first.

### 1. Security

| Check | What to look for |
|---|---|
| External input validation | All data arriving from outside `src/` (API responses, route params, query strings) MUST be treated as untrusted. Flag missing validation before use. |
| Sensitive data exposure | No credentials, tokens, or PII in `console.*` calls, error messages surfaced to the user, or hardcoded in source. |
| CSRF | All mutating requests MUST go through `axiosApiInstance` (which injects `X-CSRF-Token`). Flag any direct `axios` usage or `fetch`. |
| XSS | No use of `v-html` with dynamic untrusted content. |

### 2. Correctness

| Check | What to look for |
|---|---|
| Error handling | Every `catch` block MUST set `this.errorCode` via `getResponseErrorCode`. Flag silent swallows. |
| Resource leaks | Event listeners registered in `onMounted` MUST be removed in `onUnmounted`. Watchers MUST be stopped. `wrapper.unmount()` MUST be called in `afterEach` in tests. |
| Async correctness | `await flushPromises()` MUST follow every async store action trigger in tests. Missing calls produce false-green tests. |
| Boundary / null safety | Optional chaining and null checks on API response fields that may be absent. |
| Pinia state mutation | State MUST only be mutated inside store actions — never mutated directly from a component. |

### 3. Architecture & Conventions

Only flag deviations that will cause bugs, test failures, or maintainability breakage — not style preferences.

| Check | Rule |
|---|---|
| API factory instantiation | `XApiFactory(...)` MUST be at module level in the store file. If inside an action or component, flag it. |
| Auto-generated client | Any edit to `src/api-client/generated/` is forbidden. Instruct to run `npm run generate-client` instead. |
| HTTP client | All HTTP calls MUST use `axiosApiInstance`. Direct `axios.create()` or `fetch` bypass CSRF and 401-redirect handling. |
| `any` type | Forbidden — flag and suggest `unknown` + type narrowing. |
| Hardcoded user-facing strings | All German UI text MUST be in `de-DE.json`. Hardcoded strings will not be translatable. |
| `data-testid` on new interactive elements | Missing `data-testid` breaks E2E tests in `schulportal-testautomatisierung`. |
| Circular imports | `import/no-cycle` is an ESLint error; flag any new circular dependency. |

### 4. Testing

| Check | What to look for |
|---|---|
| Coverage of changed logic | Every changed code path MUST have a corresponding spec. Flag untested branches including error paths. |
| `DoFactory` usage | Test objects MUST be created via `DoFactory`. Inline fabrication (`{ id: '123', name: 'test' }`) is not allowed. |
| Real HTTP calls | Tests MUST not make real network calls. All Axios calls MUST be intercepted by `MockAdapter`. |
| Store reset | `store.$reset()` MUST be called in `beforeEach` in store unit tests to prevent state bleed. |

---

## Comment Format

Every comment **MUST** use this structure:

1. **Problem** — one sentence: what is wrong.
2. **Risk** — why it matters (omit only if self-evident).
3. **Fix** — a concrete code snippet or specific action.

**Example:**

> **Problem:** `userInput` is passed directly to `v-html` without sanitisation.
> **Risk:** Allows stored XSS if the value originates from an API response.
> **Fix:** Remove `v-html` and render the value as text, or sanitise with a trusted library before binding.

---

## Pre-Merge Checklist

Before approving, verify:

- [ ] No `console.log` / `console.error` left in production code paths
- [ ] No commented-out code blocks
- [ ] No hardcoded German strings outside `de-DE.json`
- [ ] No direct edits to `src/api-client/generated/`
- [ ] New interactive elements have `data-testid`
- [ ] Changed logic has spec coverage including error paths
- [ ] `wrapper.unmount()` present in `afterEach` for new component tests
