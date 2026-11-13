<script setup lang="ts">
  import SearchField from '@/components/admin/SearchField.vue';

  type Props = {
    initialValue?: string;
  };
  type ResolvedProps = Omit<Props, 'initialValue'> & { initialValue: string };
  const props: ResolvedProps = withDefaults(defineProps<Props>(), { initialValue: '' });

  type Emits = {
    (event: 'onApplySearchFilter', searchFilter: string): void;
  };
  const emit: Emits = defineEmits<Emits>();
</script>

<template>
  <v-row
    class="ma-3 align-center justify-end"
    data-testid="organisationsbeziehungen-filter"
  >
    <SearchField
      :initial-value="props.initialValue"
      :input-cols="6"
      :input-cols-md="3"
      :button-cols="6"
      :button-cols-md="2"
      :hover-text="$t('admin.organisation.beziehungen.searchHoverText')"
      @on-apply-search-filter="(filter: string) => emit('onApplySearchFilter', filter)"
    />
  </v-row>
</template>
