import { DIN_91379A_EXT, NO_LEADING_TRAILING_SPACES } from '@/utils/validation';
import { toTypedSchema } from '@vee-validate/yup';
import { type TypedSchema } from 'vee-validate';
import { object, string } from 'yup';

export type BehoerdeFormValues = {
  selectedZustaendigkeitsbereich: string;
  selectedBehoerdenname: string;
  selectedDienststellennummer?: string;
};

export const getValidationSchema = (t: (key: string) => string): TypedSchema<BehoerdeFormValues> => {
  return toTypedSchema(
    object({
      selectedZustaendigkeitsbereich: string().required(),
      selectedBehoerdenname: string()
        .matches(DIN_91379A_EXT, t('admin.behoerde.rules.behoerdenname.matches'))
        .matches(NO_LEADING_TRAILING_SPACES, t('admin.behoerde.rules.behoerdenname.noLeadingTrailingSpaces'))
        .required(t('admin.behoerde.rules.behoerdenname.required')),
      selectedDienststellennummer: string().matches(
        NO_LEADING_TRAILING_SPACES,
        t('admin.behoerde.rules.dienststellennummer.noLeadingTrailingSpaces'),
      ),
    }),
  );
};
