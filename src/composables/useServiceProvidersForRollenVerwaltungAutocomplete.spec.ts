import { useSearchFilterStore, type SearchFilterStore } from '@/stores/SearchFilterStore';
import {
  useServiceProviderStore,
  type ServiceProviderIdNameResponse,
  type ServiceProviderRollenVerwaltungFilter,
  type ServiceProviderStore,
} from '@/stores/ServiceProviderStore';
import { DoFactory } from 'test/DoFactory';
import { flushPromises } from '@vue/test-utils';
import { effectScope, nextTick, type EffectScope } from 'vue';
import type { MockInstance } from 'vitest';
import {
  useServiceProvidersForRollenVerwaltungAutocomplete,
  type UseServiceProvidersForRollenVerwaltungAutocompleteReturn,
} from './useServiceProvidersForRollenVerwaltungAutocomplete';

describe('useServiceProvidersForRollenVerwaltungAutocomplete', () => {
  let scope: EffectScope;
  let result: UseServiceProvidersForRollenVerwaltungAutocompleteReturn;
  let serviceProviderStore: ServiceProviderStore;
  let searchFilterStore: SearchFilterStore;

  function getInitialFilter(): ServiceProviderRollenVerwaltungFilter {
    return { limit: 25 };
  }

  function getServiceProvider(props: Partial<ServiceProviderIdNameResponse>): ServiceProviderIdNameResponse {
    const response: ReturnType<typeof DoFactory.getServiceProviderResponse> =
      DoFactory.getServiceProviderResponse(props);
    return { id: response.id, name: response.name };
  }

  function createComposable(): UseServiceProvidersForRollenVerwaltungAutocompleteReturn {
    const composable: UseServiceProvidersForRollenVerwaltungAutocompleteReturn | undefined = scope.run(
      (): UseServiceProvidersForRollenVerwaltungAutocompleteReturn =>
        useServiceProvidersForRollenVerwaltungAutocomplete(getInitialFilter()),
    );
    if (composable === undefined) {
      throw new Error('Composable must be created within an active effect scope.');
    }
    return composable;
  }

  beforeEach((): void => {
    vi.useFakeTimers();
    serviceProviderStore = useServiceProviderStore();
    serviceProviderStore.$reset();
    searchFilterStore = useSearchFilterStore();
    searchFilterStore.$reset();
    scope = effectScope();
    result = createComposable();
  });

  afterEach((): void => {
    scope.stop();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('loads service providers only when init is called with the initial filter', async (): Promise<void> => {
    const getServiceProvidersSpy: MockInstance = vi
      .spyOn(serviceProviderStore, 'getServiceProvidersForRollenVerwaltung')
      .mockResolvedValue();
    await nextTick();
    expect(getServiceProvidersSpy).not.toHaveBeenCalled();

    await result.init();
    await flushPromises();

    expect(getServiceProvidersSpy).toHaveBeenCalledOnce();
    expect(getServiceProvidersSpy).toHaveBeenCalledWith(getInitialFilter());
  });

  it('debounces searches by 500ms and passes the exact endpoint filter', async (): Promise<void> => {
    const getServiceProvidersSpy: MockInstance = vi
      .spyOn(serviceProviderStore, 'getServiceProvidersForRollenVerwaltung')
      .mockResolvedValue();
    result.searchInput.value = 'Lehrer';
    await nextTick();

    vi.advanceTimersByTime(499);
    await flushPromises();
    expect(getServiceProvidersSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await flushPromises();

    expect(getServiceProvidersSpy).toHaveBeenCalledOnce();
    expect(getServiceProvidersSpy).toHaveBeenCalledWith({ limit: 25, searchStr: 'Lehrer' });
  });

  it('only requests the latest search after rapid input changes', async (): Promise<void> => {
    const getServiceProvidersSpy: MockInstance = vi
      .spyOn(serviceProviderStore, 'getServiceProvidersForRollenVerwaltung')
      .mockResolvedValue();
    result.searchInput.value = 'Leh';
    await nextTick();
    vi.advanceTimersByTime(400);

    result.searchInput.value = 'Lehrer';
    await nextTick();
    vi.advanceTimersByTime(499);
    await flushPromises();
    expect(getServiceProvidersSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await flushPromises();
    expect(getServiceProvidersSpy).toHaveBeenCalledOnce();
    expect(getServiceProvidersSpy).toHaveBeenCalledWith({ limit: 25, searchStr: 'Lehrer' });
  });

  it('retains selected service providers when search results change and the composable is recreated', async (): Promise<void> => {
    const selectedProvider: ServiceProviderIdNameResponse = getServiceProvider({
      id: 'selected-provider',
      name: 'Selected provider',
    });
    searchFilterStore.selectedServiceProvidersForRollen = [selectedProvider];
    serviceProviderStore.serviceProvidersForRollenVerwaltung = [getServiceProvider({ id: 'search-result' })];
    await nextTick();

    expect(result.items.value).toContainEqual(selectedProvider);
    scope.stop();

    scope = effectScope();
    result = createComposable();
    serviceProviderStore.serviceProvidersForRollenVerwaltung = [];
    await nextTick();

    expect(result.selectedServiceProviders.value).toEqual([selectedProvider]);
    expect(result.items.value).toContainEqual(selectedProvider);
  });

  it('deduplicates and sorts merged items without mutating fetched results or totals', async (): Promise<void> => {
    const selectedProvider: ServiceProviderIdNameResponse = getServiceProvider({
      id: 'selected-provider',
      name: 'Zebra',
    });
    const duplicateProvider: ServiceProviderIdNameResponse = getServiceProvider({
      id: selectedProvider.id,
      name: selectedProvider.name,
    });
    const fetchedProvider: ServiceProviderIdNameResponse = getServiceProvider({
      id: 'fetched-provider',
      name: 'Alpha',
    });
    const fetchedResults: ServiceProviderIdNameResponse[] = [duplicateProvider, fetchedProvider];
    searchFilterStore.selectedServiceProvidersForRollen = [selectedProvider];
    serviceProviderStore.serviceProvidersForRollenVerwaltung = fetchedResults;
    serviceProviderStore.totalServiceProvidersForRollenVerwaltung = 7;
    await nextTick();

    expect(result.items.value).toEqual([fetchedProvider, selectedProvider]);
    expect(serviceProviderStore.serviceProvidersForRollenVerwaltung).toEqual(fetchedResults);
    expect(serviceProviderStore.serviceProvidersForRollenVerwaltung).toEqual([duplicateProvider, fetchedProvider]);
    expect(serviceProviderStore.totalServiceProvidersForRollenVerwaltung).toBe(7);
  });

  it('clears a pending search timer when its scope is disposed', async (): Promise<void> => {
    const getServiceProvidersSpy: MockInstance = vi
      .spyOn(serviceProviderStore, 'getServiceProvidersForRollenVerwaltung')
      .mockResolvedValue();
    result.searchInput.value = 'Lehrer';
    await nextTick();

    expect(vi.getTimerCount()).toBe(1);
    scope.stop();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(getServiceProvidersSpy).not.toHaveBeenCalled();
  });
});
