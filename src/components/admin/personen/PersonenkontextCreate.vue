<script setup lang="ts">
  import BefristungInput, { type BefristungProps } from '@/components/admin/personen/BefristungInput.vue';
  import KlassenFilter from '@/components/filter/KlassenFilter.vue';
  import SchulenFilter from '@/components/filter/SchulenFilter.vue';
  import FormRow from '@/components/form/FormRow.vue';
  import { useAutoselectedSchule } from '@/composables/useAutoselectedSchule';
  import type { TranslatedRolleWithAttrs } from '@/composables/useRollen';
  import { OrganisationsTyp, type Organisation } from '@/stores/OrganisationStore';
  import {
    CreationType,
    KlassenOption,
    OperationContext,
    RolleDialogMode,
    usePersonenkontextStore,
    type PersonenkontextStore,
    type WorkflowFilter,
  } from '@/stores/PersonenkontextStore';
  import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
  import {
    RollenArt,
    RollenForPersonenkontextCreationQuery,
    RollenSystemRecht,
    RolleStore,
    useRolleStore,
  } from '@/stores/RolleStore';
  import type { Zuordnung } from '@/stores/types/Zuordnung';
  import { type TranslatedObject } from '@/types.d';
  import { blurActiveElement } from '@/utils/focus';
  import type { BaseFieldProps } from 'vee-validate';
  import { computed, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue';
  import { useI18n } from 'vue-i18n';

  useI18n({ useScope: 'global' });

  const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
  const personStore: PersonStore = usePersonStore();
  const rolleStore: RolleStore = useRolleStore();

  const rollenSearchDebounceTimerId: Ref<ReturnType<typeof setTimeout> | undefined> =
    ref<ReturnType<typeof setTimeout>>();
  const canCommit: Ref<boolean> = ref(false);

  const searchInputRolle: Ref<string | undefined> = ref('');
  const searchInputRollen: Ref<string | undefined> = ref('');

  const localKlassenOption: Ref<string | undefined> = ref(KlassenOption.KEEP_KLASSE);

  type Props = {
    organisationen: TranslatedObject[] | undefined;
    rollen: TranslatedRolleWithAttrs[] | undefined;
    selectedOrganisation: string | undefined;
    createType?: CreationType;
    showHeadline: boolean;
    personId?: string;
    operationContext: OperationContext;
    selectedRolle?: string | undefined;
    selectedRollen?: string[] | undefined;
    selectedKlassenOption?: string | null;
    selectedKlasse?: string | undefined;
    selectedKlasseForRadio?: string | undefined;
    selectedOrganisationProps?: BaseFieldProps & { error: boolean; 'error-messages': Array<string> };
    selectedKlasseProps?: BaseFieldProps & { error: boolean; 'error-messages': Array<string> };
    selectedKlasseForRadioProps?: BaseFieldProps & { error: boolean; 'error-messages': Array<string> };
    selectedRolleProps?: BaseFieldProps & { error: boolean; 'error-messages': Array<string> };
    selectedRollenProps?: BaseFieldProps & { error: boolean; 'error-messages': Array<string> };
    selectedKlassenOptionProps?: BaseFieldProps & { error: boolean; 'error-messages': Array<string> };
    befristungInputProps?: BefristungProps;
    headlineNumbers?: {
      org: string;
      rolle: string;
      befristung: string;
    };
    allowMultipleRollen?: boolean;
    rolleDialogMode?: RolleDialogMode;
  };

  const props: Props = defineProps<Props>();
  const {
    autoselectedSchule,
  }: { hasAutoselectedSchule: ComputedRef<boolean>; autoselectedSchule: ComputedRef<Organisation | null> } =
    useAutoselectedSchule([RollenSystemRecht.PersonenVerwalten]);

  type Emits = {
    (e: 'update:befristung', value: string | undefined): void;
    (e: 'update:calculatedBefristungOption', value: string | undefined): void;
    (event: 'update:selectedOrganisation', value: string | undefined): void;
    (event: 'update:selectedRolle', value: string | undefined): void;
    (event: 'update:selectedRollen', value: string[] | undefined): void;
    (event: 'update:selectedKlasse', value: string | undefined): void;
    (event: 'update:selectedKlasseForRadio', value: string | undefined): void;
    (event: 'update:selectedKlassenOption', value: string | null): void;
    (event: 'update:canCommit', value: boolean): void;
    (event: 'fieldReset', field: 'selectedOrganisation' | 'selectedRolle' | 'selectedKlasse' | 'selectedRollen'): void;
  };
  const emits: Emits = defineEmits<Emits>();

  const selectedOrganisation: Ref<string | undefined> = ref(props.selectedOrganisation);
  const selectedRolle: Ref<string | undefined> = ref(props.selectedRolle);
  const selectedRollen: Ref<string[] | undefined> = ref(props.selectedRollen || []);
  const selectedKlasse: Ref<string | undefined> = ref(props.selectedKlasse);
  const selectedKlasseForRadio: Ref<string | undefined> = ref(props.selectedKlasseForRadio);
  // we need to cast the selectedSchule into an array
  // doing it this way prevents an issue where the reactive system constantly re-runs which causes requests to be issued in a loop
  const administriertVon: Ref<string[] | undefined> = ref([]);

  const isSelectedRolleAlreadyPresent: ComputedRef<boolean> = computed(() => {
    if (props.allowMultipleRollen) {
      return props.rollen?.some((rolle: TranslatedObject) => rolle.title === searchInputRollen.value) ?? false;
    } else {
      return props.rollen?.some((rolle: TranslatedObject) => rolle.title === searchInputRolle.value) ?? false;
    }
  });

  const rollenFilter: ComputedRef<RollenForPersonenkontextCreationQuery | undefined> = computed(() => {
    if (!selectedOrganisation.value) {
      return;
    }
    const filter: RollenForPersonenkontextCreationQuery = {
      organisationId: selectedOrganisation.value,
      rollenartOfUser: personStore.personenuebersicht?.zuordnungen[0]?.rollenArt,
      limit: 25,
      systemrecht:
        props.createType === CreationType.Limited ? RollenSystemRecht.EingeschraenktNeueBenutzerErstellen : undefined,
    };

    if (props.allowMultipleRollen) {
      filter.rollenIds = selectedRollen.value;
      if (searchInputRollen.value && !isSelectedRolleAlreadyPresent.value) {
        filter.rolleName = searchInputRollen.value;
      }
    } else {
      if (selectedRolle.value) {
        filter.rollenIds = [selectedRolle.value];
      }
      if (searchInputRolle.value && !isSelectedRolleAlreadyPresent.value) {
        filter.rolleName = searchInputRolle.value;
      }
    }

    return filter;
  });

  const useLandesbediensteteWorkflow: ComputedRef<boolean> = computed((): boolean => {
    return props.createType === CreationType.AddPersonToOwnSchule;
  });

  const requestedWithSystemrecht: ComputedRef<RollenSystemRecht | undefined> = computed(
    (): RollenSystemRecht | undefined => {
      return props.createType === CreationType.Limited
        ? RollenSystemRecht.EingeschraenktNeueBenutzerErstellen
        : undefined;
    },
  );

  function isLernRolle(selectedRolleIds: string | string[] | undefined): boolean {
    if (!selectedRolleIds) {
      return false;
    }

    // Ensure we always work with an array
    const rolleIdsArray: string[] = Array.isArray(selectedRolleIds) ? selectedRolleIds : [selectedRolleIds];

    return rolleIdsArray.some((rolleId: string) =>
      props.rollen?.some(
        (rolle: TranslatedRolleWithAttrs) => rolle.value === rolleId && rolle.rollenart === RollenArt.Lern,
      ),
    );
  }

  async function handleWorkflowStep(filter: WorkflowFilter): Promise<void> {
    const useLandesbediensteteWorkflows: boolean = props.createType === CreationType.AddPersonToOwnSchule;

    if (useLandesbediensteteWorkflows) {
      await personenkontextStore.processWorkflowStepLandesbedienstete(filter);
    } else {
      await personenkontextStore.processWorkflowStep({
        operationContext: props.operationContext,
        ...filter,
        requestedWithSystemrecht:
          props.createType === CreationType.Limited ? RollenSystemRecht.EingeschraenktNeueBenutzerErstellen : undefined,
      });
    }

    canCommit.value = personenkontextStore.workflowStepResponse?.canCommit ?? false;
  }

  const handleFocusChange = (focused: boolean): void => {
    if (!focused) {
      searchInputRollen.value = '';
      searchInputRolle.value = '';
    }
  };

  function updateKlasseSelection(selectedKlassen: string | undefined): void {
    selectedKlasse.value = selectedKlassen;
    emits('update:selectedKlasse', selectedKlassen);
  }

  function updateKlasseSelectionForRadio(selectedKlassen: string | undefined): void {
    selectedKlasseForRadio.value = selectedKlassen;
    emits('update:selectedKlasseForRadio', selectedKlassen);
  }

  // Clear the selected Rolle once the input field is cleared (This is the only way to fetch all Rollen again)
  // This is also important since we only want to fetch all orgas once the selected Rolle is null, otherwise an extra request is made with an empty string
  function clearSelectedRolle(): void {
    emits('fieldReset', 'selectedRolle');
  }

  function clearSelectedRollen(): void {
    emits('fieldReset', 'selectedRollen');
  }

  const handleBefristungChange = (value: string | undefined): void => {
    emits('update:befristung', value);
  };

  const handleCalculatedBefristungOptionChange = (value: string | undefined): void => {
    emits('update:calculatedBefristungOption', value);
  };

  function updateSchuleSelection(orgaId: string): void {
    selectedOrganisation.value = orgaId;
    emits('update:selectedOrganisation', orgaId);
  }

  function handleKlassenOption(value: string | null): void {
    if (value === null) {
      return;
    }
    if (value === KlassenOption.KEEP_KLASSE.toString()) {
      selectedKlasseForRadio.value = undefined;
      emits('update:selectedKlasseForRadio', undefined);
    }
    localKlassenOption.value = value;
    emits('update:selectedKlassenOption', value);
  }

  // Watcher for selectedOrganisation to fetch Rollen and Klassen
  watch(
    selectedOrganisation,
    (newSelectedOrganisationId: string | undefined, oldSelectedOrganisationId: string | undefined) => {
      // Reset selected Rollen if oldSelectedOrganisationId existed (change event)
      if (oldSelectedOrganisationId !== undefined) {
        if (selectedRolle.value) {
          selectedRolle.value = undefined;
          emits('fieldReset', 'selectedRolle');
        }
        if (selectedRollen.value?.length) {
          selectedRollen.value = undefined;
          emits('fieldReset', 'selectedRollen');
        }
      }
      emits('update:selectedOrganisation', newSelectedOrganisationId);

      if (newSelectedOrganisationId && newSelectedOrganisationId !== oldSelectedOrganisationId) {
        administriertVon.value?.pop();
        administriertVon.value?.push(newSelectedOrganisationId);

        // Check if all Klassen for this orga are the same
        const klassenZuordnungen: Zuordnung[] | undefined = personStore.personenuebersicht?.zuordnungen.filter(
          (zuordnung: Zuordnung) =>
            zuordnung.typ === OrganisationsTyp.Klasse && zuordnung.administriertVon === newSelectedOrganisationId,
        );

        const klassenIds: Set<string> = new Set(klassenZuordnungen?.map((zuordnung: Zuordnung) => zuordnung.sskId));
        if (klassenIds.size === 1) {
          const klasseId: string | undefined = klassenIds.values().next().value;
          if (klasseId) {
            selectedKlasse.value = klasseId;
            emits('update:selectedKlasse', klasseId);
          }
        } else {
          selectedKlasse.value = undefined;
          emits('fieldReset', 'selectedKlasse');
        }
      } else if (!newSelectedOrganisationId) {
        // Clear selections if orga was cleared
        administriertVon.value?.pop();
        selectedRolle.value = undefined;
        selectedKlasse.value = undefined;
        emits('fieldReset', 'selectedRolle');
        emits('fieldReset', 'selectedKlasse');
      }
    },
  );

  watch(
    () => (props.allowMultipleRollen ? selectedRollen.value : selectedRolle.value),
    async (newValue: string | string[] | undefined, oldValue: string | string[] | undefined) => {
      // Cancel any pending debounced search to prevent a stale request from overwriting
      // the workflow response triggered by this selection.
      clearTimeout(rollenSearchDebounceTimerId.value);

      const filter: WorkflowFilter = {
        personId: props.personId,
        organisationId: selectedOrganisation.value,
        limit: 25,
      };

      if (props.allowMultipleRollen) {
        const newRollen: string[] | undefined = newValue as string[] | undefined;

        if (newRollen && newRollen.length > 0) {
          filter.rollenIds = newRollen;
        } else {
          selectedKlasse.value = undefined;
          emits('fieldReset', 'selectedKlasse');
          emits('fieldReset', 'selectedRollen');
          canCommit.value = false;
        }
        await handleWorkflowStep(filter);

        emits('update:selectedRollen', newRollen);
      } else {
        const newRolle: string | undefined = newValue as string | undefined;

        if (newRolle && newRolle !== oldValue) {
          filter.rollenIds = [newRolle];
          await handleWorkflowStep(filter);
        }

        if (!newRolle) {
          canCommit.value = false;
          selectedKlasse.value = undefined;
          emits('fieldReset', 'selectedKlasse');
        }
        emits('update:selectedRolle', newRolle);
        blurActiveElement();
      }
    },
    { deep: true },
  );

  watch(
    rollenFilter,
    async (
      newFilter: RollenForPersonenkontextCreationQuery | undefined,
      oldFilter: RollenForPersonenkontextCreationQuery | undefined,
    ) => {
      clearTimeout(rollenSearchDebounceTimerId.value);
      if (!newFilter) {
        return;
      }

      // first load
      if (!oldFilter) {
        await rolleStore.getRollenForPersonenkontextCreation(newFilter);
        return;
      }

      // search updated
      if (newFilter.rolleName !== oldFilter.rolleName) {
        // Debounce the search to avoid too many requests
        rollenSearchDebounceTimerId.value = setTimeout(async () => {
          await rolleStore.getRollenForPersonenkontextCreation(newFilter);
        }, 500);
      } else {
        // selection changed
        await rolleStore.getRollenForPersonenkontextCreation(newFilter);
      }
    },
  );

  watch(
    autoselectedSchule,
    (newAutoselectedSchule: Organisation | null) => {
      if (newAutoselectedSchule) {
        selectedOrganisation.value = newAutoselectedSchule.id;
        emits('update:selectedOrganisation', newAutoselectedSchule.id);
      }
    },
    { immediate: true },
  );

  watch(
    canCommit,
    (newValue: boolean) => {
      emits('update:canCommit', newValue);
    },
    { immediate: true },
  );

  // If the submission of the form goes wrong and the user needs to correct something, we need to ensure that the canCommit value is updated
  onMounted(() => {
    emits('update:canCommit', personenkontextStore.workflowStepResponse?.canCommit ?? false);
    emits('update:selectedKlassenOption', localKlassenOption.value!);
  });
</script>

<template>
  <div>
    <v-row v-if="showHeadline">
      <h3
        class="headline-3 mt-3"
        data-testid="organisation-assign-headline"
      >
        {{ headlineNumbers?.org ?? '1.' }} {{ $t('admin.organisation.assignOrganisation') }}
      </h3>
    </v-row>
    <!-- Organisation zuordnen -->
    <FormRow
      ref="form-row"
      :error-label="selectedOrganisationProps?.['error'] ?? false"
      :is-required="true"
      label-for-id="organisation-select"
      :label="$t('admin.organisation.organisation')"
    >
      <SchulenFilter
        ref="schulenFilter"
        parentId="personenkontext-create"
        :selectedSchulen="selectedOrganisation ? [selectedOrganisation] : []"
        :selectedRollen="selectedRollen ? selectedRollen : []"
        :multiple="false"
        :systemrechteForSearch="[requestedWithSystemrecht].filter((v): v is RollenSystemRecht => v !== undefined)"
        :selectedSchuleProps="selectedOrganisationProps"
        :useWorkflowEndpoints="true"
        :useLandesbediensteteWorkflow="useLandesbediensteteWorkflow"
        :operationContext="props.operationContext"
        :isRolleUnassignForm="rolleDialogMode === RolleDialogMode.UNASSIGN"
        :includeAll="true"
        :placeholderText="$t('admin.organisation.selectOrganisation')"
        :personId="props.personId"
        @update:selectedSchulen="updateSchuleSelection"
        @update:selectedSchulenObjects="
          (organisations: Array<Organisation>) =>
            emits('update:selectedOrganisation', organisations.length > 0 ? organisations[0]?.id : undefined)
        "
      ></SchulenFilter>
    </FormRow>

    <div v-if="selectedOrganisation">
      <v-row v-if="showHeadline">
        <h3
          class="headline-3"
          data-testid="rolle-assign-headline"
        >
          {{ headlineNumbers?.rolle ?? '2.' }} {{ $t('admin.rolle.assignRolle') }}
        </h3>
      </v-row>
      <!-- Rollenzuordnung -->
      <FormRow
        :error-label="
          allowMultipleRollen ? (selectedRollenProps?.['error'] ?? false) : (selectedRolleProps?.['error'] ?? false)
        "
        label-for-id="rolle-select"
        :is-required="true"
        :label="$t('admin.rolle.rolle')"
      >
        <v-autocomplete
          v-if="allowMultipleRollen"
          id="rollen-select"
          ref="rollen-select"
          v-bind="selectedRollenProps"
          v-model="selectedRollen"
          v-model:search="searchInputRollen"
          autocomplete="off"
          clearable
          data-testid="rollen-select"
          density="compact"
          :items="rollen"
          item-value="value"
          item-text="title"
          :multiple="allowMultipleRollen"
          :no-data-text="$t('noDataFound')"
          :placeholder="$t('admin.rolle.selectRolle')"
          required="true"
          variant="outlined"
          @clear="clearSelectedRollen"
          @update:focused="handleFocusChange"
        />
        <v-autocomplete
          v-else-if="!allowMultipleRollen"
          id="rolle-select"
          ref="rolle-select"
          v-bind="selectedRolleProps"
          v-model="selectedRolle"
          v-model:search="searchInputRolle"
          autocomplete="off"
          clearable
          data-testid="rolle-select"
          density="compact"
          :items="rollen"
          item-value="value"
          item-text="title"
          :no-data-text="$t('noDataFound')"
          :placeholder="$t('admin.rolle.selectRolle')"
          required="true"
          variant="outlined"
          @clear="clearSelectedRolle"
        />
      </FormRow>

      <!-- Klasse zuordnen for normal flow-->
      <FormRow
        v-if="
          allowMultipleRollen
            ? isLernRolle(selectedRollen) && selectedOrganisation
            : isLernRolle(selectedRolle) &&
              selectedOrganisation &&
              rolleDialogMode !== RolleDialogMode.MODIFY &&
              rolleDialogMode !== RolleDialogMode.UNASSIGN
        "
        :error-label="selectedKlasseProps?.['error'] || false"
        :is-required="true"
        label-for-id="klasse-select"
        :label="$t('admin.klasse.klasse')"
      >
        <KlassenFilter
          :multiple="false"
          :hideDetails="false"
          :selectedKlasseProps="selectedKlasseProps"
          :highlightSelection="false"
          :selectedKlassen="selectedKlasse"
          @update:selectedKlassen="updateKlasseSelection"
          :placeholderText="$t('admin.klasse.selectKlasse')"
          ref="klasse-select"
          :administriertVon
          parentId="personenkontext-create"
        />
      </FormRow>
      <FormRow
        v-if="isLernRolle(selectedRolle) && rolleDialogMode === RolleDialogMode.MODIFY"
        :errorLabel="selectedKlasseProps?.['error'] || false"
        :isRequired="true"
        :isAlignedWithRadio="true"
        labelForId="klasse-select"
        :label="$t('admin.klasse.klasse')"
      >
        <v-radio-group
          data-testid="klassen-option-radio-group"
          ref="klassen-option-radio-group"
          @update:modelValue="handleKlassenOption"
          v-model="localKlassenOption"
          v-bind="selectedKlassenOptionProps"
        >
          <v-radio
            data-testid="keep-klasse-radio-button"
            :label="$t('admin.klasse.keepKlasse')"
            :value="KlassenOption.KEEP_KLASSE"
            color="primary"
          ></v-radio>
          <v-radio
            data-testid="select-new-klasse-radio-button"
            :label="$t('admin.klasse.selectAnotherKlasse')"
            :value="KlassenOption.SELECT_NEW_KLASSE"
            :color="'primary'"
          ></v-radio>
        </v-radio-group>
      </FormRow>
      <!-- Klasse zuordnen for RolleModify -->
      <FormRow
        v-if="
          isLernRolle(selectedRolle) &&
          selectedOrganisation &&
          rolleDialogMode === RolleDialogMode.MODIFY &&
          localKlassenOption === KlassenOption.SELECT_NEW_KLASSE
        "
        :errorLabel="selectedKlasseForRadioProps?.['error'] || false"
        labelForId="klasse-select"
        class="mt-n4"
      >
        <KlassenFilter
          :multiple="false"
          :hideDetails="false"
          :selectedKlasseProps="selectedKlasseForRadioProps"
          :highlightSelection="false"
          :selectedKlassen="selectedKlasseForRadio"
          @update:selectedKlassen="updateKlasseSelectionForRadio"
          :placeholderText="$t('admin.klasse.selectKlasse')"
          ref="klasse-select"
          :administriertVon
          parentId="personenkontext-create-rolle-modify"
        />
      </FormRow>
      <!-- Befristung -->
      <v-row
        v-if="
          selectedOrganisation &&
          (allowMultipleRollen ? (selectedRollen?.length ?? 0) > 0 : selectedRolle) &&
          showHeadline
        "
      >
        <h3
          class="headline-3"
          data-testid="befristung-assign-headline"
        >
          {{ headlineNumbers?.befristung ?? '2.1' }} {{ $t('admin.befristung.assignBefristung') }}
        </h3>
      </v-row>
      <BefristungInput
        v-if="
          selectedOrganisation &&
          (allowMultipleRollen ? (selectedRollen?.length ?? 0) > 0 : selectedRolle) &&
          props.befristungInputProps
        "
        ref="befristung-input-wrapper"
        :befristung-props="befristungInputProps?.befristungProps"
        :befristung-option-props="befristungInputProps?.befristungOptionProps"
        :is-unbefristet-disabled="befristungInputProps?.isUnbefristetDisabled"
        :is-befristung-required="befristungInputProps?.isBefristungRequired"
        :next-schuljahresende="befristungInputProps?.nextSchuljahresende"
        :befristung="befristungInputProps?.befristung"
        :befristung-option="befristungInputProps?.befristungOption"
        @update:befristung="handleBefristungChange"
        @update:calculated-befristung-option="handleCalculatedBefristungOptionChange"
      />
    </div>
  </div>
</template>

<style></style>
