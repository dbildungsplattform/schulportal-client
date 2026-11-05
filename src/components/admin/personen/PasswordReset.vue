<script setup lang="ts">
  import { type Ref } from 'vue';
  import { type Composer, useI18n } from 'vue-i18n';
  import { useDisplay } from 'vuetify';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import PasswordOutput from '@/components/form/PasswordOutput.vue';
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';
  import { print } from '@/utils/print';

  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  type Props = {
    buttonText: string;
    confirmButtonText: string;
    dialogHeader: string;
    dialogText: string;
    disabled?: boolean;
    errorCode: string;
    errorMessage?: string;
    isLoading: boolean;
    password: string;
    testId: string;
  };

  type Emits = {
    (event: 'onClearPassword'): void;
    (event: 'onResetPassword'): void;
  };

  const props: Props = defineProps<Props>();
  const emit: Emits = defineEmits<Emits>();

  function closePasswordResetDialog(isActive: Ref<boolean>): void {
    isActive.value = false;
    emit('onClearPassword');
  }

  const printPassword = (): void => {
    print(t('person.password'), props.password);
  };
</script>

<template>
  <v-dialog
    ref="password-reset-dialog"
    persistent
  >
    <template #activator="{ props }">
      <v-col
        cols="12"
        sm="6"
        md="auto"
      >
        <SpshTooltip
          :enabled-condition="!disabled"
          :disabled-text="$t('person.finishEditFirst')"
          :enabled-text="buttonText"
          position="start"
        >
          <v-btn
            class="primary"
            :data-testid="`open-${testId}-dialog-button`"
            :block="mdAndDown"
            :disabled="disabled"
            v-bind="props"
          >
            {{ buttonText }}
          </v-btn>
        </SpshTooltip>
      </v-col>
    </template>

    <template #default="{ isActive }">
      <LayoutCard
        :closable="true"
        :header="dialogHeader"
        headline-test-id="password-reset-dialog-header"
        @on-close-clicked="closePasswordResetDialog(isActive)"
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
            <v-row
              v-if="!errorMessage && !errorCode"
              class="text-body bold px-md-16"
            >
              <v-col>
                <p
                  class="text-center"
                  data-testid="password-reset-info-text"
                >
                  {{ dialogText }}
                </p>
              </v-col>
            </v-row>
            <v-row class="px-md-16">
              <v-col cols="12">
                <PasswordOutput :password="password" />
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
                v-if="!!password"
                :block="mdAndDown"
                class="primary button"
                data-testid="close-password-reset-dialog-button"
                @click.stop="closePasswordResetDialog(isActive)"
              >
                {{ $t('close') }}
              </v-btn>
              <v-btn
                v-else
                :block="mdAndDown"
                class="secondary button"
                data-testid="close-password-reset-dialog-button"
                @click.stop="closePasswordResetDialog(isActive)"
              >
                {{ $t('close') }}
              </v-btn>
            </v-col>
            <v-col
              v-if="!errorMessage"
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                v-if="!!password"
                :block="mdAndDown"
                class="secondary button"
                data-testid="password-print-button"
                @click="printPassword"
              >
                {{ $t('admin.person.printPassword') }}
              </v-btn>
              <v-btn
                v-else
                :block="mdAndDown"
                class="primary button"
                data-testid="password-reset-button"
                :disabled="!!password || isLoading"
                @click.stop="$emit('onResetPassword')"
              >
                {{ confirmButtonText }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </template>
  </v-dialog>
</template>

<style></style>
