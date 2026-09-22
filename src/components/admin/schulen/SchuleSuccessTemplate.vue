<script setup lang="ts">
  import { Organisation } from '@/stores/OrganisationStore';
import { computed, type ComputedRef, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import { SchuleSuccessTemplateProps } from './types';

  const props: SchuleSuccessTemplateProps = defineProps<SchuleSuccessTemplateProps>();

  type Emits = {
    (event: 'onNavigateBackToSchuleManagement'): void;
    (event: 'onNavigateToSchuleForm'): void;
    (event: 'onNavigateToSchuleDetails'): void;
  };

  const emit: Emits = defineEmits<Emits>();

  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();
  useI18n({ useScope: 'global' });

  const navigateToSchuleManagement = (): void => emit('onNavigateBackToSchuleManagement');
  const handleCreateAnotherSchule = (): void => emit('onNavigateToSchuleForm');
  const navigateToSchuleDetails = (): void => emit('onNavigateToSchuleDetails');

  const findSchultraegerName = (id: string | undefined | null): string => {
    if (!id || !props.schultraegerList) {
      return '';
    }
    const schultraeger: Organisation | undefined = props.schultraegerList.find((s: Organisation) => s.id === id);

    return schultraeger ? schultraeger.name : '';
  };

  type CreatedDataRow = {
    labelKey: string;
    labelTestId: string;
    valueTestId: string;
    value: string;
  };

  const createdDataRows: ComputedRef<CreatedDataRow[]> = computed((): CreatedDataRow[] => [
    {
      labelKey: 'admin.schule.schulform',
      labelTestId: 'created-schule-form-label',
      valueTestId: 'created-schule-form',
      value: findSchultraegerName(props.followingDataChanged?.administriertVon),
    },
    {
      labelKey: 'admin.schule.dienststellennummer',
      labelTestId: 'created-schule-dienststellennummer-label',
      valueTestId: 'created-schule-dienststellennummer',
      value: props.followingDataChanged?.kennung ?? '',
    },
    {
      labelKey: 'admin.schule.schulname',
      labelTestId: 'created-schule-name-label',
      valueTestId: 'created-schule-name',
      value: props.followingDataChanged?.name ?? '',
    },
    {
      labelKey: 'admin.schule.emailAdresse',
      labelTestId: 'created-schule-email-label',
      valueTestId: 'created-schule-email',
      value: props.followingDataChanged?.emailAdress ?? '',
    },
  ]);

  type ContextButtonConfig = {
    testId: string;
    variant: string;
    labelKey: string;
    onClick: () => void;
  };

  const backToSchuleButton: ContextButtonConfig = {
    testId: 'back-to-schule-button',
    variant: 'secondary',
    labelKey: 'admin.schule.backToSchule',
    onClick: navigateToSchuleDetails,
  };

  const backToListButton: ComputedRef<ContextButtonConfig> = computed((): ContextButtonConfig => ({
    testId: 'back-to-list-button',
    variant: 'secondary',
    labelKey: props.isEditMode ? 'admin.schule.backToSchuleList' : 'nav.backToList',
    onClick: navigateToSchuleManagement,
  }));

  const createAnotherButton: ContextButtonConfig = {
    testId: 'create-another-schule-button',
    variant: 'primary button',
    labelKey: 'admin.schule.createAnother',
    onClick: handleCreateAnotherSchule,
  };

  const buttons: ComputedRef<ContextButtonConfig[]> = computed((): ContextButtonConfig[] =>
    props.isEditMode
      ? [backToSchuleButton, backToListButton.value]
      : [backToListButton.value, createAnotherButton],
  );
</script>

<template>
  <v-container class="new-schule-success">
    <!-- Success Message Section -->
    <v-row class="justify-center">
      <v-col
        cols="auto"
        class="subtitle-1 pre-line text-center"
        data-testid="schule-success-text"
      >
        {{ successMessage }}
      </v-col>
    </v-row>

    <!-- Success Icon Section -->
    <v-row class="justify-center">
      <v-col cols="auto">
        <v-icon
          color="success"
          data-testid="schule-success-icon"
          icon="mdi-check-circle"
        />
      </v-col>
    </v-row>

    <!-- Following Data Created Section -->
    <v-row class="justify-center">
      <v-col
        cols="auto"
        class="subtitle-2"
        data-testid="following-data-created-text"
      >
        {{ $t('admin.followingDataCreated') }}
      </v-col>
    </v-row>

    <!-- Data Section -->
    <v-row
      v-for="(row, index) in createdDataRows"
      :key="index"
    >
      <v-col
        class="text-body bold text-right"
        :data-testid="row.labelTestId"
      >
        {{ $t(row.labelKey) }}:
      </v-col>

      <v-col
        class="text-body"
        :data-testid="row.valueTestId"
      >
        {{ row.value }}
      </v-col>
    </v-row>

    <!-- Divider Section -->
    <v-divider
      class="border-opacity-100 rounded my-6"
      color="#E5EAEF"
      thickness="6"
    />

    <!-- Buttons Section -->
    <v-row class="justify-end">
      <v-col
        v-for="button in buttons"
        :key="button.testId"
        cols="12"
        sm="6"
        md="auto"
      >
        <v-btn
          :class="button.variant"
          :data-testid="button.testId"
          :block="mdAndDown"
          @click="button.onClick"
        >
          {{ $t(button.labelKey) }}
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
