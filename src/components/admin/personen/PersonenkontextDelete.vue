<script setup lang="ts">
  import { ref, type Ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useDisplay } from 'vuetify';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';

  useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  type Props = {
    errorCode: string;
    disabled: boolean;
    disabledTooltipText?: string;
    zuordnungCount: number;
  };

  type Emits = {
    (event: 'onDeletePersonenkontext'): void;
  };
  defineProps<Props>();
  const emit: Emits = defineEmits<Emits>();
  const errorMessage: Ref<string> = ref('');
  const successDialogVisible: Ref<boolean> = ref(false);

  function closeZuordnungDeleteDialog(isActive: Ref<boolean>): void {
    isActive.value = false;
  }

  function handleZuordnungDelete(): void {
    emit('onDeletePersonenkontext');
  }
</script>

<template>
  <v-dialog
    v-if="!successDialogVisible"
    persistent
  >
    <template #activator="{ props }">
      <SpshTooltip
        :enabled-condition="!disabled"
        :disabled-text="disabledTooltipText !== undefined ? disabledTooltipText : $t('person.chooseZuordnungFirst')"
        :enabled-text="$t('person.removeZuordnungDescription')"
        position="start"
      >
        <v-btn
          class="primary"
          data-testid="open-zuordnung-delete-dialog-button"
          :disabled="disabled"
          :block="mdAndDown"
          v-bind="props"
        >
          {{ $t('person.removeZuordnung') }}
        </v-btn>
      </SpshTooltip>
    </template>

    <template
      v-if="!successDialogVisible"
      #default="{ isActive }"
    >
      <LayoutCard
        :closable="true"
        :header="$t('person.editZuordnungen')"
        @on-close-clicked="closeZuordnungDeleteDialog(isActive)"
      >
        <v-card-text>
          <v-container>
            <v-row
              v-if="errorMessage || errorCode"
              class="text-body text-error"
            >
              <v-col
                class="text-right"
                cols="1"
              >
                <v-icon icon="mdi-alert" />
              </v-col>
              <v-col>
                <p data-testid="error-text">
                  {{ errorMessage || errorCode }}
                </p>
              </v-col>
            </v-row>
            <v-row class="text-body bold">
              <v-col
                v-if="zuordnungCount == 1"
                offset="2"
                cols="9"
              >
                <span data-testid="last-zuordnung-delete-confirmation-text">
                  {{ $t('person.deleteLastZuordnungConfirmation') }}
                </span>
              </v-col>
              <v-col
                v-else
                offset="3"
                cols="9"
              >
                <span data-testid="zuordnung-delete-confirmation-text">
                  {{ $t('person.deleteZuordnungConfirmation') }}
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
                class="secondary button"
                data-testid="close-zuordnung-delete-dialog-button"
                @click.stop="closeZuordnungDeleteDialog(isActive)"
              >
                {{ $t('no') }}
              </v-btn>
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="mdAndDown"
                class="primary button"
                data-testid="zuordnung-delete-button"
                @click.stop="handleZuordnungDelete()"
              >
                {{ $t('yes') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </template>
  </v-dialog>
</template>

<style></style>
