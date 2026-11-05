import { RollenMerkmal, RollenSystemRechtEnum } from '@/api-client/generated/api';

/** System rights that gate roles carrying the paired role merkmal. */
export const GATED_ROLLEN_SYSTEMRECHTE: RollenSystemRechtEnum[] = [
  RollenSystemRechtEnum.MptRollenZuordnen,
  RollenSystemRechtEnum.Pilot1RollenZuordnen,
  RollenSystemRechtEnum.Pilot2RollenZuordnen,
  RollenSystemRechtEnum.Pilot3RollenZuordnen,
  RollenSystemRechtEnum.Pilot4RollenZuordnen,
  RollenSystemRechtEnum.Pilot5RollenZuordnen,
];

/** Role merkmale paired with GATED_ROLLEN_SYSTEMRECHTE in the same order. */
export const GATED_ROLLEN_MERKMALE: RollenMerkmal[] = [
  RollenMerkmal.MptRolle,
  RollenMerkmal.Pilot1Rolle,
  RollenMerkmal.Pilot2Rolle,
  RollenMerkmal.Pilot3Rolle,
  RollenMerkmal.Pilot4Rolle,
  RollenMerkmal.Pilot5Rolle,
];
