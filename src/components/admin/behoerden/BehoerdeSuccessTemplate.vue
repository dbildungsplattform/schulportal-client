<script setup lang="ts">
  import SuccessIcon from '@/components/icons/SuccessIcon.vue';
  import SpshDivider from '@/components/layout/SpshDivider.vue';
  import { type Ref } from 'vue';
  import { useDisplay } from 'vuetify';

  defineProps<{
    backButtonTestId?: string;
    backButtonText?: string;
    changedData: Array<{ label: string; value: string; testId: string }>;
    createAnotherButtonTestId: string;
    createAnotherButtonText: string;
    successMessage: string;
  }>();

  type Emits = {
    (event: 'onNavigateBackToBehoerdeList'): void;
    (event: 'onCreateAnotherBehoerde'): void;
  };

  const emit: Emits = defineEmits<Emits>();

  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  /* the results list is not available yet, see SPSH-4323 */
  const navigateBack = (): void => emit('onNavigateBackToBehoerdeList');
  const createAnother = (): void => emit('onCreateAnotherBehoerde');
</script>

<template>
  <v-container>
    <v-row class="justify-center">
      <v-col
        class="subtitle-1"
        cols="auto"
        data-testid="behoerde-success-text"
      >
        {{ successMessage }}
      </v-col>
    </v-row>
    <v-row class="justify-center">
      <v-col cols="auto">
        <SuccessIcon />
      </v-col>
    </v-row>
    <v-row class="justify-center">
      <v-col
        class="subtitle-2"
        cols="auto"
      >
        {{ $t('admin.followingDataCreated') }}
      </v-col>
    </v-row>
    <v-row
      v-for="(item, index) in changedData"
      :key="index"
    >
      <v-col class="text-body bold text-right"> {{ item.label }}: </v-col>
      <v-col class="text-body">
        <span :data-testid="item.testId">{{ item.value }}</span>
      </v-col>
    </v-row>
    <SpshDivider />
    <v-row class="justify-end">
      <v-col
        v-if="backButtonText"
        cols="12"
        sm="6"
        md="auto"
      >
        <v-btn
          class="secondary"
          :data-testid="backButtonTestId"
          :block="mdAndDown"
          @click="navigateBack"
        >
          {{ backButtonText }}
        </v-btn>
      </v-col>
      <v-col
        cols="12"
        sm="6"
        md="auto"
      >
        <v-btn
          class="primary"
          :data-testid="createAnotherButtonTestId"
          :block="mdAndDown"
          @click="createAnother"
        >
          {{ createAnotherButtonText }}
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
  .text-body {
    font-weight: normal;
  }
  .bold {
    font-weight: bold;
  }
</style>
