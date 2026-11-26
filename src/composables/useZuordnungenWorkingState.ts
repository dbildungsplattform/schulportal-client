import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import { RollenArt } from '@/stores/RolleStore';
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
export function useZuordnungenWorkingState(): ZuordnungenWorkingStateResult {
  const personStore: PersonStore = usePersonStore();

  const zuordnungenWithPendingChanges: Ref<ZuordnungWithKlasse[] | undefined> = ref<ZuordnungWithKlasse[] | undefined>(
    undefined,
  );
  const selectedZuordnungen: Ref<ZuordnungWithKlasse[]> = ref<ZuordnungWithKlasse[]>([]);
  const newZuordnung: Ref<ZuordnungWithKlasse | undefined> = ref<ZuordnungWithKlasse | undefined>(undefined);
  const zuordnungenToBePersisted: Ref<Zuordnung[]> = ref<Zuordnung[]>([]);
  const originalZuordnungen: Ref<ZuordnungWithKlasse[] | undefined> = ref(undefined);

  const editableZuordnungen: ComputedRef<ZuordnungWithKlasse[]> = computed(
    () => zuordnungenWithPendingChanges.value?.filter((zuordnung: Zuordnung) => zuordnung.editable) ?? [],
  );

  const canChangeKlasse: ComputedRef<boolean> = computed(() => {
    const selected: Zuordnung | undefined = selectedZuordnungen.value[0];
    const hasOneSelectedZuordnung: boolean = selectedZuordnungen.value.length === 1;
    const hasLernRolle: boolean = selected?.rollenArt === RollenArt.Lern;
    const hasRolleID: boolean = !!selected?.rolleId;

    return hasOneSelectedZuordnung && hasRolleID && hasLernRolle;
  });

  watch(
    () => personStore.personenuebersicht,
    (newValue: PersonWithZuordnungenSource | null) => {
      zuordnungenWithPendingChanges.value = computeZuordnungenWithKlasse(newValue);
    },
    { immediate: true },
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
