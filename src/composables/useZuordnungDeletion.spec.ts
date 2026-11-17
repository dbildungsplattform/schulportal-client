import { useAuthStore, type AuthStore, type UserInfo } from '@/stores/AuthStore';
import { OrganisationsTyp } from '@/stores/OrganisationStore';
import { type DbiamUpdatePersonenkontexteBodyParams } from '@/stores/PersonenkontextStore';
import { usePersonStore, type PersonStore } from '@/stores/PersonStore';
import { RollenArt } from '@/stores/RolleStore';
import { useServiceProviderStore, type ServiceProviderStore } from '@/stores/ServiceProviderStore';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import axiosApiInstance from '@/services/ApiService';
import type { ZuordnungenWorkingState, ZuordnungWithKlasse } from '@/utils/zuordnungen';
import MockAdapter from 'axios-mock-adapter';
import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import { computed, ref, type Ref } from 'vue';
import { useRouter, type Router } from 'vue-router';
import type { ZuordnungOperationMode } from './useZuordnungEditMode';
import { useZuordnungDeletion, type ZuordnungDeletion } from './useZuordnungDeletion';

vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
}));

const mockAdapter: MockAdapter = new MockAdapter(axiosApiInstance);

describe('useZuordnungDeletion', () => {
  let personStore: PersonStore;
  let authStore: AuthStore;
  let serviceProviderStore: ServiceProviderStore;
  let mode: ZuordnungOperationMode;
  let state: ZuordnungenWorkingState;
  let isEditActive: Ref<boolean>;
  let personId: Ref<string>;
  let push: ReturnType<typeof vi.fn>;
  let deletion: ZuordnungDeletion;
  let zuordnungA: ZuordnungWithKlasse;
  let zuordnungB: ZuordnungWithKlasse;

  function putUrl(): string {
    return `/api/personenkontext-workflow/${personId.value}`;
  }

  function setSelection(...selected: ZuordnungWithKlasse[]): void {
    state.selectedZuordnungen.value = selected;
  }

  function getPersistedOrganisationIds(): string[] {
    const body: DbiamUpdatePersonenkontexteBodyParams = JSON.parse(
      String(mockAdapter.history['put']?.[0]?.data),
    ) as DbiamUpdatePersonenkontexteBodyParams;
    return body.personenkontexte.map((kontext: { organisationId: string }) => kontext.organisationId);
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    mockAdapter.reset();
    vi.restoreAllMocks();

    personStore = usePersonStore();
    authStore = useAuthStore();
    serviceProviderStore = useServiceProviderStore();
    vi.spyOn(personStore, 'getPersonenuebersichtById').mockResolvedValue();
    vi.spyOn(serviceProviderStore, 'getServiceProvidersByPersonId').mockResolvedValue();

    push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as Router);

    zuordnungA = DoFactory.getZuordnung({ rollenArt: RollenArt.Lern });
    zuordnungB = DoFactory.getZuordnung({ rollenArt: RollenArt.Lehr });
    personId = ref(DoFactory.getPerson().id);
    isEditActive = ref(true);
    mode = {
      isFormActive: computed(() => false),
      showForm: vi.fn(),
      showReview: vi.fn(),
      end: vi.fn(),
    };
    state = {
      selectedZuordnungen: ref<ZuordnungWithKlasse[]>([]),
      zuordnungenWithPendingChanges: ref<ZuordnungWithKlasse[] | undefined>([zuordnungA, zuordnungB]),
      newZuordnung: ref<ZuordnungWithKlasse | undefined>(undefined),
      zuordnungenToBePersisted: ref<Zuordnung[]>([]),
    };
    authStore.currentUser = DoFactory.getUserinfoResponse({ personId: DoFactory.getPerson().id });
    deletion = useZuordnungDeletion({ personId, isEditActive, mode, state });
  });

  it('should show the review of the deletion when preparing it', () => {
    deletion.prepareDeletion();

    expect(mode.showReview).toHaveBeenCalledOnce();
  });

  describe('isDeleteExternZuordnungDisabled', () => {
    const landesadmin: UserInfo = DoFactory.getUserinfoResponse({
      personenkontexte: [
        DoFactory.getPersonenkontextRolleFieldsResponse({
          organisation: DoFactory.getOrganisationResponse({ typ: OrganisationsTyp.Root }),
        }),
      ],
    });
    const schuladmin: UserInfo = DoFactory.getUserinfoResponse();
    const withoutPersonenkontexte: UserInfo = DoFactory.getUserinfoResponse({ personenkontexte: undefined });

    test.each<[string, UserInfo | null, RollenArt, boolean]>([
      ['a Landesadmin', landesadmin, RollenArt.Extern, false],
      ['a Schuladmin', schuladmin, RollenArt.Extern, true],
      ['a user without Personenkontexte', withoutPersonenkontexte, RollenArt.Extern, true],
      ['no current user', null, RollenArt.Extern, true],
      ['a Schuladmin deleting a non-extern Zuordnung', schuladmin, RollenArt.Lehr, false],
    ])(
      'should be computed for %s',
      (_description: string, user: UserInfo | null, rollenArt: RollenArt, expected: boolean) => {
        authStore.currentUser = user;
        setSelection(DoFactory.getZuordnung({ rollenArt }));

        expect(deletion.isDeleteExternZuordnungDisabled.value).toBe(expected);
      },
    );
  });

  describe('confirmDeletion', () => {
    it('should not delete anything if the current user deletes their own Zuordnungen', async () => {
      authStore.currentUser = DoFactory.getUserinfoResponse({ personId: personId.value });
      setSelection(zuordnungA);

      await deletion.confirmDeletion();

      expect(deletion.cannotDeleteDialogVisible.value).toBe(true);
      expect(deletion.deleteSuccessDialogVisible.value).toBe(false);
      expect(mockAdapter.history['put']).toHaveLength(0);

      deletion.closeCannotDeleteDialog();
      expect(deletion.cannotDeleteDialogVisible.value).toBe(false);
    });

    it('should persist the remaining Zuordnungen and show the success dialog', async () => {
      mockAdapter.onPut(putUrl()).replyOnce(200, DoFactory.getPersonenkontextUpdateResponse());
      setSelection(zuordnungB);

      await deletion.confirmDeletion();

      expect(getPersistedOrganisationIds()).toEqual([zuordnungA.sskId]);
      expect(state.zuordnungenWithPendingChanges.value).toEqual([zuordnungA]);
      expect(state.selectedZuordnungen.value).toEqual([]);
      expect(deletion.deleteSuccessDialogVisible.value).toBe(true);
    });

    it('should not show the success dialog if persisting fails', async () => {
      mockAdapter.onPut(putUrl()).replyOnce(500, { i18nKey: 'PERSONENKONTEXTE_UPDATE_ERROR' });
      setSelection(zuordnungB);

      await deletion.confirmDeletion();

      expect(deletion.deleteSuccessDialogVisible.value).toBe(false);
      expect(deletion.cannotDeleteDialogVisible.value).toBe(false);
    });
  });

  describe('closeDeleteSuccessDialog', () => {
    beforeEach(() => {
      mockAdapter.onPut(putUrl()).replyOnce(200, DoFactory.getPersonenkontextUpdateResponse());
    });

    it('should end the edit mode and reload the person if editable Zuordnungen are left', async () => {
      setSelection(zuordnungB);
      await deletion.confirmDeletion();

      deletion.closeDeleteSuccessDialog();

      expect(deletion.deleteSuccessDialogVisible.value).toBe(false);
      expect(isEditActive.value).toBe(false);
      expect(mode.end).toHaveBeenCalledOnce();
      expect(personStore.getPersonenuebersichtById).toHaveBeenCalledWith(personId.value);
      expect(serviceProviderStore.getServiceProvidersByPersonId).toHaveBeenCalledWith(personId.value);
      expect(push).not.toHaveBeenCalled();
    });

    it('should navigate to the person table if no editable Zuordnungen are left', async () => {
      setSelection(zuordnungA, zuordnungB);
      await deletion.confirmDeletion();

      deletion.closeDeleteSuccessDialog();

      expect(isEditActive.value).toBe(false);
      expect(mode.end).toHaveBeenCalledOnce();
      expect(push).toHaveBeenCalledWith({ name: 'person-management' });
      expect(personStore.getPersonenuebersichtById).not.toHaveBeenCalled();
      expect(serviceProviderStore.getServiceProvidersByPersonId).not.toHaveBeenCalled();
    });
  });
});
