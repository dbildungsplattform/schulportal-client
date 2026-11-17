import { expect, test, type Mock, type MockInstance } from 'vitest';
import { DOMWrapper, VueWrapper, flushPromises, mount } from '@vue/test-utils';
import {
  createRouter,
  createWebHistory,
  type NavigationGuardNext,
  type RouteLocationNormalized,
  type Router,
} from 'vue-router';
import routes from '@/router/routes';
import { nextTick, type Component } from 'vue';
import {
  OrganisationsTyp,
  SchuleType,
  useOrganisationStore,
  type Organisation,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
import SchultraegerDetailsView from './SchultraegerDetailsView.vue';

let wrapper: VueWrapper | null = null;
let router: Router;
let organisationStore: OrganisationStore;

type OnBeforeRouteLeaveCallback = (
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  _next: NavigationGuardNext,
) => void;

let { storedBeforeRouteLeaveCallback }: { storedBeforeRouteLeaveCallback: OnBeforeRouteLeaveCallback } = vi.hoisted(
  () => {
    return {
      storedBeforeRouteLeaveCallback: (
        _to: RouteLocationNormalized,
        _from: RouteLocationNormalized,
        _next: NavigationGuardNext,
      ): void => {
        // intentionally left blank for test hoisting
      },
    };
  },
);

type FormFields = {
  schultraegerName: string;
};

type FormSelectors = {
  schultraegerNameInput: VueWrapper;
};

async function fillForm(args: Partial<FormFields>): Promise<Partial<FormSelectors>> {
  const { schultraegerName }: Partial<FormFields> = args;
  const selectors: Partial<FormSelectors> = {};

  const schultraegerNameInput: VueWrapper | undefined = wrapper
    ?.findComponent({ ref: 'schultraeger-edit-form' })
    .findComponent({ ref: 'schultraegername-input' });
  expect(schultraegerNameInput?.exists()).toBe(true);

  await schultraegerNameInput?.setValue(schultraegerName);
  await nextTick();
  selectors.schultraegerNameInput = schultraegerNameInput;

  return selectors;
}

async function mountComponent(): Promise<ReturnType<typeof mount<typeof SchultraegerDetailsView>>> {
  await vi.dynamicImportSettled();
  return mount(SchultraegerDetailsView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        SchultraegerDetailsView: SchultraegerDetailsView as Component,
      },
      plugins: [router],
    },
  });
}

beforeEach(async () => {
  Object.defineProperty(window, 'location', {
    value: {
      href: '',
      reload: vi.fn(),
    },
    writable: true,
  });

  Object.defineProperty(window, 'history', {
    value: {
      go: vi.fn(),
      pushState: vi.fn(),
      replaceState: vi.fn(),
    },
    writable: true,
  });

  document.body.innerHTML = `
    <div>
        <router-view>
            <div id="app"></div>
         </router-view>
    </div>
  `;

  organisationStore = useOrganisationStore();

  organisationStore.rootChildren = [
    {
      id: '2',
      name: 'Öffentliches Land',
      namensergaenzung: 'Ergänzung',
      kennung: null,
      kuerzel: '',
      typ: OrganisationsTyp.Traeger,
      zugehoerigZu: '1',
      administriertVon: '1',
    },
    {
      id: '3',
      name: 'Ersatz Land',
      namensergaenzung: 'Ergänzung',
      kennung: null,
      kuerzel: '',
      typ: OrganisationsTyp.Traeger,
      zugehoerigZu: '1',
      administriertVon: '1',
    },
  ];

  organisationStore.currentOrganisation = {
    id: '4',
    name: 'Öffentlicher Träger',
    namensergaenzung: 'Ergänzung',
    kennung: null,
    kuerzel: '',
    typ: OrganisationsTyp.Traeger,
    zugehoerigZu: '2',
    administriertVon: '2',
  };

  organisationStore.schulenWithoutTraeger = [
    {
      id: '10',
      name: 'Öffentliche Schule A',
      namensergaenzung: 'Ergänzung',
      kennung: '123456',
      kuerzel: '',
      typ: OrganisationsTyp.Traeger,
      zugehoerigZu: '2',
      administriertVon: '2',
    },
    {
      id: '11',
      name: 'Öffentliche Schule B',
      namensergaenzung: 'Ergänzung',
      kennung: '465456',
      kuerzel: '',
      typ: OrganisationsTyp.Schule,
      zugehoerigZu: '2',
      administriertVon: '2',
    },
    {
      id: '12',
      name: 'Ersatzschule B',
      namensergaenzung: 'Ergänzung',
      kennung: '12345678',
      kuerzel: '',
      typ: OrganisationsTyp.Schule,
      zugehoerigZu: '3',
      administriertVon: '3',
    },
  ];

  organisationStore.schulenFromTraeger = [
    {
      id: '9',
      name: 'Zugeordnete Schule A',
      namensergaenzung: 'Ergänzung',
      kennung: null,
      kuerzel: '',
      typ: OrganisationsTyp.Schule,
      zugehoerigZu: '4',
      administriertVon: '4',
    },
    {
      id: '13',
      name: 'Zugeordnete Schule B',
      namensergaenzung: 'Ergänzung',
      kennung: null,
      kuerzel: '',
      typ: OrganisationsTyp.Schule,
      zugehoerigZu: '4',
      administriertVon: '4',
    },
    {
      id: '135',
      name: 'Zugeordnetes Gymnasium',
      namensergaenzung: 'Ergänzung',
      kennung: null,
      kuerzel: '',
      typ: OrganisationsTyp.Schule,
      zugehoerigZu: '4',
      administriertVon: '4',
    },
  ];

  organisationStore.errorCode = '';
  organisationStore.updatedOrganisation = null;

  router = createRouter({
    history: createWebHistory(),
    routes,
  });

  router.push({ name: 'schultraeger-details', params: { id: '2' } });
  await router.isReady();

  wrapper = await mountComponent();
});

