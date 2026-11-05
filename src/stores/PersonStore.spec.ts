/* eslint-disable @typescript-eslint/typedef */
import {
  type DBiamPersonenuebersichtControllerFindPersonenuebersichten200Response,
  type DBiamPersonenuebersichtResponse,
  type LockUserBodyParams,
  type PersonFrontendControllerFindPersons200Response,
  type PersonLandesbediensteterSearchResponse,
  type PersonLockResponse,
  type PersonMetadataBodyParams,
  type PersonendatensatzResponse,
} from '@/api-client/generated';
import axiosApiInstance from '@/services/ApiService';
import { PersonLockOccasion } from '@/utils/lock';
import MockAdapter from 'axios-mock-adapter';
import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import type { Organisation } from './OrganisationStore';
import { usePersonStore, type PersonStore, type Personendatensatz } from './PersonStore';
import type { Person } from './types/Person';
import { PersonenUebersicht } from './types/PersonenUebersicht';
import type { PersonWithZuordnungen } from './types/PersonWithZuordnungen';
import { Zuordnung } from './types/Zuordnung';

const mockadapter: MockAdapter = new MockAdapter(axiosApiInstance);

function getUserLockBodyParams(lock: boolean): LockUserBodyParams {
  return {
    lock: lock,
    locked_by: 'Alfred Admin',
    locked_until: undefined,
  };
}

function getMockPersonendatensatz(): Personendatensatz {
  const person: Person = DoFactory.getPerson();
  person.userLock = [
    DoFactory.getUserLockEntry({
      personId: person.id,
      lock_occasion: PersonLockOccasion.MANUELL_GESPERRT,
    }),
    DoFactory.getUserLockEntry({
      personId: person.id,
      lock_occasion: PersonLockOccasion.KOPERS_GESPERRT,
    }),
  ];
  return {
    person,
  };
}

