import type { InternalZuordnung } from '@/stores/types/bulkOperationTypes';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import { isBefore, parseISO } from 'date-fns';

/**
 * Checks if a person has any zuordnung for the given organisation.
 *
 * @param zuordnungen - Array of zuordnungen to check
 * @param organisationId - Organisation ID to check for
 * @returns True if at least one zuordnung exists for the organisation
 */
export function hasZuordnungForOrganisation(zuordnungen: InternalZuordnung[], organisationId: string): boolean {
  return zuordnungen.some((z: InternalZuordnung) => z.organisationId === organisationId);
}

/**
 * Calculates the earliest befristung date by comparing the new date with existing ones.
 * Returns the earliest date between the new befristung and any existing befristung
 * for the given organisation.
 *
 * @param newBefristung - New befristung date (ISO string)
 * @param currentZuordnungen - Current zuordnungen to check against
 * @param organisationId - Organisation ID to filter by
 * @returns The earliest befristung date (ISO string)
 */
export function calculateEarliestBefristung(
  newBefristung: string,
  currentZuordnungen: InternalZuordnung[],
  organisationId: string,
): string {
  const parsedNew: Date = parseISO(newBefristung);
  return currentZuordnungen.reduce((earliest: string, z: InternalZuordnung) => {
    if (z.organisationId === organisationId && z.befristung) {
      const parsedOld: Date = parseISO(z.befristung);
      return isBefore(parsedOld, parsedNew) ? z.befristung : earliest;
    }
    return earliest;
  }, newBefristung);
}

/**
 * Checks if a person would have any editable zuordnungen left after removal.
 * Used to prevent removing a person's last editable zuordnung, which would make
 * them disappear from the admin's view.
 *
 * @param zuordnungen - All zuordnungen to check
 * @param shouldRemove - Predicate function that determines if a zuordnung should be removed
 * @returns True if at least one editable zuordnung would remain after removal
 */
export function hasEditableZuordnungsLeft(zuordnungen: Zuordnung[], shouldRemove: (z: Zuordnung) => boolean): boolean {
  return zuordnungen.filter((z: Zuordnung) => !shouldRemove(z) && z.editable).length > 0;
}
