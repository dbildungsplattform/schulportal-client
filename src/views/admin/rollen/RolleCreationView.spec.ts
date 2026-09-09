import {
  RollenSystemRechtEnum,
  type ServiceProviderResponse,
  type SystemRechtResponse,
} from '@/api-client/generated/api';
import routes from '@/router/routes';
import { useOrganisationStore, type Organisation, type OrganisationStore } from '@/stores/OrganisationStore';
import { useRolleStore, type RolleResponse, type RolleStore } from '@/stores/RolleStore';
import { useServiceProviderStore, type ServiceProviderStore } from '@/stores/ServiceProviderStore';
import { getDisplayNameForOrg } from '@/utils/formatting';
import { flushPromises, mount, VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { expect, test, type Mock, type MockInstance } from 'vitest';
import { nextTick, type Component } from 'vue';
import {
  createRouter,
  createWebHistory,
  type NavigationGuardNext,
  type RouteLocationNormalized,
  type Router,
} from 'vue-router';
import RolleCreationView from './RolleCreationView.vue';

let wrapper: VueWrapper | null = null;
let router: Router;
const rolleStore: RolleStore = useRolleStore();
const organisationStore: OrganisationStore = useOrganisationStore();
const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();

const organisationObject: Organisation = DoFactory.getOrganisation();

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

async function mountComponent(): Promise<ReturnType<typeof mount<typeof RolleCreationView>>> {
  await vi.dynamicImportSettled();
  return mount(RolleCreationView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        RolleCreationView: RolleCreationView as Component,
      },
      plugins: [router],
    },
  });
}

type FormFields = {
  organisation: string;
  rollenart: string;
  rollenname: string;
  merkmale: Array<string>;
  provider: Array<string>;
  systemrechte: Array<string>;
};
type FormSelectors = {
  orgSelect: VueWrapper;
  rollenartSelect: VueWrapper;
  rollennameInput: VueWrapper;
  merkmaleSelect: VueWrapper;
  providerSelect: VueWrapper;
  systemrechteSelect: VueWrapper;
};

async function fillForm(args: Partial<FormFields>): Promise<Partial<FormSelectors>> {
  const { organisation, rollenart, rollenname, merkmale, provider, systemrechte }: Partial<FormFields> = args;
  const selectors: Partial<FormSelectors> = {};
  if (organisation) {
    const orgSelect: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'rolle-creation-form' })
      .findComponent({ name: 'SchulenFilter' })
      .findComponent({ ref: 'rolle-form-organisation-select' });
    await orgSelect?.setValue(organisation);
    const schulenFilterComponent: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'rolle-creation-form' })
      .findComponent({ name: 'SchulenFilter' });
    (schulenFilterComponent?.vm as unknown as { $emit: (event: string, ...args: unknown[]) => void }).$emit(
      'update:selectedSchulen',
      organisation,
    );
    await nextTick();
    selectors.orgSelect = orgSelect;
  }

  if (rollenart) {
    const rollenartSelect: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'rolle-creation-form' })
      .findComponent({ ref: 'rollenart-select' });
    rollenartSelect?.setValue(rollenart);
    await nextTick();
    selectors.rollenartSelect = rollenartSelect;
  }

  if (rollenname) {
    const rollennameInput: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'rolle-creation-form' })
      .findComponent({ ref: 'rollenname-input' });
    expect(rollennameInput?.exists()).toBe(true);
    await rollennameInput?.find('input').setValue(rollenname);
    await nextTick();
    selectors.rollennameInput = rollennameInput;
  }

  if (merkmale) {
    const merkmaleSelect: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'rolle-creation-form' })
      .findComponent({ ref: 'merkmale-select' });
    merkmaleSelect?.setValue(merkmale);
    await nextTick();
    selectors.merkmaleSelect = merkmaleSelect;
  }

  if (provider) {
    const providerSelect: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'rolle-creation-form' })
      .findComponent({ ref: 'service-provider-select' });
    providerSelect?.setValue(provider);
    await nextTick();
    selectors.providerSelect = providerSelect;
  }

  if (systemrechte) {
    const systemrechteSelect: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'rolle-creation-form' })
      .findComponent({ ref: 'systemrechte-select' });
    systemrechteSelect?.setValue(systemrechte);
    await nextTick();
    selectors.systemrechteSelect = systemrechteSelect;
  }
  await flushPromises();
  return selectors;
}

