import { getLogoConfig, getLogoName, isValidLogoId, LOGO_CATALOG, LogoConfig, LogoId } from './logosConfig';

describe('logosConfig', () => {
  describe('isValidLogoId', () => {
    it('should return true for valid logo IDs', () => {
      expect(isValidLogoId(LogoId.Schule)).toBe(true);
    });

    it('should return false for invalid logo IDs', () => {
      expect(isValidLogoId(Infinity)).toBe(false);
    });
  });

  describe('getLogoConfig', () => {
    it.each([
      [LogoId.Schule, LOGO_CATALOG[LogoId.Schule]],
      [undefined, undefined],
      [null, undefined],
      [Infinity, undefined],
    ])(
      'should return the correct logo config for %s',
      (logoId: number | LogoId | null | undefined, expectedConfig: LogoConfig | undefined) => {
        expect(getLogoConfig(logoId)).toBe(expectedConfig);
      },
    );
  });

  describe('getLogoName', () => {
    it.each([
      [LogoId.Schule, LOGO_CATALOG[LogoId.Schule].name],
      [undefined, undefined],
    ])(
      'should return the correct logo name for %s',
      (logoId: number | LogoId | undefined, expectedName: string | undefined) => {
        expect(getLogoName(logoId)).toBe(expectedName);
      },
    );
  });
});
