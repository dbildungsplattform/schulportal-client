import type { ZuordnungOperationMode } from '@/composables/useZuordnungEditMode';
import type { Organisation } from '@/stores/OrganisationStore';
import {
  mapZuordnungToPersonenkontextUpdate,
  usePersonenkontextStore,
  type PersonenkontextStore,
} from '@/stores/PersonenkontextStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import { RollenArt, useRolleStore, type RolleStore, type TranslatedRolleWithAttrs } from '@/stores/RolleStore';
import { useServiceProviderStore, type ServiceProviderStore } from '@/stores/ServiceProviderStore';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import { isBefristungspflichtRolle, useBefristungUtils, type BefristungUtilsType } from '@/utils/befristung';
import { formatDateToISO } from '@/utils/date';
import {
  getDirtyState,
  getPersonenkontextFieldDefinitions,
  getValidationSchema,
  type PersonenkontextFieldDefinitions,
} from '@/utils/validationPersonenkontext';
import {
  buildZuordnungenForCreation,
  withoutKlassen,
  type ZuordnungChange,
  type ZuordnungenWorkingState,
} from '@/utils/zuordnungen';
import { useForm, type FormContext } from 'vee-validate';
import { computed, nextTick, ref, watch, watchEffect, type ComputedRef, type Ref } from 'vue';
import type { Composer } from 'vue-i18n';

type ZuordnungCreationForm = {
  selectedRolle: TranslatedRolleWithAttrs;
  selectedOrganisation: Organisation;
  selectedKlasse: string;
  selectedBefristung: Date;
  selectedBefristungOption: string;
  selectedKopersNr?: string;
};

export type ZuordnungCreation = Omit<PersonenkontextFieldDefinitions, 'selectedKlasse'> & {
  isZuordnungFormActive: ComputedRef<boolean>;
  createSuccessDialogVisible: Ref<boolean>;
  createZuordnungConfirmationDialogVisible: Ref<boolean>;
  createZuordnungConfirmationDialogMessage: Ref<string>;
  showNoKopersNrConfirmationDialog: Ref<boolean>;
  hasNoKopersNr: Ref<boolean | undefined>;
  hasKopersNummer: ComputedRef<boolean>;
  canCommit: Ref<boolean>;
  filteredRollen: ComputedRef<TranslatedRolleWithAttrs[]>;
  existingRollenArt: ComputedRef<RollenArt | undefined>;
  isZuordnungCreationFormDirty: ComputedRef<boolean>;
  resetCreationForm: FormContext<ZuordnungCreationForm, ZuordnungCreationForm>['resetForm'];
  handleBefristungUpdate: BefristungUtilsType['handleBefristungUpdate'];
  handleBefristungOptionUpdate: BefristungUtilsType['handleBefristungOptionUpdate'];
  handleKlasseUpdate: (newSelection: Organisation | undefined) => void;
  handleFieldReset: (field: string) => void;
  onSubmitCreateZuordnung: (e?: Event) => Promise<void | undefined>;
  triggerAddZuordnung: () => void;
  confirmDialogAddition: () => void;
  cancelAddition: () => void;
  confirmAddition: () => Promise<void>;
  closeCreateSuccessDialog: () => void;
  navigateToZuordnungForm: () => void;
};

