import type { RollenerweiterungWithExtendedDataResponse } from '@/api-client/generated';
import SchulenFilter from '@/components/filter/SchulenFilter.vue';
import routes from '@/router/routes';
import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
import { useConfigStore, type ConfigStore } from '@/stores/ConfigStore';
import { RollenArt, RollenSystemRecht, useRolleStore, type RolleStore } from '@/stores/RolleStore.js';
import {
  ServiceProviderKategorie,
  useServiceProviderStore,
  type ManageableServiceProviderDetail,
  type ServiceProviderStore,
} from '@/stores/ServiceProviderStore';
import { getLogoPath } from '@/utils/logosConfig';
import { DOMWrapper, VueWrapper, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import type { MockInstance } from 'vitest';
import { nextTick, type Component } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import ServiceProviderDetailsView from './ServiceProviderDetailsView.vue';

let wrapper: VueWrapper<InstanceType<typeof ServiceProviderDetailsView>> | null = null;
let router: Router;
const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
const authStore: AuthStore = useAuthStore();
const rolleStore: RolleStore = useRolleStore();
const configStore: ConfigStore = useConfigStore();

const mockServiceProvider: ManageableServiceProviderDetail = DoFactory.getManageableServiceProviderDetail({
  kategorie: ServiceProviderKategorie.Schulisch,
  availableForRollenerweiterung: true,
  logoId: 1,
});

async function mountComponent(): Promise<VueWrapper<InstanceType<typeof ServiceProviderDetailsView>>> {
  const wrapper: VueWrapper<InstanceType<typeof ServiceProviderDetailsView>> = mount(ServiceProviderDetailsView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        ServiceProviderDetailsView: ServiceProviderDetailsView as Component,
      },
      mocks: {
        route: {
          fullPath: 'full/path',
          params: {
            id: mockServiceProvider.id,
          },
        },
      },
      plugins: [router],
    },
  });
  await flushPromises();
  return wrapper;
}

async function openRollenerweiterungenSection(): Promise<void> {
  await wrapper
    ?.find('[data-testid="open-schulspezifische-rollenerweiterungen-section-headline-button"]')
    .trigger('click');
  await nextTick();
}

beforeEach(async () => {
  setActivePinia(createPinia());
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  router = createRouter({
    history: createWebHistory(),
    routes,
  });

  router.push({
    name: 'angebot-details',
    params: { id: mockServiceProvider.id },
    query: { orga: 'some-org-id' },
  });
  await router.isReady();

  serviceProviderStore.$reset();
  serviceProviderStore.currentServiceProvider = mockServiceProvider;
  configStore.configData = {
    befristungBearbeitenEnabled: true,
    rolleBearbeitenEnabled: true,
    rolleErweiternEnabled: true,
    setUemPasswordEnabled: true,
    schulischeAngeboteErstellen: true,
  };
  const mockItems: RollenerweiterungWithExtendedDataResponse[] = Array.from({ length: 2 }, () =>
    DoFactory.getRollenerweiterungItem(),
  );
  serviceProviderStore.rollenerweiterungen = DoFactory.getRollenerweiterungenResponse(mockItems);
  serviceProviderStore.rollenerweiterungenUebersicht = DoFactory.buildRollenerweiterungenUebersicht(mockItems);
  authStore.hasRollenerweiternPermission = true;
  rolleStore.allRollen = [
    DoFactory.getRolleWithServiceProviders({ rollenart: RollenArt.Lehr }),
    DoFactory.getRolleWithServiceProviders({ rollenart: RollenArt.Lern }),
  ];
  wrapper = await mountComponent();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  wrapper?.unmount();
});

