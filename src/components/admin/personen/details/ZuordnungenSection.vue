<script setup lang="ts">
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';
  import KlasseChange from '@/components/admin/klassen/KlasseChange.vue';
  import BefristungInput from '@/components/admin/personen/BefristungInput.vue';
  import KopersInput from '@/components/admin/personen/KopersInput.vue';
  import PersonenkontextCreate from '@/components/admin/personen/PersonenkontextCreate.vue';
  import ZuordnungConfirmationDialog from '@/components/admin/personen/details/ZuordnungConfirmationDialog.vue';
  import ZuordnungenEditOverview from '@/components/admin/personen/details/ZuordnungenEditOverview.vue';
  import ZuordnungenReadOnlyView from '@/components/admin/personen/details/ZuordnungenReadOnlyView.vue';
  import ZuordnungFormActions from '@/components/admin/personen/details/ZuordnungFormActions.vue';
  import ZuordnungInfoDialog from '@/components/admin/personen/details/ZuordnungInfoDialog.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { useOrganisationen } from '@/composables/useOrganisationen';
  import {
    useZuordnungChangeBefristung,
    type ZuordnungChangeBefristung,
  } from '@/composables/useZuordnungChangeBefristung';
  import { useZuordnungChangeKlasse, type ZuordnungChangeKlasse } from '@/composables/useZuordnungChangeKlasse';
  import { useZuordnungCreation, type ZuordnungCreation } from '@/composables/useZuordnungCreation';
  import { useZuordnungDeletion, type ZuordnungDeletion } from '@/composables/useZuordnungDeletion';
  import {
    useZuordnungEditMode,
    type ZuordnungEditMode,
    type ZuordnungOperation,
  } from '@/composables/useZuordnungEditMode';
  import {
    useZuordnungenWorkingState,
    type ZuordnungenWorkingStateResult,
  } from '@/composables/useZuordnungenWorkingState';
  import { OrganisationsTyp, useOrganisationStore, type OrganisationStore } from '@/stores/OrganisationStore';
  import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
  import { OperationContext, usePersonenkontextStore, type PersonenkontextStore } from '@/stores/PersonenkontextStore';
  import { RollenMerkmal } from '@/stores/RolleStore';
  import type { Zuordnung } from '@/stores/types/Zuordnung';
  import type { TranslatedObject } from '@/types';
  import { getNextSchuljahresende } from '@/utils/date';
  import {
    computed,
    onBeforeMount,
    ref,
    toRef,
    watch,
    watchEffect,
    type ComputedRef,
    type ModelRef,
    type Ref,
  } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useDisplay } from 'vuetify';

  type Props = {
    personId: string;
    isEditPersonMetadataActive: boolean;
  };

  const props: Props = defineProps<Props>();
  const isEditActive: ModelRef<boolean> = defineModel<boolean>('isEditActive', { default: false });
  const isFormDirty: ModelRef<boolean> = defineModel<boolean>('isFormDirty', { default: false });
  const hasPendingChange: ModelRef<boolean> = defineModel<boolean>('hasPendingChange', { default: false });

  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();
  const { t }: Composer = useI18n({ useScope: 'global' });

  const personStore: PersonStore = usePersonStore();
  const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
  const organisationStore: OrganisationStore = useOrganisationStore();

  const personId: Readonly<Ref<string>> = toRef(props, 'personId');
  const workingState: ZuordnungenWorkingStateResult = useZuordnungenWorkingState({ personId });
  const {
    selectedZuordnungen,
    zuordnungenWithPendingChanges,
    newZuordnung,
    editableZuordnungen,
    canChangeKlasse,
  }: ZuordnungenWorkingStateResult = workingState;
  const isUnbefristetDisabled: Ref<boolean, boolean> = ref(false);
  const isBefristungRequired: Ref<boolean, boolean> = ref(false);

  const calculatedBefristung: Ref<string | undefined> = ref('');

  const organisationen: ComputedRef<TranslatedObject[] | undefined> = useOrganisationen();

  const hasKlassenZuordnung: ComputedRef<boolean> = computed(
    () =>
      personStore.personenuebersicht?.zuordnungen.some(
        (zuordnung: Zuordnung) => zuordnung.typ === OrganisationsTyp.Klasse,
      ) ?? false,
  );

  const editMode: ZuordnungEditMode = useZuordnungEditMode();
  const isAnyFormActive: ComputedRef<boolean> = editMode.isFormActive;
  const pendingOperation: ComputedRef<ZuordnungOperation | undefined> = editMode.pendingOperation;

  const {
    isZuordnungFormActive,
    createSuccessDialogVisible,
    createZuordnungConfirmationDialogVisible,
    createZuordnungConfirmationDialogMessage,
    showNoKopersNrConfirmationDialog,
    hasNoKopersNr,
    hasKopersNummer,
    canCommit,
    filteredRollen,
    existingRollenArt,
    isZuordnungCreationFormDirty,
    resetCreationForm,
    selectedRolle,
    selectedRolleProps,
    selectedOrganisation,
    selectedOrganisationProps,
    selectedKlasseProps,
    selectedBefristung,
    selectedBefristungProps,
    selectedBefristungOption,
    selectedBefristungOptionProps,
    selectedKopersNr,
    selectedKopersNrProps,
    handleBefristungUpdate,
    handleBefristungOptionUpdate,
    handleKlasseUpdate,
    handleFieldReset,
    onSubmitCreateZuordnung,
    triggerAddZuordnung,
    confirmDialogAddition,
    cancelAddition,
    confirmAddition,
    closeCreateSuccessDialog,
    navigateToZuordnungForm,
  }: ZuordnungCreation = useZuordnungCreation({
    t,
    personId,
    isEditActive,
    mode: editMode.forOperation('creation'),
    state: workingState,
    calculatedBefristung,
    isUnbefristetDisabled,
    isBefristungRequired,
  });

  const {
    deleteSuccessDialogVisible,
    cannotDeleteDialogVisible,
    isDeleteExternZuordnungDisabled,
    prepareDeletion,
    confirmDeletion,
    closeDeleteSuccessDialog,
    closeCannotDeleteDialog,
  }: ZuordnungDeletion = useZuordnungDeletion({
    personId,
    isEditActive,
    mode: editMode.forOperation('deletion'),
    state: workingState,
  });

  const {
    isChangeKlasseFormActive,
    selectedSchule,
    selectedSchuleProps,
    selectedNewKlasse,
    selectedNewKlasseProps,
    resetChangeKlasseForm,
    isChangeKlasseFieldDirty,
    changeKlasseConfirmationDialogVisible,
    changeKlasseConfirmationDialogMessage,
    changeKlasseSuccessDialogVisible,
    isSubmitDisabled,
    onSubmitChangeKlasse,
    triggerChangeKlasse,
    confirmDialogChangeKlasse,
    cancelChangeKlasse,
    confirmChangeKlasse,
    closeChangeKlasseSuccessDialog,
  }: ZuordnungChangeKlasse = useZuordnungChangeKlasse({
    t,
    personId,
    isEditActive,
    mode: editMode.forOperation('changeKlasse'),
    state: workingState,
  });

  const {
    changeBefristungFormContext,
    isChangeBefristungActive,
    selectedChangeBefristung,
    selectedChangeBefristungProps,
    selectedChangeBefristungOption,
    selectedChangeBefristungOptionProps,
    handleChangeBefristungUpdate,
    handleChangeBefristungOptionUpdate,
    changeBefristungConfirmationDialogVisible,
    changeBefristungConfirmationDialogMessage,
    changeBefristungSuccessDialogVisible,
    differentDateSelected,
    onSubmitChangeBefristung,
    triggerChangeBefristung,
    confirmDialogChangeBefristung,
    cancelChangeBefristung,
    confirmChangeBefristung,
    closeChangeBefristungSuccessDialog,
  }: ZuordnungChangeBefristung = useZuordnungChangeBefristung({
    t,
    personId,
    isEditActive,
    mode: editMode.forOperation('changeBefristung'),
    state: workingState,
    calculatedBefristung,
    isUnbefristetDisabled,
    isBefristungRequired,
  });

  // Triggers the template to start editing
  const triggerEdit = (): void => {
    isEditActive.value = true;
    workingState.startEditing();
  };

  // Cancels editing
  const cancelEdit = (): void => {
    isEditActive.value = false;
    editMode.reset();
    workingState.discardChanges();
    resetCreationForm();
    resetChangeKlasseForm();
    changeBefristungFormContext.resetForm();
  };

  // The save button will act according to what kind of pending action we have.
  const handleSaveClick = async (): Promise<void> => {
    const operation: ZuordnungOperation | undefined = pendingOperation.value;
    if (operation === 'creation') {
      await confirmAddition();
    } else if (operation === 'deletion') {
      await confirmDeletion();
    } else if (operation === 'changeKlasse') {
      await confirmChangeKlasse();
    } else if (operation === 'changeBefristung') {
      await confirmChangeBefristung();
      resetCreationForm();
    }
  };

  watch(
    editMode.hasPendingChange,
    (value: boolean) => {
      hasPendingChange.value = value;
    },
    { immediate: true, flush: 'sync' },
  );

  // Syncs dirtiness depending on the active form
  watchEffect(() => {
    if (isChangeKlasseFormActive.value) {
      isFormDirty.value = isChangeKlasseFieldDirty('selectedSchule') || isChangeKlasseFieldDirty('selectedNewKlasse');
    } else if (isEditActive.value) {
      isFormDirty.value = isZuordnungCreationFormDirty.value;
    } else {
      isFormDirty.value = false;
    }
  });

  onBeforeMount(async () => {
    await personenkontextStore.processWorkflowStep({
      personId: props.personId,
      operationContext: OperationContext.PERSON_BEARBEITEN,
      limit: 25,
    });
  });

  defineExpose({ navigateToZuordnungForm });
