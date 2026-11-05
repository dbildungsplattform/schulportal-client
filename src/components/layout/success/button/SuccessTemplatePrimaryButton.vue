<script setup lang="ts">
  import { type VNode } from 'vue';
  import SuccessTemplateBaseButton from './SuccessTemplateBaseButton.vue';

  type Emits = {
    (event: 'click'): void;
  };

  const emit: Emits = defineEmits<Emits>();
  defineSlots<{ default(): VNode[] }>();
</script>

<template>
  <SuccessTemplateBaseButton
    appearance="primary"
    test-id="success-template-primary-button"
    @click="emit('click')"
  >
    <slot />
  </SuccessTemplateBaseButton>
</template>
