<script setup lang="ts">
  import { parseISO, isWithinInterval } from 'date-fns';
  import { computed, type ComputedRef, type Ref, ref } from 'vue';
  import { type RouteLocationNormalizedLoaded, useRoute } from 'vue-router';
  import { useI18n, type Composer } from 'vue-i18n';

  const route: RouteLocationNormalizedLoaded = useRoute();
  const { t }: Composer = useI18n({ useScope: 'global' });

  // Define the maintenance date range
  const isMaintenancePeriod: ComputedRef<boolean> = computed(() => {
    const today: Date = new Date();
    const startDate: Date = parseISO('2024-12-02T00:00:00');
    const endDate: Date = parseISO('2024-12-08T18:00:00');

    // Check if today falls within the maintenance period
    return isWithinInterval(today, { start: startDate, end: endDate });
  });

  // Define the date range for the "What's new" box
  const showWhatsNew: ComputedRef<boolean> = computed(() => {
    const today: Date = new Date();
    const startDate: Date = parseISO('2024-12-12T17:00:00');
    const endDate: Date = parseISO('2024-12-20T18:00:00');

    // Check if today falls within the interval
    return isWithinInterval(today, { start: startDate, end: endDate });
  });

  type IQSHLink = {
    text: string;
    href: string;
    external: boolean;
  };

  const link: Ref<IQSHLink> = ref({
    text: t('IQSHMedienberatung'),
    href: 'https://medienberatung.iqsh.de/schulportal-sh.html',
    external: true,
  });
</script>

<template>
  <v-card
    class="login-card"
    data-testid="login-card"
    flat
  >
    <!-- Main title -->
    <v-row
      class="mb-5 justify-center"
      no-gutters
    >
      <v-col class="text-center">
        <img
          aria-hidden="true"
          alt="Logo Schulportal"
          class="logo"
          src="@/assets/logos/Schulportal_SH_Wort_Bildmarke_RGB_Anwendung_HG_Weiss.svg"
          width="540"
        />
      </v-col>
    </v-row>

    <v-row
      class="mb-7 justify-center"
      no-gutters
    >
      <v-col class="text-center">
        <!-- Subtitle/welcome message -->
        <h1
          class="headline-2"
          data-testid="landing-headline"
        >
          {{ $t('landingTitle') }}
        </h1>
      </v-col>
    </v-row>
    <!-- Maintenance notice -->
    <div
      v-if="isMaintenancePeriod"
      class="red-border"
    >
      <v-row
        class="mb-7 justify-center"
        no-gutters
      >
        <v-col class="text-center">
          <h1
            class="headline-2 text-red"
            data-testid="landing-maintenance-title"
          >
            {{ $t('login.maintenanceNoticeTitle') }}
          </h1>
        </v-col>
      </v-row>

      <v-row
        class="mb-7 justify-center"
        no-gutters
      >
        <v-col class="text-center">
          <h1
            class="text-body"
            data-testid="landing-maintenance-text"
          >
            {{ $t('login.maintenanceNoticeText') }}
          </h1>
        </v-col>
      </v-row>

      <v-row
        class="mb-7 justify-center"
        no-gutters
      >
        <v-col class="text-center">
          <h1 class="subtitle-2">
            {{ $t('login.doNotLogin') }}
          </h1>
        </v-col>
      </v-row>
    </div>
    <!-- Login Button -->
    <v-row class="justify-center">
      <v-col
        cols="12"
        md="8"
        sm="6"
        class="d-flex justify-center"
      >
        <v-btn
          data-testid="login-button"
          class="primary"
          :href="`/api/auth/login?redirectUrl=${route.fullPath}`"
        >
          {{ $t('login.button') }}
        </v-btn>
      </v-col>
    </v-row>
    <!-- What's new -->
    <div
      v-if="showWhatsNew"
      class="mt-10 primary-border"
    >
      <v-row
        class="text-body-medium justify-center"
        no-gutters
      >
        <v-col cols="12">
          <h1
            class="subtitle-2"
            data-testid="whats-new-title"
          >
            {{
              $t('whatsNew.updateInformationForVersion', {
                version: '1.1 (16.12.2024)',
              })
            }}
          </h1>
        </v-col>
        <v-col
          cols="12"
          class="mt-3"
        >
          <p>
            {{ $t('whatsNew.title') }}
          </p>
        </v-col>
        <v-col
          cols="12"
          class="mt-3"
        >
          <ul>
            <li class="ml-5">
              {{ $t('login.secondFactorInput') }}
            </li>
            <li class="ml-5 mt-3">
              {{ $t('login.lkDevicePasswords') }}
            </li>
          </ul>
        </v-col>
        <v-col
          cols="12"
          class="mt-3"
        >
          <p>
            {{ $t('whatsNew.moreInformation') }}
            <a
              :href="link.href"
              :target="link.external ? '_blank' : '_self'"
            >
              {{ link.text }} </a
            >.
          </p>
        </v-col>
      </v-row>
    </div>
  </v-card>
</template>

<style scoped>
  .login-card {
    padding: 6.25rem 0;
  }

  @media (max-width: 680px) {
    .logo {
      width: 100%;
      max-width: 380px;
    }
  }

  .red-border {
    border: 2px solid red;
    border-radius: 4px;
    padding: 16px;
    margin-bottom: 20px;
  }
</style>
