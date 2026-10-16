<script setup lang="ts">
  import { type VNode } from 'vue';
  import BaseButton from './SuccessTemplateBaseButton.vue';

  type Emits = {
    (event: 'click'): void;
  };

  const emit: Emits = defineEmits<Emits>();
  defineSlots<{ default(): VNode[] }>();
</script>

<template>
  <BaseButton
    appearance="secondary"
    test-id="success-template-secondary-button"
    @click="emit('click')"
  >
    <slot />
  </BaseButton>
</template>
