<script setup lang="ts">
  import KlassenFilter from '@/components/filter/KlassenFilter.vue';
  import FormRow from '@/components/form/FormRow.vue';
  import { Organisation } from '@/stores/OrganisationStore';
  import { type BaseFieldProps } from 'vee-validate';
  import { type Ref, ref, type ModelRef, watch } from 'vue';

  type Props = {
    schulen?: Array<{ value: string; title: string }>;
    readonly?: boolean;
    selectedSchuleProps?: BaseFieldProps & { error: boolean; 'error-messages': Array<string> };
    selectedNewKlasseProps?: BaseFieldProps & { error: boolean; 'error-messages': Array<string> };
    onSubmit: () => void;
  };

  defineProps<Props>();

  const selectedSchule: ModelRef<string | undefined, string> = defineModel('selectedSchule');
  const selectedNewKlasse: ModelRef<Organisation | undefined, string> = defineModel<Organisation | undefined, string>(
    'selectedNewKlasse',
  );

  // we need to cast the selectedSchule into an array
  // doing it this way prevents an issue where the reactive system constantly re-runs which causes requests to be issued in a loop
  const administriertVon: Ref<string[] | undefined> = ref();
  watch(
    selectedSchule,
    (newValue: string | undefined) => {
      if (!newValue) {
        administriertVon.value = [];
      } else if (!administriertVon.value?.includes(newValue)) {
        administriertVon.value = [newValue];
      }
    },
    { immediate: true },
  );
</script>

<template>
  <v-form
    id="klasse-change-form"
    data-testid="klasse-change-form"
    :on-submit="onSubmit"
  >
    <!-- Schule zuordnen -->
    <FormRow
      :error-label="selectedSchuleProps?.error || ''"
      label-for-id="schule-select"
      :is-required="true"
      :label="$t('admin.schule.schule')"
    >
      <v-autocomplete
        id="schule-select"
        ref="schule-select"
        v-bind="selectedSchuleProps"
        v-model="selectedSchule"
        :class="[{ 'filter-dropdown mb-4': true }, { selected: selectedSchule }]"
        autocomplete="off"
        clearable
        data-testid="schule-select"
        density="compact"
        :disabled="readonly"
        :items="schulen"
        item-value="value"
        item-text="title"
        :no-data-text="$t('noDataFound')"
        :placeholder="$t('admin.schule.assignSchule')"
        hide-details
        required="true"
        variant="outlined"
      />
    </FormRow>

    <!-- Klasse auswählen -->
    <FormRow
      :error-label="selectedNewKlasseProps?.error || ''"
      label-for-id="klasse-select"
      :is-required="true"
      :label="$t('admin.klasse.klasse')"
    >
      <KlassenFilter
        ref="klasse-select"
        :administriertVon
        :parentId="'klasse-change'"
        :placeholder-text="$t('admin.klasse.selectKlasse')"
        @update:selectedKlassen="(newValue: Organisation | undefined) => (selectedNewKlasse = newValue)"
      />
    </FormRow>
  </v-form>
</template>

<style scoped></style>
