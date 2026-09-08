import type { AxiosError, AxiosResponse } from 'axios';
import { defineStore, type Store, type StoreDefinition } from 'pinia';

import type { ServiceProviderFormSubmitData } from '@/components/admin/service-provider/types';
import axiosApiInstance from '@/services/ApiService';
import { getResponseErrorCode } from '@/utils/errorHandlers';
import {
  DbiamApplyRollenerweiterungMultiErrorRolleIdsWithI18nKeysInnerI18nKeyEnum,
  ProviderApiFactory,
  RolleApiFactory,
  RollenArt,
  ServiceProviderKategorie,
  ServiceProviderMerkmal,
  VidisApiFactory,
  type ApplyRollenerweiterungBodyParams,
  type CreateServiceProviderBodyParams,
  type CreateServiceProviderResponse,
  type DbiamApplyRollenerweiterungMultiError,
  type DbiamApplyRollenerweiterungMultiErrorRolleIdsWithI18nKeysInner,
  type ManageableServiceProviderResponse,
  type ManageableServiceProviderSimpleListEntryResponse,
  type ProviderApiInterface,
  type ProviderControllerFindRollenerweiterungenByServiceProviderId200Response,
  type ProviderControllerGetManageableLandRootServiceProviders200Response,
  type ProviderControllerGetManageableServiceProviders200Response,
  type ProviderControllerGetManageableServiceProvidersForOrganisationId200Response,
  type RolleApiInterface,
  type RollenerweiterungForManageableServiceProviderResponse,
  type ServiceProviderResponse,
  type UpdateServiceProviderBodyParams,
  type VidisApiInterface,
} from '../api-client/generated/api';
import type { RollenSystemRecht } from './RolleStore';

const serviceProviderApi: ProviderApiInterface = ProviderApiFactory(undefined, '', axiosApiInstance);
const rolleApi: RolleApiInterface = RolleApiFactory(undefined, '', axiosApiInstance);
const vidisApi: VidisApiInterface = VidisApiFactory(undefined, '', axiosApiInstance);

export type BaseServiceProvider = {
  id: string;
  name: string;
  kategorie: ServiceProviderKategorie;
  requires2fa: boolean;
};

export type StartPageServiceProvider = BaseServiceProvider & {
  url?: string;
  hasLogo: boolean;
  target: string;
  // Could be undefined if the logo is not provided by the backend
  logoUrl?: string;
  logoId?: number;
};

type ManageableServiceProviderDetails = {
  vidisAngebotId?: string;
  merkmale: Array<ServiceProviderMerkmal>;
  administrationsebene: { id: string; name: string; kennung?: string };
  rollen: Array<{ id: string; name: string }>;
  rollenartenWhitelist?: Array<RollenArt>;
};

export type ManageableServiceProviderSimpleListEntry = BaseServiceProvider &
  ManageableServiceProviderDetails & {
    hasRollenerweiterungen: boolean;
    hasSomeVerwaltenPermission: boolean;
  };

export type ManageableServiceProviderListEntry = BaseServiceProvider &
  ManageableServiceProviderDetails & {
    rollenerweiterungen: RollenerweiterungForManageableServiceProviderResponse[];
    hasSomeVerwaltenPermission: boolean;
  };

export type ManageableServiceProviderDetail = BaseServiceProvider &
  ManageableServiceProviderDetails & {
    url: string;
    logoId: number | undefined;
    availableForRollenerweiterung: boolean;
    relevantSystemrechte: Array<RollenSystemRecht>;
  };

export type RollenerweiterungMap = {
  id: string;
  kennung: string;
  schule: string;
  rollen: Set<string>;
};

export type RollenErweiterungenUebersicht = {
  id: string;
  kennung: string;
  schule: string;
  rollenerweiterungen: string;
};

export { ServiceProviderMerkmal };

export type ServiceProviderIdNameResponse = {
  id: string;
  name: string;
};

