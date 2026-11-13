<script setup lang="ts">
  import type { Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useDisplay } from 'vuetify';

  type Props = {
    cancelButtonTestId: string;
  };

  const props: Props = defineProps<Props>();

  type Emits = {
    (event: 'cancel'): void;
  };
  const emit: Emits = defineEmits<Emits>();

  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();
</script>

<template>
  <v-row class="py-3 px-2 justify-center">
    <v-spacer class="hidden-sm-and-down" />
    <v-col
      cols="12"
      sm="6"
      md="auto"
    >
      <v-btn
        :block="mdAndDown"
        class="secondary"
        :data-testid="props.cancelButtonTestId"
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
      <!-- The submit button, optionally wrapped in a tooltip -->
      <slot />
    </v-col>
  </v-row>
</template>
