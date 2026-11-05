import { getValidationSchema } from './validationBehoerde';

describe('ValidationBehoerde', (): void => {
  describe('when the Behoerdenname contains invalid DIN characters', (): void => {
    it('should reject the name with the character validation error', async (): Promise<void> => {
      const schema: ReturnType<typeof getValidationSchema> = getValidationSchema((key: string): string => key);
      const result: Awaited<ReturnType<typeof schema.parse>> = await schema.parse({
        selectedZustaendigkeitsbereich: 'Schule',
        selectedBehoerdenname: 'Schulamt@',
      });

      expect(result.errors).toEqual([
        {
          path: 'selectedBehoerdenname',
          errors: ['admin.behoerde.rules.behoerdenname.matches'],
        },
      ]);
    });
  });

  describe('when the Behoerdenname has leading spaces', (): void => {
    it('should reject the name with the whitespace validation error', async (): Promise<void> => {
      const schema: ReturnType<typeof getValidationSchema> = getValidationSchema((key: string): string => key);
      const result: Awaited<ReturnType<typeof schema.parse>> = await schema.parse({
        selectedZustaendigkeitsbereich: 'Schule',
        selectedBehoerdenname: ' Schulamt',
      });

      expect(result.errors).toEqual([
        {
          path: 'selectedBehoerdenname',
          errors: ['admin.behoerde.rules.behoerdenname.noLeadingTrailingSpaces'],
        },
      ]);
    });
  });

  describe('when the Behoerdenname has trailing spaces', (): void => {
    it('should reject the name with the whitespace validation error', async (): Promise<void> => {
      const schema: ReturnType<typeof getValidationSchema> = getValidationSchema((key: string): string => key);
      const result: Awaited<ReturnType<typeof schema.parse>> = await schema.parse({
        selectedZustaendigkeitsbereich: 'Schule',
        selectedBehoerdenname: 'Schulamt ',
      });

      expect(result.errors).toEqual([
        {
          path: 'selectedBehoerdenname',
          errors: ['admin.behoerde.rules.behoerdenname.noLeadingTrailingSpaces'],
        },
      ]);
    });
  });

  describe('when the required Behoerdenname is empty', (): void => {
    it('should reject the name with the required validation error', async (): Promise<void> => {
      const schema: ReturnType<typeof getValidationSchema> = getValidationSchema((key: string): string => key);
      const result: Awaited<ReturnType<typeof schema.parse>> = await schema.parse({
        selectedZustaendigkeitsbereich: 'Schule',
        selectedBehoerdenname: '',
      });

      expect(result.errors).toEqual([
        {
          path: 'selectedBehoerdenname',
          errors: ['admin.behoerde.rules.behoerdenname.required'],
        },
      ]);
    });
  });

  describe('when only the jurisdiction and Behoerdenname are provided', (): void => {
    it('should accept the form values without a Dienststellennummer', async (): Promise<void> => {
      const schema: ReturnType<typeof getValidationSchema> = getValidationSchema((key: string): string => key);
      const result: Awaited<ReturnType<typeof schema.parse>> = await schema.parse({
        selectedZustaendigkeitsbereich: 'Schule',
        selectedBehoerdenname: 'Schulamt',
      });

      expect(result.errors).toEqual([]);
      expect(result.value).toEqual({
        selectedZustaendigkeitsbereich: 'Schule',
        selectedBehoerdenname: 'Schulamt',
      });
    });
  });
});
