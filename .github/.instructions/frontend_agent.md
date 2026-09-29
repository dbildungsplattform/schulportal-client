# Frontend Development — schulportal-client

> **Scope:** All code under `src/`. These rules are mandatory unless marked optional.
> **Language:** Application UI is German-only. All code, comments, and this file are English.

## Core Technologies

| Tool | Version | Role |
|---|---|---|
| Vue 3 | `^3.5` | UI framework — Composition API + `<script setup>` only |
| TypeScript | `^5.9` | Strict typing; explicit annotations required everywhere |
| Vuetify 3 | `^3.7` | Component library + theming (`shTheme`) |
| Pinia | `^3.0` | Global state management |
| Vue Router | `^5.1` | Client-side routing with navigation guards |
| Vue I18n | `^11.4` | i18n — locale `de`, all strings in `de-DE.json` |
| vee-validate + yup | `^4.15` / `^1.7` | Form validation via `toTypedSchema` |
| Axios | `^1.17` | HTTP client — use only via `axiosApiInstance` |
| Vite | `^8.0` | Build tool |
| Vitest | `^4.1` | Unit + component tests (jsdom) |
| Node.js | `24.x` | Required runtime |

## Directory Structure

```
src/
  api-client/generated/   # AUTO-GENERATED — never edit; regenerate with: npm run generate-client
  assets/                 # Static assets (logos, images)
  components/             # Reusable UI components, grouped by domain
    admin/                # Admin-area components (personen/, rollen/, schulen/, klassen/, …)
    alert/                # SpshAlert.vue
    cards/                # LayoutCard.vue
    form/                 # FormWrapper.vue, FormRow.vue, PasswordOutput.vue, …
    layout/               # TheFooter.vue, TheHeader.vue, …
  composables/            # Vue composables — MUST follow `use` prefix naming
  layouts/                # AdminLayout.vue, DefaultLayout.vue
  locales/                # de-DE.json — ALL user-facing strings live here
  plugins/                # vuetify.ts, i18n.ts, pinia.ts
  router/                 # index.ts (guards + AppRouteMeta) + routes.ts
  services/               # ApiService.ts — single Axios instance
  stores/                 # Pinia stores + types/ subdirectory
  styles/                 # SCSS: main.scss, variables.scss, settings.scss
  utils/                  # Pure, side-effect-free helper functions
  views/                  # Route-level page components
    admin/                # Admin views
test/
  DoFactory.ts            # ONLY source of test data objects — always use this, never inline fabricate
```

## Rules by Category

### 1. Components

**MUST** use `<script setup lang="ts">` — Options API and bare `defineComponent` are forbidden.

**MUST** annotate all `Props` and `Emits` via typed interfaces:

```vue
<script setup lang="ts">
  import { ref, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';

  type Props = {
    label: string;
    disabled?: boolean;
  };
  const props: Props = defineProps<Props>();

  type Emits = {
    (event: 'onConfirm'): void;
  };
  const emit: Emits = defineEmits<Emits>();

  const { t }: Composer = useI18n({ useScope: 'global' });
  const isLoading: Ref<boolean> = ref(false);

  function handleClick(): void {
    emit('onConfirm');
  }
</script>

<template>
  <v-btn
    :disabled="props.disabled"
    :loading="isLoading"
    data-testid="my-button"
    @click="handleClick"
  >
    {{ t('someKey') }}
  </v-btn>
</template>

<style scoped lang="scss">
  @use '@/styles/variables';
</style>
```

**MUST** place every component's spec file next to the component: `MyComponent.vue` → `MyComponent.spec.ts`.

---

### 2. TypeScript — Mandatory Rules

The project enforces near-maximum strictness. **Violations are ESLint errors, not warnings.**

| Rule | Requirement |
|---|---|
| `@typescript-eslint/typedef` | Explicit type annotation on every variable, parameter, and return type |
| `@typescript-eslint/no-explicit-any` | `any` is forbidden — use `unknown` + type narrowing |
| `@typescript-eslint/explicit-function-return-type` | Every function MUST declare a return type |
| `@typescript-eslint/explicit-member-accessibility` | Every class member MUST declare `public` or `private` |
| `@typescript-eslint/no-unused-vars` | Prefix intentionally unused params/vars with `_` |
| `import/no-cycle` | Circular imports are forbidden |

