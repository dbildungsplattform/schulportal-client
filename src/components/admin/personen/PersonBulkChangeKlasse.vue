<script setup lang="ts">
  import PersonBulkError from '@/components/admin/personen/PersonBulkError.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import KlassenFilter from '@/components/filter/KlassenFilter.vue';
  import { type BulkErrorList, useBulkErrors } from '@/composables/useBulkErrors';
  import { type BulkOperationStore, useBulkOperationStore } from '@/stores/BulkOperationStore';
  import type { PersonWithZuordnungen } from '@/stores/types/PersonWithZuordnungen';
  import { computed, type ComputedRef, type Ref, ref } from 'vue';
  import { type Composer, useI18n } from 'vue-i18n';

  enum State {
    INITIAL,
    PROGRESSING,
    FINISHED,
  }

  type Props = {
    isDialogVisible: boolean;
    selectedPersonen: Map<string, PersonWithZuordnungen>;
    selectedSchuleId?: string;
  };
  const props: Props = defineProps<Props>();

  type Emits = (event: 'update:dialogExit', finished: boolean) => void;
  const emit: Emits = defineEmits<Emits>();

  const { t }: Composer = useI18n({ useScope: 'global' });
  const bulkOperationStore: BulkOperationStore = useBulkOperationStore();

  const selectedKlasse: Ref<string | null> = ref(null);
  const showErrorDialog: Ref<boolean, boolean> = ref(false);

  const updateKlassenSelection = (selected: string | null): void => {
    selectedKlasse.value = selected;
  };

  // Define the error list for the selected persons using the useBulkErrors composable
  const bulkErrorList: ComputedRef<BulkErrorList[]> = computed(() => useBulkErrors(t, props.selectedPersonen));

  const state: ComputedRef<State> = computed(() => {
    if (bulkOperationStore.currentOperation?.complete) {
      return State.FINISHED;
    }
    if (bulkOperationStore.currentOperation?.isRunning) {
      return State.PROGRESSING;
    }
    return State.INITIAL;
  });

  const progress: ComputedRef<number> = computed(() => {
    if (!bulkOperationStore.currentOperation?.progress) {
      return 0;
    }
    return bulkOperationStore.currentOperation.progress;
  });

  const canCommit: ComputedRef<boolean> = computed(() => {
    if (selectedKlasse.value) {
      return true;
    }
    return false;
  });

  const handleChangeKlasse = async (): Promise<void> => {
    if (!selectedKlasse.value) {
      return;
    }
    await bulkOperationStore.bulkChangeKlasse(
      Array.from(props.selectedPersonen.keys()),
      props.selectedSchuleId ?? '',
      selectedKlasse.value,
    );

    if (bulkOperationStore.currentOperation?.errors && bulkOperationStore.currentOperation.errors.size > 0) {
      showErrorDialog.value = true;
    }
  };

  const handleCloseDialog = (): void => {
    showErrorDialog.value = false;
    emit('update:dialogExit', state.value === State.FINISHED);
    if (bulkOperationStore.currentOperation) {
      bulkOperationStore.resetState();
    }
  };
</script>

<template>
  <v-dialog
    ref="changeKlasseBulkDialog"
    :model-value="props.isDialogVisible"
    :capture-focus="false"
    persistent
  >
    <LayoutCard
      data-testid="change-klasse-layout-card"
      :header="t('admin.person.bulkChangeKlasse.transfer')"
    >
      <v-container>
        <template v-if="state === State.INITIAL">
          <v-row class="pt-2 align-center justify-center">
            <v-col
              cols="12"
              sm="5"
              class="text-sm-right"
            >
              <label
                for="bulk-change-klasse-select"
                :required="true"
              >
                {{ t('admin.person.bulkChangeKlasse.nextKlasse') }}
              </label>
            </v-col>
            <v-col
              cols="12"
              sm="7"
            >
              <KlassenFilter
                :multiple="false"
                :hideDetails="true"
                :selectedKlassen="selectedKlasse"
                :placeholderText="t('admin.klasse.selectKlasse')"
                :administriertVon="selectedSchuleId ? [selectedSchuleId] : undefined"
                @update:selectedKlassen="updateKlassenSelection"
                parentId="bulk-change-klasse"
              />
            </v-col>
          </v-row>
        </template>
        <template v-else>
          <v-row class="justify-center">
            <v-col cols="auto">
              <v-icon
                v-if="state === State.PROGRESSING"
                aria-hidden="true"
                class="mr-2"
                icon="mdi-alert-circle-outline"
                size="small"
              />
              <v-icon
                v-if="state === State.FINISHED"
                small
                color="#1EAE9C"
                icon="mdi-check-circle"
              />
              <span
                v-if="state === State.PROGRESSING"
                class="subtitle-2"
                data-testid="bulk-change-klasse-progressing-notice"
              >
                {{ t('admin.doNotCloseBrowserNotice') }}
              </span>
            </v-col>
          </v-row>
          <p
            v-if="state === State.FINISHED"
            class="mt-2 text-center"
            data-testid="bulk-change-klasse-success-text"
          >
            {{ t('admin.person.bulkChangeKlasse.success') }}
          </p>
          <!-- Progress Bar -->
          <v-progress-linear
            class="mt-5"
            :model-value="progress"
            color="primary"
            height="25"
            data-testid="bulk-change-klasse-progressbar"
          >
            <template #default="{ value }">
              <strong class="text-white">{{ Math.ceil(value) }}%</strong>
            </template>
          </v-progress-linear>
        </template>
      </v-container>

      <v-card-actions class="justify-center">
        <v-row class="py-3 px-2 justify-center">
          <v-spacer v-if="state === State.INITIAL" />
          <v-col
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              v-if="state === State.INITIAL"
              class="secondary"
              data-testid="bulk-change-klasse-discard-button"
              @click="handleCloseDialog"
            >
              {{ t('cancel') }}
            </v-btn>
            <v-btn
              v-else-if="state === State.FINISHED"
              class="primary"
              data-testid="bulk-change-klasse-close-button"
              @click="handleCloseDialog"
            >
              {{ t('close') }}
            </v-btn>
          </v-col>
          <v-col
            v-if="state === State.INITIAL"
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              class="primary"
              :disabled="!canCommit"
              data-testid="bulk-change-klasse-button"
              @click.stop="handleChangeKlasse"
            >
              {{ t('admin.person.bulkChangeKlasse.transfer') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-actions>
    </LayoutCard>
    <template v-if="showErrorDialog">
      <PersonBulkError
        :bulk-operation-name="t('admin.person.bulkChangeKlasse.transfer')"
        :is-dialog-visible="showErrorDialog"
        :errors="bulkErrorList"
        @update:is-dialog-visible="handleCloseDialog"
      />
    </template>
  </v-dialog>
</template>
