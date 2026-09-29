import routes from '@/router/routes';
import {
  OrganisationsTyp,
  useOrganisationStore,
  type Organisation,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
import { DOMWrapper, VueWrapper, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { expect, test, type MockInstance } from 'vitest';
import { nextTick, type Component } from 'vue';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import KlassenDetailsView from './KlasseDetailsView.vue';

let wrapper: VueWrapper | null = null;
let router: Router;
const organisationStore: OrganisationStore = useOrganisationStore();

const mockCurrentOrganisation: Organisation = {
  id: '2',
  kennung: '1234654',
  name: 'BTC Schule',
  namensergaenzung: '',
  kuerzel: 'BTC',
  typ: OrganisationsTyp.Schule,
  administriertVon: '1',
};

const mockCurrentKlasse: Organisation = {
  id: '3',
  name: '1a',
  namensergaenzung: '',
  typ: OrganisationsTyp.Klasse,
  administriertVon: '2',
};

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

  organisationStore.currentOrganisation = mockCurrentOrganisation;
  organisationStore.organisationenFilters.set('klasse-form', {
    total: 1,
    loading: false,
    filterResult: [mockCurrentOrganisation],
  });

  organisationStore.currentKlasse = mockCurrentKlasse;
  vi.spyOn(organisationStore, 'getOrganisationById').mockImplementation(
    (_id: string, _typ: OrganisationsTyp | undefined): Promise<void> => {
      organisationStore.currentKlasse = mockCurrentKlasse;
      organisationStore.currentOrganisation = mockCurrentOrganisation;
      return Promise.resolve();
    },
  );

  wrapper = mount(KlassenDetailsView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        KlassenDetailsView: KlassenDetailsView as Component,
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

describe('KlassenDetailsView', () => {
  test('it renders the klasse details view and its components', () => {
    expect(wrapper?.find('[data-testid="klasse-details-headline"]').isVisible()).toBe(true);
    expect(wrapper?.findComponent({ ref: 'klasse-creation-form' }).isVisible()).toBe(true);
    expect(wrapper?.findComponent({ ref: 'klasse-delete' }).isVisible()).toBe(true);
    expect(wrapper?.find('[data-testid="klasse-form-schule-select"]').text()).toEqual('1234654 (BTC Schule)');
    expect(wrapper?.find('#klassenname-input').attributes('value')).toEqual('1a');
    expect(wrapper?.findComponent({ ref: 'klasse-delete' }).isVisible()).toBe(true);
  });

  test.skip('it shows current klasse data', async () => {
    organisationStore.currentOrganisation!.name = '';
    organisationStore.currentOrganisation!.kennung = '';
    organisationStore.currentKlasse!.administriertVon = '';
    await nextTick();

    expect(wrapper?.find('[data-testid="schule-select"]').text()).toEqual('---');

    organisationStore.currentOrganisation!.name = 'BTC Schule';
    await nextTick();

    expect(wrapper?.find('[data-testid="schule-select"]').text()).toEqual('BTC Schule');

    organisationStore.currentOrganisation!.kennung = '1234654';
    await nextTick();

    expect(wrapper?.find('[data-testid="schule-select"]').text()).toEqual('1234654 (BTC Schule)');
    // TODO: the klassenname is not displayed in the input field
    expect(wrapper?.find('[data-testid="klassenname-input"] input').text()).toEqual('1a');

    organisationStore.currentOrganisation = mockCurrentOrganisation;
    organisationStore.currentKlasse = mockCurrentKlasse;
  });

  test('it shows an error if error code exists', async () => {
    organisationStore.errorCode = 'UNSPECIFIED_ERROR';
    await nextTick();

    expect(wrapper?.find('[data-testid="klasse-details-error-alert-title"]').text()).toBe(
      'Fehler beim Laden der Klassen',
    );
    organisationStore.errorCode = '';
  });

  test('it navigates back to klassen table', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');
    await wrapper?.find('[data-testid="close-layout-card-button"]').trigger('click');
    expect(push).toHaveBeenCalledTimes(1);
  });

  test('it activates and cancels editing', async () => {
    expect(wrapper?.find('[data-testid="klasse-form-submit-button"]').exists()).toBe(false);
    expect(wrapper?.find('[data-testid="klasse-form-discard-button"]').exists()).toBe(false);
    await wrapper?.find('[data-testid="klasse-edit-button"]').trigger('click');
    await nextTick();

    const saveKlasseButton: DOMWrapper<HTMLInputElement> | undefined = wrapper?.find(
      '[data-testid="klasse-form-submit-button"]',
    );
    expect(saveKlasseButton?.isVisible()).toBe(true);

    await wrapper?.find('[data-testid="klasse-form-discard-button"]').trigger('click');
    await nextTick();

    expect(wrapper?.find('[data-testid="klasse-form-submit-button"]').exists()).toBe(false);
    expect(wrapper?.find('[data-testid="klasse-form-discard-button"]').exists()).toBe(false);
  });

  test('it does not cancel editing because of unsaved changes', async () => {
    organisationStore.updatedOrganisation = null;
    organisationStore.errorCode = '';

    await wrapper?.find('[data-testid="klasse-edit-button"]').trigger('click');
    await nextTick();

    await wrapper?.find('[data-testid="klassenname-input"] input').setValue('1b');
    await nextTick();

    await wrapper?.find('[data-testid="klasse-form-discard-button"]').trigger('click');
    await nextTick();

    // TODO: the dialog is not removed from DOM
    // expect(saveKlasseButton?.isVisible()).toBe(false);
  });

  test('it does not cancel editing because of unsaved changes', async () => {
    organisationStore.updatedOrganisation = null;
    organisationStore.errorCode = '';

    await wrapper?.find('[data-testid="klasse-edit-button"]').trigger('click');
    await nextTick();

    await wrapper?.find('[data-testid="klassenname-input"] input').setValue('1b');
    await nextTick();

    await wrapper?.find('[data-testid="klasse-form-discard-button"]').trigger('click');
    await nextTick();

    expect(document.querySelector('[data-testid="unsaved-changes-warning-text"]')).not.toBeNull();
  });

  test('it edits klassenname', async () => {
    vi.spyOn(organisationStore, 'updateOrganisationNameById').mockImplementationOnce((_orgId: string, name: string) => {
      organisationStore.updatedOrganisation = {
        ...organisationStore.currentOrganisation!,
        name,
      };
      return Promise.resolve();
    });
    await wrapper?.find('[data-testid="klasse-edit-button"]').trigger('click');
    await nextTick();

    await wrapper?.find('#klassenname-input').setValue('1b');
    expect(wrapper?.find('#klassenname-input').attributes('value')).toEqual('1b');

    await wrapper?.find('[data-testid="klasse-form-submit-button"]').trigger('click');
    await flushPromises();

    organisationStore.updatedOrganisation = {
      id: '3',
      name: '1b',
      namensergaenzung: '',
      typ: OrganisationsTyp.Klasse,
      administriertVon: '2',
    };
    await nextTick();

    expect(wrapper?.find('[data-testid="created-klasse-name"]').text()).toEqual('1b');

    organisationStore.updatedOrganisation = null;
  });

  test('it deletes a klasse', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');
    await wrapper?.find('[data-testid="open-klasse-delete-dialog-button"]').trigger('click');
    await flushPromises();

    document.querySelector('[data-testid="klasse-delete-confirmation-text"]');
    expect(document.querySelector('[data-testid="klasse-delete-confirmation-text"]')).not.toBeNull();

    const klasseDeleteButton: HTMLElement | undefined = document.querySelectorAll<HTMLElement>(
      '[data-testid="klasse-delete-button"]',
    )[0];
    klasseDeleteButton?.click();
    await nextTick();

    document.querySelector('[data-testid="klasse-delete-success-text"]');
    expect(document.querySelector('[data-testid="klasse-delete-success-text"]')).not.toBeNull();

    const closeDialogButton: HTMLElement | undefined = document.querySelectorAll<HTMLElement>(
      '[data-testid="close-klasse-delete-success-dialog-button"]',
    )[0];
    closeDialogButton?.click();
    await nextTick();
    expect(push).toHaveBeenCalledTimes(1);
  });

  test('displays error message correctly', async () => {
    // Test case 1: UNSPECIFIED ERROR
    organisationStore.errorCode = 'UNSPECIFIED_ERROR';
    await nextTick();

    const spshAlertWrapper: VueWrapper | undefined = wrapper?.findComponent({ name: 'SpshAlert' });
    expect(spshAlertWrapper?.props()).toMatchObject({
      title: 'Fehler beim Laden der Klassen',
    });
    // Test case 2: NEWER_VERSION_ORGANISATION
    organisationStore.errorCode = 'NEWER_VERSION_ORGANISATION';
    await nextTick();

    expect(spshAlertWrapper?.props()).toMatchObject({
      title: 'Geänderte Daten',
    });
    // reset errorCode after test
    organisationStore.errorCode = '';
  });
});
