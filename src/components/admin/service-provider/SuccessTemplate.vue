<script setup lang="ts">
  import { getLogoPath } from '@/utils/logosConfig';
  import { type Ref } from 'vue';
  import { useDisplay } from 'vuetify';
  import { SuccessDetails } from './types';

  type Emits = {
    (event: 'toServiceProviderDetails'): void;
  };
  defineProps<{
    success: SuccessDetails;
    showToServiceProviderDetailsButton: boolean;
    toServiceProviderDetailsButtonText: string;
    toServiceProviderDetailsButtonTestId: string;
  }>();

  const emit: Emits = defineEmits<Emits>();

  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  const navigateToServiceProviderDetails = (): void => emit('toServiceProviderDetails');
</script>

<template>
  <v-container>
    <v-row class="justify-center">
      <v-col
        cols="auto"
        class="subtitle-1 pre-line text-center"
        data-testid="success-message"
      >
        {{ success.message }}
      </v-col>
    </v-row>

    <v-row class="justify-center">
      <v-col cols="auto">
        <v-icon
          color="success"
          icon="mdi-check-circle"
        />
      </v-col>
    </v-row>

    <v-row class="justify-center">
      <v-col
        cols="auto"
        class="subtitle-2"
      >
        {{ success.followingDataChanged }}
      </v-col>
    </v-row>

    <v-row
      v-for="(item, index) in success.data"
      :key="index"
    >
      <v-col class="text-body bold text-right"> {{ item.label }}: </v-col>

      <v-col
        class="text-body"
        style="word-break: break-word"
      >
        <!-- If it's an image type → show image -->
        <template v-if="item.type === 'image' && typeof item.value === 'number'">
          <v-img
            :data-testid="item.testId"
            class="mt-n2"
            :src="getLogoPath(item.value)"
            :alt="item.alt"
            max-width="40"
            max-height="40"
            contain
          />
        </template>

        <template v-else-if="item.type === 'image' && typeof item.value === 'string'">
          <v-img
            :data-testid="item.testId"
            class="mt-n2"
            :src="item.value"
            :alt="item.alt"
            max-width="40"
            max-height="40"
            contain
          />
        </template>

        <!-- Otherwise → show text -->
        <template v-else>
          <span :data-testid="item.testId">
            {{ item.value }}
          </span>
        </template>
      </v-col>
    </v-row>

    <v-divider
      class="border-opacity-100 rounded my-6"
      color="#E5EAEF"
      thickness="6"
    />

    <v-row class="justify-end">
      <slot> </slot>
      <v-col
        v-if="showToServiceProviderDetailsButton"
        cols="12"
        sm="6"
        md="auto"
      >
        <v-btn
          class="secondary"
          :block="mdAndDown"
          :data-testid="toServiceProviderDetailsButtonTestId"
          @click="navigateToServiceProviderDetails"
        >
          {{ toServiceProviderDetailsButtonText }}
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
  .pre-line {
    white-space: pre-wrap;
  }
</style>