```ts
// ✅ CORRECT
const count: Ref<number> = ref(0);
const items: ComputedRef<string[]> = computed((): string[] => []);
function fetchData(id: string): Promise<void> { ... }

// ❌ WRONG — implicit types, missing return type
const count = ref(0);
const fetchData = async (id) => { ... };
```

---

### 3. Pinia Stores

**MUST** follow this exact structure:

```ts
import { defineStore, type Store, type StoreDefinition } from 'pinia';
import { XApiFactory, type XApiInterface } from '@/api-client/generated/api';
import axiosApiInstance from '@/services/ApiService';
import { getResponseErrorCode } from '@/utils/errorHandlers';

// API instance MUST be at module level — never inside an action
const xApi: XApiInterface = XApiFactory(undefined, '', axiosApiInstance);

type XState = {
  currentItem: Item | null;
  errorCode: string;  // MUST be present on every store
  loading: boolean;   // MUST be present on every store
};

type XGetters = object;

type XActions = {
  loadItem: (id: string) => Promise<void>;
};

export type XStore = Store<'x', XState, XGetters, XActions>;
export type { XStore }; // MUST export the Store type for typed consumers

export const useXStore: StoreDefinition<'x', XState, XGetters, XActions> = defineStore('x', {
  state: (): XState => ({
    currentItem: null,
    errorCode: '',
    loading: false,
  }),
  actions: {
    async loadItem(id: string): Promise<void> {
      this.loading = true;
      try {
        const { data }: { data: Item } = await xApi.someEndpoint(id);
        this.currentItem = data;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'LOAD_ITEM_ERROR');
      } finally {
        this.loading = false;
      }
    },
  },
});
```

**MUST NOT** create API factory instances inside actions or components.  
**MUST** use `getResponseErrorCode` from `src/utils/errorHandlers.ts` for all caught errors.  
**MUST NOT** silently swallow errors — always set `this.errorCode`.

---

### 4. API Client

**MUST NOT** edit any file under `src/api-client/generated/` — this directory is auto-generated.

To regenerate after backend spec changes:
```bash
npm run generate-client
```

**MUST** route all HTTP calls through the shared singleton:
```ts
import axiosApiInstance from '@/services/ApiService';
```

`ApiService.ts` automatically:
- Injects `X-CSRF-Token` header from `AuthStore` on every request
- Redirects to `/api/auth/login` on `401` responses

---

### 5. Routing

**MUST** use `AppRouteMeta` for route metadata. **MUST** declare `requiresAuth`, `layout`, and `requiredStepUpLevel` on every protected route.

```ts
// routes.ts
{
  path: '/admin/example',
  name: 'example',
  component: () => import('../views/admin/ExampleView.vue'), // MUST lazy-load
  meta: {
    layout: 'AdminLayout',           // 'AdminLayout' | 'DefaultLayout'
    requiresAuth: true,
    requiredStepUpLevel: StepUpLevel.GOLD,   // NONE | SILVER | GOLD
    requiresPermission: 'personenverwaltung', // string | string[]
  } satisfies AppRouteMeta,
},
```

`StepUpLevel` and all valid `requiresPermission` strings are defined in `src/router/index.ts`.

---

### 6. Internationalisation (i18n)

**MUST** put every user-facing string in `src/locales/de-DE.json` — no hardcoded German in templates or scripts.

```ts
// In <script setup>
const { t }: Composer = useI18n({ useScope: 'global' });
const label: string = t('admin.person.create');

// In <template>
{{ $t('admin.person.create') }}
:label="$t('admin.person.create')"
```

**MUST NOT** pass `useScope: 'local'` — always use the global scope.

---

### 7. Form Validation

**MUST** use vee-validate + yup via `toTypedSchema`. **MUST** reuse existing regex constants from `src/utils/validation.ts`.

```ts
import { toTypedSchema } from '@vee-validate/yup';
import { useForm, type FormContext, type TypedSchema } from 'vee-validate';
import { object, string } from 'yup';
import { DIN_91379A, DDMMYYYY, NO_LEADING_TRAILING_SPACES } from '@/utils/validation';

const schema: TypedSchema = toTypedSchema(
  object({
    familienname: string().required().matches(DIN_91379A),
    befristung: string().matches(DDMMYYYY),
  }),
);

const { handleSubmit, defineField }: FormContext = useForm({ validationSchema: schema });
```

