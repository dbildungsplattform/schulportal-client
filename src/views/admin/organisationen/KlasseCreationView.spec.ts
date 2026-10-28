import type { OrganisationResponse } from '@/api-client/generated';
import routes from '@/router/routes';
import { useOrganisationStore, type OrganisationStore } from '@/stores/OrganisationStore';
import { VueWrapper, flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, test, vi, type Mock, type MockInstance } from 'vitest';
import { nextTick, type Component } from 'vue';
import {
  createRouter,
  createWebHistory,
  type NavigationGuardNext,
  type RouteLocationNormalized,
  type Router,
} from 'vue-router';
import KlasseCreationView from './KlasseCreationView.vue';

let wrapper: VueWrapper | null = null;
let router: Router;
const organisationStore: OrganisationStore = useOrganisationStore();

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

async function mountComponent(): Promise<ReturnType<typeof mount<typeof KlasseCreationView>>> {
  await vi.dynamicImportSettled();
  return mount(KlasseCreationView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        KlasseCreationView: KlasseCreationView as Component,
      },
      plugins: [router],
    },
  });
}

type FormFields = {
  schule: string;
  klassenname: string;
};

type FormSelectors = {
  schuleSelect: VueWrapper;
  klassennameInput: VueWrapper;
};

async function fillForm(args: Partial<FormFields>): Promise<Partial<FormSelectors>> {
  const { schule, klassenname }: Partial<FormFields> = args;
  const selectors: Partial<FormSelectors> = {};

  const schuleSelect: VueWrapper | undefined = wrapper
    ?.findComponent({ ref: 'klasse-creation-form' })
    .findComponent({ ref: 'schulenFilter' })
    .findComponent({ ref: 'klasse-form-schule-select' });
  expect(schuleSelect?.exists()).toBe(true);

  await schuleSelect?.setValue(schule);
  await nextTick();
  selectors.schuleSelect = schuleSelect;

  const klassennameInput: VueWrapper | undefined = wrapper
    ?.findComponent({ ref: 'klasse-creation-form' })
    .findComponent({ ref: 'klassenname-input' });
  expect(klassennameInput?.exists()).toBe(true);

  await klassennameInput?.setValue(klassenname);
  await nextTick();
  selectors.klassennameInput = klassennameInput;

  return selectors;
}

beforeEach(async () => {
  document.body.innerHTML = `
    <div>
      <router-view>
        <div id="app"></div>
      </router-view>
    </div>
  `;

  router = createRouter({
    history: createWebHistory(),
    routes,
  });

  router.push('/');
  await router.isReady();

  wrapper = await mountComponent();
  organisationStore.errorCode = '';
  organisationStore.createdKlasse = null;
});

afterEach(() => {
  wrapper?.unmount();
});

