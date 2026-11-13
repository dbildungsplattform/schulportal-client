<script setup lang="ts">
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import type { ModelRef, Ref } from 'vue';
  import { useDisplay } from 'vuetify';

  type Props = {
    header: string;
    closeButtonTestId?: string;
  };

  const props: Props = defineProps<Props>();
  const isVisible: ModelRef<boolean> = defineModel<boolean>({ required: true });

  type Emits = {
    (event: 'close'): void;
  };
  const emit: Emits = defineEmits<Emits>();

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
      @on-close-clicked="emit('close')"
    >
      <v-card-text>
        <slot name="message" />
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
              :data-testid="props.closeButtonTestId"
              @click.stop="emit('close')"
            >
              {{ $t('close') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-actions>
    </LayoutCard>
  </v-dialog>
</template>
