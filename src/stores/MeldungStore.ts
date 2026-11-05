import {
  MeldungApiFactory,
  type CreateOrUpdateMeldungBodyParams,
  type MeldungApiInterface,
  type MeldungResponse,
} from '@/api-client/generated';
import axiosApiInstance from '@/services/ApiService';
import { getResponseErrorCode } from '@/utils/errorHandlers';
import type { AxiosResponse } from 'axios';
import { defineStore, type Store, type StoreDefinition } from 'pinia';

const meldungenApi: MeldungApiInterface = MeldungApiFactory(undefined, '', axiosApiInstance);

export type Meldung = {
  id?: string;
  text: string;
  status: MeldungStatus;
  revision?: number;
};

export enum MeldungStatus {
  VEROEFFENTLICHT = 'VEROEFFENTLICHT',
  NICHT_VEROEFFENTLICHT = 'NICHT_VEROEFFENTLICHT',
}
type MeldungState = {
  meldungen: Meldung[];
  currentMeldung: Meldung | null;
  loading: boolean;
  errorCode: string;
};

type MeldungGetters = object;

type MeldungActions = {
  getAllMeldungen: () => Promise<void>;
  getCurrentMeldung: () => Promise<void>;
  createOrUpdateMeldung: (meldung: Meldung) => Promise<void>;
};

export type MeldungStore = Store<'meldungStore', MeldungState, MeldungGetters, MeldungActions>;

export const useMeldungStore: StoreDefinition<'meldungStore', MeldungState, MeldungGetters, MeldungActions> =
  defineStore('meldungStore', {
    state: (): MeldungState => {
      return {
        meldungen: [],
        currentMeldung: null,
        loading: false,
        errorCode: '',
      };
    },
    actions: {
      async getAllMeldungen(): Promise<void> {
        this.loading = true;
        this.errorCode = '';
        try {
          const { data }: AxiosResponse<Array<MeldungResponse>> = await meldungenApi.meldungControllerGetAllMeldungen();
          this.meldungen = data.map((meldung: MeldungResponse) => ({
            id: meldung.id,
            text: meldung.inhalt,
            status: meldung.status as MeldungStatus,
            revision: meldung.revision,
          }));
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },
      async getCurrentMeldung(): Promise<void> {
        this.loading = true;
        this.errorCode = '';
        try {
          const { data }: AxiosResponse<MeldungResponse | null> =
            await meldungenApi.meldungControllerGetCurrentMeldung();
          if (data.id) {
            this.currentMeldung = {
              id: data.id,
              text: data.inhalt,
              status: data.status as MeldungStatus,
              revision: data.revision,
            };
          }
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },
      async createOrUpdateMeldung(meldung: Meldung): Promise<void> {
        this.loading = true;
        this.errorCode = '';
        try {
          const params: CreateOrUpdateMeldungBodyParams = {
            id: meldung.id,
            inhalt: meldung.text,
            status: meldung.status,
            revision: meldung.revision ?? 0,
          };
          await meldungenApi.meldungControllerCreateOrUpdateMeldung(params);
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },
    },
  });
