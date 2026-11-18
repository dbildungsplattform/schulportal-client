<script setup lang="ts">
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import { useAuthStore, type AuthStore } from '@/stores/AuthStore';

  const auth: AuthStore = useAuthStore();

  function logout(): void {
    auth.isLoggingOut = true;
    const url: URL = new URL(window.origin + '/api/auth/logout');
    window.location.href = url.toString();
  }
</script>

<template>
  <SpshAlert
    :model-value="true"
    :title="$t('errors.UNKNOWN_USER.title')"
    :type="'warning'"
    :closable="false"
    :show-button="true"
    :button-text="$t('nav.logout')"
    :button-action="logout"
    :text="$t('errors.UNKNOWN_USER.text')"
  />
</template>

<style scoped></style>
