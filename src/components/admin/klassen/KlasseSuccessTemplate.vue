<script setup lang="ts">
  import { type Ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useDisplay } from 'vuetify';

  defineProps<{
    backButtonTestId: string;
    backButtonText: string;
    createAnotherButtonTestId?: string;
    createAnotherButtonText: string;
    createdData: Array<{ label: string; value: string; testId: string }>;
    followingDataCreated: string;
    showCreateAnotherButton: boolean;
    successMessage: string;
  }>();

  type Emits = {
    (event: 'OnNavigateBack'): void;
    (event: 'OnCreateAnother'): void;
  };

  const emit: Emits = defineEmits<Emits>();
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();
  useI18n({ useScope: 'global' });

  const navigateBack = (): void => emit('OnNavigateBack');
  const createAnother = (): void => emit('OnCreateAnother');
</script>

<template>
  <v-container>
    <v-row class="justify-center">
      <v-col
        class="subtitle-1"
        cols="auto"
      >
        <span data-testid="klasse-success-text">{{ successMessage }}</span>
      </v-col>
    </v-row>
    <v-row class="justify-center">
      <v-col cols="auto">
        <v-icon
          color="#1EAE9C"
          data-testid="klasse-success-icon"
          icon="mdi-check-circle"
          small
        />
      </v-col>
    </v-row>
    <v-row class="justify-center">
      <v-col
        class="subtitle-2"
        cols="auto"
        data-testid="following-data-created-text"
      >
        {{ followingDataCreated }}
      </v-col>
    </v-row>
    <v-row
      v-for="(item, index) in createdData"
      :key="index"
    >
      <v-col
        class="text-body bold text-right"
        :data-testid="`${item.testId}-label`"
        >{{ item.label }}:</v-col
      >
      <v-col class="text-body">
        <span :data-testid="item.testId">{{ item.value }}</span>
      </v-col>
    </v-row>
    <v-divider
      class="border-opacity-100 rounded my-6"
      color="#E5EAEF"
      thickness="6"
    />
    <v-row class="justify-end">
      <v-col
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
        v-if="showCreateAnotherButton"
        cols="12"
        sm="6"
        md="auto"
      >
        <v-btn
          class="primary button"
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
