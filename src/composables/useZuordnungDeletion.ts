import type { ZuordnungOperationMode } from '@/composables/useZuordnungEditMode';
import { useAuthStore, type AuthStore, type PersonenkontextRolleFields } from '@/stores/AuthStore';
import { OrganisationsTyp } from '@/stores/OrganisationStore';
import {
  mapZuordnungToPersonenkontextUpdate,
  usePersonenkontextStore,
  type PersonenkontextStore,
  type PersonenkontextUpdate,
} from '@/stores/PersonenkontextStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import { RollenArt } from '@/stores/RolleStore';
import { useServiceProviderStore, type ServiceProviderStore } from '@/stores/ServiceProviderStore';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import {
  buildZuordnungenForDeletion,
  type ZuordnungenWorkingState,
  type ZuordnungWithKlasse,
} from '@/utils/zuordnungen';
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { useRouter, type Router } from 'vue-router';

export type ZuordnungDeletion = {
  deleteSuccessDialogVisible: Ref<boolean>;
  cannotDeleteDialogVisible: Ref<boolean>;
  isDeleteExternZuordnungDisabled: ComputedRef<boolean>;
  prepareDeletion: () => void;
  confirmDeletion: () => Promise<void>;
  closeDeleteSuccessDialog: () => void;
  closeCannotDeleteDialog: () => void;
};

// Handlers for deleting the selected Zuordnungen
export function useZuordnungDeletion(params: {
  personId: Readonly<Ref<string>>;
  isEditActive: Ref<boolean>;
  mode: ZuordnungOperationMode;
  state: ZuordnungenWorkingState;
}): ZuordnungDeletion {
  const { personId, isEditActive, mode, state }: typeof params = params;
  const personStore: PersonStore = usePersonStore();
  const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
  const authStore: AuthStore = useAuthStore();
  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
  const router: Router = useRouter();

  const deleteSuccessDialogVisible: Ref<boolean> = ref(false);
  const cannotDeleteDialogVisible: Ref<boolean> = ref(false);
  // If no editable Zuordnungen are left, the person table is shown after the success dialog is closed
  const navigateToPersonTableOnClose: Ref<boolean> = ref(false);

  // Landesadmins have a personenkontext at the root organisation node; Schuladmins do not.
  const isDeleteExternZuordnungDisabled: ComputedRef<boolean> = computed(() => {
    const hasExternSelected: boolean = state.selectedZuordnungen.value.some(
      (z: ZuordnungWithKlasse) => z.rollenArt === RollenArt.Extern,
    );
    const isLandesadmin: boolean =
      authStore.currentUser?.personenkontexte?.some(
        (pk: PersonenkontextRolleFields) => pk.organisation.typ === OrganisationsTyp.Root,
      ) ?? false;
    return hasExternSelected && !isLandesadmin;
  });

  // Triggers the template to prepare the deletion
  const prepareDeletion = (): void => {
    mode.showReview();
  };

  const confirmDeletion = async (): Promise<void> => {
    // Check if the current user is trying to delete their own Zuordnungen
    if (authStore.currentUser?.personId === personId.value) {
      cannotDeleteDialogVisible.value = true;
      return;
    }

    const {
      remainingZuordnungen,
      zuordnungenToBePersisted: combinedZuordnungen,
    }: ReturnType<typeof buildZuordnungenForDeletion> = buildZuordnungenForDeletion(
      state.zuordnungenWithPendingChanges.value,
      personStore.personenuebersicht?.zuordnungen,
      state.selectedZuordnungen.value,
    );

    const zuordnungenUpdate: PersonenkontextUpdate[] | undefined = combinedZuordnungen?.map(
      mapZuordnungToPersonenkontextUpdate,
    );

    // Update the personenkontexte with the filtered list
    await personenkontextStore.updatePersonenkontexte(zuordnungenUpdate, personId.value);
    state.zuordnungenWithPendingChanges.value = remainingZuordnungen;
    state.selectedZuordnungen.value = [];

    // Filter out Zuordnungen with editable === false
    const editableZuordnungen: Zuordnung[] | undefined = combinedZuordnungen?.filter(
      (zuordnung: Zuordnung) => zuordnung.editable,
    );

    deleteSuccessDialogVisible.value = !personenkontextStore.errorCode;
    navigateToPersonTableOnClose.value = !editableZuordnungen || editableZuordnungen.length === 0;
  };

  const closeDeleteSuccessDialog = (): void => {
    deleteSuccessDialogVisible.value = false;
    isEditActive.value = false;
    mode.end();
    if (navigateToPersonTableOnClose.value) {
      router.push({ name: 'person-management' });
      return;
    }
    personStore.getPersonenuebersichtById(personId.value);
    serviceProviderStore.getServiceProvidersByPersonId(personId.value);
  };

  const closeCannotDeleteDialog = (): void => {
    cannotDeleteDialogVisible.value = false;
  };

  return {
    deleteSuccessDialogVisible,
    cannotDeleteDialogVisible,
    isDeleteExternZuordnungDisabled,
    prepareDeletion,
    confirmDeletion,
    closeDeleteSuccessDialog,
    closeCannotDeleteDialog,
  };
}
