<script setup lang="ts">
  import PersonBulkError from '@/components/admin/personen/PersonBulkError.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { useBulkErrors, type BulkErrorList } from '@/composables/useBulkErrors';
  import { useBulkOperationStore, type BulkOperationStore } from '@/stores/BulkOperationStore';
  import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
  import type { PersonWithZuordnungen } from '@/stores/types/PersonWithZuordnungen';
  import { computed, ref, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useDisplay } from 'vuetify';

  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  const bulkOperationStore: BulkOperationStore = useBulkOperationStore();
  const personStore: PersonStore = usePersonStore();

  const successMessage: ComputedRef<string> = computed(() =>
    bulkOperationStore.currentOperation?.successMessage ? t(bulkOperationStore.currentOperation.successMessage) : '',
  );

  const showErrorDialog: Ref<boolean, boolean> = ref(false);

  type Props = {
    errorCode: string;
    isLoading: boolean;
    isDialogVisible: boolean;
    selectedPersonen: Map<string, PersonWithZuordnungen>;
  };

  type Emits = (event: 'update:dialogExit', finished: boolean) => void;

  const props: Props = defineProps<Props>();
  const emit: Emits = defineEmits<Emits>();
  const showDeletePersonDialog: Ref<boolean> = ref(props.isDialogVisible);

  // Define the error list for the selected persons using the useBulkErrors composable
  const bulkErrorList: ComputedRef<BulkErrorList[]> = computed(() => useBulkErrors(t, props.selectedPersonen));

  function closeDeletePersonDialog(finished: boolean): void {
    if (bulkOperationStore.currentOperation) {
      bulkOperationStore.resetState();
    }
    personStore.errorCode = '';
    showDeletePersonDialog.value = false;
    emit('update:dialogExit', finished);
  }

  async function handleDeletePerson(personIDs: string[]): Promise<void> {
    await bulkOperationStore.bulkPersonenDelete(personIDs);

    if (bulkOperationStore.currentOperation?.errors && bulkOperationStore.currentOperation.errors.size > 0) {
      showErrorDialog.value = true;
    }
  }
</script>

<template>
  <v-dialog
    ref="deletePersonBulkDialog"
    v-model="showDeletePersonDialog"
    persistent
  >
    <LayoutCard
      data-testid="person-delete-layout-card"
      :header="$t('admin.person.deletePerson')"
    >
      <v-container
        v-if="bulkOperationStore.currentOperation?.progress == 0"
        class="mt-8 mb-4"
      >
        <v-row class="text-body bold justify-center">
          <span data-testid="person-delete-confirmation-text">
            {{ t('admin.person.deletePersonBulkConfirmation') }}
          </span>
        </v-row>
      </v-container>

      <v-container
        v-if="bulkOperationStore.currentOperation && bulkOperationStore.currentOperation?.progress > 0"
        class="mt-4"
      >
        <!-- Progress Bar -->
        <v-container
          v-if="successMessage"
          data-testid="person-delete-success-text"
        >
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
          v-if="bulkOperationStore.currentOperation?.progress < 100"
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
          :model-value="bulkOperationStore.currentOperation?.progress"
          color="primary"
          height="25"
        >
          <template #default="{ value }">
            <strong class="text-white">{{ Math.ceil(value) }}%</strong>
          </template>
        </v-progress-linear>
      </v-container>

      <v-card-actions class="justify-center">
        <v-row
          v-if="bulkOperationStore.currentOperation?.progress === 0"
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
              data-testid="person-delete-discard-button"
              @click="closeDeletePersonDialog(false)"
            >
              {{ $t('cancel') }}
            </v-btn>
          </v-col>
          <v-col
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              :block="mdAndDown"
              :disabled="bulkOperationStore.currentOperation?.isRunning"
              class="primary"
              data-testid="person-delete-submit-button"
              type="submit"
              @click="handleDeletePerson(Array.from(props.selectedPersonen.keys()))"
            >
              {{ $t('admin.person.deletePerson') }}
            </v-btn>
          </v-col>
        </v-row>
        <v-row
          v-if="bulkOperationStore.currentOperation?.progress === 100"
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
              data-testid="person-delete-close-button"
              @click="closeDeletePersonDialog(true)"
            >
              {{ $t('close') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-actions>
    </LayoutCard>
  </v-dialog>
  <template v-if="showErrorDialog">
    <PersonBulkError
      :bulk-operation-name="$t('admin.person.deletePerson')"
      :is-dialog-visible="showErrorDialog"
      :errors="bulkErrorList"
      @update:is-dialog-visible="
        (val: boolean) => {
          showErrorDialog = val;
          if (!val) {
            closeDeletePersonDialog(true);
          }
        }
      "
    />
  </template>
</template>
