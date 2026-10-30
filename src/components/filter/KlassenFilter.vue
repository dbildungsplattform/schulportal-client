<script setup lang="ts" generic="M extends boolean = false">
  import type { RollenSystemRechtEnum } from '@/api-client/generated';
  import { type KlassenSelection, useKlassenAutocomplete } from '@/composables/useKlassenAutocomplete';
  import { useOrganisationStore, type Organisation, type OrganisationStore } from '@/stores/OrganisationStore';
  import { blurActiveElement } from '@/utils/focus';
  import type { BaseFieldProps } from 'vee-validate';
  import { computed, onMounted, onUnmounted, watch, type ComputedRef, type WritableComputedRef } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';

  type AnySelection = Organisation | readonly Organisation[] | null | undefined;

  const isOrganisationArray = (selection: AnySelection): selection is readonly Organisation[] =>
    Array.isArray(selection);

  type Props = {
    hideDetails?: boolean;
    systemrechteForSearch?: Array<RollenSystemRechtEnum>;
    multiple?: M;
    readonly?: boolean;
    selectedKlassen?: Organisation | Organisation[];
    selectedKlasseProps?: BaseFieldProps & { error: boolean; 'error-messages': Array<string> };
    highlightSelection?: boolean;
    placeholderText?: string;
    administriertVon?: string[] | undefined;
    parentId?: string;
  };
  type Emits = {
    (e: 'update:selectedKlassen', value: KlassenSelection<M>): void;
  };
  const props: Props = defineProps<Props>();
  const emits: Emits = defineEmits<Emits>();

  const { t }: Composer = useI18n({ useScope: 'global' });
  const organisationStore: OrganisationStore = useOrganisationStore();
  const {
    selectedKlassen: selectedKlassenValue,
    searchInput,
    items,
    init,
  }: ReturnType<typeof useKlassenAutocomplete<M>> = useKlassenAutocomplete<M>(
    {
      systemrechte: props.systemrechteForSearch,
      searchString: undefined,
      administriertVon: props.administriertVon,
    },
    props.parentId,
    props.multiple,
    () => props.administriertVon,
  );

  const normalizeSelection = (selection: AnySelection): KlassenSelection<M> => {
    let normalizedSelection: Organisation | Organisation[] | undefined;
    if (props.multiple) {
      normalizedSelection = isOrganisationArray(selection) ? Array.from(selection) : [];
    } else {
      normalizedSelection = isOrganisationArray(selection) ? selection[0] : (selection ?? undefined);
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return normalizedSelection as KlassenSelection<M>;
  };

  type VuetifySelection = M extends true ? readonly Organisation[] : Organisation | null;
  const autocompleteSelection: WritableComputedRef<VuetifySelection> = computed({
    get: (): VuetifySelection =>
      (props.multiple ? selectedKlassenValue.value : (selectedKlassenValue.value ?? null)) as VuetifySelection,
    set: (selection: VuetifySelection): void => {
      selectedKlassenValue.value = normalizeSelection(selection);
    },
  });

  watch(
    () => props.selectedKlassen,
    (selection: Organisation | Organisation[] | undefined): void => {
      if (selection !== selectedKlassenValue.value) {
        selectedKlassenValue.value = normalizeSelection(selection);
      }
    },
    { immediate: true },
  );

  const testId: ComputedRef<string> = computed(() => {
    return props.parentId ? `${props.parentId}-klasse-select` : 'klasse-select';
  });

  const isEmptySelection = (selection: AnySelection): boolean => {
    return Array.isArray(selection) ? selection.length === 0 : !selection;
  };

  const placeholderText: ComputedRef<string> = computed(() => {
    return props.placeholderText ?? t('admin.klasse.assignKlasse');
  });

  const getDisplayItem = (item: Organisation, index: number): string => {
    const selection: AnySelection = selectedKlassenValue.value;
    if (!Array.isArray(selection) || selection.length < 2) {
      return item.name;
    }
    return index === 0 ? t('admin.klasse.klassenSelected', { count: selection.length }) : '';
  };

  const shouldHighlightSelection: ComputedRef<boolean> = computed(
    (): boolean => Boolean(props.highlightSelection) && !isEmptySelection(selectedKlassenValue.value),
  );

  const handleFocusChange = (focused: boolean): void => {
    if (props.multiple && !focused) {
      searchInput.value = '';
    }
  };

  watch(selectedKlassenValue, (newSelection: KlassenSelection<M>) => {
    if (!props.multiple) {
      blurActiveElement();
    }
    emits('update:selectedKlassen', newSelection);
  });

  onMounted(() => {
    if (organisationStore.klassenFilters.has(props.parentId ?? '')) {
      // eslint-disable-next-line no-console
      console.warn(`KlassenFilter initialized twice with id ${props.parentId}`);
    }
    organisationStore.resetKlasseFilter(props.parentId);
    init();
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
    v-model="autocompleteSelection"
    v-model:search="searchInput"
    autocomplete="off"
    :class="['filter-dropdown', { selected: shouldHighlightSelection }]"
    clearable
    :data-testid="testId"
    density="compact"
    :disabled="props.readonly"
    :items="items"
    item-value="id"
    item-title="name"
    return-object
    :multiple="props.multiple"
    :no-data-text="'noDataFound'"
    :placeholder="placeholderText"
    required="true"
    variant="outlined"
    :hide-details
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
