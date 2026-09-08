<script setup lang="ts">
  import ResultTable, { type Headers, type TableRow } from '@/components/admin/ResultTable.vue';
  import SearchField from '@/components/admin/SearchField.vue';
  import ServiceProviderDelete from '@/components/admin/service-provider/ServiceProviderDelete.vue';
  import VidisInfoDialog from '@/components/admin/service-provider/VidisInfoDialog.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import {
    DEFAULT_SERVICE_PROVIDER_KATEGORIEN,
    useSearchFilterStore,
    type SearchFilterStore,
  } from '@/stores/SearchFilterStore';
  import {
    ServiceProviderKategorie,
    useServiceProviderStore,
    type ManageableServiceProviderSimpleListEntry,
    type ServiceProviderStore,
  } from '@/stores/ServiceProviderStore';
  import { getDisplayNameForOrg } from '@/utils/formatting';
  import { computed, ref, watch, watchEffect, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useRouter, type Router } from 'vue-router';

  type ServiceProviderRow = {
    id: string;
    kategorie: string;
    name: string;
    administrationsebene: string;
    rollen: string;
    hasRollenerweiterung: string;
    isDeleteAuthorized: boolean;
    isVidisAngebot: boolean;
  };

  type ServiceProviderItem = {
    value: ServiceProviderKategorie;
    title: string;
  };

  const router: Router = useRouter();
  const { t }: Composer = useI18n();

  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
  const searchFilterStore: SearchFilterStore = useSearchFilterStore();

  const searchFieldComponent: Ref<{ searchFilter?: string } | null> = ref(null);
  const searchFilter: Ref<string> = ref(searchFilterStore.searchStringForServiceProvider ?? '');

  const allKategorien: readonly ServiceProviderKategorie[] = Object.values(ServiceProviderKategorie);

  function isDefaultKategorienSelection(selection: readonly ServiceProviderKategorie[]): boolean {
    return (
      selection.length === DEFAULT_SERVICE_PROVIDER_KATEGORIEN.length &&
      DEFAULT_SERVICE_PROVIDER_KATEGORIEN.every((kategorie: ServiceProviderKategorie) => selection.includes(kategorie))
    );
  }

  const cachedServiceProviderId: Ref<string | null> = ref(null);
  const selectedKategorien: Ref<ServiceProviderKategorie[]> = ref(
    searchFilterStore.selectedKategorienForServiceProvider,
  );
  const kategorien: readonly ServiceProviderItem[] = allKategorien.map((item: ServiceProviderKategorie) => ({
    value: item,
    title: t(`angebot.mappingFrontBackEnd.kategorien.${item}`),
  }));

  const serviceProviderToDelete: Ref<ServiceProviderRow | null> = ref(null);
  const isDeleteDialogOpen: Ref<boolean, boolean> = ref(false);
  const isVidisInfoDialogOpen: Ref<boolean, boolean> = ref(false);

  const errorTitle: ComputedRef<string> = computed(() => {
    if (!serviceProviderStore.errorCode) {
      return '';
    }
    return t(`admin.angebot.title.${serviceProviderStore.errorCode}`);
  });

  const errorText: ComputedRef<string> = computed(() => {
    if (!serviceProviderStore.errorCode) {
      return '';
    }
    const serviceProviderName: string =
      serviceProviderStore.manageableServiceProviders.find(
        (sp: ManageableServiceProviderSimpleListEntry) => sp.id === cachedServiceProviderId.value,
      )?.name ?? '';
    return t(`admin.angebot.errors.${serviceProviderStore.errorCode}`, {
      serviceProviderName,
    });
  });

  const filterOrSearchActive: ComputedRef<boolean> = computed(
    () =>
      !isDefaultKategorienSelection(selectedKategorien.value) ||
      (!!searchFilter.value && searchFilter.value.length > 0),
  );

  const headers: Headers = [
    { title: t('angebot.kategorie'), key: 'kategorie', align: 'start' },
    { title: t('angebot.name'), key: 'name', align: 'start' },
    { title: t('angebot.administrationsebene'), key: 'administrationsebene', align: 'start' },
    { title: t('angebot.rollen'), key: 'rollen', align: 'start' },
    { title: t('angebot.schulspezifischErweitert'), key: 'hasRollenerweiterung', align: 'start' },
    {
      title: t('action'),
      key: 'actions',
      align: 'center',
      sortable: false,
      width: '250px',
    },
  ];

  async function reloadData(): Promise<void> {
    await serviceProviderStore.getManageableServiceProviders({
      kategorien: selectedKategorien.value,
      page: searchFilterStore.serviceProviderPage,
      entriesPerPage: searchFilterStore.serviceProviderPerPage,
      searchFilter: searchFilterStore.searchStringForServiceProvider || '',
    });
  }

  const handleAlertClose = async (): Promise<void> => {
    isDeleteDialogOpen.value = false;
    serviceProviderToDelete.value = null;
    serviceProviderStore.errorCode = '';
    await reloadData();
  };

  async function onDelete(id: string): Promise<void> {
    await serviceProviderStore.deleteServiceProvider(id);
    cachedServiceProviderId.value = id;
  }

  async function onCloseDeleteDialogWrapper(successful: boolean): Promise<void> {
    isDeleteDialogOpen.value = false;

    if (!successful) {
      serviceProviderStore.errorCode = '';
      serviceProviderToDelete.value = null;
      return;
    }

    serviceProviderStore.manageableServiceProviders = serviceProviderStore.manageableServiceProviders.filter(
      (sp: ManageableServiceProviderSimpleListEntry) => sp.id !== cachedServiceProviderId.value,
    );

    await reloadData();

    serviceProviderToDelete.value = null;
  }

  const items: ComputedRef<ServiceProviderRow[]> = computed(() => {
    return serviceProviderStore.manageableServiceProviders.map((sp: ManageableServiceProviderSimpleListEntry) => {
      return {
        id: sp.id,
        kategorie: t(`angebot.mappingFrontBackEnd.kategorien.${sp.kategorie}`),
        name: sp.name,
        administrationsebene: getDisplayNameForOrg(sp.administrationsebene),
        rollen:
          sp.rollen.length > 0
            ? sp.rollen
                .map((rolle: ManageableServiceProviderSimpleListEntry['rollen'][number]) => rolle.name)
                .join(', ')
            : '---',
        hasRollenerweiterung: sp.hasRollenerweiterungen ? t('yes') : t('no'),
        isDeleteAuthorized: sp.hasSomeVerwaltenPermission,
        isVidisAngebot: Boolean(sp.vidisAngebotId),
      };
    });
  });

  function navigateToServiceProviderDetails(_$event: PointerEvent, { item }: { item: ServiceProviderRow }): void {
    router.push({ name: 'angebot-details', params: { id: item.id } });
  }

  function resetSearchAndFilter(): void {
    searchFilter.value = '';
    if (searchFieldComponent.value) {
      searchFieldComponent.value.searchFilter = '';
    }
    searchFilterStore.setSearchFilterForServiceProvider('');

    searchFilterStore.resetKategorienForServiceProvider();
    selectedKategorien.value = searchFilterStore.selectedKategorienForServiceProvider;
  }

  function handleSearchFilter(filter: string): void {
    searchFilterStore.serviceProviderPage = 1;
    searchFilterStore.setSearchFilterForServiceProvider(filter);
    searchFilter.value = filter;
  }

  watch(selectedKategorien, (newKategorien: Array<ServiceProviderKategorie>) => {
    searchFilterStore.setKategorienForServiceProvider(newKategorien);
  });

  watchEffect(async () => {
    await reloadData();
  });