Available validators in `src/utils/validation.ts`: `DIN_91379A`, `DIN_91379A_EXT`, `DDMMYYYY`, `NO_LEADING_TRAILING_SPACES`, `HAS_LETTER_OR_NUMBER`.

---

### 8. Styling

**MUST** use Vuetify's `v-row` / `v-col` grid for layout; never raw CSS grid/flex on layout elements.  
**MUST** use `@use '@/styles/variables'` in scoped SCSS and reference SCSS variables — never hardcode hex values.  
**MUST** use `scoped` on all component `<style>` blocks.  
**MUST NOT** use inline `style` attributes in templates.  
**MAY** use `useDisplay()` from Vuetify for responsive breakpoint logic.

```scss
// ✅ CORRECT
@use '@/styles/variables';
.my-element { color: variables.$primaryColor; }

// ❌ WRONG
.my-element { color: #001e49; }
```

Custom Vuetify theme token: `shTheme` — defined in `src/plugins/vuetify.ts`.

---

### 9. Accessibility (a11y)

**MUST** add `aria-label` to icon-only buttons.  
**MUST** ensure `Enter` key triggers the same action as a click on table rows (follow the pattern in `src/components/admin/ResultTable.vue`).  
**MUST** use semantic Vuetify elements (`v-btn`, `v-nav`, etc.) — no generic `<div @click>` handlers.

---

### 10. `data-testid` Convention

**MUST** add `data-testid` to every interactive or semantically important element.  
Format: `kebab-case`, prefixed with the feature/component name.

```vue
<v-btn data-testid="create-person-button">…</v-btn>
<v-alert data-testid="person-creation-error-alert">…</v-alert>
<v-text-field data-testid="person-familienname-input" />
```

---

### 11. Testing

**Test file location:** co-located with source — `MyComponent.spec.ts` next to `MyComponent.vue`.

```bash
npm test          # watch mode
npm run test:ci   # single run with coverage (Istanbul)
```

**MUST** follow this setup pattern:

```ts
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import { DoFactory } from 'test/DoFactory';
import MockAdapter from 'axios-mock-adapter';
import axiosApiInstance from '@/services/ApiService';

const mockAdapter: MockAdapter = new MockAdapter(axiosApiInstance);

beforeEach((): void => {
  setActivePinia(createPinia());
  mockAdapter.reset();
});

afterEach((): void => {
  wrapper?.unmount(); // MUST unmount to prevent memory leaks
});
```

| Rule | Requirement |
|---|---|
| Test data | **MUST** use `DoFactory` — never fabricate raw objects inline in tests |
| HTTP mocking | **MUST** use `MockAdapter` — no real network calls in tests |
| Async store actions | **MUST** call `await flushPromises()` after triggering them |
| Store reset | **MUST** call `store.$reset()` in `beforeEach` for store unit tests |
| Global `vi` / `expect` | Available without import — Vitest globals are enabled |

---

## Anti-Patterns Reference

| Anti-pattern | MUST use instead |
|---|---|
| `any` type | `unknown` + type narrowing |
| `defineComponent` / Options API | `<script setup lang="ts">` |
| Inline `style="…"` | Vuetify props + scoped SCSS variables |
| Hardcoded German string in component | `$t('key')` + entry in `de-DE.json` |
| Editing `src/api-client/generated/` | Run `npm run generate-client` |
| `axios.create()` / `new Axios()` in a component or action | `import axiosApiInstance from '@/services/ApiService'` |
| `new SomeApi()` inside an action | Module-level factory: `const api = XApiFactory(undefined, '', axiosApiInstance)` |
| Catching error without setting `errorCode` | `this.errorCode = getResponseErrorCode(error, 'FALLBACK_CODE')` |
| Missing `data-testid` | Add `data-testid="…"` to all interactive elements |
| Missing return type on function | `function foo(): ReturnType { … }` |
| Missing type annotation on variable | `const x: string = '…'` |
| Circular imports | Refactor — `import/no-cycle` is an error |
