import type { DBiamPersonenkontextResponse } from '@/api-client/generated';
import axiosApiInstance from '@/services/ApiService';
import MockAdapter from 'axios-mock-adapter';
import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import type { Organisation } from './OrganisationStore';
import {
  mapZuordnungToPersonenkontextUpdate,
  OperationContext,
  usePersonenkontextStore,
  type PersonenkontexteUpdateResponse,
  type PersonenkontextStore,
  type PersonenkontextUpdate,
  type PersonenkontextWorkflowResponse,
  type WorkflowFilter,
} from './PersonenkontextStore';
import { usePersonStore, type PersonendatensatzResponse, type PersonStore } from './PersonStore';
import { PersonenUebersicht } from './types/PersonenUebersicht';
import type { Zuordnung } from './types/Zuordnung';

const mockadapter: MockAdapter = new MockAdapter(axiosApiInstance);

describe('PersonenkontextStore', () => {
  let personenkontextStore: PersonenkontextStore;
  let personStore: PersonStore;

  const mockPersonId: string = '1';
  const mockSchule: Organisation = DoFactory.getSchule();
  const mockSchuleZuordnung: Zuordnung = DoFactory.getZuordnung({}, { organisation: mockSchule });
  const person: PersonenUebersicht = new PersonenUebersicht(
    mockPersonId,
    'John',
    'Doe',
    'jdoe',
    '2024-03-24T16:35:32.711Z',
    [mockSchuleZuordnung],
  );

  beforeEach(() => {
    setActivePinia(createPinia());
    personenkontextStore = usePersonenkontextStore();
    personStore = usePersonStore();
    personenkontextStore.$reset();
    personStore.$reset();
    mockadapter.reset();
    vi.restoreAllMocks();

    personStore.personenuebersicht = person;
  });

  it('should initalize state correctly', () => {
    expect(personenkontextStore.errorCode).toEqual('');
    expect(personenkontextStore.loading).toBe(false);
    expect(personenkontextStore.workflowStepResponse).toBeNull();
    expect(personenkontextStore.updatedPersonenkontexte).toBeNull();
    expect(personenkontextStore.createdPersonWithKontext).toBeNull();
    expect(personenkontextStore.totalFilteredRollen).toBe(0);
    expect(personenkontextStore.totalPaginatedRollen).toBe(0);
  });

  describe('mapZuordnungToPersonenkontextUpdate', () => {
    describe('when the Zuordnung has a Befristung', () => {
      it('should preserve the Befristung', () => {
        const zuordnung: Zuordnung = DoFactory.getZuordnung();

        expect(mapZuordnungToPersonenkontextUpdate(zuordnung)).toEqual({
          organisationId: zuordnung.sskId,
          rolleId: zuordnung.rolleId,
          befristung: zuordnung.befristung,
        });
      });
    });

    describe('when the Zuordnung has no Befristung', () => {
      it('should map null to undefined', () => {
        const zuordnung: Zuordnung = DoFactory.getZuordnung();
        zuordnung.befristung = null;

        expect(mapZuordnungToPersonenkontextUpdate(zuordnung)).toEqual({
          organisationId: zuordnung.sskId,
          rolleId: zuordnung.rolleId,
          befristung: undefined,
        });
      });
    });
  });

  describe('processWorkflowStep', () => {
    const getUrl = (filter: WorkflowFilter): string => {
      const { operationContext, organisationId, rollenIds, organisationName, limit }: WorkflowFilter = filter;
      let url: string = `/api/personenkontext-workflow/step?operationContext=${operationContext}`;
      if (organisationId) {
        url += `&organisationId=${organisationId}`;
      }
      if (rollenIds) {
        rollenIds.forEach((rolleId: string) => (url += `&rollenIds=${rolleId}`));
      }
      if (organisationName) {
        url += `&organisationName=${organisationName}`;
      }
      if (limit) {
        url += `&limit=${limit}`;
      }
      return url;
    };

    describe('when operationContext is PERSON_ANLEGEN', () => {
      const operationContext: OperationContext = OperationContext.PERSON_ANLEGEN;
      const mockResponse: PersonenkontextWorkflowResponse = DoFactory.getPersonenkontextWorkflowResponse();

      it('should get step', async () => {
        mockadapter.onGet(getUrl({ operationContext })).replyOnce(200, mockResponse);
        const promise: Promise<void> = personenkontextStore.processWorkflowStep({ operationContext });
        expect(personenkontextStore.loading).toBe(true);
        await promise;
        expect(personenkontextStore.workflowStepResponse).toEqual(mockResponse);
        expect(personenkontextStore.loading).toBe(false);
      });

      it('should get step with parameters', async () => {
        mockadapter
          .onGet(getUrl({ operationContext, organisationId: '1', rollenIds: ['1'] }))
          .replyOnce(200, mockResponse);
        const promise: Promise<void> = personenkontextStore.processWorkflowStep({
          operationContext,
          organisationId: '1',
          rollenIds: ['1'],
        });
        expect(personenkontextStore.loading).toBe(true);
        await promise;
        expect(personenkontextStore.workflowStepResponse).toEqual(mockResponse);
        expect(personenkontextStore.loading).toBe(false);
      });

      it('should handle string error', async () => {
        mockadapter.onGet(getUrl({ operationContext })).replyOnce(500, 'some error');
        const promise: Promise<void> = personenkontextStore.processWorkflowStep({ operationContext });
        expect(personenkontextStore.loading).toBe(true);
        await promise;
        expect(personenkontextStore.errorCode).toEqual('UNSPECIFIED_ERROR');
        expect(personenkontextStore.loading).toBe(false);
      });

      it('should handle error code', async () => {
        mockadapter.onGet(getUrl({ operationContext })).replyOnce(500, { code: 'some mock server error' });
        const promise: Promise<void> = personenkontextStore.processWorkflowStep({ operationContext });
        expect(personenkontextStore.loading).toBe(true);
        await promise;
        expect(personenkontextStore.errorCode).toEqual('some mock server error');
        expect(personenkontextStore.loading).toBe(false);
      });
    });

    describe('when operationContext is PERSON_BEARBEITEN', () => {
      const operationContext: OperationContext = OperationContext.PERSON_BEARBEITEN;
      const mockResponse: PersonenkontextWorkflowResponse = DoFactory.getPersonenkontextWorkflowResponse();

      it('should get step', async () => {
        mockadapter.onGet(getUrl({ operationContext })).replyOnce(200, mockResponse);
        const promise: Promise<void> = personenkontextStore.processWorkflowStep({ operationContext });
        expect(personenkontextStore.loading).toBe(true);
        await promise;
        expect(personenkontextStore.workflowStepResponse).toEqual(mockResponse);
        expect(personenkontextStore.loading).toBe(false);
      });

      it('should get step with parameters', async () => {
        mockadapter
          .onGet(getUrl({ operationContext, organisationId: '1', rollenIds: ['1'] }))
          .replyOnce(200, mockResponse);
        const promise: Promise<void> = personenkontextStore.processWorkflowStep({
          operationContext,
          organisationId: '1',
          rollenIds: ['1'],
        });
        expect(personenkontextStore.loading).toBe(true);
        await promise;
        expect(personenkontextStore.workflowStepResponse).toEqual(mockResponse);
        expect(personenkontextStore.loading).toBe(false);
      });

      it('should handle string error', async () => {
        mockadapter.onGet(getUrl({ operationContext })).replyOnce(500, 'some error');
        const promise: Promise<void> = personenkontextStore.processWorkflowStep({ operationContext });
        expect(personenkontextStore.loading).toBe(true);
        await promise;
        expect(personenkontextStore.errorCode).toEqual('UNSPECIFIED_ERROR');
        expect(personenkontextStore.loading).toBe(false);
      });

      it('should handle error code', async () => {
        mockadapter.onGet(getUrl({ operationContext })).replyOnce(500, { code: 'some mock server error' });
        const promise: Promise<void> = personenkontextStore.processWorkflowStep({ operationContext });
        expect(personenkontextStore.loading).toBe(true);
        await promise;
        expect(personenkontextStore.errorCode).toEqual('some mock server error');
        expect(personenkontextStore.loading).toBe(false);
      });
    });
  });

  describe('updatePersonenkontexte', () => {
    const mockZuordnungUpdates: PersonenkontextUpdate[] = [
      {
        organisationId: '67890',
        rolleId: '54321',
      },
    ];

    it('should update Personenkontexte', async () => {
      const mockResponse: PersonenkontexteUpdateResponse = {
        dBiamPersonenkontextResponses: [
          {
            personId: '1',
            organisationId: '67890',
            rolleId: '54321',
          } as DBiamPersonenkontextResponse,
        ],
      };

      mockadapter.onPut('/api/personenkontexte/person/1').replyOnce(200, mockResponse);

      const updatePersonenkontextePromise: Promise<void> = personenkontextStore.updatePersonenkontexte(
        mockZuordnungUpdates,
        '1',
      );
      expect(personenkontextStore.loading).toBe(true);
      await updatePersonenkontextePromise;
      expect(personenkontextStore.updatedPersonenkontexte).toEqual(mockResponse);
      expect(personenkontextStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onPut('/api/personenkontexte/person/1').replyOnce(500, 'some error');
      const updatePersonenkontextePromise: Promise<void> = personenkontextStore.updatePersonenkontexte(
        mockZuordnungUpdates,
        '1',
      );
      expect(personenkontextStore.loading).toBe(true);
      await updatePersonenkontextePromise;
      expect(personenkontextStore.errorCode).toEqual('PERSONENKONTEXTE_UPDATE_ERROR');
      expect(personenkontextStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onPut('/api/personenkontexte/person/1').replyOnce(500, { i18nKey: 'SOME_MOCK_SERVER_ERROR' });
      const updatePersonenkontextePromise: Promise<void> = personenkontextStore.updatePersonenkontexte(
        mockZuordnungUpdates,
        '1',
      );
      expect(personenkontextStore.loading).toBe(true);
      await updatePersonenkontextePromise;
      expect(personenkontextStore.errorCode).toEqual('SOME_MOCK_SERVER_ERROR');
      expect(personenkontextStore.loading).toBe(false);
    });
  });

  describe('updatePersonenkontexte request handling', () => {
    describe('without a personalnummer', () => {
      it('should call the assignment editing endpoint and clear previous errors', async () => {
        const updates: PersonenkontextUpdate[] = [mapZuordnungToPersonenkontextUpdate(DoFactory.getZuordnung())];
        const mockResponse: PersonenkontexteUpdateResponse = DoFactory.getPersonenkontextUpdateResponse({
          dBiamPersonenkontextResponses: [
            DoFactory.getDBiamPersonenkontextResponse({ personId: mockPersonId, ...updates[0] }),
          ],
        });
        mockadapter.onPut(`/api/personenkontexte/person/${mockPersonId}`).replyOnce(200, mockResponse);
        personenkontextStore.errorCode = 'PREVIOUS_ERROR';

        const promise: Promise<void> = personenkontextStore.updatePersonenkontexte(updates, mockPersonId);
        expect(personenkontextStore.loading).toBe(true);
        expect(personenkontextStore.errorCode).toBe('');
        await promise;

        expect(personenkontextStore.updatedPersonenkontexte).toEqual(mockResponse);
        expect(personenkontextStore.loading).toBe(false);
        expect(mockadapter.history.put).toHaveLength(1);
        const requestBody: unknown = JSON.parse(String(mockadapter.history.put[0]?.data));
        expect(requestBody).toEqual({
          lastModified: person.lastModifiedZuordnungen,
          count: person.zuordnungen.length,
          personenkontexte: updates,
        });
      });
    });

    describe('with a personalnummer', () => {
      it('should forward the personalnummer as a query parameter', async () => {
        const updates: PersonenkontextUpdate[] = [mapZuordnungToPersonenkontextUpdate(DoFactory.getZuordnung())];
        const mockResponse: PersonenkontexteUpdateResponse = DoFactory.getPersonenkontextUpdateResponse({
          dBiamPersonenkontextResponses: [
            DoFactory.getDBiamPersonenkontextResponse({ personId: mockPersonId, ...updates[0] }),
          ],
        });
        mockadapter
          .onPut(`/api/personenkontexte/person/${mockPersonId}?personalnummer=1234567`)
          .replyOnce(200, mockResponse);
        personenkontextStore.errorCode = 'PREVIOUS_ERROR';

        const promise: Promise<void> = personenkontextStore.updatePersonenkontexte(updates, mockPersonId, '1234567');
        expect(personenkontextStore.loading).toBe(true);
        expect(personenkontextStore.errorCode).toBe('');
        await promise;

        expect(personenkontextStore.updatedPersonenkontexte).toEqual(mockResponse);
        expect(personenkontextStore.loading).toBe(false);
        expect(mockadapter.history.put).toHaveLength(1);
        const requestBody: unknown = JSON.parse(String(mockadapter.history.put[0]?.data));
        expect(requestBody).toEqual({
          lastModified: person.lastModifiedZuordnungen,
          count: person.zuordnungen.length,
          personenkontexte: updates,
        });
      });
    });

    describe('without a Personenuebersicht or updates', () => {
      it('should commit an empty context list without a modification timestamp', async () => {
        personStore.personenuebersicht = null;
        const mockResponse: PersonenkontexteUpdateResponse = DoFactory.getPersonenkontextUpdateResponse({
          dBiamPersonenkontextResponses: [],
        });
        mockadapter.onPut(`/api/personenkontexte/person/${mockPersonId}`).replyOnce(200, mockResponse);

        const promise: Promise<void> = personenkontextStore.updatePersonenkontexte(undefined, mockPersonId);
        expect(personenkontextStore.loading).toBe(true);
        await promise;

        expect(personenkontextStore.updatedPersonenkontexte).toEqual(mockResponse);
        expect(personenkontextStore.loading).toBe(false);
        const requestBody: unknown = JSON.parse(String(mockadapter.history.put[0]?.data));
        expect(requestBody).toEqual({
          count: 0,
          personenkontexte: [],
        });
      });
    });

    describe('with a null lastModifiedZuordnungen', () => {
      it('should omit the modification timestamp from the request', async () => {
        const personenuebersicht: PersonenUebersicht = DoFactory.getPersonenUebersicht(
          DoFactory.getPerson({ id: mockPersonId }),
          [],
        );
        personenuebersicht.lastModifiedZuordnungen = null;
        personStore.personenuebersicht = personenuebersicht;
        const mockResponse: PersonenkontexteUpdateResponse = DoFactory.getPersonenkontextUpdateResponse({
          dBiamPersonenkontextResponses: [],
        });
        mockadapter.onPut(`/api/personenkontexte/person/${mockPersonId}`).replyOnce(200, mockResponse);

        const promise: Promise<void> = personenkontextStore.updatePersonenkontexte([], mockPersonId);
        expect(personenkontextStore.loading).toBe(true);
        await promise;

        expect(personenkontextStore.updatedPersonenkontexte).toEqual(mockResponse);
        expect(personenkontextStore.loading).toBe(false);
        const requestBody: unknown = JSON.parse(String(mockadapter.history.put[0]?.data));
        expect(requestBody).toEqual({
          count: 0,
          personenkontexte: [],
        });
      });
    });

    describe('when the server returns a string error', () => {
      it('should replace the previous error with the fallback code', async () => {
        mockadapter.onPut(`/api/personenkontexte/person/${mockPersonId}`).replyOnce(500, 'some error');
        personenkontextStore.errorCode = 'PREVIOUS_ERROR';

        const promise: Promise<void> = personenkontextStore.updatePersonenkontexte([], mockPersonId);
        expect(personenkontextStore.loading).toBe(true);
        expect(personenkontextStore.errorCode).toBe('');
        await promise;

        expect(personenkontextStore.errorCode).toBe('PERSONENKONTEXTE_UPDATE_ERROR');
        expect(personenkontextStore.updatedPersonenkontexte).toBeNull();
        expect(personenkontextStore.loading).toBe(false);
      });
    });

    describe('when the server returns an error code', () => {
      it('should replace the previous error with the server code', async () => {
        mockadapter
          .onPut(`/api/personenkontexte/person/${mockPersonId}`)
          .replyOnce(500, { i18nKey: 'SOME_MOCK_SERVER_ERROR' });
        personenkontextStore.errorCode = 'PREVIOUS_ERROR';

        const promise: Promise<void> = personenkontextStore.updatePersonenkontexte([], mockPersonId);
        expect(personenkontextStore.loading).toBe(true);
        expect(personenkontextStore.errorCode).toBe('');
        await promise;

        expect(personenkontextStore.errorCode).toBe('SOME_MOCK_SERVER_ERROR');
        expect(personenkontextStore.updatedPersonenkontexte).toBeNull();
        expect(personenkontextStore.loading).toBe(false);
      });
    });
  });

  describe('zuordnenLandesbedienstete', () => {
    describe('without a personalnummer', () => {
      it('should call the Landesbedienstete endpoint and clear previous errors', async () => {
        const updates: PersonenkontextUpdate[] = [mapZuordnungToPersonenkontextUpdate(DoFactory.getZuordnung())];
        const mockResponse: PersonenkontexteUpdateResponse = DoFactory.getPersonenkontextUpdateResponse({
          dBiamPersonenkontextResponses: [
            DoFactory.getDBiamPersonenkontextResponse({ personId: mockPersonId, ...updates[0] }),
          ],
        });
        mockadapter
          .onPost(`/api/personenkontexte/person/${mockPersonId}/landesbedienstetenzuordnungen`)
          .replyOnce(200, mockResponse);
        personenkontextStore.errorCode = 'PREVIOUS_ERROR';

        const promise: Promise<void> = personenkontextStore.zuordnenLandesbedienstete(updates, mockPersonId);
        expect(personenkontextStore.loading).toBe(true);
        expect(personenkontextStore.errorCode).toBe('');
        await promise;

        expect(personenkontextStore.updatedPersonenkontexte).toEqual(mockResponse);
        expect(personenkontextStore.loading).toBe(false);
        expect(mockadapter.history.post).toHaveLength(1);
        const requestBody: unknown = JSON.parse(String(mockadapter.history.post[0]?.data));
        expect(requestBody).toEqual({
          lastModified: person.lastModifiedZuordnungen,
          count: person.zuordnungen.length,
          personenkontexte: updates,
        });
      });
    });

    describe('with a personalnummer', () => {
      it('should forward the personalnummer as a query parameter', async () => {
        const updates: PersonenkontextUpdate[] = [mapZuordnungToPersonenkontextUpdate(DoFactory.getZuordnung())];
        const mockResponse: PersonenkontexteUpdateResponse = DoFactory.getPersonenkontextUpdateResponse({
          dBiamPersonenkontextResponses: [
            DoFactory.getDBiamPersonenkontextResponse({ personId: mockPersonId, ...updates[0] }),
          ],
        });
        mockadapter
          .onPost(`/api/personenkontexte/person/${mockPersonId}/landesbedienstetenzuordnungen?personalnummer=1234567`)
          .replyOnce(200, mockResponse);
        personenkontextStore.errorCode = 'PREVIOUS_ERROR';

        const promise: Promise<void> = personenkontextStore.zuordnenLandesbedienstete(updates, mockPersonId, '1234567');
        expect(personenkontextStore.loading).toBe(true);
        expect(personenkontextStore.errorCode).toBe('');
        await promise;

        expect(personenkontextStore.updatedPersonenkontexte).toEqual(mockResponse);
        expect(personenkontextStore.loading).toBe(false);
        expect(mockadapter.history.post).toHaveLength(1);
        const requestBody: unknown = JSON.parse(String(mockadapter.history.post[0]?.data));
        expect(requestBody).toEqual({
          lastModified: person.lastModifiedZuordnungen,
          count: person.zuordnungen.length,
          personenkontexte: updates,
        });
      });
    });

    describe('without a Personenuebersicht or updates', () => {
      it('should commit an empty context list without a modification timestamp', async () => {
        personStore.personenuebersicht = null;
        const mockResponse: PersonenkontexteUpdateResponse = DoFactory.getPersonenkontextUpdateResponse({
          dBiamPersonenkontextResponses: [],
        });
        mockadapter
          .onPost(`/api/personenkontexte/person/${mockPersonId}/landesbedienstetenzuordnungen`)
          .replyOnce(200, mockResponse);

        const promise: Promise<void> = personenkontextStore.zuordnenLandesbedienstete(undefined, mockPersonId);
        expect(personenkontextStore.loading).toBe(true);
        await promise;

        expect(personenkontextStore.updatedPersonenkontexte).toEqual(mockResponse);
        expect(personenkontextStore.loading).toBe(false);
        const requestBody: unknown = JSON.parse(String(mockadapter.history.post[0]?.data));
        expect(requestBody).toEqual({
          count: 0,
          personenkontexte: [],
        });
      });
    });

    describe('with a null lastModifiedZuordnungen', () => {
      it('should omit the modification timestamp from the request', async () => {
        const personenuebersicht: PersonenUebersicht = DoFactory.getPersonenUebersicht(
          DoFactory.getPerson({ id: mockPersonId }),
          [],
        );
        personenuebersicht.lastModifiedZuordnungen = null;
        personStore.personenuebersicht = personenuebersicht;
        const mockResponse: PersonenkontexteUpdateResponse = DoFactory.getPersonenkontextUpdateResponse({
          dBiamPersonenkontextResponses: [],
        });
        mockadapter
          .onPost(`/api/personenkontexte/person/${mockPersonId}/landesbedienstetenzuordnungen`)
          .replyOnce(200, mockResponse);

        const promise: Promise<void> = personenkontextStore.zuordnenLandesbedienstete([], mockPersonId);
        expect(personenkontextStore.loading).toBe(true);
        await promise;

        expect(personenkontextStore.updatedPersonenkontexte).toEqual(mockResponse);
        expect(personenkontextStore.loading).toBe(false);
        const requestBody: unknown = JSON.parse(String(mockadapter.history.post[0]?.data));
        expect(requestBody).toEqual({
          count: 0,
          personenkontexte: [],
        });
      });
    });

    describe('when the server returns a string error', () => {
      it('should replace the previous error with the fallback code', async () => {
        mockadapter
          .onPost(`/api/personenkontexte/person/${mockPersonId}/landesbedienstetenzuordnungen`)
          .replyOnce(500, 'some error');
        personenkontextStore.errorCode = 'PREVIOUS_ERROR';

        const promise: Promise<void> = personenkontextStore.zuordnenLandesbedienstete([], mockPersonId);
        expect(personenkontextStore.loading).toBe(true);
        expect(personenkontextStore.errorCode).toBe('');
        await promise;

        expect(personenkontextStore.errorCode).toBe('PERSONENKONTEXTE_UPDATE_ERROR');
        expect(personenkontextStore.updatedPersonenkontexte).toBeNull();
        expect(personenkontextStore.loading).toBe(false);
      });
    });

    describe('when the server returns an error code', () => {
      it('should replace the previous error with the server code', async () => {
        mockadapter
          .onPost(`/api/personenkontexte/person/${mockPersonId}/landesbedienstetenzuordnungen`)
          .replyOnce(500, { i18nKey: 'SOME_MOCK_SERVER_ERROR' });
        personenkontextStore.errorCode = 'PREVIOUS_ERROR';

        const promise: Promise<void> = personenkontextStore.zuordnenLandesbedienstete([], mockPersonId);
        expect(personenkontextStore.loading).toBe(true);
        expect(personenkontextStore.errorCode).toBe('');
        await promise;

        expect(personenkontextStore.errorCode).toBe('SOME_MOCK_SERVER_ERROR');
        expect(personenkontextStore.updatedPersonenkontexte).toBeNull();
        expect(personenkontextStore.loading).toBe(false);
      });
    });
  });

  describe('createPersonWithKontexte', () => {
    it('should create a Person', async () => {
      const mockPerson: PersonendatensatzResponse = {
        person: {
          id: '9876',
          name: {
            familienname: 'Cena',
            vorname: 'Randy',
          },
          username: 'rcena',
        },
      } as PersonendatensatzResponse;

      const mockResponse: PersonendatensatzResponse = mockPerson;

      mockadapter.onPost('/api/personenkontext-workflow').replyOnce(201, mockResponse);
      const createPersonPromise: Promise<void> = personenkontextStore.createPersonWithKontexte({
        familienname: 'Cena',
        vorname: 'Randy',
        createPersonenkontexte: [
          {
            organisationId: '1234',
            rolleId: '5678',
          },
        ],
      });
      expect(personenkontextStore.loading).toBe(true);
      await createPersonPromise;
      expect(personenkontextStore.createdPersonWithKontext).toEqual(mockPerson);
      expect(personenkontextStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onPost('/api/personenkontext-workflow').replyOnce(500, 'some error');
      const createPersonPromise: Promise<void> = personenkontextStore.createPersonWithKontexte({
        familienname: 'Copeland',
        vorname: 'Christian',
        createPersonenkontexte: [
          {
            organisationId: '',
            rolleId: '5678',
          },
        ],
      });
      expect(personenkontextStore.loading).toBe(true);
      await createPersonPromise;
      expect(personenkontextStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(personenkontextStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onPost('/api/personenkontext-workflow').replyOnce(500, { i18nKey: 'SOME_MOCK_SERVER_ERROR' });
      const createPersonPromise: Promise<void> = personenkontextStore.createPersonWithKontexte({
        familienname: 'Copeland',
        vorname: 'Christian',
        createPersonenkontexte: [
          {
            organisationId: '1234',
            rolleId: '',
          },
        ],
      });
      expect(personenkontextStore.loading).toBe(true);
      await createPersonPromise;
      expect(personenkontextStore.errorCode).toEqual('SOME_MOCK_SERVER_ERROR');
      expect(personenkontextStore.loading).toBe(false);
    });
  });
});
