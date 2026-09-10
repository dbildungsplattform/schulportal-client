<script setup lang="ts">
  import ResultTable, { type Headers, type TableRow } from '@/components/admin/ResultTable.vue';
  import SearchField from '@/components/admin/SearchField.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import SchulenFilter from '@/components/filter/SchulenFilter.vue';
  import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
  import {
    RollenArt,
    RollenMerkmal,
    RollenSystemRecht,
    RolleStore,
    useRolleStore,
    type RolleResponse,
    type RolleTableItem,
  } from '@/stores/RolleStore';
  import { rollenPerPageDefault, useSearchFilterStore, type SearchFilterStore } from '@/stores/SearchFilterStore';
  import {
    ServiceProviderIdNameResponse,
    ServiceProviderStore,
    useServiceProviderStore,
  } from '@/stores/ServiceProviderStore';
  import { computed, ComputedRef, onMounted, ref, Ref } from 'vue';

  import { useI18n, type Composer } from 'vue-i18n';
  import { useRouter, type Router } from 'vue-router';

  const authStore: AuthStore = useAuthStore();
  const rolleStore: RolleStore = useRolleStore();
  const searchFilterStore: SearchFilterStore = useSearchFilterStore();
  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();

  const router: Router = useRouter();
  const { t }: Composer = useI18n({ useScope: 'global' });

  type MerkmalItem = { title: string; value: RollenMerkmal };
  const allMerkmale: readonly MerkmalItem[] = Object.values(RollenMerkmal).map(
    (merkmal: RollenMerkmal): MerkmalItem => ({
      title: t(`admin.rolle.mappingFrontBackEnd.merkmale.${merkmal}`),
      value: merkmal,
    }),
  );

  type RollenartItem = { title: string; value: RollenArt };
  const allRollenarten: readonly RollenartItem[] = Object.values(RollenArt).map(
    (rollenart: RollenArt): RollenartItem => ({
      title: t(`admin.rolle.mappingFrontBackEnd.rollenarten.${rollenart}`),
      value: rollenart,
    }),
  );

  type AngebotItem = { title: string; value: string };
  const angeboteItems: ComputedRef<AngebotItem[]> = computed(() =>
    serviceProviderStore.serviceProvidersForRollenVerwaltung.map(
      (serviceProvider: ServiceProviderIdNameResponse): AngebotItem => ({
        title: serviceProvider.name,
        value: serviceProvider.id,
      }),
    ),
  );

  type ReadonlyHeaders = Headers;
  const headers: ReadonlyHeaders = [
    { title: t('admin.rolle.rollenname'), key: 'name', align: 'start' },
    { title: t('admin.rolle.rollenart'), key: 'rollenart', align: 'start' },
    { title: t('admin.rolle.merkmale'), key: 'merkmale', align: 'start' },
    { title: t('admin.serviceProvider.serviceProvider'), key: 'serviceProviders', align: 'start' },
    {
      title: t('admin.administrationsebene.administrationsebene'),
      key: 'administeredBySchulstrukturknoten',
      align: 'start',
    },
  ];

  const searchFieldComponent: Ref<{ searchFilter?: string } | null> = ref(null);
  const searchFilter: Ref<string> = ref(searchFilterStore.searchStringForRollen ?? '');

  const transformedRollenAndMerkmale: ComputedRef<RolleTableItem[]> = computed(() => {
    return rolleStore.allRollen.map((rolle: RolleResponse) => {
      // If the name administeredBySchulstrukturknoten exists, format the administeredBySchulstrukturknoten field accordingly
      let administeredBySchulstrukturknoten: string = '';
      if (rolle.administeredBySchulstrukturknotenName) {
        administeredBySchulstrukturknoten = rolle.administeredBySchulstrukturknotenKennung
          ? `${rolle.administeredBySchulstrukturknotenKennung} (${rolle.administeredBySchulstrukturknotenName})`
          : rolle.administeredBySchulstrukturknotenName;
      }

      const formattedMerkmale: string =
        Array.from(rolle.merkmale).length > 0
          ? Array.from(rolle.merkmale)
              .map((merkmal: RollenMerkmal) => t(`admin.rolle.mappingFrontBackEnd.merkmale.${merkmal}`))
              .join(', ')
          : '---'; // Return dash if merkmale is empty or not defined

      return {
        ...rolle,
        rollenart: t(`admin.rolle.mappingFrontBackEnd.rollenarten.${rolle.rollenart}`),
        merkmale: formattedMerkmale,
        administeredBySchulstrukturknoten,
      };
    });
  });

  const isFilterActive: ComputedRef<boolean> = computed(() => {
    return (
      searchFilterStore.selectedMerkmaleForRollen?.length > 0 ||
      searchFilterStore.selectedRollenartenForRollen?.length > 0 ||
      searchFilterStore.selectedOrganisationenForRollen?.length > 0 ||
      searchFilterStore.selectedAngeboteForRollen?.length > 0 ||
      (searchFilterStore.searchStringForRollen !== null && searchFilterStore.searchStringForRollen?.length > 0)
    );
  });

  function navigateToRolleDetails(_$event: PointerEvent, { item }: { item: RolleTableItem }): void {
    router.push({ name: 'rolle-details', params: { id: item.id } });
  }

  async function getRollen(): Promise<void> {
    await rolleStore.getAllRollen({
      offset: (searchFilterStore.rollenPage - 1) * searchFilterStore.rollenPerPage,
      limit: searchFilterStore.rollenPerPage,
      searchString: searchFilterStore.searchStringForRollen ?? undefined,
      systemrechte: [RollenSystemRecht.RollenVerwalten, RollenSystemRecht.MptRollenVerwalten],
      organisationenForFilter: searchFilterStore.selectedOrganisationenForRollen?.length
        ? searchFilterStore.selectedOrganisationenForRollen
        : undefined,
      merkmale: searchFilterStore.selectedMerkmaleForRollen?.length
        ? searchFilterStore.selectedMerkmaleForRollen
        : undefined,
      rollenarten: searchFilterStore.selectedRollenartenForRollen?.length
        ? searchFilterStore.selectedRollenartenForRollen
        : undefined,
      serviceProviderIds: searchFilterStore.selectedAngeboteForRollen?.length
        ? searchFilterStore.selectedAngeboteForRollen
        : undefined,
    });
  }

  async function getPaginatedRollen(page: number): Promise<void> {
    searchFilterStore.rollenPage = page;
    await getRollen();
  }

  async function setMerkmaleFilter(merkmale: RollenMerkmal[]): Promise<void> {
    searchFilterStore.setMerkmaleFilterForRollen(merkmale);
    searchFilterStore.rollenPage = 1;
    await getRollen();
  }

  async function setRollenartenFilter(rollenarten: RollenArt[]): Promise<void> {
    searchFilterStore.setRollenartenFilterForRollen(rollenarten);
    searchFilterStore.rollenPage = 1;
    await getRollen();
  }

  async function setOrganisationenFilter(organisationen: string[]): Promise<void> {
    searchFilterStore.setOrganisationenFilterForRollen(organisationen ?? []);
    searchFilterStore.rollenPage = 1;
    await getRollen();
  }

  function setSelectedAngeboteCache(angebote: string[]): void {
    const newCache: Record<string, string> = {};

    for (const id of angebote) {
      const found: AngebotItem | undefined = angeboteItems.value.find((i: AngebotItem) => i.value === id);

      if (found) {
        newCache[id] = found.title;
      }
    }

    searchFilterStore.setAngeboteNamesForRollen(newCache);
  }

  async function setAngeboteFilter(angebote: string[]): Promise<void> {
    setSelectedAngeboteCache(angebote);
    searchFilterStore.setAngeboteFilterForRollen(angebote ?? []);
    searchFilterStore.rollenPage = 1;
    await getRollen();
  }

  let angeboteSearchTimerId: ReturnType<typeof setTimeout>;
  function handleAngeboteSearch(searchStr: string): void {
    clearTimeout(angeboteSearchTimerId);
    angeboteSearchTimerId = setTimeout(() => {
      serviceProviderStore.getServiceProvidersForRollenVerwaltung({ limit: 25, searchStr: searchStr || undefined });
    }, 500);
  }

  async function getPaginatedRollenWithLimit(limit: number): Promise<void> {
    /* reset page to 1 if entries are equal to or less than selected limit */
    if (rolleStore.totalRollen <= limit) {
      searchFilterStore.rollenPage = 1;
    }

    searchFilterStore.rollenPerPage = limit;
    await getRollen();
  }

  async function resetFilter(): Promise<void> {
    searchFilterStore.setMerkmaleFilterForRollen([]);
    searchFilterStore.setRollenartenFilterForRollen([]);
    searchFilterStore.setOrganisationenFilterForRollen([]);
    searchFilterStore.setAngeboteFilterForRollen([]);
    searchFilterStore.setAngeboteNamesForRollen({});
    searchFilterStore.rollenPage = 1;
    searchFilterStore.rollenPerPage = rollenPerPageDefault;
    searchFilter.value = '';
    if (searchFieldComponent.value) {
      searchFieldComponent.value.searchFilter = '';
    }
    searchFilterStore.setSearchFilterForRollen(null);
    await getRollen();
  }

  async function handleSearchFilter(filter: string): Promise<void> {
    searchFilterStore.setSearchFilterForRollen(filter);
    await getRollen();
  }

  onMounted(async () => {
    const tasks: Promise<unknown>[] = [getRollen()];

    if (authStore.hasAngeboteVerwaltenPermission) {
      tasks.push(serviceProviderStore.getServiceProvidersForRollenVerwaltung({ limit: 25 }));
    }

    await Promise.all(tasks);
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
      :header="$t('admin.rolle.management')"
      headlineTestId="rolle-management-headline"
    >
      <v-row class="ma-3 align-start">
        <v-col
          cols="12"
          md="2"
          class="py-md-0 text-md-right align-self-center"
        >
          <v-btn
            class="px-0 reset-filter"
            data-testid="reset-filter-button"
            :disabled="!isFilterActive"
            size="x-small"
            variant="text"
            width="auto"
            @click="resetFilter()"
          >
            {{ $t('resetFilter') }}
          </v-btn>
        </v-col>

        <v-col
          cols="12"
          md="2"
        >
          <v-autocomplete
            id="rollenarten-filter-select"
            v-model="searchFilterStore.selectedRollenartenForRollen"
            clearable
            class="filter-dropdown"
            :class="{ selected: searchFilterStore.selectedRollenartenForRollen?.length }"
            data-testid="rollenarten-filter-select"
            density="compact"
            hide-details
            :items="allRollenarten"
            item-value="value"
            item-title="title"
            multiple
            :no-data-text="$t('noDataFound')"
            :placeholder="$t('admin.rolle.rollenart')"
            variant="outlined"
            @update:model-value="setRollenartenFilter"
          >
            <template #selection="{ internalItem: item, index }">
              <v-chip v-if="searchFilterStore.selectedRollenartenForRollen.length < 2">
                <span>{{ item.title }}</span>
              </v-chip>
              <span
                v-else-if="index === 0"
                class="selection-count"
              >
                {{
                  $t('admin.rolle.rollenartenSelected', {
                    count: searchFilterStore.selectedRollenartenForRollen.length,
                  })
                }}
              </span>
            </template>
          </v-autocomplete>
        </v-col>

        <v-col
          cols="12"
          md="2"
        >
          <v-autocomplete
            id="merkmale-filter-select"
            v-model="searchFilterStore.selectedMerkmaleForRollen"
            clearable
            class="filter-dropdown"
            :class="{ selected: searchFilterStore.selectedMerkmaleForRollen?.length }"
            data-testid="merkmale-filter-select"
            density="compact"
            hide-details
            :items="allMerkmale"
            item-value="value"
            item-title="title"
            multiple
            :no-data-text="$t('noDataFound')"
            :placeholder="$t('admin.rolle.merkmale')"
            variant="outlined"
            @update:model-value="setMerkmaleFilter"
          >
            <template #selection="{ internalItem: item, index }">
              <v-chip v-if="searchFilterStore.selectedMerkmaleForRollen.length < 2">
                <span>{{ item.title }}</span>
              </v-chip>
              <span
                v-else-if="index === 0"
                class="selection-count"
              >
                {{
                  $t('admin.rolle.merkmaleSelected', {
                    count: searchFilterStore.selectedMerkmaleForRollen.length,
                  })
                }}
              </span>
            </template>
          </v-autocomplete>
        </v-col>

        <v-col
          cols="12"
          md="3"
        >
          <SchulenFilter
            multiple
            includeAll
            highlightSelection
            parentId="rolle-management"
            :selectedSchulen="searchFilterStore.selectedOrganisationenForRollen"
            :placeholderText="$t('admin.administrationsebene.administrationsebene')"
            :systemrechteForSearch="[RollenSystemRecht.RollenVerwalten]"
            selectionCountKey="admin.rolle.administrationsebenenSelected"
            hideDetails
            @update:selectedSchulen="setOrganisationenFilter"
          />
        </v-col>

        <v-col
          v-if="authStore.hasAngeboteVerwaltenPermission"
          cols="12"
          md="3"
        >
          <v-autocomplete
            id="angebote-filter-select"
            ref="angeboteFilterSelect"
            v-model="searchFilterStore.selectedAngeboteForRollen"
            autocomplete="off"
            clearable
            class="filter-dropdown"
            :class="{ selected: searchFilterStore.selectedAngeboteForRollen?.length }"
            data-testid="angebote-filter-select"
            density="compact"
            hide-details
            :items="angeboteItems"
            item-value="value"
            item-title="title"
            multiple
            :custom-filter="() => true"
            :no-data-text="$t('noDataFound')"
            :placeholder="$t('admin.rolle.landesangebote')"
            variant="outlined"
            @update:model-value="setAngeboteFilter"
            @update:search="handleAngeboteSearch"
          >
            <template #prepend-item>
              <v-list-item>
                <v-progress-circular
                  v-if="serviceProviderStore.loading"
                  indeterminate
                />
                <span
                  v-else
                  class="filter-header"
                  >{{
                    $t(
                      'admin.rolle.landesangeboteFound',
                      {
                        count: serviceProviderStore.totalServiceProvidersForRollenVerwaltung,
                      },
                      serviceProviderStore.totalServiceProvidersForRollenVerwaltung,
                    )
                  }}</span
                >
              </v-list-item>
            </template>
            <template #selection="{ internalItem: item, index }">
              <v-chip v-if="searchFilterStore.selectedAngeboteForRollen.length < 2">
                <span>{{ searchFilterStore.selectedAngeboteNamesForRollen[item.value] ?? item.title }}</span>
              </v-chip>
              <span
                v-else-if="index === 0"
                class="selection-count"
              >
                {{
                  $t('admin.rolle.landesangeboteSelected', {
                    count: searchFilterStore.selectedAngeboteForRollen.length,
                  })
                }}
              </span>
            </template>
          </v-autocomplete>
        </v-col>
      </v-row>
      <v-row class="ma-3 mt-0">
        <v-spacer />
        <SearchField
          ref="searchFieldComponent"
          :initial-value="searchFilter"
          :input-cols="6"
          :input-cols-md="3"
          :button-cols="6"
          :button-cols-md="2"
          :hover-text="$t('admin.rolle.rollenname')"
          @on-apply-search-filter="handleSearchFilter"
        />
      </v-row>
      <ResultTable
        :current-page="searchFilterStore.rollenPage"
        data-testid="rolle-table"
        :items="transformedRollenAndMerkmale || []"
        :items-per-page="searchFilterStore.rollenPerPage"
        :loading="rolleStore.loading"
        :headers="headers"
        :total-items="rolleStore.totalRollen"
        item-value-path="id"
        @on-handle-row-click="
          (event: PointerEvent, item: TableRow<unknown>) =>
            navigateToRolleDetails(event, item as TableRow<RolleTableItem>)
        "
        @on-items-per-page-update="getPaginatedRollenWithLimit"
        @on-page-update="getPaginatedRollen"
      >
        <template #[`item.serviceProviders`]="{ item }">
          <div class="ellipsis-wrapper">
            <span
              v-if="!item.serviceProviders.length"
              title="---"
              >---</span
            >
            <span :title="item.serviceProviders.map((provider: any) => provider.name).join(', ')">
              <span
                v-for="(serviceProvider, index) in item.serviceProviders"
                :key="serviceProvider.id"
              >
                {{ serviceProvider.name }}{{ Number(index) < item.serviceProviders.length - 1 ? ', ' : '' }}
              </span>
            </span>
          </div>
        </template>
      </ResultTable>
    </LayoutCard>
  </div>
</template>

<style scoped>
  .selection-count {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
