<script setup lang="ts">
  import { ref, watch, type Ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import FormRow from '@/components/form/FormRow.vue';
  import type { BaseFieldProps } from 'vee-validate';
  import { BefristungOption } from '@/stores/PersonenkontextStore';
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';
  import { getNextSchuljahresende } from '@/utils/date';

  useI18n();

  export type BefristungProps = {
    befristungProps?: BaseFieldProps & { error: boolean; 'error-messages': Array<string> };
    befristungOptionProps?: BaseFieldProps & { error: boolean; 'error-messages': Array<string> };
    isUnbefristetDisabled?: boolean;
    isBefristungRequired?: boolean;
    nextSchuljahresende?: string;
    befristung: string | undefined;
    befristungOption: string | undefined;
  };

  const props: BefristungProps = defineProps<BefristungProps>();

  type Emits = {
    (e: 'update:befristung', value: string | undefined): void;
    (e: 'update:calculatedBefristungOption', value: string | undefined): void;
  };
  const emit: Emits = defineEmits<{
    (e: 'update:befristung', value: string | undefined): void;
    (e: 'update:calculatedBefristungOption', value: string | undefined): void;
  }>();

  const localBefristung: Ref<string | undefined> = ref(props.befristung);
  const localBefristungOption: Ref<string | undefined> = ref<string | undefined>(props.befristungOption);

  // Handles any change related to the befristung radio buttons
  function handleBefristungOptionChange(value: string | null): void {
    localBefristung.value = undefined;
    switch (value) {
      case BefristungOption.SCHULJAHRESENDE: {
        localBefristungOption.value = value;
        emit('update:calculatedBefristungOption', getNextSchuljahresende());
        break;
      }
      case BefristungOption.UNBEFRISTET: {
        localBefristungOption.value = value;
        emit('update:calculatedBefristungOption', undefined);
        break;
      }
    }
  }

  // Handles any change related to the befristung input field
  const handleBefristungChange = (value: string | undefined): void => {
    localBefristung.value = value;
    emit('update:befristung', value);
    localBefristungOption.value = undefined;
  };

  // If the befristung is required then autoselect Schuljahresende, otherwise Unbefristet
  watch(
    () => props.isBefristungRequired,
    (newValue: boolean | undefined) => {
      if (newValue) {
        localBefristungOption.value = BefristungOption.SCHULJAHRESENDE;
      } else {
        localBefristungOption.value = BefristungOption.UNBEFRISTET;
      }
    },
    { immediate: true },
  );

  watch(
    [(): string | undefined => props.befristung, (): string | undefined => props.befristungOption],
    ([newBefristung, newBefristungOption]: [string | undefined, string | undefined]) => {
      if (newBefristung) {
        localBefristung.value = newBefristung;
        localBefristungOption.value = undefined;
      } else if (newBefristungOption) {
        localBefristungOption.value = newBefristungOption;
        localBefristung.value = undefined;
      }
    },
    { immediate: true },
  );
</script>

<template>
  <div>
    <FormRow
      :error-label="befristungProps?.error || ''"
      label-for-id="befristung-select"
      :is-required="isBefristungRequired"
      :label="$t('admin.befristung.befristung')"
    >
      <v-text-field
        v-bind="befristungProps"
        ref="befristung-input"
        v-model="localBefristung"
        data-testid="befristung-input"
        variant="outlined"
        placeholder="TT.MM.JJJJ"
        color="primary"
        @update:model-value="handleBefristungChange"
      />
    </FormRow>
    <v-row class="align-center justify-end">
      <v-col
        class="py-0 mt-n1"
        cols="12"
        sm="7"
      >
        <v-radio-group
          ref="befristung-radio-group"
          v-model="localBefristungOption"
          data-testid="befristung-radio-group"
          v-bind="befristungOptionProps"
          @update:model-value="handleBefristungOptionChange"
        >
          <v-radio
            data-testid="schuljahresende-radio-button"
            :label="`${$t('admin.befristung.untilEndOfSchoolYear')} (${nextSchuljahresende})`"
            :value="BefristungOption.SCHULJAHRESENDE"
            color="primary"
          />

          <SpshTooltip
            v-if="isUnbefristetDisabled"
            :enabled-condition="!isUnbefristetDisabled"
            :disabled-text="$t('admin.befristung.unlimitedInactive')"
            position="start"
          >
            <v-radio
              data-testid="unbefristet-radio-button"
              :label="$t('admin.befristung.unlimited')"
              :value="BefristungOption.UNBEFRISTET"
              color="primary"
              :disabled="isUnbefristetDisabled"
            />
          </SpshTooltip>

          <v-radio
            v-else
            data-testid="unbefristet-radio-button"
            :label="$t('admin.befristung.unlimited')"
            :value="BefristungOption.UNBEFRISTET"
            color="primary"
            :disabled="isUnbefristetDisabled"
          />
        </v-radio-group>
      </v-col>
    </v-row>
  </div>
</template>
