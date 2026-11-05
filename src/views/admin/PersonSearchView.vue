<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref, watch, type ComputedRef, type Ref } from 'vue';
  import { useForm, type BaseFieldProps, type TypedSchema, type FormContext } from 'vee-validate';
  import { object, ObjectSchema, string } from 'yup';
  import { toTypedSchema } from '@vee-validate/yup';
  import {
    EmailStatus,
    usePersonStore,
    type PersonLandesbediensteterSearchPersonenkontextResponse,
    type PersonLandesbediensteterSearchResponse,
    type PersonStore,
  } from '@/stores/PersonStore';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import {
    onBeforeRouteLeave,
    useRouter,
    type NavigationGuardNext,
    type RouteLocationNormalized,
    type Router,
  } from 'vue-router';
  import { type Composer, useI18n } from 'vue-i18n';
  import FormWrapper from '@/components/form/FormWrapper.vue';
  import { useDisplay } from 'vuetify';
  import { mapToLabelValues, type LabelValue, type SchulDaten } from '@/utils/personalDataMapper';
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';

  const router: Router = useRouter();
  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  const showUnsavedChangesDialog: Ref<boolean> = ref(false);
  let blockedNext: () => void = () => {
    /* empty */
  };

  const personStore: PersonStore = usePersonStore();

  enum SearchType {
    KoPers = 'kopers',
    Email = 'email',
    Username = 'username',
    Name = 'name',
  }

  // Default selection is always KoPers
  const searchType: Ref<SearchType> = ref<SearchType>(SearchType.KoPers);
  const showErrorDialog: Ref<boolean> = ref(false);
  const errorDialogMessage: Ref<string> = ref('');

  type PersonSearchForm = {
    selectedKopers?: string | null;
    selectedEmail?: string | null;
    selectedUsername?: string | null;
    selectedVorname?: string | null;
    selectedNachname?: string | null;
  };

  const baseSchema: ObjectSchema<PersonSearchForm> = object({
    selectedKopers: string().optional().nullable(),
    selectedEmail: string().optional().nullable(),
    selectedUsername: string().optional().nullable(),
    selectedVorname: string().nullable(),
    selectedNachname: string().nullable(),
  }).test(
    'vorname-nachname-pair',
    '',
    function (values: { selectedVorname?: string | null; selectedNachname?: string | null }) {
      const {
        selectedVorname,
        selectedNachname,
      }: { selectedVorname?: string | null; selectedNachname?: string | null } = values;

      if (selectedVorname && !selectedNachname) {
        return this.createError({
          path: 'selectedNachname',
          message: t('admin.person.rules.familienname.required'),
        });
      }

      if (selectedNachname && !selectedVorname) {
        return this.createError({
          path: 'selectedVorname',
          message: t('admin.person.rules.vorname.required'),
        });
      }

      return true;
    },
  );

  const schema: TypedSchema = toTypedSchema(baseSchema);

  const vuetifyConfig = (state: {
    errors: Array<string>;
  }): { props: { error: boolean; 'error-messages': Array<string> } } => ({
    props: {
      error: !!state.errors.length,
      'error-messages': state.errors,
    },
  });

  const formContext: FormContext<PersonSearchForm, PersonSearchForm> = useForm<PersonSearchForm, PersonSearchForm>({
    validationSchema: schema,
  });

  const [selectedKopers, selectedKopersProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedKopers', vuetifyConfig);
  const [selectedEmail, selectedEmailProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedEmail', vuetifyConfig);
  const [selectedUsername, selectedUsernameProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedUsername', vuetifyConfig);
  const [selectedVorname, selectedVornameProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedVorname', vuetifyConfig);
  const [selectedNachname, selectedNachnameProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedNachname', vuetifyConfig);

  const isSearchDisabled: ComputedRef<boolean> = computed(() => {
    return !(
      selectedKopers.value ||
      selectedEmail.value ||
      selectedUsername.value ||
      selectedVorname.value ||
      selectedNachname.value
    );
  });

  // Watch for searchType changes to clear all fields when radio button changes
  watch(searchType, (_newSearchType: SearchType) => {
    // Clear all fields when switching between search types
    selectedKopers.value = '';
    selectedEmail.value = '';
    selectedUsername.value = '';
    selectedVorname.value = '';
    selectedNachname.value = '';
  });

  // Add watchers to clear other fields when one is changed
  watch(selectedKopers, (newValue: string | undefined) => {
    if (newValue) {
      selectedEmail.value = '';
      selectedUsername.value = '';
      selectedVorname.value = '';
      selectedNachname.value = '';
      searchType.value = SearchType.KoPers;
    }
  });

  watch(selectedEmail, (newValue: string | undefined) => {
    if (newValue) {
      selectedKopers.value = '';
      selectedUsername.value = '';
      selectedVorname.value = '';
      selectedNachname.value = '';
      searchType.value = SearchType.Email;
    }
  });

  watch(selectedUsername, (newValue: string | undefined) => {
    if (newValue) {
      selectedKopers.value = '';
      selectedEmail.value = '';
      selectedVorname.value = '';
      selectedNachname.value = '';
      searchType.value = SearchType.Username;
    }
  });

  // For name fields, clear other fields but allow both Vorname and Nachname to coexist
  watch(selectedVorname, (newValue: string | undefined) => {
    if (newValue) {
      selectedKopers.value = '';
      selectedEmail.value = '';
      selectedUsername.value = '';
      searchType.value = SearchType.Name;
    }
  });

  watch(selectedNachname, (newValue: string | undefined) => {
    if (newValue) {
      selectedKopers.value = '';
      selectedEmail.value = '';
      selectedUsername.value = '';
      searchType.value = SearchType.Name;
    }
  });

  const onSubmit: (e?: Event) => Promise<Promise<void> | undefined> = formContext.handleSubmit(async () => {
    switch (searchType.value) {
      case SearchType.KoPers:
        await personStore.getLandesbedienstetePerson({
          personalnummer: selectedKopers.value,
        });
        break;
      case SearchType.Email:
        await personStore.getLandesbedienstetePerson({
          primaryEmailAddress: selectedEmail.value,
        });
        break;
      case SearchType.Username:
        await personStore.getLandesbedienstetePerson({
          username: selectedUsername.value,
        });
        break;
      case SearchType.Name:
        await personStore.getLandesbedienstetePerson({
          vorname: selectedVorname.value,
          nachname: selectedNachname.value,
        });
        break;
    }

    // Check if the result is an empty array, if that's the case show the corresponding dialog
    if (
      Array.isArray(personStore.allLandesbedienstetePersonen) &&
      personStore.allLandesbedienstetePersonen.length === 0
    ) {
      errorDialogMessage.value = t('admin.person.stateEmployeeSearch.noPersonFoundMessage');
      showErrorDialog.value = true;
      personStore.allLandesbedienstetePersonen = [];
    }

    if (personStore.errorCode) {
      // If the search was successful but the person has no Kopers number or is manually locked, we get this error Code.
      if (personStore.errorCode === 'LANDESBEDIENSTETER_SEARCH_NO_PERSON_FOUND') {
        // Set the error code to empty to avoid showing the error message in the alert
        personStore.errorCode = '';
        errorDialogMessage.value = t('admin.person.stateEmployeeSearch.noPersonFoundMessage');
        showErrorDialog.value = true;
        personStore.allLandesbedienstetePersonen = [];
      }
      // Check if multiple persons were found we get an error Code.
      else if (personStore.errorCode === 'LANDESBEDIENSTETER_SEARCH_MULTIPLE_PERSONS_FOUND') {
        // Set the error code to empty to avoid showing the error message in the alert
        personStore.errorCode = '';
        errorDialogMessage.value = t('admin.person.stateEmployeeSearch.multiplePersonsFoundMessage');
        showErrorDialog.value = true;
        personStore.allLandesbedienstetePersonen = [];
      } else {
        // For any other error codes, we just show the error message in the alert
        errorDialogMessage.value = '';
        showErrorDialog.value = false;
        personStore.allLandesbedienstetePersonen = [];
      }
    }
  });

  const personalData: ComputedRef<LabelValue[]> = computed(() => {
    const person: PersonLandesbediensteterSearchResponse | undefined =
      personStore.allLandesbedienstetePersonen?.[0] ?? undefined;
    if (!person) {
      return [];
    }

    return mapToLabelValues(
      t,
      {
        vorname: person.vorname,
        familienname: person.familienname,
        username: person.username,
        personalnummer: person.personalnummer,
        emailStatus: {
          status: EmailStatus.Enabled,
          address: person.primaryEmailAddress,
        },
      },
      {
        includeKoPers: true,
        includeEmail: true,
      },
    );
  });

  const organisationenDaten: ComputedRef<SchulDaten[]> = computed(() => {
    const person: PersonLandesbediensteterSearchResponse | undefined =
      personStore.allLandesbedienstetePersonen?.[0] ?? undefined;
    if (!person) {
      return [];
    }
    return person.personenkontexte.map(
      (kontext: PersonLandesbediensteterSearchPersonenkontextResponse, index: number) => {
        const labelAndValues: LabelValue[] = [
          {
            label: t('profile.schule'),
            value: kontext.organisationName,
            testIdLabel: `organisation-label-${index + 1}`,
            testIdValue: `organisation-value-${index + 1}`,
          },
          {
            label: t('admin.rolle.rolle'),
            value: kontext.rolleName,
            testIdLabel: `rolle-label-${index + 1}`,
            testIdValue: `rolle-value-${index + 1}`,
          },
          {
            labelAbbr: t('profile.dienstStellenNummerAbbr'),
            label: t('profile.dienstStellenNummer'),
            value: kontext.organisationDstNr,
            testIdLabel: `dienststellennummer-label-${index + 1}`,
            testIdValue: `dienststellennummer-value-${index + 1}`,
          },
        ];

        return {
          title: kontext.organisationName,
          labelAndValues,
        };
      },
    );
  });

  function isFormDirty(): boolean {
    return (
      formContext.isFieldDirty('selectedKopers') ||
      formContext.isFieldDirty('selectedEmail') ||
      formContext.isFieldDirty('selectedUsername') ||
      formContext.isFieldDirty('selectedVorname') ||
      formContext.isFieldDirty('selectedNachname')
    );
  }

  async function navigateBackToPersonSearchForm(): Promise<void> {
    if (personStore.errorCode === 'REQUIRED_STEP_UP_LEVEL_NOT_MET') {
      formContext.resetForm();
      await router.push({ name: 'search-person-limited' }).then(() => {
        router.go(0);
      });
    } else {
      personStore.errorCode = '';
      await router.push({ name: 'search-person-limited' });
    }
  }

  async function navigateToPersonTable(): Promise<void> {
    if (personStore.errorCode === 'REQUIRED_STEP_UP_LEVEL_NOT_MET') {
      formContext.resetForm();
    } else {
      personStore.allLandesbedienstetePersonen = [];
    }
    await router.push({ name: 'person-management' });
  }

  function resetForm(): void {
    formContext.resetForm();
    personStore.errorCode = '';
    personStore.allLandesbedienstetePersonen = [];
  }

  async function navigateToPersonCreationForm(): Promise<void> {
    personStore.errorCode = '';
    formContext.resetForm();
    await router.push({ name: 'add-person-to-own-schule' });
  }

  function handleConfirmUnsavedChanges(): void {
    blockedNext();
    personStore.errorCode = '';
  }

  function preventNavigation(event: BeforeUnloadEvent): void {
    if (!isFormDirty()) {
      return;
    }
    event.preventDefault();
    /* Chrome requires returnValue to be set. */
    event.returnValue = '';
  }

  onBeforeRouteLeave((_to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    if (isFormDirty()) {
      showUnsavedChangesDialog.value = true;
      blockedNext = next;
    } else {
      next();
    }
  });

  onMounted(() => {
    personStore.errorCode = '';
    personStore.allLandesbedienstetePersonen = [];

    /* listen for browser changes and prevent them when form is dirty */
    window.addEventListener('beforeunload', preventNavigation);
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
      {{ t('admin.person.stateEmployeeSearch.searchAndAdd') }}
    </h1>
    <LayoutCard
      :closable="true"
      :header="t('admin.person.stateEmployeeSearch.searchStateEmployee')"
      headlineTestId="search-state-employee-headline"
      :padded="true"
      :show-close-text="true"
      @on-close-clicked="navigateToPersonTable"
    >
      <FormWrapper
        id="person-search-form"
        :can-commit="!isSearchDisabled || personStore.loading"
        :confirm-unsaved-changes-action="handleConfirmUnsavedChanges"
        :create-button-label="$t('admin.person.stateEmployeeSearch.searchStateEmployee')"
        :discard-button-label="$t('reset')"
        :hide-actions="!!personStore.errorCode"
        :hide-notice="true"
        :is-loading="personStore.loading"
        :on-discard="resetForm"
        :on-submit="onSubmit"
        :show-unsaved-changes-dialog="showUnsavedChangesDialog"
        @on-show-dialog-change="(value?: boolean) => (showUnsavedChangesDialog = value || false)"
      >
        <!-- Error Message Display for error messages from the personStore -->
        <SpshAlert
          :model-value="!!personStore.errorCode"
          :title="personStore.errorCode ? t(`admin.person.title.${personStore.errorCode}`) : ''"
          :type="'error'"
          :closable="false"
          :show-button="true"
          :button-text="t('admin.person.backToCreatePerson')"
          :button-action="navigateBackToPersonSearchForm"
          :text="personStore.errorCode ? t(`admin.person.errors.${personStore.errorCode}`) : ''"
        />

        <v-row
          v-if="!personStore.errorCode"
          class="align-start"
        >
          <!-- notice Column -->
          <v-col
            cols="12"
            sm="3"
          >
            <v-row>
              <v-col
                cols="1"
                class="mr-2"
              >
                <v-icon
                  aria-hidden="true"
                  icon="mdi-alert-circle-outline"
                  size="small"
                  :start="true"
                ></v-icon>
              </v-col>
              <v-col
                cols="10"
                sm="9"
              >
                <span class="text-body bold hyphenate">
                  {{ t('admin.person.stateEmployeeSearch.searchMethodNotice') }}
                </span>
              </v-col>
            </v-row>
          </v-col>

          <!-- Radio Group and Inputs Column -->
          <v-col
            cols="12"
            sm="9"
          >
            <v-radio-group
              v-model="searchType"
              density="compact"
            >
              <!-- KoPers -->
              <v-row class="align-center dense">
                <v-col cols="auto">
                  <v-radio
                    data-testid="kopers-radio-button"
                    :label="t('admin.person.stateEmployeeSearch.withKopers')"
                    :value="SearchType.KoPers"
                  />
                </v-col>
                <v-col
                  v-if="searchType === SearchType.KoPers"
                  cols="12"
                  sm="9"
                >
                  <v-text-field
                    id="kopers-input"
                    ref="kopers-input"
                    v-bind="selectedKopersProps"
                    v-model="selectedKopers"
                    clearable
                    data-testid="kopers-input"
                    density="compact"
                    variant="outlined"
                    :placeholder="$t('person.enterKopersNr')"
                  />
                </v-col>
              </v-row>

              <!-- Email -->
              <v-row class="align-center dense">
                <v-col cols="auto">
                  <v-radio
                    data-testid="email-radio-button"
                    :label="t('admin.person.stateEmployeeSearch.withEmail')"
                    :value="SearchType.Email"
                  />
                </v-col>
                <v-col
                  v-if="searchType === SearchType.Email"
                  cols="12"
                  sm="9"
                >
                  <v-text-field
                    id="email-input"
                    ref="email-input"
                    v-bind="selectedEmailProps"
                    v-model="selectedEmail"
                    clearable
                    data-testid="email-input"
                    density="compact"
                    variant="outlined"
                    :placeholder="$t('person.enterEmail')"
                  />
                </v-col>
              </v-row>

              <!-- Username -->
              <v-row class="align-center dense">
                <v-col cols="auto">
                  <v-radio
                    data-testid="username-radio-button"
                    :label="t('admin.person.stateEmployeeSearch.withUsername')"
                    :value="SearchType.Username"
                  />
                </v-col>
                <v-col
                  v-if="searchType === SearchType.Username"
                  cols="12"
                  sm="8"
                >
                  <v-text-field
                    id="username-input"
                    ref="username-input"
                    v-bind="selectedUsernameProps"
                    v-model="selectedUsername"
                    clearable
                    data-testid="username-input"
                    density="compact"
                    variant="outlined"
                    :placeholder="$t('person.enterUsername')"
                  />
                </v-col>
              </v-row>

              <!-- Name -->
              <v-row class="align-center dense">
                <v-col cols="auto">
                  <v-radio
                    data-testid="name-radio-button"
                    :label="t('admin.person.stateEmployeeSearch.withfirstAndLastname')"
                    :value="SearchType.Name"
                  />
                </v-col>
                <v-col
                  v-if="searchType === SearchType.Name"
                  cols="12"
                  sm="9"
                >
                  <v-row>
                    <v-col
                      cols="12"
                      sm="6"
                    >
                      <v-text-field
                        id="vorname-input"
                        ref="vorname-input"
                        v-bind="selectedVornameProps"
                        v-model="selectedVorname"
                        clearable
                        data-testid="vorname-input"
                        density="compact"
                        variant="outlined"
                        :placeholder="$t('person.enterFirstName')"
                      />
                    </v-col>
                    <v-col
                      cols="12"
                      sm="6"
                    >
                      <v-text-field
                        id="nachname-input"
                        ref="nachname-input"
                        v-bind="selectedNachnameProps"
                        v-model="selectedNachname"
                        clearable
                        data-testid="nachname-input"
                        density="compact"
                        variant="outlined"
                        :placeholder="$t('person.enterLastName')"
                      />
                    </v-col>
                  </v-row>
                </v-col>
              </v-row>
            </v-radio-group>
          </v-col>
        </v-row>
      </FormWrapper>
      <template v-if="!personStore.errorCode && personStore.allLandesbedienstetePersonen?.length === 1">
        <v-divider
          class="border-opacity-100 rounded"
          color="#E5EAEF"
          thickness="5px"
        />
        <LayoutCard
          data-testid="search-result-card"
          :header="$t('admin.person.stateEmployeeSearch.searchResult')"
          headlineTestId="layout-card-headline-search-result"
          class="ma-5"
        >
          <v-row
            class="ma-4"
            density="compact"
          >
            <!-- PERSONAL DATA COLUMN -->
            <v-col
              cols="12"
              :md="organisationenDaten.length === 1 ? 6 : 4"
              class="d-flex flex-column ga-8"
            >
              <LayoutCard
                data-testid="personal-data-card"
                :header="$t('profile.personalData')"
                headlineTestId="layout-card-headline-personal-data"
                :subCards="true"
              >
                <v-row>
                  <v-col cols="12">
                    <v-table class="text-body-large">
                      <template #default>
                        <tbody>
                          <tr
                            v-for="item in personalData"
                            :key="item.label"
                          >
                            <td>
                              <span v-if="item.labelAbbr">
                                <abbr :title="item.label">
                                  <strong :data-testid="item.testIdLabel">{{ item.labelAbbr }}:</strong>
                                </abbr>
                              </span>
                              <strong
                                v-else
                                :data-testid="item.testIdLabel"
                              >
                                {{ item.label }}:
                              </strong>
                            </td>
                            <td :data-testid="item.testIdValue">
                              <v-row
                                class="align-center"
                                no-gutters
                              >
                                <SpshTooltip
                                  v-if="item.tooltip"
                                  enabled-condition
                                  :enabled-text="item.tooltip"
                                  position="bottom"
                                >
                                  <v-icon
                                    aria-hidden="true"
                                    class="mr-2"
                                    icon="mdi-alert-circle-outline"
                                    size="small"
                                  />
                                </SpshTooltip>
                                <span>{{ item.value }}</span>
                              </v-row>
                            </td>
                          </tr>
                        </tbody>
                      </template>
                    </v-table>
                  </v-col>
                </v-row>
              </LayoutCard>
            </v-col>

            <!-- ORGANISATION COLUMNS INLINE -->
            <v-col
              v-for="(orgData, index) in organisationenDaten"
              :key="orgData.title"
              cols="12"
              :md="organisationenDaten.length === 1 ? 6 : 4"
              class="d-flex flex-column ga-8"
            >
              <LayoutCard
                :data-testid="`zuordnung-card-${index + 1}`"
                :header="$t('person.zuordnung') + ' ' + (organisationenDaten.length > 1 ? (index + 1).toString() : '')"
                :headline-test-id="`zuordnung-card-${index + 1}-headline`"
                :sub-cards="true"
              >
                <v-row>
                  <v-col cols="12">
                    <v-table class="text-body-large">
                      <template #default>
                        <tbody>
                          <tr
                            v-for="item in orgData.labelAndValues"
                            :key="item.label"
                          >
                            <td>
                              <span v-if="item.labelAbbr">
                                <abbr :title="item.label">
                                  <strong :data-testid="item.testIdLabel">{{ item.labelAbbr }}:</strong>
                                </abbr>
                              </span>
                              <strong
                                v-else
                                :data-testid="item.testIdLabel"
                              >
                                {{ item.label }}:
                              </strong>
                            </td>
                            <td :data-testid="item.testIdValue">
                              {{ item.value }}
                            </td>
                          </tr>
                        </tbody>
                      </template>
                    </v-table>
                  </v-col>
                </v-row>
              </LayoutCard>
            </v-col>
          </v-row>
        </LayoutCard>
        <v-row class="justify-end pr-2 pl-2 pb-2">
          <v-col
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              class="secondary button"
              data-testid="back-to-search-button"
              :block="mdAndDown"
              @click.stop="() => (personStore.allLandesbedienstetePersonen = [])"
            >
              {{ $t('nav.backToSearch') }}
            </v-btn>
          </v-col>
          <v-col
            cols="12"
            sm="6"
            md="auto"
          >
            <v-btn
              class="primary button"
              data-testid="add-state-employee-button"
              :block="mdAndDown"
              @click.stop="navigateToPersonCreationForm"
            >
              {{ $t('admin.person.stateEmployeeSearch.addStateEmployee') }}
            </v-btn>
          </v-col>
        </v-row>
      </template>
    </LayoutCard>
    <v-dialog
      v-model="showErrorDialog"
      data-testid="person-search-error-dialog"
      persistent
    >
      <LayoutCard
        v-if="showErrorDialog"
        :closable="false"
        :header="t('admin.person.stateEmployeeSearch.searchResult')"
      >
        <v-card-text>
          <v-container>
            <v-row class="text-body bold px-md-16">
              <v-col
                class="text-center"
                cols="12"
              >
                <span data-testid="no-person-found-text">
                  {{ errorDialogMessage }}
                </span>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-row class="justify-center">
            <v-col
              cols="12"
              class="d-flex justify-center"
            >
              <v-btn
                :block="mdAndDown"
                class="primary"
                data-testid="cancel-person-search-error-button"
                @click.stop="showErrorDialog = false"
              >
                {{ t('cancel') }}
              </v-btn>
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="4"
            />
          </v-row>
        </v-card-actions>
      </LayoutCard>
    </v-dialog>
  </div>
</template>
