<script setup lang="ts">
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { type Personendatensatz } from '@/stores/PersonStore';
  import { ref, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useDisplay } from 'vuetify';

  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  type Props = {
    disabled: boolean;
    errorCode: string;
    person: Personendatensatz;
    isLoading: boolean;
  };

  type Emits = {
    (event: 'onSyncPerson', personId: string): void;
  };

  const props: Props = defineProps<Props>();
  const emit: Emits = defineEmits<Emits>();

  const successDialogVisible: Ref<boolean> = ref(false);

  function closeSyncDialog(isActive: Ref<boolean>): void {
    isActive.value = false;
  }

  function closeDialogAndHandlePersonSync(isActive: Ref<boolean>, personId: string): void {
    emit('onSyncPerson', personId);
    isActive.value = false;
    successDialogVisible.value = true;
  }

  function closeSuccessDialog(): void {
    successDialogVisible.value = false;
  }
</script>

<template>
  <v-dialog
    v-model="successDialogVisible"
    persistent
  >
    <LayoutCard
      v-if="successDialogVisible"
      :closable="false"
      :header="$t('admin.person.syncPerson')"
    >
      <v-card-text>
        <v-container>
          <v-row class="text-body bold px-md-16">
            <v-col
              offset="2"
              cols="8"
              class="text-center"
            >
              <span data-testid="person-sync-success-text">
                {{ t('admin.person.syncPersonSuccessMessage') }}
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
              class="primary"
              data-testid="close-person-sync-success-dialog-button"
              @click.stop="closeSuccessDialog()"
            >
              {{ $t('close') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-actions>
    </LayoutCard>
  </v-dialog>
  <v-dialog persistent>
    <template #activator="{ props }">
      <v-col
        cols="12"
        sm="6"
        md="auto"
      >
        <SpshTooltip
          :enabled-condition="!disabled"
          :disabled-text="$t('person.finishEditFirst')"
          :enabled-text="$t('admin.person.syncPerson')"
          position="start"
        >
          <v-btn
            class="primary"
            data-testid="open-person-sync-dialog-button"
            :disabled="disabled"
            v-bind="props"
            :block="mdAndDown"
          >
            {{ $t('admin.person.syncPerson') }}
          </v-btn>
        </SpshTooltip>
      </v-col>
    </template>

    <template
      v-if="!successDialogVisible"
      #default="{ isActive }"
    >
      <LayoutCard
        :closable="true"
        :header="$t('admin.person.syncPerson')"
        @on-close-clicked="closeSyncDialog(isActive)"
      >
        <v-card-text>
          <v-container>
            <v-row
              v-if="props.errorCode"
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
                  {{ t(`errors.${props.errorCode}`) }}
                </p>
              </v-col>
            </v-row>
            <v-row class="text-body bold">
              <v-col
                offset="2"
                cols="8"
                class="text-center"
              >
                <span data-testid="person-sync-confirmation-text">
                  {{ t('admin.person.syncPersonConfirmation') }}
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
                data-testid="close-person-sync-dialog-button"
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
                :block="mdAndDown"
                class="primary button"
                data-testid="person-sync-button"
                :disabled="isLoading"
                @click.stop="closeDialogAndHandlePersonSync(isActive, person.person.id)"
              >
                {{ $t('proceed') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </template>
  </v-dialog>
</template>

<style></style>
