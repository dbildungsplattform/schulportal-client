<script setup lang="ts">
  import type { PersonTimeLimitInfoResponse } from '@/api-client/generated';
  import SpshBanner from '@/components/alert/SpshBanner.vue';
  import ServiceProviderCategory from '@/components/layout/ServiceProviderCategory.vue';
  import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
  import { useMeldungStore, type Meldung, type MeldungStore } from '@/stores/MeldungStore';
  import { usePersonInfoStore, type PersonInfoStore } from '@/stores/PersonInfoStore';
  import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
  import { RollenMerkmal } from '@/stores/RolleStore';
  import {
    ServiceProviderKategorie,
    useServiceProviderStore,
    type StartPageServiceProvider,
    type ServiceProviderStore,
  } from '@/stores/ServiceProviderStore';
  import {
    useTwoFactorAuthentificationStore,
    type TwoFactorAuthentificationStore,
  } from '@/stores/TwoFactorAuthentificationStore';
  import type { Zuordnung } from '@/stores/types/Zuordnung';
  import { adjustDateForTimezoneAndFormat } from '@/utils/date';
  import { getLogoPath } from '@/utils/logosConfig';
  import { computed, onBeforeMount, onMounted, ref, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';

  const { t }: Composer = useI18n();

  export type Alert = {
    id: string;
    message: string;
    visible: boolean;
    type: 'errorLight' | 'warning';
  };

  const personInfoStore: PersonInfoStore = usePersonInfoStore();
  const personStore: PersonStore = usePersonStore();
  const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
  const twoFactorAuthentificationStore: TwoFactorAuthentificationStore = useTwoFactorAuthentificationStore();
  const authStore: AuthStore = useAuthStore();
  const meldungStore: MeldungStore = useMeldungStore();

  function filterSortProviders(
    providers: StartPageServiceProvider[],
    kategorie: ServiceProviderKategorie,
  ): StartPageServiceProvider[] {
    return providers
      .filter((provider: StartPageServiceProvider) => provider.kategorie === kategorie)
      .sort((a: StartPageServiceProvider, b: StartPageServiceProvider) => a.name.localeCompare(b.name));
  }

  // Filter service providers by category "EMAIL"
  const emailServiceProviders: ComputedRef<StartPageServiceProvider[]> = computed(() =>
    filterSortProviders(serviceProviderStore.availableServiceProviders, ServiceProviderKategorie.Email),
  );
  // Filter service providers by category "UNTERRICHT"
  const classServiceProviders: ComputedRef<StartPageServiceProvider[]> = computed(() =>
    filterSortProviders(serviceProviderStore.availableServiceProviders, ServiceProviderKategorie.Unterricht),
  );
  // Filter service providers by category "VERWALTUNG"
  const administrationServiceProviders: ComputedRef<StartPageServiceProvider[]> = computed(() =>
    filterSortProviders(serviceProviderStore.availableServiceProviders, ServiceProviderKategorie.Verwaltung),
  );
  // Filter service providers by category "SCHULISCH"
  const schulischServiceProviders: ComputedRef<StartPageServiceProvider[]> = computed(() =>
    filterSortProviders(serviceProviderStore.availableServiceProviders, ServiceProviderKategorie.Schulisch),
  );
  // Filter service providers by category "HINWEISE"
  const hintsServiceProviders: ComputedRef<StartPageServiceProvider[]> = computed(() =>
    filterSortProviders(serviceProviderStore.availableServiceProviders, ServiceProviderKategorie.Hinweise),
  );

  function getHasToken(): boolean {
    return twoFactorAuthentificationStore.hasToken ?? false;
  }

  const hasKoPersMerkmal: ComputedRef<boolean> = computed(() => {
    return (
      personStore.personenuebersicht?.zuordnungen.find((zuordnung: Zuordnung) => {
        return zuordnung.merkmale.includes(RollenMerkmal.KopersPflicht);
      }) !== undefined
    );
  });

  function getUrgencyType(date: Date): 'errorLight' | 'warning' {
    const error: boolean = date.valueOf() < new Date().valueOf() + 14 * 24 * 60 * 60 * 1000;
    return error ? 'errorLight' : 'warning';
  }

  function addAlert(alerts: Alert[], occasion: string, messageKey: string): void {
    const lockInfos: PersonTimeLimitInfoResponse[] = authStore.timeLimitInfos.filter(
      (info: PersonTimeLimitInfoResponse) => info.occasion === occasion,
    );
    lockInfos.forEach((lockInfo: PersonTimeLimitInfoResponse) => {
      const message: string = t(messageKey, {
        date: adjustDateForTimezoneAndFormat(lockInfo.deadline),
        ...(occasion === 'PERSONENKONTEXT_EXPIRES' && { schule: lockInfo.school, rolle: lockInfo.rolle }),
      });

      const id: string = lockInfo.school
        ? `${lockInfo.occasion}_${lockInfo.school}_${lockInfo.rolle}`
        : lockInfo.occasion;

      alerts.push({
        id: id,
        message: message,
        visible: true,
        type: getUrgencyType(new Date(lockInfo.deadline)),
      });
    });
  }

  function getBannerAlerts(): Alert[] {
    const alerts: Alert[] = [];

    if (!personInfoStore.personInfo?.person.personalnummer && hasKoPersMerkmal.value) {
      addAlert(alerts, 'KOPERS', 'banner.kopers');
    }

    addAlert(alerts, 'NO_KONTEXTE', 'banner.noKontexte');
    addAlert(alerts, 'PERSONENKONTEXT_EXPIRES', 'banner.kontextExpires');

    return alerts;
  }

  async function initializeStores(): Promise<void> {
    await Promise.all([
      authStore.initializeAuthStatus(),
      personInfoStore.initPersonInfo(),
      meldungStore.getCurrentMeldung(),
    ]);
    const personId: string | undefined = personInfoStore.personInfo?.person.id;
    if (personId) {
      await personStore.getPersonenuebersichtById(personId);
    }
  }

  const closedAlerts: Ref<Set<string>> = ref(new Set());
  let alerts: Ref<Alert[]> = ref([]);
  let hinweise: Ref<Meldung[]> = ref([]);

  onMounted(async () => {
    sessionStorage.setItem('previousUrl', window.location.pathname + window.location.search);

    await authStore.initializeAuthStatus();
    const personId: string | null | undefined = authStore.currentUser?.personId;

    // Load all service providers first
    await serviceProviderStore.getMyServiceProviders();

    // Load all logos in parallel and assign them to the respective service providers
    const logoPromises: Promise<void>[] = serviceProviderStore.availableServiceProviders.map(
      async (p: StartPageServiceProvider) => {
        if (p.logoId) {
          p.logoUrl = getLogoPath(p.logoId);
        } else if (p.hasLogo) {
          await serviceProviderStore.getServiceProviderLogoById(p.id);
          p.logoUrl = serviceProviderStore.serviceProviderLogos.get(p.id);
        }
      },
    );

    const twoFAStatePromise: Promise<void> = personId
      ? twoFactorAuthentificationStore.get2FAState(personId)
      : Promise.resolve();

    await Promise.allSettled([...logoPromises, twoFAStatePromise]);
  });

  onBeforeMount(async () => {
    await initializeStores();
    alerts.value = getBannerAlerts();
    const closedAlertsStr: string | null = sessionStorage.getItem('closedAlerts');
    if (closedAlertsStr) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      closedAlerts.value = new Set(JSON.parse(closedAlertsStr));
      alerts.value.forEach((alert: Alert) => {
        if (closedAlerts.value.has(alert.id.toString())) {
          alert.visible = false;
        }
      });
    }

    hinweise.value = [meldungStore.currentMeldung].filter(
      (meldung: Meldung | null): meldung is Meldung => meldung !== null,
    );
  });

  const dismissBannerForSession = (id: string): void => {
    alerts.value.find((alert: Alert) => alert.id === id)!.visible = false;
    closedAlerts.value.add(id);
    sessionStorage.setItem('closedAlerts', JSON.stringify(Array.from(closedAlerts.value)));
  };