beforeEach(async () => {
  document.body.innerHTML = `
    <div>
      <router-view>
        <div id="app"></div>
      </router-view>
    </div>
  `;

  router = createRouter({
    history: createWebHistory(),
    routes,
  });

  router.push('/');
  await router.isReady();

  wrapper = await mountComponent();

  rolleStore.errorCode = '';
  organisationStore.organisationenFilters.set('rolle-form', {
    total: 1,
    loading: false,
    filterResult: [organisationObject],
  });
});

afterEach(() => {
  organisationStore.$reset();
  rolleStore.$reset();
  wrapper?.unmount();
  // Restore real timers
  vi.useRealTimers();
});

describe('RolleCreationView', () => {
  const mockRolle: RolleResponse = DoFactory.getRolleResponse({
    administeredBySchulstrukturknoten: organisationObject.id,
    administeredBySchulstrukturknotenName: organisationObject.name,
    administeredBySchulstrukturknotenKennung: organisationObject.kennung,
  });

  test('it renders all child components', () => {
    expect(wrapper?.getComponent({ name: 'LayoutCard' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'SpshAlert' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'FormWrapper' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'FormRow' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'RolleForm' })).toBeTruthy();
  });

  test('it renders an error', async () => {
    rolleStore.errorCode = 'ERROR_ERROR';
    await nextTick();
    const push: MockInstance = vi.spyOn(router, 'push');
    wrapper?.find('[data-testid$="alert-button"]').trigger('click');
    await nextTick();
    expect(push).toHaveBeenCalledTimes(1);
  });

  test('it closes the view and navigates back to rolle table', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');
    wrapper?.find('[data-testid="close-layout-card-button"]').trigger('click');
    await nextTick();
    expect(push).toHaveBeenCalledTimes(1);
  });

  test('it calls getAssignableServiceProvidersForRolleByOrganisationId with the correct id after organisation selection', async () => {
    const getAssignableServiceProvidersSpy: MockInstance = vi.spyOn(
      serviceProviderStore,
      'getAssignableServiceProvidersForRolleByOrganisationId',
    );
    expect(getAssignableServiceProvidersSpy).not.toHaveBeenCalled();
    await fillForm({
      organisation: organisationObject.id,
      rollenart: mockRolle.rollenart,
    });
    await flushPromises();
    expect(getAssignableServiceProvidersSpy).toHaveBeenCalledWith(organisationObject.id, mockRolle.rollenart);
  });

  test('it fills form and triggers dirty warning', async () => {
    await fillForm({
      organisation: organisationObject.id,
      rollenart: mockRolle.rollenart,
      rollenname: mockRolle.name,
      merkmale: ['1'],
      provider: ['1'],
      systemrechte: ['1'],
    });

    wrapper?.find('[data-testid="close-layout-card-button"]').trigger('click');
    await nextTick();

    document.querySelector('[data-testid="confirm-unsaved-changes-button"]');
  });

  test('it fills form and triggers submit', async () => {
    const { orgSelect, rollenartSelect }: Partial<FormSelectors> = await fillForm({
      organisation: organisationObject.id,
      rollenart: mockRolle.rollenart,
      rollenname: mockRolle.name,
      provider: ['1'],
    });

    expect(orgSelect?.text()).toEqual(getDisplayNameForOrg(organisationObject));
    expect(rollenartSelect?.text().toLowerCase()).toEqual(mockRolle.rollenart.toLowerCase());

    expect(
      wrapper
        ?.findComponent({ ref: 'rolle-creation-form' })
        .find('[data-testid="rolle-form-submit-button"]')
        .isVisible(),
    ).toBe(true);

    wrapper
      ?.findComponent({ ref: 'rolle-creation-form' })
      .findComponent({ ref: 'form-wrapper' })
      .find('[data-testid="rolle-form-submit-button"]')
      .trigger('click');
    await nextTick();

    await flushPromises();

    rolleStore.createdRolle = { ...mockRolle, systemrechte: [] as unknown as Set<RollenSystemRechtEnum> };
    await nextTick();

    expect(wrapper?.find('[data-testid="create-another-rolle-button"]').isVisible()).toBe(true);

    wrapper?.find('[data-testid="create-another-rolle-button"]').trigger('click');
    await nextTick();

    expect(rolleStore.createdRolle).toBe(null);
  });

  test('it fills form and triggers submit and uses correct Rolle to add serviceproviders', async () => {
    const oldmockRolle: RolleResponse = DoFactory.getRolleResponse();
    rolleStore.createdRolle = { ...oldmockRolle, systemrechte: [] as unknown as Set<RollenSystemRechtEnum> };
    await nextTick();
    await wrapper?.find('[data-testid="create-another-rolle-button"]').trigger('click');

    const { orgSelect, rollenartSelect }: Partial<FormSelectors> = await fillForm({
      organisation: organisationObject.id,
      rollenart: mockRolle.rollenart,
      rollenname: mockRolle.name,
      provider: ['1'],
    });

    expect(orgSelect?.text()).toEqual(getDisplayNameForOrg(organisationObject));
    expect(rollenartSelect?.text().toLowerCase()).toEqual(mockRolle.rollenart.toLowerCase());

    vi.spyOn(rolleStore, 'createRolle').mockImplementation(() => {
      rolleStore.createdRolle = {
        ...mockRolle,
        systemrechte: new Set(Array.from(mockRolle.systemrechte).map((s: SystemRechtResponse) => s.name)),
      };
      return Promise.resolve();
    });

    expect(
      wrapper
        ?.findComponent({ ref: 'rolle-creation-form' })
        .findComponent({ ref: 'form-wrapper' })
        .find('[data-testid="rolle-form-submit-button"]')
        .isVisible(),
    ).toBe(true);

    wrapper
      ?.findComponent({ ref: 'rolle-creation-form' })
      .findComponent({ ref: 'form-wrapper' })
      .find('[data-testid="rolle-form-submit-button"]')
      .trigger('click');
    await nextTick();

    await flushPromises();
    await flushPromises();

    await vi.waitFor(() => {
      expect(rolleStore.createRolle).toHaveBeenCalled();
    });
  });

  test('It display the success template with no systemrechte nor merkmale', async () => {
    rolleStore.createdRolle = { ...mockRolle, systemrechte: [] as unknown as Set<RollenSystemRechtEnum> };
    rolleStore.createdRolle.serviceProviders = [];
    await nextTick();

    expect(wrapper?.find('[data-testid="create-another-rolle-button"]').isVisible()).toBe(true);

    wrapper?.find('[data-testid="create-another-rolle-button"]').trigger('click');
    await nextTick();

    expect(rolleStore.createdRolle).toBe(null);
  });

  test('it displays the success template with service providers', async () => {
    rolleStore.createdRolle = {
      ...mockRolle,
      systemrechte: [RollenSystemRechtEnum.RollenVerwalten] as unknown as Set<RollenSystemRechtEnum>,
    };

    const testServiceProviders: Array<ServiceProviderResponse> = [
      DoFactory.getServiceProviderResponse(),
      DoFactory.getServiceProviderResponse(),
      DoFactory.getServiceProviderResponse(),
    ];
    rolleStore.createdRolle.serviceProviders = testServiceProviders;
    await nextTick();

    expect(wrapper?.find('[data-testid="create-another-rolle-button"]').isVisible()).toBe(true);

    wrapper?.find('[data-testid="create-another-rolle-button"]').trigger('click');
    await nextTick();

    expect(rolleStore.createdRolle).toBe(null);
  });

  test('shows error message if REQUIRED_STEP_UP_LEVEL_NOT_MET error is present and click close button', async () => {
    rolleStore.errorCode = 'REQUIRED_STEP_UP_LEVEL_NOT_MET';
    await nextTick();
    expect(wrapper?.find('[data-testid$="alert-title"]').isVisible()).toBe(true);
    wrapper?.find('[data-testid$="alert-button"]').trigger('click');
    await nextTick();
  });

  describe('navigation interception', () => {
    afterEach(() => {
      vi.unmock('vue-router');
    });
    test('triggers, if form is dirty', async () => {
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
        organisation: organisationObject.id,
        rollenart: mockRolle.rollenart,
        rollenname: mockRolle.name,
        provider: ['1'],
      });

      const spy: Mock = vi.fn();
      storedBeforeRouteLeaveCallback({} as RouteLocationNormalized, {} as RouteLocationNormalized, spy);
      expect(spy).toHaveBeenCalledTimes(expectedCallsToNext);
      await nextTick();

      const confirmButton: Element | null = document.querySelector('[data-testid="confirm-unsaved-changes-button"]');
      expect(confirmButton).not.toBeNull();
      confirmButton!.dispatchEvent(new Event('click'));
      expect(spy).toHaveBeenCalledOnce();
    });

    test('does not trigger, if form is not dirty', async () => {
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
      if (isFormDirty) {
        await fillForm({
          organisation: organisationObject.id,
          rollenart: mockRolle.rollenart,
          rollenname: mockRolle.name,
          provider: ['1'],
        });
      }
    });
    test('it handles unloading', () => {
      const event: Event = new Event('beforeunload');
      const spy: MockInstance = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);
      if (isFormDirty) {
        expect(spy).toHaveBeenCalledOnce();
      } else {
        expect(spy).not.toHaveBeenCalledOnce();
      }
    });
  });
});
