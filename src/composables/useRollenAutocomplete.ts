import {
  useRolleStore,
  type RolleFilter,
  type RolleWithServiceProvidersResponse,
  type RolleStore,
} from '@/stores/RolleStore';
import { dedup } from '@/utils/arrays';
import { computed, reactive, ref, watch, type ComputedRef, type Ref } from 'vue';
import { useDebouncedSearch } from './useDebouncedSearch';

export type UseRollenAutocompleteReturn = {
  selectedRollen: Ref<RolleWithServiceProvidersResponse[]>;
  searchInput: Ref<string>;
  filter: RolleFilter;
  items: ComputedRef<RolleWithServiceProvidersResponse[]>;
  init: () => Promise<void>;
};

export function useRollenAutocomplete(initialFilter: RolleFilter): UseRollenAutocompleteReturn {
  const rolleStore: RolleStore = useRolleStore();
  const selectedRollen: Ref<RolleWithServiceProvidersResponse[]> = ref<RolleWithServiceProvidersResponse[]>([]);
  const filter: RolleFilter = reactive<RolleFilter>({ ...initialFilter });
  const searchInput: Ref<string> = useDebouncedSearch((value: string): void => {
    filter.searchString = value;
  });

  watch(
    filter,
    (): void => {
      void rolleStore.getAllRollen({ ...filter });
    },
    { deep: true },
  );

  watch(selectedRollen, (value: RolleWithServiceProvidersResponse[]): void => {
    if (value.length === 0) {
      searchInput.value = '';
    }
  });

  const items: ComputedRef<RolleWithServiceProvidersResponse[]> = computed((): RolleWithServiceProvidersResponse[] => {
    return dedup(
      [...selectedRollen.value, ...rolleStore.allRollen],
      (rolle: RolleWithServiceProvidersResponse): string => rolle.id,
    ).sort((first: RolleWithServiceProvidersResponse, second: RolleWithServiceProvidersResponse): number =>
      first.name.localeCompare(second.name),
    );
  });

  async function init(): Promise<void> {
    await rolleStore.getAllRollen({ ...filter });
  }

  return { selectedRollen, searchInput, filter, items, init };
}
