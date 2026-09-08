import type { SystemRechtResponse } from '@/api-client/generated';
import SchulenFilter from '@/components/filter/SchulenFilter.vue';
import routes from '@/router/routes';
import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
import { RollenArt, RollenMerkmal, useRolleStore, type RolleStore } from '@/stores/RolleStore';
import { rollenPerPageDefault, useSearchFilterStore, type SearchFilterStore } from '@/stores/SearchFilterStore';
import { useServiceProviderStore, type ServiceProviderStore } from '@/stores/ServiceProviderStore';
import { VueWrapper, flushPromises, mount } from '@vue/test-utils';
import { expect, test, type MockInstance } from 'vitest';
import { nextTick, type Component } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import { RollenSystemRechtEnum } from '../../../api-client/generated/api';
import RolleManagementView from './RolleManagementView.vue';

let wrapper: VueWrapper | null = null;
let router: Router;
let authStore: AuthStore;
let rolleStore: RolleStore;
let searchFilterStore: SearchFilterStore;
let serviceProviderStore: ServiceProviderStore;

beforeEach(() => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  router = createRouter({
    history: createWebHistory(),
    routes,
  });

  authStore = useAuthStore();
  authStore.hasAngeboteVerwaltenPermission = true;
  rolleStore = useRolleStore();
  searchFilterStore = useSearchFilterStore();
  serviceProviderStore = useServiceProviderStore();

  searchFilterStore.selectedMerkmaleForRollen = [];
  searchFilterStore.selectedRollenartenForRollen = [];
  searchFilterStore.selectedOrganisationenForRollen = [];
  searchFilterStore.selectedAngeboteForRollen = [];

  serviceProviderStore.serviceProvidersForRollenVerwaltung = [
    { id: 'sp1', name: 'Service Provider 1' },
    { id: 'sp2', name: 'Service Provider 2' },
  ];
  serviceProviderStore.totalServiceProvidersForRollenVerwaltung = 2;
  serviceProviderStore.loading = false;
  searchFilterStore.searchStringForRollen = '';

  rolleStore.allRollen = [
    {
      administeredBySchulstrukturknoten: '1234',
      rollenart: 'LEHR',
      name: 'Lehrer',
      // TODO: remove type casting when generator is fixed
      merkmale: ['KOPERS_PFLICHT'] as unknown as Set<RollenMerkmal>,
      systemrechte: [
        { name: RollenSystemRechtEnum.RollenVerwalten, isTechnical: false },
      ] as unknown as Set<SystemRechtResponse>,
      createdAt: '2022',
      updatedAt: '2022',
      id: '1',
      serviceProviders: [
        {
          id: '1',
          name: 'itslearning',
        },
        {
          id: '2',
          name: 'E-Mail',
        },
      ],
      administeredBySchulstrukturknotenName: 'Land SH',
      administeredBySchulstrukturknotenKennung: '',
      version: 1,
    },
    {
      administeredBySchulstrukturknoten: '1234',
      rollenart: 'LERN',
      name: 'SuS',
      // TODO: remove type casting when generator is fixed
      merkmale: [] as unknown as Set<RollenMerkmal>,
      systemrechte: [] as unknown as Set<SystemRechtResponse>,
      createdAt: '2022',
      updatedAt: '2022',
      id: '2',
      serviceProviders: [
        {
          id: '1',
          name: 'itslearning',
        },
      ],
      administeredBySchulstrukturknotenName: 'Land SH',
      administeredBySchulstrukturknotenKennung: '1234567',
      version: 1,
    },
    {
      administeredBySchulstrukturknoten: '42',
      rollenart: 'LERN',
      name: 'Rolle ohne Namen',
      // TODO: remove type casting when generator is fixed
      merkmale: [] as unknown as Set<RollenMerkmal>,
      systemrechte: [] as unknown as Set<SystemRechtResponse>,
      createdAt: '2022',
      updatedAt: '2022',
      id: '2',
      serviceProviders: [
        {
          id: '1',
          name: 'itslearning',
        },
      ],
      administeredBySchulstrukturknotenName: '',
      administeredBySchulstrukturknotenKennung: '1234567',
      version: 1,
    },
  ];

  rolleStore.totalRollen = 3;

  wrapper = mount(RolleManagementView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        RolleManagementView: RolleManagementView as Component,
      },
      mocks: {
        route: {
          fullPath: 'full/path',
        },
      },
      plugins: [router],
    },
  });
});

