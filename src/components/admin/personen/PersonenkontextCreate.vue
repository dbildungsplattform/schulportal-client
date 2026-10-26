<script setup lang="ts">
  import BefristungInput, { type BefristungProps } from '@/components/admin/personen/BefristungInput.vue';
  import KlassenFilter from '@/components/filter/KlassenFilter.vue';
  import SchulenFilter from '@/components/filter/SchulenFilter.vue';
  import FormRow from '@/components/form/FormRow.vue';
  import { useAutoselectedSchule } from '@/composables/useAutoselectedSchule';
  import { useDebouncedSearch } from '@/composables/useDebouncedSearch';
  import { useOrganisationSelection } from '@/composables/useOrganisationSelection';
  import { OrganisationsTyp, type Organisation } from '@/stores/OrganisationStore';
  import {
    CreationType,
    KlassenOption,
    LandesbediensteterWorkflowFilter,
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
    TranslatedRolleWithAttrs,
    useRolleStore,
  } from '@/stores/RolleStore';
  import type { Zuordnung } from '@/stores/types/Zuordnung';
  import { type SelectedSchulen, type TranslatedObject } from '@/types.d';
  import { dedup } from '@/utils/arrays';
  import { blurActiveElement } from '@/utils/focus';
  import type { BaseFieldProps } from 'vee-validate';
  import { computed, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue';
  import { useI18n } from 'vue-i18n';

  useI18n({ useScope: 'global' });

  const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
  const personStore: PersonStore = usePersonStore();
  const rolleStore: RolleStore = useRolleStore();

  const canCommit: Ref<boolean> = ref(false);

  const debouncedSearchInputRolle: Ref<string> = ref('');
  const debouncedSearchInputRollen: Ref<string> = ref('');
  const searchInputRolle: Ref<string> = useDebouncedSearch((value: string): void => {
    debouncedSearchInputRolle.value = value;
  });
  const searchInputRollen: Ref<string> = useDebouncedSearch((value: string): void => {
    debouncedSearchInputRollen.value = value;
  });

  const localKlassenOption: Ref<string | undefined> = ref(KlassenOption.KEEP_KLASSE);

  type SelectedRollen = TranslatedRolleWithAttrs[] | TranslatedRolleWithAttrs | undefined;

  type Props = {
    rollen: TranslatedRolleWithAttrs[];
    selectedOrganisation: string | undefined;
    initialOrganisation?: Organisation | null;
    createType?: CreationType;
    showHeadline: boolean;
    personId?: string;
    operationContext: OperationContext;
    selectedKlassenOption?: string | null;
    selectedKlasse?: Organisation;
    selectedKlasseForRadio?: Organisation;
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
    rollenartForPerson?: RollenArt;
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
    (event: 'update:organisationObject', value: Organisation | undefined): void;
    (event: 'update:selectedKlasse', value: Organisation | undefined): void;
    (event: 'update:selectedKlasseForRadio', value: Organisation | undefined): void;
    (event: 'update:selectedKlassenOption', value: string | null): void;
    (event: 'update:canCommit', value: boolean): void;
    (event: 'fieldReset', field: 'selectedOrganisation' | 'selectedRolle' | 'selectedKlasse' | 'selectedRollen'): void;
  };
  const emits: Emits = defineEmits<Emits>();

  const selectedOrganisation: Ref<string | undefined> = ref(props.selectedOrganisation);
  const selectedOrganisationObject: ReturnType<typeof useOrganisationSelection> = useOrganisationSelection(
    selectedOrganisation,
    () => props.initialOrganisation ?? autoselectedSchule.value,
  );
  const selectedRolle: Ref<TranslatedRolleWithAttrs | undefined> =
    defineModel<TranslatedRolleWithAttrs>('selectedRolle');
  const selectedRollen: Ref<TranslatedRolleWithAttrs[] | undefined> =
    defineModel<TranslatedRolleWithAttrs[]>('selectedRollen');
  const selectedKlasse: Ref<Organisation | undefined> = ref(props.selectedKlasse);
  const selectedKlasseForRadio: Ref<Organisation | undefined> = ref(props.selectedKlasseForRadio);
  // we need to cast the selectedSchule into an array
  // doing it this way prevents an issue where the reactive system constantly re-runs which causes requests to be issued in a loop
  const administriertVon: Ref<string[] | undefined> = ref([]);

  const rollenItems: ComputedRef<TranslatedRolleWithAttrs[]> = computed(() => {
    const activeSelection: TranslatedRolleWithAttrs[] = [];
    if (props.allowMultipleRollen) {
      if (selectedRollen.value) {
        activeSelection.push(...selectedRollen.value);
      }
    } else if (selectedRolle.value) {
      activeSelection.push(selectedRolle.value);
    }
    return dedup([...props.rollen, ...activeSelection], (rolle: TranslatedRolleWithAttrs) => rolle.value);
  });
  const selectedRollenIds: ComputedRef<string[]> = computed(() =>
    (selectedRollen.value ?? []).map((rolle: TranslatedRolleWithAttrs) => rolle.value),
  );

  const selectedRollenart: ComputedRef<RollenArt | undefined> = computed(() => {
    if (props.allowMultipleRollen) {
      return selectedRollen.value?.[0]?.rollenart;
    } else {
      return selectedRolle.value?.rollenart;
    }
  });

  const rollenFilter: ComputedRef<RollenForPersonenkontextCreationQuery | undefined> = computed(() => {
    if (!selectedOrganisation.value) {
      return;
    }
    const filter: RollenForPersonenkontextCreationQuery = {
      organisationId: selectedOrganisation.value,
      limit: 25,
      rollenartForPerson: props.rollenartForPerson ?? selectedRollenart.value,
    };

    if (props.createType === CreationType.Limited) {
      filter.systemrecht = RollenSystemRecht.EingeschraenktNeueBenutzerErstellen;
    }

    if (props.allowMultipleRollen) {
      const matchesSelection: boolean =
        selectedRollen.value?.some((rolle: TranslatedObject) => rolle.title === debouncedSearchInputRollen.value) ??
        false;
      if (debouncedSearchInputRollen.value && !matchesSelection) {
        filter.rolleName = debouncedSearchInputRollen.value;
      }
    } else {
      const matchesSelection: boolean = selectedRolle.value?.title === debouncedSearchInputRolle.value;
      if (debouncedSearchInputRolle.value && !matchesSelection) {
        filter.rolleName = debouncedSearchInputRolle.value;
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

  function hasSelectedLernRolle(selection: SelectedRollen): boolean {
    if (!selection) {
      return false;
    }

    if (Array.isArray(selection)) {
      return selection.some((rolle: TranslatedRolleWithAttrs) => rolle.rollenart === RollenArt.Lern);
    } else {
      return selection.rollenart === RollenArt.Lern;
    }
  }

  async function handleWorkflowStep(filter: WorkflowFilter | LandesbediensteterWorkflowFilter): Promise<void> {
    const useLandesbediensteteWorkflows: boolean = props.createType === CreationType.AddPersonToOwnSchule;

    if (useLandesbediensteteWorkflows) {
      await personenkontextStore.processWorkflowStepLandesbedienstete(filter);
    } else {
      await personenkontextStore.processWorkflowStep({
        operationContext: props.operationContext,
        ...filter,
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

  function updateKlasseSelection(selection: Organisation | undefined): void {
    selectedKlasse.value = selection;
    emits('update:selectedKlasse', selection);
  }

  function updateKlasseSelectionForRadio(selection: Organisation | undefined): void {
    selectedKlasseForRadio.value = selection;
    emits('update:selectedKlasseForRadio', selection);
  }

  // Clear the selected Rolle once the input field is cleared (This is the only way to fetch all Rollen again)
  // This is also important since we only want to fetch all orgas once the selected Rolle is null, otherwise an extra request is made with an empty string
  function clearSelectedRolle(): void {
    emits('fieldReset', 'selectedRolle');
  }

  function clearSelectedRollen(): void {
    selectedRollen.value = [];
    emits('fieldReset', 'selectedRollen');
  }

  const handleBefristungChange = (value: string | undefined): void => {
    emits('update:befristung', value);
  };

  const handleCalculatedBefristungOptionChange = (value: string | undefined): void => {
    emits('update:calculatedBefristungOption', value);
  };

  function updateSchuleSelection(selection: SelectedSchulen<false>): void {
    selectedOrganisationObject.value = selection;
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
        const uniqueKlassenZuordnungen: Zuordnung[] = dedup(klassenZuordnungen ?? [], (z: Zuordnung) => z.sskId);

        if (uniqueKlassenZuordnungen.length === 1) {
          const klasse: Organisation = uniqueKlassenZuordnungen[0]!.getOrganisation();
          selectedKlasse.value = klasse;
          emits('update:selectedKlasse', klasse);
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
    async (newValue: SelectedRollen, oldValue: SelectedRollen) => {
      const filter: WorkflowFilter = {
        personId: props.personId,
        organisationId: selectedOrganisation.value,
        limit: 25,
      };

      if (props.allowMultipleRollen) {
        const newRollen: TranslatedRolleWithAttrs[] | undefined = Array.isArray(newValue) ? newValue : undefined;

        if (newRollen && newRollen.length > 0) {
          filter.rollenIds = newRollen.map((rolle: TranslatedRolleWithAttrs) => rolle.value);
        } else {
          selectedKlasse.value = undefined;
          emits('fieldReset', 'selectedKlasse');
          emits('fieldReset', 'selectedRollen');
          canCommit.value = false;
        }
        await handleWorkflowStep(filter);
      } else {
        const newRolle: TranslatedRolleWithAttrs | undefined = Array.isArray(newValue) ? undefined : newValue;

        if (newRolle && newRolle !== oldValue) {
          filter.rollenIds = [newRolle.value];
          await handleWorkflowStep(filter);
        }

        if (!newRolle) {
          canCommit.value = false;
          selectedKlasse.value = undefined;
          emits('fieldReset', 'selectedKlasse');
        }
        blurActiveElement();
      }
    },
    { deep: true },
  );

  watch(
    rollenFilter,
    async (newFilter: RollenForPersonenkontextCreationQuery | undefined) => {
      if (!newFilter) {
        return;
      }

      await rolleStore.getRollenForPersonenkontextCreation(newFilter);
    },
    {
      immediate: true,
    },
  );

  watch(
    selectedOrganisationObject,
    (organisation: Organisation | null | undefined): void => {
      emits('update:organisationObject', organisation ?? undefined);
    },
    { immediate: true },
  );

  watch(
    () => props.selectedOrganisation,
    (organisationId: string | undefined): void => {
      selectedOrganisation.value = organisationId;
    },
  );

  watch(
    autoselectedSchule,
    (newAutoselectedSchule: Organisation | null) => {
      if (newAutoselectedSchule) {
        selectedOrganisationObject.value = newAutoselectedSchule;
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
        :selectedSchulen="selectedOrganisationObject ?? undefined"
        :selectedRollen="selectedRollenIds"
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
          :items="rollenItems"
          return-object
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
          :items="rollenItems"
          return-object
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
            ? hasSelectedLernRolle(selectedRollen) && selectedOrganisation
            : hasSelectedLernRolle(selectedRolle) &&
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
        v-if="hasSelectedLernRolle(selectedRolle) && rolleDialogMode === RolleDialogMode.MODIFY"
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
          hasSelectedLernRolle(selectedRolle) &&
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
