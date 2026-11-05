<script setup lang="ts">
  import RelationshipAssign from '@/components/admin/RelationshipAssign.vue';
  import SchultraegerForm from '@/components/admin/schultraeger/SchultraegerForm.vue';
  import SchultraegerSuccessTemplate from '@/components/admin/schultraeger/SchultraegerSuccessTemplate.vue';
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import {
    OrganisationsTyp,
    SchuleType,
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

  const assignedSchulen: Ref<Array<Organisation>> = ref([]);
  const unassignedSchulen: Ref<Array<Organisation>> = ref([]);

  const unpersistedSchulenToAssign: ComputedRef<Array<Organisation>> = computed(() =>
    assignedSchulen.value.filter((schule: Organisation) => schule.isNotPersisted),
  );

  const unpersistedSchulenToUnassign: ComputedRef<Organisation[]> = computed(() =>
    unassignedSchulen.value.filter(
      (schule: Organisation) =>
        schule.isNotPersisted || organisationStore.schulenFromTraeger.some((s: Organisation) => s.id === schule.id), // Was previously assigned
    ),
  );

  // These computed properties are used to display the assigned and unassigned schulen in the UI.
  // They are initialized with the same values as assignedSchulen and unassignedSchulen respectively. Extra added to distinguish between the search operation and the schule assignment.
  // The displayed lists are used to show the schulen in the UI, while the original lists are used to keep track of the schulen that are assigned/unassigned.
  const displayedAssignedSchulen: Ref<Organisation[]> = ref([]);
  const displayedUnassignedSchulen: Ref<Organisation[]> = ref([]);

  const progress: Ref<number> = ref<number>(0);
  const successMessage: Ref<string> = ref<string>('');

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

  function handleConfirmUnsavedChanges(): void {
    showUnsavedChangesDialog.value = false;
    blockedNext();
    organisationStore.errorCode = '';
  }

  const noUnassignedSchulenFoundText: Ref<string> = ref(t('admin.schultraeger.unassignedSchulenDefaultText'));
  const noAssignedSchulenFoundText: Ref<string> = ref('');

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
    return (
      selectedSchultraegername.value !== organisationStore.currentOrganisation?.name ||
      unpersistedSchulenToAssign.value.length > 0 ||
      unpersistedSchulenToUnassign.value.length > 0
    );
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

    /* Reset success message and progress bar before processing items */
    successMessage.value = '';
    progress.value = 0;

    if (unpersistedSchulenToAssign.value.length > 0) {
      for (let index: number = 0; index < unpersistedSchulenToAssign.value.length; index++) {
        const schuleId: string = unpersistedSchulenToAssign.value[index]!.id;

        // eslint-disable-next-line no-await-in-loop
        await organisationStore.assignSchuleToTraeger(currentSchultraegerId, { organisationId: schuleId });

        /* Update progress for each item processed */
        progress.value = Math.ceil(((index + 1) / unpersistedSchulenToAssign.value.length) * 100);
      }

      /* Show success message only after all items have been processed */
      if (!organisationStore.errorCode) {
        successMessage.value = t('admin.schultraeger.schulenAssignedSuccessfully');
      }
    }

    if (unpersistedSchulenToUnassign.value.length > 0) {
      for (let index: number = 0; index < unpersistedSchulenToUnassign.value.length; index++) {
        const schuleId: string = unpersistedSchulenToUnassign.value[index]!.id;

        /* assign to traeger's parent */
        if (organisationStore.currentOrganisation?.zugehoerigZu) {
          // eslint-disable-next-line no-await-in-loop
          await organisationStore.assignSchuleToTraeger(organisationStore.currentOrganisation.zugehoerigZu, {
            organisationId: schuleId,
          });
        }

        /* Update progress for each item processed */
        progress.value = Math.ceil(((index + 1) / unpersistedSchulenToUnassign.value.length) * 100);
      }

      /* Show success message only after all items have been processed */
      if (!organisationStore.errorCode) {
        successMessage.value = t('admin.schultraeger.schulenAssignedSuccessfully');
      }
    }
  });

  // This method will prepare the schule to be assigned to the Schultraeger.
  // It will set the 'isNotPersisted' to true flag if the schule is not already in the store and add it to the assignedSchulen array.
  function prepareSchuleToAssign(schule: Organisation): void {
    // 1. Add to assignedSchulen (if not already there)
    if (!assignedSchulen.value.some((item: Organisation) => item.id === schule.id)) {
      const isPersisted: boolean = organisationStore.schulenFromTraeger.some(
        (schuleFromTraeger: Organisation) => schuleFromTraeger.id === schule.id,
      );

      const schuleToAssign: Organisation = isPersisted
        ? { ...schule, isNotPersisted: undefined }
        : { ...schule, isNotPersisted: true };

      assignedSchulen.value = [schuleToAssign, ...assignedSchulen.value];
      displayedAssignedSchulen.value = [schuleToAssign, ...displayedAssignedSchulen.value];
    }

    // 2. Remove from unassignedSchulen (if present)
    unassignedSchulen.value = unassignedSchulen.value.filter((item: Organisation) => item.id !== schule.id);
    displayedUnassignedSchulen.value = displayedUnassignedSchulen.value.filter(
      (item: Organisation) => item.id !== schule.id,
    );

    // 3. Update the empty state text if unassigned list is now empty
    if (unassignedSchulen.value.length === 0) {
      noUnassignedSchulenFoundText.value = t('admin.schultraeger.unassignedSchulenDefaultText');
    }
  }

  // This method will prepare the schule to be unassigned from the Schultraeger.
  // It will set the 'isNotPersisted' to true flag if the schule is not already in the store and add it to the unassignedSchulen array.
  function prepareSchuleToUnassign(schule: Organisation): void {
    // 1. Add to unassignedSchulen (if not already there)
    if (!unassignedSchulen.value.some((item: Organisation) => item.id === schule.id)) {
      const isPersisted: boolean = organisationStore.schulenFromTraeger.some(
        (schuleFromTraeger: Organisation) => schuleFromTraeger.id === schule.id,
      );

      const schuleToUnassign: Organisation = isPersisted
        ? { ...schule, isNotPersisted: true }
        : { ...schule, isNotPersisted: undefined };

      unassignedSchulen.value = [schuleToUnassign, ...unassignedSchulen.value];

      // Update displayed unassigned list (add the new Schule)
      displayedUnassignedSchulen.value = [schuleToUnassign, ...displayedUnassignedSchulen.value];
    }

    // 2. Remove from assignedSchulen (if present)
    if (assignedSchulen.value.some((item: Organisation) => item.id === schule.id)) {
      assignedSchulen.value = assignedSchulen.value.filter((item: Organisation) => item.id !== schule.id);

      // Update displayed assigned list (remove the Schule)
      displayedAssignedSchulen.value = displayedAssignedSchulen.value.filter(
        (item: Organisation) => item.id !== schule.id,
      );
    }

    // 3. Update the empty state text if assigned list is now empty
    if (assignedSchulen.value.length === 0) {
      noAssignedSchulenFoundText.value = t('admin.schultraeger.noSchulenFound');
    }
  }

  // This method will search for both assigned or unassigned Schulen depending on the parameter "type" which could be either 'assigned' or 'unassigned'.
  async function searchSchulen(searchString: string, type: SchuleType): Promise<void> {
    if (!organisationStore.currentOrganisation) {
      return;
    }

    const isAssigned: boolean = type === SchuleType.ASSIGNED;
    const hasSearchInput: boolean = !!searchString;
    const currentParentId: string = organisationStore.currentOrganisation.zugehoerigZu!;

    if (isAssigned) {
      // For assigned schools, we always show:
      // 1. Persisted schools from the store (minus any pending unassigns)
      // 2. Plus any pending assigns
      const persistedSchulen: Organisation[] = organisationStore.schulenFromTraeger.filter(
        (schule: Organisation) => !unpersistedSchulenToUnassign.value.some((u: Organisation) => u.id === schule.id),
      );

      const workingSet: Organisation[] = [...unpersistedSchulenToAssign.value, ...persistedSchulen];

      if (!hasSearchInput) {
        // Show full working set when no search
        displayedAssignedSchulen.value = workingSet;
        noAssignedSchulenFoundText.value = workingSet.length === 0 ? t('admin.schultraeger.noSchulenAssigned') : '';
        return;
      }

      // Filter working set when searching
      const lowerCaseSearchString: string = searchString.toLowerCase();
      displayedAssignedSchulen.value = workingSet.filter(
        (s: Organisation) =>
          s.name.toLowerCase().includes(lowerCaseSearchString) ||
          s.kennung?.toLowerCase().includes(lowerCaseSearchString),
      );

      noAssignedSchulenFoundText.value =
        displayedAssignedSchulen.value.length === 0 ? t('admin.schultraeger.noSchulenFound') : '';
      return;
    }

    // UNASSIGNED section
    if (!hasSearchInput) {
      // When no search, just show pending unassigns
      displayedUnassignedSchulen.value = [...unpersistedSchulenToUnassign.value];
      noUnassignedSchulenFoundText.value = t('admin.schultraeger.unassignedSchulenDefaultText');
      return;
    }

    // When searching unassigned, fetch from server
    await organisationStore.fetchSchulen({ searchString, zugehoerigZu: undefined, limit: 50 }, type);

    // Filter out:
    // 1. Schools already assigned (persisted or pending)
    // 2. Schools that don't match the current parent
    const unpersistedAssignIds: string[] = unpersistedSchulenToAssign.value.map((s: Organisation) => s.id);
    const filtered: Organisation[] = organisationStore.schulenWithoutTraeger.filter(
      (s: Organisation) => s.zugehoerigZu === currentParentId && !unpersistedAssignIds.includes(s.id),
    );

    // Combine with pending unassigns
    displayedUnassignedSchulen.value = [...unpersistedSchulenToUnassign.value, ...filtered];

    noUnassignedSchulenFoundText.value =
      displayedUnassignedSchulen.value.length === 0 ? t('admin.schultraeger.noSchulenFound') : '';
  }

  onBeforeMount(async () => {
    organisationStore.errorCode = '';
    progress.value = 0;
    successMessage.value = '';

    await organisationStore.getRootKinderSchultraeger();
    await organisationStore.getOrganisationById(currentSchultraegerId, OrganisationsTyp.Traeger);
    await organisationStore.fetchSchulen(
      {
        searchString: '',
        zugehoerigZu: [currentSchultraegerId],
      },
      SchuleType.ASSIGNED,
    );
    assignedSchulen.value = organisationStore.schulenFromTraeger;
    displayedAssignedSchulen.value = organisationStore.schulenFromTraeger;

    // Set the initial values using the computed properties
    if (rootChildSchultraegerList.value.length > 0) {
      formContext.setFieldValue(
        'selectedSchultraegerform',
        rootChildSchultraegerList.value.find(
          (schultraeger: Organisation) => schultraeger.id === organisationStore.currentOrganisation?.zugehoerigZu,
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
    progress.value = 0;
    successMessage.value = '';
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
          v-if="progress === 0 && !organisationStore.updatedOrganisation"
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

        <v-container
          v-if="!organisationStore.errorCode && progress === 0 && !organisationStore.updatedOrganisation"
          class="px-3 px-sm-16"
        >
          <v-container class="px-lg-16">
            <v-row>
              <v-col>
                <h3 class="headline-3">3. {{ $t('admin.schultraeger.assignSchulenOrganisationally') }}</h3>
              </v-col>
            </v-row>
            <v-row class="align-center mt-8 px-5">
              <RelationshipAssign
                :assigned-items="displayedAssignedSchulen"
                :assigned-items-header="
                  $t('admin.schultraeger.schulenOfThisTraeger', { amount: assignedSchulen.length })
                "
                :no-assigned-items-found-text="noAssignedSchulenFoundText"
                :no-unassigned-items-found-text="noUnassignedSchulenFoundText"
                :unassigned-items="displayedUnassignedSchulen"
                :unassigned-items-header="$t('admin.schultraeger.schulenWithoutTraeger')"
                @on-handle-assigned-item-click="prepareSchuleToUnassign"
                @on-handle-assigned-items-search-filter="
                  (searchString: string) => searchSchulen(searchString, SchuleType.ASSIGNED)
                "
                @on-handle-unassigned-item-click="prepareSchuleToAssign"
                @on-handle-unassigned-items-search-filter="
                  (searchString: string) => searchSchulen(searchString, SchuleType.UNASSIGNED)
                "
              >
                <template #default="{ item }">
                  <SpshTooltip
                    :enabled-condition="true"
                    :enabled-text="`(${item.kennung}) ${item.name}`"
                  >
                    {{ `(${item.kennung}) ${item.name}` }}
                  </SpshTooltip>
                </template>
              </RelationshipAssign>
            </v-row>
          </v-container>
        </v-container>

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

        <!-- Progress Bar -->
        <div
          v-if="progress > 0 && !organisationStore.errorCode"
          class="mt-4"
        >
          <v-container v-if="successMessage">
            <v-row class="justify-center">
              <v-col cols="auto">
                <v-icon
                  small
                  color="#1EAE9C"
                  icon="mdi-check-circle"
                />
              </v-col>
            </v-row>
            <p class="mt-2 text-center">
              {{ successMessage }}
            </p>
          </v-container>
          <v-row
            class="align-center justify-center"
            v-if="progress < 100"
          >
            <v-col cols="auto">
              <v-icon
                aria-hidden="true"
                class="mr-2"
                icon="mdi-alert-circle-outline"
                size="small"
              />
              <span class="subtitle-2">
                {{ $t('admin.doNotCloseBrowserNotice') }}
              </span>
            </v-col>
          </v-row>
          <v-progress-linear
            class="mt-5"
            :model-value="progress"
            color="primary"
            height="25"
          >
            <template #default="{ value }">
              <strong class="text-white">{{ Math.ceil(value) }}%</strong>
            </template>
          </v-progress-linear>
          <v-divider
            class="border-opacity-100 rounded my-6"
            color="#E5EAEF"
            thickness="6"
          />
        </div>

        <v-row
          v-if="!organisationStore.errorCode && (progress === 0 || progress === 100)"
          class="py-3 px-2 save-cancel-row justify-end"
        >
          <v-col
            v-if="progress === 0 || progress === 100 || organisationStore.updatedOrganisation"
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
            v-if="progress === 100 || organisationStore.updatedOrganisation"
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
            v-if="progress === 0 && !organisationStore.updatedOrganisation"
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
