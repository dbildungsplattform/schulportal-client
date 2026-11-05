import routes from '@/router/routes';
import { useBulkOperationStore, type BulkOperationStore } from '@/stores/BulkOperationStore';
import type { Organisation } from '@/stores/OrganisationStore';
import { RollenArt } from '@/stores/RolleStore';
import type { Person } from '@/stores/types/Person';
import { PersonWithZuordnungen } from '@/stores/types/PersonWithZuordnungen';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import { faker } from '@faker-js/faker';
import { DOMWrapper, VueWrapper, flushPromises, mount } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import type { MockInstance } from 'vitest';
import { nextTick, type Component } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import PersonBulkChangeKlasse from './PersonBulkChangeKlasse.vue';
import { OperationType } from '@/stores/types/bulkOperationTypes';

let router: Router;
const bulkOperationStore: BulkOperationStore = useBulkOperationStore();
const storeKey: string = 'bulk-change-klasse'; // to find KlassenFilter components
const mockPersonIds: string[] = [faker.string.uuid(), faker.string.uuid(), faker.string.uuid(), faker.string.uuid()];
const mockPersons: Map<string, PersonWithZuordnungen> = new Map();
const mockSchule: Organisation = DoFactory.getSchule();
mockPersonIds.forEach((id: string) => {
  const person: Person = DoFactory.getPerson({ id });
  const klasse: Organisation = DoFactory.getKlasse(mockSchule);
  const zuordnung: Zuordnung = DoFactory.getZuordnung({ rollenArt: RollenArt.Lern }, { organisation: klasse });
  mockPersons.set(id, new PersonWithZuordnungen(person, [zuordnung]));
});
const mockKlassen: Array<Organisation> = [
  DoFactory.getKlasse(mockSchule),
  DoFactory.getKlasse(mockSchule),
  DoFactory.getKlasse(mockSchule),
  DoFactory.getKlasse(mockSchule),
];

type Props = {
  isDialogVisible: boolean;
  selectedPersonen: Map<string, PersonWithZuordnungen>;
  selectedSchuleId?: string;
};

function mountComponent(partialProps: Partial<Props> = {}): VueWrapper<InstanceType<typeof PersonBulkChangeKlasse>> {
  const props: Props = {
    isDialogVisible: true,
    selectedSchuleId: mockSchule.id,
    selectedPersonen: mockPersons,
    ...partialProps,
  };

  return mount(PersonBulkChangeKlasse, {
    attachTo: document.getElementById('app') || '',
    props,
    global: {
      components: {
        PersonBulkChangeKlasse: PersonBulkChangeKlasse as Component,
      },
      plugins: [router],
    },
  });
}

beforeEach(async () => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  router = createRouter({
    history: createWebHistory(),
    routes,
  });

  await router.push('/');
  await router.isReady();

  bulkOperationStore.resetState();
  vi.restoreAllMocks();
});

