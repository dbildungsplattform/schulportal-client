import { onScopeDispose, ref, watch, type Ref } from 'vue';

export function useDebouncedSearch(onSearch: (value: string) => void): Ref<string> {
  const searchInput: Ref<string> = ref('');
  let timerId: ReturnType<typeof setTimeout> | undefined;

  watch(searchInput, (value: string): void => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }

    timerId = setTimeout((): void => {
      onSearch(value);
    }, 500);
  });

  onScopeDispose((): void => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
  });

  return searchInput;
}
