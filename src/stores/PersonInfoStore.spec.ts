import { usePersonInfoStore, type PersonInfoStore } from './PersonInfoStore';
import axiosApiInstance from '@/services/ApiService';
import MockAdapter from 'axios-mock-adapter';
import { setActivePinia, createPinia } from 'pinia';
import type { PersonInfoResponse } from '@/api-client/generated/api';
import { DoFactory } from 'test/DoFactory';

const mockadapter: MockAdapter = new MockAdapter(axiosApiInstance);

describe('PersonInfoStore', () => {
  let personInfoStore: PersonInfoStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    personInfoStore = usePersonInfoStore();
    mockadapter.reset();
  });

  it('should initialize state correctly', () => {
    expect(personInfoStore.personInfo).toBeNull();
    expect(personInfoStore.errorCode).toEqual('');
    expect(personInfoStore.loading).toBe(false);
  });

  describe('initPersonInfo', () => {
    it('should load PersonInfo and update state', async () => {
      const mockPersonInfo: PersonInfoResponse = DoFactory.getPersonInfoResponse();

      mockadapter.onGet('/api/person-info').replyOnce(200, mockPersonInfo);
      const initPersonInfoPromise: Promise<void> = personInfoStore.initPersonInfo();
      expect(personInfoStore.loading).toBe(true);
      await initPersonInfoPromise;
      expect(personInfoStore.personInfo).toEqual(mockPersonInfo);
      expect(personInfoStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onGet('/api/person-info').replyOnce(500, { message: 'some mock server error' });
      const initPersonInfoPromise: Promise<void> = personInfoStore.initPersonInfo();
      expect(personInfoStore.loading).toBe(true);
      await initPersonInfoPromise;
      expect(personInfoStore.personInfo).toBeNull();
      expect(personInfoStore.errorMessage).toEqual('some mock server error');
      expect(personInfoStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onGet('/api/person-info').replyOnce(500, { message: 'some mock server error', code: '500' });
      const initPersonInfoPromise: Promise<void> = personInfoStore.initPersonInfo();
      expect(personInfoStore.loading).toBe(true);
      await initPersonInfoPromise;
      expect(personInfoStore.personInfo).toBeNull();
      expect(personInfoStore.errorCode).toEqual('500');
      expect(personInfoStore.loading).toBe(false);
    });
  });
});