export type ServiceProviderRollenVerwaltungFilter = {
  offset?: number;
  limit?: number;
  searchStr?: string;
};

export type RollenerweiterungFilter = {
  serviceProviderId: string;
  organisationIds?: string[];
  rolleIds?: string[];
  limit?: number;
  offset?: number;
};

export type PersistRollenerweiterung = {
  serviceProviderId: string;
  organisationId: string;
  addErweiterungenForRolleIds: Array<string>;
  removeErweiterungenForRolleIds: Array<string>;
};

export type ServiceProviderCreationFilter = {
  organisationId: string;
  name: string;
  url: string;
  logoId?: number;
  kategorie: ServiceProviderKategorie;
  requires2fa: boolean;
  merkmale: Array<ServiceProviderMerkmal>;
  rollenartenWhitelist?: Array<RollenArt>;
};

export type ManageableServiceProviderFilter = {
  kategorien: Array<ServiceProviderKategorie>;
  searchFilter?: string;
  page: number;
  entriesPerPage: number;
};

export type CreatedServiceProvider = BaseServiceProvider & {
  url: string;
  merkmale: Array<ServiceProviderMerkmal>;
  logoId?: number;
  rollenartenWhitelist?: Array<RollenArt>;
};

export type UpdatedServiceProvider = BaseServiceProvider & {
  url?: string;
  merkmale: Array<ServiceProviderMerkmal>;
  logoId?: number;
  rollenartenWhitelist?: Array<RollenArt>;
};

type ServiceProviderState = {
  allServiceProviders: StartPageServiceProvider[];
  availableServiceProviders: StartPageServiceProvider[];
  manageableServiceProviders: ManageableServiceProviderSimpleListEntryResponse[];
  manageableServiceProvidersForOrganisation: ManageableServiceProviderListEntry[];
  serviceProvidersForRollenVerwaltung: ServiceProviderIdNameResponse[];
  totalServiceProvidersForRollenVerwaltung: number;
  totalManageableServiceProviders: number;
  totalManageableServiceProvidersForOrganisation: number;
  currentServiceProvider: ManageableServiceProviderDetail | null;
  updatedServiceProvider: UpdatedServiceProvider | null;
  serviceProviderLogos: Map<string, string>;
  rollenerweiterungen: ProviderControllerFindRollenerweiterungenByServiceProviderId200Response | null;
  // ready-to-display, grouped for the result table:
  rollenerweiterungenUebersicht: RollenErweiterungenUebersicht[];
  createdServiceProvider: CreatedServiceProvider | null;
  errorCode: string;
  loading: boolean;
  errors: Map<string, DbiamApplyRollenerweiterungMultiErrorRolleIdsWithI18nKeysInnerI18nKeyEnum>;
};

function containsMultiError(error: unknown): error is AxiosError<DbiamApplyRollenerweiterungMultiError> {
  const domainError: DbiamApplyRollenerweiterungMultiError | undefined = (error as AxiosError)?.response?.data as
    | DbiamApplyRollenerweiterungMultiError
    | undefined;
  if (!domainError) {
    return false;
  }
  if (typeof domainError !== 'object') {
    return false;
  }
  if (!('code' in domainError)) {
    return false;
  }
  if (!(typeof domainError.code === 'string' || typeof domainError.code === 'number')) {
    return false;
  }
  if (!('rolleIdsWithI18nKeys' in domainError)) {
    return false;
  }
  if (!Array.isArray(domainError.rolleIdsWithI18nKeys)) {
    return false;
  }
  return true;
}

