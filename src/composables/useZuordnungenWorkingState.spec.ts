import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import { RollenArt } from '@/stores/RolleStore';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import type { ZuordnungWithKlasse } from '@/utils/zuordnungen';
import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import { effectScope, nextTick, ref, type EffectScope, type Ref } from 'vue';
import { onTestFinished } from 'vitest';
import { useZuordnungenWorkingState, type ZuordnungenWorkingStateResult } from './useZuordnungenWorkingState';

type WorkingStateSetup = {
  personStore: PersonStore;
  personId: Ref<string>;
  lernZuordnung: Zuordnung;
  lehrZuordnung: Zuordnung;
  readonlyZuordnung: Zuordnung;
  createWorkingState: () => ZuordnungenWorkingStateResult;
  setUebersicht: (zuordnungen: Zuordnung[]) => void;
};

describe('useZuordnungenWorkingState', () => {
  const setup = (): WorkingStateSetup => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
    const scope: EffectScope = effectScope();
    onTestFinished(() => scope.stop());

    const personStore: PersonStore = usePersonStore();
    const personId: Ref<string> = ref(DoFactory.getPerson().id);

    const lernZuordnung: Zuordnung = DoFactory.getZuordnung({ rollenArt: RollenArt.Lern });
    const lehrZuordnung: Zuordnung = DoFactory.getZuordnung({ rollenArt: RollenArt.Lehr });
    const readonlyZuordnung: Zuordnung = DoFactory.getZuordnung({ rollenArt: RollenArt.Lehr, editable: false });

    const createWorkingState = (): ZuordnungenWorkingStateResult => scope.run(() => useZuordnungenWorkingState())!;

    const setUebersicht = (zuordnungen: Zuordnung[]): void => {
      personStore.personenuebersicht = DoFactory.getPersonenUebersicht(
        DoFactory.getPerson({ id: personId.value }),
        zuordnungen,
      );
    };

    return {
      personStore,
      personId,
      lernZuordnung,
      lehrZuordnung,
      readonlyZuordnung,
      createWorkingState,
      setUebersicht,
    };
  };

  describe('zuordnungenWithPendingChanges', () => {
    it('should be empty if there is no Personenuebersicht', () => {
      const { createWorkingState }: WorkingStateSetup = setup();
      const workingState: ZuordnungenWorkingStateResult = createWorkingState();

      expect(workingState.zuordnungenWithPendingChanges.value).toBeUndefined();
      expect(workingState.editableZuordnungen.value).toEqual([]);
    });

    it('should be computed from the Personenuebersicht immediately and follow later updates', async () => {
      const { createWorkingState, setUebersicht, lernZuordnung, lehrZuordnung }: WorkingStateSetup = setup();
      setUebersicht([lernZuordnung]);
      const workingState: ZuordnungenWorkingStateResult = createWorkingState();

      expect(workingState.zuordnungenWithPendingChanges.value).toHaveLength(1);

      setUebersicht([lernZuordnung, lehrZuordnung]);
      await nextTick();

      expect(workingState.zuordnungenWithPendingChanges.value).toHaveLength(2);
    });

    it('should only offer editable Zuordnungen', () => {
      const { createWorkingState, setUebersicht, lehrZuordnung, readonlyZuordnung }: WorkingStateSetup = setup();
      setUebersicht([lehrZuordnung, readonlyZuordnung]);
      const workingState: ZuordnungenWorkingStateResult = createWorkingState();

      expect(workingState.zuordnungenWithPendingChanges.value).toHaveLength(2);
      expect(workingState.editableZuordnungen.value.map((z: Zuordnung) => z.sskId)).toEqual([lehrZuordnung.sskId]);
    });
  });

  describe('selection', () => {
    it('should allow changing the Klasse only if exactly one Lern Zuordnung is selected', async () => {
      const { createWorkingState, setUebersicht, lernZuordnung, lehrZuordnung }: WorkingStateSetup = setup();
      setUebersicht([lernZuordnung, lehrZuordnung]);
      const workingState: ZuordnungenWorkingStateResult = createWorkingState();
      const select = (...selected: Zuordnung[]): void => {
        workingState.selectedZuordnungen.value = (workingState.zuordnungenWithPendingChanges.value ?? []).filter(
          (pending: ZuordnungWithKlasse) => selected.some((zuordnung: Zuordnung) => zuordnung.sskId === pending.sskId),
        );
      };
      select(lernZuordnung);
      await nextTick();
      expect(workingState.canChangeKlasse.value).toBe(true);

      select(lernZuordnung, lehrZuordnung);
      await nextTick();
      expect(workingState.canChangeKlasse.value).toBe(false);

      select(lehrZuordnung);
      await nextTick();
      expect(workingState.canChangeKlasse.value).toBe(false);

      select(lernZuordnung);
      await nextTick();
      workingState.selectedZuordnungen.value = [];
      await nextTick();
      expect(workingState.canChangeKlasse.value).toBe(false);
    });
  });

  describe('startEditing and discardChanges', () => {
    it('should restore a copy of the Zuordnungen from before the changes and drop the selection', () => {
      const { createWorkingState, setUebersicht, lernZuordnung, lehrZuordnung }: WorkingStateSetup = setup();
      setUebersicht([lernZuordnung, lehrZuordnung]);
      const workingState: ZuordnungenWorkingStateResult = createWorkingState();
      const originalFirst: ZuordnungWithKlasse | undefined = workingState.zuordnungenWithPendingChanges.value?.[0];
      const originalBefristung: string | null | undefined = originalFirst?.befristung;

      workingState.startEditing();
      workingState.selectedZuordnungen.value = originalFirst ? [originalFirst] : [];
      workingState.zuordnungenWithPendingChanges.value = workingState.zuordnungenWithPendingChanges.value?.slice(1);
      if (originalFirst) {
        originalFirst.befristung = null;
      }

      workingState.discardChanges();

      const restored: ZuordnungWithKlasse[] | undefined = workingState.zuordnungenWithPendingChanges.value;
      expect(restored).toHaveLength(2);
      expect(restored?.[0]).not.toBe(originalFirst);
      expect(restored?.[0]?.befristung).toBe(originalBefristung);
      expect(workingState.selectedZuordnungen.value).toEqual([]);
    });
  });
});
