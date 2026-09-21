<script setup lang="ts">
  import RolleDelete from '@/components/admin/rollen/RolleDelete.vue';
  import RolleForm from '@/components/admin/rollen/RolleForm.vue';
  import RolleSuccessTemplate from '@/components/admin/rollen/RolleSuccessTemplate.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { useMasterDataStore, type MasterDataStore } from '@/stores/MasterDataStore';
  import {
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

  import type { RollenArt, SystemRechtResponse } from '@/api-client/generated';
  import {
    getDirtyState,
    getRolleFieldDefinitions,
    getValidationSchema,
    type RolleFieldDefinitions,
  } from '@/utils/validationRolle';
  import { useForm, type FormContext, type TypedSchema } from 'vee-validate';
  import { computed, onBeforeMount, onUnmounted, ref, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import {
    onBeforeRouteLeave,
    useRoute,
    useRouter,
    type NavigationGuardNext,
    type RouteLocationNormalized,
    type RouteLocationNormalizedLoaded,
    type Router,
  } from 'vue-router';
  import { useDisplay } from 'vuetify';

  const route: RouteLocationNormalizedLoaded = useRoute();
  const router: Router = useRouter();
  const { t }: Composer = useI18n({ useScope: 'global' });
  const validationSchema: TypedSchema = getValidationSchema(t);

  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  const masterDataStore: MasterDataStore = useMasterDataStore();
  const rolleStore: RolleStore = useRolleStore();
  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();

  const currentRolleId: string = route.params['id'] as string;
  const isEditActive: Ref<boolean> = ref(false);

  const creationErrorText: Ref<string> = ref('');
  const creationErrorTitle: Ref<string> = ref('');

  type TranslatedMerkmal = { value: RollenMerkmal; title: string };
  const allMerkmale: Ref<TranslatedMerkmal[]> = ref([]);

  type TranslatedSystemrecht = { value: RollenSystemRecht; title: string };
  const allSystemrechte: Ref<TranslatedSystemrecht[]> = ref([]);

  const showUnsavedChangesDialog: Ref<boolean> = ref(false);

  const translatedRollenart: ComputedRef<string> = computed(() => {
    return t(`admin.rolle.mappingFrontBackEnd.rollenarten.${rolleStore.currentRolle?.rollenart}`);
  });

  const translatedProviderNames: ComputedRef<TranslatedObject[]> = computed(() => {
    const serviceProviders: Array<ServiceProviderIdNameResponse> = Array.from(
      rolleStore.currentRolle?.serviceProviders || [],
    );
    return serviceProviders.map((provider: ServiceProviderIdNameResponse) => ({
      value: provider.id,
      title: provider.name,
    }));
  });

  const translatedMerkmale: ComputedRef<TranslatedObject[]> = computed(() => {
    const merkmale: Array<RollenMerkmal> = Array.from(rolleStore.currentRolle?.merkmale || []);
    return merkmale.map((merkmalKey: RollenMerkmal) => ({
      value: merkmalKey,
      title: t(`admin.rolle.mappingFrontBackEnd.merkmale.${merkmalKey}`),
    }));
  });

  const translatedSystemrechte: ComputedRef<TranslatedObject[]> = computed(() => {
    const systemrechte: Array<RollenSystemRecht> = Array.from(rolleStore.currentRolle?.systemrechte || []);
    return systemrechte.map((systemrechtKey: RollenSystemRecht) => ({
      value: systemrechtKey,
      title: t(`admin.rolle.mappingFrontBackEnd.systemrechte.${systemrechtKey}`),
    }));
  });

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

  const isFormDirty: ComputedRef<boolean> = computed(() => (isEditActive.value ? getDirtyState(formContext) : false));

  let blockedNext: () => void = () => {
    /* empty */
  };

  const serviceProviders: ComputedRef<
    {
      value: string;
      title: string;
    }[]
  > = computed(() =>
    serviceProviderStore.allServiceProviders.map((provider: BaseServiceProvider) => ({
      value: provider.id,
      title: provider.name,
    })),
  );

  function handleConfirmUnsavedChanges(): void {
    isEditActive.value = false;
    showUnsavedChangesDialog.value = false;
    blockedNext();
    rolleStore.errorCode = '';
  }

  const onSubmit: (e?: Event) => Promise<Promise<void> | undefined> = formContext.handleSubmit(async () => {
    if (selectedRollenName.value && selectedAdministrationsebene.value && selectedRollenArt.value) {
      if (rolleStore.currentRolle) {
        try {
          await rolleStore.updateRolle(
            rolleStore.currentRolle.id,
            selectedRollenName.value,
            selectedMerkmale.value || [],
            selectedSystemRechte.value || [],
            selectedServiceProviders.value || [],
            rolleStore.currentRolle.version,
          );
        } catch {
          creationErrorText.value = t(`admin.rolle.errors.${rolleStore.errorCode}`);
          creationErrorTitle.value = t(`admin.rolle.title.${rolleStore.errorCode}`);
        }
      }
      formContext.resetForm();
    }
  });

  const translatedUpdatedRolleMerkmale: ComputedRef<string> = computed(() => {
    if (!rolleStore.updatedRolle?.merkmale || Array.from(rolleStore.updatedRolle.merkmale).length === 0) {
      return '---';
    }

    return Array.from(rolleStore.updatedRolle.merkmale)
      .map((merkmalKey: string) => {
        return t(`admin.rolle.mappingFrontBackEnd.merkmale.${merkmalKey}`);
      })
      .join(', ');
  });

  const translatedUpdatedAngebote: ComputedRef<string> = computed(() => {
    if (
      !rolleStore.updatedRolle?.serviceProviders ||
      Array.from(rolleStore.updatedRolle.serviceProviders).length === 0
    ) {
      return '---';
    }

    return rolleStore.updatedRolle.serviceProviders
      .map((serviceProvider: ServiceProviderIdNameResponse) => {
        return serviceProvider.name;
      })
      .join(', ');
  });

  const translatedUpdatedSystemrecht: ComputedRef<string> = computed(() => {
    if (!rolleStore.updatedRolle?.systemrechte || Array.from(rolleStore.updatedRolle.systemrechte).length === 0) {
      return '---';
    }

    return Array.from(rolleStore.updatedRolle.systemrechte)
      .map((systemrecht: SystemRechtResponse) => {
        return t(`admin.rolle.mappingFrontBackEnd.systemrechte.${systemrecht.name}`);
      })
      .join(', ');
  });

  function activateEditing(): void {
    isEditActive.value = true;
  }

  function cancelEdit(): void {
    isEditActive.value = false;
  }

  function handleCancel(next: NavigationGuardNext): void {
    if (isFormDirty.value) {
      showUnsavedChangesDialog.value = true;
      blockedNext = next;
    } else {
      cancelEdit();
    }
  }

  async function deleteRolle(rolleId: string): Promise<void> {
    await rolleStore.deleteRolleById(rolleId);
  }

  function preventNavigation(event: BeforeUnloadEvent): void {
    if (!isFormDirty.value) {
      return;
    }
    event.preventDefault();
    /* Chrome requires returnValue to be set. */
    event.returnValue = '';
  }

  function navigateToRolleTable(): void {
    rolleStore.updatedRolle = null;
    router.push({ name: 'rolle-management' });
  }

  const handleAlertClose = (): void => {
    rolleStore.errorCode = '';
    navigateToRolleTable();
  };

  onBeforeMount(async () => {
    rolleStore.errorCode = '';
    await rolleStore.getRolleById(currentRolleId);
    if (rolleStore.currentRolle) {
      await serviceProviderStore.getAssignableServiceProvidersForRolleByOrganisationId(
        rolleStore.currentRolle.administeredBySchulstrukturknoten,
        rolleStore.currentRolle.rollenart
      );
    }

    Object.values(RollenMerkmal).forEach((enumValue: RollenMerkmal) => {
      const i18nPath: string = `admin.rolle.mappingFrontBackEnd.merkmale.${enumValue}`;
      allMerkmale.value.push({
        value: enumValue,
        title: t(i18nPath),
      });
    });

    Object.values(RollenSystemRecht).forEach((enumValue: RollenSystemRecht) => {
      if (!masterDataStore.isHiddenSystemrecht(enumValue)) {
        const i18nPath: string = `admin.rolle.mappingFrontBackEnd.systemrechte.${enumValue}`;
        allSystemrechte.value.push({
          value: enumValue,
          title: t(i18nPath),
        });
      }
    });

    // Set the initial values using the computed properties
    formContext.setFieldValue(
      'selectedAdministrationsebene',
      rolleStore.currentRolle?.administeredBySchulstrukturknoten,
    );
    formContext.setFieldValue('selectedRollenArt', translatedRollenart.value as RollenArt);
    formContext.setFieldValue('selectedRollenName', rolleStore.currentRolle?.name);
    formContext.setFieldValue(
      'selectedMerkmale',
      translatedMerkmale.value.map((obj: TranslatedObject) => obj.value),
    );
    formContext.setFieldValue(
      'selectedServiceProviders',
      translatedProviderNames.value.map((obj: TranslatedObject) => obj.value),
    );
    formContext.setFieldValue(
      'selectedSystemRechte',
      translatedSystemrechte.value.map((obj: TranslatedObject) => obj.value),
    );

    /* listen for browser changes and prevent them when form is dirty */
    window.addEventListener('beforeunload', preventNavigation);
  });

  const alertButtonText: ComputedRef<string> = computed(() => {
    return rolleStore.errorCode === 'NEWER_VERSION_OF_ROLLE_AVAILABLE' ? t('refreshData') : t('nav.backToList');
  });

  const alertButtonAction: ComputedRef<() => void> = computed(() => {
    return rolleStore.errorCode === 'NEWER_VERSION_OF_ROLLE_AVAILABLE'
      ? (): void => router.go(0)
      : navigateToRolleTable;
  });

  onBeforeRouteLeave((_to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    if (isFormDirty.value) {
      showUnsavedChangesDialog.value = true;
      blockedNext = next;
    } else {
      next();
    }
    rolleStore.createdRolle = null;
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
      :closable="true"
      :header="$t('admin.rolle.edit')"
      headlineTestId="rolle-details-headline"
      @onCloseClicked="navigateToRolleTable"
      :padded="true"
      :show-close-text="true"
      @on-close-clicked="navigateToRolleTable"
    >
      <template v-if="!rolleStore.updatedRolle">
        <v-container>
          <div v-if="rolleStore.currentRolle">
            <RolleForm
              ref="rolle-form"
              v-model:selected-administrationsebene="selectedAdministrationsebene"
              v-model:selected-rollen-art="selectedRollenArt"
              v-model:selected-rollen-name="selectedRollenName"
              v-model:selected-merkmale="selectedMerkmale"
              v-model:selected-service-providers="selectedServiceProviders"
              v-model:selected-system-rechte="selectedSystemRechte"
              :error-code="rolleStore.errorCode"
              :on-handle-confirm-unsaved-changes="handleConfirmUnsavedChanges"
              :on-handle-discard="navigateToRolleTable"
              :on-show-dialog-change="(value?: boolean) => (showUnsavedChangesDialog = value || false)"
              :on-submit="onSubmit"
              :is-edit-active="isEditActive"
              :is-loading="rolleStore.loading"
              :readonly="true"
              :selected-administrationsebene-props="selectedAdministrationsebeneProps"
              :selected-rollen-art-props="selectedRollenArtProps"
              :selected-rollen-name-props="selectedRollenNameProps"
              :selected-merkmale-props="selectedMerkmaleProps"
              :selected-service-providers-props="selectedServiceProvidersProps"
              :selected-system-rechte-props="selectedSystemRechteProps"
              :service-providers="serviceProviders"
              :translated-merkmale="allMerkmale"
              :translated-systemrechte="allSystemrechte"
              :show-unsaved-changes-dialog="showUnsavedChangesDialog"
            >
              <!-- Error Message Display -->
              <SpshAlert
                v-if="!!rolleStore.errorCode"
                data-test-id-prefix="rolle-details-error"
                :model-value="!!rolleStore.errorCode"
                :title="
                  rolleStore.errorCode === 'UNSPECIFIED_ERROR'
                    ? $t('admin.rolle.loadingErrorTitle')
                    : $t(`admin.rolle.title.${rolleStore.errorCode}`)
                "
                :type="'error'"
                :closable="false"
                :text="
                  rolleStore.errorCode === 'UNSPECIFIED_ERROR'
                    ? $t('admin.rolle.loadingErrorText')
                    : $t(`admin.rolle.errors.${rolleStore.errorCode}`)
                "
                :show-button="true"
                :button-text="alertButtonText"
                :button-action="alertButtonAction"
                @update:model-value="handleAlertClose"
              />
            </RolleForm>
            <template v-if="!rolleStore.errorCode">
              <v-divider
                v-if="isEditActive"
                class="border-opacity-100 rounded"
                color="#E5EAEF"
                thickness="5px"
              />
              <div
                v-if="!isEditActive"
                class="d-flex justify-sm-end"
              >
                <v-row class="pt-3 px-2 justify-end">
                  <v-col
                    cols="12"
                    md="auto"
                    sm="6"
                  >
                    <div class="d-flex justify-sm-end">
                      <RolleDelete
                        :error-code="rolleStore.errorCode"
                        :rolle="rolleStore.currentRolle"
                        :is-loading="rolleStore.loading"
                        @on-delete-rolle="deleteRolle(currentRolleId)"
                      />
                    </div>
                  </v-col>
                  <v-col
                    cols="12"
                    sm="6"
                    md="auto"
                  >
                    <v-btn
                      class="primary"
                      data-testid="rolle-edit-button"
                      @click="activateEditing"
                      :block="mdAndDown"
                    >
                      {{ $t('edit') }}
                    </v-btn>
                  </v-col>
                </v-row>
              </div>
              <div
                v-else
                class="d-flex justify-end"
              >
                <v-row class="pt-3 px-2 save-cancel-row justify-end">
                  <v-col
                    class="cancel-col"
                    cols="12"
                    sm="6"
                    md="auto"
                  >
                    <v-btn
                      class="secondary"
                      data-testid="rolle-edit-cancel-button"
                      :block="mdAndDown"
                      @click="handleCancel"
                    >
                      {{ $t('cancel') }}
                    </v-btn>
                  </v-col>
                  <v-col
                    cols="12"
                    sm="6"
                    md="auto"
                  >
                    <v-btn
                      class="primary"
                      data-testid="rolle-changes-save-button"
                      :block="mdAndDown"
                      :disabled="rolleStore.loading"
                      @click="onSubmit"
                    >
                      {{ $t('save') }}
                    </v-btn>
                  </v-col>
                </v-row>
              </div>
            </template>
          </div>
          <div v-else-if="rolleStore.loading">
            <v-progress-circular indeterminate />
          </div>
        </v-container>
      </template>
      <!-- Result template on success after submit  -->
      <template v-if="rolleStore.updatedRolle && !rolleStore.errorCode">
        <RolleSuccessTemplate
          :success-message="$t('admin.rolle.rolleUpdatedSuccessfully')"
          :following-rolle-data-created="$t('admin.followingDataCreated')"
          :created-rolle-data="[
            { label: $t('admin.rolle.rollenname'), value: rolleStore.updatedRolle?.name, testId: 'updated-rolle-name' },
            {
              label: $t('admin.rolle.merkmale'),
              value: translatedUpdatedRolleMerkmale,
              testId: 'updated-rolle-merkmale',
            },
            {
              label: $t('admin.serviceProvider.assignedServiceProvider'),
              value: translatedUpdatedAngebote,
              testId: 'updated-rolle-angebote',
            },
            {
              label: $t('admin.rolle.systemrechte'),
              value: translatedUpdatedSystemrecht,
              testId: 'updated-rolle-systemrechte',
            },
          ]"
          :back-button-text="$t('nav.backToDetails')"
          :create-another-rolle-button-text="$t('admin.rolle.createAnother')"
          :show-create-another-rolle-button="false"
          back-button-test-id="back-to-details-button"
          create-another-button-test-id="create-another-rolle-button"
          @on-navigate-back-to-rolle-management="router.go(0)"
        />
      </template>
    </LayoutCard>
  </div>
</template>

<style></style>
