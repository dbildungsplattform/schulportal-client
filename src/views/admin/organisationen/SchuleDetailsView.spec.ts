import {
  OrganisationsTyp,
  useOrganisationStore,
  type Organisation,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
import { useOrganisationsbeziehungStore, type OrganisationsbeziehungStore } from '@/stores/OrganisationsbeziehungStore';
import { DOMWrapper, VueWrapper, flushPromises, mount } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { nextTick, type Component } from 'vue';
import { createMemoryHistory, createRouter, useRoute, type Router } from 'vue-router';
import SchuleDetailsView from './SchuleDetailsView.vue';

let wrapper: VueWrapper | null = null;
let organisationStore: OrganisationStore;
let router: Router;

const mockSchule: Organisation = DoFactory.getSchule({
  id: 'schule-1',
  name: 'Test Grundschule',
  kennung: '1234567',
  emailAdress: 'schule@example.com',
  administriertVon: 'schultraeger-1',
  itslearningEnabled: true,
});

beforeEach(async () => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  organisationStore = useOrganisationStore();

  //@ts-expect-error Test setup: we are intentionally setting currentOrganisation to undefined to simulate initial state
  organisationStore.currentOrganisation = undefined;
  organisationStore.errorCode = '';
  organisationStore.loading = false;

  organisationStore.fetchSchulDetails = vi.fn(() => Promise.resolve());

  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/admin/schulen/:id',
        name: 'schule-details',
        component: SchuleDetailsView as Component,
      },
      {
        path: '/admin/schulen',
        name: 'schule-management',
        component: { template: '<div>Schule Management</div>' },
      },
    ],
  });

  await router.push({ name: 'schule-details', params: { id: 'schule-1' } });
  await router.isReady();

  wrapper = mount(SchuleDetailsView, {
    attachTo: document.getElementById('app') || '',
    global: {
      plugins: [router],
      mocks: {
        $route: useRoute(),
      },
    },
  });
});

afterEach(() => {
  wrapper?.unmount();
  vi.clearAllMocks();
});

