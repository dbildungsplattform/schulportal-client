import axiosApiInstance from '@/services/ApiService';
import { getResponseErrorCode } from '@/utils/errorHandlers';
import type { SortOrder } from '@/utils/sorting';
import { type AxiosResponse } from 'axios';
import { defineStore, type Store, type StoreDefinition } from 'pinia';
import {
  DbiamPersonenuebersichtApiFactory,
  PersonenApiFactory,
  PersonenFrontendApiFactory,
  type DbiamCreatePersonWithPersonenkontexteBodyParams,
  type DbiamPersonenuebersichtApiInterface,
  type DBiamPersonenuebersichtControllerFindPersonenuebersichten200Response,
  type DBiamPersonenuebersichtResponse,
  type DBiamPersonenzuordnungResponse,
  type LockUserBodyParams,
  type PersonenApiInterface,
  type PersonendatensatzResponse,
  type PersonenFrontendApiInterface,
  type PersonenuebersichtBodyParams,
  type PersonFrontendControllerFindPersons200Response,
  type PersonLandesbediensteterSearchPersonenkontextResponse,
  type PersonLandesbediensteterSearchResponse,
  type PersonMetadataBodyParams,
} from '../api-client/generated/api';
import { Person } from './types/Person';
import { PersonenUebersicht } from './types/PersonenUebersicht';
import { PersonWithZuordnungen } from './types/PersonWithZuordnungen';
import { Zuordnung } from './types/Zuordnung';

const personenApi: PersonenApiInterface = PersonenApiFactory(undefined, '', axiosApiInstance);
const personenFrontendApi: PersonenFrontendApiInterface = PersonenFrontendApiFactory(undefined, '', axiosApiInstance);
const personenuebersichtApi: DbiamPersonenuebersichtApiInterface = DbiamPersonenuebersichtApiFactory(
  undefined,
  '',
  axiosApiInstance,
);

export enum EmailStatus {
  Enabled = 'ENABLED',
  Disabled = 'DISABLED',
  Requested = 'REQUESTED',
  Failed = 'FAILED',
  DeletedLdap = 'DELETED_LDAP',
  DeletedOx = 'DELETED_OX',
  Deleted = 'DELETED',
}

export enum SortField {
  Familienname = 'familienname',
  Vorname = 'vorname',
  Personalnummer = 'personalnummer',
  Username = 'username',
}

export type CreatePersonBodyParams = DbiamCreatePersonWithPersonenkontexteBodyParams;

function mapPersonendatensatzResponseToPersonendatensatz(response: PersonendatensatzResponse): Personendatensatz {
  const person: Person = Person.fromResponse(response.person);
  return { person };
}

export type Personendatensatz = {
  person: Person;
};

export type {
  PersonendatensatzResponse,
  SortOrder,
  PersonLandesbediensteterSearchResponse,
  PersonLandesbediensteterSearchPersonenkontextResponse,
};

type PersonState = {
  allUebersichten: Map<string, PersonWithZuordnungen>;
  currentPerson: Personendatensatz | null;
  allLandesbedienstetePersonen: PersonLandesbediensteterSearchResponse[] | null;
  errorCode: string;
  loading: boolean;
  newDevicePassword: string | null;
  newPassword: string | null;
  patchedPerson: PersonendatensatzResponse | null;
  personenuebersicht: PersonenUebersicht | null;
  totalPersons: number;
};

export type PersonFilter = {
  limit?: number;
  offset?: number;
  organisationIDs?: Array<string>;
  rolleIDs?: Array<string>;
  searchFilter?: string;
  sortOrder?: SortOrder;
  sortField?: SortField;
};

export type LandesbediensteterFilter = {
  personalnummer?: string;
  primaryEmailAddress?: string;
  username?: string;
  vorname?: string;
  nachname?: string;
};

type PersonGetters = object;
type PersonActions = {
  resetState: () => void;
  getAllPersons: (filter: PersonFilter) => Promise<void>;
  getPersonById: (personId: string) => Promise<void>;
  resetPassword: (personId: string) => Promise<void>;
  resetDevicePassword: (personId?: string) => Promise<void>;
  deletePersonById: (personId: string) => Promise<void>;
  lockPerson: (personId: string, bodyParams: LockUserBodyParams) => Promise<void>;
  syncPersonById: (personId: string) => Promise<void>;
  getPersonenuebersichtById: (personId: string) => Promise<void>;
  changePersonMetadataById: (
    personId: string,
    vorname: string,
    familienname: string,
    personalnummer?: string,
  ) => Promise<void>;
  getLandesbedienstetePerson: (filter?: LandesbediensteterFilter) => Promise<void>;
};

export type PersonStore = Store<'personStore', PersonState, PersonGetters, PersonActions>;

