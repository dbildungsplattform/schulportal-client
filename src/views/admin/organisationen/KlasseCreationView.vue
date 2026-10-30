<script setup lang="ts">
  import KlasseForm from '@/components/admin/klassen/KlasseForm.vue';
  import KlasseSuccessTemplate from '@/components/admin/klassen/KlasseSuccessTemplate.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { useAutoselectedSchule } from '@/composables/useAutoselectedSchule';
  import {
    OrganisationsTyp,
    useOrganisationStore,
    type Organisation,
    type OrganisationStore,
  } from '@/stores/OrganisationStore';
  import { RollenSystemRecht } from '@/stores/RolleStore';
  import type { Option } from '@/types';
  import { getDisplayNameForOrg } from '@/utils/formatting';
  import { type ValidationSchema as KlasseFormValues, type ValidationSchema } from '@/utils/validationKlasse';
  import { computed, onMounted, onUnmounted, ref, useTemplateRef, type ComputedRef, type Ref } from 'vue';
  import {
    onBeforeRouteLeave,
    useRouter,
    type NavigationGuardNext,
    type RouteLocationNormalized,
    type Router,
  } from 'vue-router';

  const router: Router = useRouter();
  const organisationStore: OrganisationStore = useOrganisationStore();
  // eslint-disable-next-line @typescript-eslint/typedef
  const formRef = useTemplateRef('klasse-creation-form');

  const initialFormValues: Partial<KlasseFormValues> = {
    selectedSchule: undefined,
    selectedKlassenname: undefined,
  };

  const { autoselectedSchule }: ReturnType<typeof useAutoselectedSchule> = useAutoselectedSchule([
    RollenSystemRecht.KlassenVerwalten,
  ]);

  const selectedSchuleObject: Ref<Option<Organisation>> = ref(null);

  const translatedSchulname: ComputedRef<string> = computed(() => {
    if (selectedSchuleObject.value) {
      return getDisplayNameForOrg(selectedSchuleObject.value);
    }
    if (autoselectedSchule.value) {
      return getDisplayNameForOrg(autoselectedSchule.value);
    }
    return '';
  });

  const isFormDirty: Ref<boolean> = ref(false);
  const hasUnsavedChanges: ComputedRef<boolean> = computed(() => {
    if (organisationStore.createdKlasse) {
      return false;
    }
    return isFormDirty.value;
  });
  const showUnsavedChangesDialog: Ref<boolean> = ref(false);
  let blockedNext: () => void = () => {
    /* empty */
  };

  function resetForm(): void {
    if (formRef.value && typeof (formRef.value as { reset?: () => void }).reset === 'function') {
      (formRef.value as { reset: () => void }).reset();
    }
  }

  function preventNavigation(event: BeforeUnloadEvent): void {
    if (!hasUnsavedChanges.value) {
      return;
    }
    event.preventDefault();
    /* Chrome requires returnValue to be set. */
    event.returnValue = '';
  }

  function initStores(): void {
    organisationStore.createdKlasse = null;
    organisationStore.errorCode = '';
  }

  const handleCreateAnotherKlasse = (): void => {
    initStores();
    router.push({ name: 'create-klasse' });
  };

  async function navigateBackToKlasseForm(): Promise<void> {
    if (organisationStore.errorCode === 'REQUIRED_STEP_UP_LEVEL_NOT_MET') {
      await router.push({ name: 'create-klasse' }).then(() => {
        router.go(0);
      });
    } else {
      organisationStore.errorCode = '';
      await router.push({ name: 'create-klasse' });
    }
  }

  async function navigateToKlasseManagement(): Promise<void> {
    if (organisationStore.errorCode === 'REQUIRED_STEP_UP_LEVEL_NOT_MET') {
      resetForm();
      await router.push({ name: 'create-klasse' }).then(() => {
        router.go(0);
      });
    } else {
      organisationStore.errorCode = '';
      await router.push({ name: 'klasse-management' });
    }
  }

  function handleConfirmUnsavedChanges(): void {
    blockedNext();
    organisationStore.errorCode = '';
  }

  function handleChangedFormState({ dirty }: { values: ValidationSchema; dirty: boolean; valid: boolean }): void {
    isFormDirty.value = dirty;
  }

  const onSubmit = async ({ selectedSchule, selectedKlassenname }: ValidationSchema): Promise<void> => {
    initialFormValues.selectedSchule = selectedSchule;
    await organisationStore.createOrganisation(
      selectedSchule,
      selectedSchule,
      undefined,
      selectedKlassenname,
      undefined,
      undefined,
      OrganisationsTyp.Klasse,
    );
  };

  onMounted(() => {
    initStores();
    /* listen for browser changes and prevent them when form is dirty */
    window.addEventListener('beforeunload', preventNavigation);
  });

  onUnmounted(() => {
    window.removeEventListener('beforeunload', preventNavigation);
  });

  onBeforeRouteLeave((_to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    if (hasUnsavedChanges.value) {
      showUnsavedChangesDialog.value = true;
      blockedNext = next;
    } else {
      next();
    }
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
      @onCloseClicked="navigateToKlasseManagement"
      :header="$t('admin.klasse.addNew')"
      headlineTestId="klasse-creation-headline"
      :padded="true"
      :showCloseText="true"
    >
      <!-- The form to create a new Klasse -->
      <template v-if="!organisationStore.createdKlasse">
        <KlasseForm
          ref="klasse-creation-form"
          :error-code="organisationStore.errorCode"
          :edit-mode="false"
          :initial-values="initialFormValues"
          :initial-schule="selectedSchuleObject ?? autoselectedSchule"
          :is-loading="organisationStore.loading"
          :show-unsaved-changes-dialog="showUnsavedChangesDialog"
          :on-handle-confirm-unsaved-changes="handleConfirmUnsavedChanges"
          :on-handle-discard="navigateToKlasseManagement"
          :on-show-dialog-change="(value?: boolean) => (showUnsavedChangesDialog = value || false)"
          :on-submit
          @form-state-changed="handleChangedFormState"
          @update:selectedSchule="(selectedSchule) => (selectedSchuleObject = selectedSchule)"
        >
          <!-- Error Message Display if error on submit -->
          <SpshAlert
            :model-value="!!organisationStore.errorCode"
            :title="$t('admin.klasse.klasseCreateErrorTitle')"
            :type="'error'"
            :closable="false"
            :text="organisationStore.errorCode ? $t(`admin.klasse.errors.${organisationStore.errorCode}`) : ''"
            :show-button="true"
            :button-text="$t('admin.klasse.backToCreateKlasse')"
            :button-action="navigateBackToKlasseForm"
          />
        </KlasseForm>
      </template>

      <!-- Result template on success after submit -->
      <template v-if="organisationStore.createdKlasse && !organisationStore.errorCode">
        <KlasseSuccessTemplate
          :success-message="$t('admin.klasse.klasseAddedSuccessfully')"
          :following-data-created="$t('admin.followingDataCreated')"
          :created-data="[
            { label: $t('admin.schule.schule'), value: translatedSchulname, testId: 'created-klasse-schule' },
            {
              label: $t('admin.klasse.klassenname'),
              value: organisationStore.createdKlasse?.name,
              testId: 'created-klasse-name',
            },
          ]"
          :back-button-text="$t('nav.backToList')"
          :create-another-button-text="$t('admin.klasse.createAnother')"
          :show-create-another-button="true"
          :back-button-test-id="'back-to-list-button'"
          :create-another-button-test-id="'create-another-klasse-button'"
          @on-navigate-back="navigateToKlasseManagement"
          @on-create-another="handleCreateAnotherKlasse"
        />
      </template>
    </LayoutCard>
  </div>
</template>

<style></style>
