import LayoutCard from '@/components/cards/LayoutCard.vue';
import {
  OrganisationsTyp,
  useOrganisationStore,
  type Organisation,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
import { DOMWrapper, VueWrapper, mount } from '@vue/test-utils';
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
    const layoutCard = wrapper?.findComponent(LayoutCard);
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