export const usePersonStore: StoreDefinition<'personStore', PersonState, PersonGetters, PersonActions> = defineStore(
  'personStore',
  {
    state: (): PersonState => {
      return {
        allUebersichten: new Map<string, PersonWithZuordnungen>(),
        currentPerson: null,
        allLandesbedienstetePersonen: [],
        errorCode: '',
        loading: false,
        newDevicePassword: null,
        newPassword: null,
        patchedPerson: null,
        personenuebersicht: null,
        totalPersons: 0,
      };
    },
    actions: {
      resetState() {
        this.$reset();
      },
      async getAllPersons(filter: PersonFilter) {
        this.loading = true;
        try {
          // Fetch all persons
          const { data }: AxiosResponse<PersonFrontendControllerFindPersons200Response> =
            await personenFrontendApi.personFrontendControllerFindPersons(
              filter.offset,
              filter.limit,
              undefined,
              undefined,
              undefined,
              undefined,
              filter.organisationIDs,
              filter.rolleIDs,
              filter.searchFilter,
              filter.sortOrder,
              filter.sortField,
            );

          // Store the fetched persons
          const allPersons: Map<string, Person> = new Map();
          const personIds: string[] = []; // keep ids in an array, so we do not need to rely on the order of the map
          for (const personendatensatz of data.items) {
            const person: Person = Person.fromResponse(personendatensatz.person);
            allPersons.set(person.id, person);
            personIds.push(person.id);
          }
          this.totalPersons = +data.total;

          // Fetch overviews for all persons
          if (allPersons.size === 0) {
            this.allUebersichten = new Map<string, PersonWithZuordnungen>();
            return;
          }
          const bodyParams: PersonenuebersichtBodyParams = {
            personIds,
          };
          const { data: uebersichten }: { data: DBiamPersonenuebersichtControllerFindPersonenuebersichten200Response } =
            await personenuebersichtApi.dBiamPersonenuebersichtControllerFindPersonenuebersichten(bodyParams);
          const tempUebersichtenMap: Map<string, DBiamPersonenuebersichtResponse> = new Map(
            uebersichten.items.map((uebersicht: DBiamPersonenuebersichtResponse) => {
              return [uebersicht.personId, uebersicht];
            }),
          );
          this.allUebersichten = new Map<string, PersonWithZuordnungen>();
          // Aggregate the personen with their uebersichten
          for (const personId of personIds) {
            const person: Person = allPersons.get(personId)!;

            const uebersicht: DBiamPersonenuebersichtResponse | undefined = tempUebersichtenMap.get(personId);
            if (!uebersicht) {
              continue;
            }

            const zuordnungen: Zuordnung[] = uebersicht.zuordnungen.map(
              (zuordnungResponse: DBiamPersonenzuordnungResponse) => Zuordnung.fromResponse(zuordnungResponse),
            );
            const personWithZuordnungen: PersonWithZuordnungen = new PersonWithZuordnungen(person, zuordnungen);
            this.allUebersichten.set(person.id, personWithZuordnungen);
          }
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },

      async getPersonById(personId: string): Promise<void> {
        this.loading = true;
        this.errorCode = '';
        try {
          const { data }: AxiosResponse<PersonendatensatzResponse, unknown> =
            await personenApi.personControllerFindPersonById(personId);
          this.currentPerson = mapPersonendatensatzResponseToPersonendatensatz(data);
        } catch (error) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },

      async resetPassword(personId: string): Promise<void> {
        this.loading = true;
        try {
          const { data }: { data: string } = await personenApi.personControllerResetPasswordByPersonId(personId);
          this.newPassword = data;
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },

      async resetDevicePassword(personId?: string): Promise<void> {
        this.loading = true;
        try {
          let data: string;
          if (personId) {
            data = (await personenApi.personControllerResetUEMPasswordByPersonId(personId)).data;
          } else {
            data = (await personenApi.personControllerResetUEMPassword()).data;
          }
          this.newDevicePassword = data;
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },

      async deletePersonById(personId: string) {
        this.loading = true;
        try {
          await personenApi.personControllerDeletePersonById(personId);
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },

      async lockPerson(personId: string, bodyParams: LockUserBodyParams): Promise<void> {
        this.loading = true;
        try {
          await personenApi.personControllerLockPerson(personId, bodyParams);
          await this.getPersonById(personId);
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },

      async syncPersonById(personId: string) {
        this.loading = true;
        try {
          await personenApi.personControllerSyncPerson(personId);
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },

      async getPersonenuebersichtById(personId: string): Promise<void> {
        this.loading = true;
        try {
          const { data }: { data: DBiamPersonenuebersichtResponse } =
            await personenuebersichtApi.dBiamPersonenuebersichtControllerFindPersonenuebersichtenByPerson(personId);
          this.personenuebersicht = PersonenUebersicht.fromResponse(data);
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },

      async changePersonMetadataById(
        personId: string,
        vorname: string,
        familienname: string,
        personalnummer?: string,
      ): Promise<void> {
        this.loading = true;
        try {
          const personMetadataBodyParams: PersonMetadataBodyParams = {
            vorname: vorname,
            familienname: familienname,
            personalnummer: personalnummer,
            revision: this.currentPerson?.person.revision ?? '',
            lastModified: this.currentPerson?.person.lastModified ?? '',
          };
          const { data }: { data: PersonendatensatzResponse } = await personenApi.personControllerUpdateMetadata(
            personId,
            personMetadataBodyParams,
          );

          this.patchedPerson = data;
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'ERROR_LOADING_USER');
        } finally {
          this.loading = false;
        }
      },

      async getLandesbedienstetePerson(filter?: LandesbediensteterFilter): Promise<void> {
        this.loading = true;
        try {
          const { data }: AxiosResponse<PersonLandesbediensteterSearchResponse[]> =
            await personenApi.personControllerFindLandesbediensteter(
              filter?.personalnummer,
              filter?.primaryEmailAddress,
              filter?.username,
              filter?.vorname,
              filter?.nachname,
            );
          this.allLandesbedienstetePersonen = data;
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },
    },
  },
);
