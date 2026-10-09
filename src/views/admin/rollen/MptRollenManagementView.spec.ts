import { RollenSystemRechtEnum } from '@/api-client/generated/api';
import routes from '@/router/routes';
import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
import { useOrganisationStore, type OrganisationStore } from '@/stores/OrganisationStore';
import { RollenArt, useRolleStore, type RolleStore } from '@/stores/RolleStore';
import { useSearchFilterStore, type SearchFilterStore } from '@/stores/SearchFilterStore';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { nextTick, type Component } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import MptRollenManagementView from './MptRollenManagementView.vue';

let router: Router;
let authStore: AuthStore;
let rolleStore: RolleStore;
let organisationStore: OrganisationStore;
let searchFilterStore: SearchFilterStore;
let wrapper: VueWrapper<InstanceType<typeof MptRollenManagementView>> | null = null;

function mountComponent(): VueWrapper<InstanceType<typeof MptRollenManagementView>> {
  wrapper = mount(MptRollenManagementView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        MptRollenManagementView: MptRollenManagementView as Component,
      },
      plugins: [router],
    },
  });
  return wrapper;
}

beforeEach(async (): Promise<void> => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  router = createRouter({
    history: createWebHistory(),
    routes,
  });

  router.push('/admin/rollen/mpt');
  await router.isReady();

  authStore = useAuthStore();
  rolleStore = useRolleStore();
  organisationStore = useOrganisationStore();
  searchFilterStore = useSearchFilterStore();

  authStore.$reset();
  rolleStore.$reset();
  organisationStore.$reset();
  searchFilterStore.$reset();
  authStore.hasRollenerweiternPermission = true;

  vi.spyOn(rolleStore, 'getAllRollen').mockResolvedValue();
  vi.spyOn(organisationStore, 'getOrganisationById').mockResolvedValue();
  vi.spyOn(searchFilterStore, 'setSchuleForMptRollen').mockImplementation((schuleId: string | null): void => {
    searchFilterStore.selectedSchuleForMptRollen = schuleId;
  });
});

