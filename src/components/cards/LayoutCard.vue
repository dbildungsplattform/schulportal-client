<script setup lang="ts">
  defineProps<{
    closable?: boolean;
    header: string;
    padded?: boolean;
    showCloseText?: boolean;
    headlineTestId?: string;
    subCards?: boolean;
    headerHoverText?: string;
    variant?: 'text' | 'elevated' | 'outlined' | 'tonal' | 'flat';
  }>();
</script>

<template>
  <v-card
    :variant="variant"
    class="layout-card pb-1"
  >
    <v-row
      align="center"
      class="flex-nowrap"
    >
      <v-col
        cols="auto"
        class="pl-md-6 pl-4 my-2"
      >
        <h2
          class="text-left ellipsis-wrapper ellipsis-wrapper--wide"
          :class="subCards ? 'subtitle-1' : 'headline-2'"
          :data-testid="headlineTestId ?? 'layout-card-headline'"
          :title="headerHoverText"
        >
          {{ header }}
        </h2>
      </v-col>
      <v-spacer v-if="closable" />
      <v-col
        v-if="closable"
        cols="2"
        class="text-right mr-md-3 mr-8"
      >
        <v-btn
          class="hidden-sm-and-down"
          data-testid="close-layout-card-button"
          :ripple="false"
          variant="text"
          @click.stop="$emit('onCloseClicked')"
        >
          <span v-if="showCloseText">
            {{ $t('close') }}
          </span>
          <template #append>
            <v-icon
              icon="mdi-close"
              size="x-large"
            />
          </template>
        </v-btn>
        <v-btn
          class="hidden-md-and-up"
          density="compact"
          icon
          variant="text"
        >
          <v-icon
            icon="mdi-close"
            size="x-large"
            @click.stop="$emit('onCloseClicked')"
          />
        </v-btn>
      </v-col>
    </v-row>
    <v-divider
      class="border-opacity-100 rounded"
      color="#1EAE9C"
      thickness="5px"
    />
    <div>
      <slot />
    </div>
  </v-card>
</template>
