<script setup lang="ts">
  import SchuleForm, { type SchuleDetailsForm } from '@/components/admin/schulen/SchuleForm.vue';
  import SchuleSuccessTemplate from '@/components/admin/schulen/SchuleSuccessTemplate.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { Organisation, OrganisationStore, useOrganisationStore } from '@/stores/OrganisationStore';
  import { computed, ComputedRef, onMounted, onUnmounted, ref, Ref } from 'vue';
  import { Composer, useI18n } from 'vue-i18n';
  import {
    NavigationGuardNext,
    onBeforeRouteLeave,
    RouteLocationNormalized,
    useRoute,
    useRouter,
    type RouteLocationNormalizedLoaded,
    type Router,
  } from 'vue-router';

  const organisationStore: OrganisationStore = useOrganisationStore();

  const router: Router = useRouter();
  const route: RouteLocationNormalizedLoaded = useRoute();
  const { t }: Composer = useI18n({ useScope: 'global' });
  const currentSchuleId: string = route.params['id'] as string;
  const isDirty: Ref<boolean> = ref(false);
  const showUnsavedChangesDialog: Ref<boolean> = ref(false);
  const showSuccess: Ref<boolean> = ref(false);

  const onSubmit = async ({
    selectedSchulform,
    selectedSchulname,
    selectedEmailAdress,
  }: SchuleDetailsForm): Promise<void> => {
    await organisationStore.updateSchuleDetails({
      organisationId: currentSchuleId,
      schultraegerform: selectedSchulform as string,
      name: selectedSchulname as string,
      emailAdress: selectedEmailAdress as string,
    });
    if (!organisationStore.errorCode) {
      isDirty.value = false;
      showSuccess.value = true;
    }
  };

  const schultraegerList: ComputedRef<Organisation[] | undefined> = computed(() => {
    return organisationStore.schultraeger;
  });

  const cachedFormValues: ComputedRef<Partial<SchuleDetailsForm>> = computed(() => ({
    selectedSchulform: organisationStore.currentSchule?.administriertVon,
    selectedDienststellennummer: organisationStore.currentSchule?.kennung,
    selectedSchulname: organisationStore.currentSchule?.name,
    selectedEmailAdress: organisationStore.currentSchule?.emailAdress,
  }));

  let blockedNext = (): void => {
    /* empty */
  };

  const navigateToSchuleManagement = (): void => {
    router.push({ name: 'schule-management' });
  };

  const navigateToSchuleBearbeiten = (): void => {
    showSuccess.value = false;
    organisationStore.errorCode = '';
    router.push({ name: 'schule-edit', params: { id: currentSchuleId } });
  };

  function handleConfirmUnsavedChanges(): void {
    blockedNext();
    organisationStore.errorCode = '';
  }

  function preventNavigation(event: BeforeUnloadEvent): void {
    if (!isDirty.value) {
      return;
    }
    event.preventDefault();
    /* Chrome requires returnValue to be set. */
    event.returnValue = '';
  }

  onBeforeRouteLeave((_to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    if (isDirty.value) {
      showUnsavedChangesDialog.value = true;
      blockedNext = next;
    } else {
      next();
    }
  });

  onMounted(async () => {
    await organisationStore.fetchSchulDetails(currentSchuleId);
    await organisationStore.getRootKinderSchultraeger();

    /* listen for browser changes and prevent them when form is dirty */
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
      :closable="!organisationStore.errorCode"
      data-testid="schule-details-card"
      :header="t('admin.schule.edit')"
      @onCloseClicked="navigateToSchuleManagement"
      :padded="true"
      :showCloseText="true"
    >
      <template v-if="!showSuccess">
        <!-- Error Message Display if error on submit -->
        <SpshAlert
          :model-value="!!organisationStore.errorCode"
          :title="$t('admin.schule.schuleCreateErrorTitle')"
          :type="'error'"
          :closable="false"
          :text="organisationStore.errorCode ? $t(`admin.schule.errors.${organisationStore.errorCode}`) : ''"
          :show-button="true"
          :button-text="$t('admin.schule.backToCreateSchule')"
          :button-action="navigateToSchuleBearbeiten"
          button-class="primary"
        />
        <SchuleForm
          v-if="!organisationStore.errorCode"
          :show-unsaved-changes-dialog="showUnsavedChangesDialog"
          :cached-values="cachedFormValues"
          :is-edit-mode="true"
          :error-code="organisationStore.errorCode"
          :is-loading="organisationStore.loading"
          :schultraeger-list="schultraegerList"
          @update:dirty="(value: boolean) => (isDirty = value)"
          @click:submit="onSubmit"
          @click:discard="navigateToSchuleManagement"
          @update:showUnsavedChangesDialog="(visible: boolean) => (showUnsavedChangesDialog = visible)"
          @click:confirmUnsaved="handleConfirmUnsavedChanges"
        />
      </template>
      <!-- Result template on success after submit (Present value in createdSchule and no errorCode)  -->
      <template v-if="showSuccess && !organisationStore.errorCode">
        <SchuleSuccessTemplate
          :is-edit-mode="true"
          :successMessage="$t('admin.schule.schuleAddedSuccessfully')"
          :followingDataChanged="organisationStore?.updatedOrganisation"
          :schultraeger-list="schultraegerList"
          @onNavigateBackToSchuleManagement="navigateToSchuleManagement"
          @onNavigateToSchuleForm="navigateToSchuleBearbeiten"
        />
      </template>
    </LayoutCard>
  </div>
</template>
