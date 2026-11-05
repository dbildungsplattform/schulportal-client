<script setup lang="ts">
  defineProps<{
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    buttonAction?: Function;
    buttonText?: string;
    closable?: boolean;
    dataTestIdPrefix?: string;
    modelValue: boolean;
    showButton?: boolean;
    text: string;
    title: string;
    type: 'error' | 'success' | 'warning' | 'info' | undefined;
  }>();

  type Emits = {
    (event: 'update:modelValue', value: boolean): void;
  };
  const emit: Emits = defineEmits<{
    (event: 'update:modelValue', value: boolean): void;
  }>();

  const closeAlert = (): void => {
    emit('update:modelValue', false); // Emit the event to update modelValue
  };
</script>

<template>
  <v-container v-if="modelValue">
    <v-slide-y-transition>
      <v-alert
        :closable="closable"
        :data-testid="`${dataTestIdPrefix || 'spsh'}-alert`"
        :model-value="modelValue"
        :type="type"
        variant="outlined"
        @click:close="closeAlert"
      >
        <v-row>
          <v-col
            class="primary-text-color"
            cols="auto"
          >
            <strong :data-testid="`${dataTestIdPrefix || 'spsh'}-alert-title`">{{ title }}</strong>
          </v-col>
        </v-row>
        <v-row>
          <v-col
            class="primary-text-color"
            cols="auto"
          >
            <span :data-testid="`${dataTestIdPrefix || 'spsh'}-alert-text`">{{ text }}</span>
            <slot name="text" />
          </v-col>
        </v-row>
        <v-row class="justify-center">
          <v-col
            v-if="showButton"
            cols="auto"
          >
            <v-btn
              class="primary"
              :data-testid="`${dataTestIdPrefix || 'spsh'}-alert-button`"
              @click="buttonAction"
            >
              {{ buttonText }}
            </v-btn>
          </v-col>
          <slot name="button" />
        </v-row>
      </v-alert>
    </v-slide-y-transition>
  </v-container>
</template>

<style scoped>
  .v-alert {
    border-width: 3px;
  }
</style>
