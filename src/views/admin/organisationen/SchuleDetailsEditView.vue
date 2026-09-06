<script setup lang="ts">
  import LabeledField from '@/components/admin/LabeledField.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { OrganisationStore, useOrganisationStore } from '@/stores/OrganisationStore';
  import { onMounted, Ref } from 'vue';
  import { Composer, useI18n } from 'vue-i18n';
  import { useRoute, useRouter, type RouteLocationNormalizedLoaded, type Router } from 'vue-router';
  import { useDisplay } from 'vuetify';

  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();
  const organisationStore: OrganisationStore = useOrganisationStore();

  const router: Router = useRouter();
  const route: RouteLocationNormalizedLoaded = useRoute();
  const { t }: Composer = useI18n({ useScope: 'global' });
  const currentSchuleId: string = route.params['id'] as string;

  const navigateToSchulenÜbersicht = (): void => {
    router.push({ name: 'schule-management' });
  };

  const navigateToSchuleBearbeiten = (): void => {
    router.push({ name: 'schule-edit', params: { id: currentSchuleId } });
  };

  onMounted(async () => {
    await organisationStore.fetchSchulDetails(currentSchuleId);
  });
</script>
<template>
  <div class="admin">
    <h1
      class="text-center headline"
      data-testid="admin-headline"
    >
      {{ $t('admin.headline') }}
    </h1>
    <LayoutCard
      :closable="!organisationStore.errorCode"
      data-testid="schule-details-card"
      :header="t('admin.schule.edit')"
      @onCloseClicked="navigateToSchulenÜbersicht"
      :padded="true"
      :showCloseText="true"
    >
      <div v-if="!organisationStore.errorCode">
        <v-container
          class="px-3 px-sm-16"
          data-testid="schule-details-container"
        >
          <div v-if="organisationStore.currentSchule">
            <v-row class="mt-2">
              <v-col
                cols="12"
                md="6"
              >
                <div class="compact-spacing">
                  <LabeledField
                    :label="t('admin.schule.dienststellennummer')"
                    :value="organisationStore.currentSchule.kennung ?? ''"
                    test-id="schule-dienststellennummer"
                  />
                  <LabeledField
                    :label="t('admin.schule.schulname')"
                    :value="organisationStore.currentSchule.name"
                    test-id="schule-name"
                  />
                  <LabeledField
                    :label="t('admin.schule.emailAdresse')"
                    :value="organisationStore.currentSchule.emailAdresse ?? ''"
                    test-id="schule-email"
                  />
                </div>
              </v-col>
              <v-col
                cols="12"
                md="6"
              >
                <div class="compact-spacing">
                  <LabeledField
                    :label="t('admin.schule.schulform')"
                    :value="
                      organisationStore.currentSchule?.schultraegerform?.name ??
                      t('admin.organisation.unknownOrganisation')
                    "
                    test-id="schultraegerform"
                  />
                  <LabeledField
                    :label="t('admin.schule.itsLearningActive')"
                    :value="organisationStore.currentSchule.itslearningEnabled ? t('yes') : t('no')"
                    test-id="schule-itslearning-enabled"
                  />
                </div>
              </v-col>
            </v-row>
            <v-row>
              <v-col
                cols="12"
                offset-md="8"
              >
                <v-btn
                  class="primary ml-lg-8"
                  data-testid="klasse-edit-button"
                  :block="mdAndDown"
                  @click="navigateToSchuleBearbeiten"
                >
                  {{ $t('save') }}
                </v-btn>
              </v-col>
            </v-row>
          </div>
          <div v-else-if="organisationStore.loading">
            <v-progress-circular indeterminate></v-progress-circular>
          </div>
        </v-container>
      </div>
    </LayoutCard>
  </div>
</template>
