import { watch, type Ref } from 'vue';
import { getNextSchuljahresende } from './date';
import type { useForm } from 'vee-validate';
import { RollenMerkmal, TranslatedRolleWithAttrs, useRolleStore, type RolleStore } from '@/stores/RolleStore';

const rolleStore: RolleStore = useRolleStore();

export enum BefristungOption {
  SCHULJAHRESENDE = 'schuljahresende',
  UNBEFRISTET = 'unbefristet',
}

type Props = {
  selectedBefristung: Ref<string | undefined>;
  selectedBefristungOption: Ref<string | undefined>;
  calculatedBefristung: Ref<string | undefined>;
  formContext: ReturnType<typeof useForm>;
  selectedRollen: Ref<Array<string | TranslatedRolleWithAttrs> | undefined>;
};

export type BefristungUtilsType = {
  handleBefristungUpdate: (value: string | undefined) => void;
  handleBefristungOptionUpdate: (value: string | undefined) => void;
  setupWatchers: () => void;
  setupRolleWatcher: () => void;
};

// Checks if the selected Rolle has Befristungspflicht
export async function isBefristungspflichtRolle(
  selectedRollen: Array<string | TranslatedRolleWithAttrs> | undefined,
): Promise<boolean> {
  if (!selectedRollen || selectedRollen.length === 0) {
    return false;
  }

  const existingRollen: TranslatedRolleWithAttrs[] = rolleStore.rollenForPersonenkontextCreation ?? [];

  for (const selection of selectedRollen) {
    let rolle: TranslatedRolleWithAttrs | undefined =
      typeof selection === 'string'
        ? existingRollen.find((r: TranslatedRolleWithAttrs) => r.value === selection)
        : selection;

    // Load missing rolle
    if (!rolle && typeof selection === 'string') {
      // eslint-disable-next-line no-await-in-loop
      await rolleStore.getRolleById(selection);
      if (rolleStore.currentRolle) {
        // Map currentRolle to TranslatedRolleWithAttrs
        rolle = {
          ...rolleStore.currentRolle,
          value: rolleStore.currentRolle.id,
          title: rolleStore.currentRolle.name,
        };
      }
    }

    if (Array.isArray(rolle?.merkmale) && rolle.merkmale.includes(RollenMerkmal.BefristungPflicht)) {
      return true;
    }
  }

  return false;
}

/**
 * Provides utilities for managing Befristung-related state and logic.
 */
export function useBefristungUtils(props: {
  formContext: ReturnType<typeof useForm>;
  selectedBefristung: Ref<string | undefined>;
  selectedBefristungOption: Ref<string | undefined>;
  calculatedBefristung: Ref<string | undefined>;
  selectedRollen: Ref<Array<string | TranslatedRolleWithAttrs> | undefined>;
}): BefristungUtilsType {
  const { selectedBefristung, selectedBefristungOption, calculatedBefristung, selectedRollen, formContext }: Props =
    props;

  const handleBefristungUpdate = (value: string | undefined): void => {
    selectedBefristung.value = value;
  };

  const handleBefristungOptionUpdate = (value: string | undefined): void => {
    calculatedBefristung.value = value;
    if (!value) {
      selectedBefristungOption.value = BefristungOption.UNBEFRISTET;
      return;
    }
    selectedBefristungOption.value = BefristungOption.SCHULJAHRESENDE;
  };

  // Function to set an initial value for the radio buttons depending on the selected Rolle
  const setupRolleWatcher = (): void => {
    watch(
      selectedRollen,
      async (newValue: Array<string | TranslatedRolleWithAttrs> | undefined) => {
        if (newValue) {
          if (await isBefristungspflichtRolle(newValue)) {
            selectedBefristungOption.value = BefristungOption.SCHULJAHRESENDE;
            calculatedBefristung.value = getNextSchuljahresende();
          } else {
            selectedBefristungOption.value = BefristungOption.UNBEFRISTET;
            calculatedBefristung.value = undefined;
          }
        }
      },
      { immediate: true },
    );
  };

  // Setup the watchers
  const setupWatchers = (): void => {
    const createWatcher = <T>(
      watchedValue: Ref<T | undefined>,
      onValueChange: (newValue: T | undefined) => void,
    ): void => {
      watch(watchedValue, onValueChange, { immediate: true });
    };

    // Watcher for resetting radio button when a date is picked using date-input
    createWatcher(selectedBefristung, (newValue: string | undefined) => {
      if (newValue) {
        selectedBefristungOption.value = undefined;
      }
    });

    // Watcher for resetting the text input for date if a radio button was selected
    createWatcher(selectedBefristungOption, (newValue: string | undefined) => {
      if (newValue) {
        formContext.resetField('selectedBefristung');
      }
    });
  };

  return {
    handleBefristungUpdate,
    handleBefristungOptionUpdate,
    setupWatchers,
    setupRolleWatcher,
  };
}
