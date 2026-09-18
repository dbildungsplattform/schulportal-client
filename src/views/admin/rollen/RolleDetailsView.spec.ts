import { OrganisationsTyp, type SystemRechtResponse } from '@/api-client/generated';
import routes from '@/router/routes';
import { useOrganisationStore, type Organisation, type OrganisationStore } from '@/stores/OrganisationStore';
import {
  useRolleStore,
  type Rolle,
  type RolleStore,
  type RolleWithServiceProvidersResponse,
} from '@/stores/RolleStore';
import { useServiceProviderStore, type ServiceProviderStore } from '@/stores/ServiceProviderStore';
import { faker } from '@faker-js/faker';
import { DOMWrapper, VueWrapper, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import { expect, test, type Mock } from 'vitest';
import { nextTick, type Component } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import RolleDetailsView from './RolleDetailsView.vue';

let wrapper: VueWrapper | null = null;
let router: Router;
const rolleStore: RolleStore = useRolleStore();
const organisationStore: OrganisationStore = useOrganisationStore();
const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();

const mockOrga: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Schule });
const mockCurrentRolle: Rolle = DoFactory.getRolle({ administeredBySchulstrukturknoten: mockOrga.id });
const mockUpdatedRolle: RolleWithServiceProvidersResponse = {
  ...mockCurrentRolle,
  administeredBySchulstrukturknotenName: mockOrga.name,
  administeredBySchulstrukturknotenKennung: mockOrga.kennung!,
  name: 'Updated Lehrer',
  serviceProviders: [{ id: 'sp1', name: 'ServiceProvider1' }],
  version: 2,
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  systemrechte: new Set<SystemRechtResponse>(),
};

rolleStore.currentRolle = mockCurrentRolle;
rolleStore.updatedRolle = mockUpdatedRolle;

async function mountComponent(): Promise<VueWrapper<InstanceType<typeof RolleDetailsView>>> {
  const wrapper: VueWrapper<InstanceType<typeof RolleDetailsView>> = mount(RolleDetailsView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        RolleDetailsView: RolleDetailsView as Component,
      },
      mocks: {
        route: {
          fullPath: 'full/path',
        },
      },
      plugins: [router],
    },
  });
  await flushPromises();
  return wrapper;
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

  router.push('/');
  await router.isReady();

  wrapper = await mountComponent();
});

