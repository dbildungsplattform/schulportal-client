import { RollenArt } from '@/stores/RolleStore';
import { ServiceProviderMerkmal } from '@/stores/ServiceProviderStore';

type Translate = (key: string) => string;

export const ANBIETEN_IN_MERKMALE: ServiceProviderMerkmal[] = [
  ServiceProviderMerkmal.AnbietenInSchulischerAngebotsverwaltung,
  ServiceProviderMerkmal.AnbietenInSchulischerRollenverwaltung,
];

export function formatServiceProviderRollenartenWhitelist(
  rollenartenWhitelist: RollenArt[] | undefined,
  t: Translate,
): string {
  if (!rollenartenWhitelist?.length) {
    return t('angebot.noRestrictions');
  }

  return rollenartenWhitelist
    .map((rollenart: RollenArt) => t(`admin.rolle.mappingFrontBackEnd.rollenarten.${rollenart}`))
    .join(', ');
}

export function extractAnbietenInMerkmale(merkmale: ServiceProviderMerkmal[]): ServiceProviderMerkmal[] {
  return merkmale.filter((merkmal: ServiceProviderMerkmal) => ANBIETEN_IN_MERKMALE.includes(merkmal));
}

export function formatServiceProviderAnbietenMerkmale(merkmale: ServiceProviderMerkmal[], t: Translate): string {
  const anbietenInMerkmale: ServiceProviderMerkmal[] = extractAnbietenInMerkmale(merkmale);
  if (anbietenInMerkmale.length === 0) {
    return t('none');
  }
  return anbietenInMerkmale
    .map((merkmal: ServiceProviderMerkmal) => t(`angebot.mappingFrontBackEnd.merkmale.${merkmal}`))
    .join(', ');
}
