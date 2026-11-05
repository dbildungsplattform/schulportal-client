<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import {
    type Router,
    useRouter,
    onBeforeRouteLeave,
    type RouteLocationNormalized,
    type NavigationGuardNext,
  } from 'vue-router';
  import { useDisplay } from 'vuetify';
  import {
    OrganisationsTyp,
    useOrganisationStore,
    type Organisation,
    type OrganisationStore,
    type SchultraegerFormType,
  } from '@/stores/OrganisationStore';
  import { useForm, type TypedSchema, type FormContext } from 'vee-validate';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import SchultraegerForm from '@/components/admin/schultraeger/SchultraegerForm.vue';
  import {
    getDirtyState,
    getSchultraegerFieldDefinitions,
    getValidationSchema,
    type SchultraegerFieldDefinitions,
  } from '@/utils/validationSchultraeger';

  const initialSchultraegerformCache: Ref<string> = ref('');

  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  const { t }: Composer = useI18n({ useScope: 'global' });
  const validationSchema: TypedSchema = getValidationSchema(t);
  const router: Router = useRouter();
  const organisationStore: OrganisationStore = useOrganisationStore();

  const preservedSchultraegerform: Ref<string | undefined> = ref<string>('');

  const formContext: FormContext<SchultraegerFormType, SchultraegerFormType> = useForm<SchultraegerFormType>({
    validationSchema,
  });

  const {
    selectedSchultraegerform,
    selectedSchultraegername,
    selectedSchultraegernameProps,
  }: SchultraegerFieldDefinitions = getSchultraegerFieldDefinitions(formContext);

  const rootChildSchultraegerList: ComputedRef<Organisation[]> = computed(() => {
    return organisationStore.schultraeger;
  });

  const isFormDirty: ComputedRef<boolean> = computed(() => getDirtyState(formContext));

  const showUnsavedChangesDialog: Ref<boolean> = ref(false);
  let blockedNext: () => void = () => {
    /* empty */
  };

  const onSubmit: (e?: Event) => Promise<Promise<void> | undefined> = formContext.handleSubmit(async () => {
    preservedSchultraegerform.value = rootChildSchultraegerList.value.find(
      (schultraeger: Organisation) => schultraeger.id === selectedSchultraegerform.value,
    )?.name;
    if (selectedSchultraegername.value && selectedSchultraegerform.value) {
      await organisationStore.createOrganisation(
        selectedSchultraegerform.value,
        selectedSchultraegerform.value,
        undefined,
        selectedSchultraegername.value,
        undefined,
        undefined,
        OrganisationsTyp.Traeger,
      );
      formContext.resetForm({
        values: {
          selectedSchultraegerform: initialSchultraegerformCache.value,
          selectedSchultraegername: '',
        },
      });
    }
  });

  const handleCreateAnotherSchultraeger = (): void => {
    organisationStore.createdSchultraeger = null;
    formContext.resetForm();
    router.push({ name: 'create-schultraeger' });
  };

  function handleConfirmUnsavedChanges(): void {
    blockedNext();
    organisationStore.errorCode = '';
  }

  async function navigateToSchultraegerManagement(): Promise<void> {
    organisationStore.createdSchultraeger = null;
    await router.push({ name: 'schultraeger-management' }).then(() => {
      router.go(0);
    });
  }

  async function navigateBackToSchultraegerForm(): Promise<void> {
    if (organisationStore.errorCode === 'REQUIRED_STEP_UP_LEVEL_NOT_MET') {
      formContext.resetForm();
      await router.push({ name: 'create-schultraeger' }).then(() => {
        router.go(0);
      });
    } else {
      selectedSchultraegername.value = '';
      organisationStore.errorCode = '';
      await router.push({ name: 'create-schultraeger' });
    }
  }

  function preventNavigation(event: BeforeUnloadEvent): void {
    if (!isFormDirty.value) {
      return;
    }
    event.preventDefault();
    /* Chrome requires returnValue to be set. */
    event.returnValue = '';
  }

  onMounted(async () => {
    organisationStore.createdSchultraeger = null;
    organisationStore.errorCode = '';
    await organisationStore.getRootKinderSchultraeger();

    if (rootChildSchultraegerList.value.length > 0) {
      const defaultSchultraegerform: string = rootChildSchultraegerList.value[0]?.id ?? '';
      selectedSchultraegerform.value = defaultSchultraegerform;
      initialSchultraegerformCache.value = defaultSchultraegerform;
    }
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
      :header="$t('admin.schultraeger.addNew')"
      :padded="true"
      :show-close-text="true"
      @on-close-clicked="navigateToSchultraegerManagement"
    >
      <!-- The form to create a new Schultraeger -->
      <template v-if="!organisationStore.createdSchultraeger">
        <SchultraegerForm
          ref="schultraeger-creation-form"
          v-model:selected-schultraegerform="selectedSchultraegerform"
          v-model:selected-schultraegername="selectedSchultraegername"
          :can-commit="!!selectedSchultraegername"
          :error-code="organisationStore.errorCode"
          :is-loading="organisationStore.loading"
          :on-handle-confirm-unsaved-changes="handleConfirmUnsavedChanges"
          :on-handle-discard="navigateToSchultraegerManagement"
          :on-show-dialog-change="(value?: boolean) => (showUnsavedChangesDialog = value || false)"
          :on-submit="onSubmit"
          :root-child-schultraeger-list="rootChildSchultraegerList"
          :selected-schultraegername-props="selectedSchultraegernameProps"
          :show-unsaved-changes-dialog="showUnsavedChangesDialog"
        >
          <!-- Error Message Display if error on submit -->
          <!-- To trigger unsaved changes dialog the alert has to be inside the form wrapper -->
          <SpshAlert
            :model-value="!!organisationStore.errorCode"
            :title="$t('admin.schultraeger.schultraegerCreateErrorTitle')"
            :type="'error'"
            :closable="false"
            :text="organisationStore.errorCode ? $t(`admin.schultraeger.errors.${organisationStore.errorCode}`) : ''"
            :show-button="true"
            :button-text="$t('admin.schultraeger.backToCreateSchultraeger')"
            :button-action="navigateBackToSchultraegerForm"
            button-class="primary"
          />
        </SchultraegerForm>
      </template>
      <!-- Result template on success after submit (Present value in createdSchultraeger and no errorCode)  -->
      <template v-if="organisationStore.createdSchultraeger && !organisationStore.errorCode">
        <v-container class="new-schultraeger-success">
          <v-row class="justify-center">
            <v-col
              class="subtitle-1"
              cols="auto"
            >
              <span data-testid="schultraeger-success-text">{{
                $t('admin.schultraeger.schultraegerAddedSuccessfully')
              }}</span>
            </v-col>
          </v-row>
          <v-row class="justify-center">
            <v-col cols="auto">
              <v-icon
                small
                color="#1EAE9C"
                icon="mdi-check-circle"
              />
            </v-col>
          </v-row>
          <v-row class="justify-center">
            <v-col
              class="subtitle-2"
              cols="auto"
            >
              {{ $t('admin.followingDataCreated') }}
            </v-col>
          </v-row>
          <v-row>
            <v-col class="text-body bold text-right"> {{ $t('admin.schultraeger.schultraegerform') }}: </v-col>
            <v-col class="text-body">
              <span data-testid="created-schultraeger-form">{{ preservedSchultraegerform }}</span>
            </v-col>
          </v-row>
          <v-row>
            <v-col class="text-body bold text-right"> {{ $t('admin.schultraeger.schultraegername') }}: </v-col>
            <v-col class="text-body">
              <span data-testid="created-schultraeger-name">{{ organisationStore.createdSchultraeger.name }}</span>
            </v-col>
          </v-row>
          <v-divider
            class="border-opacity-100 rounded my-6"
            color="#E5EAEF"
            thickness="6"
          />
          <v-row class="justify-end">
            <v-col
              cols="12"
              sm="6"
              md="auto"
            >
              <v-btn
                class="secondary"
                data-testid="back-to-list-button"
                :block="mdAndDown"
                @click="navigateToSchultraegerManagement"
              >
                {{ $t('nav.backToList') }}
              </v-btn>
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="auto"
            >
              <v-btn
                class="primary button"
                data-testid="create-another-schultraeger-button"
                :block="mdAndDown"
                @click="handleCreateAnotherSchultraeger"
              >
                {{ $t('admin.schultraeger.createAnother') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-container>
      </template>
    </LayoutCard>
  </div>
</template>

<style></style>
