<script setup lang="ts">
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';
  import PersonenkontextDelete from '@/components/admin/personen/PersonenkontextDelete.vue';
  import { useConfigStore, type ConfigStore } from '@/stores/ConfigStore';
  import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
  import type { Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useDisplay } from 'vuetify';

  type Props = {
    selectedCount: number;
    editableZuordnungenCount: number;
    pendingDeletion: boolean;
    isDeleteExternZuordnungDisabled: boolean;
    canChangeKlasse: boolean;
    hasKlassenZuordnung: boolean;
  };

  const props: Props = defineProps<Props>();

  type Emits = {
    (event: 'delete'): void;
    (event: 'add'): void;
    (event: 'changeBefristung'): void;
    (event: 'changeKlasse'): void;
  };
  const emit: Emits = defineEmits<Emits>();

  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();
  const personStore: PersonStore = usePersonStore();
  const configStore: ConfigStore = useConfigStore();
</script>

<template>
  <v-col
    class="button-container"
    cols="12"
    md="auto"
  >
    <v-col
      cols="12"
      sm="6"
      md="auto"
    >
      <PersonenkontextDelete
        v-if="!props.pendingDeletion"
        :error-code="personStore.errorCode"
        :person="personStore.currentPerson"
        :disabled="props.selectedCount === 0 || props.isDeleteExternZuordnungDisabled"
        :disabled-tooltip-text="props.isDeleteExternZuordnungDisabled ? '' : undefined"
        :zuordnung-count="props.editableZuordnungenCount"
        @on-delete-personenkontext="emit('delete')"
      />
      <SpshTooltip
        :enabled-condition="props.selectedCount === 0"
        :disabled-text="t('person.addZuordnungNotAllowed')"
        :enabled-text="t('person.addZuordnung')"
        position="start"
      >
        <v-btn
          class="primary mt-2"
          data-testid="zuordnung-create-button"
          :disabled="props.selectedCount > 0"
          :block="mdAndDown"
          @click="emit('add')"
        >
          {{ t('person.addZuordnung') }}
        </v-btn>
      </SpshTooltip>
      <template v-if="configStore.configData?.rolleBearbeitenEnabled">
        <SpshTooltip
          :enabled-condition="props.selectedCount > 0"
          :disabled-text="t('person.chooseZuordnungFirst')"
          :enabled-text="t('person.changeRolleDescription')"
          position="start"
        >
          <v-btn
            class="primary mt-2"
            data-testid="rolle-change-button"
            :disabled="props.selectedCount === 0"
            :block="mdAndDown"
          >
            {{ t('person.changeRolle') }}
          </v-btn>
        </SpshTooltip>
      </template>
      <template v-if="configStore.configData?.befristungBearbeitenEnabled">
        <SpshTooltip
          :enabled-condition="props.selectedCount > 0"
          :disabled-text="t('person.chooseZuordnungFirst')"
          :enabled-text="t('person.modifyBefristungDescription')"
          position="start"
        >
          <v-btn
            class="primary mt-2"
            data-testid="befristung-change-button"
            :disabled="props.selectedCount !== 1"
            :block="mdAndDown"
            @click="emit('changeBefristung')"
          >
            {{ t('person.modifyBefristung') }}
          </v-btn>
        </SpshTooltip>
      </template>
      <SpshTooltip
        v-if="props.hasKlassenZuordnung"
        :enabled-condition="props.canChangeKlasse"
        :disabled-text="t('person.chooseKlasseZuordnungFirst')"
        :enabled-text="t('person.changeKlasseDescription')"
        position="start"
      >
        <v-btn
          class="primary mt-2"
          data-testid="klasse-change-button"
          :disabled="!props.canChangeKlasse"
          :block="mdAndDown"
          @click="emit('changeKlasse')"
        >
          {{ t('transfer') }}
        </v-btn>
      </SpshTooltip>
    </v-col>
  </v-col>
</template>
