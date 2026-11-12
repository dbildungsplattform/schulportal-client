import type { Mock } from 'vitest';
import { effectScope, nextTick, type EffectScope, type Ref } from 'vue';
import { useDebouncedSearch } from './useDebouncedSearch';

describe('useDebouncedSearch', () => {
  let scope: EffectScope;
  let searchInput: Ref<string>;
  let onSearch: Mock<(value: string) => void>;

  beforeEach((): void => {
    vi.useFakeTimers();
    scope = effectScope();
    onSearch = vi.fn<(value: string) => void>();
    scope.run((): void => {
      searchInput = useDebouncedSearch(onSearch);
    });
  });

  afterEach((): void => {
    scope.stop();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should initialise empty without triggering a search', async (): Promise<void> => {
    expect(searchInput.value).toBe('');
    await nextTick();
    vi.advanceTimersByTime(500);

    expect(onSearch).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('should trigger a search only after 500ms', async (): Promise<void> => {
    searchInput.value = 'Lehrer';
    await nextTick();

    vi.advanceTimersByTime(499);
    expect(onSearch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onSearch).toHaveBeenCalledExactlyOnceWith('Lehrer');
  });

  it('should restart the delay and search only for the latest input', async (): Promise<void> => {
    searchInput.value = 'Leh';
    await nextTick();
    vi.advanceTimersByTime(400);

    searchInput.value = 'Lehrer';
    await nextTick();
    vi.advanceTimersByTime(499);
    expect(onSearch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onSearch).toHaveBeenCalledExactlyOnceWith('Lehrer');
  });

  it('should debounce clearing the input after a completed search', async (): Promise<void> => {
    searchInput.value = 'Lehrer';
    await nextTick();
    vi.advanceTimersByTime(500);

    searchInput.value = '';
    await nextTick();
    vi.advanceTimersByTime(499);
    expect(onSearch).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(onSearch).toHaveBeenCalledTimes(2);
    expect(onSearch).toHaveBeenLastCalledWith('');
  });

  it('should cancel a pending search when its scope is disposed', async (): Promise<void> => {
    searchInput.value = 'Lehrer';
    await nextTick();

    expect(vi.getTimerCount()).toBe(1);
    scope.stop();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(500);

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('should stop watching input when disposed without a pending search', async (): Promise<void> => {
    scope.stop();
    searchInput.value = 'Lehrer';
    await nextTick();
    vi.advanceTimersByTime(500);

    expect(onSearch).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('should debounce separate instances independently', async (): Promise<void> => {
    const otherOnSearch: Mock<(value: string) => void> = vi.fn<(value: string) => void>();
    let otherSearchInput: Ref<string>;
    scope.run((): void => {
      otherSearchInput = useDebouncedSearch(otherOnSearch);
    });

    searchInput.value = 'Lehrer';
    await nextTick();
    vi.advanceTimersByTime(250);

    otherSearchInput!.value = 'Schule';
    await nextTick();
    vi.advanceTimersByTime(250);

    expect(onSearch).toHaveBeenCalledExactlyOnceWith('Lehrer');
    expect(otherOnSearch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);
    expect(otherOnSearch).toHaveBeenCalledExactlyOnceWith('Schule');
  });
});
