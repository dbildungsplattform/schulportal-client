<script setup lang="ts">
  import PersonBulkError from '@/components/admin/personen/PersonBulkError.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { useBulkErrors, type BulkErrorList } from '@/composables/useBulkErrors';
  import { useBulkOperationStore, type BulkOperationStore } from '@/stores/BulkOperationStore';
  import { type Organisation } from '@/stores/OrganisationStore';
  import type { PersonWithZuordnungen } from '@/stores/types/PersonWithZuordnungen';
  import { getDisplayNameForOrg } from '@/utils/formatting';
  import { computed, ref, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useDisplay } from 'vuetify';

  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  const bulkOperationStore: BulkOperationStore = useBulkOperationStore();

  type Props = {
    isDialogVisible: boolean;
    selectedPersonen: Map<string, PersonWithZuordnungen>;
    selectedOrganisation: Organisation;
  };

  type Emits = (event: 'update:dialogExit', finished: boolean) => void;

  const props: Props = defineProps<Props>();
  const emit: Emits = defineEmits<Emits>();

  function closeDialog(finished: boolean): void {
    bulkOperationStore.resetState();
    emit('update:dialogExit', finished);
  }

  const showErrorDialog: Ref<boolean, boolean> = ref(false);

  // Define the error list for the selected persons using the useBulkErrors composable
  const bulkErrorList: ComputedRef<BulkErrorList[]> = computed(() => useBulkErrors(t, props.selectedPersonen));

  async function handleOrgUnassign(): Promise<void> {
    await bulkOperationStore.bulkUnassignPersonenFromOrg(
      props.selectedOrganisation.id,
      Array.from(props.selectedPersonen.keys()),
    );

    if (bulkOperationStore.currentOperation?.errors && bulkOperationStore.currentOperation.errors.size > 0) {
      showErrorDialog.value = true;
    }
  }
</script>

<template>
  <v-dialog
    :model-value="props.isDialogVisible"
    persistent
  >
    <LayoutCard
      data-testid="org-unassign-layout-card"
      :header="$t('admin.person.bulkUnassignOrganisation.cancelZuordnung')"
    >
      <!-- Initial block -->
      <v-container
        v-if="bulkOperationStore.currentOperation?.progress === 0"
        class="mt-8 mb-4"
      >
        <v-row class="text-body bold justify-center">
          <v-col
            class="text-center"
            cols="10"
          >
            <div data-testid="org-unassign-confirmation-text">
              {{ t('admin.person.bulkUnassignOrganisation.confirmation') }}
            </div>
            <div data-testid="org-unassign-affected-school">
              {{
                t('admin.person.bulkUnassignOrganisation.affectedSchule', {
                  schule: getDisplayNameForOrg(selectedOrganisation),
                })
              }}
            </div>
          </v-col>
        </v-row>
      </v-container>

      <!-- In progress -->
      <v-container
        v-if="
          bulkOperationStore.currentOperation?.progress !== undefined &&
          bulkOperationStore.currentOperation?.progress > 0
        "
        class="mt-4"
      >
        <v-container v-if="bulkOperationStore.currentOperation?.progress === 100">
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
            {{ $t('admin.person.bulkUnassignOrganisation.success') }}
          </p>
        </v-container>
        <v-row
          class="align-center justify-center"
          v-if="
            bulkOperationStore.currentOperation?.progress !== undefined &&
            bulkOperationStore.currentOperation?.progress < 100
          "
        >
          <v-col cols="auto">
            <v-icon
              aria-hidden="true"
              class="mr-2"
              icon="mdi-alert-circle-outline"
              size="small"
            />
            <span
              class="subtitle-2"
              data-testid="org-unassign-progressing-notice"
            >
              {{ t('admin.doNotCloseBrowserNotice') }}
            </span>
          </v-col>
        </v-row>
        <!-- Progress Bar -->
        <v-progress-linear
          class="mt-5"
          :model-value="bulkOperationStore.currentOperation?.progress"
          color="primary"
          height="25"
          data-testid="org-unassign-progressbar"
        >
          <template #default="{ value }">
            <strong class="text-white">{{ Math.ceil(value) }}%</strong>
          </template>
        </v-progress-linear>
      </v-container>

      <v-card-actions class="justify-center">
        <v-row class="py-3 px-2 justify-center">
          <v-col
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              v-if="bulkOperationStore.currentOperation?.progress === 100"
              :block="mdAndDown"
              class="secondary"
              data-testid="org-unassign-close-button"
              @click="closeDialog(true)"
            >
              {{ t('close') }}
            </v-btn>
            <v-btn
              v-else-if="bulkOperationStore.currentOperation?.progress === 0"
              :block="mdAndDown"
              class="secondary"
              data-testid="org-unassign-discard-button"
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
              v-if="bulkOperationStore.currentOperation?.progress === 0"
              :block="mdAndDown"
              :disabled="bulkOperationStore.currentOperation?.isRunning"
              class="primary"
              data-testid="org-unassign-submit-button"
              type="submit"
              @click="handleOrgUnassign()"
            >
              {{ t('admin.person.bulkUnassignOrganisation.cancelZuordnung') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-actions>
    </LayoutCard>
  </v-dialog>
  <template v-if="showErrorDialog">
    <PersonBulkError
      :bulk-operation-name="$t('admin.person.bulkUnassignOrganisation.cancelZuordnung')"
      :is-dialog-visible="showErrorDialog"
      :errors="bulkErrorList"
      @update:is-dialog-visible="
        (val: boolean) => {
          showErrorDialog = val;
          if (!val) {
            closeDialog(true);
          }
        }
      "
    />
  </template>
</template>

<style></style>
