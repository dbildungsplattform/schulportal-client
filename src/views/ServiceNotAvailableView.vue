<script setup lang="ts">
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import { ServiceIdentifier } from '@/router/service-identifier.enum';
  import { RouteLocationNormalizedLoaded, Router, useRoute, useRouter } from 'vue-router';

  const router: Router = useRouter();
  const route: RouteLocationNormalizedLoaded = useRoute();
  const serviceName: ServiceIdentifier = route.params['serviceName'] as ServiceIdentifier;
  const messageObject: { title: string; text: string } = { title: '', text: '' };

  if (serviceName === ServiceIdentifier.TWO_FACTOR_AUTHENTICATION) {
    messageObject.title = 'admin.person.twoFactorAuthentication.header';
    messageObject.text = 'admin.person.twoFactorAuthentication.errors.connectionFailure';
  } else {
    router.push('/not-found');
  }

  function goToStart(): void {
    window.location.href = '/start';
  }
  function goToStatus(): void {
    window.open('/api/status', '_blank', 'noopener,noreferrer');
  }
</script>

<template>
  <SpshAlert
    :closable="false"
    :model-value="true"
    :text="$t(messageObject.text)"
    :title="$t(messageObject.title)"
    type="error"
  >
    <template #button>
      <v-col cols="auto">
        <v-btn
          class="primary"
          data-testid="to-start-button"
          @click="goToStart"
        >
          {{ $t('nav.backToStart') }}
        </v-btn>
      </v-col>
      <v-col cols="auto">
        <v-btn
          class="secondary"
          data-testid="to-status-button"
          @click="goToStatus"
        >
          {{ $t('nav.statusPage') }}
        </v-btn>
      </v-col>
    </template>
  </SpshAlert>
</template>
