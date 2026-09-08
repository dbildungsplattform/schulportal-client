import axiosApiInstance from '@/services/ApiService';
import { getResponseErrorCode } from '@/utils/errorHandlers';
import type { OrganisationSortField, SortOrder } from '@/utils/sorting';
import { type AxiosResponse } from 'axios';
import { defineStore, type Store, type StoreDefinition } from 'pinia';
import {
  OrganisationenApiFactory,
  OrganisationsTyp,
  TraegerschaftTyp,
  type CreateOrganisationBodyParams,
  type OrganisationByIdBodyParams,
  type OrganisationByNameBodyParams,
  type OrganisationenApiInterface,
  type OrganisationResponse,
  type OrganisationRootChildrenResponse,
  type ParentOrganisationenResponse,
  type RollenSystemRechtEnum,
} from '../api-client/generated/api';
import { useSearchFilterStore, type SearchFilterStore } from './SearchFilterStore';

const organisationApi: OrganisationenApiInterface = OrganisationenApiFactory(undefined, '', axiosApiInstance);
const searchFilterStore: SearchFilterStore = useSearchFilterStore();

export type Organisation = {
  id: string;
  kennung?: string | null;
  name: string;
  namensergaenzung?: string | null;
  kuerzel?: string;
  typ: OrganisationsTyp;
  administriertVon?: string | null;
  zugehoerigZu?: string | null;
  schuleDetails?: string;
  version?: number;
  itslearningEnabled?: boolean;
  emailAdress?: string;
  /* isNotPersisted is optional and currently only used for SchultraegerDetailsView */
  isNotPersisted?: boolean;
};

