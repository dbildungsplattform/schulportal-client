<script setup lang="ts">
  import { ServiceProviderSystem, type LockUserBodyParams } from '@/api-client/generated';
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';
  import PasswordReset from '@/components/admin/personen/PasswordReset.vue';
  import PersonDelete from '@/components/admin/personen/PersonDelete.vue';
  import PersonLock from '@/components/admin/personen/PersonLock.vue';
  import PersonSync from '@/components/admin/personen/PersonSync.vue';
  import PersonenMetadataChange from '@/components/admin/personen/PersonenMetadataChange.vue';
  import ZuordnungenSection from '@/components/admin/personen/details/ZuordnungenSection.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import TokenReset from '@/components/two-factor-authentication/TokenReset.vue';
  import TwoFactorAuthenticationSetUp from '@/components/two-factor-authentication/TwoFactorAuthenticationSetUp.vue';
  import { useAuthStore, type AuthStore, type PersonenkontextRolleFields } from '@/stores/AuthStore';
  import { useOrganisationStore, type Organisation, type OrganisationStore } from '@/stores/OrganisationStore';
  import { EmailStatus, usePersonStore, type PersonStore } from '@/stores/PersonStore';
  import { usePersonenkontextStore, type PersonenkontextStore } from '@/stores/PersonenkontextStore';
  import { RollenMerkmal, RolleStore, useRolleStore } from '@/stores/RolleStore';
  import {
    StartPageServiceProvider,
    useServiceProviderStore,
    type ServiceProviderStore,
  } from '@/stores/ServiceProviderStore';
  import {
    TokenKind,
    useTwoFactorAuthentificationStore,
    type TwoFactorAuthentificationStore,
  } from '@/stores/TwoFactorAuthentificationStore';
  import type { Person } from '@/stores/types/Person';
  import type { PersonenUebersicht } from '@/stores/types/PersonenUebersicht';
  import type { Zuordnung } from '@/stores/types/Zuordnung';
  import { LockKeys, PersonLockOccasion, type UserLock } from '@/utils/lock';
  import { DIN_91379A, NO_LEADING_TRAILING_SPACES } from '@/utils/validation';
  import { toTypedSchema } from '@vee-validate/yup';
  import { useForm, type BaseFieldProps, type TypedSchema } from 'vee-validate';
  import {
    computed,
    onBeforeMount,
    onMounted,
    onUnmounted,
    ref,
    useTemplateRef,
    watch,
    type ComputedRef,
    type Ref,
    type ShallowRef,
  } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import {
    onBeforeRouteLeave,
    useRoute,
    useRouter,
    type NavigationGuardNext,
    type RouteLocationNormalized,
    type RouteLocationNormalizedLoaded,
    type Router,
  } from 'vue-router';
  import { useDisplay } from 'vuetify';
  import { object, string, StringSchema } from 'yup';

  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  const { t }: Composer = useI18n({ useScope: 'global' });

  const route: RouteLocationNormalizedLoaded = useRoute();
  const router: Router = useRouter();
  const currentPersonId: string = route.params['id'] as string;
  const personStore: PersonStore = usePersonStore();
  const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
  const authStore: AuthStore = useAuthStore();
  const organisationStore: OrganisationStore = useOrganisationStore();
  const twoFactorAuthentificationStore: TwoFactorAuthentificationStore = useTwoFactorAuthentificationStore();
  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
  const rolleStore: RolleStore = useRolleStore();

  const devicePassword: Ref<string> = ref('');
  const password: Ref<string> = ref('');

  type ZuordnungenSectionExposed = {
    navigateToZuordnungForm: () => void;
  };
  const zuordnungenSection: Readonly<ShallowRef<ZuordnungenSectionExposed | null>> =
    useTemplateRef<ZuordnungenSectionExposed>('zuordnungen-section');

  const isEditActive: Ref<boolean> = ref(false);
  const isZuordnungenFormDirty: Ref<boolean> = ref(false);
  const hasPendingZuordnungenChange: Ref<boolean> = ref(false);

  const isEditPersonMetadataActive: Ref<boolean> = ref(false);

  const changePersonMetadataSuccessVisible: Ref<boolean> = ref(false);
  const changePersonMetadataSuccessMessage: Ref<string> = ref('');

  const creationErrorText: Ref<string> = ref('');
  const creationErrorTitle: Ref<string> = ref('');

  const showUnsavedChangesDialog: Ref<boolean> = ref(false);
  let blockedNext: () => void = () => {
    /* empty */
  };
  const loading: Ref<boolean> = ref(true);

  const isManuallyLocked: ComputedRef<boolean> = computed<boolean>(() => {
    return personStore.currentPerson!.person.userLock.some(
      (lock: UserLock) => lock.lock_occasion === PersonLockOccasion.MANUELL_GESPERRT,
    );
  });

  function navigateToPersonTable(): void {
    router.push({ name: 'person-management' });
  }

  async function resetPassword(personId: string): Promise<void> {
    await personStore.resetPassword(personId);
    password.value = personStore.newPassword || '';
  }

  async function resetDevicePassword(personId: string): Promise<void> {
    await personStore.resetDevicePassword(personId);
    devicePassword.value = personStore.newDevicePassword || '';
  }

  async function onLockUser(
    lockedBy: string,
    date: string | undefined,
    isExistingLockToBeEdited: boolean,
  ): Promise<void> {
    if (!personStore.currentPerson) {
      return;
    }

    let lock: boolean;
    if (isExistingLockToBeEdited) {
      lock = isManuallyLocked.value;
    } else {
      lock = !isManuallyLocked.value;
    }

    let bodyParams: LockUserBodyParams = {
      lock: lock,
      locked_by: lockedBy,
      locked_until: date,
    };
    await personStore.lockPerson(personStore.currentPerson.person.id, bodyParams);
  }

  const handleAlertClose = (): void => {
    personStore.errorCode = '';
    personenkontextStore.errorCode = '';
    rolleStore.errorCode = '';
    navigateToPersonTable();
  };

  // Deletes the person and all kontexte
  async function deletePerson(personId: string): Promise<void> {
    await personStore.deletePersonById(personId);
  }

  // Synchronizes the person with external systems
  async function syncPerson(personId: string): Promise<void> {
    await personStore.syncPersonById(personId);
  }

  function getOrganisationDisplayName(organisation: Organisation): string {
    return organisation.kennung ? `${organisation.kennung} (${organisation.name})` : organisation.name;
  }

  function getSpecifiedUserLock(lockOccasion: PersonLockOccasion): UserLock | undefined {
    if (!personStore.currentPerson) {
      return undefined;
    }

    const { userLock }: Person = personStore.currentPerson.person;
    if (userLock.length === 0) {
      return undefined;
    }

    // Find the manualLock entry if it exists
    const specifiedLock: UserLock | undefined = userLock.find(
      (lock: UserLock) => lock[LockKeys.LockOccasion] === lockOccasion,
    );

    return specifiedLock;
  }

  const getKopersUserLock: ComputedRef<{ text: string }[]> = computed(() => {
    const kopersUserLock: UserLock | undefined = getSpecifiedUserLock(PersonLockOccasion.KOPERS_GESPERRT);
    if (!kopersUserLock) {
      return [];
    }
    return [
      {
        text: t('person.kopersLock'),
      },
    ];
  });

  const getManualUserLock: ComputedRef<{ key: string; attribute: string }[]> = computed(() => {
    const manualLock: UserLock | undefined = getSpecifiedUserLock(PersonLockOccasion.MANUELL_GESPERRT);
    if (!manualLock) {
      return [];
    }
    return Object.entries(manualLock)
      .filter(([key]: [string, string]) => (key as LockKeys) !== LockKeys.LockOccasion)
      .map(([key, attribute]: [string, string]) => {
        switch (key as LockKeys) {
          case LockKeys.LockedBy:
            return {
              key: t('person.lockedBy'),
              attribute: organisationStore.lockingOrganisation
                ? getOrganisationDisplayName(organisationStore.lockingOrganisation)
                : t('admin.organisation.unknownOrganisation'),
            };

          case LockKeys.CreatedAt:
            return {
              key: t('person.lockedSince'),
              attribute,
            };

          case LockKeys.LockedUntil:
            return {
              key: t('person.lockedUntil'),
              attribute,
            };

          default:
            return {
              key,
              attribute,
            };
        }
      })
      .filter(Boolean); // Remove undefined entries
  });

  watch(
    () => personStore.currentPerson?.person,
    async (person: Person | undefined) => {
      if (!(person && person.isLocked)) {
        return;
      }
      const manualLock: UserLock | undefined = person.userLock.find(
        (lock: UserLock) => lock.lock_occasion === PersonLockOccasion.MANUELL_GESPERRT,
      );
      if (manualLock) {
        await organisationStore.getLockingOrganisationById(manualLock.locked_by);
      }
    },
  );

  let closeChangePersonMetadataSuccessDialog = (): void => {
    personStore.getPersonById(currentPersonId);
    changePersonMetadataSuccessVisible.value = false;
    isEditPersonMetadataActive.value = false;
    personStore.getPersonById(currentPersonId);
  };

  const alertButtonText: ComputedRef<string> = computed(() => {
    switch (personenkontextStore.errorCode) {
      case 'PERSONALNUMMER_NICHT_EINDEUTIG':
        return t('admin.person.backToInput');
      case 'PERSON_NOT_FOUND':
        return t('nav.backToList');
      default:
        return t('refreshData');
    }
  });

  const alertButtonTextKopers: ComputedRef<string> = computed(() => {
    switch (personStore.errorCode) {
      case 'PERSONALNUMMER_NICHT_EINDEUTIG':
        return t('admin.person.backToInput');
      case 'NEWER_VERSION_OF_PERSON_AVAILABLE':
        return t('refreshData');
      default:
        return t('nav.backToList');
    }
  });

  type ChangePersonMetadata = {
    selectedVorname: string;
    selectedFamilienname: string;
    selectedKopersNrMetadata: string;
  };

  // Used to check the retrieved Zuordnungen and if any of them has a Koperspflicht Merkmal
  const hasKopersRolle: ComputedRef<boolean> = computed(() => {
    return (
      personStore.personenuebersicht?.zuordnungen.some((zuordnung: Zuordnung) =>
        zuordnung.merkmale.includes(RollenMerkmal.KopersPflicht),
      ) ?? false
    );
  });

  // Used to show device password block; the UEM Angebot is modelled as a service provider with target NONE
  const hasUEMServiceProvider: ComputedRef<boolean> = computed(() => {
    return serviceProviderStore.assignedServiceProviders.some(
      (serviceProvider: StartPageServiceProvider) => serviceProvider.externalSystem === ServiceProviderSystem.Uem,
    );
  });

  // Validation schema for the form for changing person metadata
  const changePersonMetadataValidationSchema: TypedSchema = toTypedSchema(
    object({
      selectedKopersNrMetadata: string()
        .matches(NO_LEADING_TRAILING_SPACES, t('admin.person.rules.kopersNr.noLeadingTrailingSpaces'))
        .when([], {
          is: () => personStore.currentPerson?.person.personalnummer,
          then: (schema: StringSchema) => schema.required(t('admin.person.rules.kopersNr.required')),
          otherwise: (schema: StringSchema) => schema.notRequired(),
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

  // eslint-disable-next-line @typescript-eslint/typedef
  const {
    defineField: defineFieldChangePersonMetadata,
    handleSubmit: handleSubmitChangePersonMetadata,
    resetForm: resetFormChangePersonMetadata,
    isFieldDirty: isChangePersonMetadataFieldDirty,
    setFieldValue: setFieldValueChangePersonMetadata,
  } = useForm<ChangePersonMetadata>({
    validationSchema: changePersonMetadataValidationSchema,
  });

  // Change Person Info Form
  const [selectedVorname, selectedVornameProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = defineFieldChangePersonMetadata('selectedVorname', vuetifyConfig);
  const [selectedFamilienname, selectedFamiliennameProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = defineFieldChangePersonMetadata('selectedFamilienname', vuetifyConfig);
  const [selectedKopersNrMetadata, selectedKopersNrMetadataProps]: [
    Ref<string | undefined | null>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = defineFieldChangePersonMetadata('selectedKopersNrMetadata', vuetifyConfig);

  function navigateBackToKopersForm(): void {
    const personalnummer: string | null | undefined = personStore.currentPerson?.person.personalnummer;
    const vorname: string | undefined = personStore.currentPerson?.person.name.vorname;
    const familienname: string | undefined = personStore.currentPerson?.person.name.familienname;

    // Set the initial values of the person in the form again when navigating back to it after an error in the first submit.
    setFieldValueChangePersonMetadata('selectedKopersNrMetadata', personalnummer ?? '');
    setFieldValueChangePersonMetadata('selectedVorname', vorname ?? '');
    setFieldValueChangePersonMetadata('selectedFamilienname', familienname ?? '');
    personStore.errorCode = '';
    personenkontextStore.errorCode = '';
  }

  const alertButtonActionKopers: ComputedRef<() => void> = computed(() => {
    switch (personStore.errorCode) {
      case 'PERSONALNUMMER_NICHT_EINDEUTIG':
        return navigateBackToKopersForm;
      case 'NEWER_VERSION_OF_PERSON_AVAILABLE':
        return () => router.go(0);
      default:
        return navigateToPersonTable;
    }
  });

  const alertButtonAction: ComputedRef<() => void> = computed(() => {
    switch (personenkontextStore.errorCode) {
      case 'PERSONALNUMMER_NICHT_EINDEUTIG':
        return (): void => zuordnungenSection.value?.navigateToZuordnungForm();
      case 'PERSON_NOT_FOUND':
        return navigateToPersonTable;
      default:
        return (): void => router.go(0);
    }
  });

  function handleStoreUpdates(): void {
    if (personenkontextStore.errorCode) {
      creationErrorText.value = t(`admin.personenkontext.errors.${personenkontextStore.errorCode}`);
      creationErrorTitle.value = t(`admin.personenkontext.title.${personenkontextStore.errorCode}`);
    }
  }

  watch(() => personenkontextStore.errorCode, handleStoreUpdates);
  watch(() => personenkontextStore.loading, handleStoreUpdates);

  // Computed property to get the password reset dialog text
  const passwordResetDialogText: ComputedRef<string> = computed(() => {
    let message: string = t('admin.person.resetPasswordInformation');
    if (!password.value) {
      message += `\n\n${t('admin.person.resetPasswordConfirmation', {
        firstname: personStore.currentPerson?.person.name.vorname,
        lastname: personStore.currentPerson?.person.name.familienname,
      })}`;
    } else {
      message = `${t('admin.person.resetPasswordSuccessMessage')}\n\n` + message;
    }
    return message;
  });

  // Computed property to get the device password dialog text
  const devicePasswordDialogText: ComputedRef<string> = computed(() => {
    let message: string = t('admin.person.devicePassword.dialogText');
    if (devicePassword.value) {
      message = `${t('admin.person.devicePassword.createPasswordSuccessMessage')}\n\n` + message;
    }
    return message;
  });

  watch(
    () => personStore.personenuebersicht,
    async (newValue: PersonenUebersicht | null) => {
      const organisationIds: Array<string> = [...new Set(newValue?.zuordnungen.map((z: Zuordnung) => z.sskId))];
      if (organisationIds.length > 0) {
        await organisationStore.getParentOrganisationsByIds(organisationIds);
      }
    },
    { immediate: true },
  );

  // Triggers the template to start editing the person informations
  const triggerPersonMetadataEdit = (): void => {
    isEditPersonMetadataActive.value = true;
    const personalnummer: string | null | undefined = personStore.currentPerson?.person.personalnummer;
    const vorname: string | undefined = personStore.currentPerson?.person.name.vorname;
    const familienname: string | undefined = personStore.currentPerson?.person.name.familienname;

    setFieldValueChangePersonMetadata('selectedKopersNrMetadata', personalnummer ?? '');
    setFieldValueChangePersonMetadata('selectedVorname', vorname ?? '');
    setFieldValueChangePersonMetadata('selectedFamilienname', familienname ?? '');
  };

  const cancelEditPersonMetadata = (): void => {
    isEditPersonMetadataActive.value = false;
    resetFormChangePersonMetadata();
  };

  // Handles the value emitted by PersonenMetadata for the selectedKopersNr
  function handleSelectedKopersNrUpdate(value: string | undefined | null): void {
    selectedKopersNrMetadata.value = value;
  }

  // Handles the value emitted by PersonenMetadata for the selectedVorname
  function handleSelectedVorname(value: string | undefined): void {
    selectedVorname.value = value;
  }

  // Handles the value emitted by PersonenMetadata for the selectedFamilienname
  function handleSelectedFamilienname(value: string | undefined): void {
    selectedFamilienname.value = value;
  }

  // Submit the form for changing person informations (Vorname, Nachname, KopersNr.)
  const onSubmitChangePersonMetadata: (e?: Event) => Promise<Promise<void> | undefined> =
    handleSubmitChangePersonMetadata(async () => {
      if (selectedKopersNrMetadata.value && selectedVorname.value && selectedFamilienname.value) {
        if (selectedKopersNrMetadata.value === personStore.currentPerson?.person.personalnummer) {
          await personStore.changePersonMetadataById(
            currentPersonId,
            selectedVorname.value,
            selectedFamilienname.value,
          );
        } else {
          await personStore.changePersonMetadataById(
            currentPersonId,
            selectedVorname.value,
            selectedFamilienname.value,
            selectedKopersNrMetadata.value,
          );
        }
      } else if (!selectedKopersNrMetadata.value && selectedVorname.value && selectedFamilienname.value) {
        await personStore.changePersonMetadataById(currentPersonId, selectedVorname.value, selectedFamilienname.value);
      }
      changePersonMetadataSuccessMessage.value = t('admin.person.personalInfoSuccessDialogMessageWithUsername');
      changePersonMetadataSuccessVisible.value = !personStore.errorCode;
      if (!personStore.errorCode) {
        resetFormChangePersonMetadata();
      }
    });

  // Checks for dirtiness depending on the active form
  function isFormDirty(): boolean {
    if (isEditPersonMetadataActive.value) {
      return (
        isChangePersonMetadataFieldDirty('selectedKopersNrMetadata') ||
        isChangePersonMetadataFieldDirty('selectedVorname') ||
        isChangePersonMetadataFieldDirty('selectedFamilienname')
      );
    }
    return isZuordnungenFormDirty.value;
  }

  function handleConfirmUnsavedChanges(): void {
    blockedNext();
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
    if (isFormDirty() || hasPendingZuordnungenChange.value) {
      showUnsavedChangesDialog.value = true;
      blockedNext = next;
    } else {
      next();
    }
  });

  // Checks if the entered KopersNr is the same one that is already assigned to the user.
  // This is used to disable the save button in that case (To avoid errors).
  const hasSameMetadata: ComputedRef<boolean> = computed(() => {
    // Check if personalnummer does not exist and names are unchanged
    const isPersonalnummerMissing: boolean = !personStore.currentPerson?.person.personalnummer;
    const isFamiliennameUnchanged: boolean =
      selectedFamilienname.value === personStore.currentPerson?.person.name.familienname;
    const isVornameUnchanged: boolean = selectedVorname.value === personStore.currentPerson?.person.name.vorname;

    // If personalnummer is missing but selectedKopersNr has a value, return false
    if (isPersonalnummerMissing && selectedKopersNrMetadata.value) {
      return false;
    }

    // If personalnummer doesn't exist and both names are unchanged, return true
    if (isPersonalnummerMissing && isFamiliennameUnchanged && isVornameUnchanged) {
      return true;
    }

    // Otherwise, return true only if all fields match exactly
    if (
      selectedKopersNrMetadata.value === personStore.currentPerson?.person.personalnummer &&
      isFamiliennameUnchanged &&
      isVornameUnchanged
    ) {
      return true;
    }

    return false;
  });

  const intersectingOrganisations: ComputedRef<Set<Organisation>> = computed(() => {
    const adminOrganisationIds: Set<string> = new Set(
      authStore.currentUser?.personenkontexte?.map((pk: PersonenkontextRolleFields) => pk.organisation.id),
    );
    return new Set<Organisation>(
      organisationStore.parentOrganisationen.filter((userOrg: Organisation) => adminOrganisationIds.has(userOrg.id)),
    );
  });

  const twoFactorAuthenticationConnectionError: ComputedRef<string> = computed(() => {
    // Early return if loading
    if (twoFactorAuthentificationStore.loading) {
      return '';
    }

    switch (twoFactorAuthentificationStore.errorCode) {
      case 'TOKEN_STATE_ERROR':
        return t('admin.person.twoFactorAuthentication.errors.tokenStateError');
      case 'PI_UNAVAILABLE_ERROR':
        return t('admin.person.twoFactorAuthentication.errors.connection');
      default:
        return '';
    }
  });

  // Computed property to define what will be shown in the field Email depending on the returned status.
  const emailStatusText: ComputedRef<{
    text: string;
    tooltip: string;
  }> = computed(() => {
    switch (personStore.currentPerson?.person.email?.status) {
      case EmailStatus.Enabled:
        return {
          text: personStore.currentPerson.person.email.address,
          tooltip: t('person.emailStatusActiveHover'),
        };
      case EmailStatus.Requested:
        return {
          text: t('person.emailStatusRequested'),
          tooltip: t('person.emailStatusRequestedHover'),
        };
      case EmailStatus.Disabled:
        return {
          text: t('person.emailStatusDisabled'),
          tooltip: t('person.emailStatusDisabledHover'),
        };
      case EmailStatus.Failed:
        return {
          text: t('person.emailStatusFailed'),
          tooltip: t('person.emailStatusFailedHover'),
        };
      default:
        return {
          text: t('person.emailStatusUnknown'),
          tooltip: t('person.emailStatusUnknownHover'),
        };
    }
  });

  onBeforeMount(async () => {
    personStore.resetState();
    twoFactorAuthentificationStore.resetState();

    const twoFARequirementPromise: Promise<void> = twoFactorAuthentificationStore.get2FARequirement(currentPersonId);
    const personByIdPromise: Promise<void> = personStore.getPersonById(currentPersonId);
    const personUebersichtPromise: Promise<void> = personStore.getPersonenuebersichtById(currentPersonId);
    const assignedServiceProvidersPromise: Promise<void> =
      serviceProviderStore.getServiceProvidersByPersonId(currentPersonId);
    const get2FAStatePromise: Promise<void> = twoFactorAuthentificationStore.get2FAState(currentPersonId);
    await Promise.all([
      twoFARequirementPromise,
      personByIdPromise,
      personUebersichtPromise,
      assignedServiceProvidersPromise,
      get2FAStatePromise,
    ]);
    loading.value = false;
  });

  onMounted(() => {
    /* listen for browser changes and prevent them when form is dirty */
    window.addEventListener('beforeunload', preventNavigation);
  });

  onUnmounted(() => {
    window.removeEventListener('beforeunload', preventNavigation);
  });
</script>

<template>
  <div class="admin">
    <h1
      class="text-center headline"
      data-testid="admin-headline"
    >
      {{ t('admin.headline') }}
    </h1>
    <LayoutCard
      :closable="!personStore.errorCode && !personenkontextStore.errorCode"
      :header="t('admin.person.edit')"
      :headlineTestId="'person-details-headline'"
      @onCloseClicked="navigateToPersonTable"
      :padded="true"
      :showCloseText="true"
    >
      <v-container
        v-if="!!personStore.errorCode || !!personenkontextStore.errorCode"
        class="px-3 px-sm-16"
      >
        <v-container class="px-lg-16">
          <!-- Error Message Display if the personStore throws any kind of error (Not being able to load the person) -->
          <SpshAlert
            ref="person-store-error-alert"
            :model-value="!!personStore.errorCode"
            :button-text="alertButtonTextKopers"
            :button-action="alertButtonActionKopers"
            :closable="false"
            :show-button="true"
            :text="t(`admin.person.errors.${personStore.errorCode}`)"
            :title="t(`admin.person.title.${personStore.errorCode}`)"
            :type="'error'"
            @update:model-value="handleAlertClose"
          />

          <!-- Error Message Display if the personenkontextStore throws any kind of error (Not being able to load the kontext) -->
          <SpshAlert
            ref="personenkontext-store-error-alert"
            :model-value="!!personenkontextStore.errorCode"
            :button-text="alertButtonText"
            :button-action="alertButtonAction"
            :closable="false"
            :show-button="true"
            :text="creationErrorText"
            :title="creationErrorTitle"
            :type="'error'"
            @update:model-value="handleAlertClose"
          />

          <!-- Error Message Display if the rolleStore throws any kind of error (Not being able to load rollen) -->
          <SpshAlert
            ref="rollen-store-error-alert"
            :model-value="!!rolleStore.errorCode"
            :button-text="alertButtonText"
            :button-action="alertButtonAction"
            :closable="false"
            :show-button="true"
            :text="t(`admin.rolle.errors.${rolleStore.errorCode}`)"
            :title="t(`admin.rolle.title.${rolleStore.errorCode}`)"
            :type="'error'"
            @update:model-value="handleAlertClose"
          />
        </v-container>
      </v-container>

      <template v-if="!personStore.errorCode && !personenkontextStore.errorCode">
        <v-container class="personal-info">
          <div v-if="personStore.currentPerson?.person && !isEditPersonMetadataActive">
            <v-row
              id="personal-info-row"
              class="ml-md-16"
            >
              <v-col>
                <!-- Vorname -->
                <v-row class="mt-3 align-center">
                  <v-col
                    class="d-flex align-center justify-end"
                    sm="3"
                    cols="5"
                  >
                    <span class="subtitle-2">{{ t('person.firstName') }}:</span>
                  </v-col>
                  <v-col
                    class="d-flex align-center"
                    data-testid="person-vorname"
                  >
                    <span class="text-body text-break">{{ personStore.currentPerson.person.name.vorname }}</span>
                  </v-col>
                </v-row>

                <!-- Familienname -->
                <v-row class="mt-3 align-center">
                  <v-col
                    class="d-flex align-center justify-end"
                    sm="3"
                    cols="5"
                  >
                    <span class="subtitle-2">{{ t('person.lastName') }}:</span>
                  </v-col>
                  <v-col
                    class="d-flex align-center"
                    data-testid="person-familienname"
                  >
                    <span class="text-body text-break">{{ personStore.currentPerson.person.name.familienname }}</span>
                  </v-col>
                </v-row>

                <!-- Benutzername -->
                <v-row class="mt-3 align-center">
                  <v-col
                    class="d-flex align-center justify-end"
                    sm="3"
                    cols="5"
                  >
                    <span class="subtitle-2">{{ t('person.userName') }}:</span>
                  </v-col>
                  <v-col
                    class="d-flex align-center"
                    data-testid="person-username"
                  >
                    <span class="text-body text-break">{{ personStore.currentPerson.person.username }}</span>
                  </v-col>
                </v-row>

                <!-- KoPers.-Nr. -->
                <v-row
                  class="mt-3 align-center"
                  v-if="hasKopersRolle || personStore.currentPerson.person.personalnummer"
                >
                  <v-col
                    class="d-flex align-center justify-end"
                    sm="3"
                    cols="5"
                  >
                    <span
                      :class="{
                        'subtitle-2': true,
                        'text-red': hasKopersRolle && !personStore.currentPerson.person.personalnummer,
                      }"
                    >
                      {{ t('person.kopersNr') }}:
                    </span>
                  </v-col>
                  <v-col
                    class="d-flex align-center"
                    data-testid="person-kopersnr"
                  >
                    <span
                      :class="{
                        'text-body': true,
                        'text-red': hasKopersRolle && !personStore.currentPerson.person.personalnummer,
                        'text-break': true,
                      }"
                    >
                      {{ personStore.currentPerson.person.personalnummer ?? t('missing') }}
                    </span>
                  </v-col>
                </v-row>

                <!-- Email -->
                <v-row
                  v-if="emailStatusText.text !== t('person.emailStatusUnknown')"
                  class="mt-3 align-center"
                >
                  <v-col
                    class="d-flex align-center justify-end"
                    sm="3"
                    cols="5"
                  >
                    <span class="subtitle-2">{{ t('person.email') }}:</span>
                  </v-col>
                  <v-col data-testid="person-email">
                    <SpshTooltip
                      :enabled-condition="!!personStore.currentPerson.person.email"
                      :disabled-text="t('person.changePersonMetaDataDisabledDescription')"
                      :enabled-text="emailStatusText.tooltip"
                      position="bottom"
                    >
                      <div class="d-flex align-center">
                        <v-icon
                          aria-hidden="true"
                          class="mr-2 flex-shrink-0 mt-1"
                          icon="mdi-alert-circle-outline"
                          size="small"
                        />
                        <span
                          data-testid="person-email-text"
                          class="text-body text-break"
                        >
                          {{ emailStatusText.text }}
                        </span>
                      </div>
                    </SpshTooltip>
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
                      :enabled-condition="!isEditActive"
                      :disabled-text="t('person.finishEditFirst')"
                      :enabled-text="t('admin.person.editPersonalInfo')"
                      position="start"
                    >
                      <v-btn
                        :disabled="isEditActive"
                        class="primary ml-lg-8"
                        data-testid="metadata-edit-button"
                        :block="mdAndDown"
                        @click="triggerPersonMetadataEdit"
                      >
                        {{ t('edit') }}
                      </v-btn>
                    </SpshTooltip>
                  </v-col>
                </div>
              </v-col>
            </v-row>
          </div>
          <div v-else-if="personStore.loading">
            <v-progress-circular indeterminate />
          </div>
        </v-container>
        <v-container v-if="isEditPersonMetadataActive">
          <v-form
            data-testid="person-metadata-form"
            @submit="onSubmitChangePersonMetadata"
          >
            <PersonenMetadataChange
              ref="person-metadata-change"
              :selectedVornameProps="selectedVornameProps"
              :selectedVorname="personStore.currentPerson?.person.name.vorname"
              :selectedFamiliennameProps="selectedFamiliennameProps"
              :selectedFamilienname="personStore.currentPerson?.person.name.familienname"
              :selectedKopersNrMetadataProps="selectedKopersNrMetadataProps"
              :selectedKopersNrMetadata="personStore.currentPerson?.person.personalnummer ?? undefined"
              :hasKopersRolle="hasKopersRolle"
              @update:selectedKopersNrMetadata="handleSelectedKopersNrUpdate"
              @update:selectedVorname="handleSelectedVorname"
              @update:selectedFamilienname="handleSelectedFamilienname"
            >
            </PersonenMetadataChange>
            <v-row class="save-cancel-row ml-md-16 pt-md-5 pt-12 justify-end">
              <v-col
                class="cancel-col px-5"
                cols="12"
                sm="6"
                md="auto"
              >
                <v-btn
                  class="secondary small"
                  data-testid="person-info-edit-cancel"
                  :block="mdAndDown"
                  @click="cancelEditPersonMetadata"
                >
                  {{ t('cancel') }}
                </v-btn>
              </v-col>
              <v-col
                cols="12"
                sm="6"
                md="auto"
                class="px-5"
              >
                <SpshTooltip
                  :enabled-condition="!hasSameMetadata"
                  :disabled-text="t('person.changePersonMetaDataDisabledDescription')"
                  :enabled-text="t('save')"
                  position="start"
                >
                  <v-btn
                    class="primary small"
                    :disabled="hasSameMetadata || personStore.loading"
                    data-testid="person-info-edit-save"
                    :block="mdAndDown"
                    type="submit"
                  >
                    {{ t('save') }}
                  </v-btn>
                </SpshTooltip>
              </v-col>
            </v-row>
          </v-form>
        </v-container>
        <v-divider
          class="border-opacity-100 rounded my-6 mx-4"
          color="#E5EAEF"
          thickness="6"
        />
        <!-- Password reset -->
        <v-container class="password-reset">
          <v-row class="ml-md-16">
            <v-col>
              <h3
                class="subtitle-1"
                data-testid="password-reset-section-headline"
              >
                {{ t('person.password') }}
              </h3>
            </v-col>
            <v-col
              v-if="personStore.currentPerson"
              class="mr-lg-13"
              cols="12"
              md="auto"
            >
              <div class="d-flex justify-sm-end">
                <PasswordReset
                  ref="password-reset"
                  :button-text="t('admin.person.changePassword')"
                  :confirm-button-text="t('admin.person.resetPassword')"
                  :dialog-header="t('admin.person.resetPassword')"
                  :dialog-text="passwordResetDialogText"
                  :disabled="isEditActive || isEditPersonMetadataActive"
                  :error-code="personStore.errorCode"
                  :is-loading="personStore.loading"
                  :password="password"
                  :test-id="'password-reset'"
                  @on-clear-password="password = ''"
                  @on-reset-password="resetPassword(currentPersonId)"
                />
              </div>
            </v-col>
            <v-col v-else-if="personStore.loading">
              <v-progress-circular
                data-testid="loading-spinner"
                indeterminate
              />
            </v-col>
          </v-row>
        </v-container>
        <v-divider
          class="border-opacity-100 rounded my-6 mx-4"
          color="#E5EAEF"
          thickness="6"
        />
      </template>
      <!-- Kept mounted on errors, so the pending Zuordnung changes survive navigating back to the form -->
      <ZuordnungenSection
        v-show="!personStore.errorCode && !personenkontextStore.errorCode"
        ref="zuordnungen-section"
        v-model:is-edit-active="isEditActive"
        v-model:is-form-dirty="isZuordnungenFormDirty"
        v-model:has-pending-change="hasPendingZuordnungenChange"
        :person-id="currentPersonId"
        :is-edit-person-metadata-active="isEditPersonMetadataActive"
      />
      <template v-if="!personStore.errorCode && !personenkontextStore.errorCode">
        <!-- Two Factor Authentication -->
        <template v-if="loading">
          <v-divider
            class="border-opacity-100 rounded my-6 mx-4"
            color="#E5EAEF"
            thickness="6"
          />
          <v-container>
            <v-row class="ml-md-16">
              <v-col> <v-progress-circular indeterminate /></v-col>
            </v-row>
          </v-container>
        </template>
        <template
          v-else-if="twoFactorAuthentificationStore.required || twoFactorAuthentificationStore.hasToken === true"
        >
          <v-divider
            class="border-opacity-100 rounded my-6 mx-4"
            color="#E5EAEF"
            thickness="6"
          />
          <v-container>
            <v-row class="ml-md-16">
              <v-col v-if="personStore.loading">
                <v-progress-circular indeterminate />
              </v-col>
              <template v-else>
                <v-col>
                  <h3
                    class="subtitle-1"
                    data-testid="two-factor-section-headline"
                  >
                    {{ t('admin.person.twoFactorAuthentication.header') }}
                  </h3>
                  <v-row class="align-top text-body mt-6">
                    <v-col
                      class="text-right"
                      cols="1"
                    >
                      <v-icon
                        v-if="twoFactorAuthentificationStore.hasToken"
                        icon="mdi-check-circle"
                        color="green"
                      />

                      <v-icon
                        v-else-if="twoFactorAuthenticationConnectionError"
                        color="warning"
                        icon="mdi-alert-outline"
                      />
                    </v-col>

                    <v-col>
                      <template
                        v-if="twoFactorAuthentificationStore.errorCode && !twoFactorAuthentificationStore.loading"
                      >
                        <p
                          v-if="twoFactorAuthentificationStore.errorCode === 'PI_UNAVAILABLE_ERROR'"
                          class="ma-0 text-body"
                          data-testid="connection-error-text"
                        >
                          {{ t('admin.person.twoFactorAuthentication.errors.connection') }}
                        </p>

                        <p
                          v-else-if="twoFactorAuthentificationStore.errorCode === 'TOKEN_STATE_ERROR'"
                          class="ma-0 text-body"
                          data-testid="token-state-error-text"
                        >
                          <i18n-t
                            keypath="admin.person.twoFactorAuthentication.errors.tokenStateError"
                            for="admin.person.twoFactorAuthentication.errors.iqshHelpdesk"
                            tag="label"
                          >
                            <a
                              :href="t('admin.person.twoFactorAuthentication.errors.iqshHelpdeskLink')"
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              {{ t('admin.person.twoFactorAuthentication.errors.iqshHelpdesk') }}
                            </a>
                          </i18n-t>
                        </p>
                      </template>

                      <template v-else-if="twoFactorAuthentificationStore.hasToken">
                        <span
                          v-if="twoFactorAuthentificationStore.tokenKind === TokenKind.software"
                          class="ma-0"
                          data-testid="software-factor-setup-text"
                        >
                          {{ t('admin.person.twoFactorAuthentication.softwareTokenIsSetUp') }}
                        </span>

                        <span
                          v-if="twoFactorAuthentificationStore.tokenKind === TokenKind.hardware"
                          class="ma-0"
                          data-testid="hardware-factor-setup-text"
                        >
                          {{ t('admin.person.twoFactorAuthentication.hardwareTokenIsSetUp') }}
                        </span>

                        <span
                          v-if="
                            twoFactorAuthentificationStore.serial &&
                            twoFactorAuthentificationStore.tokenKind == TokenKind.hardware
                          "
                        >
                          {{
                            `${t('admin.person.twoFactorAuthentication.serial')}: ${twoFactorAuthentificationStore.serial}`
                          }}
                        </span>
                      </template>
                    </v-col>
                  </v-row>
                  <v-row
                    v-if="!twoFactorAuthenticationConnectionError"
                    class="text-body align-top"
                  >
                    <v-col
                      class="text-right"
                      cols="1"
                    >
                      <v-icon icon="mdi-information" />
                    </v-col>
                    <v-col>
                      <span v-if="twoFactorAuthentificationStore.hasToken && !twoFactorAuthentificationStore.required">
                        {{ t('admin.person.twoFactorAuthentication.noLongerNeedToken') }}
                      </span>
                      <span
                        v-else-if="twoFactorAuthentificationStore.hasToken"
                        data-testid="two-factor-reset-info-text"
                      >
                        {{ t('admin.person.twoFactorAuthentication.resetInfo') }}
                      </span>
                      <span
                        v-if="!twoFactorAuthentificationStore.hasToken"
                        data-testid="two-factor-not-setup-text"
                      >
                        {{ t('admin.person.twoFactorAuthentication.notSetUp') }}
                      </span>
                    </v-col>
                  </v-row>
                </v-col>
                <v-col
                  v-if="personStore.currentPerson && !twoFactorAuthenticationConnectionError"
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
                        :enabled-condition="!isEditActive && !isEditPersonMetadataActive"
                        :disabled-text="t('person.finishEditFirst')"
                        :enabled-text="t('admin.person.twoFactorAuthentication.tokenReset')"
                        position="start"
                      >
                        <TokenReset
                          v-if="twoFactorAuthentificationStore.hasToken"
                          :error-code="twoFactorAuthentificationStore.errorCode"
                          :disabled="isEditActive || isEditPersonMetadataActive"
                          :person="personStore.currentPerson"
                          :token-type="twoFactorAuthentificationStore.tokenKind"
                          :person-id="currentPersonId"
                          :is-loading="twoFactorAuthentificationStore.loading"
                          @dialog-closed="twoFactorAuthentificationStore.get2FAState(currentPersonId)"
                        />
                      </SpshTooltip>
                      <SpshTooltip
                        :enabled-condition="!isEditActive && !isEditPersonMetadataActive"
                        :disabled-text="t('person.finishEditFirst')"
                        :enabled-text="t('admin.person.twoFactorAuthentication.setUpShort')"
                        position="start"
                      >
                        <TwoFactorAuthenticationSetUp
                          v-if="!twoFactorAuthentificationStore.hasToken"
                          :error-code="twoFactorAuthentificationStore.errorCode"
                          :disabled="isEditActive || isEditPersonMetadataActive"
                          :person="personStore.currentPerson"
                          :is-loading="twoFactorAuthentificationStore.loading"
                          @dialog-closed="twoFactorAuthentificationStore.get2FAState(currentPersonId)"
                        />
                      </SpshTooltip>
                    </v-col>
                  </div>
                </v-col>
              </template>
            </v-row>
          </v-container>
        </template>
        <v-divider
          class="border-opacity-100 rounded my-6 mx-4"
          color="#E5EAEF"
          thickness="6"
        />
        <v-container data-testid="person-lock">
          <v-row class="ml-md-16">
            <v-col data-testid="person-lock-info">
              <h3
                class="subtitle-1"
                data-testid="status-section-headline"
              >
                {{ t('admin.person.status') }}
              </h3>
              <template v-if="!personStore.loading">
                <v-row class="mt-4 text-body">
                  <v-col
                    class="text-right"
                    cols="1"
                  >
                    <v-icon
                      v-if="
                        personStore.currentPerson?.person.userLock &&
                        personStore.currentPerson.person.userLock?.length > 0
                      "
                      icon="mdi-lock"
                      color="red"
                    />
                  </v-col>
                  <v-col cols="10">
                    <span data-testid="user-lock-status-text">
                      {{
                        personStore.currentPerson?.person.userLock &&
                        personStore.currentPerson.person.userLock?.length > 0
                          ? t('person.userIsLocked')
                          : t('person.userIsUnlocked')
                      }}
                    </span>
                  </v-col>
                </v-row>
                <v-row
                  v-for="({ key, attribute }, index) of getManualUserLock"
                  :key="key"
                  class="mt-0"
                  cols="10"
                >
                  <v-col
                    class="text-right"
                    cols="4"
                  >
                    <span
                      class="subtitle-2"
                      :data-testid="`lock-info-${index}-key`"
                    >
                      {{ key }}:
                    </span>
                  </v-col>
                  <v-col
                    cols="5"
                    class="ellipsis-wrapper"
                  >
                    <span
                      class="text-body"
                      :title="attribute"
                      :data-testid="`lock-info-${index}-attribute`"
                    >
                      {{ attribute }}
                    </span>
                  </v-col>
                </v-row>
                <v-row
                  v-if="getKopersUserLock.length"
                  cols="10"
                >
                  <v-col cols="1">
                    <v-icon
                      aria-hidden="true"
                      class="mr-2"
                      icon="mdi-alert-circle-outline"
                      size="small"
                    />
                  </v-col>
                  <v-col
                    v-for="(item, index) in getKopersUserLock"
                    :key="index"
                    cols="9"
                  >
                    <span
                      class="text-body"
                      :data-testid="`lock-info-${index}-attribute`"
                    >
                      {{ item.text }}
                    </span>
                  </v-col>
                </v-row>
              </template>
              <template v-else-if="personStore.loading">
                <v-col> <v-progress-circular indeterminate /></v-col>
              </template>
            </v-col>
            <v-col
              v-if="personStore.currentPerson"
              class="mr-lg-13"
              cols="12"
              md="auto"
            >
              <div class="d-flex justify-sm-end">
                <PersonLock
                  :disabled="isEditActive || isEditPersonMetadataActive"
                  :error-code="personStore.errorCode"
                  :person="personStore.currentPerson"
                  :admin-id="authStore.currentUser?.personId!"
                  :format-organisation-name="getOrganisationDisplayName"
                  :intersecting-organisations="intersectingOrganisations"
                  @on-lock-user="onLockUser"
                />
              </div>
              <div class="d-flex justify-sm-end mt-2">
                <template v-if="authStore.hasPersonenLoeschenPermission">
                  <PersonDelete
                    :disabled="isEditActive || isEditPersonMetadataActive"
                    :error-code="personStore.errorCode"
                    :person="personStore.currentPerson"
                    :is-loading="personStore.loading"
                    @on-delete-person="deletePerson(currentPersonId)"
                  />
                </template>
              </div>
              <div class="d-flex justify-sm-end mt-2">
                <template v-if="authStore.hasPersonenSyncPermission">
                  <PersonSync
                    :disabled="isEditActive || isEditPersonMetadataActive"
                    :error-code="personStore.errorCode"
                    :person="personStore.currentPerson"
                    :is-loading="personStore.loading"
                    @on-sync-person="syncPerson(currentPersonId)"
                  />
                </template>
              </div>
            </v-col>
            <v-col v-else-if="personStore.loading"> <v-progress-circular indeterminate /> </v-col>
          </v-row> </v-container
        ><v-divider
          v-if="hasUEMServiceProvider"
          class="border-opacity-100 rounded my-6 mx-4"
          color="#E5EAEF"
          thickness="6"
        />
        <!-- reset device password -->
        <v-container
          v-if="hasUEMServiceProvider"
          data-testid="device-password"
        >
          <v-row class="ml-md-16">
            <v-col data-testid="device-password-info">
              <h3
                class="subtitle-1"
                data-testid="device-password-section-headline"
              >
                {{ t('admin.person.devicePassword.header') }}
              </h3>
              <template v-if="!personStore.loading">
                <div class="d-flex align-start mt-4 text-body">
                  <v-icon
                    class="me-2"
                    icon="mdi-information"
                  />

                  <p class="ma-0">
                    {{ t('admin.person.devicePassword.infoTextPersonDetails') }}
                  </p>
                </div>
              </template>
              <template v-else-if="personStore.loading">
                <v-col> <v-progress-circular indeterminate /></v-col>
              </template>
            </v-col>
            <v-col
              v-if="personStore.currentPerson"
              data-testid="device-password-actions"
              class="mr-lg-13"
              cols="12"
              md="auto"
            >
              <div class="d-flex justify-sm-end">
                <PasswordReset
                  ref="device-password-reset"
                  :button-text="t('admin.person.devicePassword.createPassword')"
                  :confirm-button-text="t('admin.person.devicePassword.createPassword')"
                  :dialog-header="t('admin.person.devicePassword.createDevicePassword')"
                  :dialog-text="devicePasswordDialogText"
                  :disabled="isEditActive || isEditPersonMetadataActive"
                  :error-code="personStore.errorCode"
                  :is-loading="personStore.loading"
                  :password="devicePassword"
                  :test-id="'device-password'"
                  @on-clear-password="password = ''"
                  @on-reset-password="resetDevicePassword(currentPersonId)"
                />
              </div>
            </v-col>
          </v-row>
        </v-container>
      </template>
    </LayoutCard>
    <!-- Success Dialog after changing the Person Infos-->
    <v-dialog
      v-model="changePersonMetadataSuccessVisible"
      persistent
      max-width="600px"
    >
      <LayoutCard
        :closable="true"
        :header="t('admin.person.personalInfo')"
        @on-close-clicked="closeChangePersonMetadataSuccessDialog"
      >
        <v-card-text>
          <v-container>
            <v-row class="text-body bold px-md-12">
              <v-col
                offset="1"
                cols="10"
              >
                <span class="metadata-success-message">{{ changePersonMetadataSuccessMessage }}</span>
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
                @click.stop="closeChangePersonMetadataSuccessDialog"
              >
                {{ t('close') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </v-dialog>

    <!-- Warning dialog for unsaved changes -->
    <v-dialog
      ref="unsaved-changes-dialog"
      v-model="showUnsavedChangesDialog"
      data-testid="unsaved-changes-dialog"
      persistent
    >
      <LayoutCard :header="t('unsavedChanges.title')">
        <v-card-text>
          <v-container>
            <v-row class="text-body bold px-md-16">
              <v-col>
                <p data-testid="unsaved-changes-warning-text">
                  {{ t('unsavedChanges.message') }}
                </p>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-row class="justify-center">
            <v-col
              cols="12"
              sm="6"
              md="auto"
            >
              <v-btn
                class="secondary button"
                data-testid="confirm-unsaved-changes-button"
                :block="mdAndDown"
                @click.stop="handleConfirmUnsavedChanges"
              >
                {{ t('yes') }}
              </v-btn>
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="auto"
            >
              <v-btn
                class="primary button"
                data-testid="close-unsaved-changes-dialog-button"
                :block="mdAndDown"
                @click.stop="showUnsavedChangesDialog = false"
              >
                {{ t('no') }}
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

  @media only screen and (min-width: 1280px) and (max-width: 1600px) {
    #personal-info-row {
      flex-direction: column;
      margin-left: 0px !important;
    }
  }

  span {
    white-space: normal;
    text-wrap: pretty;
  }

  .metadata-success-message {
    white-space: pre;
    text-wrap: pretty;
  }
</style>
