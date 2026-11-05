<script setup lang="ts">
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import type { ModelRef, Ref } from 'vue';
  import { useDisplay } from 'vuetify';

  defineProps<{
    header: string;
    text: string;
  }>();
  const emits: {
    (event: 'update:modelValue', value: boolean): void;
    (event: 'after-leave'): void;
  } = defineEmits<{
    (event: 'update:modelValue', value: boolean): void;
    (event: 'after-leave'): void;
  }>();
  const model: ModelRef<boolean | undefined> = defineModel<boolean>();

  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();
</script>
<template>
  <v-dialog
    persistent
    v-model="model"
    @after-leave="emits('after-leave')"
  >
    <template #default>
      <LayoutCard
        headline-test-id="vidis-info-dialog-headline"
        :header="header"
      >
        <v-card-text>
          <v-container>
            <v-row class="text-body bold justify-center">
              <v-col
                class="text-center"
                cols="10"
              >
                <span data-testid="vidis-info-dialog-text">
                  {{ text }}
                </span>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-row class="justify-center">
            <v-col
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="mdAndDown"
                class="primary"
                data-testid="close-vidis-info-dialog-button"
                @click.stop="emits('update:modelValue', false)"
              >
                {{ $t('ok') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </template>
  </v-dialog>
</template>
