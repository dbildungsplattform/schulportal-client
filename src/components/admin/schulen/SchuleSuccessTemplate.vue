<script setup lang="ts">
  import { type OrganisationStore } from '@/stores/OrganisationStore';
  import { type Ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useDisplay } from 'vuetify';

  defineProps<{
    successMessage: string;
    preservedSchulform: string;
    organisationStore: OrganisationStore;
  }>();

  type Emits = {
    (event: 'onNavigateBackToSchuleManagement'): void;
    (event: 'onCreateAnotherSchule'): void;
  };

  const emit: Emits = defineEmits<Emits>();

  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();
  useI18n({ useScope: 'global' });

  const navigateToSchuleManagement = (): void => emit('onNavigateBackToSchuleManagement');
  const handleCreateAnotherSchule = (): void => emit('onCreateAnotherSchule');
</script>

<template>
  <v-container class="new-schule-success">
    <v-row class="justify-center">
      <v-col
        class="subtitle-1"
        cols="auto"
      >
        <span data-testid="schule-success-text">{{ successMessage }}</span>
      </v-col>
    </v-row>
    <v-row class="justify-center">
      <v-col cols="auto">
        <v-icon
          small
          color="#1EAE9C"
          data-testid="schule-success-icon"
          icon="mdi-check-circle"
        />
      </v-col>
    </v-row>
    <v-row class="justify-center">
      <v-col
        class="subtitle-2"
        cols="auto"
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
      <v-col class="text-body">
        <span data-testid="created-schule-form"> {{ preservedSchulform }}</span>
      </v-col>
    </v-row>
    <v-row>
      <v-col
        class="text-body bold text-right"
        data-testid="created-schule-dienststellennummer-label"
      >
        {{ $t('admin.schule.dienststellennummer') }}:
      </v-col>
      <v-col class="text-body">
        <span data-testid="created-schule-dienststellennummer">{{ organisationStore?.createdSchule?.kennung }}</span>
      </v-col>
    </v-row>
    <v-row>
      <v-col
        class="text-body bold text-right"
        data-testid="created-schule-name-label"
      >
        {{ $t('admin.schule.schulname') }}:
      </v-col>
      <v-col class="text-body"
        ><span data-testid="created-schule-name">{{ organisationStore?.createdSchule?.name }}</span>
      </v-col>
    </v-row>
    <v-divider
      class="border-opacity-100 rounded my-6"
      color="#E5EAEF"
      thickness="6"
    />
    <v-row class="justify-end">
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
          {{ $t('nav.backToList') }}
        </v-btn>
      </v-col>
      <v-col
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
