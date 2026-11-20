import i18n from '@/plugins/i18n';
import axiosApiInstance from '@/services/ApiService';
import { OrganisationsTyp, type Organisation } from '@/stores/OrganisationStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import { RollenMerkmal, useRolleStore, type RolleStore } from '@/stores/RolleStore';
import { Zuordnung } from '@/stores/types/Zuordnung';
import { BefristungOption } from '@/utils/befristung';
import { adjustDateForTimezoneAndFormat, formatDateToISO, getNextSchuljahresende } from '@/utils/date';
import type { ZuordnungenWorkingState, ZuordnungWithKlasse } from '@/utils/zuordnungen';
import { flushPromises } from '@vue/test-utils';
import MockAdapter from 'axios-mock-adapter';
import { createPinia, getActivePinia, setActivePinia, type Pinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import { createApp, defineComponent, ref, type App, type Ref } from 'vue';
import type { Composer } from 'vue-i18n';
import { onTestFinished } from 'vitest';
import { useZuordnungChangeBefristung, type ZuordnungChangeBefristung } from './useZuordnungChangeBefristung';
import { useZuordnungEditMode, type ZuordnungEditMode, type ZuordnungOperationMode } from './useZuordnungEditMode';

type ChangeBefristungSetup = {
  mockAdapter: MockAdapter;
  t: Composer['t'];
  rolleStore: RolleStore;
  personStore: PersonStore;
  editMode: ZuordnungEditMode;
  mode: ZuordnungOperationMode;
  state: ZuordnungenWorkingState;
  isEditActive: Ref<boolean>;
  personId: string;
  selectedZuordnung: ZuordnungWithKlasse;
  otherZuordnung: Zuordnung;
  futureDate: string;
  otherFutureDate: string;
  createState: () => ZuordnungenWorkingState;
  createComposable: (workingState?: ZuordnungenWorkingState) => ZuordnungChangeBefristung;
};

describe('useZuordnungChangeBefristung', () => {
  const createState = (): ZuordnungenWorkingState => {
    return {
      selectedZuordnungen: ref<ZuordnungWithKlasse[]>([]),
      zuordnungenWithPendingChanges: ref<ZuordnungWithKlasse[] | undefined>(undefined),
      newZuordnung: ref<ZuordnungWithKlasse | undefined>(undefined),
      zuordnungenToBePersisted: ref<Zuordnung[]>([]),
    };
  };

  const setup = (options: { useRealPinia?: boolean } = {}): ChangeBefristungSetup => {
    const previousPinia: Pinia | undefined = getActivePinia();
    if (options.useRealPinia) {
      setActivePinia(createPinia());
    }
    const mockAdapter: MockAdapter = new MockAdapter(axiosApiInstance);
    const t: Composer['t'] = i18n.global.t;
    const personStore: PersonStore = usePersonStore();
    const rolleStore: RolleStore = useRolleStore();
    const apps: App[] = [];
    onTestFinished(() => {
      apps.forEach((app: App) => app.unmount());
      mockAdapter.restore();
      vi.restoreAllMocks();
      if (previousPinia) {
        setActivePinia(previousPinia);
      }
    });
    vi.restoreAllMocks();
    personStore.$reset();
    rolleStore.$reset();

    const editMode: ZuordnungEditMode = useZuordnungEditMode();
    const mode: ZuordnungOperationMode = editMode.forOperation('changeBefristung');
    const state: ZuordnungenWorkingState = createState();
    const isEditActive: Ref<boolean> = ref(true);
    const personId: string = DoFactory.getPerson().id;
    const futureYear: number = new Date().getFullYear() + 2;
    const futureDate: string = `15.03.${futureYear}`;
    const otherFutureDate: string = `20.04.${futureYear}`;

    const schule: Organisation = DoFactory.getSchule();
    const rolleId: string = DoFactory.getRolle().id;
    const selectedZuordnung: ZuordnungWithKlasse = DoFactory.getZuordnung(
      { rolleId, befristung: formatDateToISO(futureDate)! },
      { organisation: schule },
    );
    const klassenZuordnung: Zuordnung = DoFactory.getZuordnung(
      {
        rolleId,
        befristung: formatDateToISO(futureDate)!,
        typ: OrganisationsTyp.Klasse,
        administriertVon: schule.id,
      },
      { organisation: DoFactory.getKlasse(schule) },
    );
    const otherZuordnung: Zuordnung = DoFactory.getZuordnung();
    personStore.personenuebersicht = DoFactory.getPersonenUebersicht(DoFactory.getPerson({ id: personId }), [
      selectedZuordnung,
      klassenZuordnung,
      otherZuordnung,
    ]);
    state.selectedZuordnungen.value = [selectedZuordnung];
    const createComposable = (workingState: ZuordnungenWorkingState = state): ZuordnungChangeBefristung => {
      let composable!: ZuordnungChangeBefristung;
      const app: App = createApp(
        defineComponent({
          setup() {
            composable = useZuordnungChangeBefristung({
              t,
              personId: ref(personId),
              isEditActive,
              mode,
              state: workingState,
            });
            return () => null;
          },
        }),
      );
      app.mount(document.createElement('div'));
      apps.push(app);
      return composable;
    };

    return {
      mockAdapter,
      t,
      rolleStore,
      personStore,
      editMode,
      mode,
      state,
      isEditActive,
      personId,
      selectedZuordnung,
      otherZuordnung,
      futureDate,
      otherFutureDate,
      createState,
      createComposable,
    };
  };

  // Selects the unbefristet option the way the radio button does, after the form has settled
  const selectUnbefristet = async (composable: ZuordnungChangeBefristung): Promise<void> => {
    await flushPromises();
    composable.handleChangeBefristungOptionUpdate(undefined);
    await flushPromises();
  };

  const submitNewBefristung = async (composable: ZuordnungChangeBefristung, befristung: string): Promise<void> => {
    composable.triggerChangeBefristung();
    await flushPromises();
    composable.handleChangeBefristungUpdate(befristung);
    await composable.onSubmitChangeBefristung();
  };

  describe('triggerChangeBefristung', () => {
    it('should show the form with the Rolle and the current Befristung of the selected Zuordnung', () => {
      const { createComposable, selectedZuordnung }: ChangeBefristungSetup = setup();
      const composable: ZuordnungChangeBefristung = createComposable();

      composable.triggerChangeBefristung();

      expect(composable.isChangeBefristungActive.value).toBe(true);
      expect(composable.changeBefristungFormContext.values.selectedRolle).toBe(selectedZuordnung.rolleId);
      expect(composable.selectedChangeBefristung.value).toBe(
        adjustDateForTimezoneAndFormat(selectedZuordnung.befristung!),
      );
    });

    it('should preselect the Schuljahresende if it is the current Befristung', () => {
      const { selectedZuordnung, createComposable }: ChangeBefristungSetup = setup();
      selectedZuordnung.befristung = formatDateToISO(getNextSchuljahresende())!;
      const composable: ZuordnungChangeBefristung = createComposable();

      composable.triggerChangeBefristung();

      expect(composable.selectedChangeBefristungOption.value).toBe(BefristungOption.SCHULJAHRESENDE);
    });

    it('should preselect unbefristet if the selected Zuordnung has no Befristung', () => {
      const { selectedZuordnung, createComposable }: ChangeBefristungSetup = setup();
      selectedZuordnung.befristung = null;
      const composable: ZuordnungChangeBefristung = createComposable();

      composable.triggerChangeBefristung();

      expect(composable.selectedChangeBefristungOption.value).toBe(BefristungOption.UNBEFRISTET);
    });
  });

  describe('differentDateSelected', () => {
    it('should be true only if the selected Befristung differs from the current one', () => {
      const { createComposable, otherFutureDate }: ChangeBefristungSetup = setup();
      const composable: ZuordnungChangeBefristung = createComposable();
      composable.triggerChangeBefristung();
      expect(composable.differentDateSelected.value).toBe(false);

      composable.handleChangeBefristungUpdate(otherFutureDate);

      expect(composable.differentDateSelected.value).toBe(true);
    });

    it('should compare against no Befristung if the selected Zuordnung is unbefristet', () => {
      const { selectedZuordnung, createComposable }: ChangeBefristungSetup = setup();
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
      const { createComposable, otherFutureDate, selectedZuordnung, t }: ChangeBefristungSetup = setup();
      const composable: ZuordnungChangeBefristung = createComposable();

      await submitNewBefristung(composable, otherFutureDate);

      expect(composable.changeBefristungConfirmationDialogVisible.value).toBe(true);
      expect(composable.changeBefristungConfirmationDialogMessage.value).toBe(
        t('person.changeBefristungConfirmation', {
          oldBefristung: adjustDateForTimezoneAndFormat(selectedZuordnung.befristung!),
          newBefristung: otherFutureDate,
        }),
      );
    });

    it('should name an unlimited Befristung "unbefristet" in the confirmation message', async () => {
      const { createComposable, selectedZuordnung, t }: ChangeBefristungSetup = setup();
      const composable: ZuordnungChangeBefristung = createComposable();
      composable.triggerChangeBefristung();
      await selectUnbefristet(composable);

      await composable.onSubmitChangeBefristung();

      expect(composable.changeBefristungConfirmationDialogMessage.value).toBe(
        t('person.changeBefristungConfirmation', {
          oldBefristung: adjustDateForTimezoneAndFormat(selectedZuordnung.befristung!),
          newBefristung: t('admin.befristung.unlimitedLower'),
        }),
      );
    });

    it('should name the old Befristung "unbefristet" if the selected Zuordnung has none', async () => {
      const { selectedZuordnung, createComposable, otherFutureDate, t }: ChangeBefristungSetup = setup();
      selectedZuordnung.befristung = null;
      const composable: ZuordnungChangeBefristung = createComposable();

      await submitNewBefristung(composable, otherFutureDate);

      expect(composable.changeBefristungConfirmationDialogMessage.value).toBe(
        t('person.changeBefristungConfirmation', {
          oldBefristung: t('admin.befristung.unlimitedLower'),
          newBefristung: otherFutureDate,
        }),
      );
    });

    it('should not show the confirmation dialog if the form is invalid', async () => {
      const { createComposable }: ChangeBefristungSetup = setup();
      const composable: ZuordnungChangeBefristung = createComposable();

      await submitNewBefristung(composable, '01.01.2000');

      expect(composable.changeBefristungConfirmationDialogVisible.value).toBe(false);
      expect(composable.changeBefristungConfirmationDialogMessage.value).toBe('');
      expect(composable.selectedChangeBefristungProps.value['error-messages']).not.toHaveLength(0);
    });
  });

  describe('confirmDialogChangeBefristung', () => {
    it('should store the Zuordnungen with the new Befristung and show the review', async () => {
      const { createComposable, otherFutureDate, editMode, state, otherZuordnung }: ChangeBefristungSetup = setup();
      const composable: ZuordnungChangeBefristung = createComposable();
      await submitNewBefristung(composable, otherFutureDate);

      composable.confirmDialogChangeBefristung();

      const expectedBefristung: string | undefined = formatDateToISO(otherFutureDate);
      expect(composable.changeBefristungConfirmationDialogVisible.value).toBe(false);
      expect(composable.isChangeBefristungActive.value).toBe(false);
      expect(editMode.pendingOperation.value).toBe('changeBefristung');
      expect(state.newZuordnung.value?.befristung).toBe(expectedBefristung);
      expect(state.zuordnungenToBePersisted.value.map((z: Zuordnung) => z.befristung)).toEqual([
        expectedBefristung,
        expectedBefristung,
        otherZuordnung.befristung,
      ]);
    });

    it('should store no Befristung if unbefristet is selected', async () => {
      const { createComposable, state }: ChangeBefristungSetup = setup();
      const composable: ZuordnungChangeBefristung = createComposable();
      composable.triggerChangeBefristung();
      await selectUnbefristet(composable);
      await composable.onSubmitChangeBefristung();

      composable.confirmDialogChangeBefristung();

      expect(state.newZuordnung.value?.befristung).toBeNull();
    });
  });

  describe('cancelChangeBefristung', () => {
    it('should only close the confirmation dialog', async () => {
      const { createComposable, otherFutureDate, state }: ChangeBefristungSetup = setup();
      const composable: ZuordnungChangeBefristung = createComposable();
      await submitNewBefristung(composable, otherFutureDate);

      composable.cancelChangeBefristung();

      expect(composable.changeBefristungConfirmationDialogVisible.value).toBe(false);
      expect(composable.isChangeBefristungActive.value).toBe(true);
      expect(state.zuordnungenToBePersisted.value).toEqual([]);
    });
  });

  describe('confirmChangeBefristung', () => {
    it('should send the Zuordnungen to be persisted, show the success dialog and reset the selection and the form', async () => {
      const {
        mockAdapter,
        personId,
        state,
        selectedZuordnung,
        otherZuordnung,
        createComposable,
      }: ChangeBefristungSetup = setup({
        useRealPinia: true,
      });
      state.zuordnungenToBePersisted.value = [selectedZuordnung, otherZuordnung];
      mockAdapter
        .onPut(`/api/personenkontext-workflow/${personId}`)
        .replyOnce(200, DoFactory.getPersonenkontextUpdateResponse());
      const composable: ZuordnungChangeBefristung = createComposable();
      composable.triggerChangeBefristung();

      await composable.confirmChangeBefristung();

      const body: { personenkontexte: Array<{ organisationId: string }> } = JSON.parse(
        String(mockAdapter.history.put[0]?.data),
      ) as { personenkontexte: Array<{ organisationId: string }> };
      expect(body.personenkontexte.map((kontext: { organisationId: string }) => kontext.organisationId)).toEqual([
        selectedZuordnung.sskId,
        otherZuordnung.sskId,
      ]);
      expect(composable.changeBefristungSuccessDialogVisible.value).toBe(true);
      expect(state.selectedZuordnungen.value).toEqual([]);
      expect(composable.selectedChangeBefristung.value).toBeUndefined();
    });

    it('should not show the success dialog if persisting fails', async () => {
      const {
        mockAdapter,
        personId,
        state,
        selectedZuordnung,
        otherZuordnung,
        createComposable,
      }: ChangeBefristungSetup = setup({
        useRealPinia: true,
      });
      state.zuordnungenToBePersisted.value = [selectedZuordnung, otherZuordnung];
      mockAdapter.onPut(`/api/personenkontext-workflow/${personId}`).replyOnce(500, { i18nKey: 'SOME_ERROR' });
      const composable: ZuordnungChangeBefristung = createComposable();

      await composable.confirmChangeBefristung();

      expect(composable.changeBefristungSuccessDialogVisible.value).toBe(false);
    });
  });

  describe('closeChangeBefristungSuccessDialog', () => {
    it('should reload the Zuordnungen, hide the dialog and end the edit mode', async () => {
      const { mockAdapter, personId, createComposable, isEditActive }: ChangeBefristungSetup = setup({
        useRealPinia: true,
      });
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
      expect(isEditActive.value).toBe(false);
    });
  });

  describe('Befristungspflicht', () => {
    it('should keep the flags per composable instance', async () => {
      const { rolleStore, selectedZuordnung, createComposable, createState }: ChangeBefristungSetup = setup();
      rolleStore.rollenForPersonenkontextCreation = [
        {
          value: selectedZuordnung.rolleId,
          title: DoFactory.getRolle().name,
          rollenart: selectedZuordnung.rollenArt,
          merkmale: [RollenMerkmal.BefristungPflicht],
        },
      ];
      const first: ZuordnungChangeBefristung = createComposable();
      const second: ZuordnungChangeBefristung = createComposable(createState());

      first.triggerChangeBefristung();
      await vi.waitFor(() => expect(first.isChangeBefristungRequired.value).toBe(true));

      expect(first.isChangeBefristungUnbefristetDisabled.value).toBe(true);
      expect(second.isChangeBefristungRequired.value).toBe(false);
      expect(second.isChangeBefristungUnbefristetDisabled.value).toBe(false);
    });
  });
});
