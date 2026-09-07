import type { ServiceProviderResponse } from '@/api-client/generated/api';
import { useOrganisationStore, type Organisation, type OrganisationStore } from '@/stores/OrganisationStore';
import { useRolleStore, type Rolle, type RolleStore } from '@/stores/RolleStore';
import { useServiceProviderStore, type ServiceProviderStore } from '@/stores/ServiceProviderStore';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import { DoFactory } from 'test/DoFactory';
import routes from '@/router/routes';
import MptRolleDetailsView from './MptRolleDetailsView.vue';

let wrapper: VueWrapper<InstanceType<typeof MptRolleDetailsView>> | null = null;
let router: Router;
let rolleStore: RolleStore;
let organisationStore: OrganisationStore;
let serviceProviderStore: ServiceProviderStore;
let rolle: Rolle;
let schule: Organisation;
let existingServiceProvider: ServiceProviderResponse;
let availableServiceProvider: ServiceProviderResponse;

beforeEach(async (): Promise<void> => {
  document.body.innerHTML = '<div><div id="app"></div></div>';
  router = createRouter({ history: createWebHistory(), routes });

  rolle = DoFactory.getRolle();
  schule = DoFactory.getSchule();
  existingServiceProvider = DoFactory.getServiceProviderResponse();
  availableServiceProvider = DoFactory.getServiceProviderResponse();

  await router.push(`/admin/rollen/mpt/${rolle.id}?orga=${schule.id}`);
  await router.isReady();

  rolleStore = useRolleStore();
  organisationStore = useOrganisationStore();
  serviceProviderStore = useServiceProviderStore();
  rolleStore.$reset();
  organisationStore.$reset();
  serviceProviderStore.$reset();

  rolleStore.currentMptRolle = rolle;
  rolleStore.rollenerweiterungServiceProviders = [existingServiceProvider];
  organisationStore.currentOrganisation = schule;
  serviceProviderStore.allServiceProviders = [existingServiceProvider, availableServiceProvider];

  rolleStore.getMptRolleById = vi.fn().mockResolvedValue(undefined);
  rolleStore.getRollenerweiterungenForRolle = vi.fn().mockResolvedValue(undefined);
  rolleStore.persistRollenerweiterungenForRolle = vi.fn().mockResolvedValue(undefined);
  organisationStore.getOrganisationById = vi.fn().mockResolvedValue(undefined);
  serviceProviderStore.getServiceProvidersForRollenerweiterung = vi.fn().mockResolvedValue(undefined);

  wrapper = mount(MptRolleDetailsView, {
    attachTo: document.getElementById('app') || '',
    global: { plugins: [router] },
  });
  await flushPromises();
});

afterEach((): void => {
  wrapper?.unmount();
  wrapper = null;
  vi.restoreAllMocks();
});

