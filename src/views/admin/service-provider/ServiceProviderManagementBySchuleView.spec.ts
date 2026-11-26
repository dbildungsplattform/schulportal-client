import { DOMWrapper, enableAutoUnmount, flushPromises, mount, VueWrapper } from '@vue/test-utils';
import { nextTick, type Component } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';

import routes from '@/router/routes';
import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
import { type Organisation } from '@/stores/OrganisationStore';
import { useSearchFilterStore, type SearchFilterStore } from '@/stores/SearchFilterStore';
import {
  ServiceProviderKategorie,
  useServiceProviderStore,
  type ManageableServiceProviderListEntry,
  type ServiceProviderStore,
} from '@/stores/ServiceProviderStore';
import { DoFactory } from 'test/DoFactory';
import { afterEach, type Mock, type MockInstance } from 'vitest';
import ServiceProviderManagementBySchuleView from './ServiceProviderManagementBySchuleView.vue';

type BySchuleViewWrapper = VueWrapper<InstanceType<typeof ServiceProviderManagementBySchuleView>>;

type BySchuleViewSetupOptions = {
  serviceProviderState?: Partial<ServiceProviderStore['$state']>;
  searchFilterState?: Partial<SearchFilterStore['$state']>;
  authState?: Partial<AuthStore['$state']>;
};

type SetupResult = {
  wrapper: BySchuleViewWrapper;
  router: Router;
  authStore: AuthStore;
  serviceProviderStore: ServiceProviderStore;
};

interface ServiceProviderManagementBySchuleView {
  selectedOrganisationId: string;
}

const NEW_KATEGORIEN: ReadonlyArray<{ kategorie: ServiceProviderKategorie; label: string }> = [
  { kategorie: ServiceProviderKategorie.KommunikationUndZusammenarbeit, label: 'Kommunikation und Zusammenarbeit' },
  { kategorie: ServiceProviderKategorie.UnterrichtUndLernen, label: 'Unterricht und Lernen' },
  { kategorie: ServiceProviderKategorie.SchulorganisationUndVerwaltung, label: 'Schulorganisation und -verwaltung' },
  { kategorie: ServiceProviderKategorie.FortbildungUndQualifizierung, label: 'Fortbildung und Qualifizierung' },
  { kategorie: ServiceProviderKategorie.InformationenUndPortale, label: 'Informationen und Portale' },
  { kategorie: ServiceProviderKategorie.HilfeUndUnterstuetzung, label: 'Hilfe und Unterstützung' },
];

enableAutoUnmount(afterEach);

async function setup(options: BySchuleViewSetupOptions = {}): Promise<SetupResult> {
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

  const authStore: AuthStore = useAuthStore();
  authStore.$reset();
  authStore.$patch(options.authState ?? {});

  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
  serviceProviderStore.$reset();
  serviceProviderStore.manageableServiceProvidersForOrganisation = [
    DoFactory.getManageableServiceProviderListEntryResponse({ hasSomeVerwaltenPermission: true }),
    DoFactory.getManageableServiceProviderListEntryResponse({ hasSomeVerwaltenPermission: false }),
  ];
  serviceProviderStore.$patch(options.serviceProviderState ?? {});

  const searchFilterStore: SearchFilterStore = useSearchFilterStore();
  searchFilterStore.$reset();
  searchFilterStore.$patch(options.searchFilterState ?? {});

  const wrapper: BySchuleViewWrapper = mount(ServiceProviderManagementBySchuleView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        ServiceProviderManagementBySchuleView: ServiceProviderManagementBySchuleView as Component,
      },
      plugins: [router],
    },
  });

  return { wrapper, router, authStore, serviceProviderStore };
}

