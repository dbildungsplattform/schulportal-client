<script setup lang="ts">
  import type { PersonenkontextWorkflowResponse, RollenSystemRechtEnum } from '@/api-client/generated/api';
  import { useAutoselectedSchule } from '@/composables/useAutoselectedSchule';
  import {
    OrganisationsTyp,
    useOrganisationStore,
    type AutoCompleteStore,
    type Organisation,
    type OrganisationenFilter,
    type OrganisationStore,
  } from '@/stores/OrganisationStore';
  import {
    usePersonenkontextStore,
    type OperationContext,
    type PersonenkontextStore,
    type WorkflowFilter,
  } from '@/stores/PersonenkontextStore';
  import type { TranslatedObject } from '@/types';
  import { dedup, sameContent } from '@/utils/arrays';
  import { blurActiveElement } from '@/utils/focus';
  import { getDisplayNameForOrg } from '@/utils/formatting';
  import type { BaseFieldProps } from 'vee-validate';
  import { computed, onMounted, onUnmounted, reactive, ref, watch, watchEffect, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';

  type SelectedSchulenIds = Array<string> | string | undefined;
  type Props = {
    hideDetails?: boolean;
    systemrechteForSearch?: Array<RollenSystemRechtEnum>;
    multiple: boolean;
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
  type Emits = {
    (e: 'update:selectedSchulenObjects', value: Array<Organisation>): void;
  };
  type ResolvedProps = Omit<Props, 'selectionCountKey'> & { selectionCountKey: string };
  type SelectionChange = [SelectedSchulenIds, boolean];
  type PreviousSelectionChange = [SelectedSchulenIds, boolean | undefined];

  const props: ResolvedProps = withDefaults(defineProps<Props>(), {
    selectionCountKey: 'admin.schule.schulenSelected',
  });
  const emits: Emits = defineEmits<Emits>();
  const selectedSchulen: Ref<SelectedSchulenIds> = defineModel('selectedSchulen');
  const lastEmittedSelection: Ref<SelectedSchulenIds> = ref(undefined);
  const searchInputSchulen: Ref<string | undefined> = ref(undefined);
  const clearInput = (): void => {
    searchInputSchulen.value = undefined;
    selectedSchulen.value = undefined;
  };

  const { t }: Composer = useI18n({ useScope: 'global' });
  const organisationStore: OrganisationStore = useOrganisationStore();
  const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();

  const timerId: Ref<ReturnType<typeof setTimeout> | undefined> = ref<ReturnType<typeof setTimeout>>();
  const testId: ComputedRef<string> = computed(() => {
    const typ: string = props.includeAll ? 'organisation' : 'schule';
    return props.parentId ? `${props.parentId}-${typ}-select` : `${typ}-select`;
  });

  const organisationStoreReference: ComputedRef<AutoCompleteStore<Organisation> | undefined> = computed(() => {
    return organisationStore.organisationenFilters.get(props.parentId ?? '');
  });

  // This will either return the store reference for the organisation store or the workflow response (A separate store reference for the workflow is not needed)
  const storeReference: ComputedRef<AutoCompleteStore<Organisation> | PersonenkontextWorkflowResponse> = computed(
    () => {
      const isWorkflow: boolean | undefined = props.useWorkflowEndpoints;

      if (isWorkflow) {
        return {
          ...personenkontextStore.workflowStepResponse,
        } as PersonenkontextWorkflowResponse;
      }

      // Provide a fallback empty object to avoid returning undefined
      return (
        organisationStoreReference.value ?? ({ filterResult: [] as Organisation[] } as AutoCompleteStore<Organisation>)
      );
    },
  );
  const typFilter: ComputedRef<Pick<OrganisationenFilter, 'includeTyp' | 'excludeTyp'>> = computed(() => {
    if (props.includeAll) {
      return { excludeTyp: [OrganisationsTyp.Klasse] };
    } else {
      return { includeTyp: OrganisationsTyp.Schule };
    }
  });

  // The filter used to load the Schulen and possibly orgas
  const schulenFilter: OrganisationenFilter = reactive({
    ...typFilter.value,
    systemrechte: props.systemrechteForSearch,
    limit: 25,
    organisationIds: [],
    searchString: undefined,
  });

  // Specific filter to load the organisationen in the forms that are tied to the workflow endpoints (Normal and landesbedienstete)
  const organisationenFilter: WorkflowFilter = reactive({
    operationContext: props.operationContext,
    personId: props.personId,
    organisationId: undefined,
    rollenIds: [],
    rolleName: undefined,
    organisationName: undefined,
    limit: 25,
    requestedWithSystemrecht: props.systemrechteForSearch ? props.systemrechteForSearch[0] : undefined,
  });

  const { hasAutoselectedSchule, autoselectedSchule }: ReturnType<typeof useAutoselectedSchule> = useAutoselectedSchule(
    props.systemrechteForSearch ?? [],
  );

  const isInputDisabled: ComputedRef<boolean | undefined> = computed(() => {
    return props.readonly || hasAutoselectedSchule.value || props.isRolleUnassignForm;
  });

  // selection is represented as an array internally
  // wrap/unwrap is used to convert between internal and vuetify representation
  const wrapSelectedSchulenIds = (selectedIds: SelectedSchulenIds): Array<string> => {
    if (Array.isArray(selectedIds)) {
      return selectedIds.filter(Boolean);
    }
    if (selectedIds) {
      return [selectedIds];
    }
    return [];
  };

  const unwrapSelectedSchulenIds = (selectedIds: Array<string>): SelectedSchulenIds => {
    if (selectedIds.length === 0) {
      return undefined;
    } else if (selectedIds.length === 1) {
      return selectedIds.at(0);
    } else {
      return selectedIds;
    }
  };

  const isEmptySelection = (selection: SelectedSchulenIds): boolean => {
    if (!selection) {
      return true;
    }
    return wrapSelectedSchulenIds(selection).filter(Boolean).length === 0;
  };

  const translateSchule = (schule: Organisation): TranslatedObject => ({
    value: schule.id,
    title: getDisplayNameForOrg(schule),
  });

  const translatedSchulen: ComputedRef<Array<TranslatedObject>> = computed(() => {
    const storeData: AutoCompleteStore<Organisation> | PersonenkontextWorkflowResponse = storeReference.value;

    // Extract organisations based on store type
    let organisations: Organisation[] = [];

    if (props.useWorkflowEndpoints) {
      // Handle workflow response - check if it has organisations property. If yes then we are dealing with the workflow response
      if ('organisations' in storeData) {
        organisations = storeData.organisations;
      }
    } else {
      // Handle regular organisation store - check if filterResult exists and is an array. If yes then we are dealing with the organisation store
      let filterResult: Organisation[] | undefined;
      if ('filterResult' in storeData) {
        filterResult = storeData.filterResult;
      }
      if (Array.isArray(filterResult)) {
        organisations = filterResult;
      }
    }

    // Add autoselected if present
    if (autoselectedSchule.value) {
      organisations.push(autoselectedSchule.value);
    }

    // Deduplicate and translate
    const uniqueOrgs: Organisation[] = dedup(organisations, (org: Organisation) => org.id);
    return uniqueOrgs.map(translateSchule);
  });

  const canDisplaySelection = (selection: SelectedSchulenIds): boolean => {
    const result: boolean = wrapSelectedSchulenIds(selection).every((selectedSchuleId: string) =>
      Boolean(
        // translatedSchulen should include autoSelection if needed, so no extra logic is needed here
        translatedSchulen.value.find(
          (translatedSchule: TranslatedObject) => translatedSchule.value === selectedSchuleId,
        ),
      ),
    );
    return result;
  };

  const getDisplayItem = (item: TranslatedObject, index: number): string => {
    if (!selectedSchulen.value) {
      return '';
    }
    if (!canDisplaySelection(selectedSchulen.value)) {
      return '...';
    }

    const selectedIds: string[] = wrapSelectedSchulenIds(selectedSchulen.value);

    if (!props.multiple) {
      return item.title;
    }
    if (selectedIds.length < 2) {
      return item.title;
    }
    if (index === 0) {
      return t(props.selectionCountKey, { count: selectedIds.length });
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
    return translatedSchulen.value.find((schule: TranslatedObject) => schule.title === name) !== undefined;
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

  const getDefaultIds = (): Array<string> => {
    if (hasAutoselectedSchule.value) {
      return wrapSelectedSchulenIds(autoselectedSchule.value?.id);
    }
    return [];
  };

  const updateOrganisationenIds = (ids: SelectedSchulenIds): void => {
    const tempIds: Array<string> = getDefaultIds().concat(wrapSelectedSchulenIds(ids));
    schulenFilter.organisationIds = dedup(tempIds.filter(Boolean));
    organisationenFilter.organisationId = dedup(tempIds.filter(Boolean)).at(0);
  };

  const resolveSelection = (selection: SelectedSchulenIds, organisations: Array<Organisation>): Array<Organisation> => {
    if (isEmptySelection(selection)) {
      return [];
    }
    const selectedIds: Array<string> = wrapSelectedSchulenIds(selection);

    return organisations.filter((org: Organisation) => selectedIds.includes(org.id));
  };

  const handleSelectionUpdate = (selection: SelectedSchulenIds): void => {
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

  const isSameSelection = (a: SelectedSchulenIds, b: SelectedSchulenIds): boolean => {
    return sameContent(wrapSelectedSchulenIds(a), wrapSelectedSchulenIds(b), (id: SelectedSchulenIds) => {
      if (!id) {
        return '';
      }
      return id;
    });
  };

  const handleFocusChange = (focused: boolean): void => {
    if (!props.multiple) {
      return;
    }
    if (!focused) {
      searchInputSchulen.value = undefined;
    }
  };

  async function handleWorkflowStep(filter: WorkflowFilter): Promise<void> {
    if (props.useLandesbediensteteWorkflow) {
      await personenkontextStore.processWorkflowStepLandesbedienstete(filter);
    } else {
      await personenkontextStore.processWorkflowStep({
        operationContext: props.operationContext,
        ...filter,
        requestedWithSystemrecht: props.systemrechteForSearch ? props.systemrechteForSearch[0] : undefined,
      });
    }
  }

  watchEffect(() => {
    const wrappedSelection: Array<string> = wrapSelectedSchulenIds(selectedSchulen.value);
    if (isSameSelection(lastEmittedSelection.value, wrappedSelection)) {
      return;
    }
    if (wrappedSelection.length === 0) {
      lastEmittedSelection.value = [];
      emits('update:selectedSchulenObjects', []);
      return;
    }

    const storeData: AutoCompleteStore<Organisation> | PersonenkontextWorkflowResponse = storeReference.value;

    let organisations: Array<Organisation> = [];
    if ('filterResult' in storeData && Array.isArray(storeData.filterResult)) {
      organisations = storeData.filterResult;
    } else if ('organisations' in storeData && Array.isArray(storeData.organisations)) {
      organisations = storeData.organisations;
    }

    const resolvedSelection: Array<Organisation> = resolveSelection(wrappedSelection, organisations);
    if (resolvedSelection.length === wrappedSelection.length) {
      lastEmittedSelection.value = wrappedSelection;
      emits('update:selectedSchulenObjects', resolvedSelection);
    }
  });

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
        const newIds: SelectedSchulenIds =
          currentlyHasAutoselectedSchule && autoselectedSchule.value
            ? unwrapSelectedSchulenIds([autoselectedSchule.value.id])
            : [];

        if (!isSameSelection(selectedSchulen.value, newIds)) {
          selectedSchulen.value = newIds;
          handleSelectionUpdate(newIds);
        }
      }
    },
    { immediate: true },
  );

  // This watches both filters and triggers loading of organisationen when they change
  watch(
    [schulenFilter, organisationenFilter],
    (
      [newSchulenFilter, newOrganisationenFilter]: [OrganisationenFilter, WorkflowFilter],
      [oldSchulenFilter, oldOrganisationenFilter]: [OrganisationenFilter | undefined, WorkflowFilter | undefined] = [
        undefined,
        undefined,
      ],
    ) => {
      if (
        !isEmptySelection(selectedSchulen.value) &&
        isInputDisabled.value &&
        canDisplaySelection(selectedSchulen.value)
      ) {
        return;
      }

      if (timerId.value) {
        clearTimeout(timerId.value);
      }

      const hasOldFilter: boolean = !!oldSchulenFilter || !!oldOrganisationenFilter;
      const delay: number = hasOldFilter ? 500 : 0;

      timerId.value = setTimeout(async () => {
        if (props.useWorkflowEndpoints) {
          await handleWorkflowStep(newOrganisationenFilter);
        } else {
          await organisationStore.loadOrganisationenForFilter(newSchulenFilter, props.parentId);
        }
      }, delay);
    },
    { deep: true, immediate: true },
  );

  onMounted(async () => {
    if (organisationStore.organisationenFilters.has(props.parentId ?? '')) {
      // eslint-disable-next-line no-console
      console.warn(`SchulenFilter initialized twice with id ${props.parentId}`);
    }
    organisationStore.resetOrganisationenFilter(props.parentId);
    // Initializes the Rollen for the selected Schule (or Orga if includeAll is true)
    if (props.useWorkflowEndpoints) {
      await handleWorkflowStep({
        personId: props.personId,
        operationContext: props.operationContext,
        organisationId: Array.isArray(selectedSchulen.value) ? selectedSchulen.value[0] : selectedSchulen.value,
        rollenIds: props.selectedRollen ?? [],
        limit: 25,
      });
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
    :items="translatedSchulen"
    item-value="value"
    item-text="title"
    :multiple="props.multiple"
    :no-data-text="'noDataFound'"
    :placeholder="props.placeholderText ?? t('admin.schule.assignSchule')"
    required="true"
    variant="outlined"
    @update:search="updateSearchString"
    @click:clear="
      useWorkflowEndpoints
        ? (personenkontextStore.workflowStepResponse = null)
        : organisationStore.resetOrganisationenFilter(props.parentId)
    "
    @update:focused="handleFocusChange"
    v-bind="selectedSchuleProps"
    v-model="selectedSchulen"
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
