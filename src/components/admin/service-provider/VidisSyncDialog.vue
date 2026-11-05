<script setup lang="ts">
  import { computed, ref, type ComputedRef, type ModelRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useDisplay } from 'vuetify';

  import LayoutCard from '@/components/cards/LayoutCard.vue';

  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  type Props = {
    modelValue: boolean;
    errorCode: string;
    isLoading: boolean;
    schuleName: string;
  };

  type Emits = {
    (event: 'update:modelValue', value: boolean): void;
    (event: 'onSyncVidis'): void;
    (event: 'onClose', completed: boolean): void;
  };

  enum State {
    CONFIRM,
    LOADING,
    SUCCESS,
    ERROR,
  }

  const props: Props = defineProps<Props>();
  const emit: Emits = defineEmits<Emits>();
  const model: ModelRef<boolean | undefined> = defineModel<boolean>();

  const hasTriggeredAction: Ref<boolean> = ref(false);
  const isClosing: Ref<boolean> = ref(false);

  const state: ComputedRef<State> = computed(() => {
    if (isClosing.value) {
      return State.SUCCESS;
    }
    if (props.isLoading) {
      return State.LOADING;
    }
    if (hasTriggeredAction.value && props.errorCode) {
      return State.ERROR;
    }
    if (hasTriggeredAction.value && !props.errorCode) {
      return State.SUCCESS;
    }
    return State.CONFIRM;
  });

  function closeSyncDialog(isActive: Ref<boolean>): void {
    isActive.value = false;
    emit('onClose', false);
  }

  function handleSync(): void {
    hasTriggeredAction.value = true;
    emit('onSyncVidis');
  }

  function closeSuccessDialog(isActive: Ref<boolean>): void {
    isClosing.value = true;
    closeSyncDialog(isActive);
    emit('onClose', true);
  }

  const resetState = (): void => {
    hasTriggeredAction.value = false;
    isClosing.value = false;
  };
</script>

<template>
  <v-dialog
    persistent
    v-model="model"
    @after-leave="resetState"
  >
    <template #default="{ isActive }">
      <LayoutCard
        :headline-test-id="
          state === State.SUCCESS
            ? 'vidis-sync-success'
            : state === State.ERROR
              ? 'vidis-sync-error'
              : 'vidis-sync-confirmation'
        "
        :closable="state === State.CONFIRM"
        :header="t('admin.angebot.vidisSync.title')"
        @on-close-clicked="closeSyncDialog(isActive)"
      >
        <v-card-text>
          <v-container>
            <v-row class="text-body bold justify-center">
              <v-col
                class="text-center"
                cols="10"
              >
                <span
                  v-if="state === State.SUCCESS"
                  data-testid="vidis-sync-success-text"
                >
                  {{ $t('admin.angebot.vidisSync.success') }}
                </span>
                <span
                  v-else-if="state === State.ERROR"
                  data-testid="vidis-sync-error-text"
                >
                  {{ $t('admin.angebot.vidisSync.error') }}
                </span>
                <template v-else-if="state === State.LOADING">
                  <v-progress-circular
                    indeterminate
                    class="mb-4"
                  />
                  <p data-testid="vidis-sync-loading-text">
                    {{ $t('admin.angebot.vidisSync.loading') }}
                  </p>
                </template>
                <span
                  v-else
                  data-testid="vidis-sync-confirmation-text"
                >
                  {{ $t('admin.angebot.vidisSync.confirmation', { schuleName: props.schuleName }) }}
                </span>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-row class="justify-center">
            <v-col
              v-if="state === State.CONFIRM"
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="mdAndDown"
                class="secondary button"
                data-testid="cancel-vidis-sync-dialog-button"
                @click.stop="closeSyncDialog(isActive)"
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
                v-if="state === State.SUCCESS"
                :block="mdAndDown"
                class="primary"
                data-testid="close-vidis-sync-success-dialog-button"
                @click.stop="closeSuccessDialog(isActive)"
              >
                {{ $t('close') }}
              </v-btn>
              <v-btn
                v-else-if="state === State.ERROR"
                :block="mdAndDown"
                class="primary"
                data-testid="close-vidis-sync-error-dialog-button"
                @click.stop="closeSyncDialog(isActive)"
              >
                {{ $t('close') }}
              </v-btn>
              <v-btn
                v-else
                :block="mdAndDown"
                class="primary button"
                data-testid="vidis-sync-button"
                :disabled="state === State.LOADING"
                @click.stop="handleSync"
              >
                {{ $t('admin.angebot.vidisSync.action') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </template>
  </v-dialog>
</template>

<style scoped>
  span {
    white-space: pre-wrap;
  }
</style>
