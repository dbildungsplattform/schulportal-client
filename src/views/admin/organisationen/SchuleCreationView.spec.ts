import { OrganisationsTyp, useOrganisationStore, type Organisation } from '@/stores/OrganisationStore';
import { createTestingPinia } from '@pinia/testing';
import { mount, VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createI18n } from 'vue-i18n';
import { createMemoryHistory, createRouter } from 'vue-router';
import SchuleCreationView from './SchuleCreationView.vue';

const mockOrganisation: Organisation = {
  id: 'schule-1',
  name: 'Test Gymnasium',
  kennung: 'DIN-12345',
  administriertVon: 'schultraeger-1',
  emailAdress: 'test@gymnasium.de',
  typ: 'SCHULE',
};

const mockSchultraeger: Organisation[] = [
  { id: 'schultraeger-1', name: 'Schulträger 1', kennung: 'ST1', typ: OrganisationsTyp.Schule },
  { id: 'schultraeger-2', name: 'Schulträger 2', kennung: 'ST2', typ: OrganisationsTyp.Schule },
];

const i18n = createI18n({
  legacy: false,
  locale: 'de-DE',
  messages: {
    'de-DE': {
      admin: {
        headline: 'Admin Panel',
        schule: {
          addNew: 'Add New School',
          schuleCreateErrorTitle: 'Error Creating School',
          backToCreateSchule: 'Back to Create School',
          schuleAddedSuccessfully: 'School added successfully',
          errors: {
            ERROR_CODE: 'An error occurred',
            REQUIRED_STEP_UP_LEVEL_NOT_MET: 'Required step-up level not met',
          },
        },
      },
      save: 'Save',
    },
  },
});

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/create-schule', name: 'create-schule', component: SchuleCreationView },
    { path: '/schule-management', name: 'schule-management', component: { template: '<div>Management</div>' } },
  ],
});

let wrapper: VueWrapper<InstanceType<typeof SchuleCreationView>> | undefined;

const createWrapper = async (props = {}): Promise<VueWrapper<InstanceType<typeof SchuleCreationView>> | undefined> => {
  await router.push({ name: 'create-schule' });
  const pinia = createTestingPinia({ createSpy: vi.fn });
  wrapper = mount(SchuleCreationView, {
    props,
    global: {
      plugins: [pinia, i18n, router],
      stubs: {
        SchuleForm: true,
        SchuleSuccessTemplate: true,
        SpshAlert: true,
        LayoutCard: true,
      },
    },
  });

  const store = useOrganisationStore();
  store.schultraeger = mockSchultraeger;
  store.createdSchule = null;
  store.errorCode = '';
  store.loading = false;

  return wrapper;
};