</script>

<template>
  <h1
    class="text-center headline"
    data-testid="admin-headline"
  >
    {{ $t('admin.headline') }}
  </h1>
  <LayoutCard :header="t('admin.angebot.management.title')">
    <SpshAlert
      :button-action="handleAlertClose"
      :button-text="t('nav.backToList')"
      :closable="false"
      data-test-id-prefix="service-provider-management-error"
      :model-value="!!serviceProviderStore.errorCode"
      :show-button="true"
      :text="errorText"
      :title="errorTitle"
      :type="'error'"
    />
    <v-row class="ma-3 align-start">
      <v-col
        cols="12"
        md="2"
        class="py-md-0 text-md-right align-self-center"
      >
        <v-btn
          class="reset-filter"
          data-testid="reset-filter-button"
          :disabled="!filterOrSearchActive"
          size="x-small"
          variant="text"
          width="auto"
          @click="resetSearchAndFilter()"
        >
          {{ $t('resetFilter') }}
        </v-btn>
      </v-col>
      <v-col
        cols="12"
        md="3"
        class="py-md-0"
      >
        <v-autocomplete
          id="kategorien-select"
          v-model="selectedKategorien"
          multiple
          class="filter-dropdown"
          :class="{ selected: selectedKategorien.length > 0 }"
          clearable
          data-testid="kategorien-select"
          density="compact"
          hide-details
          :items="kategorien"
          item-value="value"
          item-text="title"
          :no-data-text="$t('noDataFound')"
          :placeholder="$t('angebot.kategorie')"
          variant="outlined"
        >
          <template #selection="{ internalItem: item, index }">
            <v-chip v-if="selectedKategorien.length < 2">
              <span>{{ item.title }}</span>
            </v-chip>
            <span
              v-else-if="index === 0"
              class="selection-count"
            >
              {{
                $t('admin.rolle.kategorienSelected', {
                  count: selectedKategorien.length,
                })
              }}
            </span>
          </template>
        </v-autocomplete>
      </v-col>
      <v-spacer />
      <SearchField
        ref="searchFieldComponent"
        :initial-value="searchFilter"
        :input-cols="6"
        :input-cols-md="3"
        :button-cols="6"
        :button-cols-md="2"
        :hover-text="$t('admin.angebot.management.name')"
        @on-apply-search-filter="handleSearchFilter"
      />
    </v-row>
    <ResultTable
      v-if="!serviceProviderStore.errorCode"
      :headers
      :items
      :itemsPerPage="searchFilterStore.serviceProviderPerPage"
      :currentPage="searchFilterStore.serviceProviderPage"
      :itemValuePath="'id'"
      :loading="serviceProviderStore.loading"
      :totalItems="serviceProviderStore.totalManageableServiceProviders"
      @onItemsPerPageUpdate="(val: number) => (searchFilterStore.serviceProviderPerPage = val)"
      @onPageUpdate="(val: number) => (searchFilterStore.serviceProviderPage = val)"
      @onHandleRowClick="
        (event: PointerEvent, item: TableRow<unknown>) =>
          navigateToServiceProviderDetails(event, item as TableRow<ServiceProviderRow>)
      "
    >
      <template v-slot:[`item.rollen`]="{ item }">
        <div
          class="ellipsis-wrapper"
          :title="item.rollen"
        >
          {{ item.rollen }}
        </div>
      </template>
      <template #[`item.actions`]="{ item }: { item: ServiceProviderRow }">
        <v-icon
          v-if="item.isDeleteAuthorized"
          icon="mdi-delete"
          size="small"
          data-testid="open-service-provider-delete-dialog-icon"
          @click.stop="
            () => {
              serviceProviderToDelete = item;
              if (item.isVidisAngebot) {
                isVidisInfoDialogOpen = true;
                return;
              }
              isDeleteDialogOpen = true;
            }
          "
        />
      </template>
    </ResultTable>
    <ServiceProviderDelete
      v-if="serviceProviderToDelete && serviceProviderStore.errorCode === ''"
      v-model="isDeleteDialogOpen"
      :error-code="serviceProviderStore.errorCode"
      :is-loading="serviceProviderStore.loading"
      :service-provider-id="serviceProviderToDelete.id"
      :service-provider-name="serviceProviderToDelete.name"
      @on-delete-service-provider="onDelete"
      @on-close="onCloseDeleteDialogWrapper"
    />
    <VidisInfoDialog
      :header="t('admin.angebot.delete.title')"
      :text="t('angebot.vidisDeleteInfoText', { name: serviceProviderToDelete?.name ?? '' })"
      v-model="isVidisInfoDialogOpen"
      @after-leave="serviceProviderToDelete = null"
    />
  </LayoutCard>
</template>

<style scoped>
  .selection-count {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
