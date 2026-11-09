import { useBulkOperationStore, type BulkOperationStore } from '@/stores/BulkOperationStore';
import type { PersonWithZuordnungen } from '@/stores/types/PersonWithZuordnungen';
import { OperationType } from '@/stores/types/bulkOperationTypes';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import type { Mock, MockInstance } from 'vitest';
import { nextTick } from 'vue';
import PersonBulkError from './PersonBulkError.vue';
import PersonBulkLock from './PersonBulkLock.vue';

describe('PersonBulkLock', (): void => {
  let wrapper: VueWrapper<InstanceType<typeof PersonBulkLock>>;
  let store: BulkOperationStore;
  let bulkLockPersonen: Mock<BulkOperationStore['bulkLockPersonen']>;
  let person: PersonWithZuordnungen;
  let schuleId: string;

  beforeEach(async (): Promise<void> => {
    store = useBulkOperationStore();
    store.$reset();
    bulkLockPersonen = vi.fn();
    store.bulkLockPersonen = bulkLockPersonen;
    person = DoFactory.getPersonWithZuordnung();
    schuleId = DoFactory.getSchule().id;
    wrapper = mount(PersonBulkLock, {
      attachTo: document.getElementById('app') || '',
      props: {
        isDialogVisible: true,
        selectedPersonen: new Map([[person.id, person]]),
        selectedSchuleId: schuleId,
        operationType: OperationType.LOCK_PERSON,
      },
    });
    await flushPromises();
  });

  afterEach((): void => {
    wrapper.unmount();
  });

  async function click(testId: string): Promise<void> {
    const button: Element | null = document.body.querySelector(`[data-testid="${testId}"]`);
    expect(button).not.toBeNull();
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
  }

  it('should confirm locking and submit the selected users', async (): Promise<void> => {
    expect(document.body.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Benutzer sperren');
    expect(document.body.textContent).toContain(
      'Eine Anmeldung am Schulportal SH ist dann für diese Benutzer nicht mehr möglich.',
    );
    await click('person-bulk-lock-submit-button');
    expect(bulkLockPersonen).toHaveBeenCalledWith([person.id], schuleId, OperationType.LOCK_PERSON);
  });

  it('should require both unlock confirmations before submitting', async (): Promise<void> => {
    await wrapper.setProps({ operationType: OperationType.UNLOCK_PERSON });

    expect(document.body.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Benutzer entsperren');
    const confirmation: Element | null = document.body.querySelector(
      '[data-testid="person-bulk-lock-confirmation-text"]',
    );
    expect(
      document.body.querySelector('[data-testid="person-bulk-lock-submit-button"]')?.getAttribute('aria-describedby'),
    ).toBe(confirmation?.id);
    expect(document.body.textContent).toContain('Möchten Sie die ausgewählten Benutzer wirklich entsperren?');
    expect(document.body.querySelector('[data-testid="person-bulk-lock-submit-button"]')?.textContent).toContain(
      'Weiter',
    );

    await click('person-bulk-lock-submit-button');

    expect(bulkLockPersonen).not.toHaveBeenCalled();
    expect(document.body.querySelector('[data-testid="person-bulk-lock-confirmation-text"]')).toBe(confirmation);
    expect(document.body.textContent).toContain(
      'Ich bestätige, dass ich mit der sperrenden Stelle geklärt habe, dass die Sperren aufgehoben werden dürfen.',
    );

    await click('person-bulk-lock-submit-button');

    expect(bulkLockPersonen).toHaveBeenCalledWith([person.id], schuleId, OperationType.UNLOCK_PERSON);
  });

  describe('when cancelling in the first unlock step', (): void => {
    it('should cancel without a request', async (): Promise<void> => {
      await wrapper.setProps({ operationType: OperationType.UNLOCK_PERSON });
      await click('person-bulk-lock-cancel-button');

      expect(bulkLockPersonen).not.toHaveBeenCalled();
      expect(wrapper.emitted('update:dialogExit')).toEqual([[false]]);
    });
  });

  describe('when cancelling in the second unlock step', (): void => {
    it('should cancel without a request', async (): Promise<void> => {
      await wrapper.setProps({ operationType: OperationType.UNLOCK_PERSON });
      await click('person-bulk-lock-submit-button');
      await click('person-bulk-lock-cancel-button');

      expect(bulkLockPersonen).not.toHaveBeenCalled();
      expect(wrapper.emitted('update:dialogExit')).toEqual([[false]]);
    });
  });

  it('should show progress and prevent cancellation from the first pending request', async (): Promise<void> => {
    store.bulkLockPersonen = vi.fn((): Promise<void> => {
      store.currentOperation = {
        type: OperationType.LOCK_PERSON,
        isRunning: true,
        complete: false,
        progress: 0,
        errors: new Map(),
        data: new Map(),
      };
      return Promise.resolve();
    });
    await click('person-bulk-lock-submit-button');

    expect(document.body.textContent).toContain(
      'Bitte schließen Sie diesen Tab nicht, bis die Aktion vollständig ausgeführt wurde.',
    );
    expect(document.body.querySelector('[data-testid="person-bulk-lock-progress"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="person-bulk-lock-cancel-button"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="person-bulk-lock-submit-button"]')).toBeNull();
  });

  describe('when locking completes successfully', (): void => {
    it('should show success and close after completion', async (): Promise<void> => {
      await wrapper.setProps({ operationType: OperationType.LOCK_PERSON });
      store.currentOperation = {
        type: OperationType.LOCK_PERSON,
        isRunning: false,
        complete: true,
        progress: 100,
        errors: new Map(),
        data: new Map(),
        successMessage: 'admin.person.bulkLock.success',
      };
      await nextTick();

      expect(document.body.textContent).toContain('Die Benutzer wurden erfolgreich gesperrt.');
      const resetState: MockInstance = vi.spyOn(store, 'resetState');
      await click('person-bulk-lock-close-button');
      expect(wrapper.emitted('update:dialogExit')).toEqual([[true]]);
      expect(resetState).toHaveBeenCalledOnce();
    });
  });

  describe('when unlocking completes successfully', (): void => {
    it('should show success and close after completion', async (): Promise<void> => {
      await wrapper.setProps({ operationType: OperationType.UNLOCK_PERSON });
      store.currentOperation = {
        type: OperationType.UNLOCK_PERSON,
        isRunning: false,
        complete: true,
        progress: 100,
        errors: new Map(),
        data: new Map(),
        successMessage: 'admin.person.bulkUnlock.success',
      };
      await nextTick();
      expect(document.body.textContent).toContain('Die Benutzer wurden erfolgreich entsperrt.');
      const resetState: MockInstance = vi.spyOn(store, 'resetState');
      await click('person-bulk-lock-close-button');
      expect(wrapper.emitted('update:dialogExit')).toEqual([[true]]);
      expect(resetState).toHaveBeenCalledOnce();
    });
  });

  it('should list failed users with a CSV download and finish when the error dialog closes', async (): Promise<void> => {
    store.bulkLockPersonen = vi.fn((): Promise<void> => {
      store.currentOperation = {
        type: OperationType.LOCK_PERSON,
        isRunning: false,
        complete: true,
        progress: 100,
        errors: new Map([[person.id, 'UNSPECIFIED_ERROR']]),
        data: new Map(),
      };
      return Promise.resolve();
    });
    await click('person-bulk-lock-submit-button');

    expect(wrapper.getComponent(PersonBulkError).props('errors')).toEqual([
      expect.objectContaining({ username: person.username }),
    ]);
    expect(document.body.querySelector('[data-testid="person-bulk-error-save-button"]')?.textContent).toContain(
      'Liste speichern',
    );
    await click('person-bulk-error-discard-button');
    await click('confirm-close-bulk-error-dialog-button');
    expect(wrapper.emitted('update:dialogExit')).toEqual([[true]]);
  });
});
