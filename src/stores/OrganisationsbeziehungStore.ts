import axiosApiInstance from '@/services/ApiService';
import { getResponseErrorCode } from '@/utils/errorHandlers';
import type { SortOrder } from '@/utils/sorting';
import { type AxiosResponse } from 'axios';
import { defineStore, type Store, type StoreDefinition } from 'pinia';
import {
  OrganisationenApiFactory,
  type OrganisationenApiInterface,
  type OrganisationsbeziehungWithOrganisationenResponse,
  type SortFieldOrganisationsbeziehung,
} from '../api-client/generated/api';

const organisationApi: OrganisationenApiInterface = OrganisationenApiFactory(undefined, '', axiosApiInstance);

export type OrganisationsbeziehungenParams = {
  offset?: number;
  limit?: number;
  searchString?: string;
  sortOrder?: SortOrder;
  sortField?: SortFieldOrganisationsbeziehung;
};

type OrganisationsbeziehungState = {
  beziehungen: Array<OrganisationsbeziehungWithOrganisationenResponse>;
  total: number;
  errorCode: string;
  loading: boolean;
};

type OrganisationsbeziehungGetters = object;

type OrganisationsbeziehungActions = {
  loadBeziehungen: (organisationId: string, params?: OrganisationsbeziehungenParams) => Promise<void>;
};

export type OrganisationsbeziehungStore = Store<
  'organisationsbeziehungStore',
  OrganisationsbeziehungState,
  OrganisationsbeziehungGetters,
  OrganisationsbeziehungActions
>;

export const useOrganisationsbeziehungStore: StoreDefinition<
  'organisationsbeziehungStore',
  OrganisationsbeziehungState,
  OrganisationsbeziehungGetters,
  OrganisationsbeziehungActions
> = defineStore('organisationsbeziehungStore', {
  state: (): OrganisationsbeziehungState => ({
    beziehungen: [],
    total: 0,
    errorCode: '',
    loading: false,
  }),

  actions: {
    async loadBeziehungen(organisationId: string, params?: OrganisationsbeziehungenParams): Promise<void> {
      this.loading = true;
      this.errorCode = '';
      try {
        const response: AxiosResponse<Array<OrganisationsbeziehungWithOrganisationenResponse>> =
          await organisationApi.organisationControllerGetOrganisationsbeziehungen(
            organisationId,
            params?.offset,
            params?.limit,
            params?.searchString || undefined,
            params?.sortOrder,
            params?.sortField,
          );
        this.beziehungen = response.data;
        this.total = +response.headers['x-paging-total'];
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },
  },
});
