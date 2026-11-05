<script setup lang="ts">
  import KlasseDelete from '@/components/admin/klassen/KlasseDelete.vue';
  import ResultTable, { type TableRow, type Headers } from '@/components/admin/ResultTable.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import KlassenFilter from '@/components/filter/KlassenFilter.vue';
  import SchulenFilter from '@/components/filter/SchulenFilter.vue';
  import { useAutoselectedSchule } from '@/composables/useAutoselectedSchule';
  import {
    OrganisationsTyp,
    useOrganisationStore,
    type Organisation,
    type OrganisationenFilter,
    type OrganisationStore,
  } from '@/stores/OrganisationStore';
  import { RollenSystemRecht } from '@/stores/RolleStore';
  import { useSearchFilterStore, type SearchFilterStore } from '@/stores/SearchFilterStore';
  import { type Mutable } from '@/types.d';
  import { OrganisationSortField, SortOrder } from '@/utils/sorting';
  import { computed, ref, watch, watchEffect, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { onBeforeRouteLeave, useRouter, type Router } from 'vue-router';

  const organisationStore: OrganisationStore = useOrganisationStore();
  const searchFilterStore: SearchFilterStore = useSearchFilterStore();
  const { t }: Composer = useI18n({ useScope: 'global' });

  const router: Router = useRouter();

  const klasseColumnKey: string = 'name';

  const klasseToDelete: Ref<Organisation | null> = ref(null);
  const isDeleteDialogOpen: Ref<boolean, boolean> = ref(false);

  let defaultHeaders: Mutable<Headers> = [
    {
      title: t('admin.klasse.klasse'),
      key: klasseColumnKey,
      align: 'start',
      width: '250px',
    },
    {
      title: t('action'),
      key: 'actions',
      align: 'center',
      sortable: false,
      width: '250px',
    },
  ];

  const headers: Ref<Mutable<Headers>> = ref(defaultHeaders) as Ref<Mutable<Headers>>;

  const { hasAutoselectedSchule }: ReturnType<typeof useAutoselectedSchule> = useAutoselectedSchule([
    RollenSystemRecht.KlassenVerwalten,
  ]);

  const pageOffset: ComputedRef<number> = computed(
    () => (searchFilterStore.klassenPage - 1) * searchFilterStore.klassenPerPage,
  );

  const selectedSchule: Ref<string | undefined> = ref(searchFilterStore.selectedSchuleForKlassen || undefined);
  const hasSelectedSchule: ComputedRef<boolean> = computed(
    () => (selectedSchule.value !== undefined && selectedSchule.value !== '') || hasAutoselectedSchule.value,
  );
  const selectedKlassen: Ref<Array<string>> = ref(searchFilterStore.selectedKlassenForKlassen || []);
  const klassenListFilter: ComputedRef<OrganisationenFilter> = computed(() => {
    const initialFilter: OrganisationenFilter = {
      includeTyp: OrganisationsTyp.Klasse,
      systemrechte: [RollenSystemRecht.KlassenVerwalten],
      offset: pageOffset.value,
      limit: searchFilterStore.klassenPerPage,
      organisationIds: selectedKlassen.value,
      sortField: searchFilterStore.organisationenSortField ?? undefined,
      sortOrder: searchFilterStore.organisationenSortOrder ?? undefined,
    };
    if (selectedSchule.value) {
      initialFilter.administriertVon = [selectedSchule.value];
    }
    return initialFilter;
  });

  const finalKlassen: ComputedRef<Organisation[]> = computed(() => {
    // If there are selected Klassen, filter allKlassen to show only those that are selected
    if (selectedKlassen.value.length > 0) {
      return organisationStore.allKlassen.filter((klasse: Organisation) => selectedKlassen.value.includes(klasse.id));
    }

    // Otherwise, return allKlassen as is
    return organisationStore.allKlassen;
  });

  // Used for to show the number of klassen found in the filter. It uses the store key 'klassen-management' to get the total count of this specific view.
  const totalKlassen: ComputedRef<number> = computed(
    () => organisationStore.klassenFilters.get('klassen-management')?.total ?? 0,
  );

  // Used for the total count of Klassen in the table
  const totalKlassenCount: ComputedRef<number> = computed(() => {
    if (selectedKlassen.value.length > 0) {
      return finalKlassen.value.length;
    }
    return organisationStore.totalKlassen;
  });

  const errorTitle: ComputedRef<string> = computed(() => {
    if (!organisationStore.errorCode) {
      return '';
    }
    return organisationStore.errorCode === 'UNSPECIFIED_ERROR'
      ? t('admin.klasse.loadingErrorTitle')
      : t(`admin.klasse.title.${organisationStore.errorCode}`);
  });

  const errorText: ComputedRef<string> = computed(() => {
    if (!organisationStore.errorCode) {
      return '';
    }
    return organisationStore.errorCode === 'UNSPECIFIED_ERROR'
      ? t('admin.klasse.loadingErrorText')
      : t(`admin.klasse.errors.${organisationStore.errorCode}`);
  });

  function setKlassenPage(page: number): void {
    searchFilterStore.klassenPage = page;
  }

  function getPaginatedKlassenWithLimit(limit: number): void {
    /* reset page to 1 if entries are equal to or less than selected limit */
    if (organisationStore.totalOrganisationen <= limit) {
      searchFilterStore.klassenPage = 1;
    }
    searchFilterStore.klassenPerPage = limit;
  }

  // // Checks if the filter is active or not
  const filterActive: Ref<boolean> = computed(() => {
    if (hasAutoselectedSchule.value) {
      return selectedKlassen.value.length > 0;
    }
    return !!selectedSchule.value || selectedKlassen.value.length > 0;
  });

  // // Function to reset search and filter
  function resetSearchAndFilter(): void {
    // Clear selected Klassen
    selectedKlassen.value = [];
    // Clear the store
    searchFilterStore.setSchuleFilterForKlassen(null);
    searchFilterStore.setKlasseFilterForKlassen([]);
    searchFilterStore.klassenPage = 1;
    searchFilterStore.organisationenSortField = null;
    searchFilterStore.organisationenSortOrder = null;

    // If the user has an autoselected Schule, do not reset it
    if (!hasAutoselectedSchule.value) {
      selectedSchule.value = undefined;
    }
  }

  function updateSchuleSelection(id: string | undefined): void {
    if (selectedSchule.value === id) {
      return;
    }
    selectedSchule.value = id;
    searchFilterStore.setSchuleFilterForKlassen(id ?? null);
    searchFilterStore.klassenPage = 1;
    if (!id) {
      resetSearchAndFilter();
    }
  }

  function updateKlassenSelection(ids: string[] | undefined): void {
    selectedKlassen.value = ids ?? [];
    searchFilterStore.setKlasseFilterForKlassen(ids ?? null);
  }

  async function reloadData(filter: OrganisationenFilter): Promise<void> {
    await organisationStore.getAllOrganisationen(filter);
  }

  async function deleteKlasse(organisationId: string): Promise<void> {
    await organisationStore.deleteOrganisationById(organisationId);
  }

  const handleAlertClose = async (): Promise<void> => {
    organisationStore.errorCode = '';
    isDeleteDialogOpen.value = false;
    klasseToDelete.value = null;
    await reloadData(klassenListFilter.value);
  };

  async function handleKlasseDeleteCloseWrapper(): Promise<void> {
    klasseToDelete.value = null;
    await reloadData(klassenListFilter.value);
  }

  function navigateToKlassenDetails(_$event: PointerEvent, { item }: { item: Organisation }): void {
    router.push({ name: 'klasse-details', params: { id: item.id } });
  }

  function handleTableSorting(update: { sortField: string | undefined; sortOrder: 'asc' | 'desc' }): void {
    if (update.sortField && Object.values(OrganisationSortField).includes(update.sortField as OrganisationSortField)) {
      searchFilterStore.organisationenSortField = update.sortField as OrganisationSortField;
      searchFilterStore.organisationenSortOrder = update.sortOrder as SortOrder;
    }
  }

  watch(
    hasAutoselectedSchule,
    () => {
      if (hasAutoselectedSchule.value) {
        return;
      } else {
        headers.value = [
          {
            title: t('admin.schule.dienststellennummer'),
            key: 'schuleDetails',
            align: 'start',
            sortable: false,
            width: '350px',
          },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          ...headers.value,
        ];
      }
    },
    { immediate: true },
  );

  const administriertVonForKlassenFilter: ComputedRef<Array<string>> = computed(() => {
    return selectedSchule.value ? [selectedSchule.value] : [];
  });

  watchEffect(async () => {
    await reloadData(klassenListFilter.value);
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
      {{ t('admin.headline') }}
    </h1>
    <LayoutCard
      :header="t('admin.klasse.management')"
      headlineTestId="klasse-management-headline"
    >
      <!-- Error Message Display -->
      <SpshAlert
        :button-action="handleAlertClose"
        :button-text="t('nav.backToList')"
        :closable="false"
        data-test-id-prefix="klasse-management-error"
        :model-value="!!organisationStore.errorCode"
        :show-button="true"
        :text="errorText"
        :title="errorTitle"
        :type="'error'"
      />
      <template v-if="!organisationStore.errorCode">
        <v-row class="ma-3 align-center justify-end">
          <v-col
            cols="12"
            md="2"
            class="py-md-0 text-md-right"
          >
            <v-btn
              class="px-0 reset-filter"
              data-testid="reset-filter-button"
              :disabled="!filterActive"
              size="x-small"
              variant="text"
              width="auto"
              @click="resetSearchAndFilter()"
            >
              {{ t('resetFilter') }}
            </v-btn>
          </v-col>
          <v-col
            md="3"
            cols="12"
            class="py-md-0"
          >
            <SchulenFilter
              ref="schule-select"
              :systemrechte-for-search="[RollenSystemRecht.KlassenVerwalten]"
              parentId="klassen-management"
              :multiple="false"
              :hide-details="true"
              :highlight-selection="true"
              :selected-schulen="selectedSchule"
              :placeholder-text="t('admin.schule.schule')"
              @update:selected-schulen="updateSchuleSelection"
            >
              <template #prepend-item>
                <v-list-item>
                  <v-progress-circular
                    indeterminate
                    v-if="organisationStore.organisationenFilters.get('klassen-management')?.loading"
                  ></v-progress-circular>
                  <span
                    v-else
                    class="filter-header"
                    >{{
                      t(
                        'admin.schule.schulenFound',
                        {
                          count: organisationStore.organisationenFilters.get('klassen-management')?.total,
                        },
                        organisationStore.organisationenFilters.get('klassen-management')?.total ?? 0,
                      )
                    }}</span
                  >
                </v-list-item>
              </template>
            </SchulenFilter>
          </v-col>
          <v-col
            md="3"
            cols="12"
            class="py-md-0"
          >
            <v-tooltip
              :disabled="hasSelectedSchule"
              location="top"
            >
              <template #activator="{ props }">
                <div v-bind="props">
                  <KlassenFilter
                    ref="klasse-select"
                    parentId="klassen-management"
                    :systemrechte-for-search="[RollenSystemRecht.KlassenVerwalten]"
                    :multiple="true"
                    :readonly="!hasSelectedSchule"
                    :hide-details="true"
                    :highlight-selection="true"
                    :selected-klassen="selectedKlassen"
                    :total-klassen="totalKlassen"
                    :placeholder-text="t('admin.klasse.klassen')"
                    :administriert-von="administriertVonForKlassenFilter"
                    @update:selected-klassen="updateKlassenSelection"
                  >
                    <template #prepend-item>
                      <v-list-item>
                        <v-progress-circular
                          v-if="organisationStore.loading"
                          data-testid="klassen-filter-progress"
                          indeterminate
                        />
                        <span
                          v-else
                          class="filter-header"
                          >{{
                            t(
                              'admin.klasse.klassenFound',
                              {
                                count: totalKlassen,
                              },
                              totalKlassen,
                            )
                          }}</span
                        >
                      </v-list-item>
                    </template>
                  </KlassenFilter>
                </div>
              </template>
              <span>{{ t('admin.schule.selectSchuleFirst') }}</span>
            </v-tooltip>
          </v-col>
        </v-row>
        <ResultTable
          ref="resultTable"
          :current-page="searchFilterStore.klassenPage"
          data-testid="klasse-table"
          :header="t('admin.klasse.management')"
          :items="finalKlassen || []"
          :loading="organisationStore.loading"
          :headers="headers"
          :current-sort="{
            key: searchFilterStore.organisationenSortField ?? klasseColumnKey,
            order: searchFilterStore.organisationenSortOrder ?? SortOrder.Asc,
          }"
          :total-items="totalKlassenCount"
          :items-per-page="searchFilterStore.klassenPerPage"
          item-value-path="id"
          @on-handle-row-click="
            (event: PointerEvent, item: TableRow<unknown>) =>
              navigateToKlassenDetails(event, item as TableRow<Organisation>)
          "
          @on-items-per-page-update="getPaginatedKlassenWithLimit"
          @on-page-update="setKlassenPage"
          @on-table-update="handleTableSorting"
        >
          <template #[`item.schuleDetails`]="{ item }">
            <div
              class="ellipsis-wrapper"
              :title="item.schuleDetails"
            >
              {{ item.schuleDetails }}
            </div>
          </template>
          <template #[`item.actions`]="{ item }">
            <v-icon
              data-testid="open-klasse-delete-dialog-icon"
              icon="mdi-delete"
              size="small"
              @click.stop="
                () => {
                  klasseToDelete = item;
                  isDeleteDialogOpen = true;
                }
              "
            />
          </template>
        </ResultTable>
        <KlasseDelete
          v-if="klasseToDelete"
          v-model="isDeleteDialogOpen"
          :klassenname="klasseToDelete.name"
          :klassen-id="klasseToDelete.id"
          :schulname="klasseToDelete.schuleDetails ?? ''"
          :error-code="organisationStore.errorCode"
          :is-loading="organisationStore.loading"
          :use-icon-activator="false"
          @on-delete-klasse="deleteKlasse"
          @on-close="handleKlasseDeleteCloseWrapper"
        />
      </template>
    </LayoutCard>
  </div>
</template>
