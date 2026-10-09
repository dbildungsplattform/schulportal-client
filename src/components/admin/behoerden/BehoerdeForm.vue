<script setup lang="ts">
  import FormRow from '@/components/form/FormRow.vue';
  import FormWrapper from '@/components/form/FormWrapper.vue';
  import { type Organisation } from '@/stores/OrganisationStore';
  import { mapVeeValidationErrorsToVuetifyProps } from '@/utils/validation';
  import { getValidationSchema, type BehoerdeFormValues } from '@/utils/validationBehoerde';
  import { useForm, type BaseFieldProps, type FormContext, type FormMeta, type TypedSchema } from 'vee-validate';
  import { computed, onMounted, watch, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';

  type Props = {
    initialValues: BehoerdeFormValues;
    cachedValues?: BehoerdeFormValues;
    errorCode?: string;
    isLoading: boolean;
    zustaendigkeitsbereichList: Organisation[];
    showUnsavedChangesDialog?: boolean;
  };

  const props: Props = defineProps<Props>();

  type Emits = {
    (event: 'click:submit', values: BehoerdeFormValues): void;
    (event: 'click:discard'): void;
    (event: 'click:confirmUnsaved'): void;
    (event: 'update:dirty', value: boolean): void;
    (event: 'update:showUnsavedChangesDialog', value: boolean): void;
  };
  type FieldDefinition = [Ref<string>, Ref<BaseFieldProps & { error: boolean; 'error-messages': string[] }>];
  const emit: Emits = defineEmits<Emits>();
  const { t }: Composer = useI18n();
  const validationSchema: TypedSchema<BehoerdeFormValues> = getValidationSchema(t);
  const formContext: FormContext<BehoerdeFormValues> = useForm<BehoerdeFormValues>({
    validationSchema,
    initialValues: { ...props.initialValues },
  });
  const [selectedZustaendigkeitsbereich, selectedZustaendigkeitsbereichProps]: FieldDefinition =
    formContext.defineField('selectedZustaendigkeitsbereich', mapVeeValidationErrorsToVuetifyProps);
  const [selectedBehoerdenname, selectedBehoerdennameProps]: FieldDefinition = formContext.defineField(
    'selectedBehoerdenname',
    mapVeeValidationErrorsToVuetifyProps,
  );
  const [selectedDienststellennummer, selectedDienststellennummerProps]: FieldDefinition = formContext.defineField(
    'selectedDienststellennummer',
    mapVeeValidationErrorsToVuetifyProps,
  );
  const canCommit: ComputedRef<boolean> = computed(() => formContext.meta.value.valid && formContext.meta.value.dirty);
  const onSubmit: (event?: Event) => Promise<void> = formContext.handleSubmit((values: BehoerdeFormValues): void => {
    emit('click:submit', values);
  });

  watch(
    formContext.meta,
    ({ dirty }: FormMeta<BehoerdeFormValues>): void => {
      emit('update:dirty', dirty);
    },
    { immediate: true },
  );
  onMounted((): void => {
    if (props.cachedValues) {
      formContext.setValues(props.cachedValues);
    }
  });
</script>

<template>
  <FormWrapper
    id="behoerde-form"
    ref="behoerde-form"
    :can-commit="canCommit"
    :confirm-unsaved-changes-action="() => emit('click:confirmUnsaved')"
    :create-button-label="$t('admin.behoerde.create')"
    :discard-button-label="$t('admin.behoerde.discard')"
    :hide-actions="!!props.errorCode"
    :is-loading="isLoading"
    :on-discard="() => emit('click:discard')"
    :on-submit="onSubmit"
    :show-unsaved-changes-dialog="showUnsavedChangesDialog"
    @on-show-dialog-change="(value?: boolean) => emit('update:showUnsavedChangesDialog', !!value)"
  >
    <template v-if="!props.errorCode">
      <!-- Select Zustaendigkeitsbereich -->
      <v-row>
        <v-col>
          <h3
            id="behoerde-zustaendigkeitsbereich-heading"
            class="headline-3"
          >
            1. {{ $t('admin.behoerde.assignZustaendigkeitsbereich') }}
          </h3>
        </v-col>
      </v-row>
      <v-row>
        <v-col
          cols="4"
          class="d-none d-md-flex"
        />
        <v-radio-group
          v-bind="selectedZustaendigkeitsbereichProps"
          v-model="selectedZustaendigkeitsbereich"
          aria-labelledby="behoerde-zustaendigkeitsbereich-heading"
          inline
          data-testid="zustaendigkeitsbereich-radio-group"
        >
          <v-col
            v-for="zustaendigkeitsbereich in zustaendigkeitsbereichList"
            :key="zustaendigkeitsbereich.id"
            offset-md="1"
            cols="12"
            sm="5"
            class="pb-0"
          >
            <v-radio
              :label="zustaendigkeitsbereich.name"
              :value="zustaendigkeitsbereich.id"
              :data-testid="
                'zustaendigkeitsbereich-radio-button-' + zustaendigkeitsbereich.name.replace(/\s+/g, '-').toLowerCase()
              "
            />
          </v-col>
        </v-radio-group>
      </v-row>
      <!-- select Behoerdenname -->
      <v-row>
        <v-col>
          <h3 class="headline-3">2. {{ $t('admin.behoerde.enterBehoerdenname') }}</h3>
        </v-col>
      </v-row>
      <FormRow
        :error-label="selectedBehoerdennameProps?.error || ''"
        label-for-id="behoerdenname-input"
        :is-required="true"
        :label="$t('admin.behoerde.behoerdenname')"
      >
        <v-text-field
          id="behoerdenname-input"
          v-bind="selectedBehoerdennameProps"
          ref="behoerdenname-input"
          v-model="selectedBehoerdenname"
          clearable
          data-testid="behoerdenname-input"
          :placeholder="$t('admin.behoerde.behoerdenname')"
          variant="outlined"
          density="compact"
          required
        />
      </FormRow>
      <!-- enter Dienststellennummer (optional) -->
      <v-row>
        <v-col>
          <h3 class="headline-3">3. {{ $t('admin.behoerde.enterDienststellennummer') }}</h3>
        </v-col>
      </v-row>
      <FormRow
        :error-label="selectedDienststellennummerProps?.error || ''"
        label-for-id="behoerde-dienststellennummer-input"
        :is-required="false"
        :label="$t('admin.behoerde.dienststellennummer')"
      >
        <v-text-field
          id="behoerde-dienststellennummer-input"
          v-bind="selectedDienststellennummerProps"
          ref="behoerde-dienststellennummer-input"
          v-model="selectedDienststellennummer"
          clearable
          data-testid="behoerde-dienststellennummer-input"
          :placeholder="$t('admin.behoerde.dienststellennummer')"
          variant="outlined"
          density="compact"
        />
      </FormRow>
    </template>
  </FormWrapper>
</template>
