<script setup lang="ts">
  import { ref, type Ref } from 'vue';

  defineProps<{
    id: string;
    visible: boolean;
    type: 'errorLight' | 'warning' | 'background-grey';
    dismissable: boolean;
  }>();

  type Emits = {
    (event: 'dismissBanner', value: string): void;
  };
  const emit: Emits = defineEmits<{
    (event: 'dismissBanner', value: string): void;
  }>();

  const showBanner: Ref<boolean> = ref(true);

  const dismissBanner = (id: string): void => {
    showBanner.value = false;
    emit('dismissBanner', id);
  };
</script>
<template>
  <v-alert
    :data-testid="id + '-banner'"
    class="mb-2"
    :model-value="visible"
    :color="type"
  >
    <v-row class="align-center justify-space-between">
      <v-col
        :class="[
          'primary-text-color',
          {
            'mr-8': dismissable,
          },
        ]"
      >
        <slot
          class="text-body"
          name="text"
        />
      </v-col>
      <v-col
        v-if="dismissable"
        cols="auto"
        class="text-center primary-text-color"
      >
        <v-icon
          class="close-icon"
          data-testid="banner-close-icon"
          icon="mdi-close"
          @click="dismissBanner(id)"
        />
      </v-col>
    </v-row>
  </v-alert>
</template>
<style lang="css" scoped>
  .v-theme--shTheme {
    --v-theme-on-error: 0, 0, 0;
  }
  .close-icon {
    position: absolute;
    top: 1rem;
    right: 1rem;
  }
</style>