describe('SchuleDetailsView', () => {
  test('it renders the admin headline', () => {
    expect(wrapper?.find('[data-testid="admin-headline"]').isVisible()).toBe(true);
  });

  test('it renders the schule details card', () => {
    expect(wrapper?.find('[data-testid="schule-details-card"]').exists()).toBe(true);
  });

  test('it fetches schule details for the route id on mount', () => {
    expect(organisationStore.fetchSchulDetails).toHaveBeenCalledExactlyOnceWith('schule-1');
  });

  test('it displays organisation details when data is loaded', async () => {
    organisationStore.currentSchule = {
      ...mockSchule,
      schultraegerform: { id: 'schultraegerform-1', name: 'Kommunaler Schulträger', typ: OrganisationsTyp.Land },
    };
    organisationStore.loading = false;
    organisationStore.errorCode = '';

    await nextTick();

    const container: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="schule-details-container"]');
    expect(container?.isVisible()).toBe(true);
    expect(wrapper?.get('[data-testid="schule-dienststellennummer"]').text()).toBe('1234567');
    expect(wrapper?.get('[data-testid="schule-name"]').text()).toBe('Test Grundschule');
    expect(wrapper?.get('[data-testid="schule-email"]').text()).toBe('schule@example.com');
    expect(wrapper?.get('[data-testid="schultraegerform"]').text()).toBe('Kommunaler Schulträger');
    expect(wrapper?.get('[data-testid="schule-itslearning-enabled"]').text()).toBe('Ja');
  });

  test('it displays the unknown organisation fallback when no schultraegerform is available', async () => {
    organisationStore.currentSchule = mockSchule;

    await nextTick();

    expect(wrapper?.get('[data-testid="schultraegerform"]').text()).toBe('Unbekannte Organisation');
    expect(wrapper?.get('[data-testid="schule-itslearning-enabled"]').text()).toBe('Ja');
  });

  test('it keeps the selector mounted through search recovery and partial save failures', async () => {
    const behoerden: Organisation[] = [
      DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde }),
      DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde }),
    ];
    organisationStore.currentSchule = mockSchule;
    organisationStore.searchedOrganisations = behoerden;
    organisationStore.searchOrganisationsForRelationships = vi
      .fn()
      .mockImplementationOnce((): Promise<void> => {
        organisationStore.relationshipErrorCode = 'SEARCH_ORGANISATIONS_ERROR';
        return Promise.resolve();
      })
      .mockImplementationOnce((): Promise<void> => {
        organisationStore.relationshipErrorCode = '';
        return Promise.resolve();
      });
    organisationStore.createOrganisationRelationships = vi.fn(
      (_contextOrganisation: Organisation | undefined, selectedOrganisations: Organisation[]): Promise<void> => {
        organisationStore.relationshipBatch = {
          isRunning: false,
          isComplete: true,
          completed: selectedOrganisations.length,
          total: selectedOrganisations.length,
          progress: 100,
          failures: [
            {
              organisation: selectedOrganisations[1]!,
              errorCode: 'SCHULAUFSICHT_SCHULE_UND_AUFSICHT_SELBER_BAUM',
            },
          ],
        };
        return Promise.resolve();
      },
    );
    const relationshipStore: OrganisationsbeziehungStore = useOrganisationsbeziehungStore();
    relationshipStore.loadBeziehungen = vi.fn().mockResolvedValue(undefined);
    await nextTick();

    await wrapper?.get('[data-testid="organisationsbeziehungen-toggle-button"]').trigger('click');
    await flushPromises();
    await wrapper?.get('[data-testid="organisationsbeziehungen-add-button"]').trigger('click');
    await flushPromises();

    expect(wrapper?.find('[data-testid="org-selector-error-alert"]').exists()).toBe(true);
    expect(wrapper?.find('[data-testid="schule-details-container"]').exists()).toBe(true);
    expect(organisationStore.errorCode).toBe('');

    await wrapper?.get('[data-testid="apply-search-filter-button"]').trigger('click');
    await flushPromises();
    expect(wrapper?.find('[data-testid="org-selector-error-alert"]').exists()).toBe(false);

    if (wrapper === null) {
      throw new Error('The SchuleDetailsView was not mounted.');
    }
    const mountedWrapper: VueWrapper = wrapper;
    await Promise.all(
      behoerden.map((behoerde: Organisation) =>
        mountedWrapper.get(`[data-testid="org-selector-checkbox-${behoerde.id}"] input`).trigger('click'),
      ),
    );
    await wrapper?.get('[data-testid="org-selector-create-button"]').trigger('click');
    await flushPromises();

    const bulkErrorDialog: DOMWrapper<Element> = new DOMWrapper(document.body);
    expect(organisationStore.createOrganisationRelationships).toHaveBeenCalledExactlyOnceWith(
      mockSchule,
      expect.any(Array),
    );
    expect(organisationStore.errorCode).toBe('');
    expect(wrapper?.find('[data-testid="schule-details-container"]').exists()).toBe(true);
    expect(wrapper?.find('[data-testid="organisation-relationship-selector-section"]').exists()).toBe(true);
    expect(bulkErrorDialog.text()).toContain('1 Beziehung wurde erfolgreich gespeichert.');
    expect(bulkErrorDialog.text()).toContain(
      'Schule und Schulaufsichtsbehörde müssen demselben Zuständigkeitsbereich zugeordnet sein.',
    );
  });

  test('it hides content when error exists', async () => {
    organisationStore.errorCode = 'SCHULE_NOT_FOUND';
    organisationStore.currentSchule = null;
    await nextTick();

    // When there's an error, the organisation should not be displayed
    expect(wrapper?.find('[data-testid="schule-details-container"]').exists()).toBe(false);
  });

  test('it navigates to schule management when close is clicked', async () => {
    organisationStore.currentSchule = mockSchule;
    await nextTick();

    const pushSpy: ReturnType<typeof vi.spyOn> = vi.spyOn(router, 'push');

    // Find the layout card component and trigger the onCloseClicked event
    const layoutCard: VueWrapper | undefined = wrapper?.findComponent({ name: 'LayoutCard' });
    if (layoutCard) {
      layoutCard.vm.$emit('onCloseClicked');
    }
    await nextTick();

    expect(pushSpy).toHaveBeenCalledWith({ name: 'schule-management' });
  });

  test('it renders with correct root css class', () => {
    expect(wrapper?.find('div.admin').exists()).toBe(true);
  });

  test('it shows a loading indicator while data is loading', async () => {
    organisationStore.loading = true;
    organisationStore.currentSchule = null;
    await nextTick();

    expect(wrapper?.find('[data-testid="schule-details-container"]').exists()).toBe(true);
    expect(wrapper?.find('.v-progress-circular').exists()).toBe(true);
  });
});