</script>

<template>
  <v-card
    class="pr-3"
    flat
  >
    <v-row class="flex-nowrap mb-1 justify-center">
      <v-col cols="auto">
        <h2
          class="headline-1"
          data-testid="start-card-headline"
        >
          {{ $t('homePage') }}
        </h2>
      </v-col>
    </v-row>

    <v-row class="flex-nowrap mb-1 justify-center">
      <v-col cols="12">
        <!-- Banner for hinweise -->
        <SpshBanner
          v-for="hinweis in hinweise"
          id="hinweis"
          :key="hinweis.id"
          ref="hinweis-banner"
          type="background-grey"
          :visible="true"
          :dismissable="false"
        >
          <template #text>
            <span class="text-body">
              <v-textarea
                v-model="hinweis.text"
                variant="plain"
                :hide-details="true"
                readonly
                auto-grow
                rows="1"
              />
            </span>
          </template>
        </SpshBanner>

        <!-- Banner for alerts -->
        <SpshBanner
          v-for="alert in alerts"
          :id="alert.id.toString()"
          :key="alert.id"
          ref="spsh-banner"
          :type="alert.type"
          :visible="alert.visible"
          :dismissable="true"
          @dismiss-banner="dismissBannerForSession"
        >
          <template #text>
            <span class="text-body bold">{{ $t('banner.hint') }} </span>
            <span
              class="text-body"
              data-testid="alert-text"
              >{{ alert.message }}</span
            >
          </template>
        </SpshBanner>
      </v-col>
    </v-row>

    <v-divider
      class="border-opacity-100 rounded"
      color="#1EAE9C"
      thickness="5px"
    />
    <v-row class="flex-nowrap my-3">
      <v-col cols="auto">
        <h2
          class="headline-2"
          data-testid="all-service-provider-title"
        >
          {{ $t('angebot.allServiceProviders') }}
        </h2>
      </v-col>
    </v-row>
    <!-- Template to be displayed in case the providers are still being loaded -->
    <template v-if="serviceProviderStore.loading">
      <v-progress-circular indeterminate />
    </template>
    <!-- Template to be displayed in case loading the providers throws an error -->
    <template v-else-if="serviceProviderStore.errorCode">
      <p
        class="text-body-small text-left"
        data-testid="error-text"
      >
        {{ $t(`errors.${serviceProviderStore.errorCode}`) }}
      </p>
    </template>
    <!-- Template to be displayed in case of no error nor loading -->
    <template v-else>
      <!-- Categorie 1: Work Email -->
      <ServiceProviderCategory
        :category-title="
          emailServiceProviders.length > 0
            ? t(`angebot.mappingFrontBackEnd.kategorien.${emailServiceProviders[0]?.kategorie}`)
            : ''
        "
        :service-providers="emailServiceProviders"
        :has-token="getHasToken()"
      />
      <!-- Categorie 2: Class -->
      <ServiceProviderCategory
        :category-title="
          classServiceProviders.length > 0
            ? t(`angebot.mappingFrontBackEnd.kategorien.${classServiceProviders[0]?.kategorie}`)
            : ''
        "
        :service-providers="classServiceProviders"
        :has-token="getHasToken()"
      />
      <!-- Categorie 3: Administration -->
      <ServiceProviderCategory
        :category-title="
          administrationServiceProviders.length > 0
            ? t(`angebot.mappingFrontBackEnd.kategorien.${administrationServiceProviders[0]?.kategorie}`)
            : ''
        "
        :service-providers="administrationServiceProviders"
        :has-token="getHasToken()"
      />
      <!-- Categorie 4: Schulisch -->
      <ServiceProviderCategory
        :category-title="
          schulischServiceProviders.length > 0
            ? t(`angebot.mappingFrontBackEnd.kategorien.${schulischServiceProviders[0]?.kategorie}`)
            : ''
        "
        :service-providers="schulischServiceProviders"
        :has-token="getHasToken()"
      />
      <!-- Categorie 5: Hints -->
      <ServiceProviderCategory
        :category-title="
          hintsServiceProviders.length > 0
            ? t(`angebot.mappingFrontBackEnd.kategorien.${hintsServiceProviders[0]?.kategorie}`)
            : ''
        "
        :service-providers="hintsServiceProviders"
        :has-token="getHasToken()"
      />
    </template>
  </v-card>
</template>

<style></style>
