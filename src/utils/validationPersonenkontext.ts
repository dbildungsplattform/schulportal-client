import { useRollen, type TranslatedRolleWithAttrs } from '@/composables/useRollen';
import { RollenArt, RollenMerkmal } from '@/stores/RolleStore';
import { DDMMYYYY, NO_LEADING_TRAILING_SPACES } from '@/utils/validation'; // Assuming you have this validation in place
import { toTypedSchema } from '@vee-validate/yup';
import { useForm, type BaseFieldProps, type TypedSchema } from 'vee-validate';
import type { ComputedRef, Ref } from 'vue';
import { object, string, StringSchema, type AnyObject } from 'yup';
import { isBefristungspflichtRolle } from './befristung';
import { isValidDate, notInPast } from './date';

// Define the form validation schema for the Personenkontext
export type ZuordnungCreationForm = {
  selectedRolle: string;
  selectedOrganisation: string;
  selectedKlasse: string;
  selectedBefristung: Date;
  selectedBefristungOption: string;
};

export type ChangeBefristungForm = {
  selectedBefristung: Date;
  selectedBefristungOption: string;
};

const rollen: ComputedRef<TranslatedRolleWithAttrs[] | undefined> = useRollen();

// Define a method to check if the selected Rolle is of type "Lern"
export function isLernRolle(selectedRolleId: string): boolean {
  const rolle: TranslatedRolleWithAttrs | undefined = rollen.value?.find(
    (r: TranslatedRolleWithAttrs) => r.value === selectedRolleId,
  );
  return !!rolle && rolle.rollenart === RollenArt.Lern;
}

// Define the field properties for Personenkontext
export type PersonenkontextFieldDefinitions = {
  selectedRolle: Ref<string | undefined>;
  selectedRolleProps: Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>;
  selectedOrganisation: Ref<string | undefined>;
  selectedOrganisationProps: Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>;
  selectedKlasse: Ref<string | undefined>;
  selectedKlasseProps: Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>;
  selectedBefristung: Ref<string | undefined>;
  selectedBefristungProps: Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>;
  selectedBefristungOption: Ref<string | undefined>;
  selectedBefristungOptionProps: Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>;
  selectedKopersNr: Ref<string | undefined>;
  selectedKopersNrProps: Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>;
};

type Schema = StringSchema<string | undefined, AnyObject, undefined, ''>;

// Used for the form
export function isKopersRolle(
  selectedRolleIds: string[] | undefined,
  translatedRollen: TranslatedRolleWithAttrs[] | undefined,
): boolean {
  if (!selectedRolleIds || selectedRolleIds.length === 0) {
    return false;
  }
  return (
    translatedRollen?.some(
      (r: TranslatedRolleWithAttrs) =>
        selectedRolleIds.includes(r.value) &&
        Array.isArray(r.merkmale) &&
        r.merkmale.includes(RollenMerkmal.KopersPflicht),
    ) || false
  );
}

export const befristungSchema = (t: (key: string) => string): StringSchema =>
  string()
    .test('notInPast', t('admin.befristung.rules.pastDateNotAllowed'), notInPast)
    .test('isValidDate', t('admin.befristung.rules.invalidDateNotAllowed'), isValidDate)
    .matches(DDMMYYYY, t('admin.befristung.rules.format'))
    .test('conditionalRequired', t('admin.befristung.rules.required'), async function (value: string | undefined) {
      const {
        selectedRolle,
        selectedBefristungOption,
      }: { selectedRolle: string | undefined; selectedBefristungOption: string | undefined } = this.parent as {
        selectedRolle: string | undefined;
        selectedBefristungOption: string | undefined;
      };

      if (!selectedRolle || selectedBefristungOption !== undefined) {
        return true; // Not required in this case
      }

      const isBefristungspflichtig: boolean = await isBefristungspflichtRolle([selectedRolle]);

      if (isBefristungspflichtig && !value) {
        return false; // Required but not provided
      }

      return true;
    });

