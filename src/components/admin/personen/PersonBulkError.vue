<script setup lang="ts">
  import BulkErrorDialog from '@/components/dialog/BulkErrorDialog.vue';
  import { buildCSV, download } from '@/utils/file';
  import { ref, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useDisplay } from 'vuetify';

  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  const progress: Ref<number> = ref<number>(0);

  type ErrorEntry = {
    error: string;
    vorname: string;
    nachname: string;
    username: string;
  };

  type Props = {
    bulkOperationName: string;
    errors: ErrorEntry[];
    isDialogVisible: boolean;
    filename?: string;
    passwords?: Blob | null;
  };

  type Emits = {
    (event: 'update:isDialogVisible', isDialogVisible: boolean): void;
  };

  const props: Props = defineProps<Props>();
  const emit: Emits = defineEmits<Emits>();

  const showBulkErrorDialog: Ref<boolean> = ref(props.isDialogVisible);

  function saveErrorsAsCSV(): void {
    type CSVHeaders = 'Vorname' | 'Nachname' | 'Benutzername' | 'Fehlermeldung';
    type CSVRow = Record<CSVHeaders, string | undefined>;
    const headers: CSVHeaders[] = ['Vorname', 'Nachname', 'Benutzername', 'Fehlermeldung'];
    const fileName: string = `Fehler-Mehrfachbearbeitung-${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}.txt`;
    const csvRows: CSVRow[] = props.errors.map((entry: ErrorEntry) => ({
      Vorname: entry.vorname,
      Nachname: entry.nachname,
      Benutzername: entry.username,
      Fehlermeldung: entry.error,
    }));
    const actionIntroText: string = t('admin.person.bulk.bulkErrorMessageShort', {
      bulkOperationName: props.bulkOperationName,
    });
    const csvContent: string = buildCSV<CSVHeaders>(headers, csvRows, actionIntroText);
    const blob: Blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    download(fileName, blob);
  }

  function closeBulkErrorDialog(isVisible: boolean): void {
    progress.value = 0;
    showBulkErrorDialog.value = isVisible;
    emit('update:isDialogVisible', isVisible);
  }

  function errorToDisplayText(entry: ErrorEntry): string {
    return `${entry.vorname} ${entry.nachname} (${entry.username})`;
  }

  function errorToAlertText(entry: ErrorEntry): string {
    return entry.error;
  }
</script>

<template>
  <BulkErrorDialog
    :is-dialog-visible="props.isDialogVisible"
    :errors="props.errors"
    :error-to-display-text="errorToDisplayText"
    :error-to-alert-text="errorToAlertText"
    :dialog-title="
      props.bulkOperationName === t('admin.person.resetPassword') && props.passwords
        ? t('admin.person.resetPassword')
        : $t('admin.person.bulk.bulkErrorTitle')
    "
    :close-confirmation-text="t('admin.person.bulk.closeBulkErrorDialogConfirmationMessage')"
    :testIdBase="'person-bulk-error'"
    :download-button-text="t('admin.person.bulk.saveList')"
    :close-button-text="t('admin.person.bulk.closeList')"
    @update:isDialogVisible="closeBulkErrorDialog"
    @download="saveErrorsAsCSV"
  >
    <template v-if="props.bulkOperationName === t('admin.person.resetPassword') && props.passwords">
      <v-row class="my-4 justify-center">
        <v-col cols="auto">
          <v-icon
            small
            color="#1EAE9C"
            icon="mdi-check-circle"
          />
        </v-col>
      </v-row>
      <p class="mt-2 text-center">
        {{ t('admin.person.bulk.bulkPasswordReset.success') }}
      </p>
      <v-row class="mt-4 justify-center">
        <v-col
          cols="12"
          sm="6"
          md="auto"
        >
          <v-btn
            :block="mdAndDown"
            class="primary"
            data-testid="person-bulk-error-download-passwords-button"
            @click="() => props.passwords && download(props.filename ?? 'default-filename.csv', props.passwords)"
          >
            {{ t('admin.person.bulk.bulkPasswordReset.downloadResult') }}
          </v-btn>
        </v-col>
      </v-row>
      <v-divider
        class="border-opacity-100 rounded my-8"
        thickness="5px"
      />
      <p class="headline-2 mb-4">
        {{ $t('admin.person.bulk.bulkErrorTitle') }}
      </p>
    </template>
    <p class="text-body bold pre-line">
      {{ t('admin.person.bulk.bulkErrorMessage', { bulkOperationName: props.bulkOperationName }) }}
    </p>
  </BulkErrorDialog>
</template>

<style scoped>
  .pre-line {
    white-space: pre-wrap;
  }
</style>
