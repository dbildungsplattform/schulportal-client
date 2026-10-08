import type { OrganisationResponse } from '@/api-client/generated';
import BehoerdeForm from '@/components/admin/behoerden/BehoerdeForm.vue';
import routes from '@/router/routes';
import { OrganisationsTyp, useOrganisationStore, type OrganisationStore } from '@/stores/OrganisationStore';
import type { BehoerdeFormValues } from '@/utils/validationBehoerde';
import { VueWrapper, flushPromises, mount } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { expect, test, type Mock, type MockInstance } from 'vitest';
import { nextTick, type Component } from 'vue';
import {
  createRouter,
  createWebHistory,
  type NavigationGuardNext,
  type RouteLocationNormalized,
  type Router,
} from 'vue-router';
import BehoerdeCreationView from './BehoerdeCreationView.vue';

let wrapper: VueWrapper | null = null;
let router: Router;
let organisationStore: OrganisationStore;

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

async function mountComponent(): Promise<ReturnType<typeof mount<typeof BehoerdeCreationView>>> {
  await vi.dynamicImportSettled();
  return mount(BehoerdeCreationView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        BehoerdeCreationView: BehoerdeCreationView as Component,
      },
      plugins: [router],
    },
  });
}

beforeEach(async () => {
  Object.defineProperty(window, 'location', {
    value: {
      href: '',
      reload: vi.fn(),
    },
    writable: true,
  });

  Object.defineProperty(window, 'history', {
    value: {
      go: vi.fn(),
      pushState: vi.fn(),
      replaceState: vi.fn(),
    },
    writable: true,
  });
  document.body.innerHTML = `
    <div>
        <router-view>
            <div id="app"></div>
         </router-view>
    </div>
  `;

  organisationStore = useOrganisationStore();
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

  router = createRouter({
    history: createWebHistory(),
    routes,
  });

  router.push({ name: 'create-behoerde' });
  await router.isReady();

  wrapper = await mountComponent();
  await flushPromises();
});

afterEach(() => {
  vi.restoreAllMocks();
  wrapper?.unmount();
});

