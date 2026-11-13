import type { Organisation } from '@/stores/OrganisationStore';
import { usePersonenkontextStore, type PersonenkontextStore } from '@/stores/PersonenkontextStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import { getVuetifyConfig } from '@/utils/validationPersonenkontext';
import {
  buildZuordnungenForKlassenwechsel,
  withoutKlassen,
  type ZuordnungChange,
  type ZuordnungenWorkingState,
} from '@/utils/zuordnungen';
import { toTypedSchema } from '@vee-validate/yup';
import { useForm, type BaseFieldProps, type FormContext, type TypedSchema } from 'vee-validate';
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import type { Composer } from 'vue-i18n';
import { mixed, object, type MixedSchema } from 'yup';

type ChangeKlasseForm = {
  selectedSchule: string;
  selectedNewKlasse: Organisation;
};

type FieldProps = Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>;

export type ZuordnungChangeKlasse = {
  isChangeKlasseFormActive: Ref<boolean>;
  pendingChangeKlasse: Ref<boolean>;
  selectedSchule: Ref<string | undefined>;
  selectedSchuleProps: FieldProps;
  selectedNewKlasse: Ref<Organisation | undefined>;
  selectedNewKlasseProps: FieldProps;
  resetChangeKlasseForm: FormContext<ChangeKlasseForm, ChangeKlasseForm>['resetForm'];
  isChangeKlasseFieldDirty: FormContext<ChangeKlasseForm, ChangeKlasseForm>['isFieldDirty'];
  changeKlasseConfirmationDialogVisible: Ref<boolean>;
  changeKlasseConfirmationDialogMessage: Ref<string>;
  isSubmitDisabled: ComputedRef<boolean>;
  onSubmitChangeKlasse: (e?: Event) => Promise<void | undefined>;
  triggerChangeKlasse: () => void;
  confirmDialogChangeKlasse: () => void;
  cancelChangeKlasse: () => void;
};

// Form, fields and handlers for changing the Klasse of a selected Zuordnung (Versetzen)
export function useZuordnungChangeKlasse(params: {
  t: Composer['t'];
  state: ZuordnungenWorkingState;
}): ZuordnungChangeKlasse {
  const { t, state }: { t: Composer['t']; state: ZuordnungenWorkingState } = params;
  const personStore: PersonStore = usePersonStore();
  const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();

  const isChangeKlasseFormActive: Ref<boolean> = ref(false);
  const pendingChangeKlasse: Ref<boolean> = ref(false);
  const changeKlasseConfirmationDialogVisible: Ref<boolean> = ref(false);
  const changeKlasseConfirmationDialogMessage: Ref<string> = ref('');

  const changeKlasseValidationSchema: TypedSchema = toTypedSchema(
    object({
      selectedNewKlasse: mixed<Organisation>().when('selectedSchule', {
        is: (selectedSchule: string) => selectedSchule,
        then: (schema: MixedSchema<Organisation | undefined>) =>
          schema.required(t('admin.klasse.rules.klasse.required')),
      }),
    }),
  );

  // eslint-disable-next-line @typescript-eslint/typedef
  const {
    defineField,
    handleSubmit,
    resetForm: resetChangeKlasseForm,
    isFieldDirty: isChangeKlasseFieldDirty,
  } = useForm<ChangeKlasseForm>({
    validationSchema: changeKlasseValidationSchema,
  });

  const [selectedSchule, selectedSchuleProps]: [Ref<string | undefined>, FieldProps] = defineField(
    'selectedSchule',
    getVuetifyConfig,
  );
  const [selectedNewKlasse, selectedNewKlasseProps]: [Ref<Organisation | undefined>, FieldProps] = defineField(
    'selectedNewKlasse',
    getVuetifyConfig,
  );

  const selectedNewKlasseTitle: ComputedRef<string | undefined> = computed(() => selectedNewKlasse.value?.name);

  const isSubmitDisabled: ComputedRef<boolean> = computed(() => {
    return selectedNewKlasseTitle.value === state.selectedZuordnungen.value[0]?.klasse;
  });

  // Triggers the template to change the Klasse. Also pre-select the Schule and Klasse.
  const triggerChangeKlasse = (): void => {
    // Auto select the new Schule
    selectedSchule.value = state.selectedZuordnungen.value[0]?.sskId;
    // Retrieves the new Klasse from the selected Zuordnung
    const klassenZuordnung: Zuordnung | undefined = personStore.personenuebersicht?.zuordnungen.find(
      (z: Zuordnung) => z.sskName === state.selectedZuordnungen.value[0]?.klasse,
    );
    // Auto select the new Klasse
    selectedNewKlasse.value = klassenZuordnung?.getOrganisation();
    isChangeKlasseFormActive.value = true;
  };

  const onSubmitChangeKlasse: (e?: Event) => Promise<void | undefined> = handleSubmit(() => {
    changeKlasseConfirmationDialogMessage.value = t('person.changeKlasseConfirmation', {
      oldKlasse: state.selectedZuordnungen.value[0]?.klasse,
      newKlasse: selectedNewKlasseTitle.value,
    });
    changeKlasseConfirmationDialogVisible.value = true;
  });

  // Triggers the template to prepare the change of Klasse
  const prepareChangeKlasse = (): void => {
    pendingChangeKlasse.value = true;
    isChangeKlasseFormActive.value = false;
  };

  // When the button "Yes" from the Dialog after filling the form for changing the Klasse is clicked
  const confirmDialogChangeKlasse = (): void => {
    changeKlasseConfirmationDialogVisible.value = false;
    // Find the Orga object for the selected Schule (unchangeable anyways)
    const schule: Organisation | undefined = personenkontextStore.workflowStepResponse?.organisations.find(
      (orga: Organisation) => orga.id === selectedSchule.value,
    );

    if (schule) {
      const change: ZuordnungChange = buildZuordnungenForKlassenwechsel({
        currentZuordnungen: state.zuordnungenWithPendingChanges.value ?? [],
        existingZuordnungen: personStore.personenuebersicht?.zuordnungen,
        selectedZuordnungen: state.selectedZuordnungen.value,
        schule,
        newKlasse: selectedNewKlasse.value,
      });
      state.newZuordnung.value = change.newZuordnung;
      state.zuordnungenToBePersisted.value = change.zuordnungenToBePersisted;
    }

    // Zuordnungen of type Klasse are merged into the ones of type Schule, so they are not shown on their own
    if (state.zuordnungenWithPendingChanges.value) {
      state.zuordnungenWithPendingChanges.value = withoutKlassen(state.zuordnungenWithPendingChanges.value);
    }
    prepareChangeKlasse();
  };

  const cancelChangeKlasse = (): void => {
    changeKlasseConfirmationDialogVisible.value = false;
  };

  return {
    isChangeKlasseFormActive,
    pendingChangeKlasse,
    selectedSchule,
    selectedSchuleProps,
    selectedNewKlasse,
    selectedNewKlasseProps,
    resetChangeKlasseForm,
    isChangeKlasseFieldDirty,
    changeKlasseConfirmationDialogVisible,
    changeKlasseConfirmationDialogMessage,
    isSubmitDisabled,
    onSubmitChangeKlasse,
    triggerChangeKlasse,
    confirmDialogChangeKlasse,
    cancelChangeKlasse,
  };
}
