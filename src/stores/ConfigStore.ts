import { defineStore, type Store, type StoreDefinition } from 'pinia';
import { type AxiosResponse } from 'axios';
import { getResponseErrorCode } from '@/utils/errorHandlers';
import { ConfigApiFactory, type ConfigApiInterface, type FeatureFlagResponse } from '../api-client/generated/api';
import axiosApiInstance from '@/services/ApiService';

const configApi: ConfigApiInterface = ConfigApiFactory(undefined, '', axiosApiInstance);

type ConfigState = {
  errorCode: string | null;
  configData: FeatureFlagResponse | null;
  loading: boolean;
};

type ConfigGetters = object;
type ConfigActions = {
  getFeatureFlags: () => Promise<void>;
};

export type ConfigStore = Store<'configStore', ConfigState, ConfigGetters, ConfigActions>;

export const useConfigStore: StoreDefinition<'configStore', ConfigState, ConfigGetters, ConfigActions> = defineStore(
  'configStore',
  {
    state: (): ConfigState => {
      return {
        errorCode: null,
        configData: null,
        loading: false,
      };
    },
    actions: {
      async getFeatureFlags(): Promise<void> {
        this.loading = true;
        try {
          const response: AxiosResponse<FeatureFlagResponse> = await configApi.configControllerGetFeatureFlags();

          this.configData = response.data;
        } catch (error: unknown) {
          this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
        } finally {
          this.loading = false;
        }
      },
    },
  },
);
