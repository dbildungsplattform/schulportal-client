<script setup lang="ts">
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import { useRouter, type Router } from 'vue-router';

  const router: Router = useRouter();

  function goBackToStart(): void {
    router.push({ name: 'start' });
  }
</script>

<template>
  <SpshAlert
    :button-action="goBackToStart"
    :button-text="$t('nav.backToStart')"
    :closable="false"
    :model-value="true"
    :show-button="true"
    :text="$t('errors.NOT_FOUND')"
    title="404"
    type="error"
  />
</template>

<style scoped></style>
