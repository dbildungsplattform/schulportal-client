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
import { onTestFinished } from 'vitest';
import type { ZuordnungOperationMode } from './useZuordnungEditMode';
import { useZuordnungDeletion, type ZuordnungDeletion } from './useZuordnungDeletion';

type DeletionSetup = {
  mockAdapter: MockAdapter;
  personStore: PersonStore;
  authStore: AuthStore;
  serviceProviderStore: ServiceProviderStore;
  mode: ZuordnungOperationMode;
  state: ZuordnungenWorkingState;
  isEditActive: Ref<boolean>;
  personId: Ref<string>;
  push: ReturnType<typeof vi.fn>;
  deletion: ZuordnungDeletion;
  zuordnungA: ZuordnungWithKlasse;
  zuordnungB: ZuordnungWithKlasse;
  putUrl: () => string;
  setSelection: (...selected: ZuordnungWithKlasse[]) => void;
  getPersistedOrganisationIds: () => string[];
};

vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
}));

describe('useZuordnungDeletion', () => {
  const setup = (): DeletionSetup => {
    setActivePinia(createPinia());
    const mockAdapter: MockAdapter = new MockAdapter(axiosApiInstance);
    onTestFinished(() => {
      mockAdapter.restore();
      vi.restoreAllMocks();
    });
    vi.restoreAllMocks();

    const personStore: PersonStore = usePersonStore();
    const authStore: AuthStore = useAuthStore();
    const serviceProviderStore: ServiceProviderStore = useServiceProviderStore();
    vi.spyOn(personStore, 'getPersonenuebersichtById').mockResolvedValue();
    vi.spyOn(serviceProviderStore, 'getServiceProvidersByPersonId').mockResolvedValue();

    const push: ReturnType<typeof vi.fn> = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as Router);

    const zuordnungA: ZuordnungWithKlasse = DoFactory.getZuordnung({ rollenArt: RollenArt.Lern });
    const zuordnungB: ZuordnungWithKlasse = DoFactory.getZuordnung({ rollenArt: RollenArt.Lehr });
    const personId: Ref<string> = ref(DoFactory.getPerson().id);
    const isEditActive: Ref<boolean> = ref(true);
    const mode: ZuordnungOperationMode = {
      isFormActive: computed(() => false),
      showForm: vi.fn(),
      showReview: vi.fn(),
      end: vi.fn(),
    };
    const state: ZuordnungenWorkingState = {
      selectedZuordnungen: ref<ZuordnungWithKlasse[]>([]),
      zuordnungenWithPendingChanges: ref<ZuordnungWithKlasse[] | undefined>([zuordnungA, zuordnungB]),
      newZuordnung: ref<ZuordnungWithKlasse | undefined>(undefined),
      zuordnungenToBePersisted: ref<Zuordnung[]>([]),
    };
    authStore.currentUser = DoFactory.getUserinfoResponse({ personId: DoFactory.getPerson().id });
    const deletion: ZuordnungDeletion = useZuordnungDeletion({ personId, isEditActive, mode, state });

    const putUrl = (): string => `/api/personenkontext-workflow/${personId.value}`;
    const setSelection = (...selected: ZuordnungWithKlasse[]): void => {
      state.selectedZuordnungen.value = selected;
    };
    const getPersistedOrganisationIds = (): string[] => {
      const body: DbiamUpdatePersonenkontexteBodyParams = JSON.parse(
        String(mockAdapter.history['put']?.[0]?.data),
      ) as DbiamUpdatePersonenkontexteBodyParams;
      return body.personenkontexte.map((kontext: { organisationId: string }) => kontext.organisationId);
    };

    return {
      mockAdapter,
      personStore,
      authStore,
      serviceProviderStore,
      mode,
      state,
      isEditActive,
      personId,
      push,
      deletion,
      zuordnungA,
      zuordnungB,
      putUrl,
      setSelection,
      getPersistedOrganisationIds,
    };
  };

  it('should show the review of the deletion when preparing it', () => {
    const { deletion, mode }: ReturnType<typeof setup> = setup();
    deletion.prepareDeletion();

    expect(mode.showReview).toHaveBeenCalledOnce();
  });

  describe('isDeleteExternZuordnungDisabled', () => {
    const isDisabledFor = (
      userType: 'landesadmin' | 'schuladmin' | 'no-context' | 'none',
      rollenArt: RollenArt,
    ): boolean => {
      const { authStore, deletion, setSelection }: ReturnType<typeof setup> = setup();
      const user: UserInfo | null = {
        landesadmin: DoFactory.getUserinfoResponse({
          personenkontexte: [
            DoFactory.getPersonenkontextRolleFieldsResponse({
              organisation: DoFactory.getOrganisationResponse({ typ: OrganisationsTyp.Root }),
            }),
          ],
        }),
        schuladmin: DoFactory.getUserinfoResponse(),
        'no-context': DoFactory.getUserinfoResponse({ personenkontexte: undefined }),
        none: null,
      }[userType];
      authStore.currentUser = user;
      setSelection(DoFactory.getZuordnung({ rollenArt }));

      return deletion.isDeleteExternZuordnungDisabled.value;
    };

    describe('for a Landesadmin', () => {
      it('should be false', () => {
        expect(isDisabledFor('landesadmin', RollenArt.Extern)).toBe(false);
      });
    });

    describe('for a Schuladmin', () => {
      it('should be true', () => {
        expect(isDisabledFor('schuladmin', RollenArt.Extern)).toBe(true);
      });
    });

    describe('for a user without Personenkontexte', () => {
      it('should be true', () => {
        expect(isDisabledFor('no-context', RollenArt.Extern)).toBe(true);
      });
    });

    describe('without a current user', () => {
      it('should be true', () => {
        expect(isDisabledFor('none', RollenArt.Extern)).toBe(true);
      });
    });

    describe('for a Schuladmin deleting a non-extern Zuordnung', () => {
      it('should be false', () => {
        expect(isDisabledFor('schuladmin', RollenArt.Lehr)).toBe(false);
      });
    });
  });

  describe('confirmDeletion', () => {
    it('should not delete anything if the current user deletes their own Zuordnungen', async () => {
      const { authStore, deletion, personId, setSelection, mockAdapter, zuordnungA }: ReturnType<typeof setup> =
        setup();
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
      const {
        mockAdapter,
        deletion,
        putUrl,
        setSelection,
        zuordnungA,
        zuordnungB,
        state,
        getPersistedOrganisationIds,
      }: ReturnType<typeof setup> = setup();
      mockAdapter.onPut(putUrl()).replyOnce(200, DoFactory.getPersonenkontextUpdateResponse());
      setSelection(zuordnungB);

      await deletion.confirmDeletion();

      expect(getPersistedOrganisationIds()).toEqual([zuordnungA.sskId]);
      expect(state.zuordnungenWithPendingChanges.value).toEqual([zuordnungA]);
      expect(state.selectedZuordnungen.value).toEqual([]);
      expect(deletion.deleteSuccessDialogVisible.value).toBe(true);
    });

    it('should not show the success dialog if persisting fails', async () => {
      const { mockAdapter, deletion, putUrl, setSelection, zuordnungB }: ReturnType<typeof setup> = setup();
      mockAdapter.onPut(putUrl()).replyOnce(500, { i18nKey: 'PERSONENKONTEXTE_UPDATE_ERROR' });
      setSelection(zuordnungB);

      await deletion.confirmDeletion();

      expect(deletion.deleteSuccessDialogVisible.value).toBe(false);
      expect(deletion.cannotDeleteDialogVisible.value).toBe(false);
    });
  });

  describe('closeDeleteSuccessDialog', () => {
    it('should end the edit mode and reload the person if editable Zuordnungen are left', async () => {
      const {
        mockAdapter,
        deletion,
        putUrl,
        setSelection,
        zuordnungB,
        isEditActive,
        mode,
        personStore,
        personId,
        serviceProviderStore,
        push,
      }: ReturnType<typeof setup> = setup();
      mockAdapter.onPut(putUrl()).replyOnce(200, DoFactory.getPersonenkontextUpdateResponse());
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
      const {
        mockAdapter,
        deletion,
        putUrl,
        setSelection,
        zuordnungA,
        zuordnungB,
        isEditActive,
        mode,
        personStore,
        serviceProviderStore,
        push,
      }: ReturnType<typeof setup> = setup();
      mockAdapter.onPut(putUrl()).replyOnce(200, DoFactory.getPersonenkontextUpdateResponse());
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
