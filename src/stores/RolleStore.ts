import axiosApiInstance from '@/services/ApiService';
import { getResponseErrorCode, getRollenerweiterungErrors } from '@/utils/errorHandlers';
import { type AxiosResponse } from 'axios';
import { defineStore, type Store, type StoreDefinition } from 'pinia';
import {
  RolleApiFactory,
  RolleControllerFindRollenAvailableForPersonAdministration200Response,
  RollenArt,
  RollenMerkmal,
  RollenSystemRechtEnum,
  type ApplyRollenerweiterungChangesBodyParams,
  type CreateRolleBodyParams,
  type DbiamApplyRollenerweiterungMultiErrorIdsWithI18nKeysInnerI18nKeyEnum,
  type RolleApiInterface,
  type RolleResponse,
  type RolleWithServiceProvidersResponse,
  type ServiceProviderIdNameResponse,
  type ServiceProviderResponse,
  type SystemRechtResponse,
  type UpdateRolleBodyParams,
} from '../api-client/generated/api';
import type { BaseServiceProvider } from './ServiceProviderStore';

const rolleApi: RolleApiInterface = RolleApiFactory(undefined, '', axiosApiInstance);

type RolleState = {
  createdRolle: Rolle | null;
  updatedRolle: RolleWithServiceProvidersResponse | null;
  currentRolle: Rolle | null;
  currentMptRolle: Rolle | null;
  allRollen: Array<RolleWithServiceProvidersResponse>;
  rollenForPersonAdministration: Array<RolleResponse>;
  totalRollenForPersonAdministration: number;
  rollenerweiterungServiceProviders: Array<ServiceProviderResponse>;
  errorCode: string;
  loading: boolean;
  totalRollen: number;
  errors: Map<string, DbiamApplyRollenerweiterungMultiErrorIdsWithI18nKeysInnerI18nKeyEnum>;
};

type RolleGetters = object;
type RollenForPersonAdministrationParams = {
  searchStr?: string;
  limit?: number;
  offset?: number;
  organisationIds?: string[];
  systemrechte?: RollenSystemRechtEnum[];
};

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
  getRollenForPersonAdministration: (params: RollenForPersonAdministrationParams) => Promise<void>;
  getMptRolleById: (rolleId: string, organisationId: string) => Promise<void>;
  getRollenerweiterungenForRolle: (rolleId: string, organisationId: string) => Promise<void>;
  persistRollenerweiterungenForRolle: (filter: PersistRollenerweiterungForRolle) => Promise<void>;
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
  merkmale: RollenMerkmal[];
  name: string;
  rollenart: RollenArt;
  systemrechte?: Set<RollenSystemRechtEnum>;
  serviceProviders?: Array<ServiceProviderIdNameResponse>;
  version: number;
};

function mapRolleResponseToRolle(response: RolleResponse): Rolle {
  return {
    administeredBySchulstrukturknoten: response.administeredBySchulstrukturknoten,
    id: response.id,
    merkmale: response.merkmale,
    name: response.name,
    rollenart: response.rollenart,
    systemrechte: new Set(response.systemrechte.map((recht: SystemRechtResponse) => recht.name)),
    version: response.version,
  };
}

function mapRolleWithServiceProvidersResponseToRolle(response: RolleWithServiceProvidersResponse): Rolle {
  return {
    ...mapRolleResponseToRolle(response),
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

export type PersistRollenerweiterungForRolle = {
  rolleId: string;
  organisationId: string;
  existingServiceProviderIds: Array<string>;
  selectedServiceProviderIds: Array<string>;
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
        currentMptRolle: null,
        allRollen: [],
        rollenForPersonAdministration: [],
        totalRollenForPersonAdministration: 0,
        rollenerweiterungServiceProviders: [],
        errorCode: '',
        loading: false,
        totalRollen: 0,
        errors: new Map<string, DbiamApplyRollenerweiterungMultiErrorIdsWithI18nKeysInnerI18nKeyEnum>(),
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
          this.createdRolle = mapRolleResponseToRolle(data);
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
          this.currentRolle = mapRolleWithServiceProvidersResponseToRolle(data);
        } catch (error) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },

      async getRollenForPersonAdministration(params: RollenForPersonAdministrationParams): Promise<void> {
        this.loading = true;
        this.errorCode = '';
        try {
          const response: AxiosResponse<RolleControllerFindRollenAvailableForPersonAdministration200Response> =
            await rolleApi.rolleControllerFindRollenAvailableForPersonAdministration(
              params.offset,
              params.limit,
              params.searchStr,
              params.organisationIds,
              params.systemrechte,
            );
          this.rollenForPersonAdministration = response.data.items;
          this.totalRollenForPersonAdministration = response.data.total;
        } catch (error) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },

      async getMptRolleById(rolleId: string, organisationId: string): Promise<void> {
        this.loading = true;
        this.errorCode = '';
        this.currentMptRolle = null;
        try {
          const rolleFromList: RolleWithServiceProvidersResponse | undefined = this.allRollen.find(
            (rolle: RolleWithServiceProvidersResponse): boolean => rolle.id === rolleId,
          );
          if (rolleFromList) {
            this.currentMptRolle = mapRolleResponseToRolle(rolleFromList);
            return;
          }

          const { data }: AxiosResponse<Array<RolleWithServiceProvidersResponse>> =
            await rolleApi.rolleControllerFindRollen(
              undefined,
              undefined,
              undefined,
              undefined,
              [organisationId],
              [rolleId],
              [RollenSystemRechtEnum.MptRollenVerwalten],
            );
          const rolle: RolleWithServiceProvidersResponse | undefined = data[0];
          if (!rolle) {
            this.errorCode = 'UNSPECIFIED_ERROR';
            return;
          }
          this.currentMptRolle = mapRolleResponseToRolle(rolle);
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },

      async getRollenerweiterungenForRolle(rolleId: string, organisationId: string): Promise<void> {
        this.loading = true;
        this.errorCode = '';
        this.rollenerweiterungServiceProviders = [];
        try {
          const { data }: { data: Array<ServiceProviderResponse> } =
            await rolleApi.rolleControllerFindRollenerweiterungenForRolleAndOrga(rolleId, organisationId);
          this.rollenerweiterungServiceProviders = data;
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },

      async persistRollenerweiterungenForRolle(filter: PersistRollenerweiterungForRolle): Promise<void> {
        this.loading = true;
        this.errorCode = '';
        this.errors.clear();
        try {
          const bodyParams: ApplyRollenerweiterungChangesBodyParams = {
            addErweiterungenForServiceProviderIds: filter.selectedServiceProviderIds.filter(
              (id: string): boolean => !filter.existingServiceProviderIds.includes(id),
            ),
            removeErweiterungenForServiceProviderIds: filter.existingServiceProviderIds.filter(
              (id: string): boolean => !filter.selectedServiceProviderIds.includes(id),
            ),
          };
          await rolleApi.rolleControllerApplyRollenerweiterungChangesForRolle(
            filter.rolleId,
            filter.organisationId,
            bodyParams,
          );
        } catch (error: unknown) {
          const rollenerweiterungErrors: Map<
            string,
            DbiamApplyRollenerweiterungMultiErrorIdsWithI18nKeysInnerI18nKeyEnum
          > | null =
            getRollenerweiterungErrors<DbiamApplyRollenerweiterungMultiErrorIdsWithI18nKeysInnerI18nKeyEnum>(error);
          if (rollenerweiterungErrors) {
            this.errors = rollenerweiterungErrors;
          } else {
            this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
          }
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