describe('ServiceProviderDetailsView', () => {
  test('it renders the service provider details page and shows its data', () => {
    expect(wrapper).toBeTruthy();
    expect(wrapper?.find('[data-testid="service-provider-details-card"]').isVisible()).toBe(true);
    expect(wrapper?.find('[data-testid="service-provider-name"]').text()).toBe(mockServiceProvider.name);
    expect(wrapper?.find('[data-testid="service-provider-administrationsebene"]').text()).toBe(
      mockServiceProvider.administrationsebene.name,
    );
    expect(wrapper?.find('[data-testid="service-provider-requires-2fa"]').text()).toBe(
      mockServiceProvider.requires2fa ? 'Ja' : 'Nein',
    );

    expect(
      wrapper?.find('[data-testid="service-provider-logo"] [alt="provider-logo"]').element.getAttribute('src'),
    ).toBe(getLogoPath(mockServiceProvider.logoId));
    expect(wrapper?.find('[data-testid="service-provider-kategorie"]').text()).toBe('Schulische Angebote');
    expect(wrapper?.find('[data-testid="service-provider-rollenarten-whitelist"]').text()).toBe(
      'Keine Einschränkungen',
    );
    expect(wrapper?.find('[data-testid="service-provider-link"]').text()).toBe(
      mockServiceProvider.url ? mockServiceProvider.url : 'fehlt',
    );
  });

  test('it shows rollenarten whitelist values when present', async () => {
    serviceProviderStore.currentServiceProvider = DoFactory.getManageableServiceProviderDetail({
      rollenartenWhitelist: [RollenArt.Sysadmin, RollenArt.Lehr],
    });
    wrapper = await mountComponent();

    expect(wrapper?.find('[data-testid="service-provider-rollenarten-whitelist"]').text()).toBe('Sysadmin, Lehr');
  });

  test('it renders the service provider details page and shows its data with logo', async () => {
    const providerWithLogo: ManageableServiceProviderDetail = DoFactory.getManageableServiceProviderDetail({
      id: mockServiceProvider.id,
      logoId: undefined,
      kategorie: ServiceProviderKategorie.Hinweise,
    });
    serviceProviderStore.currentServiceProvider = providerWithLogo;
    vi.spyOn(serviceProviderStore, 'getServiceProviderLogoById').mockImplementationOnce(
      async (id: string): Promise<void> => {
        serviceProviderStore.serviceProviderLogos.set(id, 'test-logo');
        return Promise.resolve();
      },
    );
    wrapper = await mountComponent();

    expect(wrapper).toBeTruthy();
    expect(wrapper?.find('[data-testid="service-provider-details-card"]').isVisible()).toBe(true);
    expect(wrapper?.find('[data-testid="service-provider-name"]').text()).toBe(providerWithLogo.name);
    expect(wrapper?.find('[data-testid="service-provider-administrationsebene"]').text()).toBe(
      providerWithLogo.administrationsebene.name,
    );
    expect(wrapper?.find('[data-testid="service-provider-requires-2fa"]').text()).toBe(
      providerWithLogo.requires2fa ? 'Ja' : 'Nein',
    );
    expect(
      wrapper?.find('[data-testid="service-provider-logo"] [alt="provider-logo"]').element.getAttribute('src'),
    ).toBe('test-logo');
    expect(wrapper?.find('[data-testid="service-provider-kategorie"]').text()).toBe('Hinweise');
    expect(wrapper?.find('[data-testid="service-provider-link"]').text()).toBe(
      providerWithLogo.url ? providerWithLogo.url : 'fehlt',
    );
  });

  test('it navigates back to service providers table', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');
    await wrapper?.find('[data-testid="close-layout-card-button"]').trigger('click');
    expect(push).toHaveBeenCalledTimes(1);
  });

  test('it sets errorCode and goes back to list on alert close', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');
    serviceProviderStore.errorCode = 'REQUIRED_STEP_UP_LEVEL_NOT_MET';
    await nextTick();

    await wrapper?.find('[data-testid$="alert-button"]').trigger('click');

    expect(push).toHaveBeenCalledTimes(1);
  });

  test('it reloads data after changing page', async () => {
    await openRollenerweiterungenSection();
    expect(wrapper?.find('.v-pagination__next button.v-btn--disabled').isVisible()).toBe(true);
    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain('1-2');

    if (serviceProviderStore.rollenerweiterungen) {
      serviceProviderStore.rollenerweiterungen.total = 50;
    }
    await nextTick();

    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain('1-30');
    expect(wrapper?.find('.v-pagination__next button:not(.v-btn--disabled)').isVisible()).toBe(true);
    await wrapper?.find('.v-pagination__next button:not(.v-btn--disabled)').trigger('click');
    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain('31-50');
  });

  test('it reloads data after changing limit', async () => {
    await openRollenerweiterungenSection();
    /* check for both cases, first if total is greater than, afterwards if total is less or equal than chosen limit */
    if (serviceProviderStore.rollenerweiterungen) {
      serviceProviderStore.rollenerweiterungen.total = 50;
    }
    await nextTick();

    expect(wrapper?.find('.v-data-table-footer__items-per-page').isVisible()).toBe(true);
    expect(wrapper?.find('.v-data-table-footer__items-per-page').text()).toContain('30');

    const itemsPerPageSelection: ReturnType<VueWrapper['findComponent']> | undefined = wrapper?.findComponent(
      '.v-data-table-footer__items-per-page .v-select',
    );
    await itemsPerPageSelection?.setValue(50);

    expect(wrapper?.find('.v-data-table-footer__items-per-page').text()).toContain('50');

    if (serviceProviderStore.rollenerweiterungen) {
      serviceProviderStore.rollenerweiterungen.total = 30;
    }
    await itemsPerPageSelection?.setValue(30);

    expect(wrapper?.find('.v-data-table-footer__items-per-page').text()).toContain('30');
    if (serviceProviderStore.rollenerweiterungen) {
      serviceProviderStore.rollenerweiterungen.total = 3;
    }
  });

  test('it reloads rollenerweiterungen with selected schulen filter', async () => {
    const getRollenerweiterungenByIdSpy: MockInstance = vi
      .spyOn(serviceProviderStore, 'getRollenerweiterungenById')
      .mockResolvedValue();
    await openRollenerweiterungenSection();

    const schulenFilter: VueWrapper | undefined = wrapper?.findComponent(SchulenFilter);
    schulenFilter?.vm.$emit('update:selected-schulen', ['schule-1', 'schule-2']);
    await flushPromises();

    expect(getRollenerweiterungenByIdSpy).toHaveBeenCalled();
    expect(getRollenerweiterungenByIdSpy).toHaveBeenLastCalledWith({
      serviceProviderId: mockServiceProvider.id,
      organisationIds: ['schule-1', 'schule-2'],
      rolleIds: undefined,
      offset: 0,
      limit: 30,
    });
  });

  test('it reloads rollenerweiterungen with selected rollen filter', async () => {
    const getRollenerweiterungenByIdSpy: MockInstance = vi
      .spyOn(serviceProviderStore, 'getRollenerweiterungenById')
      .mockResolvedValue();
    await openRollenerweiterungenSection();

    const rollenFilter: VueWrapper | undefined = wrapper?.findComponent({ ref: 'rolle-select' });
    rollenFilter?.vm.$emit('update:model-value', ['rolle-1']);
    await flushPromises();

    expect(getRollenerweiterungenByIdSpy).toHaveBeenCalled();
    expect(getRollenerweiterungenByIdSpy).toHaveBeenLastCalledWith({
      serviceProviderId: mockServiceProvider.id,
      organisationIds: undefined,
      rolleIds: ['rolle-1'],
      offset: 0,
      limit: 30,
    });
  });

  test('it reloads rollenerweiterungen with empty filter values when filters are cleared', async () => {
    const getRollenerweiterungenByIdSpy: MockInstance = vi
      .spyOn(serviceProviderStore, 'getRollenerweiterungenById')
      .mockResolvedValue();
    await openRollenerweiterungenSection();

    const schulenFilter: VueWrapper | undefined = wrapper?.findComponent(SchulenFilter);
    const rollenFilter: VueWrapper | undefined = wrapper?.findComponent({ ref: 'rolle-select' });

    schulenFilter?.vm.$emit('update:selected-schulen', ['schule-1']);
    rollenFilter?.vm.$emit('update:model-value', ['rolle-1']);
    await flushPromises();

    // Clear organisation filter, empty array should send undefined
    schulenFilter?.vm.$emit('update:selected-schulen', []);
    await flushPromises();

    expect(getRollenerweiterungenByIdSpy).toHaveBeenLastCalledWith({
      serviceProviderId: mockServiceProvider.id,
      organisationIds: undefined,
      rolleIds: ['rolle-1'],
      offset: 0,
      limit: 30,
    });

    // Clear rolle filter, empty array should send undefined and reset search
    rollenFilter?.vm.$emit('update:model-value', []);
    await flushPromises();

    expect(getRollenerweiterungenByIdSpy).toHaveBeenLastCalledWith({
      serviceProviderId: mockServiceProvider.id,
      organisationIds: undefined,
      rolleIds: undefined,
      offset: 0,
      limit: 30,
    });
  });

  test('it handles undefined rolle filter value by defaulting to empty array', async () => {
    const getRollenerweiterungenByIdSpy: MockInstance = vi
      .spyOn(serviceProviderStore, 'getRollenerweiterungenById')
      .mockResolvedValue();
    await openRollenerweiterungenSection();

    const rollenFilter: VueWrapper | undefined = wrapper?.findComponent({ ref: 'rolle-select' });
    rollenFilter?.vm.$emit('update:model-value', undefined);
    await flushPromises();

    expect(getRollenerweiterungenByIdSpy).toHaveBeenLastCalledWith({
      serviceProviderId: mockServiceProvider.id,
      organisationIds: undefined,
      rolleIds: undefined,
      offset: 0,
      limit: 30,
    });
  });

  test('it shows no items in the rollen filter when allRollen is empty', async () => {
    rolleStore.allRollen = [];
    wrapper = await mountComponent();
    await openRollenerweiterungenSection();

    const rollenFilter: VueWrapper = wrapper.findComponent({ ref: 'rolle-select' });
    expect((rollenFilter as unknown as { props: (key: string) => never }).props('items')).toEqual([]);
  });

  test('it resets both filters via reset button and reloads rollenerweiterungen', async () => {
    const getRollenerweiterungenByIdSpy: MockInstance = vi
      .spyOn(serviceProviderStore, 'getRollenerweiterungenById')
      .mockResolvedValue();
    await openRollenerweiterungenSection();

    const schulenFilter: VueWrapper | undefined = wrapper?.findComponent(SchulenFilter);
    const rollenFilter: VueWrapper | undefined = wrapper?.findComponent({ ref: 'rolle-select' });
    schulenFilter?.vm.$emit('update:selected-schulen', ['schule-1']);
    rollenFilter?.vm.$emit('update:model-value', ['rolle-1']);
    await flushPromises();

    // Reset button should only be enabled when filters are active
    const resetButton: DOMWrapper<HTMLButtonElement> | undefined = wrapper?.find('[data-testid="reset-filter-button"]');
    expect(resetButton?.attributes('disabled')).toBeUndefined();

    await resetButton?.trigger('click');
    await flushPromises();

    expect(getRollenerweiterungenByIdSpy).toHaveBeenLastCalledWith({
      serviceProviderId: mockServiceProvider.id,
      organisationIds: undefined,
      rolleIds: undefined,
      offset: 0,
      limit: 30,
    });

    // Reset button should now be disabled again
    expect(wrapper?.find('[data-testid="reset-filter-button"]').attributes('disabled')).toBeDefined();
  });

  test('it searches for rollen when search input changes', async () => {
    vi.useFakeTimers();
    const getAllRollenSpy: MockInstance = vi.spyOn(rolleStore, 'getAllRollen').mockResolvedValue();
    await openRollenerweiterungenSection();

    const rollenFilter: VueWrapper | undefined = wrapper?.findComponent({ ref: 'rolle-select' });
    rollenFilter?.vm.$emit('update:search', 'Lehrer');

    // Should not have been called yet due to debounce
    expect(getAllRollenSpy).not.toHaveBeenCalledWith(expect.objectContaining({ searchString: 'Lehrer' }));

    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(getAllRollenSpy).toHaveBeenLastCalledWith({
      limit: 25,
      searchString: 'Lehrer',
      systemrechte: [RollenSystemRecht.RollenVerwalten, RollenSystemRecht.RollenErweitern],
      rolleIds: undefined,
    });

    vi.useRealTimers();
  });

  test('it searches for rollen when search input changes and rolleIds is defined', async () => {
    vi.useFakeTimers();
    const getAllRollenSpy: MockInstance = vi.spyOn(rolleStore, 'getAllRollen').mockResolvedValue();
    await openRollenerweiterungenSection();

    const rollenFilter: VueWrapper | undefined = wrapper?.findComponent({ ref: 'rolle-select' });

    // Set rolleIds state first
    rollenFilter?.vm.$emit('update:model-value', ['rolle-1']);
    vi.advanceTimersByTime(500);
    await flushPromises();

    getAllRollenSpy.mockClear();

    // Now trigger the search
    rollenFilter?.vm.$emit('update:search', 'Lehrer');

    expect(getAllRollenSpy).not.toHaveBeenCalledWith(expect.objectContaining({ searchString: 'Lehrer' }));

    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(getAllRollenSpy).toHaveBeenLastCalledWith({
      limit: 25,
      searchString: 'Lehrer',
      systemrechte: [RollenSystemRecht.RollenVerwalten, RollenSystemRecht.RollenErweitern],
      rolleIds: ['rolle-1'],
    });

    vi.useRealTimers();
  });

  test('it does not request all rollen on mount without rollenerweitern permission', async () => {
    wrapper?.unmount();
    authStore.hasRollenerweiternPermission = false;
    const fetchRollenerweiterungenSpy: MockInstance = vi
      .spyOn(serviceProviderStore, 'getRollenerweiterungenById')
      .mockResolvedValue();
    const getAllRollenSpy: MockInstance = vi.spyOn(rolleStore, 'getAllRollen').mockResolvedValue();

    await flushPromises();
    fetchRollenerweiterungenSpy.mockClear();
    getAllRollenSpy.mockClear();

    wrapper = await mountComponent();

    expect(fetchRollenerweiterungenSpy).not.toHaveBeenCalled();
    expect(getAllRollenSpy).not.toHaveBeenCalled();
  });

  test('it opens vidis dialog with service provider name and closes it on ok click', async () => {
    serviceProviderStore.currentServiceProvider = DoFactory.getManageableServiceProviderDetail({
      id: mockServiceProvider.id,
      vidisAngebotId: 'vidis-angebot-1',
    });
    await nextTick();

    await wrapper?.find('[data-testid="service-provider-bearbeiten-button"]').trigger('click');
    await vi.waitFor(() => {
      const dialogHeadlineInActiveOverlay: HTMLElement | null = document.body.querySelector(
        '.v-overlay--active [data-testid="vidis-info-dialog-headline"]',
      );
      expect(dialogHeadlineInActiveOverlay).toBeTruthy();
    });

    await vi.waitFor(() => {
      const dialogTextInActiveOverlay: HTMLElement | null = document.body.querySelector(
        '.v-overlay--active [data-testid="vidis-info-dialog-text"]',
      );
      expect(dialogTextInActiveOverlay).toBeTruthy();
      expect(dialogTextInActiveOverlay?.textContent).toContain(serviceProviderStore.currentServiceProvider!.name);
    });

    const closeButton: HTMLElement | null = document.body.querySelector(
      '.v-overlay--active [data-testid="close-vidis-info-dialog-button"]',
    );
    expect(closeButton).toBeTruthy();
    closeButton?.click();

    await vi.waitFor(() => {
      const dialogHeadlineInActiveOverlay: HTMLElement | null = document.body.querySelector(
        '.v-overlay--active [data-testid="vidis-info-dialog-headline"]',
      );
      expect(dialogHeadlineInActiveOverlay).toBeNull();
    });
  });
});
