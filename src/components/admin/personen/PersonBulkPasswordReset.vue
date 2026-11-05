<script setup lang="ts">
  import PersonBulkError from '@/components/admin/personen/PersonBulkError.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { useBulkErrors, type BulkErrorList } from '@/composables/useBulkErrors';
  import { useBulkOperationStore, type BulkOperationStore } from '@/stores/BulkOperationStore';
  import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
  import type { CurrentOperation } from '@/stores/types/bulkOperationTypes';
  import type { PersonWithZuordnungen } from '@/stores/types/PersonWithZuordnungen';
  import { buildCSV, download } from '@/utils/file';
  import { computed, ref, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useDisplay } from 'vuetify';

  type CSVHeaders = 'Klasse' | 'Nachname' | 'Vorname' | 'Benutzername' | 'Passwort';
  type CSVRow = Record<CSVHeaders, string | undefined>;

  type Props = {
    isDialogVisible: boolean;
    selectedSchuleKennung?: string;
    selectedPersonen: Map<string, PersonWithZuordnungen>;
  };

  type Emits = (event: 'update:dialogExit', finished: boolean) => void;

  enum State {
    INITIAL,
    PROGRESSING,
    FINISHED,
  }

  const props: Props = defineProps<Props>();
  const emit: Emits = defineEmits<Emits>();

  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  const bulkOperationStore: BulkOperationStore = useBulkOperationStore();
  const personStore: PersonStore = usePersonStore();

  const showErrorDialog: Ref<boolean, boolean> = ref(false);
  const showConfirmationDialog: Ref<boolean, boolean> = ref(false);

  const hasConfirmed: Ref<boolean, boolean> = ref(false);

  // Define the error list for the selected persons using the useBulkErrors composable
  const bulkErrorList: ComputedRef<BulkErrorList[]> = computed(() => useBulkErrors(t, props.selectedPersonen));

  // Computed that determines the state of the operation. Could either be initial (Progress === 0) or Progressing (progress > 0) or finished (operation is complete)
  const progressState: ComputedRef<State> = computed(() => {
    const operation: CurrentOperation | null = bulkOperationStore.currentOperation;

    if (operation?.complete === true) {
      return State.FINISHED;
    }

    if (operation?.progress !== undefined && operation.progress > 0) {
      return State.PROGRESSING;
    }

    return State.INITIAL;
  });

  // Calculates the progress dynamically (Requests are sent sequentially and for every response we get the bar increments)
  const progress: ComputedRef<number> = computed(() => {
    if (!bulkOperationStore.currentOperation?.progress) {
      return 0;
    }
    return bulkOperationStore.currentOperation.progress;
  });

  // Create the file and returns the Blob
  const resultFile: ComputedRef<Blob | null> = computed(() => {
    const operation: CurrentOperation | null = bulkOperationStore.currentOperation;

    if (!operation?.complete) {
      return null;
    }

    const rows: Array<CSVRow> = [];

    // For every password in the Map find the corresponding person (using the key) and merge them together in the file.
    for (const [id, password] of operation.data.entries()) {
      const personWithZuordnung: PersonWithZuordnungen | undefined = props.selectedPersonen.get(id);
      if (!personWithZuordnung) {
        continue;
      }
      rows.push({
        Klasse: personWithZuordnung.klassenZuordnungenAsString,
        Nachname: personWithZuordnung.name.familienname,
        Vorname: personWithZuordnung.name.vorname,
        Benutzername: personWithZuordnung.username,
        Passwort: password as string,
      });
    }

    const csv: string = buildCSV<CSVHeaders>(['Klasse', 'Nachname', 'Vorname', 'Benutzername', 'Passwort'], rows);

    return new Blob([csv], { type: 'text/csv' });
  });

  function closePasswordResetDialog(finished: boolean): void {
    bulkOperationStore.resetState();
    personStore.errorCode = '';
    emit('update:dialogExit', finished);
  }

  function openConfirmationDialog(): void {
    showConfirmationDialog.value = true;
  }

  function closeConfirmationDialog(): void {
    showConfirmationDialog.value = false;
    hasConfirmed.value = true;
  }

  async function handleResetPassword(): Promise<void> {
    await bulkOperationStore.bulkResetPassword([...props.selectedPersonen.keys()]);

    if (bulkOperationStore.currentOperation?.errors && bulkOperationStore.currentOperation.errors.size > 0) {
      showErrorDialog.value = true;
    }
  }

  function downloadFile(blob: Blob): void {
    const filename: string = props.selectedSchuleKennung ? `PW_${props.selectedSchuleKennung}.txt` : 'PW.txt';
    download(filename, blob);
  }
</script>

