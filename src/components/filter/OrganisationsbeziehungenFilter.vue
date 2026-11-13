<script setup lang="ts">
  import type { OrganisationsbeziehungOrganisationResponse } from '@/api-client/generated/api';
  import { useDebouncedSearch } from '@/composables/useDebouncedSearch';
  import { dedup } from '@/utils/arrays';
  import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';

  type Props = {
    initialValue?: string;
    items?: Array<OrganisationsbeziehungOrganisationResponse>;
  };
  type ResolvedProps = Omit<Props, 'initialValue' | 'items'> & {
    initialValue: string;
    items: Array<OrganisationsbeziehungOrganisationResponse>;
  };
  const props: ResolvedProps = withDefaults(defineProps<Props>(), {
    initialValue: '',
    items: (): Array<OrganisationsbeziehungOrganisationResponse> => [],
  });

  type Emits = {
    (event: 'onApplySearchFilter', searchFilter: string): void;
  };
  const emit: Emits = defineEmits<Emits>();

  const selectedOrganisation: Ref<OrganisationsbeziehungOrganisationResponse | null> = ref(null);

  /* The typed text wins, otherwise the selection keeps filtering after the autocomplete cleared its search text. */
  function applySearchFilter(typedText: string): void {
    emit('onApplySearchFilter', (typedText || selectedOrganisation.value?.name || '').trim());
  }

  const searchInput: Ref<string> = useDebouncedSearch(applySearchFilter);
  searchInput.value = props.initialValue;

  watch(selectedOrganisation, (): void => {
    applySearchFilter(searchInput.value);
  });

  /* The selection is kept as item so it stays selectable although the search narrowed the loaded rows. */
  const organisationen: ComputedRef<Array<OrganisationsbeziehungOrganisationResponse>> = computed(
    (): Array<OrganisationsbeziehungOrganisationResponse> =>
      dedup(
        selectedOrganisation.value ? [selectedOrganisation.value, ...props.items] : props.items,
        (organisation: OrganisationsbeziehungOrganisationResponse): string => organisation.id,
      ),
  );
</script>

<template>
  <v-row
    class="ma-3 align-center justify-end"
    data-testid="organisationsbeziehungen-filter"
  >
    <v-col
      cols="12"
      md="5"
    >
      <v-autocomplete
        v-model="selectedOrganisation"
        v-model:search="searchInput"
        autocomplete="off"
        clearable
        data-testid="organisationsbeziehungen-filter-select"
        density="compact"
        hide-details
        :items="organisationen"
        item-title="name"
        item-value="id"
        :no-data-text="$t('admin.organisation.beziehungen.noDataFound')"
        :placeholder="$t('admin.searchResultTable')"
        return-object
        :title="$t('admin.organisation.beziehungen.searchHoverText')"
        variant="outlined"
      />
    </v-col>
  </v-row>
</template>
