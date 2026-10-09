import type {
  ServiceProviderFormSubmitData,
  SuccessDataItem,
  SuccessDetails,
} from '@/components/admin/service-provider/types';
import routes from '@/router/routes';
import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
import { useOrganisationStore, type Organisation, type OrganisationStore } from '@/stores/OrganisationStore';
import { RollenArt, RollenSystemRecht } from '@/stores/RolleStore';
import {
  ServiceProviderKategorie,
  ServiceProviderMerkmal,
  useServiceProviderStore,
  type ServiceProviderStore,
} from '@/stores/ServiceProviderStore';
import { DOMWrapper, enableAutoUnmount, flushPromises, mount, VueWrapper } from '@vue/test-utils';
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
import ServiceProviderCreationView from './ServiceProviderCreationView.vue';
import SuccessTemplate from '@/components/admin/service-provider/SuccessTemplate.vue';
import ServiceProviderForm from '@/components/admin/service-provider/ServiceProviderForm.vue';

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

enableAutoUnmount(afterEach);

let wrapper: VueWrapper | null = null;
let router: Router;
const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
const organisationStore: OrganisationStore = useOrganisationStore();
const authStore: AuthStore = useAuthStore();
const organisationObject: Organisation = DoFactory.getOrganisation();

type OnBeforeRouteLeaveCallback = (
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  _next: NavigationGuardNext,
) => void;

async function mountComponent(): Promise<ReturnType<typeof mount<typeof ServiceProviderCreationView>>> {
  await vi.dynamicImportSettled();
  return mount(ServiceProviderCreationView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        ServiceProviderCreationView: ServiceProviderCreationView as Component,
      },
      plugins: [router],
    },
  });
}

type FormFields = {
  organisation: string;
  name: string;
  url: string;
  kategorie: ServiceProviderKategorie;
  nachtraeglichZuweisbar: boolean;
  verfuegbarFuerRollenerweiterung: boolean;
  requires2fa: boolean;
};

type FormSelectors = {
  orgSelect: VueWrapper;
  nameInput: DOMWrapper<Element>;
  urlInput: DOMWrapper<Element>;
  kategorieSelect: DOMWrapper<Element>;
  nachtraeglichZuweisbarSelect: DOMWrapper<Element>;
  verfuegbarFuerRollenerweiterungSelect: DOMWrapper<Element>;
  requires2faSelect: DOMWrapper<Element>;
};

async function fillForm(args: Partial<FormFields>): Promise<Partial<FormSelectors>> {
  const {
    organisation,
    name,
    url,
    kategorie,
    nachtraeglichZuweisbar,
    verfuegbarFuerRollenerweiterung,
    requires2fa,
  }: Partial<FormFields> = args;
  const selectors: Partial<FormSelectors> = {};

  if (organisation) {
    const orgSelect: VueWrapper | undefined = wrapper?.findComponent({ name: 'SchulenFilter' });
    await orgSelect?.setValue(organisation);
    const schulenFilterComponent: VueWrapper | undefined = wrapper?.findComponent({ name: 'SchulenFilter' });
    (schulenFilterComponent?.vm as unknown as { $emit: (event: string, ...args: unknown[]) => void }).$emit(
      'update:selectedSchulen',
      organisation,
    );
    await nextTick();
    selectors.orgSelect = orgSelect;
  }

  if (name) {
    const nameInput: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="name-input"]');
    expect(nameInput?.exists()).toBe(true);
    await nameInput?.find('input').setValue(name);
    await nextTick();
    selectors.nameInput = nameInput;
  }

  if (url) {
    const urlInput: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="url-input"]');
    expect(urlInput?.exists()).toBe(true);
    await urlInput?.find('input').setValue(url);
    await nextTick();
    selectors.urlInput = urlInput;
  }

  if (kategorie) {
    const kategorieSelect: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="kategorie-select"]');
    kategorieSelect?.setValue(kategorie);
    await nextTick();
    selectors.kategorieSelect = kategorieSelect;
  }

  if (nachtraeglichZuweisbar !== undefined) {
    const nachtraeglichZuweisbarSelect: DOMWrapper<Element> | undefined = wrapper?.find(
      '[data-testid="nachtraeglich-zuweisbar-select"]',
    );
    nachtraeglichZuweisbarSelect?.setValue(nachtraeglichZuweisbar);
    await nextTick();
    selectors.nachtraeglichZuweisbarSelect = nachtraeglichZuweisbarSelect;
  }

  if (verfuegbarFuerRollenerweiterung !== undefined) {
    const verfuegbarFuerRollenerweiterungSelect: DOMWrapper<Element> | undefined = wrapper?.find(
      '[data-testid="verfuegbar-fuer-rollenerweiterung-select"]',
    );
    verfuegbarFuerRollenerweiterungSelect?.setValue(verfuegbarFuerRollenerweiterung);
    await nextTick();
    selectors.verfuegbarFuerRollenerweiterungSelect = verfuegbarFuerRollenerweiterungSelect;
  }

  if (requires2fa !== undefined) {
    const requires2faSelect: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="requires2fa-select"]');
    requires2faSelect?.setValue(requires2fa);
    await nextTick();
    selectors.requires2faSelect = requires2faSelect;
  }

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

  serviceProviderStore.errorCode = '';
  organisationStore.organisationenFilters.set('service-provider-create', {
    total: 1,
    loading: false,
    filterResult: [organisationObject],
  });
  authStore.currentUserPermissions = [RollenSystemRecht.AngeboteVerwalten];
});