<template>
  <v-dialog
    ref="resetPasswordBulkDialog"
    :model-value="isDialogVisible"
    persistent
  >
    <LayoutCard
      data-testid="password-reset-layout-card"
      :header="t('admin.person.resetPassword')"
    >
      <!-- Initial block -->
      <v-container
        v-if="progressState === State.INITIAL"
        class="mt-8 mb-4"
      >
        <v-row class="text-body bold justify-center">
          <span data-testid="password-reset-confirmation-text">
            {{ t('admin.person.bulk.bulkPasswordReset.confirmation') }}
          </span>
        </v-row>
      </v-container>

      <!-- In progress -->
      <v-container
        v-else
        class="mt-4"
      >
        <v-row class="align-center justify-center">
          <v-col cols="auto">
            <v-icon
              v-if="progressState === State.PROGRESSING"
              aria-hidden="true"
              class="mr-2"
              icon="mdi-alert-circle-outline"
              size="small"
            />
            <v-icon
              v-if="progressState === State.FINISHED"
              small
              color="#1EAE9C"
              icon="mdi-check-circle"
            />
            <span
              v-if="progressState === State.PROGRESSING"
              class="subtitle-2"
              data-testid="password-reset-progressing-notice"
            >
              {{ t('admin.doNotCloseBrowserNotice') }}
            </span>
          </v-col>
        </v-row>
        <p
          v-if="progressState === State.FINISHED"
          class="mt-2 text-center"
        >
          {{ t('admin.person.bulk.bulkPasswordReset.success') }}
        </p>
        <!-- Progress Bar -->
        <v-progress-linear
          class="mt-5"
          :model-value="progress"
          color="primary"
          height="25"
          data-testid="password-reset-progressbar"
        >
          <template #default="{ value }">
            <strong class="text-white">{{ Math.ceil(value) }}%</strong>
          </template>
        </v-progress-linear>
        <div
          v-if="progressState === State.FINISHED"
          class="mt-4 px-md-16 bold text-body text-center"
          data-testid="password-reset-success-text"
        >
          <p>
            {{ t('admin.person.bulk.bulkPasswordReset.info') }}
          </p>
        </div>
      </v-container>

      <v-card-actions class="justify-center">
        <v-row class="py-3 px-2 justify-center">
          <v-col
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              v-if="progressState === State.FINISHED"
              :block="mdAndDown"
              class="secondary"
              data-testid="password-reset-close-button"
              @click="hasConfirmed ? closePasswordResetDialog(true) : openConfirmationDialog()"
            >
              {{ t('close') }}
            </v-btn>
            <v-btn
              v-else-if="progressState === State.INITIAL"
              :block="mdAndDown"
              class="secondary"
              data-testid="password-reset-discard-button"
              @click="closePasswordResetDialog(false)"
            >
              {{ t('cancel') }}
            </v-btn>
          </v-col>
          <v-col
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              v-if="progressState === State.INITIAL"
              :block="mdAndDown"
              :disabled="bulkOperationStore.currentOperation?.isRunning"
              class="primary"
              data-testid="password-reset-submit-button"
              type="submit"
              @click="handleResetPassword()"
            >
              {{ t('admin.person.resetPassword') }}
            </v-btn>
            <v-btn
              v-if="progressState === State.FINISHED && resultFile"
              :block="mdAndDown"
              class="primary"
              data-testid="download-result-button"
              :disabled="bulkOperationStore.currentOperation?.isRunning"
              @click="downloadFile(resultFile)"
            >
              {{ t('admin.person.bulk.bulkPasswordReset.downloadResult') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-actions>
    </LayoutCard>
  </v-dialog>
  <template v-if="showErrorDialog">
    <PersonBulkError
      :bulk-operation-name="t('admin.person.resetPassword')"
      :is-dialog-visible="showErrorDialog"
      :passwords="resultFile"
      :filename="props.selectedSchuleKennung ? `PW_${props.selectedSchuleKennung}.txt` : 'PW.txt'"
      :errors="bulkErrorList"
      @update:is-dialog-visible="
        (val: boolean) => {
          showErrorDialog = val;
          if (!val) {
            closePasswordResetDialog(true);
          }
        }
      "
    />
  </template>

  <!-- Confirmation Dialog -->
  <v-dialog
    v-model="showConfirmationDialog"
    :width="'80%'"
  >
    <LayoutCard
      data-testid="password-reset-download-confirmation-layout-card"
      :header="t('admin.person.resetPassword')"
    >
      <v-container class="px-md-16">
        <v-row class="text-body bold">
          <v-col>
            <span data-testid="password-reset-download-confirmation-text">
              {{ t('admin.person.bulk.bulkPasswordReset.downloadConfirmation') }}
            </span>
          </v-col>
        </v-row>
      </v-container>
      <v-card-actions class="justify-center">
        <v-btn
          :block="mdAndDown"
          class="primary"
          data-testid="password-reset-download-confirmation-button"
          @click="closeConfirmationDialog()"
        >
          {{ t('ok') }}
        </v-btn>
      </v-card-actions>
    </LayoutCard>
  </v-dialog>
</template>
