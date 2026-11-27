import i18n from '@/plugins/i18n';
import axiosApiInstance from '@/services/ApiService';
import { OrganisationsTyp, type Organisation } from '@/stores/OrganisationStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import { RollenArt } from '@/stores/RolleStore';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import type { ZuordnungenWorkingState, ZuordnungWithKlasse } from '@/utils/zuordnungen';
import { flushPromises } from '@vue/test-utils';
import MockAdapter from 'axios-mock-adapter';
import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import { effectScope, ref, type EffectScope, type Ref } from 'vue';
import type { Composer } from 'vue-i18n';
import { onTestFinished } from 'vitest';
import { useZuordnungChangeKlasse, type ZuordnungChangeKlasse } from './useZuordnungChangeKlasse';
import { useZuordnungEditMode, type ZuordnungEditMode, type ZuordnungOperationMode } from './useZuordnungEditMode';

type ChangeKlasseSetup = {
  mockAdapter: MockAdapter;
  t: Composer['t'];
  personStore: PersonStore;
  editMode: ZuordnungEditMode;
  mode: ZuordnungOperationMode;
  state: ZuordnungenWorkingState;
  isEditActive: Ref<boolean>;
  personId: string;
  schule: Organisation;
  newKlasse: Organisation;
  selectedZuordnung: ZuordnungWithKlasse;
  otherZuordnung: Zuordnung;
  createComposable: () => ZuordnungChangeKlasse;
};

