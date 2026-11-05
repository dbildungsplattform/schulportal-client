# Testing — schulportal-client

> **Scope:** All `*.spec.ts` files under `src/`. Rules are mandatory unless marked optional.
> **Test runner:** Vitest `^4.1` with jsdom environment and global APIs enabled.

---

## Framework & Tooling

| Tool | Role |
|---|---|
| Vitest `^4.1` | Test runner + assertions (`expect`, `vi`) |
| `@vue/test-utils` `^2.4` | Vue component mounting (`mount`, `flushPromises`) |
| `@pinia/testing` `^1.0` | Pinia store isolation (`createTestingPinia`) |
| `axios-mock-adapter` `^2.1` | HTTP interception — replaces all real network calls |
| `@faker-js/faker` `^10` | Randomised test data — used exclusively via `DoFactory` |
| Istanbul | Coverage provider (reports: `text`, `lcov`) |

**Global test setup (`vitest.setup.ts`) provides — no need to import or configure in spec files:**
- `i18n` (locale `de`, messages from `de-DE.json`)
- `vuetify` (default Vuetify instance)
- `pinia` (via `createTestingPinia()`)
- `ResizeObserver` stub
- `visualViewport` stub (required by Vuetify ≥3.8.7)

**Path aliases available in all specs:**
- `@/` → `src/`
- `test/` → `test/` (e.g. `import { DoFactory } from 'test/DoFactory'`)

---

## File Placement

Spec files **MUST** live next to the file they test:

```
src/stores/RolleStore.ts          → src/stores/RolleStore.spec.ts
src/components/admin/MenuBar.vue  → src/components/admin/MenuBar.spec.ts
src/composables/useBulkErrors.ts  → src/composables/useBulkErrors.spec.ts
src/utils/arrays.ts               → src/utils/arrays.spec.ts
```

**MUST NOT** create a separate `test/` or `__tests__/` directory for unit/component tests. The `test/` root folder contains only shared helpers (`DoFactory.ts`).

---

## Test Commands

```bash
npm test              # watch mode
npm run test:ci       # single run + coverage (lcov + text)
npm run coverage      # alias for test:ci
```

---

## Coverage Thresholds

Enforced by `vitest.config.ts`. **Do not lower these.**

| Path | Statements | Functions | Branches | Lines |
|---|---|---|---|---|
| `src/stores/**` | **100%** | **100%** | **100%** | **100%** |
| `src/components/**` | 75% | 75% | 75% | 75% |
| `src/**` (default) | 70% | 70% | 70% | 70% |

**Excluded from coverage** (do not add tests for these):
`src/api-client/**`, `src/plugins/**`, `src/services/**`, `src/router/**`, `src/App.vue`, `src/main.ts`

---

## Rules by Test Type

### 1. Store Tests

Stores have a 100% coverage requirement. Every action, every branch, and every error path MUST be tested.

```ts
import MockAdapter from 'axios-mock-adapter';
import { createPinia, setActivePinia } from 'pinia';
import axiosApiInstance from '@/services/ApiService';
import { useRolleStore, type RolleStore } from './RolleStore';
import { DoFactory } from 'test/DoFactory';

const mockAdapter: MockAdapter = new MockAdapter(axiosApiInstance);

describe('RolleStore', () => {
  let rolleStore: RolleStore;

  beforeEach(() => {
    setActivePinia(createPinia()); // MUST: fresh Pinia per test
    rolleStore = useRolleStore();
    rolleStore.$reset();           // MUST: reset state to prevent bleed
    mockAdapter.reset();           // MUST: clear all registered mock handlers
    vi.restoreAllMocks();          // MUST: restore any vi.spyOn / vi.fn calls
  });

  it('should initialise state correctly', () => {
    expect(rolleStore.loading).toBe(false);
    expect(rolleStore.errorCode).toBe('');
    // assert every state field
  });

  describe('createRolle', () => {
    it('should set loading true during request and false after', async () => {
      mockAdapter.onPost('/api/rolle').replyOnce(200, DoFactory.getRolleResponse());
      const promise: Promise<void> = rolleStore.createRolle(/* … */);
      expect(rolleStore.loading).toBe(true); // assert mid-flight
      await promise;
      expect(rolleStore.loading).toBe(false);
    });

    it('should set errorCode from i18nKey on API error', async () => {
      mockAdapter.onPost('/api/rolle').replyOnce(500, { i18nKey: 'SOME_ERROR' });
      await rolleStore.createRolle(/* … */);
      expect(rolleStore.errorCode).toBe('SOME_ERROR');
    });

    it('should set fallback errorCode on non-structured error', async () => {
      mockAdapter.onPost('/api/rolle').replyOnce(500, 'plain server error');
      await rolleStore.createRolle(/* … */);
      expect(rolleStore.errorCode).toBe('ROLLE_ERROR'); // fallback defined in store
    });
  });
});
```

**Required for every store action:**
- Happy path: response mapped correctly into state
- Error path with structured `{ i18nKey }` response
- Error path with unstructured server error (fallback code)
- `loading` is `true` during the request and `false` after (both success and error)

---

### 2. Component / View Tests

