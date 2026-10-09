<script setup lang="ts">
  import { type VNode } from 'vue';
  import BaseButton from './BaseButton.vue';

  type Emits = {
    (event: 'click'): void;
  };

  const emit: Emits = defineEmits<Emits>();
  defineSlots<{ default(): VNode[] }>();
</script>

<template>
  <BaseButton
    appearance="secondary"
    test-id="navigation-button"
    @click="emit('click')"
  >
    <slot />
  </BaseButton>
</template>
