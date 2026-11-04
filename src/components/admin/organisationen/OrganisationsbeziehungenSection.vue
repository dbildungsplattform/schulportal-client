<script setup lang="ts">
  import {
    SortFieldOrganisationsbeziehung,
    type OrganisationsbeziehungOrganisationResponse,
    type OrganisationsbeziehungWithOrganisationenResponse,
  } from '@/api-client/generated/api';
  import ResultTable, { type Headers } from '@/components/admin/ResultTable.vue';
  import OrganisationsbeziehungenFilter from '@/components/filter/OrganisationsbeziehungenFilter.vue';
  import {
    useOrganisationsbeziehungStore,
    type OrganisationsbeziehungStore,
  } from '@/stores/OrganisationsbeziehungStore';
  import { SortOrder } from '@/utils/sorting';
  import { computed, onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';

  type Props = {
    organisationId: string;
  };
  const props: Props = defineProps<Props>();

  type BeziehungTableItem = {
    id: string;
    typ: string;
    name: string;
    dienststellennummer: string;
  };

  const { t }: Composer = useI18n({ useScope: 'global' });
  const organisationsbeziehungStore: OrganisationsbeziehungStore = useOrganisationsbeziehungStore();

  const isOpen: Ref<boolean> = ref(false);
  const page: Ref<number> = ref(1);
  const perPage: Ref<number> = ref(30);
  const searchString: Ref<string> = ref('');
  const currentSort: Ref<{ key: string; order: 'asc' | 'desc' }> = ref({
    key: SortFieldOrganisationsbeziehung.Typ,
    order: SortOrder.Asc,
  });

  /* The backend only sorts by quelle or ziel fields. Since the displayed organisation switches between both per row, only the typ column is sortable. */
  const headers: Headers = [
    { title: t('admin.organisation.beziehungen.typ'), key: SortFieldOrganisationsbeziehung.Typ, align: 'start' },
    { title: t('admin.organisation.beziehungen.name'), key: 'name', align: 'start', sortable: false },
    {
      title: t('admin.organisation.beziehungen.dienststellennummer'),
      key: 'dienststellennummer',
      align: 'start',
      sortable: false,
    },
  ];

  /* Either quelle or ziel is the current organisation; the other one is the related organisation to display. */
  function getRelatedOrganisation(
    beziehung: OrganisationsbeziehungWithOrganisationenResponse,
  ): OrganisationsbeziehungOrganisationResponse | undefined {
    if (beziehung.quelle.id === props.organisationId) {
      return beziehung.ziel;
    }
    if (beziehung.ziel.id === props.organisationId) {
      return beziehung.quelle;
    }
    return undefined;
  }

  /* Rows where neither quelle nor ziel is the current organisation are a backend error and are skipped. */
  const tableItems: ComputedRef<Array<BeziehungTableItem>> = computed(() =>
    organisationsbeziehungStore.beziehungen.flatMap(
      (beziehung: OrganisationsbeziehungWithOrganisationenResponse): Array<BeziehungTableItem> => {
        const related: OrganisationsbeziehungOrganisationResponse | undefined = getRelatedOrganisation(beziehung);
        if (!related) {
          return [];
        }
        return [
          {
            id: beziehung.id,
            typ: t(`admin.organisation.beziehungen.typen.${beziehung.typ}`),
            name: related.name,
            dienststellennummer: related.dienststellennummer ?? '---',
          },
        ];
      },
    ),
  );

  async function fetchBeziehungen(): Promise<void> {
    await organisationsbeziehungStore.loadBeziehungen(props.organisationId, {
      offset: (page.value - 1) * perPage.value,
      limit: perPage.value,
      searchString: searchString.value,
      sortField: currentSort.value.key as SortFieldOrganisationsbeziehung,
      sortOrder: currentSort.value.order as SortOrder,
    });
  }

  async function handlePageUpdate(newPage: number): Promise<void> {
    page.value = newPage;
    await fetchBeziehungen();
  }

  async function handleItemsPerPageUpdate(limit: number): Promise<void> {
    perPage.value = limit;
    page.value = 1;
    await fetchBeziehungen();
  }

  async function handleSearchFilter(filter: string): Promise<void> {
    searchString.value = filter;
    page.value = 1;
    await fetchBeziehungen();
  }

  async function handleTableSorting(update: {
    sortField: string | undefined;
    sortOrder: 'asc' | 'desc';
  }): Promise<void> {
    if (!update.sortField) {
      return;
    }
    currentSort.value = { key: update.sortField, order: update.sortOrder };
    page.value = 1;
    await fetchBeziehungen();
  }

  watch(isOpen, async (open: boolean): Promise<void> => {
    if (open) {
      await fetchBeziehungen();
    }
  });

  onBeforeUnmount(() => {
    organisationsbeziehungStore.$reset();
  });
</script>

<template>
  <div data-testid="organisationsbeziehungen-section">
    <v-divider
      class="border-opacity-100 rounded"
      color="#E5EAEF"
      thickness="6"
    ></v-divider>

    <v-row
      class="mt-2 align-center"
      no-gutters
    >
      <v-col cols="auto">
        <h3
          class="subtitle-1"
          data-testid="organisationsbeziehungen-headline"
        >
          {{ t('admin.organisation.beziehungen.headline') }}
        </h3>
      </v-col>
      <v-col cols="auto">
        <v-btn
          :aria-expanded="isOpen.toString()"
          :aria-label="t('admin.organisation.beziehungen.toggle')"
          data-testid="organisationsbeziehungen-toggle-button"
          icon
          size="small"
          variant="plain"
          @click="isOpen = !isOpen"
        >
          <v-icon
            class="chevron"
            :class="{ rotate: isOpen }"
          >
            mdi-chevron-down
          </v-icon>
        </v-btn>
      </v-col>
    </v-row>

    <v-expand-transition>
      <div
        v-show="isOpen"
        data-testid="organisationsbeziehungen-content"
      >
        <v-alert
          v-if="organisationsbeziehungStore.errorCode"
          class="my-3"
          data-testid="organisationsbeziehungen-error-alert"
          type="error"
          variant="outlined"
        >
          {{ t('admin.organisation.beziehungen.loadingErrorText') }}
        </v-alert>
        <template v-else>
          <OrganisationsbeziehungenFilter
            :initial-value="searchString"
            @on-apply-search-filter="handleSearchFilter"
          />
          <v-row class="ma-3">
            <v-col cols="12">
              <ResultTable
                :current-page="page"
                :current-sort="currentSort"
                data-testid="organisationsbeziehungen-table"
                :disable-row-click="true"
                :headers="headers"
                :hide-select="true"
                :items="tableItems"
                :items-per-page="perPage"
                item-value-path="id"
                :loading="organisationsbeziehungStore.loading"
                :no-data-text="t('admin.organisation.beziehungen.noDataFound')"
                :total-items="organisationsbeziehungStore.total"
                @on-items-per-page-update="handleItemsPerPageUpdate"
                @on-page-update="handlePageUpdate"
                @on-table-update="handleTableSorting"
              >
                <template #[`item.name`]="{ item }">
                  <div
                    class="ellipsis-wrapper"
                    :title="item.name"
                  >
                    {{ item.name }}
                  </div>
                </template>
              </ResultTable>
            </v-col>
          </v-row>
        </template>
      </div>
    </v-expand-transition>
  </div>
</template>

<style scoped>
  .chevron {
    transition: transform 200ms ease;
  }
  .chevron.rotate {
    transform: rotate(180deg);
  }
</style>
