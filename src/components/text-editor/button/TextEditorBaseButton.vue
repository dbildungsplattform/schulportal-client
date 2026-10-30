<script setup lang="ts">
  type Props = {
    icon: string;
    tooltip: string;
    testId: string;
    active: boolean;
  };

  type Emits = {
    (event: 'click'): void;
  };

  const props: Props = defineProps<Props>();
  const emit: Emits = defineEmits<Emits>();
</script>

<template>
  <v-tooltip
    :text="props.tooltip"
    location="bottom"
  >
    <template v-slot:activator="{ props: activatorProps }">
      <v-btn
        v-bind="activatorProps"
        :active="props.active"
        :icon="props.icon"
        :data-testid="props.testId"
        :aria-label="props.tooltip"
        :aria-pressed="props.active"
        @click="emit('click')"
      />
    </template>
  </v-tooltip>
</template>
