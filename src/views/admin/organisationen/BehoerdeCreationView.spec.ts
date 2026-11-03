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

const setup = async (
  initialLookupError: string = '',
): Promise<{
  wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>>;
  router: Router;
  organisationStore: OrganisationStore;
}> => {
  const organisationStore: OrganisationStore = useOrganisationStore();
  organisationStore.$reset();
  vi.spyOn(organisationStore, 'getRootChildren').mockResolvedValue();
  organisationStore.rootChildren = [
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
  if (initialLookupError) {
    vi.spyOn(organisationStore, 'getRootChildren').mockImplementationOnce((): Promise<void> => {
      organisationStore.rootChildren = [];
      organisationStore.errorCode = initialLookupError;
      return Promise.resolve();
    });
  }

  const router: Router = createRouter({
    history: createWebHistory(),
    routes,
  });

  router.push({ name: 'create-behoerde' });
  await router.isReady();

  await vi.dynamicImportSettled();
  const wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>> = mount(BehoerdeCreationView, {
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
  test('should navigate to the Behoerden list after creation', async (): Promise<void> => {
    const {
      wrapper,
      router,
      organisationStore,
    }: {
      wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>>;
      router: Router;
      organisationStore: OrganisationStore;
    } = await setup();
    organisationStore.createdBehoerde = DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde });
    await flushPromises();
    const pushSpy: MockInstance = vi.spyOn(router, 'push');

    await wrapper.get('[data-testid="success-template-secondary-button"]').trigger('click');
    await flushPromises();

    expect(pushSpy).toHaveBeenCalledWith({ name: 'behoerde-management' });
  });

  test.each([
    ['UNKNOWN_BACKEND_ERROR', 'Die Behörde konnte nicht angelegt werden.'],
    ['ORGANISATION_SPECIFICATION_ERROR', 'Die Behörde konnte nicht angelegt werden.'],
    ['BEHOERDE_NAME_EINDEUTIG', 'Der Behördenname existiert bereits.'],
    ['SCHULTRAEGER_ERROR', 'Die Zuständigkeitsbereiche konnten nicht geladen werden.'],
  ])('displays the expected message for %s', async (errorCode: string, message: string): Promise<void> => {
    const {
      wrapper,
      organisationStore,
    }: {
      wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>>;
      organisationStore: OrganisationStore;
    } = await setup();

    organisationStore.errorCode = errorCode;
    await nextTick();

    expect(wrapper.getComponent({ name: 'SpshAlert' }).props('text')).toBe(message);
    expect(organisationStore.errorCode).toBe(errorCode);
  });

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

    await wrapper.get('[data-testid="success-template-primary-button"]').trigger('click');
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

  test('retries a failed jurisdiction lookup before revealing the form', async (): Promise<void> => {
    const {
      wrapper,
      organisationStore,
    }: {
      wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>>;
      organisationStore: OrganisationStore;
    } = await setup('SCHULTRAEGER_ERROR');

    expect(wrapper.findComponent(BehoerdeForm).exists()).toBe(false);
    expect(organisationStore.rootChildren).toEqual([]);
    expect(wrapper.getComponent({ name: 'SpshAlert' }).props('text')).toBe(
      'Die Zuständigkeitsbereiche konnten nicht geladen werden.',
    );

    let finishRetry: () => void = vi.fn();
    vi.spyOn(organisationStore, 'getRootChildren').mockImplementationOnce(
      (): Promise<void> =>
        new Promise<void>((resolve: () => void): void => {
          finishRetry = (): void => {
            organisationStore.rootChildren = [DoFactory.getOrganisation()];
            resolve();
          };
        }),
    );

    await wrapper.get('[data-testid$="alert-button"]').trigger('click');
    await flushPromises();

    expect(organisationStore.getRootChildren).toHaveBeenCalledTimes(2);
    expect(organisationStore.errorCode).toBe('');
    expect(wrapper.findComponent(BehoerdeForm).exists()).toBe(false);

    finishRetry();
    await flushPromises();

    expect(wrapper.getComponent(BehoerdeForm).props('zustaendigkeitsbereichList')).toEqual(
      organisationStore.rootChildren,
    );
    expect(wrapper.getComponent(BehoerdeForm).props('initialValues')).toMatchObject({
      selectedZustaendigkeitsbereich: organisationStore.rootChildren[0]?.id,
    });
  });

  test('keeps the form hidden when the jurisdiction retry fails', async (): Promise<void> => {
    const {
      wrapper,
      organisationStore,
    }: {
      wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>>;
      organisationStore: OrganisationStore;
    } = await setup('SCHULTRAEGER_ERROR');

    vi.spyOn(organisationStore, 'getRootChildren').mockImplementationOnce((): Promise<void> => {
      organisationStore.errorCode = 'SCHULTRAEGER_ERROR';
      return Promise.resolve();
    });

    await wrapper.get('[data-testid$="alert-button"]').trigger('click');
    await flushPromises();

    expect(organisationStore.getRootChildren).toHaveBeenCalledTimes(2);
    expect(organisationStore.errorCode).toBe('SCHULTRAEGER_ERROR');
    expect(wrapper.findComponent(BehoerdeForm).exists()).toBe(false);
    expect(wrapper.get('[data-testid$="alert-title"]').isVisible()).toBe(true);
  });

  test('it renders all child components', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>> } = await setup();

    expect(wrapper.getComponent({ name: 'LayoutCard' })).toBeTruthy();
    expect(wrapper.getComponent({ name: 'SpshAlert' })).toBeTruthy();
    expect(wrapper.getComponent({ name: 'BehoerdeForm' })).toBeTruthy();
    expect(wrapper.getComponent({ name: 'FormWrapper' })).toBeTruthy();
    expect(wrapper.getComponent({ name: 'FormRow' })).toBeTruthy();
  });

  test('it navigates to the Behoerden table when the close button is clicked', async () => {
    const {
      wrapper,
      router,
    }: {
      wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>>;
      router: Router;
    } = await setup();

    const push: MockInstance = vi.spyOn(router, 'push');
    await wrapper.find('[data-testid="close-layout-card-button"]').trigger('click');
    await flushPromises();

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith({ name: 'behoerde-management' });
  });

  test('should return to the Behoerden list when discarding creation', async (): Promise<void> => {
    const {
      wrapper,
      router,
    }: {
      wrapper: VueWrapper<ComponentInstance<typeof BehoerdeCreationView>>;
      router: Router;
    } = await setup();
    const push: MockInstance = vi.spyOn(router, 'push');

    await wrapper.get('[data-testid="behoerde-form-discard-button"]').trigger('click');
    await flushPromises();

    expect(push).toHaveBeenCalledExactlyOnceWith({ name: 'behoerde-management' });
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

    expect(wrapper.find('[data-testid="success-template-primary-button"]').isVisible()).toBe(true);
    expect(wrapper.find('[data-testid="created-behoerde-dienststellennummer"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Dienststellennummer');

    wrapper.find('[data-testid="success-template-primary-button"]').trigger('click');
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
    expect(wrapper.getComponent({ name: 'SpshAlert' }).props('text')).toBe('Der Behördenname existiert bereits.');
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
    });
    await flushPromises();
    expect(wrapper.findComponent(BehoerdeForm).exists()).toBe(false);
    await wrapper.get('[data-testid$="alert-button"]').trigger('click');
    await flushPromises();
    expect(wrapper.getComponent(BehoerdeForm).props('cachedValues')).toEqual({
      selectedZustaendigkeitsbereich: '3',
      selectedBehoerdenname: 'Existing Behoerde',
    });
    expect(wrapper.get<HTMLInputElement>('[data-testid="behoerdenname-input"] input').element.value).toBe(
      'Existing Behoerde',
    );
    expect(organisationStore.getRootChildren).toHaveBeenCalledOnce();
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
    });
    await flushPromises();
    expect(organisationStore.createBehoerde).toHaveBeenCalledWith('2', '2', 'New Behoerde');
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
    expect(wrapper.getComponent({ name: 'SpshAlert' }).props('text')).toContain(
      'Sie werden anschließend zur Eingabe Ihres zweiten Faktors aufgefordert.',
    );
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
