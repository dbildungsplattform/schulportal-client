<script setup lang="ts">
  import { onMounted, ref, type Ref } from 'vue';
  import ResultTable, { type TableRow, type Headers } from '@/components/admin/ResultTable.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { type Composer, useI18n } from 'vue-i18n';
  import {
    OrganisationsTyp,
    useOrganisationStore,
    type Organisation,
    type OrganisationStore,
    type SchultraegerTableItem,
  } from '@/stores/OrganisationStore';
  import { type SearchFilterStore, useSearchFilterStore } from '@/stores/SearchFilterStore';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import { onBeforeRouteLeave, useRouter, type Router } from 'vue-router';

  const organisationStore: OrganisationStore = useOrganisationStore();
  const searchFilterStore: SearchFilterStore = useSearchFilterStore();

  const router: Router = useRouter();

  const { t }: Composer = useI18n({ useScope: 'global' });

  type ReadonlyHeaders = Headers;
  const headers: ReadonlyHeaders = [
    {
      title: t('admin.schultraeger.schultraegername'),
      key: 'name',
      align: 'start',
    },
    { title: t('admin.schultraeger.assignedSchulen'), key: 'schuleDetails', align: 'start' },
  ];

  const allSchultraeger: Ref<Array<Organisation>> = ref([]);

  async function fetchSchultraeger(): Promise<void> {
    await organisationStore.getAllOrganisationen({
      offset: (searchFilterStore.schultraegerPage - 1) * searchFilterStore.schulentraegerPerPage,
      limit: searchFilterStore.schulentraegerPerPage,
      includeTyp: OrganisationsTyp.Traeger,
      systemrechte: ['SCHULTRAEGER_VERWALTEN'],
    });
  }

  function getPaginatedSchultraeger(page: number): void {
    searchFilterStore.schultraegerPage = page;
    fetchSchultraeger();
  }

  function getPaginatedSchultraegerWithLimit(limit: number): void {
    /* reset page to 1 if entries are equal to or less than selected limit */
    if (organisationStore.totalOrganisationen <= limit) {
      searchFilterStore.schultraegerPage = 1;
    }

    searchFilterStore.schulentraegerPerPage = limit;
    fetchSchultraeger();
  }

  const handleAlertClose = (): void => {
    organisationStore.errorCode = '';
    router.go(0);
  };

  function navigateToSchultraegerDetails(_$event: PointerEvent, { item }: { item: SchultraegerTableItem }): void {
    router.push({ name: 'schultraeger-details', params: { id: item.id } });
  }

  onMounted(async () => {
    await fetchSchultraeger();
    allSchultraeger.value = organisationStore.allSchultraeger;
  });

  onBeforeRouteLeave(() => {
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
    <LayoutCard :header="$t('admin.schultraeger.management')">
      <!-- Error Message Display -->
      <SpshAlert
        :model-value="!!organisationStore.errorCode"
        :title="
          organisationStore.errorCode === 'UNSPECIFIED_ERROR'
            ? $t('admin.schultraeger.loadingErrorTitle')
            : $t(`admin.schultraeger.title.${organisationStore.errorCode}`)
        "
        :type="'error'"
        :closable="false"
        :text="
          organisationStore.errorCode === 'UNSPECIFIED_ERROR'
            ? $t('admin.schultraeger.loadingErrorText')
            : $t(`admin.schultraeger.errors.${organisationStore.errorCode}`)
        "
        :show-button="true"
        :button-text="$t('nav.backToList')"
        :button-action="handleAlertClose"
        @update:model-value="handleAlertClose"
      />
      <template v-if="!organisationStore.errorCode">
        <v-row class="ma-3 align-center justify-end" />
        <ResultTable
          ref="result-table"
          :current-page="searchFilterStore.schultraegerPage"
          data-testid="schultraeger-table"
          :items="organisationStore.allSchultraeger || []"
          :loading="organisationStore.loading"
          :headers="headers"
          item-value-path="id"
          :total-items="organisationStore.totalSchultraeger"
          :items-per-page="searchFilterStore.schulentraegerPerPage"
          @on-handle-row-click="
            (event: PointerEvent, item: TableRow<unknown>) =>
              navigateToSchultraegerDetails(event, item as TableRow<SchultraegerTableItem>)
          "
          @on-items-per-page-update="getPaginatedSchultraegerWithLimit"
          @on-page-update="getPaginatedSchultraeger"
        >
          <template #[`item.name`]="{ item }">
            <div
              class="ellipsis-wrapper"
              :title="item.name"
            >
              {{ item.name }}
            </div>
          </template>
          <template #[`item.schuleDetails`]="{ item }">
            <div
              class="ellipsis-wrapper"
              :title="item.schuleDetails"
            >
              {{ item.schuleDetails }}
            </div>
          </template>
        </ResultTable>
      </template>
    </LayoutCard>
  </div>
</template>

<style></style>
