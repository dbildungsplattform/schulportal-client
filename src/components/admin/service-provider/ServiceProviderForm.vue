<script setup lang="ts">
  import LayoutCard from '@/components/cards/LayoutCard.vue';
import ServiceProviderCard from '@/components/cards/ServiceProviderCard.vue';
import SchulenFilter from '@/components/filter/SchulenFilter.vue';
import FormRow from '@/components/form/FormRow.vue';
import FormWrapper from '@/components/form/FormWrapper.vue';
import LogoSelector from '@/components/form/LogoSelector.vue';
import { type Organisation } from '@/stores/OrganisationStore';
import { RollenArt, RollenSystemRecht } from '@/stores/RolleStore';
import { ServiceProviderKategorie, ServiceProviderMerkmal } from '@/stores/ServiceProviderStore';
import { TranslatedObject } from '@/types';
import { getLogoPath } from '@/utils/logosConfig';
import { DIN_91379A_EXT, NO_LEADING_TRAILING_SPACES } from '@/utils/validation';
import { toTypedSchema } from '@vee-validate/yup';
import { useForm, type BaseFieldProps, type FormContext, type FormMeta, type TypedSchema } from 'vee-validate';
import { computed, onMounted, ref, watch, watchEffect, type ComputedRef, type Ref } from 'vue';
import { useI18n, type Composer } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import { array, boolean, number, object, string } from 'yup';
import { ANBIETEN_IN_MERKMALE, extractAnbietenInMerkmale } from '../../../utils/serviceProvider.helper';
import type { ServiceProviderFormProps as Props, ServiceProviderForm, ServiceProviderFormSubmitData } from './types';

  type Emits = {
    (e: 'click:confirmUnsaved'): void;
    (e: 'click:discard'): void;
    (e: 'click:submit', values: ServiceProviderFormSubmitData): void;
    (e: 'update:canSubmit', value: boolean): void;
    (e: 'update:dirty', value: boolean): void;
    (e: 'update:showUnsavedChangesDialog', visible: boolean): void;
  };

  type FieldDefinition<T> = [Ref<T>, Ref<BaseFieldProps & { error: boolean; 'error-messages': string[] }>];

  const props: Props = defineProps<Props>();

  const emit: Emits = defineEmits<Emits>();

  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  const validationSchema: TypedSchema<ServiceProviderForm> = toTypedSchema(
    object({
      selectedOrganisationId: string().required(t('angebot.rules.organisation.required')),
      name: string()
        .max(50, t('angebot.rules.name.maxLength'))
        .matches(DIN_91379A_EXT, t('angebot.rules.name.matches'))
        .matches(NO_LEADING_TRAILING_SPACES, t('angebot.rules.name.noLeadingTrailingSpaces'))
        .required(t('angebot.rules.name.required')),
      url: string().required(t('angebot.rules.url.required')).max(2000, t('angebot.rules.url.maxLength')),
      logoId:
        props.isEditMode && !props.initialValues.logoId && !!props.initialValues.customLogo
          ? number().nullable().optional() // legacy SP — no selector shown, no validation needed
          : number().required(t('angebot.rules.logo.required')), // create or new SP edit
      kategorie: string().required(t('angebot.rules.kategorie.required')),
      nachtraeglichZuweisbar: boolean().optional(),
      verfuegbarFuerRollenerweiterung: boolean().optional(),
      anbietenInMerkmale: array().of(string().required()).required(),
      rollenartenWhitelist: array().of(string().required()).required(),
      requires2fa: boolean().optional(),
    }),
  );

  const vuetifyConfig: (state: { errors: string[] }) => {
    props: { error: boolean; 'error-messages': string[] };
  } = (state: { errors: string[] }) => ({
    props: {
      error: !!state.errors.length,
      'error-messages': state.errors,
    },
  });

  const formContext: FormContext<ServiceProviderForm> = useForm({
    validationSchema,
    initialValues: {
      selectedOrganisationId: undefined,
      name: '',
      url: '',
      logoId: undefined,
      kategorie: ServiceProviderKategorie.Schulisch,
      nachtraeglichZuweisbar: true,
      verfuegbarFuerRollenerweiterung: true,
      anbietenInMerkmale: extractAnbietenInMerkmale(Object.values(ServiceProviderMerkmal)),
      rollenartenWhitelist: [],
      requires2fa: false,
      // No default logoId — admin must actively pick one
      ...props.initialValues,
    },
  });

  const [selectedOrganisationId, selectedOrganisationIdProps]: FieldDefinition<string> = formContext.defineField(
    'selectedOrganisationId',
    vuetifyConfig,
  );
  const [name, nameProps]: FieldDefinition<string> = formContext.defineField('name', vuetifyConfig);
  const [url, urlProps]: FieldDefinition<string> = formContext.defineField('url', vuetifyConfig);
  const [logoId, logoIdProps]: FieldDefinition<number> = formContext.defineField('logoId', vuetifyConfig);
  const [kategorie, kategorieProps]: FieldDefinition<ServiceProviderKategorie> = formContext.defineField(
    'kategorie',
    vuetifyConfig,
  );
  const [requires2fa, requires2faProps]: FieldDefinition<boolean> = formContext.defineField(
    'requires2fa',
    vuetifyConfig,
  );
  const [nachtraeglichZuweisbar, nachtraeglichZuweisbarProps]: FieldDefinition<boolean> = formContext.defineField(
    'nachtraeglichZuweisbar',
    vuetifyConfig,
  );
  const [verfuegbarFuerRollenerweiterung, verfuegbarFuerRollenerweiterungProps]: FieldDefinition<boolean> =
    formContext.defineField('verfuegbarFuerRollenerweiterung', vuetifyConfig);
  const [anbietenInMerkmale, anbietenInMerkmaleProps]: FieldDefinition<ServiceProviderMerkmal[]> =
    formContext.defineField('anbietenInMerkmale', vuetifyConfig);
  const [rollenartenWhitelist, rollenartenWhitelistProps]: FieldDefinition<RollenArt[]> = formContext.defineField(
    'rollenartenWhitelist',
    vuetifyConfig,
  );
  const hasAngeboteVerwalten: ComputedRef<boolean> = computed(
    () => props.systemrecht === RollenSystemRecht.AngeboteVerwalten,
  );
  const areRoleExtensionCheckboxesDisabled: ComputedRef<boolean> = computed(
    () => !hasAngeboteVerwalten.value || !verfuegbarFuerRollenerweiterung.value,
  );

  const canCommit: ComputedRef<boolean> = computed(() => formContext.meta.value.valid && formContext.meta.value.dirty);

  const rollenartenWhitelistItems: ComputedRef<TranslatedObject[]> = computed(() =>
    Object.values(RollenArt).map((rollenart: RollenArt) => ({
      title: t(`admin.rolle.mappingFrontBackEnd.rollenarten.${rollenart}`),
      value: rollenart,
    })),
  );

  const kategorieItems: ComputedRef<TranslatedObject[]> = computed(() =>
    Object.values(ServiceProviderKategorie).map((k: string) => ({
      title: t(`angebot.mappingFrontBackEnd.kategorien.${k}`),
      value: k,
    })),
  );

  const anbietenInItems: ComputedRef<TranslatedObject[]> = computed(() =>
    ANBIETEN_IN_MERKMALE.map((m: ServiceProviderMerkmal) => ({
      title: t(`angebot.mappingFrontBackEnd.merkmale.${m}`),
      value: m,
    })),
  );

  // Resolve the SVG path for the currently selected logoId or legacy logo — used for the preview
  const selectedLogoPath: ComputedRef<string | undefined> = computed(() =>
    props.isEditMode
      ? props.initialValues.logoId
        ? getLogoPath(logoId.value)
        : props.initialValues.customLogo
      : getLogoPath(logoId.value),
  );

  // Show preview only when both name and logo are selected
  const showPreview: ComputedRef<boolean> = computed(
    () => !!name.value && (!!logoId.value || !!props.initialValues.customLogo),
  );

  enum WarningDialogType {
    None,
    RollenartenWhitelistChanged,
    VerfuegbarFuerRollenerweiterungChanged,
  }

  const showWarningDialog: Ref<boolean> = ref(false);
  const warningDialogType: Ref<WarningDialogType> = ref(WarningDialogType.None);
  const affectedRollenarten: ComputedRef<RollenArt[]> = computed(() => {
    if (rollenartenWhitelist.value.length === 0) {
      return [];
    }
    const initialWhitelist: RollenArt[] =
      props.initialValues.rollenartenWhitelist && props.initialValues.rollenartenWhitelist.length > 0
        ? props.initialValues.rollenartenWhitelist
        : Object.values(RollenArt);
    return initialWhitelist.filter((r: RollenArt) => !rollenartenWhitelist.value.includes(r));
  });

  function initializeFormWithCachedValues(): void {
    if (!props.cachedValues) {
      return;
    }
    const cached: Partial<ServiceProviderForm> = props.cachedValues;
    formContext.setValues(cached);
  }

  const cachedOrga: Ref<Organisation | undefined> = ref();

  function updateSelectedOrganisation(selectedOrgas: Organisation[]): void {
    if (props.isEditMode) {
      return;
    }
    const org: Organisation | undefined = selectedOrgas.at(0);
    if (org) {
      formContext.setFieldValue('selectedOrganisationId', org.id);
      cachedOrga.value = org;
    }
  }

  function openUrlInNewTab(): void {
    if (!url.value) {
      return;
    }

    let value: string = url.value.trim();

    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)) {
      value = 'https://' + value;
    }

    window.open(value, '_blank', 'noopener,noreferrer');
  }

  const onSubmit: (e?: Event) => Promise<void> = formContext.handleSubmit((values: ServiceProviderForm) => {
    if (!props.isEditMode && !cachedOrga.value) {
      return;
    }

    let normalizedUrl: string = values.url.trim();
    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    const payload: ServiceProviderFormSubmitData = {
      selectedOrganisation: cachedOrga.value,
      name: values.name,
      url: normalizedUrl,
      logoId: values.logoId,
      kategorie: values.kategorie,
      merkmale: [],
      rollenartenWhitelist: values.rollenartenWhitelist ?? [],
      requires2fa: values.requires2fa,
    };
    if (values.nachtraeglichZuweisbar) {
      payload.merkmale.push(ServiceProviderMerkmal.NachtraeglichZuweisbar);
    }
    if (values.verfuegbarFuerRollenerweiterung) {
      payload.merkmale.push(ServiceProviderMerkmal.VerfuegbarFuerRollenerweiterung);
      payload.merkmale.push(...anbietenInMerkmale.value);
    }
    emit('click:submit', payload);
  });

  const isCustomLogoMode: ComputedRef<boolean> = computed(
    () => !!props.isEditMode && !logoId.value && !!props.initialValues.customLogo,
  );

  const onRollenartenWhitelistFocus: (isFocused: boolean) => void = (isFocused: boolean) => {
    if (isFocused) {
      return;
    }
    if (props.isEditMode && formContext.isFieldDirty('rollenartenWhitelist') && affectedRollenarten.value.length > 0) {
      showWarningDialog.value = true;
      warningDialogType.value = WarningDialogType.RollenartenWhitelistChanged;
    }
  };

  watch(formContext.meta, ({ dirty }: FormMeta<ServiceProviderForm>) => {
    emit('update:dirty', dirty);
  });

  watch(
    verfuegbarFuerRollenerweiterung,
    (isAvailableForRoleExtension: boolean): void => {
      if (isAvailableForRoleExtension) {
        formContext.setFieldValue('anbietenInMerkmale', props.initialValues.anbietenInMerkmale ?? ANBIETEN_IN_MERKMALE);
      } else {
        formContext.setFieldValue('anbietenInMerkmale', []);
        if (props.isEditMode && formContext.isFieldDirty('verfuegbarFuerRollenerweiterung')) {
          showWarningDialog.value = true;
          warningDialogType.value = WarningDialogType.VerfuegbarFuerRollenerweiterungChanged;
        }
      }
    },
    { immediate: true },
  );

  watchEffect(() => {
    emit('update:canSubmit', canCommit.value);
  });

  onMounted(() => {
    initializeFormWithCachedValues();
  });
