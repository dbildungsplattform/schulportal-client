import { RollenSystemRechtEnum, type SystemRechtResponse } from '@/api-client/generated/api';
import axiosApiInstance from '@/services/ApiService';
import MockAdapter from 'axios-mock-adapter';
import { setActivePinia, createPinia } from 'pinia';
import { useMasterDataStore, MasterDataStatus, type MasterDataStore } from './MasterDataStore';

const mockadapter: MockAdapter = new MockAdapter(axiosApiInstance);

describe('MasterDataStore', () => {
  let store: MasterDataStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    mockadapter.reset();
    store = useMasterDataStore();
  });

  it('should initialize with default state', () => {
    expect(store.systemrechte).toEqual([]);
    expect(store.status).toBe(MasterDataStatus.Uninitialized);
  });

  it('should set status to Initialized and populate systemrechte on successful initialise', async () => {
    const response: SystemRechtResponse[] = [
      { name: RollenSystemRechtEnum.PersonenVerwalten, isTechnical: false },
      { name: RollenSystemRechtEnum.KlassenVerwalten, isTechnical: false },
      { name: RollenSystemRechtEnum.CronDurchfuehren, isTechnical: true },
    ];
    mockadapter.onGet('/api/rolle/systemrechte').reply(200, response);

    await store.initialise();

    expect(store.status).toBe(MasterDataStatus.Initialized);
    expect(store.systemrechte).toHaveLength(3);
    expect(store.systemrechte[0]?.name).toBe(RollenSystemRechtEnum.PersonenVerwalten);
    expect(store.systemrechte[0]?.isTechnical).toBe(false);
  });

  it('should set status to Failed on initialise error', async () => {
    mockadapter.onGet('/rolle/systemrechte').reply(500);

    await store.initialise();

    expect(store.status).toBe(MasterDataStatus.Failed);
    expect(store.systemrechte).toEqual([]);
  });

  it('isInitialized should return true only if status is Initialized', () => {
    expect(store.isInitialized()).toBe(false);
    store.status = MasterDataStatus.Initialized;
    expect(store.isInitialized()).toBe(true);
  });

  it('isHiddenSystemrecht should return correct isTechnical value', async () => {
    const response: SystemRechtResponse[] = [
      { name: RollenSystemRechtEnum.PersonenVerwalten, isTechnical: false },
      { name: RollenSystemRechtEnum.KlassenVerwalten, isTechnical: false },
      { name: RollenSystemRechtEnum.CronDurchfuehren, isTechnical: true },
    ];
    mockadapter.onGet('/api/rolle/systemrechte').reply(200, response);
    await store.initialise();
    expect(store.isHiddenSystemrecht(RollenSystemRechtEnum.PersonenVerwalten)).toBe(false);
    expect(store.isHiddenSystemrecht(RollenSystemRechtEnum.KlassenVerwalten)).toBe(false);
    expect(store.isHiddenSystemrecht(RollenSystemRechtEnum.CronDurchfuehren)).toBe(true);
  });
});
