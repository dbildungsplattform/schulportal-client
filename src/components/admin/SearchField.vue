<script setup lang="ts">
  import { onBeforeMount, ref, type Ref } from 'vue';
  import { useI18n } from 'vue-i18n';

  useI18n({ useScope: 'global' });

  const searchFilter: Ref<string | null> = ref('');

  type Emits = {
    (event: 'onApplySearchFilter', searchFilter: string): void;
  };

  type Props = {
    hoverText: string;
    initialValue: string;
    inputCols: number;
    inputColsMd: number;
    buttonCols: number;
    buttonColsMd: number;
  };

  const emit: Emits = defineEmits<{
    (event: 'onApplySearchFilter', searchFilter: string): void;
  }>();

  const props: Props = defineProps<Props>();

  defineExpose({
    searchFilter,
  });

  function applySearchFilter(): void {
    if (searchFilter.value !== null) {
      emit('onApplySearchFilter', searchFilter.value.trim());
    } else {
      emit('onApplySearchFilter', '');
    }
  }

  onBeforeMount(() => {
    searchFilter.value = props.initialValue;
  });
</script>

<template>
  <v-col
    :cols="inputCols + buttonCols"
    :md="inputColsMd + buttonColsMd"
  >
    <div class="d-flex ga-2">
      <v-text-field
        id="search-filter-input"
        v-model="searchFilter"
        autocomplete="off"
        class="search-field flex-grow-1"
        clearable
        data-testid="search-filter-input"
        density="compact"
        hide-details
        :placeholder="$t('admin.searchResultTable')"
        required="true"
        :title="props.hoverText"
        variant="outlined"
        @keyup.enter="applySearchFilter"
        @click:clear="applySearchFilter"
      />
      <v-btn
        class="primary search button flex-shrink-0"
        data-testid="apply-search-filter-button"
        height="44"
        prepend-icon="mdi-magnify"
        width="160"
        @click="applySearchFilter()"
      >
        {{ $t('search') }}
      </v-btn>
    </div>
  </v-col>
</template>

<style></style>
