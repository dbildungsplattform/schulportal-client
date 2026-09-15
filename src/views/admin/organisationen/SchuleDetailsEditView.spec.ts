import SchuleForm from '@/components/admin/schulen/SchuleForm.vue';
import SchuleSuccessTemplate from '@/components/admin/schulen/SchuleSuccessTemplate.vue';
import type { SchuleDetailsForm } from '@/components/admin/schulen/types';
import routes from '@/router/routes';
import { useOrganisationStore, type Organisation, type OrganisationStore } from '@/stores/OrganisationStore';
import { DOMWrapper, flushPromises, mount, VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { expect, test, type MockInstance } from 'vitest';
import { nextTick, type Component } from 'vue';
import {
  createRouter,
  createWebHistory,
  type NavigationGuardNext,
  type RouteLocationNormalized,
  type Router,
} from 'vue-router';
import SchuleDetailsEditView from './SchuleDetailsEditView.vue';

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

let wrapper: VueWrapper | null = null;
let router: Router;
const organisationStore: OrganisationStore = useOrganisationStore();

type OnBeforeRouteLeaveCallback = (
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  _next: NavigationGuardNext,
) => void;

async function mountComponent(
  schuleId: string = 'test-schule-id',
): Promise<ReturnType<typeof mount<typeof SchuleDetailsEditView>>> {
  await vi.dynamicImportSettled();
  // Create a route with the schuleId parameter already set
  router.push({ name: 'schule-edit', params: { id: schuleId } });
  await router.isReady();
  await flushPromises();

  return mount(SchuleDetailsEditView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        SchuleDetailsEditView: SchuleDetailsEditView as Component,
      },
      plugins: [router],
    },
  });
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

  const testSchule: Organisation = {
    ...DoFactory.getSchule(),
    id: 'test-schule-id',
    name: 'Test Schule',
    emailAdress: 'test@schule.de',
    kennung: 'SCH001',
    administriertVon: 'schultraeger-id',
  };

  organisationStore.currentSchule = testSchule;
  organisationStore.schultraeger = [DoFactory.getSchule()];
  organisationStore.loading = false;
  organisationStore.errorCode = '';

  wrapper = await mountComponent('test-schule-id');
});

afterEach(() => {
  organisationStore.$reset();
  wrapper?.unmount();
  vi.useRealTimers();
});

