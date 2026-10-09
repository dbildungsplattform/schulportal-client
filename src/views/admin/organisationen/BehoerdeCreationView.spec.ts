import type { OrganisationResponse } from '@/api-client/generated';
import BehoerdeForm from '@/components/admin/behoerden/BehoerdeForm.vue';
import routes from '@/router/routes';
import { OrganisationsTyp, useOrganisationStore, type OrganisationStore } from '@/stores/OrganisationStore';
import type { BehoerdeFormValues } from '@/utils/validationBehoerde';
import { VueWrapper, enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { expect, test, type Mock, type MockInstance } from 'vitest';
import { nextTick, type ComponentInstance } from 'vue';
import {
  createRouter,
  createWebHistory,
  type NavigationGuardNext,
  type RouteLocationNormalized,
  type Router,
} from 'vue-router';
import BehoerdeCreationView from './BehoerdeCreationView.vue';

enableAutoUnmount(afterEach);

type OnBeforeRouteLeaveCallback = (
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  _next: NavigationGuardNext,
) => void;
let { storedBeforeRouteLeaveCallback }: { storedBeforeRouteLeaveCallback: OnBeforeRouteLeaveCallback } = vi.hoisted(
  () => {
    return {
      storedBeforeRouteLeaveCallback: (
        _to: RouteLocationNormalized,
        _from: RouteLocationNormalized,
        _next: NavigationGuardNext,
      ): void => {
        // intentionally left blank for test hoisting
      },
    };
  },
);

vi.mock('vue-router', async (importOriginal: () => Promise<object>) => {
  const mod: object = await importOriginal();
  return {
    ...mod,
    onBeforeRouteLeave: vi.fn((actualCallback: OnBeforeRouteLeaveCallback) => {
      storedBeforeRouteLeaveCallback = actualCallback;
    }),
  };
});

const setup = async (): Promise<{
  wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>>;
  router: Router;
  organisationStore: OrganisationStore;
}> => {
  const organisationStore: OrganisationStore = useOrganisationStore();
  organisationStore.$reset();
  vi.spyOn(organisationStore, 'getRootKinderSchultraeger').mockResolvedValue();
  organisationStore.schultraeger = [
    DoFactory.getOrganisation({
      id: '2',
      name: 'Öffentliche Schulen',
      namensergaenzung: 'Ergänzung',
      kennung: null,
      kuerzel: '',
      typ: OrganisationsTyp.Land,
      administriertVon: '1',
    }),
    DoFactory.getOrganisation({
      id: '3',
      name: 'Ersatzschulen',
      namensergaenzung: 'Ergänzung',
      kennung: null,
      kuerzel: '',
      typ: OrganisationsTyp.Land,
      administriertVon: '1',
    }),
  ];
  organisationStore.errorCode = '';

  const router: Router = createRouter({
    history: createWebHistory(),
    routes,
  });

  router.push({ name: 'create-behoerde' });
  await router.isReady();

  await vi.dynamicImportSettled();
  const wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>> = mount(BehoerdeCreationView, {
    attachTo: document.getElementById('app') || '',
    global: {
      plugins: [router],
    },
  });
  await flushPromises();

  return { wrapper, router, organisationStore };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BehoerdeCreationView', () => {
  test('announces successful creation in a persistent status region', async (): Promise<void> => {
    const {
      wrapper,
      organisationStore,
    }: {
      wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>>;
      organisationStore: OrganisationStore;
    } = await setup();

    const statusRegion: Element = wrapper.get('[data-testid="screenreader-output"]').element;
    expect(statusRegion.tagName).toBe('OUTPUT');
    expect(statusRegion.hasAttribute('role')).toBe(false);
    expect(statusRegion.textContent?.trim()).toBe('');

    organisationStore.createdBehoerde = DoFactory.getOrganisation({ name: 'New Behoerde' });
    await nextTick();

    expect(wrapper.get('[data-testid="screenreader-output"]').element).toBe(statusRegion);
    expect(statusRegion.textContent?.trim()).toBe('Die Behörde wurde erfolgreich hinzugefügt.');

    await wrapper.get('[data-testid="create-another-behoerde-button"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="screenreader-output"]').element).toBe(statusRegion);
    expect(statusRegion.textContent?.trim()).toBe('');

    organisationStore.errorCode = 'ORGANISATION_SPECIFICATION_ERROR';
    organisationStore.createdBehoerde = DoFactory.getOrganisation({ name: 'New Behoerde' });
    await nextTick();

    expect(statusRegion.textContent?.trim()).toBe('');
  });

  test('it renders the Behoerde form', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>> } = await setup();

    expect(wrapper.find('[data-testid="behoerdenname-input"]').isVisible()).toBe(true);
  });

  test('it renders all child components', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>> } = await setup();

    expect(wrapper.getComponent({ name: 'LayoutCard' })).toBeTruthy();
    expect(wrapper.getComponent({ name: 'SpshAlert' })).toBeTruthy();
    expect(wrapper.getComponent({ name: 'BehoerdeForm' })).toBeTruthy();
    expect(wrapper.getComponent({ name: 'FormWrapper' })).toBeTruthy();
    expect(wrapper.getComponent({ name: 'FormRow' })).toBeTruthy();
  });

  test('it navigates to start when the close button is clicked', async () => {
    const {
      wrapper,
      router,
    }: {
      wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>>;
      router: Router;
    } = await setup();

    const push: MockInstance = vi.spyOn(router, 'push');
    await wrapper.find('[data-testid="close-layout-card-button"]').trigger('click');

    expect(push).toHaveBeenCalledTimes(1);
  });

  test('it fills form and triggers submit', async () => {
    const {
      wrapper,
      organisationStore,
    }: {
      wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>>;
      organisationStore: OrganisationStore;
    } = await setup();

    organisationStore.createdBehoerde = null;
    await nextTick();

    await wrapper.get('[data-testid="behoerdenname-input"] input').setValue('Random Behoerdenname');
    await flushPromises();
    const mockBehoerde: OrganisationResponse = DoFactory.getOrganisation({
      id: '2',
      name: 'Random Behoerde',
      kennung: '',
      namensergaenzung: '',
      kuerzel: '',
      typ: OrganisationsTyp.Traeger,
      administriertVon: '2',
    }) as OrganisationResponse;

    wrapper.find('[data-testid="behoerde-form-submit-button"]').trigger('click');
    organisationStore.createdBehoerde = mockBehoerde;
    await flushPromises();

    expect(wrapper.find('[data-testid="create-another-behoerde-button"]').isVisible()).toBe(true);

    wrapper.find('[data-testid="create-another-behoerde-button"]').trigger('click');
    await nextTick();

    expect(organisationStore.createdBehoerde).toBeNull();
  });

  test('it shows error message', async () => {
    const {
      wrapper,
      organisationStore,
    }: {
      wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>>;
      organisationStore: OrganisationStore;
    } = await setup();

    organisationStore.errorCode = 'BEHOERDE_NAME_EINDEUTIG';
    await nextTick();
    expect(wrapper.find('[data-testid$="alert-title"]').isVisible()).toBe(true);
    wrapper.find('[data-testid$="alert-button"]').trigger('click');
    await nextTick();

    organisationStore.errorCode = '';
    await nextTick();
  });

  test('the loaded default allows leaving without a warning', async (): Promise<void> => {
    await setup();

    const next: Mock = vi.fn();
    storedBeforeRouteLeaveCallback({} as RouteLocationNormalized, {} as RouteLocationNormalized, next);
    expect(next).toHaveBeenCalledOnce();
  });

  test('restores all submitted values after a duplicate error', async (): Promise<void> => {
    const {
      wrapper,
      organisationStore,
    }: {
      wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>>;
      organisationStore: OrganisationStore;
    } = await setup();

    vi.spyOn(organisationStore, 'createBehoerde').mockImplementation((): Promise<void> => {
      organisationStore.errorCode = 'BEHOERDE_NAME_EINDEUTIG';
      return Promise.resolve();
    });
    const form: { $emit: (event: string, values: BehoerdeFormValues) => void } = wrapper.getComponent(BehoerdeForm)
      .vm as { $emit: (event: string, values: BehoerdeFormValues) => void };
    form.$emit('click:submit', {
      selectedZustaendigkeitsbereich: '3',
      selectedBehoerdenname: 'Existing Behoerde',
      selectedDienststellennummer: '123',
    });
    await flushPromises();
    expect(wrapper.findComponent(BehoerdeForm).exists()).toBe(false);
    await wrapper.get('[data-testid$="alert-button"]').trigger('click');
    await flushPromises();
    expect(wrapper.getComponent(BehoerdeForm).props('cachedValues')).toEqual({
      selectedZustaendigkeitsbereich: '3',
      selectedBehoerdenname: 'Existing Behoerde',
      selectedDienststellennummer: '123',
    });
    expect(wrapper.get<HTMLInputElement>('[data-testid="behoerdenname-input"] input').element.value).toBe(
      'Existing Behoerde',
    );
  });

  test('clears unsaved changes only after a successful save', async (): Promise<void> => {
    const {
      wrapper,
      organisationStore,
    }: {
      wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>>;
      organisationStore: OrganisationStore;
    } = await setup();

    vi.spyOn(organisationStore, 'createBehoerde').mockImplementation((): Promise<void> => {
      organisationStore.createdBehoerde = DoFactory.getOrganisation({ name: 'New Behoerde' });
      return Promise.resolve();
    });
    const form: { $emit: (event: string, values: BehoerdeFormValues | boolean) => void } = wrapper.getComponent(
      BehoerdeForm,
    ).vm as { $emit: (event: string, values: BehoerdeFormValues | boolean) => void };
    form.$emit('update:dirty', true);
    form.$emit('click:submit', {
      selectedZustaendigkeitsbereich: '2',
      selectedBehoerdenname: 'New Behoerde',
      selectedDienststellennummer: '',
    });
    await flushPromises();
    expect(organisationStore.createBehoerde).toHaveBeenCalledWith('2', '2', 'New Behoerde', '');
    const next: Mock = vi.fn();
    storedBeforeRouteLeaveCallback({} as RouteLocationNormalized, {} as RouteLocationNormalized, next);
    expect(next).toHaveBeenCalledOnce();
  });

  test('shows error message if REQUIRED_STEP_UP_LEVEL_NOT_MET error is present and click close button', async () => {
    const {
      wrapper,
      organisationStore,
    }: {
      wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>>;
      organisationStore: OrganisationStore;
    } = await setup();

    organisationStore.errorCode = 'REQUIRED_STEP_UP_LEVEL_NOT_MET';
    await nextTick();
    expect(wrapper.find('[data-testid$="alert-title"]').isVisible()).toBe(true);
    wrapper.find('[data-testid$="alert-button"]').trigger('click');
    await nextTick();

    organisationStore.errorCode = '';
    await nextTick();
  });

  describe('navigation interception', () => {
    test('triggers unsaved changes dialog when form is dirty', async () => {
      const expectedCallsToNext: number = 0;
      const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>> } = await setup();

      // Fill the form to make it dirty
      await wrapper.get('[data-testid="behoerdenname-input"] input').setValue('Random Behoerdenname');
      await flushPromises();

      const spy: Mock = vi.fn();
      storedBeforeRouteLeaveCallback({} as RouteLocationNormalized, {} as RouteLocationNormalized, spy);
      expect(spy).toHaveBeenCalledTimes(expectedCallsToNext);
      await nextTick();

      // Simulate user confirming the navigation
      const confirmButton: Element | null = document.querySelector('[data-testid="confirm-unsaved-changes-button"]');
      expect(confirmButton).not.toBeNull();
      confirmButton?.dispatchEvent(new Event('click'));
      await nextTick();

      expect(spy).toHaveBeenCalledOnce();
    });
  });
});
