<script setup lang="ts">
  import { Organisation } from '@/stores/OrganisationStore';
  import { type Ref } from 'vue';
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
</script>

<template>
  <v-container class="new-schule-success">
    <v-row class="justify-center">
      <v-col
        cols="auto"
        class="subtitle-1 pre-line text-center"
        data-testid="schule-success-text"
      >
        {{ successMessage }}
      </v-col>
    </v-row>

    <v-row class="justify-center">
      <v-col cols="auto">
        <v-icon
          color="success"
          data-testid="schule-success-icon"
          icon="mdi-check-circle"
        />
      </v-col>
    </v-row>

    <v-row class="justify-center">
      <v-col
        cols="auto"
        class="subtitle-2"
        data-testid="following-data-created-text"
      >
        {{ $t('admin.followingDataCreated') }}
      </v-col>
    </v-row>

    <v-row>
      <v-col
        class="text-body bold text-right"
        data-testid="created-schule-form-label"
      >
        {{ $t('admin.schule.schulform') }}:
      </v-col>

      <v-col
        class="text-body"
        data-testid="created-schule-form"
      >
        {{ findSchultraegerName(followingDataChanged?.administriertVon) }}
      </v-col>
    </v-row>

    <v-row>
      <v-col
        class="text-body bold text-right"
        data-testid="created-schule-dienststellennummer-label"
      >
        {{ $t('admin.schule.dienststellennummer') }}:
      </v-col>

      <v-col
        class="text-body"
        data-testid="created-schule-dienststellennummer"
      >
        {{ followingDataChanged?.kennung }}
      </v-col>
    </v-row>

    <v-row>
      <v-col
        class="text-body bold text-right"
        data-testid="created-schule-name-label"
      >
        {{ $t('admin.schule.schulname') }}:
      </v-col>

      <v-col
        class="text-body"
        data-testid="created-schule-name"
        >{{ followingDataChanged?.name }}
      </v-col>
    </v-row>

    <v-row>
      <v-col
        class="text-body bold text-right"
        data-testid="created-schule-email-label"
      >
        {{ $t('admin.schule.emailAdresse') }}:
      </v-col>

      <v-col
        class="text-body"
        data-testid="created-schule-email"
        >{{ followingDataChanged?.emailAdress }}
      </v-col>
    </v-row>

    <v-divider
      class="border-opacity-100 rounded my-6"
      color="#E5EAEF"
      thickness="6"
    />

    <v-row class="justify-end">
      <v-col
        v-if="isEditMode"
        cols="12"
        sm="6"
        md="auto"
      >
        <v-btn
          class="secondary"
          data-testid="back-to-schule-button"
          :block="mdAndDown"
          @click="navigateToSchuleDetails"
        >
          {{ $t('admin.schule.backToSchule') }}
        </v-btn>
      </v-col>

      <v-col
        cols="12"
        sm="6"
        md="auto"
      >
        <v-btn
          class="secondary"
          data-testid="back-to-list-button"
          :block="mdAndDown"
          @click="navigateToSchuleManagement"
        >
          {{ isEditMode ? $t('admin.schule.backToSchuleList') : $t('nav.backToList') }}
        </v-btn>
      </v-col>

      <v-col
        v-if="!isEditMode"
        cols="12"
        sm="6"
        md="auto"
      >
        <v-btn
          class="primary button"
          data-testid="create-another-schule-button"
          :block="mdAndDown"
          @click="handleCreateAnotherSchule"
        >
          {{ $t('admin.schule.createAnother') }}
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
