import { expect, test, type Mock, type MockInstance } from 'vitest';
import { VueWrapper, flushPromises, mount } from '@vue/test-utils';
import {
  createRouter,
  createWebHistory,
  type NavigationGuardNext,
  type RouteLocationNormalized,
  type Router,
} from 'vue-router';
import routes from '@/router/routes';
import { nextTick, type Component } from 'vue';
import { VRadioGroup } from 'vuetify/components';
import { OrganisationsTyp, useOrganisationStore, type OrganisationStore } from '@/stores/OrganisationStore';
import { DoFactory } from 'test/DoFactory';
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
vi.mock('vue-router', async (importOriginal: () => Promise<object>) => {
  const mod: object = await importOriginal();
  return {
    ...mod,
    onBeforeRouteLeave: vi.fn((actualCallback: OnBeforeRouteLeaveCallback) => {
      storedBeforeRouteLeaveCallback = actualCallback;
    }),
  };
});

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
    DoFactory.getOrganisation({
      id: '2',
      name: 'Öffentliches Land',
      namensergaenzung: 'Ergänzung',
      kennung: null,
      kuerzel: '',
      typ: OrganisationsTyp.Traeger,
      administriertVon: '1',
    }),
    DoFactory.getOrganisation({
      id: '3',
      name: 'Ersatz Land',
      namensergaenzung: 'Ergänzung',
      kennung: null,
      kuerzel: '',
      typ: OrganisationsTyp.Traeger,
      administriertVon: '1',
    }),
  ];

  organisationStore.currentOrganisation = DoFactory.getOrganisation({
    id: '4',
    name: 'Öffentlicher Träger',
    namensergaenzung: 'Ergänzung',
    kennung: null,
    kuerzel: '',
    typ: OrganisationsTyp.Traeger,
    administriertVon: '2',
  });

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

    organisationStore.updatedOrganisation = DoFactory.getOrganisation({
      id: '2',
      name: 'Öffentlicher Träger',
      namensergaenzung: 'Ergänzung',
      kennung: null,
      kuerzel: '',
      typ: OrganisationsTyp.Traeger,
      administriertVon: '1',
    });
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

  test('it edits the schultraeger name', async () => {
    organisationStore.updatedOrganisation = null;
    organisationStore.errorCode = '';
    await flushPromises();

    const schultraegerFormWrapper: VueWrapper<never, never> | undefined = wrapper?.findComponent({
      name: 'SchultraegerForm',
    });

    // the traeger type selection is disabled
    const schultraegerRadioGroup: VueWrapper<InstanceType<typeof VRadioGroup>> | undefined =
      schultraegerFormWrapper?.findComponent(VRadioGroup);
    expect(schultraegerRadioGroup?.attributes()['class']).toContain('v-input--disabled');
    expect(schultraegerRadioGroup?.props('modelValue')).toBe(organisationStore.currentOrganisation?.administriertVon);
    expect(
      schultraegerRadioGroup?.get<HTMLInputElement>(
        `input[type="radio"][value="${organisationStore.currentOrganisation?.administriertVon}"]`,
      ).element.checked,
    ).toBe(true);
    await nextTick();

    await schultraegerFormWrapper?.findComponent({ ref: 'schultraegername-input' }).setValue('Neuer Trägername');
    await nextTick();

    await wrapper?.find('[data-testid="schultraeger-edit-save-button"]').trigger('click');
    await nextTick();

    organisationStore.updatedOrganisation = DoFactory.getOrganisation({
      id: '2',
      name: 'Neuer Trägername',
      namensergaenzung: 'Ergänzung',
      kennung: null,
      kuerzel: '',
      typ: OrganisationsTyp.Traeger,
      administriertVon: '1',
    });
    await nextTick();

    const schultraegerSuccessTemplate: VueWrapper<never, never> | undefined = wrapper?.findComponent({
      name: 'SchultraegerSuccessTemplate',
    });

    expect(schultraegerSuccessTemplate?.find('[data-testid="schultraeger-success-text"]').text()).toBe(
      'Der Schulträger wurde erfolgreich bearbeitet.',
    );
  });

  describe('navigation interception', () => {
    test('it triggers if form is dirty', async () => {
      const expectedCallsToNext: number = 0;

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
