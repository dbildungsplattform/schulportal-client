import {
  useRolleStore,
  type RollenArt,
  type RollenMerkmal,
  type RolleResponse,
  type RolleStore,
} from '@/stores/RolleStore';
import { computed, type ComputedRef } from 'vue';

export type TranslatedRolleWithAttrs = {
  value: string;
  title: string;
  merkmale?: Array<RollenMerkmal>;
  rollenart: RollenArt;
};
export function useRollen(): ComputedRef<TranslatedRolleWithAttrs[] | undefined> {
  const rolleStore: RolleStore = useRolleStore();

  return computed(() => {
    return rolleStore.rollenForPersonenkontextCreation
      .map((rolle: RolleResponse) => ({
        value: rolle.id,
        title: rolle.name,
        merkmale: rolle.merkmale,
        rollenart: rolle.rollenart, // Include Rollenart in the object
      }))
      .sort((a: TranslatedRolleWithAttrs, b: TranslatedRolleWithAttrs) => a.title.localeCompare(b.title));
  });
}
