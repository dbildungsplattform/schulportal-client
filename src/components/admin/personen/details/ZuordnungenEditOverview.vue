<script setup lang="ts">
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';
  import ZuordnungenEditActions from '@/components/admin/personen/details/ZuordnungenEditActions.vue';
  import ZuordnungenEditList from '@/components/admin/personen/details/ZuordnungenEditList.vue';
  import type { ZuordnungOperation } from '@/composables/useZuordnungEditMode';
  import type { ZuordnungWithKlasse } from '@/utils/zuordnungen';
  import type { ModelRef, Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useDisplay } from 'vuetify';

  type Props = {
    zuordnungen: ZuordnungWithKlasse[];
    newZuordnung: ZuordnungWithKlasse | undefined;
    // The operation whose change is pending. Without one, the Zuordnungen can be selected and an operation started.
    pendingOperation: ZuordnungOperation | undefined;
    hasNoZuordnungen: boolean;
    isDeleteExternZuordnungDisabled: boolean;
    canChangeKlasse: boolean;
    hasKlassenZuordnung: boolean;
    isLoading: boolean;
  };

  const props: Props = defineProps<Props>();
  const selectedZuordnungen: ModelRef<ZuordnungWithKlasse[]> = defineModel<ZuordnungWithKlasse[]>(
    'selectedZuordnungen',
    {
      required: true,
    },
  );

  type Emits = {
    (event: 'delete'): void;
    (event: 'add'): void;
    (event: 'changeBefristung'): void;
    (event: 'changeKlasse'): void;
    (event: 'cancel'): void;
    (event: 'save'): void;
  };
  const emit: Emits = defineEmits<Emits>();

  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();
</script>

<template>
  <v-row class="ml-md-16">
    <v-col
      v-if="!props.pendingOperation"
      cols="12"
      sm="auto"
    >
      <h3 class="subtitle-1">{{ t('person.editZuordnungen') }}: {{ t('pleaseSelect') }}</h3>
    </v-col>
  </v-row>
  <v-row class="ml-md-16 mb-12">
    <v-col
      v-if="props.pendingOperation"
      cols="12"
      sm="auto"
    >
      <h3
        class="subtitle-1"
        data-testid="check-and-save-headline"
      >
        {{ t('person.checkAndSave') }}:
      </h3>
    </v-col>
    <ZuordnungenEditList
      v-model:selected-zuordnungen="selectedZuordnungen"
      :zuordnungen="props.zuordnungen"
      :new-zuordnung="props.newZuordnung"
      :pending-operation="props.pendingOperation"
    />
    <v-spacer />
    <ZuordnungenEditActions
      v-if="!props.pendingOperation"
      :selected-count="selectedZuordnungen.length"
      :editable-zuordnungen-count="props.zuordnungen.length"
      :is-delete-extern-zuordnung-disabled="props.isDeleteExternZuordnungDisabled"
      :can-change-klasse="props.canChangeKlasse"
      :has-klassen-zuordnung="props.hasKlassenZuordnung"
      @delete="emit('delete')"
      @add="emit('add')"
      @change-befristung="emit('changeBefristung')"
      @change-klasse="emit('changeKlasse')"
    />
  </v-row>
  <v-row
    v-if="props.hasNoZuordnungen && props.pendingOperation !== 'creation' && props.pendingOperation !== 'deletion'"
  >
    <v-col
      class="mt-n12 mb-16"
      cols="10"
      offset="1"
    >
      <h3 class="text-body">
        {{ t('person.noZuordnungenFound') }}
      </h3>
    </v-col>
  </v-row>
  <v-row class="save-cancel-row ml-md-16 mb-3 pt-14">
    <v-col
      class="cancel-col"
      cols="12"
      sm="6"
      md="auto"
    >
      <v-btn
        class="secondary small"
        data-testid="zuordnung-edit-cancel"
        :block="mdAndDown"
        @click="emit('cancel')"
      >
        {{ t('cancel') }}
      </v-btn>
    </v-col>
    <v-col
      cols="12"
      sm="6"
      md="auto"
    >
      <!-- The save button is always disabled if there is no pending change -->
      <SpshTooltip
        :enabled-condition="!!props.pendingOperation"
        :disabled-text="t('person.noChangesToSave')"
        :enabled-text="t('person.saveChanges')"
      >
        <v-btn
          class="primary small"
          data-testid="zuordnung-changes-save-button"
          :block="mdAndDown"
          :disabled="!props.pendingOperation || props.isLoading"
          @click="emit('save')"
        >
          {{ t('save') }}
        </v-btn>
      </SpshTooltip>
    </v-col>
  </v-row>
</template>

<style scoped>
  @media only screen and (max-width: 600px) {
    .save-cancel-row {
      margin-top: -40px;
    }

    .cancel-col {
      margin-bottom: -15px;
    }
  }
</style>
