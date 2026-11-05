<script setup lang="ts" generic="T">
  import { ref, type Ref } from 'vue';
  import { useDisplay } from 'vuetify';
  import LayoutCard from '@/components/cards/LayoutCard.vue';

  type Props<T> = {
    isDialogVisible: boolean;
    errors: T[];
    errorToDisplayText: (error: T) => string;
    errorToAlertText: (error: T) => string;
    dialogTitle: string;
    closeConfirmationText: string;
    testIdBase: string;
    downloadButtonText: string;
    closeButtonText: string;
  };
  const props: Props<T> = defineProps<Props<T>>();

  type Emits = {
    (event: 'update:isDialogVisible', isDialogVisible: boolean): void;
    (event: 'download'): void;
  };
  const emit: Emits = defineEmits<Emits>();

  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();
  const confirmCloseDialog: Ref<boolean> = ref(false);

  function closeDialog(): void {
    confirmCloseDialog.value = false;
    emit('update:isDialogVisible', false);
  }
</script>

<template>
  <v-dialog
    :model-value="props.isDialogVisible"
    persistent
  >
    <LayoutCard
      :header="props.dialogTitle"
      :closable="false"
      :data-testid="`${props.testIdBase}-layout-card`"
      @on-close-clicked="confirmCloseDialog = true"
    >
      <v-container style="max-height: 60vh; overflow-y: auto">
        <!-- Custom content slot -->
        <slot />
        <!-- Error list -->
        <ol>
          <li
            v-for="(entry, index) in props.errors"
            :key="index"
            class="text-body font-weight-bold my-2 ml-4"
            :data-testid="`${props.testIdBase}-error-list-item-${index}`"
          >
            <div>
              <span class="text-body font-weight-bold">
                {{ props.errorToDisplayText(entry) }}
              </span>
            </div>
            <div class="ml-4 text-body">
              <v-alert
                class="py-2 px-2"
                type="error"
              >
                {{ props.errorToAlertText(entry) }}
              </v-alert>
            </div>
          </li>
        </ol>
      </v-container>
      <v-card-actions
        class="justify-center"
        style="border-top: 1px solid #e5eaef"
      >
        <v-row class="py-3 px-2 justify-center">
          <v-spacer class="hidden-sm-and-down" />
          <v-col
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              :block="mdAndDown"
              class="secondary"
              :data-testid="`${props.testIdBase}-discard-button`"
              @click="confirmCloseDialog = true"
            >
              {{ props.closeButtonText }}
            </v-btn>
          </v-col>
          <v-col
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              :block="mdAndDown"
              class="primary"
              :data-testid="`${props.testIdBase}-save-button`"
              @click="$emit('download')"
            >
              {{ props.downloadButtonText }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-actions>
    </LayoutCard>
  </v-dialog>

  <v-dialog
    v-model="confirmCloseDialog"
    persistent
    max-width="900"
  >
    <LayoutCard
      :header="props.dialogTitle"
      @on-close-clicked="confirmCloseDialog = false"
    >
      <v-card-text>
        <v-container class="my-4">
          <v-row class="text-body text-error justify-center align-center">
            <v-col
              class="text-center"
              cols="12"
            >
              <v-icon
                class="mr-2 pb-1"
                icon="mdi-alert"
              />
              <span>
                {{ props.closeConfirmationText }}
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
              :data-testid="`cancel-close-bulk-error-dialog-button`"
              @click.stop="confirmCloseDialog = false"
            >
              {{ $t('cancel') }}
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
              :data-testid="`confirm-close-bulk-error-dialog-button`"
              @click.stop="closeDialog"
            >
              {{ $t('close') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-actions>
    </LayoutCard>
  </v-dialog>
</template>

<style scoped>
  .pre-line {
    white-space: pre-wrap;
  }
</style>
