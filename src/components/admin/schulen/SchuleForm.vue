<script setup lang="ts">
  import FormRow from '@/components/form/FormRow.vue';
  import FormWrapper from '@/components/form/FormWrapper.vue';
  import { Organisation, type OrganisationStore } from '@/stores/OrganisationStore';
  import { DIN_91379A_EXT, NO_LEADING_TRAILING_SPACES } from '@/utils/validation';
  import { toTypedSchema } from '@vee-validate/yup';
  import { FormMeta, TypedSchema, useForm, type BaseFieldProps } from 'vee-validate';
  import { onMounted, ref, Ref, watch } from 'vue';
  import { Composer, useI18n } from 'vue-i18n';
  import { object, string } from 'yup';

  export type SchuleDetailsForm = {
    selectedSchulform: string;
    selectedDienststellennummer: string;
    selectedSchulname: string;
  };

  type Props = {
    cachedValues?: Partial<SchuleDetailsForm>;
    isEditMode: boolean;
    organisationStore: OrganisationStore;
    schultraegerList: Organisation[] | undefined;
    showUnsavedChangesDialog: boolean;
  };

  type Emits = {
    (e: 'click:confirmUnsaved'): void;
    (e: 'click:discard'): void;
    (e: 'click:submit', values: SchuleDetailsForm): void;
    (e: 'update:canSubmit', value: boolean): void;
    (e: 'update:dirty', value: boolean): void;
    (e: 'update:showUnsavedChangesDialog', visible: boolean): void;
  };

  const props: Props = defineProps<Props>();

  const emit: Emits = defineEmits<Emits>();

  const { t }: Composer = useI18n({ useScope: 'global' });
  const initialSchulFormCache: Ref<string> = ref('');

  const validationSchema: TypedSchema = toTypedSchema(
    object({
      selectedDienststellennummer: string()
        .matches(NO_LEADING_TRAILING_SPACES, t('admin.schule.rules.dienststellennummer.noLeadingTrailingSpaces'))
        .required(t('admin.schule.rules.dienststellennummer.required')),
      selectedSchulname: string()
        .matches(DIN_91379A_EXT, t('admin.schule.rules.schulname.matches'))
        .matches(NO_LEADING_TRAILING_SPACES, t('admin.schule.rules.schulname.noLeadingTrailingSpaces'))
        .required(t('admin.schule.rules.schulname.required')),
    }),
  );

  const vuetifyConfig = (state: {
    errors: Array<string>;
  }): { props: { error: boolean; 'error-messages': Array<string> } } => ({
    props: {
      error: !!state.errors.length,
      'error-messages': state.errors,
    },
  });

  // eslint-disable-next-line @typescript-eslint/typedef
  const { defineField, handleSubmit, meta } = useForm<SchuleDetailsForm>({
    validationSchema,
  });

  const [selectedSchulform]: [Ref<string>, Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>] =
    defineField('selectedSchulform', vuetifyConfig);
  const [selectedSchulname, selectedSchulnameProps]: [
    Ref<string>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = defineField('selectedSchulname', vuetifyConfig);
  const [selectedDienststellennummer, selectedDienststellennummerProps]: [
    Ref<string>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = defineField('selectedDienststellennummer', vuetifyConfig);

  const onSubmit: (e?: Event) => Promise<void> = handleSubmit((values: SchuleDetailsForm) => {
    if (selectedDienststellennummer.value && selectedSchulname.value) {
      emit('click:submit', values);
    }
  });

  watch(meta, ({ dirty }: FormMeta<SchuleDetailsForm>) => {
    emit('update:dirty', dirty);
  });

  onMounted(() => {
    if (props.schultraegerList && props.schultraegerList.length > 0) {
      const defaultSchulform: string = props.schultraegerList[0]?.id ?? '';
      selectedSchulform.value = defaultSchulform;
      initialSchulFormCache.value = defaultSchulform;
    }
  });
</script>

<template>
  <FormWrapper
    :id="isEditMode ? 'schule-edit-form' : 'schule-create-form'"
    :confirm-unsaved-changes-action="() => emit('click:confirmUnsaved')"
    :create-button-label="isEditMode ? $t('save') : $t('admin.schule.create')"
    :discard-button-label="isEditMode ? $t('cancel') : $t('admin.schule.discard')"
    :hide-actions="!!organisationStore.errorCode"
    :is-loading="organisationStore.loading"
    :on-discard="() => emit('click:discard')"
    :on-submit="onSubmit"
    :show-unsaved-changes-dialog
    @on-show-dialog-change="(value?: boolean) => emit('update:showUnsavedChangesDialog', !!value)"
  >
    <template v-if="!organisationStore.errorCode">
      <!-- Select school type. For now not bound to anything and just a UI element -->
      <v-row>
        <v-col>
          <h3 class="headline-3">1. {{ $t('admin.schule.assignSchulform') }}</h3>
        </v-col>
      </v-row>
      <v-row>
        <v-col
          cols="4"
          class="d-none d-md-flex"
        />
        <v-radio-group
          v-model="selectedSchulform"
          inline
          data-testid="schulform-radio-group"
        >
          <v-row justify="center">
            <v-col
              v-for="(schultraeger, index) in schultraegerList"
              :key="schultraeger.id"
              cols="12"
              sm="5"
              class="pb-0"
            >
              <v-radio
                :label="schultraeger.name"
                :value="schultraeger.id"
                :data-testid="'schulform-radio-button-' + index"
              />
            </v-col>
          </v-row>
        </v-radio-group>
      </v-row>
      <!-- Enter service number -->
      <v-row>
        <v-col>
          <h3 class="headline-3">2. {{ $t('admin.schule.enterDienststellennummer') }}</h3>
        </v-col>
      </v-row>
      <FormRow
        :error-label="selectedDienststellennummerProps['error']"
        label-for-id="dienststellennummer-input"
        :is-required="true"
        :label="$t('admin.schule.dienststellennummer')"
      >
        <v-text-field
          v-bind="selectedDienststellennummerProps"
          ref="dienststellennummer-input"
          v-model="selectedDienststellennummer"
          clearable
          data-testid="dienststellennummer-input"
          :placeholder="$t('admin.schule.dienststellennummer')"
          variant="outlined"
          density="compact"
        />
      </FormRow>
      <!-- select school name -->
      <v-row>
        <v-col>
          <h3 class="headline-3">3. {{ $t('admin.schule.enterSchulname') }}</h3>
        </v-col>
      </v-row>
      <FormRow
        :error-label="selectedSchulnameProps['error']"
        label-for-id="schulname-input"
        :is-required="true"
        :label="$t('admin.schule.schulname')"
      >
        <v-text-field
          v-bind="selectedSchulnameProps"
          ref="schulname-input"
          v-model="selectedSchulname"
          clearable
          data-testid="schulname-input"
          :placeholder="$t('admin.schule.schulname')"
          variant="outlined"
          density="compact"
          required
        />
      </FormRow>
    </template>
  </FormWrapper>
</template>
