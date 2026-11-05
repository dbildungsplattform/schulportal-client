<script setup lang="ts">
  import ServiceProviderCard from '@/components/cards/ServiceProviderCard.vue';
  import { type AuthStore, StepUpLevel, useAuthStore } from '@/stores/AuthStore';
  import type { StartPageServiceProvider } from '@/stores/ServiceProviderStore';

  const authStore: AuthStore = useAuthStore();
  const NO_SECOND_FACTOR: string = '/no-second-factor';

  const props: {
    categoryTitle: string;
    serviceProviders: Array<StartPageServiceProvider>;
    hasToken: boolean;
  } = defineProps<{
    categoryTitle: string;
    serviceProviders: Array<StartPageServiceProvider>;
    hasToken: boolean;
  }>();

  function getInternalServiceProviderUrl(target: string): string {
    if (target === 'SCHULPORTAL_ADMINISTRATION') {
      if (authStore.hasPersonenverwaltungPermission) {
        return '/admin/personen';
      }
      if (authStore.hasRollenverwaltungPermission) {
        return '/admin/rollen';
      }
      if (authStore.hasSchulverwaltungPermission) {
        return '/admin/schulen';
      }
      if (authStore.hasKlassenverwaltungPermission) {
        return '/admin/klassen';
      }
    }
    return '';
  }

  function computeUrlAndTab(serviceProvider: StartPageServiceProvider): { url: string; newTab: boolean } {
    if (serviceProvider.target === 'URL') {
      if (serviceProvider.requires2fa && !props.hasToken && authStore.acr !== StepUpLevel.GOLD) {
        return { url: NO_SECOND_FACTOR, newTab: false };
      } else {
        return {
          url: serviceProvider.url!, // if target is URL, url should be defined, so we can assert it with !
          newTab: true,
        };
      }
    }
    return { url: getInternalServiceProviderUrl(serviceProvider.target), newTab: false };
  }
</script>

<template>
  <template v-if="serviceProviders?.length">
    <v-row>
      <label>{{ categoryTitle }}</label>
      <v-col>
        <v-divider
          class="border-opacity-100 rounded mt-3"
          color="#E5EAEF"
          thickness="6"
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col
        v-for="serviceProvider in serviceProviders"
        :key="serviceProvider.id"
        cols="12"
        sm="6"
        lg="4"
      >
        <ServiceProviderCard
          :href="computeUrlAndTab(serviceProvider).url"
          :new-tab="computeUrlAndTab(serviceProvider).newTab"
          :test-id="`service-provider-card-${serviceProvider.id}`"
          :title="serviceProvider.name"
          :logo-url="serviceProvider.logoUrl"
        />
      </v-col>
    </v-row>
  </template>
</template>
