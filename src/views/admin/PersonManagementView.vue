<script setup lang="ts">
  import ResultTable, { type Headers, type TableRow } from '@/components/admin/ResultTable.vue';
  import SearchField from '@/components/admin/SearchField.vue';
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';
  import PersonBulkChangeKlasse from '@/components/admin/personen/PersonBulkChangeKlasse.vue';
  import PersonBulkDelete from '@/components/admin/personen/PersonBulkDelete.vue';
  import PersonBulkPasswordReset from '@/components/admin/personen/PersonBulkPasswordReset.vue';
  import RolleModify from '@/components/admin/rollen/RolleModify.vue';
  import RolleUnassign from '@/components/admin/rollen/RolleUnassign.vue';
  import OrganisationUnassign from '@/components/admin/schulen/OrganisationUnassign.vue';
  import InfoDialog from '@/components/alert/InfoDialog.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import KlassenFilter from '@/components/filter/KlassenFilter.vue';
  import SchulenFilter from '@/components/filter/SchulenFilter.vue';
  import { useAutoselectedSchule } from '@/composables/useAutoselectedSchule';
  import { useOrganisationen } from '@/composables/useOrganisationen';
  import { type TranslatedRolleWithAttrs, useRollen } from '@/composables/useRollen';
  import { type AuthStore, useAuthStore } from '@/stores/AuthStore';
  import { type Organisation, type OrganisationStore, useOrganisationStore } from '@/stores/OrganisationStore';
  import { type PersonStore, SortField, usePersonStore } from '@/stores/PersonStore';
  import { type PersonenkontextStore, usePersonenkontextStore } from '@/stores/PersonenkontextStore';
  import {
    type RolleResponse,
    type RolleStore,
    RollenArt,
    RollenSystemRecht,
    useRolleStore,
  } from '@/stores/RolleStore';
  import { type SearchFilterStore, useSearchFilterStore } from '@/stores/SearchFilterStore';
  import type { PersonWithZuordnungen } from '@/stores/types/PersonWithZuordnungen';
  import { OperationType } from '@/stores/types/bulkOperationTypes';
  import { type TranslatedObject } from '@/types.d';
  import { blurActiveElement } from '@/utils/focus';
  import { SortOrder } from '@/utils/sorting';
  import { type ComponentPublicInstance, type ComputedRef, type Ref, computed, onMounted, ref, watch } from 'vue';
  import { type Composer, useI18n } from 'vue-i18n';
  import { type Router, useRouter } from 'vue-router';

  const searchFieldComponent: Ref<{ searchFilter?: string } | null> = ref(null);

  const router: Router = useRouter();
  const organisationStore: OrganisationStore = useOrganisationStore();
  const personStore: PersonStore = usePersonStore();
  const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
  const rolleStore: RolleStore = useRolleStore();
  const searchFilterStore: SearchFilterStore = useSearchFilterStore();
  const { t }: Composer = useI18n({ useScope: 'global' });

  let timerId: ReturnType<typeof setTimeout>;
  const {
    hasAutoselectedSchule,
  }: {
    hasAutoselectedSchule: ComputedRef<boolean>;
  } = useAutoselectedSchule([RollenSystemRecht.PersonenVerwalten]);

  const selectedPersonIds: Ref<string[]> = ref<string[]>([]);
  const selectedPersonen: ComputedRef<Map<string, PersonWithZuordnungen>> = computed(() => {
    const persons: Map<string, PersonWithZuordnungen> = new Map();
    for (const personId of selectedPersonIds.value) {
      const person: PersonWithZuordnungen | undefined = personStore.allUebersichten.get(personId);
      if (!person) {
        continue;
      }

      persons.set(personId, person);
    }
    return persons;
  });

  // Add the correct type for ResultTable's exposed methods if available
  type ResultTableInstance = ComponentPublicInstance<{ resetSelection: () => void }>;
  const resultTable: Ref<ResultTableInstance | null> = ref(null);

  type ReadonlyHeaders = Headers;
  export type PersonRow = {
    id: string;
    familienname: string;
    vorname: string;
    username: string;
    personalnummer: string;
    rollen: string;
    administrationsebenen: string;
    klassen: string;
  };
  const headers: ReadonlyHeaders = [
    { title: t('person.lastName'), key: 'familienname', align: 'start' },
    { title: t('person.firstName'), key: 'vorname', align: 'start' },
    { title: t('person.userName'), key: 'username', align: 'start' },
    { title: t('person.kopersNr'), key: 'personalnummer', align: 'start' },
    { title: t('person.rolle'), key: 'rollen', align: 'start', sortable: false },
    { title: t('person.zuordnungen'), key: 'administrationsebenen', align: 'start', sortable: false },
    { title: t('person.klasse'), key: 'klassen', align: 'start', sortable: false },
  ];
  const personRows: ComputedRef<Array<PersonRow>> = computed(() => {
    const rows: Array<PersonRow> = [];
    for (const personWithZuordnungen of personStore.allUebersichten.values()) {
      const personRow: PersonRow = {
        id: personWithZuordnungen.id,
        familienname: personWithZuordnungen.name.familienname,
        vorname: personWithZuordnungen.name.vorname,
        username: personWithZuordnungen.username,
        personalnummer: personWithZuordnungen.getPersonalnummerAsString(t('missing')),
        rollen: personWithZuordnungen.rollenAsString,
        administrationsebenen: personWithZuordnungen.administrationsebenenAsString,
        klassen: personWithZuordnungen.klassenZuordnungenAsString,
      };
      rows.push(personRow);
    }
    return rows;
  });

  const searchInputRollen: Ref<string> = ref('');
  const searchInputOrganisationen: Ref<string> = ref('');

  const selectedOrganisationen: Ref<Array<Organisation>> = ref([]);
  const selectedKlassen: Ref<Array<string> | undefined> = ref(searchFilterStore.selectedKlassen ?? []);
  const selectedRollen: Ref<Array<string>> = ref([]);
  const selectedOrganisationIds: Ref<Array<string>> = ref([]);
  const selectedStatus: Ref<string | null> = ref(null);
  const searchFilter: Ref<string> = ref('');

  const selectedRollenObjects: Ref<RolleResponse[]> = ref([]);
  const sortField: Ref<string | null> = ref(SortField.Familienname);
  const sortOrder: Ref<SortOrder | null> = ref(SortOrder.Asc);

  const rolleModifiyDialogVisible: Ref<boolean> = ref(false);
  const benutzerDeleteDialogVisible: Ref<boolean> = ref(false);
  const passwordResetDialogVisible: Ref<boolean> = ref(false);
  const organisationUnassignDialogVisible: Ref<boolean> = ref(false);
  const changeKlasseDialogVisible: Ref<boolean> = ref(false);
  const rolleUnassignDialogVisible: Ref<boolean> = ref(false);

  const onlyOneOrganisationAlertDialogVisible: Ref<boolean> = ref(false);
  const invalidSelectionAlertMessages: Ref<Array<string>> = ref([]);
  const onlyOneRolleAlertDialogVisible: Ref<boolean> = ref(false);

  const selectedOption: Ref<string | null> = ref(null);

  const authStore: AuthStore = useAuthStore();

  // Computed property for generating options dynamically for v-selects
  const actions: ComputedRef<TranslatedObject[]> = computed(() => {
    const actionTypeTitles: Map<OperationType, string> = new Map();

    if (authStore.hasPersonenverwaltungPermission) {
      actionTypeTitles.set(OperationType.RESET_PASSWORD, t('admin.person.resetPassword'));
      actionTypeTitles.set(OperationType.CHANGE_KLASSE, t('admin.person.bulkChangeKlasse.transfer'));
      actionTypeTitles.set(OperationType.ORG_UNASSIGN, t('admin.person.bulkUnassignOrganisation.cancelZuordnung'));
      actionTypeTitles.set(OperationType.ROLLE_UNASSIGN, t('admin.rolle.bulkRollenzuordnung.unassignRolleZuordnung'));
      actionTypeTitles.set(OperationType.MODIFY_ROLLE, t('admin.rolle.assignRolle'));
    }

    if (authStore.hasPersonenLoeschenPermission) {
      actionTypeTitles.set(OperationType.DELETE_PERSON, t('admin.person.deletePerson'));
    }

    return [...actionTypeTitles.entries()].map(([key, value]: [string, string]) => ({
      value: key,
      title: value,
    }));
  });

  const filterOrSearchActive: ComputedRef<boolean> = computed(
    () =>
      (!hasAutoselectedSchule.value && selectedOrganisationIds.value.length > 0) ||
      selectedRollen.value.length > 0 ||
      !!searchFilterStore.selectedOrganisationen?.length ||
      !!searchFilterStore.selectedRollen?.length ||
      !!searchFilterStore.searchStringForPersonen ||
      (selectedKlassen.value && selectedKlassen.value.length > 0) ||
      !!selectedStatus.value,
  );

  const selectedOrganisationKennung: ComputedRef<string> = computed(() => {
    if (selectedOrganisationIds.value.length !== 1) {
      return '';
    }
    const organisation: Organisation | undefined = selectedOrganisationen.value[0];
    return organisation?.kennung ?? '';
  });

  const rollen: ComputedRef<TranslatedObject[] | undefined> = computed(() => {
    const filteredRollen: RolleResponse[] = personenkontextStore.filteredRollen?.moeglicheRollen || [];
    const uniqueRollenMap: Map<string, RolleResponse> = new Map();

    [...filteredRollen, ...selectedRollenObjects.value].forEach((rolle: RolleResponse) => {
      uniqueRollenMap.set(rolle.id, rolle);
    });

    return [...uniqueRollenMap.values()]
      .map((rolle: RolleResponse) => ({
        value: rolle.id,
        title: rolle.name,
      }))
      .sort((a: TranslatedObject, b: TranslatedObject) => a.title.localeCompare(b.title));
  });

  const organisationenForForm: ComputedRef<TranslatedObject[] | undefined> = useOrganisationen();

  const rollenForForm: ComputedRef<TranslatedRolleWithAttrs[] | undefined> = useRollen();

  // Only Rollen from type LEHR and LERN
  const lehrAndLernRollen: ComputedRef<TranslatedRolleWithAttrs[] | undefined> = computed(() => {
    return rollenForForm.value?.filter(
      (rolle: TranslatedRolleWithAttrs) => rolle.rollenart === RollenArt.Lehr || rolle.rollenart === RollenArt.Lern,
    );
  });

  const statuses: Array<string> = ['Aktiv', 'Inaktiv'];

  async function applySearchAndFilters(): Promise<void> {
    await personStore.getAllPersons({
      offset: (searchFilterStore.personenPage - 1) * searchFilterStore.personenPerPage,
      limit: searchFilterStore.personenPerPage,
      organisationIDs: searchFilterStore.selectedKlassen?.length
        ? searchFilterStore.selectedKlassen
        : searchFilterStore.selectedOrganisationen || [],
      rolleIDs: searchFilterStore.selectedRollen || [],
      searchFilter: searchFilterStore.searchStringForPersonen || '',
      sortField: searchFilterStore.personenSortField as SortField,
      sortOrder: searchFilterStore.personenSortOrder as SortOrder,
    });
  }

  async function getPaginatedPersonen(page: number): Promise<void> {
    searchFilterStore.personenPage = page;
    await applySearchAndFilters();
  }

  async function getPaginatedPersonenWithLimit(limit: number): Promise<void> {
    /* reset page to 1 if entries are equal to or less than selected limit */
    if (personStore.totalPersons <= limit) {
      searchFilterStore.personenPage = 1;
    }

    searchFilterStore.personenPerPage = limit;
    await personStore.getAllPersons({
      offset: (searchFilterStore.personenPage - 1) * searchFilterStore.personenPerPage,
      limit: searchFilterStore.personenPerPage,
      organisationIDs: searchFilterStore.selectedOrganisationen || selectedOrganisationIds.value,
      rolleIDs: searchFilterStore.selectedRollen || selectedRollen.value,
      searchFilter: searchFilterStore.searchStringForPersonen || searchFilter.value,
    });

    await applySearchAndFilters();
  }

  function updateKlassenSelection(newValue: Array<string>): void {
    searchFilterStore.setKlasseFilterForPersonen(newValue);
    applySearchAndFilters();
    selectedKlassen.value = newValue;
  }

  function setRolleFilter(newValue: Array<string>): void {
    searchFilterStore.setRolleFilterForPersonen(newValue);
    // Update selectedRollenObjects based on the new selection
    selectedRollenObjects.value = newValue
      .map((rolleId: string) => {
        const existingRolle: RolleResponse | undefined = personenkontextStore.filteredRollen?.moeglicheRollen.find(
          (r: RolleResponse) => r.id === rolleId,
        );
        return existingRolle;
      })
      .filter((rolle: RolleResponse | undefined): rolle is RolleResponse => rolle !== undefined);

    searchFilterStore.setRolleFilterWithObjectsForPersonen(newValue, selectedRollenObjects.value);
    applySearchAndFilters();
  }

  function setSelectedOrganisationen(newValue: Array<Organisation> | Organisation): void {
    searchFilterStore.setOrganisationFilterForPersonen(
      selectedOrganisationIds.value,
      searchFilterStore.selectedOrgaObjects && searchFilterStore.selectedOrgaObjects.length > 0
        ? searchFilterStore.selectedOrgaObjects
        : Array.isArray(newValue)
          ? newValue
          : [newValue],
    );
    selectedOrganisationen.value = searchFilterStore.selectedOrgaObjects ?? [];
  }

  async function setOrganisationFilter(newValue: Array<string> | undefined): Promise<void> {
    selectedOrganisationIds.value = newValue ?? [];
    searchFilterStore.setOrganisationFilterForPersonen(newValue ?? []);
    searchFilterStore.setKlasseFilterForPersonen([]);
    selectedKlassen.value = [];
    await Promise.all([
      applySearchAndFilters(),
      personenkontextStore.getPersonenkontextRolleWithFilter('', 25, selectedOrganisationIds.value),
    ]);
  }

  function navigateToPersonDetails(_$event: PointerEvent, { item }: { item: PersonRow }): void {
    router.push({ name: 'person-details', params: { id: item.id } });
  }

  async function resetSearchAndFilter(): Promise<void> {
    searchFilter.value = '';
    if (searchFieldComponent.value) {
      searchFieldComponent.value.searchFilter = '';
    }
    searchFilterStore.setKlasseFilterForPersonen([]);
    searchFilterStore.setRolleFilterForPersonen([]);
    searchFilterStore.setRolleFilterWithObjectsForPersonen([], []);
    searchFilterStore.setSearchFilterForPersonen('');
    /* do not reset orgas if orga was autoselected */
    if (!hasAutoselectedSchule.value) {
      selectedOrganisationIds.value = [];
      searchFilterStore.setOrganisationFilterForPersonen([]);
    }
    searchInputOrganisationen.value = '';
    searchInputRollen.value = '';
    selectedRollen.value = [];
    selectedKlassen.value = [];
    selectedStatus.value = null;
    searchFilterStore.personenPage = 1;
    searchFilterStore.personenPerPage = 30;
    searchFilterStore.currentSort = null;
    selectedPersonIds.value = [];
    await Promise.all([
      personStore.getAllPersons({
        offset: (searchFilterStore.personenPage - 1) * searchFilterStore.personenPerPage,
        limit: searchFilterStore.personenPerPage,
        searchFilter: '',
        sortField: SortField.Familienname,
        sortOrder: SortOrder.Asc,
      }),
      personenkontextStore.getPersonenkontextRolleWithFilter('', 25, selectedOrganisationIds.value),
    ]);
  }

  async function handleSearchFilter(filter: string): Promise<void> {
    searchFilterStore.setSearchFilterForPersonen(filter);
    searchFilter.value = filter;
    await applySearchAndFilters();
  }

  function updateRollenSearch(searchValue: string): void {
    clearTimeout(timerId);

    timerId = setTimeout(async () => {
      await personenkontextStore.getPersonenkontextRolleWithFilter(searchValue, 25, selectedOrganisationIds.value);

      // If there are selected rollen not in the search results, add them to filteredRollen
      const moeglicheRollen: RolleResponse[] = personenkontextStore.filteredRollen?.moeglicheRollen || [];
      const missingRollen: RolleResponse[] = searchFilterStore.selectedRollenObjects.filter(
        (rolle: RolleResponse) => !moeglicheRollen.some((r: RolleResponse) => r.id === rolle.id),
      );

      if (missingRollen.length > 0 && personenkontextStore.filteredRollen) {
        personenkontextStore.filteredRollen = {
          moeglicheRollen: [...moeglicheRollen, ...missingRollen],
          total: personenkontextStore.filteredRollen.total + missingRollen.length,
        };
        // Update the total count of found Rollen.
        personenkontextStore.totalFilteredRollen = personenkontextStore.totalFilteredRollen + missingRollen.length;
      }
    }, 500);
  }

  const handleFocusChange = (focused: boolean): void => {
    if (!focused && searchInputRollen.value) {
      searchInputRollen.value = '';
      updateRollenSearch(searchInputRollen.value);
    }
  };

  // Define a mapping between complex table keys and expected backend keys
  const keyMapping: Record<string, SortField> = {
    'person.name.familienname': SortField.Familienname,
    'person.name.vorname': SortField.Vorname,
    'person.username': SortField.Username,
    'person.personalnummer': SortField.Personalnummer,
  };

  // Helper method that maps the key in the ResultTable to the name of the column in the backend
  function mapKeyToBackend(key: string): string {
    return keyMapping[key] || key;
  }

  // Triggers sorting for the selected column
  function handleTableSorting(update: { sortField: string | undefined; sortOrder: 'asc' | 'desc' }): void {
    const mappedField: string | null = update.sortField ? mapKeyToBackend(update.sortField) : sortField.value;
    const mappedOrder: SortOrder = update.sortOrder as SortOrder;

    // Skip if nothing actually changed (e.g. table emitting its default sort on mount)
    if (mappedField === searchFilterStore.personenSortField && mappedOrder === searchFilterStore.personenSortOrder) {
      return;
    }

    if (update.sortField) {
      sortField.value = mappedField;
      searchFilterStore.currentSort = {
        key: update.sortField,
        order: update.sortOrder,
      };
    }

    sortOrder.value = mappedOrder;
    searchFilterStore.personenSortField = sortField.value;
    searchFilterStore.personenSortOrder = sortOrder.value;

    getPaginatedPersonen(searchFilterStore.personenPage);
  }

  const invalidSelectionAlertHeader: ComputedRef<string> = computed(() => {
    return actions.value.find((action: TranslatedObject) => action.value === selectedOption.value)?.title || '';
  });

  const onlyLernRollenSelected: ComputedRef<boolean> = computed(() => {
    for (const personId of selectedPersonIds.value) {
      const person: PersonWithZuordnungen | undefined = personStore.allUebersichten.get(personId);
      if (!person) {
        continue;
      }
      const { rollenArten }: PersonWithZuordnungen = person;
      if (!(rollenArten.size === 1 && rollenArten.has(RollenArt.Lern))) {
        return false;
      }
    }
    return true;
  });

  const singleSchuleSelected: ComputedRef<boolean> = computed(() => {
    const val: string[] | string = selectedOrganisationIds.value;
    if (Array.isArray(val)) {
      return val.length === 1;
    }
    return true;
  });

  const selectedRolle: ComputedRef<RolleResponse | undefined> = computed(() => {
    return selectedRollenObjects.value.find((rolle: RolleResponse) => rolle.id === selectedRollen.value[0]);
  });

  const checkSingleOrgAndOnlyLernDisplayDialog = (dialog: Ref<boolean>): void => {
    const messages: Array<string> = [];
    if (!singleSchuleSelected.value) {
      messages.push(t('admin.person.onlyOneSchuleAlert'));
    }
    if (!onlyLernRollenSelected.value) {
      messages.push(t('admin.person.onlyLernRollenAlert'));
    }
    if (messages.length > 0) {
      onlyOneOrganisationAlertDialogVisible.value = true;
      invalidSelectionAlertMessages.value = messages;
      return;
    }
    dialog.value = true;
  };

  const validateSingleSchuleSelection = (): boolean => {
    if (!singleSchuleSelected.value) {
      onlyOneOrganisationAlertDialogVisible.value = true;
      invalidSelectionAlertMessages.value = [t('admin.person.onlyOneSchuleAlert')];
      return false;
    }
    return true;
  };

  const validateSingleRolleSelection = (): boolean => {
    if (selectedRollen.value.length > 1) {
      onlyOneRolleAlertDialogVisible.value = true;
      return false;
    }
    return true;
  };

  // Handle the selected action
  const handleOption = (newValue: string | null): void => {
    if (!newValue) {
      return;
    }

    switch (newValue as OperationType) {
      case OperationType.MODIFY_ROLLE:
        rolleModifiyDialogVisible.value = true;
        break;

      case OperationType.DELETE_PERSON:
        benutzerDeleteDialogVisible.value = true;
        break;

      case OperationType.RESET_PASSWORD:
        if (validateSingleSchuleSelection()) {
          passwordResetDialogVisible.value = true;
        }
        break;
      case OperationType.ORG_UNASSIGN:
        if (validateSingleSchuleSelection()) {
          organisationUnassignDialogVisible.value = true;
        }
        break;

      case OperationType.ROLLE_UNASSIGN:
        if (!validateSingleSchuleSelection()) {
          return;
        }
        if (!validateSingleRolleSelection()) {
          return;
        }
        rolleUnassignDialogVisible.value = true;
        break;
      case OperationType.CHANGE_KLASSE:
        checkSingleOrgAndOnlyLernDisplayDialog(changeKlasseDialogVisible);
        break;
    }
  };

  // Handles the event when closing the dialog
  const handleRolleModifyDialog = (isDialogVisible: boolean): void => {
    rolleModifiyDialogVisible.value = isDialogVisible;
    selectedOption.value = null;
  };

  const handleBulkDeleteDialog = async (finished: boolean): Promise<void> => {
    benutzerDeleteDialogVisible.value = false;
    selectedOption.value = null;
    if (finished) {
      selectedPersonIds.value = [];
      await getPaginatedPersonen(searchFilterStore.personenPage);
      resultTable.value?.resetSelection();
    }
  };

  const handleBulkPasswordResetDialog = (_finished: boolean): void => {
    passwordResetDialogVisible.value = false;
    selectedOption.value = null;
  };

  const handleUnassignOrgDialog = async (finished: boolean): Promise<void> => {
    organisationUnassignDialogVisible.value = false;
    selectedOption.value = null;
    if (finished) {
      selectedPersonIds.value = [];
      await getPaginatedPersonen(searchFilterStore.personenPage);
      resultTable.value?.resetSelection();
    }
  };

  const handleUnassignRolleDialog = async (finished: boolean): Promise<void> => {
    rolleUnassignDialogVisible.value = false;
    selectedOption.value = null;
    if (finished) {
      selectedPersonIds.value = [];
      await getPaginatedPersonen(searchFilterStore.personenPage);
      resultTable.value?.resetSelection();
    }
  };

  const handleBulkKlasseChangeDialog = async (finished: boolean): Promise<void> => {
    changeKlasseDialogVisible.value = false;
    selectedOption.value = null;
    if (finished) {
      selectedPersonIds.value = [];
      await getPaginatedPersonen(searchFilterStore.personenPage);
      resultTable.value?.resetSelection();
    }
  };

  function handleSelectedRows(selectedItems: string[]): void {
    // Directly assign the selected item values to selectedPersonIds since itemValuePath resolves to the person ID.
    selectedPersonIds.value = selectedItems;
  }

  // This method filters the selectedPersonIds to avoid items being selected when they are not included in the current table "items"
  function updateSelectedRowsAfterFilter(): void {
    selectedPersonIds.value = selectedPersonIds.value.filter((id: string) => personStore.allUebersichten.has(id));
  }
  // Whenever the array of items of the table (personStore.personenWithUebersicht) changes (Filters, search function, page update etc...) update the selection.
  watch(
    () => personStore.allUebersichten,
    () => {
      updateSelectedRowsAfterFilter();
    },
  );

  // If no filter or search is active then de-select everything.
  watch(filterOrSearchActive, (newValue: boolean) => {
    if (!newValue) {
      selectedPersonIds.value = [];
    }
  });

  watch(selectedStatus, () => {
    blurActiveElement();
  });

  // Used for to show the number of klassen found in the filter
  const totalKlassen: ComputedRef<number> = computed(
    () => organisationStore.klassenFilters.get('personen-management')?.total ?? 0,
  );

  onMounted(async () => {
    if (filterOrSearchActive.value) {
      selectedOrganisationIds.value = searchFilterStore.selectedOrganisationen || [];
      selectedOrganisationen.value = searchFilterStore.selectedOrgaObjects || [];
      selectedRollen.value = searchFilterStore.selectedRollen || [];
      selectedKlassen.value = searchFilterStore.selectedKlassen || [];
      selectedRollenObjects.value = searchFilterStore.selectedRollenObjects;
    }

    await getPaginatedPersonen(searchFilterStore.personenPage);
    await personenkontextStore.getPersonenkontextRolleWithFilter('', 25, selectedOrganisationIds.value);
  });
