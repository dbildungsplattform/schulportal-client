<script setup lang="ts">
  import SpshTooltip from '@/components/admin/SpshTooltip.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import type { Organisation } from '@/stores/OrganisationStore';
  import { type Personendatensatz } from '@/stores/PersonStore';
  import type { TranslatedObject } from '@/types';
  import { formatDateToISO, isValidDate, notInPast } from '@/utils/date';
  import { PersonLockOccasion, type UserLock } from '@/utils/lock';
  import { DDMMYYYY } from '@/utils/validation';
  import { toTypedSchema } from '@vee-validate/yup';
  import { useForm, type BaseFieldProps, type FormContext, type TypedSchema } from 'vee-validate';
  import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import { useDisplay } from 'vuetify';
  import { object, string, StringSchema, type AnyObject } from 'yup';
  import PersonLockInput from './PersonLockInput.vue';

  const { t }: Composer = useI18n({ useScope: 'global' });
  const { mdAndDown }: { mdAndDown: Ref<boolean> } = useDisplay();

  const dialogIsActive: Ref<boolean> = ref(false);
  const isEditMode: Ref<boolean> = ref(false);

  type Props = {
    errorCode: string;
    person: Personendatensatz;
    adminId: string;
    formatOrganisationName: (org: Organisation) => string;
    intersectingOrganisations: Set<Organisation>;
    disabled: boolean;
  };
  type PersonLockForm = {
    selectedBefristung: string;
  };
  const vuetifyConfig = (state: {
    errors: Array<string>;
  }): { props: { error: boolean; 'error-messages': Array<string> } } => ({
    props: {
      error: !!state.errors.length,
      'error-messages': state.errors,
    },
  });

  const isUnbefristet: Ref<boolean> = ref(true);
  const validationSchema: TypedSchema = toTypedSchema(
    object({
      selectedBefristung: string().when([], {
        is: () => !isUnbefristet.value,
        then: (schema: StringSchema<string | undefined, AnyObject, undefined, ''>) =>
          schema
            .required(t('admin.befristung.rules.required'))
            .test('notInPast', t('admin.befristung.rules.pastDateNotAllowed'), notInPast)
            .test('isValidDate', t('admin.befristung.rules.invalidDateNotAllowed'), isValidDate)
            .matches(DDMMYYYY, t('admin.befristung.rules.format')),
        otherwise: (schema: StringSchema<string | undefined, AnyObject, undefined, ''>) => schema.notRequired(),
      }),
    }),
  );

  const formContext: FormContext<PersonLockForm, PersonLockForm> = useForm<PersonLockForm>({
    validationSchema,
  });

  const [selectedBefristung, selectedBefristungProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedBefristung', vuetifyConfig);

  type Emits = {
    (event: 'onLockUser', schule: string, date: string | undefined, isExistingLockToBeEdited: boolean): void;
  };
  const props: Props = defineProps<Props>();
  const emit: Emits = defineEmits<Emits>();

  const organisations: Ref<Array<TranslatedObject>> = computed(() => {
    return [...props.intersectingOrganisations].map((organisation: Organisation) => {
      const organisationDisplayName: string = props.formatOrganisationName(organisation);
      return {
        value: organisationDisplayName,
        title: organisationDisplayName,
      };
    });
  });
  const selectedOrganisation: Ref<string | null> = ref(null);
  const errorMessage: ComputedRef<string> = computed(() => {
    if (!props.errorCode) {
      return '';
    }
    return !props.person.person.userLock.some(
      (lock: UserLock) => lock.lock_occasion === PersonLockOccasion.MANUELL_GESPERRT,
    )
      ? t('person.lockError')
      : t('person.unlockError');
  });
  const hasSingleSelection: ComputedRef<boolean> = computed(() => {
    return organisations.value.length <= 1;
  });
  const selectedOrganisationId: ComputedRef<string | null> = computed(() => {
    if (!selectedOrganisation.value) {
      return null;
    }
    const organisation: Organisation | undefined = Array.from(props.intersectingOrganisations).find(
      (org: Organisation) => props.formatOrganisationName(org) === selectedOrganisation.value,
    );
    return organisation ? organisation.id : null;
  });

  const isManuallyLocked: ComputedRef<boolean> = computed<boolean>(() => {
    return props.person.person.userLock.some(
      (lock: UserLock) => lock.lock_occasion === PersonLockOccasion.MANUELL_GESPERRT,
    );
  });

  function resetBefristungFields(): void {
    isUnbefristet.value = true;
    formContext.resetField('selectedBefristung');
  }

  function closeLockPersonDialog(): void {
    resetBefristungFields();
    dialogIsActive.value = false;
    isEditMode.value = false;
  }

  function handleOnLockUser(): void {
    // Find the "MANUELL_GESPERRT" lock if it exists
    const manualLock: UserLock | null =
      props.person.person.userLock.find(
        (lock: UserLock) => lock.lock_occasion === PersonLockOccasion.MANUELL_GESPERRT,
      ) ?? null;

    // Use the locked_by ID from "MANUELL_GESPERRT" if person is locked, otherwise use selectedOrganisationId
    const lockingOrgId: string | null = manualLock ? manualLock.locked_by : selectedOrganisationId.value;

    if (!lockingOrgId) {
      return;
    }

    // Format date if provided
    const dateISO: string | undefined = formatDateToISO(selectedBefristung.value);

    const isExistingLockToBeEdited: boolean = isEditMode.value;

    emit('onLockUser', lockingOrgId, dateISO, isExistingLockToBeEdited);
    closeLockPersonDialog();
  }

  const onSubmit: (e?: Event) => Promise<void | undefined> = formContext.handleSubmit(() => {
    handleOnLockUser();
  });

  function handleChangeOrganisation(value: string): void {
    selectedOrganisation.value = value;
  }
  const handleBefristungChange = (value: string | undefined): void => {
    selectedBefristung.value = value;
  };

  const selectedRadionButtonChange = (value: boolean): void => {
    isUnbefristet.value = value;
    if (isUnbefristet.value) {
      formContext.resetField('selectedBefristung');
    }
  };

  watch(
    organisations,
    (newOrganisations: Array<TranslatedObject>) => {
      if (newOrganisations.length === 1) {
        selectedOrganisation.value = organisations.value[0]?.value ?? null;
      }
    },
    { immediate: true },
  );

  watch(dialogIsActive, (newDialogIsActive: boolean) => {
    if (!newDialogIsActive) {
      resetBefristungFields();
      return;
    }

    const manualLock: UserLock | null =
      props.person.person.userLock.find(
        (lock: UserLock) => lock.lock_occasion === PersonLockOccasion.MANUELL_GESPERRT,
      ) ?? null;

    if (manualLock) {
      isUnbefristet.value = !manualLock.locked_until;
      selectedBefristung.value = manualLock.locked_until;
    }
  });
</script>

<template v-if="organisations.length > 0">
  <v-dialog
    v-model="dialogIsActive"
    persistent
  >
    <template #activator="{ props }">
      <v-col
        cols="12"
        sm="6"
        md="auto"
        class="pb-0"
      >
        <SpshTooltip
          v-if="!person.person.isLocked"
          :enabled-condition="!disabled"
          :disabled-text="$t('person.finishEditFirst')"
          :enabled-text="$t('person.lockUser')"
          position="start"
        >
          <v-btn
            class="primary"
            data-testid="open-lock-dialog-button"
            :disabled="disabled"
            :block="mdAndDown"
            v-bind="props"
          >
            {{ !person.person.isLocked ? $t('person.lockUser') : $t('person.unlockUser') }}
          </v-btn>
        </SpshTooltip>
        <SpshTooltip
          v-else
          :enabled-condition="!disabled"
          :disabled-text="$t('person.finishEditFirst')"
          :enabled-text="$t('admin.person.editLock')"
          position="start"
        >
          <v-btn
            class="primary"
            data-testid="open-lock-dialog-button"
            :disabled="disabled"
            :block="mdAndDown"
            v-bind="props"
          >
            {{
              person.person.userLock?.some((lock) => lock.lock_occasion === PersonLockOccasion.MANUELL_GESPERRT)
                ? $t('admin.person.editLock')
                : $t('person.lockUser')
            }}
          </v-btn>
        </SpshTooltip>
      </v-col>
    </template>
    <!-- Benutzer sperren Dialog -->
    <LayoutCard
      data-testid="person-lock-card"
      :closable="true"
      :header="!isManuallyLocked ? $t('person.lockUser') : $t('admin.person.editLock')"
      @on-close-clicked="closeLockPersonDialog"
    >
      <v-container>
        <v-card-text>
          <v-row
            v-if="errorMessage"
            class="text-body text-error"
          >
            <v-col
              class="text-right"
              cols="1"
            >
              <v-icon icon="mdi-alert" />
            </v-col>
            <v-col>
              <p data-testid="error-text">
                {{ errorMessage }}
              </p>
            </v-col>
          </v-row>
          <v-row
            v-if="!isManuallyLocked || (isManuallyLocked && isEditMode)"
            class="align-center justify-center w-full"
          >
            <v-col
              cols="12"
              sm="6"
              md="2"
              class="text-sm-center text-body"
            >
              <label for="schule-select">{{ $t('person.lockedBy') + ':' }}</label>
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="6"
            >
              <v-select
                id="schule-select"
                ref="schule-select"
                v-model="selectedOrganisation"
                :clearable="!hasSingleSelection"
                :disabled="hasSingleSelection || isManuallyLocked"
                :hide-details="hasSingleSelection || isManuallyLocked"
                :class="[
                  { 'filter-dropdown': hasSingleSelection || isManuallyLocked },
                  { selected: selectedOrganisation },
                  { 'align-center': true },
                ]"
                data-testid="schule-select"
                density="compact"
                :items="organisations"
                item-value="value"
                item-text="title"
                :no-data-text="$t('noDataFound')"
                :placeholder="$t('person.lockedBy')"
                required="true"
                variant="outlined"
                @update:model-value="handleChangeOrganisation"
              />
            </v-col>
          </v-row>
          <v-row
            v-if="!isManuallyLocked || (isManuallyLocked && isEditMode)"
            class="justify-center w-full"
          >
            <v-col
              class="text-body"
              cols="12"
              sm="6"
              md="2"
            >
              {{ $t('person.lockTime') }}
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="6"
              class="text-sm-center text-body"
            >
              <PersonLockInput
                v-model:befristung="selectedBefristung"
                :befristung-props="selectedBefristungProps"
                :is-unbefristet="isUnbefristet"
                @update:befristung="handleBefristungChange"
                @handle-selected-radio-button-change="selectedRadionButtonChange"
              />
            </v-col>
          </v-row>
          <v-row class="text-body bold px-md-16">
            <v-col
              cols="auto"
              class="d-flex align-center pr-2"
            >
              <v-icon icon="mdi-information-slab-circle-outline" />
            </v-col>
            <v-col>
              <span
                data-testid="lock-user-info-text"
                class="text-body"
              >
                {{
                  !isManuallyLocked || (isManuallyLocked && isEditMode)
                    ? $t('person.lockUserInfoText')
                    : $t('person.unLockUserInfoText')
                }}
              </span>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-row class="justify-center">
            <v-col
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="mdAndDown"
                class="secondary button"
                data-testid="close-lock-person-dialog-button"
                @click.stop="closeLockPersonDialog"
              >
                {{ !selectedOrganisation ? $t('close') : $t('cancel') }}
              </v-btn>
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                v-if="isManuallyLocked && !isEditMode"
                :block="mdAndDown"
                class="primary button"
                :disabled="
                  !props.person.person.userLock?.some(
                    (lock) => lock.lock_occasion === PersonLockOccasion.MANUELL_GESPERRT,
                  ) && !selectedOrganisation
                "
                data-testid="edit-user-lock-button"
                @click.stop="isEditMode = true"
              >
                {{ $t('admin.person.editLock') }}
              </v-btn>
              <v-btn
                v-if="!isManuallyLocked || (isManuallyLocked && isEditMode)"
                :block="mdAndDown"
                class="primary button"
                :disabled="!isManuallyLocked && !selectedOrganisation"
                data-testid="lock-user-button"
                @click.stop="onSubmit"
              >
                {{ $t('person.lockUser') }}
              </v-btn>
            </v-col>
            <v-col
              v-if="isManuallyLocked && !isEditMode"
              cols="12"
              sm="6"
              md="4"
            >
              <v-btn
                :block="mdAndDown"
                class="primary button"
                :disabled="!isManuallyLocked && !selectedOrganisation"
                data-testid="lock-user-button"
                @click.stop="onSubmit"
              >
                {{ isManuallyLocked ? $t('admin.person.removeLock') : $t('person.lockUser') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </v-container>
    </LayoutCard>
  </v-dialog>
</template>
