<script setup lang="ts">
  import { RollenSystemRechtEnum } from '@/api-client/generated/api';
  import ResultTable, { type Headers } from '@/components/admin/ResultTable.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import SchulenFilter from '@/components/filter/SchulenFilter.vue';
  import type { SelectedSchulen } from '@/types';
  import { useAutoselectedSchule } from '@/composables/useAutoselectedSchule';
  import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
  import { useOrganisationStore, type Organisation, type OrganisationStore } from '@/stores/OrganisationStore';
  import {
    RollenForMptZuordnungFilter,
    useRolleStore,
    type RolleStore,
    type RolleWithServiceProvidersResponse,
  } from '@/stores/RolleStore';
  import { useSearchFilterStore, type SearchFilterStore } from '@/stores/SearchFilterStore';
  import { computed, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue';
  import { onBeforeRouteLeave, useRouter, type Router } from 'vue-router';
  import { useI18n, type Composer } from 'vue-i18n';

  type MptRolleTableItem = {
    id: string;
    name: string;
    rollenart: string;
  };

  const { t }: Composer = useI18n({ useScope: 'global' });
  const authStore: AuthStore = useAuthStore();
  const rolleStore: RolleStore = useRolleStore();
  const searchFilterStore: SearchFilterStore = useSearchFilterStore();
  const organisationStore: OrganisationStore = useOrganisationStore();
  const router: Router = useRouter();

  const {
    hasAutoselectedSchule,
    autoselectedSchule,
  }: {
    hasAutoselectedSchule: ComputedRef<boolean>;
    autoselectedSchule: ComputedRef<Organisation | null>;
  } = useAutoselectedSchule([RollenSystemRechtEnum.MptRollenZuordnen]);

  const selectedOrganisation: Ref<Organisation | null> = ref(searchFilterStore.selectedSchuleForMptRollen);
  const selectedOrganisationId: ComputedRef<string | undefined> = computed(() => selectedOrganisation.value?.id);

  const mptRollenFilter: ComputedRef<RollenForMptZuordnungFilter | null> = computed(
    (): RollenForMptZuordnungFilter | null => {
      if (!selectedOrganisationId.value) {
        return null;
      }

      return {
        offset: (searchFilterStore.mptRollenPage - 1) * searchFilterStore.mptRollenPerPage,
        limit: searchFilterStore.mptRollenPerPage,
        searchString: '',
        organisationIds: [selectedOrganisationId.value],
      };
    },
  );

  const headers: Headers = [
    { title: t('admin.rolle.rollenname'), key: 'name', align: 'start' },
    { title: t('admin.rolle.rollenart'), key: 'rollenart', align: 'start' },
  ];

  const items: ComputedRef<MptRolleTableItem[]> = computed((): MptRolleTableItem[] => {
    return rolleStore.allRollen.map((rolle: RolleWithServiceProvidersResponse): MptRolleTableItem => {
      return {
        id: rolle.id,
        name: rolle.name,
        rollenart: t(`admin.rolle.mappingFrontBackEnd.rollenarten.${rolle.rollenart}`),
      };
    });
  });

  function resetFilters(): void {
    selectedOrganisation.value = null;
    rolleStore.allRollen = [];
    rolleStore.totalRollen = 0;
    organisationStore.currentOrganisation = null;
    searchFilterStore.setSchuleForMptRollen(null);
    searchFilterStore.mptRollenPage = 1;
    searchFilterStore.mptRollenPerPage = 30;
  }

  function setSelectedOrganisation(organisation: SelectedSchulen<false>): void {
    if (!organisation) {
      resetFilters();
      return;
    }

    selectedOrganisation.value = organisation;
    searchFilterStore.setSchuleForMptRollen(organisation);
  }

  function setPage(page: number): void {
    searchFilterStore.mptRollenPage = page;
  }

  function setItemsPerPage(itemsPerPage: number): void {
    if (rolleStore.totalRollen <= itemsPerPage) {
      searchFilterStore.mptRollenPage = 1;
    }

    searchFilterStore.mptRollenPerPage = itemsPerPage;
  }

  function navigateToRolleDetails(_event: PointerEvent, row: { item: MptRolleTableItem }): void {
    if (!authStore.hasRollenerweiternPermission) {
      return;
    }
    void router.push({
      name: 'mpt-rolle-details',
      params: { id: row.item.id },
      query: { orga: selectedOrganisationId.value },
    });
  }

  watch(
    mptRollenFilter,
    async (filter: RollenForMptZuordnungFilter | null): Promise<void> => {
      if (filter) {
        await rolleStore.getRollenForMptZuordnung(filter);
      }
    },
    { immediate: true },
  );

  onBeforeRouteLeave((): void => {
    rolleStore.errorCode = '';
    organisationStore.errorCode = '';
  });

  onMounted((): void => {
    if (searchFilterStore.selectedSchuleForMptRollen) {
      return;
    }

    if (hasAutoselectedSchule.value && autoselectedSchule.value) {
      setSelectedOrganisation(autoselectedSchule.value);
      return;
    }

    rolleStore.allRollen = [];
    rolleStore.totalRollen = 0;
    organisationStore.currentOrganisation = null;
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
    :header="`${t('admin.rolle.mptManagement.title')} ${selectedOrganisation?.name ?? ''}`"
    :header-hover-text="selectedOrganisation?.name"
  >
    <v-row
      align="start"
      class="ma-3"
    >
      <v-col
        align-self="center"
        cols="12"
        md="2"
        class="py-md-0 text-md-right"
      >
        <v-btn
          class="px-0 reset-filter"
          data-testid="reset-filter-button"
          :disabled="!selectedOrganisationId || hasAutoselectedSchule"
          size="x-small"
          variant="text"
          width="auto"
          @click="resetFilters"
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
          parentId="mpt-rolle-management"
          :systemrechteForSearch="[RollenSystemRechtEnum.MptRollenZuordnen]"
          :selectedSchulen="selectedOrganisation ?? undefined"
          @update:selected-schulen="setSelectedOrganisation"
          :placeholderText="$t('admin.schule.schule')"
          hideDetails
        />
      </v-col>
    </v-row>

    <ResultTable
      data-testid="mpt-rolle-table"
      :headers="headers"
      :hide-select="true"
      :disable-row-click="!authStore.hasRollenerweiternPermission"
      :items="items"
      :items-per-page="searchFilterStore.mptRollenPerPage"
      :current-page="searchFilterStore.mptRollenPage"
      :item-value-path="'id'"
      :loading="rolleStore.loading"
      :total-items="rolleStore.totalRollen"
      :no-data-text="
        selectedOrganisationId ? $t('admin.rolle.noRollenFound') : $t('admin.rolle.mptManagement.noSchuleSelected')
      "
      @on-handle-row-click="navigateToRolleDetails"
      @on-items-per-page-update="setItemsPerPage"
      @on-page-update="setPage"
    />
  </LayoutCard>
</template>