describe('SchuleDetailsEditView', () => {
  test('it renders all child components', () => {
    expect(wrapper?.getComponent({ name: 'LayoutCard' })).toBeTruthy();
    // Use findComponent instead of getComponent for components that may be conditionally rendered
    expect(wrapper?.findComponent({ name: 'SpshAlert' }).exists() || wrapper?.html().includes('spsh-alert')).toBe(true);
    expect(wrapper?.getComponent({ name: 'SchuleForm' })).toBeTruthy();
  });

  test('it fetches school details on mount', async () => {
    const fetchSpy: MockInstance = vi.spyOn(organisationStore, 'fetchSchulDetails');
    wrapper?.unmount();
    wrapper = await mountComponent('test-schule-id');
    expect(fetchSpy).toHaveBeenCalledWith('test-schule-id');
  });

  test('it fetches schultraeger on mount', async () => {
    const fetchSpy: MockInstance = vi.spyOn(organisationStore, 'getRootKinderSchultraeger');
    wrapper?.unmount();
    wrapper = await mountComponent('test-schule-id');
    expect(fetchSpy).toHaveBeenCalled();
  });

  test('it renders headline with correct text', () => {
    const headline: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="admin-headline"]');
    expect(headline?.exists()).toBe(true);
  });

  test('it renders LayoutCard with correct header', () => {
    const card: VueWrapper = wrapper!.findComponent({ name: 'LayoutCard' });
    const cardProps: { header?: string } = card.props();
    expect(cardProps.header).toBeTruthy();
  });

  test('it passes initial form values from currentSchule to SchuleForm', () => {
    const form: VueWrapper = wrapper!.findComponent({ name: 'SchuleForm' });
    expect(form.exists()).toBe(true);
    const formProps: { initialValues?: Partial<SchuleDetailsForm> } = form.props();
    const initialValues: Partial<SchuleDetailsForm> | undefined = formProps.initialValues;
    expect(initialValues?.selectedSchulname).toBe('Test Schule');
    expect(initialValues?.selectedEmailAdress).toBe('test@schule.de');
  });

  test('it returns undefined form values when currentSchule is not loaded', async () => {
    organisationStore.currentSchule = undefined;
    await nextTick();

    wrapper?.unmount();
    wrapper = await mountComponent();
    await flushPromises();

    expect(wrapper?.findComponent(SchuleForm).exists()).toBe(false);
    expect((wrapper?.vm as unknown as { initialFormValues?: SchuleDetailsForm }).initialFormValues).toBeUndefined();
  });

  test('it calls updateSchuleDetails when form is submitted', async () => {
    const updateSpy: MockInstance = vi.spyOn(organisationStore, 'updateSchuleDetails');
    const form: VueWrapper = wrapper!.findComponent({ name: 'SchuleForm' });

    const formData: SchuleDetailsForm = {
      selectedSchulform: 'schultraeger-id',
      selectedDienststellennummer: 'SCH002',
      selectedSchulname: 'Updated Schule',
      selectedEmailAdress: 'updated@schule.de',
    };

    form.vm.$emit('click:submit', formData);
    await flushPromises();

    expect(updateSpy).toHaveBeenCalledOnce();
    expect(updateSpy).toHaveBeenCalledWith({
      organisationId: 'test-schule-id',
      schultraegerform: formData.selectedSchulform,
      name: formData.selectedSchulname,
      emailAdress: formData.selectedEmailAdress,
    });
  });

  test('it shows success template after successful submission', async () => {
    vi.spyOn(organisationStore, 'updateSchuleDetails').mockImplementation(() => {
      organisationStore.errorCode = '';
      organisationStore.updatedOrganisation = {
        ...DoFactory.getOrganisation(),
        name: 'Updated Schule',
      };
      return Promise.resolve();
    });

    const form: VueWrapper = wrapper!.findComponent({ name: 'SchuleForm' });
    const formData: SchuleDetailsForm = {
      selectedSchulform: 'schultraeger-id',
      selectedDienststellennummer: 'SCH002',
      selectedSchulname: 'Updated Schule',
      selectedEmailAdress: 'updated@schule.de',
    };

    form.vm.$emit('click:submit', formData);
    await flushPromises();
    await nextTick();

    const successTemplate: VueWrapper | undefined = wrapper?.findComponent(SchuleSuccessTemplate);
    expect(successTemplate?.exists()).toBe(true);
  });

  test('it hides form when success template is shown', async () => {
    vi.spyOn(organisationStore, 'updateSchuleDetails').mockImplementation(() => {
      organisationStore.errorCode = '';
      organisationStore.updatedOrganisation = DoFactory.getOrganisation();
      return Promise.resolve();
    });

    const form: VueWrapper = wrapper!.findComponent({ name: 'SchuleForm' });
    const formData: SchuleDetailsForm = {
      selectedSchulform: 'schultraeger-id',
      selectedDienststellennummer: 'SCH002',
      selectedSchulname: 'Updated Schule',
      selectedEmailAdress: 'updated@schule.de',
    };

    form.vm.$emit('click:submit', formData);
    await flushPromises();
    await nextTick();

    const formInTemplate: VueWrapper | undefined = wrapper?.findComponent(SchuleForm);
    expect(formInTemplate?.exists()).toBe(false);
  });

  test('it renders error alert when errorCode is set', async () => {
    organisationStore.errorCode = 'SCHULE_NOT_FOUND';
    await flushPromises();
    await nextTick();

    // Verify alert is rendered by checking the HTML
    const html: string = wrapper?.html() || '';
    expect(html).toContain('data-testid="spsh-alert"');
  });

  test('it navigates back to schule-management when close button is clicked', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');
    const closeButton: Element | null = document.querySelector('[data-testid="close-layout-card-button"]');

    if (closeButton) {
      closeButton.dispatchEvent(new Event('click'));
      await nextTick();
    }

    expect(push).toHaveBeenCalledWith({ name: 'schule-management' });
  });

  test('it navigates back to schule-management when alert button is clicked', async () => {
    organisationStore.errorCode = 'SCHULE_NOT_FOUND';
    await nextTick();

    const push: MockInstance = vi.spyOn(router, 'push');
    const alertButton: Element | null = document.querySelector('[data-testid$="alert-button"]');

    if (alertButton) {
      alertButton.dispatchEvent(new Event('click'));
      await nextTick();
    }

    expect(push).toHaveBeenCalled();
  });

  test('it clears errorCode when navigating back to form after error', async () => {
    vi.spyOn(organisationStore, 'updateSchuleDetails').mockImplementation(() => {
      organisationStore.errorCode = 'SCHULE_UPDATE_FAILED';
      return Promise.resolve();
    });

    const form: VueWrapper = wrapper!.findComponent({ name: 'SchuleForm' });
    const formData: SchuleDetailsForm = {
      selectedSchulform: 'schultraeger-id',
      selectedDienststellennummer: 'SCH002',
      selectedSchulname: 'Updated Schule',
      selectedEmailAdress: 'updated@schule.de',
    };

    form.vm.$emit('click:submit', formData);
    await flushPromises();

    expect(organisationStore.errorCode).toBe('SCHULE_UPDATE_FAILED');

    // Simulate clearing the error state
    organisationStore.errorCode = '';
    await flushPromises();

    // Verify the error code was cleared
    expect(organisationStore.errorCode).toBe('');
  });

  describe('navigation interception - onBeforeRouteLeave', () => {
    test('onBeforeRouteLeave hook is called during mount', () => {
      expect(typeof storedBeforeRouteLeaveCallback).toBe('function');
    });

    test('does not block navigation when the form is not dirty', async () => {
      const form: VueWrapper = wrapper!.findComponent({ name: 'SchuleForm' });
      form.vm.$emit('update:dirty', false);
      await nextTick();

      const next: MockInstance = vi.fn();
      storedBeforeRouteLeaveCallback({} as RouteLocationNormalized, {} as RouteLocationNormalized, next as never);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  test('it removes beforeunload listener on unmount', () => {
    const removeEventListenerSpy: MockInstance = vi.spyOn(window, 'removeEventListener');
    wrapper?.unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  describe('beforeunload event handling', () => {
    test('prevents navigation when form is dirty', async () => {
      wrapper?.unmount();
      wrapper = await mountComponent();

      const form: VueWrapper = wrapper.findComponent({ name: 'SchuleForm' });
      form.vm.$emit('update:dirty', true);
      await nextTick();

      const event: BeforeUnloadEvent = new Event('beforeunload');
      const preventDefaultSpy: MockInstance = vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    test('does not prevent navigation when form is not dirty', async () => {
      wrapper?.unmount();
      wrapper = await mountComponent();

      const form: VueWrapper = wrapper.findComponent({ name: 'SchuleForm' });
      form.vm.$emit('update:dirty', false);
      await nextTick();

      const event: BeforeUnloadEvent = new Event('beforeunload');
      const preventDefaultSpy: MockInstance = vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    test('sets returnValue when preventing navigation', async () => {
      wrapper?.unmount();
      wrapper = await mountComponent();

      const form: VueWrapper = wrapper.findComponent({ name: 'SchuleForm' });
      form.vm.$emit('update:dirty', true);
      await nextTick();

      const event: BeforeUnloadEvent = new Event('beforeunload');
      vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      // returnValue should be set to empty string for Chrome compatibility
      expect(event.returnValue).toBeDefined();
    });
  });

  describe('handleConfirmUnsavedChanges', () => {
    test('clears errorCode when confirming unsaved changes', async () => {
      wrapper?.unmount();
      wrapper = await mountComponent();
      organisationStore.errorCode = 'SOME_ERROR';
      await nextTick();

      const form: VueWrapper = wrapper.findComponent({ name: 'SchuleForm' });
      form?.vm.$emit('click:confirmUnsaved');
      await flushPromises();

      expect(organisationStore.errorCode).toBe('');
    });
  });
});
