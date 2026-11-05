<script setup lang="ts">
  import { computed, onMounted, ref, watch, watchEffect, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';

  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import VidisInfoDialog from '@/components/admin/service-provider/VidisInfoDialog.vue';
  import VidisSyncDialog from '@/components/admin/service-provider/VidisSyncDialog.vue';
  import type { RollenerweiterungForManageableServiceProviderResponse } from '@/api-client/generated';
  import ResultTable, { type Headers, type TableRow } from '@/components/admin/ResultTable.vue';
  import ServiceProviderDelete from '@/components/admin/service-provider/ServiceProviderDelete.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import SchulenFilter from '@/components/filter/SchulenFilter.vue';
  import { useAutoselectedSchule } from '@/composables/useAutoselectedSchule';
  import { useOrganisationStore, type OrganisationStore } from '@/stores/OrganisationStore';
  import { RollenSystemRecht } from '@/stores/RolleStore';
  import { useSearchFilterStore, type SearchFilterStore } from '@/stores/SearchFilterStore';
  import {
    useServiceProviderStore,
    type ManageableServiceProviderListEntry,
    type ServiceProviderStore,
  } from '@/stores/ServiceProviderStore';
  import { getDisplayNameForOrg } from '@/utils/formatting';
  import { SortOrder } from '@/utils/sorting';
  import {
    onBeforeRouteLeave,
    useRoute,
    useRouter,
    type LocationQueryValue,
    type RouteLocationNormalizedLoaded,
    type Router,
  } from 'vue-router';
  import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';

  type ServiceProviderRow = {
    id: string;
    kategorie: string;
    name: string;
    administrationsebene: string;
    rollenerweiterungen: string;
    isDeleteAuthorized: boolean;
    isVidisAngebot: boolean;
  };

  const selectedOrganisationId: Ref<string> = ref('');

  const { t }: Composer = useI18n();
  const router: Router = useRouter();
  const route: RouteLocationNormalizedLoaded = useRoute();

  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
  const searchFilterStore: SearchFilterStore = useSearchFilterStore();
  const organisationStore: OrganisationStore = useOrganisationStore();
  const authStore: AuthStore = useAuthStore();

  const {
    hasAutoselectedSchule,
  }: {
    hasAutoselectedSchule: ComputedRef<boolean>;
  } = useAutoselectedSchule([RollenSystemRecht.RollenErweitern]);

  const cachedServiceProviderId: Ref<string | null> = ref(null);
  const serviceProviderToDelete: Ref<ServiceProviderRow | null> = ref(null);
  const isDeleteDialogOpen: Ref<boolean> = ref(false);
  const isVidisInfoDialogOpen: Ref<boolean, boolean> = ref(false);
  const isVidisSyncDialogOpen: Ref<boolean> = ref(false);
  const isVidisSyncing: Ref<boolean> = ref(false);

  const headers: Headers = [
    { title: t('angebot.kategorie'), key: 'kategorie', align: 'start' },
    { title: t('angebot.name'), key: 'name', align: 'start', sortable: false },
    { title: t('angebot.providedBy'), key: 'administrationsebene', align: 'start', sortable: false },
    { title: t('angebot.erweiterteRollenAnDerSchule'), key: 'rollenerweiterungen', align: 'start', sortable: false },
    {
      title: t('action'),
      key: 'actions',
      align: 'center',
      sortable: false,
      width: '250px',
    },
  ];

  const items: ComputedRef<ServiceProviderRow[]> = computed(() => {
    return serviceProviderStore.manageableServiceProvidersForOrganisation.map(
      (sp: ManageableServiceProviderListEntry) => {
        return {
          id: sp.id,
          kategorie: t(`angebot.mappingFrontBackEnd.kategorien.${sp.kategorie}`),
          name: sp.name,
          administrationsebene: getDisplayNameForOrg(sp.administrationsebene),
          rollenerweiterungen:
            sp.rollenerweiterungen && sp.rollenerweiterungen.length > 0
              ? sp.rollenerweiterungen
                  .map((re: RollenerweiterungForManageableServiceProviderResponse) => re.rolle.name)
                  .join(', ')
              : '---',
          isDeleteAuthorized: sp.hasSomeVerwaltenPermission,
          isVidisAngebot: Boolean(sp.vidisAngebotId),
        };
      },
    );
  });

  const errorTitle: ComputedRef<string> = computed(() => {
    if (!serviceProviderStore.errorCode) {
      return '';
    }
    return t(`admin.angebot.title.${serviceProviderStore.errorCode}`);
  });

  const isVidisApiError: ComputedRef<boolean> = computed(() => serviceProviderStore.errorCode === 'VIDIS_API_ERROR');

  const errorText: ComputedRef<string> = computed(() => {
    if (!serviceProviderStore.errorCode) {
      return '';
    }
    const serviceProviderName: string =
      serviceProviderStore.manageableServiceProvidersForOrganisation.find(
        (sp: ManageableServiceProviderListEntry) => sp.id === cachedServiceProviderId.value,
      )?.name ?? '';
    return t(`admin.angebot.errors.${serviceProviderStore.errorCode}`, {
      serviceProviderName,
    });
  });

  function resetSearchAndFilter(): void {
    selectedOrganisationId.value = '';
    serviceProviderStore.manageableServiceProvidersForOrganisation = [];
    serviceProviderStore.totalManageableServiceProvidersForOrganisation = 0;
    organisationStore.currentOrganisation = null;
    searchFilterStore.setSchuleForSchulischeServiceProvider(null);
    searchFilterStore.serviceProviderSchulePage = 1;
    searchFilterStore.serviceProviderSchulePerPage = 30;
  }

  function setOrganisationFilter(newValue: string | undefined): void {
    if (!newValue) {
      resetSearchAndFilter();
      return;
    }
    selectedOrganisationId.value = newValue;
    searchFilterStore.setSchuleForSchulischeServiceProvider(newValue);
  }

  async function reloadData(): Promise<void> {
    if (selectedOrganisationId.value) {
      await serviceProviderStore.getManageableServiceProvidersForOrganisation(
        selectedOrganisationId.value,
        searchFilterStore.serviceProviderSchulePage,
        searchFilterStore.serviceProviderSchulePerPage,
      );
    }
  }

  watchEffect(async () => {
    if (selectedOrganisationId.value) {
      await Promise.all([reloadData(), organisationStore.getOrganisationById(selectedOrganisationId.value)]);
    }
  });

  watch(
    () => route.query['orga'],
    (orgaId: LocationQueryValue | LocationQueryValue[] | undefined) => {
      if (!orgaId) {
        // clears stale context
        organisationStore.currentOrganisation = null;
      }
    },
    { immediate: true },
  );

  function navigateToServiceProviderDetails(_$event: PointerEvent, { item }: { item: ServiceProviderRow }): void {
    router.push({
      name: 'angebot-details-schulspezifisch',
      params: { id: item.id },
      query: { orga: organisationStore.currentOrganisation?.id },
    });
  }

  const handleAlertCloseServiceProvider = async (): Promise<void> => {
    isDeleteDialogOpen.value = false;
    serviceProviderToDelete.value = null;
    serviceProviderStore.errorCode = '';
    await reloadData();
  };

  async function onDeleteServiceProvider(id: string): Promise<void> {
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

    serviceProviderStore.manageableServiceProvidersForOrganisation =
      serviceProviderStore.manageableServiceProvidersForOrganisation.filter(
        (sp: ManageableServiceProviderListEntry) => sp.id !== cachedServiceProviderId.value,
      );

    await reloadData();

    serviceProviderToDelete.value = null;
  }
  async function onSyncVidis(): Promise<void> {
    serviceProviderStore.errorCode = '';
    isVidisSyncing.value = true;
    await serviceProviderStore.syncServiceProvidersForSchule(selectedOrganisationId.value);
    if (!serviceProviderStore.errorCode) {
      await reloadData();
    }
    isVidisSyncing.value = false;
  }

  function onCloseSyncDialog(): void {
    isVidisSyncDialogOpen.value = false;
    serviceProviderStore.errorCode = '';
  }

  onBeforeRouteLeave(() => {
    serviceProviderStore.errorCode = '';
    organisationStore.errorCode = '';
  });

  onMounted(() => {
    if (searchFilterStore.selectedSchuleForSchulischeServiceProvider) {
      selectedOrganisationId.value = searchFilterStore.selectedSchuleForSchulischeServiceProvider;
    }
  });
</script>

<template>
  <h1
    class="text-center headline"
    data-testid="admin-headline"
  >
    {{ $t('admin.headline') }}
  </h1>
  <LayoutCard
    :header="`${t('admin.angebot.management.title')} ${organisationStore.currentOrganisation?.name ?? ''}`"
    :header-hover-text="organisationStore.currentOrganisation?.name"
  >
    <SpshAlert
      :button-action="handleAlertCloseServiceProvider"
      :button-text="t('nav.backToList')"
      :closable="false"
      data-test-id-prefix="service-provider-management-by-schule-error"
      :model-value="!!serviceProviderStore.errorCode && !isVidisApiError"
      :show-button="true"
      :text="errorText"
      :title="errorTitle"
      :type="'error'"
    />
    <template v-if="!serviceProviderStore.errorCode || isVidisApiError">
      <v-row class="ma-3 align-start">
        <v-col
          cols="12"
          md="2"
          class="py-md-0 text-md-right align-self-center"
        >
          <v-btn
            class="px-0 reset-filter"
            data-testid="reset-filter-button"
            :disabled="!selectedOrganisationId || hasAutoselectedSchule"
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
          <SchulenFilter
            :multiple="false"
            includeAll
            highlightSelection
            parentId="service-provider-management-by-schule"
            ref="schulenFilter"
            :systemrechteForSearch="[RollenSystemRecht.RollenErweitern]"
            :selectedSchulen="selectedOrganisationId ? [selectedOrganisationId] : []"
            @update:selected-schulen="setOrganisationFilter"
            :placeholderText="$t('admin.schule.schule')"
            hideDetails
          >
            <template #prepend-item>
              <v-list-item>
                <v-progress-circular
                  v-if="organisationStore.loading"
                  indeterminate
                />
                <span
                  v-else
                  class="filter-header"
                >
                  {{
                    $t(
                      'admin.schule.schulenFound',
                      {
                        count: organisationStore.organisationenFilters.get('service-provider-management-by-schule')
                          ?.total,
                      },
                      organisationStore.organisationenFilters.get('service-provider-management-by-schule')?.total ?? 0,
                    )
                  }}
                </span>
              </v-list-item>
            </template>
          </SchulenFilter>
        </v-col>
        <v-col
          v-if="authStore.hasVidisPermission"
          cols="12"
          md="auto"
          class="py-md-0 ml-auto align-self-center"
        >
          <SpshTooltip
            :disabled-text="$t('angebot.chooseSchuleFirst')"
            :enabled-condition="!!selectedOrganisationId"
          >
            <v-btn
              class="primary"
              data-testid="open-vidis-sync-dialog-button"
              :disabled="!selectedOrganisationId"
              @click="isVidisSyncDialogOpen = true"
            >
              {{ $t('admin.angebot.vidisSync.buttonLabel') }}
            </v-btn>
          </SpshTooltip>
        </v-col>
      </v-row>
      <ResultTable
        v-if="!serviceProviderStore.errorCode"
        :headers
        :hide-select="true"
        :current-sort="{
          key: 'kategorie',
          order: SortOrder.Asc,
        }"
        :items
        :itemsPerPage="searchFilterStore.serviceProviderSchulePerPage"
        :currentPage="searchFilterStore.serviceProviderSchulePage"
        :itemValuePath="'id'"
        :loading="serviceProviderStore.loading"
        :totalItems="serviceProviderStore.totalManageableServiceProvidersForOrganisation"
        :no-data-text="
          selectedOrganisationId && serviceProviderStore.manageableServiceProvidersForOrganisation.length === 0
            ? $t('angebot.noServiceProvidersAvailable')
            : $t('angebot.chooseSchuleFirst')
        "
        @onItemsPerPageUpdate="(val: number) => (searchFilterStore.serviceProviderSchulePerPage = val)"
        @onPageUpdate="(val: number) => (searchFilterStore.serviceProviderSchulePage = val)"
        @onHandleRowClick="
          (event: PointerEvent, item: TableRow<unknown>) =>
            navigateToServiceProviderDetails(event, item as TableRow<ServiceProviderRow>)
        "
      >
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
        <template v-slot:[`item.rollenerweiterungen`]="{ item }">
          <div
            class="ellipsis-wrapper"
            :title="item.rollenerweiterungen"
          >
            {{ item.rollenerweiterungen }}
          </div>
        </template>
      </ResultTable>
      <ServiceProviderDelete
        v-if="serviceProviderToDelete && serviceProviderStore.errorCode === ''"
        v-model="isDeleteDialogOpen"
        :error-code="serviceProviderStore.errorCode"
        :is-loading="serviceProviderStore.loading"
        :service-provider-id="serviceProviderToDelete.id"
        :service-provider-name="serviceProviderToDelete.name"
        @on-delete-service-provider="onDeleteServiceProvider"
        @on-close="onCloseDeleteDialogWrapper"
      />
      <VidisInfoDialog
        :header="t('admin.angebot.delete.title')"
        :text="t('angebot.vidisDeleteInfoText', { name: serviceProviderToDelete?.name ?? '' })"
        v-model="isVidisInfoDialogOpen"
        @after-leave="serviceProviderToDelete = null"
      />
      <VidisSyncDialog
        v-model="isVidisSyncDialogOpen"
        :error-code="serviceProviderStore.errorCode"
        :is-loading="isVidisSyncing"
        :schule-name="organisationStore.currentOrganisation?.name ?? ''"
        @on-sync-vidis="onSyncVidis"
        @on-close="onCloseSyncDialog"
      />
    </template>
  </LayoutCard>
</template>
