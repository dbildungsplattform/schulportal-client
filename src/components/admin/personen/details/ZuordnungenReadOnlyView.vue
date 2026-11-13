<script setup lang="ts">
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';
  import PersonenkontextItem from '@/components/admin/personen/details/PersonenkontextItem.vue';
  import type { ZuordnungWithKlasse } from '@/utils/zuordnungen';
  import type { Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useDisplay } from 'vuetify';

  type Props = {
    loading: boolean;
    zuordnungen: ZuordnungWithKlasse[] | undefined;
    hasZuordnungen: boolean;
    hasSelection: boolean;
    isEditPersonMetadataActive: boolean;
  };

  const props: Props = defineProps<Props>();

  type Emits = {
    (event: 'edit'): void;
  };
  const emit: Emits = defineEmits<Emits>();

  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();
</script>

<template>
  <v-container
    class="person-zuordnungen"
    data-testid="person-zuordnungen-section-view"
  >
    <v-row class="ml-md-16">
      <v-col v-if="props.loading">
        <v-progress-circular indeterminate />
      </v-col>
      <template v-else>
        <v-col>
          <h3
            class="subtitle-1"
            data-testid="zuordnungen-section-headline"
          >
            {{ t('person.zuordnungen') }}
          </h3>

          <template v-if="props.hasZuordnungen">
            <v-row
              v-for="zuordnung in props.zuordnungen"
              :key="zuordnung.sskId"
              class="mt-4"
              :data-testid="`person-zuordnung-${zuordnung.sskId}`"
              :title="zuordnung.sskName"
            >
              <v-col offset="1">
                <PersonenkontextItem
                  :zuordnung="zuordnung"
                  :no-margin="true"
                />
              </v-col>
            </v-row>
          </template>

          <v-row
            v-else
            class="mt-4"
          >
            <v-col offset="1">
              <h3 class="text-body">
                {{ t('person.noZuordnungenFound') }}
              </h3>
            </v-col>
          </v-row>
        </v-col>
        <v-col
          class="mr-lg-13"
          cols="12"
          md="auto"
        >
          <div class="d-flex justify-sm-end">
            <v-col
              cols="12"
              sm="6"
              md="auto"
            >
              <SpshTooltip
                :enabled-condition="!props.hasSelection && !props.isEditPersonMetadataActive"
                :disabled-text="t('person.finishEditFirst')"
                :enabled-text="t('person.editZuordnungen')"
                position="start"
              >
                <v-btn
                  class="primary ml-lg-8"
                  data-testid="zuordnung-edit-button"
                  :disabled="props.isEditPersonMetadataActive"
                  :block="mdAndDown"
                  @click="emit('edit')"
                >
                  {{ t('edit') }}
                </v-btn>
              </SpshTooltip>
            </v-col>
          </div>
        </v-col>
      </template>
    </v-row>
  </v-container>
</template>

<style scoped>
  span {
    white-space: normal;
    text-wrap: pretty;
  }
</style>
