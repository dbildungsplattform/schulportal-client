<script setup lang="ts">
  import { OrganisationsTyp, RollenMerkmal, ServiceProviderSystem } from '@/api-client/generated/api';
  import PasswordReset from '@/components/admin/personen/PasswordReset.vue';
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import SchulzuordnungCard from '@/components/profile/SchulzuordnungCard.vue';
  import SelfServiceWorkflow from '@/components/two-factor-authentication/SelfServiceWorkflow.vue';
  import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
  import { useConfigStore, type ConfigStore } from '@/stores/ConfigStore';
  import { usePersonInfoStore, type PersonInfoStore } from '@/stores/PersonInfoStore';
  import { EmailStatus, usePersonStore, type PersonStore } from '@/stores/PersonStore';
  import {
    useServiceProviderStore,
    type ServiceProviderStore,
    type StartPageServiceProvider,
  } from '@/stores/ServiceProviderStore';
  import {
    TokenKind,
    useTwoFactorAuthentificationStore,
    type TwoFactorAuthentificationStore,
  } from '@/stores/TwoFactorAuthentificationStore';
  import { Zuordnung } from '@/stores/types/Zuordnung';
  import { ItemType, mapToLabelValues, type LabelValue } from '@/utils/personalDataMapper';
  import { computed, onBeforeMount, ref, watch, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useRoute, useRouter, type RouteLocationNormalizedLoaded, type Router } from 'vue-router';
  import { useDisplay } from 'vuetify';

  const { t }: Composer = useI18n({ useScope: 'global' });

  const { xs }: { xs: Ref<boolean> } = useDisplay();
  const route: RouteLocationNormalizedLoaded = useRoute();
  const router: Router = useRouter();
  const kcActionStatus: string | null = route.query['kc_action_status'] as string | null;

  const authStore: AuthStore = useAuthStore();
  const personInfoStore: PersonInfoStore = usePersonInfoStore();
  const personStore: PersonStore = usePersonStore();
  const configStore: ConfigStore = useConfigStore();
  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
  const twoFactorAuthenticationStore: TwoFactorAuthentificationStore = useTwoFactorAuthentificationStore();

  const windowOrigin: string = window.location.origin;
  const loading2FA: Ref<boolean> = ref(false);

  const devicePassword: Ref<string> = ref('');

  /**
   * Groups the given zuordnungen by their sskId.
   * Klassen are grouped by administriertVon, so they end up in the same group as their parent Schule.
   */
  function groupZuordnungen(zuordnungen: Zuordnung[]): Map<string, Zuordnung[]> {
    const groupedZuordnungen: Map<string, Zuordnung[]> = new Map();
    for (const zuordnung of zuordnungen) {
      const key: string = zuordnung.typ === OrganisationsTyp.Klasse ? zuordnung.administriertVon : zuordnung.sskId;
      if (groupedZuordnungen.has(key)) {
        groupedZuordnungen.get(key)?.push(zuordnung);
      } else {
        groupedZuordnungen.set(key, [zuordnung]);
      }
    }
    return groupedZuordnungen;
  }

  const hasKoPersMerkmal: ComputedRef<boolean> = computed(() => {
    return personStore.personenuebersicht?.hasRollenMerkmale([RollenMerkmal.KopersPflicht]) || false;
  });

  // The UEM Angebot is modelled as a service provider with target NONE
  const hasUEMServiceProvider: ComputedRef<boolean> = computed(() => {
    return serviceProviderStore.availableServiceProviders.some(
      (serviceProvider: StartPageServiceProvider) => serviceProvider.externalSystem === ServiceProviderSystem.Uem,
    );
  });

  // Used to show device password block
  const showResetDevicePassword: ComputedRef<boolean> = computed(() => {
    return (configStore.configData?.setUemPasswordEnabled && hasUEMServiceProvider.value) || false;
  });

  // Computed property to get the device password dialog text
  const devicePasswordDialogText: ComputedRef<string> = computed(() => {
    let message: string = t('admin.person.devicePassword.dialogTextProfile');
    if (devicePassword.value) {
      message = `${t('admin.person.resetPasswordSuccessMessage')}\n\n${t('admin.person.devicePassword.dialogTextProfile')}`;
    }
    return message;
  });

  const devicePasswordErrorMessage: ComputedRef<string> = computed(() => {
    let message: string = '';
    if (personStore.errorCode) {
      message = t('admin.person.devicePassword.errorMessage');
    }
    return message;
  });

  async function resetDevicePassword(): Promise<void> {
    await personStore.resetDevicePassword();
    devicePassword.value = personStore.newDevicePassword || '';
  }

  const personalData: ComputedRef<LabelValue[]> = computed(() =>
    personInfoStore.personInfo
      ? mapToLabelValues(
          t,
          {
            vorname: personInfoStore.personInfo.person.name.vorname,
            familienname: personInfoStore.personInfo.person.name.familiennamen,
            username: personInfoStore.personInfo.person.username ?? undefined,
            personalnummer: personInfoStore.personInfo.person.personalnummer ?? null,
            emailStatus: {
              status: personInfoStore.personInfo.email?.status as EmailStatus,
              address: personInfoStore.personInfo.email?.address,
            },
          },
          {
            hasKoPersMerkmal,
            includeKoPers: true,
            includeEmail: true,
          },
        )
      : [],
  );

  const groupedZuordnungen: ComputedRef<Map<string, Zuordnung[]>> = computed(() => {
    if (!personStore.personenuebersicht) {
      return new Map<string, Zuordnung[]>();
    }
    return groupZuordnungen(personStore.personenuebersicht.zuordnungen);
  });

  const lastPasswordChangeDate: ComputedRef<string> = computed(() => {
    const passwordUpdatedAt: string | null | undefined = authStore.currentUser?.password_updated_at;
    if (!passwordUpdatedAt) {
      return '';
    }
    const date: Date = new Date(passwordUpdatedAt);
    if (isNaN(date.valueOf())) {
      return '';
    }
    return new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  });

  const twoFactorAuthError: ComputedRef<string> = computed(() => {
    // Early return if loading
    if (twoFactorAuthenticationStore.loading) {
      return '';
    }

    switch (twoFactorAuthenticationStore.errorCode) {
      case 'TOKEN_STATE_ERROR':
        return t('admin.person.twoFactorAuthentication.errors.tokenStateSelfServiceError');
      case 'PI_UNAVAILABLE_ERROR':
        return t('admin.person.twoFactorAuthentication.errors.connection');
      default:
        return '';
    }
  });

  function handleGoToPreviousPage(): void {
    const previousUrl: string | null = sessionStorage.getItem('previousUrl');
    router.push(previousUrl ?? '/start');
  }

  async function initializeStores(): Promise<void> {
    await personInfoStore.initPersonInfo();
  }

  const isPasswordResetDialogActive: Ref<boolean> = ref(false);
  const showChangedPasswordDialog: Ref<boolean> = ref(true);

  function closeChangePasswordDialog(): void {
    isPasswordResetDialogActive.value = false;
  }

  function openChangePasswordDialog(): void {
    isPasswordResetDialogActive.value = true;
  }

  function closePasswordChangedDialogAndClearQuery(): void {
    showChangedPasswordDialog.value = false;
    router.replace({ path: route.fullPath, query: {} });
  }

  function navigateToPasswordChange(): void {
    const url: URL = new URL(window.origin + '/api/auth/reset-password');
    url.searchParams.set('redirectUrl', windowOrigin + route.fullPath);
    url.searchParams.set('login_hint', personInfoStore.personInfo?.person.username ?? '');
    window.location.href = url.toString();
  }

  watch(
    () => personInfoStore.personInfo?.person.id,
    async (personId: string | undefined) => {
      if (!personId) {
        return;
      }
      loading2FA.value = true;

      const twoFARequirementPromise: Promise<void> = twoFactorAuthenticationStore.get2FARequirement(personId);
      const personUebersichtPromise: Promise<void> = personStore.getPersonenuebersichtById(personId);
      const availableServiceProvidersPromise: Promise<void> = serviceProviderStore.getAvailableServiceProviders();
      const twoFAStatePromise: Promise<void> = twoFactorAuthenticationStore.get2FAState(personId);

      await Promise.all([
        twoFARequirementPromise,
        personUebersichtPromise,
        availableServiceProvidersPromise,
        twoFAStatePromise,
      ]);
      loading2FA.value = false;
    },
    { immediate: true },
  );

  onBeforeMount(async () => {
    await initializeStores();
  });
