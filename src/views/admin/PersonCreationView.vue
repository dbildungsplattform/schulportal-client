<script setup lang="ts">
  import KopersInput from '@/components/admin/personen/KopersInput.vue';
  import PersonenkontextCreate from '@/components/admin/personen/PersonenkontextCreate.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import FormRow from '@/components/form/FormRow.vue';
  import FormWrapper from '@/components/form/FormWrapper.vue';
  import PasswordOutput from '@/components/form/PasswordOutput.vue';
  import { useOrganisationen } from '@/composables/useOrganisationen';
  import { type Organisation, type OrganisationStore, useOrganisationStore } from '@/stores/OrganisationStore';
  import {
    type DBiamPersonenkontextResponse,
    OperationContext,
    type PersonenkontextStore,
    type PersonenkontextUpdate,
    usePersonenkontextStore,
  } from '@/stores/PersonenkontextStore';
  import {
    type CreatePersonBodyParams,
    type PersonLandesbediensteterSearchResponse,
    type PersonStore,
    usePersonStore,
  } from '@/stores/PersonStore';
  import { RollenArt, RolleStore, TranslatedRolleWithAttrs, useRolleStore } from '@/stores/RolleStore';
  import type { Zuordnung } from '@/stores/types/Zuordnung';
  import { type TranslatedObject } from '@/types.d';
  import { type BefristungUtilsType, isBefristungspflichtRolle, useBefristungUtils } from '@/utils/befristung';
  import { formatDateToISO, getNextSchuljahresende, isValidDate, notInPast } from '@/utils/date';
  import { DDMMYYYY, DIN_91379A, NO_LEADING_TRAILING_SPACES } from '@/utils/validation';
  import { isKopersRolle } from '@/utils/validationPersonenkontext';
  import { toTypedSchema } from '@vee-validate/yup';
  import { type BaseFieldProps, type FormContext, type TypedSchema, useForm } from 'vee-validate';
  import { computed, type ComputedRef, onMounted, onUnmounted, ref, type Ref, watch, watchEffect } from 'vue';
  import { type Composer, useI18n } from 'vue-i18n';
  import {
    type NavigationGuardNext,
    onBeforeRouteLeave,
    type RouteLocationNormalized,
    type Router,
    useRoute,
    useRouter,
  } from 'vue-router';
  import { useDisplay } from 'vuetify';
  import { type AnyObject, array, ArraySchema, object, string, StringSchema } from 'yup';

  const { mdAndDown, mdAndUp }: { mdAndDown: Ref<boolean>; mdAndUp: Ref<boolean> } = useDisplay();

  const route: RouteLocationNormalized = useRoute();

  const router: Router = useRouter();
  const personStore: PersonStore = usePersonStore();
  const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
  const rolleStore: RolleStore = useRolleStore();
  const { t }: Composer = useI18n({ useScope: 'global' });

  const showUnsavedChangesDialog: Ref<boolean> = ref(false);
  let blockedNext: () => void = () => {
    /* empty */
  };

  const canCommit: Ref<boolean> = ref(false);
  const hasNoKopersNr: Ref<boolean | undefined> = ref(false);
  const showNoKopersNrConfirmationDialog: Ref<boolean> = ref(false);
  const showAddPersonConfirmationDialog: Ref<boolean> = ref(false);
  const addPersonConfirmationText: Ref<string> = ref('');
  const isUnbefristetButtonDisabled: Ref<boolean, boolean> = ref(false);

  const calculatedBefristung: Ref<string | undefined> = ref('');

  const selectedOrgaCache: Ref<string | undefined> = ref(undefined);
  const selectedKlasseCache: Ref<TranslatedObject | undefined> = ref(undefined);
  const selectedRolleCache: Ref<string[] | undefined> = ref(undefined);

  const filteredRollen: Ref<TranslatedRolleWithAttrs[] | undefined> = ref<TranslatedRolleWithAttrs[] | undefined>([]);
  const filteredRollenCache: Ref<TranslatedRolleWithAttrs[] | undefined> = ref<TranslatedRolleWithAttrs[] | undefined>(
    [],
  );

  const hasPreFilled: Ref<boolean> = ref(false);

  enum CreationType {
    Limited = 'limited',
    Full = 'full',
    AddPersonToOwnSchule = 'add-person-to-own-schule',
  }

  type LabelConfig = {
    createAnotherButtonLabel: string;
    createButtonLabel: string;
    discardButtonLabel: string;
    headerLabel: string;
    layoutCardLabel: string;
    layoutCardHeadlineTestId: string;
  };

  const labelConfig: Record<CreationType, LabelConfig> = {
    [CreationType.Limited]: {
      createAnotherButtonLabel: t('admin.person.stateEmployeeSearch.createAnotherPerson'),
      createButtonLabel: t('admin.person.stateEmployeeSearch.createPerson'),
      discardButtonLabel: t('cancel'),
      headerLabel: t('admin.person.stateEmployeeSearch.anotherPerson'),
      layoutCardLabel: t('admin.person.stateEmployeeSearch.anotherPerson'),
      layoutCardHeadlineTestId: 'add-another-state-employee-headline',
    },
    [CreationType.AddPersonToOwnSchule]: {
      createAnotherButtonLabel: t('admin.person.stateEmployeeSearch.searchAnotherStateEmployee'),
      createButtonLabel: t('admin.person.stateEmployeeSearch.addStateEmployee'),
      discardButtonLabel: t('cancel'),
      headerLabel: t('admin.person.stateEmployeeSearch.searchAndAdd'),
      layoutCardLabel: t('admin.person.stateEmployeeSearch.addStateEmployee'),
      layoutCardHeadlineTestId: 'add-state-employee-headline',
    },
    [CreationType.Full]: {
      createAnotherButtonLabel: t('admin.person.createAnother'),
      createButtonLabel: t('admin.person.create'),
      discardButtonLabel: t('admin.person.discard'),
      headerLabel: t('admin.person.addNew'),
      layoutCardLabel: t('admin.person.addNew'),
      layoutCardHeadlineTestId: 'create-person-headline',
    },
  };

  // Determine the creation type based on the route meta in routes.ts
  const createType: ComputedRef<CreationType> = computed(() => {
    const metaCreateType: string = route.meta['createType'] as string;
    if (metaCreateType && Object.values(CreationType).includes(metaCreateType as CreationType)) {
      return metaCreateType as CreationType;
    } else {
      return CreationType.Full;
    }
  });

  // Define a method to check if the selected Rolle is of type "Lern"
  function isLernRolle(selectedRolleIds?: string[]): boolean | undefined {
    if (!Array.isArray(selectedRolleIds)) {
      return false;
    }

    const translatedRollenWithAttrs: Array<TranslatedRolleWithAttrs> =
      filteredRollen.value && filteredRollen.value.length > 0
        ? filteredRollen.value
        : (filteredRollenCache.value ?? []);

    return translatedRollenWithAttrs.some(
      (rolle: TranslatedRolleWithAttrs) => selectedRolleIds.includes(rolle.value) && rolle.rollenart === RollenArt.Lern,
    );
  }

  const headerLabel: Ref<string> = ref(t('admin.person.addNew'));
  const layoutCardLabel: Ref<string> = ref(t('admin.person.addNew'));
  const layoutCardHeadlineTestId: Ref<string> = ref('create-person-headline');
  const createButtonLabel: Ref<string> = ref(t('admin.person.create'));
  const discardButtonLabel: Ref<string> = ref(t('admin.person.discard'));
  const createAnotherButtonLabel: Ref<string> = ref(t('admin.person.createAnother'));

  // Extract the befristung validation into a reusable function
  const createBefristungValidation = (): StringSchema => {
    return string()
      .test('notInPast', t('admin.befristung.rules.pastDateNotAllowed'), notInPast)
      .test('isValidDate', t('admin.befristung.rules.invalidDateNotAllowed'), isValidDate)
      .matches(DDMMYYYY, t('admin.befristung.rules.format'))
      .test('conditionalRequired', t('admin.befristung.rules.required'), async function (value: string | undefined) {
        const {
          selectedRollen,
          selectedBefristungOption,
        }: { selectedRollen: string[]; selectedBefristungOption: string | undefined } = this.parent as {
          selectedRollen: string[];
          selectedBefristungOption: string | undefined;
        };

        // If befristungOption is defined, befristung is not required
        if (selectedBefristungOption !== undefined) {
          return true;
        }

        // If no roles selected, not required
        if (Array.isArray(selectedRollen) && selectedRollen.length === 0) {
          return true;
        }

        const isBefristungspflichtig: boolean = await isBefristungspflichtRolle(selectedRollen);

        return !(isBefristungspflichtig && !value);
      });
  };

  const validationSchema: TypedSchema = toTypedSchema(
    object({
      selectedRollen: array(string().required(t('admin.rolle.rules.rolle.required'))).when('selectedOrganisation', {
        is: (selectedOrganisation: string) => !!selectedOrganisation,
        then: (schema: ArraySchema<string[] | undefined, AnyObject, undefined, ''>) =>
          schema.min(1, t('admin.rolle.rules.rolle.required')).required(t('admin.rolle.rules.rolle.required')),
      }),
      selectedVorname: string()
        .matches(DIN_91379A, t('admin.person.rules.vorname.matches'))
        .matches(NO_LEADING_TRAILING_SPACES, t('admin.person.rules.vorname.noLeadingTrailingSpaces'))
        .min(2, t('admin.person.rules.vorname.min'))
        .required(t('admin.person.rules.vorname.required')),
      selectedFamilienname: string()
        .matches(DIN_91379A, t('admin.person.rules.familienname.matches'))
        .matches(NO_LEADING_TRAILING_SPACES, t('admin.person.rules.familienname.noLeadingTrailingSpaces'))
        .min(2, t('admin.person.rules.familienname.min'))
        .required(t('admin.person.rules.familienname.required')),
      selectedOrganisation: string().required(t('admin.organisation.rules.organisation.required')),
      selectedKlasse: string().when('selectedRollen', {
        is: (selectedRolleIds: string[]) => isLernRolle(selectedRolleIds),
        then: (schema: StringSchema<string | undefined, AnyObject, undefined, ''>) =>
          schema.required(t('admin.klasse.rules.klasse.required')),
      }),
      selectedKopersNr: string()
        .matches(NO_LEADING_TRAILING_SPACES, t('admin.person.rules.kopersNr.noLeadingTrailingSpaces'))
        .when('selectedRollen', {
          is: (selectedRolleIds: string[]) =>
            isKopersRolle(selectedRolleIds, filteredRollen.value) && !hasNoKopersNr.value,
          then: (schema: StringSchema<string | undefined, AnyObject, undefined, ''>) =>
            schema.required(t('admin.person.rules.kopersNr.required')),
        }),
      // Use the extracted befristung validation
      selectedBefristung: createBefristungValidation(),
    }),
  );

  const vuetifyConfig = (state: {
    errors: Array<string>;
  }): { props: { error: boolean; 'error-messages': Array<string> } } => ({
    props: {
      error: !!state.errors.length,
      'error-messages': state.errors,
    },
  });

  type PersonCreationForm = {
    selectedOrganisation: string;
    selectedRollen: string[];
    selectedVorname: string;
    selectedFamilienname: string;
    selectedKlasse: string;
    selectedBefristung: Date;
    selectedBefristungOption: string;
    selectedKopersNr: string;
  };

  const formContext: FormContext<PersonCreationForm, PersonCreationForm> = useForm<PersonCreationForm>({
    validationSchema,
  });

  const [selectedOrganisation, selectedOrganisationProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedOrganisation', vuetifyConfig);
  const [selectedRollen, selectedRollenProps]: [
    Ref<string[] | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedRollen', vuetifyConfig);
  const [selectedVorname, selectedVornameProps]: [
    Ref<string>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedVorname', vuetifyConfig);
  const [selectedFamilienname, selectedFamiliennameProps]: [
    Ref<string>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedFamilienname', vuetifyConfig);
  const [selectedKlasse, selectedKlasseProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedKlasse', vuetifyConfig);
  const [selectedBefristung, selectedBefristungProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedBefristung', vuetifyConfig);
  const [selectedBefristungOption, selectedBefristungOptionProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedBefristungOption', vuetifyConfig);
  const [selectedKopersNr, selectedKopersNrProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedKopersNr', vuetifyConfig);

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
    selectedRollen,
  });

  setupWatchers();
  setupRolleWatcher();

  const organisationen: ComputedRef<TranslatedObject[] | undefined> = useOrganisationen();
  const organisationStore: OrganisationStore = useOrganisationStore();

  // Extract the created Klassenzuordnungen from the response after submission
  const klasseZuordnungFromCreatedKontext: ComputedRef<DBiamPersonenkontextResponse[]> = computed(() => {
    if (!personenkontextStore.createdPersonWithKontext) {
      return [];
    }

    return personenkontextStore.createdPersonWithKontext.dBiamPersonenkontextResponses.filter(
      (kontext: DBiamPersonenkontextResponse) =>
        kontext.organisationId === selectedKlasseCache.value?.value &&
        selectedRolleCache.value?.includes(kontext.rolleId),
    );
  });

  // Extract the created Kontext responses based on the createType
  const createdKontextResponses: ComputedRef<DBiamPersonenkontextResponse[]> = computed(() => {
    if (createType.value === CreationType.AddPersonToOwnSchule) {
      return personenkontextStore.landesbediensteteCommitResponse?.dBiamPersonenkontextResponses ?? [];
    }
    return personenkontextStore.createdPersonWithKontext?.dBiamPersonenkontextResponses ?? [];
  });

  const schuleZuordnungFromCreatedKontext: ComputedRef<DBiamPersonenkontextResponse[]> = computed(() => {
    return createdKontextResponses.value.filter(
      (kontext: DBiamPersonenkontextResponse) =>
        kontext.organisationId === selectedOrgaCache.value && selectedRolleCache.value?.includes(kontext.rolleId),
    );
  });

  // We extract the first Organisation since all of the Kontexte have the same one
  const translatedOrganisationsname: ComputedRef<string> = computed(() => {
    if (!schuleZuordnungFromCreatedKontext.value.length) {
      return '';
    }

    const organisationId: string | undefined = schuleZuordnungFromCreatedKontext.value[0]?.organisationId;

    return (
      organisationen.value?.find((organisation: TranslatedObject) => organisation.value === organisationId)?.title || ''
    );
  });

  // Extract all the Rollennamen
  const translatedRollenname: ComputedRef<string[]> = computed(() => {
    if (!schuleZuordnungFromCreatedKontext.value.length) {
      return [];
    }

    return schuleZuordnungFromCreatedKontext.value.map(
      (kontext: DBiamPersonenkontextResponse) =>
        rolleStore.rollenForPersonenkontextCreation?.find(
          (rolle: TranslatedRolleWithAttrs) => rolle.value === kontext.rolleId,
        )?.title || '',
    );
  });

  // Converts the ISO UTC formatted Befristung to the german local format, also ISO.
  const translatedBefristung: ComputedRef<string> = computed(() => {
    const zuordnungList: DBiamPersonenkontextResponse[] = schuleZuordnungFromCreatedKontext.value;
    const ISOFormattedDate: string | null | undefined = zuordnungList[0]?.befristung;

    if (!ISOFormattedDate) {
      return t('admin.befristung.unlimitedLower');
    }

    const utcDate: Date = new Date(ISOFormattedDate);

    // Adjust for German summer time (MESZ = UTC+2)
    const isGermanSummerTime: boolean = utcDate.getTimezoneOffset() === -120;
    if (isGermanSummerTime) {
      utcDate.setDate(utcDate.getDate() - 1);
    }

    return utcDate.toLocaleDateString('de-DE');
  });

  const creationErrorText: Ref<string> = ref('');

  function isFormDirty(): boolean {
    return (
      (organisationen.value?.length !== 1 && formContext.isFieldDirty('selectedOrganisation')) ||
      formContext.isFieldDirty('selectedRollen') ||
      formContext.isFieldDirty('selectedKlasse') ||
      formContext.isFieldDirty('selectedKopersNr') ||
      formContext.isFieldDirty('selectedVorname') ||
      formContext.isFieldDirty('selectedFamilienname') ||
      formContext.isFieldDirty('selectedBefristung')
    );
  }

  async function navigateToPersonTable(): Promise<void> {
    if (
      personStore.errorCode === 'REQUIRED_STEP_UP_LEVEL_NOT_MET' ||
      personenkontextStore.errorCode === 'REQUIRED_STEP_UP_LEVEL_NOT_MET'
    ) {
      formContext.resetForm();
    }
    await router.push({ name: 'person-management' });
  }

  async function navigateToPersonDetails(): Promise<void> {
    const personId: string | undefined =
      createType.value === CreationType.AddPersonToOwnSchule
        ? personenkontextStore.landesbediensteteCommitResponse?.dBiamPersonenkontextResponses[0]?.personId
        : personenkontextStore.createdPersonWithKontext?.person.id;

    if (personId) {
      await router.push({
        name: 'person-details',
        params: { id: personId },
      });
    }
  }

  function handleFieldReset(field: string): void {
    if (field === 'selectedRollen') {
      selectedRollen.value = undefined;
    } else if (field === 'selectedKlasse') {
      if (selectedKlasse.value) {
        selectedKlasse.value = undefined;
      }
    }
  }

  async function createPerson(): Promise<void> {
    const befristungDate: string | undefined = selectedBefristung.value
      ? selectedBefristung.value
      : calculatedBefristung.value;

    // Format the date in ISO 8601 format if it exists
    const formattedBefristung: string | undefined = befristungDate ? formatDateToISO(befristungDate) : undefined;

    // This is used to cache the filtered Rollen to use for isLernRolle and isKopersRolle in the success template
    filteredRollenCache.value = filteredRollen.value;

    const bodyParams: CreatePersonBodyParams = {
      familienname: selectedFamilienname.value,
      vorname: selectedVorname.value,
      personalnummer: selectedKopersNr.value,
      befristung: formattedBefristung,
      createPersonenkontexte:
        selectedRollen.value?.map((rolleId: string) => ({
          organisationId: selectedOrganisation.value as string,
          rolleId,
        })) || [],
    };
    // Klasse is only allowed if the selectedRolle is of type LERN.
    if (
      selectedKlasse.value &&
      selectedRollen.value &&
      selectedRollen.value.length > 0 &&
      isLernRolle(selectedRollen.value)
    ) {
      selectedKlasseCache.value = {
        value: selectedKlasse.value,
        title:
          organisationStore.klassenFilters
            .get('personenkontext-create')
            ?.filterResult.find((klasse: Organisation) => klasse.id === selectedKlasse.value)?.name || '',
      };
      for (const rolleId of selectedRollen.value) {
        bodyParams.createPersonenkontexte.push({
          organisationId: selectedKlasse.value,
          rolleId: rolleId,
        });
      }
    }
    // We save a copy of the selected values because they are not available anymore since we reset the form right after submitting
    // This will then be used to display the organisation again in the success template after receiving the orga ID and rolle ID back from the BE.
    selectedOrgaCache.value = JSON.parse(JSON.stringify(selectedOrganisation.value)) as string | undefined;
    selectedRolleCache.value = JSON.parse(JSON.stringify(selectedRollen.value)) as string[] | undefined;
    await personenkontextStore.createPersonWithKontexte(bodyParams);
    formContext.resetForm();
    hasNoKopersNr.value = false;
    filteredRollen.value = [];
    // Reset canCommit to false after creating the personto avoid issues when going back to the form
    if (personenkontextStore.workflowStepResponse) {
      personenkontextStore.workflowStepResponse.canCommit = false;
    }
  }

  async function addPersonToOwnSchule(): Promise<void> {
    showAddPersonConfirmationDialog.value = false;
    // Only adding Kontext to existing person
    const existingPerson: PersonLandesbediensteterSearchResponse | undefined =
      personStore.allLandesbedienstetePersonen?.[0];

    if (!existingPerson) {
      return;
    }
    const personId: string = existingPerson.id;
    // Get latest person data
    await personStore.getPersonenuebersichtById(personId);

    const befristungDate: string | undefined = selectedBefristung.value || calculatedBefristung.value;
    const formattedBefristung: string | undefined = befristungDate ? formatDateToISO(befristungDate) : undefined;

    const newKontexte: PersonenkontextUpdate[] | undefined = selectedRollen.value?.map((rolleId: string) => ({
      organisationId: selectedOrganisation.value as string,
      rolleId: rolleId,
      befristung: formattedBefristung,
    }));

    selectedOrgaCache.value = selectedOrganisation.value;
    selectedRolleCache.value = selectedRollen.value;
    await personenkontextStore.commitLandesbediensteteKontext(personId, newKontexte, existingPerson.personalnummer);
    formContext.resetForm();
    filteredRollen.value = [];
  }

  const onSubmit: (e?: Event) => Promise<Promise<void> | undefined> = formContext.handleSubmit(async () => {
    if (createType.value === CreationType.AddPersonToOwnSchule) {
      const existingPerson: PersonLandesbediensteterSearchResponse | undefined =
        personStore.allLandesbedienstetePersonen?.[0];
      const username: string | undefined = existingPerson?.username;
      addPersonConfirmationText.value = t('admin.person.stateEmployeeSearch.addPersonConfirmationMessage', {
        benutzername: `${username}`,
        rollenname: selectedRollen.value
          ?.map(
            (rolleId: string) =>
              filteredRollen.value?.find((rolle: TranslatedRolleWithAttrs) => rolle.value === rolleId)?.title,
          )
          .filter(Boolean)
          .join(', '),
      });
      showAddPersonConfirmationDialog.value = true;
    } else {
      await createPerson();
    }
  });

  function navigateToCreatePersonRoute(reload: boolean = false): void | Promise<void> {
    let routeName: string;

    if (createType.value === CreationType.AddPersonToOwnSchule) {
      routeName = 'search-person-limited';
    } else {
      routeName = createType.value === CreationType.Limited ? 'create-person-limited' : 'create-person';
    }

    if (reload) {
      return router.push({ name: routeName }).then(() => router.go(0));
    } else {
      router.push({ name: routeName });
    }
  }

  async function navigateBackToPersonForm(): Promise<void> {
    if (
      personStore.errorCode === 'REQUIRED_STEP_UP_LEVEL_NOT_MET' ||
      personenkontextStore.errorCode === 'REQUIRED_STEP_UP_LEVEL_NOT_MET'
    ) {
      formContext.resetForm();
      await navigateToCreatePersonRoute(true);
    } else {
      personenkontextStore.errorCode = '';
      personStore.errorCode = '';
      navigateToCreatePersonRoute();
    }
  }

  const createAnotherButtonTestId: ComputedRef<string> = computed(() =>
    createType.value === CreationType.AddPersonToOwnSchule
      ? 'search-another-state-employee-button'
      : 'create-another-person-button',
  );

  const handleCreateAnotherPerson = (): void => {
    personenkontextStore.createdPersonWithKontext = null;
    personenkontextStore.landesbediensteteCommitResponse = null;
    formContext.resetForm();
    hasNoKopersNr.value = false;
    // Re-trigger the watchers after resetting the form to auto-select the Befristung since the component isn't remounted
    // Because we navigate to the same route.
    setupWatchers();
    navigateToCreatePersonRoute();
  };

  const isOwnSchule: ComputedRef<boolean> = computed(() => createType.value === CreationType.AddPersonToOwnSchule);

  // Section numbers based on whether the createType is AddPersonToOwnSchule or not.
  const sectionNumberOrg: ComputedRef<string> = computed(() => (isOwnSchule.value ? '2.' : '1.'));
  const sectionNumberRolle: ComputedRef<string> = computed(() => (isOwnSchule.value ? '3.' : '2.'));
  const sectionNumberBefristung: ComputedRef<string> = computed(() => (isOwnSchule.value ? '4.' : '2.1'));

  // Watch the selectedRollen and update filteredRollen accordingly
  watch(
    selectedRollen,
    (newSelectedRollen: string[] | undefined) => {
      // Decide which rollen list to use based on createType
      const baseRollen: TranslatedRolleWithAttrs[] | undefined =
        createType.value === CreationType.AddPersonToOwnSchule
          ? filteredRollen.value
          : rolleStore.rollenForPersonenkontextCreation;

      if (newSelectedRollen && newSelectedRollen.length > 0) {
        const selectedRollenart: RollenArt | undefined = baseRollen?.find((rolle: TranslatedRolleWithAttrs) =>
          newSelectedRollen.includes(rolle.value),
        )?.rollenart;

        filteredRollen.value =
          baseRollen?.filter((rolle: TranslatedRolleWithAttrs) => rolle.rollenart === selectedRollenart) || [];
        // If no roles are selected, reset the filteredRollen to the normal rollen list and for createType AddPersonToOwnSchule nothing happens because the rollen are always filtered
      } else if (
        newSelectedRollen &&
        newSelectedRollen.length === 0 &&
        createType.value !== CreationType.AddPersonToOwnSchule
      ) {
        filteredRollen.value = [];
      }
    },
    { immediate: true },
  );

  // Watch the rollen and update filteredRollen based on selectedRollen... This is necessary to ensure that the filteredRollen are always in sync while the user is searching.
  watch(
    () => rolleStore.rollenForPersonenkontextCreation,
    async (newRollen: TranslatedRolleWithAttrs[]) => {
      if (!newRollen) {
        filteredRollen.value = [];
        return;
      }

      // AddPersonToOwnSchule: only show Lehr roles for that createType
      if (createType.value === CreationType.AddPersonToOwnSchule) {
        const existingPerson: PersonLandesbediensteterSearchResponse | undefined =
          personStore.allLandesbedienstetePersonen?.[0];
        const personId: string | undefined = existingPerson?.id;

        if (!personId) {
          return;
        }
        // Get latest person data
        await personStore.getPersonenuebersichtById(personId);
        const assignedRollenIds: Set<string> = new Set(
          personStore.personenuebersicht?.zuordnungen
            .filter((z: Zuordnung) => z.sskId === selectedOrganisation.value)
            .map((z: Zuordnung) => z.rolleId) || [],
        );
        filteredRollen.value = newRollen.filter(
          (rolle: TranslatedRolleWithAttrs) =>
            rolle.rollenart === RollenArt.Lehr && !assignedRollenIds.has(rolle.value),
        );
        return;
      }

      // Regular filtering based on selectedRollen
      if (!selectedRollen.value || selectedRollen.value.length === 0) {
        filteredRollen.value = newRollen;
      } else {
        const selectedRollenart: RollenArt | undefined = newRollen.find((rolle: TranslatedRolleWithAttrs) =>
          selectedRollen.value?.includes(rolle.value),
        )?.rollenart;

        filteredRollen.value = newRollen.filter(
          (rolle: TranslatedRolleWithAttrs) => rolle.rollenart === selectedRollenart,
        );
      }
    },
  );

  watch(hasNoKopersNr, (newValue: boolean | undefined) => {
    if (newValue) {
      showNoKopersNrConfirmationDialog.value = true;
    }
  });

  // This will auto-fill the fields with the Landesbediensteter found in the personStore when the createType is AddPersonToOwnSchule
  // hasPrefilled will ensure that this only happens once, even if the component is re-rendered. This avoid problems with this watch retriggering when the form is reset.
  watchEffect(() => {
    if (!hasPreFilled.value && createType.value === CreationType.AddPersonToOwnSchule) {
      const person: PersonLandesbediensteterSearchResponse | undefined = personStore.allLandesbedienstetePersonen?.[0];

      if (person) {
        selectedVorname.value = person.vorname;
        selectedFamilienname.value = person.familienname;
        selectedKopersNr.value = person.personalnummer;
        hasPreFilled.value = true;
      }
    }
  });

  watchEffect(async () => {
    isUnbefristetButtonDisabled.value = await isBefristungspflichtRolle(selectedRollen.value);
  });

  const successMessageKey: ComputedRef<string> = computed(() => {
    return createType.value === CreationType.Limited
      ? 'admin.person.createdSuccessfully'
      : 'admin.person.addedSuccessfully';
  });

  function handleConfirmUnsavedChanges(): void {
    blockedNext();
    personStore.errorCode = '';
    personenkontextStore.errorCode = '';
  }

  function preventNavigation(event: BeforeUnloadEvent): void {
    if (!isFormDirty()) {
      return;
    }
    event.preventDefault();
    /* Chrome requires returnValue to be set. */
    event.returnValue = '';
  }

  onBeforeRouteLeave((_to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    if (isFormDirty()) {
      showUnsavedChangesDialog.value = true;
      blockedNext = next;
    } else {
      next();
    }
  });

  watch(
    createType,
    (currentCreationType: CreationType) => {
      const config: LabelConfig = labelConfig[currentCreationType];
      createAnotherButtonLabel.value = config.createAnotherButtonLabel;
      createButtonLabel.value = config.createButtonLabel;
      discardButtonLabel.value = config.discardButtonLabel;
      headerLabel.value = config.headerLabel;
      layoutCardLabel.value = config.layoutCardLabel;
      layoutCardHeadlineTestId.value = config.layoutCardHeadlineTestId;
    },
    {
      immediate: true,
    },
  );

  onMounted(() => {
    personStore.errorCode = '';
    personenkontextStore.createdPersonWithKontext = null;
    personenkontextStore.landesbediensteteCommitResponse = null;
    /* listen for browser changes and prevent them when form is dirty */
    window.addEventListener('beforeunload', preventNavigation);
  });

  onUnmounted(() => {
    personenkontextStore.createdPersonWithKontext = null;
    personenkontextStore.landesbediensteteCommitResponse = null;
    window.removeEventListener('beforeunload', preventNavigation);
  });
</script>

<template>
  <div class="admin">
    <h1
      class="text-center headline"
      data-testid="admin-headline"
    >
      {{ headerLabel }}
    </h1>
    <LayoutCard
      :closable="!personenkontextStore.errorCode && !personStore.errorCode"
      :header="layoutCardLabel"
      :headlineTestId="layoutCardHeadlineTestId"
      @onCloseClicked="navigateToPersonTable"
      :padded="true"
      :showCloseText="true"
    >
      <!-- The form to create a new Person  -->
      <template
        v-if="!personenkontextStore.createdPersonWithKontext && !personenkontextStore.landesbediensteteCommitResponse"
      >
        <FormWrapper
          id="person-creation-form"
          :can-commit="canCommit"
          :confirm-unsaved-changes-action="handleConfirmUnsavedChanges"
          :create-button-label="createButtonLabel"
          :discard-button-label="discardButtonLabel"
          :hide-actions="!!personenkontextStore.errorCode || !!personStore.errorCode"
          :is-loading="personenkontextStore.loading"
          :on-discard="navigateToPersonTable"
          :on-submit="onSubmit"
          :show-unsaved-changes-dialog="showUnsavedChangesDialog"
          @on-show-dialog-change="(value?: boolean) => (showUnsavedChangesDialog = value || false)"
        >
          <!-- Error Message Display for error messages from the personenkontextStore -->
          <SpshAlert
            :model-value="!!personenkontextStore.errorCode"
            :type="'error'"
            :closable="false"
            :text="
              personenkontextStore.errorCode ? t(`admin.personenkontext.errors.${personenkontextStore.errorCode}`) : ''
            "
            :show-button="true"
            :button-text="$t('admin.person.backToCreatePerson')"
            :button-action="navigateBackToPersonForm"
            :title="
              personenkontextStore.errorCode ? t(`admin.personenkontext.title.${personenkontextStore.errorCode}`) : ''
            "
          />
          <!-- Error Message Display for error messages from the personStore -->
          <SpshAlert
            :model-value="!!personStore.errorCode"
            :title="$t('admin.person.creationErrorTitle')"
            :type="'error'"
            :closable="false"
            :show-button="true"
            :button-text="$t('admin.person.backToCreatePerson')"
            :button-action="navigateBackToPersonForm"
            :text="creationErrorText"
          />

          <template v-if="!personenkontextStore.errorCode && !personStore.errorCode">
            <!-- If AddPersonToOwnSchule: Persönliche Info first -->
            <template v-if="createType === CreationType.AddPersonToOwnSchule">
              <v-row>
                <h3
                  class="headline-3"
                  data-testid="personal-info-headline"
                >
                  1. {{ $t('admin.person.personalInfo') }}
                </h3>
              </v-row>
              <!-- Vorname -->
              <FormRow
                :error-label="selectedVornameProps['error']"
                label-for-id="add-person-vorname-input"
                :is-required="true"
                :label="$t('person.firstName')"
              >
                <v-text-field
                  id="add-person-vorname-input"
                  ref="vorname-input"
                  v-bind="selectedVornameProps"
                  v-model="selectedVorname"
                  clearable
                  data-testid="add-person-vorname-input"
                  density="compact"
                  :disabled="createType === CreationType.AddPersonToOwnSchule"
                  :placeholder="$t('person.enterFirstName')"
                  required="true"
                  variant="outlined"
                />
              </FormRow>

              <!-- Nachname -->
              <FormRow
                :error-label="selectedFamiliennameProps['error']"
                label-for-id="add-person-familienname-input"
                :is-required="true"
                :label="$t('person.lastName')"
              >
                <v-text-field
                  id="add-person-familienname-input"
                  ref="familienname-input"
                  v-bind="selectedFamiliennameProps"
                  v-model="selectedFamilienname"
                  clearable
                  data-testid="add-person-familienname-input"
                  density="compact"
                  :disabled="createType === CreationType.AddPersonToOwnSchule"
                  :placeholder="$t('person.enterLastName')"
                  required="true"
                  variant="outlined"
                />
              </FormRow>
              <KopersInput
                ref="kopers-input"
                v-model:selected-kopers-nr="selectedKopersNr"
                :is-disabled="createType === CreationType.AddPersonToOwnSchule"
                :has-no-kopers-nr="hasNoKopersNr"
                :selected-kopers-nr-props="selectedKopersNrProps"
                @update:selected-kopers-nr="(value?: string | undefined) => (selectedKopersNr = value)"
                @update:has-no-kopers-nr="(value: boolean | undefined) => (hasNoKopersNr = value)"
              />
              <!-- Organisation, Rolle, Klasse und Befristung zuordnen -->
              <PersonenkontextCreate
                ref="personenkontext-create"
                v-model:selected-organisation="selectedOrganisation"
                v-model:selected-rollen="selectedRollen"
                v-model:selected-klasse="selectedKlasse"
                :operation-context="OperationContext.PERSON_ANLEGEN"
                :allow-multiple-rollen="true"
                :create-type="createType"
                :show-headline="true"
                :organisationen="organisationen"
                :rollen="
                  createType === CreationType.AddPersonToOwnSchule || (filteredRollen?.length ?? 0) > 0
                    ? filteredRollen
                    : rolleStore.rollenForPersonenkontextCreation
                "
                :selected-organisation-props="selectedOrganisationProps"
                :selected-rollen-props="selectedRollenProps"
                :selected-klasse-props="selectedKlasseProps"
                :befristung-input-props="{
                  befristungProps: selectedBefristungProps,
                  befristungOptionProps: selectedBefristungOptionProps,
                  isUnbefristetDisabled: isUnbefristetButtonDisabled,
                  isBefristungRequired: isUnbefristetButtonDisabled,
                  nextSchuljahresende: getNextSchuljahresende(),
                  befristung: selectedBefristung,
                  befristungOption: selectedBefristungOption,
                }"
                :headline-numbers="{
                  org: sectionNumberOrg,
                  rolle: sectionNumberRolle,
                  befristung: sectionNumberBefristung,
                }"
                @update:canCommit="canCommit = $event"
                @update:befristung="handleBefristungUpdate($event)"
                @update:calculated-befristung-option="handleBefristungOptionUpdate($event)"
                @fieldReset="handleFieldReset($event)"
              />
            </template>
            <template v-else>
              <!-- Organisation, Rolle, Klasse und Befristung zuordnen -->
              <PersonenkontextCreate
                ref="personenkontext-create"
                v-model:selected-organisation="selectedOrganisation"
                v-model:selected-rollen="selectedRollen"
                v-model:selected-klasse="selectedKlasse"
                :operation-context="OperationContext.PERSON_ANLEGEN"
                :allow-multiple-rollen="true"
                :create-type="createType"
                :show-headline="true"
                :organisationen="organisationen"
                :rollen="
                  (filteredRollen?.length ?? 0) > 0 ? filteredRollen : rolleStore.rollenForPersonenkontextCreation
                "
                :selected-organisation-props="selectedOrganisationProps"
                :selected-rollen-props="selectedRollenProps"
                :selected-klasse-props="selectedKlasseProps"
                :befristung-input-props="{
                  befristungProps: selectedBefristungProps,
                  befristungOptionProps: selectedBefristungOptionProps,
                  isUnbefristetDisabled: isUnbefristetButtonDisabled,
                  isBefristungRequired: isUnbefristetButtonDisabled,
                  nextSchuljahresende: getNextSchuljahresende(),
                  befristung: selectedBefristung,
                  befristungOption: selectedBefristungOption,
                }"
                @update:can-commit="canCommit = $event"
                @update:befristung="handleBefristungUpdate($event)"
                @update:calculated-befristung-option="handleBefristungOptionUpdate($event)"
                @field-reset="handleFieldReset($event)"
              />
              <!-- Else: Default Order -->
              <div v-if="selectedOrganisation">
                <v-row>
                  <h3
                    class="headline-3"
                    data-testid="personal-info-headline"
                  >
                    3. {{ $t('admin.person.personalInfo') }}
                  </h3>
                </v-row>
                <!-- Vorname -->
                <FormRow
                  :error-label="selectedVornameProps['error']"
                  label-for-id="vorname-input"
                  :is-required="true"
                  :label="$t('person.firstName')"
                >
                  <v-text-field
                    id="vorname-input"
                    ref="vorname-input"
                    v-bind="selectedVornameProps"
                    v-model="selectedVorname"
                    clearable
                    data-testid="vorname-input"
                    density="compact"
                    :placeholder="$t('person.enterFirstName')"
                    required="true"
                    variant="outlined"
                  />
                </FormRow>

                <!-- Nachname -->
                <FormRow
                  :error-label="selectedFamiliennameProps['error']"
                  label-for-id="familienname-input"
                  :is-required="true"
                  :label="$t('person.lastName')"
                >
                  <v-text-field
                    id="familienname-input"
                    ref="familienname-input"
                    v-bind="selectedFamiliennameProps"
                    v-model="selectedFamilienname"
                    clearable
                    data-testid="familienname-input"
                    density="compact"
                    :placeholder="$t('person.enterLastName')"
                    required="true"
                    variant="outlined"
                  />
                </FormRow>
                <KopersInput
                  v-if="isKopersRolle(selectedRollen, filteredRollen) && selectedOrganisation"
                  ref="kopers-input"
                  v-model:selected-kopers-nr="selectedKopersNr"
                  :has-no-kopers-nr="hasNoKopersNr"
                  :selected-kopers-nr-props="selectedKopersNrProps"
                  @update:selected-kopers-nr="(value?: string | undefined) => (selectedKopersNr = value)"
                  @update:has-no-kopers-nr="(value: boolean | undefined) => (hasNoKopersNr = value)"
                />
              </div>
            </template>
          </template>
        </FormWrapper>
      </template>

      <!-- Result template on success after submit  -->
      <template
        v-if="
          personenkontextStore.createdPersonWithKontext && !personStore.errorCode && !personenkontextStore.errorCode
        "
      >
        <v-container>
          <v-row class="justify-center">
            <v-col
              class="subtitle-1"
              cols="auto"
            >
              <span data-testid="person-success-text">
                {{
                  t(successMessageKey, {
                    firstname: personenkontextStore.createdPersonWithKontext.person.name.vorname,
                    lastname: personenkontextStore.createdPersonWithKontext.person.name.familienname,
                  })
                }}
              </span>
            </v-col>
          </v-row>
          <v-row class="justify-center">
            <v-col cols="auto">
              <v-icon
                aria-hidden="true"
                color="#1EAE9C"
                data-testid="person-success-icon"
                icon="mdi-check-circle"
                small
              />
            </v-col>
          </v-row>
          <v-row class="justify-center">
            <v-col
              class="subtitle-2"
              cols="auto"
              data-testid="following-data-created-text"
            >
              {{ t('admin.followingDataCreated') }}
            </v-col>
          </v-row>
          <v-row>
            <v-col
              class="text-body bold text-right"
              data-testid="created-person-vorname-label"
            >
              {{ t('person.firstName') }}:
            </v-col>
            <v-col class="text-body"
              ><span data-testid="created-person-vorname">{{
                personenkontextStore.createdPersonWithKontext.person.name.vorname
              }}</span>
            </v-col>
          </v-row>
          <v-row>
            <v-col
              class="text-body bold text-right"
              data-testid="created-person-familienname-label"
            >
              {{ $t('person.lastName') }}:
            </v-col>
            <v-col class="text-body"
              ><span data-testid="created-person-familienname">{{
                personenkontextStore.createdPersonWithKontext.person.name.familienname
              }}</span>
            </v-col>
          </v-row>
          <v-row
            v-if="
              isKopersRolle(
                schuleZuordnungFromCreatedKontext.map((kontext: DBiamPersonenkontextResponse) => kontext.rolleId),
                filteredRollenCache,
              )
            "
          >
            <v-col
              :class="`${
                isKopersRolle(
                  schuleZuordnungFromCreatedKontext.map((kontext: DBiamPersonenkontextResponse) => kontext.rolleId),
                  filteredRollenCache,
                ) && personenkontextStore.createdPersonWithKontext.person.personalnummer
                  ? 'text-body bold text-right'
                  : 'text-body bold text-right text-red'
              }`"
              data-testid="created-person-kopersnr-label"
            >
              {{ t('person.kopersNr') }}:
            </v-col>
            <v-col
              :class="`${
                isKopersRolle(
                  schuleZuordnungFromCreatedKontext.map((kontext: DBiamPersonenkontextResponse) => kontext.rolleId),
                  filteredRollenCache,
                ) && personenkontextStore.createdPersonWithKontext.person.personalnummer
                  ? 'text-body'
                  : 'text-body text-red'
              }`"
            >
              <span data-testid="created-person-kopersnr">{{
                personenkontextStore.createdPersonWithKontext.person.personalnummer
                  ? personenkontextStore.createdPersonWithKontext.person.personalnummer
                  : t('missing')
              }}</span>
            </v-col>
          </v-row>
          <v-row>
            <v-col
              class="text-body bold text-right"
              data-testid="created-person-username-label"
            >
              {{ $t('person.userName') }}:
            </v-col>
            <v-col class="text-body">
              <span data-testid="created-person-username">{{
                personenkontextStore.createdPersonWithKontext.person.username
              }}</span>
            </v-col>
          </v-row>
          <v-row>
            <v-col
              class="text-body bold text-right pb-8"
              data-testid="created-person-start-password-label"
            >
              {{ $t('admin.person.startPassword') }}:
            </v-col>
            <v-col class="text-body bold">
              <p class="mb-4">
                {{ t('admin.person.startPasswordInfo') }}
              </p>
              <PasswordOutput
                :show-print-icon="true"
                :password="personenkontextStore.createdPersonWithKontext.person.startpasswort"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col
              class="text-body bold text-right"
              data-testid="created-person-organisation-label"
            >
              {{ $t('admin.organisation.organisation') }}:
            </v-col>
            <v-col class="text-body">
              <span data-testid="created-person-organisation">{{ translatedOrganisationsname }}</span>
            </v-col>
          </v-row>
          <v-row>
            <v-col
              class="text-body bold text-right"
              data-testid="created-person-rolle-label"
            >
              {{ $t('admin.rolle.rolle') }}:
            </v-col>
            <v-col class="text-body">
              <span data-testid="created-person-rolle">{{ translatedRollenname.join(', ') }}</span>
            </v-col>
          </v-row>
          <v-row>
            <v-col
              class="text-body bold text-right"
              data-testid="created-person-befristung-label"
            >
              {{ $t('admin.befristung.befristung') }}:
            </v-col>
            <v-col class="text-body"
              ><span data-testid="created-person-befristung">{{ translatedBefristung }}</span></v-col
            >
          </v-row>
          <v-row
            v-if="
              isLernRolle(
                klasseZuordnungFromCreatedKontext.map((kontext: DBiamPersonenkontextResponse) => kontext.rolleId),
              )
            "
          >
            <v-col
              class="text-body bold text-right"
              data-testid="created-person-klasse-label"
            >
              {{ $t('admin.klasse.klasse') }}:
            </v-col>
            <v-col class="text-body">
              <span data-testid="created-person-klasse">{{
                selectedKlasseCache ? selectedKlasseCache.title : '---'
              }}</span>
            </v-col>
          </v-row>
          <v-divider
            class="border-opacity-100 rounded my-6"
            color="#E5EAEF"
            thickness="6"
          />
          <v-row class="justify-end">
            <v-col
              cols="12"
              sm="6"
              md="auto"
            >
              <v-btn
                class="secondary"
                @click.stop="navigateToPersonDetails"
                data-testid="go-to-details-button"
                :block="mdAndDown"
              >
                {{ t('nav.toDetails') }}
              </v-btn>
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="auto"
            >
              <v-btn
                class="secondary"
                data-testid="back-to-list-button"
                :block="mdAndDown"
                @click.stop="navigateToPersonTable"
              >
                {{ t('nav.backToList') }}
              </v-btn>
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="auto"
            >
              <v-btn
                class="primary button"
                data-testid="create-another-person-button"
                :block="mdAndDown"
                @click="handleCreateAnotherPerson"
              >
                {{ createAnotherButtonLabel }}
              </v-btn>
            </v-col>
          </v-row>
        </v-container>
      </template>
      <!-- Result template on success after assigning the Landesbediensteter to a Schule   -->
      <template
        v-if="
          personenkontextStore.landesbediensteteCommitResponse !== null &&
          !personStore.errorCode &&
          !personenkontextStore.errorCode
        "
      >
        <v-container>
          <v-row class="justify-center">
            <v-col
              class="subtitle-1"
              cols="auto"
            >
              <span data-testid="state-employee-success-text">
                {{
                  t('admin.person.addedSuccessfully', {
                    firstname: personStore.allLandesbedienstetePersonen?.[0]?.vorname,
                    lastname: personStore.allLandesbedienstetePersonen?.[0]?.familienname,
                  })
                }}
              </span>
            </v-col>
          </v-row>
          <v-row class="justify-center">
            <v-col cols="auto">
              <v-icon
                aria-hidden="true"
                color="#1EAE9C"
                data-testid="state-employee-success-icon"
                icon="mdi-check-circle"
                small
              />
            </v-col>
          </v-row>
          <v-row class="justify-center">
            <v-col
              class="subtitle-2"
              cols="auto"
              data-testid="following-data-added-text"
            >
              {{ t('admin.followingDataCreated') }}
            </v-col>
          </v-row>
          <v-row>
            <v-col
              class="text-body bold text-right"
              data-testid="added-state-employee-vorname-label"
            >
              {{ $t('person.firstName') }}:
            </v-col>
            <v-col class="text-body"
              ><span data-testid="added-state-employee-vorname">{{
                personStore.allLandesbedienstetePersonen?.[0]?.vorname
              }}</span>
            </v-col>
          </v-row>
          <v-row>
            <v-col
              class="text-body bold text-right"
              data-testid="added-state-employee-familienname-label"
            >
              {{ $t('person.lastName') }}:
            </v-col>
            <v-col class="text-body"
              ><span data-testid="added-state-employee-familienname">{{
                personStore.allLandesbedienstetePersonen?.[0]?.familienname
              }}</span>
            </v-col>
          </v-row>
          <v-row>
            <v-col
              class="text-body bold text-right"
              data-testid="added-state-employee-personalnummer-label"
            >
              {{ $t('person.kopersNr') }}:
            </v-col>
            <v-col class="text-body"
              ><span data-testid="added-state-employee-personalnummer">{{
                personStore.allLandesbedienstetePersonen?.[0]?.personalnummer
              }}</span>
            </v-col>
          </v-row>
          <v-row>
            <v-col
              class="text-body bold text-right"
              data-testid="added-state-employee-username-label"
            >
              {{ t('person.userName') }}:
            </v-col>
            <v-col class="text-body"
              ><span data-testid="added-state-employee-username">{{
                personStore.allLandesbedienstetePersonen?.[0]?.username
              }}</span>
            </v-col>
          </v-row>
          <v-row>
            <v-col
              class="text-body bold text-right"
              data-testid="added-state-employee-organisation-label"
            >
              {{ t('admin.organisation.organisation') }}:
            </v-col>
            <v-col class="text-body"
              ><span data-testid="added-state-employee-organisation">{{ translatedOrganisationsname }}</span></v-col
            >
          </v-row>
          <v-row>
            <v-col
              class="text-body bold text-right"
              data-testid="added-state-employee-rolle-label"
            >
              {{ t('admin.rolle.rolle') }}:
            </v-col>
            <v-col class="text-body"
              ><span data-testid="added-state-employee-rolle">{{ translatedRollenname.join(', ') }}</span></v-col
            >
          </v-row>
          <v-row>
            <v-col
              class="text-body bold text-right"
              data-testid="added-state-employee-befristung-label"
            >
              {{ t('admin.befristung.befristung') }}:
            </v-col>
            <v-col class="text-body"
              ><span data-testid="added-state-employee-befristung">{{ translatedBefristung }}</span></v-col
            >
          </v-row>
          <v-divider
            class="border-opacity-100 rounded my-6"
            color="#E5EAEF"
            thickness="6"
          />
          <v-row class="justify-end">
            <v-col
              cols="12"
              sm="6"
              md="auto"
            >
              <v-btn
                class="secondary"
                @click.stop="navigateToPersonDetails"
                data-testid="go-to-details-button"
                :block="mdAndDown"
              >
                {{ $t('nav.toDetails') }}
              </v-btn>
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="auto"
            >
              <v-btn
                class="secondary"
                data-testid="back-to-list-button"
                :block="mdAndDown"
                @click.stop="navigateToPersonTable"
              >
                {{ $t('nav.backToList') }}
              </v-btn>
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="auto"
            >
              <v-btn
                class="primary button"
                :class="{ big: mdAndUp }"
                :data-testid="createAnotherButtonTestId"
                :block="mdAndDown"
                @click="handleCreateAnotherPerson"
              >
                {{ createAnotherButtonLabel }}
              </v-btn>
            </v-col>
          </v-row>
        </v-container>
      </template>
    </LayoutCard>

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
                  {{ $t('admin.person.noKopersNrConfirmationDialogMessage') }}
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
    <!-- Dialog for confirmation when the admin want to proceed to add the person -->
    <v-dialog
      v-model="showAddPersonConfirmationDialog"
      persistent
    >
      <LayoutCard
        v-if="showAddPersonConfirmationDialog"
        :closable="false"
        :header="t('admin.person.stateEmployeeSearch.addStateEmployee')"
        headlineTestId="add-person-confirmation-dialog-headline"
      >
        <v-card-text>
          <v-container>
            <v-row class="text-body bold justify-center">
              <v-col
                class="text-center"
                cols="10"
              >
                <span data-testid="add-person-confirmation-text">
                  {{ addPersonConfirmationText }}
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
                data-testid="cancel-add-person-confirmation-button"
                @click.stop="showAddPersonConfirmationDialog = false"
              >
                {{ $t('cancel') }}
              </v-btn>
            </v-col>
            <v-col
              class="text-center"
              cols="12"
              sm="6"
              md="auto"
            >
              <v-btn
                :block="mdAndDown"
                class="primary"
                data-testid="confirm-add-person-button"
                @click.stop="addPersonToOwnSchule"
              >
                {{ t('admin.person.stateEmployeeSearch.addStateEmployee') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </v-dialog>
  </div>
</template>

<style></style>
