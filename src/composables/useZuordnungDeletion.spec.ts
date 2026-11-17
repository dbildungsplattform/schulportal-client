import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
import { OrganisationsTyp, type Organisation } from '@/stores/OrganisationStore';
import {
  usePersonenkontextStore,
  type DbiamUpdatePersonenkontexteBodyParams,
  type PersonenkontextStore,
} from '@/stores/PersonenkontextStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import { RollenArt } from '@/stores/RolleStore';
import { useServiceProviderStore, type ServiceProviderStore } from '@/stores/ServiceProviderStore';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import axiosApiInstance from '@/services/ApiService';
import {
  computeZuordnungenWithKlasse,
  type ZuordnungenWorkingState,
  type ZuordnungWithKlasse,
} from '@/utils/zuordnungen';
import MockAdapter from 'axios-mock-adapter';
import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import { ref, type Ref } from 'vue';
import { useRouter, type Router } from 'vue-router';
import { useZuordnungDeletion, type ZuordnungDeletion } from './useZuordnungDeletion';
import { useZuordnungEditMode, type ZuordnungEditMode, type ZuordnungOperationMode } from './useZuordnungEditMode';

vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
}));

const mockAdapter: MockAdapter = new MockAdapter(axiosApiInstance);

describe('useZuordnungDeletion', () => {
  let personStore: PersonStore;
  let personenkontextStore: PersonenkontextStore;
  let authStore: AuthStore;
  let serviceProviderStore: ServiceProviderStore;
  let editMode: ZuordnungEditMode;
  let mode: ZuordnungOperationMode;
  let state: ZuordnungenWorkingState;
  let isEditActive: Ref<boolean>;
  let personId: Ref<string>;
  let push: ReturnType<typeof vi.fn>;
  let deletion: ZuordnungDeletion;

  let schuleA: Organisation;
  let schuleB: Organisation;
  let klasseA: Organisation;
  let zuordnungA: Zuordnung;
  let zuordnungB: Zuordnung;
  let klassenZuordnungA: Zuordnung;

  function setupDeletion(): void {
    deletion = useZuordnungDeletion({ personId, isEditActive, mode, state });
  }

  function selectPending(...selected: Zuordnung[]): void {
    state.selectedZuordnungen.value = (state.zuordnungenWithPendingChanges.value ?? []).filter(
      (pending: ZuordnungWithKlasse) =>
        selected.some(
          (zuordnung: Zuordnung) => zuordnung.sskId === pending.sskId && zuordnung.rolleId === pending.rolleId,
        ),
    );
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    mockAdapter.reset();
    vi.restoreAllMocks();

    personStore = usePersonStore();
    personenkontextStore = usePersonenkontextStore();
    authStore = useAuthStore();
    serviceProviderStore = useServiceProviderStore();

    push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as Router);

    schuleA = DoFactory.getSchule();
    schuleB = DoFactory.getSchule();
    klasseA = DoFactory.getKlasse(schuleA);
    zuordnungA = DoFactory.getZuordnung({ rollenArt: RollenArt.Lern, editable: true }, { organisation: schuleA });
    zuordnungB = DoFactory.getZuordnung({ rollenArt: RollenArt.Lehr, editable: true }, { organisation: schuleB });
    klassenZuordnungA = DoFactory.getZuordnung(
      {
        sskId: klasseA.id,
        sskName: klasseA.name,
        rolleId: zuordnungA.rolleId,
        rolle: zuordnungA.rolle,
        rollenArt: zuordnungA.rollenArt,
        administriertVon: schuleA.id,
        typ: OrganisationsTyp.Klasse,
      },
      { organisation: klasseA },
    );

    const person: ReturnType<typeof DoFactory.getPerson> = DoFactory.getPerson();
    personId = ref(person.id);
    personStore.personenuebersicht = DoFactory.getPersonenUebersicht(person, [
      zuordnungA,
      klassenZuordnungA,
      zuordnungB,
    ]);

    state = {
      selectedZuordnungen: ref<ZuordnungWithKlasse[]>([]),
      zuordnungenWithPendingChanges: ref<ZuordnungWithKlasse[] | undefined>(
        computeZuordnungenWithKlasse(personStore.personenuebersicht),
      ),
      newZuordnung: ref<ZuordnungWithKlasse | undefined>(undefined),
      zuordnungenToBePersisted: ref<Zuordnung[]>([]),
    };

    isEditActive = ref(true);
    editMode = useZuordnungEditMode();
    mode = editMode.forOperation('deletion');
    authStore.currentUser = DoFactory.getUserinfoResponse({ personId: DoFactory.getPerson().id });
    setupDeletion();
  });

  describe('prepareDeletion', () => {
    it('should show the review of the deletion', () => {
      deletion.prepareDeletion();

      expect(editMode.pendingOperation.value).toBe('deletion');
    });
  });

  describe('isDeleteExternZuordnungDisabled', () => {
    function selectExtern(): void {
      const externZuordnung: ZuordnungWithKlasse = DoFactory.getZuordnung({ rollenArt: RollenArt.Extern });
      state.zuordnungenWithPendingChanges.value = [externZuordnung];
      state.selectedZuordnungen.value = [externZuordnung];
    }

    it('should be disabled for an extern Zuordnung if the current user is no Landesadmin', () => {
      selectExtern();

      expect(deletion.isDeleteExternZuordnungDisabled.value).toBe(true);
    });

    it('should be enabled for an extern Zuordnung if the current user has a Zuordnung at the root organisation', () => {
      authStore.currentUser = DoFactory.getUserinfoResponse({
        personenkontexte: [
          DoFactory.getPersonenkontextRolleFieldsResponse({
            organisation: DoFactory.getOrganisationResponse({ typ: OrganisationsTyp.Root }),
          }),
        ],
      });
      selectExtern();

      expect(deletion.isDeleteExternZuordnungDisabled.value).toBe(false);
    });

    it('should be enabled if no extern Zuordnung is selected', () => {
      selectPending(zuordnungA);

      expect(deletion.isDeleteExternZuordnungDisabled.value).toBe(false);
    });
  });

  describe('confirmDeletion', () => {
    it('should not delete anything and show the dialog if the current user deletes their own Zuordnungen', async () => {
      authStore.currentUser = DoFactory.getUserinfoResponse({ personId: personId.value });
      selectPending(zuordnungA);

      await deletion.confirmDeletion();

      expect(deletion.cannotDeleteDialogVisible.value).toBe(true);
      expect(deletion.deleteSuccessDialogVisible.value).toBe(false);
      expect(mockAdapter.history['put']).toHaveLength(0);
      expect(state.selectedZuordnungen.value).toHaveLength(1);

      deletion.closeCannotDeleteDialog();
      expect(deletion.cannotDeleteDialogVisible.value).toBe(false);
    });

    it('should persist the remaining Zuordnungen with the Klassen they keep and show the success dialog', async () => {
      mockAdapter
        .onPut(`/api/personenkontext-workflow/${personId.value}`)
        .replyOnce(200, DoFactory.getPersonenkontextUpdateResponse());
      selectPending(zuordnungB);

      await deletion.confirmDeletion();

      const body: DbiamUpdatePersonenkontexteBodyParams = JSON.parse(
        String(mockAdapter.history['put']?.[0]?.data),
      ) as DbiamUpdatePersonenkontexteBodyParams;
      expect(body.personenkontexte.map((kontext: { organisationId: string }) => kontext.organisationId)).toEqual([
        schuleA.id,
        klasseA.id,
      ]);
      expect(body.personenkontexte.every((kontext: { personId: string }) => kontext.personId === personId.value)).toBe(
        true,
      );
      expect(state.zuordnungenWithPendingChanges.value?.map((z: Zuordnung) => z.sskId)).toEqual([schuleA.id]);
      expect(state.selectedZuordnungen.value).toEqual([]);
      expect(deletion.deleteSuccessDialogVisible.value).toBe(true);
    });

    it('should not show the success dialog if persisting fails', async () => {
      mockAdapter
        .onPut(`/api/personenkontext-workflow/${personId.value}`)
        .replyOnce(500, { i18nKey: 'PERSONENKONTEXTE_UPDATE_ERROR' });
      selectPending(zuordnungB);

      await deletion.confirmDeletion();

      expect(personenkontextStore.errorCode).toBe('PERSONENKONTEXTE_UPDATE_ERROR');
      expect(deletion.deleteSuccessDialogVisible.value).toBe(false);
      expect(deletion.cannotDeleteDialogVisible.value).toBe(false);
    });
  });

  describe('closeDeleteSuccessDialog', () => {
    beforeEach(() => {
      vi.spyOn(personStore, 'getPersonenuebersichtById').mockResolvedValue();
      vi.spyOn(serviceProviderStore, 'getServiceProvidersByPersonId').mockResolvedValue();
      mockAdapter
        .onPut(`/api/personenkontext-workflow/${personId.value}`)
        .replyOnce(200, DoFactory.getPersonenkontextUpdateResponse());
    });

    it('should end the edit mode and reload the person if editable Zuordnungen are left', async () => {
      deletion.prepareDeletion();
      selectPending(zuordnungB);
      await deletion.confirmDeletion();

      deletion.closeDeleteSuccessDialog();

      expect(deletion.deleteSuccessDialogVisible.value).toBe(false);
      expect(isEditActive.value).toBe(false);
      expect(editMode.hasPendingChange.value).toBe(false);
      expect(personStore.getPersonenuebersichtById).toHaveBeenCalledWith(personId.value);
      expect(serviceProviderStore.getServiceProvidersByPersonId).toHaveBeenCalledWith(personId.value);
      expect(push).not.toHaveBeenCalled();
    });

    it('should navigate to the person table if no editable Zuordnungen are left', async () => {
      selectPending(zuordnungA, zuordnungB);
      await deletion.confirmDeletion();

      deletion.closeDeleteSuccessDialog();

      expect(isEditActive.value).toBe(false);
      expect(push).toHaveBeenCalledWith({ name: 'person-management' });
      expect(personStore.getPersonenuebersichtById).not.toHaveBeenCalled();
      expect(serviceProviderStore.getServiceProvidersByPersonId).not.toHaveBeenCalled();
    });
  });
});