afterEach(() => {
  vi.restoreAllMocks();
  wrapper?.unmount();
});

describe('SchultraegerDetailsView', () => {
  test('it renders all child components', async () => {
    expect(wrapper?.getComponent({ name: 'LayoutCard' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'SpshAlert' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'SchultraegerForm' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'RelationshipAssign' })).toBeTruthy();

    organisationStore.updatedOrganisation = {
      id: '2',
      name: 'Öffentlicher Träger',
      namensergaenzung: 'Ergänzung',
      kennung: null,
      kuerzel: '',
      typ: OrganisationsTyp.Traeger,
      zugehoerigZu: '1',
      administriertVon: '1',
    };
    await nextTick();

    expect(wrapper?.getComponent({ name: 'SchultraegerSuccessTemplate' })).toBeTruthy();

    organisationStore.updatedOrganisation = null;
    await nextTick();
  });

  test('it navigates back to Schultraeger management', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');
    await wrapper?.find('[data-testid="close-layout-card-button"]').trigger('click');
    expect(push).toHaveBeenCalledTimes(1);
    expect(wrapper?.findComponent({ ref: 'result-table' }).exists());
  });

  test('it closes the alert', async () => {
    organisationStore.errorCode = 'MOCK_ERROR';
    await nextTick();

    const push: MockInstance = vi.spyOn(router, 'push');
    await wrapper?.find('[data-testid$="alert-button"]').trigger('click');
    await nextTick();

    expect(push).toHaveBeenCalledTimes(1);
  });

  test.skip('it calls addAssignableSchule when an unassigned item is clicked and then searches for it', async () => {
    interface SchultraegerDetailsView {
      unpersistedSchulenToAssign: string[];
      unassignedSchulen: Organisation[];
    }

    const unassignedItem: Organisation = organisationStore.schulenWithoutTraeger[0]!;

    const unpersistedSchulenToAssign: string[] = (wrapper?.vm as unknown as SchultraegerDetailsView)
      .unpersistedSchulenToAssign;
    const unassignedSchulen: Organisation[] = (wrapper?.vm as unknown as SchultraegerDetailsView).unassignedSchulen;

    // Simulate the event being triggered on RelationshipAssign
    const relationshipAssignWrapper: VueWrapper = wrapper?.findComponent({ name: 'RelationshipAssign' }) as VueWrapper;
    relationshipAssignWrapper.vm.$emit('onHandleUnassignedItemClick', unassignedItem);
    await nextTick();

    expect(unpersistedSchulenToAssign.some((schule: string) => schule === unassignedItem.id)).toBeTruthy();

    // Now simulate a search for the already assigned Schule.
    relationshipAssignWrapper.vm.$emit(
      'onHandleUnassignedItemsSearchFilter',
      'Öffentliche Schule A',
      SchuleType.UNASSIGNED,
    );
    await nextTick();

    // The unassignedSchulen should be empty because the Schule was already assigned
    // TODO: unassignedSchulen are always empty, so this test does not do anything
    expect(unassignedSchulen).toEqual([]);
  });

  test.skip('it calls addUnassignableSchule when an assigned item is clicked and then searches for it', async () => {
    interface SchultraegerDetailsView {
      unpersistedSchulenToUnassign: string[];
      assignedSchulen: Organisation[];
    }

    const assignedItem: Organisation = organisationStore.schulenFromTraeger[0]!;

    const unpersistedSchulenToUnassign: string[] = (wrapper?.vm as unknown as SchultraegerDetailsView)
      .unpersistedSchulenToUnassign;
    const assignedSchulen: Organisation[] = (wrapper?.vm as unknown as SchultraegerDetailsView).assignedSchulen;

    // Simulate the event being triggered on RelationshipAssign
    const relationshipAssignWrapper: VueWrapper = wrapper?.findComponent({ name: 'RelationshipAssign' }) as VueWrapper;
    relationshipAssignWrapper.vm.$emit('onHandleAssignedItemClick', assignedItem);
    await flushPromises();

    expect(unpersistedSchulenToUnassign.some((schule: string) => schule === assignedItem.id)).toBeTruthy();

    // Now simulate a search for the unassigned Schule.
    const relationshipAssignComponent: VueWrapper = wrapper?.findComponent({
      name: 'RelationshipAssign',
    }) as VueWrapper;
    relationshipAssignComponent.vm.$emit(
      'onHandleAssignedItemsSearchFilter',
      'Zugeordnete Schule A',
      SchuleType.ASSIGNED,
    );
    await flushPromises();

    // TODO: The assignedSchulen should only contain one schule after the search
    expect(assignedSchulen.length).toEqual(2);
  });

  test('it assigns a new schule and unassigns an existing schule', async () => {
    if (!wrapper) {
      return;
    }

    organisationStore.updatedOrganisation = null;
    organisationStore.errorCode = '';
    await nextTick();

    interface SchultraegerDetailsView {
      assignedSchulen: Organisation[];
      unassignedSchulen: Organisation[];
      unpersistedSchulenToAssign: string[];
      unpersistedSchulenToUnassign: string[];
    }

    const firstAssignedSchule: Organisation = organisationStore.schulenFromTraeger[0]!;
    const firstUnassignedSchule: Organisation = organisationStore.schulenWithoutTraeger[0]!;

    let assignedSchulen: Organisation[] = (wrapper.vm as unknown as SchultraegerDetailsView).assignedSchulen;
    let unassignedSchulen: Organisation[] = (wrapper.vm as unknown as SchultraegerDetailsView).unassignedSchulen;

    expect(assignedSchulen[0]).toEqual(firstAssignedSchule);
    /* unassignedSchulen equals empty array, since the list is empty in the beginning */
    expect(unassignedSchulen).toEqual([]);

    let unpersistedSchulenToAssign: string[] = (wrapper.vm as unknown as SchultraegerDetailsView)
      .unpersistedSchulenToAssign;
    let unpersistedSchulenToUnassign: string[] = (wrapper.vm as unknown as SchultraegerDetailsView)
      .unpersistedSchulenToUnassign;

    expect(unpersistedSchulenToAssign).toHaveLength(0);
    expect(unpersistedSchulenToUnassign).toHaveLength(0);

    /* search for unassigned schulen and click first item in list */
    const unassignedItemsList: VueWrapper = wrapper
      .findComponent({ name: 'RelationshipAssign' })
      .findComponent({ ref: 'unassignedItemsList' });

    unassignedItemsList.find('[data-testid="search-filter-input"] input').setValue('Öffentliche Schule');
    unassignedItemsList.find('[data-testid="apply-search-filter-button"]').trigger('click');
    await flushPromises();

    const unassignedListItems: DOMWrapper<Element>[] | undefined = unassignedItemsList.findAll(
      '[data-testid^="assign-list-item-"]',
    );
    await unassignedListItems[0]?.trigger('click');
    await flushPromises();

    /* click second item in assigned schulen list, since first item should now be the unpersisted schule to assign */
    const assignedItemsList: VueWrapper = wrapper
      .findComponent({ name: 'RelationshipAssign' })
      .findComponent({ ref: 'assignedItemsList' });

    const assignedListItems: DOMWrapper<Element>[] | undefined = assignedItemsList.findAll(
      '[data-testid^="assign-list-item-"]',
    );
    await assignedListItems[1]?.trigger('click');
    await flushPromises();

    assignedSchulen = (wrapper.vm as unknown as SchultraegerDetailsView).assignedSchulen;
    unassignedSchulen = (wrapper.vm as unknown as SchultraegerDetailsView).unassignedSchulen;

    /* expect first item of each list to have changed */
    expect(assignedSchulen[0]).toEqual({ ...firstUnassignedSchule, isNotPersisted: true });
    expect(unassignedSchulen[0]).toEqual({ ...firstAssignedSchule, isNotPersisted: true });

    unpersistedSchulenToAssign = (wrapper.vm as unknown as SchultraegerDetailsView).unpersistedSchulenToAssign;
    unpersistedSchulenToUnassign = (wrapper.vm as unknown as SchultraegerDetailsView).unpersistedSchulenToUnassign;

    expect(unpersistedSchulenToAssign).toHaveLength(1);
    expect(unpersistedSchulenToUnassign).toHaveLength(1);

    await wrapper.find('[data-testid="schultraeger-edit-save-button"]').trigger('click');
  });

  test('it edits the schultraeger name', async () => {
    organisationStore.updatedOrganisation = null;
    organisationStore.errorCode = '';
    await nextTick();

    const schultraegerFormWrapper: VueWrapper<never, never> | undefined = wrapper?.findComponent({
      name: 'SchultraegerForm',
    });

    // the traeger type selection is disabled
    const schultraegerRadioGroup: DOMWrapper<HTMLElement> | undefined = schultraegerFormWrapper?.find(
      '[data-testid="schultraegerform-radio-group"]',
    );
    expect(schultraegerRadioGroup?.attributes()['class']).toContain('v-input--disabled');
    await nextTick();

    await schultraegerFormWrapper?.findComponent({ ref: 'schultraegername-input' }).setValue('Neuer Trägername');
    await nextTick();

    await wrapper?.find('[data-testid="schultraeger-edit-save-button"]').trigger('click');
    await nextTick();

    organisationStore.updatedOrganisation = {
      id: '2',
      name: 'Neuer Trägername',
      namensergaenzung: 'Ergänzung',
      kennung: null,
      kuerzel: '',
      typ: OrganisationsTyp.Traeger,
      zugehoerigZu: '1',
      administriertVon: '1',
    };
    await nextTick();

    const schultraegerSuccessTemplate: VueWrapper<never, never> | undefined = wrapper?.findComponent({
      name: 'SchultraegerSuccessTemplate',
    });

    expect(schultraegerSuccessTemplate?.find('[data-testid="schultraeger-success-text"]').text()).toBe(
      'Der Schulträger wurde erfolgreich bearbeitet.',
    );
  });

  test('it searches for unassigned schulen', async () => {
    if (!wrapper) {
      return;
    }

    organisationStore.updatedOrganisation = null;
    organisationStore.errorCode = '';
    await nextTick();

    const unassignedItemsList: VueWrapper = wrapper
      .findComponent({ name: 'RelationshipAssign' })
      .findComponent({ ref: 'unassignedItemsList' });

    unassignedItemsList.find('[data-testid="search-filter-input"] input').setValue('Öffentliche Schule');
    unassignedItemsList.find('[data-testid="apply-search-filter-button"]').trigger('click');
    await flushPromises();

    let unassignedListItems: DOMWrapper<Element>[] | undefined = unassignedItemsList.findAll(
      '[data-testid^="assign-list-item-"]',
    );
    expect(unassignedListItems).toHaveLength(2);

    unassignedItemsList.find('[data-testid="search-filter-input"] input').setValue('');
    unassignedItemsList.find('[data-testid="apply-search-filter-button"]').trigger('click');
    await flushPromises();

    unassignedListItems = unassignedItemsList.findAll('[data-testid^="assign-list-item-"]');
    expect(unassignedListItems).toHaveLength(0);
  });

  test('it searches for assigned schulen', async () => {
    if (!wrapper) {
      return;
    }

    organisationStore.updatedOrganisation = null;
    organisationStore.errorCode = '';
    await nextTick();

    const relationshipAssignComponent: VueWrapper = wrapper.findComponent({ name: 'RelationshipAssign' });
    const assignedItemsList: VueWrapper = relationshipAssignComponent.findComponent({ ref: 'assignedItemsList' });

    // Verify initial state
    const initialItems: DOMWrapper<Element>[] = assignedItemsList.findAll('[data-testid^="assign-list-item-"]');
    expect(initialItems).toHaveLength(3);

    // Mock the filter function to avoid the null error
    const searchInput: DOMWrapper<Element> = assignedItemsList.find('[data-testid="search-filter-input"] input');
    await searchInput.setValue('Gymnasium');

    // Instead of triggering the click event directly and then emitting separately,
    // we can simulate the entire search process as it would happen in the component
    const searchButton: DOMWrapper<Element> = assignedItemsList.find('[data-testid="apply-search-filter-button"]');
    await searchButton.trigger('click');

    // Force the component to update
    await flushPromises();

    // Check that the filtered list has the expected length
    const filteredItems: DOMWrapper<Element>[] = assignedItemsList.findAll('[data-testid^="assign-list-item-"]');
    expect(filteredItems).toHaveLength(1);
  });

  describe('navigation interception', () => {
    afterEach(() => {
      vi.unmock('vue-router');
    });

    test('it triggers if form is dirty', async () => {
      const expectedCallsToNext: number = 0;
      vi.mock('vue-router', async (importOriginal: () => Promise<object>) => {
        const mod: object = await importOriginal();
        return {
          ...mod,
          onBeforeRouteLeave: vi.fn((actualCallback: OnBeforeRouteLeaveCallback) => {
            storedBeforeRouteLeaveCallback = actualCallback;
          }),
        };
      });

      wrapper = await mountComponent();
      await fillForm({
        schultraegerName: 'Traeger 1',
      });
      await nextTick();

      const spy: Mock = vi.fn();
      storedBeforeRouteLeaveCallback({} as RouteLocationNormalized, {} as RouteLocationNormalized, spy);
      expect(spy).toHaveBeenCalledTimes(expectedCallsToNext);
      await nextTick();

      const confirmButton: Element | null = document.querySelector('[data-testid="confirm-unsaved-changes-button"]');
      expect(confirmButton).not.toBeNull();
      confirmButton!.dispatchEvent(new Event('click'));
      expect(spy).toHaveBeenCalledOnce();
    });

    test('it does not trigger if form is not dirty', async () => {
      const expectedCallsToNext: number = 1;
      vi.mock('vue-router', async (importOriginal: () => Promise<object>) => {
        const mod: object = await importOriginal();
        return {
          ...mod,
          onBeforeRouteLeave: vi.fn((actualCallback: OnBeforeRouteLeaveCallback) => {
            storedBeforeRouteLeaveCallback = actualCallback;
          }),
        };
      });
      wrapper = await mountComponent();
      const spy: Mock = vi.fn();
      storedBeforeRouteLeaveCallback({} as RouteLocationNormalized, {} as RouteLocationNormalized, spy);
      expect(spy).toHaveBeenCalledTimes(expectedCallsToNext);
    });
  });

  describe.each([[true], [false]])('when form is dirty:%s', (isFormDirty: boolean) => {
    beforeEach(async () => {
      await fillForm({
        schultraegerName: 'Traeger 1',
      });
      await nextTick();
    });

    test('it handles unloading', () => {
      const event: Event = new Event('beforeunload');
      const spy: MockInstance = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);

      if (isFormDirty) {
        expect(spy).toHaveBeenCalled();
      } else {
        expect(spy).not.toHaveBeenCalledOnce();
      }
    });
  });
});
