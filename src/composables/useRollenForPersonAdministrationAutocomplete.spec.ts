import {
  useRolleStore,
  RollenSystemRecht,
  type RolleResponse,
  type RolleStore,
  type RollenForPersonAdministrationParams,
} from '@/stores/RolleStore';
import { flushPromises } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { type MockInstance } from 'vitest';
import { effectScope, nextTick, type EffectScope } from 'vue';
import {
  useRollenForPersonAdministrationAutocomplete,
  type UseRollenForPersonAdministrationAutocompleteReturn,
} from './useRollenForPersonAdministrationAutocomplete';

describe('useRollenForPersonAdministrationAutocomplete', () => {
  let scope: EffectScope;
  let result: UseRollenForPersonAdministrationAutocompleteReturn;
  let rolleStore: RolleStore;
  let getRollenSpy: MockInstance;

  function getInitialFilter(): RollenForPersonAdministrationParams {
    return {
      limit: 25,
      searchStr: '',
      organisationIds: [],
      systemrechte: [RollenSystemRecht.PersonenVerwalten],
    };
  }

  beforeEach((): void => {
    vi.useFakeTimers();
    rolleStore = useRolleStore();
    rolleStore.$reset();
    getRollenSpy = vi.spyOn(rolleStore, 'getRollenForPersonAdministration').mockResolvedValue();
    scope = effectScope();
    result = scope.run(
      (): UseRollenForPersonAdministrationAutocompleteReturn =>
        useRollenForPersonAdministrationAutocomplete(getInitialFilter()),
    ) as UseRollenForPersonAdministrationAutocompleteReturn;
  });

  afterEach((): void => {
    scope.stop();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('loads rollen with the initial filter only when init is called', async (): Promise<void> => {
    await nextTick();
    expect(getRollenSpy).not.toHaveBeenCalled();

    await result.init();

    expect(getRollenSpy).toHaveBeenCalledOnce();
    expect(getRollenSpy).toHaveBeenCalledWith(getInitialFilter());
  });

  it('debounces searches by 500ms without sending selected IDs', async (): Promise<void> => {
    result.selectedRollen.value = [DoFactory.getRolleResponse()];
    result.searchInput.value = 'Lehrer';
    await nextTick();

    vi.advanceTimersByTime(499);
    await flushPromises();
    expect(getRollenSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await flushPromises();

    expect(getRollenSpy).toHaveBeenCalledOnce();
    expect(getRollenSpy).toHaveBeenCalledWith({ ...getInitialFilter(), searchStr: 'Lehrer' });
  });

  it('only requests the latest search after rapid input changes', async (): Promise<void> => {
    result.searchInput.value = 'Leh';
    await nextTick();
    vi.advanceTimersByTime(400);

    result.searchInput.value = 'Lehrer';
    await nextTick();
    vi.advanceTimersByTime(499);
    await flushPromises();
    expect(getRollenSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await flushPromises();

    expect(getRollenSpy).toHaveBeenCalledOnce();
    expect(getRollenSpy).toHaveBeenCalledWith({ ...getInitialFilter(), searchStr: 'Lehrer' });
  });

  it('refetches when organisation and permission filters change', async (): Promise<void> => {
    const organisationIds: string[] = [DoFactory.getSchule().id];
    result.filter.organisationIds = organisationIds;
    await flushPromises();

    expect(getRollenSpy).toHaveBeenLastCalledWith({ ...getInitialFilter(), organisationIds });

    result.filter.systemrechte?.push(RollenSystemRecht.MptRollenZuordnen);
    await flushPromises();

    expect(getRollenSpy).toHaveBeenCalledTimes(2);
    expect(getRollenSpy).toHaveBeenLastCalledWith({
      ...getInitialFilter(),
      organisationIds,
      systemrechte: [RollenSystemRecht.PersonenVerwalten, RollenSystemRecht.MptRollenZuordnen],
    });
  });

  it('resets the search when the selection becomes empty', async (): Promise<void> => {
    result.selectedRollen.value = [DoFactory.getRolleResponse()];
    result.searchInput.value = 'Lehrer';
    await nextTick();

    result.selectedRollen.value = [];
    await nextTick();

    expect(result.searchInput.value).toBe('');
    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(getRollenSpy).not.toHaveBeenCalled();
    expect(result.filter.searchStr).toBe('');
  });

  it('reloads unfiltered rollen after clearing a completed search and selection', async (): Promise<void> => {
    result.selectedRollen.value = [DoFactory.getRolleResponse()];
    result.searchInput.value = 'Lehrer';
    await nextTick();
    vi.advanceTimersByTime(500);
    await flushPromises();

    result.selectedRollen.value = [];
    await nextTick();
    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(getRollenSpy).toHaveBeenCalledTimes(2);
    expect(getRollenSpy).toHaveBeenLastCalledWith(getInitialFilter());
  });

  it('keeps selected objects across searches, deduplicates by id, and sorts by name', async (): Promise<void> => {
    const selectedRolle: RolleResponse = DoFactory.getRolleResponse({ name: 'Zebra' });
    const duplicateRolle: RolleResponse = DoFactory.getRolleResponse({
      id: selectedRolle.id,
      name: selectedRolle.name,
    });
    const searchedRolle: RolleResponse = DoFactory.getRolleResponse({ name: 'Alpha' });
    result.selectedRollen.value = [selectedRolle];
    rolleStore.rollenForPersonAdministration = [duplicateRolle, searchedRolle];
    rolleStore.totalRollenForPersonAdministration = 2;

    expect(result.items.value).toEqual([searchedRolle, selectedRolle]);
    expect(result.items.value[1]).toBe(result.selectedRollen.value[0]);

    rolleStore.rollenForPersonAdministration = [searchedRolle];
    rolleStore.totalRollenForPersonAdministration = 1;
    await nextTick();

    expect(result.items.value).toEqual([searchedRolle, selectedRolle]);
    expect(rolleStore.rollenForPersonAdministration).toEqual([searchedRolle]);
    expect(rolleStore.totalRollenForPersonAdministration).toBe(1);

    result.selectedRollen.value = [];
    expect(result.items.value).toEqual([searchedRolle]);
  });

  it('clears a pending search timer when its scope is disposed', async (): Promise<void> => {
    result.searchInput.value = 'Lehrer';
    await nextTick();

    expect(vi.getTimerCount()).toBe(1);
    scope.stop();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(getRollenSpy).not.toHaveBeenCalled();
  });
});
