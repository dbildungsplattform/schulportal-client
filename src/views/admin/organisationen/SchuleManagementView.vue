<script setup lang="ts">
  import ResultTable, { type Headers } from '@/components/admin/ResultTable.vue';
  import SearchField from '@/components/admin/SearchField.vue';
  import OrganisationDelete from '@/components/admin/organisationen/OrganisationDelete.vue';
  import ItsLearningSetup from '@/components/admin/schulen/itsLearningSetup.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { OrganisationsTyp, useOrganisationStore, type OrganisationStore } from '@/stores/OrganisationStore';
  import { RollenSystemRecht } from '@/stores/RolleStore';
  import { useSearchFilterStore, type SearchFilterStore } from '@/stores/SearchFilterStore';
  import { onMounted, ref, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { onBeforeRouteLeave } from 'vue-router';

  const organisationStore: OrganisationStore = useOrganisationStore();
  const searchFilterStore: SearchFilterStore = useSearchFilterStore();

  const { t }: Composer = useI18n({ useScope: 'global' });

  type ReadonlyHeaders = Headers;
  const headers: ReadonlyHeaders = [
    {
      title: t('admin.schule.dienststellennummer'),
      key: 'kennung',
      align: 'start',
    },
    { title: t('admin.schule.schulname'), key: 'name', align: 'start' },
    { title: t('admin.schule.itsLearningStatus'), key: 'itslearning', sortable: false, align: 'start' },
    {
      title: t('action'),
      key: 'actions',
      align: 'center',
      sortable: false,
      width: '250px',
    },
  ];

  const searchFilter: Ref<string> = ref('');

  async function fetchSchulen(): Promise<void> {
    await organisationStore.getAllOrganisationen({
      offset: (searchFilterStore.schulenPage - 1) * searchFilterStore.schulenPerPage,
      limit: searchFilterStore.schulenPerPage,
      includeTyp: OrganisationsTyp.Schule,
      systemrechte: [RollenSystemRecht.SchulenVerwalten],
      searchString: searchFilterStore.searchStringForSchulen || '',
    });
  }

  function getPaginatedSchulen(page: number): void {
    searchFilterStore.schulenPage = page;
    fetchSchulen();
  }

  function getPaginatedSchulenWithLimit(limit: number): void {
    /* reset page to 1 if entries are equal to or less than selected limit */
    if (organisationStore.totalOrganisationen <= limit) {
      searchFilterStore.schulenPage = 1;
    }

    searchFilterStore.schulenPerPage = limit;
    fetchSchulen();
  }

  async function handleSearchFilter(filter: string): Promise<void> {
    searchFilterStore.setSearchFilterForSchulen(filter);
    searchFilter.value = filter;
    await fetchSchulen();
  }

  async function toggleItsLearningStatus(organisationId: string): Promise<void> {
    await organisationStore.setItsLearningForSchule(organisationId);
  }

  async function deleteSchule(organisationId: string): Promise<void> {
    await organisationStore.deleteOrganisationById(organisationId);
  }

  const handleSchuleDeleteClose = async (): Promise<void> => {
    await fetchSchulen();
  };

  const handleAlertClose = (): void => {
    organisationStore.errorCode = '';
  };

  onMounted(async () => {
    await fetchSchulen();
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
    <LayoutCard
      headlineTestId="schule-management-headline"
      :header="$t('admin.schule.management')"
    >
      <!-- Error Message Display -->
      <SpshAlert
        :model-value="!!organisationStore.errorCode"
        :title="
          organisationStore.errorCode === 'UNSPECIFIED_ERROR'
            ? $t('admin.schule.loadingErrorTitle')
            : $t(`admin.schule.title.${organisationStore.errorCode}`)
        "
        :type="'error'"
        :closable="false"
        :text="
          organisationStore.errorCode === 'UNSPECIFIED_ERROR'
            ? $t('admin.schule.loadingErrorText')
            : $t('admin.schule.deleteSchuleNotice') +
              (organisationStore.errorCode ? ' ' + $t(`admin.schule.errors.${organisationStore.errorCode}`) : '')
        "
        :show-button="true"
        :button-text="$t('nav.backToList')"
        :button-action="handleAlertClose"
        @update:model-value="handleAlertClose"
      />
      <template v-if="!organisationStore.errorCode">
        <v-row class="ma-3 align-center justify-end">
          <SearchField
            ref="searchFieldComponent"
            :initial-value="searchFilterStore.searchStringForSchulen ?? ''"
            :input-cols="6"
            :input-cols-md="3"
            :button-cols="6"
            :button-cols-md="2"
            :hover-text="$t('admin.schule.schulnameDienststellennummer')"
            @on-apply-search-filter="handleSearchFilter"
          />
        </v-row>
        <ResultTable
          ref="result-table"
          :current-page="searchFilterStore.schulenPage"
          data-testid="schule-table"
          :items="organisationStore.allSchulen || []"
          :loading="organisationStore.loading"
          :headers="headers"
          item-value-path="id"
          :disable-row-click="true"
          :total-items="organisationStore.totalSchulen"
          :items-per-page="searchFilterStore.schulenPerPage"
          @on-items-per-page-update="getPaginatedSchulenWithLimit"
          @on-page-update="getPaginatedSchulen"
        >
          <template #[`item.name`]="{ item }">
            <div
              class="ellipsis-wrapper"
              :title="item.name"
            >
              {{ item.name }}
            </div>
          </template>
          <template #[`item.itslearning`]="{ item }">
            <ItsLearningSetup
              :error-code="organisationStore.errorCode"
              :schulname="item.name"
              :schul-id="item.id"
              :itslearning-enabled="item.itslearningEnabled || false"
              @on-activate-itslearning="toggleItsLearningStatus(item.id)"
            />
          </template>
          <template #[`item.actions`]="{ item }">
            <OrganisationDelete
              :organisations-typ="OrganisationsTyp.Schule"
              :organisation-id="item.id"
              :header-text="$t('admin.schule.deleteSchuleHeader', { schulname: item.name })"
              :confirmation-message="
                $t('admin.schule.deleteSchuleConfirmation', { dienststellennummer: item.kennung, schulname: item.name })
              "
              :condition-list-message="$t('admin.schule.deleteSchuleConditionList')"
              :success-message="$t('admin.schule.deleteSchuleSuccess', { schulname: item.name })"
              :error-message="
                organisationStore.errorCode ? $t(`admin.schule.errors.${organisationStore.errorCode}`) : ''
              "
              :use-icon-activator="true"
              :is-loading="organisationStore.loading"
              @on-delete-organisation="deleteSchule(item.id)"
              @on-close="handleSchuleDeleteClose"
            />
          </template>
        </ResultTable>
      </template>
    </LayoutCard>
  </div>
</template>

<style></style>