// Form, fields and handlers for adding a Zuordnung to a person
export function useZuordnungCreation(params: {
  t: Composer['t'];
  personId: Readonly<Ref<string>>;
  isEditActive: Ref<boolean>;
  mode: ZuordnungOperationMode;
  state: ZuordnungenWorkingState;
  // Shared with the change Befristung form, which also calculates and requires a Befristung
  calculatedBefristung: Ref<string | undefined>;
  isUnbefristetDisabled: Ref<boolean>;
  isBefristungRequired: Ref<boolean>;
}): ZuordnungCreation {
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
  const rolleStore: RolleStore = useRolleStore();
  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();

  const createSuccessDialogVisible: Ref<boolean> = ref(false);
  const createZuordnungConfirmationDialogVisible: Ref<boolean> = ref(false);
  const createZuordnungConfirmationDialogMessage: Ref<string> = ref('');
  const showNoKopersNrConfirmationDialog: Ref<boolean> = ref(false);
  const canCommit: Ref<boolean> = ref(false);
  const hasNoKopersNr: Ref<boolean | undefined> = ref(false);

  const cachedSelectedOrganisation: Ref<Organisation | undefined> = ref();
  const cachedSelectedRolle: Ref<TranslatedRolleWithAttrs | undefined> = ref();
  const cachedSelectedKopersNr: Ref<string> = ref('');

  const hasKopersNummer: ComputedRef<boolean> = computed(() => {
    return !!personStore.currentPerson?.person.personalnummer;
  });

  const formContext: FormContext<ZuordnungCreationForm, ZuordnungCreationForm> = useForm({
    validationSchema: getValidationSchema(t, hasNoKopersNr, hasKopersNummer),
  });

  const isZuordnungCreationFormDirty: ComputedRef<boolean> = computed(() => getDirtyState(formContext));

  const {
    selectedRolle,
    selectedRolleProps,
    selectedOrganisation,
    selectedOrganisationProps,
    selectedKlasse: selectedKlasseId,
    selectedKlasseProps,
    selectedBefristung,
    selectedBefristungProps,
    selectedBefristungOption,
    selectedBefristungOptionProps,
    selectedKopersNr,
    selectedKopersNrProps,
  }: PersonenkontextFieldDefinitions = getPersonenkontextFieldDefinitions(formContext);
  const selectedKlasse: Ref<Organisation | undefined> = ref();

  watch(selectedKlasseId, (klasseId: string | undefined): void => {
    if (!klasseId) {
      selectedKlasse.value = undefined;
    }
  });

  // Methods from utils that handle the Befristung events and sets up watchers
  const {
    handleBefristungUpdate,
    handleBefristungOptionUpdate,
    setupWatchers,
    setupRolleWatcher,
  }: BefristungUtilsType = useBefristungUtils({
    formContext,
    selectedBefristung,
    selectedBefristungOption,
    calculatedBefristung,
    selectedRollen: computed(() => (selectedRolle.value ? [selectedRolle.value] : [])),
  });
  setupWatchers();
  setupRolleWatcher();

  watch(hasNoKopersNr, (newValue: boolean | undefined) => {
    if (newValue) {
      showNoKopersNrConfirmationDialog.value = true;
    }
  });

  watchEffect(async () => {
    if (selectedRolle.value) {
      const result: boolean = await isBefristungspflichtRolle([selectedRolle.value]);
      isUnbefristetDisabled.value = result;
      isBefristungRequired.value = result;
    }
  });

  // Filter out the Rollen based on the user's existing Zuordnungen and selected organization
  const filteredRollen: ComputedRef<TranslatedRolleWithAttrs[]> = computed(() => {
    const existingZuordnungen: Zuordnung[] | undefined = personStore.personenuebersicht?.zuordnungen;

    // If no existing Zuordnungen or no organisation selected yet, show all roles.
    if (!existingZuordnungen || existingZuordnungen.length === 0 || !selectedOrganisation.value) {
      return rolleStore.rollenForPersonenkontextCreation;
    }

    const selectedOrgaId: string | undefined = selectedOrganisation.value.id;

    // Filter out Rollen that the user already has in the selected organization
    return rolleStore.rollenForPersonenkontextCreation?.filter(
      (rolle: TranslatedRolleWithAttrs) =>
        !existingZuordnungen.some(
          (zuordnung: Zuordnung) => zuordnung.rolleId === rolle.value && zuordnung.sskId === selectedOrgaId,
        ),
    );
  });

  // Primitive value so equal personenuebersicht replacements do not invalidate the Rollen query.
  const existingRollenArt: ComputedRef<RollenArt | undefined> = computed(
    (): RollenArt | undefined => personStore.personenuebersicht?.zuordnungen[0]?.rollenArt,
  );

  // The Klasse can only be selected (and the KlassenFilter is only shown) for a Lern-Rolle
  const selectedKlasseForCreation: ComputedRef<Organisation | undefined> = computed(() =>
    selectedRolle.value?.rollenart === RollenArt.Lern ? selectedKlasse.value : undefined,
  );

  function handleKlasseUpdate(newSelection: Organisation | undefined): void {
    selectedKlasse.value = newSelection;
    selectedKlasseId.value = selectedKlasse.value?.id;
  }

  function handleFieldReset(field: string): void {
    if (field === 'selectedRolle') {
      selectedRolle.value = undefined;
    } else if (field === 'selectedKlasse') {
      handleKlasseUpdate(undefined);
    }
  }

  // Triggers the template to add a new Zuordnung
  const triggerAddZuordnung = (): void => {
    mode.showForm();
  };

  // Triggers the template to prepare the creation
  const prepareCreation = (): void => {
    mode.showReview();
  };

  const onSubmitCreateZuordnung: (e?: Event) => Promise<void | undefined> = formContext.handleSubmit(() => {
    // The Rolle is required by the validation schema
    const rolle: TranslatedRolleWithAttrs = selectedRolle.value!;
    if (rolle.rollenart === RollenArt.Lern) {
      createZuordnungConfirmationDialogMessage.value = t('person.addZuordnungKlasseConfirmation', {
        rollenname: rolle.title,
        klassenname: selectedKlasseForCreation.value?.name,
      });
    } else {
      createZuordnungConfirmationDialogMessage.value = t('person.addZuordnungConfirmation', {
        rollenname: rolle.title,
      });
    }
    createZuordnungConfirmationDialogVisible.value = true;
  });

  const confirmDialogAddition = (): void => {
    createZuordnungConfirmationDialogVisible.value = false;
    hasNoKopersNr.value = false;
    const organisation: Organisation | undefined = personenkontextStore.workflowStepResponse?.organisations.find(
      (orga: Organisation) => orga.id === selectedOrganisation.value?.id,
    );

    const befristungDate: string | undefined = selectedBefristung.value
      ? selectedBefristung.value
      : calculatedBefristung.value;

    if (organisation) {
      const change: ZuordnungChange = buildZuordnungenForCreation({
        currentZuordnungen: state.zuordnungenWithPendingChanges.value ?? [],
        existingZuordnungen: personStore.personenuebersicht?.zuordnungen,
        organisation,
        klasse: selectedKlasseForCreation.value,
        rolleId: selectedRolle.value?.value ?? '',
        rolle: selectedRolle.value,
        befristung: formatDateToISO(befristungDate) ?? null,
      });
      state.newZuordnung.value = change.newZuordnung;
      state.zuordnungenToBePersisted.value = change.zuordnungenToBePersisted;
      state.zuordnungenWithPendingChanges.value = [
        ...withoutKlassen(state.zuordnungenWithPendingChanges.value ?? []),
        change.newZuordnung,
      ];
    } else if (state.zuordnungenWithPendingChanges.value) {
      state.zuordnungenWithPendingChanges.value = withoutKlassen(state.zuordnungenWithPendingChanges.value);
    }

    prepareCreation();
  };

  const cancelAddition = (): void => {
    createZuordnungConfirmationDialogVisible.value = false;
  };

  // This will send the updated list of Zuordnungen to the Backend on TOP of the new added one through the form.
  async function confirmAddition(): Promise<void> {
    await personenkontextStore.updatePersonenkontexte(
      state.zuordnungenToBePersisted.value.map(mapZuordnungToPersonenkontextUpdate),
      personId.value,
      selectedKopersNr.value,
    );
    createSuccessDialogVisible.value = !personenkontextStore.errorCode;
    // Cache the selected values to avoid losing them on form reset (Useful for when Kopers is already assigned and we want to redirect back to form)
    cachedSelectedOrganisation.value = selectedOrganisation.value;
    cachedSelectedRolle.value = selectedRolle.value!;
    cachedSelectedKopersNr.value = selectedKopersNr.value!;
    formContext.resetForm();
    personStore.getPersonById(personId.value);
  }

  const closeCreateSuccessDialog = (): void => {
    personStore.getPersonenuebersichtById(personId.value);
    serviceProviderStore.getServiceProvidersByPersonId(personId.value);
    createSuccessDialogVisible.value = false;
    isEditActive.value = false;
    mode.end();
  };

  // Restores the creation form after the submission failed, e.g. because the KoPers.-Nr. is not unique
  function navigateToZuordnungForm(): void {
    personenkontextStore.errorCode = '';
    mode.showForm();
    if (cachedSelectedOrganisation.value) {
      formContext.setFieldValue('selectedOrganisation', cachedSelectedOrganisation.value);
    }
    if (cachedSelectedRolle.value) {
      formContext.setFieldValue('selectedRolle', cachedSelectedRolle.value);
    }
    formContext.setFieldValue('selectedKopersNr', cachedSelectedKopersNr.value);

    // Rollback the zuordnungen to be added
    state.zuordnungenWithPendingChanges.value = state.zuordnungenToBePersisted.value.filter(
      (zuordnung: Zuordnung) => zuordnung !== state.newZuordnung.value,
    );

    // Scroll to form after DOM updates with setTimeout
    nextTick(() => {
      setTimeout(() => {
        const formElement: HTMLElement | null = document.getElementById('personenkontext-create');

        if (formElement && typeof formElement.scrollIntoView === 'function') {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    });
  }

  return {
    isZuordnungFormActive: mode.isFormActive,
    createSuccessDialogVisible,
    createZuordnungConfirmationDialogVisible,
    createZuordnungConfirmationDialogMessage,
    showNoKopersNrConfirmationDialog,
    hasNoKopersNr,
    hasKopersNummer,
    canCommit,
    filteredRollen,
    existingRollenArt,
    isZuordnungCreationFormDirty,
    resetCreationForm: formContext.resetForm,
    selectedRolle,
    selectedRolleProps,
    selectedOrganisation,
    selectedOrganisationProps,
    selectedKlasseProps,
    selectedBefristung,
    selectedBefristungProps,
    selectedBefristungOption,
    selectedBefristungOptionProps,
    selectedKopersNr,
    selectedKopersNrProps,
    handleBefristungUpdate,
    handleBefristungOptionUpdate,
    handleKlasseUpdate,
    handleFieldReset,
    onSubmitCreateZuordnung,
    triggerAddZuordnung,
    confirmDialogAddition,
    cancelAddition,
    confirmAddition,
    closeCreateSuccessDialog,
    navigateToZuordnungForm,
  };
}
