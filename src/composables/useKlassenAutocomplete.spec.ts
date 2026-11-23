import {
  useOrganisationStore,
  type KlassenFilter,
  type Organisation,
  type OrganisationStore,
} from '@/stores/OrganisationStore';
import { flushPromises } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import type { MockInstance } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope, type Ref } from 'vue';
import { useKlassenAutocomplete } from './useKlassenAutocomplete';

type KlassenAutocomplete = ReturnType<typeof useKlassenAutocomplete<boolean>>;

describe('useKlassenAutocomplete', (): void => {
  const storeKey: string = 'klassen-autocomplete';
  let scope: EffectScope;
  let organisationStore: OrganisationStore;
  let loadKlassenSpy: MockInstance<OrganisationStore['loadKlassenForFilter']>;
  let initialFilter: KlassenFilter;

  beforeEach((): void => {
    vi.useFakeTimers();
    organisationStore = useOrganisationStore();
    organisationStore.$reset();
    loadKlassenSpy = vi.spyOn(organisationStore, 'loadKlassenForFilter').mockResolvedValue();
    initialFilter = { administriertVon: [DoFactory.getSchule().id] };
    scope = effectScope();
  });

  afterEach((): void => {
    scope.stop();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should default to single selection and the empty store key', async (): Promise<void> => {
    const result: KlassenAutocomplete = scope.run(
      (): KlassenAutocomplete => useKlassenAutocomplete(initialFilter),
    ) as KlassenAutocomplete;
    const klasse: Organisation = DoFactory.getKlasse();
    organisationStore.klassenFilters.set('', { filterResult: [klasse], total: 1, loading: false });

    expect(result.selectedKlassen.value).toBeUndefined();
    expect(result.items.value).toEqual([klasse]);

    await result.init();
    await flushPromises();

    expect(loadKlassenSpy).toHaveBeenCalledOnce();
    expect(loadKlassenSpy).toHaveBeenCalledWith(initialFilter, '');
  });

  describe('filter and search', (): void => {
    let result: KlassenAutocomplete;

    beforeEach((): void => {
      result = scope.run(
        (): KlassenAutocomplete => useKlassenAutocomplete(initialFilter, storeKey, true),
      ) as KlassenAutocomplete;
    });

    it('should load Klassen with the initial filter only when init is called', async (): Promise<void> => {
      await nextTick();

      expect(result.searchInput.value).toBe('');
      expect(result.filter).toEqual(initialFilter);
      expect(result.filter).not.toBe(initialFilter);
      expect(loadKlassenSpy).not.toHaveBeenCalled();

      await result.init();
      await flushPromises();

      expect(loadKlassenSpy).toHaveBeenCalledOnce();
      expect(loadKlassenSpy).toHaveBeenCalledWith(initialFilter, storeKey);
      expect(loadKlassenSpy.mock.calls[0]?.[0]).not.toBe(result.filter);
    });

    it('should use the current filter when init is called without changing the initial filter', async (): Promise<void> => {
      result.filter.searchString = '8a';
      await flushPromises();
      loadKlassenSpy.mockClear();

      await result.init();
      await flushPromises();

      expect(initialFilter.searchString).toBeUndefined();
      expect(loadKlassenSpy).toHaveBeenCalledOnce();
      expect(loadKlassenSpy).toHaveBeenCalledWith({ ...initialFilter, searchString: '8a' }, storeKey);
    });

    it('should debounce searches by 500ms without adding selected Klasse IDs to the filter', async (): Promise<void> => {
      result.selectedKlassen.value = [DoFactory.getKlasse()];
      result.searchInput.value = '8a';
      await nextTick();

      vi.advanceTimersByTime(499);
      await flushPromises();
      expect(result.filter.searchString).toBeUndefined();
      expect(loadKlassenSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      await flushPromises();

      expect(result.filter.searchString).toBe('8a');
      expect(loadKlassenSpy).toHaveBeenCalledOnce();
      expect(loadKlassenSpy).toHaveBeenCalledWith({ ...initialFilter, searchString: '8a' }, storeKey);
    });

    it('should request only the latest search after rapid input changes', async (): Promise<void> => {
      result.searchInput.value = '8';
      await nextTick();
      vi.advanceTimersByTime(400);

      result.searchInput.value = '8a';
      await nextTick();
      vi.advanceTimersByTime(499);
      await flushPromises();
      expect(loadKlassenSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      await flushPromises();

      expect(loadKlassenSpy).toHaveBeenCalledOnce();
      expect(loadKlassenSpy).toHaveBeenCalledWith({ ...initialFilter, searchString: '8a' }, storeKey);
    });

    it('should refetch Klassen immediately when a filter field changes', async (): Promise<void> => {
      const schuleId: string = DoFactory.getSchule().id;
      result.filter.administriertVon = [schuleId];
      await flushPromises();

      expect(loadKlassenSpy).toHaveBeenCalledOnce();
      expect(loadKlassenSpy).toHaveBeenCalledWith({ administriertVon: [schuleId] }, storeKey);
    });

    it('should refetch Klassen when a nested filter array changes', async (): Promise<void> => {
      const schuleId: string = DoFactory.getSchule().id;
      result.filter.administriertVon?.push(schuleId);
      await flushPromises();

      expect(loadKlassenSpy).toHaveBeenCalledOnce();
      expect(loadKlassenSpy).toHaveBeenCalledWith({ ...result.filter }, storeKey);
      expect(result.filter.administriertVon).toContain(schuleId);
    });

    it('should preserve filter changes made during a pending search', async (): Promise<void> => {
      const schuleId: string = DoFactory.getSchule().id;
      result.searchInput.value = '8a';
      await nextTick();

      result.filter.administriertVon = [schuleId];
      await flushPromises();
      expect(loadKlassenSpy).toHaveBeenCalledWith({ administriertVon: [schuleId] }, storeKey);

      vi.advanceTimersByTime(500);
      await flushPromises();

      expect(loadKlassenSpy).toHaveBeenCalledTimes(2);
      expect(loadKlassenSpy).toHaveBeenLastCalledWith({ administriertVon: [schuleId], searchString: '8a' }, storeKey);
    });

    it('should refetch Klassen with an empty search string when search input is cleared', async (): Promise<void> => {
      result.searchInput.value = '8a';
      await nextTick();
      vi.advanceTimersByTime(500);
      await flushPromises();
      loadKlassenSpy.mockClear();

      result.searchInput.value = '';
      await nextTick();
      vi.advanceTimersByTime(500);
      await flushPromises();

      expect(result.filter.searchString).toBe('');
      expect(loadKlassenSpy).toHaveBeenCalledOnce();
      expect(loadKlassenSpy).toHaveBeenCalledWith({ ...initialFilter, searchString: '' }, storeKey);
    });

    it('should cancel a pending search when its scope is disposed', async (): Promise<void> => {
      result.searchInput.value = '8a';
      await nextTick();

      expect(vi.getTimerCount()).toBe(1);
      scope.stop();
      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(500);
      await flushPromises();

      expect(result.filter.searchString).toBeUndefined();
      expect(loadKlassenSpy).not.toHaveBeenCalled();
    });

    it('should stop watching filter and search changes when its scope is disposed without a pending search', async (): Promise<void> => {
      scope.stop();
      result.searchInput.value = '8a';
      result.filter.administriertVon = [DoFactory.getSchule().id];
      await nextTick();
      vi.advanceTimersByTime(500);
      await flushPromises();

      expect(loadKlassenSpy).not.toHaveBeenCalled();
    });
  });

  describe('administriertVonSource', (): void => {
    let administriertVon: Ref<string[] | undefined>;
    let result: KlassenAutocomplete;

    beforeEach((): void => {
      administriertVon = ref<string[] | undefined>([DoFactory.getSchule().id]);
      result = scope.run(
        (): KlassenAutocomplete => useKlassenAutocomplete(initialFilter, storeKey, true, administriertVon),
      ) as KlassenAutocomplete;
    });

    it('should keep the initial filter until the source changes', async (): Promise<void> => {
      await nextTick();

      expect(result.filter).toEqual(initialFilter);
      expect(loadKlassenSpy).not.toHaveBeenCalled();
    });

    it('should update the filter and refetch Klassen when the source changes', async (): Promise<void> => {
      const schuleIds: string[] = [DoFactory.getSchule().id, DoFactory.getSchule().id];
      administriertVon.value = schuleIds;
      await flushPromises();

      expect(result.filter.administriertVon).toEqual(schuleIds);
      expect(loadKlassenSpy).toHaveBeenCalledOnce();
      expect(loadKlassenSpy).toHaveBeenCalledWith({ administriertVon: schuleIds }, storeKey);
    });

    it('should clear administriertVon and refetch Klassen when the source becomes undefined', async (): Promise<void> => {
      administriertVon.value = undefined;
      await flushPromises();

      expect(result.filter.administriertVon).toBeUndefined();
      expect(loadKlassenSpy).toHaveBeenCalledOnce();
      expect(loadKlassenSpy).toHaveBeenCalledWith({ administriertVon: undefined }, storeKey);
    });

    it('should stop watching the source when its scope is disposed', async (): Promise<void> => {
      scope.stop();
      administriertVon.value = [DoFactory.getSchule().id];
      await flushPromises();

      expect(result.filter).toEqual(initialFilter);
      expect(loadKlassenSpy).not.toHaveBeenCalled();
    });
  });

  describe.each([true, false])('with multiple set to %s', (multiple: boolean): void => {
    let result: KlassenAutocomplete;

    beforeEach((): void => {
      result = scope.run(
        (): KlassenAutocomplete => useKlassenAutocomplete(initialFilter, storeKey, multiple),
      ) as KlassenAutocomplete;
    });

    it('should initialize the selection and return no items without keyed store results', (): void => {
      expect(result.selectedKlassen.value).toEqual(multiple ? [] : undefined);
      expect(result.items.value).toEqual([]);
    });

    it('should return only store results for its own key when nothing is selected', (): void => {
      const klasse: Organisation = DoFactory.getKlasse();
      const unrelatedKlasse: Organisation = DoFactory.getKlasse();
      organisationStore.klassenFilters.set(storeKey, { filterResult: [klasse], total: 1, loading: false });
      organisationStore.klassenFilters.set('other-autocomplete', {
        filterResult: [unrelatedKlasse],
        total: 1,
        loading: false,
      });

      expect(result.items.value).toEqual([klasse]);
    });

    it('should retain selected Klassen when no keyed store results exist', async (): Promise<void> => {
      const selectedKlasse: Organisation = DoFactory.getKlasse();
      result.selectedKlassen.value = multiple ? [selectedKlasse] : selectedKlasse;
      await nextTick();

      expect(result.items.value).toEqual([selectedKlasse]);
      expect(loadKlassenSpy).not.toHaveBeenCalled();
    });

    it('should merge selected and searched Klassen, keeping the selected object for duplicate IDs without sorting', async (): Promise<void> => {
      const selectedKlasse: Organisation = DoFactory.getKlasse(undefined, { name: 'Zebra' });
      const duplicateKlasse: Organisation = DoFactory.getKlasse(undefined, {
        id: selectedKlasse.id,
        name: 'Updated Klasse',
      });
      const searchResultKlasse: Organisation = DoFactory.getKlasse(undefined, { name: 'Alpha' });
      result.selectedKlassen.value = multiple ? [selectedKlasse] : selectedKlasse;
      organisationStore.klassenFilters.set(storeKey, {
        filterResult: [duplicateKlasse, searchResultKlasse, searchResultKlasse],
        total: 3,
        loading: false,
      });
      await nextTick();

      expect(result.items.value).toEqual([selectedKlasse, searchResultKlasse]);
    });

    it('should react to store result changes while retaining the selection', async (): Promise<void> => {
      const selectedKlasse: Organisation = DoFactory.getKlasse();
      const firstKlasse: Organisation = DoFactory.getKlasse();
      const secondKlasse: Organisation = DoFactory.getKlasse();
      result.selectedKlassen.value = multiple ? [selectedKlasse] : selectedKlasse;
      organisationStore.klassenFilters.set(storeKey, { filterResult: [firstKlasse], total: 1, loading: false });
      await nextTick();
      expect(result.items.value).toEqual([selectedKlasse, firstKlasse]);

      organisationStore.klassenFilters.set(storeKey, { filterResult: [secondKlasse], total: 1, loading: false });
      await nextTick();

      expect(result.items.value).toEqual([selectedKlasse, secondKlasse]);
    });

    it('should reset the search and replace a pending request when the selection is cleared', async (): Promise<void> => {
      const selectedKlasse: Organisation = DoFactory.getKlasse();
      result.selectedKlassen.value = multiple ? [selectedKlasse] : selectedKlasse;
      result.searchInput.value = '8a';
      await nextTick();
      vi.advanceTimersByTime(400);

      result.selectedKlassen.value = multiple ? [] : undefined;
      await nextTick();
      expect(result.searchInput.value).toBe('');

      vi.advanceTimersByTime(499);
      await flushPromises();
      expect(loadKlassenSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      await flushPromises();

      expect(loadKlassenSpy).toHaveBeenCalledOnce();
      expect(loadKlassenSpy).toHaveBeenCalledWith({ ...initialFilter, searchString: '' }, storeKey);
    });

    it('should preserve the search when a nonempty selection changes', async (): Promise<void> => {
      result.searchInput.value = '8a';
      await nextTick();

      const selectedKlasse: Organisation = DoFactory.getKlasse();
      result.selectedKlassen.value = multiple ? [selectedKlasse] : selectedKlasse;
      await nextTick();

      expect(result.searchInput.value).toBe('8a');
      expect(loadKlassenSpy).not.toHaveBeenCalled();
    });
  });
});
