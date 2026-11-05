---
name: tdd-loop
description: 'Run a test-driven development loop for features and bug fixes. Use when tdd, test-driven development or red-green are mentioned.'
argument-hint: 'Describe goal, bug, or feature to drive with TDD'
---

# TDD Loop

Drive work in short red -> green cycles.

## Core Rules

- Behavior must be clarified by user. Do not assume behavior.
- Do not one-shot multiple tests. One test and one implementation change at a time.
- Never change implementation without a failing test that covers the implementation.
- Do not continue with the next step until the current step produces the expected result.
- Prefer running single tests. Use workspace actions or tools if possible.

## Loop

The core idea is to create a minimal failing test for a behavior, then make the smallest change to pass that test. Repeat this process until the desired behavior is fully implemented and validated.

1. Identify desired behavior. Clarify with the user if necessary.
2. Inspect existing implementation and tests.
3. Identify one falsifiable aspect of the desired behavior.
4. Encode the aspect in a test and verify that it fails.
5. Apply the smallest change to the implementation that makes the test pass.
6. Repeat until all aspects of the desired behavior are implemented.

## Additional information about tests

### Shared Test Setup

Tests use Vitest with:

`jsdom` as the test environment
Global Vitest APIs such as `describe`, `it`, `test`, `expect`, `beforeEach`, and `vi`
Vue Test Utils for component and view mounting
Global `vue-i18n`, `Pinia`, and `Vuetify` plugins configured in `vitest.setup.ts`
The `@` alias for `src` and `test` alias for test utilities, configured in `vitest.config.ts`
Tests are discovered from `src/**/*.spec.ts`.

### Structure of a test file

```typescript
import dependencies from '...';
import Subject from './Subject';

describe('Subject', () => {
  let subjectOrWrapper;

  beforeEach(() => {
    // Create isolated state, mocks, DOM, or mounted subject.
  });

  afterEach(() => {
    // Restore timers or other global state when necessary.
  });

  it('handles the default state', () => {
    // Arrange
    // Act
    // Assert
  });

  describe('specific behavior', () => {
    it('handles the success case', async () => {
      // Arrange
      // Act
      // Assert
    });

    it('handles the error or alternate case', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```
