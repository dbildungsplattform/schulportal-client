/**
 * Centralized Logo Configuration with Integer IDs
 *
 * This file maps integer logo IDs to their SVG paths.
 * Each logo file gets a unique numeric ID that's stored in the database.
 */

export enum LogoId {
  Cloud = 1,
  Dateien = 2,
  Evaluation = 3,
  FAQ = 4,
  Geschichte = 5,
  Hilfe = 6,
  Information = 7,
  Internet = 8,
  KI = 9,
  Kommunikation = 10,
  Lesen = 11,
  Mathematik = 12,
  Medien = 13,
  Naturwissenschaften = 14,
  Organisation = 15,
  Schreiben = 16,
  Schule = 17,
  Schulserver = 18,
  Sport = 19,
  Sprachen = 20,
  Suchen = 21,
  Ueben = 22,
  Werkzeug = 23,
  Wissen = 24,
  Zusammenarbeit = 25,
}

export interface LogoConfig {
  id: LogoId;
  path: string;
  name: string;
  filename: string;
}

/**
 * Logo catalog: maps numeric IDs to SVG files
 *
 * The logoId (number) is stored in the database.
 * When displaying, we look up the SVG path using this catalog.
 */
export const LOGO_CATALOG: Record<LogoId, LogoConfig> = {
  [LogoId.Cloud]: {
    id: LogoId.Cloud,
    path: new URL('@/assets/logos/Cloud.svg', import.meta.url).href,
    name: 'Cloud',
    filename: 'Cloud.svg',
  },
  [LogoId.Dateien]: {
    id: LogoId.Dateien,
    path: new URL('@/assets/logos/Dateien.svg', import.meta.url).href,
    name: 'Dateien',
    filename: 'Dateien.svg',
  },
  [LogoId.Evaluation]: {
    id: LogoId.Evaluation,
    path: new URL('@/assets/logos/Evaluation.svg', import.meta.url).href,
    name: 'Evaluation',
    filename: 'Evaluation.svg',
  },
  [LogoId.FAQ]: {
    id: LogoId.FAQ,
    path: new URL('@/assets/logos/FAQ.svg', import.meta.url).href,
    name: 'FAQ',
    filename: 'FAQ.svg',
  },
  [LogoId.Geschichte]: {
    id: LogoId.Geschichte,
    path: new URL('@/assets/logos/Geschichte.svg', import.meta.url).href,
    name: 'Geschichte',
    filename: 'Geschichte.svg',
  },
  [LogoId.Hilfe]: {
    id: LogoId.Hilfe,
    path: new URL('@/assets/logos/Hilfe.svg', import.meta.url).href,
    name: 'Hilfe',
    filename: 'Hilfe.svg',
  },
  [LogoId.Information]: {
    id: LogoId.Information,
    path: new URL('@/assets/logos/Information.svg', import.meta.url).href,
    name: 'Information',
    filename: 'Information.svg',
  },
  [LogoId.Internet]: {
    id: LogoId.Internet,
    path: new URL('@/assets/logos/Internet.svg', import.meta.url).href,
    name: 'Internet',
    filename: 'Internet.svg',
  },
  [LogoId.KI]: {
    id: LogoId.KI,
    path: new URL('@/assets/logos/KI.svg', import.meta.url).href,
    name: 'KI',
    filename: 'KI.svg',
  },
  [LogoId.Kommunikation]: {
    id: LogoId.Kommunikation,
    path: new URL('@/assets/logos/Kommunikation.svg', import.meta.url).href,
    name: 'Kommunikation',
    filename: 'Kommunikation.svg',
  },
  [LogoId.Lesen]: {
    id: LogoId.Lesen,
    path: new URL('@/assets/logos/Lesen.svg', import.meta.url).href,
    name: 'Lesen',
    filename: 'Lesen.svg',
  },
  [LogoId.Mathematik]: {
    id: LogoId.Mathematik,
    path: new URL('@/assets/logos/Mathematik.svg', import.meta.url).href,
    name: 'Mathematik',
    filename: 'Mathematik.svg',
  },
  [LogoId.Medien]: {
    id: LogoId.Medien,
    path: new URL('@/assets/logos/Medien.svg', import.meta.url).href,
    name: 'Medien',
    filename: 'Medien.svg',
  },
  [LogoId.Naturwissenschaften]: {
    id: LogoId.Naturwissenschaften,
    path: new URL('@/assets/logos/Naturwissenschaften.svg', import.meta.url).href,
    name: 'Naturwissenschaften',
    filename: 'Naturwissenschaften.svg',
  },
  [LogoId.Organisation]: {
    id: LogoId.Organisation,
    path: new URL('@/assets/logos/Organisation.svg', import.meta.url).href,
    name: 'Organisation',
    filename: 'Organisation.svg',
  },
  [LogoId.Schreiben]: {
    id: LogoId.Schreiben,
    path: new URL('@/assets/logos/Schreiben.svg', import.meta.url).href,
    name: 'Schreiben',
    filename: 'Schreiben.svg',
  },
  [LogoId.Schule]: {
    id: LogoId.Schule,
    path: new URL('@/assets/logos/Schule.svg', import.meta.url).href,
    name: 'Schule',
    filename: 'Schule.svg',
  },
  [LogoId.Schulserver]: {
    id: LogoId.Schulserver,
    path: new URL('@/assets/logos/Schulserver.svg', import.meta.url).href,
    name: 'Schulserver',
    filename: 'Schulserver.svg',
  },
  [LogoId.Sport]: {
    id: LogoId.Sport,
    path: new URL('@/assets/logos/Sport.svg', import.meta.url).href,
    name: 'Sport',
    filename: 'Sport.svg',
  },
  [LogoId.Sprachen]: {
    id: LogoId.Sprachen,
    path: new URL('@/assets/logos/Sprachen.svg', import.meta.url).href,
    name: 'Sprachen',
    filename: 'Sprachen.svg',
  },
  [LogoId.Suchen]: {
    id: LogoId.Suchen,
    path: new URL('@/assets/logos/Suchen.svg', import.meta.url).href,
    name: 'Suchen',
    filename: 'Suchen.svg',
  },
  [LogoId.Ueben]: {
    id: LogoId.Ueben,
    path: new URL('@/assets/logos/Ueben.svg', import.meta.url).href,
    name: 'Üben',
    filename: 'Ueben.svg',
  },
  [LogoId.Werkzeug]: {
    id: LogoId.Werkzeug,
    path: new URL('@/assets/logos/Werkzeug.svg', import.meta.url).href,
    name: 'Werkzeug',
    filename: 'Werkzeug.svg',
  },
  [LogoId.Wissen]: {
    id: LogoId.Wissen,
    path: new URL('@/assets/logos/Wissen.svg', import.meta.url).href,
    name: 'Wissen',
    filename: 'Wissen.svg',
  },
  [LogoId.Zusammenarbeit]: {
    id: LogoId.Zusammenarbeit,
    path: new URL('@/assets/logos/Zusammenarbeit.svg', import.meta.url).href,
    name: 'Zusammenarbeit',
    filename: 'Zusammenarbeit.svg',
  },
};

/**
 * Check if a logo ID is valid
 */
export function isValidLogoId(logoId: number): logoId is LogoId {
  return logoId in LOGO_CATALOG;
}

/**
 * Get logo configuration by ID (number or enum)
 * Returns undefined if ID is not found
 */
export function getLogoConfig(logoId?: number | LogoId | null): LogoConfig | undefined {
  if (logoId === undefined || logoId === null) {
    return undefined;
  }
  if (isValidLogoId(logoId)) {
    return LOGO_CATALOG[logoId];
  }
  return undefined;
}

/**
 * Get all available logos for the selector
 */
export function getAvailableLogos(): LogoConfig[] {
  return Object.values(LOGO_CATALOG);
}

/**
 * Get logo path by ID
 */
export function getLogoPath(logoId?: number | LogoId): string | undefined {
  const config: LogoConfig | undefined = getLogoConfig(logoId);
  return config?.path;
}

/**
 * Get logo name by ID (for display purposes)
 */
export function getLogoName(logoId?: number | LogoId): string | undefined {
  const config: LogoConfig | undefined = getLogoConfig(logoId);
  return config?.name;
}
