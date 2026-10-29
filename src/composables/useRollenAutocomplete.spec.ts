import {
  useRolleStore,
  type RolleFilter,
  type RolleStore,
  type RolleWithServiceProvidersResponse,
} from '@/stores/RolleStore';
import { DoFactory } from 'test/DoFactory';
import { flushPromises } from '@vue/test-utils';
import type { MockInstance } from 'vitest';
import { effectScope, nextTick, type EffectScope } from 'vue';
import { useRollenAutocomplete, type UseRollenAutocompleteReturn } from './useRollenAutocomplete';

describe('useRollenAutocomplete', () => {
  let scope: EffectScope;
  let result: UseRollenAutocompleteReturn;
  let rolleStore: RolleStore;

  function getInitialFilter(): RolleFilter {
    return {
      limit: 25,
    };
  }

  beforeEach((): void => {
    vi.useFakeTimers();
    rolleStore = useRolleStore();
    rolleStore.$reset();
    scope = effectScope();
    result = scope.run(
      (): UseRollenAutocompleteReturn => useRollenAutocomplete(getInitialFilter()),
    ) as UseRollenAutocompleteReturn;
  });

  afterEach((): void => {
    scope.stop();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('loads rollen with the initial filter when init is called', async (): Promise<void> => {
    const getAllRollenSpy: MockInstance = vi.spyOn(rolleStore, 'getAllRollen').mockResolvedValue();
    await nextTick();
    expect(getAllRollenSpy).not.toHaveBeenCalled();

    await result.init();
    await flushPromises();

    expect(getAllRollenSpy).toHaveBeenCalledOnce();
    expect(getAllRollenSpy).toHaveBeenCalledWith(getInitialFilter());
  });

  it('debounces searches by 500ms and does not send rolleIds', async (): Promise<void> => {
    const getAllRollenSpy: MockInstance = vi.spyOn(rolleStore, 'getAllRollen').mockResolvedValue();
    result.selectedRollen.value = [DoFactory.getRolleWithServiceProviders()];
    result.searchInput.value = 'Lehrer';
    await nextTick();

    vi.advanceTimersByTime(499);
    await flushPromises();
    expect(getAllRollenSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await flushPromises();

    expect(getAllRollenSpy).toHaveBeenCalledOnce();
    expect(getAllRollenSpy).toHaveBeenCalledWith({
      ...getInitialFilter(),
      searchString: 'Lehrer',
    });
  });

  it('only requests the latest search after rapid input changes', async (): Promise<void> => {
    const getAllRollenSpy: MockInstance = vi.spyOn(rolleStore, 'getAllRollen').mockResolvedValue();
    result.searchInput.value = 'Leh';
    await nextTick();
    vi.advanceTimersByTime(400);

    result.searchInput.value = 'Lehrer';
    await nextTick();
    vi.advanceTimersByTime(499);
    await flushPromises();
    expect(getAllRollenSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await flushPromises();
    expect(getAllRollenSpy).toHaveBeenCalledOnce();
    expect(getAllRollenSpy).toHaveBeenCalledWith({ ...getInitialFilter(), searchString: 'Lehrer' });
  });

  it('refetches rollen when a filter field changes', async (): Promise<void> => {
    const getAllRollenSpy: MockInstance = vi.spyOn(rolleStore, 'getAllRollen').mockResolvedValue();
    result.filter.limit = 50;
    await flushPromises();

    expect(getAllRollenSpy).toHaveBeenCalledOnce();
    expect(getAllRollenSpy).toHaveBeenCalledWith({
      ...getInitialFilter(),
      limit: 50,
    });
  });

  it('resets search input when the selection becomes empty', async (): Promise<void> => {
    const getAllRollenSpy: MockInstance = vi.spyOn(rolleStore, 'getAllRollen').mockResolvedValue();
    const selectedRolle: RolleWithServiceProvidersResponse = DoFactory.getRolleWithServiceProviders();
    result.selectedRollen.value = [selectedRolle];
    result.searchInput.value = 'Lehrer';
    await nextTick();

    result.selectedRollen.value = [];
    await nextTick();

    expect(result.searchInput.value).toBe('');
    vi.advanceTimersByTime(500);
    await flushPromises();
    expect(getAllRollenSpy).toHaveBeenCalledOnce();
    expect(getAllRollenSpy).toHaveBeenCalledWith({ ...getInitialFilter(), searchString: '' });
  });

  it('merges selected and searched rollen, deduplicates by id, and sorts by name', async (): Promise<void> => {
    const selectedRolle: RolleWithServiceProvidersResponse = DoFactory.getRolleWithServiceProviders({
      id: 'selected-rolle',
      name: 'Zebra',
    });
    const duplicateRolle: RolleWithServiceProvidersResponse = DoFactory.getRolleWithServiceProviders({
      id: selectedRolle.id,
      name: selectedRolle.name,
    });
    const searchResultRolle: RolleWithServiceProvidersResponse = DoFactory.getRolleWithServiceProviders({
      id: 'search-result',
      name: 'Alpha',
    });
    result.selectedRollen.value = [selectedRolle];
    rolleStore.allRollen = [duplicateRolle, searchResultRolle];
    await nextTick();

    expect(result.items.value).toEqual([searchResultRolle, selectedRolle]);
  });

  it('clears a pending search timer when its scope is disposed', async (): Promise<void> => {
    const getAllRollenSpy: MockInstance = vi.spyOn(rolleStore, 'getAllRollen').mockResolvedValue();
    result.searchInput.value = 'Lehrer';
    await nextTick();

    expect(vi.getTimerCount()).toBe(1);
    scope.stop();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(getAllRollenSpy).not.toHaveBeenCalled();
  });
});
