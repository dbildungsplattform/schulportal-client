<script setup lang="ts">
  import SuccessIcon from '@/components/icons/SuccessIcon.vue';
  import SpshDivider from '@/components/layout/SpshDivider.vue';
  import { type VNode } from 'vue';

  defineSlots<{
    message(): VNode[];
    icon?(): VNode[];
    description(): VNode[];
    default(): VNode[];
    actions(): VNode[];
  }>();
</script>

<template>
  <v-container>
    <v-row class="justify-center">
      <v-col
        class="subtitle-1"
        cols="auto"
      >
        <slot name="message" />
      </v-col>
    </v-row>
    <v-row class="justify-center">
      <v-col cols="auto">
        <slot name="icon">
          <SuccessIcon />
        </slot>
      </v-col>
    </v-row>
    <v-row class="justify-center">
      <v-col
        class="subtitle-2"
        cols="auto"
      >
        <slot name="description" />
      </v-col>
    </v-row>
    <slot />
    <SpshDivider />
    <v-row class="justify-end">
      <slot name="actions" />
    </v-row>
  </v-container>
</template>
