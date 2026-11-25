import SearchField from '@/components/admin/SearchField.vue';
import VidisInfoDialog from '@/components/admin/service-provider/VidisInfoDialog.vue';
import type { ManageableServiceProviderSimpleListEntryResponse } from '@/api-client/generated';
import routes from '@/router/routes';
import {
  DEFAULT_SERVICE_PROVIDER_KATEGORIEN,
  useSearchFilterStore,
  type SearchFilterStore,
} from '@/stores/SearchFilterStore';
import {
  ServiceProviderKategorie,
  useServiceProviderStore,
  type ManageableServiceProviderSimpleListEntry,
  type ServiceProviderStore,
} from '@/stores/ServiceProviderStore';
import { flushPromises, mount, VueWrapper, enableAutoUnmount, type DOMWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import type { Mock, MockInstance } from 'vitest';
import { nextTick, type Component } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import ServiceProviderManagementView from './ServiceProviderManagementView.vue';

type ManagementViewWrapper = VueWrapper<InstanceType<typeof ServiceProviderManagementView>>;

type SetupOptions = {
  serviceProviderState?: Partial<ServiceProviderStore['$state']>;
  searchFilterState?: Partial<SearchFilterStore['$state']>;
};

type SetupResult = {
  wrapper: ManagementViewWrapper;
  router: Router;
  serviceProviderStore: ServiceProviderStore;
  searchFilterStore: SearchFilterStore;
};

const NEW_KATEGORIEN: ReadonlyArray<{ kategorie: ServiceProviderKategorie; label: string }> = [
  { kategorie: ServiceProviderKategorie.UnterrichtUndLernen, label: 'Unterricht und Lernen' },
  { kategorie: ServiceProviderKategorie.KommunikationUndZusammenarbeit, label: 'Kommunikation und Zusammenarbeit' },
  { kategorie: ServiceProviderKategorie.SchulorganisationUndVerwaltung, label: 'Schulorganisation und -verwaltung' },
  { kategorie: ServiceProviderKategorie.FortbildungUndQualifizierung, label: 'Fortbildung und Qualifizierung' },
  { kategorie: ServiceProviderKategorie.InformationenUndPortale, label: 'Informationen und Portale' },
  { kategorie: ServiceProviderKategorie.HilfeUndUnterstuetzung, label: 'Hilfe & Unterstützung' },
];

enableAutoUnmount(afterEach);

async function setup(options: SetupOptions = {}): Promise<SetupResult> {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  const router: Router = createRouter({
    history: createWebHistory(),
    routes,
  });
  router.push('/');
  await router.isReady();

  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
  serviceProviderStore.$reset();
  serviceProviderStore.manageableServiceProviders = [
    DoFactory.getManageableServiceProviderSimpleListEntryResponse({ hasSomeVerwaltenPermission: true }),
    DoFactory.getManageableServiceProviderSimpleListEntryResponse({ hasSomeVerwaltenPermission: false }),
  ];
  serviceProviderStore.$patch(options.serviceProviderState ?? {});

  const searchFilterStore: SearchFilterStore = useSearchFilterStore();
  searchFilterStore.$reset();
  searchFilterStore.$patch(options.searchFilterState ?? {});

  const wrapper: ManagementViewWrapper = mount(ServiceProviderManagementView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        ServiceProviderManagementView: ServiceProviderManagementView as Component,
      },
      plugins: [router],
    },
  });

  return { wrapper, router, serviceProviderStore, searchFilterStore };
}

function getKategorienSelect(wrapper: ManagementViewWrapper): VueWrapper {
  return wrapper.findComponent('[data-testid="kategorien-select"]') as VueWrapper;
}