describe('RolleDetailsView', () => {
  test('it renders the rolle details view', () => {
    expect(wrapper?.find('[data-testid="rolle-details-headline"]').isVisible()).toBe(true);
  });

  test('it renders data for current rolle', async () => {
    rolleStore.errorCode = '';
    rolleStore.updatedRolle = null;
    rolleStore.currentRolle = mockCurrentRolle;
    organisationStore.currentOrganisation = mockOrga;
    organisationStore.organisationenFilters.set('rolle-form', {
      filterResult: [mockOrga],
      loading: false,
      total: 1,
    });
    wrapper = await mountComponent();

    expect(
      wrapper
        ?.findComponent({ ref: 'rolle-form' })
        .findComponent({ name: 'SchulenFilter' })
        .findComponent({ ref: 'rolle-form-organisation-select' })
        .text(),
    ).toContain(mockOrga.name);

    rolleStore.updatedRolle = mockUpdatedRolle;
  });

  test('it renders data in success template', async () => {
    rolleStore.updatedRolle = DoFactory.getRolleWithServiceProviders({
      name: 'Updated Lehrer',
      merkmale: new Set(),
      systemrechte: new Set<SystemRechtResponse>(),
      serviceProviders: [],
      version: 2,
    });
    await flushPromises();

    const rolleName: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="updated-rolle-name"]');
    const rolleMerkmale: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="updated-rolle-merkmale"]');
    const rolleAngebote: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="updated-rolle-angebote"]');
    const rolleSystemrechte: DOMWrapper<Element> | undefined = wrapper?.find(
      '[data-testid="updated-rolle-systemrechte"]',
    );

    expect(rolleName?.text()).toEqual('Updated Lehrer');
    expect(rolleMerkmale?.text()).toEqual('---');
    expect(rolleAngebote?.text()).toEqual('---');
    expect(rolleSystemrechte?.text()).toEqual('---');
  });

  test('it activates editing mode', async () => {
    rolleStore.updatedRolle = null;
    rolleStore.errorCode = '';

    await nextTick();

    await wrapper?.find('[data-testid="rolle-edit-button"]').trigger('click');
    await nextTick();

    expect(wrapper?.find('[data-testid="rolle-changes-save-button"]').isVisible()).toBe(true);
  });

  test('it does not cancel editing because of unsaved changes', async () => {
    rolleStore.updatedRolle = null;
    rolleStore.errorCode = '';

    await wrapper?.find('[data-testid="rolle-edit-button"]').trigger('click');
    await nextTick();

    await wrapper?.find('[data-testid="rollenname-input"] input').setValue('1b');
    await nextTick();

    await wrapper?.find('[data-testid="rolle-edit-cancel-button"]').trigger('click');
    await nextTick();

    expect(document.querySelector('[data-testid="unsaved-changes-warning-text"]')).not.toBeNull();
  });

  test('it submits the form and shows the success template', async () => {
    rolleStore.updatedRolle = null;
    rolleStore.errorCode = '';

    await wrapper?.find('[data-testid="rolle-edit-button"]').trigger('click');
    await nextTick();

    const rolleFormWrapper: VueWrapper<never, never> | undefined = wrapper?.findComponent({ ref: 'rolle-form' });

    // Set the administrationsebene and rollenart first
    const organisationAutocomplete: VueWrapper | undefined = rolleFormWrapper
      ?.findComponent({ ref: 'schulenFilter' })
      .findComponent({ ref: 'rolle-form-organisation-select' });

    organisationAutocomplete?.setValue(['1']);
    organisationAutocomplete?.vm.$emit('update:selectedSchulen', ['1']);
    await nextTick();

    await rolleFormWrapper?.findComponent({ ref: 'rollenart-select' }).setValue('LEHR');
    await nextTick();

    await rolleFormWrapper?.findComponent({ ref: 'rollenname-input' }).setValue('Updated Lehrer');
    await nextTick();

    await wrapper?.find('[data-testid="rolle-changes-save-button"]').trigger('click');
    await nextTick();

    rolleStore.updatedRolle = mockUpdatedRolle;
    await nextTick();

    const rolleSuccessTemplate: VueWrapper<never, never> | undefined = wrapper?.findComponent({
      name: 'RolleSuccessTemplate',
    });

    expect(rolleSuccessTemplate?.find('[data-testid="rolle-success-text"]').text()).toBe(
      'Die Rolle wurde erfolgreich geändert.',
    );
  });

  test('displays error message correctly', async () => {
    // We have to reset updatedRolle to null to trigger the error message
    rolleStore.updatedRolle = null;

    // Test case 1: ROLLE_UPDATE_ERROR
    rolleStore.errorCode = 'ROLLE_UPDATE_ERROR';
    await nextTick();

    const spshAlertWrapper: VueWrapper | undefined = wrapper?.findComponent({ name: 'SpshAlert' });
    expect(spshAlertWrapper?.props()).toMatchObject({
      title: 'Die Rolle konnte nicht bearbeitet werden',
    });
    // Test case 2: NEWER_VERSION_OF_ROLLE_AVAILABLE
    rolleStore.errorCode = 'NEWER_VERSION_OF_ROLLE_AVAILABLE';
    await nextTick();

    expect(spshAlertWrapper?.props()).toMatchObject({
      title: 'Geänderte Daten',
    });
    // reset errorCode after test
    rolleStore.errorCode = '';
  });

  test('it calls getAssignableServiceProvidersForRolleByOrganisationId on mount', async () => {
    const rolle: Rolle = DoFactory.getRolle();
    vi.spyOn(rolleStore, 'getRolleById').mockImplementationOnce(async () => {
      rolleStore.currentRolle = rolle;
      return Promise.resolve();
    });
    const getAssignableServiceProvidersSpy: Mock = vi.spyOn(
      serviceProviderStore,
      'getAssignableServiceProvidersForRolleByOrganisationId',
    );
    getAssignableServiceProvidersSpy.mockClear(); // Clear the mock call history before the assertion
    await mountComponent();
    expect(getAssignableServiceProvidersSpy).toHaveBeenCalledWith(
      rolle.administeredBySchulstrukturknoten,
      rolle.rollenart,
    );
  });
});
