<script setup lang="ts">
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { type Rolle } from '@/stores/RolleStore';
  import { ref, type Ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { type Router, useRouter } from 'vue-router';
  import { useDisplay } from 'vuetify';

  useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  const router: Router = useRouter();

  type Props = {
    errorCode: string;
    rolle: Rolle;
    isLoading: boolean;
  };

  type Emits = {
    (event: 'onDeleteRolle', rolleId: string): void;
  };
  defineProps<Props>();
  const emit: Emits = defineEmits<Emits>();
  const errorMessage: Ref<string> = ref('');
  const successDialogVisible: Ref<boolean> = ref(false);

  function closeRolleDeleteDialog(isActive: Ref<boolean>): void {
    isActive.value = false;
  }

  function handleRolleDelete(rolleId: string): void {
    emit('onDeleteRolle', rolleId);
    successDialogVisible.value = true;
  }

  function closeSuccessDialogAndPushToManagement(): void {
    successDialogVisible.value = false;
    router.push({ name: 'rolle-management' });
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
      :header="$t('admin.rolle.deleteRolle')"
    >
      <v-card-text>
        <v-container>
          <v-row class="text-body bold text-center">
            <v-col cols="12">
              <span data-testid="rolle-delete-success-text">
                {{ $t('admin.rolle.deleteRolleSuccessMessage') }}
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
              data-testid="close-rolle-delete-success-dialog-button"
              @click.stop="closeSuccessDialogAndPushToManagement()"
            >
              {{ $t('close') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-actions>
    </LayoutCard>
  </v-dialog>
  <v-dialog
    v-if="!successDialogVisible"
    persistent
  >
    <template #activator="{ props }">
      <v-btn
        class="secondary button"
        data-testid="open-rolle-delete-dialog-button"
        v-bind="props"
        :block="mdAndDown"
      >
        {{ $t('admin.rolle.deleteRolle') }}
      </v-btn>
    </template>

    <template
      v-if="!successDialogVisible"
      #default="{ isActive }"
    >
      <LayoutCard
        :closable="true"
        :header="$t('admin.rolle.deleteRolle')"
        @on-close-clicked="closeRolleDeleteDialog(isActive)"
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
            <v-row class="text-body bold text-center">
              <v-col cols="12">
                <span data-testid="rolle-delete-confirmation-text">
                  {{ $t('admin.rolle.deleteRolleConfirmation') }}
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
                data-testid="cancel-rolle-delete-button"
                @click.stop="closeRolleDeleteDialog(isActive)"
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
                data-testid="rolle-delete-button"
                :disabled="isLoading"
                @click.stop="handleRolleDelete(rolle.id)"
              >
                {{ $t('admin.rolle.deleteRolle') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </template>
  </v-dialog>
</template>

<style></style>
