import { OrganisationsTyp, type DBiamPersonenkontextResponse } from '@/api-client/generated';
import axiosApiInstance from '@/services/ApiService';
import MockAdapter from 'axios-mock-adapter';
import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import type { Organisation } from './OrganisationStore';
import {
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
    mockadapter.reset();

    personStore.personenuebersicht = person;
  });

  it('should initalize state correctly', () => {
    expect(personenkontextStore.errorCode).toEqual('');
    expect(personenkontextStore.loading).toBe(false);
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

    describe.each([[OperationContext.PERSON_ANLEGEN], [OperationContext.PERSON_BEARBEITEN]])(
      'when operationContext is %s',
      (operationContext: OperationContext) => {
        const mockResponse: PersonenkontextWorkflowResponse = {
          organisations: [
            {
              id: '1',
              administriertVon: 'string',
              kennung: 'string',
              name: 'string',
              namensergaenzung: 'string',
              kuerzel: 'string',
              typ: OrganisationsTyp.Schule,
            },
          ],
          selectedOrganisation: '1',
          selectedRollen: ['1'],
          canCommit: true,
        };
        it('should get step', async () => {
          mockadapter.onGet(getUrl({ operationContext })).replyOnce(200, mockResponse);
          const getPersonenkontextWorkFlowStep: Promise<void> = personenkontextStore.processWorkflowStep({
            operationContext,
          });
          expect(personenkontextStore.loading).toBe(true);
          await getPersonenkontextWorkFlowStep;
          expect(personenkontextStore.workflowStepResponse).toEqual(mockResponse);
          expect(personenkontextStore.loading).toBe(false);
        });

        it('should get step with parameters', async () => {
          mockadapter
            .onGet(getUrl({ operationContext, organisationId: '1', rollenIds: ['1'] }))
            .replyOnce(200, mockResponse);
          const getPersonenkontextWorkFlowStep: Promise<void> = personenkontextStore.processWorkflowStep({
            operationContext,
            organisationId: '1',
            rollenIds: ['1'],
          });
          expect(personenkontextStore.loading).toBe(true);
          await getPersonenkontextWorkFlowStep;
          expect(personenkontextStore.workflowStepResponse).toEqual(mockResponse);
          expect(personenkontextStore.loading).toBe(false);
        });

        it('should handle string error', async () => {
          mockadapter.onGet(getUrl({ operationContext })).replyOnce(500, 'some error');
          const getPersonenkontextWorkFlowStep: Promise<void> = personenkontextStore.processWorkflowStep({
            operationContext,
          });
          expect(personenkontextStore.loading).toBe(true);
          await getPersonenkontextWorkFlowStep;
          expect(personenkontextStore.errorCode).toEqual('UNSPECIFIED_ERROR');
          expect(personenkontextStore.loading).toBe(false);
        });

        it('should handle error code', async () => {
          mockadapter.onGet(getUrl({ operationContext })).replyOnce(500, { code: 'some mock server error' });
          const getPersonenkontextWorkFlowStep: Promise<void> = personenkontextStore.processWorkflowStep({
            operationContext,
          });
          expect(personenkontextStore.loading).toBe(true);
          await getPersonenkontextWorkFlowStep;
          expect(personenkontextStore.errorCode).toEqual('some mock server error');
          expect(personenkontextStore.loading).toBe(false);
        });
      },
    );
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

      mockadapter.onPut('/api/personenkontext-workflow/1').replyOnce(200, mockResponse);

      const updatePersonenkontextePromise: Promise<void> = personenkontextStore.updatePersonenkontexte(
        mockZuordnungUpdates,
        '1',
        OperationContext.PERSON_BEARBEITEN,
      );
      expect(personenkontextStore.loading).toBe(true);
      await updatePersonenkontextePromise;
      expect(personenkontextStore.updatedPersonenkontexte).toEqual(mockResponse);
      expect(personenkontextStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onPut('/api/personenkontext-workflow/1').replyOnce(500, 'some error');
      const updatePersonenkontextePromise: Promise<void> = personenkontextStore.updatePersonenkontexte(
        mockZuordnungUpdates,
        '1',
        OperationContext.PERSON_BEARBEITEN,
      );
      expect(personenkontextStore.loading).toBe(true);
      await updatePersonenkontextePromise;
      expect(personenkontextStore.errorCode).toEqual('PERSONENKONTEXTE_UPDATE_ERROR');
      expect(personenkontextStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onPut('/api/personenkontext-workflow/1').replyOnce(500, { i18nKey: 'SOME_MOCK_SERVER_ERROR' });
      const updatePersonenkontextePromise: Promise<void> = personenkontextStore.updatePersonenkontexte(
        mockZuordnungUpdates,
        '1',
        OperationContext.PERSON_BEARBEITEN,
      );
      expect(personenkontextStore.loading).toBe(true);
      await updatePersonenkontextePromise;
      expect(personenkontextStore.errorCode).toEqual('SOME_MOCK_SERVER_ERROR');
      expect(personenkontextStore.loading).toBe(false);
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
