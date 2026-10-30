import {
  useServiceProviderStore,
  type ServiceProviderIdNameResponse,
  type ServiceProviderRollenVerwaltungFilter,
  type ServiceProviderStore,
} from '@/stores/ServiceProviderStore';
import { useSearchFilterStore, type SearchFilterStore } from '@/stores/SearchFilterStore';
import { dedup } from '@/utils/arrays';
import { computed, reactive, toRef, watch, type ComputedRef, type Ref } from 'vue';
import { useDebouncedSearch } from './useDebouncedSearch';

export type UseServiceProvidersForRollenVerwaltungAutocompleteReturn = {
  selectedServiceProviders: Ref<ServiceProviderIdNameResponse[]>;
  searchInput: Ref<string>;
  filter: ServiceProviderRollenVerwaltungFilter;
  items: ComputedRef<ServiceProviderIdNameResponse[]>;
  init: () => Promise<void>;
};

export function useServiceProvidersForRollenVerwaltungAutocomplete(
  initialFilter: ServiceProviderRollenVerwaltungFilter,
): UseServiceProvidersForRollenVerwaltungAutocompleteReturn {
  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
  const searchFilterStore: SearchFilterStore = useSearchFilterStore();
  const selectedServiceProviders: Ref<ServiceProviderIdNameResponse[]> = toRef(
    searchFilterStore,
    'selectedServiceProvidersForRollen',
  );
  const filter: ServiceProviderRollenVerwaltungFilter = reactive<ServiceProviderRollenVerwaltungFilter>({
    ...initialFilter,
  });
  const searchInput: Ref<string> = useDebouncedSearch((value: string): void => {
    filter.searchStr = value || undefined;
  });

  watch(
    filter,
    (): void => {
      void serviceProviderStore.getServiceProvidersForRollenVerwaltung({ ...filter });
    },
    { deep: true },
  );

  const items: ComputedRef<ServiceProviderIdNameResponse[]> = computed((): ServiceProviderIdNameResponse[] => {
    return dedup(
      [...selectedServiceProviders.value, ...serviceProviderStore.serviceProvidersForRollenVerwaltung],
      (serviceProvider: ServiceProviderIdNameResponse): string => serviceProvider.id,
    ).sort((first: ServiceProviderIdNameResponse, second: ServiceProviderIdNameResponse): number =>
      first.name.localeCompare(second.name),
    );
  });

  async function init(): Promise<void> {
    await serviceProviderStore.getServiceProvidersForRollenVerwaltung({ ...filter });
  }

  return { selectedServiceProviders, searchInput, filter, items, init };
}
