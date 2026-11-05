<script setup lang="ts">
  import { computed, nextTick, ref, type ComputedRef, type Ref } from 'vue';
  import { useDisplay } from 'vuetify';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import {
    useTwoFactorAuthentificationStore,
    type TwoFactorAuthentificationStore,
  } from '@/stores/TwoFactorAuthentificationStore';

  const { xs }: { xs: Ref<boolean> } = useDisplay();
  const { t }: Composer = useI18n({ useScope: 'global' });
  const twoFactorStore: TwoFactorAuthentificationStore = useTwoFactorAuthentificationStore();

  enum TwoFactorSteps {
    Start = 'start',
    QRCode = 'qrcode',
    Verify = 'verify',
  }

  const otpInput: Ref<HTMLElement | null> = ref<HTMLElement | null>(null);
  const workflowStep: Ref<TwoFactorSteps> = ref(TwoFactorSteps.Start);
  const errorMessage: Ref<string> = ref('');
  const otp: Ref<string> = ref('');

  const dialogHeader: ComputedRef<string> = computed(() => {
    switch (workflowStep.value) {
      case TwoFactorSteps.Start:
        return t('admin.person.twoFactorAuthentication.setUpShort');
      case TwoFactorSteps.QRCode:
        return t('admin.person.twoFactorAuthentication.softwareTokenOption');
      case TwoFactorSteps.Verify:
        return t('admin.person.twoFactorAuthentication.header');
      default:
        return t('admin.person.twoFactorAuthentication.setUpLong');
    }
  });

  type Emits = {
    (event: 'updateState'): void;
  };

  const emits: Emits = defineEmits<{
    (event: 'updateState'): void;
  }>();

  type Props = {
    personId: string;
  };

  const props: Props = defineProps<Props>();

  function close2FADialog(isActive: Ref<boolean>): void {
    isActive.value = false;
    twoFactorStore.qrCode = '';
    twoFactorStore.errorCode = '';
    workflowStep.value = TwoFactorSteps.Start;
    errorMessage.value = '';
  }

  function resetErrorMessage(): void {
    errorMessage.value = '';
    twoFactorStore.errorCode = '';
  }

  async function proceedToNextWorkflowStep(isActive: Ref<boolean>): Promise<void> {
    switch (workflowStep.value) {
      case TwoFactorSteps.Start:
        workflowStep.value = TwoFactorSteps.QRCode;
        await twoFactorStore.get2FASoftwareQRCode(props.personId);
        break;
      case TwoFactorSteps.QRCode:
        workflowStep.value = TwoFactorSteps.Verify;
        nextTick(() => {
          otpInput.value?.focus();
        });
        break;
      case TwoFactorSteps.Verify:
        if (otp.value.length !== 6) {
          errorMessage.value = t('admin.person.twoFactorAuthentication.otpNotSelected');
          return;
        }
        await twoFactorStore.verify2FAToken(props.personId, otp.value);

        if (twoFactorStore.errorCode !== '') {
          otp.value = '';
          errorMessage.value = t(`admin.person.twoFactorAuthentication.errors.${twoFactorStore.errorCode}`);
          return;
        } else {
          twoFactorStore.resetState();
          close2FADialog(isActive);
          emits('updateState');
        }
    }
  }
</script>

