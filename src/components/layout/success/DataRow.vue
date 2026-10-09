<script setup lang="ts">
  import { type VNode } from 'vue';

  type Props = {
    label: string;
    value?: string | number;
    testId: string;
    labelTestId?: string;
  };

  const props: Props = defineProps<Props>();
  defineSlots<{ default?(): VNode[] }>();
</script>

<template>
  <v-row>
    <v-col
      class="text-body bold text-right"
      :data-testid="props.labelTestId"
    >
      {{ props.label }}:
    </v-col>
    <v-col class="text-body">
      <span :data-testid="props.testId">
        <slot>{{ props.value }}</slot>
      </span>
    </v-col>
  </v-row>
</template>

<style scoped>
  .text-body {
    font-weight: normal;
  }
  .bold {
    font-weight: bold;
  }
</style>
