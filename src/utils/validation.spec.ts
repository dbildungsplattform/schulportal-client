import { mapVeeValidationErrorsToVuetifyProps } from './validation';

describe('mapVeeValidationErrorsToVuetifyProps', (): void => {
  describe('when there are no errors', (): void => {
    it('should disable the error flag and preserve the empty error array', (): void => {
      const errors: string[] = [];
      const result: ReturnType<typeof mapVeeValidationErrorsToVuetifyProps> = mapVeeValidationErrorsToVuetifyProps({
        errors,
      });

      expect(result).toEqual({
        props: { error: false, 'error-messages': errors },
      });
      expect(result.props['error-messages']).toBe(errors);
    });
  });

  describe('when there is one error', (): void => {
    it('should enable the error flag and preserve the error array', (): void => {
      const errors: string[] = ['Required field'];
      const result: ReturnType<typeof mapVeeValidationErrorsToVuetifyProps> = mapVeeValidationErrorsToVuetifyProps({
        errors,
      });

      expect(result).toEqual({
        props: { error: true, 'error-messages': errors },
      });
      expect(result.props['error-messages']).toBe(errors);
    });
  });

  describe('when there are multiple errors', (): void => {
    it('should enable the error flag and preserve all errors in order', (): void => {
      const errors: string[] = ['Required field', 'Invalid format'];
      const result: ReturnType<typeof mapVeeValidationErrorsToVuetifyProps> = mapVeeValidationErrorsToVuetifyProps({
        errors,
      });

      expect(result).toEqual({
        props: { error: true, 'error-messages': errors },
      });
      expect(result.props['error-messages']).toBe(errors);
    });
  });
});
