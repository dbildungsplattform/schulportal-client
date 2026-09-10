<script setup lang="ts">
  import { Organisation } from '@/stores/OrganisationStore';
  import { type Ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useDisplay } from 'vuetify';

  type Props = {
    successMessage: string;
    followingDataChanged: Organisation | undefined | null;
    schultraegerList: Organisation[] | undefined;
    isEditMode: boolean;
  };

  const props: Props = defineProps<Props>();

  type Emits = {
    (event: 'onNavigateBackToSchuleManagement'): void;
    (event: 'onNavigateToSchuleForm'): void;
  };

  const emit: Emits = defineEmits<Emits>();

  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();
  useI18n({ useScope: 'global' });

  const navigateToSchuleManagement = (): void => emit('onNavigateBackToSchuleManagement');
  const handleCreateAnotherSchule = (): void => emit('onNavigateToSchuleForm');

  const findSchultraegerName = (id: string | undefined | null): string => {
    if (!id || !props.schultraegerList) {
      return '';
    }
    const schultraeger: Organisation | undefined = props.schultraegerList.find((s) => s.id === id);

    return schultraeger ? schultraeger.name : '';
  };
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
        <span data-testid="created-schule-form">
          {{ findSchultraegerName(followingDataChanged?.administriertVon) }}</span
        >
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
        <span data-testid="created-schule-dienststellennummer">{{ followingDataChanged?.kennung }}</span>
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
        ><span data-testid="created-schule-name">{{ followingDataChanged?.name }}</span>
      </v-col>
    </v-row>
    <v-row>
      <v-col
        class="text-body bold text-right"
        data-testid="created-schule-email-label"
      >
        {{ $t('admin.schule.emailAdresse') }}:
      </v-col>
      <v-col class="text-body"
        ><span data-testid="created-schule-email">{{ followingDataChanged?.emailAdress }}</span>
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
          {{ isEditMode ? $t('edit') : $t('admin.schule.createAnother') }}
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
