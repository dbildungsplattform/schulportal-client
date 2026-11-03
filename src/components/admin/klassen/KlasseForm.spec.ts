import {
  OrganisationsTyp,
  useOrganisationStore,
  type Organisation,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
import type { ValidationSchema as KlasseFormSchema } from '@/utils/validationKlasse';
import { VueWrapper, flushPromises, mount } from '@vue/test-utils';
import { expect, test, type Mock } from 'vitest';
import { nextTick, type Component } from 'vue';
import KlasseForm from './KlasseForm.vue';
import { DoFactory } from 'test/DoFactory';

const organisationStore: OrganisationStore = useOrganisationStore();
const parentId: string = 'klasse-form';
const schulenFilterTestId: string = `${parentId}-schule-select`;
const initialValues: KlasseFormSchema = {
  selectedSchule: 'Ina-Initial-Schule',
  selectedKlassenname: '1a',
};
const newValues: KlasseFormSchema = {
  selectedSchule: 'Gerda-Geändert-Schule',
  selectedKlassenname: '9z',
};
const mountComponent = (props?: object): VueWrapper<InstanceType<typeof KlasseForm>> => {
  organisationStore.currentOrganisation = DoFactory.getSchule({
    id: initialValues.selectedSchule,
    name: initialValues.selectedSchule,
    kennung: null,
  });
  return mount(KlasseForm, {
    attachTo: document.getElementById('app') || '',
    props: {
      editMode: false,
      isLoading: false,
      onHandleConfirmUnsavedChanges: () => '',
      onHandleDiscard: () => '',
      onShowDialogChange: (value: boolean | undefined) => value,
      onSubmit: () => Promise.resolve(),
      ...props,
    },
    global: {
      components: {
        KlasseForm: KlasseForm as Component,
      },
    },
  });
};

describe('KlasseForm', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    organisationStore.$reset();
    organisationStore.organisationenFilters.set(parentId, {
      total: 2,
      loading: false,
      filterResult: [initialValues, newValues].map(
        ({ selectedSchule }: KlasseFormSchema): Organisation => ({
          id: selectedSchule,
          name: selectedSchule,
          typ: OrganisationsTyp.Schule,
        }),
      ),
    });
  });

  describe.each([[true], [false]])('when editMode is %s', (editMode: boolean) => {
    const defaultProps: object = {
      editMode,
      errorCode: '',
      initialValues,
      initialSchule: DoFactory.getSchule({
        id: initialValues.selectedSchule,
        name: initialValues.selectedSchule,
        kennung: null,
      }),
    };

    test('it renders the Klasse form', () => {
      const wrapper: VueWrapper = mountComponent(defaultProps) as VueWrapper;
      expect(wrapper.find('[data-testid="klasse-form"]').isVisible()).toBe(true);
      expect(wrapper.find(`#${schulenFilterTestId}`).isVisible()).toBe(true);
      expect(wrapper.find('#klassenname-input').isVisible()).toBe(true);
    });

    test('it does not render when there is an error', () => {
      const wrapper: VueWrapper = mountComponent({
        ...defaultProps,
        errorCode: 'something',
      }) as VueWrapper;
      expect(wrapper.find('[data-testid="klasse-form"]').exists()).toBe(true);
      expect(wrapper.find(`[data-testid="${schulenFilterTestId}"]`).exists()).toBe(false);
      expect(wrapper.find('#klassenname-input').exists()).toBe(false);
    });

    test('it contains initial values without making the form dirty or resolving the ID', async () => {
      const wrapper: VueWrapper = mountComponent(defaultProps) as VueWrapper;
      await flushPromises();
      expect(wrapper.find('[data-testid="klasse-form"]').isVisible()).toBe(true);
      expect(wrapper.find(`[data-testid="${schulenFilterTestId}"]`).text()).toContain(initialValues.selectedSchule);
      expect(wrapper.find('#klassenname-input').attributes('value')).toBe(initialValues.selectedKlassenname);
      expect(wrapper.emitted('formStateChanged')?.at(-1)).toEqual([expect.objectContaining({ dirty: false })]);
      expect(organisationStore.getOrganisationById).not.toHaveBeenCalled();
      expect(organisationStore.loadOrganisationForSelection).not.toHaveBeenCalled();
    });

    test('it handles changing props', async () => {
      const wrapper: VueWrapper = mountComponent({
        ...defaultProps,
        isEditActive: false,
      }) as VueWrapper;
      expect(wrapper.find(`[data-testid="${schulenFilterTestId}"]`).text()).toContain(initialValues.selectedSchule);
      expect(wrapper.find('#klassenname-input').attributes('value')).toBe(initialValues.selectedKlassenname);

      await wrapper.setProps({
        initialValues: newValues,
        initialSchule: DoFactory.getSchule({
          id: newValues.selectedSchule,
          name: newValues.selectedSchule,
          kennung: null,
        }),
      });
      await flushPromises();
      expect(wrapper.find(`[data-testid="${schulenFilterTestId}"]`).text()).toContain(newValues.selectedSchule);
      expect(wrapper.find('#klassenname-input').attributes('value')).toBe(newValues.selectedKlassenname);
    });

    test.runIf(editMode)('it correctly toggles editActive', async () => {
      const onHandleDiscard: Mock = vi.fn();
      const wrapper: VueWrapper = mountComponent({
        ...defaultProps,
        isEditActive: false,
        onHandleDiscard,
      }) as VueWrapper;
      expect(wrapper.find('[data-testid="klasse-form-submit-button"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="klasse-form-discard-button"]').exists()).toBe(false);
      wrapper.setProps({ isEditActive: true });
      await nextTick();

      expect(wrapper.find('[data-testid="klasse-form-submit-button"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="klasse-form-discard-button"]').exists()).toBe(true);
      wrapper.find('[data-testid="klasse-form-discard-button"]').trigger('click');
      await nextTick();
    });

    test.runIf(editMode)('toggling isEditActive reinitializes fields', async () => {
      const wrapper: VueWrapper = mountComponent({
        ...defaultProps,
        isEditActive: false,
      }) as VueWrapper;
      expect(wrapper.find(`[data-testid="${schulenFilterTestId}"]`).text()).toContain(initialValues.selectedSchule);
      expect(wrapper.find('#klassenname-input').attributes('value')).toBe(initialValues.selectedKlassenname);
      await wrapper.setProps({ isEditActive: true });

      await wrapper.find('#klassenname-input').setValue(newValues.selectedKlassenname);
      expect(wrapper.find('#klassenname-input').attributes('value')).toBe(newValues.selectedKlassenname);

      await wrapper.setProps({ isEditActive: false });
      expect(wrapper.find(`[data-testid="${schulenFilterTestId}"]`).text()).toContain(initialValues.selectedSchule);
      expect(wrapper.find('#klassenname-input').attributes('value')).toBe(initialValues.selectedKlassenname);
    });

    describe.each([[true], [false]])('when isEditActive is %s', (isEditActive: boolean) => {
      test('it dynamically displays actions', () => {
        const wrapper: VueWrapper = mountComponent({
          ...defaultProps,
          isEditActive,
        }) as VueWrapper;
        if (editMode) {
          expect(wrapper.find('[data-testid="klasse-form-discard-button"]').exists()).toBe(isEditActive);
          expect(wrapper.find('[data-testid="klasse-form-submit-button"]').exists()).toBe(isEditActive);
        } else {
          expect(wrapper.find('[data-testid="klasse-form-discard-button"]').exists()).toBe(true);
          expect(wrapper.find('[data-testid="klasse-form-submit-button"]').exists()).toBe(true);
        }
      });

      test('it correctly sets "disabled"-attributes on inputs', () => {
        const wrapper: VueWrapper = mountComponent({ ...defaultProps, isEditActive }) as VueWrapper;
        if (editMode) {
          expect(wrapper.find(`#${schulenFilterTestId}`).attributes('disabled')).toBe('');
        } else {
          expect(wrapper.find(`#${schulenFilterTestId}`).attributes('disabled')).toBeUndefined();
        }
        if (editMode && !isEditActive) {
          expect(wrapper.find('#klassenname-input').attributes('disabled')).toBe('');
        } else {
          expect(wrapper.find('#klassenname-input').attributes('disabled')).toBeUndefined();
        }
      });

      test('data-entry and submission are correctly en-/disabled', async () => {
        const wrapper: VueWrapper = mountComponent({
          ...defaultProps,
          isEditActive,
        }) as VueWrapper;
        await wrapper.find(`#${schulenFilterTestId}`).setValue(newValues.selectedSchule);
        await wrapper.find('#klassenname-input').setValue(newValues.selectedKlassenname);
        vi.runAllTimers();
        await flushPromises();
        if (editMode) {
          expect(wrapper.find(`[data-testid="${schulenFilterTestId}"]`).text()).toContain(initialValues.selectedSchule);
          if (isEditActive) {
            expect(wrapper.find('#klassenname-input').attributes('value')).toBe(newValues.selectedKlassenname);
          } else {
            expect(wrapper.find('#klassenname-input').attributes('value')).toBe(initialValues.selectedKlassenname);
          }
        } else {
          expect(wrapper.find(`#${schulenFilterTestId}`).attributes('value')).toContain(newValues.selectedSchule);
          expect(wrapper.find('#klassenname-input').attributes('value')).toBe(newValues.selectedKlassenname);
        }

        if (!editMode || isEditActive) {
          expect(wrapper.find('[data-testid="klasse-form-submit-button"]').attributes('disabled')).toBeFalsy();
        }
      });

      test('it correctly sets "disabled"-attributes on inputs', () => {
        const wrapper: VueWrapper = mountComponent({ ...defaultProps, isEditActive }) as VueWrapper;
        if (editMode) {
          expect(wrapper.find(`#${schulenFilterTestId}`).attributes('disabled')).toBe('');
        } else {
          expect(wrapper.find(`#${schulenFilterTestId}`).attributes('disabled')).toBeUndefined();
        }
        if (editMode && !isEditActive) {
          expect(wrapper.find('#klassenname-input').attributes('disabled')).toBe('');
        } else {
          expect(wrapper.find('#klassenname-input').attributes('disabled')).toBeUndefined();
        }
      });
    });
  });
});
