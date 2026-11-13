<script setup lang="ts">
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';
  import KlasseChange from '@/components/admin/klassen/KlasseChange.vue';
  import BefristungInput from '@/components/admin/personen/BefristungInput.vue';
  import KopersInput from '@/components/admin/personen/KopersInput.vue';
  import PersonenkontextCreate from '@/components/admin/personen/PersonenkontextCreate.vue';
  import PersonenkontextDelete from '@/components/admin/personen/PersonenkontextDelete.vue';
  import ZuordnungConfirmationDialog from '@/components/admin/personen/details/ZuordnungConfirmationDialog.vue';
  import ZuordnungenEditList from '@/components/admin/personen/details/ZuordnungenEditList.vue';
  import ZuordnungenReadOnlyView from '@/components/admin/personen/details/ZuordnungenReadOnlyView.vue';
  import ZuordnungFormActions from '@/components/admin/personen/details/ZuordnungFormActions.vue';
  import ZuordnungSuccessDialog from '@/components/admin/personen/details/ZuordnungSuccessDialog.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { useOrganisationen } from '@/composables/useOrganisationen';
  import {
    useZuordnungChangeBefristung,
    type ZuordnungChangeBefristung,
  } from '@/composables/useZuordnungChangeBefristung';
  import { useZuordnungChangeKlasse, type ZuordnungChangeKlasse } from '@/composables/useZuordnungChangeKlasse';
  import { useAuthStore, type AuthStore, type PersonenkontextRolleFields } from '@/stores/AuthStore';
  import { useConfigStore, type ConfigStore } from '@/stores/ConfigStore';
  import {
    OrganisationsTyp,
    useOrganisationStore,
    type Organisation,
    type OrganisationStore,
  } from '@/stores/OrganisationStore';
  import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
  import {
    mapZuordnungToPersonenkontextUpdate,
    OperationContext,
    usePersonenkontextStore,
    type PersonenkontextStore,
    type PersonenkontextUpdate,
  } from '@/stores/PersonenkontextStore';
  import {
    RollenArt,
    RollenMerkmal,
    useRolleStore,
    type RolleStore,
    type TranslatedRolleWithAttrs,
  } from '@/stores/RolleStore';
  import { useServiceProviderStore, type ServiceProviderStore } from '@/stores/ServiceProviderStore';
  import type { Zuordnung } from '@/stores/types/Zuordnung';
  import type { TranslatedObject } from '@/types';
  import { isBefristungspflichtRolle, useBefristungUtils, type BefristungUtilsType } from '@/utils/befristung';
  import { formatDateToISO, getNextSchuljahresende } from '@/utils/date';
  import {
    getDirtyState,
    getPersonenkontextFieldDefinitions,
    getValidationSchema,
    type PersonenkontextFieldDefinitions,
  } from '@/utils/validationPersonenkontext';
  import {
    buildZuordnungenForCreation,
    buildZuordnungenForDeletion,
    cloneZuordnungen,
    computeZuordnungenWithKlasse,
    type PersonWithZuordnungenSource,
    withoutKlassen,
    type ZuordnungChange,
    type ZuordnungenWorkingState,
    type ZuordnungWithKlasse,
  } from '@/utils/zuordnungen';
  import { useForm, type FormContext } from 'vee-validate';
  import {
    computed,
    nextTick,
    onBeforeMount,
    ref,
    watch,
    watchEffect,
    type ComputedRef,
    type ModelRef,
    type Ref,
  } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useRouter, type Router } from 'vue-router';
  import { useDisplay } from 'vuetify';

  type Props = {
    personId: string;
    isEditPersonMetadataActive: boolean;
  };

  const props: Props = defineProps<Props>();
  const isEditActive: ModelRef<boolean> = defineModel<boolean>('isEditActive', { default: false });
  const isFormDirty: ModelRef<boolean> = defineModel<boolean>('isFormDirty', { default: false });
  const hasPendingChange: ModelRef<boolean> = defineModel<boolean>('hasPendingChange', { default: false });

  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();
  const { t }: Composer = useI18n({ useScope: 'global' });
  const router: Router = useRouter();

  const personStore: PersonStore = usePersonStore();
  const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
  const authStore: AuthStore = useAuthStore();
  const configStore: ConfigStore = useConfigStore();
  const organisationStore: OrganisationStore = useOrganisationStore();
  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
  const rolleStore: RolleStore = useRolleStore();

  type ZuordnungCreationForm = {
    selectedRolle: TranslatedRolleWithAttrs;
    selectedOrganisation: Organisation;
    selectedKlasse: string;
    selectedBefristung: Date;
    selectedBefristungOption: string;
    selectedKopersNr?: string;
  };

  const zuordnungenWithPendingChanges: Ref<ZuordnungWithKlasse[] | undefined> = ref<ZuordnungWithKlasse[] | undefined>(
    undefined,
  );
  const selectedZuordnungen: Ref<ZuordnungWithKlasse[]> = ref<ZuordnungWithKlasse[]>([]);
  const newZuordnung: Ref<ZuordnungWithKlasse | undefined> = ref<ZuordnungWithKlasse | undefined>(undefined);
  const zuordnungenToBePersisted: Ref<Zuordnung[]> = ref<Zuordnung[]>([]);
  const zuordnungenWorkingState: ZuordnungenWorkingState = {
    selectedZuordnungen,
    zuordnungenWithPendingChanges,
    newZuordnung,
    zuordnungenToBePersisted,
  };
  const originalZuordnungen: Ref<ZuordnungWithKlasse[] | undefined> = ref(undefined);
  const isUnbefristetDisabled: Ref<boolean, boolean> = ref(false);
  const isBefristungRequired: Ref<boolean, boolean> = ref(false);
  // Check if the button to change the Klasse should be active or not. Activate only if there is 1 selected Zuordnung and if it is of type LERN.
  const isLernRolleForChangeKlasseResult: Ref<boolean> = ref(false);

  const isZuordnungFormActive: Ref<boolean> = ref(false);

  const pendingDeletion: Ref<boolean> = ref(false);
  const pendingCreation: Ref<boolean> = ref(false);

  const deleteSuccessDialogVisible: Ref<boolean> = ref(false);
  const createSuccessDialogVisible: Ref<boolean> = ref(false);
  const changeKlasseSuccessDialogVisible: Ref<boolean> = ref(false);
  const changeBefristungSuccessDialogVisible: Ref<boolean> = ref(false);
  const cannotDeleteDialogVisible: Ref<boolean> = ref(false);
  const createZuordnungConfirmationDialogVisible: Ref<boolean> = ref(false);
  const createZuordnungConfirmationDialogMessage: Ref<string> = ref('');
  const canCommit: Ref<boolean> = ref(false);
  const hasNoKopersNr: Ref<boolean | undefined> = ref(false);
  const showNoKopersNrConfirmationDialog: Ref<boolean> = ref(false);

  const cachedSelectedOrganisation: Ref<Organisation | undefined> = ref();
  const cachedSelectedRolle: Ref<TranslatedRolleWithAttrs | undefined> = ref();
  const cachedSelectedKopersNr: Ref<string> = ref('');

  const calculatedBefristung: Ref<string | undefined> = ref('');

  const organisationen: ComputedRef<TranslatedObject[] | undefined> = useOrganisationen();

  const hasKopersNummer: ComputedRef<boolean> = computed(() => {
    return !!personStore.currentPerson?.person.personalnummer;
  });

  const hasKlassenZuordnung: ComputedRef<boolean> = computed(
    () =>
      personStore.personenuebersicht?.zuordnungen.some(
        (zuordnung: Zuordnung) => zuordnung.typ === OrganisationsTyp.Klasse,
      ) ?? false,
  );

  const finalZuordnungenUpdate: ComputedRef<PersonenkontextUpdate[]> = computed(() => {
    return zuordnungenToBePersisted.value.map(mapZuordnungToPersonenkontextUpdate);
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

  const {
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
  }: ZuordnungChangeKlasse = useZuordnungChangeKlasse({ t, state: zuordnungenWorkingState });

  const {
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
  }: ZuordnungChangeBefristung = useZuordnungChangeBefristung({
    t,
    state: zuordnungenWorkingState,
    calculatedBefristung,
    isUnbefristetDisabled,
    isBefristungRequired,
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

  function navigateToPersonTable(): void {
    router.push({ name: 'person-management' });
  }

  // Restores the creation form after the submission failed, e.g. because the KoPers.-Nr. is not unique
  function navigateToZuordnungForm(): void {
    personenkontextStore.errorCode = '';
    pendingCreation.value = false;
    isZuordnungFormActive.value = true;
    if (cachedSelectedOrganisation.value) {
      formContext.setFieldValue('selectedOrganisation', cachedSelectedOrganisation.value);
    }
    if (cachedSelectedRolle.value) {
      formContext.setFieldValue('selectedRolle', cachedSelectedRolle.value);
    }
    formContext.setFieldValue('selectedKopersNr', cachedSelectedKopersNr.value);

    // Rollback the zuordnungen to be added
    zuordnungenWithPendingChanges.value = zuordnungenToBePersisted.value.filter(
      (zuordnung: Zuordnung) => zuordnung !== newZuordnung.value,
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

  // Triggers the template to start editing
  const triggerEdit = (): void => {
    isEditActive.value = true;
    // Deep copy of the zuordnungenResult to keep track of the Zuordnungen before any changes were done.
    // This is necessary if a user cancels the editing at some point and the zuordnungenResult was mutated at the time.
    originalZuordnungen.value = cloneZuordnungen(zuordnungenWithPendingChanges.value);
  };

  // Triggers the template to add a new Zuordnung
  const triggerAddZuordnung = (): void => {
    isZuordnungFormActive.value = true;
  };

  // Triggers the template to prepare the deletion
  const prepareDeletion = (): void => {
    pendingDeletion.value = true;
  };
  // Triggers the template to prepare the creation
  const prepareCreation = (): void => {
    pendingCreation.value = true;
    isZuordnungFormActive.value = false;
  };

  // Cancels editing
  const cancelEdit = (): void => {
    isEditActive.value = false;
    pendingDeletion.value = false;
    pendingCreation.value = false;
    pendingChangeKlasse.value = false;
    selectedZuordnungen.value = [];
    isZuordnungFormActive.value = false;
    isChangeKlasseFormActive.value = false;
    isChangeBefristungActive.value = false;
    pendingChangeBefristung.value = false;
    formContext.resetForm();
    resetChangeKlasseForm();
    changeBefristungFormContext.resetForm();
    zuordnungenWithPendingChanges.value = cloneZuordnungen(originalZuordnungen.value);
  };

  const closeCannotDeleteDialog = (): void => {
    cannotDeleteDialogVisible.value = false;
  };

  const closeCreateSuccessDialog = (): void => {
    personStore.getPersonenuebersichtById(props.personId);
    serviceProviderStore.getServiceProvidersByPersonId(props.personId);
    createSuccessDialogVisible.value = false;
    isEditActive.value = false;
    pendingCreation.value = false;
  };

  let closeDeleteSuccessDialog = (): void => {
    personStore.getPersonenuebersichtById(props.personId);
    serviceProviderStore.getServiceProvidersByPersonId(props.personId);
    deleteSuccessDialogVisible.value = false;
    isEditActive.value = false;
    pendingDeletion.value = false;
  };

  const closeChangeKlasseSuccessDialog = (): void => {
    personStore.getPersonenuebersichtById(props.personId);
    changeKlasseSuccessDialogVisible.value = false;
    isEditActive.value = false;
    pendingChangeKlasse.value = false;
  };

  const closeChangeBefristungSuccessDialog = (): void => {
    personStore.getPersonenuebersichtById(props.personId);
    changeBefristungSuccessDialogVisible.value = false;
    isChangeBefristungActive.value = false;
    pendingChangeBefristung.value = false;
    isEditActive.value = false;
  };

  const confirmDeletion = async (): Promise<void> => {
    // Check if the current user is trying to delete their own Zuordnungen
    if (authStore.currentUser?.personId === props.personId) {
      cannotDeleteDialogVisible.value = true;
      return;
    }

    const {
      remainingZuordnungen,
      zuordnungenToBePersisted: combinedZuordnungen,
    }: ReturnType<typeof buildZuordnungenForDeletion> = buildZuordnungenForDeletion(
      zuordnungenWithPendingChanges.value,
      personStore.personenuebersicht?.zuordnungen,
      selectedZuordnungen.value,
    );

    const zuordnungenUpdate: PersonenkontextUpdate[] | undefined = combinedZuordnungen?.map(
      mapZuordnungToPersonenkontextUpdate,
    );

    // Update the personenkontexte with the filtered list
    await personenkontextStore.updatePersonenkontexte(zuordnungenUpdate, props.personId);
    zuordnungenWithPendingChanges.value = remainingZuordnungen;
    selectedZuordnungen.value = [];

    // Filter out Zuordnungen with editable === false
    const editableZuordnungen: Zuordnung[] | undefined = combinedZuordnungen?.filter(
      (zuordnung: Zuordnung) => zuordnung.editable,
    );

    deleteSuccessDialogVisible.value = !personenkontextStore.errorCode;

    if (!editableZuordnungen || editableZuordnungen.length === 0) {
      // If no editable Zuordnungen are left, navigate to person table after the dialog is closed
      closeDeleteSuccessDialog = (): void => {
        deleteSuccessDialogVisible.value = false;
        isEditActive.value = false;
        pendingDeletion.value = false;
        navigateToPersonTable();
      };
    }
  };

  // This will send the updated list of Zuordnungen to the Backend on TOP of the new added one through the form.
  async function confirmAddition(): Promise<void> {
    await personenkontextStore.updatePersonenkontexte(
      finalZuordnungenUpdate.value,
      props.personId,
      selectedKopersNr.value,
    );
    createSuccessDialogVisible.value = !personenkontextStore.errorCode;
    // Cache the selected values to avoid losing them on form reset (Useful for when Kopers is already assigned and we want to redirect back to form)
    cachedSelectedOrganisation.value = selectedOrganisation.value;
    cachedSelectedRolle.value = selectedRolle.value!;
    cachedSelectedKopersNr.value = selectedKopersNr.value!;
    formContext.resetForm();
    personStore.getPersonById(props.personId);
  }

  // This will send the updated list of Zuordnungen to the Backend with the selected Zuordnung but with the new Klasse.
  async function confirmChangeKlasse(): Promise<void> {
    await personenkontextStore.updatePersonenkontexte(finalZuordnungenUpdate.value, props.personId);
    changeKlasseSuccessDialogVisible.value = !personenkontextStore.errorCode;
    selectedZuordnungen.value = [];
    resetChangeKlasseForm();
  }

  async function confirmChangeBefristung(): Promise<void> {
    await personenkontextStore.updatePersonenkontexte(finalZuordnungenUpdate.value, props.personId);
    changeBefristungSuccessDialogVisible.value = !personenkontextStore.errorCode;
    selectedZuordnungen.value = [];
    changeBefristungFormContext.resetForm();
    formContext.resetForm();
  }

  // The save button will act according to what kind of pending action we have.
  const handleSaveClick = async (): Promise<void> => {
    if (pendingCreation.value) {
      await confirmAddition();
    } else if (pendingDeletion.value) {
      await confirmDeletion();
    } else if (pendingChangeKlasse.value) {
      await confirmChangeKlasse();
    } else if (pendingChangeBefristung.value) {
      await confirmChangeBefristung();
    }
  };

  const hasPendingChangeComputed: ComputedRef<boolean> = computed(() => {
    return pendingCreation.value || pendingDeletion.value || pendingChangeKlasse.value || pendingChangeBefristung.value;
  });

  watch(
    hasPendingChangeComputed,
    (value: boolean) => {
      hasPendingChange.value = value;
    },
    { immediate: true, flush: 'sync' },
  );

  // The save button is always disabled if there is no pending creation, deletion nor changeKlasse.
  const isSaveButtonDisabled: ComputedRef<boolean> = computed(() => !hasPendingChange.value);

  const canChangeKlasse: ComputedRef<boolean> = computed(() => {
    const hasOneSelectedZuordnung: boolean = selectedZuordnungen.value.length === 1;
    return !!selectedZuordnungen.value[0]?.rolleId && isLernRolleForChangeKlasseResult.value && hasOneSelectedZuordnung;
  });

  // Landesadmins have a personenkontext at the root organisation node; Schuladmins do not.
  const isDeleteExternZuordnungDisabled: ComputedRef<boolean> = computed(() => {
    const hasExternSelected: boolean = selectedZuordnungen.value.some(
      (z: ZuordnungWithKlasse) => z.rollenArt === RollenArt.Extern,
    );
    const isLandesadmin: boolean =
      authStore.currentUser?.personenkontexte?.some(
        (pk: PersonenkontextRolleFields) => pk.organisation.typ === OrganisationsTyp.Root,
      ) ?? false;
    return hasExternSelected && !isLandesadmin;
  });

  // Filter out the Rollen based on the user's existing Zuordnungen and selected organization
  const filteredRollen: ComputedRef = computed(() => {
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
        currentZuordnungen: zuordnungenWithPendingChanges.value ?? [],
        existingZuordnungen: personStore.personenuebersicht?.zuordnungen,
        organisation,
        klasse: selectedKlasseForCreation.value,
        rolleId: selectedRolle.value?.value ?? '',
        rolle: selectedRolle.value,
        befristung: formatDateToISO(befristungDate) ?? null,
      });
      newZuordnung.value = change.newZuordnung;
      zuordnungenToBePersisted.value = change.zuordnungenToBePersisted;
      zuordnungenWithPendingChanges.value = [
        ...withoutKlassen(zuordnungenWithPendingChanges.value ?? []),
        change.newZuordnung,
      ];
    } else if (zuordnungenWithPendingChanges.value) {
      zuordnungenWithPendingChanges.value = withoutKlassen(zuordnungenWithPendingChanges.value);
    }

    prepareCreation();
  };

  const cancelAddition = (): void => {
    createZuordnungConfirmationDialogVisible.value = false;
  };

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

  // Syncs dirtiness depending on the active form
  watchEffect(() => {
    if (isChangeKlasseFormActive.value) {
      isFormDirty.value = isChangeKlasseFieldDirty('selectedSchule') || isChangeKlasseFieldDirty('selectedNewKlasse');
    } else if (isEditActive.value) {
      isFormDirty.value = isZuordnungCreationFormDirty.value;
    } else {
      isFormDirty.value = false;
    }
  });

  watch(
    () => personStore.personenuebersicht,
    (newValue: PersonWithZuordnungenSource | null) => {
      zuordnungenWithPendingChanges.value = computeZuordnungenWithKlasse(newValue);
    },
    { immediate: true },
  );

  watch(
    () => selectedZuordnungen.value[0], // Watch the first selected Zuordnung
    (newValue: Zuordnung | undefined) => {
      if (newValue) {
        personenkontextStore.processWorkflowStep({
          personId: props.personId,
          operationContext: OperationContext.PERSON_BEARBEITEN,
          organisationId: newValue.sskId,
          rollenIds: [newValue.rolleId],
          limit: 25,
        });
      }

      isLernRolleForChangeKlasseResult.value = newValue?.rollenArt === RollenArt.Lern;
    },
    { immediate: true }, // Run on initialization if there's already a selected Zuordnung
  );

  setupWatchers();
  setupRolleWatcher();

  watch(hasNoKopersNr, (newValue: boolean | undefined) => {
    if (newValue) {
      showNoKopersNrConfirmationDialog.value = true;
    }
  });

  // For selectedRolle
  watchEffect(async () => {
    if (selectedRolle.value) {
      const result: boolean = await isBefristungspflichtRolle([selectedRolle.value]);
      isUnbefristetDisabled.value = result;
      isBefristungRequired.value = result;
    }
  });

  onBeforeMount(async () => {
    await personenkontextStore.processWorkflowStep({
      personId: props.personId,
      operationContext: OperationContext.PERSON_BEARBEITEN,
      limit: 25,
    });
  });

  defineExpose({ navigateToZuordnungForm });
</script>

<template>
  <div data-testid="person-zuordnungen-section">
    <ZuordnungenReadOnlyView
      v-if="!isEditActive"
      :loading="personStore.loading"
      :zuordnungen="zuordnungenWithPendingChanges"
      :has-zuordnungen="!!personStore.personenuebersicht?.zuordnungen?.length"
      :has-selection="selectedZuordnungen.length > 0"
      :is-edit-person-metadata-active="isEditPersonMetadataActive"
      @edit="triggerEdit"
    />
    <!-- Show this template if the edit button is triggered-->
    <v-container
      v-if="isEditActive"
      data-testid="person-zuordnungen-section-edit"
    >
      <template v-if="!isZuordnungFormActive && !isChangeKlasseFormActive && !isChangeBefristungActive">
        <v-row class="ml-md-16">
          <v-col
            v-if="!hasPendingChange"
            cols="12"
            sm="auto"
          >
            <h3 class="subtitle-1">{{ t('person.editZuordnungen') }}: {{ t('pleaseSelect') }}</h3>
          </v-col>
        </v-row>
        <v-row class="ml-md-16 mb-12">
          <v-col
            v-if="pendingDeletion || pendingCreation || pendingChangeKlasse || pendingChangeBefristung"
            cols="12"
            sm="auto"
          >
            <h3
              class="subtitle-1"
              data-testid="check-and-save-headline"
            >
              {{ t('person.checkAndSave') }}:
            </h3>
          </v-col>
          <ZuordnungenEditList
            v-model:selected-zuordnungen="selectedZuordnungen"
            :zuordnungen="zuordnungenWithPendingChanges?.filter((zuordnung: Zuordnung) => zuordnung.editable) ?? []"
            :new-zuordnung="newZuordnung"
            :has-pending-change="hasPendingChange"
            :pending-creation="pendingCreation"
            :pending-deletion="pendingDeletion"
            :pending-change-klasse="pendingChangeKlasse"
            :pending-change-befristung="pendingChangeBefristung"
          />
          <v-spacer />
          <v-col
            v-if="!hasPendingChange"
            class="button-container"
            cols="12"
            md="auto"
          >
            <v-col
              cols="12"
              sm="6"
              md="auto"
            >
              <PersonenkontextDelete
                v-if="!pendingDeletion"
                ref="personenkontext-delete"
                :error-code="personStore.errorCode"
                :person="personStore.currentPerson"
                :disabled="selectedZuordnungen.length === 0 || isDeleteExternZuordnungDisabled"
                :disabled-tooltip-text="isDeleteExternZuordnungDisabled ? '' : undefined"
                :zuordnung-count="
                  zuordnungenWithPendingChanges?.filter((zuordnung: Zuordnung) => zuordnung.editable).length ?? 0
                "
                @on-delete-personenkontext="prepareDeletion"
              />
              <SpshTooltip
                :enabled-condition="selectedZuordnungen.length === 0"
                :disabled-text="t('person.addZuordnungNotAllowed')"
                :enabled-text="t('person.addZuordnung')"
                position="start"
              >
                <v-btn
                  ref="zuordnung-create-button"
                  class="primary mt-2"
                  data-testid="zuordnung-create-button"
                  :disabled="selectedZuordnungen.length > 0"
                  :block="mdAndDown"
                  @click="triggerAddZuordnung"
                >
                  {{ t('person.addZuordnung') }}
                </v-btn>
              </SpshTooltip>
              <template v-if="configStore.configData?.rolleBearbeitenEnabled">
                <SpshTooltip
                  :enabled-condition="selectedZuordnungen.length > 0"
                  :disabled-text="t('person.chooseZuordnungFirst')"
                  :enabled-text="t('person.changeRolleDescription')"
                  position="start"
                >
                  <v-btn
                    class="primary mt-2"
                    data-testid="rolle-change-button"
                    :disabled="selectedZuordnungen.length === 0"
                    :block="mdAndDown"
                  >
                    {{ t('person.changeRolle') }}
                  </v-btn>
                </SpshTooltip>
              </template>
              <template v-if="configStore.configData?.befristungBearbeitenEnabled">
                <SpshTooltip
                  :enabled-condition="selectedZuordnungen.length > 0"
                  :disabled-text="t('person.chooseZuordnungFirst')"
                  :enabled-text="t('person.modifyBefristungDescription')"
                  position="start"
                >
                  <v-btn
                    class="primary mt-2"
                    data-testid="befristung-change-button"
                    :disabled="selectedZuordnungen.length !== 1"
                    :block="mdAndDown"
                    @click="triggerChangeBefristung"
                  >
                    {{ t('person.modifyBefristung') }}
                  </v-btn>
                </SpshTooltip>
              </template>
              <SpshTooltip
                v-if="hasKlassenZuordnung"
                :enabled-condition="canChangeKlasse"
                :disabled-text="t('person.chooseKlasseZuordnungFirst')"
                :enabled-text="t('person.changeKlasseDescription')"
                position="start"
              >
                <v-btn
                  class="primary mt-2"
                  data-testid="klasse-change-button"
                  :disabled="!canChangeKlasse"
                  :block="mdAndDown"
                  @click="triggerChangeKlasse"
                >
                  {{ t('transfer') }}
                </v-btn>
              </SpshTooltip>
            </v-col>
          </v-col>
        </v-row>
        <v-row
          v-if="
            personStore.personenuebersicht?.zuordnungen &&
            personStore.personenuebersicht?.zuordnungen.length === 0 &&
            !pendingCreation &&
            !pendingDeletion
          "
        >
          <v-col
            class="mt-n12 mb-16"
            cols="10"
            offset="1"
          >
            <h3 class="text-body">
              {{ t('person.noZuordnungenFound') }}
            </h3>
          </v-col>
        </v-row>
        <v-row class="save-cancel-row ml-md-16 mb-3 pt-14">
          <v-col
            class="cancel-col"
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              class="secondary small"
              data-testid="zuordnung-edit-cancel"
              :block="mdAndDown"
              @click="cancelEdit"
            >
              {{ t('cancel') }}
            </v-btn>
          </v-col>
          <v-col
            cols="12"
            sm="6"
            md="auto"
          >
            <SpshTooltip
              :enabled-condition="!isSaveButtonDisabled"
              :disabled-text="t('person.noChangesToSave')"
              :enabled-text="t('person.saveChanges')"
            >
              <v-btn
                class="primary small"
                data-testid="zuordnung-changes-save-button"
                :block="mdAndDown"
                :disabled="isSaveButtonDisabled || personenkontextStore.loading"
                @click="handleSaveClick"
              >
                {{ t('save') }}
              </v-btn>
            </SpshTooltip>
          </v-col>
        </v-row>
      </template>
      <!-- Form to add Zuordnung -->
      <template v-if="isZuordnungFormActive && !pendingDeletion && !pendingChangeKlasse">
        <v-form
          data-testid="zuordnung-creation-form"
          @submit="onSubmitCreateZuordnung"
        >
          <v-row class="ml-md-16">
            <v-col
              cols="12"
              sm="auto"
            >
              <h3 class="subtitle-1">{{ t('person.addZuordnung') }}:</h3>
            </v-col>
          </v-row>
          <v-container class="px-lg-16">
            <!-- Organisation, Rolle, Klasse zuordnen -->
            <PersonenkontextCreate
              id="personenkontext-create"
              ref="personenkontext-create"
              v-model:selected-organisation="selectedOrganisation"
              v-model:selected-rolle="selectedRolle"
              :person-id="props.personId"
              :rollenart-for-person="existingRollenArt"
              :operation-context="OperationContext.PERSON_BEARBEITEN"
              :allow-multiple-rollen="false"
              :show-headline="false"
              :rollen="filteredRollen"
              :selected-organisation-props="selectedOrganisationProps"
              :selected-rolle-props="selectedRolleProps"
              :selected-klasse-props="selectedKlasseProps"
              :befristung-input-props="{
                befristungProps: selectedBefristungProps,
                befristungOptionProps: selectedBefristungOptionProps,
                isUnbefristetDisabled: isUnbefristetDisabled,
                isBefristungRequired: isBefristungRequired,
                nextSchuljahresende: getNextSchuljahresende(),
                befristung: selectedBefristung,
                befristungOption: selectedBefristungOption,
              }"
              @update:can-commit="canCommit = $event"
              @update:befristung="handleBefristungUpdate($event)"
              @update:calculated-befristung-option="handleBefristungOptionUpdate($event)"
              @update:selected-klasse="handleKlasseUpdate"
              @field-reset="handleFieldReset($event)"
            />
            <KopersInput
              v-if="
                !hasKopersNummer &&
                selectedRolle?.merkmale?.includes(RollenMerkmal.KopersPflicht) &&
                selectedOrganisation
              "
              v-model:selected-kopers-nr="selectedKopersNr"
              :has-no-kopers-nr="hasNoKopersNr"
              :selected-kopers-nr-props="selectedKopersNrProps"
              @update:selected-kopers-nr="(value?: string | undefined) => (selectedKopersNr = value)"
              @update:has-no-kopers-nr="(value: boolean | undefined) => (hasNoKopersNr = value)"
            />
          </v-container>
          <ZuordnungFormActions
            cancel-button-test-id="zuordnung-creation-discard-button"
            @cancel="cancelEdit"
          >
            <v-btn
              :block="mdAndDown"
              :disabled="!canCommit || personenkontextStore.loading"
              class="primary"
              data-testid="zuordnung-creation-submit-button"
              type="submit"
            >
              {{ t('person.addZuordnung') }}
            </v-btn>
          </ZuordnungFormActions>
        </v-form>
      </template>
      <!-- Form to change Klasse -->
      <template v-if="isChangeKlasseFormActive && !pendingChangeKlasse">
        <v-form
          data-testid="klasse-change-form"
          @submit="onSubmitChangeKlasse"
        >
          <v-row class="ml-md-16">
            <v-col
              cols="12"
              sm="auto"
            >
              <h3 class="subtitle-1">{{ t('transfer') }}:</h3>
            </v-col>
          </v-row>
          <v-container class="px-lg-16">
            <KlasseChange
              ref="klasse-change-form"
              v-model:selected-schule="selectedSchule"
              v-model:selected-new-klasse="selectedNewKlasse"
              :is-edit-active="isEditActive"
              :readonly="true"
              :schulen="organisationen"
              :selected-schule-props="selectedSchuleProps"
              :selected-new-klasse-props="selectedNewKlasseProps"
              :on-submit="onSubmitChangeKlasse"
            />
          </v-container>
          <ZuordnungFormActions
            cancel-button-test-id="klasse-change-discard-button"
            @cancel="cancelEdit"
          >
            <SpshTooltip
              :enabled-condition="!isSubmitDisabled"
              :disabled-text="t('person.changeKlasseNotDisabledDescription')"
              :enabled-text="t('transfer')"
              position="start"
            >
              <v-btn
                :block="mdAndDown"
                class="primary"
                data-testid="klasse-change-submit-button"
                :disabled="isSubmitDisabled || organisationStore.loading"
                type="submit"
              >
                {{ t('transfer') }}
              </v-btn>
            </SpshTooltip>
          </ZuordnungFormActions>
        </v-form>
      </template>
      <!-- Form to change Befristung-->
      <template v-if="isChangeBefristungActive && !pendingChangeBefristung">
        <v-form
          data-testid="change-befristung-form"
          @submit="onSubmitChangeBefristung"
        >
          <BefristungInput
            ref="befristung-input-wrapper"
            :befristung-props="selectedChangeBefristungProps"
            :befristung-option-props="selectedChangeBefristungOptionProps"
            :is-unbefristet-disabled="isUnbefristetDisabled"
            :is-befristung-required="isBefristungRequired"
            :next-schuljahresende="getNextSchuljahresende()"
            :befristung="selectedChangeBefristung"
            :befristung-option="selectedChangeBefristungOption"
            @update:befristung="handleChangeBefristungUpdate"
            @update:calculated-befristung-option="handleChangeBefristungOptionUpdate"
          />
          <ZuordnungFormActions
            cancel-button-test-id="change-befristung-discard-button"
            @cancel="cancelEdit"
          >
            <SpshTooltip
              :enabled-condition="differentDateSelected"
              :disabled-text="t('person.changeBefristungDisabledDescription')"
              :enabled-text="t('person.changeBefristung')"
              position="start"
            >
              <v-btn
                :block="mdAndDown"
                :disabled="!differentDateSelected"
                class="primary"
                data-testid="change-befristung-submit-button"
                type="submit"
              >
                {{ t('person.changeBefristung') }}
              </v-btn>
            </SpshTooltip>
          </ZuordnungFormActions>
        </v-form>
      </template>
    </v-container>

    <ZuordnungSuccessDialog
      v-model="deleteSuccessDialogVisible"
      :header="t('person.editZuordnungen')"
      close-button-test-id="close-zuordnung-delete-success-button"
      @close="closeDeleteSuccessDialog"
    >
      <template #message>
        <v-container>
          <v-row class="text-body bold px-md-16">
            <v-col
              offset="1"
              cols="10"
            >
              <span>{{ t('person.deleteZuordnungSuccess') }}</span>
            </v-col>
          </v-row>
        </v-container>
      </template>
    </ZuordnungSuccessDialog>
    <ZuordnungSuccessDialog
      v-model="createSuccessDialogVisible"
      :header="t('person.editZuordnungen')"
      close-button-test-id="close-zuordnung-create-success-button"
      @close="closeCreateSuccessDialog"
    >
      <template #message>
        <v-container>
          <v-row class="text-body bold px-md-16">
            <v-col class="text-center">
              <span>{{ t('person.addZuordnungSuccess') }}</span>
            </v-col>
          </v-row>
        </v-container>
      </template>
    </ZuordnungSuccessDialog>
    <ZuordnungSuccessDialog
      v-model="changeKlasseSuccessDialogVisible"
      :header="t('transfer')"
      close-button-test-id="change-klasse-success-dialog-close-button"
      @close="closeChangeKlasseSuccessDialog"
    >
      <template #message>
        <v-container>
          <v-row class="text-body bold">
            <v-col
              class="text-center"
              cols="12"
            >
              <span data-testid="change-klasse-success-dialog-text">{{ t('person.changeKlasseSuccess') }}</span>
            </v-col>
          </v-row>
        </v-container>
      </template>
    </ZuordnungSuccessDialog>
    <ZuordnungSuccessDialog
      v-model="changeBefristungSuccessDialogVisible"
      :header="t('person.changeBefristung')"
      close-button-test-id="change-befristung-success-dialog-close-button"
      @close="closeChangeBefristungSuccessDialog"
    >
      <template #message>
        <v-container>
          <v-row class="text-body bold justify-center">
            <v-col
              class="text-center"
              cols="10"
            >
              <span>{{ t('person.changeBefristungSuccess') }}</span>
            </v-col>
          </v-row>
        </v-container>
      </template>
    </ZuordnungSuccessDialog>
    <ZuordnungConfirmationDialog
      v-model="createZuordnungConfirmationDialogVisible"
      :header="t('person.editZuordnungen')"
      confirm-button-test-id="confirm-zuordnung-dialog-addition"
      :confirm-first="true"
      @confirm="confirmDialogAddition"
      @cancel="cancelAddition"
    >
      <template #message>
        <v-row class="text-body bold justify-center">
          <v-col
            class="text-center"
            cols="10"
          >
            <span>{{ createZuordnungConfirmationDialogMessage }}</span>
          </v-col>
        </v-row>
      </template>
    </ZuordnungConfirmationDialog>
    <ZuordnungConfirmationDialog
      v-model="changeKlasseConfirmationDialogVisible"
      :header="t('transfer')"
      confirm-button-test-id="confirm-change-klasse-button"
      @confirm="confirmDialogChangeKlasse"
      @cancel="cancelChangeKlasse"
    >
      <template #message>
        <v-row class="text-body text-center bold">
          <v-col cols="12">
            <span data-testid="change-klasse-confirmation-dialog-text">{{
              changeKlasseConfirmationDialogMessage
            }}</span>
          </v-col>
        </v-row>
      </template>
    </ZuordnungConfirmationDialog>
    <!-- Dialog to inform the user that he can't delete his own Zuordnungen -->
    <v-dialog
      v-model="cannotDeleteDialogVisible"
      persistent
      max-width="600px"
    >
      <LayoutCard
        :closable="true"
        :header="t('person.editZuordnungen')"
        @on-close-clicked="closeCannotDeleteDialog"
      >
        <v-card-text>
          <v-container>
            <v-row class="text-body bold px-md-16">
              <v-col
                offset="1"
                cols="10"
              >
                <span>{{ t('person.cannotDeleteOwnZuordnung') }}</span>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-row class="justify-center">
            <v-col
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="mdAndDown"
                class="primary"
                @click.stop="closeCannotDeleteDialog"
              >
                {{ t('close') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </v-dialog>
    <ZuordnungConfirmationDialog
      v-model="changeBefristungConfirmationDialogVisible"
      :header="t('person.editZuordnungen')"
      confirm-button-test-id="confirm-change-befristung-button"
      @confirm="confirmDialogChangeBefristung"
      @cancel="cancelChangeBefristung"
    >
      <template #message>
        <v-row class="text-body bold justify-center">
          <v-col
            class="text-center"
            cols="10"
          >
            <span>{{ changeBefristungConfirmationDialogMessage }}</span>
          </v-col>
        </v-row>
      </template>
    </ZuordnungConfirmationDialog>

    <v-dialog
      v-model="showNoKopersNrConfirmationDialog"
      persistent
    >
      <LayoutCard
        v-if="showNoKopersNrConfirmationDialog"
        :closable="false"
        :header="t('admin.person.noKopersNr')"
      >
        <v-card-text>
          <v-container>
            <v-row class="text-body bold px-md-16">
              <v-col
                offset="1"
                cols="10"
              >
                <span data-testid="no-kopersnr-confirmation-text">
                  {{ t('admin.person.noKopersNrConfirmationDialogMessage') }}
                </span>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-row class="justify-center">
            <v-col
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="mdAndDown"
                class="secondary"
                data-testid="cancel-no-kopersnr-button"
                @click.stop="
                  showNoKopersNrConfirmationDialog = false;
                  hasNoKopersNr = false;
                "
              >
                {{ t('cancel') }}
              </v-btn>
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="mdAndDown"
                class="primary"
                data-testid="confirm-no-kopersnr-button"
                @click.stop="showNoKopersNrConfirmationDialog = false"
              >
                {{ t('proceed') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </v-dialog>
  </div>
</template>

<style scoped>
  @media only screen and (max-width: 600px) {
    .save-cancel-row {
      margin-top: -40px;
    }

    .cancel-col {
      margin-bottom: -15px;
    }
  }

  span {
    white-space: normal;
    text-wrap: pretty;
  }
</style>