afterEach((): void => {
  wrapper?.unmount();
  wrapper = null;
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('MptRollenManagementView', () => {
  it('renders hint text when no school is selected', async () => {
    const wrapper: VueWrapper<InstanceType<typeof MptRollenManagementView>> = mountComponent();
    await flushPromises();

    expect(wrapper.text()).toContain('Bitte wählen Sie zunächst im Filter eine Schule aus');
    expect(rolleStore.getAllRollen).not.toHaveBeenCalled();
  });

  it('loads rollen with MPT systemrecht when schule is selected', async () => {
    const wrapper: VueWrapper<InstanceType<typeof MptRollenManagementView>> = mountComponent();
    const schuleId: string = DoFactory.getSchule().id;
    const schuleFilter: VueWrapper = wrapper.findComponent({ name: 'SchulenFilter' });

    schuleFilter.vm.$emit('update:selectedSchulen', schuleId);
    await nextTick();
    await flushPromises();

    expect(rolleStore.getAllRollen).toHaveBeenCalledOnce();
    expect(organisationStore.getOrganisationById).toHaveBeenCalledExactlyOnceWith(schuleId);
    expect(rolleStore.getAllRollen).toHaveBeenCalledWith(
      expect.objectContaining({
        organisationenForFilter: [schuleId],
        systemrechte: [expect.stringMatching('MPT_ROLLEN_ZUORDNEN')],
      }),
    );
  });

  it('renders only rollenname and rollenart table headers', async () => {
    rolleStore.allRollen = [
      DoFactory.getRolleWithServiceProviders({ name: 'Nichtlehrrolle', rollenart: RollenArt.Nlehr }),
      DoFactory.getRolleWithServiceProviders({ name: 'Schulbegleitung', rollenart: RollenArt.Schb }),
    ];
    rolleStore.totalRollen = 2;

    const wrapper: VueWrapper<InstanceType<typeof MptRollenManagementView>> = mountComponent();
    await nextTick();

    expect(wrapper.text()).toContain('Rollenname');
    expect(wrapper.text()).toContain('Rollenart');
    expect(wrapper.find('[data-testid="rolle-management-title"]').exists()).toBe(false);
  });

  it('navigates to the role details with the selected school', async () => {
    const schuleId: string = DoFactory.getSchule().id;
    const rolle: ReturnType<typeof DoFactory.getRolleWithServiceProviders> = DoFactory.getRolleWithServiceProviders();
    searchFilterStore.selectedSchuleForMptRollen = schuleId;
    rolleStore.allRollen = [rolle];
    rolleStore.totalRollen = 1;
    const wrapper: VueWrapper<InstanceType<typeof MptRollenManagementView>> = mountComponent();
    await flushPromises();
    const routerPushSpy: ReturnType<typeof vi.spyOn> = vi.spyOn(router, 'push').mockResolvedValue();

    const resultTable: VueWrapper = wrapper.findComponent({ name: 'ResultTable' });
    resultTable.vm.$emit('onHandleRowClick', new PointerEvent('click'), {
      item: {
        id: rolle.id,
        name: rolle.name,
        rollenart: rolle.rollenart,
      },
    });
    await flushPromises();

    expect(routerPushSpy).toHaveBeenCalledWith({
      name: 'mpt-rolle-details',
      params: { id: rolle.id },
      query: { orga: schuleId },
    });
  });

  it('disables role navigation without permission to extend roles', async () => {
    authStore.hasRollenerweiternPermission = false;
    const rolle: ReturnType<typeof DoFactory.getRolleWithServiceProviders> = DoFactory.getRolleWithServiceProviders();
    searchFilterStore.selectedSchuleForMptRollen = DoFactory.getSchule().id;
    const wrapper: VueWrapper<InstanceType<typeof MptRollenManagementView>> = mountComponent();
    await flushPromises();
    const routerPushSpy: ReturnType<typeof vi.spyOn> = vi.spyOn(router, 'push').mockResolvedValue();

    const resultTable: VueWrapper = wrapper.findComponent({ name: 'ResultTable' });
    const resultTableProps: { disableRowClick?: boolean } = resultTable.props();
    expect(resultTableProps.disableRowClick).toBe(true);
    resultTable.vm.$emit('onHandleRowClick', new PointerEvent('click'), {
      item: { id: rolle.id, name: rolle.name, rollenart: rolle.rollenart },
    });
    await flushPromises();
    expect(routerPushSpy).not.toHaveBeenCalled();
  });

  it('sorts by rollenart and then by rollenname', async () => {
    const wrapper: VueWrapper<InstanceType<typeof MptRollenManagementView>> = mountComponent();
    await flushPromises();

    rolleStore.allRollen = [
      DoFactory.getRolleWithServiceProviders({ name: 'Nichtlehrrolle', rollenart: RollenArt.Nlehr }),
      DoFactory.getRolleWithServiceProviders({ name: 'Schulbegleitung', rollenart: RollenArt.Schb }),
    ];
    rolleStore.totalRollen = 2;
    await nextTick();

    const resultTable: VueWrapper = wrapper.findComponent({ name: 'ResultTable' });
    const tableItems: Array<{ name: string }> = (
      resultTable as unknown as { props: (key: string) => Array<{ name: string }> }
    ).props('items');
    expect(tableItems[0]!.name).toBe('Nichtlehrrolle');
    expect(tableItems[1]!.name).toBe('Schulbegleitung');
  });

  it('loads page 2 with updated offset', async () => {
    const wrapper: VueWrapper<InstanceType<typeof MptRollenManagementView>> = mountComponent();
    const schuleId: string = DoFactory.getSchule().id;
    const schuleFilter: VueWrapper = wrapper.findComponent({ name: 'SchulenFilter' });
    schuleFilter.vm.$emit('update:selectedSchulen', schuleId);
    await nextTick();
    await flushPromises();

    vi.mocked(rolleStore.getAllRollen).mockClear();
    rolleStore.totalRollen = 50;
    await nextTick();

    await wrapper.find('.v-pagination__next button:not(.v-btn--disabled)').trigger('click');
    await flushPromises();
    expect(rolleStore.getAllRollen).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        organisationenForFilter: [schuleId],
        offset: 30,
      }),
    );
  });

  it('updates limit and reloads data', async () => {
    const wrapper: VueWrapper<InstanceType<typeof MptRollenManagementView>> = mountComponent();
    const schuleId: string = DoFactory.getSchule().id;
    const schuleFilter: VueWrapper = wrapper.findComponent({ name: 'SchulenFilter' });

    schuleFilter.vm.$emit('update:selectedSchulen', schuleId);
    await nextTick();
    await flushPromises();

    vi.mocked(rolleStore.getAllRollen).mockClear();
    const resultTable: VueWrapper = wrapper.findComponent({ name: 'ResultTable' });
    resultTable.vm.$emit('onItemsPerPageUpdate', 50);
    await nextTick();
    await flushPromises();

    expect(rolleStore.getAllRollen).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        organisationenForFilter: [schuleId],
        limit: 50,
      }),
    );
  });

  it('resets school filter and table state', async () => {
    const wrapper: VueWrapper<InstanceType<typeof MptRollenManagementView>> = mountComponent();
    const schuleId: string = DoFactory.getSchule().id;
    const schuleFilter: VueWrapper = wrapper.findComponent({ name: 'SchulenFilter' });

    rolleStore.allRollen = [DoFactory.getRolleWithServiceProviders()];
    rolleStore.totalRollen = 1;

    schuleFilter.vm.$emit('update:selectedSchulen', schuleId);
    await nextTick();
    await flushPromises();

    searchFilterStore.mptRollenPage = 2;
    searchFilterStore.mptRollenPerPage = 50;
    organisationStore.currentOrganisation = DoFactory.getSchule({ id: schuleId });
    await nextTick();
    await flushPromises();
    vi.mocked(rolleStore.getAllRollen).mockClear();
    vi.mocked(organisationStore.getOrganisationById).mockClear();

    await wrapper.find('[data-testid="reset-filter-button"]').trigger('click');
    await nextTick();
    await flushPromises();

    expect(rolleStore.allRollen).toEqual([]);
    expect(rolleStore.totalRollen).toBe(0);
    expect(searchFilterStore.selectedSchuleForMptRollen).toBeNull();
    expect(searchFilterStore.mptRollenPage).toBe(1);
    expect(searchFilterStore.mptRollenPerPage).toBe(30);
    expect(organisationStore.currentOrganisation).toBeNull();
    expect(rolleStore.getAllRollen).not.toHaveBeenCalled();
    expect(organisationStore.getOrganisationById).not.toHaveBeenCalled();
  });

  it('restores selected school from search filter store on mount', async () => {
    const schuleId: string = DoFactory.getSchule().id;
    searchFilterStore.selectedSchuleForMptRollen = schuleId;
    searchFilterStore.mptRollenPage = 2;
    searchFilterStore.mptRollenPerPage = 50;

    const wrapper: VueWrapper<InstanceType<typeof MptRollenManagementView>> = mountComponent();
    await flushPromises();

    const schuleFilter: VueWrapper = wrapper.findComponent({ name: 'SchulenFilter' });
    expect(schuleFilter.props()).toEqual(expect.objectContaining({ selectedSchulen: [schuleId] }));
    expect(organisationStore.getOrganisationById).toHaveBeenCalledExactlyOnceWith(schuleId);
    expect(rolleStore.getAllRollen).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        organisationenForFilter: [schuleId],
        offset: 50,
        limit: 50,
      }),
    );
  });

  it.each([
    { page: 2, limit: 30, offset: 30 },
    { page: 1, limit: 50, offset: 0 },
    { page: 2, limit: 50, offset: 50 },
  ])(
    'dispatches once when reactive pagination changes to page $page and limit $limit',
    async ({ page, limit, offset }: { page: number; limit: number; offset: number }): Promise<void> => {
      const schuleId: string = DoFactory.getSchule().id;
      searchFilterStore.selectedSchuleForMptRollen = schuleId;
      rolleStore.totalRollen = 100;
      mountComponent();
      await flushPromises();
      vi.mocked(rolleStore.getAllRollen).mockClear();
      vi.mocked(organisationStore.getOrganisationById).mockClear();

      searchFilterStore.mptRollenPage = page;
      searchFilterStore.mptRollenPerPage = limit;
      await nextTick();
      await flushPromises();

      expect(rolleStore.getAllRollen).toHaveBeenCalledExactlyOnceWith({
        offset,
        limit,
        searchString: '',
        organisationenForFilter: [schuleId],
        systemrechte: [RollenSystemRechtEnum.MptRollenZuordnen],
      });
      expect(organisationStore.getOrganisationById).not.toHaveBeenCalled();
    },
  );

  it.each([
    { total: 40, expectedPage: 1, expectedOffset: 0 },
    { total: 100, expectedPage: 2, expectedOffset: 50 },
  ])(
    'dispatches the final page-size filter once with $total total rollen',
    async ({
      total,
      expectedPage,
      expectedOffset,
    }: {
      total: number;
      expectedPage: number;
      expectedOffset: number;
    }): Promise<void> => {
      const schuleId: string = DoFactory.getSchule().id;
      searchFilterStore.selectedSchuleForMptRollen = schuleId;
      searchFilterStore.mptRollenPage = 2;
      rolleStore.totalRollen = total;
      const wrapper: VueWrapper<InstanceType<typeof MptRollenManagementView>> = mountComponent();
      await flushPromises();
      vi.mocked(rolleStore.getAllRollen).mockClear();
      vi.mocked(organisationStore.getOrganisationById).mockClear();

      const resultTable: VueWrapper = wrapper.findComponent({ name: 'ResultTable' });
      resultTable.vm.$emit('onItemsPerPageUpdate', 50);
      await nextTick();
      await flushPromises();

      expect(searchFilterStore.mptRollenPage).toBe(expectedPage);
      expect(rolleStore.getAllRollen).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ offset: expectedOffset, limit: 50, organisationenForFilter: [schuleId] }),
      );
      expect(organisationStore.getOrganisationById).not.toHaveBeenCalled();
    },
  );

  it('does not dispatch when the filter inputs are unchanged', async () => {
    const schuleId: string = DoFactory.getSchule().id;
    searchFilterStore.selectedSchuleForMptRollen = schuleId;
    const wrapper: VueWrapper<InstanceType<typeof MptRollenManagementView>> = mountComponent();
    await flushPromises();
    vi.mocked(rolleStore.getAllRollen).mockClear();
    vi.mocked(organisationStore.getOrganisationById).mockClear();

    const schuleFilter: VueWrapper = wrapper.findComponent({ name: 'SchulenFilter' });
    const resultTable: VueWrapper = wrapper.findComponent({ name: 'ResultTable' });
    schuleFilter.vm.$emit('update:selectedSchulen', schuleId);
    resultTable.vm.$emit('onPageUpdate', 1);
    resultTable.vm.$emit('onItemsPerPageUpdate', 30);
    await nextTick();
    await flushPromises();

    expect(rolleStore.getAllRollen).not.toHaveBeenCalled();
    expect(organisationStore.getOrganisationById).not.toHaveBeenCalled();
  });

  it('does not dispatch pagination changes without a selected school', async () => {
    const wrapper: VueWrapper<InstanceType<typeof MptRollenManagementView>> = mountComponent();
    await flushPromises();

    const resultTable: VueWrapper = wrapper.findComponent({ name: 'ResultTable' });
    resultTable.vm.$emit('onPageUpdate', 2);
    resultTable.vm.$emit('onItemsPerPageUpdate', 50);
    await nextTick();
    await flushPromises();

    expect(rolleStore.getAllRollen).not.toHaveBeenCalled();
    expect(organisationStore.getOrganisationById).not.toHaveBeenCalled();
  });

  it('reloads rollen and organisation details once when the school changes', async () => {
    searchFilterStore.selectedSchuleForMptRollen = DoFactory.getSchule().id;
    searchFilterStore.mptRollenPage = 2;
    rolleStore.totalRollen = 100;
    const wrapper: VueWrapper<InstanceType<typeof MptRollenManagementView>> = mountComponent();
    await flushPromises();
    vi.mocked(rolleStore.getAllRollen).mockClear();
    vi.mocked(organisationStore.getOrganisationById).mockClear();
    const schuleId: string = DoFactory.getSchule().id;

    const schuleFilter: VueWrapper = wrapper.findComponent({ name: 'SchulenFilter' });
    schuleFilter.vm.$emit('update:selectedSchulen', schuleId);
    await nextTick();
    await flushPromises();

    expect(searchFilterStore.selectedSchuleForMptRollen).toBe(schuleId);
    expect(rolleStore.getAllRollen).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ organisationenForFilter: [schuleId], offset: 30 }),
    );
    expect(organisationStore.getOrganisationById).toHaveBeenCalledExactlyOnceWith(schuleId);
  });

  it('dispatches once for an autoselected school on mount', async () => {
    const schule: ReturnType<typeof DoFactory.getSchule> = DoFactory.getSchule();
    authStore.currentUser = {
      ...DoFactory.getUserinfoResponse(),
      personenkontexte: [
        {
          ...DoFactory.getPersonenkontextRolleFieldsResponse({
            rolle: DoFactory.getRollenSystemRechtServiceProviderIDResponse({
              systemrechte: [RollenSystemRechtEnum.MptRollenZuordnen],
            }),
          }),
          organisation: schule,
        },
      ],
    };
    mountComponent();
    await flushPromises();

    expect(searchFilterStore.selectedSchuleForMptRollen).toBe(schule.id);
    expect(rolleStore.getAllRollen).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ organisationenForFilter: [schule.id], offset: 0, limit: 30 }),
    );
    expect(organisationStore.getOrganisationById).toHaveBeenCalledExactlyOnceWith(schule.id);
  });
});
