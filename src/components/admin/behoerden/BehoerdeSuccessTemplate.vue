<script setup lang="ts">
  import CreateAnotherButton from '@/components/layout/success/CreateAnotherButton.vue';
  import NavigationButton from '@/components/layout/success/NavigationButton.vue';
  import DataRow from '@/components/layout/success/DataRow.vue';
  import SuccessTemplate from '@/components/layout/success/SuccessTemplate.vue';

  defineProps<{
    backButtonText?: string;
    changedData: Array<{ label: string; value: string; testId: string }>;
    createAnotherButtonText: string;
    successMessage: string;
  }>();

  type Emits = {
    (event: 'onNavigateBackToBehoerdeList'): void;
    (event: 'onCreateAnotherBehoerde'): void;
  };

  const emit: Emits = defineEmits<Emits>();

  /* the results list is not available yet, see SPSH-4323 */
  const navigateBack = (): void => emit('onNavigateBackToBehoerdeList');
  const createAnother = (): void => emit('onCreateAnotherBehoerde');
</script>

<template>
  <SuccessTemplate>
    <template #message>
      <span data-testid="behoerde-success-text">{{ successMessage }}</span>
    </template>
    <template #description>
      {{ $t('admin.followingDataCreated') }}
    </template>
    <template #default>
      <DataRow
        v-for="item in changedData"
        :key="item.testId"
        :label="item.label"
        :value="item.value"
        :test-id="item.testId"
      />
    </template>
    <template #actions>
      <NavigationButton
        v-if="backButtonText"
        @click="navigateBack"
      >
        {{ backButtonText }}
      </NavigationButton>
      <CreateAnotherButton @click="createAnother">
        {{ createAnotherButtonText }}
      </CreateAnotherButton>
    </template>
  </SuccessTemplate>
</template>
