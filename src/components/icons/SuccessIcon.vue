<template>
  <v-icon
    small
    class="success-icon"
    icon="mdi-check-circle"
    data-testid="success-icon"
  />
</template>

<style scoped lang="scss">
  @use '@/styles/variables';

  .success-icon {
    color: variables.$cyan;
  }
</style>
