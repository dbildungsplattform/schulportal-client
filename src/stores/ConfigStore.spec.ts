import type { FeatureFlagResponse } from '@/api-client/generated';
import axiosApiInstance from '@/services/ApiService';
import MockAdapter from 'axios-mock-adapter';
import { setActivePinia, createPinia } from 'pinia';
import { useConfigStore, type ConfigStore } from './ConfigStore';

const mockadapter: MockAdapter = new MockAdapter(axiosApiInstance);

describe('ConfigStore', () => {
  let configStore: ConfigStore;
  beforeEach(() => {
    setActivePinia(createPinia());
    configStore = useConfigStore();
    mockadapter.reset();
  });

  describe('getFeatureFlags', () => {
    it('should get the feature flags and load state', async () => {
      const mockFeatureFlags: FeatureFlagResponse = {
        rolleBearbeitenEnabled: false,
        befristungBearbeitenEnabled: false,
        rolleErweiternEnabled: false,
        setUemPasswordEnabled: false,
        schulischeAngeboteErstellen: false,
      };

      mockadapter.onGet('/api/config').replyOnce(200, mockFeatureFlags);
      const getFeatureFlagsPromise: Promise<void> = configStore.getFeatureFlags();
      expect(configStore.configData).toBe(null);
      await getFeatureFlagsPromise;
      expect(configStore.loading).toBe(false);
      expect(configStore.configData).toEqual(mockFeatureFlags);
    });

    it('should handle string error', async () => {
      mockadapter.onGet('/api/config').replyOnce(500, 'some mock server error');
      const getFeatureFlagsPromise: Promise<void> = configStore.getFeatureFlags();
      expect(configStore.configData).toBe(null);
      await getFeatureFlagsPromise;
      expect(configStore.loading).toBe(false);
      expect(configStore.configData).toBe(null);
      expect(configStore.errorCode).toEqual('UNSPECIFIED_ERROR');
    });

    it('should handle error code', async () => {
      mockadapter.onGet('/api/config').replyOnce(500, { i18nKey: 'some mock server error' });
      const getFeatureFlagsPromise: Promise<void> = configStore.getFeatureFlags();
      expect(configStore.configData).toBe(null);
      await getFeatureFlagsPromise;
      expect(configStore.loading).toBe(false);
      expect(configStore.configData).toBe(null);
      expect(configStore.errorCode).toEqual('some mock server error');
    });
  });
});