afterEach(() => {
  organisationStore.$reset();
  serviceProviderStore.$reset();
  authStore.$reset();
  wrapper?.unmount();
  vi.useRealTimers();
});

describe('ServiceProviderCreationView', () => {
  test('it renders all child components', () => {
    expect(wrapper?.getComponent({ name: 'LayoutCard' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'SpshAlert' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'FormWrapper' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'FormRow' })).toBeTruthy();
  });

  test('it passes both anbieten-in merkmale by default to ServiceProviderForm initial-values', () => {
    // eslint-disable-next-line @typescript-eslint/typedef
    const form = wrapper?.findComponent(ServiceProviderForm);
    expect(form?.exists()).toBe(true);
    expect(form?.props('initialValues')).toMatchObject({
      anbietenInMerkmale: [
        ServiceProviderMerkmal.AnbietenInSchulischerAngebotsverwaltung,
        ServiceProviderMerkmal.AnbietenInSchulischerRollenverwaltung,
      ],
      rollenartenWhitelist: [],
    });
  });

  test('it passes empty rollenarten whitelist by default to ServiceProviderForm initial-values', () => {
    // eslint-disable-next-line @typescript-eslint/typedef
    const form = wrapper?.findComponent({ name: 'ServiceProviderForm' });
    expect(form?.props('initialValues')).toMatchObject({ rollenartenWhitelist: [] });
  });

  test('it calls the correct function in the store, when the form is submitted', async () => {
    const createServiceProviderSpy: MockInstance = vi.spyOn(serviceProviderStore, 'createServiceProvider');
    const payload: ServiceProviderFormSubmitData = {
      name: 'Test Service Provider',
      url: 'https://test.example.com',
      kategorie: ServiceProviderKategorie.Schulisch,
      merkmale: [],
      rollenartenWhitelist: [],
      requires2fa: false,
      logoId: undefined,
      selectedOrganisation: DoFactory.getOrganisation(),
    };
    await fillForm({
      organisation: payload.selectedOrganisation!.id,
      name: payload.name,
      url: payload.url,
    });

    await flushPromises();

    expect(createServiceProviderSpy).not.toHaveBeenCalled();

    const submitButton: Element | null = document.querySelector(
      '[data-testid="service-provider-create-form-submit-button"]',
    );
    expect(submitButton).not.toBeNull();
    expect(submitButton?.hasAttribute('disabled')).toBe(false);
    submitButton!.dispatchEvent(new Event('click'));

    const form: VueWrapper = wrapper!.findComponent({ name: 'ServiceProviderForm' });
    form.vm.$emit('click:submit', payload); // in tests the event does not fire, so we do it manually
    await flushPromises();

    expect(createServiceProviderSpy).toHaveBeenCalledOnce();
    expect(createServiceProviderSpy).toHaveBeenCalledWith({
      organisationId: payload.selectedOrganisation!.id,
      name: payload.name,
      url: payload.url,
      kategorie: payload.kategorie,
      requires2fa: payload.requires2fa,
      merkmale: payload.merkmale,
      rollenartenWhitelist: payload.rollenartenWhitelist,
    });
  });

  test('it renders rollenarten whitelist in success view from backend response, not cached submit values', async () => {
    vi.spyOn(serviceProviderStore, 'createServiceProvider').mockImplementation(() => {
      serviceProviderStore.createdServiceProvider = {
        id: 'sp-id',
        name: 'Test Service Provider',
        url: 'https://test.example.com',
        logoId: undefined,
        kategorie: ServiceProviderKategorie.Schulisch,
        merkmale: [],
        requires2fa: false,
        rollenartenWhitelist: [RollenArt.Orgadmin],
      };
      return Promise.resolve();
    });

    const payload: ServiceProviderFormSubmitData = {
      name: 'Test Service Provider',
      url: 'https://test.example.com',
      kategorie: ServiceProviderKategorie.Schulisch,
      merkmale: [],
      rollenartenWhitelist: [RollenArt.Lern],
      requires2fa: false,
      logoId: undefined,
      selectedOrganisation: DoFactory.getOrganisation(),
    };

    const form: VueWrapper = wrapper!.findComponent({ name: 'ServiceProviderForm' });
    form.vm.$emit('click:submit', payload);
    await flushPromises();

    // eslint-disable-next-line @typescript-eslint/typedef
    const successTemplate = wrapper?.findComponent(SuccessTemplate);
    expect(successTemplate?.exists()).toBe(true);
    if (!successTemplate) {
      throw new Error('Expected success template to be rendered');
    }

    const successProps: SuccessDetails = successTemplate.props('success') as SuccessDetails;
    const dataRows: SuccessDataItem[] = successProps?.data ?? [];
    expect(dataRows.find((row: SuccessDataItem) => row.testId === 'success-rollenarten-whitelist')?.value).toBe(
      'Orgadmin',
    );
  });

  test('it renders an error', async () => {
    serviceProviderStore.errorCode = 'ERROR_ERROR';
    await nextTick();
    const push: MockInstance = vi.spyOn(router, 'push');
    wrapper?.find('[data-testid$="alert-button"]').trigger('click');
    await nextTick();
    expect(push).toHaveBeenCalledTimes(1);
  });

  test('it closes the view and navigates back to service provider table', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');
    wrapper?.find('[data-testid="close-layout-card-button"]').trigger('click');
    await nextTick();
    expect(push).toHaveBeenCalledTimes(1);
  });

  test('it opens URL in new tab', async () => {
    const windowOpenSpy: MockInstance = vi.spyOn(window, 'open').mockImplementation(() => null);

    await fillForm({
      url: 'https://example.com',
    });

    wrapper?.find('[data-testid="url-test-button"]').trigger('click');
    await nextTick();

    expect(windowOpenSpy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');

    windowOpenSpy.mockRestore();
  });

  test('it adds https protocol if missing when opening URL', async () => {
    const windowOpenSpy: MockInstance = vi.spyOn(window, 'open').mockImplementation(() => null);

    await fillForm({
      url: 'example.com',
    });

    wrapper?.find('[data-testid="url-test-button"]').trigger('click');
    await nextTick();

    expect(windowOpenSpy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');

    windowOpenSpy.mockRestore();
  });

  test('shows error message if REQUIRED_STEP_UP_LEVEL_NOT_MET error is present and click close button', async () => {
    serviceProviderStore.errorCode = 'REQUIRED_STEP_UP_LEVEL_NOT_MET';
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
      wrapper = await mountComponent();
      await fillForm({
        organisation: organisationObject.id,
        name: 'Test Service Provider',
        url: 'https://test.example.com',
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
          name: 'Test Service Provider',
          url: 'https://test.example.com',
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
