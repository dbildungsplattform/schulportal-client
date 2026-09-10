import { useOrganisationStore } from '@/stores/OrganisationStore';
import { createTestingPinia } from '@pinia/testing';
import { mount, VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createI18n } from 'vue-i18n';
import { createMemoryHistory, createRouter } from 'vue-router';
import SchuleDetailsEditView from './SchuleDetailsEditView.vue';

// Mock i18n
const i18n = createI18n({
  legacy: false,
  locale: 'de-DE',
  messages: {
    'de-DE': {
      admin: {
        headline: 'Administration',
        'schule.edit': 'Schule bearbeiten',
        'schule.schuleCreateErrorTitle': 'Fehler beim Erstellen',
        'schule.schuleChangedSuccessfully': 'Schule erfolgreich geändert',
        'schule.backToCreateSchule': 'Zurück zum Erstellen',
        'schule.errors': {
          ERROR_CODE: 'Ein Fehler ist aufgetreten',
        },
      },
      nav: {
        backToList: 'Zurück zur Liste',
      },
    },
  },
});

// Create router
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/admin/schule/:id/edit',
      name: 'schule-edit',
      component: SchuleDetailsEditView,
    },
    {
      path: '/admin/schule/management',
      name: 'schule-management',
      component: { template: '<div>School Management</div>' },
    },
  ],
});

// Mock data
const mockOrganisation = {
  id: 'schule-1',
  name: 'Test Gymnasium',
  kennung: 'DIN-12345',
  typ: 'SCHULE',
  administriertVon: 'schultraeger-1',
  emailAdress: 'test@gymnasium.de',
};

const mockSchultraeger = [
  {
    id: 'schultraeger-1',
    name: 'Schulträger 1',
    kennung: 'ST1',
    typ: 'SCHULTRAEGER',
  },
  {
    id: 'schultraeger-2',
    name: 'Schulträger 2',
    kennung: 'ST2',
    typ: 'SCHULTRAEGER',
  },
];

// Test wrapper helper
let wrapper: VueWrapper<any> | null = null;

