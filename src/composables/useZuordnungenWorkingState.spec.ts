import { OperationContext, usePersonenkontextStore, type PersonenkontextStore } from '@/stores/PersonenkontextStore';
import { OrganisationsTyp, type Organisation } from '@/stores/OrganisationStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import { RollenArt, RollenMerkmal } from '@/stores/RolleStore';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import type { ZuordnungWithKlasse } from '@/utils/zuordnungen';
import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import { effectScope, nextTick, ref, type EffectScope, type Ref } from 'vue';
import { useZuordnungenWorkingState, type ZuordnungenWorkingStateResult } from './useZuordnungenWorkingState';

describe('useZuordnungenWorkingState', () => {
  let scope: EffectScope;
  let personStore: PersonStore;
  let personenkontextStore: PersonenkontextStore;
  let personId: Ref<string>;
  let schule: Organisation;
  let klasse: Organisation;
  let lernZuordnung: Zuordnung;
  let klassenZuordnung: Zuordnung;
  let lehrZuordnung: Zuordnung;
  let readonlyZuordnung: Zuordnung;

  function createWorkingState(): ZuordnungenWorkingStateResult {
    return scope.run(() => useZuordnungenWorkingState({ personId }))!;
  }

  function setUebersicht(zuordnungen: Zuordnung[]): void {
    personStore.personenuebersicht = DoFactory.getPersonenUebersicht(
      DoFactory.getPerson({ id: personId.value }),
      zuordnungen,
    );
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
    scope = effectScope();

    personStore = usePersonStore();
    personenkontextStore = usePersonenkontextStore();
    vi.spyOn(personenkontextStore, 'processWorkflowStep').mockResolvedValue();
    personId = ref(DoFactory.getPerson().id);

    schule = DoFactory.getSchule();
    klasse = DoFactory.getKlasse(schule);
    lernZuordnung = DoFactory.getZuordnung({ rollenArt: RollenArt.Lern }, { organisation: schule });
    klassenZuordnung = DoFactory.getZuordnung(
      {
        sskId: klasse.id,
        sskName: klasse.name,
        rolleId: lernZuordnung.rolleId,
        rolle: lernZuordnung.rolle,
        rollenArt: RollenArt.Lern,
        administriertVon: schule.id,
        typ: OrganisationsTyp.Klasse,
      },
      { organisation: klasse },
    );
    lehrZuordnung = DoFactory.getZuordnung({ rollenArt: RollenArt.Lehr });
    readonlyZuordnung = DoFactory.getZuordnung({ rollenArt: RollenArt.Lehr, editable: false });
  });

  afterEach(() => scope.stop());

  describe('zuordnungenWithPendingChanges', () => {
    it('should be empty if there is no Personenuebersicht', () => {
      const workingState: ZuordnungenWorkingStateResult = createWorkingState();

      expect(workingState.zuordnungenWithPendingChanges.value).toBeUndefined();
      expect(workingState.editableZuordnungen.value).toEqual([]);
    });

    it('should merge the Klassen into their Zuordnungen immediately and follow later updates', async () => {
      setUebersicht([lernZuordnung, klassenZuordnung]);
      const workingState: ZuordnungenWorkingStateResult = createWorkingState();

      expect(workingState.zuordnungenWithPendingChanges.value).toHaveLength(1);
      expect(workingState.zuordnungenWithPendingChanges.value?.[0]?.sskId).toBe(schule.id);
      expect(workingState.zuordnungenWithPendingChanges.value?.[0]?.klasse).toBe(klasse.name);

      setUebersicht([lernZuordnung, klassenZuordnung, lehrZuordnung]);
      await nextTick();

      expect(workingState.zuordnungenWithPendingChanges.value).toHaveLength(2);
    });

    it('should only offer editable Zuordnungen', () => {
      setUebersicht([lehrZuordnung, readonlyZuordnung]);
      const workingState: ZuordnungenWorkingStateResult = createWorkingState();

      expect(workingState.zuordnungenWithPendingChanges.value).toHaveLength(2);
      expect(workingState.editableZuordnungen.value.map((z: Zuordnung) => z.sskId)).toEqual([lehrZuordnung.sskId]);
    });
  });

  describe('selection', () => {
    let workingState: ZuordnungenWorkingStateResult;

    beforeEach(() => {
      setUebersicht([lernZuordnung, lehrZuordnung]);
      workingState = createWorkingState();
    });

    function select(...selected: Zuordnung[]): void {
      workingState.selectedZuordnungen.value = (workingState.zuordnungenWithPendingChanges.value ?? []).filter(
        (pending: ZuordnungWithKlasse) => selected.some((zuordnung: Zuordnung) => zuordnung.sskId === pending.sskId),
      );
    }

    it('should not load the workflow step without a selection', async () => {
      await nextTick();

      expect(personenkontextStore.processWorkflowStep).not.toHaveBeenCalled();
      expect(workingState.canChangeKlasse.value).toBe(false);
    });

    it('should load the workflow step of the first selected Zuordnung', async () => {
      select(lernZuordnung, lehrZuordnung);
      await nextTick();

      expect(personenkontextStore.processWorkflowStep).toHaveBeenCalledOnce();
      expect(personenkontextStore.processWorkflowStep).toHaveBeenCalledWith({
        personId: personId.value,
        operationContext: OperationContext.PERSON_BEARBEITEN,
        organisationId: workingState.selectedZuordnungen.value[0]?.sskId,
        rollenIds: [workingState.selectedZuordnungen.value[0]?.rolleId],
        limit: 25,
      });
    });

    it('should allow changing the Klasse only if exactly one Lern Zuordnung is selected', async () => {
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
      setUebersicht([lernZuordnung, lehrZuordnung]);
      const workingState: ZuordnungenWorkingStateResult = createWorkingState();
      const originalSskIds: string[] = (workingState.zuordnungenWithPendingChanges.value ?? []).map(
        (z: Zuordnung) => z.sskId,
      );
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
      expect(restored?.map((z: Zuordnung) => z.sskId)).toEqual(originalSskIds);
      expect(restored?.[0]).not.toBe(originalFirst);
      expect(restored?.[0]?.befristung).toBe(originalBefristung);
      expect(workingState.selectedZuordnungen.value).toEqual([]);
    });

    it('should not be affected by changes of the restored Zuordnungen when discarding again', () => {
      setUebersicht([lernZuordnung, klassenZuordnung]);
      const workingState: ZuordnungenWorkingStateResult = createWorkingState();

      workingState.startEditing();
      workingState.discardChanges();
      const restored: ZuordnungWithKlasse | undefined = workingState.zuordnungenWithPendingChanges.value?.[0];
      restored?.merkmale.push(RollenMerkmal.KopersPflicht);
      workingState.discardChanges();

      expect(workingState.zuordnungenWithPendingChanges.value?.[0]?.merkmale).toEqual([]);
      expect(workingState.zuordnungenWithPendingChanges.value?.[0]?.klasse).toBe(klasse.name);
    });
  });
});
