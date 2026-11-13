<script setup lang="ts">
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import type { ModelRef, Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useDisplay } from 'vuetify';

  type Props = {
    header: string;
    confirmButtonTestId: string;
    confirmFirst?: boolean;
  };

  const props: Props = withDefaults(defineProps<Props>(), { confirmFirst: false });
  const isVisible: ModelRef<boolean> = defineModel<boolean>({ required: true });

  type Emits = {
    (event: 'confirm'): void;
    (event: 'cancel'): void;
  };
  const emit: Emits = defineEmits<Emits>();

  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();
</script>

<template>
  <v-dialog
    v-model="isVisible"
    persistent
    max-width="600px"
  >
    <LayoutCard
      :closable="true"
      :header="props.header"
      @on-close-clicked="emit('cancel')"
    >
      <v-card-text>
        <v-container>
          <slot name="message" />
        </v-container>
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-row class="justify-center">
          <template v-if="props.confirmFirst">
            <v-col
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="mdAndDown"
                class="primary"
                :data-testid="props.confirmButtonTestId"
                @click.stop="emit('confirm')"
              >
                {{ t('yes') }}
              </v-btn>
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="mdAndDown"
                class="secondary"
                @click.stop="emit('cancel')"
              >
                {{ t('no') }}
              </v-btn>
            </v-col>
          </template>
          <template v-else>
            <v-col
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="mdAndDown"
                class="secondary"
                @click.stop="emit('cancel')"
              >
                {{ t('no') }}
              </v-btn>
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="mdAndDown"
                class="primary"
                :data-testid="props.confirmButtonTestId"
                @click.stop="emit('confirm')"
              >
                {{ t('yes') }}
              </v-btn>
            </v-col>
          </template>
        </v-row>
      </v-card-actions>
    </LayoutCard>
  </v-dialog>
</template>
