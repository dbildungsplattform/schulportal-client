import type { ZuordnungOperationMode } from '@/composables/useZuordnungEditMode';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import {
  mapZuordnungToPersonenkontextUpdate,
  usePersonenkontextStore,
  type PersonenkontextStore,
} from '@/stores/PersonenkontextStore';
import type { TranslatedRolleWithAttrs } from '@/stores/RolleStore';
import { isBefristungspflichtRolle, useBefristungUtils, type BefristungUtilsType } from '@/utils/befristung';
import { adjustDateForTimezoneAndFormat, formatDateToISO, getNextSchuljahresende } from '@/utils/date';
import { getBefristungSchema, getVuetifyConfig } from '@/utils/validationPersonenkontext';
import {
  buildZuordnungenForBefristungChange,
  type ZuordnungChange,
  type ZuordnungenWorkingState,
  type ZuordnungWithKlasse,
} from '@/utils/zuordnungen';
import { useForm, type BaseFieldProps, type FormContext } from 'vee-validate';
import { computed, ref, watchEffect, type ComputedRef, type Ref } from 'vue';
import type { Composer } from 'vue-i18n';

type ChangeBefristungForm = {
  selectedBefristung: Date;
  selectedBefristungOption: string;
  selectedRolle: string;
};

type FieldProps = Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>;

export type ZuordnungChangeBefristung = {
  changeBefristungFormContext: FormContext<ChangeBefristungForm, ChangeBefristungForm>;
  isChangeBefristungActive: ComputedRef<boolean>;
  selectedChangeBefristung: Ref<string | undefined>;
  selectedChangeBefristungProps: FieldProps;
  selectedChangeBefristungOption: Ref<string | undefined>;
  selectedChangeBefristungOptionProps: FieldProps;
  handleChangeBefristungUpdate: BefristungUtilsType['handleBefristungUpdate'];
  handleChangeBefristungOptionUpdate: BefristungUtilsType['handleBefristungOptionUpdate'];
  changeBefristungConfirmationDialogVisible: Ref<boolean>;
  changeBefristungConfirmationDialogMessage: Ref<string>;
  changeBefristungSuccessDialogVisible: Ref<boolean>;
  differentDateSelected: ComputedRef<boolean>;
  onSubmitChangeBefristung: (e?: Event) => Promise<void | undefined>;
  triggerChangeBefristung: () => void;
  confirmDialogChangeBefristung: () => void;
  cancelChangeBefristung: () => void;
  confirmChangeBefristung: () => Promise<void>;
  closeChangeBefristungSuccessDialog: () => void;
};

