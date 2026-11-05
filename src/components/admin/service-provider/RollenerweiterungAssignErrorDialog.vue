<script setup lang="ts">
  import BulkErrorDialog from '@/components/dialog/BulkErrorDialog.vue';
  import { buildCSV, download } from '@/utils/file';
  import { useI18n, type Composer } from 'vue-i18n';
  import type { RollenerweiterungAssignErrorDialogProps } from './types';

  const { t }: Composer = useI18n({ useScope: 'global' });

  type Emits = {
    (event: 'update:isDialogVisible', isDialogVisible: boolean): void;
  };

  const props: RollenerweiterungAssignErrorDialogProps = defineProps<RollenerweiterungAssignErrorDialogProps>();
  const emit: Emits = defineEmits<Emits>();

  function saveErrorsAsCSV(): void {
    if (!props.errors || props.errors.length === 0) {
      return;
    }
    type CSVHeaders = 'Dienststellennummer' | 'Angebot' | 'Rolle' | 'Fehlermeldung';
    type CSVRow = Record<CSVHeaders, string | undefined>;
    const headers: CSVHeaders[] = ['Dienststellennummer', 'Angebot', 'Rolle', 'Fehlermeldung'];
    const fileName: string = `Fehler-Rollenerweiterung-${new Date().toLocaleDateString('de-DE').replaceAll('.', '-')}.txt`;
    const csvRows: CSVRow[] = props.errors?.map((entry: RollenerweiterungAssignErrorDialogProps['errors'][number]) => ({
      Dienststellennummer: props.dstNr,
      Angebot: props.serviceProviderName,
      Rolle: entry.rolle,
      Fehlermeldung: entry.message,
    }));
    const csvContent: string = buildCSV<CSVHeaders>(
      headers,
      csvRows,
      t('angebot.schulspezifischeErweiterungen.errorCsvIntroText'),
    );
    const blob: Blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    download(fileName, blob);
  }

  function errorToDisplayText(entry: RollenerweiterungAssignErrorDialogProps['errors'][number]): string {
    return `${props.dstNr} ${props.serviceProviderName} (${entry.rolle})`;
  }

  function errorToAlertText(entry: RollenerweiterungAssignErrorDialogProps['errors'][number]): string {
    return entry.message;
  }
</script>

<template>
  <BulkErrorDialog
    :is-dialog-visible="props.isDialogVisible"
    :errors="props.errors"
    :error-to-display-text="errorToDisplayText"
    :error-to-alert-text="errorToAlertText"
    :dialog-title="t('angebot.schulspezifischeErweiterungen.assignErrorTitle')"
    :close-confirmation-text="t('angebot.schulspezifischeErweiterungen.closeConfirmationMessage')"
    :testIdBase="'rollenerweiterung-error'"
    :download-button-text="t('angebot.schulspezifischeErweiterungen.saveList')"
    :close-button-text="t('angebot.schulspezifischeErweiterungen.closeList')"
    @update:isDialogVisible="emit('update:isDialogVisible', $event)"
    @download="saveErrorsAsCSV"
  >
    <p class="text-body bold pre-line">
      {{ t('angebot.schulspezifischeErweiterungen.assignErrorIntroText') }}
    </p>
  </BulkErrorDialog>
</template>

<style scoped>
  .pre-line {
    white-space: pre-wrap;
  }
</style>
