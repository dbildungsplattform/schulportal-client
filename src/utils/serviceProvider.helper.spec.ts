import deDE from '@/locales/de-DE.json';
import { RollenArt } from '@/stores/RolleStore';
import { createI18n } from 'vue-i18n';
import {
  extractAnbietenInMerkmale,
  formatServiceProviderAnbietenMerkmale,
  formatServiceProviderRollenartenWhitelist,
} from './serviceProvider.helper';
import { ServiceProviderMerkmal } from '@/stores/ServiceProviderStore';

const i18n: { global: { t: (key: string) => unknown } } = createI18n({
  legacy: false,
  locale: 'de',
  messages: { de: deDE },
});

const t: (key: string) => string = (key: string): string => String(i18n.global.t(key));

describe('formatServiceProviderRollenartenWhitelist', () => {
  test('formats non-empty whitelist using i18n labels', () => {
    const value: string = formatServiceProviderRollenartenWhitelist([RollenArt.Lern, RollenArt.Lehr], t);

    expect(value).toBe('Lern, Lehr');
  });

  test('formats empty whitelist as no restrictions', () => {
    const value: string = formatServiceProviderRollenartenWhitelist([], t);

    expect(value).toBe('Keine Einschränkungen');
  });
});

describe('extractAnbietenInMerkmale', () => {
  test.each([
    [
      Object.values(ServiceProviderMerkmal),
      [
        ServiceProviderMerkmal.AnbietenInSchulischerAngebotsverwaltung,
        ServiceProviderMerkmal.AnbietenInSchulischerRollenverwaltung,
      ],
    ],
    [
      [ServiceProviderMerkmal.NachtraeglichZuweisbar, ServiceProviderMerkmal.AnbietenInSchulischerAngebotsverwaltung],
      [ServiceProviderMerkmal.AnbietenInSchulischerAngebotsverwaltung],
    ],
    [
      [ServiceProviderMerkmal.AnbietenInSchulischerAngebotsverwaltung],
      [ServiceProviderMerkmal.AnbietenInSchulischerAngebotsverwaltung],
    ],
    [[], []],
  ])('it should extract the correct subset', (input: ServiceProviderMerkmal[], expected: ServiceProviderMerkmal[]) => {
    expect(extractAnbietenInMerkmale(input)).toEqual(expected);
  });
});

describe('formatServiceProviderAnbietenMerkmale', () => {
  test.each([
    [Object.values(ServiceProviderMerkmal), 'Schulische Angebotsverwaltung, Schulische Rollenverwaltung'],
    [
      [ServiceProviderMerkmal.NachtraeglichZuweisbar, ServiceProviderMerkmal.AnbietenInSchulischerAngebotsverwaltung],
      'Schulische Angebotsverwaltung',
    ],
    [[ServiceProviderMerkmal.AnbietenInSchulischerAngebotsverwaltung], 'Schulische Angebotsverwaltung'],
    [[], 'Keine'],
  ])('it should format the input correctly', (input: ServiceProviderMerkmal[], expected: string) => {
    expect(formatServiceProviderAnbietenMerkmale(input, t)).toEqual(expected);
  });
});
