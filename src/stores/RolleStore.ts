import axiosApiInstance from '@/services/ApiService';
import { getResponseErrorCode } from '@/utils/errorHandlers';
import { type AxiosResponse } from 'axios';
import { defineStore, type Store, type StoreDefinition } from 'pinia';
import {
  RolleApiFactory,
  RollenArt,
  RollenMerkmal,
  RollenSystemRechtEnum,
  type CreateRolleBodyParams,
  type RolleApiInterface,
  type RolleResponse,
  type RolleWithServiceProvidersResponse,
  type ServiceProviderIdNameResponse,
  type SystemRechtResponse,
  type UpdateRolleBodyParams,
} from '../api-client/generated/api';
import type { BaseServiceProvider } from './ServiceProviderStore';

const rolleApi: RolleApiInterface = RolleApiFactory(undefined, '', axiosApiInstance);

type RolleState = {
  createdRolle: Rolle | null;
  updatedRolle: RolleWithServiceProvidersResponse | null;
  currentRolle: Rolle | null;
  allRollen: Array<RolleWithServiceProvidersResponse>;
  errorCode: string;
  loading: boolean;
  totalRollen: number;
};

type RolleGetters = object;
type RolleActions = {
  createRolle: (
    rollenName: string,
    administrationsebene: string,
    rollenArt: RollenArt,
    merkmale: RollenMerkmal[],
    systemrechte: RollenSystemRechtEnum[],
    serviceProvider: string[],
  ) => Promise<void>;
  getAllRollen: (filter: RolleFilter) => Promise<void>;
  getRolleById: (rolleId: string) => Promise<void>;
  updateRolle: (
    rolleId: string,
    rollenName: string,
    merkmale: RollenMerkmal[],
    systemrechte: RollenSystemRechtEnum[],
    serviceProviderIds: string[],
    version: number,
  ) => Promise<void>;
  deleteRolleById: (rolleId: string) => Promise<void>;
};

export { RollenArt, RollenMerkmal, RollenSystemRechtEnum as RollenSystemRecht };
export type { RolleResponse, RolleWithServiceProvidersResponse };

export type Rolle = {
  administeredBySchulstrukturknoten: string;
  id: string;
  merkmale: Set<RollenMerkmal>;
  name: string;
  rollenart: RollenArt;
  systemrechte?: Set<RollenSystemRechtEnum>;
  serviceProviders?: Array<ServiceProviderIdNameResponse>;
  version: number;
};

function mapRolleResponseToRolle(response: RolleWithServiceProvidersResponse): Rolle {
  return {
    administeredBySchulstrukturknoten: response.administeredBySchulstrukturknoten,
    id: response.id,
    merkmale: new Set(response.merkmale),
    name: response.name,
    rollenart: response.rollenart,
    systemrechte: new Set(Array.from(response.systemrechte).map((recht: SystemRechtResponse) => recht.name)),
    version: response.version,
    serviceProviders: response.serviceProviders,
  };
}

export type RolleTableItem = {
  administeredBySchulstrukturknoten: string;
  id: string;
  merkmale: string;
  name: string;
  rollenart: string;
  createdAt?: string;
  updatedAt?: string;
};

export type RolleFormType = {
  selectedAdministrationsebene: string | undefined;
  selectedRollenArt: RollenArt;
  selectedRollenName: string | undefined;
  selectedMerkmale: RollenMerkmal[] | string[];
  selectedServiceProviders: BaseServiceProvider[] | string[];
  selectedSystemRechte: RollenSystemRechtEnum[] | string[];
};

export type RolleFilter = {
  limit?: number;
  offset?: number;
  searchString?: string;
  organisationContextForOperation?: string;
  organisationenForFilter?: string[];
  rolleIds?: string[];
  systemrechte?: RollenSystemRechtEnum[];
  rollenarten?: Array<RollenArt>;
  merkmale?: Array<RollenMerkmal>;
  serviceProviderIds?: Array<string>;
};

export type RolleStore = Store<'rolleStore', RolleState, RolleGetters, RolleActions>;

