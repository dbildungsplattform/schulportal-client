import type {
  DbiamPersonenkontextBodyParams,
  DBiamPersonenkontextResponse,
  DBiamPersonenuebersichtResponse,
  DBiamPersonenzuordnungResponse,
  DbiamUpdatePersonenkontexteBodyParams,
  PersonenkontexteUpdateResponse,
} from '@/api-client/generated';
import axiosApiInstance from '@/services/ApiService';
import { faker } from '@faker-js/faker';
import MockAdapter from 'axios-mock-adapter';
import { isBefore } from 'date-fns';
import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import { useBulkOperationStore, type BulkOperationStore } from './BulkOperationStore';
import { OrganisationsTyp, type Organisation } from './OrganisationStore';
import { RollenArt } from './RolleStore';
import { PersonenUebersicht } from './types/PersonenUebersicht';
import type { Zuordnung } from './types/Zuordnung';
import { OperationType } from './types/bulkOperationTypes';

const mockAdapter: MockAdapter = new MockAdapter(axiosApiInstance);

describe('BulkOperationStore', () => {
  let bulkOperationStore: BulkOperationStore;

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
    bulkOperationStore = useBulkOperationStore();
    mockAdapter.reset();
    bulkOperationStore.$reset();
    vi.restoreAllMocks();
  });

  describe('bulkUnassignPersonenFromOrg', () => {
    it('should unassign person from Organisation successfully', async () => {
      const mockPersonResponse: DBiamPersonenuebersichtResponse = {
        personId: '1',
        vorname: 'John',
        nachname: 'Doe',
        benutzername: 'jdoe',
        lastModifiedZuordnungen: '2024-04-01T00:00:00.000Z',
        zuordnungen: [],
      };
      const mockUpdateResponse: PersonenkontexteUpdateResponse = {
        dBiamPersonenkontextResponses: [
          {
            personId: '1',
            organisationId: 'org-123',
            rolleId: 'rolle-456',
          } as DBiamPersonenkontextResponse,
        ],
      };

      mockAdapter.onGet('/api/dbiam/personenuebersicht/1').replyOnce(200, mockPersonResponse);
      mockAdapter.onPut('/api/personenkontext-workflow/1').replyOnce(200, mockUpdateResponse);

      const unassign: Promise<void> = bulkOperationStore.bulkUnassignPersonenFromOrg('1234', [mockPersonId]);
      expect(bulkOperationStore.currentOperation?.progress).toBe(0);

      await unassign;

      expect(bulkOperationStore.currentOperation?.progress).toBe(100);
      expect(bulkOperationStore.currentOperation?.errors.size).toBe(0);
    });

    it('should unassign and call updatePersonenkontexte if matching zuordnung exists', async () => {
      const remaining: DBiamPersonenzuordnungResponse = DoFactory.getDBiamPersonenzuordnungResponse();
      const klasse: Organisation = DoFactory.getKlasse(mockSchule);
      const mockPersonResponse: DBiamPersonenuebersichtResponse = DoFactory.getDBiamPersonenuebersichtResponse({
        ...person,
        zuordnungen: [
          remaining,
          DoFactory.getDBiamPersonenzuordnungResponse({}, { organisation: mockSchule }),
          DoFactory.getDBiamPersonenzuordnungResponse(
            {
              administriertVon: mockSchule.id,
            },
            { organisation: klasse },
          ),
        ],
      });

      const mockUpdateResponse: PersonenkontexteUpdateResponse = {
        dBiamPersonenkontextResponses: [
          {
            personId: mockPersonId,
            organisationId: remaining.sskId,
            rolleId: remaining.rolleId,
          } as DBiamPersonenkontextResponse,
        ],
      };

      mockAdapter.onGet(`/api/dbiam/personenuebersicht/${person.personId}`).replyOnce(200, mockPersonResponse);
      mockAdapter.onPut(`/api/personenkontext-workflow/${person.personId}`).replyOnce(200, mockUpdateResponse);

      const unassign: Promise<void> = bulkOperationStore.bulkUnassignPersonenFromOrg(mockSchule.id, [mockPersonId]);

      await unassign;

      expect(bulkOperationStore.currentOperation?.progress).toBe(100);
      expect(bulkOperationStore.currentOperation?.errors.size).toBe(0);
      expect(mockAdapter.history['put']?.length).toBe(1);
      expect(JSON.parse(mockAdapter.history['put']?.at(0)?.data as string)).toEqual(
        expect.objectContaining({
          personenkontexte: [
            {
              organisationId: remaining.sskId,
              rolleId: remaining.rolleId,
              befristung: remaining.befristung,
              personId: mockPersonId,
            },
          ],
        }),
      );
    });

    it('should skip if person has no zuordnungen', async () => {
      mockAdapter
        .onGet(`/api/dbiam/personenuebersicht/${mockPersonId}`)
        .replyOnce(200, DoFactory.getDBiamPersonenuebersichtResponse({ zuordnungen: [] }));

      await bulkOperationStore.bulkUnassignPersonenFromOrg('1234', [mockPersonId]);

      expect(bulkOperationStore.currentOperation?.progress).toBe(100);
      expect(mockAdapter.history['put']?.length).toBe(0);
    });

    it('should skip if personenuebersicht is missing', async () => {
      mockAdapter.onGet(`/api/dbiam/personenuebersicht/${mockPersonId}`).replyOnce(404);

      await bulkOperationStore.bulkUnassignPersonenFromOrg('1234', [mockPersonId]);

      expect(bulkOperationStore.currentOperation?.progress).toBe(100);

      expect(mockAdapter.history['put']?.length).toBe(0);
    });

    it('should handle errors if personenuebersicht replies with 500', async () => {
      mockAdapter.onGet('/api/dbiam/personenuebersicht/1').replyOnce(500, { i18nKey: 'mockServerError' });

      await bulkOperationStore.bulkUnassignPersonenFromOrg('1234', [mockPersonId]);

      expect(bulkOperationStore.currentOperation?.errors.size).toBe(1);
      expect(bulkOperationStore.currentOperation?.errors.get(mockPersonId)).toBe('mockServerError');
    });

    it('should handle errors if workflow replies with 500', async () => {
      const mockPersonResponse: DBiamPersonenuebersichtResponse = {
        personId: '1',
        vorname: 'John',
        nachname: 'Doe',
        benutzername: 'jdoe',
        lastModifiedZuordnungen: '2024-04-01T00:00:00.000Z',
        zuordnungen: [
          DoFactory.getDBiamPersonenzuordnungResponse({ sskId: '1234' }, { organisation: mockSchule }),
          DoFactory.getDBiamPersonenzuordnungResponse({}, { organisation: DoFactory.getKlasse(mockSchule) }),
        ],
      };
      mockAdapter.onGet('/api/dbiam/personenuebersicht/1').replyOnce(200, mockPersonResponse);
      mockAdapter.onPut('/api/personenkontext-workflow/1').replyOnce(500, { i18nKey: 'mockServerError' });

      await bulkOperationStore.bulkUnassignPersonenFromOrg('1234', [mockPersonId]);

      expect(bulkOperationStore.currentOperation?.errors.size).toBe(1);
      expect(bulkOperationStore.currentOperation?.errors.get(mockPersonId)).toBe('mockServerError');
    });
  });

  describe('bulkResetPassword', () => {
    it('should reset passwords successfully and handle errors', async () => {
      const userIds: Array<string> = [
        'bd5c231b-5171-49f4-a3c2-cb9fb470ed91',
        'f4e64f48-f1cf-463e-958f-ffd68e712713',
        'ede4055b-e18a-4f1a-9bce-9e8871772229',
      ];
      const mockPassword: string = 'fakePassword';

      mockAdapter.onPatch(`/api/personen/${userIds[0]}/password`).replyOnce(200, mockPassword);
      mockAdapter.onPatch(`/api/personen/${userIds[1]}/password`).replyOnce(200, mockPassword);
      mockAdapter.onPatch(`/api/personen/${userIds[2]}/password`).replyOnce(500, { i18nKey: 'some mock server error' });

      const resetPromise: Promise<void> = bulkOperationStore.bulkResetPassword(userIds);

      expect(bulkOperationStore.currentOperation?.isRunning).toBe(true);
      expect(bulkOperationStore.currentOperation?.progress).toBe(0);

      await resetPromise;

      expect(bulkOperationStore.currentOperation?.isRunning).toBe(false);
      expect(bulkOperationStore.currentOperation?.complete).toBe(true);
      expect(bulkOperationStore.currentOperation?.progress).toBe(100);

      expect(bulkOperationStore.currentOperation?.errors.size).toBe(1);
      expect(bulkOperationStore.currentOperation?.errors.get(userIds[2]!)).toBe('some mock server error');

      expect(bulkOperationStore.currentOperation?.data.size).toBe(2);
      expect(bulkOperationStore.currentOperation?.data.get(userIds[0]!)).toBe(mockPassword);
      expect(bulkOperationStore.currentOperation?.data.get(userIds[1]!)).toBe(mockPassword);
    });

    it('should handle errors if endpoint replies with 500', async () => {
      const userIds: Array<string> = ['id-1', 'id-2'];

      mockAdapter.onPatch(`/api/personen/${userIds[0]}/password`).replyOnce(500, { i18nKey: 'mockServerError' });
      mockAdapter.onPatch(`/api/personen/${userIds[1]}/password`).replyOnce(200, 'mockPassword');

      const resetPromise: Promise<void> = bulkOperationStore.bulkResetPassword(userIds);

      await resetPromise;

      expect(bulkOperationStore.currentOperation?.errors.size).toBe(1);
      expect(bulkOperationStore.currentOperation?.errors.get(userIds[0]!)).toBe('mockServerError');
    });
  });

  describe('bulkModifyPersonenRolle', () => {
    const orga: Organisation = DoFactory.getOrganisation();

    it('should update successfully with given values', async () => {
      const personIds: string[] = ['1', '2'];
      const selectedRolleId: string = 'rolle-456';

      const workflowStepResponseOrganisations: Organisation[] = [orga];

      const mockUpdateResponse: PersonenkontexteUpdateResponse = {
        dBiamPersonenkontextResponses: [
          {
            personId: '1',
            organisationId: orga.id,
            rolleId: 'rolle-456',
          } as DBiamPersonenkontextResponse,
        ],
      };

      mockAdapter
        .onGet('/api/dbiam/personenuebersicht/1')
        .replyOnce(200, DoFactory.getDBiamPersonenuebersichtResponse({ personId: '1' }, { organisation: orga }));
      mockAdapter
        .onGet('/api/dbiam/personenuebersicht/2')
        .replyOnce(200, DoFactory.getDBiamPersonenuebersichtResponse({ personId: '2' }, { organisation: orga }));

      mockAdapter.onPut('/api/personenkontext-workflow/1').replyOnce(200, mockUpdateResponse);
      mockAdapter.onPut('/api/personenkontext-workflow/2').replyOnce(200, mockUpdateResponse);

      const modifyPromise: Promise<void> = bulkOperationStore.bulkModifyPersonenRolle(
        personIds,
        orga.id,
        selectedRolleId,
        workflowStepResponseOrganisations,
      );

      expect(bulkOperationStore.currentOperation?.isRunning).toBe(true);

      await modifyPromise;

      expect(bulkOperationStore.currentOperation?.isRunning).toBe(false);
      expect(bulkOperationStore.currentOperation?.complete).toBe(true);
      expect(bulkOperationStore.currentOperation?.progress).toBe(100);
      expect(mockAdapter.history['put']?.length).toBe(2);
    });

    it('should return early if organisation is not found', async () => {
      const personIds: string[] = ['1', '2'];
      const selectedOrganisationId: string = 'non-existing-org';
      const selectedRolleId: string = 'rolle-456';

      const workflowStepResponseOrganisations: Organisation[] = [orga];

      const modifyPromise: Promise<void> = bulkOperationStore.bulkModifyPersonenRolle(
        personIds,
        selectedOrganisationId,
        selectedRolleId,
        workflowStepResponseOrganisations,
      );

      await modifyPromise;

      expect(bulkOperationStore.currentOperation?.progress).toBe(0);
      expect(bulkOperationStore.currentOperation?.complete).toBe(false);
      expect(mockAdapter.history['put']?.length).toBe(0);
    });

    it('should update successfully with default values for baseZuordnung', async () => {
      const personIds: string[] = ['1', '2'];
      const selectedOrganisationId: string = 'org-123';
      const selectedRolleId: string = 'rolle-456';

      const workflowStepResponseOrganisations: Organisation[] = [
        DoFactory.getOrganisation({
          id: 'org-123',
          name: 'Test Schule',
          kennung: null,
          administriertVon: null,
        }),
      ];

      const mockPersonResponse: DBiamPersonenuebersichtResponse = DoFactory.getDBiamPersonenuebersichtResponse(
        { personId: '2' },
        { organisation: workflowStepResponseOrganisations[0] },
      );

      const mockUpdateResponse: PersonenkontexteUpdateResponse = {
        dBiamPersonenkontextResponses: [
          {
            personId: '1',
            organisationId: 'org-123',
            rolleId: 'rolle-456',
          } as DBiamPersonenkontextResponse,
        ],
      };

      mockAdapter
        .onGet('/api/dbiam/personenuebersicht/1')
        .replyOnce(
          200,
          DoFactory.getDBiamPersonenuebersichtResponse(
            { personId: '1' },
            { organisation: workflowStepResponseOrganisations[0] },
          ),
        );
      mockAdapter.onGet('/api/dbiam/personenuebersicht/2').replyOnce(200, mockPersonResponse);

      mockAdapter.onPut('/api/personenkontext-workflow/1').replyOnce(200, mockUpdateResponse);
      mockAdapter.onPut('/api/personenkontext-workflow/2').replyOnce(200, mockUpdateResponse);

      const modifyPromise: Promise<void> = bulkOperationStore.bulkModifyPersonenRolle(
        personIds,
        selectedOrganisationId,
        selectedRolleId,
        workflowStepResponseOrganisations,
      );
      expect(bulkOperationStore.currentOperation?.isRunning).toBe(true);

      await modifyPromise;

      expect(bulkOperationStore.currentOperation?.isRunning).toBe(false);
      expect(bulkOperationStore.currentOperation?.complete).toBe(true);
      expect(bulkOperationStore.currentOperation?.progress).toBe(100);
      expect(mockAdapter.history['put']?.length).toBe(2);
    });

    it('should correctly handle befristungen', async () => {
      const selectedOrganisationId: string = faker.string.uuid();
      const selectedRolleTitle: string = 'Lehrer';
      const selectedRolleId: string = faker.string.uuid();
      const befristung: string = faker.date.future().toISOString();

      const selectedOrganisation: Organisation = DoFactory.getOrganisationResponse({ id: selectedOrganisationId });
      const workflowStepResponseOrganisations: Organisation[] = [selectedOrganisation];

      const mockBefristungen: (string | null)[] = [
        null,
        faker.date.between({ from: new Date(), to: befristung }).toISOString(),
        befristung,
        faker.date.past({ refDate: befristung }).toISOString(),
      ];

      const mockZuordnungen: Array<DBiamPersonenzuordnungResponse> = mockBefristungen.map(
        (mockBefristung: string | null) =>
          DoFactory.getDBiamPersonenzuordnungResponse(
            {
              befristung: mockBefristung,
              rolleId: selectedRolleId,
              rolle: selectedRolleTitle,
              editable: true,
              merkmale: [],
              rollenArt: RollenArt.Lern,
              admins: [faker.person.fullName()],
            },
            { organisation: selectedOrganisation },
          ),
      );
      const mockPersonResponses: Array<DBiamPersonenuebersichtResponse> = mockZuordnungen.map(
        (zuordnung: DBiamPersonenzuordnungResponse) => ({
          ...DoFactory.getDBiamPersonenuebersichtResponse({ zuordnungen: [zuordnung] }),
        }),
      );
      const personIds: string[] = mockPersonResponses.map(
        (response: DBiamPersonenuebersichtResponse) => response.personId,
      );

      const mockUpdateResponses: Array<PersonenkontexteUpdateResponse> = mockPersonResponses.map(
        (response: DBiamPersonenuebersichtResponse) => {
          const zuordnungen: Array<DBiamPersonenkontextResponse> = response.zuordnungen.map(
            (zuordnung: DBiamPersonenzuordnungResponse) => {
              return {
                personId: response.personId,
                organisationId: zuordnung.sskId,
                rolleId: zuordnung.rolleId,
                befristung: zuordnung.befristung,
              };
            },
          );
          zuordnungen.push(
            DoFactory.getDBiamPersonenkontextResponse({
              personId: response.personId,
              organisationId: selectedOrganisationId,
              rolleId: selectedRolleId,
              befristung:
                response.zuordnungen[0]!.befristung && isBefore(response.zuordnungen[0]!.befristung, befristung)
                  ? response.zuordnungen[0]!.befristung
                  : befristung,
            }),
          );
          return DoFactory.getPersonenkontextUpdateResponse({ dBiamPersonenkontextResponses: zuordnungen });
        },
      );
      mockPersonResponses.forEach((response: DBiamPersonenuebersichtResponse) => {
        mockAdapter.onGet(`/api/dbiam/personenuebersicht/${response.personId}`).replyOnce(200, response);
      });
      mockUpdateResponses.forEach((response: PersonenkontexteUpdateResponse) => {
        mockAdapter
          .onPut(`/api/personenkontext-workflow/${response.dBiamPersonenkontextResponses[0]!.personId}`)
          .replyOnce(200, response);
      });

      const modifyPromise: Promise<void> = bulkOperationStore.bulkModifyPersonenRolle(
        personIds,
        selectedOrganisationId,
        selectedRolleId,
        workflowStepResponseOrganisations,
        befristung,
      );

      expect(bulkOperationStore.currentOperation?.isRunning).toBe(true);

      await modifyPromise;

      expect(bulkOperationStore.currentOperation?.isRunning).toBe(false);
      expect(bulkOperationStore.currentOperation?.complete).toBe(true);
      expect(bulkOperationStore.currentOperation?.progress).toBe(100);
      expect(bulkOperationStore.currentOperation?.successMessage).toBe('admin.rolle.rollenAssignedSuccessfully');
      expect(bulkOperationStore.currentOperation?.errors).toEqual(new Map());

      mockPersonResponses.forEach((response: DBiamPersonenuebersichtResponse, index: number) => {
        const personId: string = response.personId;
        const correctBefristung: string =
          response.zuordnungen[0]!.befristung && isBefore(response.zuordnungen[0]!.befristung, befristung)
            ? response.zuordnungen[0]!.befristung
            : befristung;

        // Filter out old zuordnungen that will be replaced by the new one (same orgId + rolleId)
        const otherZuordnungen: Array<{ organisationId: string; rolleId: string; befristung?: string }> =
          response.zuordnungen
            .filter(
              (z: DBiamPersonenzuordnungResponse) =>
                !(z.sskId === selectedOrganisationId && z.rolleId === selectedRolleId),
            )
            .map((zuordnung: DBiamPersonenzuordnungResponse) => ({
              organisationId: zuordnung.sskId,
              rolleId: zuordnung.rolleId,
              befristung: zuordnung.befristung ?? undefined,
            }));

        expect(mockAdapter.history['put']?.[index]).toBeDefined();
        const data: object = JSON.parse(mockAdapter.history['put']?.[index]?.data as string) as object;
        expect(data).toEqual(
          expect.objectContaining({
            personenkontexte: expect.arrayContaining([
              ...otherZuordnungen,
              {
                befristung: correctBefristung,
                organisationId: selectedOrganisationId,
                rolleId: selectedRolleId,
                personId,
              },
            ]) as Array<DbiamPersonenkontextBodyParams>,
          }),
        );
      });
    });

    it('should add a new klassen-zuordnung when selectedKlasseId is provided', async () => {
      const selectedOrganisationId: string = faker.string.uuid();
      const selectedRolleId: string = faker.string.uuid();
      const selectedKlasseId: string = faker.string.uuid();
      const personId: string = faker.string.uuid();
      const existingRolleId: string = faker.string.uuid();

      const workflowStepResponseOrganisations: Organisation[] = [
        DoFactory.getOrganisationResponse({ id: selectedOrganisationId }),
      ];

      const existingZuordnungA: DBiamPersonenzuordnungResponse = DoFactory.getDBiamPersonenzuordnungResponse({
        rolleId: existingRolleId,
        editable: true,
        merkmale: [],
        rollenArt: RollenArt.Lern,
        admins: [faker.person.fullName()],
        befristung: null,
        administriertVon: faker.string.uuid(),
        typ: OrganisationsTyp.Schule,
        sskId: selectedOrganisationId,
      });

      const mockPersonResponse: DBiamPersonenuebersichtResponse = DoFactory.getDBiamPersonenuebersichtResponse({
        personId,
        zuordnungen: [existingZuordnungA],
      });

      const mockUpdateResponse: PersonenkontexteUpdateResponse = DoFactory.getPersonenkontextUpdateResponse({
        dBiamPersonenkontextResponses: [
          DoFactory.getDBiamPersonenkontextResponse({
            personId,
            organisationId: selectedOrganisationId,
            rolleId: selectedRolleId,
          }),
          DoFactory.getDBiamPersonenkontextResponse({
            personId,
            organisationId: selectedKlasseId,
            rolleId: selectedRolleId,
          }),
        ],
      });

      mockAdapter.onGet(`/api/dbiam/personenuebersicht/${personId}`).replyOnce(200, mockPersonResponse);
      mockAdapter.onPut(`/api/personenkontext-workflow/${personId}`).replyOnce(200, mockUpdateResponse);

      await bulkOperationStore.bulkModifyPersonenRolle(
        [personId],
        selectedOrganisationId,
        selectedRolleId,
        workflowStepResponseOrganisations,
        undefined,
        selectedKlasseId,
      );
      const data: object = JSON.parse(mockAdapter.history['put']?.[0]?.data as string) as object;
      expect(data).toEqual(
        expect.objectContaining<Partial<DbiamUpdatePersonenkontexteBodyParams>>({
          personenkontexte: expect.arrayContaining<DbiamPersonenkontextBodyParams>([
            { personId, organisationId: selectedOrganisationId, rolleId: existingRolleId, befristung: undefined },
            { personId, organisationId: selectedOrganisationId, rolleId: selectedRolleId, befristung: undefined },
            { personId, organisationId: selectedKlasseId, rolleId: selectedRolleId, befristung: undefined },
          ]) as Array<DbiamPersonenkontextBodyParams>,
        }),
      );
    });

    it('should reuse existing klassen-zuordnungen when selectedKlasseId is undefined', async () => {
      const selectedOrganisationId: string = faker.string.uuid();
      const existingRolleId: string = faker.string.uuid();
      const selectedRolleId: string = faker.string.uuid();
      const personId: string = faker.string.uuid();
      const existingKlasseId: string = faker.string.uuid();

      const workflowStepResponseOrganisations: Organisation[] = [
        DoFactory.getOrganisationResponse({ id: selectedOrganisationId }),
      ];

      const existingZuordnung: DBiamPersonenzuordnungResponse = DoFactory.getDBiamPersonenzuordnungResponse(
        {
          rolleId: existingRolleId,
          rolle: 'ExistingRolle',
          editable: true,
          merkmale: [],
          rollenArt: RollenArt.Lern,
          admins: [faker.person.fullName()],
          befristung: null,
          administriertVon: selectedOrganisationId,
          typ: OrganisationsTyp.Klasse,
        },
        {
          organisation: DoFactory.getOrganisationResponse({
            id: existingKlasseId,
            administriertVon: selectedOrganisationId,
          }),
        },
      );

      const existingZuordnungA: DBiamPersonenzuordnungResponse = DoFactory.getDBiamPersonenzuordnungResponse({
        rolle: faker.person.jobTitle(),
        editable: true,
        merkmale: [],
        rollenArt: RollenArt.Lern,
        admins: [faker.person.fullName()],
        befristung: null,
        administriertVon: faker.string.uuid(),
        typ: OrganisationsTyp.Schule,
        sskId: selectedOrganisationId,
      });

      const mockPersonResponse: DBiamPersonenuebersichtResponse = DoFactory.getDBiamPersonenuebersichtResponse({
        personId,
        zuordnungen: [existingZuordnung, existingZuordnungA],
      });

      const mockUpdateResponse: PersonenkontexteUpdateResponse = DoFactory.getPersonenkontextUpdateResponse({
        dBiamPersonenkontextResponses: [
          DoFactory.getDBiamPersonenkontextResponse({
            personId,
            organisationId: selectedOrganisationId,
            rolleId: selectedRolleId,
          }),
        ],
      });

      mockAdapter.onGet(`/api/dbiam/personenuebersicht/${personId}`).replyOnce(200, mockPersonResponse);
      mockAdapter.onPut(`/api/personenkontext-workflow/${personId}`).replyOnce(200, mockUpdateResponse);

      await bulkOperationStore.bulkModifyPersonenRolle(
        [personId],
        selectedOrganisationId,
        selectedRolleId,
        workflowStepResponseOrganisations,
        undefined,
        undefined,
      );

      const data: object = JSON.parse(mockAdapter.history['put']?.[0]?.data as string) as object;

      expect(data).toEqual(
        expect.objectContaining<Partial<DbiamUpdatePersonenkontexteBodyParams>>({
          personenkontexte: expect.arrayContaining<DbiamPersonenkontextBodyParams>([
            { personId, organisationId: existingKlasseId, rolleId: existingRolleId, befristung: undefined },
            { personId, organisationId: existingKlasseId, rolleId: selectedRolleId, befristung: undefined },
            { personId, organisationId: selectedOrganisationId, rolleId: selectedRolleId, befristung: undefined },
          ]) as Array<DbiamPersonenkontextBodyParams>,
        }),
      );
    });

    it('should not try to add klassen-zuordnung when person already has the rolle at one klasse', async () => {
      const selectedOrganisationId: string = faker.string.uuid();
      const selectedRolleId: string = faker.string.uuid();
      const differentRolleId: string = faker.string.uuid();
      const personId: string = faker.string.uuid();
      const existingKlasseIdA: string = faker.string.uuid();
      const existingKlasseIdB: string = faker.string.uuid();

      const workflowStepResponseOrganisations: Organisation[] = [
        DoFactory.getOrganisationResponse({ id: selectedOrganisationId }),
      ];

      const existingZuordnungA: DBiamPersonenzuordnungResponse = DoFactory.getDBiamPersonenzuordnungResponse(
        {
          rolleId: selectedRolleId,
          rolle: 'AltRolle',
          editable: true,
          merkmale: [],
          rollenArt: RollenArt.Lern,
          admins: [faker.person.fullName()],
          befristung: null,
          administriertVon: selectedOrganisationId,
          typ: OrganisationsTyp.Klasse,
        },
        {
          organisation: DoFactory.getOrganisationResponse({
            id: existingKlasseIdA,
            administriertVon: selectedOrganisationId,
          }),
        },
      );

      const existingZuordnungB: DBiamPersonenzuordnungResponse = DoFactory.getDBiamPersonenzuordnungResponse(
        {
          rolleId: differentRolleId,
          rolle: 'OtherRolle',
          editable: true,
          merkmale: [],
          rollenArt: RollenArt.Lern,
          admins: [faker.person.fullName()],
          befristung: null,
          administriertVon: selectedOrganisationId,
          typ: OrganisationsTyp.Klasse,
        },
        {
          organisation: DoFactory.getOrganisationResponse({
            id: existingKlasseIdB,
            administriertVon: selectedOrganisationId,
          }),
        },
      );

      const existingZuordnungC: DBiamPersonenzuordnungResponse = DoFactory.getDBiamPersonenzuordnungResponse(
        {
          rolle: faker.person.jobTitle(),
          editable: true,
          merkmale: [],
          rollenArt: RollenArt.Lern,
          admins: [faker.person.fullName()],
          befristung: null,
          administriertVon: faker.string.uuid(),
          typ: OrganisationsTyp.Schule,
          sskId: selectedOrganisationId,
        },
        {
          organisation: DoFactory.getOrganisationResponse({
            id: existingKlasseIdA,
            administriertVon: selectedOrganisationId,
          }),
        },
      );

      const mockPersonResponse: DBiamPersonenuebersichtResponse = DoFactory.getDBiamPersonenuebersichtResponse({
        personId,
        zuordnungen: [existingZuordnungA, existingZuordnungB, existingZuordnungC],
      });

      const mockUpdateResponse: PersonenkontexteUpdateResponse = DoFactory.getPersonenkontextUpdateResponse({
        dBiamPersonenkontextResponses: [
          DoFactory.getDBiamPersonenkontextResponse({
            personId,
            organisationId: selectedOrganisationId,
            rolleId: selectedRolleId,
          }),
        ],
      });

      mockAdapter.onGet(`/api/dbiam/personenuebersicht/${personId}`).replyOnce(200, mockPersonResponse);
      mockAdapter.onPut(`/api/personenkontext-workflow/${personId}`).replyOnce(200, mockUpdateResponse);

      await bulkOperationStore.bulkModifyPersonenRolle(
        [personId],
        selectedOrganisationId,
        selectedRolleId,
        workflowStepResponseOrganisations,
        undefined,
        undefined,
      );

      const data: object = JSON.parse(mockAdapter.history['put']?.[0]?.data as string) as object;

      expect(data).toEqual(
        expect.objectContaining<Partial<DbiamUpdatePersonenkontexteBodyParams>>({
          personenkontexte: expect.arrayContaining<DbiamPersonenkontextBodyParams>([
            { personId, organisationId: existingKlasseIdA, rolleId: selectedRolleId, befristung: undefined },
            { personId, organisationId: selectedOrganisationId, rolleId: selectedRolleId, befristung: undefined },
            { personId, organisationId: existingKlasseIdB, rolleId: differentRolleId, befristung: undefined },
          ]) as Array<DbiamPersonenkontextBodyParams>,
        }),
      );
      expect(data).not.toEqual(
        expect.objectContaining<Partial<DbiamUpdatePersonenkontexteBodyParams>>({
          personenkontexte: expect.arrayContaining<DbiamPersonenkontextBodyParams>([
            { personId, organisationId: existingKlasseIdB, rolleId: selectedRolleId, befristung: undefined },
          ]) as Array<DbiamPersonenkontextBodyParams>,
        }),
      );
    });

    it('should handle errors from both endpoints gracefully', async () => {
      const personIds: string[] = ['1', '2'];
      const selectedOrganisationId: string = 'org-123';
      const selectedRolleId: string = 'rolle-456';

      const workflowStepResponseOrganisations: Organisation[] = [
        {
          id: 'org-123',
          name: 'Test Schule',
          kennung: 'SCH123',
          administriertVon: 'adminId',
        } as Organisation,
      ];

      mockAdapter.onGet('/api/dbiam/personenuebersicht/1').replyOnce(500, { i18nKey: 'mockGetError' });
      mockAdapter.onGet('/api/dbiam/personenuebersicht/2').replyOnce(
        200,
        DoFactory.getDBiamPersonenuebersichtResponse({
          personId: '2',
          zuordnungen: [
            // Person needs existing zuordnung for the organisation
            {
              sskId: selectedOrganisationId,
              rolleId: faker.string.uuid(),
              sskName: faker.company.name(),
              sskDstNr: faker.string.numeric(6),
              rolle: faker.person.jobTitle(),
              typ: OrganisationsTyp.Schule,
              rollenArt: RollenArt.Lern,
              administriertVon: faker.string.uuid(),
              editable: true,
              befristung: null,
              merkmale: [],
              admins: [],
            },
          ],
        }),
      );

      mockAdapter.onPut('/api/personenkontext-workflow/2').replyOnce(500, { i18nKey: 'mockPutError' });

      const modifyPromise: Promise<void> = bulkOperationStore.bulkModifyPersonenRolle(
        personIds,
        selectedOrganisationId,
        selectedRolleId,
        workflowStepResponseOrganisations,
      );

      await modifyPromise;

      expect(bulkOperationStore.currentOperation?.errors.size).toBe(2);
      expect(bulkOperationStore.currentOperation?.errors.get(personIds[0]!)).toBe('mockGetError');
      expect(bulkOperationStore.currentOperation?.errors.get(personIds[1]!)).toBe('mockPutError');
      expect(bulkOperationStore.currentOperation?.progress).toBe(100);
      expect(bulkOperationStore.currentOperation?.complete).toBe(true);
    });

    it('should set error when person has no zuordnung for the selected organisation', async () => {
      const personId: string = faker.string.uuid();
      const selectedOrganisationId: string = faker.string.uuid();
      const selectedRolleId: string = faker.string.uuid();
      const differentOrganisationId: string = faker.string.uuid();

      const workflowStepResponseOrganisations: Organisation[] = [
        DoFactory.getOrganisationResponse({ id: selectedOrganisationId }),
      ];

      // Person has zuordnung for a DIFFERENT organisation, not the selected one
      const mockPersonResponse: DBiamPersonenuebersichtResponse = DoFactory.getDBiamPersonenuebersichtResponse({
        personId,
        zuordnungen: [
          {
            sskId: differentOrganisationId, // Different organisation
            rolleId: faker.string.uuid(),
            sskName: 'Other Org',
            sskDstNr: '456',
            rolle: 'Some Role',
            typ: OrganisationsTyp.Schule,
            rollenArt: RollenArt.Lern,
            administriertVon: faker.string.uuid(),
            editable: true,
            befristung: null,
            merkmale: [],
            admins: [],
          },
        ],
      });

      mockAdapter.onGet(`/api/dbiam/personenuebersicht/${personId}`).replyOnce(200, mockPersonResponse);

      await bulkOperationStore.bulkModifyPersonenRolle(
        [personId],
        selectedOrganisationId,
        selectedRolleId,
        workflowStepResponseOrganisations,
      );

      expect(bulkOperationStore.currentOperation?.errors.size).toBe(1);
      expect(bulkOperationStore.currentOperation?.errors.get(personId)).toBe(
        'PERSON_HAS_NO_ZUORDNUNG_FOR_ORGANISATION',
      );
      expect(bulkOperationStore.currentOperation?.complete).toBe(true);
      expect(bulkOperationStore.currentOperation?.progress).toBe(100);
    });
  });

  describe('bulkPersonenDelete', () => {
    it('should set successMessage when all deletes succeed', async () => {
      const personIds: string[] = ['id-1', 'id-2'];

      mockAdapter.onDelete(`/api/personen/${personIds[0]}`).replyOnce(204);
      mockAdapter.onDelete(`/api/personen/${personIds[1]}`).replyOnce(204);

      const bulkDeletePromise: Promise<void> = bulkOperationStore.bulkPersonenDelete(personIds);

      await bulkDeletePromise;

      expect(bulkOperationStore.currentOperation?.errors.size).toBe(0);
      expect(bulkOperationStore.currentOperation?.successMessage).toBe('admin.person.deletePersonBulkSuccessMessage');
      expect(mockAdapter.history['delete']?.length).toBe(2);
    });

    it('should handle errors if endpoint replies with 500', async () => {
      const personIds: string[] = ['id-1', 'id-2'];

      mockAdapter.onDelete(`/api/personen/${personIds[0]}`).replyOnce(204);
      mockAdapter.onDelete(`/api/personen/${personIds[1]}`).replyOnce(500, { i18nKey: 'mockServerError' });

      const bulkDeletePromise: Promise<void> = bulkOperationStore.bulkPersonenDelete(personIds);

      await bulkDeletePromise;

      expect(bulkOperationStore.currentOperation?.errors.size).toBe(1);
      expect(bulkOperationStore.currentOperation?.errors.get(personIds[1]!)).toBe('mockServerError');
      expect(bulkOperationStore.currentOperation?.successMessage).toBeUndefined();
    });
  });

  describe('bulkUnassignPersonenFromRolle', () => {
    it('should unassign person from rolle successfully', async () => {
      const organisationId: string = '1234';
      const rolleId: string = '5678';
      const personId: string = '1';

      const mockPersonResponse: DBiamPersonenuebersichtResponse = {
        personId: personId,
        vorname: 'John',
        nachname: 'Doe',
        benutzername: 'jdoe',
        lastModifiedZuordnungen: '2024-04-01T00:00:00.000Z',
        zuordnungen: [
          {
            sskId: organisationId, // matches organisation ID
            rolleId: rolleId, // matches rolle ID
            sskName: 'Test School',
            sskDstNr: '123',
            rolle: 'Test Role',
            rollenArt: RollenArt.Lern,
            administriertVon: 'admin-org-id',
            typ: OrganisationsTyp.Schule,
            editable: true,
            befristung: 'unbefristet',
            merkmale: [],
            admins: ['admin1'],
          },
          {
            sskId: '5678', // different organisation ID
            rolleId: rolleId,
            sskName: 'Another School',
            sskDstNr: '456',
            rolle: 'Test Role',
            rollenArt: RollenArt.Lern,
            administriertVon: 'admin-org-id',
            typ: OrganisationsTyp.Schule,
            editable: true,
            befristung: 'unbefristet',
            merkmale: [],
            admins: ['admin1'],
          },
        ],
      };

      const mockUpdateResponse: PersonenkontexteUpdateResponse = {
        dBiamPersonenkontextResponses: [
          {
            personId: personId,
            organisationId: '5678', // Only the non-matching zuordnung remains
            rolleId: rolleId,
          } as DBiamPersonenkontextResponse,
        ],
      };

      mockAdapter.onGet(`/api/dbiam/personenuebersicht/${personId}`).replyOnce(200, mockPersonResponse);
      mockAdapter.onPut(`/api/personenkontext-workflow/${personId}`).replyOnce(200, mockUpdateResponse);

      const unassignPromise: Promise<void> = bulkOperationStore.bulkUnassignPersonenFromRolle(
        organisationId,
        rolleId,
        [personId],
        false,
      );

      expect(bulkOperationStore.currentOperation?.type).toBe(OperationType.ROLLE_UNASSIGN);
      expect(bulkOperationStore.currentOperation?.isRunning).toBe(true);
      expect(bulkOperationStore.currentOperation?.progress).toBe(0);

      await unassignPromise;

      expect(bulkOperationStore.currentOperation?.isRunning).toBe(false);
      expect(bulkOperationStore.currentOperation?.complete).toBe(true);
      expect(bulkOperationStore.currentOperation?.progress).toBe(100);
      expect(bulkOperationStore.currentOperation?.errors.size).toBe(0);
      expect(bulkOperationStore.currentOperation?.successMessage).toBe('admin.rolle.rollenUnassignedSuccessfully');
    });

    it('should unassign person from rolle and its klasse successfully', async () => {
      const organisationId: string = '1234';
      const rolleId: string = '5678';
      const personId: string = '1';

      const mockPersonResponse: DBiamPersonenuebersichtResponse = {
        personId: personId,
        vorname: 'John',
        nachname: 'Doe',
        benutzername: 'jdoe',
        lastModifiedZuordnungen: '2024-04-01T00:00:00.000Z',
        zuordnungen: [
          {
            sskId: organisationId, // matches organisation ID
            rolleId: rolleId, // matches rolle ID
            sskName: 'Test School',
            sskDstNr: '123',
            rolle: 'Test Role',
            rollenArt: RollenArt.Lern,
            administriertVon: 'admin-org-id',
            typ: OrganisationsTyp.Schule,
            editable: true,
            befristung: 'unbefristet',
            merkmale: [],
            admins: ['admin1'],
          },
          {
            sskId: '5678', // different organisation ID
            rolleId: rolleId,
            sskName: '9B',
            sskDstNr: '456',
            rolle: 'Test Role',
            rollenArt: RollenArt.Lern,
            administriertVon: organisationId,
            typ: OrganisationsTyp.Klasse,
            editable: true,
            befristung: 'unbefristet',
            merkmale: [],
            admins: ['admin1'],
          },
          {
            sskId: '5679',
            rolleId: rolleId,
            sskName: '9B',
            sskDstNr: '456',
            rolle: 'Test Role',
            rollenArt: RollenArt.Lern,
            administriertVon: '123',
            typ: OrganisationsTyp.Schule,
            editable: true,
            befristung: 'unbefristet',
            merkmale: [],
            admins: ['admin1'],
          },
        ],
      };

      const mockUpdateResponse: PersonenkontexteUpdateResponse = {
        dBiamPersonenkontextResponses: [],
      };

      mockAdapter.onGet(`/api/dbiam/personenuebersicht/${personId}`).replyOnce(200, mockPersonResponse);
      mockAdapter.onPut(`/api/personenkontext-workflow/${personId}`).replyOnce(200, mockUpdateResponse);

      const unassignPromise: Promise<void> = bulkOperationStore.bulkUnassignPersonenFromRolle(
        organisationId,
        rolleId,
        [personId],
        true,
      );

      expect(bulkOperationStore.currentOperation?.type).toBe(OperationType.ROLLE_UNASSIGN);
      expect(bulkOperationStore.currentOperation?.isRunning).toBe(true);
      expect(bulkOperationStore.currentOperation?.progress).toBe(0);

      await unassignPromise;

      expect(bulkOperationStore.currentOperation?.isRunning).toBe(false);
      expect(bulkOperationStore.currentOperation?.complete).toBe(true);
      expect(bulkOperationStore.currentOperation?.progress).toBe(100);
      expect(bulkOperationStore.currentOperation?.errors.size).toBe(0);
      expect(bulkOperationStore.currentOperation?.successMessage).toBe('admin.rolle.rollenUnassignedSuccessfully');
    });

    it('should skip if no matching zuordnung exists', async () => {
      const organisationId: string = '1234';
      const rolleId: string = '5678';
      const personId: string = '1';

      const mockPersonResponse: DBiamPersonenuebersichtResponse = {
        personId: personId,
        vorname: 'John',
        nachname: 'Doe',
        benutzername: 'jdoe',
        lastModifiedZuordnungen: '2024-04-01T00:00:00.000Z',
        zuordnungen: [
          {
            sskId: '9999', // Different from the requested organisationId
            rolleId: '9999', // Different from the requested rolleId
            sskName: 'Another School',
            sskDstNr: '456',
            rolle: 'Test Role',
            rollenArt: RollenArt.Lern,
            administriertVon: 'admin-org-id',
            typ: OrganisationsTyp.Schule,
            editable: true,
            befristung: 'unbefristet',
            merkmale: [],
            admins: ['admin1'],
          },
        ],
      };

      mockAdapter.onGet(`/api/dbiam/personenuebersicht/${personId}`).replyOnce(200, mockPersonResponse);

      const unassignPromise: Promise<void> = bulkOperationStore.bulkUnassignPersonenFromRolle(
        organisationId,
        rolleId,
        [personId],
        false,
      );

      await unassignPromise;

      expect(bulkOperationStore.currentOperation?.isRunning).toBe(false);
      expect(bulkOperationStore.currentOperation?.complete).toBe(true);
      expect(bulkOperationStore.currentOperation?.progress).toBe(100);
      expect(bulkOperationStore.currentOperation?.errors.size).toBe(0);
      expect(bulkOperationStore.currentOperation?.successMessage).toBe('admin.rolle.rollenUnassignedSuccessfully');
    });

    it('should handle errors from personenuebersicht endpoint', async () => {
      const organisationId: string = '1234';
      const rolleId: string = '5678';
      const personId: string = '1';

      // Mock error in personenuebersicht (GET) call
      mockAdapter.onGet(`/api/dbiam/personenuebersicht/${personId}`).replyOnce(500, { i18nKey: 'mockGetError' });

      const unassignPromise: Promise<void> = bulkOperationStore.bulkUnassignPersonenFromRolle(
        organisationId,
        rolleId,
        [personId],
        false,
      );

      await unassignPromise;

      expect(bulkOperationStore.currentOperation?.isRunning).toBe(false);
      expect(bulkOperationStore.currentOperation?.complete).toBe(true);
      expect(bulkOperationStore.currentOperation?.progress).toBe(100);
      expect(bulkOperationStore.currentOperation?.errors.size).toBe(1);
      expect(bulkOperationStore.currentOperation?.errors.get(personId)).toBe('mockGetError');
      expect(bulkOperationStore.currentOperation?.successMessage).toBeUndefined();
    });

    it('should handle errors from personenkontext-workflow endpoint', async () => {
      const rolleId: string = faker.string.uuid();
      const anotherRolleId: string = faker.string.uuid();
      const mockPersonId: string = faker.string.uuid();

      // Mock successful GET but error in personenkontext-workflow (PUT) call
      const mockKontexte: Map<string, DBiamPersonenuebersichtResponse> = new Map();
      mockKontexte.set(
        mockPersonId,
        DoFactory.getDBiamPersonenuebersichtResponse(
          {
            personId: mockPersonId,
            zuordnungen: [
              DoFactory.getDBiamPersonenzuordnungResponse(
                { rollenArt: RollenArt.Lern, rolleId: rolleId, editable: true },
                { organisation: mockSchule },
              ),
              DoFactory.getDBiamPersonenzuordnungResponse(
                { rollenArt: RollenArt.Lern, rolleId: anotherRolleId, editable: true },
                { organisation: mockSchule },
              ),
            ],
          },
          { organisation: mockSchule },
        ),
      );

      mockAdapter.onGet(`/api/dbiam/personenuebersicht/${mockPersonId}`).replyOnce(200, mockKontexte.get(mockPersonId));
      mockAdapter.onPut(`/api/personenkontext-workflow/${mockPersonId}`).replyOnce(500, { i18nKey: 'mockPutError' });

      const unassignPromise: Promise<void> = bulkOperationStore.bulkUnassignPersonenFromRolle(
        mockSchule.id,
        rolleId,
        [mockPersonId],
        false,
      );

      await unassignPromise;

      expect(bulkOperationStore.currentOperation?.isRunning).toBe(false);
      expect(bulkOperationStore.currentOperation?.complete).toBe(true);
      expect(bulkOperationStore.currentOperation?.progress).toBe(100);
      expect(bulkOperationStore.currentOperation?.errors.size).toBe(1);
      expect(bulkOperationStore.currentOperation?.errors.get(mockPersonId)).toBe('mockPutError');
      expect(bulkOperationStore.currentOperation?.successMessage).toBeUndefined();
    });

    it('should return an error if last editable Zuordnung', async () => {
      const rolleId: string = faker.string.uuid();
      const mockPersonId: string = faker.string.uuid();

      const mockKontexte: Map<string, DBiamPersonenuebersichtResponse> = new Map();
      mockKontexte.set(
        mockPersonId,
        DoFactory.getDBiamPersonenuebersichtResponse(
          {
            personId: mockPersonId,
            zuordnungen: [
              DoFactory.getDBiamPersonenzuordnungResponse(
                { rollenArt: RollenArt.Lern, rolleId: rolleId, editable: true },
                { organisation: mockSchule },
              ),
              DoFactory.getDBiamPersonenzuordnungResponse(
                { rollenArt: RollenArt.Lern, rolleId: rolleId, editable: true },
                { organisation: mockSchule },
              ),
            ],
          },
          { organisation: mockSchule },
        ),
      );

      mockAdapter.onGet(`/api/dbiam/personenuebersicht/${mockPersonId}`).replyOnce(200, mockKontexte.get(mockPersonId));

      const unassignPromise: Promise<void> = bulkOperationStore.bulkUnassignPersonenFromRolle(
        mockSchule.id,
        rolleId,
        [mockPersonId],
        false,
      );

      await unassignPromise;

      expect(bulkOperationStore.currentOperation?.isRunning).toBe(false);
      expect(bulkOperationStore.currentOperation?.complete).toBe(true);
      expect(bulkOperationStore.currentOperation?.progress).toBe(100);
      expect(bulkOperationStore.currentOperation?.errors.size).toBe(1);
      expect(bulkOperationStore.currentOperation?.errors.get(mockPersonId)).toBe('NO_EDITABLE_ZUORDNUNGEN_LEFT');
      expect(bulkOperationStore.currentOperation?.successMessage).toBeUndefined();
    });

    it('should skip if person has no zuordnungen', async () => {
      mockAdapter.onGet('/api/dbiam/personenuebersicht/1').replyOnce(200, []);

      await bulkOperationStore.bulkUnassignPersonenFromRolle('1234', '1', [mockPersonId], false);
      expect(bulkOperationStore.currentOperation?.progress).toBe(100);
    });
  });

  describe('resetState', () => {
    it('should reset the currentOperation state', () => {
      bulkOperationStore.currentOperation = {
        type: OperationType.DELETE_PERSON,
        isRunning: true,
        progress: 55,
        complete: true,
        errors: new Map([['someId', 'someError']]),
        data: new Map([['someId', 'someData']]),
        successMessage: 'Some success message',
      };

      bulkOperationStore.resetState();

      expect(bulkOperationStore.currentOperation.type).toBeNull();
      expect(bulkOperationStore.currentOperation.isRunning).toBe(false);
      expect(bulkOperationStore.currentOperation.progress).toBe(0);
      expect(bulkOperationStore.currentOperation.complete).toBe(false);
      expect(bulkOperationStore.currentOperation.errors.size).toBe(0);
      expect(bulkOperationStore.currentOperation.data.size).toBe(0);
      expect(bulkOperationStore.currentOperation.successMessage).toBeUndefined();
    });
  });

  describe('bulkChangeKlasse', () => {
    it('should call the API and update the state', async () => {
      const personId: string = faker.string.uuid();
      const bulkChangeKlassePromise: Promise<void> = bulkOperationStore.bulkChangeKlasse(
        [personId],
        faker.string.uuid(),
        faker.string.uuid(),
      );

      mockAdapter
        .onGet(`/api/dbiam/personenuebersicht/${personId}`)
        .replyOnce(200, DoFactory.getDBiamPersonenuebersichtResponse({ personId }));
      mockAdapter
        .onPut(`/api/personenkontext-workflow/${personId}`)
        .replyOnce(200, DoFactory.getPersonenkontextUpdateResponse());

      expect(bulkOperationStore.currentOperation?.isRunning).toBe(true);
      expect(bulkOperationStore.currentOperation?.progress).toBe(0);

      await bulkChangeKlassePromise;

      expect(bulkOperationStore.currentOperation?.isRunning).toBe(false);
      expect(bulkOperationStore.currentOperation?.complete).toBe(true);
      expect(bulkOperationStore.currentOperation?.progress).toBe(100);
    });

    it('should call api with correct data', async () => {
      const mockPersonIds: string[] = [faker.string.uuid(), faker.string.uuid()];
      const klassenId: string = faker.string.uuid();
      const unchangedKlassenId: string = faker.string.uuid();
      const mockKlassen: Organisation[] = [
        DoFactory.getKlasse(mockSchule),
        DoFactory.getKlasse(mockSchule),
        DoFactory.getKlasse(mockSchule, { id: klassenId }),
      ];
      const mockKontexte: Map<string, DBiamPersonenuebersichtResponse> = new Map();
      mockKontexte.set(
        mockPersonIds[0]!,
        DoFactory.getDBiamPersonenuebersichtResponse(
          {
            personId: mockPersonIds[0]!,
            zuordnungen: [
              DoFactory.getDBiamPersonenzuordnungResponse({ rollenArt: RollenArt.Lern }, { organisation: mockSchule }),
              DoFactory.getDBiamPersonenzuordnungResponse(
                { rollenArt: RollenArt.Lern, administriertVon: mockSchule.id },
                { organisation: mockKlassen[0]! },
              ),
              DoFactory.getDBiamPersonenzuordnungResponse(
                { rollenArt: RollenArt.Lern },
                { organisation: DoFactory.getKlasse(undefined, { id: unchangedKlassenId }) },
              ),
            ],
          },
          { organisation: mockSchule },
        ),
      );
      mockKontexte.set(
        mockPersonIds[1]!,
        DoFactory.getDBiamPersonenuebersichtResponse(
          {
            personId: mockPersonIds[1]!,
            zuordnungen: [
              DoFactory.getDBiamPersonenzuordnungResponse({ rollenArt: RollenArt.Lern }, { organisation: mockSchule }),
              DoFactory.getDBiamPersonenzuordnungResponse(
                { rollenArt: RollenArt.Lern, administriertVon: mockSchule.id },
                { organisation: mockKlassen[0] },
              ),
              DoFactory.getDBiamPersonenzuordnungResponse(
                { rollenArt: RollenArt.Lern, administriertVon: mockSchule.id },
                { organisation: mockKlassen[1] },
              ),
            ],
          },
          { organisation: mockSchule },
        ),
      );
      mockPersonIds.forEach((personId: string) => {
        mockAdapter.onGet(`/api/dbiam/personenuebersicht/${personId}`).replyOnce(200, mockKontexte.get(personId));
      });
      mockPersonIds.forEach((personId: string) => {
        mockAdapter.onPut(`/api/personenkontext-workflow/${personId}`).replyOnce(200, []);
      });

      await bulkOperationStore.bulkChangeKlasse(mockPersonIds, mockSchule.id, klassenId);
    });

    it('should handle errors if endpoint replies with 500', async () => {
      const personIds: string[] = [faker.string.uuid(), faker.string.uuid()];

      mockAdapter.onGet(`/api/dbiam/personenuebersicht/${personIds[0]}`).replyOnce(500, { i18nKey: 'getError' });
      mockAdapter
        .onGet(`/api/dbiam/personenuebersicht/${personIds[1]}`)
        .replyOnce(200, DoFactory.getDBiamPersonenuebersichtResponse({ personId: personIds[1] }));
      mockAdapter.onPut(`/api/personenkontext-workflow/${personIds[1]}`).replyOnce(500, { i18nKey: 'putError' });

      const bulkChangeKlassePromise: Promise<void> = bulkOperationStore.bulkChangeKlasse(
        personIds,
        faker.string.uuid(),
        faker.string.uuid(),
      );

      await bulkChangeKlassePromise;

      expect(bulkOperationStore.currentOperation?.errors.size).toBe(2);
      expect(bulkOperationStore.currentOperation?.errors.get(personIds[0]!)).toBe('getError');
      expect(bulkOperationStore.currentOperation?.errors.get(personIds[1]!)).toBe('putError');
    });
  });

  describe('getPersonenuebersichtById', () => {
    it('should handle null data from personenuebersicht endpoint', async () => {
      const personId: string = faker.string.uuid();

      mockAdapter.onGet(`/api/dbiam/personenuebersicht/${personId}`).replyOnce(200, { data: null });

      await bulkOperationStore.bulkModifyPersonenRolle([personId], mockSchule.id, faker.string.uuid(), [mockSchule]);

      expect(bulkOperationStore.currentOperation?.errors.size).toBe(1);
      expect(bulkOperationStore.currentOperation?.errors.get(personId)).toBe('UNSPECIFIED_ERROR');
    });
  });
});
