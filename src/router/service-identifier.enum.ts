export enum ServiceIdentifier {
  TWO_FACTOR_AUTHENTICATION = '2FA',
}

export const SERVICE_NOT_AVAILABLE_2FA: string = `/service-not-available/${ServiceIdentifier.TWO_FACTOR_AUTHENTICATION}`;
