<script setup lang="ts">
  import type { LockUserBodyParams } from '@/api-client/generated';
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';
  import KlasseChange from '@/components/admin/klassen/KlasseChange.vue';
  import BefristungInput from '@/components/admin/personen/BefristungInput.vue';
  import KopersInput from '@/components/admin/personen/KopersInput.vue';
  import PasswordReset from '@/components/admin/personen/PasswordReset.vue';
  import PersonDelete from '@/components/admin/personen/PersonDelete.vue';
  import PersonLock from '@/components/admin/personen/PersonLock.vue';
  import PersonSync from '@/components/admin/personen/PersonSync.vue';
  import PersonenMetadataChange from '@/components/admin/personen/PersonenMetadataChange.vue';
  import PersonenkontextCreate from '@/components/admin/personen/PersonenkontextCreate.vue';
  import PersonenkontextDelete from '@/components/admin/personen/PersonenkontextDelete.vue';
  import { PendingState } from '@/components/admin/personen/details/PersonenkontextItem.types';
  import PersonenkontextItem from '@/components/admin/personen/details/PersonenkontextItem.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import TokenReset from '@/components/two-factor-authentication/TokenReset.vue';
  import TwoFactorAuthenticationSetUp from '@/components/two-factor-authentication/TwoFactorAuthenticationSetUp.vue';
  import { useOrganisationen } from '@/composables/useOrganisationen';
  import { useRollen, type TranslatedRolleWithAttrs } from '@/composables/useRollen';
  import { useAuthStore, type AuthStore, type PersonenkontextRolleFields } from '@/stores/AuthStore';
  import { useConfigStore, type ConfigStore } from '@/stores/ConfigStore';
  import {
    OrganisationsTyp,
    useOrganisationStore,
    type AutoCompleteStore,
    type Organisation,
    type OrganisationStore,
  } from '@/stores/OrganisationStore';
  import { EmailStatus, usePersonStore, type PersonStore } from '@/stores/PersonStore';
  import {
    mapZuordnungToPersonenkontextUpdate,
    OperationContext,
    usePersonenkontextStore,
    type PersonenkontextStore,
    type PersonenkontextUpdate,
  } from '@/stores/PersonenkontextStore';
  import { RollenArt, RollenMerkmal } from '@/stores/RolleStore';
  import {
    TokenKind,
    useTwoFactorAuthentificationStore,
    type TwoFactorAuthentificationStore,
  } from '@/stores/TwoFactorAuthentificationStore';
  import type { Person } from '@/stores/types/Person';
  import type { PersonenUebersicht } from '@/stores/types/PersonenUebersicht';
  import { Zuordnung } from '@/stores/types/Zuordnung';
  import type { TranslatedObject } from '@/types';
  import { isBefristungspflichtRolle, useBefristungUtils, type BefristungUtilsType } from '@/utils/befristung';
  import { adjustDateForTimezoneAndFormat, formatDateToISO, getNextSchuljahresende } from '@/utils/date';
  import { LockKeys, PersonLockOccasion, type UserLock } from '@/utils/lock';
  import { DIN_91379A, NO_LEADING_TRAILING_SPACES } from '@/utils/validation';
  import {
    getBefristungSchema,
    getDirtyState,
    getPersonenkontextFieldDefinitions,
    getValidationSchema,
    isKopersRolle,
    type PersonenkontextFieldDefinitions,
  } from '@/utils/validationPersonenkontext';
  import { toTypedSchema } from '@vee-validate/yup';
  import { useForm, type BaseFieldProps, type FormContext, type TypedSchema } from 'vee-validate';
  import {
    computed,
    nextTick,
    onBeforeMount,
    onMounted,
    onUnmounted,
    ref,
    watch,
    watchEffect,
    type ComputedRef,
    type Ref,
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
  import { object, string, StringSchema, type AnyObject } from 'yup';

  type ZuordnungWithKlasse = Zuordnung & {
    klasse?: string;
  };

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
  const configStore: ConfigStore = useConfigStore();

  const devicePassword: Ref<string> = ref('');
  const password: Ref<string> = ref('');

  const zuordnungenWithPendingChanges: Ref<ZuordnungWithKlasse[] | undefined> = ref<ZuordnungWithKlasse[] | undefined>(
    undefined,
  );
  const selectedZuordnungen: Ref<ZuordnungWithKlasse[]> = ref<ZuordnungWithKlasse[]>([]);
  const newZuordnung: Ref<ZuordnungWithKlasse | undefined> = ref<ZuordnungWithKlasse | undefined>(undefined);
  const zuordnungenToBePersisted: Ref<Zuordnung[]> = ref<Zuordnung[]>([]);
  const originalZuordnungen: Ref<Zuordnung[] | undefined> = ref(undefined);
  const hasKlassenZuordnung: Ref<boolean | undefined> = ref(false);
  const isUnbefristetDisabled: Ref<boolean, boolean> = ref(false);
  const isBefristungRequired: Ref<boolean, boolean> = ref(false);
  // Check if the button to change the Klasse should be active or not. Activate only if there is 1 selected Zuordnung and if it is of type LERN.
  const isLernRolleForChangeKlasseResult: Ref<boolean> = ref(false);

  const isEditActive: Ref<boolean> = ref(false);
  const isZuordnungFormActive: Ref<boolean> = ref(false);
  const isChangeKlasseFormActive: Ref<boolean> = ref(false);
  const isChangeBefristungActive: Ref<boolean> = ref(false);

  const isEditPersonMetadataActive: Ref<boolean> = ref(false);

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
  const changePersonMetadataSuccessVisible: Ref<boolean> = ref(false);
  const changePersonMetadataSuccessMessage: Ref<string> = ref('');

  const showNoKopersNrConfirmationDialog: Ref<boolean> = ref(false);

  const creationErrorText: Ref<string> = ref('');
  const creationErrorTitle: Ref<string> = ref('');

  const cachedSelectedOrganisation: Ref<string> = ref('');
  const cachedSelectedRolle: Ref<string> = ref('');
  const cachedSelectedKopersNr: Ref<string> = ref('');

  const showUnsavedChangesDialog: Ref<boolean> = ref(false);
  let blockedNext: () => void = () => {
    /* empty */
  };
  const calculatedBefristung: Ref<string | undefined> = ref('');
  const loading: Ref<boolean> = ref(true);

  const isManuallyLocked: ComputedRef<boolean> = computed<boolean>(() => {
    return personStore.currentPerson!.person.userLock.some(
      (lock: UserLock) => lock.lock_occasion === PersonLockOccasion.MANUELL_GESPERRT,
    );
  });

  const finalZuordnungenUpdate: ComputedRef<PersonenkontextUpdate[]> = computed(() => {
    return zuordnungenToBePersisted.value.map(mapZuordnungToPersonenkontextUpdate);
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
    navigateToPersonTable();
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

  let closeCannotDeleteDialog = (): void => {
    cannotDeleteDialogVisible.value = false;
  };

  let closeCreateSuccessDialog = (): void => {
    personStore.getPersonenuebersichtById(currentPersonId);
    createSuccessDialogVisible.value = false;
    isEditActive.value = false;
    pendingCreation.value = false;
  };

  let closeDeleteSuccessDialog = (): void => {
    personStore.getPersonenuebersichtById(currentPersonId);
    deleteSuccessDialogVisible.value = false;
    isEditActive.value = false;
    pendingDeletion.value = false;
  };

  let closeChangeKlasseSuccessDialog = (): void => {
    personStore.getPersonenuebersichtById(currentPersonId);
    changeKlasseSuccessDialogVisible.value = false;
    isEditActive.value = false;
    pendingChangeKlasse.value = false;
  };

  let closeChangePersonMetadataSuccessDialog = (): void => {
    personStore.getPersonById(currentPersonId);
    changePersonMetadataSuccessVisible.value = false;
    isEditPersonMetadataActive.value = false;
    personStore.getPersonById(currentPersonId);
  };

  let closeChangeBefristungSuccessDialog = (): void => {
    personStore.getPersonenuebersichtById(currentPersonId);
    changeBefristungSuccessDialogVisible.value = false;
    isChangeBefristungActive.value = false;
    pendingChangeBefristung.value = false;
    isEditActive.value = false;
  };

  // Triggers the template to add a new Zuordnung
  const triggerAddZuordnung = (): void => {
    isZuordnungFormActive.value = true;
  };

  const confirmDeletion = async (): Promise<void> => {
    // Check if the current user is trying to delete their own Zuordnungen
    if (authStore.currentUser?.personId === currentPersonId) {
      cannotDeleteDialogVisible.value = true;
      return;
    }

    // The remaining Zuordnungen that were not selected for deletion
    const remainingZuordnungen: ZuordnungWithKlasse[] | undefined = zuordnungenWithPendingChanges.value?.filter(
      (zuordnung: ZuordnungWithKlasse) => !selectedZuordnungen.value.includes(zuordnung),
    );

    // Get all Klassen Zuordnungen
    const klassenZuordnungen: Zuordnung[] | undefined = personStore.personenuebersicht?.zuordnungen.filter(
      (zuordnung: Zuordnung) => zuordnung.typ === OrganisationsTyp.Klasse,
    );

    // Create a map of Schule to Klasse relationships to keep the Klassen that are not supposed to be deleted.
    const schuleToKlasseMap: Map<string, Zuordnung[]> = new Map<string, Zuordnung[]>();

    klassenZuordnungen?.forEach((klasseZuordnung: Zuordnung) => {
      const schuleId: string = klasseZuordnung.administriertVon;
      const klasse: string = klasseZuordnung.sskName;
      const rolle: string = klasseZuordnung.rolle;
      if (!schuleToKlasseMap.has(schuleId + klasse + rolle)) {
        schuleToKlasseMap.set(schuleId + klasse + rolle, []);
      }
      schuleToKlasseMap.get(schuleId + klasse + rolle)?.push(klasseZuordnung);
    });

    // Find Klassen that should be kept
    const klassenToKeep: Zuordnung[] = [];

    // For each remaining Zuordnung that is a Schule, keep its associated Klassen
    remainingZuordnungen?.forEach((zuordnung: ZuordnungWithKlasse) => {
      const associatedKlassen: Zuordnung[] =
        schuleToKlasseMap.get(zuordnung.sskId + zuordnung.klasse + zuordnung.rolle) || [];
      klassenToKeep.push(...associatedKlassen);
    });

    // Combine remaining Zuordnungen with Klassen that should be kept
    const combinedZuordnungen: Zuordnung[] | undefined = remainingZuordnungen?.concat(klassenToKeep);

    const zuordnungenUpdate: PersonenkontextUpdate[] | undefined = combinedZuordnungen?.map(
      mapZuordnungToPersonenkontextUpdate,
    );

    // Update the personenkontexte with the filtered list
    await personenkontextStore.updatePersonenkontexte(zuordnungenUpdate, currentPersonId);
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

  // Add the Klasse to it's corresponding Schule
  function computeZuordnungen(personenuebersicht: PersonenUebersicht | null): ZuordnungWithKlasse[] | undefined {
    const zuordnungen: Zuordnung[] | undefined = personenuebersicht?.zuordnungen;

    if (!zuordnungen) {
      return;
    }

    const result: ZuordnungWithKlasse[] = [];

    // Extract all Klassen from the Zuordnungen
    const klassen: Zuordnung[] = zuordnungen.filter(
      (zuordnung: Zuordnung) => zuordnung.typ === OrganisationsTyp.Klasse,
    );
    // Add every klasse to result
    for (const klasse of klassen) {
      // Find the specific parent of every Klasse (The rolle in the Klasse should also be the same role in the Parent (Schule))
      const administrierendeZuordnung: Zuordnung | undefined = zuordnungen.find(
        (z: Zuordnung) =>
          z.sskId === klasse.administriertVon && z.rolleId === klasse.rolleId && z.typ !== OrganisationsTyp.Klasse,
      );
      // If the parent is found then add the Klasse property to it
      if (administrierendeZuordnung) {
        const newZuordnungWithKlasse: ZuordnungWithKlasse = Zuordnung.from(administrierendeZuordnung);
        newZuordnungWithKlasse.klasse = klasse.sskName;
        result.push(newZuordnungWithKlasse);
      }
    }
    // Other Zuordnungen not of typ Klasse
    const otherZuordnungen: Zuordnung[] = zuordnungen.filter(
      (zuordnung: Zuordnung) => zuordnung.typ !== OrganisationsTyp.Klasse,
    );

    for (const zuordnung of otherZuordnungen) {
      // Only add Zuordnungen that don't have the same sskId and rolleId to avoid redundancy in the final result
      if (!result.find((z: Zuordnung) => z.sskId === zuordnung.sskId && z.rolleId === zuordnung.rolleId)) {
        result.push(zuordnung);
      }
    }
    // Sort by klasse, rolle and SSK (optional)
    result
      .sort((a: ZuordnungWithKlasse, b: ZuordnungWithKlasse) =>
        a.klasse && b.klasse ? a.klasse.localeCompare(b.klasse) : 0,
      )
      .sort((a: ZuordnungWithKlasse, b: ZuordnungWithKlasse) => a.rolle.localeCompare(b.rolle))
      .sort((a: ZuordnungWithKlasse, b: ZuordnungWithKlasse) => {
        if (a.sskDstNr == null) {
          return 1;
        }
        if (b.sskDstNr == null) {
          return -1;
        }
        return a.sskDstNr.localeCompare(b.sskDstNr);
      });
    return result;
  }

  const rollen: ComputedRef<TranslatedRolleWithAttrs[] | undefined> = useRollen();
  const organisationen: ComputedRef<TranslatedObject[] | undefined> = useOrganisationen();
  const klassen: ComputedRef<TranslatedObject[] | undefined> = computed(() => {
    // TODO: accessing the KlassenFilter this way violates encapsulation, should be refactored (see SPSH-2185)
    const activeStore: AutoCompleteStore<Organisation> | undefined =
      organisationStore.klassenFilters.get('personenkontext-create') ??
      organisationStore.klassenFilters.get('klasse-change');
    if (!activeStore) {
      return [];
    }
    return activeStore.filterResult.map((klasse: Organisation) => ({
      value: klasse.id,
      title: klasse.name,
    }));
  });

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

  type ChangePersonMetadata = {
    selectedVorname: string;
    selectedFamilienname: string;
    selectedKopersNrMetadata: string;
  };

  type ChangeBefristungForm = {
    selectedBefristung: Date;
    selectedBefristungOption: string;
    selectedRolle: string;
  };

  // Define a method to check if the selected Rolle is of type "Lern"
  function isLernRolle(selectedRolleId: string): boolean {
    const rolle: TranslatedRolleWithAttrs | undefined = rollen.value?.find(
      (r: TranslatedRolleWithAttrs) => r.value === selectedRolleId,
    );
    return !!rolle && rolle.rollenart === RollenArt.Lern;
  }

  const hasKopersNummer: ComputedRef<boolean> = computed(() => {
    return !!personStore.currentPerson?.person.personalnummer;
  });

  // Used on mount to check the retrieved Zuordnungen and if any of them has a Koperspflicht Merkmal
  const hasKopersRolle: ComputedRef<boolean> = computed(() => {
    return (
      !!zuordnungenWithPendingChanges.value?.find((zuordnung: Zuordnung) => {
        return zuordnung.merkmale.includes(RollenMerkmal.KopersPflicht);
      }) || false
    );
  });

  // Used to show device password block
  const hasLehrRolle: ComputedRef<boolean> = computed(() => {
    return (
      !!zuordnungenWithPendingChanges.value?.find((zuordnung: Zuordnung) => {
        return zuordnung.rollenArt === RollenArt.Lehr;
      }) || false
    );
  });

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

  watch(
    () => selectedZuordnungen.value[0], // Watch the first selected Zuordnung
    (newValue: Zuordnung | undefined) => {
      if (newValue) {
        const organisationId: string | undefined = newValue.sskId;
        const rollenIds: string[] | undefined = [newValue.rolleId];

        // Trigger the API call
        personenkontextStore.processWorkflowStep({
          personId: currentPersonId,
          operationContext: OperationContext.PERSON_BEARBEITEN,
          organisationId,
          rollenIds,
          limit: 25,
        });
      }

      isLernRolleForChangeKlasseResult.value = newValue?.rollenArt === RollenArt.Lern;
    },
    { immediate: true }, // Run on initialization if there's already a selected Zuordnung
  );

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

  const changeBefristungFormContext: FormContext<ChangeBefristungForm, ChangeBefristungForm> =
    useForm<ChangeBefristungForm>({
      validationSchema: getBefristungSchema(t),
    });

  // Change Klasse Form
  const [selectedSchule, selectedSchuleProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = defineFieldChangeKlasse('selectedSchule', vuetifyConfig);
  const [selectedNewKlasse, selectedNewKlasseProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = defineFieldChangeKlasse('selectedNewKlasse', vuetifyConfig);

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

  // Change Befristung Form
  const [selectedChangeBefristung, selectedChangeBefristungProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = changeBefristungFormContext.defineField('selectedBefristung', vuetifyConfig);
  const [selectedChangeBefristungOption, selectedChangeBefristungOptionProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = changeBefristungFormContext.defineField('selectedBefristungOption', vuetifyConfig);
  const [changeBefristungRolle]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = changeBefristungFormContext.defineField('selectedRolle', vuetifyConfig);

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

  const alertButtonAction: ComputedRef<() => void> = computed(() => {
    switch (personenkontextStore.errorCode) {
      case 'PERSONALNUMMER_NICHT_EINDEUTIG':
        return navigateToZuordnungForm;
      case 'PERSON_NOT_FOUND':
        return navigateToPersonTable;
      default:
        return (): void => router.go(0);
    }
  });

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
    zuordnungenWithPendingChanges.value = originalZuordnungen.value
      ? (JSON.parse(JSON.stringify(originalZuordnungen.value)) as ZuordnungWithKlasse[])
      : undefined;
  };

  function handleStoreUpdates(): void {
    if (personenkontextStore.errorCode) {
      creationErrorText.value = t(`admin.personenkontext.errors.${personenkontextStore.errorCode}`);
      creationErrorTitle.value = t(`admin.personenkontext.title.${personenkontextStore.errorCode}`);
    }
  }

  watch(() => personenkontextStore.errorCode, handleStoreUpdates);
  watch(() => personenkontextStore.loading, handleStoreUpdates);

  // This will send the updated list of Zuordnungen to the Backend on TOP of the new added one through the form.
  async function confirmAddition(): Promise<void> {
    await personenkontextStore.updatePersonenkontexte(
      finalZuordnungenUpdate.value,
      currentPersonId,
      selectedKopersNr.value,
    );
    createSuccessDialogVisible.value = !personenkontextStore.errorCode;
    // Cache the selected values to avoid losing them on form reset (Useful for when Kopers is already assigned and we want to redirect back to form)
    cachedSelectedOrganisation.value = selectedOrganisation.value!;
    cachedSelectedRolle.value = selectedRolle.value!;
    cachedSelectedKopersNr.value = selectedKopersNr.value!;
    formContext.resetForm();
    personStore.getPersonById(currentPersonId);
  }

  // This will send the updated list of Zuordnungen to the Backend with the selected Zuordnung but with the new Klasse.
  async function confirmChangeKlasse(): Promise<void> {
    await personenkontextStore.updatePersonenkontexte(finalZuordnungenUpdate.value, currentPersonId);
    changeKlasseSuccessDialogVisible.value = !personenkontextStore.errorCode;
    selectedZuordnungen.value = [];
    resetChangeKlasseForm();
  }

  async function confirmChangeBefristung(): Promise<void> {
    await personenkontextStore.updatePersonenkontexte(finalZuordnungenUpdate.value, currentPersonId);
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

  // Helper function to determine the existing RollenArt
  function getExistingRollenArt(zuordnungen: Zuordnung[]): RollenArt | undefined {
    const rollenIds: string[] = zuordnungen.map((zuordnung: Zuordnung) => zuordnung.rolleId);
    const existingRollen: TranslatedRolleWithAttrs[] | undefined = rollen.value?.filter(
      (rolle: TranslatedRolleWithAttrs) => rollenIds.includes(rolle.value),
    );

    if (existingRollen && existingRollen.length > 0) {
      return existingRollen[0]?.rollenart;
    }

    return undefined;
  }

  // Filter out the Rollen based on the user's existing Zuordnungen and selected organization
  const filteredRollen: ComputedRef = computed(() => {
    const existingZuordnungen: Zuordnung[] | undefined = personStore.personenuebersicht?.zuordnungen;

    // If no existing Zuordnungen then show all roles
    if (!existingZuordnungen || existingZuordnungen.length === 0) {
      return rollen.value;
    }

    const selectedOrgaId: string | undefined = selectedOrganisation.value;

    // Determine the existing RollenArt from Zuordnungen
    const existingRollenArt: RollenArt | undefined = getExistingRollenArt(existingZuordnungen);

    // Filter out Rollen that the user already has in the selected organization
    return rollen.value?.filter((rolle: TranslatedRolleWithAttrs) => {
      // Check if the user already has this role in the selected organization
      const alreadyHasRolleInSelectedOrga: boolean = existingZuordnungen.some(
        (zuordnung: Zuordnung) => zuordnung.rolleId === rolle.value && zuordnung.sskId === selectedOrgaId,
      );

      // If there's an existing RollenArt, only allow roles of that type
      if (existingRollenArt) {
        return !alreadyHasRolleInSelectedOrga && rolle.rollenart === existingRollenArt;
      }

      // If there's no existing RollenArt, allow any role that hasn't been assigned yet in the selected organization
      return !alreadyHasRolleInSelectedOrga;
    });
  });

  // Computed property to get the title of the selected rolle
  const selectedRolleTitle: ComputedRef<string | undefined> = computed(() => {
    return rollen.value?.find((rolle: TranslatedObject) => rolle.value === selectedRolle.value)?.title;
  });

  // Computed property to get the title of the selected klasse
  const selectedKlasseTitle: ComputedRef<string | undefined> = computed(() => {
    return klassen.value?.find((klasse: TranslatedObject) => klasse.value === selectedKlasse.value)?.title;
  });

  // Computed property to get the title of the selected new klasse
  const selectedNewKlasseTitle: ComputedRef<string | undefined> = computed(() => {
    return klassen.value?.find((klasse: TranslatedObject) => klasse.value === selectedNewKlasse.value)?.title;
  });

  // Computed property to get the title of the selected new klasse
  const isSubmitDisabled: ComputedRef<boolean> = computed(() => {
    return selectedNewKlasseTitle.value === selectedZuordnungen.value[0]?.klasse;
  });

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

  const onSubmitChangeKlasse: (e?: Event) => Promise<void | undefined> = handleSubmitChangeKlasse(() => {
    changeKlasseConfirmationDialogMessage.value = t('person.changeKlasseConfirmation', {
      oldKlasse: selectedZuordnungen.value[0]?.klasse,
      newKlasse: selectedNewKlasseTitle.value,
    });
    changeKlasseConfirmationDialogVisible.value = true;
  });

  const onSubmitCreateZuordnung: (e?: Event) => Promise<void | undefined> = formContext.handleSubmit(() => {
    if (selectedRolle.value) {
      if (isLernRolle(selectedRolle.value)) {
        createZuordnungConfirmationDialogMessage.value = t('person.addZuordnungKlasseConfirmation', {
          rollenname: selectedRolleTitle.value,
          klassenname: selectedKlasseTitle.value,
        });
      } else {
        createZuordnungConfirmationDialogMessage.value = t('person.addZuordnungConfirmation', {
          rollenname: selectedRolleTitle.value,
        });
      }
      createZuordnungConfirmationDialogVisible.value = true;
    }
  });

  const onSubmitChangeBefristung: (e?: Event) => Promise<void | undefined> = changeBefristungFormContext.handleSubmit(
    () => {
      const befristungDate: string | undefined = selectedChangeBefristung.value ?? calculatedBefristung.value;
      const oldBefristung: ZuordnungWithKlasse['befristung'] | undefined = selectedZuordnungen.value[0]?.befristung;
      let oldBefristungdFormatted: string;
      if (oldBefristung) {
        oldBefristungdFormatted = adjustDateForTimezoneAndFormat(oldBefristung);
      }
      changeBefristungConfirmationDialogMessage.value = t('person.changeBefristungConfirmation', {
        oldBefristung: oldBefristung ? oldBefristungdFormatted! : t('admin.befristung.unlimitedLower'),
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

    // The existing Klassenzuordnungen that the person has already
    const existingKlassen: Zuordnung[] | undefined = personStore.personenuebersicht?.zuordnungen.filter(
      (zuordnung: Zuordnung) => zuordnung.typ === OrganisationsTyp.Klasse,
    );
    // TODO: accessing the KlassenFilter this way violates encapsulation, should be refactored (see SPSH-2185)
    // The new selected Klasse to add as a separate Zuordnung
    const klasse: Organisation | undefined = organisationStore.klassenFilters
      .get('personenkontext-create')
      ?.filterResult.find((k: Organisation) => k.id === selectedKlasse.value);

    const befristungDate: string | undefined = selectedBefristung.value
      ? selectedBefristung.value
      : calculatedBefristung.value;
    const formattedBefristung: string | null = formatDateToISO(befristungDate) ?? null;

    if (organisation) {
      newZuordnung.value = new Zuordnung(
        organisation.id,
        selectedRolle.value ?? '',
        organisation.name,
        organisation.kennung ?? '',
        rollen.value?.find((rolle: TranslatedRolleWithAttrs) => rolle.value === selectedRolle.value)?.title || '',
        rollen.value?.find((rolle: TranslatedRolleWithAttrs) => rolle.value === selectedRolle.value)
          ?.rollenart as RollenArt,
        organisation.administriertVon ?? '',
        OrganisationsTyp.Schule,
        true,
        formattedBefristung,
        [],
        [],
      );
      if (zuordnungenWithPendingChanges.value) {
        zuordnungenToBePersisted.value = zuordnungenWithPendingChanges.value;
        zuordnungenToBePersisted.value.push(newZuordnung.value);
      }

      // Add the new selected Klasse to finalZuordnungen
      if (klasse) {
        newZuordnung.value.klasse = klasse.name;
        zuordnungenToBePersisted.value.push(
          new Zuordnung(
            klasse.id,
            selectedRolle.value ?? '',
            klasse.name,
            klasse.kennung ?? '',
            rollen.value?.find((rolle: TranslatedRolleWithAttrs) => rolle.value === selectedRolle.value)?.title || '',
            rollen.value?.find((rolle: TranslatedRolleWithAttrs) => rolle.value === selectedRolle.value)
              ?.rollenart as RollenArt,
            klasse.administriertVon ?? '',
            OrganisationsTyp.Klasse,
            true,
            formattedBefristung,
            [],
            [],
          ),
        );
      }

      // Add all existing Klassenzuordnungen to finalZuordnungen
      if (existingKlassen) {
        existingKlassen.forEach((existingKlasse: Zuordnung) => {
          zuordnungenToBePersisted.value.push(Zuordnung.from(existingKlasse));
        });
      }
    }

    // Filter out existing Klassen from zuordnungenResult
    zuordnungenWithPendingChanges.value = zuordnungenWithPendingChanges.value?.filter(
      (zuordnung: Zuordnung) => zuordnung.typ !== OrganisationsTyp.Klasse,
    );

    prepareCreation();
  };

  // When the button "Yes" from the Dialog after filling the form for changing the Klasse is clicked
  const confirmDialogChangeKlasse = (): void => {
    changeKlasseConfirmationDialogVisible.value = false;
    // Find the Orga object for the selected Schule (unchangeable anyways)
    const organisation: Organisation | undefined = personenkontextStore.workflowStepResponse?.organisations.find(
      (orga: Organisation) => orga.id === selectedSchule.value,
    );

    // TODO: accessing the KlassenFilter this way violates encapsulation, should be refactored (see SPSH-2185)
    // Find the Orga object for the selected new Klasse
    const newKlasse: Organisation | undefined = organisationStore.klassenFilters
      .get('klasse-change')
      ?.filterResult.find((k: Organisation) => k.id === selectedNewKlasse.value);

    // The remaining Zuordnungen that were not selected for deletion
    const remainingZuordnungen: ZuordnungWithKlasse[] | undefined = zuordnungenWithPendingChanges.value?.filter(
      (zuordnung: Zuordnung) => !selectedZuordnungen.value.includes(zuordnung),
    );

    if (organisation) {
      // Used to build the Zuordnung of type Schule and keep track of it (Only use it in the template)
      // This is basically the old Zuordnung in the Schule but since it is already available in ZuordnungenResult we won't be adding this to the finalZuordnungen
      // It's just better to use this since using an array of Zuordnung (selectedZuordnungen) in the template is not so fun
      newZuordnung.value = new Zuordnung(
        organisation.id,
        selectedZuordnungen.value[0]?.rolleId ?? '',
        organisation.name,
        organisation.kennung ?? '',
        rollen.value?.find((rolle: TranslatedRolleWithAttrs) => rolle.value === selectedZuordnungen.value[0]?.rolleId)
          ?.title || '',
        rollen.value?.find((rolle: TranslatedRolleWithAttrs) => rolle.value === selectedRolle.value)
          ?.rollenart as RollenArt,
        organisation.administriertVon ?? '',
        OrganisationsTyp.Schule,
        true,
        null,
        [],
        [],
      );

      if (zuordnungenWithPendingChanges.value) {
        zuordnungenToBePersisted.value = zuordnungenWithPendingChanges.value;
      }

      // Get all Klassen Zuordnungen
      const klassenZuordnungen: Zuordnung[] | undefined = personStore.personenuebersicht?.zuordnungen.filter(
        (zuordnung: Zuordnung) => zuordnung.typ === OrganisationsTyp.Klasse,
      );

      // Create a map of Schule to Klasse relationships to keep the Klassen that are not supposed to be deleted
      const schuleToKlasseMap: Map<string, Zuordnung[]> = new Map<string, Zuordnung[]>();

      klassenZuordnungen?.forEach((klasseZuordnung: Zuordnung) => {
        const schuleId: string = klasseZuordnung.administriertVon;
        const klasse: string = klasseZuordnung.sskName;
        const rolle: string = klasseZuordnung.rolleId;
        if (!schuleToKlasseMap.has(schuleId + klasse + rolle)) {
          schuleToKlasseMap.set(schuleId + klasse + rolle, []);
        }
        schuleToKlasseMap.get(schuleId + klasse + rolle)?.push(klasseZuordnung);
      });

      // Find Klassen that should be kept
      const klassenToKeep: Zuordnung[] = [];

      // For each remaining Zuordnung that is a Schule, keep its associated Klassen
      remainingZuordnungen?.forEach((zuordnung: ZuordnungWithKlasse) => {
        const associatedKlassen: Zuordnung[] =
          schuleToKlasseMap.get(zuordnung.sskId + zuordnung.klasse + zuordnung.rolleId) || [];
        klassenToKeep.push(...associatedKlassen);
      });

      zuordnungenToBePersisted.value = [...zuordnungenToBePersisted.value, ...klassenToKeep];

      // Add the new Klasse Zuordnung
      if (newKlasse) {
        newZuordnung.value.klasse = newKlasse.name;
        zuordnungenToBePersisted.value.push(
          new Zuordnung(
            newKlasse.id,
            selectedZuordnungen.value[0]?.rolleId ?? '',
            newKlasse.name,
            newKlasse.kennung ?? '',
            rollen.value?.find(
              (rolle: TranslatedRolleWithAttrs) => rolle.value === selectedZuordnungen.value[0]?.rolleId,
            )?.title || '',
            rollen.value?.find((rolle: TranslatedRolleWithAttrs) => rolle.value === selectedRolle.value)
              ?.rollenart as RollenArt,
            newKlasse.administriertVon ?? '',
            OrganisationsTyp.Klasse,
            true,
            null,
            [],
            [],
          ),
        );
      }
    }

    // zuordnungenResult is what we show in the UI and so Zuordnungen of type Klasse shouldn't show up (since they are merged with the ones of type Schule already)
    zuordnungenWithPendingChanges.value = zuordnungenWithPendingChanges.value?.filter(
      (zuordnung: Zuordnung) => zuordnung.typ !== OrganisationsTyp.Klasse,
    );
    // Proceed with the pending change Klasse operation
    prepareChangeKlasse();
  };

  const confirmDialogChangeBefristung = (): void => {
    changeBefristungConfirmationDialogVisible.value = false;

    const befristungDate: string | undefined = selectedChangeBefristung.value ?? calculatedBefristung.value;
    const formattedBefristung: string | null = formatDateToISO(befristungDate) ?? null;

    // copy zuordnung from old one and update befristung
    const selectedZuordnung: ZuordnungWithKlasse = selectedZuordnungen.value[0]!;

    // for the template
    newZuordnung.value = Zuordnung.from(selectedZuordnung);
    newZuordnung.value.klasse = selectedZuordnung.klasse;
    newZuordnung.value.befristung = formattedBefristung;
    newZuordnung.value.editable = true;

    zuordnungenToBePersisted.value = (personStore.personenuebersicht?.zuordnungen ?? []).map((zuordnung: Zuordnung) => {
      const isSelectedOrgaOrChildKlasse: boolean =
        zuordnung.sskId === selectedZuordnung.sskId ||
        (zuordnung.typ === OrganisationsTyp.Klasse && zuordnung.administriertVon === selectedZuordnung.sskId);
      if (isSelectedOrgaOrChildKlasse && zuordnung.rolleId === selectedZuordnung.rolleId) {
        const updatedZuordnung: Zuordnung = Zuordnung.from(zuordnung);
        updatedZuordnung.befristung = formattedBefristung;
        return updatedZuordnung;
      }
      return zuordnung;
    });

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

  watch(
    () => personStore.personenuebersicht,
    async (newValue: PersonenUebersicht | null) => {
      zuordnungenWithPendingChanges.value = computeZuordnungen(newValue);
      const organisationIds: Array<string> = [...new Set(newValue?.zuordnungen.map((z: Zuordnung) => z.sskId))];
      if (organisationIds.length > 0) {
        await organisationStore.getParentOrganisationsByIds(organisationIds);
      }
    },
    { immediate: true },
  );

  function handleFieldReset(field: string): void {
    if (field === 'selectedRolle') {
      selectedRolle.value = undefined;
    } else if (field === 'selectedKlasse') {
      if (selectedKlasse.value) {
        selectedKlasse.value = undefined;
      }
    }
  }

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
    } else if (isChangeKlasseFormActive.value) {
      return isChangeKlasseFieldDirty('selectedSchule') || isChangeKlasseFieldDirty('selectedNewKlasse');
    } else if (isEditActive.value) {
      return isZuordnungCreationFormDirty.value;
    }
    return false;
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
    if (isFormDirty() || hasPendingChange.value) {
      showUnsavedChangesDialog.value = true;
      blockedNext = next;
    } else {
      next();
    }
  });

  setupWatchers();
  setupRolleWatcher();
  setupChangeBefristungWatchers();

  watch(hasNoKopersNr, (newValue: boolean | undefined) => {
    if (newValue) {
      showNoKopersNrConfirmationDialog.value = true;
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

  const differentDateSelected: ComputedRef<boolean> = computed(() => {
    const newBefristungDate: string | undefined = selectedChangeBefristung.value ?? calculatedBefristung.value;
    const currentBefristungDate: string | undefined = selectedZuordnungen.value[0]?.befristung
      ? adjustDateForTimezoneAndFormat(selectedZuordnungen.value[0]?.befristung)
      : undefined;

    return currentBefristungDate !== newBefristungDate;
  });

  onBeforeMount(async () => {
    personStore.resetState();
    twoFactorAuthentificationStore.resetState();

    const twoFARequirementPromise: Promise<void> = twoFactorAuthentificationStore.get2FARequirement(currentPersonId);
    const personByIdPromise: Promise<void> = personStore.getPersonById(currentPersonId);
    const personUebersichtPromise: Promise<void> = personStore.getPersonenuebersichtById(currentPersonId);
    const workflowStepPromise: Promise<void> = personenkontextStore.processWorkflowStep({
      personId: currentPersonId,
      operationContext: OperationContext.PERSON_BEARBEITEN,
      limit: 25,
    });
    const get2FAStatePromise: Promise<void> = twoFactorAuthentificationStore.get2FAState(currentPersonId);
    await Promise.all([
      twoFARequirementPromise,
      personByIdPromise,
      personUebersichtPromise,
      workflowStepPromise,
      get2FAStatePromise,
    ]);
    loading.value = false;

    hasKlassenZuordnung.value = personStore.personenuebersicht?.zuordnungen.some(
      (zuordnung: Zuordnung) => zuordnung.typ === OrganisationsTyp.Klasse,
    );
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
        <!-- Zuordnungen -->
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
                    personStore.personenuebersicht?.zuordnungen &&
                    personStore.personenuebersicht?.zuordnungen.length > 0
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
                      newZuordnung &&
                      zuordnung.sskId === newZuordnung.sskId &&
                      zuordnung.rolleId === newZuordnung.rolleId
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
                        newZuordnung &&
                        zuordnung.sskId === newZuordnung.sskId &&
                        zuordnung.rolleId === newZuordnung.rolleId
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
                        newZuordnung &&
                        zuordnung.sskId === newZuordnung.sskId &&
                        zuordnung.rolleId === newZuordnung.rolleId
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
                  :person-id="currentPersonId"
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
                  :klassen="klassen"
                  :selected-schule-props="selectedSchuleProps"
                  :selected-new-klasse-props="selectedNewKlasseProps"
                  :on-submit="onSubmitChangeKlasse"
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
          v-if="hasLehrRolle"
          class="border-opacity-100 rounded my-6 mx-4"
          color="#E5EAEF"
          thickness="6"
        />
        <!-- reset device password -->
        <v-container
          v-if="hasLehrRolle"
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
