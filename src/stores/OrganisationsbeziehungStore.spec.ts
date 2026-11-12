import { SortFieldOrganisationsbeziehung, type OrganisationsbeziehungWithOrganisationenResponse } from '@/api-client/generated';
import axiosApiInstance from '@/services/ApiService';
import { SortOrder } from '@/utils/sorting';
import MockAdapter from 'axios-mock-adapter';
import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import { useOrganisationsbeziehungStore, type OrganisationsbeziehungStore } from './OrganisationsbeziehungStore';

const mockadapter: MockAdapter = new MockAdapter(axiosApiInstance);

describe('OrganisationsbeziehungStore', () => {
  let store: OrganisationsbeziehungStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useOrganisationsbeziehungStore();
    mockadapter.reset();
  });

  describe('loadBeziehungen', () => {
    it('should load beziehungen and total from the paging header', async () => {
      const beziehungen: Array<OrganisationsbeziehungWithOrganisationenResponse> = [
        DoFactory.getOrganisationsbeziehung(),
        DoFactory.getOrganisationsbeziehung(),
      ];
      mockadapter
        .onGet(/\/api\/organisationen\/org-1\/beziehungen.*/)
        .replyOnce(200, beziehungen, { 'x-paging-total': '12' });

      const promise: Promise<void> = store.loadBeziehungen('org-1');
      expect(store.loading).toBe(true);
      await promise;

      expect(store.loading).toBe(false);
      expect(store.beziehungen).toEqual(beziehungen);
      expect(store.total).toBe(12);
      expect(store.errorCode).toBe('');
    });

    it('should send pagination, search and sorting params', async () => {
      mockadapter.onGet(/\/api\/organisationen\/org-1\/beziehungen.*/).replyOnce(200, [], { 'x-paging-total': '0' });

      await store.loadBeziehungen('org-1', {
        offset: 30,
        limit: 30,
        searchString: 'abc',
        sortField: SortFieldOrganisationsbeziehung.AndereOrganisationName,
        sortOrder: SortOrder.Desc,
      });

      const requestUrl: string = mockadapter.history['get']![0]!.url!;
      expect(requestUrl).toContain('offset=30');
      expect(requestUrl).toContain('limit=30');
      expect(requestUrl).toContain('searchString=abc');
      expect(requestUrl).toContain('sortField=andereOrganisationName');
      expect(requestUrl).toContain('sortOrder=desc');
    });

    it('should not send an empty search string', async () => {
      mockadapter.onGet(/\/api\/organisationen\/org-1\/beziehungen.*/).replyOnce(200, [], { 'x-paging-total': '0' });

      await store.loadBeziehungen('org-1', { searchString: '' });

      expect(mockadapter.history['get']![0]!.url).not.toContain('searchString');
    });

    it('should handle error code', async () => {
      mockadapter
        .onGet(/\/api\/organisationen\/org-1\/beziehungen.*/)
        .replyOnce(500, { i18nKey: 'some mock server error' });

      await store.loadBeziehungen('org-1');

      expect(store.loading).toBe(false);
      expect(store.errorCode).toBe('some mock server error');
    });

    it('should handle string error', async () => {
      mockadapter.onGet(/\/api\/organisationen\/org-1\/beziehungen.*/).replyOnce(500, 'some mock server error');

      await store.loadBeziehungen('org-1');

      expect(store.errorCode).toBe('UNSPECIFIED_ERROR');
    });
  });
});
