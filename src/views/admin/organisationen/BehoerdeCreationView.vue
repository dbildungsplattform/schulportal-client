<script setup lang="ts">
  import BehoerdeForm from '@/components/admin/behoerden/BehoerdeForm.vue';
  import BehoerdeSuccessTemplate from '@/components/admin/behoerden/BehoerdeSuccessTemplate.vue';
  import ScreenreaderOutput from '@/components/alert/ScreenreaderOutput.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { useOrganisationStore, type Organisation, type OrganisationStore } from '@/stores/OrganisationStore';
  import type { BehoerdeFormValues } from '@/utils/validationBehoerde';
  import { computed, onMounted, onUnmounted, ref, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import {
    onBeforeRouteLeave,
    useRouter,
    type NavigationGuardNext,
    type RouteLocationNormalized,
    type Router,
  } from 'vue-router';

  const i18n: Composer = useI18n();
  const { t }: Composer = i18n;
  const router: Router = useRouter();
  const organisationStore: OrganisationStore = useOrganisationStore();

  const isDirty: Ref<boolean> = ref(false);
  const isZustaendigkeitsbereichLoaded: Ref<boolean> = ref(false);
  const cachedValues: Ref<BehoerdeFormValues | undefined> = ref(undefined);
  const initialFormValues: Ref<BehoerdeFormValues> = ref({
    selectedZustaendigkeitsbereich: '',
    selectedBehoerdenname: '',
  });
  const showUnsavedChangesDialog: Ref<boolean> = ref(false);

  let blockedNext: () => void = () => {
    /* stores route navigation until user confirms unsaved changes */
  };

  const zustaendigkeitsbereichList: ComputedRef<Organisation[]> = computed(() => {
    return organisationStore.schultraeger;
  });
  const creationErrorMessage: ComputedRef<string> = computed((): string => {
    if (!organisationStore.errorCode) {
      return '';
    }

    const key: string = `admin.behoerde.errors.${organisationStore.errorCode}`;
    return t(i18n.te(key) ? key : 'admin.behoerde.errors.ORGANISATION_SPECIFICATION_ERROR');
  });
  const creationStatusMessage: ComputedRef<string> = computed((): string => {
    if (!organisationStore.createdBehoerde || organisationStore.errorCode) {
      return '';
    }

    return t('admin.behoerde.behoerdeAddedSuccessfully');
  });
  const createdDataRows: ComputedRef<Array<{ label: string; value: string; testId: string }>> = computed(() => {
    const administriertVon: string | undefined | null = organisationStore.createdBehoerde?.administriertVon;
    const zustaendigkeitsbereich: Organisation | undefined = zustaendigkeitsbereichList.value.find(
      (zustaendigkeitsbereich: Organisation) => zustaendigkeitsbereich.id === administriertVon,
    );

    return [
      {
        label: t('admin.behoerde.zustaendigkeitsbereich'),
        value: zustaendigkeitsbereich?.name ?? '',
        testId: 'created-behoerde-zustaendigkeitsbereich',
      },
      {
        label: t('admin.behoerde.behoerdenname'),
        value: organisationStore.createdBehoerde?.name ?? '',
        testId: 'created-behoerde-name',
      },
    ];
  });

  async function onSubmit(values: BehoerdeFormValues): Promise<void> {
    cachedValues.value = { ...values };
    await organisationStore.createBehoerde(
      values.selectedZustaendigkeitsbereich,
      values.selectedZustaendigkeitsbereich,
      values.selectedBehoerdenname,
    );
    if (!organisationStore.errorCode) {
      isDirty.value = false;
      cachedValues.value = undefined;
    }
  }

  const handleCreateAnotherBehoerde = (): void => {
    organisationStore.createdBehoerde = null;
    organisationStore.errorCode = '';
    cachedValues.value = undefined;
    isDirty.value = false;
    router.push({ name: 'create-behoerde' });
  };

  function handleConfirmUnsavedChanges(): void {
    blockedNext();
    organisationStore.errorCode = '';
  }

  function handleNavigateBackToBehoerdeList(): void {
    router.push({ name: 'behoerde-management' });
  }

  async function discardBehoerde(): Promise<void> {
    organisationStore.createdBehoerde = null;
    await router.push({ name: 'behoerde-management' });
  }

  async function loadZustaendigkeitsbereiche(): Promise<void> {
    isZustaendigkeitsbereichLoaded.value = false;
    organisationStore.errorCode = '';
    await organisationStore.getRootKinderSchultraeger();
    if (organisationStore.errorCode) {
      return;
    }
    initialFormValues.value.selectedZustaendigkeitsbereich = zustaendigkeitsbereichList.value[0]?.id ?? '';
    isZustaendigkeitsbereichLoaded.value = true;
  }

  async function navigateBackToBehoerdeForm(): Promise<void> {
    if (organisationStore.errorCode === 'REQUIRED_STEP_UP_LEVEL_NOT_MET') {
      await router.push({ name: 'create-behoerde' }).then(() => {
        router.go(0);
      });
    } else if (!isZustaendigkeitsbereichLoaded.value) {
      await loadZustaendigkeitsbereiche();
    } else {
      organisationStore.errorCode = '';
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

  onMounted(async () => {
    organisationStore.createdBehoerde = null;
    window.addEventListener('beforeunload', preventNavigation);
    await loadZustaendigkeitsbereiche();
  });

  onBeforeRouteLeave((_to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    if (isDirty.value) {
      showUnsavedChangesDialog.value = true;
      blockedNext = next;
    } else {
      next();
    }
  });

  onUnmounted(() => {
    window.removeEventListener('beforeunload', preventNavigation);
  });
</script>

<template>
  <div class="admin">
    <ScreenreaderOutput>
      {{ creationStatusMessage }}
    </ScreenreaderOutput>
    <h1
      class="text-center headline"
      data-testid="admin-headline"
    >
      {{ $t('admin.headline') }}
    </h1>
    <LayoutCard
      :closable="!organisationStore.errorCode"
      :header="$t('admin.behoerde.addNew')"
      headlineTestId="behoerde-creation-headline"
      :padded="true"
      :show-close-text="true"
      @on-close-clicked="handleNavigateBackToBehoerdeList"
    >
      <template v-if="!organisationStore.createdBehoerde">
        <SpshAlert
          :model-value="!!organisationStore.errorCode"
          :title="$t('admin.behoerde.behoerdeCreateErrorTitle')"
          type="error"
          :closable="false"
          :text="creationErrorMessage"
          :show-button="true"
          :button-text="$t('admin.behoerde.backToCreateBehoerde')"
          :button-action="navigateBackToBehoerdeForm"
          button-class="primary"
        />
        <BehoerdeForm
          v-if="isZustaendigkeitsbereichLoaded && !organisationStore.errorCode"
          :initial-values="initialFormValues"
          :cached-values="cachedValues"
          :error-code="organisationStore.errorCode"
          :is-loading="organisationStore.loading"
          :zustaendigkeitsbereich-list="zustaendigkeitsbereichList"
          :show-unsaved-changes-dialog="showUnsavedChangesDialog"
          @update:dirty="(value: boolean) => (isDirty = value)"
          @click:submit="onSubmit"
          @click:discard="discardBehoerde"
          @click:confirmUnsaved="handleConfirmUnsavedChanges"
          @update:showUnsavedChangesDialog="(value: boolean) => (showUnsavedChangesDialog = value)"
        />
      </template>
      <template v-if="organisationStore.createdBehoerde && !organisationStore.errorCode">
        <BehoerdeSuccessTemplate
          :changed-data="createdDataRows"
          @on-navigate-back-to-behoerde-list="handleNavigateBackToBehoerdeList"
          @on-create-another-behoerde="handleCreateAnotherBehoerde"
        />
      </template>
    </LayoutCard>
  </div>
</template>
