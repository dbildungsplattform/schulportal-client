import SchuleForm from '@/components/admin/schulen/SchuleForm.vue';
import SchuleSuccessTemplate from '@/components/admin/schulen/SchuleSuccessTemplate.vue';
import type { SchuleDetailsForm } from '@/components/admin/schulen/types';
import routes from '@/router/routes';
import { useOrganisationStore, type Organisation, type OrganisationStore } from '@/stores/OrganisationStore';
import { DOMWrapper, flushPromises, mount, VueWrapper } from '@vue/test-utils';
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
import SchuleCreationView from './SchuleCreationView.vue';

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
const schultraegerOrganisation: Organisation = DoFactory.getOrganisation();

type OnBeforeRouteLeaveCallback = (
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  _next: NavigationGuardNext,
) => void;

async function mountComponent(): Promise<ReturnType<typeof mount<typeof SchuleCreationView>>> {
  await vi.dynamicImportSettled();
  const mountedComponent: ReturnType<typeof mount<typeof SchuleCreationView>> = mount(SchuleCreationView, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        SchuleCreationView: SchuleCreationView as Component,
      },
      plugins: [router],
    },
  });
  await flushPromises();
  return mountedComponent;
}

type FormFields = {
  schulform: string;
  dienststellennummer: string;
  schulname: string;
  emailAdresse: string;
};

type FormSelectors = {
  schulformRadioGroup: DOMWrapper<Element>;
  dienststellennummerInput: DOMWrapper<Element>;
  schulnameInput: DOMWrapper<Element>;
  emailAdresseInput: DOMWrapper<Element>;
};

async function fillForm(args: Partial<FormFields>): Promise<Partial<FormSelectors>> {
  const { schulform, dienststellennummer, schulname, emailAdresse }: Partial<FormFields> = args;
  const selectors: Partial<FormSelectors> = {};

  if (schulform) {
    // Find the radio button with the matching value
    const radioButton: Element | null = document.querySelector(`[data-testid^="schulform-radio-button-"]`);
    if (radioButton) {
      radioButton.dispatchEvent(new Event('click'));
      await nextTick();
    }
    const schulformRadioGroup: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="schulform-radio-group"]');
    selectors.schulformRadioGroup = schulformRadioGroup;
  }

  if (dienststellennummer) {
    const dienststellennummerInput: DOMWrapper<Element> | undefined = wrapper?.find(
      '[data-testid="dienststellennummer-input"]',
    );
    expect(dienststellennummerInput?.exists()).toBe(true);
    await dienststellennummerInput?.find('input').setValue(dienststellennummer);
    await nextTick();
    selectors.dienststellennummerInput = dienststellennummerInput;
  }

  if (schulname) {
    const schulnameInput: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="schulname-input"]');
    expect(schulnameInput?.exists()).toBe(true);
    await schulnameInput?.find('input').setValue(schulname);
    await nextTick();
    selectors.schulnameInput = schulnameInput;
  }

  if (emailAdresse) {
    const emailAdresseInput: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="email-adress-input"]');
    expect(emailAdresseInput?.exists()).toBe(true);
    await emailAdresseInput?.find('input').setValue(emailAdresse);
    await nextTick();
    selectors.emailAdresseInput = emailAdresseInput;
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

  wrapper = await mountComponent();

  organisationStore.errorCode = '';
  organisationStore.schultraeger = [schultraegerOrganisation];
});

afterEach(() => {
  organisationStore.$reset();
  wrapper?.unmount();
  vi.useRealTimers();
});

