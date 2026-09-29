<script setup lang="ts">
  import SchulPortalLogo from '@/assets/logos/Schulportal_SH_Bildmarke_RGB_Anwendung_HG_Blau.svg';
  import LabeledField from '@/components/admin/LabeledField.vue';
  import ResultTable, { type Headers } from '@/components/admin/ResultTable.vue';
  import VidisInfoDialog from '@/components/admin/service-provider/VidisInfoDialog.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import SchulenFilter from '@/components/filter/SchulenFilter.vue';
  import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
  import { useConfigStore, type ConfigStore } from '@/stores/ConfigStore';
  import { useOrganisationStore, type OrganisationStore } from '@/stores/OrganisationStore';
  import {
    RollenSystemRecht,
    useRolleStore,
    type RolleResponse,
    type RolleStore,
    type RolleWithServiceProvidersResponse,
  } from '@/stores/RolleStore';
  import {
    ServiceProviderMerkmal,
    useServiceProviderStore,
    type ManageableServiceProviderDetail,
    type ServiceProviderStore,
  } from '@/stores/ServiceProviderStore';
  import type { TranslatedObject } from '@/types';
  import { getLogoPath } from '@/utils/logosConfig';
  import {
    formatServiceProviderAnbietenMerkmale,
    formatServiceProviderRollenartenWhitelist,
  } from '@/utils/serviceProvider.helper';
  import { computed, onMounted, ref, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useRoute, useRouter, type RouteLocationNormalizedLoaded, type Router } from 'vue-router';

  const router: Router = useRouter();
  const route: RouteLocationNormalizedLoaded = useRoute();
  const { t }: Composer = useI18n({ useScope: 'global' });

  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
  const authStore: AuthStore = useAuthStore();
  const configStore: ConfigStore = useConfigStore();
  const organisationStore: OrganisationStore = useOrganisationStore();
  const rolleStore: RolleStore = useRolleStore();

  let timerId: ReturnType<typeof setTimeout>;

  const isEditModeAvailable: ComputedRef<boolean> = computed(() => {
    return configStore.configData?.schulischeAngeboteErstellen ?? false;
  });

  const currentServiceProviderId: string = route.params['id'] as string;
  const selectedOrganisationIds: Ref<string[]> = ref([]);
  const selectedRolleIds: Ref<string[]> = ref([]);
  const searchInputRollen: Ref<string> = ref('');

  type ReadonlyHeaders = Headers;
  const headers: ReadonlyHeaders = [
    { title: t('admin.schule.dienststellennummer'), key: 'kennung', align: 'start', sortable: false },
    { title: t('admin.schule.schulname'), key: 'schule', align: 'start', sortable: false },
    { title: t('angebot.erweiterteRollen'), key: 'rollenerweiterungen', align: 'start', sortable: false },
  ];

  const rollenerweiterungPage: Ref<number> = ref(1);
  const rollenerweiterungPerPage: Ref<number> = ref(30);

  const isOpen: Ref<boolean> = ref(false);
  const vidisInfoDialogOpen: Ref<boolean> = ref(false);

  const resolvedLogo: ComputedRef<string | undefined> = computed(() => {
    const provider: ManageableServiceProviderDetail | null = serviceProviderStore.currentServiceProvider;

    if (provider?.logoId != null) {
      return getLogoPath(provider.logoId);
    }

    return serviceProviderStore.serviceProviderLogos.get(currentServiceProviderId);
  });

  const isVidisAngebot: ComputedRef<boolean> = computed(() => {
    return Boolean(serviceProviderStore.currentServiceProvider?.vidisAngebotId);
  });

  function navigateToServiceProviderTable(): void {
    router.push({ name: 'angebot-management' });
  }

  const handleAlertClose = (): void => {
    serviceProviderStore.errorCode = '';
    navigateToServiceProviderTable();
  };

  async function openServiceProviderEditMode(): Promise<void> {
    if (isVidisAngebot.value) {
      vidisInfoDialogOpen.value = true;
      return;
    }
    await router.push({ name: 'angebot-edit', params: { id: currentServiceProviderId } });
  }

  // Default for now - in the future when Edit functionality is added, this will have more error codes as cases to handle accordingly
  const alertButtonText: ComputedRef<string> = computed(() => {
    switch (serviceProviderStore.errorCode) {
      default:
        return t('nav.backToList');
    }
  });

  const alertButtonActionKopers: ComputedRef<() => void> = computed(() => {
    switch (serviceProviderStore.errorCode) {
      default:
        return navigateToServiceProviderTable;
    }
  });

  const errorTitleServiceProvider: ComputedRef<string> = computed(() => {
    return serviceProviderStore.errorCode === 'UNSPECIFIED_ERROR'
      ? t('angebot.loadingErrorTitle')
      : t(`angebot.title.${serviceProviderStore.errorCode}`);
  });

  const errorTextServiceProvider: ComputedRef<string> = computed(() => {
    return serviceProviderStore.errorCode === 'UNSPECIFIED_ERROR'
      ? t('angebot.loadingErrorText')
      : t(`angebot.errors.${serviceProviderStore.errorCode}`);
  });

  async function fetchRollenerweiterungen(): Promise<void> {
    await serviceProviderStore.getRollenerweiterungenById({
      serviceProviderId: currentServiceProviderId,
      organisationIds: selectedOrganisationIds.value.length > 0 ? selectedOrganisationIds.value : undefined,
      rolleIds: selectedRolleIds.value.length > 0 ? selectedRolleIds.value : undefined,
      offset: (rollenerweiterungPage.value - 1) * rollenerweiterungPerPage.value,
      limit: rollenerweiterungPerPage.value,
    });
  }

  function getPaginatedRollenerweiterungen(page: number): void {
    rollenerweiterungPage.value = page;
    fetchRollenerweiterungen();
  }

  function getPaginatedRollenerweiterungenWithLimit(limit: number): void {
    /* reset page to 1 if entries are equal to or less than selected limit */
    if (serviceProviderStore.rollenerweiterungen && serviceProviderStore.rollenerweiterungen.total <= limit) {
      rollenerweiterungPage.value = 1;
    }

    rollenerweiterungPerPage.value = limit;
    fetchRollenerweiterungen();
  }

  const rollen: ComputedRef<TranslatedObject[] | undefined> = computed(() => {
    const rollen: RolleWithServiceProvidersResponse[] = rolleStore.allRollen;

    return rollen
      .map((rolle: RolleResponse) => ({
        value: rolle.id,
        title: rolle.name,
      }))
      .sort((a: TranslatedObject, b: TranslatedObject) => a.title.localeCompare(b.title));
  });

  function resetSearchAndFilter(): void {
    selectedOrganisationIds.value = [];
    selectedRolleIds.value = [];
    searchInputRollen.value = '';
    fetchRollenerweiterungen();
  }

  function setOrganisationFilter(newValue: string[] | undefined): void {
    selectedOrganisationIds.value = newValue ?? [];
    fetchRollenerweiterungen();
  }

  function setRolleFilter(newValue: string[] | undefined): void {
    selectedRolleIds.value = newValue ?? [];
    if (!newValue?.length) {
      searchInputRollen.value = '';
    }
    fetchRollenerweiterungen();
  }

  function updateRollenSearch(searchValue: string): void {
    clearTimeout(timerId);

    timerId = setTimeout(() => {
      rolleStore.getAllRollen({
        limit: 25,
        searchString: searchValue,
        systemrechte: [RollenSystemRecht.RollenVerwalten, RollenSystemRecht.RollenErweitern],
        rolleIds: selectedRolleIds.value.length > 0 ? selectedRolleIds.value : undefined,
      });
    }, 500);
  }

  onMounted(async () => {
    serviceProviderStore.errorCode = '';
    serviceProviderStore.serviceProviderLogos.clear();

    await Promise.all([
      serviceProviderStore.getManageableServiceProviderById(currentServiceProviderId),
      serviceProviderStore.getServiceProviderLogoById(currentServiceProviderId),
    ]);
    if (authStore.hasRollenerweiternPermission) {
      fetchRollenerweiterungen();
      rolleStore.getAllRollen({
        systemrechte: [RollenSystemRecht.RollenVerwalten, RollenSystemRecht.RollenErweitern],
        limit: 25,
      });
    }
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
      :closable="!serviceProviderStore.errorCode"
      data-testid="service-provider-details-card"
      :header="t('admin.angebot.edit')"
      @onCloseClicked="navigateToServiceProviderTable"
      :padded="true"
      :showCloseText="true"
    >
      <v-container
        v-if="!!serviceProviderStore.errorCode"
        class="px-3 px-sm-16"
      >
        <v-container class="px-lg-16">
          <!-- Error Message Display if the serviceProviderStore throws any kind of error (Not being able to load the service provider) -->
          <SpshAlert
            :modelValue="!!serviceProviderStore.errorCode"
            :buttonText="alertButtonText"
            :buttonAction="alertButtonActionKopers"
            :closable="false"
            ref="service-provider-store-error-alert"
            :showButton="true"
            :text="errorTextServiceProvider"
            :title="errorTitleServiceProvider"
            :type="'error'"
            @update:modelValue="handleAlertClose"
          />
        </v-container>
      </v-container>

      <div v-if="!serviceProviderStore.errorCode">
        <v-container class="service-provider-info">
          <div v-if="serviceProviderStore.currentServiceProvider">
            <v-row
              class="mt-2"
              id="service-provider-info-row"
            >
              <v-col class="pl-16">
                <v-row>
                  <!-- Left column (first 4 fields) -->
                  <v-col
                    cols="12"
                    md="6"
                  >
                    <div class="compact-spacing">
                      <!-- Name -->
                      <LabeledField
                        :label="t('angebot.name')"
                        :value="serviceProviderStore.currentServiceProvider.name"
                        test-id="service-provider-name"
                      />

                      <!-- Administrationsebene -->
                      <LabeledField
                        :label="t('angebot.administrationsebene')"
                        :value="serviceProviderStore.currentServiceProvider.administrationsebene.name"
                        test-id="service-provider-administrationsebene"
                      />

                      <!-- Requires 2FA -->
                      <LabeledField
                        :label="t('angebot.requires2FA')"
                        :value="serviceProviderStore.currentServiceProvider.requires2fa ? t('yes') : t('no')"
                        test-id="service-provider-requires-2fa"
                      />

                      <!-- Can be assigned to Rollen? -->
                      <LabeledField
                        :label="t('angebot.canBeAssignedToRollen')"
                        :value="
                          serviceProviderStore.currentServiceProvider.merkmale.some(
                            (m: ServiceProviderMerkmal) => m === ServiceProviderMerkmal.NachtraeglichZuweisbar,
                          )
                            ? t('yes')
                            : t('no')
                        "
                        test-id="service-provider-can-be-assigned-to-rollen"
                      />

                      <!-- Is Vidis Angebot? -->
                      <LabeledField
                        :label="t('angebot.vidisAngebot')"
                        :value="isVidisAngebot ? t('yes') : t('no')"
                        test-id="service-provider-vidis-angebot"
                      />
                    </div>
                  </v-col>

                  <!-- Right column -->
                  <v-col
                    cols="12"
                    md="6"
                  >
                    <!-- Logo -->
                    <LabeledField
                      :label="t('angebot.logo')"
                      is-logo
                      :logo-src="resolvedLogo"
                      :default-logo-src="SchulPortalLogo"
                      test-id="service-provider-logo"
                      md-margin-top
                    />

                    <!-- Kategorie -->
                    <LabeledField
                      :label="t('angebot.kategorie')"
                      :value="
                        serviceProviderStore.currentServiceProvider.kategorie
                          ? t(
                              `angebot.mappingFrontBackEnd.kategorien.${serviceProviderStore.currentServiceProvider.kategorie}`,
                            )
                          : t('missing')
                      "
                      test-id="service-provider-kategorie"
                    />

                    <!-- URL -->
                    <LabeledField
                      :label="t('angebot.link')"
                      :value="serviceProviderStore.currentServiceProvider.url || t('missing')"
                      test-id="service-provider-link"
                      word-break-all
                    />

                    <!-- Rollenerweiterung -->
                    <LabeledField
                      :label="t('angebot.schulspezifischeRollenerweiterung')"
                      :value="
                        serviceProviderStore.currentServiceProvider.availableForRollenerweiterung ? t('yes') : t('no')
                      "
                      test-id="service-provider-rollenerweiterung"
                      no-margin-top
                    />

                    <LabeledField
                      :label="t('angebot.offeringScope')"
                      :value="
                        formatServiceProviderAnbietenMerkmale(serviceProviderStore.currentServiceProvider.merkmale, t)
                      "
                      test-id="service-provider-anbieten-merkmale"
                      no-margin-top
                    />

                    <LabeledField
                      :label="t('angebot.rollenartenWhitelistLabel')"
                      :value="
                        formatServiceProviderRollenartenWhitelist(
                          serviceProviderStore.currentServiceProvider.rollenartenWhitelist,
                          t,
                        )
                      "
                      test-id="service-provider-rollenarten-whitelist"
                      no-margin-top
                    />
                  </v-col>
                </v-row>
                <v-row
                  v-if="isEditModeAvailable"
                  class="mr-10 justify-end"
                >
                  <v-col
                    cols="12"
                    md="auto"
                  >
                    <v-btn
                      class="primary mt-4"
                      data-testid="service-provider-bearbeiten-button"
                      @click="openServiceProviderEditMode"
                      :text="t('edit')"
                    >
                    </v-btn>
                  </v-col>
                  <VidisInfoDialog
                    :header="t('angebot.edit')"
                    :text="
                      t('angebot.vidisEditInfoText', {
                        name: serviceProviderStore.currentServiceProvider.name,
                      })
                    "
                    v-model="vidisInfoDialogOpen"
                  />
                </v-row>
              </v-col>
            </v-row>
            <v-divider
              class="border-opacity-100 rounded mt-16"
              color="#E5EAEF"
              thickness="6"
            ></v-divider>
            <v-row>
              <v-col
                class="custom-offset"
                offset="1"
                offset-sm="1"
                offset-md="1"
                offset-lg="1"
              >
                <v-row class="mt-4 align-center">
                  <v-col
                    cols="auto"
                    class="d-flex align-center pr-0"
                  >
                    <span class="subtitle-2">{{ t('angebot.assignedRollen') }}:</span>
                  </v-col>

                  <v-col
                    class="d-flex align-center flex-wrap"
                    data-testid="service-provider-rollen"
                  >
                    <span
                      class="text-body"
                      v-if="serviceProviderStore.currentServiceProvider.rollen.length === 0"
                      >{{ t('none') }}</span
                    >
                    <v-chip
                      else
                      v-for="rolle in serviceProviderStore.currentServiceProvider.rollen"
                      :key="rolle.id"
                      class="ma-1"
                      color="primary"
                      variant="tonal"
                    >
                      {{ rolle.name }}
                    </v-chip>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </div>

          <div v-else-if="serviceProviderStore.loading">
            <v-progress-circular indeterminate></v-progress-circular>
          </div>
        </v-container>
        <div v-if="authStore.hasRollenerweiternPermission">
          <v-container>
            <v-divider
              class="border-opacity-100 rounded"
              color="#E5EAEF"
              thickness="6"
            ></v-divider>

            <!-- Header row + chevron -->
            <v-row
              class="ml-sm-16 mt-2 align-center"
              no-gutters
            >
              <v-col cols="auto">
                <h3
                  class="subtitle-1"
                  data-testid="schulspezifische-rollenerweiterungen-section-headline"
                >
                  {{ t('angebot.showSchulspezifischeRollenerweiterungen') }}
                </h3>
              </v-col>

              <!-- Vuetify chevron -->
              <v-col cols="auto">
                <v-btn
                  data-testid="open-schulspezifische-rollenerweiterungen-section-headline-button"
                  icon
                  variant="plain"
                  size="small"
                  @click="isOpen = !isOpen"
                  :aria-expanded="isOpen.toString()"
                >
                  <v-icon
                    class="chevron"
                    :class="{
                      rotate: isOpen,
                    }"
                  >
                    mdi-chevron-down
                  </v-icon>
                </v-btn>
              </v-col>
            </v-row>

            <v-row class="align-center justify-end">
              <v-col cols="12">
                <v-expand-transition>
                  <div v-show="isOpen">
                    <template v-if="serviceProviderStore.currentServiceProvider?.availableForRollenerweiterung">
                      <v-row
                        class="ma-3 align-start"
                        data-testid="filter-section"
                      >
                        <v-col
                          cols="12"
                          md="2"
                          class="py-md-0 text-md-right align-self-center"
                        >
                          <v-btn
                            class="px-0 reset-filter"
                            data-testid="reset-filter-button"
                            :disabled="!selectedOrganisationIds.length && !selectedRolleIds.length"
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
                            :multiple="true"
                            includeAll
                            highlightSelection
                            parentId="service-provider-management-by-schule"
                            ref="schulenFilter"
                            :systemrechteForSearch="[RollenSystemRecht.AngeboteVerwalten]"
                            :selectedSchulen="selectedOrganisationIds.length > 0 ? selectedOrganisationIds : []"
                            @update:selected-schulen="setOrganisationFilter"
                            :placeholderText="$t('admin.schule.schule')"
                            hideDetails
                          >
                            <template #prepend-item>
                              <v-list-item>
                                <v-progress-circular
                                  v-if="
                                    organisationStore.organisationenFilters.get('service-provider-management-by-schule')
                                      ?.loading
                                  "
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
                                        count: organisationStore.organisationenFilters.get(
                                          'service-provider-management-by-schule',
                                        )?.total,
                                      },
                                      organisationStore.organisationenFilters.get(
                                        'service-provider-management-by-schule',
                                      )?.total ?? 0,
                                    )
                                  }}
                                </span>
                              </v-list-item>
                            </template>
                          </SchulenFilter>
                        </v-col>
                        <v-col
                          cols="12"
                          md="3"
                          class="py-md-0"
                        >
                          <v-autocomplete
                            id="rolle-select"
                            ref="rolle-select"
                            v-model="selectedRolleIds"
                            v-model:search="searchInputRollen"
                            autocomplete="off"
                            class="filter-dropdown"
                            :class="{
                              selected: selectedRolleIds.length > 0,
                            }"
                            clearable
                            data-testid="rolle-select"
                            density="compact"
                            hide-details
                            :items="rollen"
                            item-value="value"
                            item-text="title"
                            multiple
                            :no-data-text="$t('noDataFound')"
                            :placeholder="$t('admin.rolle.rolle')"
                            required="true"
                            variant="outlined"
                            @update:model-value="setRolleFilter"
                            @update:search="updateRollenSearch"
                          >
                            <template #prepend-item>
                              <v-list-item>
                                <v-progress-circular
                                  v-if="rolleStore.loading"
                                  indeterminate
                                />
                                <span
                                  v-else
                                  class="filter-header"
                                  >{{
                                    $t(
                                      'admin.rolle.rollenFound',
                                      {
                                        count: rolleStore.totalRollen,
                                      },
                                      rolleStore.totalRollen,
                                    )
                                  }}</span
                                >
                              </v-list-item>
                            </template>
                            <template #selection="{ internalItem: item, index }">
                              <v-chip v-if="selectedRolleIds.length < 2">
                                <span>{{ item.title }}</span>
                              </v-chip>
                              <div v-else-if="index === 0">
                                {{
                                  $t('admin.rolle.rollenSelected', {
                                    count: selectedRolleIds.length,
                                  })
                                }}
                              </div>
                            </template>
                          </v-autocomplete>
                        </v-col>
                      </v-row>
                      <v-row class="mx-16 mt-n4 align-center justify-end">
                        <v-col cols="12">
                          <ResultTable
                            ref="result-table"
                            :current-page="rollenerweiterungPage"
                            data-testid="rollenerweiterungen-table"
                            :items="serviceProviderStore.rollenerweiterungenUebersicht || []"
                            :loading="serviceProviderStore.loading"
                            :headers="headers"
                            :hide-select="true"
                            item-value-path="id"
                            :total-items="serviceProviderStore.rollenerweiterungen?.total || 0"
                            :items-per-page="rollenerweiterungPerPage"
                            :noDataText="$t('noSchulenFound')"
                            @on-items-per-page-update="getPaginatedRollenerweiterungenWithLimit"
                            @on-page-update="getPaginatedRollenerweiterungen"
                          >
                            <template #[`item.schule`]="{ item }">
                              <div
                                class="ellipsis-wrapper"
                                :title="item.schule"
                              >
                                {{ item.schule }}
                              </div>
                            </template>

                            <template #[`item.rollenerweiterungen`]="{ item }">
                              <div
                                class="ellipsis-wrapper"
                                :title="item.rollenerweiterungen"
                              >
                                {{ item.rollenerweiterungen }}
                              </div>
                            </template>
                          </ResultTable>
                        </v-col>
                      </v-row>
                    </template>
                    <template v-else>
                      <v-row>
                        <v-col cols="12">
                          <span
                            class="text-body"
                            data-testid="rollenerweiterungen-not-available-hint"
                          >
                            {{ t('angebot.notForSchulspezifischeRollenerweiterungenAvailable') }}</span
                          >
                        </v-col>
                      </v-row>
                    </template>
                  </div>
                </v-expand-transition>
              </v-col>
            </v-row>
          </v-container>
        </div>
      </div>
    </LayoutCard>
  </div>
</template>

<style scoped>
  @media (min-width: 1280px) and (max-width: 1600px) {
    .custom-offset {
      margin-left: 0 !important; /* removes the Vuetify offset */
    }
  }

  .chevron {
    transition: transform 200ms ease;
  }
  .chevron.rotate {
    transform: rotate(180deg);
  }
</style>