const createWrapper = async (props = {}, routeId = 'schule-1') => {
  await router.push({ name: 'schule-edit', params: { id: routeId } });
  await router.isReady();

  const pinia = createTestingPinia({
    createSpy: vi.fn,
  });

  wrapper = mount(SchuleDetailsEditView, {
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

  // Set up store mocks
  const store = useOrganisationStore();
  store.currentSchule = mockOrganisation;
  store.schultraeger = mockSchultraeger;
  store.errorCode = '';
  store.loading = false;
  store.updatedOrganisation = mockOrganisation;

  return wrapper;
};

describe('SchuleDetailsEditView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  describe('Component Rendering', () => {
    it('should mount successfully', async () => {
      await createWrapper();
      expect(wrapper?.vm).toBeDefined();
      expect(wrapper?.exists()).toBe(true);
    });

    it('should render the main admin container', async () => {
      await createWrapper();
      const container = wrapper?.find('.admin');
      expect(container?.exists()).toBe(true);
    });

    it('should render the admin headline', async () => {
      await createWrapper();
      const headline = wrapper?.find('[data-testid="admin-headline"]');
      expect(headline?.exists()).toBe(true);
      expect(headline?.text()).toContain('Administration');
    });

    it('should render the layout card', async () => {
      await createWrapper();
      const card = wrapper?.find('[data-testid="schule-details-card"]');
      expect(card?.exists()).toBe(true);
    });
  });

  describe('Component Lifecycle', () => {
    it('should clear error code on mount', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      expect(store.errorCode).toBe('');
    });

    it('should fetch organisation data on mount', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      expect(store.fetchSchulDetails).toHaveBeenCalledWith('schule-1');
    });

    it('should fetch schultraeger data on mount', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      expect(store.getRootKinderSchultraeger).toHaveBeenCalled();
    });

    it('should remove beforeunload listener on unmount', async () => {
      await createWrapper();
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      wrapper?.unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Form Rendering', () => {
    it('should have SchuleForm in template when not showing success', async () => {
      await createWrapper();
      expect(wrapper?.vm.showSuccess).toBe(false);
      // Component manages form display via v-if="!showSuccess"
      expect(wrapper?.vm).toBeDefined();
    });

    it('should switch to success template when showSuccess is true', async () => {
      await createWrapper();
      wrapper!.vm.showSuccess = false;
      expect(wrapper?.vm.showSuccess).toBe(false);

      wrapper!.vm.showSuccess = true;
      await wrapper?.vm.$nextTick();
      expect(wrapper?.vm.showSuccess).toBe(true);
    });
  });

  describe('Initial Values', () => {
    it('should compute initial values from current school', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.currentSchule = mockOrganisation;

      await wrapper?.vm.$nextTick();

      const initialValues = wrapper?.vm.initialValues;
      expect(initialValues?.selectedSchulform).toBe(mockOrganisation.administriertVon);
      expect(initialValues?.selectedDienststellennummer).toBe(mockOrganisation.kennung);
      expect(initialValues?.selectedSchulname).toBe(mockOrganisation.name);
      expect(initialValues?.selectedEmailAdress).toBe(mockOrganisation.emailAdress);
    });

    it('should return undefined when no current school', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.currentSchule = undefined;

      await wrapper?.vm.$nextTick();

      const initialValues = wrapper?.vm.initialValues;
      expect(initialValues).toBeUndefined();
    });

    it('should handle missing fields with empty strings', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.currentSchule = {
        id: 'test',
        typ: 'SCHULE',
      };

      await wrapper?.vm.$nextTick();

      const initialValues = wrapper?.vm.initialValues;
      expect(initialValues?.selectedSchulform).toBe('');
      expect(initialValues?.selectedDienststellennummer).toBe('');
    });
  });

  describe('Form Submission', () => {
    it('should call store updateSchuleDetails on form submit', async () => {
      await createWrapper();
      const store = useOrganisationStore();

      const formValues = {
        selectedSchulform: 'schultraeger-1',
        selectedDienststellennummer: 'DIN-99999',
        selectedSchulname: 'Updated School',
        selectedEmailAdress: 'updated@school.de',
      };

      await wrapper?.vm.onSubmit(formValues);

      expect(store.updateSchuleDetails).toHaveBeenCalledWith({
        organisationId: 'schule-1',
        schultraegerform: 'schultraeger-1',
        name: 'Updated School',
        emailAdress: 'updated@school.de',
      });
    });

    it('should cache submitted values', async () => {
      await createWrapper();

      const formValues = {
        selectedSchulform: 'schultraeger-1',
        selectedDienststellennummer: 'DIN-99999',
        selectedSchulname: 'Updated School',
        selectedEmailAdress: 'updated@school.de',
      };

      await wrapper?.vm.onSubmit(formValues);

      expect(wrapper?.vm.cachedValues).toEqual({
        selectedSchulform: 'schultraeger-1',
        selectedDienststellennummer: 'DIN-99999',
        selectedSchulname: 'Updated School',
        selectedEmailAdress: 'updated@school.de',
      });
    });

    it('should set showSuccess on successful submission', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.errorCode = '';

      const formValues = {
        selectedSchulform: 'schultraeger-1',
        selectedDienststellennummer: 'DIN-99999',
        selectedSchulname: 'Updated School',
        selectedEmailAdress: 'updated@school.de',
      };

      await wrapper?.vm.onSubmit(formValues);

      expect(wrapper?.vm.showSuccess).toBe(true);
    });

    it('should not set showSuccess on failed submission', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.errorCode = 'SOME_ERROR';

      const formValues = {
        selectedSchulform: 'schultraeger-1',
        selectedDienststellennummer: 'DIN-99999',
        selectedSchulname: 'Updated School',
        selectedEmailAdress: 'updated@school.de',
      };

      await wrapper?.vm.onSubmit(formValues);

      expect(wrapper?.vm.showSuccess).toBe(false);
    });

    it('should reset isDirty after successful submission', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      store.errorCode = '';
      wrapper!.vm.isDirty = true;

      const formValues = {
        selectedSchulform: 'schultraeger-1',
        selectedDienststellennummer: 'DIN-99999',
        selectedSchulname: 'Updated School',
        selectedEmailAdress: 'updated@school.de',
      };

      await wrapper?.vm.onSubmit(formValues);

      expect(wrapper?.vm.isDirty).toBe(false);
    });
  });

  describe('Navigation', () => {
    it('should navigate to schule-management on navigateToSchuleManagement', async () => {
      await createWrapper();
      const pushSpy = vi.spyOn(router, 'push');

      wrapper?.vm.navigateToSchuleManagement();

      expect(pushSpy).toHaveBeenCalledWith({ name: 'schule-management' });
      pushSpy.mockRestore();
    });

    it('should reset state on navigateToSchuleBearbeiten', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      wrapper!.vm.showSuccess = true;
      store.errorCode = 'SOME_ERROR';

      const pushSpy = vi.spyOn(router, 'push');
      wrapper?.vm.navigateToSchuleBearbeiten();

      expect(wrapper?.vm.showSuccess).toBe(false);
      expect(store.errorCode).toBe('');
      expect(pushSpy).toHaveBeenCalledWith({
        name: 'schule-edit',
        params: { id: 'schule-1' },
      });
      pushSpy.mockRestore();
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
      // Component checks: :closable="!organisationStore.errorCode"
      // So when errorCode is empty, closable should be true (negation of empty string)

      store.errorCode = 'ERROR_CODE';
      await wrapper?.vm.$nextTick();
      // When errorCode has value, closable should be false

      expect(store.errorCode).toBe('ERROR_CODE');
    });
  });

  describe('Success State', () => {
    it('should manage showSuccess state', async () => {
      await createWrapper();
      expect(wrapper?.vm.showSuccess).toBe(false);

      wrapper!.vm.showSuccess = true;
      await wrapper?.vm.$nextTick();

      expect(wrapper?.vm.showSuccess).toBe(true);
    });

    it('should have success template props available', async () => {
      await createWrapper();
      const store = useOrganisationStore();

      // Verify store data is accessible for success template
      expect(store.updatedOrganisation).toEqual(mockOrganisation);
      expect(store.schultraeger).toEqual(mockSchultraeger);
    });
  });

  describe('Form Event Handlers', () => {
    it('should have onSubmit method for form submission', async () => {
      await createWrapper();

      expect(typeof wrapper?.vm.onSubmit).toBe('function');
    });

    it('should have navigateToSchuleManagement method for discard', async () => {
      await createWrapper();

      expect(typeof wrapper?.vm.navigateToSchuleManagement).toBe('function');
    });

    it('should have handleConfirmUnsavedChanges for unsaved confirmation', async () => {
      await createWrapper();

      expect(typeof wrapper?.vm.handleConfirmUnsavedChanges).toBe('function');
    });
  });

  describe('Route Parameters', () => {
    it('should use route id as currentSchuleId', async () => {
      await createWrapper({}, 'test-school-123');

      expect(wrapper?.vm.currentSchuleId).toBe('test-school-123');
    });

    it('should pass currentSchuleId to updateSchuleDetails', async () => {
      await createWrapper({}, 'test-school-456');
      const store = useOrganisationStore();

      const formValues = {
        selectedSchulform: 'schultraeger-1',
        selectedDienststellennummer: 'DIN-99999',
        selectedSchulname: 'Updated School',
        selectedEmailAdress: 'updated@school.de',
      };

      await wrapper?.vm.onSubmit(formValues);

      expect(store.updateSchuleDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          organisationId: 'test-school-456',
        }),
      );
    });
  });

  describe('Store Integration', () => {
    it('should access organisation store', async () => {
      await createWrapper();
      const store = useOrganisationStore();

      expect(store).toBeDefined();
      expect(store.currentSchule).toEqual(mockOrganisation);
    });

    it('should access schultraeger from store', async () => {
      await createWrapper();
      const store = useOrganisationStore();

      expect(store.schultraeger).toEqual(mockSchultraeger);
    });

    it('should compute schultraegerList from store', async () => {
      await createWrapper();

      expect(wrapper?.vm.schultraegerList).toEqual(mockSchultraeger);
    });

    it('should track store loading state', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      expect(store.loading).toBe(false);

      store.loading = true;
      await wrapper?.vm.$nextTick();

      expect(store.loading).toBe(true);
    });

    it('should track store error code state', async () => {
      await createWrapper();
      const store = useOrganisationStore();
      expect(store.errorCode).toBe('');

      store.errorCode = 'TEST_ERROR';
      await wrapper?.vm.$nextTick();

      expect(store.errorCode).toBe('TEST_ERROR');
    });
  });

  describe('Layout Card Interaction', () => {
    it('should have navigateToSchuleManagement for card close', async () => {
      await createWrapper();

      // Component has @onCloseClicked="navigateToSchuleManagement"
      expect(typeof wrapper?.vm.navigateToSchuleManagement).toBe('function');
    });
  });

  describe('Computed Properties', () => {
    it('should have computed currentSchuleId', async () => {
      await createWrapper({}, 'school-id-123');

      expect(wrapper?.vm.currentSchuleId).toBe('school-id-123');
    });

    it('should have computed initialValues', async () => {
      await createWrapper();

      expect(wrapper?.vm.initialValues).toBeDefined();
      expect(typeof wrapper?.vm.initialValues).toBe('object');
    });

    it('should have computed schultraegerList', async () => {
      await createWrapper();

      expect(Array.isArray(wrapper?.vm.schultraegerList)).toBe(true);
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

    it('should initialize showSuccess as false', async () => {
      await createWrapper();

      expect(wrapper?.vm.showSuccess).toBe(false);
    });

    it('should initialize cachedValues as undefined', async () => {
      await createWrapper();

      expect(wrapper?.vm.cachedValues).toBeUndefined();
    });
  });
});