</script>

<template>
  <div data-testid="person-zuordnungen-section">
    <ZuordnungenReadOnlyView
      v-if="!isEditActive"
      :loading="personStore.loading"
      :zuordnungen="zuordnungenWithPendingChanges"
      :has-zuordnungen="!!personStore.personenuebersicht?.zuordnungen?.length"
      :has-selection="selectedZuordnungen.length > 0"
      :is-edit-person-metadata-active="isEditPersonMetadataActive"
      @edit="triggerEdit"
    />
    <!-- Show this template if the edit button is triggered-->
    <v-container
      v-if="isEditActive"
      data-testid="person-zuordnungen-section-edit"
    >
      <ZuordnungenEditOverview
        v-if="!isAnyFormActive"
        v-model:selected-zuordnungen="selectedZuordnungen"
        :zuordnungen="editableZuordnungen"
        :new-zuordnung="newZuordnung"
        :pending-operation="pendingOperation"
        :has-no-zuordnungen="personStore.personenuebersicht?.zuordnungen?.length === 0"
        :is-delete-extern-zuordnung-disabled="isDeleteExternZuordnungDisabled"
        :can-change-klasse="canChangeKlasse"
        :has-klassen-zuordnung="hasKlassenZuordnung"
        :is-loading="personenkontextStore.loading"
        @delete="prepareDeletion"
        @add="triggerAddZuordnung"
        @change-befristung="triggerChangeBefristung"
        @change-klasse="triggerChangeKlasse"
        @cancel="cancelEdit"
        @save="handleSaveClick"
      />
      <!-- Form to add Zuordnung -->
      <template v-if="isZuordnungFormActive">
        <v-form
          data-testid="zuordnung-creation-form"
          @submit="onSubmitCreateZuordnung"
        >
          <v-row class="ml-md-16">
            <v-col
              cols="12"
              sm="auto"
            >
              <h3 class="subtitle-1">{{ t('person.addZuordnung') }}:</h3>
            </v-col>
          </v-row>
          <v-container class="px-lg-16">
            <!-- Organisation, Rolle, Klasse zuordnen -->
            <PersonenkontextCreate
              id="personenkontext-create"
              ref="personenkontext-create"
              v-model:selected-organisation="selectedOrganisation"
              v-model:selected-rolle="selectedRolle"
              :person-id="props.personId"
              :rollenart-for-person="existingRollenArt"
              :operation-context="OperationContext.PERSON_BEARBEITEN"
              :allow-multiple-rollen="false"
              :show-headline="false"
              :rollen="filteredRollen"
              :selected-organisation-props="selectedOrganisationProps"
              :selected-rolle-props="selectedRolleProps"
              :selected-klasse-props="selectedKlasseProps"
              :befristung-input-props="{
                befristungProps: selectedBefristungProps,
                befristungOptionProps: selectedBefristungOptionProps,
                isUnbefristetDisabled: isUnbefristetDisabled,
                isBefristungRequired: isBefristungRequired,
                nextSchuljahresende: getNextSchuljahresende(),
                befristung: selectedBefristung,
                befristungOption: selectedBefristungOption,
              }"
              @update:can-commit="canCommit = $event"
              @update:befristung="handleBefristungUpdate($event)"
              @update:calculated-befristung-option="handleBefristungOptionUpdate($event)"
              @update:selected-klasse="handleKlasseUpdate"
              @field-reset="handleFieldReset($event)"
            />
            <KopersInput
              v-if="
                !hasKopersNummer &&
                selectedRolle?.merkmale?.includes(RollenMerkmal.KopersPflicht) &&
                selectedOrganisation
              "
              v-model:selected-kopers-nr="selectedKopersNr"
              :has-no-kopers-nr="hasNoKopersNr"
              :selected-kopers-nr-props="selectedKopersNrProps"
              @update:selected-kopers-nr="(value?: string | undefined) => (selectedKopersNr = value)"
              @update:has-no-kopers-nr="(value: boolean | undefined) => (hasNoKopersNr = value)"
            />
          </v-container>
          <ZuordnungFormActions
            cancel-button-test-id="zuordnung-creation-discard-button"
            @cancel="cancelEdit"
          >
            <v-btn
              :block="mdAndDown"
              :disabled="!canCommit || personenkontextStore.loading"
              class="primary"
              data-testid="zuordnung-creation-submit-button"
              type="submit"
            >
              {{ t('person.addZuordnung') }}
            </v-btn>
          </ZuordnungFormActions>
        </v-form>
      </template>
      <!-- Form to change Klasse -->
      <template v-if="isChangeKlasseFormActive">
        <v-form
          data-testid="klasse-change-form"
          @submit="onSubmitChangeKlasse"
        >
          <v-row class="ml-md-16">
            <v-col
              cols="12"
              sm="auto"
            >
              <h3 class="subtitle-1">{{ t('transfer') }}:</h3>
            </v-col>
          </v-row>
          <v-container class="px-lg-16">
            <KlasseChange
              ref="klasse-change-form"
              v-model:selected-schule="selectedSchule"
              v-model:selected-new-klasse="selectedNewKlasse"
              :is-edit-active="isEditActive"
              :readonly="true"
              :schulen="organisationen"
              :selected-schule-props="selectedSchuleProps"
              :selected-new-klasse-props="selectedNewKlasseProps"
              :on-submit="onSubmitChangeKlasse"
            />
          </v-container>
          <ZuordnungFormActions
            cancel-button-test-id="klasse-change-discard-button"
            @cancel="cancelEdit"
          >
            <SpshTooltip
              :enabled-condition="!isSubmitDisabled"
              :disabled-text="t('person.changeKlasseNotDisabledDescription')"
              :enabled-text="t('transfer')"
              position="start"
            >
              <v-btn
                :block="mdAndDown"
                class="primary"
                data-testid="klasse-change-submit-button"
                :disabled="isSubmitDisabled || organisationStore.loading"
                type="submit"
              >
                {{ t('transfer') }}
              </v-btn>
            </SpshTooltip>
          </ZuordnungFormActions>
        </v-form>
      </template>
      <!-- Form to change Befristung-->
      <template v-if="isChangeBefristungActive">
        <v-form
          data-testid="change-befristung-form"
          @submit="onSubmitChangeBefristung"
        >
          <BefristungInput
            ref="befristung-input-wrapper"
            :befristung-props="selectedChangeBefristungProps"
            :befristung-option-props="selectedChangeBefristungOptionProps"
            :is-unbefristet-disabled="isUnbefristetDisabled"
            :is-befristung-required="isBefristungRequired"
            :next-schuljahresende="getNextSchuljahresende()"
            :befristung="selectedChangeBefristung"
            :befristung-option="selectedChangeBefristungOption"
            @update:befristung="handleChangeBefristungUpdate"
            @update:calculated-befristung-option="handleChangeBefristungOptionUpdate"
          />
          <ZuordnungFormActions
            cancel-button-test-id="change-befristung-discard-button"
            @cancel="cancelEdit"
          >
            <SpshTooltip
              :enabled-condition="differentDateSelected"
              :disabled-text="t('person.changeBefristungDisabledDescription')"
              :enabled-text="t('person.changeBefristung')"
              position="start"
            >
              <v-btn
                :block="mdAndDown"
                :disabled="!differentDateSelected"
                class="primary"
                data-testid="change-befristung-submit-button"
                type="submit"
              >
                {{ t('person.changeBefristung') }}
              </v-btn>
            </SpshTooltip>
          </ZuordnungFormActions>
        </v-form>
      </template>
    </v-container>

    <ZuordnungInfoDialog
      v-model="deleteSuccessDialogVisible"
      :header="t('person.editZuordnungen')"
      close-button-test-id="close-zuordnung-delete-success-button"
      @close="closeDeleteSuccessDialog"
    >
      <template #message>
        <v-container>
          <v-row class="text-body bold px-md-16">
            <v-col
              offset="1"
              cols="10"
            >
              <span>{{ t('person.deleteZuordnungSuccess') }}</span>
            </v-col>
          </v-row>
        </v-container>
      </template>
    </ZuordnungInfoDialog>
    <ZuordnungInfoDialog
      v-model="createSuccessDialogVisible"
      :header="t('person.editZuordnungen')"
      close-button-test-id="close-zuordnung-create-success-button"
      @close="closeCreateSuccessDialog"
    >
      <template #message>
        <v-container>
          <v-row class="text-body bold px-md-16">
            <v-col class="text-center">
              <span>{{ t('person.addZuordnungSuccess') }}</span>
            </v-col>
          </v-row>
        </v-container>
      </template>
    </ZuordnungInfoDialog>
    <ZuordnungInfoDialog
      v-model="changeKlasseSuccessDialogVisible"
      :header="t('transfer')"
      close-button-test-id="change-klasse-success-dialog-close-button"
      @close="closeChangeKlasseSuccessDialog"
    >
      <template #message>
        <v-container>
          <v-row class="text-body bold">
            <v-col
              class="text-center"
              cols="12"
            >
              <span data-testid="change-klasse-success-dialog-text">{{ t('person.changeKlasseSuccess') }}</span>
            </v-col>
          </v-row>
        </v-container>
      </template>
    </ZuordnungInfoDialog>
    <ZuordnungInfoDialog
      v-model="changeBefristungSuccessDialogVisible"
      :header="t('person.changeBefristung')"
      close-button-test-id="change-befristung-success-dialog-close-button"
      @close="closeChangeBefristungSuccessDialog"
    >
      <template #message>
        <v-container>
          <v-row class="text-body bold justify-center">
            <v-col
              class="text-center"
              cols="10"
            >
              <span>{{ t('person.changeBefristungSuccess') }}</span>
            </v-col>
          </v-row>
        </v-container>
      </template>
    </ZuordnungInfoDialog>
    <ZuordnungInfoDialog
      v-model="cannotDeleteDialogVisible"
      :header="t('person.editZuordnungen')"
      @close="closeCannotDeleteDialog"
    >
      <template #message>
        <v-container>
          <v-row class="text-body bold px-md-16">
            <v-col
              offset="1"
              cols="10"
            >
              <span>{{ t('person.cannotDeleteOwnZuordnung') }}</span>
            </v-col>
          </v-row>
        </v-container>
      </template>
    </ZuordnungInfoDialog>
    <ZuordnungConfirmationDialog
      v-model="createZuordnungConfirmationDialogVisible"
      :header="t('person.editZuordnungen')"
      confirm-button-test-id="confirm-zuordnung-dialog-addition"
      :confirm-first="true"
      @confirm="confirmDialogAddition"
      @cancel="cancelAddition"
    >
      <template #message>
        <v-row class="text-body bold justify-center">
          <v-col
            class="text-center"
            cols="10"
          >
            <span>{{ createZuordnungConfirmationDialogMessage }}</span>
          </v-col>
        </v-row>
      </template>
    </ZuordnungConfirmationDialog>
    <ZuordnungConfirmationDialog
      v-model="changeKlasseConfirmationDialogVisible"
      :header="t('transfer')"
      confirm-button-test-id="confirm-change-klasse-button"
      @confirm="confirmDialogChangeKlasse"
      @cancel="cancelChangeKlasse"
    >
      <template #message>
        <v-row class="text-body text-center bold">
          <v-col cols="12">
            <span data-testid="change-klasse-confirmation-dialog-text">{{
              changeKlasseConfirmationDialogMessage
            }}</span>
          </v-col>
        </v-row>
      </template>
    </ZuordnungConfirmationDialog>
    <ZuordnungConfirmationDialog
      v-model="changeBefristungConfirmationDialogVisible"
      :header="t('person.editZuordnungen')"
      confirm-button-test-id="confirm-change-befristung-button"
      @confirm="confirmDialogChangeBefristung"
      @cancel="cancelChangeBefristung"
    >
      <template #message>
        <v-row class="text-body bold justify-center">
          <v-col
            class="text-center"
            cols="10"
          >
            <span>{{ changeBefristungConfirmationDialogMessage }}</span>
          </v-col>
        </v-row>
      </template>
    </ZuordnungConfirmationDialog>

    <v-dialog
      v-model="showNoKopersNrConfirmationDialog"
      persistent
    >
      <LayoutCard
        v-if="showNoKopersNrConfirmationDialog"
        :closable="false"
        :header="t('admin.person.noKopersNr')"
      >
        <v-card-text>
          <v-container>
            <v-row class="text-body bold px-md-16">
              <v-col
                offset="1"
                cols="10"
              >
                <span data-testid="no-kopersnr-confirmation-text">
                  {{ t('admin.person.noKopersNrConfirmationDialogMessage') }}
                </span>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-row class="justify-center">
            <v-col
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="mdAndDown"
                class="secondary"
                data-testid="cancel-no-kopersnr-button"
                @click.stop="
                  showNoKopersNrConfirmationDialog = false;
                  hasNoKopersNr = false;
                "
              >
                {{ t('cancel') }}
              </v-btn>
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="mdAndDown"
                class="primary"
                data-testid="confirm-no-kopersnr-button"
                @click.stop="showNoKopersNrConfirmationDialog = false"
              >
                {{ t('proceed') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </v-dialog>
  </div>
</template>

<style scoped>
  span {
    white-space: normal;
    text-wrap: pretty;
  }
</style>