export type KlasseTableItem = {
  id: string;
  kennung?: string | null;
  name: string;
  namensergaenzung?: string | null;
  kuerzel?: string;
  typ: OrganisationsTyp;
  administriertVon?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SchuleTableItem = {
  id: string;
  kennung?: string | null;
  name: string;
  namensergaenzung?: string | null;
  kuerzel?: string;
  typ: OrganisationsTyp;
  administriertVon?: string | null;
  createdAt?: string;
  updatedAt?: string;
  emailAdress?: string;
};

export type SchultraegerTableItem = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SchultraegerFormType = {
  selectedSchultraegerform: string | undefined;
  selectedSchultraegername: string | undefined;
};

export type AutoCompleteStore<T> = {
  filterResult: Array<T>;
  errorCode?: string;
  total: number;
  loading: boolean;
};

export type CurrentSchulDetails = Organisation & { schultraegerform?: Organisation | null };

type OrganisationState = {
  allOrganisationen: Array<Organisation>;
  allKlassen: Array<Organisation>;
  allSchulen: Array<Organisation>;
  allSchultraeger: Array<Organisation>;
  klassenFilters: Map<string, AutoCompleteStore<Organisation>>;
  organisationenFilters: Map<string, AutoCompleteStore<Organisation>>;
  currentOrganisation: Organisation | null;
  currentSchule: CurrentSchulDetails | null;
  currentKlasse: Organisation | null;
  updatedOrganisation: Organisation | null;
  createdKlasse: Organisation | null;
  createdSchule: Organisation | null;
  createdSchultraeger: Organisation | null;
  lockingOrganisation: Organisation | null;
  schulenFromTraeger: Array<Organisation>;
  schulenWithoutTraeger: Array<Organisation>;
  totalKlassen: number;
  totalSchulen: number;
  totalPaginatedSchulen: number;
  totalSchultraeger: number;
  totalPaginatedSchultraeger: number;
  totalPaginatedKlassen: number;
  totalPaginatedOrganisationen: number;
  totalOrganisationen: number;
  klassen: Array<Organisation>;
  errorCode: string;
  loading: boolean;
  loadingKlassen: boolean;
  parentOrganisationen: Array<Organisation>;
  schultraeger: Array<Organisation>;
  activatedItslearningOrganisation: Organisation | null;
  cachedSchulenMap: Map<string, string>;
};

export type OrganisationenFilter = {
  limit?: number;
  offset?: number;
  searchString?: string;
  systemrechte?: RollenSystemRechtEnum[];
  includeTyp?: OrganisationsTyp;
  excludeTyp?: OrganisationsTyp[];
  administriertVon?: Array<string>;
  zugehoerigZu?: Array<string>;
  organisationIds?: Array<string>;
  sortOrder?: SortOrder;
  sortField?: OrganisationSortField;
};

export type GetAdministrierteOrganisationenFilter = {
  organisationId?: string;
  offset?: number;
  limit?: number;
  searchFilter?: string;
};

export enum SchuleType {
  ASSIGNED = 'assigned',
  UNASSIGNED = 'unassigned',
}

type OrganisationGetters = object;
type OrganisationActions = {
  getAllOrganisationen: (filter?: OrganisationenFilter) => Promise<void>;
  getFilteredKlassen(filter?: OrganisationenFilter): Promise<void>;
  getKlassenByOrganisationId: (filter?: OrganisationenFilter) => Promise<void>;
  getOrganisationById: (organisationId: string, organisationsTyp?: OrganisationsTyp) => Promise<void>;
  getLockingOrganisationById: (organisationId: string) => Promise<void>;
  getParentOrganisationsByIds: (organisationIds: string[]) => Promise<void>;
  createOrganisation: (
    administriertVon: string,
    zugehoerigZu: string,
    kennung: string | undefined,
    name: string,
    namensergaenzung: string | undefined,
    kuerzel: string | undefined,
    typ: OrganisationsTyp,
    traegerschaft?: TraegerschaftTyp,
    emailAdress?: string
  ) => Promise<void>;
  deleteOrganisationById: (organisationId: string) => Promise<void>;
  updateOrganisationById: (organisationId: string, name: string, type: OrganisationsTyp) => Promise<void>;
  getRootKinderSchultraeger: () => Promise<void>;
  fetchSchulen: (filter: OrganisationenFilter, type: SchuleType) => Promise<void>;
  assignSchuleToTraeger(schultraegerId: string, organisationIdBodyParams: OrganisationByIdBodyParams): Promise<void>;
  fetchSchuleDetailsForKlassen: (filterActive: boolean) => Promise<void>;
  fetchSchuleDetailsForSchultraeger: () => Promise<void>;
  setItsLearningForSchule: (organisationId: string) => Promise<void>;
  loadOrganisationenForFilter(filter?: OrganisationenFilter, storeKey?: string): Promise<void>;
  resetOrganisationenFilter(storeKey?: string): void;
  clearOrganisationenFilter(storeKey?: string): void;
  /**
   * Loads Klassen according to filter and stores them in the klassenFilters map under the provided storeKey.
   * @param filter
   * @param storeKey Unique string is necessary if there is more than one KlassenFilter in use at the same time. It identifies the filter in the klassenFilters map. Defaults to an empty string.
   */
  loadKlassenForFilter(filter?: OrganisationenFilter, storeKey?: string): Promise<void>;
  resetKlasseFilter(storeKey?: string): void;
  clearKlasseFilter(storeKey?: string): void;
  fetchSchulDetails: (organisationId: string) => Promise<void>;
};

export { OrganisationsTyp };
export type OrganisationStore = Store<'organisationStore', OrganisationState, OrganisationGetters, OrganisationActions>;

export const useOrganisationStore: StoreDefinition<
  'organisationStore',
  OrganisationState,
  OrganisationGetters,
  OrganisationActions
> = defineStore('organisationStore', {
  state: (): OrganisationState => {
    return {
      allOrganisationen: [],
      allKlassen: [],
      allSchulen: [],
      organisationenFilters: new Map(),
      klassenFilters: new Map(),
      allSchultraeger: [],
      currentOrganisation: null,
      currentKlasse: null,
      currentSchule: null,
      updatedOrganisation: null,
      createdKlasse: null,
      createdSchule: null,
      createdSchultraeger: null,
      lockingOrganisation: null,
      schulenFromTraeger: [],
      schulenWithoutTraeger: [],
      totalKlassen: 0,
      totalSchulen: 0,
      totalPaginatedSchulen: 0,
      totalSchultraeger: 0,
      totalPaginatedSchultraeger: 0,
      totalPaginatedKlassen: 0,
      totalPaginatedOrganisationen: 0,
      totalOrganisationen: 0,
      klassen: [],
      errorCode: '',
      loading: false,
      loadingKlassen: false,
      parentOrganisationen: [],
      schultraeger: [],
      activatedItslearningOrganisation: null,
      cachedSchulenMap: new Map<string, string>(),
    };
  },

  actions: {
    async getAllOrganisationen(filter?: OrganisationenFilter): Promise<void> {
      this.loading = true;
      try {
        const response: AxiosResponse<Organisation[]> = await organisationApi.organisationControllerFindOrganizations(
          filter?.offset,
          filter?.limit,
          undefined,
          undefined,
          filter?.searchString,
          filter?.includeTyp,
          filter?.systemrechte,
          filter?.excludeTyp,
          filter?.administriertVon,
          filter?.zugehoerigZu,
          filter?.organisationIds,
          filter?.sortOrder,
          filter?.sortField,
        );
        if (filter?.includeTyp === OrganisationsTyp.Klasse) {
          this.allKlassen = response.data;
          this.totalKlassen = +response.headers['x-paging-total'];
          await this.fetchSchuleDetailsForKlassen(false);
        } else if (filter?.includeTyp === OrganisationsTyp.Schule) {
          this.allSchulen = response.data;
          // The total number of all Schulen before applying pagination (To use in the Result table to show all Einträge)
          this.totalSchulen = +response.headers['x-paging-total'];
          // The paginated total number to show in the autocomplete filters.
          this.totalPaginatedSchulen = +response.headers['x-paging-pagetotal'];
        } else if (filter?.includeTyp === OrganisationsTyp.Traeger) {
          this.allSchultraeger = response.data;
          this.totalSchultraeger = +response.headers['x-paging-total'];
          this.totalPaginatedSchultraeger = +response.headers['x-paging-pagetotal'];
          await this.fetchSchuleDetailsForSchultraeger();
        } else {
          this.allOrganisationen = response.data;
          this.totalOrganisationen = +response.headers['x-paging-total'];
          this.totalPaginatedOrganisationen = +response.headers['x-paging-pagetotal'];
        }
        this.loading = false;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async fetchSchuleDetailsForKlassen(filterActive: boolean): Promise<void> {
      const getAdministriertVonSet = (klassen: Organisation[]): Set<string> => {
        return new Set(
          klassen
            .map((klasse: Organisation) => klasse.administriertVon)
            .filter((id: string | undefined | null): id is string => id !== null && id !== undefined),
        );
      };

      const updateSchuleDetails = (klassen: Organisation[]): Organisation[] => {
        return klassen.map((klasse: Organisation) => ({
          ...klasse,
          schuleDetails: this.cachedSchulenMap.get(klasse.administriertVon ?? '') ?? '---',
        }));
      };

      const administriertVonSet: Set<string> = filterActive
        ? getAdministriertVonSet(this.klassen)
        : getAdministriertVonSet(this.allKlassen);

      const uncachedIds: string[] = Array.from(administriertVonSet).filter(
        (id: string) => !this.cachedSchulenMap.has(id),
      );

      // Use cached values for schuleDetails
      this.allKlassen = updateSchuleDetails(this.allKlassen);
      this.klassen = updateSchuleDetails(this.klassen);

      if (uncachedIds.length === 0) {
        return;
      } // Skip API call if all IDs are cached

      this.loading = true;
      try {
        const response: AxiosResponse<Organisation[]> = await organisationApi.organisationControllerFindOrganizations(
          undefined,
          searchFilterStore.klassenPerPage,
          undefined,
          undefined,
          undefined,
          OrganisationsTyp.Schule,
          ['KLASSEN_VERWALTEN'],
          undefined,
          undefined,
          undefined,
          uncachedIds,
        );

        const newSchulenMap: Map<string, string> = new Map(
          response.data.map((org: Organisation) => [org.id, `${org.kennung} (${org.name.trim()})`]),
        );

        // Update the cache
        newSchulenMap.forEach((value: string, key: string) => {
          this.cachedSchulenMap.set(key, value);
        });

        // Update schuleDetails with newly fetched data
        this.allKlassen = updateSchuleDetails(this.allKlassen);
        this.klassen = updateSchuleDetails(this.klassen);
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async fetchSchuleDetailsForSchultraeger(): Promise<void> {
      const schultraegerIds: Set<string> = new Set(
        this.allSchultraeger.map((schultraeger: Organisation) => schultraeger.id),
      );
      this.loading = true;
      try {
        const response: AxiosResponse<Organisation[]> = await organisationApi.organisationControllerFindOrganizations(
          undefined,
          searchFilterStore.klassenPerPage,
          undefined,
          undefined,
          undefined,
          OrganisationsTyp.Schule,
          ['SCHULTRAEGER_VERWALTEN'],
          undefined,
          undefined,
          // Sending Schulträger IDs in zugehoerigZu to get the direct children
          Array.from(schultraegerIds),
          undefined,
        );
        // Map Schulträger IDs to multiple assigned Schulen
        const schulenMap: Map<string, string[]> = new Map();

        response.data.forEach((org: Organisation) => {
          if (org.zugehoerigZu) {
            if (!schulenMap.has(org.zugehoerigZu)) {
              schulenMap.set(org.zugehoerigZu, []);
            }

            schulenMap.get(org.zugehoerigZu)!.push(`${org.kennung}`);
          }
        });

        this.allSchultraeger = this.allSchultraeger.map((schultraeger: Organisation) => ({
          ...schultraeger,
          schuleDetails: schulenMap.get(schultraeger.id)?.join(', ') || '---',
        }));
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async getFilteredKlassen(filter?: OrganisationenFilter): Promise<void> {
      this.loadingKlassen = true;
      try {
        const response: AxiosResponse<Organisation[]> = await organisationApi.organisationControllerFindOrganizations(
          undefined,
          200,
          undefined,
          undefined,
          filter?.searchString,
          OrganisationsTyp.Klasse,
          filter?.systemrechte,
          filter?.excludeTyp,
          filter?.administriertVon,
          filter?.zugehoerigZu,
          filter?.organisationIds,
        );
        this.klassen = response.data;
        this.totalKlassen = +response.headers['x-paging-total'];
        this.totalPaginatedKlassen = +response.headers['x-paging-pagetotal'];
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loadingKlassen = false;
      }
    },

    async getOrganisationById(organisationId: string, organisationsTyp?: OrganisationsTyp): Promise<void> {
      this.errorCode = '';
      this.loading = true;
      try {
        const { data }: { data: Organisation } =
          await organisationApi.organisationControllerFindOrganisationById(organisationId);
        if (organisationsTyp === OrganisationsTyp.Klasse) {
          this.currentKlasse = data;
        } else {
          this.currentOrganisation = data;
        }
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async getParentOrganisationsByIds(organisationIds: string[]) {
      this.errorCode = '';
      this.loading = true;
      try {
        const response: AxiosResponse<ParentOrganisationenResponse, unknown> =
          await organisationApi.organisationControllerGetParentsByIds({ organisationIds: organisationIds });
        const { parents }: ParentOrganisationenResponse = response.data;
        this.parentOrganisationen = parents;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async getLockingOrganisationById(organisationId: string) {
      this.errorCode = '';
      this.loading = true;
      try {
        let organisation: Organisation | undefined = this.parentOrganisationen.find(
          (org: Organisation) => org.id === organisationId,
        );
        if (!organisation) {
          organisation = this.allOrganisationen.find((org: Organisation) => org.id === organisationId);
        }
        if (organisation) {
          this.lockingOrganisation = { ...organisation };
        } else {
          const { data }: { data: Organisation } =
            await organisationApi.organisationControllerFindOrganisationById(organisationId);
          this.lockingOrganisation = data;
        }
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async getKlassenByOrganisationId(filter?: OrganisationenFilter) {
      this.errorCode = '';
      this.loadingKlassen = true;
      try {
        const response: AxiosResponse<Organisation[]> = await organisationApi.organisationControllerFindOrganizations(
          filter?.offset,
          filter?.limit,
          undefined,
          undefined,
          filter?.searchString,
          OrganisationsTyp.Klasse,
          [],
          undefined,
          filter?.administriertVon,
          undefined,
          filter?.organisationIds,
          filter?.sortOrder,
          filter?.sortField,
        );

        this.klassen = response.data;
        this.totalKlassen = +response.headers['x-paging-total'];
        this.totalPaginatedKlassen = +response.headers['x-paging-pageTotal'];
        await this.fetchSchuleDetailsForKlassen(true);
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loadingKlassen = false;
      }
    },

    async createOrganisation(
      administriertVon: string,
      zugehoerigZu: string,
      kennung: string | undefined,
      name: string,
      namensergaenzung: string | undefined,
      kuerzel: string | undefined,
      typ: OrganisationsTyp,
      traegerschaft?: TraegerschaftTyp,
      emailAdress?: string
    ): Promise<void> {
      this.loading = true;
      try {
        const createOrganisationBodyParams: CreateOrganisationBodyParams = {
          administriertVon: administriertVon,
          zugehoerigZu: zugehoerigZu,
          kennung: kennung,
          name: name,
          namensergaenzung: namensergaenzung,
          kuerzel: kuerzel,
          typ: typ,
          traegerschaft: traegerschaft,
          emailAdress: emailAdress,
        };
        const { data }: { data: Organisation } =
          await organisationApi.organisationControllerCreateOrganisation(createOrganisationBodyParams);
        if (typ === OrganisationsTyp.Klasse) {
          this.createdKlasse = data;
        } else if (typ === OrganisationsTyp.Schule) {
          this.createdSchule = data;
        } else if (typ === OrganisationsTyp.Traeger) {
          this.createdSchultraeger = data;
        }
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'ORGANISATION_SPECIFICATION_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async updateOrganisationById(organisationId: string, name: string, type: OrganisationsTyp): Promise<void> {
      this.errorCode = '';
      this.loading = true;
      try {
        /* prepare body params */
        const organisationByNameBodyParams: OrganisationByNameBodyParams = {
          name: name,
          version: 1,
        };
        if (type === OrganisationsTyp.Klasse) {
          if (!this.currentKlasse?.version) {
            throw new Error('Organisation version not found');
          }
          organisationByNameBodyParams.version = this.currentKlasse.version;
        } else if (type === OrganisationsTyp.Traeger) {
          if (!this.currentOrganisation?.version) {
            throw new Error('Organisation version not found');
          }
          organisationByNameBodyParams.version = this.currentOrganisation.version;
        }

        /* actual request */
        const { data }: { data: Organisation } = await organisationApi.organisationControllerUpdateOrganisationName(
          organisationId,
          organisationByNameBodyParams,
        );

        this.updatedOrganisation = data;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'KLASSE_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async deleteOrganisationById(organisationId: string): Promise<void> {
      this.errorCode = '';
      this.loading = true;
      try {
        await organisationApi.organisationControllerDeleteOrganisation(organisationId);
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async fetchSchulDetails(organisationId: string): Promise<void> {
      this.errorCode = '';
      this.loading = true;
      try {
        const [organisationResponse, parentsResponse]: [
          AxiosResponse<Organisation>,
          AxiosResponse<{ parents: OrganisationResponse[] }>,
        ] = await Promise.all([
          organisationApi.organisationControllerFindOrganisationById(organisationId),
          organisationApi.organisationControllerGetParentsByIds({ organisationIds: [organisationId] }),
        ]);

        if (organisationResponse.data.typ === OrganisationsTyp.Schule && parentsResponse.data.parents?.length > 0) {
          const schultraegerform: OrganisationResponse | undefined = parentsResponse.data.parents.find(
            (parent: OrganisationResponse) => parent.id === organisationResponse.data?.administriertVon,
          );
          this.currentSchule = { ...organisationResponse.data, schultraegerform };
        }
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async getRootKinderSchultraeger() {
      try {
        const response: AxiosResponse<OrganisationRootChildrenResponse> =
          await organisationApi.organisationControllerGetRootChildren();
        this.schultraeger = Object.values(response.data) as Organisation[];
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'SCHULTRAEGER_ERROR');
      }
    },

    // This method will search for both assigned or unassigned Schulen depending on the parameter "type" which could be either 'assigned' or 'unassigned'.
    async fetchSchulen(filter: OrganisationenFilter, type: SchuleType): Promise<void> {
      this.errorCode = '';
      this.loading = true;
      try {
        const { data }: { data: Array<OrganisationResponse> } =
          await organisationApi.organisationControllerFindOrganizations(
            filter.offset,
            filter.limit,
            undefined,
            undefined,
            filter.searchString,
            OrganisationsTyp.Schule,
            ['SCHULTRAEGER_VERWALTEN'],
            undefined,
            undefined,
            filter.zugehoerigZu,
            undefined,
          );

        if (type === SchuleType.ASSIGNED) {
          this.schulenFromTraeger = data;
        } else {
          this.schulenWithoutTraeger = data;
        }
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'SCHULTRAEGER_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async assignSchuleToTraeger(
      schultraegerId: string,
      organisationIdBodyParams: OrganisationByIdBodyParams,
    ): Promise<void> {
      this.errorCode = '';
      this.loading = true;
      try {
        await organisationApi.organisationControllerAddZugehoerigeOrganisation(schultraegerId, {
          organisationId: organisationIdBodyParams.organisationId,
        });
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'SCHULTRAEGER_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async setItsLearningForSchule(organisationId: string): Promise<void> {
      this.errorCode = '';
      this.loading = true;
      try {
        const { data }: { data: Organisation } =
          await organisationApi.organisationControllerEnableForitslearning(organisationId);
        this.activatedItslearningOrganisation = data;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'ORGANISATION_SPECIFICATION_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async loadOrganisationenForFilter(filter?: OrganisationenFilter, storeKey: string = ''): Promise<void> {
      const organisationenFilter: AutoCompleteStore<Organisation> = this.organisationenFilters.get(storeKey) ?? {
        filterResult: [],
        loading: true,
        total: 0,
      };
      if (!this.organisationenFilters.has(storeKey)) {
        this.organisationenFilters.set(storeKey, organisationenFilter);
      }
      try {
        const response: AxiosResponse<Organisation[]> = await organisationApi.organisationControllerFindOrganizations(
          filter?.offset,
          filter?.limit,
          undefined,
          undefined,
          filter?.searchString,
          filter?.includeTyp,
          filter?.systemrechte,
          filter?.excludeTyp,
          filter?.administriertVon,
          filter?.zugehoerigZu,
          filter?.organisationIds,
        );
        organisationenFilter.filterResult = response.data;
        organisationenFilter.total = +response.headers['x-paging-total'];
      } catch (error: unknown) {
        organisationenFilter.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        organisationenFilter.loading = false;
      }
    },

    resetOrganisationenFilter(storeKey: string = ''): void {
      this.organisationenFilters.set(storeKey, {
        filterResult: this.organisationenFilters.get(storeKey)?.filterResult || [],
        loading: false,
        total: this.organisationenFilters.get(storeKey)?.total || 0,
      });
    },

    clearOrganisationenFilter(storeKey: string = ''): void {
      this.organisationenFilters.delete(storeKey);
    },

    async loadKlassenForFilter(filter?: OrganisationenFilter, storeKey: string = ''): Promise<void> {
      const klassenFilter: AutoCompleteStore<Organisation> = {
        filterResult: [],
        loading: false,
        total: 0,
      };

      klassenFilter.loading = true;
      try {
        const response: AxiosResponse<Organisation[]> = await organisationApi.organisationControllerFindOrganizations(
          filter?.offset,
          filter?.limit,
          undefined,
          undefined,
          filter?.searchString,
          OrganisationsTyp.Klasse,
          filter?.systemrechte,
          filter?.excludeTyp,
          filter?.administriertVon,
          filter?.zugehoerigZu,
          filter?.organisationIds,
        );
        klassenFilter.filterResult = response.data;
        klassenFilter.total = +response.headers['x-paging-pagetotal'];
      } catch (error: unknown) {
        klassenFilter.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.klassenFilters.set(storeKey, klassenFilter);
        klassenFilter.loading = false;
      }
    },

    resetKlasseFilter(storeKey: string = ''): void {
      this.klassenFilters.set(storeKey, {
        filterResult: this.klassenFilters.get(storeKey)?.filterResult || [],
        loading: false,
        total: this.klassenFilters.get(storeKey)?.total || 0,
      });
    },

    clearKlasseFilter(storeKey: string = ''): void {
      this.klassenFilters.delete(storeKey);
    },
  },
});
