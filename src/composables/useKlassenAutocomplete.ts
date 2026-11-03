import { KlassenFilter, Organisation, OrganisationStore, useOrganisationStore } from '@/stores/OrganisationStore';
import { dedup } from '@/utils/arrays';
import { computed, reactive, ref, watch, type ComputedRef, type Ref, type WatchSource } from 'vue';
import { useDebouncedSearch } from './useDebouncedSearch';

export type KlassenSelection<M extends boolean> = M extends true ? Organisation[] : Organisation | undefined;
type AnySelection = Organisation[] | Organisation | undefined;

const isMultiple = (s: AnySelection): s is Organisation[] => Array.isArray(s);

export function useKlassenAutocomplete<M extends boolean>(
  initialFilter: KlassenFilter,
  storeKey: string = '',
  multiple?: M,
  administriertVonSource?: WatchSource<string[] | undefined>,
): {
  selectedKlassen: Ref<KlassenSelection<M>>;
  searchInput: Ref<string>;
  filter: KlassenFilter;
  items: ComputedRef<Organisation[]>;
  init: () => Promise<void>;
} {
  const organisationStore: OrganisationStore = useOrganisationStore();
  const selectedKlassen: Ref<AnySelection> = ref(multiple ? [] : undefined);
  const filter: KlassenFilter = reactive<KlassenFilter>({ ...initialFilter });
  const searchInput: Ref<string> = useDebouncedSearch((value: string): void => {
    filter.searchString = value;
  });

  watch(
    filter,
    (): void => {
      void organisationStore.loadKlassenForFilter({ ...filter }, storeKey);
    },
    { deep: true },
  );

  if (administriertVonSource) {
    watch(administriertVonSource, (administriertVon: string[] | undefined): void => {
      filter.administriertVon = administriertVon;
    });
  }

  watch(selectedKlassen, (value: AnySelection): void => {
    if (isMultiple(value) ? value.length === 0 : !value) {
      searchInput.value = '';
    }
  });

  const items: ComputedRef<Organisation[]> = computed((): Organisation[] => {
    const byId: (k: Organisation) => string = (klasse: Organisation): string => klasse.id;
    const store: Array<Organisation> = organisationStore.klassenFilters.get(storeKey)?.filterResult ?? [];
    const selected: AnySelection = selectedKlassen.value;
    if (isMultiple(selected)) {
      return dedup([...selected, ...store], byId);
    }
    return selected ? dedup([selected, ...store], byId) : store;
  });

  async function init(): Promise<void> {
    await organisationStore.loadKlassenForFilter({ ...filter }, storeKey);
  }

  return { selectedKlassen: selectedKlassen as Ref<KlassenSelection<M>>, searchInput, filter, items, init };
}