</script>

<template>
  <v-btn
    class="mt-8"
    data-testid="back-to-previous-page-button"
    @click="handleGoToPreviousPage()"
  >
    <v-icon
      class="mr-2"
      icon="mdi-arrow-left-thin"
    />
    {{ $t('nav.backToPreviousPage') }}
  </v-btn>
  <div class="my-8">
    <v-row class="flex-nowrap mb-1 justify-center">
      <v-col cols="auto">
        <h2
          class="headline-1"
          data-testid="profile-headline"
        >
          {{ $t('nav.profile') }}
        </h2>
      </v-col>
    </v-row>
    <v-row>
      <v-col
        cols="12"
        sm="12"
        md="6"
        class="d-flex flex-column ga-8"
      >
        <LayoutCard
          :header="$t('profile.personalData')"
          :headline-test-id="'layout-card-headline-persoenliche-daten'"
        >
          <v-row class="ma-4">
            <v-col cols="12">
              <v-table class="text-body-large">
                <template #default>
                  <tbody>
                    <tr
                      v-for="item in personalData"
                      :key="item.label"
                    >
                      <td v-if="item.type === ItemType.KO_PERS && item.value === null">
                        <SpshTooltip
                          :disabled-text="t('profile.koPersNummerMissing')"
                          :enabled-text="t('profile.koPersNummerMissing')"
                          position="top"
                        >
                          <span
                            v-if="item.labelAbbr"
                            class="text-red"
                          >
                            <strong>{{ item.labelAbbr }}</strong> :</span
                          >
                          <strong v-else>{{ item.label }}:</strong>
                        </SpshTooltip>
                      </td>
                      <td v-else>
                        <span v-if="item.labelAbbr"
                          ><abbr :title="item.label"
                            ><strong :data-testid="item.testIdLabel">{{ item.labelAbbr }}:</strong></abbr
                          ></span
                        >
                        <strong
                          v-else
                          :data-testid="item.testIdLabel"
                          >{{ item.label }}:</strong
                        >
                      </td>
                      <td
                        v-if="item.type === ItemType.KO_PERS && item.value === null"
                        :data-testid="item.testIdValue"
                        class="text-red"
                      >
                        {{ t('missing') }}
                      </td>
                      <td
                        v-else
                        :data-testid="item.testIdValue"
                      >
                        <v-row
                          class="align-center"
                          no-gutters
                        >
                          <SpshTooltip
                            v-if="item.tooltip"
                            enabled-condition
                            :enabled-text="item.tooltip"
                            position="bottom"
                          >
                            <v-icon
                              aria-hidden="true"
                              class="mr-2"
                              icon="mdi-alert-circle-outline"
                              size="small"
                            />
                          </SpshTooltip>
                          <span>{{ item.value }}</span>
                        </v-row>
                      </td>
                    </tr>
                  </tbody>
                </template>
              </v-table>
              <p
                class="pt-4 text-center text-body-large text-medium-emphasis"
                data-testid="info-text-with-icon"
                style="white-space: normal"
              >
                <v-icon
                  class="mr-2"
                  icon="mdi-information-slab-circle-outline"
                  data-testid="info-icon"
                />
                <span data-testid="info-text">
                  {{ $t('profile.infoAboutChangeabilityFromPersonalData') }}
                </span>
              </p>
            </v-col>
          </v-row>
        </LayoutCard>
        <LayoutCard
          data-testid="password-card"
          :headline-test-id="'new-password-card'"
          :header="$t('login.password')"
          class="text-body"
        >
          <v-row class="ma-4 text-body align-center justify-center">
            <v-col class="text-center px-0">
              <v-row>
                <p
                  v-if="lastPasswordChangeDate"
                  class="w-100"
                >
                  {{
                    t('profile.lastPasswordChange', {
                      date: lastPasswordChangeDate,
                    })
                  }}
                </p>
              </v-row>
              <v-row class="d-flex align-center justify-center">
                <v-col class="d-flex justify-center">
                  <v-btn
                    class="primary"
                    data-testid="open-change-password-dialog-button"
                    :block="xs"
                    @click="openChangePasswordDialog()"
                  >
                    {{ $t('profile.changePassword') }}
                  </v-btn>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
          <v-dialog
            v-model="isPasswordResetDialogActive"
            persistent
          >
            <LayoutCard
              :closable="true"
              :header="$t('profile.changePassword')"
              @on-close-clicked="closeChangePasswordDialog()"
            >
              <v-card-text>
                <v-container class="d-flex align-center">
                  <v-col
                    cols="1"
                    class="d-flex justify-center"
                  >
                    <v-icon
                      class="mr-2"
                      size="x-large"
                      icon="mdi-information-slab-circle-outline"
                    />
                  </v-col>
                  <v-col>
                    <p class="text-body bold">
                      {{ $t('profile.changePasswordInfo') }}
                    </p>
                  </v-col>
                </v-container>
              </v-card-text>
              <v-card-actions class="d-flex justify-center">
                <v-row class="d-flex justify-center align-center">
                  <v-col
                    cols="12"
                    sm="6"
                    md="4"
                    class="d-flex justify-center"
                  >
                    <v-btn
                      class="secondary button w-100"
                      data-testid="close-change-password-dialog-button"
                      @click.stop="closeChangePasswordDialog()"
                    >
                      {{ $t('cancel') }}
                    </v-btn>
                  </v-col>
                  <v-col
                    cols="12"
                    sm="6"
                    md="4"
                    class="d-flex justify-center"
                  >
                    <v-btn
                      class="primary w-100"
                      data-testid="change-password-button"
                      @click.stop="navigateToPasswordChange()"
                    >
                      {{ $t('profile.changePassword') }}
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-actions>
            </LayoutCard>
          </v-dialog>
        </LayoutCard>
        <template v-if="loading2FA">
          <v-row class="ma-3 align-center justify-center">
            <v-progress-circular
              indeterminate
              size="64"
              color="primary"
              data-testid="loading-spinner"
            />
          </v-row>
        </template>
        <LayoutCard
          v-else-if="twoFactorAuthenticationStore.required"
          :headline-test-id="'two-factor-card'"
          :header="$t('profile.twoFactorAuth')"
        >
          <v-row class="ma-4 text-body align-center justify-center">
            <v-col
              v-if="twoFactorAuthenticationStore.hasToken || twoFactorAuthError"
              cols="12"
            >
              <v-row>
                <v-col
                  cols="1"
                  class="text-right align-self-center"
                >
                  <v-icon
                    v-if="twoFactorAuthError"
                    color="warning"
                    icon="mdi-alert-outline"
                  />
                  <v-icon
                    v-else-if="twoFactorAuthenticationStore.hasToken === true"
                    color="green"
                    icon="mdi-check-circle"
                  />
                </v-col>
                <v-col data-testid="two-factor-info">
                  <template v-if="twoFactorAuthError">
                    {{ twoFactorAuthError }}
                  </template>
                  <template v-else-if="twoFactorAuthenticationStore.hasToken === true">
                    <template v-if="twoFactorAuthenticationStore.tokenKind === TokenKind.software">
                      {{ $t('admin.person.twoFactorAuthentication.softwareTokenIsSetUpSelfService') }}
                    </template>
                    <template v-else-if="twoFactorAuthenticationStore.tokenKind === TokenKind.hardware">
                      {{
                        $t('admin.person.twoFactorAuthentication.hardwareTokenIsSetUpSelfService', {
                          serialNumber: twoFactorAuthenticationStore.serial,
                        })
                      }}
                    </template>
                  </template>
                </v-col>
              </v-row>
            </v-col>
            <v-col
              v-else
              cols="12"
            >
              <v-row class="justify-center">
                <v-col
                  class="text-center align-self-center"
                  data-testid="two-factor-info"
                >
                  <v-icon
                    color="warning"
                    icon="mdi-alert-circle"
                  />
                  {{ $t('admin.person.twoFactorAuthentication.secondFactorNotSet') }}
                </v-col>
              </v-row>
            </v-col>
            <v-col
              v-if="!twoFactorAuthError"
              cols="12"
            >
              <v-row>
                <template v-if="twoFactorAuthenticationStore.hasToken === false">
                  <SelfServiceWorkflow
                    :person-id="personInfoStore.personInfo?.person.id ?? ''"
                    @update-state="
                      twoFactorAuthenticationStore.get2FAState(personInfoStore.personInfo?.person.id ?? '')
                    "
                  />
                </template>
                <template v-else-if="twoFactorAuthenticationStore.hasToken === true">
                  <v-col
                    cols="1"
                    class="text-right align-self-center"
                  >
                    <v-icon
                      class="mb-2"
                      icon="mdi-information"
                    />
                  </v-col>
                  <v-col>
                    <p>
                      {{ $t('admin.person.twoFactorAuthentication.questionsProblems') }}
                    </p>
                  </v-col>
                </template>
              </v-row>
            </v-col>
          </v-row>
        </LayoutCard>
        <LayoutCard
          v-if="showResetDevicePassword"
          data-testid="reset-device-password-card"
          headline-test-id="reset-device-password-card-headline"
          :header="$t('admin.person.devicePassword.header')"
          class="text-body"
        >
          <v-row class="ma-4 text-body align-center justify-center">
            <v-col class="text-center px-0">
              <v-row class="d-flex align-center justify-center">
                <PasswordReset
                  :button-text="$t('admin.person.devicePassword.createPassword')"
                  :confirm-button-text="$t('admin.person.devicePassword.createPassword')"
                  :dialog-header="$t('admin.person.devicePassword.createDevicePassword')"
                  :dialog-text="devicePasswordDialogText"
                  :error-code="personStore.errorCode"
                  :error-message="devicePasswordErrorMessage"
                  :is-loading="personStore.loading"
                  :password="devicePassword"
                  :test-id="'device-password'"
                  @on-clear-password="devicePassword = ''"
                  @on-reset-password="resetDevicePassword()"
                />
              </v-row>
              <v-row class="d-flex justify-center">
                <v-col
                  class="text-right"
                  cols="1"
                >
                  <v-icon
                    class="mb-2"
                    icon="mdi-information"
                  />
                </v-col>
                <v-col class="text-left">
                  <p
                    class="white-space-pre-wrap"
                    data-testid="device-password-info-text"
                  >
                    {{ $t('admin.person.devicePassword.infoTextProfile') }}
                  </p>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </LayoutCard>
      </v-col>
      <v-col
        cols="12"
        sm="12"
        md="6"
        class="d-flex flex-column ga-8"
      >
        <SchulzuordnungCard
          v-for="(zuordnungen, index) in Array.from(groupedZuordnungen.values())"
          :key="`zuordnung-${index}`"
          :zuordnungen="zuordnungen"
          :show-number="groupedZuordnungen.size > 1"
          :index="index"
        />
      </v-col>
    </v-row>
  </div>

  <template v-if="kcActionStatus && kcActionStatus != 'cancelled'">
    <v-dialog
      v-model="showChangedPasswordDialog"
      persistent
    >
      <LayoutCard
        :closable="true"
        :header="$t('profile.changePassword')"
        @on-close-clicked="closePasswordChangedDialogAndClearQuery()"
      >
        <v-card-text>
          <v-container class="d-flex align-center">
            <v-col
              cols="auto"
              class="d-flex justify-center"
            >
              <v-icon
                class="mr-2"
                size="x-large"
                icon="mdi-information-slab-circle-outline"
              />
            </v-col>
            <v-col>
              <p class="text-body bold">
                {{
                  kcActionStatus == 'success'
                    ? $t('profile.successFullPasswordChange')
                    : $t('profile.errorPasswordChange')
                }}
              </p>
            </v-col>
          </v-container>
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-btn
            class="secondary button"
            data-testid="close-password-changed-dialog-button"
            :block="xs"
            @click.stop="closePasswordChangedDialogAndClearQuery()"
          >
            {{ $t('close') }}
          </v-btn>
        </v-card-actions>
      </LayoutCard>
    </v-dialog>
  </template>
</template>

<style scoped>
  * {
    white-space: normal !important;
  }
</style>