describe('PersonStore', () => {
  let personStore: PersonStore;
  beforeEach(() => {
    setActivePinia(createPinia());
    personStore = usePersonStore();
    personStore.$reset();
    mockadapter.reset();
  });

  it('should initalize state correctly', () => {
    expect(personStore.errorCode).toEqual('');
    expect(personStore.loading).toBe(false);
  });

  describe('getAllPersons', () => {
    it('should load persons and their overviews, and update state', async () => {
      const mockSchule: Organisation = DoFactory.getOrganisation();
      // Mock data for persons
      const mockPersons: PersonendatensatzResponse[] = [
        DoFactory.getPersonendatensatzResponse(),
        DoFactory.getPersonendatensatzResponse(),
        DoFactory.getPersonendatensatzResponse(),
        DoFactory.getPersonendatensatzResponse(),
      ];

      // Mock response for persons
      const mockPersonsResponse: PersonFrontendControllerFindPersons200Response = {
        offset: 0,
        limit: mockPersons.length,
        total: mockPersons.length,
        items: mockPersons,
      };

      // Mock data for person overviews
      const mockUebersichten: DBiamPersonenuebersichtControllerFindPersonenuebersichten200Response = {
        total: mockPersons.length,
        offset: 0,
        limit: mockPersons.length,
        items: mockPersons.map((person: PersonendatensatzResponse) => {
          return DoFactory.getDBiamPersonenuebersichtResponse(
            {
              personId: person.person.id,
              vorname: person.person.name.vorname,
              nachname: person.person.name.familienname,
              benutzername: person.person.username ?? '---',
            },
            {
              organisation: mockSchule,
            },
          );
        }),
      };

      // add extra response for statement coverage; this can't happen in real life
      const mockUebersichtenResponse: DBiamPersonenuebersichtControllerFindPersonenuebersichten200Response = {
        ...mockUebersichten,
        items: [...mockUebersichten.items, DoFactory.getDBiamPersonenuebersichtResponse()],
      };

      mockadapter.onGet('/api/personen-frontend').replyOnce(200, mockPersonsResponse);

      // Update the mock POST request with the appropriate body
      const personIds: string[] = mockPersons.map((person: PersonendatensatzResponse) => person.person.id);
      mockadapter.onPost('/api/dbiam/personenuebersicht', { personIds }).replyOnce(200, mockUebersichtenResponse);

      const getAllPersonsPromise: Promise<void> = personStore.getAllPersons({});
      expect(personStore.loading).toBe(true);
      await getAllPersonsPromise;
      expect(personStore.loading).toBe(false);

      for (const mockUebersicht of mockUebersichten.items) {
        const mockPerson: PersonendatensatzResponse = mockPersons.find(
          (p: PersonendatensatzResponse) => p.person.id === mockUebersicht.personId,
        )!;
        const person: PersonWithZuordnungen = personStore.allUebersichten.get(mockUebersicht.personId)!;
        expect(person).toBeDefined();
        expect(person.personalnummer).toEqual(mockPerson.person.personalnummer);
        for (const mockZuordnung of mockUebersicht.zuordnungen) {
          expect(person.zuordnungen).toContainEqual(Zuordnung.fromResponse(mockZuordnung));
        }
      }
    });

    it('should skip, if persons or their overviews are missing', async () => {
      const mockSchule: Organisation = DoFactory.getOrganisation();
      // Mock data for persons
      const mockPersons: PersonendatensatzResponse[] = [
        DoFactory.getPersonendatensatzResponse(),
        DoFactory.getPersonendatensatzResponse(),
      ];

      // Mock response for persons
      const mockPersonsResponse: PersonFrontendControllerFindPersons200Response = {
        offset: 0,
        limit: mockPersons.length,
        total: mockPersons.length,
        items: mockPersons,
      };

      // Mock data for person overviews
      const mockUebersichten: DBiamPersonenuebersichtControllerFindPersonenuebersichten200Response = {
        total: mockPersons.length,
        offset: 0,
        limit: mockPersons.length,
        items: [
          DoFactory.getDBiamPersonenuebersichtResponse(
            {
              personId: mockPersons[0]!.person.id,
              vorname: mockPersons[0]!.person.name.vorname,
              nachname: mockPersons[0]!.person.name.familienname,
              benutzername: mockPersons[0]!.person.username ?? '---',
            },
            {
              organisation: mockSchule,
            },
          ),
        ],
      };

      // add extra response for statement coverage; this can't happen in real life
      const mockUebersichtenResponse: DBiamPersonenuebersichtControllerFindPersonenuebersichten200Response = {
        ...mockUebersichten,
      };

      mockadapter.onGet('/api/personen-frontend').replyOnce(200, mockPersonsResponse);

      // Update the mock POST request with the appropriate body
      const personIds: string[] = mockPersons.map((person: PersonendatensatzResponse) => person.person.id);
      mockadapter.onPost('/api/dbiam/personenuebersicht', { personIds }).replyOnce(200, mockUebersichtenResponse);

      const getAllPersonsPromise: Promise<void> = personStore.getAllPersons({});
      expect(personStore.loading).toBe(true);
      await getAllPersonsPromise;
      expect(personStore.loading).toBe(false);

      expect(personStore.allUebersichten.size).toEqual(1);
    });

    it('should return empty map if no persons were found', async () => {
      // Mock response for persons
      const mockPersonsResponse: PersonFrontendControllerFindPersons200Response = {
        offset: 0,
        limit: 0,
        total: 0,
        items: [],
      };

      mockadapter.onGet('/api/personen-frontend').replyOnce(200, mockPersonsResponse);

      const getAllPersonsPromise: Promise<void> = personStore.getAllPersons({});
      expect(personStore.loading).toBe(true);
      expect(personStore.allUebersichten).toEqual(new Map());
      await getAllPersonsPromise;
      expect(personStore.loading).toBe(false);
      expect(personStore.allUebersichten).toEqual(new Map());
    });

    it('should load persons according to filter', async () => {
      const mockPersons: PersonendatensatzResponse[] = [DoFactory.getPersonendatensatzResponse()];

      const mockPersonsResponse: PersonFrontendControllerFindPersons200Response = {
        offset: 0,
        limit: 2,
        total: 2,
        items: mockPersons,
      };

      mockadapter.onGet('/api/personen-frontend').replyOnce(200, mockPersonsResponse);

      const personIds: string[] = mockPersons.map((person: PersonendatensatzResponse) => person.person.id);
      mockadapter.onPost('/api/dbiam/personenuebersicht', { personIds }).replyOnce(500, 'Some error occurred');

      const getAllPersonsPromise: Promise<void> = personStore.getAllPersons({});
      expect(personStore.loading).toBe(true);
      await getAllPersonsPromise;
      expect(personStore.loading).toBe(false);
      expect(personStore.errorCode).toEqual('UNSPECIFIED_ERROR');
    });

    it('should handle error code in response', async () => {
      const mockPersons: PersonendatensatzResponse[] = [
        DoFactory.getPersonendatensatzResponse(),
        DoFactory.getPersonendatensatzResponse(),
      ];

      // Mock response for persons
      const mockPersonsResponse: PersonFrontendControllerFindPersons200Response = {
        offset: 0,
        limit: 2,
        total: 2,
        items: mockPersons,
      };
      mockadapter.onGet('/api/personen-frontend').replyOnce(200, mockPersonsResponse, {});

      const personIds: Array<string> = mockPersons.map((person: PersonendatensatzResponse) => person.person.id);
      mockadapter
        .onPost('/api/dbiam/personenuebersicht', { personIds })
        .replyOnce(500, { code: 'some mock server error' });

      const getAllPersonsPromise: Promise<void> = personStore.getAllPersons({});
      expect(personStore.loading).toBe(true);
      await getAllPersonsPromise;
      expect(personStore.errorCode).toEqual('some mock server error');
      expect(personStore.loading).toBe(false);
    });

    it('should handle string error response', async () => {
      const mockPersons: PersonendatensatzResponse[] = [
        DoFactory.getPersonendatensatzResponse(),
        DoFactory.getPersonendatensatzResponse(),
      ];

      const mockPersonsResponse: PersonFrontendControllerFindPersons200Response = {
        offset: 0,
        limit: 2,
        total: 2,
        items: mockPersons,
      };

      mockadapter.onGet('/api/personen-frontend').replyOnce(200, mockPersonsResponse);

      const personIds: Array<string> = mockPersons.map((person: PersonendatensatzResponse) => person.person.id);
      mockadapter.onPost('/api/dbiam/personenuebersicht', { personIds }).replyOnce(500, 'some mock server error');

      const getAllPersonsPromise: Promise<void> = personStore.getAllPersons({});
      expect(personStore.loading).toBe(true);
      await getAllPersonsPromise;
      expect(personStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(personStore.loading).toBe(false);
    });
  });

  describe('getPersonById', () => {
    it('should load Person and update state', async () => {
      const dateOptions: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      };
      const mockPerson: Personendatensatz = getMockPersonendatensatz();
      const mockResponse: PersonendatensatzResponse = DoFactory.getPersonendatensatzResponse(mockPerson.person);

      mockadapter.onGet('/api/personen/1234').replyOnce(200, mockResponse);
      const getPersonByIdPromise: Promise<void> = personStore.getPersonById('1234');
      expect(personStore.loading).toBe(true);
      await getPersonByIdPromise;
      (
        mockPerson.person.userLock as Array<{
          lock_occasion: string;
          locked_by: string;
          locked_until: string;
          created_at: string;
        }>
      ).forEach((lock) => {
        const lockDate = new Date(lock.locked_until);
        // Adjust date for MESZ (German summer time) if necessary
        if (lockDate.getTimezoneOffset() >= -120) {
          lockDate.setDate(lockDate.getDate() - 1);
        }
        const createdAt = new Date(lock.created_at);
        lock.locked_until = lockDate.toLocaleDateString('de-DE', dateOptions);
        lock.created_at = createdAt.toLocaleDateString('de-DE', dateOptions);
      });
      expect(personStore.currentPerson?.person.userLock).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            lock_occasion: PersonLockOccasion.MANUELL_GESPERRT,
            locked_by: mockPerson.person.userLock?.[0]?.locked_by,
            locked_until: mockPerson.person.userLock?.[0]?.locked_until,
            created_at: mockPerson.person.userLock?.[0]?.created_at,
          }),
          expect.objectContaining({
            lock_occasion: PersonLockOccasion.KOPERS_GESPERRT,
          }),
        ]),
      );
      expect(personStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onGet('/api/personen/2345').replyOnce(500, 'some mock server error');
      const getPersonByIdPromise: Promise<void> = personStore.getPersonById('2345');
      expect(personStore.loading).toBe(true);
      await getPersonByIdPromise;
      expect(personStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(personStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onGet('/api/personen/2345').replyOnce(500, { code: 'some mock server error' });
      const getPersonByIdPromise: Promise<void> = personStore.getPersonById('2345');
      expect(personStore.loading).toBe(true);
      await getPersonByIdPromise;
      expect(personStore.errorCode).toEqual('some mock server error');
      expect(personStore.loading).toBe(false);
    });
  });

  describe('resetPassword', () => {
    it('should reset and return password', async () => {
      const userId: string = '2345';
      const mockResponse: string = 'fakePassword';

      mockadapter.onPatch(`/api/personen/${userId}/password`).replyOnce(200, mockResponse);
      const resetPasswordPromise: Promise<void> = personStore.resetPassword(userId);
      expect(personStore.loading).toBe(true);
      await resetPasswordPromise;
      expect(personStore.newPassword).toEqual(mockResponse);
      expect(personStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      const userId: string = '2345';

      mockadapter.onPatch(`/api/personen/${userId}/password`).replyOnce(500, 'some error');
      const resetPasswordPromise: Promise<void> = personStore.resetPassword(userId);
      expect(personStore.loading).toBe(true);
      await resetPasswordPromise;
      expect(personStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(personStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      const userId: string = '2345';

      mockadapter.onPatch(`/api/personen/${userId}/password`).replyOnce(500, { code: 'some mock server error' });
      const resetPasswordPromise: Promise<void> = personStore.resetPassword(userId);
      expect(personStore.loading).toBe(true);
      await resetPasswordPromise;
      expect(personStore.errorCode).toEqual('some mock server error');
      expect(personStore.loading).toBe(false);
    });
  });

  describe('resetDevicePassword', () => {
    it('should reset and return device password when given a personId', async () => {
      const userId: string = '2345';
      const mockResponse: string = 'fakePassword';

      mockadapter.onPatch(`/api/personen/${userId}/uem-password`).replyOnce(202, mockResponse);
      const resetDevicePasswordPromise: Promise<void> = personStore.resetDevicePassword(userId);
      expect(personStore.loading).toBe(true);
      await resetDevicePasswordPromise;
      expect(personStore.newDevicePassword).toEqual(mockResponse);
      expect(personStore.loading).toBe(false);
    });

    it('should reset and return device password without a personId', async () => {
      const mockResponse: string = 'fakePassword';

      mockadapter.onPatch(`/api/personen/uem-password`).replyOnce(202, mockResponse);
      const resetDevicePasswordPromise: Promise<void> = personStore.resetDevicePassword();
      expect(personStore.loading).toBe(true);
      await resetDevicePasswordPromise;
      expect(personStore.newDevicePassword).toEqual(mockResponse);
      expect(personStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      const userId: string = '2345';

      mockadapter.onPatch(`/api/personen/${userId}/uem-password`).replyOnce(500, 'some error');
      const resetDevicePasswordPromise: Promise<void> = personStore.resetDevicePassword(userId);
      expect(personStore.loading).toBe(true);
      await resetDevicePasswordPromise;
      expect(personStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(personStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      const userId: string = '2345';

      mockadapter.onPatch(`/api/personen/${userId}/uem-password`).replyOnce(500, { i18nKey: 'SOME_MOCK_ERROR' });
      const resetDevicePasswordPromise: Promise<void> = personStore.resetDevicePassword(userId);
      expect(personStore.loading).toBe(true);
      await resetDevicePasswordPromise;
      expect(personStore.errorCode).toEqual('SOME_MOCK_ERROR');
      expect(personStore.loading).toBe(false);
    });
  });

  describe('deletePersonById', () => {
    it('should delete a person and update state', async () => {
      const personId: string = '1234';

      mockadapter.onDelete(`/api/personen/${personId}`).replyOnce(204);

      await personStore.deletePersonById(personId);

      expect(personStore.loading).toBe(false);
      expect(personStore.errorCode).toEqual('');
    });

    it('should handle string error', async () => {
      const personId: string = '1234';

      mockadapter.onDelete(`/api/personen/${personId}`).replyOnce(500, 'some error');

      await personStore.deletePersonById(personId);

      expect(personStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(personStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      const personId: string = '1234';

      mockadapter.onDelete(`/api/personen/${personId}`).replyOnce(500, { code: 'some mock server error' });

      await personStore.deletePersonById(personId);

      expect(personStore.errorCode).toEqual('some mock server error');
      expect(personStore.loading).toBe(false);
    });
  });

  describe('getPersonenuebersichtById', () => {
    it('should get Personenuebersicht', async () => {
      const mockResponse: DBiamPersonenuebersichtResponse = DoFactory.getDBiamPersonenuebersichtResponse();

      mockadapter.onGet(`/api/dbiam/personenuebersicht/${mockResponse.personId}`).replyOnce(200, mockResponse);
      const getPersonenuebersichtByIdPromise: Promise<void> = personStore.getPersonenuebersichtById(
        mockResponse.personId,
      );
      expect(personStore.loading).toBe(true);
      await getPersonenuebersichtByIdPromise;
      expect(personStore.personenuebersicht).toEqual(PersonenUebersicht.fromResponse(mockResponse));
      expect(personStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onGet('/api/dbiam/personenuebersicht/1').replyOnce(500, 'some error');
      const getPersonenuebersichtByIdPromise: Promise<void> = personStore.getPersonenuebersichtById('1');
      expect(personStore.loading).toBe(true);
      await getPersonenuebersichtByIdPromise;
      expect(personStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(personStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onGet('/api/dbiam/personenuebersicht/1').replyOnce(500, { code: 'some mock server error' });
      const getPersonenuebersichtByIdPromise: Promise<void> = personStore.getPersonenuebersichtById('1');
      expect(personStore.loading).toBe(true);
      await getPersonenuebersichtByIdPromise;
      expect(personStore.errorCode).toEqual('some mock server error');
      expect(personStore.loading).toBe(false);
    });
  });

  describe('lockPerson', () => {
    it('should lock the person and update state', async () => {
      const mockPerson: PersonendatensatzResponse = DoFactory.getPersonendatensatzResponse();
      const mockResponse: PersonLockResponse = {
        message: 'User has been successfully locked.',
      };

      mockadapter.onPut(`/api/personen/${mockPerson.person.id}/lock-user`).replyOnce(200, mockResponse);
      mockadapter.onGet(`/api/personen/${mockPerson.person.id}`).replyOnce(200, mockPerson);

      const lockUserBodyParams: LockUserBodyParams = getUserLockBodyParams(true);
      const lockPersonPromise: Promise<void> = personStore.lockPerson(mockPerson.person.id, lockUserBodyParams);
      expect(personStore.loading).toBe(true);
      await expect(lockPersonPromise).resolves.toBeUndefined();
      await lockPersonPromise;
      expect(personStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      const personId: string = '1234';

      mockadapter.onPut(`/api/personen/${personId}/lock-user`).replyOnce(500, 'some mock server error');
      const lockUserBodyParams: LockUserBodyParams = getUserLockBodyParams(true);
      const lockPersonPromise: Promise<void> = personStore.lockPerson(personId, lockUserBodyParams);
      expect(personStore.loading).toBe(true);
      await lockPersonPromise;
      expect(personStore.loading).toBe(false);
      expect(personStore.errorCode).toBe('UNSPECIFIED_ERROR');
    });

    it('should handle error code', async () => {
      const personId: string = '1234';

      mockadapter.onPut(`/api/personen/${personId}/lock-user`).replyOnce(500, { code: 'LOCK_FAILED_ERROR' });
      const lockUserBodyParams: LockUserBodyParams = getUserLockBodyParams(true);
      const lockPersonPromise: Promise<void> = personStore.lockPerson(personId, lockUserBodyParams);
      expect(personStore.loading).toBe(true);
      await lockPersonPromise;
      expect(personStore.loading).toBe(false);
      expect(personStore.errorCode).toEqual('LOCK_FAILED_ERROR');
    });
  });

  describe('syncPersonById', () => {
    it('should sync a person', async () => {
      const personId: string = '1234';

      mockadapter.onPost(`/api/personen/${personId}/sync`).replyOnce(200);

      await personStore.syncPersonById(personId);

      expect(personStore.loading).toBe(false);
      expect(personStore.errorCode).toEqual('');
    });

    it('should handle string error', async () => {
      const personId: string = '1234';

      mockadapter.onPost(`/api/personen/${personId}/sync`).replyOnce(500, 'some error');

      await personStore.syncPersonById(personId);

      expect(personStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(personStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      const personId: string = '1234';

      mockadapter.onPost(`/api/personen/${personId}/sync`).replyOnce(500, { code: 'some mock server error' });

      await personStore.syncPersonById(personId);

      expect(personStore.errorCode).toEqual('some mock server error');
      expect(personStore.loading).toBe(false);
    });
  });

  describe('resetState', () => {
    it('should reset state', () => {
      personStore.errorCode = 'some error';
      personStore.loading = true;
      personStore.totalPersons = 1;
      personStore.currentPerson = DoFactory.getPersonendatensatz();
      personStore.resetState();
      expect(personStore.errorCode).toEqual('');
      expect(personStore.loading).toBe(false);
      expect(personStore.totalPersons).toBe(0);
      expect(personStore.currentPerson).toBe(null);
    });
  });

  describe('changePersonMetaDataById', () => {
    it('should update person metadata and set patchedPerson', async () => {
      const personId = '1234';
      const vorname = 'Samuel';
      const familienname = 'Vimes';
      const personalnummer = '9876';

      const mockCurrentPerson: Personendatensatz = {
        person: DoFactory.getPerson({
          id: personId,
          personalnummer: personalnummer,
        }),
      };

      personStore.currentPerson = mockCurrentPerson;

      const mockResponse: PersonendatensatzResponse = DoFactory.getPersonendatensatzResponse({
        ...mockCurrentPerson.person,
        id: personId,
        name: {
          familienname,
          vorname,
        },
        personalnummer,
      });

      const expectedBodyParams: PersonMetadataBodyParams = {
        vorname,
        familienname,
        personalnummer,
        revision: mockCurrentPerson.person.revision,
        lastModified: mockCurrentPerson.person.lastModified,
      };

      mockadapter.onPatch(`/api/personen/${personId}/metadata`).reply((config) => {
        expect(JSON.parse(config.data as string)).toEqual(expectedBodyParams);
        return [200, mockResponse];
      });

      await personStore.changePersonMetadataById(personId, vorname, familienname, personalnummer);

      expect(personStore.loading).toBe(false);
      expect(personStore.patchedPerson).toEqual(mockResponse);
      expect(personStore.errorCode).toEqual('');
    });

    it('should handle error and set errorCode', async () => {
      const personId: string = '1234';
      const vorname: string = 'Samuel';
      const familienname: string = 'Vimes';

      mockadapter.onPatch(`/api/personen/${personId}/metadata`).reply(500, { i18nKey: 'ERROR_UPDATING_USER' });

      await personStore.changePersonMetadataById(personId, vorname, familienname);

      expect(personStore.loading).toBe(false);
      expect(personStore.errorCode).toEqual('ERROR_UPDATING_USER');
    });

    it('should handle unknown error', async () => {
      const personId: string = '1234';
      const vorname: string = 'Samuel';
      const familienname: string = 'Vimes';

      mockadapter.onPatch(`/api/personen/${personId}/metadata`).reply(500, 'Unknown error');

      await personStore.changePersonMetadataById(personId, vorname, familienname);

      expect(personStore.loading).toBe(false);
      expect(personStore.errorCode).toEqual('ERROR_LOADING_USER');
    });
  });

  describe('getLandesbedienstetePerson', () => {
    it('should load Landesbedienstete persons and update state', async () => {
      const mockLandesbedienstetePersonen: PersonLandesbediensteterSearchResponse[] = [
        DoFactory.getPersonLandesbediensteterSearchResponse(),
        DoFactory.getPersonLandesbediensteterSearchResponse(),
      ];

      const filter = {
        personalnummer: '12345',
      };

      mockadapter
        .onGet('/api/personen/landesbediensteter?personalnummer=12345')
        .replyOnce(200, mockLandesbedienstetePersonen);

      const getLandesbedienstetePersonPromise: Promise<void> = personStore.getLandesbedienstetePerson(filter);
      expect(personStore.loading).toBe(true);
      await getLandesbedienstetePersonPromise;
      expect(personStore.loading).toBe(false);
      expect(personStore.allLandesbedienstetePersonen).toEqual(mockLandesbedienstetePersonen);
      expect(personStore.errorCode).toEqual('');
    });

    it('should handle string error', async () => {
      mockadapter.onGet('/api/personen/landesbediensteter').replyOnce(500, 'some mock server error');

      const getLandesbedienstetePersonPromise: Promise<void> = personStore.getLandesbedienstetePerson();
      expect(personStore.loading).toBe(true);
      await getLandesbedienstetePersonPromise;
      expect(personStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(personStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onGet('/api/personen/landesbediensteter').replyOnce(500, { code: 'some mock server error' });

      const getLandesbedienstetePersonPromise: Promise<void> = personStore.getLandesbedienstetePerson();
      expect(personStore.loading).toBe(true);
      await getLandesbedienstetePersonPromise;
      expect(personStore.errorCode).toEqual('some mock server error');
      expect(personStore.loading).toBe(false);
    });
  });
});
