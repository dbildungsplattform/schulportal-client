import i18n from '@/plugins/i18n';
import axiosApiInstance from '@/services/ApiService';
import { OrganisationsTyp, type Organisation } from '@/stores/OrganisationStore';
import {
  mapZuordnungToPersonenkontextUpdate,
  usePersonenkontextStore,
  type PersonenkontextStore,
} from '@/stores/PersonenkontextStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import { RollenArt } from '@/stores/RolleStore';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import {
  computeZuordnungenWithKlasse,
  type ZuordnungenWorkingState,
  type ZuordnungWithKlasse,
} from '@/utils/zuordnungen';
import { flushPromises } from '@vue/test-utils';
import MockAdapter from 'axios-mock-adapter';
import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import { effectScope, ref, type EffectScope, type Ref } from 'vue';
import type { Composer } from 'vue-i18n';
import { useZuordnungChangeKlasse, type ZuordnungChangeKlasse } from './useZuordnungChangeKlasse';
import { useZuordnungEditMode, type ZuordnungEditMode, type ZuordnungOperationMode } from './useZuordnungEditMode';

const mockAdapter: MockAdapter = new MockAdapter(axiosApiInstance);
const t: Composer['t'] = i18n.global.t;

describe('useZuordnungChangeKlasse', () => {
  let scope: EffectScope;
  let personStore: PersonStore;
  let personenkontextStore: PersonenkontextStore;
  let editMode: ZuordnungEditMode;
  let mode: ZuordnungOperationMode;
  let state: ZuordnungenWorkingState;
  let isEditActive: Ref<boolean>;
  let personId: string;
  let schule: Organisation;
  let oldKlasse: Organisation;
  let newKlasse: Organisation;
  let selectedZuordnung: ZuordnungWithKlasse;
  let otherZuordnung: Zuordnung;

  function createComposable(): ZuordnungChangeKlasse {
    return scope.run(() => useZuordnungChangeKlasse({ t, personId: ref(personId), isEditActive, mode, state }))!;
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    mockAdapter.reset();
    scope = effectScope();
    personStore = usePersonStore();
    personenkontextStore = usePersonenkontextStore();
    editMode = useZuordnungEditMode();
    mode = editMode.forOperation('changeKlasse');
    isEditActive = ref(true);
    personId = DoFactory.getPerson().id;

    schule = DoFactory.getSchule();
    oldKlasse = DoFactory.getKlasse(schule, { name: '5a' });
    newKlasse = DoFactory.getKlasse(schule, { name: '6b' });
    const rolleId: string = DoFactory.getRolle().id;
    const schuleZuordnung: Zuordnung = DoFactory.getZuordnung(
      { rolleId, rollenArt: RollenArt.Lern },
      { organisation: schule },
    );
    const klassenZuordnung: Zuordnung = DoFactory.getZuordnung(
      { rolleId, rollenArt: RollenArt.Lern, typ: OrganisationsTyp.Klasse },
      { organisation: oldKlasse },
    );
    otherZuordnung = DoFactory.getZuordnung();
    personStore.personenuebersicht = DoFactory.getPersonenUebersicht(DoFactory.getPerson({ id: personId }), [
      schuleZuordnung,
      klassenZuordnung,
      otherZuordnung,
    ]);

    const zuordnungen: ZuordnungWithKlasse[] = computeZuordnungenWithKlasse(personStore.personenuebersicht)!;
    selectedZuordnung = zuordnungen.find((z: ZuordnungWithKlasse) => z.klasse === oldKlasse.name)!;
    state = {
      selectedZuordnungen: ref<ZuordnungWithKlasse[]>([selectedZuordnung]),
      zuordnungenWithPendingChanges: ref<ZuordnungWithKlasse[] | undefined>(zuordnungen),
      newZuordnung: ref<ZuordnungWithKlasse | undefined>(undefined),
      zuordnungenToBePersisted: ref<Zuordnung[]>([]),
    };
  });

  afterEach(() => {
    scope.stop();
  });

  describe('triggerChangeKlasse', () => {
    it('should show the form with the Schule and the current Klasse preselected', () => {
      const composable: ZuordnungChangeKlasse = createComposable();

      composable.triggerChangeKlasse();

      expect(composable.isChangeKlasseFormActive.value).toBe(true);
      expect(composable.selectedSchule.value).toBe(schule.id);
      expect(composable.selectedNewKlasse.value).toEqual(expect.objectContaining({ id: oldKlasse.id, name: '5a' }));
    });
  });

  describe('isSubmitDisabled', () => {
    it('should only be enabled if another Klasse than the current one is selected', () => {
      const composable: ZuordnungChangeKlasse = createComposable();
      composable.triggerChangeKlasse();
      expect(composable.isSubmitDisabled.value).toBe(true);

      composable.selectedNewKlasse.value = newKlasse;

      expect(composable.isSubmitDisabled.value).toBe(false);
    });
  });

  describe('onSubmitChangeKlasse', () => {
    it('should show the confirmation dialog with the old and the new Klasse', async () => {
      const composable: ZuordnungChangeKlasse = createComposable();
      composable.triggerChangeKlasse();
      composable.selectedNewKlasse.value = newKlasse;

      await composable.onSubmitChangeKlasse();

      expect(composable.changeKlasseConfirmationDialogVisible.value).toBe(true);
      expect(composable.changeKlasseConfirmationDialogMessage.value).toBe(
        'Wollen Sie den Schüler aus Klasse 5a in Klasse 6b versetzen?',
      );
    });

    it('should not show the confirmation dialog if no Klasse is selected for the Schule', async () => {
      const composable: ZuordnungChangeKlasse = createComposable();
      composable.triggerChangeKlasse();
      composable.selectedNewKlasse.value = undefined;

      await composable.onSubmitChangeKlasse();

      expect(composable.changeKlasseConfirmationDialogVisible.value).toBe(false);
      expect(composable.changeKlasseConfirmationDialogMessage.value).toBe('');
      expect(composable.selectedNewKlasseProps.value['error-messages']).not.toHaveLength(0);
    });
  });

  describe('confirmDialogChangeKlasse', () => {
    it('should build the Zuordnungen with the new Klasse and show the review', async () => {
      const composable: ZuordnungChangeKlasse = createComposable();
      composable.triggerChangeKlasse();
      composable.selectedNewKlasse.value = newKlasse;
      await composable.onSubmitChangeKlasse();

      composable.confirmDialogChangeKlasse();

      expect(composable.changeKlasseConfirmationDialogVisible.value).toBe(false);
      expect(composable.isChangeKlasseFormActive.value).toBe(false);
      expect(editMode.pendingOperation.value).toBe('changeKlasse');
      expect(state.newZuordnung.value?.sskId).toBe(schule.id);
      expect(state.newZuordnung.value?.klasse).toBe(newKlasse.name);
      expect(state.zuordnungenToBePersisted.value).toHaveLength(3);
      expect(state.zuordnungenToBePersisted.value.map((z: Zuordnung) => z.sskId)).toEqual(
        expect.arrayContaining([schule.id, otherZuordnung.sskId, newKlasse.id]),
      );
      expect(state.zuordnungenToBePersisted.value.find((z: Zuordnung) => z.sskId === newKlasse.id)).toEqual(
        expect.objectContaining({ typ: OrganisationsTyp.Klasse, rolleId: selectedZuordnung.rolleId }),
      );
      expect(state.zuordnungenWithPendingChanges.value).toHaveLength(2);
    });
  });

  describe('cancelChangeKlasse', () => {
    it('should only close the confirmation dialog', async () => {
      const composable: ZuordnungChangeKlasse = createComposable();
      composable.triggerChangeKlasse();
      composable.selectedNewKlasse.value = newKlasse;
      await composable.onSubmitChangeKlasse();

      composable.cancelChangeKlasse();

      expect(composable.changeKlasseConfirmationDialogVisible.value).toBe(false);
      expect(composable.isChangeKlasseFormActive.value).toBe(true);
      expect(state.newZuordnung.value).toBeUndefined();
      expect(state.zuordnungenToBePersisted.value).toEqual([]);
    });
  });

  describe('confirmChangeKlasse', () => {
    async function prepareChange(composable: ZuordnungChangeKlasse): Promise<void> {
      composable.triggerChangeKlasse();
      composable.selectedNewKlasse.value = newKlasse;
      await composable.onSubmitChangeKlasse();
      composable.confirmDialogChangeKlasse();
    }

    it('should send the Zuordnungen, show the success dialog and reset the selection and the form', async () => {
      mockAdapter
        .onPut(`/api/personenkontext-workflow/${personId}`)
        .replyOnce(200, DoFactory.getPersonenkontextUpdateResponse());
      const composable: ZuordnungChangeKlasse = createComposable();
      await prepareChange(composable);
      const expectedUpdates: ReturnType<typeof mapZuordnungToPersonenkontextUpdate>[] =
        state.zuordnungenToBePersisted.value.map(mapZuordnungToPersonenkontextUpdate);

      await composable.confirmChangeKlasse();

      expect(mockAdapter.history.put).toHaveLength(1);
      const body: { personenkontexte: unknown[] } = JSON.parse(String(mockAdapter.history.put[0]?.data)) as {
        personenkontexte: unknown[];
      };
      expect(body.personenkontexte).toEqual(expectedUpdates.map((update: object) => ({ personId, ...update })));
      expect(composable.changeKlasseSuccessDialogVisible.value).toBe(true);
      expect(state.selectedZuordnungen.value).toEqual([]);
      expect(composable.selectedSchule.value).toBeUndefined();
      expect(composable.selectedNewKlasse.value).toBeUndefined();
    });

    it('should not show the success dialog if persisting fails', async () => {
      mockAdapter.onPut(`/api/personenkontext-workflow/${personId}`).replyOnce(500, { i18nKey: 'SOME_ERROR' });
      const composable: ZuordnungChangeKlasse = createComposable();
      await prepareChange(composable);

      await composable.confirmChangeKlasse();

      expect(personenkontextStore.errorCode).toBe('SOME_ERROR');
      expect(composable.changeKlasseSuccessDialogVisible.value).toBe(false);
      expect(state.selectedZuordnungen.value).toEqual([]);
    });
  });

  describe('closeChangeKlasseSuccessDialog', () => {
    it('should reload the Zuordnungen, hide the dialog and end the edit mode', async () => {
      mockAdapter
        .onGet(`/api/dbiam/personenuebersicht/${personId}`)
        .replyOnce(200, DoFactory.getDBiamPersonenuebersichtResponse({ personId }));
      const composable: ZuordnungChangeKlasse = createComposable();
      composable.triggerChangeKlasse();
      composable.changeKlasseSuccessDialogVisible.value = true;

      composable.closeChangeKlasseSuccessDialog();
      await flushPromises();

      expect(mockAdapter.history.get).toHaveLength(1);
      expect(composable.changeKlasseSuccessDialogVisible.value).toBe(false);
      expect(composable.isChangeKlasseFormActive.value).toBe(false);
      expect(editMode.isFormActive.value).toBe(false);
      expect(isEditActive.value).toBe(false);
      expect(personStore.personenuebersicht?.personId).toBe(personId);
    });
  });

  describe('resetChangeKlasseForm', () => {
    it('should clear the selection of the form', () => {
      const composable: ZuordnungChangeKlasse = createComposable();
      composable.triggerChangeKlasse();
      expect(composable.isChangeKlasseFieldDirty('selectedSchule')).toBe(true);

      composable.resetChangeKlasseForm();

      expect(composable.selectedSchule.value).toBeUndefined();
      expect(composable.selectedNewKlasse.value).toBeUndefined();
      expect(composable.isChangeKlasseFieldDirty('selectedSchule')).toBe(false);
    });
  });
});
