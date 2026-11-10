import {
  useRolleStore,
  type RolleResponse,
  type RolleStore,
  type RollenForPersonAdministrationParams,
} from '@/stores/RolleStore';
import { dedup } from '@/utils/arrays';
import { computed, reactive, ref, watch, type ComputedRef, type Ref } from 'vue';
import { useDebouncedSearch } from './useDebouncedSearch';

export type UseRollenForPersonAdministrationAutocompleteReturn = {
  selectedRollen: Ref<RolleResponse[]>;
  searchInput: Ref<string>;
  filter: RollenForPersonAdministrationParams;
  items: ComputedRef<RolleResponse[]>;
  init: () => Promise<void>;
};

export function useRollenForPersonAdministrationAutocomplete(
  initialFilter: RollenForPersonAdministrationParams,
): UseRollenForPersonAdministrationAutocompleteReturn {
  const rolleStore: RolleStore = useRolleStore();
  const selectedRollen: Ref<RolleResponse[]> = ref<RolleResponse[]>([]);
  const filter: RollenForPersonAdministrationParams = reactive<RollenForPersonAdministrationParams>({
    ...initialFilter,
  });
  const searchInput: Ref<string> = useDebouncedSearch((value: string): void => {
    filter.searchStr = value;
  });

  watch(
    filter,
    (): void => {
      void rolleStore.getRollenForPersonAdministration({ ...filter });
    },
    { deep: true },
  );

  watch(selectedRollen, (value: RolleResponse[]): void => {
    if (value.length === 0) {
      searchInput.value = '';
    }
  });

  const items: ComputedRef<RolleResponse[]> = computed((): RolleResponse[] => {
    return dedup(
      [...selectedRollen.value, ...rolleStore.rollenForPersonAdministration],
      (rolle: RolleResponse): string => rolle.id,
    ).sort((first: RolleResponse, second: RolleResponse): number => first.name.localeCompare(second.name));
  });

  async function init(): Promise<void> {
    await rolleStore.getRollenForPersonAdministration({ ...filter });
  }

  return { selectedRollen, searchInput, filter, items, init };
}
