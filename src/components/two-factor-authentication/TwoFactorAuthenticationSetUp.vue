<script setup lang="ts">
  import { ref, type Ref } from 'vue';
  import { type Personendatensatz } from '@/stores/PersonStore';
  import { useDisplay } from 'vuetify';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';
  import SoftwareTokenWorkflow from './SoftwareTokenWorkflow.vue';
  import HardwareTokenWorkflow from './HardwareTokenWorkflow.vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import {
    TokenKind,
    useTwoFactorAuthentificationStore,
    type TwoFactorAuthentificationStore,
  } from '@/stores/TwoFactorAuthentificationStore';

  const selectedOption: Ref<TokenKind> = ref(TokenKind.software);
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();
  const { t }: Composer = useI18n({ useScope: 'global' });
  const twoFactorAuthentificationStore: TwoFactorAuthentificationStore = useTwoFactorAuthentificationStore();
  const tokenIsRequested: Ref<boolean> = ref(false);
  const dialogHeader: Ref<string> = ref(t('admin.person.twoFactorAuthentication.setUpLong'));

  type Emits = {
    (event: 'dialogClosed'): void;
  };

  const emits: Emits = defineEmits<{
    (event: 'dialogClosed'): void;
  }>();

  type Props = {
    errorCode: string;
    disabled: boolean;
    person: Personendatensatz;
    isLoading: boolean;
  };

  const props: Props = defineProps<Props>();

  function close2FADialog(isActive: Ref<boolean>): void {
    if (tokenIsRequested.value) {
      emits('dialogClosed');
      twoFactorAuthentificationStore.qrCode = '';
      twoFactorAuthentificationStore.hasToken = null;
      twoFactorAuthentificationStore.tokenKind = null;
      twoFactorAuthentificationStore.errorCode = '';
    }

    isActive.value = false;
    tokenIsRequested.value = false;
    selectedOption.value = TokenKind.software;
    dialogHeader.value = t('admin.person.twoFactorAuthentication.setUpLong');
  }

  async function requestSoftwareToken(): Promise<void> {
    if (selectedOption.value === TokenKind.software) {
      await twoFactorAuthentificationStore.get2FASoftwareQRCode(props.person.person.id);
    }
    tokenIsRequested.value = true;
  }

  function handleHeaderUpdate(header: string): void {
    dialogHeader.value = header;
  }
</script>

<template>
  <v-dialog persistent>
    <template #activator="{ props }">
      <SpshTooltip
        :enabled-condition="!disabled"
        :disabled-text="$t('person.finishEditFirst')"
        :enabled-text="$t('admin.person.twoFactorAuthentication.setUpShort')"
        position="start"
      >
        <v-btn
          class="primary"
          data-testid="open-2FA-dialog-icon"
          :block="mdAndDown"
          :disabled="disabled"
          v-bind="props"
        >
          {{ $t('admin.person.twoFactorAuthentication.setUpShort') }}
        </v-btn>
      </SpshTooltip>
    </template>

    <template #default="{ isActive }">
      <LayoutCard
        :closable="true"
        :header="dialogHeader"
        data-testid="two-factor-authentication-dialog"
        @on-close-clicked="close2FADialog(isActive)"
      >
        <v-card-text v-if="!tokenIsRequested">
          <v-container>
            <v-row class="text-body bold px-md-16">
              <v-col>
                <v-radio-group v-model="selectedOption">
                  <v-radio
                    :label="$t('admin.person.twoFactorAuthentication.softwareTokenOption')"
                    data-testid="software-token-radio-button"
                    value="software"
                  />
                  <v-radio
                    :label="$t('admin.person.twoFactorAuthentication.hardwareTokenOption')"
                    data-testid="hardware-token-radio-button"
                    value="hardware"
                  />
                </v-radio-group>
              </v-col>
            </v-row>
            <v-row class="text-body px-md-13 align-top">
              <v-col
                class="text-right"
                cols="1"
              >
                <v-icon icon="mdi-information" />
              </v-col>
              <v-col>
                <span
                  v-if="selectedOption === TokenKind.software"
                  class="text-body"
                >
                  {{ $t('admin.person.twoFactorAuthentication.softwareTokenText') }}
                </span>
                <span
                  v-if="selectedOption === TokenKind.hardware"
                  class="text-body"
                >
                  {{ $t('admin.person.twoFactorAuthentication.hardwareTokenText') }}
                </span>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-container v-if="tokenIsRequested">
          <SoftwareTokenWorkflow
            v-if="selectedOption === TokenKind.software"
            :qr-code-image-base64="twoFactorAuthentificationStore.qrCode"
            data-testid="software-token-workflow"
            @update-header="handleHeaderUpdate"
            @on-close-clicked="close2FADialog(isActive)"
          />
          <HardwareTokenWorkflow
            v-if="selectedOption === TokenKind.hardware"
            :error-code="props.errorCode"
            :person="props.person"
            data-testid="hardware-token-workflow"
            @update-header="handleHeaderUpdate"
            @on-close-clicked="close2FADialog(isActive)"
          />
        </v-container>
        <v-card-actions
          v-if="!tokenIsRequested"
          class="justify-center"
        >
          <v-row class="justify-center">
            <v-col
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="mdAndDown"
                class="secondary button"
                data-testid="close-two-factor-authentication-dialog-button"
                @click.stop="close2FADialog(isActive)"
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
                data-testid="proceed-two-factor-authentication-dialog-button"
                :disabled="isLoading"
                @click.stop="requestSoftwareToken()"
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