describe('BehoerdeCreationView', () => {
  test('it renders the Behoerde form', () => {
    expect(wrapper?.find('[data-testid="behoerdenname-input"]').isVisible()).toBe(true);
  });

  test('it renders all child components', () => {
    expect(wrapper?.getComponent({ name: 'LayoutCard' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'SpshAlert' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'BehoerdeForm' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'FormWrapper' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'FormRow' })).toBeTruthy();
  });

  test('it navigates to start when the close button is clicked', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');
    await wrapper?.find('[data-testid="close-layout-card-button"]').trigger('click');

    expect(push).toHaveBeenCalledTimes(1);
  });

  test('it fills form and triggers submit', async () => {
    organisationStore.createdBehoerde = null;
    await nextTick();

    const behoerdennameInput: VueWrapper | undefined = wrapper
      ?.findComponent({ ref: 'behoerde-creation-form' })
      .findComponent({ ref: 'behoerdenname-input' });
    await behoerdennameInput?.setValue('Random Behoerdenname');
    await nextTick();
    const mockBehoerde: OrganisationResponse = DoFactory.getOrganisation({
      id: '2',
      name: 'Random Behoerde',
      kennung: '',
      namensergaenzung: '',
      kuerzel: '',
      typ: OrganisationsTyp.Traeger,
      administriertVon: '2',
    }) as OrganisationResponse;

    wrapper?.find('[data-testid="behoerde-form-submit-button"]').trigger('click');
    organisationStore.createdBehoerde = mockBehoerde;
    await flushPromises();

    expect(wrapper?.find('[data-testid="create-another-behoerde-button"]').isVisible()).toBe(true);

    wrapper?.find('[data-testid="create-another-behoerde-button"]').trigger('click');
    await nextTick();

    expect(organisationStore.createdBehoerde).toBe(null);
  });

  test('it shows error message', async () => {
    organisationStore.errorCode = 'BEHOERDE_NAME_EINDEUTIG';
    await nextTick();
    expect(wrapper?.find('[data-testid$="alert-title"]').isVisible()).toBe(true);
    wrapper?.find('[data-testid$="alert-button"]').trigger('click');
    await nextTick();

    organisationStore.errorCode = '';
    await nextTick();
  });

  test('the loaded default allows leaving without a warning', (): void => {
    const next: Mock = vi.fn();
    storedBeforeRouteLeaveCallback({} as RouteLocationNormalized, {} as RouteLocationNormalized, next);
    expect(next).toHaveBeenCalledOnce();
  });

  test('restores all submitted values after a duplicate error', async (): Promise<void> => {
    vi.spyOn(organisationStore, 'createBehoerde').mockImplementation((): Promise<void> => {
      organisationStore.errorCode = 'BEHOERDE_NAME_EINDEUTIG';
      return Promise.resolve();
    });
    const form: { $emit: (event: string, values: BehoerdeFormValues) => void } = wrapper!.getComponent({
      name: 'BehoerdeForm',
    }).vm;
    form.$emit('click:submit', {
      selectedZustaendigkeitsbereich: '3',
      selectedBehoerdenname: 'Existing Behoerde',
      selectedDienststellennummer: '123',
    });
    await flushPromises();
    expect(wrapper?.findComponent(BehoerdeForm).exists()).toBe(false);
    await wrapper?.get('[data-testid$="alert-button"]').trigger('click');
    await flushPromises();
    expect(wrapper?.getComponent(BehoerdeForm).props('cachedValues')).toEqual({
      selectedZustaendigkeitsbereich: '3',
      selectedBehoerdenname: 'Existing Behoerde',
      selectedDienststellennummer: '123',
    });
    expect(wrapper?.get<HTMLInputElement>('[data-testid="behoerdenname-input"] input').element.value).toBe(
      'Existing Behoerde',
    );
  });

  test('clears unsaved changes only after a successful save', async (): Promise<void> => {
    vi.spyOn(organisationStore, 'createBehoerde').mockImplementation((): Promise<void> => {
      organisationStore.createdBehoerde = DoFactory.getOrganisation({ name: 'New Behoerde' });
      return Promise.resolve();
    });
    const form: { $emit: (event: string, values: BehoerdeFormValues | boolean) => void } = wrapper!.getComponent({
      name: 'BehoerdeForm',
    }).vm;
    form.$emit('update:dirty', true);
    form.$emit('click:submit', {
      selectedZustaendigkeitsbereich: '2',
      selectedBehoerdenname: 'New Behoerde',
      selectedDienststellennummer: '',
    });
    await flushPromises();
    expect(organisationStore.createBehoerde).toHaveBeenCalledWith('2', '2', 'New Behoerde', undefined);
    const next: Mock = vi.fn();
    storedBeforeRouteLeaveCallback({} as RouteLocationNormalized, {} as RouteLocationNormalized, next);
    expect(next).toHaveBeenCalledOnce();
  });

  test('shows error message if REQUIRED_STEP_UP_LEVEL_NOT_MET error is present and click close button', async () => {
    organisationStore.errorCode = 'REQUIRED_STEP_UP_LEVEL_NOT_MET';
    await nextTick();
    expect(wrapper?.find('[data-testid$="alert-title"]').isVisible()).toBe(true);
    wrapper?.find('[data-testid$="alert-button"]').trigger('click');
    await nextTick();

    organisationStore.errorCode = '';
    await nextTick();
  });

  describe('navigation interception', () => {
    afterEach(() => {
      vi.unmock('vue-router');
    });

    test('triggers unsaved changes dialog when form is dirty', async () => {
      const expectedCallsToNext: number = 0;
      // Mock onBeforeRouteLeave to capture the callback
      vi.mock('vue-router', async (importOriginal: () => Promise<object>) => {
        const mod: object = await importOriginal();
        return {
          ...mod,
          onBeforeRouteLeave: vi.fn((actualCallback: OnBeforeRouteLeaveCallback) => {
            storedBeforeRouteLeaveCallback = actualCallback;
          }),
        };
      });

      // Remount the component to make sure the form is empty at first
      wrapper?.unmount();
      wrapper = await mountComponent();
      await flushPromises();

      // Fill the form to make it dirty
      const behoerdennameInput: VueWrapper | undefined = wrapper
        .findComponent({ ref: 'behoerde-creation-form' })
        .findComponent({ ref: 'behoerdenname-input' });
      await behoerdennameInput.setValue('Random Behoerdenname');
      await nextTick();

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
