import { computed, ref, type ComputedRef, type Ref } from 'vue';

export type ZuordnungOperation = 'creation' | 'deletion' | 'changeKlasse' | 'changeBefristung';

// 'form' is the form of the operation, 'review' is the preview of the pending change that can be saved
type ZuordnungEditPhase = 'form' | 'review';

type ZuordnungEditStep = {
  operation: ZuordnungOperation;
  phase: ZuordnungEditPhase;
};

// The view of a single operation on the edit mode
export type ZuordnungOperationMode = {
  isFormActive: ComputedRef<boolean>;
  showForm: () => void;
  showReview: () => void;
  // Leaves the operation. Does nothing if another operation is active.
  end: () => void;
};

export type ZuordnungEditMode = {
  // The operation whose change is pending, if any
  pendingOperation: ComputedRef<ZuordnungOperation | undefined>;
  isFormActive: ComputedRef<boolean>;
  hasPendingChange: ComputedRef<boolean>;
  reset: () => void;
  forOperation: (operation: ZuordnungOperation) => ZuordnungOperationMode;
};

// At most one operation is active at a time, either showing its form or the review of its pending change
export function useZuordnungEditMode(): ZuordnungEditMode {
  const step: Ref<ZuordnungEditStep | undefined> = ref(undefined);

  const pendingOperation: ComputedRef<ZuordnungOperation | undefined> = computed(() =>
    step.value?.phase === 'review' ? step.value.operation : undefined,
  );
  const isFormActive: ComputedRef<boolean> = computed(() => step.value?.phase === 'form');
  const hasPendingChange: ComputedRef<boolean> = computed(() => pendingOperation.value !== undefined);

  function reset(): void {
    step.value = undefined;
  }

  function forOperation(operation: ZuordnungOperation): ZuordnungOperationMode {
    return {
      isFormActive: computed(() => step.value?.operation === operation && step.value.phase === 'form'),
      showForm: (): void => {
        step.value = { operation, phase: 'form' };
      },
      showReview: (): void => {
        step.value = { operation, phase: 'review' };
      },
      end: (): void => {
        if (step.value?.operation === operation) {
          step.value = undefined;
        }
      },
    };
  }

  return { pendingOperation, isFormActive, hasPendingChange, reset, forOperation };
}
