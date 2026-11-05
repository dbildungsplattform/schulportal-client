<script setup lang="ts" generic="TItem extends TableItem">
  /* this block is necessary to introduce a table header type for defining table headers
      watch source for updates: https://stackoverflow.com/a/75993081/4790594
   */
  import { SortOrder } from '@/utils/sorting';
  import { onMounted, onUnmounted, shallowRef, watch, type ShallowRef } from 'vue';
  import type { DataTableHeader } from 'vuetify';

  export type Headers = DataTableHeader[];

  export type TableItem = Record<string, unknown>;

  export type TableRow<T> = {
    item: T;
  };

  type ItemValuePath = Extract<keyof TItem, string>;
  type SelectedItemValue = TItem[ItemValuePath];

  const selectedItems: ShallowRef<SelectedItemValue[]> = shallowRef([]);

  type Props = {
    currentPage?: number;
    disableRowClick?: boolean;
    headers: Headers;
    items: TItem[];
    itemsPerPage: number;
    itemValuePath: ItemValuePath;
    loading: boolean;
    totalItems: number;
    currentSort?: { key: string; order: 'asc' | 'desc' } | null;
    // This prop is necessary so the parent component can decide which items should be de-selected after the filters have been used.
    modelValue?: SelectedItemValue[];
    hideSelect?: boolean;
    noDataText?: string;
  };

  const props: Props = defineProps<Props>();

  type Emits = {
    (event: 'onHandleRowClick', eventPayload: PointerEvent, item: TableRow<TItem>): void;
    (event: 'onTableUpdate', options: { sortField: string | undefined; sortOrder: 'asc' | 'desc' }): void;
    (event: 'onItemsPerPageUpdate', limit: number): void;
    (event: 'onPageUpdate', page: number): void;
    (event: 'update:selectedRows', selectedRows: SelectedItemValue[]): void;
  };

  const emit: Emits = defineEmits<Emits>();

  const resetSelection = (): void => {
    selectedItems.value = [];
  };

  defineExpose({
    resetSelection,
  });

  function handleKeyDown(event: KeyboardEvent): void {
    // Check if the pressed key is Enter
    if (event.key === 'Enter') {
      const target: HTMLElement = event.target as HTMLElement;

      // Check if the target or its closest parent is a header checkbox, if so then we shouldn't trigger anything when "Enter" is pressed as it's not a table row.
      const isHeaderCheckbox: boolean =
        target.closest('thead')?.querySelector('input[type="checkbox"]') === target ||
        target.querySelector('input[type="checkbox"]') !== null;

      // If it's a header checkbox, do nothing
      if (isHeaderCheckbox) {
        return;
      }

      const row: HTMLTableRowElement | null = target.closest('tr');

      if (row) {
        // Find the corresponding item for this row.
        const rowIndex: number = Array.from(row.parentElement!.children).indexOf(row);
        const item: TItem | undefined = props.items[rowIndex];

        if (item) {
          // Prevent default Enter key behavior
          event.preventDefault();

          // Emit the same event as handleRowClick
          emit('onHandleRowClick', event as unknown as PointerEvent, { item });
        }
      }
    }
  }

  function handleRowClick(event: PointerEvent, item: TableRow<TItem>): void {
    if (!props.disableRowClick) {
      emit('onHandleRowClick', event, item);
    }
  }

  type SortItem = {
    key: string;
    order?: boolean | 'asc' | 'desc';
  };

  function onUpdateOptions(options: SortItem[]): void {
    if (options.length === 0) {
      emit('onTableUpdate', {
        sortField: props.currentSort?.key,
        sortOrder: props.currentSort?.key === SortOrder.Asc ? SortOrder.Desc : SortOrder.Asc,
      });
    } else if (options.length > 0) {
      const sortItem: SortItem | undefined = options[0];
      if (sortItem?.key !== props.currentSort?.key || sortItem?.order !== props.currentSort?.order) {
        emit('onTableUpdate', {
          sortField: sortItem?.key,
          sortOrder: sortItem?.order === SortOrder.Desc ? SortOrder.Desc : SortOrder.Asc,
        });
      }
    }
  }

  // Emits selected item values resolved by itemValuePath.
  function emitSelectedRows(): void {
    const selectedRows: SelectedItemValue[] = selectedItems.value;
    emit('update:selectedRows', selectedRows);
  }

  // Update the selectedItems dependings on what the table shows currently.
  watch(
    () => props.modelValue,
    (newValue: SelectedItemValue[] | undefined) => {
      selectedItems.value = newValue || [];
    },
    { immediate: true },
  );

  // On Mount we emit an event to the parent to sort the table by first column and ASC.
  onMounted(() => {
    // If the sortField in the store has a value then we don't trigger this logic. This logic should only be triggered when the table was first opened without any changes to sorting.
    if (!props.currentSort?.key) {
      if (
        props.headers &&
        props.headers.filter((header: { sortable?: boolean }) => header.sortable !== false)[0]?.key
      ) {
        emit('onTableUpdate', {
          sortField: props.headers[0]?.key,
          sortOrder: SortOrder.Asc,
        });
      }
    }
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });
</script>

<template>
  <v-data-table-server
    ref="v-data-table-server"
    class="result-table"
    v-model="selectedItems"
    data-testid="result-table"
    density="compact"
    :headers="headers"
    :items="items"
    :items-length="totalItems"
    :items-per-page="itemsPerPage"
    :items-per-page-options="[5, 30, 50, 100, 300]"
    :items-per-page-text="'itemsPerPage'"
    :item-value="itemValuePath"
    :loading="loading"
    :loading-text="$t('loadingData')"
    :page="currentPage"
    select-strategy="page"
    :show-current-page="true"
    :show-select="!hideSelect"
    :sort-by="currentSort ? [currentSort] : []"
    :no-data-text="noDataText ?? 'noDataFound'"
    @click:row="handleRowClick"
    @update:sort-by="onUpdateOptions"
    @update:page="(page: number) => $emit('onPageUpdate', page)"
    @update:items-per-page="(limit: number) => $emit('onItemsPerPageUpdate', limit)"
    @update:model-value="emitSelectedRows"
  >
    <template v-slot:loading>
      <div class="d-flex flex-column align-center justify-center pa-4">
        <v-progress-circular
          color="primary"
          indeterminate
        />
        <div class="mt-2">
          {{ $t('loadingData') }}
        </div>
      </div>
    </template>

    <template
      v-for="(_, name) in $slots"
      v-slot:[name]="slotProps"
      :key="name"
    >
      <slot
        :name="name"
        v-bind="slotProps"
      />
    </template>
  </v-data-table-server>
</template>

<style scoped>
  .result-table :deep(.v-data-table-progress) {
    display: none !important;
  }
</style>
