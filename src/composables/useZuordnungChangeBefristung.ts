import type { TranslatedRolleWithAttrs } from '@/stores/RolleStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
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
  isChangeBefristungActive: Ref<boolean>;
  pendingChangeBefristung: Ref<boolean>;
  selectedChangeBefristung: Ref<string | undefined>;
  selectedChangeBefristungProps: FieldProps;
  selectedChangeBefristungOption: Ref<string | undefined>;
  selectedChangeBefristungOptionProps: FieldProps;
  handleChangeBefristungUpdate: BefristungUtilsType['handleBefristungUpdate'];
  handleChangeBefristungOptionUpdate: BefristungUtilsType['handleBefristungOptionUpdate'];
  changeBefristungConfirmationDialogVisible: Ref<boolean>;
  changeBefristungConfirmationDialogMessage: Ref<string>;
  differentDateSelected: ComputedRef<boolean>;
  onSubmitChangeBefristung: (e?: Event) => Promise<void | undefined>;
  triggerChangeBefristung: () => void;
  confirmDialogChangeBefristung: () => void;
  cancelChangeBefristung: () => void;
};

// Form, fields and handlers for changing the Befristung of a selected Zuordnung
export function useZuordnungChangeBefristung(params: {
  t: Composer['t'];
  state: ZuordnungenWorkingState;
  // Shared with the creation form, which also calculates and requires a Befristung
  calculatedBefristung: Ref<string | undefined>;
  isUnbefristetDisabled: Ref<boolean>;
  isBefristungRequired: Ref<boolean>;
}): ZuordnungChangeBefristung {
  const { t, state, calculatedBefristung, isUnbefristetDisabled, isBefristungRequired }: typeof params = params;
  const personStore: PersonStore = usePersonStore();

  const isChangeBefristungActive: Ref<boolean> = ref(false);
  const pendingChangeBefristung: Ref<boolean> = ref(false);
  const changeBefristungConfirmationDialogVisible: Ref<boolean> = ref(false);
  const changeBefristungConfirmationDialogMessage: Ref<string> = ref('');

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
    isChangeBefristungActive.value = true;
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
    pendingChangeBefristung.value = true;
    isChangeBefristungActive.value = false;
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

  return {
    changeBefristungFormContext,
    isChangeBefristungActive,
    pendingChangeBefristung,
    selectedChangeBefristung,
    selectedChangeBefristungProps,
    selectedChangeBefristungOption,
    selectedChangeBefristungOptionProps,
    handleChangeBefristungUpdate,
    handleChangeBefristungOptionUpdate,
    changeBefristungConfirmationDialogVisible,
    changeBefristungConfirmationDialogMessage,
    differentDateSelected,
    onSubmitChangeBefristung,
    triggerChangeBefristung,
    confirmDialogChangeBefristung,
    cancelChangeBefristung,
  };
}