</script>

<template>
  <div class="admin">
    <h1
      class="text-center headline"
      data-testid="admin-headline"
    >
      {{ $t('admin.headline') }}
    </h1>
    <LayoutCard
      :header="$t('admin.person.management')"
      headlineTestId="person-management-headline"
    >
      <v-row class="ma-3 align-start justify-end">
        <v-col
          cols="12"
          md="2"
          class="py-md-0 text-md-right align-self-center"
        >
          <v-btn
            class="px-0 reset-filter"
            data-testid="reset-filter-button"
            :disabled="!filterOrSearchActive"
            size="x-small"
            variant="text"
            width="auto"
            @click="resetSearchAndFilter()"
          >
            {{ $t('resetFilter') }}
          </v-btn>
        </v-col>
        <v-col
          cols="12"
          md="3"
          class="py-md-0"
        >
          <SchulenFilter
            multiple
            includeAll
            highlightSelection
            parentId="person-management"
            ref="schulenFilter"
            :systemrechteForSearch="[RollenSystemRecht.PersonenVerwalten]"
            :selectedSchulen="selectedOrganisationIds"
            @update:selectedSchulen="setOrganisationFilter"
            @update:selectedSchulenObjects="setSelectedOrganisationen"
            :placeholderText="$t('admin.schule.schule')"
            hideDetails
          >
            <template #prepend-item>
              <v-list-item>
                <v-progress-circular
                  v-if="organisationStore.organisationenFilters.get('person-management')?.loading"
                  indeterminate
                />
                <span
                  v-else
                  class="filter-header"
                  >{{
                    $t(
                      'admin.schule.schulenFound',
                      {
                        count: organisationStore.organisationenFilters.get('person-management')?.total,
                      },
                      organisationStore.organisationenFilters.get('person-management')?.total ?? 0,
                    )
                  }}</span
                >
              </v-list-item>
            </template>
          </SchulenFilter>
        </v-col>
        <v-col
          cols="12"
          md="3"
          class="py-md-0"
        >
          <v-autocomplete
            id="rolle-select"
            ref="rolle-select"
            v-model="selectedRollen"
            v-model:search="searchInputRollen"
            autocomplete="off"
            class="filter-dropdown"
            :class="{
              selected: selectedRollen.length > 0,
            }"
            clearable
            data-testid="rolle-select"
            density="compact"
            hide-details
            :items="rollen"
            item-value="value"
            item-text="title"
            multiple
            :no-data-text="$t('noDataFound')"
            :placeholder="$t('admin.rolle.rolle')"
            required="true"
            variant="outlined"
            @update:model-value="setRolleFilter"
            @update:search="updateRollenSearch"
            @update:focused="handleFocusChange"
          >
            <template #prepend-item>
              <v-list-item>
                <v-progress-circular
                  v-if="rolleStore.loading"
                  indeterminate
                />
                <span
                  v-else
                  class="filter-header"
                  >{{
                    $t(
                      'admin.rolle.rollenFound',
                      {
                        count: personenkontextStore.totalFilteredRollen,
                      },
                      personenkontextStore.totalFilteredRollen,
                    )
                  }}</span
                >
              </v-list-item>
            </template>
            <template #selection="{ internalItem: item, index }">
              <v-chip v-if="selectedRollen.length < 2">
                <span>{{ item.title }}</span>
              </v-chip>
              <div v-else-if="index === 0">
                {{
                  $t('admin.rolle.rollenSelected', {
                    count: selectedRollen.length,
                  })
                }}
              </div>
            </template>
          </v-autocomplete>
        </v-col>
        <v-col
          cols="12"
          md="2"
          class="py-md-0"
        >
          <v-tooltip
            :disabled="selectedOrganisationIds.length > 0"
            location="top"
          >
            <template #activator="{ props }">
              <div v-bind="props">
                <KlassenFilter
                  ref="klasse-select"
                  parentId="personen-management"
                  :systemrechteForSearch="[RollenSystemRecht.KlassenVerwalten]"
                  :multiple="true"
                  :readonly="selectedOrganisationIds.length == 0"
                  :hide-details="true"
                  :highlight-selection="true"
                  :selected-klassen="selectedKlassen"
                  :placeholder-text="t('admin.klasse.klassen')"
                  :administriert-von="selectedOrganisationIds ? selectedOrganisationIds : undefined"
                  @update:selected-klassen="updateKlassenSelection"
                >
                  <template #prepend-item>
                    <v-list-item>
                      <v-progress-circular
                        v-if="organisationStore.loading"
                        indeterminate
                      />
                      <span
                        v-else
                        class="filter-header"
                        >{{
                          t(
                            'admin.klasse.klassenFound',
                            {
                              count: totalKlassen,
                            },
                            totalKlassen,
                          )
                        }}</span
                      >
                    </v-list-item>
                  </template>
                </KlassenFilter>
              </div>
            </template>
            <span>{{ $t('admin.schule.selectSchuleFirst') }}</span>
          </v-tooltip>
        </v-col>
        <v-col
          cols="12"
          md="2"
          class="py-md-0"
        >
          <v-autocomplete
            id="status-select"
            v-model="selectedStatus"
            autocomplete="off"
            chips
            class="filter-dropdown"
            clearable
            data-testid="status-select"
            density="compact"
            hide-details
            :items="statuses"
            item-value="value"
            item-text="title"
            :no-data-text="$t('noDataFound')"
            :placeholder="$t('admin.status')"
            required="true"
            variant="outlined"
          />
        </v-col>
      </v-row>
      <v-row class="ma-3 mb-0 mb-md-n4 mt-6 justify-start">
        <v-col
          md="3"
          cols="12"
        >
          <SpshTooltip
            :enabled-condition="selectedPersonIds.length > 0"
            :disabled-text="$t('admin.person.choosePersonFirst')"
            position="top"
          >
            <v-select
              v-if="authStore.hasPersonenBulkPermission"
              id="benutzer-edit-select"
              ref="benutzer-bulk-edit-select"
              v-model="selectedOption"
              clearable
              data-testid="benutzer-edit-select"
              density="compact"
              :disabled="selectedPersonIds.length === 0"
              :items="actions"
              item-value="value"
              item-text="title"
              :no-data-text="$t('noDataFound')"
              :placeholder="$t('edit')"
              required="true"
              variant="outlined"
              @update:model-value="handleOption"
            />
          </SpshTooltip>

          <!-- Small screens only: count directly under the select -->
          <p
            v-if="authStore.hasPersonenBulkPermission && selectedPersonIds.length > 0"
            class="text-body my-0 d-flex d-md-none"
          >
            {{ selectedPersonIds.length }} {{ $t('selected') }}
          </p>
          <InfoDialog
            id="invalid-selection-alert-dialog"
            :is-dialog-visible="onlyOneOrganisationAlertDialogVisible"
            :header="invalidSelectionAlertHeader"
            :messages="invalidSelectionAlertMessages"
            @update:dialog-exit="
              () => {
                onlyOneOrganisationAlertDialogVisible = false;
                selectedOption = null;
              }
            "
          />
          <InfoDialog
            id="only-one-rolle-notice"
            :is-dialog-visible="onlyOneRolleAlertDialogVisible"
            :header="invalidSelectionAlertHeader"
            :messages="[$t('admin.person.onlyOneRolleAlert')]"
            @update:dialog-exit="
              () => {
                onlyOneRolleAlertDialogVisible = false;
                selectedOption = null;
              }
            "
          />
          <RolleModify
            v-if="rolleModifiyDialogVisible"
            ref="person-bulk-rolle-modify"
            :organisationen="organisationenForForm"
            :rollen="lehrAndLernRollen"
            :is-loading="personenkontextStore.loading"
            :is-dialog-visible="rolleModifiyDialogVisible"
            :error-code="personenkontextStore.errorCode"
            :selected-personen="selectedPersonen"
            @update:is-dialog-visible="handleRolleModifyDialog($event)"
            @update:get-uebersichten="getPaginatedPersonen(searchFilterStore.personenPage)"
          >
          </RolleModify>
          <PersonBulkDelete
            v-if="benutzerDeleteDialogVisible"
            ref="person-bulk-delete"
            :error-code="personStore.errorCode"
            :is-loading="personStore.loading"
            :is-dialog-visible="benutzerDeleteDialogVisible"
            :selected-personen="selectedPersonen"
            @update:dialog-exit="handleBulkDeleteDialog($event)"
          />
          <PersonBulkPasswordReset
            v-if="passwordResetDialogVisible"
            ref="person-bulk-password-reset"
            :is-dialog-visible="passwordResetDialogVisible"
            :selected-schule-kennung="selectedOrganisationKennung"
            :selected-personen="selectedPersonen"
            @update:dialog-exit="handleBulkPasswordResetDialog($event)"
          />
          <OrganisationUnassign
            ref="organisation-unassign"
            v-if="organisationUnassignDialogVisible"
            :is-dialog-visible="organisationUnassignDialogVisible"
            :selected-personen="selectedPersonen"
            :selected-organisation="selectedOrganisationen[0] ?? ({} as Organisation)"
            @update:dialog-exit="handleUnassignOrgDialog($event)"
          >
          </OrganisationUnassign>
          <RolleUnassign
            ref="rolle-unassign"
            v-if="rolleUnassignDialogVisible"
            :is-dialog-visible="rolleUnassignDialogVisible"
            :organisationen="organisationenForForm"
            :selected-personen="Array.isArray(selectedPersonen) ? selectedPersonen[0] : selectedPersonen"
            :selected-organisation-from-filter="selectedOrganisationen[0] ?? ({} as Organisation)"
            :selected-rolle-from-filter="selectedRolle!"
            @update:dialog-exit="handleUnassignRolleDialog($event)"
          >
          </RolleUnassign>
          <PersonBulkChangeKlasse
            v-if="changeKlasseDialogVisible"
            :is-dialog-visible="changeKlasseDialogVisible"
            :selected-personen="selectedPersonen"
            :selected-schule-id="selectedOrganisationen[0]?.id ?? undefined"
            @update:dialog-exit="handleBulkKlasseChangeDialog"
          />
        </v-col>
        <!-- Display the number of selected checkboxes (md+ only) -->
        <v-col
          v-if="authStore.hasPersonenBulkPermission && selectedPersonIds.length > 0"
          cols="auto"
          class="mb-5 d-none d-md-flex align-center"
        >
          <p class="text-body mb-0">{{ selectedPersonIds.length }} {{ $t('selected') }}</p>
        </v-col>
        <v-spacer />
        <SearchField
          ref="searchFieldComponent"
          :initial-value="searchFilterStore.searchStringForPersonen ?? ''"
          :input-cols="6"
          :input-cols-md="3"
          :button-cols="6"
          :button-cols-md="2"
          :hover-text="$t('person.firstNameLastNameReferrerKopersNr')"
          @on-apply-search-filter="handleSearchFilter"
        />
      </v-row>
      <ResultTable
        ref="resultTable"
        :current-page="searchFilterStore.personenPage"
        data-testid="person-table"
        :items="personRows"
        :items-per-page="searchFilterStore.personenPerPage"
        :loading="personStore.loading"
        :headers="headers"
        :current-sort="searchFilterStore.currentSort"
        :model-value="selectedPersonIds"
        :total-items="personStore.totalPersons"
        item-value-path="id"
        @on-handle-row-click="
          (event: PointerEvent, item: TableRow<unknown>) => navigateToPersonDetails(event, item as TableRow<PersonRow>)
        "
        @on-items-per-page-update="getPaginatedPersonenWithLimit"
        @on-page-update="getPaginatedPersonen"
        @on-table-update="handleTableSorting"
        @update:selected-rows="handleSelectedRows"
      >
        <template v-slot:[`item.rollen`]="{ item }">
          <div
            class="ellipsis-wrapper"
            :title="item.rollen"
          >
            {{ item.rollen }}
          </div>
        </template>
        <template v-slot:[`item.administrationsebenen`]="{ item }">
          <div
            class="ellipsis-wrapper"
            :title="item.administrationsebenen"
          >
            {{ item.administrationsebenen }}
          </div>
        </template>
      </ResultTable>
    </LayoutCard>
  </div>
</template>

<style></style>
