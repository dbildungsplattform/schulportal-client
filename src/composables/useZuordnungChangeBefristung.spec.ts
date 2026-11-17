import i18n from '@/plugins/i18n';
import axiosApiInstance from '@/services/ApiService';
import { OrganisationsTyp, type Organisation } from '@/stores/OrganisationStore';
import {
  mapZuordnungToPersonenkontextUpdate,
  usePersonenkontextStore,
  type PersonenkontextStore,
} from '@/stores/PersonenkontextStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import { RollenMerkmal, useRolleStore, type RolleStore } from '@/stores/RolleStore';
import { Zuordnung } from '@/stores/types/Zuordnung';
import { BefristungOption } from '@/utils/befristung';
import { adjustDateForTimezoneAndFormat, formatDateToISO, getNextSchuljahresende } from '@/utils/date';
import type { ZuordnungenWorkingState, ZuordnungWithKlasse } from '@/utils/zuordnungen';
import { flushPromises } from '@vue/test-utils';
import MockAdapter from 'axios-mock-adapter';
import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import { effectScope, ref, type EffectScope, type Ref } from 'vue';
import type { Composer } from 'vue-i18n';
import { useZuordnungChangeBefristung, type ZuordnungChangeBefristung } from './useZuordnungChangeBefristung';
import { useZuordnungEditMode, type ZuordnungEditMode, type ZuordnungOperationMode } from './useZuordnungEditMode';

// The Befristung utils use a module-level RolleStore that is created on import, so it is read the same way here
const rolleStore: RolleStore = useRolleStore();
const mockAdapter: MockAdapter = new MockAdapter(axiosApiInstance);
const t: Composer['t'] = i18n.global.t;

