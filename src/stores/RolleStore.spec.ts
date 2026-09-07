import MockAdapter from 'axios-mock-adapter';
import { createPinia, setActivePinia } from 'pinia';
import {
  RollenArt,
  RollenMerkmal,
  RollenSystemRechtEnum,
  type ApplyRollenerweiterungChangesBodyParams,
  type RolleResponse,
  type RolleWithServiceProvidersResponse,
  type ServiceProviderResponse,
  type SystemRechtResponse,
} from '../api-client/generated/api';
import { useRolleStore, type RolleStore } from './RolleStore';

import axiosApiInstance from '@/services/ApiService';
import { DoFactory } from 'test/DoFactory';

const mockadapter: MockAdapter = new MockAdapter(axiosApiInstance);

describe('rolleStore', () => {
  let rolleStore: RolleStore;
  beforeEach(() => {
    setActivePinia(createPinia());
    rolleStore = useRolleStore();
    rolleStore.$reset();
    mockadapter.reset();
    vi.restoreAllMocks();
  });

  it('should initalize state correctly', () => {
    expect(rolleStore.createdRolle).toEqual(null);
    expect(rolleStore.allRollen).toEqual([]);
    expect(rolleStore.rollenerweiterungServiceProviders).toEqual([]);
    expect(rolleStore.errorCode).toEqual('');
    expect(rolleStore.loading).toBe(false);
    expect(rolleStore.errors).toEqual(new Map());
  });

  describe('createRolle', () => {
    it('should create rolle and update state', async () => {
      const mockResponse: RolleResponse = {
        administeredBySchulstrukturknoten: '1234',
        rollenart: 'LEHR',
        name: 'Lehrer',
        // TODO remove type casting when generator is fixed
        merkmale: [RollenMerkmal.KopersPflicht],
        systemrechte: [{ name: 'ROLLEN_VERWALTEN', isTechnical: false }] as unknown as Set<SystemRechtResponse>,
        createdAt: '2022',
        updatedAt: '2022',
        id: '1',
        administeredBySchulstrukturknotenName: null,
        administeredBySchulstrukturknotenKennung: null,
        version: 1,
      };

      mockadapter.onPost('/api/rolle').replyOnce(200, mockResponse);
      const createRollePromise: Promise<void> = rolleStore.createRolle(
        'Lehrer',
        '1234',
        'LEHR',
        ['KOPERS_PFLICHT'],
        ['ROLLEN_VERWALTEN'],
        ['5678'],
      );
      expect(rolleStore.loading).toBe(true);
      await createRollePromise;
      expect(rolleStore.createdRolle).toEqual({ ...mockResponse, systemrechte: new Set(['ROLLEN_VERWALTEN']) });
      expect(rolleStore.currentRolle).toEqual({ ...mockResponse, systemrechte: new Set(['ROLLEN_VERWALTEN']) });
      expect(rolleStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onPost('/api/rolle').replyOnce(500, 'some mock server error');
      const createRollePromise: Promise<void> = rolleStore.createRolle(
        'Lehrer',
        '1234',
        'LEHR',
        ['KOPERS_PFLICHT'],
        ['ROLLEN_VERWALTEN'],
        [],
      );
      expect(rolleStore.loading).toBe(true);
      await createRollePromise;
      expect(rolleStore.errorCode).toEqual('ROLLE_ERROR');
      expect(rolleStore.createdRolle).toEqual(null);
      expect(rolleStore.loading).toBe(false);
    });
    it('should handle error code', async () => {
      mockadapter.onPost('/api/rolle').replyOnce(500, { i18nKey: 'SOME_MOCK_SERVER_ERROR' });
      const createRollePromise: Promise<void> = rolleStore.createRolle(
        'Lehrer',
        '1234',
        'LEHR',
        ['KOPERS_PFLICHT'],
        ['ROLLEN_VERWALTEN'],
        ['5678'],
      );
      expect(rolleStore.loading).toBe(true);
      await createRollePromise;
      expect(rolleStore.errorCode).toEqual('SOME_MOCK_SERVER_ERROR');
      expect(rolleStore.createdRolle).toEqual(null);
      expect(rolleStore.loading).toBe(false);
    });
  });

  describe('getAllRollen', () => {
    it('should load rollen and update state', async () => {
      const mockResponse: RolleResponse[] = [
        {
          administeredBySchulstrukturknoten: '1234',
          rollenart: 'LEHR',
          name: 'Lehrer',
          merkmale: [RollenMerkmal.KopersPflicht],
          systemrechte: [{ name: 'ROLLEN_VERWALTEN', isTechnical: false }] as unknown as Set<SystemRechtResponse>,
          createdAt: '2022',
          updatedAt: '2022',
          id: '1',
          administeredBySchulstrukturknotenName: 'Testschule-15',
          administeredBySchulstrukturknotenKennung: '1111115',
          version: 1,
        },
      ];

      mockadapter.onGet('/api/rolle?offset=0&limit=30&searchStr=').replyOnce(200, mockResponse, {});
      const getAllRollenPromise: Promise<void> = rolleStore.getAllRollen({ offset: 0, limit: 30, searchString: '' });
      expect(rolleStore.loading).toBe(true);
      await getAllRollenPromise;
      expect(rolleStore.allRollen).toEqual([...mockResponse]);
      expect(rolleStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onGet('/api/rolle?offset=0&limit=30&searchStr=').replyOnce(500, 'some mock server error');
      const getAllRollenPromise: Promise<void> = rolleStore.getAllRollen({ offset: 0, limit: 30, searchString: '' });
      expect(rolleStore.loading).toBe(true);
      await getAllRollenPromise;
      expect(rolleStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(rolleStore.allRollen).toEqual([]);
      expect(rolleStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onGet('/api/rolle?offset=0&limit=30&searchStr=').replyOnce(500, { code: 'some mock server error' });
      const getAllRollenPromise: Promise<void> = rolleStore.getAllRollen({ offset: 0, limit: 30, searchString: '' });
      expect(rolleStore.loading).toBe(true);
      await getAllRollenPromise;
      expect(rolleStore.errorCode).toEqual('some mock server error');
      expect(rolleStore.allRollen).toEqual([]);
      expect(rolleStore.loading).toBe(false);
    });

    it('should pass all filter params to the api', async () => {
      mockadapter.onGet(/\/api\/rolle/).replyOnce(200, [], {});

      await rolleStore.getAllRollen({
        offset: 0,
        limit: 30,
        searchString: '',
        organisationContextForOperation: 'org1',
        organisationenForFilter: ['org2', 'org3'],
        merkmale: [RollenMerkmal.KopersPflicht],
        serviceProviderIds: ['sp1', 'sp2'],
      });

      const requestedUrl: string = mockadapter.history.get[0]!.url!;
      expect(requestedUrl).toContain('organisationContextForOperation=org1');
      expect(requestedUrl).toContain('organisationenForFilter=org2');
      expect(requestedUrl).toContain('organisationenForFilter=org3');
      expect(requestedUrl).toContain(`merkmale=${RollenMerkmal.KopersPflicht}`);
      expect(requestedUrl).toContain('serviceProviderIds=sp1');
      expect(requestedUrl).toContain('serviceProviderIds=sp2');
    });
  });

  describe('getRolleById', () => {
    it('should load Rolle and update state', async () => {
      const mockResponse: RolleResponse = {
        administeredBySchulstrukturknoten: '1234',
        rollenart: 'LEHR',
        name: 'Lehrer',
        // TODO: remove type casting when generator is fixed
        merkmale: [RollenMerkmal.KopersPflicht],
        systemrechte: [{ name: 'ROLLEN_VERWALTEN', isTechnical: false }] as unknown as Set<SystemRechtResponse>,
        createdAt: '2022',
        updatedAt: '2022',
        id: '1',
        administeredBySchulstrukturknotenName: null,
        administeredBySchulstrukturknotenKennung: null,
        version: 1,
      };

      mockadapter.onGet('/api/rolle/1').replyOnce(200, mockResponse, {});
      const getRolleByIdPromise: Promise<void> = rolleStore.getRolleById('1');
      expect(rolleStore.loading).toBe(true);
      await getRolleByIdPromise;
      expect(rolleStore.currentRolle).toEqual({
        administeredBySchulstrukturknoten: '1234',
        rollenart: 'LEHR',
        name: 'Lehrer',
        merkmale: [RollenMerkmal.KopersPflicht],
        systemrechte: new Set(['ROLLEN_VERWALTEN']),
        id: '1',
        version: 1,
      });
      expect(rolleStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onGet('/api/rolle/1').replyOnce(500, 'some mock server error');
      const getRolleByIdPromise: Promise<void> = rolleStore.getRolleById('1');
      expect(rolleStore.loading).toBe(true);
      await getRolleByIdPromise;
      expect(rolleStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(rolleStore.currentRolle).toEqual(null);
      expect(rolleStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onGet('/api/rolle/1').replyOnce(500, { code: 'some mock server error' });
      const getRolleByIdPromise: Promise<void> = rolleStore.getRolleById('1');
      expect(rolleStore.loading).toBe(true);
      await getRolleByIdPromise;
      expect(rolleStore.errorCode).toEqual('some mock server error');
      expect(rolleStore.currentRolle).toEqual(null);
      expect(rolleStore.loading).toBe(false);
    });
  });

  describe('getMptRolleById', () => {
    it('should use the role already loaded by MPT role management', async () => {
      const rolle: RolleWithServiceProvidersResponse = DoFactory.getRolleWithServiceProviders();
      rolleStore.allRollen = [rolle];

      await rolleStore.getMptRolleById(rolle.id, 'organisation-1');

      expect(rolleStore.currentMptRolle?.id).toBe(rolle.id);
      expect(mockadapter.history.get).toHaveLength(0);
      expect(rolleStore.loading).toBe(false);
    });

    it('should load a role through the MPT-authorized list endpoint on direct navigation', async () => {
      const rolle: RolleWithServiceProvidersResponse = DoFactory.getRolleWithServiceProviders();
      rolleStore.currentMptRolle = DoFactory.getRolle();
      mockadapter.onGet().replyOnce(200, [rolle]);

      const promise: Promise<void> = rolleStore.getMptRolleById(rolle.id, 'organisation-1');
      expect(rolleStore.loading).toBe(true);
      expect(rolleStore.currentMptRolle).toBe(null);
      await promise;

      const requestUrl: string = mockadapter.history.get[0]?.url ?? '';
      expect(requestUrl).toContain('organisationenForFilter=organisation-1');
      expect(requestUrl).toContain(`rolleIds=${rolle.id}`);
      expect(requestUrl).toContain('systemrechte=MPT_ROLLEN_VERWALTEN');
      expect(rolleStore.currentMptRolle?.id).toBe(rolle.id);
      expect(rolleStore.errorCode).toBe('');
      expect(rolleStore.loading).toBe(false);
    });

    it('should set an error when the requested MPT role is not returned', async () => {
      mockadapter.onGet().replyOnce(200, []);

      await rolleStore.getMptRolleById('rolle-1', 'organisation-1');

      expect(rolleStore.currentMptRolle).toBe(null);
      expect(rolleStore.errorCode).toBe('UNSPECIFIED_ERROR');
      expect(rolleStore.loading).toBe(false);
    });

    it('should handle a structured loading error', async () => {
      mockadapter.onGet().replyOnce(500, { code: 'MPT_ROLLE_LOADING_ERROR' });

      await rolleStore.getMptRolleById('rolle-1', 'organisation-1');

      expect(rolleStore.currentMptRolle).toBe(null);
      expect(rolleStore.errorCode).toBe('MPT_ROLLE_LOADING_ERROR');
      expect(rolleStore.loading).toBe(false);
    });
  });

  describe('getRollenerweiterungenForRolle', () => {
    it('should load service providers assigned as role extensions', async () => {
      const serviceProvider: ServiceProviderResponse = DoFactory.getServiceProviderResponse();
      rolleStore.rollenerweiterungServiceProviders = [DoFactory.getServiceProviderResponse()];
      mockadapter
        .onGet('/api/rolle/rolle-1/angebote-via-rollenerweiterungen?organisationId=organisation-1')
        .replyOnce(200, [serviceProvider]);

      const promise: Promise<void> = rolleStore.getRollenerweiterungenForRolle('rolle-1', 'organisation-1');
      expect(rolleStore.loading).toBe(true);
      expect(rolleStore.rollenerweiterungServiceProviders).toEqual([]);
      await promise;

      expect(rolleStore.rollenerweiterungServiceProviders).toEqual([serviceProvider]);
      expect(rolleStore.loading).toBe(false);
    });

    it('should handle an unstructured error', async () => {
      mockadapter
        .onGet('/api/rolle/rolle-1/angebote-via-rollenerweiterungen?organisationId=organisation-1')
        .replyOnce(500, 'server error');

      await rolleStore.getRollenerweiterungenForRolle('rolle-1', 'organisation-1');

      expect(rolleStore.errorCode).toBe('UNSPECIFIED_ERROR');
      expect(rolleStore.loading).toBe(false);
    });

    it('should handle a structured error', async () => {
      mockadapter
        .onGet('/api/rolle/rolle-1/angebote-via-rollenerweiterungen?organisationId=organisation-1')
        .replyOnce(500, { code: 'ROLLE_EXTENSION_READ_ERROR' });

      await rolleStore.getRollenerweiterungenForRolle('rolle-1', 'organisation-1');

      expect(rolleStore.errorCode).toBe('ROLLE_EXTENSION_READ_ERROR');
      expect(rolleStore.loading).toBe(false);
    });
  });

  describe('persistRollenerweiterungenForRolle', () => {
    it('should persist added and removed service providers', async () => {
      const expectedBody: ApplyRollenerweiterungChangesBodyParams = {
        addErweiterungenForServiceProviderIds: ['service-provider-add'],
        removeErweiterungenForServiceProviderIds: ['service-provider-remove'],
      };
      mockadapter.onPost('/api/rolle/rolle-1/organisation/organisation-1/apply').replyOnce(200, []);

      const promise: Promise<void> = rolleStore.persistRollenerweiterungenForRolle({
        rolleId: 'rolle-1',
        organisationId: 'organisation-1',
        existingServiceProviderIds: expectedBody.removeErweiterungenForServiceProviderIds,
        selectedServiceProviderIds: expectedBody.addErweiterungenForServiceProviderIds,
      });
      expect(rolleStore.loading).toBe(true);
      await promise;

      const requestBody: unknown = JSON.parse(String(mockadapter.history.post[0]?.data)) as unknown;
      expect(requestBody).toEqual(expectedBody);
      expect(rolleStore.errorCode).toBe('');
      expect(rolleStore.errors).toEqual(new Map());
      expect(rolleStore.loading).toBe(false);
    });

    it('should map multi errors by service provider id', async () => {
      mockadapter.onPost('/api/rolle/rolle-1/organisation/organisation-1/apply').replyOnce(500, {
        code: 500,
        idsWithI18nKeys: [
          {
            id: 'service-provider-1',
            i18nKey: 'ROLLENERWEITERUNG_TECHNICAL_ERROR',
            errorIdType: 'SERVICE_PROVIDER_ID',
          },
        ],
      });

      await rolleStore.persistRollenerweiterungenForRolle({
        rolleId: 'rolle-1',
        organisationId: 'organisation-1',
        existingServiceProviderIds: [],
        selectedServiceProviderIds: ['service-provider-1'],
      });

      expect(rolleStore.errors.get('service-provider-1')).toBe('ROLLENERWEITERUNG_TECHNICAL_ERROR');
      expect(rolleStore.loading).toBe(false);
    });

    it('should handle an unstructured error', async () => {
      mockadapter.onPost('/api/rolle/rolle-1/organisation/organisation-1/apply').replyOnce(500, 'server error');

      await rolleStore.persistRollenerweiterungenForRolle({
        rolleId: 'rolle-1',
        organisationId: 'organisation-1',
        existingServiceProviderIds: [],
        selectedServiceProviderIds: [],
      });

      expect(rolleStore.errorCode).toBe('UNSPECIFIED_ERROR');
      expect(rolleStore.loading).toBe(false);
    });

    it('should handle a structured non-multi error', async () => {
      mockadapter
        .onPost('/api/rolle/rolle-1/organisation/organisation-1/apply')
        .replyOnce(500, { code: 'ROLLE_EXTENSION_WRITE_ERROR' });

      await rolleStore.persistRollenerweiterungenForRolle({
        rolleId: 'rolle-1',
        organisationId: 'organisation-1',
        existingServiceProviderIds: [],
        selectedServiceProviderIds: [],
      });

      expect(rolleStore.errorCode).toBe('ROLLE_EXTENSION_WRITE_ERROR');
      expect(rolleStore.loading).toBe(false);
    });
  });

  describe('updateRolle', () => {
    it('should update Rolle and update state', async () => {
      const mockResponse: RolleWithServiceProvidersResponse = {
        administeredBySchulstrukturknoten: '1234',
        rollenart: 'LEHR',
        name: 'Updated Lehrer',
        merkmale: ['KOPERS_PFLICHT'],
        systemrechte: [{ name: 'ROLLEN_VERWALTEN', isTechnical: false }] as unknown as Set<SystemRechtResponse>,
        createdAt: '2022',
        updatedAt: '2023',
        id: '1',
        serviceProviders: [{ id: 'sp1', name: 'ServiceProvider1' }],
        administeredBySchulstrukturknotenName: null,
        administeredBySchulstrukturknotenKennung: null,
        version: 1,
      };

      mockadapter.onPut('/api/rolle/1').replyOnce(200, mockResponse);
      const updateRollePromise: Promise<void> = rolleStore.updateRolle(
        '1',
        'Updated Lehrer',
        ['KOPERS_PFLICHT'],
        ['ROLLEN_VERWALTEN'],
        ['sp1'],
        2,
      );
      expect(rolleStore.loading).toBe(true);
      await updateRollePromise;
      expect(rolleStore.updatedRolle).toEqual(mockResponse);
      expect(rolleStore.loading).toBe(false);
    });

    it('should handle string error on update', async () => {
      mockadapter.onPut('/api/rolle/1').replyOnce(500, 'some mock server error');
      const updateRollePromise: Promise<void> = rolleStore.updateRolle(
        '1',
        'Updated Lehrer',
        ['KOPERS_PFLICHT'],
        ['ROLLEN_VERWALTEN'],
        ['sp1'],
        2,
      );
      expect(rolleStore.loading).toBe(true);
      await updateRollePromise;
      expect(rolleStore.errorCode).toEqual('ROLLE_UPDATE_ERROR');
      expect(rolleStore.updatedRolle).toEqual(null);
      expect(rolleStore.loading).toBe(false);
    });

    it('should handle error code on update', async () => {
      mockadapter.onPut('/api/rolle/1').replyOnce(500, { code: 'some mock server error' });
      const updateRollePromise: Promise<void> = rolleStore.updateRolle(
        '1',
        'Updated Lehrer',
        ['KOPERS_PFLICHT'],
        ['ROLLEN_VERWALTEN'],
        ['sp1'],
        2,
      );
      expect(rolleStore.loading).toBe(true);
      await updateRollePromise;
      expect(rolleStore.errorCode).toEqual('some mock server error');
      expect(rolleStore.updatedRolle).toEqual(null);
      expect(rolleStore.loading).toBe(false);
    });

    describe('deleteRolle', () => {
      it('should delete Rolle and update state', async () => {
        mockadapter.onDelete('/api/rolle/1').replyOnce(200);
        const deleteRollePromise: Promise<void> = rolleStore.deleteRolleById('1');
        expect(rolleStore.loading).toBe(true);
        await deleteRollePromise;
        expect(rolleStore.loading).toBe(false);
      });

      it('should handle string error on update', async () => {
        mockadapter.onDelete('/api/rolle/1').replyOnce(500, 'some mock server error');
        const deleteRollePromise: Promise<void> = rolleStore.deleteRolleById('1');
        expect(rolleStore.loading).toBe(true);
        await deleteRollePromise;
        expect(rolleStore.errorCode).toEqual('ROLLE_ERROR');
        expect(rolleStore.loading).toBe(false);
      });

      it('should handle error code on update', async () => {
        mockadapter.onDelete('/api/rolle/1').replyOnce(500, { code: 'some mock server error' });
        const deleteRollePromise: Promise<void> = rolleStore.deleteRolleById('1');
        expect(rolleStore.loading).toBe(true);
        await deleteRollePromise;
        expect(rolleStore.errorCode).toEqual('some mock server error');
        expect(rolleStore.loading).toBe(false);
      });
    });
  });

  describe('getRollenForPersonenkontextCreation', () => {
    it('should load available Rollen and update state', async () => {
      const mockResponse: RolleResponse[] = [DoFactory.getRolleResponse(), DoFactory.getRolleResponse()];
      mockadapter.onGet(/\/api\/rolle\/for-personenkontext-creation/).replyOnce(200, mockResponse);

      const promise: Promise<void> = rolleStore.getRollenForPersonenkontextCreation({
        organisationId: 'organisation-1',
        offset: 0,
        limit: 20,
        rollenartOfUser: RollenArt.Lehr,
        rolleName: 'Lehrer',
        rollenIds: ['rolle-1', 'rolle-2'],
        systemrecht: RollenSystemRechtEnum.RollenVerwalten,
      });

      expect(rolleStore.loading).toBe(true);
      await promise;

      expect(rolleStore.rollenForPersonenkontextCreation).toEqual(mockResponse);
      expect(mockadapter.history.get[0]?.url).toContain('organisationId=organisation-1');
      expect(mockadapter.history.get[0]?.url).toContain('rollenIds=rolle-1');
      expect(mockadapter.history.get[0]?.url).toContain('rollenIds=rolle-2');
      expect(rolleStore.errorCode).toBe('');
      expect(rolleStore.loading).toBe(false);
    });

    it('should handle a structured error', async () => {
      mockadapter.onGet(/\/api\/rolle\/for-personenkontext-creation/).replyOnce(500, { code: 'ROLLE_ERROR_CODE' });

      await rolleStore.getRollenForPersonenkontextCreation({ organisationId: 'organisation-1' });

      expect(rolleStore.errorCode).toBe('ROLLE_ERROR_CODE');
      expect(rolleStore.loading).toBe(false);
    });

    it('should handle an unstructured error', async () => {
      mockadapter.onGet(/\/api\/rolle\/for-personenkontext-creation/).replyOnce(500, 'server error');

      await rolleStore.getRollenForPersonenkontextCreation({ organisationId: 'organisation-1' });

      expect(rolleStore.errorCode).toBe('ROLLE_ERROR');
      expect(rolleStore.loading).toBe(false);
    });
  });
});
