<script setup lang="ts">
  import PersonBulkError from '@/components/admin/personen/PersonBulkError.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { useBulkErrors, type BulkErrorList } from '@/composables/useBulkErrors';
  import { useBulkOperationStore, type BulkOperationStore } from '@/stores/BulkOperationStore';
  import type { PersonWithZuordnungen } from '@/stores/types/PersonWithZuordnungen';
  import { OperationType } from '@/stores/types/bulkOperationTypes';
  import { computed, ref, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useDisplay } from 'vuetify';

  type Props = {
    isDialogVisible: boolean;
    selectedPersonen: Map<string, PersonWithZuordnungen>;
    selectedSchuleId: string;
    operationType: OperationType.LOCK_PERSON | OperationType.UNLOCK_PERSON;
  };
  type Emits = {
    (event: 'update:dialogExit', finished: boolean): void;
  };
  const props: Props = defineProps<Props>();
  const emit: Emits = defineEmits<Emits>();
  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();
  const bulkOperationStore: BulkOperationStore = useBulkOperationStore();
  const showDialog: Ref<boolean> = ref(props.isDialogVisible);
  const showErrorDialog: Ref<boolean> = ref(false);
  const confirmedUnlock: Ref<boolean> = ref(false);
  const actionTitle: ComputedRef<string> = computed((): string =>
    t(props.operationType === OperationType.LOCK_PERSON ? 'person.lockUser' : 'person.unlockUser'),
  );
  const confirmation: ComputedRef<string> = computed((): string => {
    let confirmationKey: string = 'admin.person.bulkUnlock.confirmation';
    if (props.operationType === OperationType.LOCK_PERSON) {
      confirmationKey = 'admin.person.bulkLock.confirmation';
    } else if (confirmedUnlock.value) {
      confirmationKey = 'admin.person.bulkUnlock.approval';
    }
    return t(confirmationKey);
  });
  const successMessage: ComputedRef<string> = computed((): string =>
    bulkOperationStore.currentOperation?.successMessage ? t(bulkOperationStore.currentOperation.successMessage) : '',
  );
  const bulkErrorList: ComputedRef<BulkErrorList[]> = computed((): BulkErrorList[] =>
    useBulkErrors(t, props.selectedPersonen),
  );

  function closeDialog(finished: boolean): void {
    bulkOperationStore.resetState();
    showDialog.value = false;
    emit('update:dialogExit', finished);
  }

  async function submit(): Promise<void> {
    if (bulkOperationStore.currentOperation?.isRunning || props.selectedPersonen.size === 0) {
      return;
    }
    if (props.operationType === OperationType.UNLOCK_PERSON && !confirmedUnlock.value) {
      confirmedUnlock.value = true;
      return;
    }
    await bulkOperationStore.bulkLockPersonen(
      Array.from(props.selectedPersonen.keys()),
      props.selectedSchuleId,
      props.operationType,
    );
    showErrorDialog.value = (bulkOperationStore.currentOperation?.errors.size ?? 0) > 0;
  }

  function handleErrorDialog(isVisible: boolean): void {
    showErrorDialog.value = isVisible;
    if (!isVisible) {
      closeDialog(true);
    }
  }
</script>

<template>
  <v-dialog
    v-model="showDialog"
    persistent
  >
    <LayoutCard
      :header="actionTitle"
      data-testid="person-bulk-lock-layout-card"
    >
      <v-container
        v-if="!bulkOperationStore.currentOperation?.isRunning && !bulkOperationStore.currentOperation?.complete"
        class="my-4"
      >
        <v-row class="justify-center">
          <v-col
            cols="12"
            class="text-body font-weight-bold text-center"
            data-testid="person-bulk-lock-confirmation-text"
          >
            {{ confirmation }}
          </v-col>
        </v-row>
      </v-container>
      <v-container
        v-else
        class="my-4"
      >
        <p
          v-if="successMessage"
          class="text-body text-center"
          data-testid="person-bulk-lock-success-text"
          role="status"
        >
          {{ successMessage }}
        </p>
        <v-row
          v-if="bulkOperationStore.currentOperation?.isRunning"
          class="justify-center"
        >
          <v-col
            cols="12"
            class="text-center"
            data-testid="person-bulk-lock-progress-notice"
            role="status"
          >
            <v-icon
              icon="mdi-alert-circle-outline"
              aria-hidden="true"
              class="mr-2"
            />
            {{ t('admin.person.bulkLock.progressNotice') }}
          </v-col>
        </v-row>
        <v-progress-linear
          :model-value="bulkOperationStore.currentOperation?.progress ?? 0"
          :aria-label="actionTitle"
          color="primary"
          height="25"
          class="mt-5"
          data-testid="person-bulk-lock-progress"
        >
          <template #default="{ value }">
            <strong class="text-white">{{ Math.ceil(value) }}%</strong>
          </template>
        </v-progress-linear>
      </v-container>
      <v-card-actions class="justify-center">
        <v-row
          v-if="!bulkOperationStore.currentOperation?.isRunning && !bulkOperationStore.currentOperation?.complete"
          class="py-3 px-2 justify-center"
        >
          <v-col
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              :block="mdAndDown"
              class="secondary"
              data-testid="person-bulk-lock-cancel-button"
              @click="closeDialog(false)"
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
              :block="mdAndDown"
              :disabled="props.selectedPersonen.size === 0"
              class="primary"
              data-testid="person-bulk-lock-submit-button"
              @click="submit"
            >
              {{
                props.operationType === OperationType.UNLOCK_PERSON && !confirmedUnlock
                  ? t('admin.person.bulkUnlock.continue')
                  : actionTitle
              }}
            </v-btn>
          </v-col>
        </v-row>
        <v-row
          v-if="bulkOperationStore.currentOperation?.complete"
          class="py-3 px-2 justify-center"
        >
          <v-col
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              :block="mdAndDown"
              class="primary"
              data-testid="person-bulk-lock-close-button"
              @click="closeDialog(true)"
            >
              {{ t('close') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-actions>
    </LayoutCard>
  </v-dialog>
  <PersonBulkError
    v-if="showErrorDialog"
    :bulk-operation-name="actionTitle"
    :is-dialog-visible="showErrorDialog"
    :errors="bulkErrorList"
    @update:is-dialog-visible="handleErrorDialog"
  />
</template>