describe('useZuordnungChangeBefristung', () => {
  const nextYear: number = new Date().getFullYear() + 2;
  const futureDate: string = `15.03.${nextYear}`;
  const otherFutureDate: string = `20.04.${nextYear}`;

  let scope: EffectScope;
  let personStore: PersonStore;
  let personenkontextStore: PersonenkontextStore;
  let editMode: ZuordnungEditMode;
  let mode: ZuordnungOperationMode;
  let state: ZuordnungenWorkingState;
  let isEditActive: Ref<boolean>;
  let personId: string;
  let schule: Organisation;
  let selectedZuordnung: ZuordnungWithKlasse;
  let klassenZuordnung: Zuordnung;
  let otherZuordnung: Zuordnung;

  function createState(): ZuordnungenWorkingState {
    return {
      selectedZuordnungen: ref<ZuordnungWithKlasse[]>([]),
      zuordnungenWithPendingChanges: ref<ZuordnungWithKlasse[] | undefined>(undefined),
      newZuordnung: ref<ZuordnungWithKlasse | undefined>(undefined),
      zuordnungenToBePersisted: ref<Zuordnung[]>([]),
    };
  }

  function createComposable(
    workingState: ZuordnungenWorkingState = state,
    operationMode: ZuordnungOperationMode = mode,
  ): ZuordnungChangeBefristung {
    return scope.run(() =>
      useZuordnungChangeBefristung({
        t,
        personId: ref(personId),
        isEditActive,
        mode: operationMode,
        state: workingState,
      }),
    )!;
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    mockAdapter.reset();
    rolleStore.$reset();
    scope = effectScope();
    personStore = usePersonStore();
    personenkontextStore = usePersonenkontextStore();
    editMode = useZuordnungEditMode();
    mode = editMode.forOperation('changeBefristung');
    state = createState();
    isEditActive = ref(true);
    personId = DoFactory.getPerson().id;

    schule = DoFactory.getSchule();
    const rolleId: string = DoFactory.getRolle().id;
    selectedZuordnung = DoFactory.getZuordnung(
      { rolleId, befristung: formatDateToISO(futureDate)! },
      { organisation: schule },
    );
    klassenZuordnung = DoFactory.getZuordnung(
      {
        rolleId,
        befristung: formatDateToISO(futureDate)!,
        typ: OrganisationsTyp.Klasse,
        administriertVon: schule.id,
      },
      { organisation: DoFactory.getKlasse(schule) },
    );
    otherZuordnung = DoFactory.getZuordnung();
    personStore.personenuebersicht = DoFactory.getPersonenUebersicht(DoFactory.getPerson({ id: personId }), [
      selectedZuordnung,
      klassenZuordnung,
      otherZuordnung,
    ]);
    state.selectedZuordnungen.value = [selectedZuordnung];
  });

  afterEach(() => {
    scope.stop();
  });

  describe('triggerChangeBefristung', () => {
    it('should show the form with the Rolle and the current Befristung of the selected Zuordnung', () => {
      const composable: ZuordnungChangeBefristung = createComposable();

      composable.triggerChangeBefristung();

      expect(composable.isChangeBefristungActive.value).toBe(true);
      expect(composable.changeBefristungFormContext.values.selectedRolle).toBe(selectedZuordnung.rolleId);
      expect(composable.selectedChangeBefristung.value).toBe(
        adjustDateForTimezoneAndFormat(selectedZuordnung.befristung!),
      );
    });

    it('should select the option Schuljahresende if the Befristung is the next Schuljahresende', () => {
      selectedZuordnung.befristung = formatDateToISO(getNextSchuljahresende())!;
      const composable: ZuordnungChangeBefristung = createComposable();

      composable.triggerChangeBefristung();

      expect(composable.selectedChangeBefristungOption.value).toBe(BefristungOption.SCHULJAHRESENDE);
      expect(composable.selectedChangeBefristung.value).toBeUndefined();
    });

    it('should select the option unbefristet if the selected Zuordnung has no Befristung', () => {
      selectedZuordnung.befristung = null;
      const composable: ZuordnungChangeBefristung = createComposable();

      composable.triggerChangeBefristung();

      expect(composable.selectedChangeBefristungOption.value).toBe(BefristungOption.UNBEFRISTET);
      expect(composable.selectedChangeBefristung.value).toBeUndefined();
    });
  });

  describe('differentDateSelected', () => {
    it('should only be true if the selected Befristung differs from the current one', () => {
      const composable: ZuordnungChangeBefristung = createComposable();
      composable.triggerChangeBefristung();
      expect(composable.differentDateSelected.value).toBe(false);

      composable.handleChangeBefristungUpdate(otherFutureDate);
      expect(composable.differentDateSelected.value).toBe(true);
    });

    it('should be true if an unbefristete Zuordnung gets the Schuljahresende', () => {
      selectedZuordnung.befristung = null;
      const composable: ZuordnungChangeBefristung = createComposable();
      composable.triggerChangeBefristung();
      expect(composable.differentDateSelected.value).toBe(false);

      composable.handleChangeBefristungOptionUpdate(getNextSchuljahresende());

      expect(composable.differentDateSelected.value).toBe(true);
    });
  });

  describe('onSubmitChangeBefristung', () => {
    it('should show the confirmation dialog with the old and the new Befristung', async () => {
      const composable: ZuordnungChangeBefristung = createComposable();
      composable.triggerChangeBefristung();
      composable.handleChangeBefristungUpdate(otherFutureDate);

      await composable.onSubmitChangeBefristung();

      expect(composable.changeBefristungConfirmationDialogVisible.value).toBe(true);
      expect(composable.changeBefristungConfirmationDialogMessage.value).toContain(
        adjustDateForTimezoneAndFormat(selectedZuordnung.befristung!),
      );
      expect(composable.changeBefristungConfirmationDialogMessage.value).toContain(otherFutureDate);
    });

    it('should name the new Befristung unbefristet if the unbefristet option is selected', async () => {
      const composable: ZuordnungChangeBefristung = createComposable();
      composable.triggerChangeBefristung();
      await flushPromises();
      composable.handleChangeBefristungOptionUpdate(undefined);

      await composable.onSubmitChangeBefristung();

      expect(composable.changeBefristungConfirmationDialogVisible.value).toBe(true);
      expect(composable.changeBefristungConfirmationDialogMessage.value).toContain('unbefristet');
    });

    it('should not show the confirmation dialog if the Befristung is in the past', async () => {
      const composable: ZuordnungChangeBefristung = createComposable();
      composable.triggerChangeBefristung();
      composable.handleChangeBefristungUpdate('01.01.2000');

      await composable.onSubmitChangeBefristung();

      expect(composable.changeBefristungConfirmationDialogVisible.value).toBe(false);
      expect(composable.changeBefristungConfirmationDialogMessage.value).toBe('');
      expect(composable.selectedChangeBefristungProps.value['error-messages']).not.toHaveLength(0);
    });
  });

  describe('confirmDialogChangeBefristung', () => {
    it('should build the change of the selected Zuordnung and its Klassen and show the review', async () => {
      const composable: ZuordnungChangeBefristung = createComposable();
      composable.triggerChangeBefristung();
      composable.handleChangeBefristungUpdate(otherFutureDate);
      await composable.onSubmitChangeBefristung();

      composable.confirmDialogChangeBefristung();

      const expectedBefristung: string | undefined = formatDateToISO(otherFutureDate);
      expect(composable.changeBefristungConfirmationDialogVisible.value).toBe(false);
      expect(composable.isChangeBefristungActive.value).toBe(false);
      expect(editMode.pendingOperation.value).toBe('changeBefristung');
      expect(state.newZuordnung.value?.sskId).toBe(selectedZuordnung.sskId);
      expect(state.newZuordnung.value?.befristung).toBe(expectedBefristung);
      expect(state.zuordnungenToBePersisted.value).toHaveLength(3);
      expect(state.zuordnungenToBePersisted.value[0]?.befristung).toBe(expectedBefristung);
      expect(state.zuordnungenToBePersisted.value[1]?.befristung).toBe(expectedBefristung);
      expect(state.zuordnungenToBePersisted.value[2]).toEqual(otherZuordnung);
    });

    it('should persist an unbefristet change as no Befristung', async () => {
      const composable: ZuordnungChangeBefristung = createComposable();
      composable.triggerChangeBefristung();
      await flushPromises();
      composable.handleChangeBefristungOptionUpdate(undefined);
      await flushPromises();
      await composable.onSubmitChangeBefristung();

      composable.confirmDialogChangeBefristung();

      expect(state.newZuordnung.value?.befristung).toBeNull();
      expect(state.zuordnungenToBePersisted.value.map((z: Zuordnung) => z.befristung)).toEqual([
        null,
        null,
        otherZuordnung.befristung,
      ]);
    });
  });

  describe('cancelChangeBefristung', () => {
    it('should only close the confirmation dialog', async () => {
      const composable: ZuordnungChangeBefristung = createComposable();
      composable.triggerChangeBefristung();
      composable.handleChangeBefristungUpdate(otherFutureDate);
      await composable.onSubmitChangeBefristung();

      composable.cancelChangeBefristung();

      expect(composable.changeBefristungConfirmationDialogVisible.value).toBe(false);
      expect(composable.isChangeBefristungActive.value).toBe(true);
      expect(state.newZuordnung.value).toBeUndefined();
      expect(state.zuordnungenToBePersisted.value).toEqual([]);
    });
  });

  describe('confirmChangeBefristung', () => {
    async function prepareChange(composable: ZuordnungChangeBefristung): Promise<void> {
      composable.triggerChangeBefristung();
      composable.handleChangeBefristungUpdate(otherFutureDate);
      await composable.onSubmitChangeBefristung();
      composable.confirmDialogChangeBefristung();
    }

    it('should send the Zuordnungen, show the success dialog and reset the selection and the form', async () => {
      mockAdapter
        .onPut(`/api/personenkontext-workflow/${personId}`)
        .replyOnce(200, DoFactory.getPersonenkontextUpdateResponse());
      const composable: ZuordnungChangeBefristung = createComposable();
      await prepareChange(composable);
      const expectedUpdates: ReturnType<typeof mapZuordnungToPersonenkontextUpdate>[] =
        state.zuordnungenToBePersisted.value.map(mapZuordnungToPersonenkontextUpdate);

      await composable.confirmChangeBefristung();

      expect(mockAdapter.history.put).toHaveLength(1);
      const body: { personenkontexte: unknown[] } = JSON.parse(String(mockAdapter.history.put[0]?.data)) as {
        personenkontexte: unknown[];
      };
      expect(body.personenkontexte).toEqual(expectedUpdates.map((update: object) => ({ personId, ...update })));
      expect(composable.changeBefristungSuccessDialogVisible.value).toBe(true);
      expect(state.selectedZuordnungen.value).toEqual([]);
      expect(composable.selectedChangeBefristung.value).toBeUndefined();
    });

    it('should not show the success dialog if persisting fails', async () => {
      mockAdapter.onPut(`/api/personenkontext-workflow/${personId}`).replyOnce(500, { i18nKey: 'SOME_ERROR' });
      const composable: ZuordnungChangeBefristung = createComposable();
      await prepareChange(composable);

      await composable.confirmChangeBefristung();

      expect(personenkontextStore.errorCode).toBe('SOME_ERROR');
      expect(composable.changeBefristungSuccessDialogVisible.value).toBe(false);
      expect(state.selectedZuordnungen.value).toEqual([]);
    });
  });

  describe('closeChangeBefristungSuccessDialog', () => {
    it('should reload the Zuordnungen, hide the dialog and end the edit mode', async () => {
      mockAdapter
        .onGet(`/api/dbiam/personenuebersicht/${personId}`)
        .replyOnce(200, DoFactory.getDBiamPersonenuebersichtResponse({ personId }));
      const composable: ZuordnungChangeBefristung = createComposable();
      composable.triggerChangeBefristung();
      composable.changeBefristungSuccessDialogVisible.value = true;

      composable.closeChangeBefristungSuccessDialog();
      await flushPromises();

      expect(mockAdapter.history.get).toHaveLength(1);
      expect(composable.changeBefristungSuccessDialogVisible.value).toBe(false);
      expect(composable.isChangeBefristungActive.value).toBe(false);
      expect(editMode.isFormActive.value).toBe(false);
      expect(isEditActive.value).toBe(false);
      expect(personStore.personenuebersicht?.personId).toBe(personId);
    });
  });

  describe('Befristungspflicht of the Rolle', () => {
    function addBefristungspflichtRolle(rolleId: string): void {
      rolleStore.rollenForPersonenkontextCreation = [
        {
          value: rolleId,
          title: DoFactory.getRolle().name,
          rollenart: selectedZuordnung.rollenArt,
          merkmale: [RollenMerkmal.BefristungPflicht],
        },
      ];
    }

    it('should own independent refs per composable instance', async () => {
      addBefristungspflichtRolle(selectedZuordnung.rolleId);
      const first: ZuordnungChangeBefristung = createComposable();
      const second: ZuordnungChangeBefristung = createComposable(
        createState(),
        editMode.forOperation('changeBefristung'),
      );

      first.triggerChangeBefristung();
      await vi.waitFor(() => expect(first.isChangeBefristungRequired.value).toBe(true));

      expect(first.isChangeBefristungUnbefristetDisabled.value).toBe(true);
      expect(second.isChangeBefristungRequired.value).toBe(false);
      expect(second.isChangeBefristungUnbefristetDisabled.value).toBe(false);
      expect(first.isChangeBefristungRequired).not.toBe(first.isChangeBefristungUnbefristetDisabled);
    });

    it('should not require a Befristung for a Rolle without Befristungspflicht', async () => {
      const composable: ZuordnungChangeBefristung = createComposable();

      composable.triggerChangeBefristung();
      await flushPromises();

      expect(composable.isChangeBefristungRequired.value).toBe(false);
      expect(composable.isChangeBefristungUnbefristetDisabled.value).toBe(false);
    });
  });
});