describe('PersonBulkChangeKlasse', () => {
  test('commit button should be disabled initially', async () => {
    mountComponent();
    await nextTick();
    const button: Element = document.querySelector('[data-testid="bulk-change-klasse-button"]')!;
    expect(button).not.toBeNull();
    expect(button.hasAttribute('disabled')).toBeTruthy();
  });

  test('button should be enabled when a new klasse is selected', async () => {
    const wrapper: VueWrapper = mountComponent() as VueWrapper;
    await nextTick();
    await wrapper
      .findComponent({ name: 'KlassenFilter' })
      .findComponent('[data-testid="bulk-change-klasse-klasse-select"]')
      .setValue(mockKlassen[0]!.id);
    const button: Element = document.querySelector('[data-testid="bulk-change-klasse-button"]')!;
    expect(button).not.toBeNull();
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  test('clicking the button should call the bulkOperationStore', async () => {
    const spy: MockInstance = vi.spyOn(bulkOperationStore, 'bulkChangeKlasse');
    const wrapper: VueWrapper = mountComponent() as VueWrapper;
    await nextTick();

    expect(spy).not.toHaveBeenCalled();

    await wrapper
      .findComponent({ name: 'KlassenFilter' })
      .findComponent('[data-testid="bulk-change-klasse-klasse-select"]')
      .setValue(mockKlassen[0]!.id);

    const button: Element = document.body.querySelector('[data-testid="bulk-change-klasse-button"]')!;
    expect(button).not.toBeNull();
    button.dispatchEvent(new Event('click'));
    await flushPromises();

    expect(spy).toHaveBeenCalledWith(mockPersonIds, mockSchule.id, mockKlassen[0]!.id);
  });

  test('if there are errors, it should display error dialog', async () => {
    const spy: MockInstance = vi.spyOn(bulkOperationStore, 'bulkChangeKlasse');
    spy.mockImplementationOnce(() => {
      mockPersonIds.forEach((id: string) => {
        bulkOperationStore.currentOperation?.errors.set(id, 'error');
      });
    });
    const wrapper: VueWrapper = mountComponent() as VueWrapper;
    await nextTick();

    expect(spy).not.toHaveBeenCalled();

    await wrapper
      .findComponent({ name: 'KlassenFilter' })
      .findComponent(`[data-testid="${storeKey}-klasse-select"]`)
      .setValue(mockKlassen[0]!.id);
    const button: Element = document.body.querySelector('[data-testid="bulk-change-klasse-button"]')!;
    expect(button).not.toBeNull();
    button.dispatchEvent(new Event('click'));
    await flushPromises();

    await nextTick();

    const errorDialog: VueWrapper = wrapper.findComponent({ name: 'PersonBulkError' });
    expect(errorDialog.exists()).toBe(true);
  });

  test('clicking the close-button should emit close-event', async () => {
    const wrapper: VueWrapper = mountComponent() as VueWrapper;
    await nextTick();

    const button: Element = document.body.querySelector('[data-testid="bulk-change-klasse-discard-button"]')!;
    expect(button).not.toBeNull();
    button.dispatchEvent(new Event('click'));
    await flushPromises();

    const events: Array<Array<unknown>> | undefined = wrapper.emitted('update:dialogExit');
    expect(events).toBeTruthy();
    expect(events).toEqual([[false]]);
  });

  describe('when operation is progressing', () => {
    beforeEach(() => {
      bulkOperationStore.currentOperation = {
        type: OperationType.CHANGE_KLASSE,
        isRunning: true,
        progress: 50,
        complete: false,
        errors: new Map(),
        data: new Map(),
      };
    });

    test('the progress template should be displayed', async () => {
      mountComponent();
      await nextTick();

      const successMessageElement: Element = document.querySelector('[data-testid="bulk-change-klasse-success-text"]')!;
      expect(successMessageElement).toBeNull();

      const progressingNoticeElement: Element = document.querySelector(
        '[data-testid="bulk-change-klasse-progressing-notice"]',
      )!;
      expect(progressingNoticeElement).not.toBeNull();

      const progressBarElement: Element = document.querySelector('[data-testid="bulk-change-klasse-progressbar"]')!;
      expect(progressBarElement).not.toBeNull();
      expect(progressBarElement.textContent).toContain('50%');
    });

    test('the success template should not be displayed', async () => {
      const wrapper: VueWrapper = mountComponent() as VueWrapper;
      await nextTick();

      const successMessageElement: DOMWrapper<Element> = wrapper.find(
        '[data-testid="bulk-change-klasse-success-text"]',
      );
      expect(successMessageElement.exists()).toBe(false);
    });
  });

  describe('when operation is complete', () => {
    beforeEach(() => {
      bulkOperationStore.currentOperation = {
        type: OperationType.CHANGE_KLASSE,
        isRunning: false,
        progress: 100,
        complete: true,
        errors: new Map(),
        data: new Map(),
      };
    });

    test('the success template should be displayed', async () => {
      mountComponent();
      await nextTick();

      const successMessageElement: Element = document.body.querySelector(
        '[data-testid="bulk-change-klasse-success-text"]',
      )!;
      expect(successMessageElement).not.toBeNull();
    });

    test('clicking the close-button should reset the bulkOperationStore', async () => {
      const spy: MockInstance = vi.spyOn(bulkOperationStore, 'resetState');
      spy.mockClear(); // clear mock call from setup
      const wrapper: VueWrapper = mountComponent() as VueWrapper;
      await nextTick();

      expect(spy).not.toHaveBeenCalled();

      const button: Element = document.body.querySelector('[data-testid="bulk-change-klasse-close-button"]')!;
      expect(button).not.toBeNull();
      button.dispatchEvent(new Event('click'));
      await flushPromises();

      expect(spy).toHaveBeenCalledOnce();

      const events: Array<Array<unknown>> | undefined = wrapper.emitted('update:dialogExit');
      expect(events).toBeTruthy();
      expect(events).toEqual([[true]]);
    });
  });
});
