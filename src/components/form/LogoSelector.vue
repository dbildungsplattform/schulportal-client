<script setup lang="ts">
  import { getAvailableLogos, type LogoConfig } from '@/utils/logosConfig';
  import { computed, type ComputedRef } from 'vue';

  interface Props {
    modelValue: number | undefined; // logoId as integer (1, 2, 3, etc.)
    error?: boolean;
    errorMessages?: string[];
    readonly?: boolean;
    disabled?: boolean;
  }

  interface Emits {
    (e: 'update:modelValue', value: number): void;
  }

  const props: Props = withDefaults(defineProps<Props>(), {
    error: false,
    errorMessages: () => [],
    readonly: false,
    disabled: false,
  });

  const emit: Emits = defineEmits<Emits>();

  const availableLogos: ComputedRef<LogoConfig[]> = computed(() => getAvailableLogos());

  function selectLogo(logoId: number): void {
    if (!props.readonly && !props.disabled) {
      emit('update:modelValue', logoId);
    }
  }

  function isSelected(logoId: number): boolean {
    return props.modelValue === logoId;
  }
</script>

<template>
  <div class="logo-selector">
    <!-- Grid of selectable logos -->
    <div class="logo-grid">
      <div
        v-for="logo in availableLogos"
        :key="logo.id"
        class="logo-item"
        :class="{ selected: isSelected(logo.id), disabled: disabled || readonly }"
        :title="logo.name"
      >
        <div class="logo-container">
          <div
            :tabindex="disabled || readonly ? -1 : 0"
            :data-testid="`logo-${logo.id}`"
            :aria-pressed="isSelected(logo.id)"
            role="button"
            @click="selectLogo(logo.id)"
            @keydown.enter.prevent="selectLogo(logo.id)"
            @keydown.space.prevent="selectLogo(logo.id)"
          >
            <v-img
              :src="logo.path"
              :alt="logo.name"
              width="48"
              height="48"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Error messages -->
    <div
      v-if="error && errorMessages?.length"
      class="error-messages mt-2"
    >
      <div
        v-for="(message, index) in errorMessages"
        :key="index"
        class="error-message"
      >
        {{ message }}
      </div>
    </div>
  </div>
</template>

<style scoped>
  .logo-selector {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .logo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 0.4rem;
    padding: 0.25rem;
  }

  .logo-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border: 2px solid var(--v-border-color, #e0e0e0);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    background-color: var(--v-surface-color, #ffffff);
    position: relative;
  }

  .logo-item:hover:not(.disabled):not(.readonly) {
    border-color: var(--v-primary, #001e49);
    background-color: var(--v-surface-variant, #f5f5f5);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 30, 73, 0.15);
  }

  .logo-item.selected {
    border-color: #001e49;
    background-color: rgba(0, 30, 73, 0.28);
    box-shadow: 0 0 0 3px rgba(0, 30, 73, 0.45);
  }

  .logo-item.selected::before {
    content: '✓';
    position: absolute;
    top: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
    background-color: var(--v-primary, #148034);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
  }

  .logo-item.disabled,
  .logo-item.readonly {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .logo-container {
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--v-border-color, #e0e0e0);
    border-radius: 4px;
    background-color: var(--v-background, #ffffff);
    padding: 0.5rem;
  }

  .logo-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 2.5rem;
    text-align: center;
    gap: 0.25rem;
  }
  /* Error state */
  .logo-selector:has(.error-messages) .logo-grid {
    border: 1px solid var(--v-error, #d32f2f);
    border-radius: 4px;
    padding: 0.75rem;
  }

  .error-messages {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .error-message {
    font-size: 0.75rem;
    color: var(--v-error, #d32f2f);
    line-height: 1.4;
  }

  /* Responsive design */
  @media (max-width: 600px) {
    .logo-grid {
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 0.75rem;
      padding: 0.25rem;
    }

    .logo-container {
      width: 50px;
      height: 50px;
    }

    .logo-item {
      padding: 0.5rem;
    }
  }
</style>