describe('RolleManagementView', () => {
  test('it renders rolle management view', () => {
    expect(wrapper?.getComponent({ name: 'ResultTable' })).toBeTruthy();
    expect(wrapper?.find('[data-testid="rolle-table"]').isVisible()).toBe(true);
    expect(wrapper?.findAll('.v-data-table__tr').length).toBe(3);
  });

  test('it reloads data after changing page', async () => {
    expect(wrapper?.find('.v-pagination__next button.v-btn--disabled').isVisible()).toBe(true);
    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain('1-3');

    rolleStore.totalRollen = 50;
    await nextTick();

    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain('1-30');
    expect(wrapper?.find('.v-pagination__next button:not(.v-btn--disabled)').isVisible()).toBe(true);
    await wrapper?.find('.v-pagination__next button:not(.v-btn--disabled)').trigger('click');
    expect(wrapper?.find('.v-data-table-footer__info').text()).toContain('31-50');

    rolleStore.totalRollen = 3;
  });

  test('it reloads data after changing limit', async () => {
    /* check for both cases, first if total is greater than, afterwards if total is less or equal than chosen limit */
    rolleStore.totalRollen = 51;
    await nextTick();

    expect(wrapper?.find('.v-data-table-footer__items-per-page').isVisible()).toBe(true);
    expect(wrapper?.find('.v-data-table-footer__items-per-page').text()).toContain('30');

    const itemsPerPageSelection: ReturnType<VueWrapper['findComponent']> | undefined = wrapper?.findComponent(
      '.v-data-table-footer__items-per-page .v-select',
    );
    await itemsPerPageSelection?.setValue(50);

    expect(wrapper?.find('.v-data-table-footer__items-per-page').text()).toContain('50');

    rolleStore.totalRollen = 30;
    await itemsPerPageSelection?.setValue(30);

    expect(wrapper?.find('.v-data-table-footer__items-per-page').text()).toContain('30');
    rolleStore.totalRollen = 3;
  });

  test('it routes to rolle details page', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');

    await wrapper?.find('.v-data-table__tr').trigger('click');
    await nextTick();

    expect(push).toHaveBeenCalledTimes(1);
  });

  test('it renders filter elements', () => {
    expect(wrapper?.find('[data-testid="reset-filter-button"]').exists()).toBe(true);
    expect(wrapper?.find('[data-testid="rollenarten-filter-select"]').exists()).toBe(true);
    expect(wrapper?.find('[data-testid="merkmale-filter-select"]').exists()).toBe(true);
    expect(wrapper?.findComponent(SchulenFilter).exists()).toBe(true);
    expect(wrapper?.find('[data-testid="angebote-filter-select"]').exists()).toBe(true);
  });

  test('reset button is disabled when no filter is active', () => {
    expect(wrapper?.find('[data-testid="reset-filter-button"]').classes()).toContain('v-btn--disabled');
  });

  test('reset button is enabled when a filter is active', async () => {
    searchFilterStore.selectedMerkmaleForRollen = [RollenMerkmal.KopersPflicht];
    await nextTick();
    expect(wrapper?.find('[data-testid="reset-filter-button"]').classes()).not.toContain('v-btn--disabled');
  });

  test('reset button is enabled when rollenarten filter is active', async () => {
    searchFilterStore.selectedRollenartenForRollen = [RollenArt.Lehr];
    await nextTick();
    expect(wrapper?.find('[data-testid="reset-filter-button"]').classes()).not.toContain('v-btn--disabled');
  });

  test('reset button is enabled when organisationen filter is active', async () => {
    searchFilterStore.selectedOrganisationenForRollen = ['org1'];
    await nextTick();
    expect(wrapper?.find('[data-testid="reset-filter-button"]').classes()).not.toContain('v-btn--disabled');
  });

  test('reset button is enabled when angebote filter is active', async () => {
    searchFilterStore.selectedAngeboteForRollen = ['sp1'];
    await nextTick();
    expect(wrapper?.find('[data-testid="reset-filter-button"]').classes()).not.toContain('v-btn--disabled');
  });

  test('clicking reset button resets filters and reloads rollen', async () => {
    searchFilterStore.selectedMerkmaleForRollen = [RollenMerkmal.KopersPflicht];
    await nextTick();

    await wrapper?.find('[data-testid="reset-filter-button"]').trigger('click');
    await nextTick();

    expect(searchFilterStore.setMerkmaleFilterForRollen).toHaveBeenCalledWith([]);
    expect(searchFilterStore.setRollenartenFilterForRollen).toHaveBeenCalledWith([]);
    expect(searchFilterStore.setOrganisationenFilterForRollen).toHaveBeenCalledWith([]);
    expect(searchFilterStore.setAngeboteFilterForRollen).toHaveBeenCalledWith([]);
    expect(searchFilterStore.setAngeboteNamesForRollen).toHaveBeenCalledWith({});
    expect(searchFilterStore.searchStringForRollen).toEqual('');
    expect(searchFilterStore.rollenPage).toEqual(1);
    expect(searchFilterStore.rollenPerPage).toEqual(rollenPerPageDefault);
    expect(rolleStore.getAllRollen).toHaveBeenCalled();
  });

  test('merkmale filter change calls store action and reloads rollen', async () => {
    const merkmaleSelect: ReturnType<VueWrapper['findComponent']> | undefined = wrapper?.findComponent(
      '[data-testid="merkmale-filter-select"]',
    );
    await merkmaleSelect?.setValue([RollenMerkmal.KopersPflicht]);

    expect(searchFilterStore.setMerkmaleFilterForRollen).toHaveBeenCalledWith([RollenMerkmal.KopersPflicht]);
    expect(rolleStore.getAllRollen).toHaveBeenLastCalledWith({
      offset: 0,
      limit: 30,
      searchString: '',
      merkmale: [RollenMerkmal.KopersPflicht],
      rollenarten: undefined,
      organisationenForFilter: undefined,
      serviceProviderIds: undefined,
    });
  });

  test('rollenarten filter change calls store action and reloads rollen', async () => {
    const rollenartenSelect: ReturnType<VueWrapper['findComponent']> | undefined = wrapper?.findComponent(
      '[data-testid="rollenarten-filter-select"]',
    );
    await rollenartenSelect?.setValue([RollenArt.Lehr]);

    expect(searchFilterStore.setRollenartenFilterForRollen).toHaveBeenCalledWith([RollenArt.Lehr]);
    expect(rolleStore.getAllRollen).toHaveBeenLastCalledWith({
      offset: 0,
      limit: 30,
      searchString: '',
      merkmale: undefined,
      rollenarten: [RollenArt.Lehr],
      organisationenForFilter: undefined,
      serviceProviderIds: undefined,
    });
  });

  test('organisationen filter change calls store action and reloads rollen', async () => {
    const schulenFilter: VueWrapper | undefined = wrapper?.findComponent({
      name: 'SchulenFilter',
    });
    const orgs: Array<string> = ['org1', 'org2'];
    searchFilterStore.selectedOrganisationenForRollen = orgs;
    await schulenFilter?.setValue(orgs);
    schulenFilter?.vm.$emit('update:selectedSchulen', orgs);
    await flushPromises();

    expect(searchFilterStore.setOrganisationenFilterForRollen).toHaveBeenCalledWith(['org1', 'org2']);
    expect(rolleStore.getAllRollen).toHaveBeenLastCalledWith({
      offset: 0,
      limit: 30,
      searchString: '',
      merkmale: undefined,
      rollenarten: undefined,
      organisationenForFilter: orgs,
      serviceProviderIds: undefined,
    });
  });

  test('angebote filter is visible when user has AngeboteVerwalten permission', async () => {
    authStore.hasAngeboteVerwaltenPermission = true;
    await nextTick();
    expect(wrapper?.find('[data-testid="angebote-filter-select"]').exists()).toBe(true);
  });

  test('angebote filter is hidden when user lacks AngeboteVerwalten permission', async () => {
    authStore.hasAngeboteVerwaltenPermission = false;
    await nextTick();
    expect(wrapper?.find('[data-testid="angebote-filter-select"]').exists()).toBe(false);
  });

  test('getServiceProvidersForRollenVerwaltung is called on mount when user has AngeboteVerwalten permission', async () => {
    authStore.hasAngeboteVerwaltenPermission = true;
    wrapper = mount(RolleManagementView, {
      attachTo: document.getElementById('app') || '',
      global: { plugins: [router] },
    });
    await flushPromises();
    expect(serviceProviderStore.getServiceProvidersForRollenVerwaltung).toHaveBeenCalledWith({ limit: 25 });
  });

  test('getServiceProvidersForRollenVerwaltung is not called on mount when user lacks AngeboteVerwalten permission', async () => {
    authStore.hasAngeboteVerwaltenPermission = false;
    vi.mocked(serviceProviderStore.getServiceProvidersForRollenVerwaltung).mockClear();
    wrapper = mount(RolleManagementView, {
      attachTo: document.getElementById('app') || '',
      global: { plugins: [router] },
    });
    await flushPromises();
    expect(serviceProviderStore.getServiceProvidersForRollenVerwaltung).not.toHaveBeenCalled();
  });

  describe('when angebote is selected in filter', () => {
    test('angebote filter change calls store action and reloads rollen', async () => {
      const angeboteSelect: ReturnType<VueWrapper['findComponent']> | undefined = wrapper?.findComponent(
        '[data-testid="angebote-filter-select"]',
      );
      await angeboteSelect?.setValue(['sp1']);

      expect(searchFilterStore.setAngeboteFilterForRollen).toHaveBeenCalledWith(['sp1']);
      expect(rolleStore.getAllRollen).toHaveBeenLastCalledWith({
        offset: 0,
        limit: 30,
        searchString: '',
        merkmale: undefined,
        rollenarten: undefined,
        organisationenForFilter: undefined,
        serviceProviderIds: ['sp1'],
      });
    });

    test('angebote filter shows selected items', async () => {
      serviceProviderStore.loading = false;
      serviceProviderStore.totalServiceProvidersForRollenVerwaltung = 5;
      searchFilterStore.selectedAngeboteForRollen = ['sp1', 'sp2'];
      await nextTick();

      expect(wrapper?.find('[data-testid="angebote-filter-select"]').text()).toContain('Landesangebote ausgewählt');
    });

    test('selecting an angebot stores its name in the cache', async () => {
      const angeboteSelect: ReturnType<VueWrapper['findComponent']> | undefined = wrapper?.findComponent(
        '[data-testid="angebote-filter-select"]',
      );
      await angeboteSelect?.setValue(['sp1']);

      expect(searchFilterStore.setAngeboteNamesForRollen).toHaveBeenCalledWith({ sp1: 'Service Provider 1' });
    });
  });

  describe('when selected angebot is not in current search results', () => {
    test('chip still displays provider name from cache after search filters it out', async () => {
      vi.mocked(searchFilterStore.setAngeboteNamesForRollen).mockImplementation((names: Record<string, string>) => {
        searchFilterStore.selectedAngeboteNamesForRollen = names;
      });

      const angeboteSelect: ReturnType<VueWrapper['findComponent']> | undefined = wrapper?.findComponent(
        '[data-testid="angebote-filter-select"]',
      );
      await angeboteSelect?.setValue(['sp1']);
      await nextTick();

      serviceProviderStore.serviceProvidersForRollenVerwaltung = [];
      await nextTick();

      expect(wrapper?.find('[data-testid="angebote-filter-select"]').text()).toContain('Service Provider 1');
    });
  });

  describe('when typing string in angebote filter', () => {
    test('triggers debounced server search', () => {
      vi.useFakeTimers();
      vi.mocked(serviceProviderStore.getServiceProvidersForRollenVerwaltung).mockClear();

      const angeboteSelect: VueWrapper | undefined = wrapper?.findComponent({ ref: 'angeboteFilterSelect' });
      angeboteSelect?.vm.$emit('update:search', 'test');

      vi.runAllTimers();
      vi.runAllTicks();

      expect(serviceProviderStore.getServiceProvidersForRollenVerwaltung).toHaveBeenCalledWith({
        limit: 25,
        searchStr: 'test',
      });

      vi.useRealTimers();
    });
  });

  describe('when typing empty string in angebote filter', () => {
    test('angebote filter passes undefined as searchStr', () => {
      vi.useFakeTimers();
      vi.mocked(serviceProviderStore.getServiceProvidersForRollenVerwaltung).mockClear();

      const angeboteSelect: VueWrapper | undefined = wrapper?.findComponent({ ref: 'angeboteFilterSelect' });
      angeboteSelect?.vm.$emit('update:search', '');

      vi.runAllTimers();
      vi.runAllTicks();

      expect(serviceProviderStore.getServiceProvidersForRollenVerwaltung).toHaveBeenCalledWith({
        limit: 25,
        searchStr: undefined,
      });

      vi.useRealTimers();
    });
  });

  test('search filter change resets to first page, calls store action and reloads rollen', async () => {
    const searchString: string = 'search';
    searchFilterStore.searchStringForRollen = searchString;
    searchFilterStore.rollenPage = 2;

    const searchInput: VueWrapper | undefined = wrapper?.findComponent({
      name: 'SearchField',
    });
    await searchInput?.setValue(searchString);
    searchInput?.vm.$emit('onApplySearchFilter', searchString);
    await flushPromises();

    expect(searchFilterStore.setSearchFilterForRollen).toHaveBeenCalledWith(searchString);
    expect(searchFilterStore.rollenPage).toEqual(1);
    expect(rolleStore.getAllRollen).toHaveBeenLastCalledWith({
      offset: 0,
      limit: 30,
      searchString: searchString,
      merkmale: undefined,
      rollenarten: undefined,
      organisationenForFilter: undefined,
    });
  });

  test('reset button is enabled when rollen filter is active', async () => {
    searchFilterStore.searchStringForRollen = 'search';
    await nextTick();
    expect(wrapper?.find('[data-testid="reset-filter-button"]').classes()).not.toContain('v-btn--disabled');
  });
});
