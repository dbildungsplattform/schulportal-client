import { defineStore, type Store, type StoreDefinition } from 'pinia';
import { RolleApiFactory, type RolleApiInterface, type SystemRechtResponse } from '../api-client/generated/api';
import axiosApiInstance from '@/services/ApiService';
import { type SystemRechtType } from './types/Systemrecht';

const rolleApi: RolleApiInterface = RolleApiFactory(undefined, '', axiosApiInstance);

export enum MasterDataStatus {
  Uninitialized = 'UNINITIALIZED',
  Initialized = 'INITIALIZED',
  Failed = 'FAILED',
}

export type MasterDataState = {
  systemrechte: SystemRechtType[];
  status: MasterDataStatus;
};

type MasterDataGetters = object;
type MasterDataActions = {
  initialise: () => Promise<void>;
  isInitialized: () => boolean;
  isHiddenSystemrecht: (enumValue: string) => boolean;
};

export type MasterDataStore = Store<'masterDataStore', MasterDataState, MasterDataGetters, MasterDataActions>;

export const useMasterDataStore: StoreDefinition<
  'masterDataStore',
  MasterDataState,
  MasterDataGetters,
  MasterDataActions
> = defineStore('masterDataStore', {
  state: (): MasterDataState => {
    return {
      systemrechte: [],
      status: MasterDataStatus.Uninitialized,
    };
  },
  actions: {
    initialise: async function (): Promise<void> {
      try {
        const { data }: { data: SystemRechtResponse[] } = await rolleApi.rolleControllerGetAllSystemrechte();
        this.systemrechte = data;
        this.status = MasterDataStatus.Initialized;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        this.status = MasterDataStatus.Failed;
      }
    },
    isInitialized: function (): boolean {
      return this.status === MasterDataStatus.Initialized;
    },
    isHiddenSystemrecht: function (enumValue: string): boolean {
      const systemrechteTmp: SystemRechtType[] = this.systemrechte;
      return systemrechteTmp.find((sr: SystemRechtType) => sr.name === enumValue)?.isTechnical || false;
    },
  },
});
