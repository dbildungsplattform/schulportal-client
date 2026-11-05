<script setup lang="ts">
  import { computed, onMounted, ref, type ComputedRef, type Ref } from 'vue';
  import { onBeforeRouteLeave, useRoute, useRouter, type RouteLocationNormalizedLoaded, type Router } from 'vue-router';
  import LabeledField from '@/components/admin/LabeledField.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import {
    OrganisationsTyp,
    useOrganisationStore,
    type Organisation,
    type OrganisationStore,
  } from '@/stores/OrganisationStore';

  const organisationStore: OrganisationStore = useOrganisationStore();
  const route: RouteLocationNormalizedLoaded = useRoute();
  const router: Router = useRouter();
  const loading: Ref<boolean> = ref(true);

  const parentOrganisation: ComputedRef<Organisation | undefined> = computed((): Organisation | undefined =>
    organisationStore.parentOrganisationen.find(
      (parent: Organisation): boolean => parent.typ === OrganisationsTyp.Land,
    ),
  );

  function navigateToBehoerdenList(): void {
    router.push({ name: 'behoerde-management' });
  }

  onMounted(async (): Promise<void> => {
    organisationStore.$patch({ currentOrganisation: null, parentOrganisationen: [] });
    await organisationStore.getOrganisationById(route.params['id'] as string);
    if (!organisationStore.errorCode) {
      if (organisationStore.currentOrganisation?.typ !== OrganisationsTyp.Behoerde) {
        await router.replace({ name: 'not-found' });
        return;
      }
      await organisationStore.getParentOrganisationsByIds([route.params['id'] as string]);
    }
    loading.value = false;
  });

  onBeforeRouteLeave((): void => {
    organisationStore.errorCode = '';
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
      :header="$t('admin.behoerde.edit')"
      headlineTestId="behoerde-details-headline"
      closable
      padded
      show-close-text
      @on-close-clicked="navigateToBehoerdenList"
    >
      <SpshAlert
        v-if="organisationStore.errorCode"
        data-testid="behoerde-details-error"
        :model-value="true"
        :title="$t('admin.behoerde.detailsLoadingErrorTitle')"
        :text="$t('admin.behoerde.detailsLoadingErrorText')"
        type="error"
        :closable="false"
        :show-button="true"
        :button-text="$t('nav.backToList')"
        :button-action="navigateToBehoerdenList"
      />
      <v-progress-circular
        v-else-if="loading"
        data-testid="behoerde-details-loading"
        indeterminate
        :aria-label="$t('loadingData')"
      />
      <v-container
        v-else-if="organisationStore.currentOrganisation"
        class="px-3 px-sm-16"
        data-testid="behoerde-details-container"
      >
        <v-row class="mt-2">
          <v-col
            cols="12"
            md="6"
          >
            <LabeledField
              :label="$t('admin.behoerde.zustaendigkeitsbereich')"
              :value="parentOrganisation?.name ?? $t('admin.organisation.unknownOrganisation')"
              test-id="behoerde-zustaendigkeitsbereich"
            />
          </v-col>
          <v-col
            cols="12"
            md="6"
          >
            <LabeledField
              :label="$t('admin.behoerde.name')"
              :value="organisationStore.currentOrganisation.name"
              test-id="behoerde-name"
            />
          </v-col>
        </v-row>
      </v-container>
    </LayoutCard>
  </div>
</template>
