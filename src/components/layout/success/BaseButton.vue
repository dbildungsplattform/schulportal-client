<script setup lang="ts">
  import { type Ref, type VNode } from 'vue';
  import { useDisplay } from 'vuetify';

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
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();
</script>

<template>
  <v-col
    cols="12"
    sm="6"
    md="auto"
  >
    <v-btn
      :class="props.appearance"
      :data-testid="props.testId"
      :block="mdAndDown"
      @click="emit('click')"
    >
      <slot />
    </v-btn>
  </v-col>
</template>