<template>
  <v-dialog persistent>
    <template #activator="{ props }">
      <v-row class="d-flex align-center justify-center">
        <v-col class="d-flex justify-center">
          <v-btn
            class="primary"
            data-testid="open-2FA-self-service-dialog-icon"
            v-bind="props"
            :block="xs"
          >
            {{ $t('admin.person.twoFactorAuthentication.setUpShort') }}
          </v-btn>
        </v-col>
      </v-row>
    </template>

    <template #default="{ isActive }">
      <LayoutCard
        :closable="true"
        :header="dialogHeader"
        data-testid="two-factor-authentication-dialog"
        @on-close-clicked="close2FADialog(isActive)"
      >
        <v-card-text class="py-0">
          <v-container v-if="workflowStep === TwoFactorSteps.Start">
            <v-row class="text-body bold px-md-16">
              <div class="v-col">
                <p
                  class="text-body"
                  data-testid="self-service-dialog-info-text"
                >
                  {{ $t('admin.person.twoFactorAuthentication.qrCodeInfo') }}
                </p>
              </div>
            </v-row>
            <v-row class="text-body bold px-md-16 mt-6">
              <v-col class="d-flex">
                <v-icon
                  icon="mdi-alert-circle"
                  color="orange"
                />
                <span
                  class="ml-4"
                  data-testid="self-service-dialog-warning-text"
                >
                  {{ $t('admin.person.twoFactorAuthentication.softwareOnDevice') }}
                </span>
              </v-col>
            </v-row>
          </v-container>
          <v-container v-if="workflowStep === TwoFactorSteps.QRCode">
            <v-container v-if="!twoFactorStore.errorCode">
              <v-row class="text-body bold px-md-16">
                <div class="v-col">
                  <p
                    class="text-body"
                    data-testid="self-service-dialog-qr-info-text"
                  >
                    {{ $t('admin.person.twoFactorAuthentication.pleaseScan') }}
                  </p>
                </div>
              </v-row>
              <v-row
                v-if="twoFactorStore.qrCode.length === 0"
                class="justify-center"
              >
                <v-progress-circular
                  size="250"
                  width="250"
                  indeterminate
                  data-testid="software-token-dialog-progress-bar"
                />
              </v-row>
              <v-row
                v-if="twoFactorStore.qrCode.length > 0"
                class="justify-center"
              >
                <v-img
                  class="printable-content image-width"
                  :src="twoFactorStore.qrCode"
                  max-width="250"
                  data-testid="software-token-dialog-qr-code"
                />
              </v-row>
            </v-container>
            <v-container v-else>
              <v-row>
                <p
                  class="text-body bold"
                  data-testid="self-service-token-init-error-text"
                >
                  {{ $t('admin.person.twoFactorAuthentication.errors.selfServiceTokenInitError') }}
                </p>
              </v-row>
            </v-container>
          </v-container>
          <v-container
            v-if="workflowStep === TwoFactorSteps.Verify"
            class="fill-height"
          >
            <v-row class="fill-height justify-center">
              <v-col
                cols="12"
                md="8"
              >
                <v-row class="text-body bold px-md-16 justify-center">
                  <v-col>
                    <p
                      data-testid="self-service-otp-entry-info-text"
                      class="text-center"
                    >
                      {{ $t('admin.person.twoFactorAuthentication.enterOtp') }}
                    </p>
                  </v-col>
                </v-row>

                <v-row class="justify-center mt-0">
                  <v-otp-input
                    ref="otpInput"
                    v-model="otp"
                    :error="errorMessage.length > 0"
                    data-testid="self-service-otp-input"
                    @input="resetErrorMessage()"
                    @keydown.enter="proceedToNextWorkflowStep(isActive)"
                  />
                </v-row>

                <v-row
                  v-if="errorMessage.length > 0"
                  class="text-body bold justify-center text-error mt-0"
                >
                  <p
                    class="justify-center text-center"
                    data-testid="self-service-otp-error-text"
                  >
                    {{ errorMessage }}
                  </p>
                </v-row>

                <v-row
                  v-if="errorMessage.length === 0"
                  class="text-body bold justify-center mt-0"
                  data-testid="self-service-token-verify-error-text"
                >
                  <p class="mt-0 justify-center">
                    {{ $t('admin.person.twoFactorAuthentication.otp') }}
                  </p>
                </v-row>
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
                :block="xs"
                :class="!twoFactorStore.errorCode || workflowStep == TwoFactorSteps.Verify ? 'secondary' : 'primary'"
                data-testid="close-two-factor-authentication-dialog"
                @click.stop="close2FADialog(isActive)"
              >
                {{ $t('cancel') }}
              </v-btn>
            </v-col>
            <v-col
              v-if="!twoFactorStore.errorCode || workflowStep == TwoFactorSteps.Verify"
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="xs"
                class="primary button"
                data-testid="proceed-two-factor-authentication-dialog"
                @click.stop="proceedToNextWorkflowStep(isActive)"
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