describe('ServiceProviderManagementView', () => {
  it('should render', async () => {
    const { wrapper }: SetupResult = await setup();
    expect(wrapper.exists()).toBe(true);
  });

  it('renders table with active kategorie filter', async () => {
    const { wrapper, serviceProviderStore }: SetupResult = await setup();
    const tableRows: DOMWrapper<Element>[] = wrapper.findAll('.v-data-table__tr');
    expect(tableRows.length).toBe(serviceProviderStore.manageableServiceProviders.length);
  });

  it('routes to service provider details page', async () => {
    const { wrapper, router }: SetupResult = await setup();
    const push: MockInstance = vi.spyOn(router, 'push');

    await wrapper.find('.v-data-table__tr').trigger('click');
    await nextTick();

    expect(push).toHaveBeenCalledTimes(1);
  });

  describe('kategorie column', () => {
    it('renders the translated new kategorien truncated with the full name as hover text', async () => {
      const { wrapper }: SetupResult = await setup({
        serviceProviderState: {
          manageableServiceProviders: NEW_KATEGORIEN.map(({ kategorie }: { kategorie: ServiceProviderKategorie }) =>
            DoFactory.getManageableServiceProviderSimpleListEntryResponse({ kategorie }),
          ),
        },
      });

      const titles: Array<string | undefined> = wrapper
        .findAll('.v-data-table__tr .line-clamp-2')
        .map((cell: DOMWrapper<Element>) => cell.attributes('title'));
      expect(titles).toEqual(expect.arrayContaining(NEW_KATEGORIEN.map(({ label }: { label: string }) => label)));
    });
  });

  describe('kategorie filter', () => {
    it('disables the reset filter button by default', async () => {
      const { wrapper }: SetupResult = await setup();
      expect(wrapper.find('[data-testid="reset-filter-button"]').attributes('disabled')).toBeDefined();
    });

    it('loads the new kategorien as part of the default kategorie selection', async () => {
      const { serviceProviderStore }: SetupResult = await setup();
      await flushPromises();
      const reloadSpy: Mock<ServiceProviderStore['getManageableServiceProviders']> = vi.spyOn(
        serviceProviderStore,
        'getManageableServiceProviders',
      );

      expect(reloadSpy.mock.lastCall?.[0].kategorien).toEqual(
        expect.arrayContaining(
          NEW_KATEGORIEN.map(({ kategorie }: { kategorie: ServiceProviderKategorie }) => kategorie),
        ),
      );
    });

    it('reloads data with the selected kategorien and persists the filter in the search filter store', async () => {
      const { wrapper, serviceProviderStore, searchFilterStore }: SetupResult = await setup();
      const reloadSpy: Mock<ServiceProviderStore['getManageableServiceProviders']> = vi
        .spyOn(serviceProviderStore, 'getManageableServiceProviders')
        .mockResolvedValue();

      getKategorienSelect(wrapper).vm.$emit('update:model-value', [ServiceProviderKategorie.Email]);
      await flushPromises();

      expect(searchFilterStore.setKategorienForServiceProvider).toHaveBeenCalledWith([ServiceProviderKategorie.Email]);
      expect(reloadSpy).toHaveBeenLastCalledWith({
        kategorien: [ServiceProviderKategorie.Email],
        searchFilter: '',
        page: searchFilterStore.serviceProviderPage,
        entriesPerPage: searchFilterStore.serviceProviderPerPage,
      });
      expect(wrapper.find('[data-testid="reset-filter-button"]').attributes('disabled')).toBeUndefined();
    });

    const defaultKategorien: readonly ServiceProviderKategorie[] = DEFAULT_SERVICE_PROVIDER_KATEGORIEN;

    it('selects the default kategorien by default', async () => {
      const { wrapper }: SetupResult = await setup();
      expect((wrapper.vm as unknown as { selectedKategorien: ServiceProviderKategorie[] }).selectedKategorien).toEqual(
        defaultKategorien,
      );
    });

    it('resets the kategorie filter and reloads data with the default kategorien selected', async () => {
      const { wrapper, serviceProviderStore, searchFilterStore }: SetupResult = await setup();
      getKategorienSelect(wrapper).vm.$emit('update:model-value', [ServiceProviderKategorie.Email]);
      await flushPromises();

      const reloadSpy: Mock<ServiceProviderStore['getManageableServiceProviders']> = vi
        .spyOn(serviceProviderStore, 'getManageableServiceProviders')
        .mockResolvedValue();

      await wrapper.find('[data-testid="reset-filter-button"]').trigger('click');
      await flushPromises();

      expect(reloadSpy).toHaveBeenLastCalledWith({
        kategorien: defaultKategorien,
        searchFilter: '',
        page: searchFilterStore.serviceProviderPage,
        entriesPerPage: searchFilterStore.serviceProviderPerPage,
      });
      expect(wrapper.find('[data-testid="reset-filter-button"]').attributes('disabled')).toBeDefined();
    });

    it('clears the selection when the clear (X) icon is used', async () => {
      const { wrapper }: SetupResult = await setup();

      getKategorienSelect(wrapper).vm.$emit('update:model-value', []);
      await flushPromises();

      expect((wrapper.vm as unknown as { selectedKategorien: ServiceProviderKategorie[] }).selectedKategorien).toEqual(
        [],
      );
      expect(wrapper.find('[data-testid="reset-filter-button"]').attributes('disabled')).toBeUndefined();
    });

    it('renders a chip for a single selected kategorie and a count label for multiple selections', async () => {
      const { wrapper }: SetupResult = await setup();

      getKategorienSelect(wrapper).vm.$emit('update:model-value', [ServiceProviderKategorie.Email]);
      await nextTick();
      expect(wrapper.find('.v-chip').exists()).toBe(true);
      expect(wrapper.find('.selection-count').exists()).toBe(false);

      getKategorienSelect(wrapper).vm.$emit('update:model-value', [
        ServiceProviderKategorie.Email,
        ServiceProviderKategorie.Verwaltung,
      ]);
      await nextTick();
      expect(wrapper.find('.selection-count').exists()).toBe(true);
      expect(wrapper.find('.selection-count').text()).toContain('2');
    });
  });

  describe('search filter', () => {
    it('initializes the search field with the persisted filter from the store', async () => {
      const { wrapper }: SetupResult = await setup({
        searchFilterState: { searchStringForServiceProvider: 'persisted-suche' },
      });
      await flushPromises();

      const searchField: VueWrapper<InstanceType<typeof SearchField>> = wrapper.findComponent(SearchField);
      expect(searchField.props('initialValue')).toBe('persisted-suche');
      expect((searchField.vm as unknown as { searchFilter: string }).searchFilter).toBe('persisted-suche');
      expect(wrapper.find('[data-testid="reset-filter-button"]').attributes('disabled')).toBeUndefined();
    });

    describe('when a search filter is applied', () => {
      it('resets the page to the first page', async () => {
        const { wrapper, serviceProviderStore, searchFilterStore }: SetupResult = await setup({
          searchFilterState: { serviceProviderPage: 3 },
        });

        const reloadSpy: Mock<ServiceProviderStore['getManageableServiceProviders']> = vi
          .spyOn(serviceProviderStore, 'getManageableServiceProviders')
          .mockResolvedValue();

        searchFilterStore.searchStringForServiceProvider = 'meine-suche';
        (wrapper.findComponent(SearchField) as VueWrapper).vm.$emit('onApplySearchFilter', 'meine-suche');
        await flushPromises();

        expect(searchFilterStore.serviceProviderPage).toBe(1);
        expect(reloadSpy).toHaveBeenLastCalledWith({
          kategorien: DEFAULT_SERVICE_PROVIDER_KATEGORIEN,
          searchFilter: 'meine-suche',
          page: 1,
          entriesPerPage: searchFilterStore.serviceProviderPerPage,
        });
      });

      it('persists the applied search filter in the store and reloads data with it', async () => {
        const { wrapper, serviceProviderStore, searchFilterStore }: SetupResult = await setup();
        searchFilterStore.searchStringForServiceProvider = 'meine-suche';

        const reloadSpy: Mock<ServiceProviderStore['getManageableServiceProviders']> = vi
          .spyOn(serviceProviderStore, 'getManageableServiceProviders')
          .mockResolvedValue();

        (wrapper.findComponent(SearchField) as VueWrapper).vm.$emit('onApplySearchFilter', 'meine-suche');
        await flushPromises();

        expect(searchFilterStore.setSearchFilterForServiceProvider).toHaveBeenCalledWith('meine-suche');
        expect(reloadSpy).toHaveBeenLastCalledWith({
          kategorien: DEFAULT_SERVICE_PROVIDER_KATEGORIEN,
          searchFilter: 'meine-suche',
          page: searchFilterStore.serviceProviderPage,
          entriesPerPage: searchFilterStore.serviceProviderPerPage,
        });
      });

      it('enables the reset filter button', async () => {
        const { wrapper }: SetupResult = await setup();
        expect(wrapper.find('[data-testid="reset-filter-button"]').attributes('disabled')).toBeDefined();

        (wrapper.findComponent(SearchField) as VueWrapper).vm.$emit('onApplySearchFilter', 'meine-suche');
        await flushPromises();

        expect(wrapper.find('[data-testid="reset-filter-button"]').attributes('disabled')).toBeUndefined();
      });

      it('clears the search filter and search field when resetting', async () => {
        const { wrapper, searchFilterStore }: SetupResult = await setup();
        const searchField: VueWrapper = wrapper.findComponent(SearchField) as VueWrapper;
        (searchField.vm as unknown as { searchFilter: string }).searchFilter = 'meine-suche';

        searchField.vm.$emit('onApplySearchFilter', 'meine-suche');
        await flushPromises();
        expect(wrapper.find('[data-testid="reset-filter-button"]').attributes('disabled')).toBeUndefined();

        await wrapper.find('[data-testid="reset-filter-button"]').trigger('click');
        await flushPromises();

        expect(searchFilterStore.setSearchFilterForServiceProvider).toHaveBeenLastCalledWith('');
        expect((searchField.vm as unknown as { searchFilter: string }).searchFilter).toBe('');
        expect(wrapper.find('[data-testid="reset-filter-button"]').attributes('disabled')).toBeDefined();
      });
    });
  });

  describe('ServiceProviderDelete', () => {
    it('renders ServiceProviderDelete button for each row', async () => {
      const { wrapper, serviceProviderStore }: SetupResult = await setup();
      // Find all delete icons (activators)
      const deleteIcons: DOMWrapper<Element>[] = wrapper.findAll(
        '[data-testid="open-service-provider-delete-dialog-icon"]',
      );
      expect(deleteIcons.length).toBe(
        serviceProviderStore.manageableServiceProviders.filter(
          (sp: ManageableServiceProviderSimpleListEntry) => sp.hasSomeVerwaltenPermission,
        ).length,
      );
    });

    it('opens and confirms delete dialog, calls store method', async () => {
      const { wrapper, serviceProviderStore }: SetupResult = await setup();
      // Find first delete icon and click it
      const deleteIcon: DOMWrapper<Element> = wrapper.find('[data-testid="open-service-provider-delete-dialog-icon"]');
      await deleteIcon.trigger('click');
      await nextTick();

      // Find and click the confirm delete button
      const confirmBtn: HTMLElement | null = document.querySelector('[data-testid="service-provider-delete-button"]');
      expect(confirmBtn).toBeTruthy();

      // Spy on the store method
      const deleteSpy: Mock<ServiceProviderStore['deleteServiceProvider']> = vi
        .spyOn(serviceProviderStore, 'deleteServiceProvider')
        .mockResolvedValue();
      // Click confirm
      if (confirmBtn) {
        confirmBtn.click();
        await nextTick();
        expect(deleteSpy).toHaveBeenCalled();
      }
      deleteSpy.mockRestore();
    });

    it('opens vidis info dialog with provider name and closes it on ok click', async () => {
      const { wrapper, serviceProviderStore }: SetupResult = await setup();
      const vidisProvider: ManageableServiceProviderSimpleListEntryResponse =
        DoFactory.getManageableServiceProviderSimpleListEntryResponse({
          hasSomeVerwaltenPermission: true,
          vidisAngebotId: 'vidis-angebot-1',
        });
      serviceProviderStore.manageableServiceProviders = [vidisProvider];
      await nextTick();

      const deleteIcon: DOMWrapper<Element> = wrapper.find('[data-testid="open-service-provider-delete-dialog-icon"]');
      await deleteIcon.trigger('click');

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
        expect(dialogTextInActiveOverlay?.textContent).toContain(vidisProvider.name);
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

    it('clears the cached service provider once the vidis info dialog finishes closing', async () => {
      const { wrapper, serviceProviderStore }: SetupResult = await setup();
      const vidisProvider: ManageableServiceProviderSimpleListEntryResponse =
        DoFactory.getManageableServiceProviderSimpleListEntryResponse({
          hasSomeVerwaltenPermission: true,
          vidisAngebotId: 'vidis-angebot-1',
        });
      serviceProviderStore.manageableServiceProviders = [vidisProvider];
      await nextTick();

      const deleteIcon: DOMWrapper<Element> = wrapper.find('[data-testid="open-service-provider-delete-dialog-icon"]');
      await deleteIcon.trigger('click');
      await nextTick();

      expect((wrapper.vm as unknown as { serviceProviderToDelete: unknown }).serviceProviderToDelete).toEqual(
        expect.objectContaining({ id: vidisProvider.id }),
      );

      const vidisDialog: VueWrapper = wrapper.findComponent(VidisInfoDialog) as VueWrapper;
      vidisDialog.vm.$emit('after-leave');
      await nextTick();

      expect((wrapper.vm as unknown as { serviceProviderToDelete: unknown }).serviceProviderToDelete).toBeNull();
    });

    it('closes the delete dialog and removes provider if successful', async () => {
      const { wrapper, serviceProviderStore }: SetupResult = await setup();

      const remainingProvider: ManageableServiceProviderSimpleListEntry =
        serviceProviderStore.manageableServiceProviders[1]!;

      const reloadSpy: Mock<ServiceProviderStore['getManageableServiceProviders']> = vi
        .spyOn(serviceProviderStore, 'getManageableServiceProviders')
        .mockResolvedValue();

      const deleteIcon: DOMWrapper<Element> = wrapper.find('[data-testid="open-service-provider-delete-dialog-icon"]');
      await deleteIcon.trigger('click');
      await nextTick();

      const confirmBtn: HTMLElement | null = document.querySelector('[data-testid="service-provider-delete-button"]');
      expect(confirmBtn).toBeTruthy();
      confirmBtn!.click();
      await nextTick();

      const closeBtn: HTMLElement | null = document.querySelector(
        '[data-testid="close-service-provider-delete-success-dialog-button"]',
      );
      expect(closeBtn).toBeTruthy();
      closeBtn!.click();
      await nextTick();

      await flushPromises();

      expect(serviceProviderStore.manageableServiceProviders).toEqual([expect.objectContaining(remainingProvider)]);
      expect(reloadSpy).toHaveBeenCalled();
      reloadSpy.mockRestore();
    });

    it('renders SpshAlert when errorCode is set', async () => {
      const { wrapper, serviceProviderStore }: SetupResult = await setup();
      serviceProviderStore.errorCode = 'UNSPECIFIED_ERROR';
      await nextTick();
      const alert: DOMWrapper<Element> = wrapper.find('[data-testid="service-provider-management-error-alert"]');
      expect(alert.exists()).toBe(true);
    });

    it('clears error and reloads data when alert button is clicked', async () => {
      const { wrapper, serviceProviderStore }: SetupResult = await setup();
      serviceProviderStore.errorCode = 'UNSPECIFIED_ERROR';
      await nextTick();
      const reloadSpy: Mock<ServiceProviderStore['getManageableServiceProviders']> = vi
        .spyOn(serviceProviderStore, 'getManageableServiceProviders')
        .mockResolvedValue();
      const btn: DOMWrapper<Element> = wrapper.find('[data-testid="service-provider-management-error-alert"] button');
      expect(btn.exists()).toBe(true);
      await btn.trigger('click');
      await nextTick();
      expect(serviceProviderStore.errorCode).toBe('');
      expect(reloadSpy).toHaveBeenCalled();
      reloadSpy.mockRestore();
    });
  });

  describe('pagination', () => {
    it('updates the search filter store when the page size changes', async () => {
      const { wrapper, searchFilterStore }: SetupResult = await setup();
      const resultTable: VueWrapper = wrapper.findComponent({ name: 'ResultTable' });
      resultTable.vm.$emit('onItemsPerPageUpdate', 50);
      await nextTick();

      expect(searchFilterStore.serviceProviderPerPage).toBe(50);
    });

    it('updates the search filter store when the page changes', async () => {
      const { wrapper, searchFilterStore }: SetupResult = await setup({
        serviceProviderState: { totalManageableServiceProviders: 100 },
      });
      const resultTable: VueWrapper = wrapper.findComponent({ name: 'ResultTable' });
      resultTable.vm.$emit('onPageUpdate', 2);
      await nextTick();

      expect(searchFilterStore.serviceProviderPage).toBe(2);
    });
  });
});
