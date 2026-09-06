<script setup lang="ts">
  import SchuleForm, { SchuleDetailsForm } from '@/components/admin/schulen/SchuleForm.vue';
  import SchuleSuccessTemplate from '@/components/admin/schulen/SchuleSuccessTemplate.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import {
    OrganisationsTyp,
    useOrganisationStore,
    type Organisation,
    type OrganisationStore,
  } from '@/stores/OrganisationStore';
  import { computed, onMounted, onUnmounted, ref, type ComputedRef, type Ref } from 'vue';
  import { NavigationGuardNext, onBeforeRouteLeave, RouteLocationNormalized, useRouter, type Router } from 'vue-router';

  const initialSchulFormCache: Ref<string> = ref('');
  const isDirty: Ref<boolean> = ref(false);
  const showUnsavedChangesDialog: Ref<boolean> = ref(false);

  const router: Router = useRouter();
  const organisationStore: OrganisationStore = useOrganisationStore();

  const selectedSchulform: Ref<string> = ref<string>('');

  const schultraegerList: ComputedRef<Organisation[] | undefined> = computed(() => {
    return organisationStore.schultraeger;
  });

  let blockedNext = (): void => {
    /* empty */
  };

  const onSubmit = async (payload: SchuleDetailsForm): Promise<void> => {
    await organisationStore.createOrganisation(
      payload.selectedSchulform,
      payload.selectedSchulform,
      payload.selectedDienststellennummer,
      payload.selectedSchulname,
      undefined,
      undefined,
      OrganisationsTyp.Schule,
    );
  };

  onBeforeRouteLeave((_to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    if (isDirty.value) {
      showUnsavedChangesDialog.value = true;
      blockedNext = next;
    } else {
      next();
    }
  });

  const handleCreateAnotherSchule = (): void => {
    organisationStore.createdSchule = null;
    router.push({ name: 'create-schule' });
  };

  function handleConfirmUnsavedChanges(): void {
    blockedNext();
    organisationStore.errorCode = '';
  }

  async function navigateToSchuleManagement(): Promise<void> {
    organisationStore.createdSchule = null;
    await router.push({ name: 'schule-management' }).then(() => {
      router.go(0);
    });
  }

  async function navigateBackToSchuleForm(): Promise<void> {
    if (organisationStore.errorCode === 'REQUIRED_STEP_UP_LEVEL_NOT_MET') {
      await router.push({ name: 'create-schule' }).then(() => {
        router.go(0);
      });
    } else {
      organisationStore.errorCode = '';
      await router.push({ name: 'create-schule' });
    }
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
    organisationStore.createdSchule = null;
    organisationStore.errorCode = '';
    await organisationStore.getRootKinderSchultraeger();

    if (schultraegerList.value && schultraegerList.value.length > 0) {
      const defaultSchulform: string = schultraegerList.value[0]?.id ?? '';
      selectedSchulform.value = defaultSchulform;
      initialSchulFormCache.value = defaultSchulform;
    }
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
      :header="$t('admin.schule.addNew')"
      headlineTestId="schule-creation-headline"
      @onCloseClicked="navigateToSchuleManagement"
      :padded="true"
      :showCloseText="true"
    >
      <!-- The form to create a new school (No created school yet and no errorCode) -->
      <template v-if="!organisationStore.createdSchule">
        <!-- Error Message Display if error on submit -->
        <SpshAlert
          :model-value="!!organisationStore.errorCode"
          :title="$t('admin.schule.schuleCreateErrorTitle')"
          :type="'error'"
          :closable="false"
          :text="$t(`admin.schule.errors.${organisationStore.errorCode}`)"
          :show-button="true"
          :button-text="$t('admin.schule.backToCreateSchule')"
          :button-action="navigateBackToSchuleForm"
          button-class="primary"
        />
        <SchuleForm
          :show-unsaved-changes-dialog="showUnsavedChangesDialog"
          :is-edit-mode="false"
          :organisation-store="organisationStore"
          :schultraeger-list="schultraegerList"
          @update:dirty="(value: boolean) => (isDirty = value)"
          @click:submit="onSubmit"
          @click:discard="navigateToSchuleManagement"
          @update:showUnsavedChangesDialog="(visible: boolean) => (showUnsavedChangesDialog = visible)"
          @click:confirmUnsaved="handleConfirmUnsavedChanges"
        />
      </template>
      <!-- Result template on success after submit (Present value in createdSchule and no errorCode)  -->
      <template v-if="organisationStore.createdSchule && !organisationStore.errorCode">
        <SchuleSuccessTemplate
          :successMessage="$t('admin.schule.schuleAddedSuccessfully')"
          :preservedSchulform="selectedSchulform"
          :organisationStore="organisationStore"
          @onNavigateBackToSchuleManagement="navigateToSchuleManagement"
          @onCreateAnotherSchule="handleCreateAnotherSchule"
        />
      </template>
    </LayoutCard>
  </div>
</template>
