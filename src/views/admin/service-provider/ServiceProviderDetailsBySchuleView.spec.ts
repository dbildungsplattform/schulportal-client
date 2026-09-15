import { DOMWrapper, VueWrapper, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { MockInstance } from 'vitest';
import { nextTick, type Component, type ComponentPublicInstance } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';

import {
  RollenSystemRechtEnum,
  type FeatureFlagResponse,
  type RollenerweiterungWithExtendedDataResponse,
} from '@/api-client/generated';
import type { RollenerweiterungAssignErrorDialogProps } from '@/components/admin/service-provider/types';
import routes from '@/router/routes';
import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
import { useConfigStore, type ConfigStore } from '@/stores/ConfigStore';
import { RollenArt, useRolleStore, type RolleStore } from '@/stores/RolleStore';
import {
  ServiceProviderKategorie,
  useServiceProviderStore,
  type ManageableServiceProviderDetail,
  type ServiceProviderStore,
} from '@/stores/ServiceProviderStore';
import { DoFactory } from 'test/DoFactory';
import ServiceProviderDetailsBySchuleView from './ServiceProviderDetailsBySchuleView.vue';

let wrapper: VueWrapper | null = null;
let router: Router;
const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
const authStore: AuthStore = useAuthStore();
const rolleStore: RolleStore = useRolleStore();
const configStore: ConfigStore = useConfigStore();

const mockServiceProvider: ManageableServiceProviderDetail = DoFactory.getManageableServiceProviderDetail({
  kategorie: ServiceProviderKategorie.Hinweise,
  availableForRollenerweiterung: true,
  relevantSystemrechte: [RollenSystemRechtEnum.AngeboteVerwalten, RollenSystemRechtEnum.RollenErweitern],
});

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
    name: 'angebot-details-schulspezifisch',
    params: { id: mockServiceProvider.id },
    query: { orga: 'some-org-id' },
  });
  await router.isReady();

  wrapper = mount(ServiceProviderDetailsBySchuleView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        ServiceProviderDetailsView: ServiceProviderDetailsBySchuleView as Component,
      },
      mocks: {
        route: {
          fullPath: 'full/path',
        },
      },
      plugins: [router],
    },
  });
  serviceProviderStore.currentServiceProvider = mockServiceProvider;
  const mockItems: RollenerweiterungWithExtendedDataResponse[] = Array.from({ length: 2 }, () =>
    DoFactory.getRollenerweiterungItem(),
  );
  serviceProviderStore.rollenerweiterungen = DoFactory.getRollenerweiterungenResponse(mockItems);
  serviceProviderStore.rollenerweiterungenUebersicht = DoFactory.buildRollenerweiterungenUebersicht(mockItems);
  configStore.configData = {
    befristungBearbeitenEnabled: true,
    rolleBearbeitenEnabled: true,
    rolleErweiternEnabled: true,
    setUemPasswordEnabled: true,
    schulischeAngeboteErstellen: true,
  };
  authStore.hasRollenerweiternPermission = true;
  authStore.hasMptRollenVerwaltenPermission = false;
  configStore.configData = { schulischeAngeboteErstellen: true } as FeatureFlagResponse;

  rolleStore.allRollen = [
    DoFactory.getRolleWithServiceProviders({ rollenart: RollenArt.Lehr }),
    DoFactory.getRolleWithServiceProviders({ rollenart: RollenArt.Lern }),
  ];
  vi.stubGlobal('window', Object.assign(window, { open: vi.fn(), scrollTo: vi.fn() }));
});

afterEach(() => {
  vi.clearAllTimers();
  vi.unstubAllGlobals();
  wrapper?.unmount();
});

