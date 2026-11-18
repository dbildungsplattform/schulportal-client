import {
  RollenArt,
  RollenMerkmal,
  useRolleStore,
  type RolleStore,
  type TranslatedRolleWithAttrs,
} from '@/stores/RolleStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import { usePersonenkontextStore, type PersonenkontextStore } from '@/stores/PersonenkontextStore';
import { useServiceProviderStore, type ServiceProviderStore } from '@/stores/ServiceProviderStore';
import type { Organisation } from '@/stores/OrganisationStore';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import axiosApiInstance from '@/services/ApiService';
import { formatDateToISO, getNextSchuljahresende } from '@/utils/date';
import { withoutKlassen, type ZuordnungWithKlasse } from '@/utils/zuordnungen';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import MockAdapter from 'axios-mock-adapter';
import { setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import { effectScope, nextTick, ref, type EffectScope, type Ref } from 'vue';
import type { Composer } from 'vue-i18n';
import { onTestFinished } from 'vitest';
import { useZuordnungCreation, type ZuordnungCreation } from './useZuordnungCreation';
import { useZuordnungEditMode, type ZuordnungEditMode, type ZuordnungOperationMode } from './useZuordnungEditMode';
import { useZuordnungenWorkingState, type ZuordnungenWorkingStateResult } from './useZuordnungenWorkingState';

type CreationSetup = {
  mockAdapter: MockAdapter;
  personStore: PersonStore;
  personenkontextStore: PersonenkontextStore;
  rolleStore: RolleStore;
  serviceProviderStore: ServiceProviderStore;
  editMode: ZuordnungEditMode;
  mode: ZuordnungOperationMode;
  state: ZuordnungenWorkingStateResult;
  isEditActive: Ref<boolean>;
  personId: Ref<string>;
  tMock: ReturnType<typeof vi.fn<(key: string, params?: Record<string, unknown>) => string>>;
  schule: Organisation;
  existingZuordnung: Zuordnung;
  creation: ZuordnungCreation;
  lehrRolle: TranslatedRolleWithAttrs;
  lernRolle: TranslatedRolleWithAttrs;
  befristungspflichtRolle: TranslatedRolleWithAttrs;
  selectRolle: (rolle: TranslatedRolleWithAttrs, organisation?: Organisation) => Promise<void>;
  mockCommit: (status: number, data: unknown) => void;
  prepareAddition: (organisation?: Organisation) => Promise<void>;
};

describe('useZuordnungCreation', () => {
  const setup = (options: { useFakeTimers?: boolean } = {}): CreationSetup => {
    setActivePinia(createTestingPinia({ stubActions: false }));
    const mockAdapter: MockAdapter = new MockAdapter(axiosApiInstance);
    const scope: EffectScope = effectScope();
    onTestFinished(() => {
      scope.stop();
      mockAdapter.restore();
      vi.useRealTimers();
      vi.restoreAllMocks();
      document.body.innerHTML = '';
    });
    if (options.useFakeTimers) {
      vi.useFakeTimers({ toFake: ['setTimeout'] });
    }

    const personStore: PersonStore = usePersonStore();
    const personenkontextStore: PersonenkontextStore = usePersonenkontextStore();
    const rolleStore: RolleStore = useRolleStore();
    const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
    personStore.getPersonById = vi.fn();
    personStore.getPersonenuebersichtById = vi.fn();
    serviceProviderStore.getServiceProvidersByPersonId = vi.fn();

    const lehrRolle: TranslatedRolleWithAttrs = DoFactory.getTranslatedRolleWithAttrs({ rollenart: RollenArt.Lehr });
    const lernRolle: TranslatedRolleWithAttrs = DoFactory.getTranslatedRolleWithAttrs({ rollenart: RollenArt.Lern });
    const befristungspflichtRolle: TranslatedRolleWithAttrs = DoFactory.getTranslatedRolleWithAttrs({
      rollenart: RollenArt.Lehr,
      merkmale: [RollenMerkmal.BefristungPflicht],
    });
    const schule: Organisation = DoFactory.getSchule();
    const existingZuordnung: Zuordnung = DoFactory.getZuordnung({ rolleId: lehrRolle.value }, { organisation: schule });
    personStore.personenuebersicht = DoFactory.getPersonenUebersicht(DoFactory.getPerson(), [existingZuordnung]);
    personStore.currentPerson = DoFactory.getPersonendatensatz();
    rolleStore.rollenForPersonenkontextCreation = [lehrRolle, lernRolle, befristungspflichtRolle];

    const editMode: ZuordnungEditMode = useZuordnungEditMode();
    const mode: ZuordnungOperationMode = editMode.forOperation('creation');
    const isEditActive: Ref<boolean> = ref(true);
    const personId: Ref<string> = ref(personStore.personenuebersicht.personId);
    const tMock: ReturnType<typeof vi.fn<(key: string, params?: Record<string, unknown>) => string>> = vi.fn(
      (key: string) => key,
    );
    const state: ZuordnungenWorkingStateResult = scope.run(() => useZuordnungenWorkingState({ personId }))!;
    const createCreation = (): ZuordnungCreation =>
      scope.run(() => {
        return useZuordnungCreation({
          t: tMock as unknown as Composer['t'],
          personId,
          isEditActive,
          mode,
          state,
        });
      })!;
    const creation: ZuordnungCreation = createCreation();

    const selectRolle = async (rolle: TranslatedRolleWithAttrs, organisation: Organisation = schule): Promise<void> => {
      creation.selectedOrganisation.value = organisation;
      creation.selectedRolle.value = rolle;
      await flushPromises();
    };
    const mockCommit = (status: number, data: unknown): void => {
      mockAdapter.onPut(new RegExp(`^/api/personenkontext-workflow/${personId.value}`)).replyOnce(status, data);
    };
    const prepareAddition = async (organisation: Organisation = DoFactory.getSchule()): Promise<void> => {
      await selectRolle(lehrRolle, organisation);
      creation.selectedKopersNr.value = '1234567';
      creation.confirmDialogAddition();
    };

    return {
      mockAdapter,
      personStore,
      personenkontextStore,
      rolleStore,
      serviceProviderStore,
      editMode,
      mode,
      state,
      isEditActive,
      personId,
      tMock,
      schule,
      existingZuordnung,
      creation,
      lehrRolle,
      lernRolle,
      befristungspflichtRolle,
      selectRolle,
      mockCommit,
      prepareAddition,
    };
  };

  describe('triggerAddZuordnung', () => {
    it('should show the creation form', () => {
      const { creation, editMode }: CreationSetup = setup();
      expect(creation.isZuordnungFormActive.value).toBe(false);

      creation.triggerAddZuordnung();

      expect(creation.isZuordnungFormActive.value).toBe(true);
      expect(editMode.hasPendingChange.value).toBe(false);
    });
  });

  describe('filteredRollen', () => {
    it('should offer all Rollen as long as no Organisation is selected', () => {
      const { creation, rolleStore }: CreationSetup = setup();
      expect(creation.filteredRollen.value).toEqual(rolleStore.rollenForPersonenkontextCreation);
    });

    it('should offer all Rollen if the person has no Zuordnungen', () => {
      const { personStore, creation, schule, rolleStore }: CreationSetup = setup();
      personStore.personenuebersicht = DoFactory.getPersonenUebersicht(DoFactory.getPerson(), []);
      creation.selectedOrganisation.value = schule;

      expect(creation.filteredRollen.value).toEqual(rolleStore.rollenForPersonenkontextCreation);
    });

    it('should omit the Rollen the person already has at the selected Organisation', () => {
      const { creation, schule, lernRolle, befristungspflichtRolle, rolleStore }: CreationSetup = setup();
      creation.selectedOrganisation.value = schule;
      expect(creation.filteredRollen.value).toEqual([lernRolle, befristungspflichtRolle]);

      creation.selectedOrganisation.value = DoFactory.getSchule();
      expect(creation.filteredRollen.value).toEqual(rolleStore.rollenForPersonenkontextCreation);
    });
  });

  describe('existingRollenArt', () => {
    it('should be the Rollenart of the first Zuordnung or undefined without Personenuebersicht', () => {
      const { creation, existingZuordnung, personStore }: CreationSetup = setup();
      expect(creation.existingRollenArt.value).toBe(existingZuordnung.rollenArt);

      personStore.personenuebersicht = null;
      expect(creation.existingRollenArt.value).toBeUndefined();
    });
  });

  describe('Befristung', () => {
    it('should own the flags and set them once a Rolle with Befristungspflicht is selected', async () => {
      const { creation, selectRolle, befristungspflichtRolle, lehrRolle }: CreationSetup = setup();
      expect(creation.isUnbefristetDisabled.value).toBe(false);
      expect(creation.isBefristungRequired.value).toBe(false);

      await selectRolle(befristungspflichtRolle);
      expect(creation.isUnbefristetDisabled.value).toBe(true);
      expect(creation.isBefristungRequired.value).toBe(true);

      await selectRolle(lehrRolle);
      expect(creation.isUnbefristetDisabled.value).toBe(false);
      expect(creation.isBefristungRequired.value).toBe(false);
    });
  });

  describe('hasKopersNummer', () => {
    it('should follow the personalnummer of the current person', () => {
      const { creation, personStore }: CreationSetup = setup();
      expect(creation.hasKopersNummer.value).toBe(true);

      personStore.currentPerson = DoFactory.getPersonendatensatz({
        person: DoFactory.getPerson({ personalnummer: undefined }),
      });
      expect(creation.hasKopersNummer.value).toBe(false);

      personStore.currentPerson = null;
      expect(creation.hasKopersNummer.value).toBe(false);
    });
  });

  describe('isZuordnungCreationFormDirty', () => {
    it('should be true once a field of the form was changed', async () => {
      const { creation, selectRolle, lehrRolle }: CreationSetup = setup();
      expect(creation.isZuordnungCreationFormDirty.value).toBe(false);

      await selectRolle(lehrRolle);

      expect(creation.isZuordnungCreationFormDirty.value).toBe(true);
    });
  });

  describe('hasNoKopersNr', () => {
    it('should show the confirmation dialog only when the person has no KoPers.-Nr.', async () => {
      const { creation }: CreationSetup = setup();
      expect(creation.showNoKopersNrConfirmationDialog.value).toBe(false);

      creation.hasNoKopersNr.value = true;
      await nextTick();
      expect(creation.showNoKopersNrConfirmationDialog.value).toBe(true);

      creation.showNoKopersNrConfirmationDialog.value = false;
      creation.hasNoKopersNr.value = false;
      await nextTick();
      expect(creation.showNoKopersNrConfirmationDialog.value).toBe(false);
    });
  });

  describe('onSubmitCreateZuordnung', () => {
    it('should not open the confirmation dialog while the form is invalid', async () => {
      const { creation }: CreationSetup = setup();
      await creation.onSubmitCreateZuordnung();

      expect(creation.createZuordnungConfirmationDialogVisible.value).toBe(false);
    });

    it('should open the confirmation dialog for a Rolle that is not a Lern-Rolle', async () => {
      const { creation, selectRolle, lehrRolle, tMock }: CreationSetup = setup();
      await selectRolle(lehrRolle, DoFactory.getSchule());

      await creation.onSubmitCreateZuordnung();

      expect(creation.createZuordnungConfirmationDialogVisible.value).toBe(true);
      expect(tMock).toHaveBeenCalledWith('person.addZuordnungConfirmation', { rollenname: lehrRolle.title });
    });

    it('should mention the Klasse of a Lern-Rolle in the confirmation', async () => {
      const { creation, schule, selectRolle, lernRolle, tMock }: CreationSetup = setup();
      const klasse: Organisation = DoFactory.getKlasse(schule);
      await selectRolle(lernRolle, DoFactory.getSchule());
      creation.handleKlasseUpdate(klasse);
      await flushPromises();
      await creation.onSubmitCreateZuordnung();

      expect(creation.createZuordnungConfirmationDialogVisible.value).toBe(true);
      expect(tMock).toHaveBeenCalledWith('person.addZuordnungKlasseConfirmation', {
        rollenname: lernRolle.title,
        klassenname: klasse.name,
      });
    });
  });

  describe('handleFieldReset', () => {
    it('should clear the selected Rolle', async () => {
      const { creation, selectRolle, lehrRolle }: CreationSetup = setup();
      await selectRolle(lehrRolle);

      creation.handleFieldReset('selectedRolle');

      expect(creation.selectedRolle.value).toBeUndefined();
    });

    it('should clear the selected Klasse', async () => {
      const { creation, schule, selectRolle, lernRolle, state }: CreationSetup = setup();
      await selectRolle(lernRolle, DoFactory.getSchule());
      creation.handleKlasseUpdate(DoFactory.getKlasse(schule));
      await flushPromises();

      creation.handleFieldReset('selectedKlasse');
      await flushPromises();
      creation.confirmDialogAddition();

      expect(state.newZuordnung.value?.klasse).toBeUndefined();
    });

    it('should ignore other fields', async () => {
      const { creation, selectRolle, lehrRolle, schule }: CreationSetup = setup();
      await selectRolle(lehrRolle);

      creation.handleFieldReset('selectedOrganisation');

      expect(creation.selectedRolle.value).toEqual(lehrRolle);
      expect(creation.selectedOrganisation.value).toEqual(schule);
    });
  });

  describe('confirmDialogAddition', () => {
    it('should build the new Zuordnung and the Zuordnungen to be persisted and show the review', async () => {
      const { creation, selectRolle, lehrRolle, state, editMode }: CreationSetup = setup();
      const otherSchule: Organisation = DoFactory.getSchule();
      await selectRolle(lehrRolle, otherSchule);
      const previousPending: ZuordnungWithKlasse[] = [...(state.zuordnungenWithPendingChanges.value ?? [])];
      creation.hasNoKopersNr.value = true;
      creation.createZuordnungConfirmationDialogVisible.value = true;

      creation.confirmDialogAddition();

      expect(creation.createZuordnungConfirmationDialogVisible.value).toBe(false);
      expect(creation.hasNoKopersNr.value).toBe(false);
      expect(state.newZuordnung.value).toMatchObject({
        sskId: otherSchule.id,
        rolleId: lehrRolle.value,
        rolle: lehrRolle.title,
        befristung: null,
      });
      expect(state.zuordnungenToBePersisted.value).toEqual([...previousPending, state.newZuordnung.value]);
      expect(state.zuordnungenWithPendingChanges.value).toEqual([
        ...withoutKlassen(previousPending),
        state.newZuordnung.value,
      ]);
      expect(editMode.pendingOperation.value).toBe('creation');
    });

    it('should add the Klasse of a Lern-Rolle as an additional Zuordnung', async () => {
      const { creation, schule, selectRolle, lernRolle, state }: CreationSetup = setup();
      const klasse: Organisation = DoFactory.getKlasse(schule);
      await selectRolle(lernRolle, DoFactory.getSchule());
      creation.handleKlasseUpdate(klasse);

      creation.confirmDialogAddition();

      expect(state.newZuordnung.value?.klasse).toBe(klasse.name);
      expect(state.zuordnungenToBePersisted.value.map((zuordnung: Zuordnung) => zuordnung.sskId)).toContain(klasse.id);
    });

    it('should ignore a previously selected Klasse for a Rolle that is not a Lern-Rolle', async () => {
      const { creation, schule, selectRolle, lernRolle, lehrRolle, state }: CreationSetup = setup();
      const klasse: Organisation = DoFactory.getKlasse(schule);
      await selectRolle(lernRolle, DoFactory.getSchule());
      creation.handleKlasseUpdate(klasse);
      await selectRolle(lehrRolle, DoFactory.getSchule());

      creation.confirmDialogAddition();

      expect(state.newZuordnung.value?.klasse).toBeUndefined();
      expect(state.zuordnungenToBePersisted.value.map((zuordnung: Zuordnung) => zuordnung.sskId)).not.toContain(
        klasse.id,
      );
    });

    it('should use the Schuljahresende as Befristung for a Rolle with Befristungspflicht unless a date is selected', async () => {
      const { creation, selectRolle, befristungspflichtRolle, state }: CreationSetup = setup();
      const selectedDate: string = '31.12.2099';
      await selectRolle(befristungspflichtRolle, DoFactory.getSchule());

      creation.confirmDialogAddition();
      expect(state.newZuordnung.value?.befristung).toBe(formatDateToISO(getNextSchuljahresende()));

      creation.selectedBefristung.value = selectedDate;
      creation.confirmDialogAddition();
      expect(state.newZuordnung.value?.befristung).toBe(formatDateToISO(selectedDate));
    });

    it('should fall back to empty values if no Zuordnungen are loaded and no Rolle is selected', () => {
      const { state, creation, schule }: CreationSetup = setup();
      state.zuordnungenWithPendingChanges.value = undefined;
      creation.selectedOrganisation.value = schule;

      creation.confirmDialogAddition();

      expect(state.newZuordnung.value).toMatchObject({ sskId: schule.id, rolleId: '', rolle: '' });
      expect(state.zuordnungenToBePersisted.value).toEqual([state.newZuordnung.value]);
      expect(state.zuordnungenWithPendingChanges.value).toEqual([state.newZuordnung.value]);
    });
  });

  describe('cancelAddition', () => {
    it('should close the confirmation dialog without changing the Zuordnungen', () => {
      const { state, creation }: CreationSetup = setup();
      const pending: ZuordnungWithKlasse[] | undefined = state.zuordnungenWithPendingChanges.value;
      creation.createZuordnungConfirmationDialogVisible.value = true;

      creation.cancelAddition();

      expect(creation.createZuordnungConfirmationDialogVisible.value).toBe(false);
      expect(state.zuordnungenWithPendingChanges.value).toBe(pending);
      expect(state.newZuordnung.value).toBeUndefined();
    });
  });

  describe('confirmAddition', () => {
    it('should persist the Zuordnungen, show the success dialog and reset the form', async () => {
      const {
        creation,
        prepareAddition,
        mockCommit,
        mockAdapter,
        personId,
        existingZuordnung,
        lehrRolle,
        personenkontextStore,
        personStore,
      }: CreationSetup = setup();
      await prepareAddition();
      const newOrganisation: Organisation = creation.selectedOrganisation.value!;
      mockCommit(200, DoFactory.getPersonenkontextUpdateResponse());

      await creation.confirmAddition();

      expect(mockAdapter.history['put']).toHaveLength(1);
      expect(mockAdapter.history['put'][0]!.url).toContain('personalnummer=1234567');
      expect(JSON.parse(mockAdapter.history['put'][0]!.data as string)).toMatchObject({
        personenkontexte: [
          { personId: personId.value, organisationId: existingZuordnung.sskId, rolleId: existingZuordnung.rolleId },
          { personId: personId.value, organisationId: newOrganisation.id, rolleId: lehrRolle.value },
        ],
      });
      expect(personenkontextStore.errorCode).toBe('');
      expect(creation.createSuccessDialogVisible.value).toBe(true);
      expect(creation.selectedRolle.value).toBeUndefined();
      expect(creation.selectedOrganisation.value).toBeUndefined();
      expect(personStore.getPersonById).toHaveBeenCalledWith(personId.value);
    });

    it('should not show the success dialog if persisting failed', async () => {
      const { creation, prepareAddition, mockCommit, personenkontextStore }: CreationSetup = setup();
      await prepareAddition();
      mockCommit(500, { i18nKey: 'SOME_MOCK_SERVER_ERROR' });

      await creation.confirmAddition();

      expect(personenkontextStore.errorCode).toBe('SOME_MOCK_SERVER_ERROR');
      expect(creation.createSuccessDialogVisible.value).toBe(false);
    });
  });

  describe('closeCreateSuccessDialog', () => {
    it('should reload the person, close the dialog and leave the edit mode', () => {
      const { mode, creation, personStore, personId, serviceProviderStore, isEditActive, editMode }: CreationSetup =
        setup();
      mode.showReview();
      creation.createSuccessDialogVisible.value = true;

      creation.closeCreateSuccessDialog();

      expect(personStore.getPersonenuebersichtById).toHaveBeenCalledWith(personId.value);
      expect(serviceProviderStore.getServiceProvidersByPersonId).toHaveBeenCalledWith(personId.value);
      expect(creation.createSuccessDialogVisible.value).toBe(false);
      expect(isEditActive.value).toBe(false);
      expect(editMode.hasPendingChange.value).toBe(false);
    });
  });

  describe('navigateToZuordnungForm', () => {
    it('should restore the cached values, clear the error and roll back the pending Zuordnungen', async () => {
      const { creation, state, personenkontextStore, prepareAddition, mockCommit, lehrRolle }: CreationSetup = setup({
        useFakeTimers: true,
      });
      const otherSchule: Organisation = DoFactory.getSchule();
      const pendingBeforeAddition: ZuordnungWithKlasse[] = [...(state.zuordnungenWithPendingChanges.value ?? [])];
      await prepareAddition(otherSchule);
      mockCommit(500, { i18nKey: 'SOME_MOCK_SERVER_ERROR' });
      await creation.confirmAddition();
      expect(creation.selectedRolle.value).toBeUndefined();
      expect(personenkontextStore.errorCode).toBe('SOME_MOCK_SERVER_ERROR');

      creation.navigateToZuordnungForm();
      await flushPromises();

      expect(personenkontextStore.errorCode).toBe('');
      expect(creation.isZuordnungFormActive.value).toBe(true);
      expect(creation.selectedOrganisation.value).toEqual(otherSchule);
      expect(creation.selectedRolle.value).toEqual(lehrRolle);
      expect(creation.selectedKopersNr.value).toBe('1234567');
      expect(state.zuordnungenWithPendingChanges.value).toEqual(pendingBeforeAddition);
    });

    it('should work without cached values and only clear the KoPers.-Nr.', () => {
      const { personenkontextStore, creation }: CreationSetup = setup({ useFakeTimers: true });
      personenkontextStore.errorCode = 'SOME_MOCK_SERVER_ERROR';

      creation.navigateToZuordnungForm();

      expect(personenkontextStore.errorCode).toBe('');
      expect(creation.isZuordnungFormActive.value).toBe(true);
      expect(creation.selectedRolle.value).toBeUndefined();
      expect(creation.selectedOrganisation.value).toBeUndefined();
      expect(creation.selectedKopersNr.value).toBe('');
    });

    describe('scrolling to the form', () => {
      const setupScrollTest = (): CreationSetup => {
        return setup({ useFakeTimers: true });
      };

      function addFormElement(): HTMLElement {
        const formElement: HTMLElement = document.createElement('div');
        formElement.id = 'personenkontext-create';
        document.body.appendChild(formElement);
        return formElement;
      }

      async function navigateAndWait(creation: ZuordnungCreation): Promise<void> {
        creation.navigateToZuordnungForm();
        await nextTick();
        vi.advanceTimersByTime(100);
      }

      it('should scroll smoothly to the form after the DOM was updated', async () => {
        const { creation }: CreationSetup = setupScrollTest();
        const scrollIntoView: ReturnType<typeof vi.fn<HTMLElement['scrollIntoView']>> = vi.fn();
        addFormElement().scrollIntoView = scrollIntoView;

        creation.navigateToZuordnungForm();
        await nextTick();
        expect(scrollIntoView).not.toHaveBeenCalled();
        vi.advanceTimersByTime(100);

        expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ behavior: 'smooth', block: 'start' });
      });

      it('should not fail if the form element is missing or cannot scroll', async () => {
        const { creation }: CreationSetup = setupScrollTest();
        await expect(navigateAndWait(creation)).resolves.toBeUndefined();

        // jsdom does not implement scrollIntoView
        addFormElement();
        await expect(navigateAndWait(creation)).resolves.toBeUndefined();
      });
    });
  });
});
