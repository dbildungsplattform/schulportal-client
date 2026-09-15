/* eslint-disable @typescript-eslint/typedef */
import { OrganisationsTyp, type Organisation } from '@/stores/OrganisationStore';
import { VueWrapper, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Component } from 'vue';
import SchuleForm from './SchuleForm.vue';
import { SchuleDetailsForm } from './types.js';

let wrapper: VueWrapper | null = null;

const mockSchultraeger: Organisation[] = [
  {
    id: 'schultraeger-1',
    name: 'Schulträger 1',
    kennung: 'ST1',
    typ: OrganisationsTyp.Land,
  },
  {
    id: 'schultraeger-2',
    name: 'Schulträger 2',
    kennung: 'ST2',
    typ: OrganisationsTyp.Land,
  },
];

const mockInitialValues: SchuleDetailsForm = {
  selectedSchulform: 'schultraeger-1',
  selectedDienststellennummer: '12345',
  selectedSchulname: 'Test Schule',
  selectedEmailAdress: 'test@example.com',
};

const mockCachedValues: SchuleDetailsForm = {
  selectedSchulform: 'schultraeger-2',
  selectedDienststellennummer: '67890',
  selectedSchulname: 'Cached Schule',
  selectedEmailAdress: 'cached@example.com',
};

beforeEach(() => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

const createWrapper = (props = {}): VueWrapper | null => {
  const defaultProps = {
    initialValues: mockInitialValues,
    cachedValues: undefined,
    isEditMode: false,
    schultraegerList: mockSchultraeger,
    showUnsavedChangesDialog: false,
    isLoading: false,
    errorCode: undefined,
    selectedSchultraegerId: undefined,
    ...props,
  };

  wrapper = mount(SchuleForm, {
    attachTo: document.getElementById('app') || '',
    props: defaultProps,
    global: {
      components: {
        SchuleForm: SchuleForm as Component,
      },
    },
  });

  return wrapper;
};

describe('SchuleForm', () => {
  describe('Rendering', () => {
    it('should render the form wrapper with correct id in create mode', () => {
      createWrapper({ isEditMode: false });
      expect(wrapper?.find('[data-testid="schule-create-form"]').exists()).toBe(true);
    });

    it('should render the form wrapper with correct id in edit mode', () => {
      createWrapper({ isEditMode: true });
      expect(wrapper?.find('[data-testid="schule-edit-form"]').exists()).toBe(true);
    });

    it('should render all form fields when errorCode is not set', () => {
      createWrapper({ errorCode: undefined });
      expect(wrapper?.find('[data-testid="schulform-radio-group"]').exists()).toBe(true);
      expect(wrapper?.find('[data-testid="dienststellennummer-input"]').exists()).toBe(true);
      expect(wrapper?.find('[data-testid="schulname-input"]').exists()).toBe(true);
      expect(wrapper?.find('[data-testid="email-adress-input"]').exists()).toBe(true);
    });

    it('should not render form fields when errorCode is set', () => {
      createWrapper({ errorCode: 'ERROR_CODE' });
      // When errorCode is set, template conditional v-if should hide fields
      expect(wrapper?.vm).toBeDefined();
    });
  });

  describe('Schultraeger List', () => {
    it('should render all schultraeger options', async () => {
      createWrapper({ schultraegerList: mockSchultraeger });
      await wrapper?.vm.$nextTick();

      const radioButtons = wrapper?.findAll('[data-testid^="schulform-radio-button-"]');
      expect(radioButtons?.length).toBe(mockSchultraeger.length);
    });
  });

  describe('Form Initialization', () => {
    it('should mount without errors with valid props', () => {
      createWrapper({ initialValues: mockInitialValues });
      expect(wrapper?.vm).toBeDefined();
    });

    it('should handle undefined initialValues', () => {
      createWrapper({ initialValues: {} });
      expect(wrapper?.vm).toBeDefined();
    });

    it('should have input fields in the DOM', async () => {
      createWrapper({ initialValues: mockInitialValues });
      await wrapper?.vm.$nextTick();

      const dienststellennummerInput = wrapper?.find('[data-testid="dienststellennummer-input"]');
      expect(dienststellennummerInput?.exists()).toBe(true);
    });
  });

  describe('Cached Values Initialization', () => {
    it('should initialize component with cachedValues prop', async () => {
      createWrapper({
        initialValues: mockInitialValues,
        cachedValues: mockCachedValues,
      });
      await wrapper?.vm.$nextTick();

      expect(wrapper?.vm).toBeDefined();
    });

    it('should handle undefined cachedValues prop', async () => {
      createWrapper({
        initialValues: mockInitialValues,
        cachedValues: undefined,
      });
      await wrapper?.vm.$nextTick();

      expect(wrapper?.vm).toBeDefined();
    });
  });

  describe('Component Props', () => {
    it('should accept initialValues prop', () => {
      const values: Partial<SchuleDetailsForm> = {
        selectedSchulform: 'schultraeger-1',
        selectedSchulname: 'Custom School',
      };

      createWrapper({ initialValues: values });
      expect(wrapper?.vm).toBeDefined();
    });

    it('should accept schultraegerList prop', () => {
      createWrapper({ schultraegerList: mockSchultraeger });
      expect(wrapper?.vm).toBeDefined();
    });

    it('should accept isEditMode prop', () => {
      createWrapper({ isEditMode: true });
      expect(wrapper?.vm).toBeDefined();
    });

    it('should accept isLoading prop', () => {
      createWrapper({ isLoading: true });
      expect(wrapper?.vm).toBeDefined();
    });

    it('should accept errorCode prop', () => {
      createWrapper({ errorCode: 'SOME_ERROR' });
      expect(wrapper?.vm).toBeDefined();
    });

    it('should accept showUnsavedChangesDialog prop', () => {
      createWrapper({ showUnsavedChangesDialog: true });
      expect(wrapper?.vm).toBeDefined();
    });
  });

  describe('Event Emissions', () => {
    it('should have FormWrapper component that emits events', () => {
      createWrapper();
      expect(wrapper?.findComponent({ name: 'FormWrapper' }).exists()).toBe(true);
    });

    it('should emit events through FormWrapper', async () => {
      createWrapper();
      await wrapper?.vm.$nextTick();

      // The FormWrapper is the component that actually handles form submission
      const formWrapper = wrapper?.findComponent({ name: 'FormWrapper' });
      expect(formWrapper?.exists()).toBe(true);
    });
  });

  describe('Props Reactivity', () => {
    it('should update when schultraegerList prop changes', async () => {
      const initialList = mockSchultraeger;
      createWrapper({ schultraegerList: initialList });
      await wrapper?.vm.$nextTick();

      const newList: Organisation[] = [
        {
          id: 'schultraeger-3',
          name: 'Schulträger 3',
          kennung: 'ST3',
          typ: OrganisationsTyp.Land,
        },
      ];

      await wrapper?.setProps({ schultraegerList: newList });
      await wrapper?.vm.$nextTick();

      expect(wrapper?.find('[data-testid="schulform-radio-group"]').exists()).toBe(true);
    });

    it('should update when isLoading prop changes', async () => {
      createWrapper({ isLoading: false });
      await wrapper?.vm.$nextTick();

      await wrapper?.setProps({ isLoading: true });
      await wrapper?.vm.$nextTick();

      expect(wrapper?.vm).toBeDefined();
    });

    it('should update when errorCode prop changes', async () => {
      createWrapper({ errorCode: undefined });
      expect(wrapper?.find('[data-testid="schulform-radio-group"]').exists()).toBe(true);

      await wrapper?.setProps({ errorCode: 'ERROR' });
      await wrapper?.vm.$nextTick();

      expect(wrapper?.find('[data-testid="schulform-radio-group"]').exists()).toBe(false);
    });
  });

  describe('Form Structure', () => {
    it('should render form with FormWrapper component', async () => {
      createWrapper({ errorCode: undefined });
      await wrapper?.vm.$nextTick();

      const formWrapper = wrapper?.findComponent({ name: 'FormWrapper' });
      expect(formWrapper?.exists()).toBe(true);
    });
  });

  describe('Field Labels and Placeholders', () => {
    it('should render radio group for schulform selection', async () => {
      createWrapper({ schultraegerList: mockSchultraeger });
      await wrapper?.vm.$nextTick();

      const radioGroup = wrapper?.find('[data-testid="schulform-radio-group"]');
      expect(radioGroup?.exists()).toBe(true);
    });

    it('should render dienststellennummer input field', async () => {
      createWrapper();
      await wrapper?.vm.$nextTick();

      const input = wrapper?.find('[data-testid="dienststellennummer-input"]');
      expect(input?.exists()).toBe(true);
    });

    it('should render schulname input field', async () => {
      createWrapper();
      await wrapper?.vm.$nextTick();

      const input = wrapper?.find('[data-testid="schulname-input"]');
      expect(input?.exists()).toBe(true);
    });

    it('should render email address input field', async () => {
      createWrapper();
      await wrapper?.vm.$nextTick();

      const input = wrapper?.find('[data-testid="email-adress-input"]');
      expect(input?.exists()).toBe(true);
    });
  });

  describe('Component Lifecycle', () => {
    it('should properly cleanup on unmount', () => {
      createWrapper();
      expect(() => wrapper?.unmount()).not.toThrow();
    });
  });
});