describe('ServiceProviderDetailsBySchuleView', () => {
  test('it renders the service provider details page and shows its data', () => {
    expect(wrapper).toBeTruthy();
    expect(wrapper?.find('[data-testid="service-provider-details-by-schule-card"]').isVisible()).toBe(true);
    expect(wrapper?.find('[data-testid="service-provider-name"]').text()).toBe(mockServiceProvider.name);
    expect(wrapper?.find('[data-testid="service-provider-administrationsebene"]').text()).toBe(
      mockServiceProvider.administrationsebene.name,
    );
    expect(wrapper?.find('[data-testid="service-provider-requires-2fa"]').text()).toBe(
      mockServiceProvider.requires2fa ? 'Ja' : 'Nein',
    );
    expect(wrapper?.find('[data-testid="service-provider-kategorie"]').text()).toBe('Hinweise');
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
    await nextTick();

    expect(wrapper?.find('[data-testid="service-provider-rollenarten-whitelist"]').text()).toBe('Sysadmin, Lehr');
  });

  test('it navigates back to service providers table', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');
    await wrapper?.find('[data-testid="close-layout-card-button"]').trigger('click');
    expect(push).toHaveBeenCalledTimes(1);
  });

  test('it sets errorCode and goes back to list on alert close', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');
    serviceProviderStore.errorCode = 'error';
    await nextTick();

    await wrapper?.find('[data-testid$="alert-button"]').trigger('click');

    expect(push).toHaveBeenCalledTimes(1);
  });

  test('it opens vidis dialog with service provider name and closes it on ok click', async () => {
    serviceProviderStore.currentServiceProvider = DoFactory.getManageableServiceProviderDetail({
      id: mockServiceProvider.id,
      vidisAngebotId: 'vidis-angebot-1',
      relevantSystemrechte: [RollenSystemRechtEnum.AngeboteVerwalten],
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

  describe('ServiceProviderDetailsBySchuleView - Edit mode', () => {
    test('navigates to service provider edit mode when bearbeiten button is clicked', async () => {
      const push: MockInstance = vi.spyOn(router, 'push');

      await nextTick();
      await wrapper?.find('[data-testid="service-provider-bearbeiten-button"]').trigger('click');

      expect(push).toHaveBeenCalledWith({
        name: 'angebot-edit',
        params: { id: mockServiceProvider.id },
        query: { orga: 'some-org-id' },
      });
    });

    test('navigates to service provider edit mode when bearbeiten button is clicked with no orgaId', async () => {
      await router.push({
        name: 'angebot-details-schulspezifisch',
        params: { id: mockServiceProvider.id },
      });
      await router.isReady();

      wrapper = mount(ServiceProviderDetailsBySchuleView, {
        attachTo: document.getElementById('app') || '',
        global: {
          plugins: [router],
        },
      });
      serviceProviderStore.currentServiceProvider = mockServiceProvider;

      const push: MockInstance = vi.spyOn(router, 'push');
      await wrapper.find('[data-testid="service-provider-bearbeiten-button"]').trigger('click');

      expect(push).toHaveBeenCalledWith({
        name: 'angebot-edit',
        params: { id: mockServiceProvider.id },
        query: undefined,
      });
    });

    test('opens edit mode when bearbeiten button is clicked', async () => {
      await nextTick();
      expect(wrapper?.find('[data-testid="rollenerweiterung-bearbeiten-button"]').exists()).toBe(true);
      await wrapper?.find('[data-testid="rollenerweiterung-bearbeiten-button"]').trigger('click');
      await nextTick();

      expect(wrapper?.find('[data-testid="rollenerweiterung-cancel-button"]').exists()).toBe(true);
      expect(wrapper?.find('[data-testid="rollenerweiterung-save-button"]').exists()).toBe(true);
      expect(wrapper?.find('[data-testid="rollenerweiterung-bearbeiten-button"]').exists()).toBe(false);
    });

    test('cancels edit mode when cancel button is clicked', async () => {
      await nextTick();
      await wrapper?.find('[data-testid="rollenerweiterung-bearbeiten-button"]').trigger('click');
      await nextTick();

      await wrapper?.find('[data-testid="rollenerweiterung-cancel-button"]').trigger('click');
      await nextTick();

      expect(wrapper?.find('[data-testid="rollenerweiterung-bearbeiten-button"]').exists()).toBe(true);
      expect(wrapper?.find('[data-testid="rollenerweiterung-cancel-button"]').exists()).toBe(false);
    });

    test('bearbeiten button is hidden when availableForRollenerweiterung is false', async () => {
      serviceProviderStore.currentServiceProvider = DoFactory.getManageableServiceProviderDetail({
        availableForRollenerweiterung: false,
      });
      await nextTick();

      expect(wrapper?.find('[data-testid="rollenerweiterung-bearbeiten-button"]').exists()).toBe(false);
    });

    test('requests rollen without MPT systemrecht when the user lacks the permission', async () => {
      authStore.hasMptRollenVerwaltenPermission = false;
      const getAllRollenSpy: MockInstance = vi.spyOn(rolleStore, 'getAllRollen').mockResolvedValue(undefined);
      await nextTick();

      await wrapper?.find('[data-testid="rollenerweiterung-bearbeiten-button"]').trigger('click');
      await nextTick();

      expect(getAllRollenSpy).toHaveBeenCalledWith({
        organisationContextForOperation: 'some-org-id',
        systemrechte: [RollenSystemRechtEnum.RollenErweitern],
      });
    });

    test('requests rollen including MPT systemrecht when the user has the permission', async () => {
      authStore.hasMptRollenVerwaltenPermission = true;
      const getAllRollenSpy: MockInstance = vi.spyOn(rolleStore, 'getAllRollen').mockResolvedValue(undefined);
      await nextTick();

      await wrapper?.find('[data-testid="rollenerweiterung-bearbeiten-button"]').trigger('click');
      await nextTick();

      expect(getAllRollenSpy).toHaveBeenCalledWith({
        organisationContextForOperation: 'some-org-id',
        systemrechte: [RollenSystemRechtEnum.RollenErweitern, RollenSystemRechtEnum.MptRollenVerwalten],
      });
    });

    test('shows existing rollenerweiterungen as chips in read-only mode', async () => {
      await nextTick();
      const chips: DOMWrapper<Element>[] | undefined = wrapper?.findAll(
        '[data-testid="service-provider-rollenerweiterungen"] .v-chip',
      );
      expect(chips?.length).toBe(2);
    });
  });

  describe('ServiceProviderDetailsBySchuleView - Save', () => {
    let persistSpy: MockInstance;

    beforeEach(() => {
      persistSpy = vi
        .spyOn(serviceProviderStore, 'persistRollenerweiterungenForServiceProvider')
        .mockResolvedValue(undefined);
    });

    async function openEditMode(): Promise<void> {
      await nextTick();
      await wrapper?.find('[data-testid="rollenerweiterung-bearbeiten-button"]').trigger('click');
      await nextTick();
    }

    test('calls persistRollenerweiterungenForServiceProvider with correct add/remove ids on save', async () => {
      await openEditMode();

      const treeview: VueWrapper | undefined = wrapper?.findComponent({ name: 'RollenerweiterungTreeview' });
      treeview?.vm.$emit('update:selectedRolleIds', ['new-rolle-1']);
      await nextTick();

      await wrapper?.find('[data-testid="rollenerweiterung-save-button"]').trigger('click');
      await nextTick();

      expect(persistSpy).toHaveBeenCalledTimes(1);
      expect(persistSpy).toHaveBeenCalledWith(
        expect.objectContaining<{ addErweiterungenForRolleIds: string[] }>({
          addErweiterungenForRolleIds: expect.arrayContaining(['new-rolle-1']) as string[],
        }),
      );
    });

    test('shows success dialog after successful save', async () => {
      serviceProviderStore.errorCode = '';
      await openEditMode();

      await wrapper?.find('[data-testid="rollenerweiterung-save-button"]').trigger('click');
      await nextTick();

      expect(document.querySelector('[data-testid="close-rollenerweiterung-save-success-button"]')).not.toBeNull();
    });

    test('closes success dialog and exits edit mode when close button clicked', async () => {
      serviceProviderStore.errorCode = '';
      await openEditMode();

      await wrapper?.find('[data-testid="rollenerweiterung-save-button"]').trigger('click');
      await nextTick();

      document
        .querySelector('[data-testid="close-rollenerweiterung-save-success-button"]')
        ?.dispatchEvent(new Event('click'));
      await nextTick();

      expect(wrapper?.find('[data-testid="rollenerweiterung-bearbeiten-button"]').exists()).toBe(true);
    });

    test('displays multiple errors and closes the error dialog', async () => {
      persistSpy.mockImplementationOnce(() => {
        serviceProviderStore.errors.set('role-1', 'ROLLENERWEITERUNG_TECHNICAL_ERROR');
        serviceProviderStore.errors.set('role-2', 'NOT_FOUND');
      });

      await openEditMode();
      await wrapper?.find('[data-testid="rollenerweiterung-save-button"]').trigger('click');
      await nextTick();

      const errorDialog: VueWrapper<ComponentPublicInstance<RollenerweiterungAssignErrorDialogProps>> | undefined =
        wrapper?.findComponent({ name: 'RollenerweiterungAssignErrorDialog' });
      expect(errorDialog?.exists()).toBe(true);
      expect(errorDialog?.props('isDialogVisible')).toBe(true);

      const errorItems: NodeList = document.querySelectorAll('ol > li');
      expect(errorItems.length).toBe(2);

      const closeButton: HTMLElement | null = document.querySelector(
        '[data-testid="rollenerweiterung-error-discard-button"]',
      );
      expect(closeButton).not.toBeNull();
      closeButton?.dispatchEvent(new Event('click'));
      await nextTick();
      const confirmCloseButton: HTMLElement | null = document.querySelector(
        '[data-testid="confirm-close-bulk-error-dialog-button"]',
      );
      expect(confirmCloseButton).not.toBeNull();
      confirmCloseButton?.dispatchEvent(new Event('click'));
      await nextTick();

      // The dialog should be closed and errors cleared
      expect(wrapper?.findComponent({ name: 'RollenerweiterungAssignErrorDialog' })?.props('isDialogVisible')).toBe(
        false,
      );
      expect(serviceProviderStore.errors.size).toBe(0);

      expect(wrapper?.find('[data-testid="rollenerweiterung-bearbeiten-button"]').exists()).toBe(true);
    });
  });
});
