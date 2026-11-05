<script setup lang="ts">
  import { computed, type Ref, type WritableComputedRef } from 'vue';
  import { useDisplay } from 'vuetify';
  import LayoutCard from '../cards/LayoutCard.vue';

  // Define the type for the props
  type Props = {
    confirmUnsavedChangesAction?: () => void;
    canCommit?: boolean;
    createButtonLabel: string;
    discardButtonLabel: string;
    hideActions?: boolean;
    hideNotice?: boolean;
    id: string;
    isLoading?: boolean;
    onDiscard: () => void;
    onSubmit: () => void;
    showUnsavedChangesDialog?: boolean;
    centerButtons?: boolean;
  };
  // Type annotation for props
  type PropsWithDefaults = Props & {
    canCommit: boolean;
  };

  // Explicitly type the props with default values
  const props: PropsWithDefaults = withDefaults(defineProps<Props>(), {
    canCommit: true,
  });

  const emit: (event: 'onShowDialogChange', value?: boolean) => void = defineEmits(['onShowDialogChange']);

  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  const showDialogValue: WritableComputedRef<boolean | undefined> = computed({
    get() {
      return props.showUnsavedChangesDialog;
    },
    set(newValue: boolean | undefined) {
      emit('onShowDialogChange', newValue);
    },
  });
</script>

<template>
  <v-form
    :data-testid="id"
    @submit.prevent="onSubmit"
  >
    <v-container class="px-3 px-sm-16">
      <v-row
        v-if="!hideActions && !hideNotice"
        class="align-center flex-nowrap pb-4"
        no-gutters
      >
        <v-icon
          aria-hidden="true"
          icon="mdi-alert-circle-outline"
          size="small"
          class="mr-2"
        ></v-icon>
        <label
          class="subtitle-2"
          data-testid="mandatory-fields-notice"
          >{{ $t('admin.mandatoryFieldsNotice') }}</label
        >
      </v-row>
      <v-container class="px-lg-16">
        <slot />
      </v-container>
    </v-container>
    <v-divider
      v-if="!hideActions"
      class="border-opacity-100 rounded"
      color="#E5EAEF"
      thickness="5px"
    />
    <v-row
      v-if="!hideActions"
      class="px-2 py-3 justify-center"
    >
      <v-spacer
        v-if="!centerButtons"
        class="hidden-sm-and-down"
      />
      <v-col
        cols="12"
        sm="6"
        md="auto"
      >
        <v-btn
          :block="mdAndDown"
          class="secondary"
          :data-testid="`${id}-discard-button`"
          @click.stop="onDiscard"
        >
          {{ discardButtonLabel }}
        </v-btn>
      </v-col>
      <v-col
        cols="12"
        sm="6"
        md="auto"
      >
        <v-btn
          :block="mdAndDown"
          class="primary"
          :data-testid="`${id}-submit-button`"
          :disabled="!canCommit || isLoading"
          type="submit"
        >
          {{ createButtonLabel }}
        </v-btn>
      </v-col>
    </v-row>
  </v-form>

  <!-- Warning dialog for unsaved changes -->
  <v-dialog
    ref="unsaved-changes-dialog"
    v-model="showDialogValue"
    data-testid="unsaved-changes-dialog"
    persistent
  >
    <LayoutCard :header="$t('unsavedChanges.title')">
      <v-card-text>
        <v-container>
          <v-row class="text-body bold justify-center">
            <v-col class="text-center">
              <p data-testid="unsaved-changes-warning-text">
                {{ $t('unsavedChanges.message') }}
              </p>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-row class="justify-center">
          <v-col
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              class="secondary button"
              data-testid="confirm-unsaved-changes-button"
              :block="mdAndDown"
              @click.stop="confirmUnsavedChangesAction"
            >
              {{ $t('yes') }}
            </v-btn>
          </v-col>
          <v-col
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              class="primary button"
              data-testid="close-unsaved-changes-dialog-button"
              :block="mdAndDown"
              @click.stop="showDialogValue = false"
            >
              {{ $t('no') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-actions>
    </LayoutCard>
  </v-dialog>
</template>

<style></style>