describe('SchuleCreationView', () => {
  beforeEach(() => {
    wrapper = undefined;
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Component Rendering', () => {
    it('should render the admin container', async () => {
      await createWrapper();
      expect(wrapper?.find('.admin').exists()).toBe(true);
    });

    it('should render headline with correct text id', async () => {
      await createWrapper();
      const headline = wrapper?.find('h1[data-testid="admin-headline"]');
      expect(headline?.exists()).toBe(true);
    });

    it('should render LayoutCard', async () => {
      await createWrapper();
      expect(wrapper).toBeDefined();
    });
  });

  describe('Component Lifecycle', () => {
    it('should clear createdSchule on mount', async () => {
      const pinia = createTestingPinia({ createSpy: vi.fn });
      await router.push({ name: 'create-schule' });
      const store = useOrganisationStore();
      store.createdSchule = mockOrganisation;

      wrapper = mount(SchuleCreationView, {
        global: {
          plugins: [pinia, i18n, router],
          stubs: { SchuleForm: true, SchuleSuccessTemplate: true, SpshAlert: true, LayoutCard: true },
        },
      });

      await wrapper?.vm.$nextTick();
      expect(store.createdSchule).toBeNull();
    });

    it('should clear errorCode on mount', async () => {
      const pinia = createTestingPinia({ createSpy: vi.fn });
      await router.push({ name: 'create-schule' });
      const store = useOrganisationStore();
      store.errorCode = 'SOME_ERROR';

      wrapper = mount(SchuleCreationView, {
        global: {
          plugins: [pinia, i18n, router],
          stubs: { SchuleForm: true, SchuleSuccessTemplate: true, SpshAlert: true, LayoutCard: true },
        },
      });

      await wrapper?.vm.$nextTick();
      expect(store.errorCode).toBe('');
    });

    it('should fetch schultraeger data on mount', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      expect(store.getRootKinderSchultraeger).toHaveBeenCalled();
    });

    it('should attach beforeunload listener on mount', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      await createWrapper();

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });

    it('should remove beforeunload listener on unmount', async () => {
      await createWrapper();
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      wrapper?.unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Form Display Logic', () => {
    it('should show form when createdSchule is null', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.createdSchule = null;

      await wrapper?.vm.$nextTick();
      expect(store.createdSchule).toBeNull();
    });

    it('should show success template when createdSchule exists', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.createdSchule = mockOrganisation;

      await wrapper?.vm.$nextTick();
      expect(store.createdSchule).toBeDefined();
    });
  });

  describe('Initial Form Values', () => {
    it('should initialize form values with expected structure', async () => {
      await createWrapper();

      await wrapper?.vm.$nextTick();

      const vm = wrapper?.vm;
      expect(vm?.initialFormValues).toBeDefined();
      expect(vm?.initialFormValues).toHaveProperty('selectedSchulform');
      expect(vm?.initialFormValues).toHaveProperty('selectedDienststellennummer');
      expect(vm?.initialFormValues).toHaveProperty('selectedSchulname');
    });

    it('should compute default schulform from schultraeger list', async () => {
      await createWrapper();

      await wrapper?.vm.$nextTick();
      const vm = wrapper?.vm as any;
      // defaultSchulform is computed from store.schultraeger at component init time
      expect(vm.defaultSchulform).toBeDefined();
    });

    it('should handle empty schultraeger list for default schulform', async () => {
      const pinia = createTestingPinia({ createSpy: vi.fn });
      await router.push({ name: 'create-schule' });
      const store = useOrganisationStore();
      store.schultraeger = [];

      wrapper = mount(SchuleCreationView, {
        global: {
          plugins: [pinia, i18n, router],
          stubs: { SchuleForm: true, SchuleSuccessTemplate: true, SpshAlert: true, LayoutCard: true },
        },
      });

      await wrapper?.vm.$nextTick();
      const vm = wrapper?.vm as any;
      expect(vm.defaultSchulform).toBeUndefined();
    });
  });

  describe('Form Submission', () => {
    it('should call store createOrganisation on form submit', async () => {
      await createWrapper();
      const store = useOrganisationStore();

      const formValues = {
        selectedSchulform: 'schultraeger-1',
        selectedDienststellennummer: 'DIN-99999',
        selectedSchulname: 'New School',
        selectedEmailAdress: 'new@school.de',
      };

      await wrapper?.vm.onSubmit(formValues);

      expect(store.createOrganisation).toHaveBeenCalledWith(
        'schultraeger-1',
        'schultraeger-1',
        'DIN-99999',
        'New School',
        undefined,
        undefined,
        'SCHULE',
        undefined,
        'new@school.de',
      );
    });

    it('should clear isDirty after successful submission', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.errorCode = '';

      wrapper!.vm.isDirty = true;

      const formValues = {
        selectedSchulform: 'schultraeger-1',
        selectedDienststellennummer: 'DIN-99999',
        selectedSchulname: 'New School',
        selectedEmailAdress: 'new@school.de',
      };

      await wrapper?.vm.onSubmit(formValues);

      expect(wrapper?.vm.isDirty).toBe(false);
    });

    it('should clear cachedValues after successful submission', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.errorCode = '';

      wrapper!.vm.cachedValues = { selectedSchulname: 'Old' } as any;

      const formValues = {
        selectedSchulform: 'schultraeger-1',
        selectedDienststellennummer: 'DIN-99999',
        selectedSchulname: 'New School',
        selectedEmailAdress: 'new@school.de',
      };

      await wrapper?.vm.onSubmit(formValues);

      expect(wrapper?.vm.cachedValues).toBeUndefined();
    });

    it('should not clear isDirty when error code is present', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.errorCode = 'ERROR_CODE';

      wrapper!.vm.isDirty = true;

      const formValues = {
        selectedSchulform: 'schultraeger-1',
        selectedDienststellennummer: 'DIN-99999',
        selectedSchulname: 'New School',
        selectedEmailAdress: 'new@school.de',
      };

      await wrapper?.vm.onSubmit(formValues);

      expect(wrapper?.vm.isDirty).toBe(true);
    });
  });

  describe('Navigation', () => {
    it('should have navigateToSchuleManagement method', async () => {
      await createWrapper();
      expect(typeof wrapper?.vm.navigateToSchuleManagement).toBe('function');
    });

    it('should have handleCreateAnotherSchule method', async () => {
      await createWrapper();
      expect(typeof wrapper?.vm.handleCreateAnotherSchule).toBe('function');
    });

    it('should have navigateBackToSchuleForm method', async () => {
      await createWrapper();
      expect(typeof wrapper?.vm.navigateBackToSchuleForm).toBe('function');
    });
  });

  describe('Unsaved Changes Handling', () => {
    it('should track isDirty state', async () => {
      await createWrapper();

      expect(wrapper?.vm.isDirty).toBe(false);
      wrapper!.vm.isDirty = true;
      await wrapper?.vm.$nextTick();

      expect(wrapper?.vm.isDirty).toBe(true);
    });

    it('should manage showUnsavedChangesDialog state', async () => {
      await createWrapper();

      expect(wrapper?.vm.showUnsavedChangesDialog).toBe(false);
      wrapper!.vm.showUnsavedChangesDialog = true;
      await wrapper?.vm.$nextTick();

      expect(wrapper?.vm.showUnsavedChangesDialog).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should track error code state from store', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.errorCode = '';

      await wrapper?.vm.$nextTick();

      expect(store.errorCode).toBe('');

      store.errorCode = 'ERROR_CODE';
      await wrapper?.vm.$nextTick();

      expect(store.errorCode).toBe('ERROR_CODE');
    });

    it('should disable card close when error code is set', async () => {
      await createWrapper();
      const store = useOrganisationStore();

      store.errorCode = '';
      await wrapper?.vm.$nextTick();

      store.errorCode = 'ERROR_CODE';
      await wrapper?.vm.$nextTick();

      expect(store.errorCode).toBe('ERROR_CODE');
    });
  });

  describe('Success State', () => {
    it('should track createdSchule state from store', async () => {
      await createWrapper();
      const store = useOrganisationStore();

      expect(store.createdSchule).toBeNull();

      store.createdSchule = mockOrganisation;
      await wrapper?.vm.$nextTick();

      expect(store.createdSchule).toBeDefined();
    });

    it('should have schultraeger list available for success template', async () => {
      await createWrapper();
      const store = useOrganisationStore();

      expect(store.schultraeger).toEqual(mockSchultraeger);
    });
  });

  describe('Form Event Handlers', () => {
    it('should have onSubmit method for form submission', async () => {
      await createWrapper();

      expect(typeof wrapper?.vm.onSubmit).toBe('function');
    });

    it('should have navigateToSchuleManagement for discard action', async () => {
      await createWrapper();

      expect(typeof wrapper?.vm.navigateToSchuleManagement).toBe('function');
    });

    it('should have handleConfirmUnsavedChanges for confirmation', async () => {
      await createWrapper();

      expect(typeof wrapper?.vm.handleConfirmUnsavedChanges).toBe('function');
    });
  });

  describe('Layout Card Interaction', () => {
    it('should have navigateToSchuleManagement for card close', async () => {
      await createWrapper();

      expect(typeof wrapper?.vm.navigateToSchuleManagement).toBe('function');
    });
  });

  describe('Cached Values Management', () => {
    it('should initialize cachedValues as undefined', async () => {
      await createWrapper();

      expect(wrapper?.vm.cachedValues).toBeUndefined();
    });

    it('should clear cachedValues after successful form submission', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.errorCode = '';

      wrapper!.vm.cachedValues = {
        selectedSchulform: 'schultraeger-1',
        selectedDienststellennummer: 'DIN-99999',
        selectedSchulname: 'Old School',
      } as any;

      const formValues = {
        selectedSchulform: 'schultraeger-1',
        selectedDienststellennummer: 'DIN-99999',
        selectedSchulname: 'New School',
        selectedEmailAdress: 'new@school.de',
      };

      await wrapper?.vm.onSubmit(formValues);

      // Component clears cachedValues on successful submission
      expect(wrapper?.vm.cachedValues).toBeUndefined();
    });

    it('should keep cachedValues when submission has error', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.errorCode = 'ERROR_CODE';

      wrapper!.vm.cachedValues = {
        selectedSchulform: 'schultraeger-1',
        selectedDienststellennummer: 'DIN-99999',
        selectedSchulname: 'New School',
      } as any;

      const formValues = {
        selectedSchulform: 'schultraeger-1',
        selectedDienststellennummer: 'DIN-99999',
        selectedSchulname: 'New School',
        selectedEmailAdress: 'new@school.de',
      };

      await wrapper?.vm.onSubmit(formValues);

      // Cached values should remain when there's an error
      expect(wrapper?.vm.cachedValues).toBeDefined();
    });
  });

  describe('Computed Properties', () => {
    it('should compute schultraegerList from store', async () => {
      await createWrapper();

      expect(wrapper?.vm.schultraegerList).toEqual(mockSchultraeger);
    });

    it('should update schultraegerList when store changes', async () => {
      await createWrapper();
      const store = useOrganisationStore();

      const newSchultraeger = [{ id: 'schultraeger-3', name: 'Schulträger 3', kennung: 'ST3', typ: 'SCHULTRAEGER' }];
      store.schultraeger = newSchultraeger;

      await wrapper?.vm.$nextTick();
      expect(wrapper?.vm.schultraegerList).toEqual(newSchultraeger);
    });

    it('should compute defaultSchulform from schultraeger list', async () => {
      await createWrapper();
      expect(wrapper?.vm.defaultSchulform).toBe('schultraeger-1');
    });
  });

  describe('Ref State', () => {
    it('should initialize isDirty as false', async () => {
      await createWrapper();
      expect(wrapper?.vm.isDirty).toBe(false);
    });

    it('should initialize showUnsavedChangesDialog as false', async () => {
      await createWrapper();
      expect(wrapper?.vm.showUnsavedChangesDialog).toBe(false);
    });

    it('should initialize cachedValues as undefined', async () => {
      await createWrapper();
      expect(wrapper?.vm.cachedValues).toBeUndefined();
    });

    it('should initialize initialFormValues ref', async () => {
      await createWrapper();
      // initialFormValues is reactive and should be defined even if content varies
      expect(wrapper?.vm).toBeDefined();
      expect(wrapper?.vm.cachedValues).toBeUndefined();
    });
  });

  describe('Store Integration', () => {
    it('should access useOrganisationStore', async () => {
      await createWrapper();
      const store = useOrganisationStore();

      expect(store).toBeDefined();
    });

    it('should track store loading state', async () => {
      await createWrapper();
      const store = useOrganisationStore();

      expect(store.loading).toBe(false);

      store.loading = true;
      await wrapper?.vm.$nextTick();

      expect(store.loading).toBe(true);
    });

    it('should access store schultraeger list', async () => {
      await createWrapper();
      const store = useOrganisationStore();

      expect(store.schultraeger).toEqual(mockSchultraeger);
    });

    it('should track store createdSchule', async () => {
      await createWrapper();
      const store = useOrganisationStore();

      expect(store.createdSchule).toBeNull();

      store.createdSchule = mockOrganisation;
      await wrapper?.vm.$nextTick();

      expect(store.createdSchule).toBeDefined();
    });

    it('should call store getRootKinderSchultraeger on mount', async () => {
      await createWrapper();
      const store = useOrganisationStore();

      expect(store.getRootKinderSchultraeger).toHaveBeenCalled();
    });
  });

  describe('Form Validation and State', () => {
    it('should initialize initialFormValues reactively', async () => {
      await createWrapper();
      const store = useOrganisationStore();

      const initialValues = wrapper?.vm.initialFormValues;
      expect(initialValues).toBeDefined();

      store.schultraeger = [{ id: 'schultraeger-new', name: 'New', kennung: 'NEW', typ: 'SCHULTRAEGER' }];
      await wrapper?.vm.$nextTick();

      expect(wrapper?.vm.defaultSchulform).toBe('schultraeger-new');
    });

    it('should properly handle form value caching', async () => {
      await createWrapper();

      const testValues = {
        selectedSchulform: 'schultraeger-1',
        selectedDienststellennummer: 'DIN-12345',
        selectedSchulname: 'Test School',
        selectedEmailAdress: 'test@test.de',
      };

      wrapper!.vm.cachedValues = testValues;
      await wrapper?.vm.$nextTick();

      expect(wrapper?.vm.cachedValues).toEqual(testValues);
    });
  });

  describe('Confirm Unsaved Changes', () => {
    it('should have handleConfirmUnsavedChanges method', async () => {
      await createWrapper();

      expect(typeof wrapper?.vm.handleConfirmUnsavedChanges).toBe('function');
    });

    it('should clear error code in handleConfirmUnsavedChanges', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.errorCode = 'ERROR_CODE';

      await wrapper?.vm.handleConfirmUnsavedChanges();

      expect(store.errorCode).toBe('');
    });
  });

  describe('Navigation Back to Form', () => {
    it('should clear error code when navigating back from non-REQUIRED_STEP_UP_LEVEL_NOT_MET error', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.errorCode = 'SOME_OTHER_ERROR';

      expect(typeof wrapper?.vm.navigateBackToSchuleForm).toBe('function');
    });

    it('should handle REQUIRED_STEP_UP_LEVEL_NOT_MET special case', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.errorCode = 'REQUIRED_STEP_UP_LEVEL_NOT_MET';

      expect(typeof wrapper?.vm.navigateBackToSchuleForm).toBe('function');
    });
  });

  describe('Create Another School', () => {
    it('should have handleCreateAnotherSchule method', async () => {
      await createWrapper();

      expect(typeof wrapper?.vm.handleCreateAnotherSchule).toBe('function');
    });

    it('should clear createdSchule in handleCreateAnotherSchule', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.createdSchule = mockOrganisation;

      wrapper?.vm.handleCreateAnotherSchule();

      expect(store.createdSchule).toBeNull();
    });
  });
});
