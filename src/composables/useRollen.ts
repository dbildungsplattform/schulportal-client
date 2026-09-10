import { usePersonenkontextStore, type PersonenkontextStore } from '@/stores/PersonenkontextStore';
import type { RollenArt, RollenMerkmal, RolleResponse } from '@/stores/RolleStore';
import { computed, type ComputedRef } from 'vue';

export type TranslatedRolleWithAttrs = {
  value: string;
  title: string;
  merkmale?: Array<RollenMerkmal>;
  rollenart: RollenArt;
};
export function useRollen(): ComputedRef<TranslatedRolleWithAttrs[] | undefined> {
  const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();

  return computed(() => {
    return personenkontextStore.workflowStepResponse?.rollen
      .map((rolle: RolleResponse) => ({
        value: rolle.id,
        title: rolle.name,
        merkmale: rolle.merkmale,
        rollenart: rolle.rollenart, // Include Rollenart in the object
      }))
      .sort((a: TranslatedRolleWithAttrs, b: TranslatedRolleWithAttrs) => a.title.localeCompare(b.title));
  });
}
