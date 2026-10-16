import { getValidationSchema } from './validationBehoerde';

describe('ValidationBehoerde', (): void => {
  describe('when the Behoerdenname contains invalid DIN characters', (): void => {
    it('should reject the name with the character validation error', async (): Promise<void> => {
      const schema: ReturnType<typeof getValidationSchema> = getValidationSchema((key: string): string => key);
      const result: Awaited<ReturnType<typeof schema.parse>> = await schema.parse({
        selectedZustaendigkeitsbereich: 'Schule',
        selectedBehoerdenname: 'Schulamt@',
        selectedDienststellennummer: '12345',
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
        selectedDienststellennummer: '12345',
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
        selectedDienststellennummer: '12345',
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
        selectedDienststellennummer: '12345',
      });

      expect(result.errors).toEqual([
        {
          path: 'selectedBehoerdenname',
          errors: ['admin.behoerde.rules.behoerdenname.required'],
        },
      ]);
    });
  });

  describe('when the Dienststellennummer has leading spaces', (): void => {
    it('should reject the number with the whitespace validation error', async (): Promise<void> => {
      const schema: ReturnType<typeof getValidationSchema> = getValidationSchema((key: string): string => key);
      const result: Awaited<ReturnType<typeof schema.parse>> = await schema.parse({
        selectedZustaendigkeitsbereich: 'Schule',
        selectedBehoerdenname: 'Schulamt',
        selectedDienststellennummer: ' 12345',
      });

      expect(result.errors).toEqual([
        {
          path: 'selectedDienststellennummer',
          errors: ['admin.behoerde.rules.dienststellennummer.noLeadingTrailingSpaces'],
        },
      ]);
    });
  });

  describe('when the Dienststellennummer has trailing spaces', (): void => {
    it('should reject the number with the whitespace validation error', async (): Promise<void> => {
      const schema: ReturnType<typeof getValidationSchema> = getValidationSchema((key: string): string => key);
      const result: Awaited<ReturnType<typeof schema.parse>> = await schema.parse({
        selectedZustaendigkeitsbereich: 'Schule',
        selectedBehoerdenname: 'Schulamt',
        selectedDienststellennummer: '12345 ',
      });

      expect(result.errors).toEqual([
        {
          path: 'selectedDienststellennummer',
          errors: ['admin.behoerde.rules.dienststellennummer.noLeadingTrailingSpaces'],
        },
      ]);
    });
  });

  describe('when the optional Dienststellennummer is empty', (): void => {
    it('should accept the form values and preserve the empty number', async (): Promise<void> => {
      const schema: ReturnType<typeof getValidationSchema> = getValidationSchema((key: string): string => key);
      const result: Awaited<ReturnType<typeof schema.parse>> = await schema.parse({
        selectedZustaendigkeitsbereich: 'Schule',
        selectedBehoerdenname: 'Schulamt',
        selectedDienststellennummer: '',
      });

      expect(result.errors).toEqual([]);
      expect(result.value?.selectedDienststellennummer).toBe('');
    });
  });

  describe('when the optional Dienststellennummer is cleared', (): void => {
    it('should accept null and normalize it to an empty number', async (): Promise<void> => {
      const schema: ReturnType<typeof getValidationSchema> = getValidationSchema((key: string): string => key);
      const result: Awaited<ReturnType<typeof schema.parse>> = await schema.parse({
        selectedZustaendigkeitsbereich: 'Schule',
        selectedBehoerdenname: 'Schulamt',
        selectedDienststellennummer: null as unknown as undefined,
      });

      expect(result.errors).toEqual([]);
      expect(result.value?.selectedDienststellennummer).toBe('');
    });
  });
});
