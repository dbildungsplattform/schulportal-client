<script setup lang="ts">
  import { useDebouncedSearch } from '@/composables/useDebouncedSearch';
  import type { Ref } from 'vue';

  type Props = {
    initialValue?: string;
  };
  type ResolvedProps = Omit<Props, 'initialValue'> & { initialValue: string };
  const props: ResolvedProps = withDefaults(defineProps<Props>(), { initialValue: '' });

  type Emits = {
    (event: 'onApplySearchFilter', searchFilter: string): void;
  };
  const emit: Emits = defineEmits<Emits>();

  const searchInput: Ref<string> = useDebouncedSearch((value: string): void => {
    emit('onApplySearchFilter', value.trim());
  });
  searchInput.value = props.initialValue;

  function updateSearchInput(value: string | null): void {
    searchInput.value = value ?? '';
  }
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
      <v-text-field
        autocomplete="off"
        clearable
        data-testid="organisationsbeziehungen-filter-input"
        density="compact"
        hide-details
        :model-value="searchInput"
        :placeholder="$t('admin.searchResultTable')"
        :title="$t('admin.organisation.beziehungen.searchHoverText')"
        variant="outlined"
        @update:model-value="updateSearchInput"
      />
    </v-col>
  </v-row>
</template>
