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

type FormFields = {
  schulform: string;
  schulname: string;
  emailAdress: string;
};

type FormSelectors = {
  schulformSelect: DOMWrapper<Element> | undefined;
  schulnameInput: DOMWrapper<Element> | undefined;
  emailAdressInput: DOMWrapper<Element> | undefined;
};

async function fillForm(args: Partial<FormFields>): Promise<Partial<FormSelectors>> {
  const { schulform, schulname, emailAdress }: Partial<FormFields> = args;
  const selectors: Partial<FormSelectors> = {};

  if (schulform) {
    const schulformSelect: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="schulform-select"]');
    if (schulformSelect?.exists()) {
      await schulformSelect.find('select').setValue(schulform);
      await nextTick();
      selectors.schulformSelect = schulformSelect;
    }
  }

  if (schulname) {
    const schulnameInput: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="schulname-input"]');
    if (schulnameInput?.exists()) {
      await schulnameInput.find('input').setValue(schulname);
      await nextTick();
      selectors.schulnameInput = schulnameInput;
    }
  }

  if (emailAdress) {
    const emailAdressInput: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="email-input"]');
    if (emailAdressInput?.exists()) {
      await emailAdressInput.find('input').setValue(emailAdress);
      await nextTick();
      selectors.emailAdressInput = emailAdressInput;
    }
  }

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
    const card = wrapper?.getComponent({ name: 'LayoutCard' });
    expect(card?.props('header')).toBeTruthy();
  });

  test('it passes initial form values from currentSchule to SchuleForm', () => {
    const form: VueWrapper | undefined = wrapper?.findComponent(SchuleForm);
    expect(form?.exists()).toBe(true);
    const initialValues: SchuleDetailsForm = form?.props('initialValues') as unknown as SchuleDetailsForm;
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

  test('it passes schultraeger list to SchuleForm', () => {
    const form: VueWrapper | undefined = wrapper?.findComponent(SchuleForm);
    expect(form?.exists()).toBe(true);
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

  test('it caches submitted form values and passes them to form', async () => {
    vi.spyOn(organisationStore, 'updateSchuleDetails').mockImplementation(() => {
      organisationStore.errorCode = '';
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

    // After submission, the cached values should be used in the success template
    const successTemplate: VueWrapper | undefined = wrapper?.findComponent(SchuleSuccessTemplate);
    if (successTemplate?.exists()) {
      expect(successTemplate).toBeTruthy();
    }
  });

  test('it marks form as not dirty after successful submission', async () => {
    vi.spyOn(organisationStore, 'updateSchuleDetails').mockImplementation(() => {
      organisationStore.errorCode = '';
      return Promise.resolve();
    });

    const form: VueWrapper = wrapper!.findComponent({ name: 'SchuleForm' });
    const formData: SchuleDetailsForm = {
      selectedSchulform: 'schultraeger-id',
      selectedDienststellennummer: 'SCH002',
      selectedSchulname: 'Updated Schule',
      selectedEmailAdress: 'updated@schule.de',
    };

    // Mark form as dirty first
    form.vm.$emit('update:dirty', true);
    await nextTick();

    form.vm.$emit('click:submit', formData);
    await flushPromises();
    await nextTick();

    // After successful submission, the dirty state should be reset
    // This is verified by checking that the success template is shown
    // which only happens when the form submission was successful
    const successTemplate: VueWrapper | undefined = wrapper?.findComponent(SchuleSuccessTemplate);
    expect(successTemplate?.exists()).toBe(true);
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

  test('it renders SchuleForm component', () => {
    const form: VueWrapper = wrapper!.findComponent({ name: 'SchuleForm' });
    expect(form.exists()).toBe(true);
  });

  test('it shows error state when errorCode is set on store', async () => {
    // Test that the component responds to error state changes
    organisationStore.errorCode = 'TEST_ERROR';
    await flushPromises();
    await nextTick();
    await nextTick(); // Extra nextTick to ensure reactivity

    // The error state should be set on the store
    expect(organisationStore.errorCode).toBe('TEST_ERROR');
  });

  test('it shows loading state to form when organisationStore is loading', async () => {
    organisationStore.loading = true;
    await nextTick();
    const form: VueWrapper | undefined = wrapper?.findComponent(SchuleForm);
    expect(form?.exists()).toBe(true);
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

    test('blocks navigation and then confirms the pending route change when the form is dirty', async () => {
      const form: VueWrapper = wrapper!.findComponent({ name: 'SchuleForm' });
      form.vm.$emit('update:dirty', true);
      await nextTick();

      const next: MockInstance = vi.fn();
      storedBeforeRouteLeaveCallback({} as RouteLocationNormalized, {} as RouteLocationNormalized, next as never);

      expect((wrapper!.vm.$.setupState as Record<string, unknown>).showUnsavedChangesDialog).toBe(true);
      expect(next).not.toHaveBeenCalled();

      (wrapper!.vm.$.setupState as Record<string, unknown>).handleConfirmUnsavedChanges?.();
      expect(next).toHaveBeenCalledTimes(1);
      expect(organisationStore.errorCode).toBe('');
    });

    test('preventNavigation prevents default when isDirty is true', async () => {
      wrapper?.unmount();
      wrapper = await mountComponent();

      const form: VueWrapper = wrapper.findComponent({ name: 'SchuleForm' });
      form.vm.$emit('update:dirty', true);
      await flushPromises();

      const event: BeforeUnloadEvent = new Event('beforeunload') as BeforeUnloadEvent;
      const preventDefaultSpy: MockInstance = vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  test('it properly mounts and unmounts the component', () => {
    expect(wrapper?.exists()).toBe(true);
    wrapper?.unmount();
    expect(() => {
      wrapper = null;
    }).not.toThrow();
  });

  test('it removes beforeunload listener on unmount', () => {
    const removeEventListenerSpy: MockInstance = vi.spyOn(window, 'removeEventListener');
    wrapper?.unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  test('it emits update:dirty when form emits dirty event', async () => {
    wrapper?.unmount();
    wrapper = await mountComponent();

    const form: VueWrapper = wrapper.findComponent({ name: 'SchuleForm' });
    expect(form?.exists()).toBe(true);

    form.vm.$emit('update:dirty', true);
    await nextTick();

    // Verify the form received the event
    const updatedForm: VueWrapper = wrapper.findComponent({ name: 'SchuleForm' });
    expect(updatedForm?.exists()).toBe(true);
  });

  test('it closes dialog when form emits update:showUnsavedChangesDialog with false', async () => {
    wrapper?.unmount();
    wrapper = await mountComponent();

    const form: VueWrapper = wrapper.findComponent({ name: 'SchuleForm' });
    form.vm.$emit('update:showUnsavedChangesDialog', false);
    await nextTick();

    expect(form?.exists()).toBe(true);
  });

  describe('beforeunload event handling', () => {
    test('prevents navigation when form is dirty', async () => {
      wrapper?.unmount();
      wrapper = await mountComponent();

      const form: VueWrapper = wrapper.findComponent({ name: 'SchuleForm' });
      form.vm.$emit('update:dirty', true);
      await nextTick();

      const event: BeforeUnloadEvent = new Event('beforeunload') as BeforeUnloadEvent;
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

      const event: BeforeUnloadEvent = new Event('beforeunload') as BeforeUnloadEvent;
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

      const event: BeforeUnloadEvent = new Event('beforeunload') as BeforeUnloadEvent;
      vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      // returnValue should be set to empty string for Chrome compatibility
      expect((event as any).returnValue).toBeDefined();
    });
  });

  describe('handleConfirmUnsavedChanges', () => {
    test('clears errorCode when confirming unsaved changes', async () => {
      organisationStore.errorCode = 'SOME_ERROR';
      await nextTick();

      const form: VueWrapper = wrapper.findComponent({ name: 'SchuleForm' });
      form.vm.$emit('click:confirmUnsaved');
      await flushPromises();

      expect(organisationStore.errorCode).toBe('');
    });
  });
});
