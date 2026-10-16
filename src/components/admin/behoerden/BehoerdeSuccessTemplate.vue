<script setup lang="ts">
  import LabeledField from '@/components/admin/LabeledField.vue';
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

  /* the results list is not available yet, see SPSH-4323 */
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
      <LabeledField
        v-for="item in changedData"
        :key="item.testId"
        :label="item.label"
        :value="item.value"
        :test-id="item.testId"
      />
    </template>
    <template #actions>
      <SuccessTemplateSecondaryButton
        v-if="false"
        @click="navigateBack"
      >
        {{ $t('nav.backToList') }}
      </SuccessTemplateSecondaryButton>
      <SuccessTemplatePrimaryButton @click="createAnother">
        {{ $t('admin.behoerde.createAnother') }}
      </SuccessTemplatePrimaryButton>
    </template>
  </SuccessTemplate>
</template>