describe('MptRolleDetailsView', (): void => {
  it('loads school-scoped role data and renders readonly role fields with the assigned offers', (): void => {
    expect(rolleStore.getMptRolleById).toHaveBeenCalledWith(rolle.id, schule.id);
    expect(rolleStore.getRollenerweiterungenForRolle).toHaveBeenCalledWith(rolle.id, schule.id);
    expect(serviceProviderStore.getServiceProvidersForRollenerweiterung).toHaveBeenCalledWith(schule.id);
    expect(wrapper?.text()).toContain(`Rolle bearbeiten ${schule.name}`);
    expect(wrapper?.text()).toContain(rolle.name);
    expect(wrapper?.text()).toContain(existingServiceProvider.name);
    expect(wrapper?.find('[data-testid="angebot-selection-tree"]').exists()).toBe(true);
  });

  it('persists added and removed service provider ids', async (): Promise<void> => {
    const treeview: VueWrapper = wrapper!.findComponent({ name: 'AngebotSelectionTreeview' });
    treeview.vm.$emit('update:selectedServiceProviderIds', [availableServiceProvider.id]);
    await wrapper!.find('[data-testid="mpt-rolle-save-button"]').trigger('click');
    await flushPromises();

    expect(rolleStore.persistRollenerweiterungenForRolle).toHaveBeenCalledWith({
      rolleId: rolle.id,
      organisationId: schule.id,
      existingServiceProviderIds: [existingServiceProvider.id],
      selectedServiceProviderIds: [availableServiceProvider.id],
    });
  });

  it('does not show success when reloading saved role extensions fails', async (): Promise<void> => {
    rolleStore.getRollenerweiterungenForRolle = vi.fn((): Promise<void> => {
      rolleStore.errorCode = 'ROLLE_EXTENSION_READ_ERROR';
      return Promise.resolve();
    });

    await wrapper!.find('[data-testid="mpt-rolle-save-button"]').trigger('click');
    await flushPromises();

    expect(wrapper?.find('[data-testid="mpt-rolle-details-error"]').exists()).toBe(true);
    expect(wrapper?.find('[data-testid="mpt-rolle-save-success-close-button"]').exists()).toBe(false);
  });

  it('resets changed selections when cancel is clicked', async (): Promise<void> => {
    const treeview: VueWrapper = wrapper!.findComponent({ name: 'AngebotSelectionTreeview' });
    treeview.vm.$emit('update:selectedServiceProviderIds', [availableServiceProvider.id]);

    await wrapper!.find('[data-testid="mpt-rolle-cancel-button"]').trigger('click');
    await wrapper!.find('[data-testid="mpt-rolle-save-button"]').trigger('click');
    await flushPromises();

    expect(rolleStore.persistRollenerweiterungenForRolle).toHaveBeenCalledWith({
      rolleId: rolle.id,
      organisationId: schule.id,
      existingServiceProviderIds: [existingServiceProvider.id],
      selectedServiceProviderIds: [existingServiceProvider.id],
    });
  });

  it('returns to MPT role management when the card is closed', async (): Promise<void> => {
    const routerPushSpy: ReturnType<typeof vi.spyOn> = vi.spyOn(router, 'push').mockResolvedValue();
    const layoutCard: VueWrapper = wrapper!.findComponent({ name: 'LayoutCard' });
    layoutCard.vm.$emit('onCloseClicked');
    await flushPromises();

    expect(routerPushSpy).toHaveBeenCalledWith({ name: 'mpt-rolle-management' });
  });

  it('stops loading dependent data when the MPT role cannot be loaded', async (): Promise<void> => {
    wrapper?.unmount();
    rolleStore.currentMptRolle = null;
    rolleStore.getMptRolleById = vi.fn((): Promise<void> => {
      rolleStore.errorCode = 'UNSPECIFIED_ERROR';
      return Promise.resolve();
    });
    vi.mocked(rolleStore.getRollenerweiterungenForRolle).mockClear();
    vi.mocked(serviceProviderStore.getServiceProvidersForRollenerweiterung).mockClear();

    wrapper = mount(MptRolleDetailsView, {
      attachTo: document.getElementById('app') || '',
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(rolleStore.getRollenerweiterungenForRolle).not.toHaveBeenCalled();
    expect(serviceProviderStore.getServiceProvidersForRollenerweiterung).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Fehler beim Laden der Rolle');
  });

  it('renders an empty tree and hides saving when the provider state is temporarily undefined', async (): Promise<void> => {
    Reflect.set(serviceProviderStore, 'allServiceProviders', undefined);
    await flushPromises();

    expect(wrapper?.find('[data-testid="angebot-selection-tree-empty"]').exists()).toBe(true);
    expect(wrapper?.find('[data-testid="mpt-rolle-save-button"]').exists()).toBe(false);
  });

  it('clears store errors when the detail view is unmounted', (): void => {
    rolleStore.errorCode = 'ROLLE_ERROR';
    rolleStore.errors.set('service-provider-1', 'ROLLENERWEITERUNG_TECHNICAL_ERROR');
    serviceProviderStore.errorCode = 'SERVICE_PROVIDER_ERROR';
    organisationStore.errorCode = 'ORGANISATION_ERROR';

    wrapper?.unmount();
    wrapper = null;

    expect(rolleStore.errorCode).toBe('');
    expect(rolleStore.errors.size).toBe(0);
    expect(serviceProviderStore.errorCode).toBe('');
    expect(organisationStore.errorCode).toBe('');
  });
});