// Define the validation schema for Personenkontext form fields
export const getValidationSchema = (
  t: (key: string) => string,
  hasNoKopersNr: Ref<boolean | undefined>,
  hasKopersNummer: Ref<boolean>,
): TypedSchema<ZuordnungCreationForm> => {
  return toTypedSchema(
    object({
      selectedRolle: string().required(t('admin.rolle.rules.rolle.required')),
      selectedOrganisation: string().required(t('admin.organisation.rules.organisation.required')),
      selectedKlasse: string().when('selectedRolle', {
        is: (selectedRolleId: string) => isLernRolle(selectedRolleId), // This helper function will check if it's a learning role
        then: (schema: Schema) => schema.required(t('admin.klasse.rules.klasse.required')),
      }),
      selectedNewKlasse: string().when('selectedSchule', {
        is: (selectedSchule: string) => selectedSchule,
        then: (schema: StringSchema<string | undefined, AnyObject, undefined, ''>) =>
          schema.required(t('admin.klasse.rules.klasse.required')),
      }),
      selectedKopersNr: string()
        .matches(NO_LEADING_TRAILING_SPACES, t('admin.person.rules.kopersNr.noLeadingTrailingSpaces'))
        .when('selectedRolle', {
          is: (selectedRolleId: string) => {
            // Check if the selected role requires a KopersNr
            return isKopersRolle([selectedRolleId], rollen.value) && !hasKopersNummer.value;
          },
          // Now apply the conditional logic based on `hasNoKopersNr`
          then: (schema: StringSchema<string | undefined, AnyObject, undefined, ''>) =>
            hasNoKopersNr.value
              ? schema // If the user checked "I don't have one" checkbox, KopersNr is not required
              : schema.required(t('admin.person.rules.kopersNr.required')), // KopersNr is required if "I don't have one" is not checked
        }),
      selectedBefristung: befristungSchema(t),
    }),
  );
};

export const getBefristungSchema = (t: (key: string) => string): TypedSchema<ChangeBefristungForm> => {
  return toTypedSchema(
    object({
      selectedBefristung: befristungSchema(t),
    }),
  );
};

// Vuetify configuration to handle error messages and UI error state
export const getVuetifyConfig = (state: {
  errors: Array<string>;
}): { props: { error: boolean; 'error-messages': Array<string> } } => ({
  props: {
    error: !!state.errors.length,
    'error-messages': state.errors,
  },
});

// Field definitions for Personenkontext form
export const getPersonenkontextFieldDefinitions = (
  formContext: ReturnType<typeof useForm>,
): PersonenkontextFieldDefinitions => {
  // eslint-disable-next-line @typescript-eslint/typedef
  const { defineField } = formContext;

  const [selectedRolle, selectedRolleProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = defineField('selectedRolle', getVuetifyConfig);

  const [selectedOrganisation, selectedOrganisationProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = defineField('selectedOrganisation', getVuetifyConfig);

  const [selectedKlasse, selectedKlasseProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = defineField('selectedKlasse', getVuetifyConfig);

  const [selectedBefristung, selectedBefristungProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = defineField('selectedBefristung', getVuetifyConfig);

  const [selectedBefristungOption, selectedBefristungOptionProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedBefristungOption', getVuetifyConfig);

  const [selectedKopersNr, selectedKopersNrProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedKopersNr', getVuetifyConfig);

  return {
    selectedRolle,
    selectedRolleProps,
    selectedOrganisation,
    selectedOrganisationProps,
    selectedKlasse,
    selectedKlasseProps,
    selectedBefristung,
    selectedBefristungProps,
    selectedBefristungOption,
    selectedBefristungOptionProps,
    selectedKopersNr,
    selectedKopersNrProps,
  };
};

// Dirty state detection for Personenkontext form fields
// Use this in a future ticket to fix unsaved dialog changes for Persondetails.
export const getDirtyState = (formContext: ReturnType<typeof useForm>): boolean => {
  return (
    formContext.isFieldDirty('selectedRolle') ||
    formContext.isFieldDirty('selectedOrganisation') ||
    formContext.isFieldDirty('selectedKlasse') ||
    formContext.isFieldDirty('selectedBefristung')
  );
};
