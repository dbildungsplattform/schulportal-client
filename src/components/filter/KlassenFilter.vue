<script setup lang="ts">
  import type { RollenSystemRechtEnum } from '@/api-client/generated';
  import {
    OrganisationsTyp,
    useOrganisationStore,
    type AutoCompleteStore,
    type Organisation,
    type OrganisationenFilter,
    type OrganisationStore,
  } from '@/stores/OrganisationStore';
  import type { TranslatedObject } from '@/types';
  import { dedup, sameContent } from '@/utils/arrays';
  import { blurActiveElement } from '@/utils/focus';
  import type { BaseFieldProps } from 'vee-validate';
  import { computed, onMounted, onUnmounted, reactive, ref, watch, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';

  type SelectedKlassenIds = Array<string> | string | undefined;
  type Props = {
    hideDetails?: boolean;
    systemrechteForSearch?: Array<RollenSystemRechtEnum>;
    multiple?: boolean;
    readonly?: boolean;
    selectedKlasseProps?: BaseFieldProps & { error: boolean; 'error-messages': Array<string> };
    highlightSelection?: boolean;
    placeholderText?: string;
    administriertVon?: string[] | undefined;
    parentId?: string;
  };
  const props: Props = defineProps<Props>();
  const selectedKlassen: Ref<SelectedKlassenIds> = defineModel('selectedKlassen');
  const searchInputKlassen: Ref<string | undefined> = ref(undefined);
  const clearInput = (): void => {
    searchInputKlassen.value = undefined;
    selectedKlassen.value = undefined;
  };

  const { t }: Composer = useI18n({ useScope: 'global' });
  const organisationStore: OrganisationStore = useOrganisationStore();

  const timerId: Ref<ReturnType<typeof setTimeout> | undefined> = ref<ReturnType<typeof setTimeout>>();
  const testId: ComputedRef<string> = computed(() => {
    return props.parentId ? `${props.parentId}-klasse-select` : 'klasse-select';
  });
  const storeReference: ComputedRef<AutoCompleteStore<Organisation> | undefined> = computed(() => {
    return organisationStore.klassenFilters.get(props.parentId ?? '');
  });

  const klassenFilter: OrganisationenFilter = reactive({
    includeTyp: OrganisationsTyp.Klasse,
    systemrechte: props.systemrechteForSearch,
    searchString: undefined,
    limit: 200,
    organisationIds: [],
    administriertVon: props.administriertVon,
  });

  const translateKlasse = (klasse: Organisation): TranslatedObject => ({
    value: klasse.id,
    title: klasse.name,
  });

  // selection is represented as an array internally
  // wrap/unwrap is used to convert between internal and vuetify representation
  const wrapSelectedKlassenIds = (selectedIds: SelectedKlassenIds): Array<string> => {
    if (Array.isArray(selectedIds)) {
      return selectedIds.filter(Boolean);
    }
    if (selectedIds) {
      return [selectedIds];
    }
    return [];
  };

  const isEmptySelection = (selection: SelectedKlassenIds): boolean => {
    if (!selection) {
      return true;
    }
    return wrapSelectedKlassenIds(selection).filter(Boolean).length === 0;
  };

  const placeholderText: ComputedRef<string> = computed(() => {
    return props.placeholderText ?? t('admin.klasse.assignKlasse');
  });

  const translatedKlassen: ComputedRef<Array<TranslatedObject>> = computed(() => {
    const options: Array<TranslatedObject> = storeReference.value?.filterResult.map(translateKlasse) ?? [];
    const selectedIds: Array<string> = wrapSelectedKlassenIds(selectedKlassen.value);
    if (!isEmptySelection(selectedIds)) {
      selectedIds.forEach((selectedId: string) => {
        if (options.find((option: TranslatedObject) => option.value === selectedId) === undefined) {
          options.push({
            value: selectedId,
            title: '...',
          });
        }
      });
    }
    return options;
  });

  const canDisplaySelection = (selection: SelectedKlassenIds): boolean => {
    const result: boolean = wrapSelectedKlassenIds(selection).every((selectedKlasseId: string) =>
      Boolean(
        // translatedKlassen should include autoSelection if needed, so no extra logic is needed here
        translatedKlassen.value.find(
          (translatedKlasse: TranslatedObject) => translatedKlasse.value === selectedKlasseId,
        ),
      ),
    );
    return result;
  };

  const getDisplayItem = (item: TranslatedObject, index: number): string => {
    if (!selectedKlassen.value) {
      return '';
    } // should not happen
    if (!canDisplaySelection(selectedKlassen.value)) {
      return '...';
    } // we are loading
    if (!props.multiple) {
      return item.title;
    }

    if (selectedKlassen.value.length < 2) {
      return item.title;
    }
    if (index === 0) {
      return t('admin.klasse.klassenSelected', { count: selectedKlassen.value.length });
    }
    return ''; // do not display anything for other items
  };

  const shouldHighlightSelection: ComputedRef<boolean> = computed(() => {
    if (props.highlightSelection && !isEmptySelection(selectedKlassen.value)) {
      return true;
    }
    return false;
  });

  const updateSearchString = (searchString: string | undefined): void => {
    if (searchString) {
      klassenFilter.searchString = searchString;
    } else {
      delete klassenFilter.searchString;
    }
  };

  const updateKlassenIds = (ids: SelectedKlassenIds): void => {
    const tempIds: Array<string> = wrapSelectedKlassenIds(ids);
    klassenFilter.organisationIds = dedup(tempIds.filter(Boolean));
  };

  const handleSelectionUpdate = (selection: SelectedKlassenIds): void => {
    if (isEmptySelection(selection)) {
      updateKlassenIds([]);
      updateSearchString(undefined);
      clearInput();
    } else {
      updateKlassenIds(selection);
    }
    if (!props.multiple) {
      blurActiveElement();
    }
  };

  const isSameSelection = (a: SelectedKlassenIds, b: SelectedKlassenIds): boolean => {
    return sameContent(wrapSelectedKlassenIds(a), wrapSelectedKlassenIds(b));
  };

  const handleFocusChange = (focused: boolean): void => {
    if (!props.multiple) {
      return;
    }
    if (!focused) {
      searchInputKlassen.value = undefined;
    }
  };

  watch(
    selectedKlassen,
    (currentSelection: SelectedKlassenIds, oldSelection: SelectedKlassenIds) => {
      // Case 1: Selection has changed - update parent directly
      if (!isSameSelection(currentSelection, oldSelection)) {
        handleSelectionUpdate(currentSelection);
        return;
      }

      // Case 2: Empty selection - use autoselected or initial values
      if (isEmptySelection(currentSelection) && !isSameSelection(selectedKlassen.value, [])) {
        selectedKlassen.value = [];
        handleSelectionUpdate([]);
      }
    },
    { immediate: true },
  );

  watch(
    klassenFilter,
    (newFilter: OrganisationenFilter | undefined, oldFilter: OrganisationenFilter | undefined) => {
      if (timerId.value) {
        clearTimeout(timerId.value);
      }

      // We skip if selection is disabled and we already know how to display the selection
      // empty selection means we have to reload anyways
      if (!isEmptySelection(selectedKlassen.value) && props.readonly && canDisplaySelection(selectedKlassen.value)) {
        return;
      }

      // We apply the debounce of 500 only when there is an oldFilter (a change has been made)
      const delay: number = oldFilter ? 500 : 0;

      timerId.value = setTimeout(async () => {
        await organisationStore.loadKlassenForFilter(newFilter, props.parentId);
      }, delay);
    },
    { immediate: true },
  );

  watch(
    () => props.administriertVon,
    (newValue: string[] | undefined) => {
      klassenFilter.administriertVon = newValue;
    },
  );

  onMounted(() => {
    if (organisationStore.klassenFilters.has(props.parentId ?? '')) {
      // eslint-disable-next-line no-console
      console.warn(`KlassenFilter initialized twice with id ${props.parentId}`);
    }
    organisationStore.resetKlasseFilter(props.parentId);
  });

  onUnmounted(() => {
    organisationStore.clearKlasseFilter(props.parentId);
  });
</script>

<template>
  <v-autocomplete
    :id="testId"
    :ref="testId"
    v-bind="selectedKlasseProps"
    v-model="selectedKlassen"
    v-model:search="searchInputKlassen"
    autocomplete="off"
    :class="['filter-dropdown', { selected: shouldHighlightSelection }]"
    clearable
    :data-testid="testId"
    density="compact"
    :disabled="props.readonly"
    :items="translatedKlassen"
    item-value="value"
    item-text="title"
    :multiple="props.multiple"
    :no-data-text="'noDataFound'"
    :placeholder="placeholderText"
    required="true"
    variant="outlined"
    :hide-details
    @update:search="updateSearchString"
    @click:clear="organisationStore.resetKlasseFilter(parentId)"
    @update:focused="handleFocusChange"
  >
    <template #prepend-item>
      <slot name="prepend-item" />
    </template>
    <template #selection="{ item, index }">
      <span v-if="getDisplayItem(item, index)">
        {{ getDisplayItem(item, index) }}
      </span>
    </template>
  </v-autocomplete>
</template>