</script>

<template>
  <FormWrapper
    :id="isEditMode ? 'service-provider-edit-form' : 'service-provider-create-form'"
    :confirm-unsaved-changes-action="() => emit('click:confirmUnsaved')"
    :can-commit="canCommit"
    :create-button-label="isEditMode ? t('save') : t('angebot.create')"
    :discard-button-label="isEditMode ? t('cancel') : t('angebot.discard')"
    :hide-actions="!!errorCode"
    :is-loading="loading"
    :on-discard="() => emit('click:discard')"
    :on-submit="onSubmit"
    :show-unsaved-changes-dialog
    @on-show-dialog-change="(value?: boolean) => emit('update:showUnsavedChangesDialog', !!value)"
  >
    <template v-if="!errorCode">
      <div class="form-sections">
        <!-- Organisation -->
        <v-row>
          <v-col>
            <h3 class="headline-3">{{ $t('angebot.whoProvidesThisAngebot') }}</h3>
          </v-col>
        </v-row>
        <FormRow
          :error-label="selectedOrganisationIdProps['error']"
          :is-required="true"
          :label-for-id="
            isEditMode ? 'service-provider-edit-organisation-select' : 'service-provider-create-organisation-select'
          "
          :label="$t('angebot.providedBy')"
        >
          <SchulenFilter
            :systemrechte-for-search="[props.systemrecht]"
            :readonly="isEditMode"
            :highlight-selection="isEditMode"
            :multiple="false"
            :parent-id="isEditMode ? 'service-provider-edit' : 'service-provider-create'"
            :placeholderText="$t('admin.organisation.selectOrganisation')"
            :includeAll="true"
            :selected-schule-props="selectedOrganisationIdProps"
            :selected-schulen="selectedOrganisationId"
            @update:selected-schulen-objects="updateSelectedOrganisation"
          />
        </FormRow>

        <!-- Name -->
        <v-row>
          <v-col>
            <h3 class="headline-3">{{ $t('angebot.nameOfAngebotInTheStartPage') }}</h3>
          </v-col>
        </v-row>
        <FormRow
          :error-label="nameProps['error']"
          :is-required="true"
          label-for-id="name-input"
          :label="$t('angebot.name')"
        >
          <v-text-field
            id="name-input"
            v-bind="nameProps"
            v-model="name"
            autocomplete="off"
            data-testid="name-input"
            density="compact"
            :placeholder="$t('angebot.enterName')"
            required
            variant="outlined"
          />
        </FormRow>

        <!-- URL -->
        <v-row class="mb-n8">
          <v-col>
            <h3 class="headline-3">{{ $t('angebot.urlOfTheAngebot') }}</h3>
          </v-col>
        </v-row>
        <FormRow
          :error-label="urlProps['error']"
          :is-required="true"
          label-for-id="url-input"
          :label="$t('angebot.url')"
        >
          <v-text-field
            id="url-input"
            v-bind="urlProps"
            v-model="url"
            autocomplete="off"
            data-testid="url-input"
            density="compact"
            :placeholder="$t('angebot.enterUrl')"
            required
            variant="outlined"
          />
          <div class="d-flex justify-end">
            <v-btn
              :disabled="!url"
              class="primary smallest"
              data-testid="url-test-button"
              density="compact"
              variant="outlined"
              @click="openUrlInNewTab"
            >
              {{ $t('angebot.testUrl') }}
            </v-btn>
          </div>
        </FormRow>

        <!-- Logo -->
        <v-row>
          <v-col>
            <h3 class="headline-3">{{ $t('angebot.logoOfTheAngebotInTheStartPage') }}</h3>
          </v-col>
        </v-row>
        <FormRow
          :error-label="logoIdProps['error']"
          :is-required="!isCustomLogoMode"
          label-for-id="logo-selector"
          :label="$t('angebot.logo')"
          :wide-content="isCustomLogoMode ? false : true"
        >
          <!-- Custom SP in edit mode: logo URL from backend, read-only, no selector -->
          <template v-if="isCustomLogoMode">
            <v-img
              alt="provider-logo"
              max-height="48"
              max-width="48"
              :src="props.initialValues.customLogo"
            />
          </template>

          <!-- New SP: show selector (preselected when logoId is in initialValues) -->
          <LogoSelector
            v-else
            id="logo-selector"
            v-model="logoId"
            v-bind="logoIdProps"
            :readonly="false"
            data-testid="logo-selector"
          />
        </FormRow>

        <!-- Preview: always visible below the logo selector -->
        <v-row>
          <v-col>
            <h3 class="headline-3">{{ $t('angebot.previewHeadline') }}</h3>
          </v-col>
        </v-row>
        <FormRow
          :is-required="false"
          label-for-id="preview"
          :label="$t('angebot.previewLabel')"
        >
          <ServiceProviderCard
            v-if="showPreview"
            :logo-url="selectedLogoPath"
            :test-id="'service-provider-preview-card'"
            :title="name"
          />
          <v-card
            v-else
            class="preview-placeholder d-flex align-center justify-center pa-4"
            variant="outlined"
          >
            <span class="preview-placeholder-text">{{ $t('angebot.previewPlaceholder') }}</span>
          </v-card>
        </FormRow>

        <!-- Kategorie -->
        <v-row>
          <v-col>
            <h3 class="headline-3">{{ $t('angebot.kategorieOfTheAngebotInTheStartPage') }}</h3>
          </v-col>
        </v-row>
        <FormRow
          :error-label="kategorieProps['error']"
          :is-required="false"
          label-for-id="kategorie-select"
          :label="$t('angebot.kategorie')"
        >
          <v-autocomplete
            :disabled="systemrecht !== RollenSystemRecht.AngeboteVerwalten"
            id="kategorie-select"
            v-bind="kategorieProps"
            v-model="kategorie"
            autocomplete="off"
            clearable
            data-testid="kategorie-select"
            density="compact"
            :items="kategorieItems"
            item-value="value"
            item-title="title"
            :no-data-text="$t('noDataFound')"
            :placeholder="$t('angebot.selectKategorie')"
            required
            variant="outlined"
          />
        </FormRow>

        <!-- Nachträglich zuweisbar -->
        <v-row>
          <v-col>
            <h3 class="headline-3">{{ $t('angebot.canThisAngebotBeAssignedToRollen') }}</h3>
          </v-col>
        </v-row>
        <FormRow
          :error-label="nachtraeglichZuweisbarProps['error']"
          :is-required="false"
          label-for-id="nachtraeglich-zuweisbar-select"
          :label="$t('angebot.canBeAssigned')"
        >
          <v-select
            :disabled="isEditMode || systemrecht !== RollenSystemRecht.AngeboteVerwalten"
            id="nachtraeglich-zuweisbar-select"
            v-bind="nachtraeglichZuweisbarProps"
            v-model="nachtraeglichZuweisbar"
            data-testid="nachtraeglich-zuweisbar-select"
            density="compact"
            :items="[
              { title: $t('yes'), value: true },
              { title: $t('no'), value: false },
            ]"
            item-value="value"
            item-title="title"
            variant="outlined"
          />
        </FormRow>

        <!-- Rollenerweiterung -->
        <v-row>
          <v-col>
            <h3 class="headline-3">{{ $t('angebot.canThisAngebotBeUsedForSchulspezifischeRollenerweiterungen') }}</h3>
          </v-col>
        </v-row>
        <FormRow
          :error-label="verfuegbarFuerRollenerweiterungProps['error']"
          :is-required="false"
          label-for-id="verfuegbar-fuer-rollenerweiterung-select"
          :label="$t('angebot.canBeUsed')"
        >
          <v-select
            :disabled="!hasAngeboteVerwalten"
            id="verfuegbar-fuer-rollenerweiterung-select"
            ref="verfuegbar-fuer-rollenerweiterung-select"
            v-bind="verfuegbarFuerRollenerweiterungProps"
            v-model="verfuegbarFuerRollenerweiterung"
            data-testid="verfuegbar-fuer-rollenerweiterung-select"
            density="compact"
            :items="[
              { title: $t('yes'), value: true },
              { title: $t('no'), value: false },
            ]"
            item-value="value"
            item-title="title"
            variant="outlined"
          />
        </FormRow>
        <FormRow
          :is-required="false"
          label-for-id="service-provider-display-merkmale-select"
          :label="$t('angebot.offeringScope')"
          :noTopMargin="true"
        >
          <div id="service-provider-display-merkmale">
            <v-select
              :disabled="areRoleExtensionCheckboxesDisabled"
              id="service-provider-display-merkmale-select"
              :multiple="true"
              v-bind="anbietenInMerkmaleProps"
              v-model="anbietenInMerkmale"
              chips
              data-testid="service-provider-display-merkmale-select"
              density="compact"
              :items="anbietenInItems"
              item-value="value"
              item-title="title"
              variant="outlined"
              :placeholder="$t('none')"
            />
          </div>
        </FormRow>

        <!-- Rollenarten whitelist -->
        <v-row class="mt-8">
          <v-col class="pa-0">
            <h3 class="headline-3">{{ $t('angebot.rollenartenWhitelistHeading') }}</h3>
          </v-col>
        </v-row>
        <FormRow
          :error-label="rollenartenWhitelistProps['error']"
          :is-required="false"
          label-for-id="rollenarten-whitelist-select"
          :label="$t('angebot.rollenartenWhitelistLabel')"
        >
          <v-autocomplete
            @update:focused="onRollenartenWhitelistFocus"
            id="rollenarten-whitelist-select"
            ref="rollenarten-whitelist-select"
            v-bind="rollenartenWhitelistProps"
            v-model="rollenartenWhitelist"
            chips
            clearable
            data-testid="rollenarten-whitelist-select"
            density="compact"
            :disabled="!hasAngeboteVerwalten"
            :items="rollenartenWhitelistItems"
            item-value="value"
            item-title="title"
            multiple
            :no-data-text="$t('noDataFound')"
            :placeholder="$t('angebot.noRestrictions')"
            variant="outlined"
          />
        </FormRow>
        <!-- 2FA -->
        <v-row>
          <v-col>
            <h3 class="headline-3">{{ $t('angebot.is2FARequired') }}</h3>
          </v-col>
        </v-row>
        <FormRow
          :error-label="requires2faProps['error']"
          :is-required="false"
          label-for-id="requires2fa-select"
          :label="$t('angebot.requires2FA')"
        >
          <v-select
            disabled
            id="requires2fa-select"
            v-bind="requires2faProps"
            v-model="requires2fa"
            data-testid="requires2fa-select"
            density="compact"
            :items="[
              { title: $t('yes'), value: true },
              { title: $t('no'), value: false },
            ]"
            item-value="value"
            item-title="title"
            variant="outlined"
          />
        </FormRow>
      </div>
    </template>
    <v-dialog
      v-model="showWarningDialog"
      persistent
      max-width="500"
    >
      <LayoutCard
        :header="t('angebot.edit')"
        data-testid="warning-dialog"
      >
        <v-card-text>
          <v-container>
            <v-row class="text-body bold justify-center">
              <v-col class="text-center">
                <template v-if="warningDialogType == WarningDialogType.VerfuegbarFuerRollenerweiterungChanged">
                  <p>{{ t('angebot.verfuegbarFuerRollenerweiterungChangedWarning') }}</p>
                </template>
                <template v-if="warningDialogType == WarningDialogType.RollenartenWhitelistChanged">
                  <p>
                    {{
                      t('angebot.rollenartenWhitelistChangedWarning', {
                        rollenarten: affectedRollenarten
                          .map((r) => t(`admin.rolle.mappingFrontBackEnd.rollenarten.${r}`))
                          .join(', '),
                      })
                    }}
                  </p>
                </template>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-row class="justify-center">
            <v-col
              cols="12"
              sm="6"
              md="auto"
            >
              <v-btn
                class="primary button"
                data-testid="confirm-warning-dialog-button"
                :block="mdAndDown"
                @click.stop="showWarningDialog = false"
              >
                {{ $t('ok') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </v-dialog>
  </FormWrapper>
</template>

<style scoped>
  .form-sections {
    counter-reset: section-counter;
  }

  .headline-3 {
    counter-increment: section-counter;
  }

  .headline-3::before {
    content: counter(section-counter) '. ';
    margin-right: 0.25em;
    font-weight: bold;
  }

  .preview-card {
    border-color: #001e49;
    border-radius: 8px;
  }

  .preview-name {
    font-size: 1rem;
    font-weight: 600;
    color: #001e49;
  }

  .preview-hint {
    font-size: 0.75rem;
    color: #666;
    font-style: italic;
  }
</style>
