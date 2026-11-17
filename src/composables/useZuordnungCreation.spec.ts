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
import { useZuordnungCreation, type ZuordnungCreation } from './useZuordnungCreation';
import { useZuordnungEditMode, type ZuordnungEditMode, type ZuordnungOperationMode } from './useZuordnungEditMode';
import { useZuordnungenWorkingState, type ZuordnungenWorkingStateResult } from './useZuordnungenWorkingState';

const mockAdapter: MockAdapter = new MockAdapter(axiosApiInstance);

describe('useZuordnungCreation', () => {
  let scope: EffectScope;
  let personStore: PersonStore;
  let personenkontextStore: PersonenkontextStore;
  let rolleStore: RolleStore;
  let serviceProviderStore: ServiceProviderStore;
  let editMode: ZuordnungEditMode;
  let mode: ZuordnungOperationMode;
  let state: ZuordnungenWorkingStateResult;
  let isEditActive: Ref<boolean>;
  let personId: Ref<string>;
  let tMock: ReturnType<typeof vi.fn<(key: string, params?: Record<string, unknown>) => string>>;
  let schule: Organisation;
  let existingZuordnung: Zuordnung;
  let creation: ZuordnungCreation;

  const lehrRolle: TranslatedRolleWithAttrs = DoFactory.getTranslatedRolleWithAttrs({ rollenart: RollenArt.Lehr });
  const lernRolle: TranslatedRolleWithAttrs = DoFactory.getTranslatedRolleWithAttrs({ rollenart: RollenArt.Lern });
  const befristungspflichtRolle: TranslatedRolleWithAttrs = DoFactory.getTranslatedRolleWithAttrs({
    rollenart: RollenArt.Lehr,
    merkmale: [RollenMerkmal.BefristungPflicht],
  });

  function createCreation(): ZuordnungCreation {
    return scope.run(() => {
      state = useZuordnungenWorkingState({ personId });
      return useZuordnungCreation({
        t: tMock as unknown as Composer['t'],
        personId,
        isEditActive,
        mode,
        state,
      });
    })!;
  }

  // Selects a valid Organisation and Rolle and waits for the asynchronous watchers of the Rolle
  async function selectRolle(rolle: TranslatedRolleWithAttrs, organisation: Organisation = schule): Promise<void> {
    creation.selectedOrganisation.value = organisation;
    creation.selectedRolle.value = rolle;
    await flushPromises();
  }

  // The KoPers.-Nr. is sent as query parameter, hence the URL is matched with a pattern
  function mockCommit(status: number, data: unknown): void {
    mockAdapter.onPut(new RegExp(`^/api/personenkontext-workflow/${personId.value}`)).replyOnce(status, data);
  }

  // Selects the Rolle and a KoPers.-Nr. and confirms the creation so that the Zuordnungen are ready to be persisted
  async function prepareAddition(organisation: Organisation = DoFactory.getSchule()): Promise<void> {
    await selectRolle(lehrRolle, organisation);
    creation.selectedKopersNr.value = '1234567';
    creation.confirmDialogAddition();
  }

  beforeEach(() => {
    setActivePinia(createTestingPinia({ stubActions: false }));
    mockAdapter.reset();
    scope = effectScope();

    personStore = usePersonStore();
    personenkontextStore = usePersonenkontextStore();
    rolleStore = useRolleStore();
    serviceProviderStore = useServiceProviderStore();
    personStore.getPersonById = vi.fn();
    personStore.getPersonenuebersichtById = vi.fn();
    serviceProviderStore.getServiceProvidersByPersonId = vi.fn();

    schule = DoFactory.getSchule();
    existingZuordnung = DoFactory.getZuordnung({ rolleId: lehrRolle.value }, { organisation: schule });
    personStore.personenuebersicht = DoFactory.getPersonenUebersicht(DoFactory.getPerson(), [existingZuordnung]);
    personStore.currentPerson = DoFactory.getPersonendatensatz();
    rolleStore.rollenForPersonenkontextCreation = [lehrRolle, lernRolle, befristungspflichtRolle];

    editMode = useZuordnungEditMode();
    mode = editMode.forOperation('creation');
    isEditActive = ref(true);
    personId = ref(personStore.personenuebersicht.personId);
    tMock = vi.fn((key: string) => key);
    creation = createCreation();
  });

  afterEach(() => {
    scope.stop();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('triggerAddZuordnung', () => {
    it('should show the creation form', () => {
      expect(creation.isZuordnungFormActive.value).toBe(false);

      creation.triggerAddZuordnung();

      expect(creation.isZuordnungFormActive.value).toBe(true);
      expect(editMode.hasPendingChange.value).toBe(false);
    });
  });

  describe('filteredRollen', () => {
    it('should offer all Rollen as long as no Organisation is selected', () => {
      expect(creation.filteredRollen.value).toEqual(rolleStore.rollenForPersonenkontextCreation);
    });

    it('should offer all Rollen if the person has no Zuordnungen', () => {
      personStore.personenuebersicht = DoFactory.getPersonenUebersicht(DoFactory.getPerson(), []);
      creation.selectedOrganisation.value = schule;

      expect(creation.filteredRollen.value).toEqual(rolleStore.rollenForPersonenkontextCreation);
    });

    it('should omit the Rollen the person already has at the selected Organisation', () => {
      creation.selectedOrganisation.value = schule;
      expect(creation.filteredRollen.value).toEqual([lernRolle, befristungspflichtRolle]);

      creation.selectedOrganisation.value = DoFactory.getSchule();
      expect(creation.filteredRollen.value).toEqual(rolleStore.rollenForPersonenkontextCreation);
    });
  });

  describe('existingRollenArt', () => {
    it('should be the Rollenart of the first Zuordnung or undefined without Personenuebersicht', () => {
      expect(creation.existingRollenArt.value).toBe(existingZuordnung.rollenArt);

      personStore.personenuebersicht = null;
      expect(creation.existingRollenArt.value).toBeUndefined();
    });
  });

  describe('Befristung', () => {
    it('should own the flags and set them once a Rolle with Befristungspflicht is selected', async () => {
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
      expect(creation.isZuordnungCreationFormDirty.value).toBe(false);

      await selectRolle(lehrRolle);

      expect(creation.isZuordnungCreationFormDirty.value).toBe(true);
    });
  });

  describe('hasNoKopersNr', () => {
    it('should show the confirmation dialog only when the person has no KoPers.-Nr.', async () => {
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
      await creation.onSubmitCreateZuordnung();

      expect(creation.createZuordnungConfirmationDialogVisible.value).toBe(false);
    });

    it('should open the confirmation dialog for a Rolle that is not a Lern-Rolle', async () => {
      await selectRolle(lehrRolle, DoFactory.getSchule());

      await creation.onSubmitCreateZuordnung();

      expect(creation.createZuordnungConfirmationDialogVisible.value).toBe(true);
      expect(tMock).toHaveBeenCalledWith('person.addZuordnungConfirmation', { rollenname: lehrRolle.title });
    });

    it('should mention the Klasse of a Lern-Rolle in the confirmation', async () => {
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
      await selectRolle(lehrRolle);

      creation.handleFieldReset('selectedRolle');

      expect(creation.selectedRolle.value).toBeUndefined();
    });

    it('should clear the selected Klasse', async () => {
      await selectRolle(lernRolle, DoFactory.getSchule());
      creation.handleKlasseUpdate(DoFactory.getKlasse(schule));
      await flushPromises();

      creation.handleFieldReset('selectedKlasse');
      await flushPromises();
      creation.confirmDialogAddition();

      expect(state.newZuordnung.value?.klasse).toBeUndefined();
    });

    it('should ignore other fields', async () => {
      await selectRolle(lehrRolle);

      creation.handleFieldReset('selectedOrganisation');

      expect(creation.selectedRolle.value).toEqual(lehrRolle);
      expect(creation.selectedOrganisation.value).toEqual(schule);
    });
  });

  describe('confirmDialogAddition', () => {
    it('should build the new Zuordnung and the Zuordnungen to be persisted and show the review', async () => {
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
      const klasse: Organisation = DoFactory.getKlasse(schule);
      await selectRolle(lernRolle, DoFactory.getSchule());
      creation.handleKlasseUpdate(klasse);

      creation.confirmDialogAddition();

      expect(state.newZuordnung.value?.klasse).toBe(klasse.name);
      expect(state.zuordnungenToBePersisted.value.map((zuordnung: Zuordnung) => zuordnung.sskId)).toContain(klasse.id);
    });

    it('should ignore a previously selected Klasse for a Rolle that is not a Lern-Rolle', async () => {
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
      const selectedDate: string = '31.12.2099';
      await selectRolle(befristungspflichtRolle, DoFactory.getSchule());

      creation.confirmDialogAddition();
      expect(state.newZuordnung.value?.befristung).toBe(formatDateToISO(getNextSchuljahresende()));

      creation.selectedBefristung.value = selectedDate;
      creation.confirmDialogAddition();
      expect(state.newZuordnung.value?.befristung).toBe(formatDateToISO(selectedDate));
    });

    it('should fall back to empty values if no Zuordnungen are loaded and no Rolle is selected', () => {
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
      await prepareAddition();
      mockCommit(500, { i18nKey: 'SOME_MOCK_SERVER_ERROR' });

      await creation.confirmAddition();

      expect(personenkontextStore.errorCode).toBe('SOME_MOCK_SERVER_ERROR');
      expect(creation.createSuccessDialogVisible.value).toBe(false);
    });
  });

  describe('closeCreateSuccessDialog', () => {
    it('should reload the person, close the dialog and leave the edit mode', () => {
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
    // The scrolling is scheduled with setTimeout and must not outlive the test
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout'] });
    });

    it('should restore the cached values, clear the error and roll back the pending Zuordnungen', async () => {
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
      personenkontextStore.errorCode = 'SOME_MOCK_SERVER_ERROR';

      creation.navigateToZuordnungForm();

      expect(personenkontextStore.errorCode).toBe('');
      expect(creation.isZuordnungFormActive.value).toBe(true);
      expect(creation.selectedRolle.value).toBeUndefined();
      expect(creation.selectedOrganisation.value).toBeUndefined();
      expect(creation.selectedKopersNr.value).toBe('');
    });

    describe('scrolling to the form', () => {
      function addFormElement(): HTMLElement {
        const formElement: HTMLElement = document.createElement('div');
        formElement.id = 'personenkontext-create';
        document.body.appendChild(formElement);
        return formElement;
      }

      async function navigateAndWait(): Promise<void> {
        creation.navigateToZuordnungForm();
        await nextTick();
        vi.advanceTimersByTime(100);
      }

      it('should scroll smoothly to the form after the DOM was updated', async () => {
        const scrollIntoView: ReturnType<typeof vi.fn<HTMLElement['scrollIntoView']>> = vi.fn();
        addFormElement().scrollIntoView = scrollIntoView;

        creation.navigateToZuordnungForm();
        await nextTick();
        expect(scrollIntoView).not.toHaveBeenCalled();
        vi.advanceTimersByTime(100);

        expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ behavior: 'smooth', block: 'start' });
      });

      it('should not fail if the form element is missing or cannot scroll', async () => {
        await expect(navigateAndWait()).resolves.toBeUndefined();

        // jsdom does not implement scrollIntoView
        addFormElement();
        await expect(navigateAndWait()).resolves.toBeUndefined();
      });
    });
  });
});
