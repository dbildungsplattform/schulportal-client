<script setup lang="ts">
  import AdminMenuBar from '@/components/admin/MenuBar.vue';
  import TheFooter from '@/components/layout/TheFooter.vue';
</script>

<template>
  <v-main>
    <AdminMenuBar />
    <v-container>
      <slot />
    </v-container>
    <TheFooter />
  </v-main>
</template>

<style scoped lang="scss">
  @use '@/styles/variables';

  @media (min-width: 1280px) {
    .v-container {
      margin-bottom: 300px;
    }
  }

  @media (min-width: 1600px) {
    .v-container {
      max-width: 1200px;
    }
  }

  @media (max-width: 1279px) {
    .v-container {
      margin-bottom: 350px;
    }
  }
</style>