export const useRolleStore: StoreDefinition<'rolleStore', RolleState, RolleGetters, RolleActions> = defineStore(
  'rolleStore',
  {
    state: (): RolleState => {
      return {
        createdRolle: null,
        updatedRolle: null,
        currentRolle: null,
        allRollen: [],
        errorCode: '',
        loading: false,
        totalRollen: 0,
      };
    },
    actions: {
      async createRolle(
        rollenName: string,
        administrationsebene: string,
        rollenArt: RollenArt,
        merkmale: RollenMerkmal[],
        systemrechte: RollenSystemRechtEnum[],
        serviceProvider: string[],
      ): Promise<void> {
        this.loading = true;
        try {
          // Construct the body params object
          const createRolleBodyParams: CreateRolleBodyParams = {
            name: rollenName,
            administeredBySchulstrukturknoten: administrationsebene,
            rollenart: rollenArt,
            // TODO Remove casting when generator issue is fixed from the server side
            merkmale: merkmale as unknown as Set<RollenMerkmal>,
            systemrechte: systemrechte as unknown as Set<RollenSystemRechtEnum>,
            serviceProviderIds: serviceProvider as unknown as Set<string>,
          };
          const { data }: { data: RolleResponse } = await rolleApi.rolleControllerCreateRolle(createRolleBodyParams);
          const receivedSystemrechte: Set<RollenSystemRechtEnum> = new Set(
            Array.from(data.systemrechte).map((recht: SystemRechtResponse) => recht.name),
          );
          this.createdRolle = { ...data, systemrechte: receivedSystemrechte };
          this.currentRolle = this.createdRolle;
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'ROLLE_ERROR');
        } finally {
          this.loading = false;
        }
      },

      async getAllRollen(filter: RolleFilter) {
        this.loading = true;
        try {
          const response: AxiosResponse<Array<RolleWithServiceProvidersResponse>> =
            await rolleApi.rolleControllerFindRollen(
              filter.offset,
              filter.limit,
              filter.searchString,
              filter.organisationContextForOperation,
              filter.organisationenForFilter,
              filter.rolleIds,
              filter.systemrechte,
              filter.rollenarten,
              filter.merkmale,
              filter.serviceProviderIds,
            );
          this.allRollen = response.data;
          this.totalRollen = +response.headers['x-paging-total'];
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },

      async getRolleById(rolleId: string): Promise<void> {
        this.loading = true;
        this.errorCode = '';
        try {
          const { data }: { data: RolleWithServiceProvidersResponse } =
            await rolleApi.rolleControllerFindRolleByIdWithServiceProviders(rolleId);
          this.currentRolle = mapRolleResponseToRolle(data);
        } catch (error) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },

      async updateRolle(
        rolleId: string,
        rollenName: string,
        merkmale: RollenMerkmal[],
        systemrechte: RollenSystemRechtEnum[],
        serviceProviderIds: string[],
        version: number,
      ): Promise<void> {
        this.loading = true;
        this.errorCode = '';
        try {
          const updateRolleBodyParams: UpdateRolleBodyParams = {
            name: rollenName,
            merkmale: merkmale as unknown as Set<RollenMerkmal>,
            systemrechte: systemrechte as unknown as Set<RollenSystemRechtEnum>,
            serviceProviderIds: serviceProviderIds as unknown as Set<string>,
            version: version,
          };
          const { data }: { data: RolleWithServiceProvidersResponse } = await rolleApi.rolleControllerUpdateRolle(
            rolleId,
            updateRolleBodyParams,
          );
          this.updatedRolle = data;
        } catch (error) {
          this.errorCode = getResponseErrorCode(error, 'ROLLE_UPDATE_ERROR');
        } finally {
          this.loading = false;
        }
      },

      async deleteRolleById(rolleId: string): Promise<void> {
        this.loading = true;
        this.errorCode = '';
        try {
          await rolleApi.rolleControllerDeleteRolle(rolleId);
        } catch (error) {
          this.errorCode = getResponseErrorCode(error, 'ROLLE_ERROR');
        } finally {
          this.loading = false;
        }
      },
    },
  },
);
