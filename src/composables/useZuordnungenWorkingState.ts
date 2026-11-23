import { OperationContext, usePersonenkontextStore, type PersonenkontextStore } from '@/stores/PersonenkontextStore';
import { RollenArt } from '@/stores/RolleStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import {
  cloneZuordnungen,
  computeZuordnungenWithKlasse,
  type PersonWithZuordnungenSource,
  type ZuordnungenWorkingState,
  type ZuordnungWithKlasse,
} from '@/utils/zuordnungen';
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';

export type ZuordnungenWorkingStateResult = ZuordnungenWorkingState & {
  editableZuordnungen: ComputedRef<ZuordnungWithKlasse[]>;
  canChangeKlasse: ComputedRef<boolean>;
  // Remembers the Zuordnungen before any changes are done
  startEditing: () => void;
  // Drops the selection and the pending changes
  discardChanges: () => void;
};

// The Zuordnungen of the person with the pending changes of the edit flow and the selection of them
export function useZuordnungenWorkingState(params: { personId: Readonly<Ref<string>> }): ZuordnungenWorkingStateResult {
  const personStore: PersonStore = usePersonStore();
  const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();

  const zuordnungenWithPendingChanges: Ref<ZuordnungWithKlasse[] | undefined> = ref<ZuordnungWithKlasse[] | undefined>(
    undefined,
  );
  const selectedZuordnungen: Ref<ZuordnungWithKlasse[]> = ref<ZuordnungWithKlasse[]>([]);
  const newZuordnung: Ref<ZuordnungWithKlasse | undefined> = ref<ZuordnungWithKlasse | undefined>(undefined);
  const zuordnungenToBePersisted: Ref<Zuordnung[]> = ref<Zuordnung[]>([]);
  const originalZuordnungen: Ref<ZuordnungWithKlasse[] | undefined> = ref(undefined);
  // Check if the button to change the Klasse should be active or not. Activate only if there is 1 selected Zuordnung and if it is of type LERN.
  const isLernRolleForChangeKlasseResult: Ref<boolean> = ref(false);

  const editableZuordnungen: ComputedRef<ZuordnungWithKlasse[]> = computed(
    () => zuordnungenWithPendingChanges.value?.filter((zuordnung: Zuordnung) => zuordnung.editable) ?? [],
  );

  const canChangeKlasse: ComputedRef<boolean> = computed(() => {
    const hasOneSelectedZuordnung: boolean = selectedZuordnungen.value.length === 1;
    return !!selectedZuordnungen.value[0]?.rolleId && isLernRolleForChangeKlasseResult.value && hasOneSelectedZuordnung;
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
          personId: params.personId.value,
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

  const startEditing = (): void => {
    // Deep copy of the zuordnungenResult to keep track of the Zuordnungen before any changes were done.
    // This is necessary if a user cancels the editing at some point and the zuordnungenResult was mutated at the time.
    originalZuordnungen.value = cloneZuordnungen(zuordnungenWithPendingChanges.value);
  };

  const discardChanges = (): void => {
    selectedZuordnungen.value = [];
    zuordnungenWithPendingChanges.value = cloneZuordnungen(originalZuordnungen.value);
  };

  return {
    selectedZuordnungen,
    zuordnungenWithPendingChanges,
    newZuordnung,
    zuordnungenToBePersisted,
    editableZuordnungen,
    canChangeKlasse,
    startEditing,
    discardChanges,
  };
}
