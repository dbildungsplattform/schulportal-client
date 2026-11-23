<script setup lang="ts">
  import { PendingState } from '@/components/admin/personen/details/PersonenkontextItem.types';
  import PersonenkontextItem from '@/components/admin/personen/details/PersonenkontextItem.vue';
  import type { ZuordnungOperation } from '@/composables/useZuordnungEditMode';
  import type { ZuordnungWithKlasse } from '@/utils/zuordnungen';
  import type { ModelRef } from 'vue';

  type Props = {
    zuordnungen: ZuordnungWithKlasse[];
    newZuordnung: ZuordnungWithKlasse | undefined;
    // The operation whose change is pending. Without one, the Zuordnungen can be selected.
    pendingOperation: ZuordnungOperation | undefined;
  };

  const props: Props = defineProps<Props>();
  const selectedZuordnungen: ModelRef<ZuordnungWithKlasse[]> = defineModel<ZuordnungWithKlasse[]>(
    'selectedZuordnungen',
    {
      required: true,
    },
  );
</script>

<template>
  <v-col
    v-for="zuordnung in props.zuordnungen"
    :key="zuordnung.sskId"
    cols="12"
    :md="props.pendingOperation ? '12' : '7'"
    :data-testid="`person-zuordnung-${zuordnung.sskId}`"
    :title="zuordnung.sskName"
    class="py-0 d-flex align-items-center"
  >
    <template v-if="!props.pendingOperation">
      <div class="mb-n4 checkbox-top-align">
        <v-checkbox
          :ref="`checkbox-zuordnung-${zuordnung.sskId}`"
          v-model="selectedZuordnungen"
          :value="zuordnung"
        >
          <template #label>
            <PersonenkontextItem
              :zuordnung="zuordnung"
              :no-margin="true"
            />
          </template>
        </v-checkbox>
      </div>
    </template>
    <template v-else-if="props.pendingOperation === 'creation'">
      <PersonenkontextItem
        :pending-state="
          props.newZuordnung &&
          zuordnung.sskId === props.newZuordnung.sskId &&
          zuordnung.rolleId === props.newZuordnung.rolleId
            ? PendingState.CREATED
            : undefined
        "
        :zuordnung="zuordnung"
      />
    </template>
    <template v-else-if="props.pendingOperation === 'deletion'">
      <PersonenkontextItem
        :pending-state="selectedZuordnungen.includes(zuordnung) ? PendingState.DELETED : undefined"
        :zuordnung="zuordnung"
      />
    </template>
    <template v-else-if="props.pendingOperation === 'changeKlasse'">
      <div class="d-flex flex-column">
        <PersonenkontextItem
          :pending-state="selectedZuordnungen.includes(zuordnung) ? PendingState.DELETED : undefined"
          :zuordnung="zuordnung"
        />
        <PersonenkontextItem
          v-if="
            props.newZuordnung &&
            zuordnung.sskId === props.newZuordnung.sskId &&
            zuordnung.rolleId === props.newZuordnung.rolleId
          "
          :pending-state="PendingState.CREATED"
          :zuordnung="props.newZuordnung"
        />
      </div>
    </template>
    <template v-else-if="props.pendingOperation === 'changeBefristung'">
      <div class="d-flex flex-column">
        <PersonenkontextItem
          v-if="selectedZuordnungen.includes(zuordnung)"
          :pending-state="PendingState.DELETED"
          :zuordnung="zuordnung"
          :show-unlimited-befristung="true"
          :hide-pending-label="true"
        />
        <PersonenkontextItem
          v-else
          :zuordnung="zuordnung"
          :show-unlimited-befristung="true"
        />
        <PersonenkontextItem
          v-if="
            props.newZuordnung &&
            zuordnung.sskId === props.newZuordnung.sskId &&
            zuordnung.rolleId === props.newZuordnung.rolleId
          "
          :pending-state="PendingState.CREATED"
          :zuordnung="props.newZuordnung"
          :show-unlimited-befristung="true"
          :hide-pending-label="true"
        />
      </div>
    </template>
  </v-col>
</template>

<style scoped>
  span {
    white-space: normal;
    text-wrap: pretty;
  }
</style>