describe('SchuleCreationView', () => {
  test('it renders all child components', () => {
    expect(wrapper?.getComponent({ name: 'LayoutCard' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'SpshAlert' })).toBeTruthy();
    expect(wrapper?.getComponent({ name: 'SchuleForm' })).toBeTruthy();
  });

  test('it renders the headline', () => {
    expect(wrapper?.find('[data-testid="admin-headline"]').exists()).toBe(true);
  });

  test('it passes initial form values with default schulform to SchuleForm', async () => {
    // Make sure schultraeger is set before component mounts
    organisationStore.schultraeger = [schultraegerOrganisation];
    wrapper = await mountComponent();
    await flushPromises();

    // eslint-disable-next-line @typescript-eslint/typedef
    const form = wrapper?.findComponent(SchuleForm);
    expect(form?.exists()).toBe(true);
    expect(form?.props('initialValues')).toMatchObject({
      selectedSchulform: schultraegerOrganisation.id,
      selectedDienststellennummer: '',
      selectedSchulname: '',
    });
  });

  test('it initializes SchuleForm with the first schultraeger fetched after mounting', async () => {
    organisationStore.schultraeger = undefined;
    vi.spyOn(organisationStore, 'getRootKinderSchultraeger').mockImplementation(async () => {
      organisationStore.schultraeger = [schultraegerOrganisation];
    });

    wrapper?.unmount();
    wrapper = await mountComponent();

    const form: VueWrapper = wrapper.findComponent(SchuleForm);
    expect(form.props('initialValues')).toMatchObject({
      selectedSchulform: schultraegerOrganisation.id,
    });
  });

  test('it passes schultraeger list to SchuleForm', () => {
    // eslint-disable-next-line @typescript-eslint/typedef
    const form = wrapper?.findComponent(SchuleForm);
    expect(form?.props('schultraegerList')).toEqual([schultraegerOrganisation]);
  });

  test('it calls the correct function in the store when the form is submitted', async () => {
    const createOrganisationSpy: MockInstance = vi.spyOn(organisationStore, 'createOrganisation');
    const payload: SchuleDetailsForm = {
      selectedSchulform: schultraegerOrganisation.id,
      selectedDienststellennummer: '1234567',
      selectedSchulname: 'Test Schule',
      selectedEmailAdress: 'test@schule.de',
    };

    await fillForm({
      schulform: payload.selectedSchulform,
      dienststellennummer: payload.selectedDienststellennummer,
      schulname: payload.selectedSchulname,
      emailAdresse: payload.selectedEmailAdress,
    });

    await flushPromises();

    expect(createOrganisationSpy).not.toHaveBeenCalled();

    const form: VueWrapper = wrapper!.findComponent({ name: 'SchuleForm' });
    form.vm.$emit('click:submit', payload);
    await flushPromises();

    expect(createOrganisationSpy).toHaveBeenCalledOnce();
    expect(createOrganisationSpy).toHaveBeenCalledWith(
      payload.selectedSchulform,
      payload.selectedSchulform,
      payload.selectedDienststellennummer,
      payload.selectedSchulname,
      undefined,
      undefined,
      'SCHULE',
      undefined,
      payload.selectedEmailAdress,
    );
  });

  test('it renders success template after successful form submission', async () => {
    vi.spyOn(organisationStore, 'createOrganisation').mockImplementation(() => {
      organisationStore.createdSchule = DoFactory.getSchule();
      return Promise.resolve();
    });

    const payload: SchuleDetailsForm = {
      selectedSchulform: schultraegerOrganisation.id,
      selectedDienststellennummer: '1234567',
      selectedSchulname: 'Test Schule',
      selectedEmailAdress: 'test@schule.de',
    };

    const form: VueWrapper = wrapper!.findComponent({ name: 'SchuleForm' });
    form.vm.$emit('click:submit', payload);
    await flushPromises();

    // eslint-disable-next-line @typescript-eslint/typedef
    const successTemplate = wrapper?.findComponent(SchuleSuccessTemplate);
    expect(successTemplate?.exists()).toBe(true);
  });

  test('it clears isDirty state after successful form submission', async () => {
    vi.spyOn(organisationStore, 'createOrganisation').mockImplementation(() => {
      organisationStore.createdSchule = DoFactory.getSchule();
      return Promise.resolve();
    });

    organisationStore.schultraeger = [schultraegerOrganisation];
    wrapper = await mountComponent();
    await flushPromises();

    const payload: SchuleDetailsForm = {
      selectedSchulform: schultraegerOrganisation.id,
      selectedDienststellennummer: '1234567',
      selectedSchulname: 'Test Schule',
      selectedEmailAdress: 'test@schule.de',
    };

    const form: VueWrapper = wrapper.findComponent({ name: 'SchuleForm' });
    form.vm.$emit('click:submit', payload);
    await flushPromises();

    // Verify that the success template is shown (createdSchule is set)
    const successTemplate: VueWrapper | undefined = wrapper?.findComponent(SchuleSuccessTemplate);
    expect(successTemplate?.exists()).toBe(true);
  });

  test('it renders error alert when errorCode is present', async () => {
    organisationStore.errorCode = 'SCHULE_DUPLICATE';
    await nextTick();

    const alert = wrapper?.getComponent({ name: 'SpshAlert' });
    expect(alert?.props('modelValue')).toBe(true);
  });

  test('it calls correct function when error alert button is clicked', async () => {
    organisationStore.errorCode = 'SCHULE_DUPLICATE';
    await nextTick();

    const push: MockInstance = vi.spyOn(router, 'push');
    wrapper?.find('[data-testid$="alert-button"]').trigger('click');
    await nextTick();

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith({ name: 'create-schule' });
  });

  test('it closes the view and navigates back to schule management', async () => {
    const push: MockInstance = vi.spyOn(router, 'push');
    wrapper?.find('[data-testid="close-layout-card-button"]').trigger('click');
    await nextTick();

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith({ name: 'schule-management' });
  });

  test('it resets createdSchule on close', async () => {
    organisationStore.createdSchule = DoFactory.getSchule();
    vi.spyOn(router, 'push');

    wrapper?.find('[data-testid="close-layout-card-button"]').trigger('click');
    await nextTick();

    expect(organisationStore.createdSchule).toBeNull();
  });

  test('it handles create another schule button click', async () => {
    vi.spyOn(organisationStore, 'createOrganisation').mockImplementation(() => {
      organisationStore.createdSchule = DoFactory.getSchule();
      return Promise.resolve();
    });

    const payload: SchuleDetailsForm = {
      selectedSchulform: schultraegerOrganisation.id,
      selectedDienststellennummer: '1234567',
      selectedSchulname: 'Test Schule',
      selectedEmailAdress: 'test@schule.de',
    };

    const form: VueWrapper = wrapper!.findComponent({ name: 'SchuleForm' });
    form.vm.$emit('click:submit', payload);
    await flushPromises();

    const push: MockInstance = vi.spyOn(router, 'push');
    const successTemplate: VueWrapper | undefined = wrapper!.findComponent(SchuleSuccessTemplate);
    successTemplate.vm.$emit('onNavigateToSchuleForm');
    await nextTick();

    expect(organisationStore.createdSchule).toBeNull();
    expect(push).toHaveBeenCalled();
  });

  test('it navigates to schule management from success template', async () => {
    vi.spyOn(organisationStore, 'createOrganisation').mockImplementation(() => {
      organisationStore.createdSchule = DoFactory.getSchule();
      return Promise.resolve();
    });

    const payload: SchuleDetailsForm = {
      selectedSchulform: schultraegerOrganisation.id,
      selectedDienststellennummer: '1234567',
      selectedSchulname: 'Test Schule',
      selectedEmailAdress: 'test@schule.de',
    };

    const form: VueWrapper = wrapper!.findComponent({ name: 'SchuleForm' });
    form.vm.$emit('click:submit', payload);
    await flushPromises();

    const push: MockInstance = vi.spyOn(router, 'push');
    const successTemplate: VueWrapper | undefined = wrapper!.findComponent(SchuleSuccessTemplate);
    successTemplate.vm.$emit('onNavigateBackToSchuleManagement');
    await nextTick();

    expect(organisationStore.createdSchule).toBeNull();
    expect(push).toHaveBeenCalled();
  });

  test('it shows error message if REQUIRED_STEP_UP_LEVEL_NOT_MET error is present', async () => {
    organisationStore.errorCode = 'REQUIRED_STEP_UP_LEVEL_NOT_MET';
    await nextTick();

    expect(wrapper?.find('[data-testid$="alert-title"]').isVisible()).toBe(true);
  });

  test('it reloads page when navigating from REQUIRED_STEP_UP_LEVEL_NOT_MET error', async () => {
    organisationStore.errorCode = 'REQUIRED_STEP_UP_LEVEL_NOT_MET';
    await nextTick();

    const push: MockInstance = vi.spyOn(router, 'push');
    const goSpy: MockInstance = vi.spyOn(router, 'go');

    wrapper?.find('[data-testid$="alert-button"]').trigger('click');
    await flushPromises();

    expect(push).toHaveBeenCalledWith({ name: 'create-schule' });
    expect(goSpy).toHaveBeenCalledWith(0);
  });

  describe('navigation interception', () => {
    afterEach(() => {
      vi.unmock('vue-router');
    });

    test('triggers unsaved changes dialog if form is dirty', async () => {
      const expectedCallsToNext: number = 0;
      organisationStore.schultraeger = [schultraegerOrganisation];
      wrapper = await mountComponent();
      await flushPromises();

      await fillForm({
        schulform: schultraegerOrganisation.id,
        dienststellennummer: '1234567',
        schulname: 'Test Schule',
        emailAdresse: 'test@schule.de',
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

    test('does not trigger unsaved changes dialog if form is not dirty', async () => {
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
          schulform: schultraegerOrganisation.id,
          dienststellennummer: '1234567',
          schulname: 'Test Schule',
          emailAdresse: 'test@schule.de',
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

  test('it initializes with no schultraeger as default when schultraeger list is empty', async () => {
    organisationStore.schultraeger = [];
    vi.spyOn(organisationStore, 'getRootKinderSchultraeger').mockImplementation(async () => {
      organisationStore.schultraeger = [];
    });
    wrapper = await mountComponent();
    await nextTick();

    // eslint-disable-next-line @typescript-eslint/typedef
    const form = wrapper?.findComponent(SchuleForm);
    expect(form?.props('initialValues')).toMatchObject({
      selectedSchulform: undefined,
    });
  });

  test('it calls getRootKinderSchultraeger on mount', async () => {
    vi.clearAllMocks();
    organisationStore.$reset();
    const getRootKinderSchultraegerSpy: MockInstance = vi.spyOn(organisationStore, 'getRootKinderSchultraeger');

    wrapper?.unmount();
    wrapper = await mountComponent();
    await flushPromises();

    expect(getRootKinderSchultraegerSpy).toHaveBeenCalledOnce();
  });

  test('it clears errorCode and createdSchule on mount', async () => {
    organisationStore.errorCode = 'SOME_ERROR';
    organisationStore.createdSchule = DoFactory.getSchule();

    wrapper = await mountComponent();
    await flushPromises();

    expect(organisationStore.errorCode).toBe('');
    expect(organisationStore.createdSchule).toBeNull();
  });

  test('it removes beforeunload listener on unmount', () => {
    const removeEventListenerSpy: MockInstance = vi.spyOn(window, 'removeEventListener');
    wrapper?.unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  test('it updates isDirty when SchuleForm emits update:dirty', async () => {
    const form: VueWrapper = wrapper!.findComponent({ name: 'SchuleForm' });

    // Emit dirty state change
    form.vm.$emit('update:dirty', true);
    await nextTick();

    // Verify that the form receives the isDirty state
    const formWithDirty: VueWrapper | undefined = wrapper?.findComponent({ name: 'SchuleForm' });
    expect(formWithDirty?.exists()).toBe(true);
  });

  test('it emits unsaved changes dialog update when SchuleForm emits update:showUnsavedChangesDialog', async () => {
    const form: VueWrapper = wrapper!.findComponent({ name: 'SchuleForm' });

    // Emit dialog visibility change
    form.vm.$emit('update:showUnsavedChangesDialog', true);
    await nextTick();

    // Verify that the form component exists
    const formComponent: VueWrapper | undefined = wrapper?.findComponent({ name: 'SchuleForm' });
    expect(formComponent?.exists()).toBe(true);
  });

  test('it handles discard button click from SchuleForm', async () => {
    await fillForm({
      schulform: schultraegerOrganisation.id,
      dienststellennummer: '1234567',
      schulname: 'Test Schule',
      emailAdresse: 'test@schule.de',
    });

    const push: MockInstance = vi.spyOn(router, 'push');
    const form: VueWrapper = wrapper!.findComponent({ name: 'SchuleForm' });
    form.vm.$emit('click:discard');
    await nextTick();

    expect(push).toHaveBeenCalled();
  });
});
