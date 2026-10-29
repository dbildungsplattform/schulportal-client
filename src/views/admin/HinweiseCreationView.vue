<script setup lang="ts">
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import FormWrapper from '@/components/form/FormWrapper.vue';
  import TextEditor from '@/components/text-editor/TextEditor.vue';
  import { MeldungStatus, useMeldungStore, type Meldung, type MeldungStore } from '@/stores/MeldungStore';
  import { toTypedSchema } from '@vee-validate/yup';
  import { useForm, type BaseFieldProps, type FormContext, type TypedSchema } from 'vee-validate';
  import { computed, onBeforeMount, onUnmounted, ref, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import {
    onBeforeRouteLeave,
    useRouter,
    type NavigationGuardNext,
    type RouteLocationNormalized,
    type Router,
  } from 'vue-router';
  import { useDisplay } from 'vuetify';
  import { object, string } from 'yup';

  const router: Router = useRouter();
  const { t }: Composer = useI18n({ useScope: 'global' });
  const { smAndDown }: { smAndDown: Ref<boolean> } = useDisplay();
  const meldungStore: MeldungStore = useMeldungStore();
  const newsboxMeldung: ComputedRef<Meldung | undefined> = computed(() => meldungStore.meldungen[0]);
  const validationSchema: TypedSchema = toTypedSchema(
    object({
      meldungText: string().max(2000, t('admin.hinweise.rules.max')).min(1, t('admin.hinweise.rules.min')),
    }),
  );

  const vuetifyConfig = (state: {
    errors: Array<string>;
  }): { props: { error: boolean; 'error-messages': Array<string> } } => ({
    props: {
      error: !!state.errors.length,
      'error-messages': state.errors,
    },
  });

  type NewsboxForm = {
    meldungText: string;
  };

  const { defineField, handleSubmit, resetForm }: FormContext = useForm<NewsboxForm>({
    validationSchema,
    validateOnMount: false,
  });

  const [meldungText]: [Ref<string>, Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>] =
    defineField('meldungText', vuetifyConfig);

  const publishOrUnpublishButton: ComputedRef<string> = computed(() => {
    return !newsboxMeldung.value || newsboxMeldung.value.status === MeldungStatus.NICHT_VEROEFFENTLICHT
      ? t('admin.hinweise.publish')
      : t('admin.hinweise.publishEnd');
  });

  const showUnsavedChangesDialog: Ref<boolean> = ref(false);
  let blockedNext: () => void = () => {
    /* empty */
  };

  const onSubmit: (e?: Event) => Promise<Promise<void> | undefined> = handleSubmit(async () => {
    await meldungStore.createOrUpdateMeldung({
      ...newsboxMeldung.value,
      text: meldungText.value,
      status:
        !newsboxMeldung.value || newsboxMeldung.value.status === MeldungStatus.NICHT_VEROEFFENTLICHT
          ? MeldungStatus.VEROEFFENTLICHT
          : MeldungStatus.NICHT_VEROEFFENTLICHT,
    });
    await meldungStore.getAllMeldungen();
  });

  const onCloseDialog = (): void => {
    window.history.go(-1);
  };

  function handleConfirmUnsavedChanges(): void {
    blockedNext();
    meldungStore.errorCode = '';
  }

  const refreshPage = (): void => {
    router.go(0);
  };

  const formWasChanged = (): boolean => {
    return meldungText.value !== newsboxMeldung.value?.text;
  };

  function preventNavigation(event: BeforeUnloadEvent): void {
    if (formWasChanged()) {
      return;
    }
    event.preventDefault();
    /* Chrome requires returnValue to be set. */
    event.returnValue = '';
  }

  onBeforeMount(async () => {
    await meldungStore.getAllMeldungen();
    if (newsboxMeldung.value) {
      meldungText.value = newsboxMeldung.value.text;
    }
    /* listen for browser changes and prevent them when form is dirty */
    window.addEventListener('beforeunload', preventNavigation);
  });

  onBeforeRouteLeave((_to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    if (formWasChanged()) {
      showUnsavedChangesDialog.value = true;
      blockedNext = next;
    } else {
      next();
    }
  });

  onUnmounted(() => {
    window.removeEventListener('beforeunload', preventNavigation);
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
      :header="$t('admin.hinweise.hinweiseTexte')"
      :closable="true"
      :padded="true"
      :show-close-text="true"
      @on-close-clicked="onCloseDialog"
    >
      <FormWrapper
        id="newsbox-form"
        :confirm-unsaved-changes-action="handleConfirmUnsavedChanges"
        :create-button-label="$t('admin.schultraeger.create')"
        :discard-button-label="$t('admin.schultraeger.discard')"
        :hide-actions="true"
        :on-submit="onSubmit"
        :on-discard="resetForm"
        :show-unsaved-changes-dialog="showUnsavedChangesDialog"
        @on-show-dialog-change="(value?: boolean) => (showUnsavedChangesDialog = value || false)"
      >
        <SpshAlert
          v-if="meldungStore.errorCode"
          :model-value="!!meldungStore.errorCode"
          :title="$t(`admin.hinweise.title.${meldungStore.errorCode}`)"
          :type="'error'"
          :closable="false"
          :text="$t(`admin.hinweise.errors.${meldungStore.errorCode}`)"
          :show-button="true"
          :button-text="t('refreshData')"
          :button-action="refreshPage"
        />
        <v-row>
          <v-col cols="12">
            <h3 class="headline-3 mb-4">
              {{ $t('admin.hinweise.newsbox') }}
            </h3>
            In HinweiseCreationView soll der TextEditor zu sehen sein.
            <TextEditor
              :limit="2000"
              v-model="meldungText"
            />
          </v-col>
        </v-row>

        <v-row class="justify-end">
          <v-col
            cols="12"
            sm="12"
            md="auto"
          >
            <v-btn
              data-testid="submit-newsbox"
              :block="smAndDown"
              :disabled="meldungStore.loading"
              class="primary"
              type="submit"
              @click="onSubmit"
            >
              {{ publishOrUnpublishButton }}
            </v-btn>
          </v-col>
        </v-row>
      </FormWrapper>
    </LayoutCard>
  </div>
</template>

<style></style>
