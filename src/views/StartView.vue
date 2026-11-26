<script setup lang="ts">
  import { ServiceProviderTarget, type PersonTimeLimitInfoResponse } from '@/api-client/generated';
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
    type ServiceProviderStore,
    type StartPageServiceProvider,
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
      .filter(
        (provider: StartPageServiceProvider) =>
          provider.kategorie === kategorie && provider.target !== ServiceProviderTarget.None,
      )
      .sort((a: StartPageServiceProvider, b: StartPageServiceProvider) => a.name.localeCompare(b.name));
  }

  type StartPageCategory = {
    kategorie: ServiceProviderKategorie;
    serviceProviders: StartPageServiceProvider[];
  };

  const startPageCategories: ComputedRef<StartPageCategory[]> = computed(() =>
    Object.values(ServiceProviderKategorie).map(
      (kategorie: ServiceProviderKategorie): StartPageCategory => ({
        kategorie,
        serviceProviders: filterSortProviders(serviceProviderStore.assignedServiceProviders, kategorie),
      }),
    ),
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

    await serviceProviderStore.getServiceProvidersByPersonId(personId!);

    // Load all logos in parallel and assign them to the respective service providers
    const logoPromises: Promise<void>[] = serviceProviderStore.assignedServiceProviders.map(
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
            <span
              class="tiptap-content-preview"
              v-html="hinweis.text"
            ></span>
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
      <ServiceProviderCategory
        v-for="category in startPageCategories"
        :key="category.kategorie"
        :category-title="t(`angebot.mappingFrontBackEnd.kategorien.${category.kategorie}`)"
        :service-providers="category.serviceProviders"
        :has-token="getHasToken()"
      />
    </template>
  </v-card>
</template>

<style>
  .tiptap-content-preview {
    max-height: 20rem;
    overflow: auto;
    display: block;
  }
</style>