type ServiceProviderGetters = object;
type ServiceProviderActions = {
  getAssignableServiceProvidersForRolleByOrganisationId: (administeredBySchulstrukturknoten: string) => Promise<void>;
  getAvailableServiceProviders: () => Promise<void>;
  getManageableServiceProviders: (filter: ManageableServiceProviderFilter) => Promise<void>;
  getManageableServiceProvidersForOrganisation: (
    organisationId: string,
    page: number,
    entriesPerPage: number,
  ) => Promise<void>;
  getManageableServiceProviderById: (serviceProviderId: string) => Promise<void>;
  getServiceProvidersForRollenVerwaltung: (filter?: ServiceProviderRollenVerwaltungFilter) => Promise<void>;
  getServiceProviderLogoById: (serviceProviderId: string) => Promise<void>;
  getRollenerweiterungenById: (filter: RollenerweiterungFilter) => Promise<void>;
  persistRollenerweiterungenForServiceProvider: (filter: PersistRollenerweiterung) => Promise<void>;
  createServiceProvider: (filter: ServiceProviderCreationFilter) => Promise<void>;
  updateServiceProvider: (id: string, value: Partial<ServiceProviderFormSubmitData>) => Promise<void>;
  deleteServiceProvider: (id: string) => Promise<void>;
  syncServiceProvidersForSchule: (id: string) => Promise<void>;
};

export { ServiceProviderKategorie };

export type ServiceProviderStore = Store<
  'serviceProviderStore',
  ServiceProviderState,
  ServiceProviderGetters,
  ServiceProviderActions
>;

export const useServiceProviderStore: StoreDefinition<
  'serviceProviderStore',
  ServiceProviderState,
  ServiceProviderGetters,
  ServiceProviderActions