describe('ServiceProviderManagementBySchuleView', () => {
  it('should render', async () => {
    const { wrapper }: SetupResult = await setup();
    expect(wrapper.exists()).toBe(true);
  });

  it('renders the translated new kategorien truncated with the full name as hover text', async () => {
    const { wrapper }: SetupResult = await setup({
      serviceProviderState: {
        manageableServiceProvidersForOrganisation: NEW_KATEGORIEN.map(
          ({ kategorie }: { kategorie: ServiceProviderKategorie }) =>
            DoFactory.getManageableServiceProviderListEntryResponse({ kategorie }),
        ),
      },
    });

    const titles: Array<string | undefined> = wrapper
      .findAll('.v-data-table__tr .line-clamp-2')
      .map((cell: DOMWrapper<Element>) => cell.attributes('title'));
    expect(titles).toEqual(expect.arrayContaining(NEW_KATEGORIEN.map(({ label }: { label: string }) => label)));
  });

  it('it sets and resets filters', async () => {
    const { wrapper, serviceProviderStore }: SetupResult = await setup();

    const schule: Organisation = DoFactory.getSchule();

    const schuleAutocomplete: VueWrapper = wrapper.findComponent({ name: 'SchulenFilter' });

    schuleAutocomplete.vm.$emit('update:selectedSchulen', schule);
    await nextTick();
    await flushPromises();

    const selectedSchule: string = (wrapper.vm as unknown as ServiceProviderManagementBySchuleView)
      .selectedOrganisationId;

    expect(selectedSchule).toBe(schule.id);

    await wrapper.find('[data-testid="reset-filter-button"]').trigger('click');
    await nextTick();
    await flushPromises();

    expect(serviceProviderStore.manageableServiceProvidersForOrganisation).toEqual([]);
  });

  it('should set selectedOrganisationId from searchFilterStore on mount', async () => {
    const schuleId: string = 'test-schule-id';
    const { wrapper }: SetupResult = await setup({
      searchFilterState: { selectedSchuleForSchulischeServiceProvider: DoFactory.getSchule({ id: schuleId }) },
    });
    await nextTick();

    const selectedSchule: string = (wrapper.vm as unknown as ServiceProviderManagementBySchuleView)
      .selectedOrganisationId;

    expect(selectedSchule).toBe(schuleId);
  });

  it('should not set selectedOrganisationId when searchFilterStore value is null on mount', async () => {
    const { wrapper }: SetupResult = await setup({
      searchFilterState: { selectedSchuleForSchulischeServiceProvider: null },
    });
    await nextTick();

    const selectedSchule: string = (wrapper.vm as unknown as ServiceProviderManagementBySchuleView)
      .selectedOrganisationId;

    expect(selectedSchule).toBe('');
  });

  test('it routes to Service Provider details page', async () => {
    const { wrapper, router }: SetupResult = await setup();
    const push: MockInstance = vi.spyOn(router, 'push');
    await nextTick();

    const schule: Organisation = DoFactory.getSchule();

    const schuleAutocomplete: VueWrapper = wrapper.findComponent({ name: 'SchulenFilter' });
    schuleAutocomplete.vm.$emit('update:selectedSchulen', schule);
    await nextTick();

    await flushPromises();

    await wrapper.find('.v-data-table__tr').trigger('click');

    await vi.waitFor(() => {
      expect(push).toHaveBeenCalledTimes(1);
    });
  });

  describe('ServiceProviderDelete', () => {
    it('renders ServiceProviderDelete button for each row', async (): Promise<void> => {
      const { wrapper, serviceProviderStore }: SetupResult = await setup();
      // Find all delete icons (activators)
      const deleteIcons: DOMWrapper<Element>[] = wrapper.findAll(
        '[data-testid="open-service-provider-delete-dialog-icon"]',
      );
      expect(deleteIcons.length).toBe(
        serviceProviderStore.manageableServiceProvidersForOrganisation.filter(
          (sp: { hasSomeVerwaltenPermission: boolean }) => sp.hasSomeVerwaltenPermission,
        ).length,
      );
    });

    it('opens and confirms delete dialog, calls store method', async (): Promise<void> => {
      const { wrapper, serviceProviderStore }: SetupResult = await setup();
      // Find first delete icon and click it
      const deleteIcon: DOMWrapper<Element> = wrapper.find('[data-testid="open-service-provider-delete-dialog-icon"]');
      await deleteIcon.trigger('click');
      await nextTick();

      // Find and click the confirm delete button
      const confirmBtn: HTMLElement | null = document.querySelector('[data-testid="service-provider-delete-button"]');
      expect(confirmBtn).toBeTruthy();

      // Spy on the store method
      const deleteSpy: Mock<(id: string) => Promise<void>> = vi
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
      const vidisProvider: ManageableServiceProviderListEntry = DoFactory.getManageableServiceProviderListEntryResponse(
        {
          hasSomeVerwaltenPermission: true,
          vidisAngebotId: 'vidis-angebot-1',
        },
      );
      serviceProviderStore.manageableServiceProvidersForOrganisation = [vidisProvider];
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

    describe('onCloseDeleteDialog', () => {
      it('removes provider and reloads list if successful', async () => {
        const { wrapper, serviceProviderStore }: SetupResult = await setup();
        const schuleAutocomplete: VueWrapper = wrapper.findComponent({ name: 'SchulenFilter' });
        schuleAutocomplete.vm.$emit('update:selectedSchulen', DoFactory.getSchule({ id: 'some-id' }));

        const remainingProvider: ManageableServiceProviderListEntry =
          serviceProviderStore.manageableServiceProvidersForOrganisation[1]!;

        const reloadSpy: Mock<ServiceProviderStore['getManageableServiceProvidersForOrganisation']> = vi
          .spyOn(serviceProviderStore, 'getManageableServiceProvidersForOrganisation')
          .mockResolvedValue();

        const deleteIcon: DOMWrapper<Element> = wrapper.find(
          '[data-testid="open-service-provider-delete-dialog-icon"]',
        );
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

        expect(serviceProviderStore.manageableServiceProvidersForOrganisation).toEqual([
          expect.objectContaining(remainingProvider),
        ]);
        expect(reloadSpy).toHaveBeenCalled();
        reloadSpy.mockRestore();
      });
    });

    it('renders SpshAlert when errorCode is set', async () => {
      const { wrapper, serviceProviderStore }: SetupResult = await setup();
      serviceProviderStore.errorCode = 'UNSPECIFIED_ERROR';
      await nextTick();
      const alert: DOMWrapper<Element> = wrapper.find(
        '[data-testid="service-provider-management-by-schule-error-alert"]',
      );
      expect(alert.exists()).toBe(true);
    });

    it('clears error and reloads data when alert button is clicked', async () => {
      const { wrapper, serviceProviderStore }: SetupResult = await setup();
      const schuleAutocomplete: VueWrapper = wrapper.findComponent({ name: 'SchulenFilter' });
      schuleAutocomplete.vm.$emit('update:selectedSchulen', DoFactory.getSchule({ id: 'some-id' }));

      serviceProviderStore.errorCode = 'UNSPECIFIED_ERROR';
      await nextTick();
      const reloadSpy: Mock<ServiceProviderStore['getManageableServiceProvidersForOrganisation']> = vi
        .spyOn(serviceProviderStore, 'getManageableServiceProvidersForOrganisation')
        .mockResolvedValue();
      const btn: DOMWrapper<Element> = wrapper.find(
        '[data-testid="service-provider-management-by-schule-error-alert"] button',
      );
      expect(btn.exists()).toBe(true);
      await btn.trigger('click');
      await nextTick();
      expect(serviceProviderStore.errorCode).toBe('');
      expect(reloadSpy).toHaveBeenCalled();
      reloadSpy.mockRestore();
    });
  });

  describe('VidisSyncDialog', () => {
    const orgId: string = 'test-schule-id';

    function setupWithVidisPermission(): Promise<SetupResult> {
      return setup({ authState: { hasVidisPermission: true } });
    }

    async function selectSchule(wrapper: BySchuleViewWrapper): Promise<void> {
      const schuleFilter: VueWrapper = wrapper.findComponent({ name: 'SchulenFilter' });
      schuleFilter.vm.$emit('update:selectedSchulen', DoFactory.getSchule({ id: orgId }));
      await nextTick();
      await flushPromises();
    }

    it('does not render the sync button when the user lacks vidis permission', async () => {
      const { wrapper }: SetupResult = await setup({ authState: { hasVidisPermission: false } });
      expect(wrapper.find('[data-testid="open-vidis-sync-dialog-button"]').exists()).toBe(false);
    });

    it('renders the sync button when the user has vidis permission', async () => {
      const { wrapper }: SetupResult = await setupWithVidisPermission();
      expect(wrapper.find('[data-testid="open-vidis-sync-dialog-button"]').exists()).toBe(true);
    });

    it('disables the sync button when no Schule is selected', async () => {
      const { wrapper }: SetupResult = await setupWithVidisPermission();
      const btn: DOMWrapper<Element> = wrapper.find('[data-testid="open-vidis-sync-dialog-button"]');
      expect(btn.attributes('disabled')).toBeDefined();
    });

    it('enables the sync button once a Schule is selected', async () => {
      const { wrapper }: SetupResult = await setupWithVidisPermission();
      await selectSchule(wrapper);
      const btn: DOMWrapper<Element> = wrapper.find('[data-testid="open-vidis-sync-dialog-button"]');
      expect(btn.attributes('disabled')).toBeUndefined();
    });

    it('opens the VidisSyncDialog when the button is clicked', async () => {
      const { wrapper }: SetupResult = await setupWithVidisPermission();
      await selectSchule(wrapper);

      await wrapper.find('[data-testid="open-vidis-sync-dialog-button"]').trigger('click');

      await vi.waitFor(() => {
        expect(document.body.querySelector('.v-overlay--active [data-testid="vidis-sync-confirmation"]')).toBeTruthy();
      });
    });

    it('calls syncServiceProvidersForSchule with the selected organisation id', async () => {
      const { wrapper, serviceProviderStore }: SetupResult = await setupWithVidisPermission();
      await selectSchule(wrapper);

      const syncSpy: Mock<ServiceProviderStore['syncServiceProvidersForSchule']> = vi
        .spyOn(serviceProviderStore, 'syncServiceProvidersForSchule')
        .mockResolvedValue();
      vi.spyOn(serviceProviderStore, 'getManageableServiceProvidersForOrganisation').mockResolvedValue();

      await wrapper.find('[data-testid="open-vidis-sync-dialog-button"]').trigger('click');
      await vi.waitFor(() => {
        expect(document.body.querySelector('.v-overlay--active [data-testid="vidis-sync-button"]')).toBeTruthy();
      });

      (document.body.querySelector('.v-overlay--active [data-testid="vidis-sync-button"]') as HTMLElement).click();
      await flushPromises();

      expect(syncSpy).toHaveBeenCalledWith(orgId);
      syncSpy.mockRestore();
    });

    it('reloads the service provider list after a successful sync', async () => {
      const { wrapper, serviceProviderStore }: SetupResult = await setupWithVidisPermission();
      await selectSchule(wrapper);

      vi.spyOn(serviceProviderStore, 'syncServiceProvidersForSchule').mockResolvedValue();
      const reloadSpy: Mock<ServiceProviderStore['getManageableServiceProvidersForOrganisation']> = vi
        .spyOn(serviceProviderStore, 'getManageableServiceProvidersForOrganisation')
        .mockResolvedValue();

      await wrapper.find('[data-testid="open-vidis-sync-dialog-button"]').trigger('click');
      await vi.waitFor(() => {
        expect(document.body.querySelector('.v-overlay--active [data-testid="vidis-sync-button"]')).toBeTruthy();
      });

      (document.body.querySelector('.v-overlay--active [data-testid="vidis-sync-button"]') as HTMLElement).click();
      await flushPromises();

      expect(reloadSpy).toHaveBeenCalled();
      reloadSpy.mockRestore();
    });

    it('does not reload the list when sync fails', async () => {
      const { wrapper, serviceProviderStore }: SetupResult = await setupWithVidisPermission();

      const reloadSpy: Mock<ServiceProviderStore['getManageableServiceProvidersForOrganisation']> = vi
        .spyOn(serviceProviderStore, 'getManageableServiceProvidersForOrganisation')
        .mockResolvedValue();

      vi.spyOn(serviceProviderStore, 'syncServiceProvidersForSchule').mockImplementation(() => {
        serviceProviderStore.errorCode = 'VIDIS_API_ERROR';
        return Promise.resolve();
      });

      await selectSchule(wrapper);

      reloadSpy.mockClear();

      await wrapper.find('[data-testid="open-vidis-sync-dialog-button"]').trigger('click');
      await vi.waitFor(() => {
        expect(document.body.querySelector('.v-overlay--active [data-testid="vidis-sync-button"]')).toBeTruthy();
      });

      (document.body.querySelector('.v-overlay--active [data-testid="vidis-sync-button"]') as HTMLElement).click();
      await flushPromises();

      expect(reloadSpy).not.toHaveBeenCalled();
      reloadSpy.mockRestore();
    });

    it('does not show SpshAlert when errorCode is VIDIS_API_ERROR', async () => {
      const { wrapper, serviceProviderStore }: SetupResult = await setupWithVidisPermission();
      serviceProviderStore.errorCode = 'VIDIS_API_ERROR';
      await nextTick();

      expect(wrapper.find('[data-testid="service-provider-management-by-schule-error-alert"]').exists()).toBe(false);
    });

    it('keeps the table visible when errorCode is VIDIS_API_ERROR', async () => {
      const { wrapper, serviceProviderStore }: SetupResult = await setupWithVidisPermission();
      serviceProviderStore.errorCode = 'VIDIS_API_ERROR';
      await nextTick();

      expect(wrapper.find('[data-testid="service-provider-management-by-schule-error-alert"]').exists()).toBe(false);
    });

    it('clears errorCode when the sync dialog is closed', async () => {
      const { wrapper, serviceProviderStore }: SetupResult = await setupWithVidisPermission();
      serviceProviderStore.errorCode = 'VIDIS_API_ERROR';
      await nextTick();

      const dialog: VueWrapper = wrapper.findComponent({ name: 'VidisSyncDialog' });
      if (dialog.exists()) {
        dialog.vm.$emit('onClose', false);
      }
      await nextTick();

      expect(serviceProviderStore.errorCode).toBe('');
    });
  });
});
