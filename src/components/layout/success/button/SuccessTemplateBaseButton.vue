<script setup lang="ts">
  import { type VNode } from 'vue';

  type Props = {
    appearance: 'primary' | 'secondary';
    testId: string;
  };

  type Emits = {
    (event: 'click'): void;
  };

  const props: Props = defineProps<Props>();
  const emit: Emits = defineEmits<Emits>();
  defineSlots<{ default(): VNode[] }>();
</script>

<template>
  <v-btn
    :class="props.appearance"
    class="ma-2 pa-2"
    :data-testid="props.testId"
    @click="emit('click')"
  >
    <slot />
  </v-btn>
</template>
