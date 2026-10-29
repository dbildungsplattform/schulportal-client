<script setup lang="ts" generic="M extends boolean = false">
  import type { RollenSystemRechtEnum } from '@/api-client/generated/api';
  import { useAutoselectedSchule } from '@/composables/useAutoselectedSchule';
  import { useDebouncedSearch } from '@/composables/useDebouncedSearch';
  import {
    OrganisationsTyp,
    useOrganisationStore,
    type Organisation,
    type OrganisationenFilterForAutocomplete,
    type OrganisationStore,
  } from '@/stores/OrganisationStore';
  import {
    LandesbediensteterWorkflowFilter,
    usePersonenkontextStore,
    type OperationContext,
    type PersonenkontextStore,
    type WorkflowFilter,
  } from '@/stores/PersonenkontextStore';
  import { dedup, sameContent } from '@/utils/arrays';
  import type { SelectedSchulen } from '@/types';
  import { blurActiveElement } from '@/utils/focus';
  import { getDisplayNameForOrg } from '@/utils/formatting';
  import type { BaseFieldProps } from 'vee-validate';
  import {
    computed,
    onMounted,
    onUnmounted,
    reactive,
    watch,
    type ComputedRef,
    type Ref,
    type WritableComputedRef,
  } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';

  type Props = {
    hideDetails?: boolean;
    systemrechteForSearch?: Array<RollenSystemRechtEnum>;
    multiple?: M;
    selectionCountKey?: string;
    readonly?: boolean;
    selectedSchuleProps?: BaseFieldProps & { error: boolean; 'error-messages': Array<string> };
    highlightSelection?: boolean;
    placeholderText?: string;
    includeAll?: boolean;
    parentId?: string;
    useWorkflowEndpoints?: boolean;
    useLandesbediensteteWorkflow?: boolean;
    operationContext?: OperationContext;
    isRolleUnassignForm?: boolean;
    personId?: string;
    selectedRollen?: Array<string>;
  };
  type ResolvedProps = Omit<Props, 'selectionCountKey'> & { selectionCountKey: string };
  type AnySelection = Organisation | readonly Organisation[] | null | undefined;
  type SelectionChange = [SelectedSchulen<M>, boolean];
  type PreviousSelectionChange = [SelectedSchulen<M> | undefined, boolean | undefined];

  const props: ResolvedProps = withDefaults(defineProps<Props>(), {
    selectionCountKey: 'admin.schule.schulenSelected',
  });
  const selectedSchulen: Ref<SelectedSchulen<M>> = defineModel<SelectedSchulen<M>>('selectedSchulen', {
    default: (props: Props): Organisation[] | undefined => (props.multiple ? [] : undefined),
  });
  const isOrganisationArray = (selection: AnySelection): selection is readonly Organisation[] =>
    Array.isArray(selection);

  const normalizeSelection = (selection: AnySelection): SelectedSchulen<M> => {
    let normalizedSelection: Organisation | Organisation[] | undefined;
    if (props.multiple) {
      normalizedSelection = isOrganisationArray(selection) ? Array.from(selection) : [];
    } else {
      normalizedSelection = isOrganisationArray(selection) ? selection[0] : (selection ?? undefined);
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return normalizedSelection as SelectedSchulen<M>;
  };

  type VuetifySelection = M extends true ? readonly Organisation[] : Organisation | null;
  const autocompleteSelection: WritableComputedRef<VuetifySelection> = computed({
    get: (): VuetifySelection =>
      (props.multiple ? (selectedSchulen.value ?? []) : (selectedSchulen.value ?? null)) as VuetifySelection,
    set: (selection: VuetifySelection): void => {
      selectedSchulen.value = normalizeSelection(selection);
    },
  });
  const { t }: Composer = useI18n({ useScope: 'global' });
  const organisationStore: OrganisationStore = useOrganisationStore();
  const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();

  const testId: ComputedRef<string> = computed(() => {
    const typ: string = props.includeAll ? 'organisation' : 'schule';
    return props.parentId ? `${props.parentId}-${typ}-select` : `${typ}-select`;
  });

  const currentResults: ComputedRef<Organisation[]> = computed(() =>
    props.useWorkflowEndpoints
      ? (personenkontextStore.workflowStepResponse?.organisations ?? [])
      : (organisationStore.organisationenFilters.get(props.parentId ?? '')?.filterResult ?? []),
  );
  const typFilter: ComputedRef<Pick<OrganisationenFilterForAutocomplete, 'includeTyp' | 'excludeTyp'>> = computed(
    () => {
      if (props.includeAll) {
        return { excludeTyp: [OrganisationsTyp.Klasse] };
      } else {
        return { includeTyp: OrganisationsTyp.Schule };
      }
    },
  );

  // The filter used to load the Schulen and possibly orgas
  const schulenFilter: OrganisationenFilterForAutocomplete = reactive({
    ...typFilter.value,
    systemrechte: props.systemrechteForSearch,
    limit: 25,
    searchString: undefined,
  });

  // Specific filter to load the organisationen in the forms that are tied to the workflow endpoints (Normal and landesbedienstete)
  const organisationenFilter: WorkflowFilter = reactive({
    operationContext: props.operationContext,
    personId: props.personId,
    organisationId: undefined,
    rollenIds: props.selectedRollen ?? [],
    organisationName: undefined,
    limit: 25,
  });

  const { hasAutoselectedSchule, autoselectedSchule }: ReturnType<typeof useAutoselectedSchule> = useAutoselectedSchule(
    props.systemrechteForSearch ?? [],
  );

  const isInputDisabled: ComputedRef<boolean | undefined> = computed(() => {
    return props.readonly || hasAutoselectedSchule.value || props.isRolleUnassignForm;
  });

  // Normalize single and multiple selections for shared selection handling.
  const wrapSelectedSchulen = (selection: AnySelection): Array<Organisation> => {
    if (isOrganisationArray(selection)) {
      return Array.from(selection);
    }
    if (selection) {
      return [selection];
    }
    return [];
  };

  const isEmptySelection = (selection: AnySelection): boolean => wrapSelectedSchulen(selection).length === 0;

  const schulen: ComputedRef<Array<Organisation>> = computed(() => {
    return dedup(
      [
        ...currentResults.value,
        ...wrapSelectedSchulen(selectedSchulen.value),
        ...wrapSelectedSchulen(autoselectedSchule.value),
      ],
      (org: Organisation) => org.id,
    );
  });

  const getDisplayItem = (item: Organisation, index: number): string => {
    if (!selectedSchulen.value) {
      return '';
    }
    const selection: Organisation[] = wrapSelectedSchulen(selectedSchulen.value);

    if (!props.multiple) {
      return getDisplayNameForOrg(item);
    }
    if (selection.length < 2) {
      return getDisplayNameForOrg(item);
    }
    if (index === 0) {
      return t(props.selectionCountKey, { count: selection.length });
    }
    return '';
  };

  const shouldHighlightSelection: ComputedRef<boolean> = computed(() => {
    if (hasAutoselectedSchule.value || props.isRolleUnassignForm) {
      return true;
    }
    if (props.highlightSelection && !isEmptySelection(selectedSchulen.value)) {
      return true;
    }
    return false;
  });

  const isDisplayName = (name: string): boolean => {
    return schulen.value.some((schule: Organisation) => getDisplayNameForOrg(schule) === name);
  };

  const updateSearchString = (searchString: string | undefined): void => {
    if (searchString && !isDisplayName(searchString)) {
      // Update organisation filter
      schulenFilter.searchString = searchString;

      // Update workflow filter with the corresponding property
      organisationenFilter.organisationName = searchString;
    } else {
      // Clear search from both filters
      delete schulenFilter.searchString;
      delete organisationenFilter.organisationName;
    }
  };

  const searchInputSchulen: Ref<string> = useDebouncedSearch(updateSearchString);
  const clearInput = (): void => {
    searchInputSchulen.value = '';
  };

  const updateOrganisationenIds = (selection: AnySelection): void => {
    organisationenFilter.organisationId =
      (hasAutoselectedSchule.value ? autoselectedSchule.value?.id : undefined) ??
      wrapSelectedSchulen(selection).at(0)?.id;
  };

  const handleSelectionUpdate = (selection: AnySelection): void => {
    if (isEmptySelection(selection)) {
      updateOrganisationenIds([]);
      updateSearchString(undefined);
      clearInput();
    } else {
      updateOrganisationenIds(selection);
    }
    if (!props.multiple) {
      blurActiveElement();
    }
  };

  const isSameSelection = (a: AnySelection, b: AnySelection): boolean => {
    return sameContent(wrapSelectedSchulen(a), wrapSelectedSchulen(b), (org: Organisation) => org.id);
  };

  const handleFocusChange = (focused: boolean): void => {
    if (!props.multiple) {
      return;
    }
    if (!focused) {
      searchInputSchulen.value = '';
    }
  };

  async function handleWorkflowStep(filter: WorkflowFilter | LandesbediensteterWorkflowFilter): Promise<void> {
    if (props.useLandesbediensteteWorkflow) {
      await personenkontextStore.processWorkflowStepLandesbedienstete(filter);
    } else {
      await personenkontextStore.processWorkflowStep({
        operationContext: props.operationContext,
        ...filter,
      });
    }
  }

  watch(
    [selectedSchulen, hasAutoselectedSchule],
    ([currentSelection, currentlyHasAutoselectedSchule]: SelectionChange, [oldSelection]: PreviousSelectionChange) => {
      // Case 1: Selection has changed - update parent directly
      if (!isSameSelection(currentSelection, oldSelection)) {
        handleSelectionUpdate(currentSelection);
        return;
      }

      // Case 2: Empty selection - use autoselected or initial values
      if (isEmptySelection(currentSelection)) {
        if (currentlyHasAutoselectedSchule && autoselectedSchule.value) {
          const newSelection: SelectedSchulen<M> = normalizeSelection(
            props.multiple ? [autoselectedSchule.value] : autoselectedSchule.value,
          );
          selectedSchulen.value = newSelection;
          handleSelectionUpdate(newSelection);
        }
      }
    },
    { immediate: true },
  );

  // Load organisations when the active endpoint's filter changes.
  watch(
    [(): OperationContext | undefined => props.operationContext, (): string | undefined => props.personId],
    ([operationContext, personId]: [OperationContext | undefined, string | undefined]): void => {
      organisationenFilter.operationContext = operationContext;
      organisationenFilter.personId = personId;
    },
  );

  watch(
    [
      (): OrganisationenFilterForAutocomplete | WorkflowFilter =>
        props.useWorkflowEndpoints ? organisationenFilter : schulenFilter,
      (): boolean | undefined => props.useLandesbediensteteWorkflow,
    ],
    (
      _values: [OrganisationenFilterForAutocomplete | WorkflowFilter, boolean | undefined],
      [oldFilter]: [OrganisationenFilterForAutocomplete | WorkflowFilter | undefined, (boolean | undefined)?],
    ) => {
      if (!props.useWorkflowEndpoints && !isEmptySelection(selectedSchulen.value) && isInputDisabled.value) {
        return;
      }

      if (!props.useWorkflowEndpoints && !oldFilter) {
        return;
      }

      if (props.useWorkflowEndpoints) {
        void handleWorkflowStep(organisationenFilter);
      } else {
        void organisationStore.loadOrganisationenForFilter(schulenFilter, props.parentId);
      }
    },
    { deep: true, immediate: true },
  );

  onMounted(() => {
    if (organisationStore.organisationenFilters.has(props.parentId ?? '')) {
      // eslint-disable-next-line no-console
      console.warn(`SchulenFilter initialized twice with id ${props.parentId}`);
    }
    organisationStore.resetOrganisationenFilter(props.parentId);
    if (!props.useWorkflowEndpoints && !(isInputDisabled.value && !isEmptySelection(selectedSchulen.value))) {
      void organisationStore.loadOrganisationenForFilter(schulenFilter, props.parentId);
    }
  });

  onUnmounted(() => {
    organisationStore.clearOrganisationenFilter(props.parentId);
  });
</script>

<template>
  <v-autocomplete
    autocomplete="off"
    :class="['filter-dropdown', { selected: shouldHighlightSelection }]"
    clearable
    :data-testid="testId"
    density="compact"
    :disabled="isInputDisabled"
    :id="testId"
    :ref="testId"
    :items="schulen"
    item-value="id"
    :item-title="getDisplayNameForOrg"
    return-object
    :multiple="Boolean(props.multiple)"
    :no-data-text="'noDataFound'"
    :placeholder="props.placeholderText ?? t('admin.schule.assignSchule')"
    required="true"
    variant="outlined"
    @click:clear="
      useWorkflowEndpoints
        ? (personenkontextStore.workflowStepResponse = null)
        : organisationStore.resetOrganisationenFilter(props.parentId)
    "
    @update:focused="handleFocusChange"
    v-bind="selectedSchuleProps"
    v-model="autocompleteSelection"
    v-model:search="searchInputSchulen"
    :hide-details
  >
    <template #prepend-item>
      <slot name="prepend-item" />
    </template>
    <template v-slot:selection="{ item, index }">
      <span
        v-if="getDisplayItem(item, index)"
        class="v-autocomplete__selection-text"
      >
        {{ getDisplayItem(item, index) }}
      </span>
    </template>
  </v-autocomplete>
</template>
