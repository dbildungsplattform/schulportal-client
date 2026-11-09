<script setup lang="ts">
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';
  import KlasseChange from '@/components/admin/klassen/KlasseChange.vue';
  import BefristungInput from '@/components/admin/personen/BefristungInput.vue';
  import KopersInput from '@/components/admin/personen/KopersInput.vue';
  import PersonenkontextCreate from '@/components/admin/personen/PersonenkontextCreate.vue';
  import PersonenkontextDelete from '@/components/admin/personen/PersonenkontextDelete.vue';
  import { PendingState } from '@/components/admin/personen/details/PersonenkontextItem.types';
  import PersonenkontextItem from '@/components/admin/personen/details/PersonenkontextItem.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { useOrganisationen } from '@/composables/useOrganisationen';
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
  import { RollenArt, useRolleStore, type RolleStore, type TranslatedRolleWithAttrs } from '@/stores/RolleStore';
  import { useServiceProviderStore, type ServiceProviderStore } from '@/stores/ServiceProviderStore';
  import type { PersonenUebersicht } from '@/stores/types/PersonenUebersicht';
  import type { Zuordnung } from '@/stores/types/Zuordnung';
  import type { TranslatedObject } from '@/types';
  import { isBefristungspflichtRolle, useBefristungUtils, type BefristungUtilsType } from '@/utils/befristung';
  import { adjustDateForTimezoneAndFormat, formatDateToISO, getNextSchuljahresende } from '@/utils/date';
  import {
    getBefristungSchema,
    getDirtyState,
    getPersonenkontextFieldDefinitions,
    getValidationSchema,
    getVuetifyConfig,
    isKopersRolle,
    isLernRolle,
    type PersonenkontextFieldDefinitions,
  } from '@/utils/validationPersonenkontext';
  import {
    buildZuordnungenForBefristungChange,
    buildZuordnungenForCreation,
    buildZuordnungenForDeletion,
    buildZuordnungenForKlassenwechsel,
    computeZuordnungenWithKlasse,
    withoutKlassen,
    type ZuordnungChange,
    type ZuordnungWithKlasse,
  } from '@/utils/zuordnungen';
  import { toTypedSchema } from '@vee-validate/yup';
  import { useForm, type BaseFieldProps, type FormContext, type TypedSchema } from 'vee-validate';
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
  import { object, string, StringSchema, type AnyObject } from 'yup';

  type Props = {
    personId: string;
    isEditPersonMetadataActive: boolean;
  };

  const props: Props = defineProps<Props>();
  const isEditActive: ModelRef<boolean> = defineModel<boolean>('isEditActive', { default: false });

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
    selectedRolle: string;
    selectedOrganisation: string;
    selectedKlasse: string;
    selectedBefristung: Date;
    selectedBefristungOption: string;
    selectedKopersNr?: string;
  };

  type ChangeKlasseForm = {
    selectedSchule: string;
    selectedNewKlasse: string;
  };

  type ChangeBefristungForm = {
    selectedBefristung: Date;
    selectedBefristungOption: string;
    selectedRolle: string;
  };

  const zuordnungenWithPendingChanges: Ref<ZuordnungWithKlasse[] | undefined> = ref<ZuordnungWithKlasse[] | undefined>(
    undefined,
  );
  const selectedZuordnungen: Ref<ZuordnungWithKlasse[]> = ref<ZuordnungWithKlasse[]>([]);
  const newZuordnung: Ref<ZuordnungWithKlasse | undefined> = ref<ZuordnungWithKlasse | undefined>(undefined);
  const zuordnungenToBePersisted: Ref<Zuordnung[]> = ref<Zuordnung[]>([]);
  const originalZuordnungen: Ref<ZuordnungWithKlasse[] | undefined> = ref(undefined);
  const isUnbefristetDisabled: Ref<boolean, boolean> = ref(false);
  const isBefristungRequired: Ref<boolean, boolean> = ref(false);
  // Check if the button to change the Klasse should be active or not. Activate only if there is 1 selected Zuordnung and if it is of type LERN.
  const isLernRolleForChangeKlasseResult: Ref<boolean> = ref(false);

  const isZuordnungFormActive: Ref<boolean> = ref(false);
  const isChangeKlasseFormActive: Ref<boolean> = ref(false);
  const isChangeBefristungActive: Ref<boolean> = ref(false);

  const pendingDeletion: Ref<boolean> = ref(false);
  const pendingCreation: Ref<boolean> = ref(false);
  const pendingChangeKlasse: Ref<boolean> = ref(false);
  const pendingChangeBefristung: Ref<boolean> = ref(false);

  const deleteSuccessDialogVisible: Ref<boolean> = ref(false);
  const createSuccessDialogVisible: Ref<boolean> = ref(false);
  const changeKlasseSuccessDialogVisible: Ref<boolean> = ref(false);
  const changeBefristungSuccessDialogVisible: Ref<boolean> = ref(false);
  const cannotDeleteDialogVisible: Ref<boolean> = ref(false);
  const createZuordnungConfirmationDialogVisible: Ref<boolean> = ref(false);
  const changeKlasseConfirmationDialogVisible: Ref<boolean> = ref(false);
  const changeBefristungConfirmationDialogVisible: Ref<boolean> = ref(false);
  const createZuordnungConfirmationDialogMessage: Ref<string> = ref('');
  const changeKlasseConfirmationDialogMessage: Ref<string> = ref('');
  const changeBefristungConfirmationDialogMessage: Ref<string> = ref('');
  const canCommit: Ref<boolean> = ref(false);
  const hasNoKopersNr: Ref<boolean | undefined> = ref(false);
  const showNoKopersNrConfirmationDialog: Ref<boolean> = ref(false);

  const cachedSelectedOrganisation: Ref<string> = ref('');
  const cachedSelectedRolle: Ref<string> = ref('');
  const cachedSelectedKopersNr: Ref<string> = ref('');

  const calculatedBefristung: Ref<string | undefined> = ref('');

  // Klassen emitted by the KlassenFilters of the creation and change Klasse forms
  const selectedKlasseObject: Ref<Organisation | undefined> = ref(undefined);
  const selectedNewKlasseObject: Ref<Organisation | undefined> = ref(undefined);
  const selectedNewKlasseTitle: Ref<string | undefined> = ref(undefined);

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

  // Validation schema for the form for changing the Klasse (Versetzen)
  const changeKlasseValidationSchema: TypedSchema = toTypedSchema(
    object({
      selectedNewKlasse: string().when('selectedSchule', {
        is: (selectedSchule: string) => selectedSchule,
        then: (schema: StringSchema<string | undefined, AnyObject, undefined, ''>) =>
          schema.required(t('admin.klasse.rules.klasse.required')),
      }),
    }),
  );

  const formContext: FormContext<ZuordnungCreationForm, ZuordnungCreationForm> = useForm({
    validationSchema: getValidationSchema(t, hasNoKopersNr, hasKopersNummer),
  });

  const isZuordnungCreationFormDirty: ComputedRef<boolean> = computed(() => getDirtyState(formContext));

  const {
    selectedRolle,
    selectedRolleProps,
    selectedOrganisation,
    selectedOrganisationProps,
    selectedKlasse,
    selectedKlasseProps,
    selectedBefristung,
    selectedBefristungProps,
    selectedBefristungOption,
    selectedBefristungOptionProps,
    selectedKopersNr,
    selectedKopersNrProps,
  }: PersonenkontextFieldDefinitions = getPersonenkontextFieldDefinitions(formContext);

  // eslint-disable-next-line @typescript-eslint/typedef
  const {
    defineField: defineFieldChangeKlasse,
    handleSubmit: handleSubmitChangeKlasse,
    resetForm: resetChangeKlasseForm,
    isFieldDirty: isChangeKlasseFieldDirty,
  } = useForm<ChangeKlasseForm>({
    validationSchema: changeKlasseValidationSchema,
  });

  const changeBefristungFormContext: FormContext<ChangeBefristungForm, ChangeBefristungForm> =
    useForm<ChangeBefristungForm>({
      validationSchema: getBefristungSchema(t),
    });

  // Change Klasse Form
  const [selectedSchule, selectedSchuleProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = defineFieldChangeKlasse('selectedSchule', getVuetifyConfig);
  const [selectedNewKlasse, selectedNewKlasseProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = defineFieldChangeKlasse('selectedNewKlasse', getVuetifyConfig);

  // Change Befristung Form
  const [selectedChangeBefristung, selectedChangeBefristungProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = changeBefristungFormContext.defineField('selectedBefristung', getVuetifyConfig);
  const [selectedChangeBefristungOption, selectedChangeBefristungOptionProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = changeBefristungFormContext.defineField('selectedBefristungOption', getVuetifyConfig);
  const [changeBefristungRolle]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = changeBefristungFormContext.defineField('selectedRolle', getVuetifyConfig);

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

  const {
    handleBefristungUpdate: handleChangeBefristungUpdate,
    handleBefristungOptionUpdate: handleChangeBefristungOptionUpdate,
    setupWatchers: setupChangeBefristungWatchers,
  }: BefristungUtilsType = useBefristungUtils({
    formContext: changeBefristungFormContext,
    selectedBefristung: selectedChangeBefristung,
    selectedBefristungOption: selectedChangeBefristungOption,
    calculatedBefristung,
    selectedRollen: computed(() => (changeBefristungRolle.value ? [changeBefristungRolle.value] : [])),
  });

  function navigateToPersonTable(): void {
    router.push({ name: 'person-management' });
  }

  // Restores the creation form after the submission failed, e.g. because the KoPers.-Nr. is not unique
  function navigateToZuordnungForm(): void {
    personenkontextStore.errorCode = '';
    pendingCreation.value = false;
    isZuordnungFormActive.value = true;
    formContext.setFieldValue('selectedOrganisation', cachedSelectedOrganisation.value);
    formContext.setFieldValue('selectedRolle', cachedSelectedRolle.value);
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
    originalZuordnungen.value = JSON.parse(
      JSON.stringify(zuordnungenWithPendingChanges.value),
    ) as ZuordnungWithKlasse[];
  };

  // Triggers the template to change the Klasse. Also pre-select the Schule and Klasse.
  const triggerChangeKlasse = (): void => {
    // Auto select the new Schule
    selectedSchule.value = selectedZuordnungen.value[0]?.sskId;
    // Retrieves the new Klasse from the selected Zuordnung
    const klassenZuordnung: Zuordnung | undefined = personStore.personenuebersicht?.zuordnungen.find(
      (z: Zuordnung) => z.sskName === selectedZuordnungen.value[0]?.klasse,
    );
    // Auto select the new Klasse
    selectedNewKlasse.value = klassenZuordnung?.sskId;
    selectedNewKlasseObject.value = undefined;
    selectedNewKlasseTitle.value = selectedZuordnungen.value[0]?.klasse;
    isChangeKlasseFormActive.value = true;
  };

  const triggerChangeBefristung = (): void => {
    changeBefristungRolle.value = selectedZuordnungen.value[0]?.rolleId;
    isChangeBefristungActive.value = true;
    if (!selectedZuordnungen.value[0]?.befristung) {
      handleChangeBefristungOptionUpdate(undefined);
      return;
    }
    const germanDate: string = adjustDateForTimezoneAndFormat(selectedZuordnungen.value[0]?.befristung);
    const nextSchuljahresende: string = getNextSchuljahresende();
    if (germanDate === nextSchuljahresende) {
      handleChangeBefristungOptionUpdate(nextSchuljahresende);
      return;
    }
    selectedChangeBefristung.value = germanDate;
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
  // Triggers the template to prepare the change of Klasse
  const prepareChangeKlasse = (): void => {
    pendingChangeKlasse.value = true;
    isChangeKlasseFormActive.value = false;
  };

  const prepareChangeBefristung = (): void => {
    pendingChangeBefristung.value = true;
    isChangeBefristungActive.value = false;
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
    selectedKlasseObject.value = undefined;
    selectedNewKlasseObject.value = undefined;
    zuordnungenWithPendingChanges.value = originalZuordnungen.value
      ? (JSON.parse(JSON.stringify(originalZuordnungen.value)) as ZuordnungWithKlasse[])
      : undefined;
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
    cachedSelectedOrganisation.value = selectedOrganisation.value!;
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
  const handleSaveClick = (): void => {
    if (pendingCreation.value) {
      confirmAddition();
    } else if (pendingDeletion.value) {
      confirmDeletion();
    } else if (pendingChangeKlasse.value) {
      confirmChangeKlasse();
    } else if (pendingChangeBefristung.value) {
      confirmChangeBefristung();
    }
  };

  const hasPendingChange: ComputedRef<boolean> = computed(() => {
    return pendingCreation.value || pendingDeletion.value || pendingChangeKlasse.value || pendingChangeBefristung.value;
  });

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

    const selectedOrgaId: string | undefined = selectedOrganisation.value;

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

  const selectedRolleWithAttrs: ComputedRef<TranslatedRolleWithAttrs | undefined> = computed(() => {
    return rolleStore.rollenForPersonenkontextCreation?.find(
      (rolle: TranslatedRolleWithAttrs) => rolle.value === selectedRolle.value,
    );
  });

  // The Klasse can only be selected (and the KlassenFilter is only shown) for a Lern-Rolle
  const selectedKlasseForCreation: ComputedRef<Organisation | undefined> = computed(() => {
    if (!selectedRolle.value || !isLernRolle(selectedRolle.value, rolleStore.rollenForPersonenkontextCreation)) {
      return undefined;
    }
    return selectedKlasseObject.value?.id === selectedKlasse.value ? selectedKlasseObject.value : undefined;
  });

  const isSubmitDisabled: ComputedRef<boolean> = computed(() => {
    return selectedNewKlasseTitle.value === selectedZuordnungen.value[0]?.klasse;
  });

  const differentDateSelected: ComputedRef<boolean> = computed(() => {
    const newBefristungDate: string | undefined = selectedChangeBefristung.value ?? calculatedBefristung.value;
    const currentBefristungDate: string | undefined = selectedZuordnungen.value[0]?.befristung
      ? adjustDateForTimezoneAndFormat(selectedZuordnungen.value[0]?.befristung)
      : undefined;

    return currentBefristungDate !== newBefristungDate;
  });

  function handleSelectedNewKlasseObject(klasse: Organisation | undefined): void {
    selectedNewKlasseObject.value = klasse;
    selectedNewKlasseTitle.value = klasse?.name;
  }

  const onSubmitChangeKlasse: (e?: Event) => Promise<void | undefined> = handleSubmitChangeKlasse(() => {
    changeKlasseConfirmationDialogMessage.value = t('person.changeKlasseConfirmation', {
      oldKlasse: selectedZuordnungen.value[0]?.klasse,
      newKlasse: selectedNewKlasseTitle.value,
    });
    changeKlasseConfirmationDialogVisible.value = true;
  });

  const onSubmitCreateZuordnung: (e?: Event) => Promise<void | undefined> = formContext.handleSubmit(() => {
    if (selectedRolle.value) {
      if (isLernRolle(selectedRolle.value, rolleStore.rollenForPersonenkontextCreation)) {
        createZuordnungConfirmationDialogMessage.value = t('person.addZuordnungKlasseConfirmation', {
          rollenname: selectedRolleWithAttrs.value?.title,
          klassenname: selectedKlasseForCreation.value?.name,
        });
      } else {
        createZuordnungConfirmationDialogMessage.value = t('person.addZuordnungConfirmation', {
          rollenname: selectedRolleWithAttrs.value?.title,
        });
      }
      createZuordnungConfirmationDialogVisible.value = true;
    }
  });

  const onSubmitChangeBefristung: (e?: Event) => Promise<void | undefined> = changeBefristungFormContext.handleSubmit(
    () => {
      const befristungDate: string | undefined = selectedChangeBefristung.value ?? calculatedBefristung.value;
      const oldBefristung: ZuordnungWithKlasse['befristung'] | undefined = selectedZuordnungen.value[0]?.befristung;
      changeBefristungConfirmationDialogMessage.value = t('person.changeBefristungConfirmation', {
        oldBefristung: oldBefristung
          ? adjustDateForTimezoneAndFormat(oldBefristung)
          : t('admin.befristung.unlimitedLower'),
        newBefristung: befristungDate || t('admin.befristung.unlimitedLower'),
      });
      changeBefristungConfirmationDialogVisible.value = true;
    },
  );

  const confirmDialogAddition = (): void => {
    createZuordnungConfirmationDialogVisible.value = false;
    hasNoKopersNr.value = false;
    const organisation: Organisation | undefined = personenkontextStore.workflowStepResponse?.organisations.find(
      (orga: Organisation) => orga.id === selectedOrganisation.value,
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
        rolleId: selectedRolle.value ?? '',
        rolle: selectedRolleWithAttrs.value,
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

  // When the button "Yes" from the Dialog after filling the form for changing the Klasse is clicked
  const confirmDialogChangeKlasse = (): void => {
    changeKlasseConfirmationDialogVisible.value = false;
    // Find the Orga object for the selected Schule (unchangeable anyways)
    const schule: Organisation | undefined = personenkontextStore.workflowStepResponse?.organisations.find(
      (orga: Organisation) => orga.id === selectedSchule.value,
    );

    if (schule) {
      const change: ZuordnungChange = buildZuordnungenForKlassenwechsel({
        currentZuordnungen: zuordnungenWithPendingChanges.value ?? [],
        existingZuordnungen: personStore.personenuebersicht?.zuordnungen,
        selectedZuordnungen: selectedZuordnungen.value,
        schule,
        newKlasse: selectedNewKlasseObject.value,
      });
      newZuordnung.value = change.newZuordnung;
      zuordnungenToBePersisted.value = change.zuordnungenToBePersisted;
    }

    // Zuordnungen of type Klasse are merged into the ones of type Schule, so they are not shown on their own
    if (zuordnungenWithPendingChanges.value) {
      zuordnungenWithPendingChanges.value = withoutKlassen(zuordnungenWithPendingChanges.value);
    }
    prepareChangeKlasse();
  };

  const confirmDialogChangeBefristung = (): void => {
    changeBefristungConfirmationDialogVisible.value = false;

    const befristungDate: string | undefined = selectedChangeBefristung.value ?? calculatedBefristung.value;
    const change: ZuordnungChange = buildZuordnungenForBefristungChange(
      personStore.personenuebersicht?.zuordnungen,
      selectedZuordnungen.value[0]!,
      formatDateToISO(befristungDate) ?? null,
    );
    newZuordnung.value = change.newZuordnung;
    zuordnungenToBePersisted.value = change.zuordnungenToBePersisted;

    prepareChangeBefristung();
  };

  const cancelAddition = (): void => {
    createZuordnungConfirmationDialogVisible.value = false;
  };

  const cancelChangeKlasse = (): void => {
    changeKlasseConfirmationDialogVisible.value = false;
  };

  const cancelChangeBefristung = (): void => {
    changeBefristungConfirmationDialogVisible.value = false;
  };

  function handleFieldReset(field: string): void {
    if (field === 'selectedRolle') {
      selectedRolle.value = undefined;
    } else if (field === 'selectedKlasse') {
      if (selectedKlasse.value) {
        selectedKlasse.value = undefined;
      }
    }
  }

  // Checks for dirtiness depending on the active form
  function isFormDirty(): boolean {
    if (isChangeKlasseFormActive.value) {
      return isChangeKlasseFieldDirty('selectedSchule') || isChangeKlasseFieldDirty('selectedNewKlasse');
    } else if (isEditActive.value) {
      return isZuordnungCreationFormDirty.value;
    }
    return false;
  }

  watch(
    () => personStore.personenuebersicht,
    (newValue: PersonenUebersicht | null) => {
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
  setupChangeBefristungWatchers();

  watch(hasNoKopersNr, (newValue: boolean | undefined) => {
    if (newValue) {
      showNoKopersNrConfirmationDialog.value = true;
    }
  });

  // For changeBefristungRolle
  watchEffect(async () => {
    if (changeBefristungRolle.value) {
      const result: boolean = await isBefristungspflichtRolle([changeBefristungRolle.value]);
      isUnbefristetDisabled.value = result;
      isBefristungRequired.value = result;
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

  defineExpose({ hasPendingChange, isFormDirty, navigateToZuordnungForm });
</script>

<template>
  <div data-testid="person-zuordnungen-section">
    <v-container
      v-if="!isEditActive"
      class="person-zuordnungen"
      data-testid="person-zuordnungen-section-view"
    >
      <v-row class="ml-md-16">
        <v-col v-if="personStore.loading">
          <v-progress-circular indeterminate />
        </v-col>
        <template v-else>
          <v-col>
            <h3
              class="subtitle-1"
              data-testid="zuordnungen-section-headline"
            >
              {{ t('person.zuordnungen') }}
            </h3>

            <!-- Check if 'zuordnungen' array exists and has length > 0 -->
            <template
              v-if="
                personStore.personenuebersicht?.zuordnungen && personStore.personenuebersicht?.zuordnungen.length > 0
              "
            >
              <v-row
                v-for="zuordnung in zuordnungenWithPendingChanges"
                :key="zuordnung.sskId"
                class="mt-4"
                :data-testid="`person-zuordnung-${zuordnung.sskId}`"
                :title="zuordnung.sskName"
              >
                <v-col offset="1">
                  <PersonenkontextItem
                    :zuordnung="zuordnung"
                    :no-margin="true"
                  />
                </v-col>
              </v-row>
            </template>

            <!-- Display 'Keine Zuordnungen gefunden' if no zuordnungen -->
            <v-row
              v-else
              class="mt-4"
            >
              <v-col offset="1">
                <h3 class="text-body">
                  {{ t('person.noZuordnungenFound') }}
                </h3>
              </v-col>
            </v-row>
          </v-col>
          <v-col
            class="mr-lg-13"
            cols="12"
            md="auto"
          >
            <div class="d-flex justify-sm-end">
              <v-col
                cols="12"
                sm="6"
                md="auto"
              >
                <SpshTooltip
                  :enabled-condition="selectedZuordnungen.length === 0 && !isEditPersonMetadataActive"
                  :disabled-text="t('person.finishEditFirst')"
                  :enabled-text="t('person.editZuordnungen')"
                  position="start"
                >
                  <v-btn
                    class="primary ml-lg-8"
                    data-testid="zuordnung-edit-button"
                    :disabled="isEditPersonMetadataActive"
                    :block="mdAndDown"
                    @click="triggerEdit"
                  >
                    {{ t('edit') }}
                  </v-btn>
                </SpshTooltip>
              </v-col>
            </div>
          </v-col>
        </template>
      </v-row>
    </v-container>
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
          <v-col
            v-for="zuordnung in zuordnungenWithPendingChanges?.filter((zuordnung: Zuordnung) => zuordnung.editable)"
            :key="zuordnung.sskId"
            cols="12"
            :md="hasPendingChange ? '12' : '7'"
            :data-testid="`person-zuordnung-${zuordnung.sskId}`"
            :title="zuordnung.sskName"
            class="py-0 d-flex align-items-center"
          >
            <template v-if="!hasPendingChange">
              <div class="mb-n4 checkbox-top-align">
                <v-checkbox
                  :ref="`checkbox-zuordnung-${zuordnung.sskId}`"
                  v-model="selectedZuordnungen"
                  :value="zuordnung"
                >
                  <template #label>
                    <PersonenkontextItem
                      :zuordnung="zuordnung"
                      :no-margin="true"
                    />
                  </template>
                </v-checkbox>
              </div>
            </template>
            <!-- Template to show when the creation of a Zuordnung is pending -->
            <template v-else-if="pendingCreation && !pendingDeletion">
              <PersonenkontextItem
                :pending-state="
                  newZuordnung && zuordnung.sskId === newZuordnung.sskId && zuordnung.rolleId === newZuordnung.rolleId
                    ? PendingState.CREATED
                    : undefined
                "
                :zuordnung="zuordnung"
              />
            </template>
            <!-- Template to show when the deletion of a Zuordnung is pending -->
            <template v-else-if="pendingDeletion">
              <PersonenkontextItem
                :pending-state="selectedZuordnungen.includes(zuordnung) ? PendingState.DELETED : undefined"
                :zuordnung="zuordnung"
              />
            </template>
            <!-- Template to show when the change Klasse is pending -->
            <template v-else-if="pendingChangeKlasse">
              <div class="d-flex flex-column">
                <PersonenkontextItem
                  :pending-state="selectedZuordnungen.includes(zuordnung) ? PendingState.DELETED : undefined"
                  :zuordnung="zuordnung"
                />

                <PersonenkontextItem
                  v-if="
                    newZuordnung && zuordnung.sskId === newZuordnung.sskId && zuordnung.rolleId === newZuordnung.rolleId
                  "
                  :pending-state="PendingState.CREATED"
                  :zuordnung="newZuordnung"
                />
              </div>
            </template>
            <!-- Template to show when the change Befristung is pending -->
            <template v-else-if="pendingChangeBefristung">
              <div class="d-flex flex-column">
                <PersonenkontextItem
                  v-if="selectedZuordnungen.includes(zuordnung)"
                  :pending-state="PendingState.DELETED"
                  :zuordnung="zuordnung"
                  :show-unlimited-befristung="true"
                  :hide-pending-label="true"
                />
                <PersonenkontextItem
                  v-else
                  :zuordnung="zuordnung"
                  :show-unlimited-befristung="true"
                />
                <PersonenkontextItem
                  v-if="
                    newZuordnung && zuordnung.sskId === newZuordnung.sskId && zuordnung.rolleId === newZuordnung.rolleId
                  "
                  :pending-state="PendingState.CREATED"
                  :zuordnung="newZuordnung"
                  :show-unlimited-befristung="true"
                  :hide-pending-label="true"
                />
              </div>
            </template>
          </v-col>
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
              v-model:selected-klasse="selectedKlasse"
              :person-id="props.personId"
              :rollenart-for-person="existingRollenArt"
              :operation-context="OperationContext.PERSON_BEARBEITEN"
              :allow-multiple-rollen="false"
              :show-headline="false"
              :organisationen="organisationen"
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
              @update:selected-klasse-object="(klasse: Organisation | undefined) => (selectedKlasseObject = klasse)"
              @field-reset="handleFieldReset($event)"
            />
            <KopersInput
              v-if="
                !hasKopersNummer && isKopersRolle([selectedRolle as string], filteredRollen) && selectedOrganisation
              "
              v-model:selected-kopers-nr="selectedKopersNr"
              :has-no-kopers-nr="hasNoKopersNr"
              :selected-kopers-nr-props="selectedKopersNrProps"
              @update:selected-kopers-nr="(value?: string | undefined) => (selectedKopersNr = value)"
              @update:has-no-kopers-nr="(value: boolean | undefined) => (hasNoKopersNr = value)"
            />
          </v-container>
          <v-row class="py-3 px-2 justify-center">
            <v-spacer class="hidden-sm-and-down" />
            <v-col
              cols="12"
              sm="6"
              md="auto"
            >
              <v-btn
                :block="mdAndDown"
                class="secondary"
                data-testid="zuordnung-creation-discard-button"
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
              <v-btn
                :block="mdAndDown"
                :disabled="!canCommit || personenkontextStore.loading"
                class="primary"
                data-testid="zuordnung-creation-submit-button"
                type="submit"
              >
                {{ t('person.addZuordnung') }}
              </v-btn>
            </v-col>
          </v-row>
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
              @update:selected-new-klasse-object="handleSelectedNewKlasseObject"
            />
          </v-container>
          <v-row class="py-3 px-2 justify-center">
            <v-spacer class="hidden-sm-and-down" />
            <v-col
              cols="12"
              sm="6"
              md="auto"
            >
              <v-btn
                :block="mdAndDown"
                class="secondary"
                data-testid="klasse-change-discard-button"
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
            </v-col>
          </v-row>
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
          <v-row class="py-3 px-2 justify-center">
            <v-spacer class="hidden-sm-and-down" />
            <v-col
              cols="12"
              sm="6"
              md="auto"
            >
              <v-btn
                :block="mdAndDown"
                class="secondary"
                data-testid="change-befristung-discard-button"
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
            </v-col>
          </v-row>
        </v-form>
      </template>
    </v-container>

    <!-- Success Dialog after deleting the Zuordnung-->
    <v-dialog
      v-model="deleteSuccessDialogVisible"
      persistent
      max-width="600px"
    >
      <LayoutCard
        :closable="true"
        :header="t('person.editZuordnungen')"
        @on-close-clicked="closeDeleteSuccessDialog"
      >
        <v-card-text>
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
                data-testId="close-zuordnung-delete-success-button"
                @click.stop="closeDeleteSuccessDialog"
              >
                {{ t('close') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </v-dialog>
    <!-- Success Dialog after creating the Zuordnung-->
    <v-dialog
      v-model="createSuccessDialogVisible"
      persistent
      max-width="600px"
    >
      <LayoutCard
        :closable="true"
        :header="t('person.editZuordnungen')"
        @on-close-clicked="closeCreateSuccessDialog"
      >
        <v-card-text>
          <v-container>
            <v-row class="text-body bold px-md-16">
              <v-col class="text-center">
                <span>{{ t('person.addZuordnungSuccess') }}</span>
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
                data-testId="close-zuordnung-create-success-button"
                @click.stop="closeCreateSuccessDialog"
              >
                {{ t('close') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </v-dialog>
    <!-- Success Dialog after chagning the name of the Klasse-->
    <v-dialog
      v-model="changeKlasseSuccessDialogVisible"
      persistent
      max-width="600px"
    >
      <LayoutCard
        :closable="true"
        :header="t('transfer')"
        @on-close-clicked="closeChangeKlasseSuccessDialog"
      >
        <v-card-text>
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
                data-testid="change-klasse-success-dialog-close-button"
                @click.stop="closeChangeKlasseSuccessDialog"
              >
                {{ t('close') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </v-dialog>
    <!-- Success Dialog after changing Befristung-->
    <v-dialog
      v-model="changeBefristungSuccessDialogVisible"
      persistent
      max-width="600px"
    >
      <LayoutCard
        :closable="true"
        :header="t('person.changeBefristung')"
        @on-close-clicked="closeChangeBefristungSuccessDialog"
      >
        <v-card-text>
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
                data-testid="change-befristung-success-dialog-close-button"
                @click.stop="closeChangeBefristungSuccessDialog"
              >
                {{ t('close') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </v-dialog>
    <!-- Confirmation Dialog after filling the form and adding the Zuordnung-->
    <v-dialog
      v-model="createZuordnungConfirmationDialogVisible"
      persistent
      max-width="600px"
    >
      <LayoutCard
        :closable="true"
        :header="t('person.editZuordnungen')"
        @on-close-clicked="cancelAddition"
      >
        <v-card-text>
          <v-container>
            <v-row class="text-body bold justify-center">
              <v-col
                class="text-center"
                cols="10"
              >
                <span>{{ createZuordnungConfirmationDialogMessage }}</span>
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
                data-testid="confirm-zuordnung-dialog-addition"
                @click.stop="confirmDialogAddition"
              >
                {{ t('yes') }}
              </v-btn>
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="mdAndDown"
                class="secondary"
                @click.stop="cancelAddition"
              >
                {{ t('no') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </v-dialog>
    <!-- Confirmation Dialog after filling the form to change Klasse-->
    <v-dialog
      v-model="changeKlasseConfirmationDialogVisible"
      persistent
      max-width="600px"
    >
      <LayoutCard
        :closable="true"
        :header="t('transfer')"
        @on-close-clicked="cancelChangeKlasse"
      >
        <v-card-text>
          <v-container>
            <v-row class="text-body text-center bold">
              <v-col cols="12">
                <span data-testid="change-klasse-confirmation-dialog-text">{{
                  changeKlasseConfirmationDialogMessage
                }}</span>
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
                @click.stop="cancelChangeKlasse"
              >
                {{ t('no') }}
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
                data-testid="confirm-change-klasse-button"
                @click.stop="confirmDialogChangeKlasse"
              >
                {{ t('yes') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </v-dialog>
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
    <!-- Confirmation Dialog after filling the form to change Befristung -->
    <v-dialog
      v-model="changeBefristungConfirmationDialogVisible"
      persistent
      max-width="600px"
    >
      <LayoutCard
        :closable="true"
        :header="t('person.editZuordnungen')"
        @on-close-clicked="cancelChangeBefristung"
      >
        <v-card-text>
          <v-container>
            <v-row class="text-body bold justify-center">
              <v-col
                class="text-center"
                cols="10"
              >
                <span>{{ changeBefristungConfirmationDialogMessage }}</span>
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
                @click.stop="cancelChangeBefristung"
              >
                {{ t('no') }}
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
                data-testid="confirm-change-befristung-button"
                @click.stop="confirmDialogChangeBefristung"
              >
                {{ t('yes') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </v-dialog>

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
