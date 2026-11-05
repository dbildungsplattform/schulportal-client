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
  import { useAutoselectedSchule } from '@/composables/useAutoselectedSchule';
  import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
  import type { Organisation } from '@/stores/OrganisationStore';
  import { RollenSystemRecht } from '@/stores/RolleStore';
  import {
    ServiceProviderKategorie,
    ServiceProviderMerkmal,
    useServiceProviderStore,
    type ServiceProviderStore,
  } from '@/stores/ServiceProviderStore';
  import { getLogoName } from '@/utils/logosConfig';
  import { computed, onMounted, onUnmounted, ref, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import {
    onBeforeRouteLeave,
    useRouter,
    type NavigationGuardNext,
    type RouteLocationNormalized,
    type Router,
  } from 'vue-router';

  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
  const authStore: AuthStore = useAuthStore();

  const router: Router = useRouter();
  const { t }: Composer = useI18n({ useScope: 'global' });

  const showSuccess: Ref<boolean> = ref(false);

  const selectedOrganisationIdCache: Ref<string | undefined> = ref(undefined);
  const selectedOrganisationNameCache: Ref<string | undefined> = ref(undefined);

  const isDirty: Ref<boolean> = ref(false);

  const relevantSystemrecht: ComputedRef<RollenSystemRecht> = computed(() => {
    if (authStore.hasAngeboteVerwaltenPermission) {
      return RollenSystemRecht.AngeboteVerwalten;
    }
    return RollenSystemRecht.AngeboteEingeschraenktVerwalten;
  });
  const autoSelectedSchuleId: ComputedRef<string | undefined> = computed(() => {
    const { autoselectedSchule }: { autoselectedSchule: ComputedRef<Organisation | null> } = useAutoselectedSchule([
      relevantSystemrecht.value,
    ]);
    return autoselectedSchule.value?.id;
  });

  const selectedOrganisationName: ComputedRef<string> = computed(() => selectedOrganisationNameCache.value || '');
  /**
   * Stores submitted data to restore it in case of an error.
   */
  const cachedValues: Ref<ServiceProviderFormType | undefined> = ref(undefined);
  function cacheSubmittedValues(values: ServiceProviderFormSubmitData): void {
    cachedValues.value = {
      selectedOrganisationId: values.selectedOrganisation?.id,
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

  function navigateToServiceProviderDetails(): void {
    if (serviceProviderStore.createdServiceProvider) {
      const id: string = serviceProviderStore.createdServiceProvider.id;
      selectedOrganisationNameCache.value = '';
      serviceProviderStore.errorCode = '';
      router.push({
        name: 'angebot-details-schulspezifisch',
        params: { id },
        query: {
          from: 'create-angebot',
          orga: selectedOrganisationIdCache.value,
          autoEdit: 'true',
        },
      });
    }
  }

  function navigateToServiceProviderTable(): void {
    selectedOrganisationNameCache.value = '';
    serviceProviderStore.errorCode = '';
    serviceProviderStore.createdServiceProvider = null;
    router.push({ name: 'angebot-management-schulspezifisch' }).then(() => router.go(0));
  }

  function navigateToCreatePersonRoute(reload: boolean = false): void | Promise<void> {
    let routeName: string;
    routeName = 'create-angebot';

    if (reload) {
      return router.push({ name: routeName }).then(() => router.go(0));
    } else {
      router.push({ name: routeName });
    }
  }

  function navigateBackToAngebotForm(): void {
    if (serviceProviderStore.errorCode === 'REQUIRED_STEP_UP_LEVEL_NOT_MET') {
      selectedOrganisationNameCache.value = '';
      navigateToCreatePersonRoute(true);
    } else {
      serviceProviderStore.errorCode = '';
      navigateToCreatePersonRoute();
    }
  }

  const showUnsavedChangesDialog: Ref<boolean> = ref(false);
  let blockedNext: () => void = () => {
    /* empty */
  };

  function handleConfirmUnsavedChanges(): void {
    blockedNext();
    serviceProviderStore.errorCode = '';
  }

  function preventNavigation(event: BeforeUnloadEvent): void {
    if (!isDirty.value) {
      return;
    }
    event.preventDefault();
    event.returnValue = '';
  }

  async function onSubmit(values: ServiceProviderFormSubmitData): Promise<void> {
    if (!values.selectedOrganisation) {
      return;
    }
    cacheSubmittedValues(values);
    await serviceProviderStore.createServiceProvider({
      organisationId: values.selectedOrganisation.id,
      name: values.name,
      url: values.url,
      logoId: values.logoId,
      kategorie: values.kategorie,
      requires2fa: values.requires2fa,
      merkmale: values.merkmale,
      rollenartenWhitelist: values.rollenartenWhitelist,
    });

    if (!serviceProviderStore.errorCode) {
      isDirty.value = false;
      showSuccess.value = true;
      selectedOrganisationIdCache.value = values.selectedOrganisation.id;
      selectedOrganisationNameCache.value = values.selectedOrganisation.name;
    }
  }

  onBeforeRouteLeave((_to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    if (isDirty.value) {
      showUnsavedChangesDialog.value = true;
      blockedNext = next;
    } else {
      next();
    }
  });

  onMounted(() => {
    serviceProviderStore.errorCode = '';
    serviceProviderStore.createdServiceProvider = null;
    window.addEventListener('beforeunload', preventNavigation);
  });

  onUnmounted(() => {
    window.removeEventListener('beforeunload', preventNavigation);
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
      :closable="!serviceProviderStore.errorCode && !serviceProviderStore.createdServiceProvider"
      :header="`${t('angebot.addNew')} ${selectedOrganisationName}`"
      :header-hover-text="selectedOrganisationName"
      headlineTestId="service-provider-create-headline"
      @onCloseClicked="navigateToServiceProviderTable"
      :padded="true"
      :showCloseText="true"
    >
      <!-- The form to create a new Angebot -->
      <template v-if="!serviceProviderStore.createdServiceProvider">
        <!-- Error Message -->
        <SpshAlert
          :model-value="!!serviceProviderStore.errorCode"
          :title="$t('angebot.angebotCreateErrorTitle')"
          :type="'error'"
          :closable="false"
          :show-button="true"
          :button-action="navigateBackToAngebotForm"
          :button-text="$t('angebot.backToCreateAngebot')"
          :text="$t(`angebot.errors.${serviceProviderStore.errorCode}`)"
        />
        <ServiceProviderForm
          v-if="!serviceProviderStore.errorCode"
          :initial-values="{
            selectedOrganisationId: autoSelectedSchuleId,
            name: '',
            url: '',
            logoId: undefined,
            kategorie: ServiceProviderKategorie.Schulisch,
            nachtraeglichZuweisbar: true,
            verfuegbarFuerRollenerweiterung: true,
            anbietenInMerkmale: extractAnbietenInMerkmale(Object.values(ServiceProviderMerkmal)),
            rollenartenWhitelist: [],
            requires2fa: false,
          }"
          :cached-values="cachedValues"
          :show-unsaved-changes-dialog="showUnsavedChangesDialog"
          :systemrecht="relevantSystemrecht"
          :error-code="serviceProviderStore.errorCode"
          :loading="serviceProviderStore.loading"
          @update:dirty="(value: boolean) => (isDirty = value)"
          @click:submit="onSubmit"
          @click:discard="navigateToServiceProviderTable"
          @update:showUnsavedChangesDialog="(visible: boolean) => (showUnsavedChangesDialog = visible)"
          @click:confirmUnsaved="handleConfirmUnsavedChanges"
        />
      </template>

      <!-- Result template on success after submit  -->
      <template v-if="serviceProviderStore.createdServiceProvider && !serviceProviderStore.errorCode">
        <SuccessTemplate
          v-if="showSuccess && serviceProviderStore.createdServiceProvider"
          :success="{
            message: $t('angebot.angebotAddedSuccessfully', { name: serviceProviderStore.createdServiceProvider.name }),
            followingDataChanged: $t('admin.followingDataCreated'),
            data: [
              { label: $t('angebot.providedBy'), value: selectedOrganisationName!, testId: 'success-organisation' },
              {
                label: $t('angebot.name'),
                value: serviceProviderStore.createdServiceProvider.name,
                testId: 'success-name',
              },
              {
                label: $t('angebot.url'),
                value: serviceProviderStore.createdServiceProvider.url,
                testId: 'success-url',
              },
              {
                label: $t('angebot.logo'),
                value: serviceProviderStore.createdServiceProvider.logoId,
                testId: 'success-logo',
                type: 'image',
                alt: getLogoName(serviceProviderStore.createdServiceProvider.logoId),
              },
              {
                label: $t('angebot.kategorie'),
                value: $t(
                  `angebot.mappingFrontBackEnd.kategorien.${serviceProviderStore.createdServiceProvider.kategorie}`,
                ),
                testId: 'success-kategorie',
              },
              {
                label: $t('angebot.canBeAssigned'),
                value: serviceProviderStore.createdServiceProvider.merkmale.includes(
                  ServiceProviderMerkmal.NachtraeglichZuweisbar,
                )
                  ? $t('yes')
                  : $t('no'),
                testId: 'success-nachtraeglich-zuweisbar',
              },
              {
                label: $t('angebot.canBeUsed'),
                value: serviceProviderStore.createdServiceProvider.merkmale.includes(
                  ServiceProviderMerkmal.VerfuegbarFuerRollenerweiterung,
                )
                  ? $t('yes')
                  : $t('no'),
                testId: 'success-verfuegbar-fuer-rollenerweiterung',
              },
              {
                label: $t('angebot.offeringScope'),
                value: formatServiceProviderAnbietenMerkmale(serviceProviderStore.createdServiceProvider.merkmale, $t),
                testId: 'success-anbieten-in-verwaltung',
              },
              {
                label: $t('angebot.rollenartenWhitelistLabel'),
                value: formatServiceProviderRollenartenWhitelist(
                  serviceProviderStore.createdServiceProvider.rollenartenWhitelist,
                  $t,
                ),
                testId: 'success-rollenarten-whitelist',
              },
              {
                label: $t('angebot.requires2FA'),
                value: serviceProviderStore.createdServiceProvider.requires2fa ? $t('yes') : $t('no'),
                testId: 'success-requires-2fa',
              },
            ],
          }"
          :show-to-service-provider-details-button="true"
          :to-service-provider-details-button-text="$t('angebot.toServiceProviderDetails')"
          :showBackButton="true"
          :showCreateAnotherButton="true"
          toServiceProviderDetailsButtonTestId="to-service-provider-details-button"
          @toServiceProviderDetails="navigateToServiceProviderDetails"
        />
      </template>
    </LayoutCard>
  </div>
</template>
