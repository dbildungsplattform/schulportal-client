<script setup lang="ts">
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import BulkErrorDialog from '@/components/dialog/BulkErrorDialog.vue';
  import SearchField from '@/components/admin/SearchField.vue';
  import {
    OrganisationsTyp,
    useOrganisationStore,
    type Organisation,
    type OrganisationRelationshipBatchFailure,
    type OrganisationStore,
  } from '@/stores/OrganisationStore';
  import { dedup } from '@/utils/arrays';
  import { buildCSV, download } from '@/utils/file';
  import { getDisplayNameForOrg } from '@/utils/formatting';
  import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';

  type Props = {
    organisationId: string;
    showComponent: boolean;
  };
  type Emits = {
    (event: 'update:showComponent', value: boolean): void;
    (event: 'relationships-updated'): void;
  };
  type TreeNode = {
    id: string;
    title: string;
    children?: TreeNode[];
  };
  type RelationshipError = {
    organisation: Organisation;
    message: string;
  };

  const props: Props = defineProps<Props>();
  const emit: Emits = defineEmits<Emits>();
  const i18n: Composer = useI18n({ useScope: 'global' });
  const { t }: Composer = i18n;
  const organisationStore: OrganisationStore = useOrganisationStore();
  const selected: Ref<Organisation[]> = ref([]);
  const opened: Ref<string[]> = ref(['select-all']);
  const showErrorDialog: Ref<boolean> = ref(false);

  function translateError(code: string): string {
    const key: string = `admin.organisation.errors.${code}`;
    return i18n.te(key) ? t(key) : t('admin.organisation.errors.CREATE_RELATIONSHIP_ERROR');
  }

  const isCreating: ComputedRef<boolean> = computed(() => organisationStore.relationshipBatch.isRunning);
  const isFinished: ComputedRef<boolean> = computed(() => organisationStore.relationshipBatch.isComplete);
  const errors: ComputedRef<RelationshipError[]> = computed(() =>
    organisationStore.relationshipBatch.failures.map(
      (failure: OrganisationRelationshipBatchFailure): RelationshipError => ({
        organisation: failure.organisation,
        message: translateError(failure.errorCode),
      }),
    ),
  );
  const contextOrganisation: ComputedRef<Organisation | undefined> = computed(() =>
    [organisationStore.currentOrganisation, organisationStore.currentSchule].find(
      (organisation: Organisation | null | undefined): organisation is Organisation =>
        organisation?.id === props.organisationId,
    ),
  );
  const searchPlaceholder: ComputedRef<string> = computed(() =>
    contextOrganisation.value?.typ === OrganisationsTyp.Schule
      ? t('admin.organisation.searchPlaceholderBehoerde')
      : t('admin.organisation.searchPlaceholderSchule'),
  );
  const searchHoverText: ComputedRef<string> = computed(() =>
    contextOrganisation.value?.typ === OrganisationsTyp.Schule
      ? t('admin.organisation.searchByName')
      : t('admin.organisation.searchByNameOrKennung'),
  );
  const emptyStateText: ComputedRef<string> = computed(() =>
    contextOrganisation.value?.typ === OrganisationsTyp.Schule
      ? t('admin.organisation.noBehoerdenFound')
      : t('admin.organisation.noSchulenFound'),
  );
  const availableOrganisations: ComputedRef<Organisation[]> = computed(() =>
    dedup(
      [...selected.value, ...organisationStore.searchedOrganisations],
      (org: Organisation): string => org.id,
    ).filter(
      (org: Organisation): boolean =>
        contextOrganisation.value?.typ !== OrganisationsTyp.Schule || org.typ === OrganisationsTyp.Behoerde,
    ),
  );
  const treeItems: ComputedRef<TreeNode[]> = computed(() =>
    availableOrganisations.value.map(
      (organisation: Organisation): TreeNode => ({
        id: organisation.id,
        title: getDisplayNameForOrg(organisation),
      }),
    ),
  );
  const treeItemsWithSelectAll: ComputedRef<TreeNode[]> = computed(() => [
    { id: 'select-all', title: t('admin.organisation.selectAll'), children: treeItems.value },
  ]);
  const selectedIds: ComputedRef<string[]> = computed(() =>
    selected.value.map((organisation: Organisation): string => organisation.id),
  );
  const allSelected: ComputedRef<boolean> = computed(
    (): boolean =>
      availableOrganisations.value.length > 0 && selected.value.length === availableOrganisations.value.length,
  );
  const progress: ComputedRef<number> = computed(() => organisationStore.relationshipBatch.progress);
  const savedCount: ComputedRef<number> = computed(
    () => organisationStore.relationshipBatch.completed - errors.value.length,
  );

  async function searchOrganisations(searchString: string = ''): Promise<void> {
    await organisationStore.searchOrganisationsForRelationships(props.organisationId, searchString || undefined);
  }

  function updateSelection(organisations: Organisation[]): void {
    const previousIds: Set<string> = new Set(selected.value.map((org: Organisation): string => org.id));
    selected.value = [
      ...organisations.filter((org: Organisation): boolean => !previousIds.has(org.id)).reverse(),
      ...organisations.filter((org: Organisation): boolean => previousIds.has(org.id)),
    ];
  }

  function setOrganisationSelected(id: string, isSelected: boolean | null): void {
    const shouldBeSelected: boolean = isSelected === true;
    if (selectedIds.value.includes(id) === shouldBeSelected) {
      return;
    }
    updateSelection(
      shouldBeSelected
        ? availableOrganisations.value.filter(
            (org: Organisation): boolean => org.id === id || selectedIds.value.includes(org.id),
          )
        : selected.value.filter((org: Organisation): boolean => org.id !== id),
    );
  }

  function setAllOrganisationsSelected(isSelected: boolean | null): void {
    const shouldBeSelected: boolean = isSelected === true;
    if ((shouldBeSelected && allSelected.value) || (!shouldBeSelected && selected.value.length === 0)) {
      return;
    }
    updateSelection(shouldBeSelected ? availableOrganisations.value : []);
  }

  function onTreeSelectionUpdate(value: unknown): void {
    if (Array.isArray(value)) {
      updateSelection(availableOrganisations.value.filter((org: Organisation): boolean => value.includes(org.id)));
    }
  }

  function errorToDisplayText(entry: RelationshipError): string {
    return getDisplayNameForOrg(entry.organisation);
  }

  function errorToAlertText(entry: RelationshipError): string {
    return entry.message;
  }

  async function createRelationships(): Promise<void> {
    if (isCreating.value || selected.value.length === 0) {
      return;
    }
    await organisationStore.createOrganisationRelationships(contextOrganisation.value, [...selected.value]);
    showErrorDialog.value = errors.value.length > 0;
  }

  function closeComponent(): void {
    if (isCreating.value) {
      return;
    }
    const relationshipsUpdated: boolean = isFinished.value;
    organisationStore.resetOrganisationRelationshipBatch();
    emit('update:showComponent', false);
    if (relationshipsUpdated) {
      emit('relationships-updated');
    }
  }

  function downloadErrors(): void {
    const content: string = buildCSV(
      [t('admin.organisation.organisation'), t('admin.organisation.errorMessage')],
      errors.value.map(
        (entry: RelationshipError): Record<string, string> => ({
          [t('admin.organisation.organisation')]: errorToDisplayText(entry),
          [t('admin.organisation.errorMessage')]: entry.message,
        }),
      ),
      t('admin.organisation.creationPartiallyFailed'),
    );
    download('Fehler-Organisationsbeziehungen.csv', new Blob([content], { type: 'text/csv;charset=utf-8;' }));
  }

  onMounted(async (): Promise<void> => {
    if (props.showComponent) {
      await searchOrganisations();
    }
  });

  onBeforeUnmount((): void => {
    organisationStore.resetOrganisationRelationshipBatch();
  });
