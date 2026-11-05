<script setup lang="ts">
  import ServiceProviderForm from '@/components/admin/service-provider/ServiceProviderForm.vue';
  import {
    extractAnbietenInMerkmale,
    formatServiceProviderAnbietenMerkmale,
    formatServiceProviderRollenartenWhitelist,
  } from '@/utils/serviceProvider.helper';
  import SuccessTemplate from '@/components/admin/service-provider/SuccessTemplate.vue';
  import type {
    ServiceProviderFormSubmitData,
    ServiceProviderForm as ServiceProviderFormType,
  } from '@/components/admin/service-provider/types';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { RollenSystemRecht } from '@/stores/RolleStore';
  import {
    ServiceProviderMerkmal,
    useServiceProviderStore,
    type ServiceProviderStore,
  } from '@/stores/ServiceProviderStore';
  import { computed, onMounted, onUnmounted, ref, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import {
    onBeforeRouteLeave,
    useRoute,
    useRouter,
    type NavigationGuardNext,
    type RouteLocationNormalized,
    type Router,
  } from 'vue-router';
  import { useDisplay } from 'vuetify';
  import SchulPortalLogo from '@/assets/logos/Schulportal_SH_Bildmarke_RGB_Anwendung_HG_Blau.svg';

  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
  const route: RouteLocationNormalized = useRoute();
  const router: Router = useRouter();
  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  const isDirty: Ref<boolean> = ref(false);
  const showUnsavedChangesDialog: Ref<boolean> = ref(false);
  const showSuccess: Ref<boolean> = ref(false);

  const cachedOrganisationName: Ref<string> = ref(''); // for success template
  const cachedLogo: Ref<number | string | undefined> = ref(undefined); // for success template

  let blockedNext: () => void = () => {
    /* empty */
  };

  const serviceProviderId: ComputedRef<string> = computed(() => route.params['id'] as string);
  const organisationIdFromQuery: ComputedRef<string | undefined> = computed(
    () => route.query['orga'] as string | undefined,
  );

  const systemrecht: ComputedRef<RollenSystemRecht> = computed(() => {
    if (
      serviceProviderStore.currentServiceProvider?.relevantSystemrechte.includes(RollenSystemRecht.AngeboteVerwalten)
    ) {
      return RollenSystemRecht.AngeboteVerwalten;
    }
    return RollenSystemRecht.AngeboteEingeschraenktVerwalten;
  });

  const customLogo: ComputedRef<string> = computed(() => {
    if (!serviceProviderStore.currentServiceProvider) {
      return '';
    }
    return (
      serviceProviderStore.serviceProviderLogos.get(serviceProviderStore.currentServiceProvider.id) ?? SchulPortalLogo
    );
  });

  const cachedValues: Ref<Partial<ServiceProviderFormType> | undefined> = ref(undefined);
  function cacheSubmittedValues(values: ServiceProviderFormSubmitData): void {
    cachedValues.value = {
      name: values.name,
      url: values.url,
      kategorie: values.kategorie,
      logoId: values.logoId,
      requires2fa: values.requires2fa,
      nachtraeglichZuweisbar: values.merkmale.includes(ServiceProviderMerkmal.NachtraeglichZuweisbar),
      verfuegbarFuerRollenerweiterung: values.merkmale.includes(ServiceProviderMerkmal.VerfuegbarFuerRollenerweiterung),
      anbietenInMerkmale: extractAnbietenInMerkmale(values.merkmale),
      rollenartenWhitelist: values.rollenartenWhitelist,
    };
  }

  const initialValues: ComputedRef<ServiceProviderFormType | null> = computed(() => {
    if (!serviceProviderStore.currentServiceProvider) {
      return null;
    }
    return {
      selectedOrganisationId: serviceProviderStore.currentServiceProvider.administrationsebene.id,
      name: serviceProviderStore.currentServiceProvider.name,
      url: serviceProviderStore.currentServiceProvider.url,
      logoId: serviceProviderStore.currentServiceProvider.logoId,
      customLogo: customLogo.value,
      kategorie: serviceProviderStore.currentServiceProvider.kategorie,
      requires2fa: serviceProviderStore.currentServiceProvider.requires2fa,
      nachtraeglichZuweisbar: serviceProviderStore.currentServiceProvider.merkmale.includes(
        ServiceProviderMerkmal.NachtraeglichZuweisbar,
      ),
      verfuegbarFuerRollenerweiterung: serviceProviderStore.currentServiceProvider.merkmale.includes(
        ServiceProviderMerkmal.VerfuegbarFuerRollenerweiterung,
      ),
      anbietenInMerkmale: extractAnbietenInMerkmale(serviceProviderStore.currentServiceProvider.merkmale),
      rollenartenWhitelist: serviceProviderStore.currentServiceProvider.rollenartenWhitelist ?? [],
    };
  });

  const errorText: ComputedRef<string> = computed(() => {
    if (!serviceProviderStore.errorCode) {
      return '';
    }
    return t(`angebot.errors.${serviceProviderStore.errorCode}`);
  });

  function preventNavigation(event: BeforeUnloadEvent): void {
    if (!isDirty.value) {
      return;
    }
    event.preventDefault();
    event.returnValue = '';
  }

  function confirmUnsavedChanges(): void {
    showUnsavedChangesDialog.value = false;
    blockedNext();
    serviceProviderStore.errorCode = '';
  }

  async function submit(values: ServiceProviderFormSubmitData): Promise<void> {
    cacheSubmittedValues(values);
    await serviceProviderStore.updateServiceProvider(serviceProviderId.value, values);
    if (!serviceProviderStore.errorCode) {
      isDirty.value = false;
      showSuccess.value = true;
      cachedLogo.value = values.logoId ?? customLogo.value;
      cachedOrganisationName.value = serviceProviderStore.currentServiceProvider?.administrationsebene.name ?? '';
    }
  }

  function clearError(): void {
    serviceProviderStore.errorCode = '';
  }

  async function navigateToServiceProviderList(): Promise<void> {
    if (organisationIdFromQuery.value) {
      await router.push({
        name: 'angebot-management-schulspezifisch',
        query: { orga: organisationIdFromQuery.value },
      });
    } else {
      await router.push({ name: 'angebot-management' });
    }
  }

  async function navigateToServiceProviderDetails(): Promise<void> {
    if (organisationIdFromQuery.value) {
      if (
        serviceProviderStore.updatedServiceProvider?.merkmale.includes(
          ServiceProviderMerkmal.VerfuegbarFuerRollenerweiterung,
        ) &&
        serviceProviderStore.updatedServiceProvider?.merkmale.includes(
          ServiceProviderMerkmal.AnbietenInSchulischerAngebotsverwaltung,
        )
      ) {
        await router.push({
          name: 'angebot-details-schulspezifisch',
          params: { id: serviceProviderId.value },
          query: { orga: organisationIdFromQuery.value },
        });
      } else {
        // without VerfuegbarFuerRollenerweiterung or AnbietenInSchulischerAngebotsverwaltung, the service provider is not visible in the list view for schule, so we redirect to the normal details view
        await router.push({ name: 'angebot-details', params: { id: serviceProviderId.value } });
      }
    } else {
      await router.push({ name: 'angebot-details', params: { id: serviceProviderId.value } });
    }
  }

  onBeforeRouteLeave((_to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    if (!serviceProviderStore.errorCode && isDirty.value) {
      showUnsavedChangesDialog.value = true;
      blockedNext = next;
    } else {
      next();
    }
  });

  onMounted(async () => {
    serviceProviderStore.errorCode = '';
    if (serviceProviderId.value) {
      await serviceProviderStore.getManageableServiceProviderById(serviceProviderId.value);
    }
    window.addEventListener('beforeunload', preventNavigation);
  });

  onUnmounted(() => {
    window.removeEventListener('beforeunload', preventNavigation);
    serviceProviderStore.errorCode = '';
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
      :closable="!serviceProviderStore.errorCode"
      :header="t('angebot.edit')"
      headlineTestId="service-provider-edit-headline"
      @onCloseClicked="navigateToServiceProviderList"
      :padded="true"
      :showCloseText="true"
    >
      <SpshAlert
        :model-value="!!serviceProviderStore.errorCode"
        :title="$t('angebot.angebotEditErrorTitle')"
        :type="'error'"
        :closable="false"
        :show-button="true"
        :button-action="clearError"
        :button-text="$t('angebot.backToServiceProviderEdit')"
        :text="errorText"
      />
      <template v-if="!serviceProviderStore.errorCode">
        <template v-if="showSuccess">
          <SuccessTemplate
            v-if="serviceProviderStore.updatedServiceProvider"
            :success="{
              message: $t('angebot.angebotUpdatedSuccessfully', {
                name: serviceProviderStore.updatedServiceProvider.name,
              }),
              followingDataChanged: $t('admin.followingDataCreated'),
              data: [
                {
                  label: $t('angebot.providedBy'),
                  value: cachedOrganisationName,
                  testId: 'success-organisation',
                },
                {
                  label: $t('angebot.name'),
                  value: serviceProviderStore.updatedServiceProvider.name,
                  testId: 'success-name',
                },
                {
                  label: $t('angebot.url'),
                  value: serviceProviderStore.updatedServiceProvider.url,
                  testId: 'success-url',
                },
                {
                  label: $t('angebot.logo'),
                  value: cachedLogo,
                  testId: 'success-logo',
                  type: 'image',
                },
                {
                  label: $t('angebot.kategorie'),
                  value: $t(
                    `angebot.mappingFrontBackEnd.kategorien.${serviceProviderStore.updatedServiceProvider.kategorie}`,
                  ),
                  testId: 'success-kategorie',
                },
                {
                  label: $t('angebot.canBeAssigned'),
                  value: serviceProviderStore.updatedServiceProvider.merkmale.includes(
                    ServiceProviderMerkmal.NachtraeglichZuweisbar,
                  )
                    ? $t('yes')
                    : $t('no'),
                  testId: 'success-nachtraeglich-zuweisbar',
                },
                {
                  label: $t('angebot.canBeUsed'),
                  value: serviceProviderStore.updatedServiceProvider.merkmale.includes(
                    ServiceProviderMerkmal.VerfuegbarFuerRollenerweiterung,
                  )
                    ? $t('yes')
                    : $t('no'),
                  testId: 'success-verfuegbar-fuer-rollenerweiterung',
                },
                {
                  label: $t('angebot.offeringScope'),
                  value: formatServiceProviderAnbietenMerkmale(
                    serviceProviderStore.updatedServiceProvider.merkmale,
                    $t,
                  ),
                  testId: 'success-anbieten-in-verwaltung',
                },
                {
                  label: $t('angebot.rollenartenWhitelistLabel'),
                  value: formatServiceProviderRollenartenWhitelist(
                    serviceProviderStore.updatedServiceProvider.rollenartenWhitelist,
                    $t,
                  ),
                  testId: 'success-rollenarten-whitelist',
                },
                {
                  label: $t('angebot.requires2FA'),
                  value: serviceProviderStore.updatedServiceProvider.requires2fa ? $t('yes') : $t('no'),
                  testId: 'success-requires-2fa',
                },
              ],
            }"
            :show-to-service-provider-details-button="true"
            :to-service-provider-details-button-text="$t('angebot.backToServiceProvider')"
            toServiceProviderDetailsButtonTestId="to-service-provider-details-button"
            @toServiceProviderDetails="navigateToServiceProviderDetails"
          >
            <v-col
              cols="12"
              sm="6"
              md="auto"
            >
              <v-btn
                class="secondary"
                :block="mdAndDown"
                data-testid="to-service-provider-list-button"
                @click="navigateToServiceProviderList"
              >
                {{ $t('angebot.backToServiceProviderList') }}
              </v-btn>
            </v-col>
          </SuccessTemplate>
        </template>
        <template v-else>
          <ServiceProviderForm
            v-if="serviceProviderStore.currentServiceProvider"
            :is-edit-mode="true"
            :initialValues="initialValues ?? {}"
            :cachedValues
            :systemrecht
            :loading="serviceProviderStore.loading"
            :showUnsavedChangesDialog="showUnsavedChangesDialog"
            @update:dirty="(value: boolean) => (isDirty = value)"
            @click:submit="submit"
            @click:discard="navigateToServiceProviderList"
            @update:showUnsavedChangesDialog="(visible: boolean) => (showUnsavedChangesDialog = visible)"
            @click:confirmUnsaved="confirmUnsavedChanges"
          />
        </template>
      </template>
    </LayoutCard>
  </div>
</template>
