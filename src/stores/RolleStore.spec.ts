import MockAdapter from 'axios-mock-adapter';
import { createPinia, setActivePinia } from 'pinia';
import {
  RollenMerkmal,
  type RolleResponse,
  type RolleWithServiceProvidersResponse,
  type SystemRechtResponse,
} from '../api-client/generated/api';
import { useRolleStore, type RolleStore } from './RolleStore';

import axiosApiInstance from '@/services/ApiService';

const mockadapter: MockAdapter = new MockAdapter(axiosApiInstance);

describe('rolleStore', () => {
  let rolleStore: RolleStore;
  beforeEach(() => {
    setActivePinia(createPinia());
    rolleStore = useRolleStore();
    mockadapter.reset();
  });

  it('should initalize state correctly', () => {
    expect(rolleStore.createdRolle).toEqual(null);
    expect(rolleStore.allRollen).toEqual([]);
    expect(rolleStore.errorCode).toEqual('');
    expect(rolleStore.loading).toBe(false);
  });

  describe('createRolle', () => {
    it('should create rolle and update state', async () => {
      const mockResponse: RolleResponse = {
        administeredBySchulstrukturknoten: '1234',
        rollenart: 'LEHR',
        name: 'Lehrer',
        // TODO remove type casting when generator is fixed
        merkmale: ['KOPERS_PFLICHT'] as unknown as Set<RollenMerkmal>,
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
          // TODO: remove type casting when generator is fixed
          merkmale: ['KOPERS_PFLICHT'] as unknown as Set<RollenMerkmal>,
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
        merkmale: ['KOPERS_PFLICHT'] as unknown as Set<RollenMerkmal>,
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
        merkmale: new Set(['KOPERS_PFLICHT']),
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

  describe('updateRolle', () => {
    it('should update Rolle and update state', async () => {
      const mockResponse: RolleWithServiceProvidersResponse = {
        administeredBySchulstrukturknoten: '1234',
        rollenart: 'LEHR',
        name: 'Updated Lehrer',
        merkmale: ['KOPERS_PFLICHT'] as unknown as Set<RollenMerkmal>,
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
});
