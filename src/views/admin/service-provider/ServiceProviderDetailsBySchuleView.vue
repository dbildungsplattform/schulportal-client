<script setup lang="ts">
  import { computed, nextTick, onMounted, ref, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useRoute, useRouter, type RouteLocationNormalizedLoaded, type Router } from 'vue-router';
  import { useDisplay } from 'vuetify';

  import {
    DbiamApplyRollenerweiterungMultiErrorRolleIdsWithI18nKeysInnerI18nKeyEnum,
    RollenSystemRechtEnum,
  } from '@/api-client/generated';
  import SchulPortalLogo from '@/assets/logos/Schulportal_SH_Bildmarke_RGB_Anwendung_HG_Blau.svg';
  import LabeledField from '@/components/admin/LabeledField.vue';
  import RollenerweiterungAssignErrorDialog from '@/components/admin/service-provider/RollenerweiterungAssignErrorDialog.vue';
  import RollenerweiterungTreeview, {
    type RolleForSelection,
  } from '@/components/admin/service-provider/RollenerweiterungTreeview.vue';
  import VidisInfoDialog from '@/components/admin/service-provider/VidisInfoDialog.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { useConfigStore, type ConfigStore } from '@/stores/ConfigStore';
  import { useOrganisationStore, type OrganisationStore } from '@/stores/OrganisationStore';
  import {
    RollenArt,
    useRolleStore,
    type RolleStore,
    type RolleWithServiceProvidersResponse,
  } from '@/stores/RolleStore';
  import {
    ServiceProviderMerkmal,
    useServiceProviderStore,
    type ManageableServiceProviderDetail,
    type ServiceProviderStore,
  } from '@/stores/ServiceProviderStore';
  import { intersect } from '@/utils/arrays';
  import { getLogoPath } from '@/utils/logosConfig';
  import {
    formatServiceProviderAnbietenMerkmale,
    formatServiceProviderRollenartenWhitelist,
  } from '@/utils/serviceProvider.helper';

  const router: Router = useRouter();
  const route: RouteLocationNormalizedLoaded = useRoute();
  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
  const organisationStore: OrganisationStore = useOrganisationStore();
  const rolleStore: RolleStore = useRolleStore();
  const configStore: ConfigStore = useConfigStore();

  const isEditModeAvailable: ComputedRef<boolean> = computed(() => {
    return configStore.configData?.schulischeAngeboteErstellen ?? false;
  });

  const currentServiceProviderId: string = route.params['id'] as string;

  const treeviewContainer: Ref<HTMLElement | null> = ref(null);

  // ── Edit mode state ────────────────────────────────────────────────────────
  const isEditingRollenerweiterungen: Ref<boolean> = ref(false);
  const selectedRolleIds: Ref<string[]> = ref([]);
  const isSaving: Ref<boolean> = ref(false);
  const saveSuccessDialogVisible: Ref<boolean> = ref(false);
  const saveFailureDialogVisible: Ref<boolean> = ref(false);

  function closeSaveSuccessDialog(): void {
    saveSuccessDialogVisible.value = false;
    isEditingRollenerweiterungen.value = false;
    selectedRolleIds.value = [];
  }

  function navigateToServiceProviderBySchuleTable(): void {
    router.push({ name: 'angebot-management-schulspezifisch' });
  }

  const handleAlertClose = (): void => {
    serviceProviderStore.errorCode = '';
    navigateToServiceProviderBySchuleTable();
  };

  const alertButtonText: ComputedRef<string> = computed(() => {
    switch (serviceProviderStore.errorCode) {
      default:
        return t('nav.backToList');
    }
  });

  const alertButtonAction: ComputedRef<() => void> = computed(() => {
    switch (serviceProviderStore.errorCode) {
      default:
        return navigateToServiceProviderBySchuleTable;
    }
  });

  const errorTitle: ComputedRef<string> = computed(() => {
    if (isEditingRollenerweiterungen.value && serviceProviderStore.errorCode !== '') {
      return t('angebot.schulspezifischeErweiterungen.assignErrorTitle');
    }
    return serviceProviderStore.errorCode === 'UNSPECIFIED_ERROR'
      ? t('angebot.loadingErrorTitle')
      : t(`angebot.title.${serviceProviderStore.errorCode}`);
  });

  const errorText: ComputedRef<string> = computed(() => {
    if (isEditingRollenerweiterungen.value && serviceProviderStore.errorCode !== '') {
      return t(
        `angebot.schulspezifischeErweiterungen.assignErrorMessage.${serviceProviderStore.errorCode}`,
        t('angebot.schulspezifischeErweiterungen.assignErrorMessage.500'),
      );
    }
    return serviceProviderStore.errorCode === 'UNSPECIFIED_ERROR'
      ? t('angebot.loadingErrorText')
      : t(`angebot.errors.${serviceProviderStore.errorCode}`);
  });

  const multipleErrors: ComputedRef<{ rolle: string; message: string }[]> = computed(() => {
    const mappedRollen: Map<string, RolleWithServiceProvidersResponse> = new Map(
      rolleStore.allRollen.map((r: RolleWithServiceProvidersResponse) => [r.id, r]),
    );
    return Array.from(serviceProviderStore.errors.entries()).map(
      ([rolleId, code]: [string, DbiamApplyRollenerweiterungMultiErrorRolleIdsWithI18nKeysInnerI18nKeyEnum]) => {
        const rolle: RolleWithServiceProvidersResponse | undefined = mappedRollen.get(rolleId);
        return {
          rolle: rolle?.name ?? rolleId,
          message: t(`angebot.schulspezifischeErweiterungen.assignErrorMessage.${code}`, {
            rollenname: rolle?.name ?? rolleId,
            dstNr: organisationStore.currentOrganisation?.kennung ?? '',
          }),
        };
      },
    );
  });

  const organisationIdFromQuery: ComputedRef<string | undefined> = computed(
    () => route.query['orga'] as string | undefined,
  );

  // ── Derived data ──────────────────────────────────────────────────────────
  const existingRolleIds: ComputedRef<string[]> = computed(
    () => serviceProviderStore.rollenerweiterungen?.items?.map((item: { rolleId: string }) => item.rolleId) ?? [],
  );

  const availableRollen: ComputedRef<RolleForSelection[]> = computed(() =>
    (rolleStore.allRollen ?? [])
      .filter((r: RolleWithServiceProvidersResponse) =>
        ([RollenArt.Lehr, RollenArt.Lern, RollenArt.Leit] as RollenArt[]).includes(r.rollenart),
      )
      .map((r: RolleWithServiceProvidersResponse) => ({ id: r.id, name: r.name, rollenart: r.rollenart })),
  );

  const hasEditPermissions: ComputedRef<boolean> = computed(() => {
    if (!serviceProviderStore.currentServiceProvider || serviceProviderStore.loading) {
      return false;
    }

    const hasSomeVerwaltenPermission: boolean =
      intersect(serviceProviderStore.currentServiceProvider.relevantSystemrechte ?? [], [
        RollenSystemRechtEnum.AngeboteVerwalten,
        RollenSystemRechtEnum.AngeboteEingeschraenktVerwalten,
      ]).length > 0;

    return hasSomeVerwaltenPermission;
  });

  const isVidisAngebot: ComputedRef<boolean> = computed(() => {
    return Boolean(serviceProviderStore.currentServiceProvider?.vidisAngebotId);
  });
  const vidisInfoDialogOpen: Ref<boolean> = ref(false);

  function scrollToTreeview(offset: number = 120): void {
    const el: HTMLElement | null = treeviewContainer.value;
    if (!el) {
      return;
    }

    const scroll = (): void => {
      const top: number = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: top - offset, // scroll a bit above the element
        behavior: 'smooth',
      });
    };

    const onTransitionEnd = (): void => {
      scroll();
      el.removeEventListener('transitionend', onTransitionEnd);
    };

    el.addEventListener('transitionend', onTransitionEnd);

    // Fallback in case transitionend doesn't fire
    setTimeout(scroll, 500);
  }

  // ── Edit mode actions ─────────────────────────────────────────────────────
  async function openRollenerweiterungEditMode(): Promise<void> {
    // Load available rollen for this organisation if not yet loaded
    if (organisationIdFromQuery.value) {
      await rolleStore.getAllRollen({
        organisationContextForOperation: organisationIdFromQuery.value,
        systemrechte: [RollenSystemRechtEnum.RollenErweitern],
      });
    }
    selectedRolleIds.value = [...existingRolleIds.value];
    isEditingRollenerweiterungen.value = true;

    // Wait until DOM updates, then scroll
    await nextTick();
    scrollToTreeview();
  }

  async function openServiceProviderEditMode(): Promise<void> {
    if (isVidisAngebot.value) {
      vidisInfoDialogOpen.value = true;
      return;
    }
    await router.push({
      name: 'angebot-edit',
      params: { id: currentServiceProviderId },
      query: organisationIdFromQuery.value ? { orga: organisationIdFromQuery.value } : undefined,
    });
  }

  const autoEdit: ComputedRef<boolean> = computed(() => route.query['autoEdit'] === 'true');

  function cancelEdit(): void {
    isEditingRollenerweiterungen.value = false;
    selectedRolleIds.value = [];
  }

  async function saveRollenerweiterungen(): Promise<void> {
    if (!organisationIdFromQuery.value) {
      return;
    }

    isSaving.value = true;

    const existingSet: Set<string> = new Set(existingRolleIds.value);
    const selectedSet: Set<string> = new Set(selectedRolleIds.value);

    const addErweiterungenForRolleIds: string[] = [...selectedSet].filter((id: string) => !existingSet.has(id));
    const removeErweiterungenForRolleIds: string[] = [...existingSet].filter((id: string) => !selectedSet.has(id));

    await serviceProviderStore.persistRollenerweiterungenForServiceProvider({
      serviceProviderId: currentServiceProviderId,
      organisationId: organisationIdFromQuery.value,
      addErweiterungenForRolleIds,
      removeErweiterungenForRolleIds,
    });

    isSaving.value = false;

    if (!serviceProviderStore.errorCode && serviceProviderStore.errors.size === 0) {
      // Refresh rollenerweiterungen to reflect saved state
      await serviceProviderStore.getRollenerweiterungenById({
        serviceProviderId: currentServiceProviderId,
        organisationIds: [organisationIdFromQuery.value],
      });
      saveSuccessDialogVisible.value = true;
    } else if (serviceProviderStore.errors.size > 0) {
      saveFailureDialogVisible.value = true;
    }
  }

  async function clearErrorVisibility(isVisible: boolean): Promise<void> {
    if (!isVisible) {
      saveFailureDialogVisible.value = false;
      serviceProviderStore.errors.clear();
      isEditingRollenerweiterungen.value = false;
      await serviceProviderStore.getRollenerweiterungenById({
        serviceProviderId: currentServiceProviderId,
        organisationIds: [organisationIdFromQuery.value!],
      });
    }
  }

  const resolvedLogo: ComputedRef<string | undefined> = computed(() => {
    const provider: ManageableServiceProviderDetail | null = serviceProviderStore.currentServiceProvider;

    if (provider?.logoId != null) {
      return getLogoPath(provider.logoId);
    }

    return serviceProviderStore.serviceProviderLogos.get(currentServiceProviderId);
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  onMounted(async () => {
    serviceProviderStore.errorCode = '';
    serviceProviderStore.errors.clear();
    serviceProviderStore.serviceProviderLogos.clear();

    await Promise.all([
      serviceProviderStore.getManageableServiceProviderById(currentServiceProviderId),
      serviceProviderStore.getServiceProviderLogoById(currentServiceProviderId),
      serviceProviderStore.getRollenerweiterungenById({
        serviceProviderId: currentServiceProviderId,
        organisationIds: organisationIdFromQuery.value ? [organisationIdFromQuery.value] : [],
      }),
    ]);

    if (!organisationStore.currentOrganisation && organisationIdFromQuery.value) {
      await organisationStore.getOrganisationById(organisationIdFromQuery.value);
    }
    if (autoEdit.value) {
      await openRollenerweiterungEditMode();
    }
  });
</script>

<template>
  <div>
    <h1
      class="text-center headline"
      data-testid="admin-headline"
    >
      {{ t('admin.headline') }}
    </h1>
    <LayoutCard
      :closable="!serviceProviderStore.errorCode"
      data-testid="service-provider-details-by-schule-card"
      :header="`${t('admin.angebot.edit')} ${organisationStore.currentOrganisation?.name ?? ''}`"
      :header-hover-text="organisationStore.currentOrganisation?.name"
      @onCloseClicked="navigateToServiceProviderBySchuleTable"
      :padded="true"
      :showCloseText="true"
    >
      <v-container
        v-if="!!serviceProviderStore.errorCode"
        class="px-3 px-sm-16"
      >
        <v-container class="px-lg-16">
          <SpshAlert
            :modelValue="!!serviceProviderStore.errorCode"
            :buttonText="alertButtonText"
            :buttonAction="alertButtonAction"
            :closable="false"
            ref="service-provider-store-error-alert"
            :showButton="true"
            :text="errorText"
            :title="errorTitle"
            :type="'error'"
            @update:modelValue="handleAlertClose"
          />
        </v-container>
      </v-container>

      <template v-if="!serviceProviderStore.errorCode">
        <v-container>
          <template v-if="serviceProviderStore.currentServiceProvider">
            <v-row
              class="mt-2"
              data-testid="service-provider-info-row"
            >
              <v-col
                offset="1"
                offset-sm="1"
                offset-md="1"
                offset-lg="1"
              >
                <v-row>
                  <!-- Left column -->
                  <v-col
                    cols="12"
                    md="6"
                  >
                    <div>
                      <LabeledField
                        :label="t('angebot.name')"
                        :value="serviceProviderStore.currentServiceProvider.name"
                        test-id="service-provider-name"
                      />
                      <LabeledField
                        :label="t('angebot.providedBy')"
                        :value="serviceProviderStore.currentServiceProvider.administrationsebene.name"
                        test-id="service-provider-administrationsebene"
                      />
                      <LabeledField
                        :label="t('angebot.requires2FA')"
                        :value="serviceProviderStore.currentServiceProvider.requires2fa ? t('yes') : t('no')"
                        test-id="service-provider-requires-2fa"
                      />
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
                    <LabeledField
                      :label="t('angebot.logo')"
                      is-logo
                      :logo-src="resolvedLogo"
                      :default-logo-src="SchulPortalLogo"
                      test-id="service-provider-logo"
                    />
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
                    <LabeledField
                      :label="t('angebot.link')"
                      :value="serviceProviderStore.currentServiceProvider.url || t('missing')"
                      test-id="service-provider-link"
                      word-break-all
                    />
                    <LabeledField
                      :label="t('angebot.schulspezifischeRollenerweiterung')"
                      :value="
                        serviceProviderStore.currentServiceProvider.availableForRollenerweiterung ? t('yes') : t('no')
                      "
                      test-id="service-provider-rollenerweiterung"
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

                    <v-row
                      v-if="isEditModeAvailable && hasEditPermissions"
                      class="mr-10 justify-end"
                    >
                      <v-col
                        cols="12"
                        md="auto"
                        class="mt-4"
                      >
                        <v-btn
                          :disabled="isEditingRollenerweiterungen"
                          class="primary"
                          :block="mdAndDown"
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
              </v-col>
            </v-row>

            <v-divider
              class="border-opacity-100 rounded mt-16 mb-0 pb-0"
              color="#E5EAEF"
              thickness="6"
            />

            <!-- ── Rollenerweiterungen section ──────────────────────────────── -->
            <v-row>
              <v-col
                offset="1"
                offset-sm="1"
                offset-md="1"
                offset-lg="1"
              >
                <!-- Read-only chips -->
                <v-row
                  class="mt-5"
                  v-if="!isEditingRollenerweiterungen"
                >
                  <v-col
                    cols="auto"
                    class="d-flex align-center pr-0"
                  >
                    <span class="subtitle-2">{{ t('angebot.erweiterteRollenAnDerSchule') }}:</span>
                  </v-col>
                  <v-col
                    class="d-flex align-center flex-wrap"
                    data-testid="service-provider-rollenerweiterungen"
                  >
                    <span
                      v-if="serviceProviderStore.rollenerweiterungen?.items?.length === 0"
                      class="text-body"
                    >
                      {{ t('none') }}
                    </span>
                    <v-chip
                      v-for="rollenerweiterung in serviceProviderStore.rollenerweiterungen?.items"
                      :key="rollenerweiterung.rolleName"
                      class="ma-1"
                      color="primary"
                      variant="tonal"
                    >
                      {{ rollenerweiterung.rolleName }}
                    </v-chip>
                  </v-col>
                </v-row>

                <!-- Bearbeiten button -->
                <v-row class="mr-10 justify-end">
                  <v-col
                    cols="12"
                    md="auto"
                  >
                    <v-btn
                      v-if="
                        !isEditingRollenerweiterungen &&
                        serviceProviderStore.currentServiceProvider.availableForRollenerweiterung
                      "
                      class="primary"
                      :block="mdAndDown"
                      data-testid="rollenerweiterung-bearbeiten-button"
                      @click="openRollenerweiterungEditMode"
                    >
                      {{ t('edit') }}
                    </v-btn>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>

            <!-- Inline treeview (shown while editing, full-width, no offset) -->
            <v-expand-transition>
              <div
                v-if="isEditingRollenerweiterungen"
                ref="treeviewContainer"
              >
                <LayoutCard
                  :closable="false"
                  :header="t('angebot.editRollenerweiterungen')"
                  :padded="true"
                  :variant="'text'"
                  :subCards="true"
                >
                  <v-row>
                    <v-col class="ml-md-10 pr-sm-12">
                      <RollenerweiterungTreeview
                        :available-rollen="availableRollen"
                        :initially-selected-rolle-ids="existingRolleIds"
                        :loading="rolleStore.loading"
                        @update:selectedRolleIds="selectedRolleIds = $event"
                      />
                    </v-col>
                  </v-row>

                  <!-- Save / Cancel actions -->
                  <v-row class="mt-4 justify-end">
                    <v-col
                      cols="12"
                      sm="6"
                      md="auto"
                    >
                      <v-btn
                        class="secondary"
                        :block="mdAndDown"
                        :disabled="isSaving"
                        variant="text"
                        data-testid="rollenerweiterung-cancel-button"
                        @click="cancelEdit"
                      >
                        {{ t('cancel') }}
                      </v-btn>
                    </v-col>
                    <v-col
                      cols="12"
                      sm="6"
                      md="auto"
                    >
                      <v-btn
                        v-if="availableRollen.length > 0"
                        class="primary"
                        :block="mdAndDown"
                        data-testid="rollenerweiterung-save-button"
                        :disabled="rolleStore.loading"
                        :loading="isSaving"
                        @click="saveRollenerweiterungen"
                      >
                        {{ t('save') }}
                      </v-btn>
                    </v-col>
                  </v-row>
                </LayoutCard>
              </div>
            </v-expand-transition>
          </template>

          <template v-else-if="serviceProviderStore.loading">
            <v-progress-circular indeterminate />
          </template>
        </v-container>
      </template>
    </LayoutCard>

    <!-- ── Save success dialog ──────────────────────────────────────────────── -->
    <v-dialog
      v-model="saveSuccessDialogVisible"
      persistent
      max-width="600px"
    >
      <LayoutCard :header="t('angebot.editRollenerweiterungen')">
        <v-card-text>
          <v-container>
            <v-row class="text-body text-center bold">
              <v-col
                offset="1"
                cols="10"
              >
                <span>{{ t('angebot.saveRollenerweiterungenSuccess') }}</span>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-row class="justify-center">
            <v-col
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="mdAndDown"
                class="primary"
                data-testid="close-rollenerweiterung-save-success-button"
                @click.stop="closeSaveSuccessDialog"
              >
                {{ t('close') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </v-dialog>
  </div>
  <!-- ── Save error dialog ──────────────────────────────────────────────── -->
  <RollenerweiterungAssignErrorDialog
    :isDialogVisible="saveFailureDialogVisible"
    :dstNr="organisationStore.currentOrganisation?.kennung ?? ''"
    :serviceProviderName="serviceProviderStore.currentServiceProvider?.name ?? ''"
    :errors="multipleErrors"
    @update:isDialogVisible="clearErrorVisibility"
  />
</template>

<style scoped>
  @media (min-width: 1280px) and (max-width: 1600px) {
    .custom-offset {
      margin-left: 0 !important;
    }
  }
</style>