describe('KlasseCreationView', () => {
  test('it renders the klasse creation form', () => {
    expect(wrapper?.find('[data-testid="klasse-form"]').isVisible()).toBe(true);
  });

  test('it renders all child components', () => {
    expect(wrapper?.getComponent({ name: 'LayoutCard' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'SpshAlert' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'FormWrapper' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'FormRow' })).toBeTruthy();
  });

  test('it navigates back to klassen table', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');
    await wrapper?.find('[data-testid="close-layout-card-button"]').trigger('click');
    expect(push).toHaveBeenCalledTimes(1);
  });

  test('it cancels editing', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');
    organisationStore.createdKlasse = null;
    organisationStore.errorCode = '';

    await wrapper?.find('[data-testid="klasse-form-discard-button"]').trigger('click');
    await flushPromises();

    expect(document.querySelector('[data-testid="unsaved-changes-warning-text"]')).toBeNull();
    expect(push).toHaveBeenCalledTimes(1);
  });

  test('it fills form and triggers submit', async () => {
    await fillForm({
      schule: '1',
      klassenname: '11b',
    });
    await nextTick();

    const mockKlasse: OrganisationResponse = {
      id: '9876',
      name: '11b',
      kennung: '9356494-11b',
      namensergaenzung: 'Klasse',
      kuerzel: '11b',
      typ: 'KLASSE',
      administriertVon: '1',
    } as OrganisationResponse;

    organisationStore.createdKlasse = mockKlasse;

    wrapper?.find('[data-testid="klasse-form-submit-button"]').trigger('click');
    await nextTick();

    expect(wrapper?.find('[data-testid="create-another-klasse-button"]').isVisible()).toBe(true);

    wrapper?.find('[data-testid="create-another-klasse-button"]').trigger('click');
    await flushPromises();

    expect(organisationStore.createdKlasse).toBe(null);
  });

  describe('navigation interception', () => {
    afterEach(() => {
      vi.unmock('vue-router');
    });

    test('it triggers if form is dirty', async () => {
      const expectedCallsToNext: number = 0;
      vi.mock('vue-router', async (importOriginal: () => Promise<object>) => {
        const mod: object = await importOriginal();
        return {
          ...mod,
          onBeforeRouteLeave: vi.fn((actualCallback: OnBeforeRouteLeaveCallback) => {
            storedBeforeRouteLeaveCallback = actualCallback;
          }),
        };
      });
      wrapper = await mountComponent();
      await fillForm({
        schule: '1',
        klassenname: '11b',
      });

      const spy: Mock = vi.fn();
      storedBeforeRouteLeaveCallback({} as RouteLocationNormalized, {} as RouteLocationNormalized, spy);
      expect(spy).toHaveBeenCalledTimes(expectedCallsToNext);
      await nextTick();

      const confirmButton: Element | null = document.querySelector('[data-testid="confirm-unsaved-changes-button"]');
      expect(confirmButton).not.toBeNull();
      confirmButton!.dispatchEvent(new Event('click'));
      expect(spy).toHaveBeenCalledOnce();
    });

    test('it does not trigger if form is not dirty', async () => {
      const expectedCallsToNext: number = 1;
      vi.mock('vue-router', async (importOriginal: () => Promise<object>) => {
        const mod: object = await importOriginal();
        return {
          ...mod,
          onBeforeRouteLeave: vi.fn((actualCallback: OnBeforeRouteLeaveCallback) => {
            storedBeforeRouteLeaveCallback = actualCallback;
          }),
        };
      });
      wrapper = await mountComponent();
      const spy: Mock = vi.fn();
      storedBeforeRouteLeaveCallback({} as RouteLocationNormalized, {} as RouteLocationNormalized, spy);
      expect(spy).toHaveBeenCalledTimes(expectedCallsToNext);
    });
  });

  describe.each([[true], [false]])('when form is dirty:%s', (isFormDirty: boolean) => {
    beforeEach(async () => {
      if (isFormDirty) {
        await fillForm({
          schule: '1',
          klassenname: '11b',
        });
      }
    });

    test('it handles unloading', () => {
      const event: Event = new Event('beforeunload');
      const spy: MockInstance = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);
      if (isFormDirty) {
        expect(spy).toHaveBeenCalledOnce();
      } else {
        expect(spy).not.toHaveBeenCalledOnce();
      }
    });
  });

  describe('error handling', () => {
    test('it shows error message', async () => {
      organisationStore.errorCode = 'KLASSENNAME_AN_SCHULE_EINDEUTIG';
      await nextTick();

      expect(wrapper?.find('[data-testid$="alert-title"]').isVisible()).toBe(true);

      await wrapper?.find('[data-testid$="alert-button"]').trigger('click');
      await flushPromises();

      expect(organisationStore.errorCode).toBe('');
    });

    test('shows error message if REQUIRED_STEP_UP_LEVEL_NOT_MET error is present and click close button', async () => {
      organisationStore.errorCode = 'REQUIRED_STEP_UP_LEVEL_NOT_MET';
      await nextTick();

      expect(wrapper?.find('[data-testid$="alert-title"]').isVisible()).toBe(true);

      wrapper?.find('[data-testid$="alert-button"]').trigger('click');
      await nextTick();

      organisationStore.errorCode = '';
    });
  });
});