describe('useZuordnungChangeKlasse', () => {
  const setup = (): ChangeKlasseSetup => {
    setActivePinia(createPinia());
    const t: Composer['t'] = i18n.global.t;
    const mockAdapter: MockAdapter = new MockAdapter(axiosApiInstance);
    const scope: EffectScope = effectScope();
    onTestFinished(() => {
      scope.stop();
      mockAdapter.restore();
      vi.restoreAllMocks();
    });
    const personStore: PersonStore = usePersonStore();
    const editMode: ZuordnungEditMode = useZuordnungEditMode();
    const mode: ZuordnungOperationMode = editMode.forOperation('changeKlasse');
    const isEditActive: Ref<boolean> = ref(true);
    const personId: string = DoFactory.getPerson().id;

    const schule: Organisation = DoFactory.getSchule();
    const oldKlasse: Organisation = DoFactory.getKlasse(schule, { name: '5a' });
    const newKlasse: Organisation = DoFactory.getKlasse(schule, { name: '6b' });
    const rolleId: string = DoFactory.getRolle().id;
    const selectedZuordnung: ZuordnungWithKlasse = DoFactory.getZuordnung(
      { rolleId, rollenArt: RollenArt.Lern },
      { organisation: schule },
    );
    selectedZuordnung.klasse = oldKlasse.name;
    const klassenZuordnung: Zuordnung = DoFactory.getZuordnung(
      { rolleId, rollenArt: RollenArt.Lern, typ: OrganisationsTyp.Klasse },
      { organisation: oldKlasse },
    );
    const otherZuordnung: Zuordnung = DoFactory.getZuordnung();
    personStore.personenuebersicht = DoFactory.getPersonenUebersicht(DoFactory.getPerson({ id: personId }), [
      selectedZuordnung,
      klassenZuordnung,
      otherZuordnung,
    ]);

    const state: ZuordnungenWorkingState = {
      selectedZuordnungen: ref<ZuordnungWithKlasse[]>([selectedZuordnung]),
      zuordnungenWithPendingChanges: ref<ZuordnungWithKlasse[] | undefined>([selectedZuordnung, otherZuordnung]),
      newZuordnung: ref<ZuordnungWithKlasse | undefined>(undefined),
      zuordnungenToBePersisted: ref<Zuordnung[]>([]),
    };

    const createComposable = (): ZuordnungChangeKlasse =>
      scope.run(() => useZuordnungChangeKlasse({ t, personId: ref(personId), isEditActive, mode, state }))!;

    return {
      mockAdapter,
      t,
      personStore,
      editMode,
      mode,
      state,
      isEditActive,
      personId,
      schule,
      newKlasse,
      selectedZuordnung,
      otherZuordnung,
      createComposable,
    };
  };

  const submitNewKlasse = async (composable: ZuordnungChangeKlasse, newKlasse: Organisation): Promise<void> => {
    composable.triggerChangeKlasse();
    composable.selectedNewKlasse.value = newKlasse;
    await composable.onSubmitChangeKlasse();
  };

  describe('triggerChangeKlasse', () => {
    it('should show the form with the Schule and the current Klasse preselected', () => {
      const { createComposable, selectedZuordnung, schule }: ChangeKlasseSetup = setup();
      const composable: ZuordnungChangeKlasse = createComposable();

      composable.triggerChangeKlasse();

      expect(composable.isChangeKlasseFormActive.value).toBe(true);
      expect(composable.selectedSchule.value).toBe(schule.id);
      expect(composable.selectedNewKlasse.value?.name).toBe(selectedZuordnung.klasse);
    });
  });

  describe('isSubmitDisabled', () => {
    it('should only be enabled if another Klasse than the current one is selected', () => {
      const { createComposable, newKlasse }: ChangeKlasseSetup = setup();
      const composable: ZuordnungChangeKlasse = createComposable();
      composable.triggerChangeKlasse();
      expect(composable.isSubmitDisabled.value).toBe(true);

      composable.selectedNewKlasse.value = newKlasse;

      expect(composable.isSubmitDisabled.value).toBe(false);
    });
  });

  describe('onSubmitChangeKlasse', () => {
    it('should show the confirmation dialog with the old and the new Klasse', async () => {
      const { createComposable, newKlasse, selectedZuordnung, t }: ChangeKlasseSetup = setup();
      const composable: ZuordnungChangeKlasse = createComposable();

      await submitNewKlasse(composable, newKlasse);

      expect(composable.changeKlasseConfirmationDialogVisible.value).toBe(true);
      expect(composable.changeKlasseConfirmationDialogMessage.value).toBe(
        t('person.changeKlasseConfirmation', { oldKlasse: selectedZuordnung.klasse, newKlasse: newKlasse.name }),
      );
    });

    it('should not show the confirmation dialog if no Klasse is selected for the Schule', async () => {
      const { createComposable }: ChangeKlasseSetup = setup();
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
    it('should store the Zuordnungen with the new Klasse and show the review', async () => {
      const { createComposable, newKlasse, editMode, state, selectedZuordnung, otherZuordnung }: ChangeKlasseSetup =
        setup();
      const composable: ZuordnungChangeKlasse = createComposable();
      await submitNewKlasse(composable, newKlasse);

      composable.confirmDialogChangeKlasse();

      expect(composable.changeKlasseConfirmationDialogVisible.value).toBe(false);
      expect(composable.isChangeKlasseFormActive.value).toBe(false);
      expect(editMode.pendingOperation.value).toBe('changeKlasse');
      expect(state.newZuordnung.value?.klasse).toBe(newKlasse.name);
      expect(state.zuordnungenToBePersisted.value.map((z: Zuordnung) => z.sskId)).toEqual(
        expect.arrayContaining([selectedZuordnung.sskId, otherZuordnung.sskId, newKlasse.id]),
      );
      expect(state.zuordnungenToBePersisted.value).toHaveLength(3);
    });

    it('should still store the new Klasse if there are no pending Zuordnungen', async () => {
      const { state, createComposable, newKlasse }: ChangeKlasseSetup = setup();
      state.zuordnungenWithPendingChanges.value = undefined;
      const composable: ZuordnungChangeKlasse = createComposable();
      await submitNewKlasse(composable, newKlasse);

      composable.confirmDialogChangeKlasse();

      expect(state.zuordnungenToBePersisted.value.map((z: Zuordnung) => z.sskId)).toEqual([newKlasse.id]);
      expect(state.zuordnungenWithPendingChanges.value).toBeUndefined();
    });
  });

  describe('cancelChangeKlasse', () => {
    it('should only close the confirmation dialog', async () => {
      const { createComposable, newKlasse, state }: ChangeKlasseSetup = setup();
      const composable: ZuordnungChangeKlasse = createComposable();
      await submitNewKlasse(composable, newKlasse);

      composable.cancelChangeKlasse();

      expect(composable.changeKlasseConfirmationDialogVisible.value).toBe(false);
      expect(composable.isChangeKlasseFormActive.value).toBe(true);
      expect(state.zuordnungenToBePersisted.value).toEqual([]);
    });
  });

  describe('confirmChangeKlasse', () => {
    it('should send the Zuordnungen to be persisted, show the success dialog and reset the selection and the form', async () => {
      const { mockAdapter, personId, state, selectedZuordnung, otherZuordnung, createComposable }: ChangeKlasseSetup =
        setup();
      state.zuordnungenToBePersisted.value = [selectedZuordnung, otherZuordnung];
      mockAdapter
        .onPut(`/api/personenkontexte/person/${personId}`)
        .replyOnce(200, DoFactory.getPersonenkontextUpdateResponse());
      const composable: ZuordnungChangeKlasse = createComposable();
      composable.triggerChangeKlasse();

      await composable.confirmChangeKlasse();

      const body: { personenkontexte: Array<{ organisationId: string }> } = JSON.parse(
        String(mockAdapter.history.put[0]?.data),
      ) as { personenkontexte: Array<{ organisationId: string }> };
      expect(body.personenkontexte.map((kontext: { organisationId: string }) => kontext.organisationId)).toEqual([
        selectedZuordnung.sskId,
        otherZuordnung.sskId,
      ]);
      expect(composable.changeKlasseSuccessDialogVisible.value).toBe(true);
      expect(state.selectedZuordnungen.value).toEqual([]);
      expect(composable.selectedSchule.value).toBeUndefined();
      expect(composable.selectedNewKlasse.value).toBeUndefined();
    });

    it('should not show the success dialog if persisting fails', async () => {
      const { mockAdapter, personId, createComposable, state, selectedZuordnung, otherZuordnung }: ChangeKlasseSetup =
        setup();
      state.zuordnungenToBePersisted.value = [selectedZuordnung, otherZuordnung];
      mockAdapter.onPut(`/api/personenkontexte/person/${personId}`).replyOnce(500, { i18nKey: 'SOME_ERROR' });
      const composable: ZuordnungChangeKlasse = createComposable();

      await composable.confirmChangeKlasse();

      expect(composable.changeKlasseSuccessDialogVisible.value).toBe(false);
    });
  });

  describe('closeChangeKlasseSuccessDialog', () => {
    it('should reload the Zuordnungen, hide the dialog and end the edit mode', async () => {
      const { mockAdapter, personId, createComposable, isEditActive, personStore }: ChangeKlasseSetup = setup();
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
      expect(isEditActive.value).toBe(false);
      expect(personStore.personenuebersicht?.personId).toBe(personId);
    });
  });
});
