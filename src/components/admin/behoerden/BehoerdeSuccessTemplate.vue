<script setup lang="ts">
  import SuccessTemplatePrimaryButton from '@/components/layout/success/button/SuccessTemplatePrimaryButton.vue';
  import SuccessTemplateSecondaryButton from '@/components/layout/success/button/SuccessTemplateSecondaryButton.vue';
  import SuccessTemplate from '@/components/layout/success/SuccessTemplate.vue';

  defineProps<{
    changedData: Array<{ label: string; value: string; testId: string }>;
  }>();

  type Emits = {
    (event: 'onNavigateBackToBehoerdeList'): void;
    (event: 'onCreateAnotherBehoerde'): void;
  };

  const emit: Emits = defineEmits<Emits>();

  const navigateBack = (): void => emit('onNavigateBackToBehoerdeList');
  const createAnother = (): void => emit('onCreateAnotherBehoerde');
</script>

<template>
  <SuccessTemplate>
    <template #message>
      <span data-testid="behoerde-success-text">{{ $t('admin.behoerde.behoerdeAddedSuccessfully') }}</span>
    </template>
    <template #description>
      {{ $t('admin.followingDataCreated') }}
    </template>
    <template #default>
      <v-row
        v-for="item in changedData"
        :key="item.testId"
      >
        <v-col
          class="text-body bold text-right"
          :data-testid="`${item.testId}-label`"
        >
          {{ item.label }}:
        </v-col>
        <v-col
          class="text-body"
          :data-testid="item.testId"
        >
          {{ item.value }}
        </v-col>
      </v-row>
    </template>
    <template #actions>
      <SuccessTemplateSecondaryButton @click="navigateBack">
        {{ $t('nav.backToList') }}
      </SuccessTemplateSecondaryButton>
      <SuccessTemplatePrimaryButton @click="createAnother">
        {{ $t('admin.behoerde.createAnother') }}
      </SuccessTemplatePrimaryButton>
    </template>
  </SuccessTemplate>
</template>
