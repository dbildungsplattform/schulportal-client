import type { Organisation } from '@/stores/OrganisationStore';
import { computed, ref, watch, type Ref, type WritableComputedRef } from 'vue';

/**
 * This composable keeps id-based selection for forms in sync with the object-based selection.
 * @param id - The ref of the id of the selected organisation.
 * @param initialOrganisation - A function that returns the initial organisation object, which can be null or undefined.
 * @returns A writable computed ref representing the actual selection.
 */
export function useOrganisationSelection(
  id: Ref<string | undefined>,
  initialOrganisation: () => Organisation | null | undefined,
): WritableComputedRef<Organisation | null | undefined> {
  const selection: Ref<Organisation | undefined> = ref();

  watch(
    [id, initialOrganisation],
    ([organisationId, initial]: [string | undefined, Organisation | null | undefined]): void => {
      if (initial && initial.id === organisationId) {
        selection.value = initial;
      } else if (selection.value?.id !== organisationId) {
        selection.value = undefined;
      }
    },
    { immediate: true },
  );

  return computed({
    get: (): Organisation | undefined => (selection.value?.id === id.value ? selection.value : undefined),
    set: (organisation: Organisation | null | undefined): void => {
      selection.value = organisation ?? undefined;
      if (id.value !== organisation?.id) {
        id.value = organisation?.id;
      }
    },
  });
}