```ts
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import { DoFactory } from 'test/DoFactory';
import routes from '@/router/routes';
import MyView from './MyView.vue';

let wrapper: VueWrapper | null = null;
let personStore: PersonStore;
let router: Router;

beforeEach(async () => {
  // MUST: provide a real DOM mount point
  document.body.innerHTML = '<div><div id="app"></div></div>';

  router = createRouter({ history: createWebHistory(), routes });
  router.push('/target-route');
  await router.isReady();

  // Stores are provided by createTestingPinia() in vitest.setup.ts — just retrieve them
  personStore = usePersonStore();

  // Stub actions that would make real calls — replace with vi.fn()
  personStore.getAllPersons = vi.fn();

  // Seed reactive state directly
  personStore.totalPersons = 3;
  personStore.allUebersichten = new Map(
    [DoFactory.getPerson(), DoFactory.getPerson(), DoFactory.getPerson()].map((p) => [p.id, DoFactory.getPersonWithZuordnung(p)])
  );

  wrapper = mount(MyView, {
    attachTo: document.getElementById('app') || '',
    global: { plugins: [router] },
  });

  await flushPromises(); // MUST: let all async setup settle
});

afterEach(() => {
  wrapper?.unmount(); // MUST: prevent DOM and listener leaks
});

describe('MyView', () => {
  it('renders person count', () => {
    expect(wrapper?.html()).toContain('3');
  });

  it('calls getAllPersons on mount', () => {
    expect(personStore.getAllPersons).toHaveBeenCalledOnce();
  });
});
```

**Key rules:**
- **MUST** provide `document.body.innerHTML` with `#app` before mounting
- **MUST** use `attachTo: document.getElementById('app') || ''` — required for Vuetify to render correctly
- **MUST** call `await flushPromises()` after `mount` when the component triggers async work on `onMounted`
- **MUST** call `wrapper?.unmount()` in `afterEach`
- **MUST** mock store actions that touch the network with `vi.fn()`
- **MUST** seed store state directly — do not call real store actions in test setup

---

### 3. Composable Tests

Composables run inside `createTestingPinia()` from the global setup. Retrieve stores directly.

```ts
import { useBulkOperationStore, type BulkOperationStore } from '@/stores/BulkOperationStore';
import { DoFactory } from 'test/DoFactory';
import { useBulkErrors } from './useBulkErrors';

describe('useBulkErrors', () => {
  let store: BulkOperationStore;

  beforeEach(() => {
    store = useBulkOperationStore();
    store.$reset();
  });

  it('maps error entries to BulkErrorList', () => {
    const person = DoFactory.getPersonWithZuordnung();
    store.currentOperation = { /* … */ errors: new Map([[person.id, 'ERR_CODE']]) };

    const result = useBulkErrors(vi.fn((k: string) => k), new Map([[person.id, person]]));

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(person.id);
  });
});
```

---

### 4. Utility / Pure Function Tests

No store or component setup needed. Use `test.each` for data-driven cases.

```ts
import { dedup } from './arrays';

describe('dedup', () => {
  test.each([
    [['a', 'b', 'a'], ['a', 'b']],
    [['x'],           ['x']],
    [[],              []],
  ])('deduplicates %s → %s', (input: string[], expected: string[]) => {
    expect(dedup(input)).toEqual(expected);
  });
});
```

---

## Test Data

**MUST** use `DoFactory` from `test/DoFactory.ts` for all domain objects.  
**MUST NOT** fabricate raw objects inline (e.g. `{ id: '123', name: 'test' }`).

```ts
// ✅ CORRECT
const person = DoFactory.getPerson();
const schule = DoFactory.getSchule();
const zuordnung = DoFactory.getZuordnung({}, { organisation: schule });

// ✅ CORRECT — override specific fields
const lockedPerson = DoFactory.getPerson({ isLocked: true });

// ❌ WRONG — fabricated inline
const person = { id: '1', name: { vorname: 'Max', familienname: 'M' }, username: 'mm' };
```

To add a new domain object, add a `static` method to `DoFactory` using `faker` for all fields. Every field must have a realistic fake value — no hardcoded `'test'` strings.

---

## HTTP Mocking

**MUST** intercept all HTTP calls with `MockAdapter`. Real network calls in tests are forbidden.

```ts
import MockAdapter from 'axios-mock-adapter';
import axiosApiInstance from '@/services/ApiService';

const mockAdapter: MockAdapter = new MockAdapter(axiosApiInstance);

beforeEach(() => {
  mockAdapter.reset(); // clear handlers before each test
});

// Register per-test with replyOnce — never reuse a handler across tests
mockAdapter.onGet('/api/rolle').replyOnce(200, [DoFactory.getRolleResponse()]);
mockAdapter.onPost('/api/rolle').replyOnce(500, { i18nKey: 'SOME_ERROR' });
```

**Use `replyOnce`** not `reply` — `reply` persists across tests if `mockAdapter.reset()` is missed.

---

## Naming Conventions

| Scope | Pattern | Example |
|---|---|---|
| `describe` (top-level) | PascalCase name of the unit | `describe('RolleStore', …)` |
| `describe` (nested) | action or method name | `describe('createRolle', …)` |
| `it` / `test` | `'should <expected behaviour>'` or `'<condition> → <outcome>'` | `'should set errorCode on 500'` |

---

## Anti-Patterns

| Anti-pattern | MUST do instead |
|---|---|
| Inline fabricated test objects | Use `DoFactory` |
| Real HTTP calls | Use `MockAdapter.replyOnce(…)` |
| Missing `store.$reset()` in `beforeEach` | Add `store.$reset()` to prevent state bleed |
| Missing `wrapper?.unmount()` in `afterEach` | Always unmount — prevents listener and DOM leaks |
| Missing `await flushPromises()` after async triggers | Add after every `mount` or user interaction that triggers async work |
| `reply(…)` instead of `replyOnce(…)` | Use `replyOnce` — persistent handlers survive `reset()` gaps |
| Testing implementation details (internal variables, private methods) | Assert on public state, emitted events, and rendered DOM only |
| Shared state between tests (module-level mutable variables) | Initialise all state inside `beforeEach` |
| Skipping error path tests for store actions | Every action MUST test both the success path and at least one error path |
