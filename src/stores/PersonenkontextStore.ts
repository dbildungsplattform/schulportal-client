import axiosApiInstance from '@/services/ApiService';
import { getResponseErrorCode } from '@/utils/errorHandlers';
import { defineStore, type Store, type StoreDefinition } from 'pinia';
import {
  PersonenkontextApiFactory,
  type DbiamCreatePersonenkontextBodyParams,
  type DbiamCreatePersonWithPersonenkontexteBodyParams,
  type DBiamPersonenkontextResponse,
  type DBiamPersonResponse,
  type PersonenkontextApiInterface,
  type PersonenkontexteUpdateResponse,
  type PersonenkontextWorkflowResponse,
  type PersonenzuordnungBodyParams,
  type PersonenzuordnungenBearbeitenBodyParams,
  type RolleResponse,
  type SystemRechtResponse,
} from '../api-client/generated/api';
import { usePersonStore, type PersonStore } from './PersonStore';
import type { Zuordnung } from './types/Zuordnung';

const personenKontextApi: PersonenkontextApiInterface = PersonenkontextApiFactory(undefined, '', axiosApiInstance);

export enum KlassenOption {
  KEEP_KLASSE = 'keep_klasse',
  SELECT_NEW_KLASSE = 'select_new_klasse',
}

export enum BefristungOption {
  SCHULJAHRESENDE = 'schuljahresende',
  UNBEFRISTET = 'unbefristet',
}

export enum PersonenKontextTyp {
  Organisation = 'ORGANISATION',
  Klasse = 'KLASSE',
}

export enum OperationContext {
  PERSON_ANLEGEN = 'PERSON_ANLEGEN',
  PERSON_BEARBEITEN = 'PERSON_BEARBEITEN',
  LANDESBEDIENSTETEN_KONTEXT_ERWEITERN = 'LANDESBEDIENSTETEN_KONTEXT_ERWEITERN',
}

export enum CreationType {
  Limited = 'limited',
  Full = 'full',
  AddPersonToOwnSchule = 'add-person-to-own-schule',
}

export enum RolleDialogMode {
  MODIFY = 'modify',
  UNASSIGN = 'unassign',
}

export type PersonenkontextUpdate = PersonenzuordnungBodyParams;

export type WorkflowFilter = {
  operationContext: OperationContext;
  personId?: string;
  organisationId?: string;
  rollenIds?: string[];
  organisationName?: string;
  limit?: number;
};

export type LandesbediensteterWorkflowFilter = {
  organisationId?: string;
  rollenIds?: string[];
  rolleName?: string;
  organisationName?: string;
  limit?: number;
};

export function mapZuordnungToPersonenkontextUpdate(
  zuordnung: Pick<Zuordnung, 'sskId' | 'rolleId' | 'befristung'>,
): PersonenkontextUpdate {
  const befristung: string | undefined = zuordnung.befristung ?? undefined;
  return {
    organisationId: zuordnung.sskId,
    rolleId: zuordnung.rolleId,
    befristung,
  };
}

function buildUpdateParams(personenkontexte: PersonenkontextUpdate[]): PersonenzuordnungenBearbeitenBodyParams {
  const personStore: PersonStore = usePersonStore();

  return {
    lastModified: personStore.personenuebersicht?.lastModifiedZuordnungen ?? undefined,
    count: personStore.personenuebersicht?.zuordnungen.length ?? 0,
    personenkontexte,
  };
}

type PersonenkontextState = {
  updatedPersonenkontexte: PersonenkontexteUpdateResponse | null;
  workflowStepResponse: PersonenkontextWorkflowResponse | null;
  createdPersonWithKontext: DBiamPersonResponse | null;
  errorCode: string;
  loading: boolean;
  totalFilteredRollen: number;
  totalPaginatedRollen: number;
};

type PersonenkontextGetters = object;
type PersonenkontextActions = {
  processWorkflowStep: (filter: WorkflowFilter) => Promise<void>;
  updatePersonenkontexte: (
    personenkontexte: PersonenkontextUpdate[],
    personId: string,
    personalnummer?: string,
  ) => Promise<void>;
  createPersonWithKontexte: (params: DbiamCreatePersonWithPersonenkontexteBodyParams) => Promise<void>;
  zuordnenLandesbedienstete: (
    personenkontexte: PersonenkontextUpdate[],
    personId: string,
    personalnummer?: string,
  ) => Promise<void>;
};

export type {
  DbiamCreatePersonenkontextBodyParams,
  DBiamPersonenkontextResponse,
  PersonenkontexteUpdateResponse,
  PersonenkontextWorkflowResponse,
  RolleResponse,
  SystemRechtResponse,
};

export type UserinfoPersonenkontext = {
  organisationsId: string;
  rolle: {
    systemrechte: string[];
    serviceProviderIds: string[];
  };
};

export type PersonenkontextStore = Store<
  'personenkontextStore',
  PersonenkontextState,
  PersonenkontextGetters,
  PersonenkontextActions
>;

export const usePersonenkontextStore: StoreDefinition<
  'personenkontextStore',
  PersonenkontextState,
  PersonenkontextGetters,
  PersonenkontextActions
> = defineStore('personenkontextStore', {
  state: (): PersonenkontextState => {
    return {
      workflowStepResponse: null,
      updatedPersonenkontexte: null,
      createdPersonWithKontext: null,
      errorCode: '',
      loading: false,
      totalFilteredRollen: 0,
      totalPaginatedRollen: 0,
    };
  },
  actions: {
    async processWorkflowStep(filter: WorkflowFilter): Promise<void> {
      this.loading = true;
      try {
        const { data }: { data: PersonenkontextWorkflowResponse } =
          await personenKontextApi.dbiamPersonenkontextWorkflowControllerProcessStep(
            filter.operationContext,
            filter.personId,
            filter.organisationId,
            filter.rollenIds,
          );
        this.workflowStepResponse = data;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async zuordnenLandesbedienstete(
      updatedPersonenkontexte: PersonenkontextUpdate[],
      personId: string,
      personalnummer?: string,
    ): Promise<void> {
      this.loading = true;
      this.errorCode = '';
      try {
        const { data }: { data: PersonenkontexteUpdateResponse } =
          await personenKontextApi.personenkontextControllerFuegeLandesbedienstetenzuordnungHinzu(
            personId,
            buildUpdateParams(updatedPersonenkontexte),
            personalnummer,
          );
        this.updatedPersonenkontexte = data;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'PERSONENKONTEXTE_UPDATE_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async updatePersonenkontexte(
      updatedPersonenkontexte: PersonenkontextUpdate[],
      personId: string,
      personalnummer?: string,
    ): Promise<void> {
      this.loading = true;
      this.errorCode = '';
      try {
        const { data }: { data: PersonenkontexteUpdateResponse } =
          await personenKontextApi.personenkontextControllerBearbeitePersonenzuordnungen(
            personId,
            buildUpdateParams(updatedPersonenkontexte),
            personalnummer,
          );
        this.updatedPersonenkontexte = data;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'PERSONENKONTEXTE_UPDATE_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async createPersonWithKontexte(params: DbiamCreatePersonWithPersonenkontexteBodyParams): Promise<void> {
      this.loading = true;
      try {
        const { data }: { data: DBiamPersonResponse } =
          await personenKontextApi.dbiamPersonenkontextWorkflowControllerCreatePersonWithPersonenkontexte(params);
        this.createdPersonWithKontext = data;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },
  },
});