</script>

<template>
  <section
    v-if="showComponent"
    aria-labelledby="organisation-relationship-selector-heading"
    data-testid="organisation-relationship-selector-section"
  >
    <v-container class="px-3 px-sm-16">
      <h3
        id="organisation-relationship-selector-heading"
        class="subtitle-1 pb-4"
      >
        {{ t('admin.organisation.addRelationship') }}
      </h3>
      <template v-if="!isCreating && !isFinished">
        <SpshAlert
          v-if="organisationStore.relationshipErrorCode"
          :model-value="true"
          :title="t('admin.organisation.searchErrorTitle')"
          :text="t('admin.organisation.searchErrorTitle')"
          type="error"
          :closable="false"
          data-testid="org-selector-error-alert"
        />
        <v-row class="mb-4">
          <SearchField
            initial-value=""
            :input-cols="9"
            :input-cols-md="6"
            :button-cols="3"
            :button-cols-md="2"
            :hover-text="searchHoverText"
            :placeholder="searchPlaceholder"
            @on-apply-search-filter="searchOrganisations"
          />
        </v-row>
        <v-row
          v-if="organisationStore.relationshipSearchLoading"
          justify="center"
        >
          <v-col cols="auto">
            <v-progress-circular
              indeterminate
              :aria-label="t('loadingData')"
              data-testid="org-selector-search-loading"
            />
          </v-col>
        </v-row>
        <p
          v-if="!organisationStore.relationshipSearchLoading && treeItems.length === 0"
          class="text-body text-medium-emphasis pa-6"
          data-testid="org-selector-empty"
        >
          {{ emptyStateText }}
        </p>
        <v-treeview
          v-if="treeItems.length > 0"
          v-model:opened="opened"
          :items="treeItemsWithSelectAll"
          :model-value="selectedIds"
          item-value="id"
          item-title="title"
          item-children="children"
          select-strategy="independent"
          density="compact"
          class="organisation-selector-tree"
          data-testid="org-selector-treeview"
          @update:model-value="onTreeSelectionUpdate"
        >
          <template #title="{ item }">
            <span :class="{ 'bold text-body': item.id === 'select-all' }">{{ item.title }}</span>
          </template>
          <template #prepend="{ item }">
            <v-checkbox
              v-if="item.id === 'select-all'"
              :model-value="allSelected"
              :indeterminate="selected.length > 0 && !allSelected"
              :disabled="availableOrganisations.length === 0 || organisationStore.relationshipSearchLoading"
              :aria-label="item.title"
              data-testid="org-selector-select-all"
              @click.stop
              @update:model-value="setAllOrganisationsSelected"
            />
            <v-checkbox
              v-else
              :model-value="selectedIds.includes(item.id)"
              :aria-label="item.title"
              :data-testid="`org-selector-checkbox-${item.id}`"
              @click.stop
              @update:model-value="setOrganisationSelected(item.id, $event)"
            />
          </template>
        </v-treeview>
        <v-row class="justify-end my-4">
          <v-col
            cols="12"
            sm="auto"
          >
            <v-btn
              block
              class="secondary"
              data-testid="org-selector-cancel-button"
              @click="closeComponent"
            >
              {{ t('cancel') }}
            </v-btn>
          </v-col>
          <v-col
            cols="12"
            sm="auto"
          >
            <v-btn
              block
              class="primary"
              :disabled="selected.length === 0 || organisationStore.relationshipSearchLoading"
              data-testid="org-selector-create-button"
              @click="createRelationships"
            >
              {{ t('admin.organisation.executeChanges') }}
            </v-btn>
          </v-col>
        </v-row>
      </template>
      <template v-else>
        <v-row
          v-if="isCreating"
          class="align-center justify-center"
        >
          <v-col cols="auto">
            <v-icon
              aria-hidden="true"
              class="mr-2"
              icon="mdi-alert-circle-outline"
              size="small"
            />
            <span class="subtitle-2">{{ t('admin.doNotCloseBrowserNotice') }}</span>
          </v-col>
        </v-row>
        <v-container
          v-else-if="savedCount > 0"
          data-testid="org-selector-success"
        >
          <v-row class="justify-center">
            <v-col cols="auto">
              <v-icon
                color="success"
                icon="mdi-check-circle"
              />
            </v-col>
          </v-row>
          <p class="mt-2 text-center bold">
            {{ t('admin.organisation.relationshipsCreatedSuccessfully', savedCount) }}
          </p>
        </v-container>
        <v-progress-linear
          :model-value="progress"
          color="primary"
          height="25"
          data-testid="org-selector-progress"
        >
          <template #default="{ value }">
            <strong class="text-white">{{ Math.ceil(value) }}%</strong>
          </template>
        </v-progress-linear>
        <v-row
          v-if="isFinished"
          class="justify-center my-4"
        >
          <v-col cols="auto">
            <v-btn
              class="primary"
              data-testid="org-selector-finish-button"
              @click="closeComponent"
            >
              {{ t('close') }}
            </v-btn>
          </v-col>
        </v-row>
      </template>
    </v-container>
    <BulkErrorDialog
      v-if="showErrorDialog"
      v-model:is-dialog-visible="showErrorDialog"
      :errors="errors"
      :error-to-display-text="errorToDisplayText"
      :error-to-alert-text="errorToAlertText"
      :dialog-title="t('admin.organisation.addRelationship')"
      :close-confirmation-text="t('admin.person.bulk.closeBulkErrorDialogConfirmationMessage')"
      test-id-base="org-selector-bulk-error"
      :download-button-text="t('admin.person.bulk.saveList')"
      :close-button-text="t('admin.person.bulk.closeList')"
      @download="downloadErrors"
    >
      <p
        v-if="savedCount > 0"
        class="text-body bold"
        data-testid="org-selector-partial-success"
      >
        {{ t('admin.organisation.relationshipsCreatedSuccessfully', savedCount) }}
      </p>
      <p class="text-body bold">{{ t('admin.organisation.creationPartiallyFailed') }}</p>
    </BulkErrorDialog>
  </section>
</template>

<style scoped lang="scss">
  @use '@/styles/variables';

  .organisation-selector-tree {
    max-height: 400px;
    overflow-y: auto;
  }
</style>