> = defineStore('serviceProviderStore', {
  state: (): ServiceProviderState => {
    return {
      allServiceProviders: [],
      availableServiceProviders: [],
      manageableServiceProviders: [],
      manageableServiceProvidersForOrganisation: [],
      serviceProvidersForRollenVerwaltung: [],
      totalServiceProvidersForRollenVerwaltung: 0,
      totalManageableServiceProviders: 0,
      totalManageableServiceProvidersForOrganisation: 0,
      currentServiceProvider: null,
      updatedServiceProvider: null,
      serviceProviderLogos: new Map<string, string>(),
      rollenerweiterungen: null,
      rollenerweiterungenUebersicht: [],
      createdServiceProvider: null,
      errorCode: '',
      loading: false,
      errors: new Map<string, DbiamApplyRollenerweiterungMultiErrorRolleIdsWithI18nKeysInnerI18nKeyEnum>(),
    };
  },
  actions: {
    async getAssignableServiceProvidersForRolleByOrganisationId(administeredBySchulstrukturknoten: string) {
      this.loading = true;
      try {
        this.allServiceProviders = [];
        const { data }: AxiosResponse<ServiceProviderResponse[]> =
          await serviceProviderApi.providerControllerGetAssignableServiceProvidersForRolle(
            administeredBySchulstrukturknoten,
          );
        this.allServiceProviders = data;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async getAvailableServiceProviders() {
      this.loading = true;
      try {
        const { data }: { data: StartPageServiceProvider[] } =
          await serviceProviderApi.providerControllerGetAvailableServiceProviders();
        this.availableServiceProviders = data;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async getManageableServiceProviders(filter: ManageableServiceProviderFilter) {
      this.loading = true;
      try {
        const limit: number = filter.entriesPerPage;
        const offset: number = (filter.page - 1) * filter.entriesPerPage;
        const response: ProviderControllerGetManageableServiceProviders200Response = (
          await serviceProviderApi.providerControllerGetManageableServiceProviders(
            offset,
            limit,
            filter.kategorien,
            filter.searchFilter,
          )
        ).data;
        const { items, total }: ProviderControllerGetManageableServiceProviders200Response = response;
        this.manageableServiceProviders = items;
        this.totalManageableServiceProviders = total;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async getManageableServiceProvidersForOrganisation(organisationId: string, page: number, entriesPerPage: number) {
      this.loading = true;
      try {
        const limit: number = entriesPerPage;
        const offset: number = (page - 1) * entriesPerPage;
        const response: ProviderControllerGetManageableServiceProvidersForOrganisationId200Response = (
          await serviceProviderApi.providerControllerGetManageableServiceProvidersForOrganisationId(
            organisationId,
            offset,
            limit,
          )
        ).data;
        const { items, total }: ProviderControllerGetManageableServiceProvidersForOrganisationId200Response = response;
        this.manageableServiceProvidersForOrganisation = items;
        this.totalManageableServiceProvidersForOrganisation = total;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async getManageableServiceProviderById(serviceProviderId: string) {
      this.loading = true;
      try {
        const { data }: { data: ManageableServiceProviderResponse } =
          await serviceProviderApi.providerControllerGetManageableServiceProviderById(serviceProviderId);
        this.currentServiceProvider = data;
      } catch (error) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async getServiceProvidersForRollenVerwaltung(filter?: ServiceProviderRollenVerwaltungFilter) {
      this.loading = true;
      this.serviceProvidersForRollenVerwaltung = [];
      this.totalServiceProvidersForRollenVerwaltung = 0;
      try {
        const response: ProviderControllerGetManageableLandRootServiceProviders200Response = (
          await serviceProviderApi.providerControllerGetManageableLandRootServiceProviders(
            filter?.offset,
            filter?.limit,
            filter?.searchStr,
          )
        ).data;

        this.serviceProvidersForRollenVerwaltung = response.items.map((serviceProvider: ServiceProviderResponse) => ({
          id: serviceProvider.id,
          name: serviceProvider.name,
        }));
        this.totalServiceProvidersForRollenVerwaltung = response.total;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async getServiceProviderLogoById(serviceProviderId: string) {
      this.loading = true;
      try {
        const response: { data: Blob } = await serviceProviderApi.providerControllerGetServiceProviderLogo(
          serviceProviderId,
          { responseType: 'blob' },
        );

        // Convert Blob to base64 string - wrapped in a promise for async/await usage
        const logoUrl: string = await new Promise<string>(
          (resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void) => {
            const reader: FileReader = new FileReader();
            reader.onload = (): void => {
              resolve(reader.result as string);
            };
            reader.onerror = (): void => {
              reject(new Error('Failed to read blob'));
            };
            reader.readAsDataURL(response.data);
          },
        );

        this.serviceProviderLogos.set(serviceProviderId, logoUrl);
      } catch (error: unknown) {
        // Just log that the logo failed to load because there is a fallback logo in the UI
        // eslint-disable-next-line no-console
        console.warn(`Failed to load logo for service provider ${serviceProviderId}:`, error);
      } finally {
        this.loading = false;
      }
    },

    async getRollenerweiterungenById(filter: RollenerweiterungFilter): Promise<void> {
      this.loading = true;
      try {
        const { data }: { data: ProviderControllerFindRollenerweiterungenByServiceProviderId200Response } =
          await serviceProviderApi.providerControllerFindRollenerweiterungenByServiceProviderId(
            filter.serviceProviderId,
            filter.offset,
            filter.limit,
            filter.organisationIds,
            filter.rolleIds,
          );

        this.rollenerweiterungen = data;

        // transform into displayable overview grouped by organisationId
        const rollenerweiterungMap: Map<string, RollenerweiterungMap> = new Map<string, RollenerweiterungMap>();

        for (const item of data.items ?? []) {
          const orgId: string = item.organisationId;
          if (!rollenerweiterungMap.has(orgId)) {
            rollenerweiterungMap.set(orgId, {
              id: orgId,
              kennung: item.organisationKennung,
              schule: item.organisationName,
              rollen: new Set<string>(),
            });
          }

          rollenerweiterungMap.get(orgId)!.rollen.add(item.rolleName);
        }
        // build the final array expected by the table
        const rollenerweiterungenUebersicht: RollenErweiterungenUebersicht[] = Array.from(
          rollenerweiterungMap.values(),
        ).map((g: RollenerweiterungMap) => ({
          id: g.id,
          kennung: g.kennung,
          schule: g.schule,
          rollenerweiterungen: Array.from(g.rollen).join(', '),
        }));
        this.rollenerweiterungenUebersicht = rollenerweiterungenUebersicht;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async persistRollenerweiterungenForServiceProvider(filter: PersistRollenerweiterung): Promise<void> {
      this.loading = true;
      try {
        const bodyParams: ApplyRollenerweiterungBodyParams = {
          addErweiterungenForRolleIds: filter.addErweiterungenForRolleIds,
          removeErweiterungenForRolleIds: filter.removeErweiterungenForRolleIds,
        };
        await rolleApi.rollenerweiterungControllerApplyRollenerweiterungChanges(
          filter.serviceProviderId,
          filter.organisationId,
          bodyParams,
        );
      } catch (error) {
        if (containsMultiError(error)) {
          this.errors = new Map<string, DbiamApplyRollenerweiterungMultiErrorRolleIdsWithI18nKeysInnerI18nKeyEnum>(
            error.response?.data.rolleIdsWithI18nKeys
              .filter(
                (
                  item: DbiamApplyRollenerweiterungMultiErrorRolleIdsWithI18nKeysInner,
                ): item is Required<DbiamApplyRollenerweiterungMultiErrorRolleIdsWithI18nKeysInner> =>
                  item.rolleId !== undefined && item.i18nKey !== undefined,
              )
              .map((item: Required<DbiamApplyRollenerweiterungMultiErrorRolleIdsWithI18nKeysInner>) => [
                item.rolleId,
                item.i18nKey,
              ]),
          );
        } else {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        }
      } finally {
        this.loading = false;
      }
    },

    async createServiceProvider(filter: ServiceProviderCreationFilter): Promise<void> {
      this.loading = true;
      try {
        const bodyParams: CreateServiceProviderBodyParams = {
          organisationId: filter.organisationId,
          name: filter.name,
          url: filter.url,
          logoId: filter.logoId,
          kategorie: filter.kategorie,
          requires2fa: filter.requires2fa,
          merkmale: filter.merkmale,
          rollenartenWhitelist: filter.rollenartenWhitelist,
        };
        const { data }: { data: CreateServiceProviderResponse } =
          await serviceProviderApi.providerControllerCreateServiceProvider(bodyParams);
        this.createdServiceProvider = data;
      } catch (error) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async updateServiceProvider(id: string, update: Partial<ServiceProviderFormSubmitData>): Promise<void> {
      this.loading = true;
      this.updatedServiceProvider = null;
      try {
        const updateServiceProviderBodyParams: UpdateServiceProviderBodyParams = {};
        if (update.name) {
          updateServiceProviderBodyParams.name = update.name;
        }
        if (update.url) {
          updateServiceProviderBodyParams.url = update.url;
        }
        if (update.kategorie) {
          updateServiceProviderBodyParams.kategorie = update.kategorie;
        }
        if (update.logoId) {
          updateServiceProviderBodyParams.logoId = update.logoId;
        }
        if (update.merkmale !== undefined) {
          updateServiceProviderBodyParams.merkmale = update.merkmale;
        }
        if (update.rollenartenWhitelist !== undefined) {
          updateServiceProviderBodyParams.rollenartenWhitelist = update.rollenartenWhitelist;
        }

        const { data }: { data: ServiceProviderResponse } =
          await serviceProviderApi.providerControllerUpdateServiceProvider(id, updateServiceProviderBodyParams);
        this.updatedServiceProvider = data;
        this.errorCode = '';
      } catch (error) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async deleteServiceProvider(id: string): Promise<void> {
      this.loading = true;
      try {
        await serviceProviderApi.providerControllerDeleteServiceProvider(id);
      } catch (error) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },
    async syncServiceProvidersForSchule(id: string): Promise<void> {
      this.loading = true;
      try {
        await vidisApi.vidisControllerSyncAngeboteForSchool(id);
      } catch (error) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },
  },
});
