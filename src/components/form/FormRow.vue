<script setup lang="ts">
  type Props = {
    errorLabel?: string | boolean;
    label?: string;
    isRequired?: boolean;
    labelForId: string;
    noTopMargin?: boolean;
    isAlignedWithRadio?: boolean;

    /**
     * Makes the content column stretch wider and start further left.
     * Useful for components like logo grids.
     */
    wideContent?: boolean;
  };

  withDefaults(defineProps<Props>(), {
    wideContent: false,
  });
</script>

<template>
  <div :class="noTopMargin ? '' : 'mt-8'">
    <v-row class="align-start">
      <!-- Label column -->
      <v-col
        :class="`${isAlignedWithRadio ? 'pb-sm-8 pt-sm-3 text-sm-right mb-sm-10' : 'pb-sm-8 pt-sm-3 text-sm-right'} ${wideContent ? 'ml-sm-5' : ''}`"
        cols="12"
        :sm="wideContent ? '1' : '5'"
      >
        <label
          :for="labelForId"
          :error="errorLabel"
          :required="isRequired"
        >
          {{ label }}
        </label>
      </v-col>

      <!-- Content column -->
      <v-col
        class="py-0"
        cols="12"
        :sm="wideContent ? '10' : '7'"
      >
        <slot />
      </v-col>
    </v-row>
  </div>
</template>

<style scoped></style>
