<script setup lang="ts">
  import RolleForm from '@/components/admin/rollen/RolleForm.vue';
  import RolleSuccessTemplate from '@/components/admin/rollen/RolleSuccessTemplate.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { useMasterDataStore, type MasterDataStore } from '@/stores/MasterDataStore';
  import { OrganisationsTyp, useOrganisationStore, type OrganisationStore } from '@/stores/OrganisationStore';
  import {
    RollenArt,
    RollenMerkmal,
    RollenSystemRecht,
    useRolleStore,
    type RolleFormType,
    type RolleStore,
  } from '@/stores/RolleStore';
  import {
    useServiceProviderStore,
    type BaseServiceProvider,
    type ServiceProviderIdNameResponse,
    type ServiceProviderStore,
  } from '@/stores/ServiceProviderStore';
  import { type TranslatedObject } from '@/types.d';
  import {
    getDirtyState,
    getRolleFieldDefinitions,
    getValidationSchema,
    type RolleFieldDefinitions,
  } from '@/utils/validationRolle';
  import { useForm, type FormContext, type TypedSchema } from 'vee-validate';
  import { computed, onMounted, onUnmounted, ref, watch, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import {
    onBeforeRouteLeave,
    useRouter,
    type NavigationGuardNext,
    type RouteLocationNormalized,
    type Router,
  } from 'vue-router';

  const masterDataStore: MasterDataStore = useMasterDataStore();
  const rolleStore: RolleStore = useRolleStore();
  const organisationStore: OrganisationStore = useOrganisationStore();
  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();

  const { t }: Composer = useI18n({ useScope: 'global' });
  const router: Router = useRouter();
  const validationSchema: TypedSchema = getValidationSchema(t);

  type TranslatedRollenArt = { value: RollenArt; title: string };
  const translatedRollenarten: Ref<TranslatedRollenArt[]> = ref([]);

  type TranslatedMerkmal = { value: RollenMerkmal; title: string };
  const translatedMerkmale: Ref<TranslatedMerkmal[]> = ref([]);

  type TranslatedSystemrecht = { value: RollenSystemRecht; title: string };
  const translatedSystemrechte: Ref<TranslatedSystemrecht[]> = ref([]);

  const formContext: FormContext<RolleFormType, RolleFormType> = useForm<RolleFormType>({ validationSchema });

  const {
    selectedAdministrationsebene,
    selectedAdministrationsebeneProps,
    selectedRollenArt,
    selectedRollenArtProps,
    selectedRollenName,
    selectedRollenNameProps,
    selectedMerkmale,
    selectedMerkmaleProps,
    selectedServiceProviders,
    selectedServiceProvidersProps,
    selectedSystemRechte,
    selectedSystemRechteProps,
  }: RolleFieldDefinitions = getRolleFieldDefinitions(formContext);

  const isFormDirty: ComputedRef<boolean> = computed(() => getDirtyState(formContext));

  const showUnsavedChangesDialog: Ref<boolean> = ref(false);
  let blockedNext: () => void = () => {
    /* empty */
  };

  const handleCreateAnotherRolle = (): void => {
    rolleStore.createdRolle = null;
    // When creating another Rolle, we want to reset the form, refresh the organisations and navigate to the create Rolle page.
    formContext.resetForm();
    organisationStore.getAllOrganisationen({
      systemrechte: ['ROLLEN_VERWALTEN'],
      excludeTyp: [OrganisationsTyp.Klasse],
      limit: 25,
    });
    router.push({ name: 'create-rolle' });
  };

  function handleConfirmUnsavedChanges(): void {
    blockedNext();
    rolleStore.errorCode = '';
  }

  async function navigateBackToRolleForm(): Promise<void> {
    if (rolleStore.errorCode === 'REQUIRED_STEP_UP_LEVEL_NOT_MET') {
      formContext.resetForm();
      await router.push({ name: 'create-rolle' }).then(() => {
        router.go(0);
      });
    } else {
      rolleStore.errorCode = '';
      await router.push({ name: 'create-rolle' });
    }
  }

  async function navigateToRolleManagement(): Promise<void> {
    await router.push({ name: 'rolle-management' }).then(() => {
      router.go(0);
    });
    formContext.resetForm();
    rolleStore.createdRolle = null;
  }

  function getSskName(sskDstNr: string | null | undefined, sskName: string | null | undefined): string {
    /* omit parens when there is no ssk kennung  */
    if (sskDstNr) {
      return `${sskDstNr} (${sskName})`;
    } else {
      return sskName || '';
    }
  }

  const translatedCreatedRolleMerkmale: ComputedRef<string> = computed(() => {
    if (!rolleStore.createdRolle?.merkmale || Array.from(rolleStore.createdRolle.merkmale).length === 0) {
      return '---';
    }

    return Array.from(rolleStore.createdRolle.merkmale)
      .map((merkmalKey: string) => {
        return t(`admin.rolle.mappingFrontBackEnd.merkmale.${merkmalKey}`);
      })
      .join(', ');
  });

  const translatedCreatedAngebote: ComputedRef<string> = computed(() => {
    if (
      !rolleStore.createdRolle?.serviceProviders ||
      Array.from(rolleStore.createdRolle.serviceProviders).length === 0
    ) {
      return '---';
    }

    return rolleStore.createdRolle.serviceProviders
      .map((serviceProvider: ServiceProviderIdNameResponse) => {
        return serviceProvider.name;
      })
      .join(', ');
  });

  const translatedCreatedSystemrecht: ComputedRef<string> = computed(() => {
    if (!rolleStore.createdRolle?.systemrechte || Array.from(rolleStore.createdRolle.systemrechte).length === 0) {
      return '---';
    }

    return Array.from(rolleStore.createdRolle.systemrechte)
      .map((systemrechtKey: string) => {
        return t(`admin.rolle.mappingFrontBackEnd.systemrechte.${systemrechtKey}`);
      })
      .join(', ');
  });

  const serviceProviders: ComputedRef<TranslatedObject[]> = computed(() =>
    serviceProviderStore.allServiceProviders.map((provider: BaseServiceProvider) => ({
      value: provider.id,
      title: provider.name,
    })),
  );

  function preventNavigation(event: BeforeUnloadEvent): void {
    if (rolleStore.errorCode) {
      formContext.resetForm();
    }
    if (!isFormDirty.value) {
      return;
    }
    event.preventDefault();
    /* Chrome requires returnValue to be set. */
    event.returnValue = '';
  }

  onBeforeRouteLeave((_to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    if (isFormDirty.value) {
      showUnsavedChangesDialog.value = true;
      blockedNext = next;
    } else {
      next();
    }
    rolleStore.createdRolle = null;
  });

  onMounted(() => {
    rolleStore.createdRolle = null;

    // Iterate over the enum values
    Object.values(RollenArt).forEach((enumValue: RollenArt) => {
      // Use the enum value to construct the i18n path
      const i18nPath: string = `admin.rolle.mappingFrontBackEnd.rollenarten.${enumValue}`;
      // Push the mapped object into the array
      translatedRollenarten.value.push({
        value: enumValue, // Keep the enum value for internal use
        title: t(i18nPath), // Get the localized title
      });
    });

    Object.values(RollenMerkmal).forEach((enumValue: RollenMerkmal) => {
      const i18nPath: string = `admin.rolle.mappingFrontBackEnd.merkmale.${enumValue}`;
      translatedMerkmale.value.push({
        value: enumValue,
        title: t(i18nPath),
      });
    });

    Object.values(RollenSystemRecht).forEach((enumValue: RollenSystemRecht) => {
      if (!masterDataStore.isHiddenSystemrecht(enumValue)) {
        const i18nPath: string = `admin.rolle.mappingFrontBackEnd.systemrechte.${enumValue}`;
        translatedSystemrechte.value.push({
          value: enumValue,
          title: t(i18nPath),
        });
      }
    });

    /* listen for browser changes and prevent them when form is dirty */
    window.addEventListener('beforeunload', preventNavigation);
  });

  onUnmounted(() => {
    window.removeEventListener('beforeunload', preventNavigation);
  });

  const onSubmit: (e?: Event) => Promise<Promise<void> | undefined> = formContext.handleSubmit(async () => {
    if (selectedRollenName.value && selectedAdministrationsebene.value && selectedRollenArt.value) {
      const merkmaleToSubmit: RollenMerkmal[] = selectedMerkmale.value?.map((m: RollenMerkmal) => m) || [];
      const systemrechteToSubmit: RollenSystemRecht[] =
        selectedSystemRechte.value?.map((m: RollenSystemRecht) => m) || [];
      await rolleStore.createRolle(
        selectedRollenName.value,
        selectedAdministrationsebene.value,
        selectedRollenArt.value,
        merkmaleToSubmit,
        systemrechteToSubmit,
        selectedServiceProviders.value ?? [],
      );
      // If the creation failed, do not proceed with assigning service providers
      if (rolleStore.errorCode) {
        return;
      }

      formContext.resetForm();

      if (rolleStore.createdRolle) {
        await organisationStore.getOrganisationById(
          rolleStore.createdRolle.administeredBySchulstrukturknoten,
          OrganisationsTyp.Schule,
        );
      }
    }
  });

  watch(
    [selectedAdministrationsebene, selectedRollenArt],
    async ([administrationsebene, rollenArt]: [string | undefined, RollenArt | undefined]) => {
      selectedServiceProviders.value = [];
      if (administrationsebene && rollenArt) {
        await serviceProviderStore.getAssignableServiceProvidersForRolleByOrganisationId(
          administrationsebene, rollenArt
        );
      }
    },
    { immediate: true },
  );
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
      :closable="!rolleStore.errorCode"
      @onCloseClicked="navigateToRolleManagement"
      :header="$t('admin.rolle.addNew')"
      headlineTestId="rolle-creation-headline"
      :padded="true"
      :showCloseText="true"
    >
      <!-- The form to create a new Rolle -->
      <template v-if="!rolleStore.createdRolle">
        <RolleForm
          :error-code="rolleStore.errorCode"
          :on-handle-confirm-unsaved-changes="handleConfirmUnsavedChanges"
          :on-handle-discard="navigateToRolleManagement"
          :on-show-dialog-change="(value?: boolean) => (showUnsavedChangesDialog = value || false)"
          :on-submit="onSubmit"
          :is-edit-active="true"
          :is-loading="rolleStore.loading"
          ref="rolle-creation-form"
          v-model:selected-administrationsebene="selectedAdministrationsebene"
          :selected-administrationsebene-props="selectedAdministrationsebeneProps"
          v-model:selected-rollen-art="selectedRollenArt"
          :selected-rollen-art-props="selectedRollenArtProps"
          v-model:selected-rollen-name="selectedRollenName"
          :selected-rollen-name-props="selectedRollenNameProps"
          v-model:selected-merkmale="selectedMerkmale"
          :selected-merkmale-props="selectedMerkmaleProps"
          v-model:selected-service-providers="selectedServiceProviders"
          :selected-service-providers-props="selectedServiceProvidersProps"
          v-model:selected-system-rechte="selectedSystemRechte"
          :selected-system-rechte-props="selectedSystemRechteProps"
          :service-providers="serviceProviders"
          :show-unsaved-changes-dialog="showUnsavedChangesDialog"
          :translated-rollenarten="translatedRollenarten"
          :translated-merkmale="translatedMerkmale"
          :translated-systemrechte="translatedSystemrechte"
        >
          <!-- Error Message Display if error on submit -->
          <!-- To trigger unsaved changes dialog the alert has to be inside the form wrapper -->
          <SpshAlert
            :model-value="!!rolleStore.errorCode"
            :title="t('admin.rolle.rolleCreateErrorTitle')"
            :type="'error'"
            :closable="false"
            :text="rolleStore.errorCode ? $t(`admin.rolle.errors.${rolleStore.errorCode}`) : ''"
            :show-button="true"
            :button-text="$t('admin.rolle.backToCreateRolle')"
            :button-action="navigateBackToRolleForm"
          />
        </RolleForm>
      </template>

      <!-- Result template on success after submit  -->
      <template v-if="rolleStore.createdRolle && !rolleStore.errorCode">
        <RolleSuccessTemplate
          :success-message="$t('admin.rolle.rolleAddedSuccessfully')"
          :following-rolle-data-created="$t('admin.followingDataCreated')"
          :created-rolle-data="[
            {
              label: $t('admin.administrationsebene.administrationsebene'),
              value: getSskName(
                organisationStore.currentOrganisation?.kennung,
                organisationStore.currentOrganisation?.name,
              ),
              testId: 'created-rolle-administrationsebene',
            },
            {
              label: $t('admin.rolle.rollenart'),
              value: $t(`admin.rolle.mappingFrontBackEnd.rollenarten.${rolleStore.createdRolle.rollenart}`),
              testId: 'created-rolle-rollenart',
            },
            { label: $t('admin.rolle.rollenname'), value: rolleStore.createdRolle.name, testId: 'created-rolle-name' },
            {
              label: $t('admin.rolle.merkmale'),
              value: translatedCreatedRolleMerkmale,
              testId: 'created-rolle-merkmale',
            },
            {
              label: $t('admin.serviceProvider.assignedServiceProvider'),
              value: translatedCreatedAngebote,
              testId: 'created-rolle-angebote',
            },
            {
              label: $t('admin.rolle.systemrechte'),
              value: translatedCreatedSystemrecht,
              testId: 'created-rolle-systemrecht',
            },
          ]"
          :back-button-text="$t('nav.backToList')"
          :create-another-rolle-button-text="$t('admin.rolle.createAnother')"
          :show-create-another-rolle-button="true"
          back-button-test-id="back-to-list-button"
          create-another-button-test-id="create-another-rolle-button"
          @on-navigate-back-to-rolle-management="navigateToRolleManagement"
          @on-create-another-rolle="handleCreateAnotherRolle"
        />
      </template>
    </LayoutCard>
  </div>
</template>

<style></style>
