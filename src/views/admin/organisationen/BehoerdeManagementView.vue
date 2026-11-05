<script setup lang="ts">
  import ResultTable, { type Headers } from '@/components/admin/ResultTable.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import {
    OrganisationsTyp,
    useOrganisationStore,
    type Organisation,
    type OrganisationStore,
  } from '@/stores/OrganisationStore';
  import { OrganisationSortField, SortOrder } from '@/utils/sorting';
  import { onMounted, ref, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { onBeforeRouteLeave, useRouter, type Router } from 'vue-router';

  const organisationStore: OrganisationStore = useOrganisationStore();
  const router: Router = useRouter();
  const { t }: Composer = useI18n({ useScope: 'global' });

  const currentPage: Ref<number> = ref(1);
  const itemsPerPage: Ref<number> = ref(30);
  const headers: Headers = [{ title: t('admin.behoerde.name'), key: 'name', align: 'start', sortable: false }];

  async function fetchBehoerden(): Promise<void> {
    organisationStore.errorCode = '';
    await organisationStore.getAllOrganisationen({
      offset: (currentPage.value - 1) * itemsPerPage.value,
      limit: itemsPerPage.value,
      includeTyp: OrganisationsTyp.Behoerde,
      systemrechte: ['BEHOERDEN_VERWALTEN'],
      sortField: OrganisationSortField.Name,
      sortOrder: SortOrder.Asc,
    });
  }

  function updatePage(page: number): void {
    currentPage.value = page;
    fetchBehoerden();
  }

  function navigateToBehoerdeDetails(_event: PointerEvent, { item }: { item: Organisation }): void {
    router.push({ name: 'behoerde-details', params: { id: item.id } });
  }

  function updateItemsPerPage(limit: number): void {
    currentPage.value = 1;
    itemsPerPage.value = limit;
    fetchBehoerden();
  }

  onMounted((): void => {
    organisationStore.allOrganisationen = [];
    organisationStore.totalOrganisationen = 0;
    fetchBehoerden();
  });

  onBeforeRouteLeave((): void => {
    organisationStore.errorCode = '';
  });
</script>

<template>
  <div class="admin">
    <h1
      class="text-center headline"
      data-testid="admin-headline"
    >
      {{ $t('admin.headline') }}
    </h1>
    <LayoutCard
      :header="$t('admin.behoerde.management')"
      headlineTestId="behoerde-management-headline"
    >
      <SpshAlert
        v-if="organisationStore.errorCode"
        data-testid="behoerde-loading-error"
        :model-value="true"
        :title="$t('admin.behoerde.loadingErrorTitle')"
        :text="$t('admin.behoerde.loadingErrorText')"
        type="error"
        :closable="false"
        :show-button="true"
        :button-text="$t('nav.backToList')"
        :button-action="fetchBehoerden"
      />
      <ResultTable
        v-else
        data-testid="behoerde-table"
        :current-page="currentPage"
        :headers="headers"
        :items="organisationStore.allOrganisationen"
        :items-per-page="itemsPerPage"
        item-value-path="id"
        :loading="organisationStore.loading"
        :total-items="organisationStore.totalOrganisationen"
        hide-select
        @on-handle-row-click="navigateToBehoerdeDetails"
        @on-page-update="updatePage"
        @on-items-per-page-update="updateItemsPerPage"
      />
    </LayoutCard>
  </div>
</template>
