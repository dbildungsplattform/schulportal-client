<script setup lang="ts">
  import SchultraegerForm from '@/components/admin/schultraeger/SchultraegerForm.vue';
  import SchultraegerSuccessTemplate from '@/components/admin/schultraeger/SchultraegerSuccessTemplate.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import {
    OrganisationsTyp,
    useOrganisationStore,
    type Organisation,
    type OrganisationStore,
    type SchultraegerFormType,
  } from '@/stores/OrganisationStore';
  import {
    getDirtyState,
    getSchultraegerFieldDefinitions,
    getValidationSchema,
    type SchultraegerFieldDefinitions,
  } from '@/utils/validationSchultraeger';
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

  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  const { t }: Composer = useI18n({ useScope: 'global' });
  const validationSchema: TypedSchema = getValidationSchema(t);
  const router: Router = useRouter();
  const route: RouteLocationNormalizedLoaded = useRoute();
  const organisationStore: OrganisationStore = useOrganisationStore();

  const currentSchultraegerId: string = route.params['id'] as string;

  const formContext: FormContext<SchultraegerFormType, SchultraegerFormType> = useForm<SchultraegerFormType>({
    validationSchema,
  });

  const {
    selectedSchultraegerform,
    selectedSchultraegername,
    selectedSchultraegernameProps,
  }: SchultraegerFieldDefinitions = getSchultraegerFieldDefinitions(formContext);

  const rootChildSchultraegerList: ComputedRef<Organisation[]> = computed(() => {
    return organisationStore.rootChildren;
  });

  const isFormDirty: ComputedRef<boolean> = computed(() => getDirtyState(formContext));
  const showUnsavedChangesDialog: Ref<boolean> = ref(false);
  let blockedNext: () => void = () => {
    /* empty */
  };

  function handleConfirmUnsavedChanges(): void {
    showUnsavedChangesDialog.value = false;
    blockedNext();
    organisationStore.errorCode = '';
  }

  async function navigateToSchultraegerManagement(): Promise<void> {
    formContext.resetForm();
    await router.push({ name: 'schultraeger-management' });
  }

  async function navigateBackToSchultraegerDetails(): Promise<void> {
    formContext.resetForm();
    await router.push({ name: 'schultraeger-details' }).then(() => {
      router.go(0);
    });
  }

  function preventNavigation(event: BeforeUnloadEvent): void {
    if (!isFormDirty.value) {
      return;
    }
    event.preventDefault();
    /* Chrome requires returnValue to be set. */
    event.returnValue = '';
  }

  const canCommit: ComputedRef<boolean> = computed(() => {
    return selectedSchultraegername.value !== organisationStore.currentOrganisation?.name;
  });

  const onSubmit: (e?: Event) => Promise<Promise<void> | undefined> = formContext.handleSubmit(async () => {
    if (
      selectedSchultraegername.value &&
      selectedSchultraegername.value !== organisationStore.currentOrganisation?.name
    ) {
      await organisationStore.updateOrganisationNameById(
        currentSchultraegerId,
        selectedSchultraegername.value,
        OrganisationsTyp.Traeger,
      );
    }
  });

  onBeforeMount(async () => {
    organisationStore.errorCode = '';

    await organisationStore.getRootChildren();
    await organisationStore.getOrganisationById(currentSchultraegerId, OrganisationsTyp.Traeger);

    // Set the initial values using the computed properties
    if (rootChildSchultraegerList.value.length > 0) {
      formContext.setFieldValue(
        'selectedSchultraegerform',
        rootChildSchultraegerList.value.find(
          (schultraeger: Organisation) => schultraeger.id === organisationStore.currentOrganisation?.administriertVon,
        )?.id || '',
      );
    }
    formContext.setFieldValue('selectedSchultraegername', organisationStore.currentOrganisation?.name);

    /* listen for browser changes and prevent them when form is dirty */
    window.addEventListener('beforeunload', preventNavigation);
  });

  onBeforeRouteLeave((_to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    if (isFormDirty.value) {
      showUnsavedChangesDialog.value = true;
      blockedNext = next;
    } else {
      next();
    }
  });

  onUnmounted(() => {
    organisationStore.updatedOrganisation = null;
    organisationStore.errorCode = '';
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
      :header="$t('admin.schultraeger.edit')"
      :padded="true"
      :show-close-text="true"
      @on-close-clicked="navigateToSchultraegerManagement"
    >
      <!-- The form to edit the current Schultraeger -->
      <template v-if="organisationStore.currentOrganisation">
        <SchultraegerForm
          v-if="!organisationStore.updatedOrganisation"
          ref="schultraeger-edit-form"
          v-model:selected-schultraegerform="selectedSchultraegerform"
          v-model:selected-schultraegername="selectedSchultraegername"
          :can-commit="canCommit"
          :error-code="organisationStore.errorCode"
          :is-loading="organisationStore.loading"
          :on-handle-confirm-unsaved-changes="handleConfirmUnsavedChanges"
          :on-handle-discard="navigateToSchultraegerManagement"
          :on-show-dialog-change="(value?: boolean) => (showUnsavedChangesDialog = value || false)"
          :on-submit="onSubmit"
          :readonly="true"
          :root-child-schultraeger-list="rootChildSchultraegerList"
          :selected-schultraegername-props="selectedSchultraegernameProps"
          :show-unsaved-changes-dialog="showUnsavedChangesDialog"
        >
          <!-- Error Message Display if error on submit -->
          <!-- To trigger unsaved changes dialog the alert has to be inside the form wrapper -->
          <SpshAlert
            :model-value="!!organisationStore.errorCode"
            :title="$t('admin.schultraeger.schultraegerDetailsErrorTitle')"
            :type="'error'"
            :closable="false"
            :text="organisationStore.errorCode ? $t(`admin.schultraeger.errors.${organisationStore.errorCode}`) : ''"
            :show-button="true"
            :button-text="$t('admin.schultraeger.backToSchultraeger')"
            :button-action="navigateBackToSchultraegerDetails"
            button-class="primary"
          />
        </SchultraegerForm>

        <!-- Result template on success after submit  -->
        <template v-if="organisationStore.updatedOrganisation && !organisationStore.errorCode">
          <SchultraegerSuccessTemplate
            :success-message="$t('admin.schultraeger.schultraegerUpdatedSuccessfully')"
            :following-data-changed="$t('admin.followingDataCreated')"
            :changed-data="[
              {
                label: $t('admin.schultraeger.schultraegername'),
                value: organisationStore.updatedOrganisation.name,
                testId: 'updated-schultraeger-name',
              },
            ]"
            :back-button-text="$t('nav.backToDetails')"
            :create-another-button-text="$t('admin.schultraeger.createAnother')"
            :show-back-button="false"
            :show-create-another-button="false"
            back-button-test-id="back-to-details-button"
            create-another-button-test-id="create-another-schultraeger-button"
            @on-navigate-back-to-schultraeger-management="navigateToSchultraegerManagement"
          />
        </template>

        <v-row
          v-if="!organisationStore.errorCode"
          class="py-3 px-2 save-cancel-row justify-end"
        >
          <v-col
            v-if="organisationStore.updatedOrganisation"
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              class="secondary"
              data-testid="go-to-schultraeger-management-button"
              :block="mdAndDown"
              @click="navigateToSchultraegerManagement"
            >
              {{ $t('nav.backToList') }}
            </v-btn>
          </v-col>
          <v-col
            v-if="organisationStore.updatedOrganisation"
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              class="primary"
              data-testid="back-to-schultraeger-button"
              :block="mdAndDown"
              @click="navigateBackToSchultraegerDetails"
            >
              {{ $t('nav.backToDetails') }}
            </v-btn>
          </v-col>
          <v-col
            v-if="!organisationStore.updatedOrganisation"
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              :block="mdAndDown"
              class="primary"
              data-testid="schultraeger-edit-save-button"
              :disabled="!canCommit || organisationStore.loading"
              @click="onSubmit"
            >
              {{ $t('save') }}
            </v-btn>
          </v-col>
        </v-row>
      </template>
    </LayoutCard>
  </div>
</template>

<style></style>
