import axiosApiInstance from '@/services/ApiService';
import { getResponseErrorCode } from '@/utils/errorHandlers';
import type { OrganisationSortField, SortOrder } from '@/utils/sorting';
import { type AxiosResponse } from 'axios';
import { defineStore, type Store, type StoreDefinition } from 'pinia';
import {
  OrganisationenApiFactory,
  OrganisationsbeziehungsTyp,
  OrganisationsTyp,
  type CreateOrganisationBodyParams,
  type OrganisationByNameBodyParams,
  type OrganisationControllerFindOrganizations200Response,
  type OrganisationenApiInterface,
  type OrganisationResponse,
  type OrganisationRootChildrenResponse,
  type ParentOrganisationenResponse,
  type RollenSystemRechtEnum,
} from '../api-client/generated/api';

const organisationApi: OrganisationenApiInterface = OrganisationenApiFactory(undefined, '', axiosApiInstance);
const relationshipSearchRequestTokens: WeakMap<object, symbol> = new WeakMap<object, symbol>();
const relationshipBatchRequestTokens: WeakMap<object, symbol> = new WeakMap<object, symbol>();
const relationshipBatchRequestsInFlight: WeakSet<object> = new WeakSet<object>();

export type Organisation = {
  id: string;
  kennung?: string | null;
  name: string;
  namensergaenzung?: string | null;
  kuerzel?: string;
  typ: OrganisationsTyp;
  administriertVon?: string | null;
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

export type OrganisationRelationshipBatchFailure = {
  organisation: Organisation;
  errorCode: string;
};

export type OrganisationRelationshipBatch = {
  isRunning: boolean;
  isComplete: boolean;
  completed: number;
  total: number;
  progress: number;
  failures: OrganisationRelationshipBatchFailure[];
};

type OrganisationState = {
  allOrganisationen: Array<Organisation>;
  allKlassen: Array<Organisation>;
  allSchulen: Array<Organisation>;
  allSchultraeger: Array<Organisation>;
  klassenFilters: Map<string, AutoCompleteStore<Organisation>>;
  organisationenFilters: Map<string, AutoCompleteStore<Organisation>>;
  currentOrganisation: Organisation | null;
  organisationForSelection: Organisation | null;
  currentSchule?: CurrentSchulDetails | null;
  searchedOrganisations: Array<Organisation>;
  relationshipSearchLoading: boolean;
  relationshipErrorCode: string;
  relationshipBatch: OrganisationRelationshipBatch;
  currentKlasse: Organisation | null;
  updatedOrganisation: Organisation | null;
  createdKlasse: Organisation | null;
  createdSchule: Organisation | null;
  createdSchultraeger: Organisation | null;
  createdBehoerde: Organisation | null;
  lockingOrganisation: Organisation | null;
  totalKlassen: number;
  totalSchulen: number;
  totalSchultraeger: number;
  totalOrganisationen: number;
  errorCode: string;
  loading: boolean;
  loadingDelete: boolean;
  parentOrganisationen: Array<Organisation>;
  rootChildren: Array<Organisation>;
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
  sortOrder?: SortOrder;
  sortField?: OrganisationSortField;
};

export type OrganisationenFilterForAutocomplete = {
  limit?: number;
  offset?: number;
  searchString?: string;
  systemrechte?: RollenSystemRechtEnum[];
  includeTyp?: OrganisationsTyp;
  excludeTyp?: OrganisationsTyp[];
  administriertVon?: Array<string>;
};

export type KlassenFilter = {
  searchString?: string;
  systemrechte?: RollenSystemRechtEnum[];
  administriertVon?: Array<string>;
};

export type GetAdministrierteOrganisationenFilter = {
  organisationId?: string;
  offset?: number;
  limit?: number;
  searchFilter?: string;
};

export type CreateOrganisationParams = {
  administriertVon: string;
  name: string;
  typ: OrganisationsTyp;
  kennung?: string;
  emailAdress?: string;
};

type OrganisationGetters = object;
type OrganisationActions = {
  getAllOrganisationen: (filter?: OrganisationenFilter) => Promise<void>;
  getOrganisationById: (organisationId: string, organisationsTyp?: OrganisationsTyp) => Promise<void>;
  loadOrganisationForSelection: (organisationId: string) => Promise<void>;
  getLockingOrganisationById: (organisationId: string) => Promise<void>;
  getParentOrganisationsByIds: (organisationIds: string[]) => Promise<void>;
  createOrganisation: (params: CreateOrganisationParams) => Promise<void>;
  createBehoerde: (administriertVon: string, name: string) => Promise<void>;
  deleteOrganisationById: (organisationId: string) => Promise<void>;
  updateOrganisationNameById: (organisationId: string, name: string, type: OrganisationsTyp) => Promise<void>;
  getRootChildren: () => Promise<void>;
  fetchSchuleDetailsForKlassen: () => Promise<void>;
  setItsLearningForSchule: (organisationId: string) => Promise<void>;
  loadOrganisationenForFilter(filter?: OrganisationenFilterForAutocomplete, storeKey?: string): Promise<void>;
  resetOrganisationenFilter(storeKey?: string): void;
  clearOrganisationenFilter(storeKey?: string): void;
  /**
   * Loads Klassen according to filter and stores them in the klassenFilters map under the provided storeKey.
   * @param filter
   * @param storeKey Unique string is necessary if there is more than one KlassenFilter in use at the same time. It identifies the filter in the klassenFilters map. Defaults to an empty string.
   */
  loadKlassenForFilter(filter?: KlassenFilter, storeKey?: string): Promise<void>;
  resetKlasseFilter(storeKey?: string): void;
  clearKlasseFilter(storeKey?: string): void;
  fetchSchulDetails: (organisationId: string) => Promise<void>;
  searchOrganisationsForRelationships: (organisationId: string, searchString?: string) => Promise<void>;
  createOrganisationRelationship: (
    contextOrganisation: Organisation,
    selectedOrganisation: Organisation,
  ) => Promise<void>;
  createOrganisationRelationships: (
    contextOrganisation: Organisation | undefined,
    selectedOrganisations: Organisation[],
  ) => Promise<void>;
  resetOrganisationRelationshipBatch: () => void;
  updateSchuleById: (params: {
    organisationId: string;
    schultraegerform: string;
    name: string;
    emailAdress: string;
  }) => Promise<void>;
};

export { OrganisationsbeziehungsTyp, OrganisationsTyp } from '../api-client/generated/api';
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
      organisationForSelection: null,
      currentKlasse: null,
      currentSchule: null,
      searchedOrganisations: [],
      relationshipSearchLoading: false,
      relationshipErrorCode: '',
      relationshipBatch: {
        isRunning: false,
        isComplete: false,
        completed: 0,
        total: 0,
        progress: 0,
        failures: [],
      },
      updatedOrganisation: null,
      createdKlasse: null,
      createdSchule: null,
      createdSchultraeger: null,
      createdBehoerde: null,
      lockingOrganisation: null,
      totalKlassen: 0,
      totalSchulen: 0,
      totalSchultraeger: 0,
      totalOrganisationen: 0,
      errorCode: '',
      loading: false,
      loadingDelete: false,
      parentOrganisationen: [],
      rootChildren: [],
      cachedSchulenMap: new Map<string, string>(),
    };
  },

  actions: {
    async getAllOrganisationen(filter?: OrganisationenFilter): Promise<void> {
      this.loading = true;
      try {
        const response: AxiosResponse<OrganisationControllerFindOrganizations200Response> =
          await organisationApi.organisationControllerFindOrganizations(
            filter?.offset,
            filter?.limit,
            undefined,
            undefined,
            filter?.searchString,
            filter?.includeTyp,
            filter?.systemrechte,
            filter?.excludeTyp,
            filter?.administriertVon,
            filter?.sortOrder,
            filter?.sortField,
          );
        if (filter?.includeTyp === OrganisationsTyp.Klasse) {
          this.allKlassen = response.data.items;
          this.totalKlassen = response.data.total;
          await this.fetchSchuleDetailsForKlassen();
        } else if (filter?.includeTyp === OrganisationsTyp.Schule) {
          this.allSchulen = response.data.items;
          // The total number of all Schulen before applying pagination (To use in the Result table to show all Einträge)
          this.totalSchulen = response.data.total;
        } else if (filter?.includeTyp === OrganisationsTyp.Traeger) {
          this.allSchultraeger = response.data.items;
          this.totalSchultraeger = response.data.total;
        } else {
          this.allOrganisationen = response.data.items;
          this.totalOrganisationen = response.data.total;
        }
        this.loading = false;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async searchOrganisationsForRelationships(organisationId: string, searchString?: string): Promise<void> {
      const requestToken: symbol = Symbol();
      relationshipSearchRequestTokens.set(this, requestToken);
      this.relationshipErrorCode = '';
      this.relationshipSearchLoading = true;
      this.searchedOrganisations = [];
      try {
        const response: AxiosResponse<OrganisationResponse[] | OrganisationControllerFindOrganizations200Response> =
          await organisationApi.organisationControllerSearchOrganisationsForRelationships(
            organisationId,
            0,
            200,
            searchString || undefined,
          );
        if (relationshipSearchRequestTokens.get(this) === requestToken) {
          this.searchedOrganisations = Array.isArray(response.data) ? response.data : response.data.items;
        }
      } catch (error: unknown) {
        if (relationshipSearchRequestTokens.get(this) === requestToken) {
          this.relationshipErrorCode = getResponseErrorCode(error, 'SEARCH_ORGANISATIONS_ERROR');
        }
      } finally {
        if (relationshipSearchRequestTokens.get(this) === requestToken) {
          this.relationshipSearchLoading = false;
        }
      }
    },

    async createOrganisationRelationship(
      contextOrganisation: Organisation,
      selectedOrganisation: Organisation,
    ): Promise<void> {
      this.relationshipErrorCode = '';
      const isSchulaufsichtPair: boolean =
        (contextOrganisation.typ === OrganisationsTyp.Schule &&
          selectedOrganisation.typ === OrganisationsTyp.Behoerde) ||
        (contextOrganisation.typ === OrganisationsTyp.Behoerde && selectedOrganisation.typ === OrganisationsTyp.Schule);
      const isSchultraegerPair: boolean =
        (contextOrganisation.typ === OrganisationsTyp.Schule &&
          selectedOrganisation.typ === OrganisationsTyp.Traeger) ||
        (contextOrganisation.typ === OrganisationsTyp.Traeger && selectedOrganisation.typ === OrganisationsTyp.Schule);
      if (!isSchulaufsichtPair && !isSchultraegerPair) {
        this.relationshipErrorCode = 'CREATE_RELATIONSHIP_ERROR';
        return;
      }

      const [schoolOrganisation, relatedOrganisation]: [Organisation, Organisation] =
        contextOrganisation.typ === OrganisationsTyp.Schule
          ? [contextOrganisation, selectedOrganisation]
          : [selectedOrganisation, contextOrganisation];
      try {
        await organisationApi.organisationControllerCreateOrganisationsbeziehung({
          quellOrganisationId: schoolOrganisation.id,
          zielOrganisationId: relatedOrganisation.id,
          typ: isSchulaufsichtPair ? OrganisationsbeziehungsTyp.Schulaufsicht : OrganisationsbeziehungsTyp.Schultraeger,
        });
      } catch (error: unknown) {
        this.relationshipErrorCode = getResponseErrorCode(error, 'CREATE_RELATIONSHIP_ERROR');
      }
    },

    resetOrganisationRelationshipBatch(): void {
      relationshipBatchRequestTokens.delete(this);
      this.relationshipErrorCode = '';
      this.relationshipBatch = {
        isRunning: false,
        isComplete: false,
        completed: 0,
        total: 0,
        progress: 0,
        failures: [],
      };
    },

    async createOrganisationRelationships(
      contextOrganisation: Organisation | undefined,
      selectedOrganisations: Organisation[],
    ): Promise<void> {
      if (this.relationshipBatch.isRunning || relationshipBatchRequestsInFlight.has(this)) {
        return;
      }

      this.resetOrganisationRelationshipBatch();
      if (selectedOrganisations.length === 0) {
        return;
      }

      const requestToken: symbol = Symbol();
      relationshipBatchRequestTokens.set(this, requestToken);
      relationshipBatchRequestsInFlight.add(this);
      this.relationshipBatch.isRunning = true;
      this.relationshipBatch.total = selectedOrganisations.length;

      try {
        for (const selectedOrganisation of selectedOrganisations) {
          if (relationshipBatchRequestTokens.get(this) !== requestToken) {
            this.relationshipErrorCode = '';
            return;
          }
          if (contextOrganisation) {
            // eslint-disable-next-line no-await-in-loop
            await this.createOrganisationRelationship(contextOrganisation, selectedOrganisation);
          } else {
            this.relationshipErrorCode = 'CREATE_RELATIONSHIP_ERROR';
          }

          if (relationshipBatchRequestTokens.get(this) !== requestToken) {
            this.relationshipErrorCode = '';
            return;
          }
          if (this.relationshipErrorCode) {
            this.relationshipBatch.failures.push({
              organisation: selectedOrganisation,
              errorCode: this.relationshipErrorCode,
            });
          }
          this.relationshipBatch.completed++;
          this.relationshipBatch.progress = Math.ceil(
            (this.relationshipBatch.completed / this.relationshipBatch.total) * 100,
          );
        }

        this.relationshipBatch.isRunning = false;
        this.relationshipBatch.isComplete = true;
      } finally {
        relationshipBatchRequestsInFlight.delete(this);
      }
    },

    async fetchSchuleDetailsForKlassen(): Promise<void> {
      const getAdministriertVonSet = (klassen: Organisation[]): Set<string> => {
        return new Set(
          klassen
            .map((klasse: Organisation) => klasse.administriertVon)
            .filter((id: string | undefined | null): id is string => id !== null && id !== undefined),
        );
      };

      const updateSchuleById = (klassen: Organisation[]): Organisation[] => {
        return klassen.map((klasse: Organisation) => ({
          ...klasse,
          schuleDetails: this.cachedSchulenMap.get(klasse.administriertVon ?? '') ?? '---',
        }));
      };

      const administriertVonSet: Set<string> = getAdministriertVonSet(this.allKlassen);

      const uncachedIds: string[] = Array.from(administriertVonSet).filter(
        (id: string) => !this.cachedSchulenMap.has(id),
      );

      // Use cached values for schuleDetails
      this.allKlassen = updateSchuleById(this.allKlassen);

      if (uncachedIds.length === 0) {
        return;
      } // Skip API call if all IDs are cached

      this.loading = true;
      try {
        const response: AxiosResponse<Organisation[]> =
          await organisationApi.organisationControllerFindOrganisationsByIds({ organisationIds: uncachedIds });

        const newSchulenMap: Map<string, string> = new Map(
          response.data.map((org: Organisation) => [org.id, `${org.kennung} (${org.name.trim()})`]),
        );

        // Update the cache
        newSchulenMap.forEach((value: string, key: string) => {
          this.cachedSchulenMap.set(key, value);
        });

        // Update schuleDetails with newly fetched data
        this.allKlassen = updateSchuleById(this.allKlassen);
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
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

    async loadOrganisationForSelection(organisationId: string): Promise<void> {
      this.organisationForSelection = null;
      this.errorCode = '';
      this.loading = true;
      try {
        const { data }: { data: Organisation } =
          await organisationApi.organisationControllerFindOrganisationById(organisationId);
        this.organisationForSelection = data;
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

    async createOrganisation(params: CreateOrganisationParams): Promise<void> {
      this.loading = true;
      try {
        const { data }: { data: Organisation } = await organisationApi.organisationControllerCreateOrganisation(params);
        if (params.typ === OrganisationsTyp.Klasse) {
          this.createdKlasse = data;
        } else if (params.typ === OrganisationsTyp.Schule) {
          this.createdSchule = data;
        } else if (params.typ === OrganisationsTyp.Traeger) {
          this.createdSchultraeger = data;
        }
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'ORGANISATION_SPECIFICATION_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async createBehoerde(administriertVon: string, name: string): Promise<void> {
      this.loading = true;
      try {
        const createOrganisationBodyParams: CreateOrganisationBodyParams = {
          administriertVon: administriertVon,
          name: name,
          typ: OrganisationsTyp.Behoerde,
        };
        const { data }: { data: Organisation } =
          await organisationApi.organisationControllerCreateOrganisation(createOrganisationBodyParams);
        this.createdBehoerde = data;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'ORGANISATION_SPECIFICATION_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async updateOrganisationNameById(organisationId: string, name: string, type: OrganisationsTyp): Promise<void> {
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
      this.loadingDelete = true;
      try {
        await organisationApi.organisationControllerDeleteOrganisation(organisationId);
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loadingDelete = false;
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

    async updateSchuleById(params: {
      organisationId: string;
      schultraegerform: string;
      name: string;
      emailAdress: string;
    }): Promise<void> {
      this.errorCode = '';
      this.loading = true;
      try {
        const { data }: { data: Organisation } = await organisationApi.organisationControllerUpdateOrganisation(
          params.organisationId,
          {
            administriertVon: params.schultraegerform,
            name: params.name,
            emailAdress: params.emailAdress,
            typ: OrganisationsTyp.Schule,
          },
        );

        this.updatedOrganisation = data;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async getRootChildren(): Promise<void> {
      try {
        const response: AxiosResponse<OrganisationRootChildrenResponse> =
          await organisationApi.organisationControllerGetRootChildren();
        this.rootChildren = Object.values(response.data) as Organisation[];
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'SCHULTRAEGER_ERROR');
      }
    },

    async setItsLearningForSchule(organisationId: string): Promise<void> {
      this.errorCode = '';
      this.loading = true;
      try {
        await organisationApi.organisationControllerEnableForitslearning(organisationId);
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'ORGANISATION_SPECIFICATION_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async loadOrganisationenForFilter(
      filter?: OrganisationenFilterForAutocomplete,
      storeKey: string = '',
    ): Promise<void> {
      const organisationenFilter: AutoCompleteStore<Organisation> = this.organisationenFilters.get(storeKey) ?? {
        filterResult: [],
        loading: true,
        total: 0,
      };
      if (!this.organisationenFilters.has(storeKey)) {
        this.organisationenFilters.set(storeKey, organisationenFilter);
      }
      try {
        const response: AxiosResponse<OrganisationControllerFindOrganizations200Response> =
          await organisationApi.organisationControllerFindOrganizations(
            filter?.offset,
            filter?.limit,
            undefined,
            undefined,
            filter?.searchString,
            filter?.includeTyp,
            filter?.systemrechte,
            filter?.excludeTyp,
            filter?.administriertVon,
            undefined,
          );
        organisationenFilter.filterResult = response.data.items;
        organisationenFilter.total = response.data.total;
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

    async loadKlassenForFilter(filter?: KlassenFilter, storeKey: string = ''): Promise<void> {
      const klassenFilter: AutoCompleteStore<Organisation> = {
        filterResult: [],
        loading: false,
        total: 0,
      };

      klassenFilter.loading = true;
      try {
        const response: AxiosResponse<OrganisationControllerFindOrganizations200Response> =
          await organisationApi.organisationControllerFindOrganizations(
            0,
            200,
            undefined,
            undefined,
            filter?.searchString,
            OrganisationsTyp.Klasse,
            filter?.systemrechte,
            undefined,
            filter?.administriertVon,
            undefined,
          );
        klassenFilter.filterResult = response.data.items;
        klassenFilter.total = response.data.pageTotal ?? response.data.items.length;
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