// Form, fields and handlers for changing the Befristung of a selected Zuordnung
export function useZuordnungChangeBefristung(params: {
  t: Composer['t'];
  personId: Readonly<Ref<string>>;
  isEditActive: Ref<boolean>;
  mode: ZuordnungOperationMode;
  state: ZuordnungenWorkingState;
  // Shared with the creation form, which also calculates and requires a Befristung
  calculatedBefristung: Ref<string | undefined>;
  isUnbefristetDisabled: Ref<boolean>;
  isBefristungRequired: Ref<boolean>;
}): ZuordnungChangeBefristung {
  const {
    t,
    personId,
    isEditActive,
    mode,
    state,
    calculatedBefristung,
    isUnbefristetDisabled,
    isBefristungRequired,
  }: typeof params = params;
  const personStore: PersonStore = usePersonStore();
  const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();

  const changeBefristungConfirmationDialogVisible: Ref<boolean> = ref(false);
  const changeBefristungConfirmationDialogMessage: Ref<string> = ref('');
  const changeBefristungSuccessDialogVisible: Ref<boolean> = ref(false);

  const changeBefristungFormContext: FormContext<ChangeBefristungForm, ChangeBefristungForm> =
    useForm<ChangeBefristungForm>({
      validationSchema: getBefristungSchema(t),
    });

  const [selectedChangeBefristung, selectedChangeBefristungProps]: [Ref<string | undefined>, FieldProps] =
    changeBefristungFormContext.defineField('selectedBefristung', getVuetifyConfig);
  const [selectedChangeBefristungOption, selectedChangeBefristungOptionProps]: [Ref<string | undefined>, FieldProps] =
    changeBefristungFormContext.defineField('selectedBefristungOption', getVuetifyConfig);
  const [changeBefristungRolle]: [Ref<string | undefined>, FieldProps] = changeBefristungFormContext.defineField(
    'selectedRolle',
    getVuetifyConfig,
  );

  const {
    handleBefristungUpdate: handleChangeBefristungUpdate,
    handleBefristungOptionUpdate: handleChangeBefristungOptionUpdate,
    setupWatchers,
  }: BefristungUtilsType = useBefristungUtils({
    formContext: changeBefristungFormContext,
    selectedBefristung: selectedChangeBefristung,
    selectedBefristungOption: selectedChangeBefristungOption,
    calculatedBefristung,
    // The initial Befristung of the Rolle is only relevant when creating a Zuordnung
    selectedRollen: ref<Array<string | TranslatedRolleWithAttrs>>(),
  });
  setupWatchers();

  watchEffect(async () => {
    if (changeBefristungRolle.value) {
      const result: boolean = await isBefristungspflichtRolle([changeBefristungRolle.value]);
      isUnbefristetDisabled.value = result;
      isBefristungRequired.value = result;
    }
  });

  const differentDateSelected: ComputedRef<boolean> = computed(() => {
    const newBefristungDate: string | undefined = selectedChangeBefristung.value ?? calculatedBefristung.value;
    const currentBefristungDate: string | undefined = state.selectedZuordnungen.value[0]?.befristung
      ? adjustDateForTimezoneAndFormat(state.selectedZuordnungen.value[0]?.befristung)
      : undefined;

    return currentBefristungDate !== newBefristungDate;
  });

  const triggerChangeBefristung = (): void => {
    changeBefristungRolle.value = state.selectedZuordnungen.value[0]?.rolleId;
    mode.showForm();
    if (!state.selectedZuordnungen.value[0]?.befristung) {
      handleChangeBefristungOptionUpdate(undefined);
      return;
    }
    const germanDate: string = adjustDateForTimezoneAndFormat(state.selectedZuordnungen.value[0]?.befristung);
    const nextSchuljahresende: string = getNextSchuljahresende();
    if (germanDate === nextSchuljahresende) {
      handleChangeBefristungOptionUpdate(nextSchuljahresende);
      return;
    }
    selectedChangeBefristung.value = germanDate;
  };

  const onSubmitChangeBefristung: (e?: Event) => Promise<void | undefined> = changeBefristungFormContext.handleSubmit(
    () => {
      const befristungDate: string | undefined = selectedChangeBefristung.value ?? calculatedBefristung.value;
      const oldBefristung: ZuordnungWithKlasse['befristung'] | undefined =
        state.selectedZuordnungen.value[0]?.befristung;
      changeBefristungConfirmationDialogMessage.value = t('person.changeBefristungConfirmation', {
        oldBefristung: oldBefristung
          ? adjustDateForTimezoneAndFormat(oldBefristung)
          : t('admin.befristung.unlimitedLower'),
        newBefristung: befristungDate || t('admin.befristung.unlimitedLower'),
      });
      changeBefristungConfirmationDialogVisible.value = true;
    },
  );

  const prepareChangeBefristung = (): void => {
    mode.showReview();
  };

  const confirmDialogChangeBefristung = (): void => {
    changeBefristungConfirmationDialogVisible.value = false;

    const befristungDate: string | undefined = selectedChangeBefristung.value ?? calculatedBefristung.value;
    const change: ZuordnungChange = buildZuordnungenForBefristungChange(
      personStore.personenuebersicht?.zuordnungen,
      state.selectedZuordnungen.value[0]!,
      formatDateToISO(befristungDate) ?? null,
    );
    state.newZuordnung.value = change.newZuordnung;
    state.zuordnungenToBePersisted.value = change.zuordnungenToBePersisted;

    prepareChangeBefristung();
  };

  const cancelChangeBefristung = (): void => {
    changeBefristungConfirmationDialogVisible.value = false;
  };

  async function confirmChangeBefristung(): Promise<void> {
    await personenkontextStore.updatePersonenkontexte(
      state.zuordnungenToBePersisted.value.map(mapZuordnungToPersonenkontextUpdate),
      personId.value,
    );
    changeBefristungSuccessDialogVisible.value = !personenkontextStore.errorCode;
    state.selectedZuordnungen.value = [];
    changeBefristungFormContext.resetForm();
  }

  const closeChangeBefristungSuccessDialog = (): void => {
    personStore.getPersonenuebersichtById(personId.value);
    changeBefristungSuccessDialogVisible.value = false;
    mode.end();
    isEditActive.value = false;
  };

  return {
    changeBefristungFormContext,
    isChangeBefristungActive: mode.isFormActive,
    selectedChangeBefristung,
    selectedChangeBefristungProps,
    selectedChangeBefristungOption,
    selectedChangeBefristungOptionProps,
    handleChangeBefristungUpdate,
    handleChangeBefristungOptionUpdate,
    changeBefristungConfirmationDialogVisible,
    changeBefristungConfirmationDialogMessage,
    changeBefristungSuccessDialogVisible,
    differentDateSelected,
    onSubmitChangeBefristung,
    triggerChangeBefristung,
    confirmDialogChangeBefristung,
    cancelChangeBefristung,
    confirmChangeBefristung,
    closeChangeBefristungSuccessDialog,
  };
}
