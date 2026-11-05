import { formatDateDigitsToGermanDate } from './date';

export enum PersonLockOccasion {
  MANUELL_GESPERRT = 'MANUELL_GESPERRT',
  KOPERS_GESPERRT = 'KOPERS_GESPERRT',
}

export enum LockKeys {
  PersonId = 'personId',
  LockedBy = 'locked_by',
  CreatedAt = 'created_at',
  LockedUntil = 'locked_until',
  LockOccasion = 'lock_occasion',
}
export type UserLock = {
  personId: string;
  locked_by: string;
  created_at: string;
  locked_until: string;
  lock_occasion: PersonLockOccasion;
};

export function parseUserLock(unparsedArray: object[]): UserLock[] {
  const parsedLocks: UserLock[] = [];

  for (const unparsed of unparsedArray) {
    const result: Partial<UserLock> = {};

    if (LockKeys.LockOccasion in unparsed && unparsed[LockKeys.LockOccasion] === PersonLockOccasion.MANUELL_GESPERRT) {
      // Process "MANUELL_GESPERRT" entries
      if (LockKeys.LockedBy in unparsed) {
        result.locked_by = '' + (unparsed[LockKeys.LockedBy] as string);
      }
      if (LockKeys.CreatedAt in unparsed) {
        result.created_at = '' + (unparsed[LockKeys.CreatedAt] as string);
        result.created_at = formatDateDigitsToGermanDate(new Date(result.created_at));
      }
      if (LockKeys.LockedUntil in unparsed) {
        result.locked_until = '' + (unparsed[LockKeys.LockedUntil] as string);
        // Parse the UTC date
        const utcDate: Date = new Date(result.locked_until);

        // Adjust date for MESZ (German summer time) if necessary
        if (utcDate.getTimezoneOffset() >= -120) {
          utcDate.setDate(utcDate.getDate() - 1);
        }
        result.locked_until = formatDateDigitsToGermanDate(utcDate);
      }
      result.lock_occasion = unparsed[LockKeys.LockOccasion];
    } else if (
      LockKeys.LockOccasion in unparsed &&
      unparsed[LockKeys.LockOccasion] === PersonLockOccasion.KOPERS_GESPERRT
    ) {
      result.lock_occasion = PersonLockOccasion.KOPERS_GESPERRT;
    }

    if (Object.keys(result).length > 0) {
      parsedLocks.push(result as UserLock);
    }
  }

  return parsedLocks;
}
