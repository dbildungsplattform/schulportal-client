import {
  OrganisationResponse,
  OrganisationsTyp,
  type OrganisationControllerFindOrganizations200Response,
  type OrganisationRootChildrenResponse,
} from '@/api-client/generated';
import axiosApiInstance from '@/services/ApiService';
import { faker } from '@faker-js/faker';
import { flushPromises } from '@vue/test-utils';
import MockAdapter from 'axios-mock-adapter';
import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import { watch, type WatchStopHandle } from 'vue';
import {
  OrganisationsbeziehungsTyp,
  useOrganisationStore,
  type AutoCompleteStore,
  type Organisation,
  type OrganisationenFilter,
  type OrganisationStore,
} from './OrganisationStore';

const setup = (): { organisationStore: OrganisationStore; mockadapter: MockAdapter } => {
  setActivePinia(createPinia());
  const organisationStore: OrganisationStore = useOrganisationStore();
  organisationStore.$reset();
  vi.restoreAllMocks();
  const mockadapter: MockAdapter = new MockAdapter(axiosApiInstance);
  onTestFinished(() => mockadapter.restore());
  return { organisationStore, mockadapter };
};

const pagedResponse = (
  items: OrganisationResponse[],
  total: number = items.length,
  pageTotal: number = items.length,
): OrganisationControllerFindOrganizations200Response => ({
  items,
  total,
  offset: 0,
  limit: 30,
  pageTotal,
});

describe('OrganisationStore', () => {
  it('should initialize state correctly', () => {
    const { organisationStore }: ReturnType<typeof setup> = setup();
    expect(organisationStore.allOrganisationen).toEqual([]);
    expect(organisationStore.searchedOrganisations).toEqual([]);
    expect(organisationStore.relationshipSearchLoading).toBe(false);
    expect(organisationStore.createdBehoerde).toBeNull();
    expect(organisationStore.errorCode).toEqual('');
    expect(organisationStore.relationshipErrorCode).toEqual('');
    expect(organisationStore.loading).toBe(false);
  });

  describe('relationship actions', (): void => {
    type DeferredResponse<T> = {
      promise: Promise<T>;
      resolve: (value: T) => void;
    };

    function setupRelationship(): {
      store: OrganisationStore;
      mockadapter: MockAdapter;
      schule: Organisation;
      behoerde: Organisation;
    } {
      const { organisationStore: store, mockadapter }: ReturnType<typeof setup> = setup();
      const schule: Organisation = DoFactory.getSchule();
      const behoerde: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde });
      return { store, mockadapter, schule, behoerde };
    }

    function createDeferredResponse<T>(): DeferredResponse<T> {
      let resolvePromise: ((value: T) => void) | undefined;
      const promise: Promise<T> = new Promise<T>((resolve: (value: T | PromiseLike<T>) => void): void => {
        resolvePromise = (value: T): void => resolve(value);
      });
      const resolve: (value: T) => void = (value: T): void => {
        if (!resolvePromise) {
          throw new Error('The deferred response has not been initialized.');
        }
        resolvePromise(value);
      };

      return { promise, resolve };
    }

    it('should search eligible organisations and replace stale results', async (): Promise<void> => {
      const { store, mockadapter, schule, behoerde }: ReturnType<typeof setupRelationship> = setupRelationship();
      store.searchedOrganisations = [DoFactory.getOrganisation()];
      store.errorCode = 'DETAIL_LOADING_ERROR';
      mockadapter
        .onGet(new RegExp(`^/api/organisationen/${schule.id}/search-for-relationships(?:\\?|$)`))
        .replyOnce(200, [behoerde]);

      const request: Promise<void> = store.searchOrganisationsForRelationships(schule.id, 'Gymnasium');
      expect(store.relationshipSearchLoading).toBe(true);
      expect(store.loading).toBe(false);
      expect(store.errorCode).toBe('DETAIL_LOADING_ERROR');
      expect(store.searchedOrganisations).toEqual([]);
      await request;

      const requestUrl: URL = new URL(mockadapter.history.get[0]!.url!, 'http://localhost');
      expect(requestUrl.pathname).toBe(`/api/organisationen/${schule.id}/search-for-relationships`);
      expect(requestUrl.searchParams.get('offset')).toBe('0');
      expect(requestUrl.searchParams.get('limit')).toBe('200');
      expect(requestUrl.searchParams.get('searchString')).toBe('Gymnasium');
      expect(store.searchedOrganisations).toEqual([behoerde]);
      expect(store.errorCode).toBe('DETAIL_LOADING_ERROR');
      expect(store.relationshipErrorCode).toBe('');
      expect(store.relationshipSearchLoading).toBe(false);
      expect(store.loading).toBe(false);
    });

    it('should load eligible organisations from the paged search response body', async (): Promise<void> => {
      const { store, mockadapter, schule, behoerde }: ReturnType<typeof setupRelationship> = setupRelationship();
      mockadapter
        .onGet(new RegExp(`^/api/organisationen/${schule.id}/search-for-relationships(?:\\?|$)`))
        .replyOnce(200, {
          items: [behoerde],
          total: 1,
          offset: 0,
          limit: 200,
        });

      await store.searchOrganisationsForRelationships(schule.id);

      expect(store.searchedOrganisations).toEqual([behoerde]);
      expect(store.relationshipSearchLoading).toBe(false);
      expect(store.relationshipErrorCode).toBe('');
    });

    it('should surface candidate search errors and stop loading', async (): Promise<void> => {
      const { store, mockadapter, schule, behoerde }: ReturnType<typeof setupRelationship> = setupRelationship();
      store.searchedOrganisations = [behoerde];
      store.errorCode = 'DETAIL_LOADING_ERROR';
      mockadapter
        .onGet(new RegExp(`^/api/organisationen/${schule.id}/search-for-relationships(?:\\?|$)`))
        .replyOnce(500, { code: 'MISSING_PERMISSIONS' });

      await store.searchOrganisationsForRelationships(schule.id);

      expect(store.errorCode).toBe('DETAIL_LOADING_ERROR');
      expect(store.relationshipErrorCode).toBe('MISSING_PERMISSIONS');
      expect(store.searchedOrganisations).toEqual([]);
      expect(store.relationshipSearchLoading).toBe(false);
      expect(store.loading).toBe(false);
    });

    it('should ignore stale search responses and keep loading for the latest request', async (): Promise<void> => {
      const { store, mockadapter, schule, behoerde }: ReturnType<typeof setupRelationship> = setupRelationship();
      const staleOrganisation: Organisation = DoFactory.getOrganisation();
      const staleSuccessResponse: DeferredResponse<[number, Organisation[]]> =
        createDeferredResponse<[number, Organisation[]]>();
      const staleErrorResponse: DeferredResponse<[number, { code: string }]> =
        createDeferredResponse<[number, { code: string }]>();
      const latestResponse: DeferredResponse<[number, Organisation[]]> =
        createDeferredResponse<[number, Organisation[]]>();
      const searchUrl: RegExp = new RegExp(`^/api/organisationen/${schule.id}/search-for-relationships(?:\\?|$)`);
      mockadapter.onGet(searchUrl).replyOnce(() => staleSuccessResponse.promise);
      mockadapter.onGet(searchUrl).replyOnce(() => staleErrorResponse.promise);
      mockadapter.onGet(searchUrl).replyOnce(() => latestResponse.promise);

      const staleSuccessRequest: Promise<void> = store.searchOrganisationsForRelationships(schule.id, 'older');
      const staleErrorRequest: Promise<void> = store.searchOrganisationsForRelationships(schule.id, 'oldest');
      const latestRequest: Promise<void> = store.searchOrganisationsForRelationships(schule.id, 'latest');

      staleSuccessResponse.resolve([200, [staleOrganisation]]);
      await staleSuccessRequest;
      expect(store.searchedOrganisations).toEqual([]);
      expect(store.relationshipErrorCode).toBe('');
      expect(store.relationshipSearchLoading).toBe(true);

      staleErrorResponse.resolve([500, { code: 'STALE_SEARCH_ERROR' }]);
      await staleErrorRequest;
      expect(store.searchedOrganisations).toEqual([]);
      expect(store.relationshipErrorCode).toBe('');
      expect(store.relationshipSearchLoading).toBe(true);

      latestResponse.resolve([200, [behoerde]]);
      await latestRequest;
      expect(store.searchedOrganisations).toEqual([behoerde]);
      expect(store.relationshipSearchLoading).toBe(false);
    });

    it('should not let an older response replace a completed latest search', async (): Promise<void> => {
      const { store, mockadapter, schule, behoerde }: ReturnType<typeof setupRelationship> = setupRelationship();
      const staleOrganisation: Organisation = DoFactory.getOrganisation();
      const staleResponse: DeferredResponse<[number, Organisation[]]> =
        createDeferredResponse<[number, Organisation[]]>();
      const latestResponse: DeferredResponse<[number, Organisation[]]> =
        createDeferredResponse<[number, Organisation[]]>();
      const searchUrl: RegExp = new RegExp(`^/api/organisationen/${schule.id}/search-for-relationships(?:\\?|$)`);
      mockadapter.onGet(searchUrl).replyOnce(() => staleResponse.promise);
      mockadapter.onGet(searchUrl).replyOnce(() => latestResponse.promise);

      const staleRequest: Promise<void> = store.searchOrganisationsForRelationships(schule.id, 'older');
      const latestRequest: Promise<void> = store.searchOrganisationsForRelationships(schule.id, 'latest');
      latestResponse.resolve([200, [behoerde]]);
      await latestRequest;
      expect(store.searchedOrganisations).toEqual([behoerde]);
      expect(store.relationshipSearchLoading).toBe(false);

      staleResponse.resolve([200, [staleOrganisation]]);
      await staleRequest;
      expect(store.searchedOrganisations).toEqual([behoerde]);
      expect(store.relationshipSearchLoading).toBe(false);
    });

    it('should derive the Schulaufsicht payload from a school and Behörde', async (): Promise<void> => {
      const { store, mockadapter, schule, behoerde }: ReturnType<typeof setupRelationship> = setupRelationship();
      store.errorCode = 'CREATE_RELATIONSHIP_ERROR';
      mockadapter.onPost('/api/organisationen/beziehungen').replyOnce(201);

      await store.createOrganisationRelationship(schule, behoerde);

      const requestData: unknown = mockadapter.history.post[0]?.data;
      if (typeof requestData !== 'string') {
        throw new Error('The relationship request payload is missing.');
      }
      expect(JSON.parse(requestData)).toEqual({
        quellOrganisationId: schule.id,
        zielOrganisationId: behoerde.id,
        typ: OrganisationsbeziehungsTyp.Schulaufsicht,
      });
      expect(store.errorCode).toBe('CREATE_RELATIONSHIP_ERROR');
      expect(store.relationshipErrorCode).toBe('');
    });

    it.each([OrganisationsTyp.Behoerde, OrganisationsTyp.Traeger])(
      'should derive the relationship direction and type for a %s source',
      async (sourceType: OrganisationsTyp): Promise<void> => {
        const { store, mockadapter, schule }: ReturnType<typeof setupRelationship> = setupRelationship();
        const source: Organisation = DoFactory.getOrganisation({ typ: sourceType });
        mockadapter.onPost('/api/organisationen/beziehungen').replyOnce(201);

        await store.createOrganisationRelationship(source, schule);

        const requestData: unknown = mockadapter.history.post[0]?.data;
        if (typeof requestData !== 'string') {
          throw new Error('The relationship request payload is missing.');
        }
        expect(JSON.parse(requestData)).toEqual({
          quellOrganisationId: schule.id,
          zielOrganisationId: source.id,
          typ:
            sourceType === OrganisationsTyp.Behoerde
              ? OrganisationsbeziehungsTyp.Schulaufsicht
              : OrganisationsbeziehungsTyp.Schultraeger,
        });
      },
    );

    it('should derive a Schultraeger relationship when the school is the context', async (): Promise<void> => {
      const { store, mockadapter, schule }: ReturnType<typeof setupRelationship> = setupRelationship();
      const schultraeger: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Traeger });
      mockadapter.onPost('/api/organisationen/beziehungen').replyOnce(201);

      await store.createOrganisationRelationship(schule, schultraeger);

      const requestData: unknown = mockadapter.history.post[0]?.data;
      if (typeof requestData !== 'string') {
        throw new Error('The relationship request payload is missing.');
      }
      expect(JSON.parse(requestData)).toEqual({
        quellOrganisationId: schule.id,
        zielOrganisationId: schultraeger.id,
        typ: OrganisationsbeziehungsTyp.Schultraeger,
      });
    });

    it('should reject unsupported relationship types without sending a request', async (): Promise<void> => {
      const { store, mockadapter }: ReturnType<typeof setupRelationship> = setupRelationship();
      const contextOrganisation: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde });
      const selectedOrganisation: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Traeger });

      await store.createOrganisationRelationship(contextOrganisation, selectedOrganisation);

      expect(mockadapter.history.post).toHaveLength(0);
      expect(store.relationshipErrorCode).toBe('CREATE_RELATIONSHIP_ERROR');
    });

    it('should set relationship errors without changing detail error state', async (): Promise<void> => {
      const { store, mockadapter, schule, behoerde }: ReturnType<typeof setupRelationship> = setupRelationship();
      store.errorCode = 'DETAIL_LOADING_ERROR';
      mockadapter.onPost('/api/organisationen/beziehungen').replyOnce(400, {
        i18nKey: 'SCHULAUFSICHT_SCHULE_UND_AUFSICHT_SELBER_BAUM',
      });

      await store.createOrganisationRelationship(schule, behoerde);

      expect(store.relationshipErrorCode).toBe('SCHULAUFSICHT_SCHULE_UND_AUFSICHT_SELBER_BAUM');
      expect(store.errorCode).toBe('DETAIL_LOADING_ERROR');
      mockadapter.onPost('/api/organisationen/beziehungen').replyOnce(201);
      await store.createOrganisationRelationship(schule, behoerde);
      expect(store.errorCode).toBe('DETAIL_LOADING_ERROR');
      expect(store.relationshipErrorCode).toBe('');
    });

    it('should use the fallback error code for unstructured save errors', async (): Promise<void> => {
      const { store, mockadapter, schule, behoerde }: ReturnType<typeof setupRelationship> = setupRelationship();
      mockadapter.onPost('/api/organisationen/beziehungen').replyOnce(500, 'Unexpected server error');

      await store.createOrganisationRelationship(schule, behoerde);

      expect(store.relationshipErrorCode).toBe('CREATE_RELATIONSHIP_ERROR');
    });

    it('should save relationships sequentially, update progress, and retain individual failures', async (): Promise<void> => {
      const { store, mockadapter, schule, behoerde }: ReturnType<typeof setupRelationship> = setupRelationship();
      const schultraeger: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Traeger });
      const anotherBehoerde: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde });
      const selectedOrganisations: Organisation[] = [behoerde, schultraeger, anotherBehoerde];
      const secondResponse: DeferredResponse<[number, { i18nKey: string }]> =
        createDeferredResponse<[number, { i18nKey: string }]>();
      mockadapter.onPost('/api/organisationen/beziehungen').replyOnce(201);
      mockadapter.onPost('/api/organisationen/beziehungen').replyOnce(() => secondResponse.promise);
      mockadapter.onPost('/api/organisationen/beziehungen').replyOnce(201);

      const batchRequest: Promise<void> = store.createOrganisationRelationships(schule, selectedOrganisations);
      expect(store.relationshipBatch.isRunning).toBe(true);
      expect(store.relationshipBatch.isComplete).toBe(false);
      expect(store.relationshipBatch.completed).toBe(0);
      expect(store.relationshipBatch.total).toBe(3);
      expect(store.relationshipBatch.progress).toBe(0);

      await store.createOrganisationRelationships(schule, [DoFactory.getOrganisation()]);
      expect(store.relationshipBatch.isRunning).toBe(true);
      expect(store.relationshipBatch.total).toBe(3);

      await vi.waitFor((): void => {
        expect(mockadapter.history.post).toHaveLength(2);
      });
      expect(store.relationshipBatch.completed).toBe(1);
      expect(store.relationshipBatch.progress).toBe(34);
      expect(store.relationshipBatch.failures).toEqual([]);

      secondResponse.resolve([400, { i18nKey: 'RELATIONSHIP_CONSISTENCY_ERROR' }]);
      await batchRequest;

      expect(mockadapter.history.post).toHaveLength(3);
      expect(store.relationshipBatch.isRunning).toBe(false);
      expect(store.relationshipBatch.isComplete).toBe(true);
      expect(store.relationshipBatch.completed).toBe(3);
      expect(store.relationshipBatch.progress).toBe(100);
      expect(store.relationshipBatch.failures).toEqual([
        { organisation: schultraeger, errorCode: 'RELATIONSHIP_CONSISTENCY_ERROR' },
      ]);
      expect(store.relationshipErrorCode).toBe('');
    });

    it('should record failures for every selection when the context organisation is unavailable', async (): Promise<void> => {
      const { store, mockadapter, behoerde }: ReturnType<typeof setupRelationship> = setupRelationship();
      const schultraeger: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Traeger });

      await store.createOrganisationRelationships(undefined, [behoerde, schultraeger]);

      expect(mockadapter.history.post).toHaveLength(0);
      expect(store.relationshipBatch.isComplete).toBe(true);
      expect(store.relationshipBatch.completed).toBe(2);
      expect(store.relationshipBatch.progress).toBe(100);
      expect(store.relationshipBatch.failures).toEqual([
        { organisation: behoerde, errorCode: 'CREATE_RELATIONSHIP_ERROR' },
        { organisation: schultraeger, errorCode: 'CREATE_RELATIONSHIP_ERROR' },
      ]);
      expect(store.relationshipErrorCode).toBe('CREATE_RELATIONSHIP_ERROR');
    });

    it('should clear batch state and the previous relationship error for an empty batch', async (): Promise<void> => {
      const { store, mockadapter, schule, behoerde }: ReturnType<typeof setupRelationship> = setupRelationship();
      store.relationshipErrorCode = 'PREVIOUS_ERROR';
      store.relationshipBatch.failures = [{ organisation: behoerde, errorCode: 'PREVIOUS_ERROR' }];
      store.relationshipBatch.completed = 1;

      await store.createOrganisationRelationships(schule, []);

      expect(store.relationshipBatch).toEqual({
        isRunning: false,
        isComplete: false,
        completed: 0,
        total: 0,
        progress: 0,
        failures: [],
      });
      expect(store.relationshipErrorCode).toBe('');
      expect(mockadapter.history.post).toHaveLength(0);
    });

    it('should reset completed relationship batch state', async (): Promise<void> => {
      const { store, mockadapter, schule, behoerde }: ReturnType<typeof setupRelationship> = setupRelationship();
      mockadapter.onPost('/api/organisationen/beziehungen').replyOnce(201);
      await store.createOrganisationRelationships(schule, [behoerde]);

      store.resetOrganisationRelationshipBatch();

      expect(store.relationshipBatch).toEqual({
        isRunning: false,
        isComplete: false,
        completed: 0,
        total: 0,
        progress: 0,
        failures: [],
      });
    });

    it('should keep a reset batch cleared when an in-flight save resolves', async (): Promise<void> => {
      const { store, mockadapter, schule, behoerde }: ReturnType<typeof setupRelationship> = setupRelationship();
      const anotherBehoerde: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde });
      const pendingResponse: DeferredResponse<[number, { i18nKey: string }]> =
        createDeferredResponse<[number, { i18nKey: string }]>();
      mockadapter.onPost('/api/organisationen/beziehungen').replyOnce(() => pendingResponse.promise);
      mockadapter.onPost('/api/organisationen/beziehungen').replyOnce(201);

      const batchRequest: Promise<void> = store.createOrganisationRelationships(schule, [behoerde, anotherBehoerde]);
      await vi.waitFor((): void => {
        expect(mockadapter.history.post).toHaveLength(1);
      });

      store.resetOrganisationRelationshipBatch();
      expect(store.relationshipBatch).toEqual({
        isRunning: false,
        isComplete: false,
        completed: 0,
        total: 0,
        progress: 0,
        failures: [],
      });

      pendingResponse.resolve([400, { i18nKey: 'RELATIONSHIP_CONSISTENCY_ERROR' }]);
      await batchRequest;

      expect(mockadapter.history.post).toHaveLength(1);
      expect(store.relationshipBatch).toEqual({
        isRunning: false,
        isComplete: false,
        completed: 0,
        total: 0,
        progress: 0,
        failures: [],
      });
      expect(store.relationshipErrorCode).toBe('');
    });

    it('should stop before the next save when reset between selections', async (): Promise<void> => {
      const { store, mockadapter, schule, behoerde }: ReturnType<typeof setupRelationship> = setupRelationship();
      const anotherBehoerde: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde });
      mockadapter.onPost('/api/organisationen/beziehungen').replyOnce(201);
      const stopWatching: WatchStopHandle = watch(
        (): number => store.relationshipBatch.progress,
        (progress: number): void => {
          if (progress > 0) {
            store.resetOrganisationRelationshipBatch();
          }
        },
        { flush: 'sync' },
      );

      await store.createOrganisationRelationships(schule, [behoerde, anotherBehoerde]);
      stopWatching();

      expect(mockadapter.history.post).toHaveLength(1);
      expect(store.relationshipBatch).toEqual({
        isRunning: false,
        isComplete: false,
        completed: 0,
        total: 0,
        progress: 0,
        failures: [],
      });
    });
  });

  describe('getAllOrganisations', () => {
    it('should clear results and counts when the paginated response is empty', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      organisationStore.allOrganisationen = [DoFactory.getOrganisation()];
      organisationStore.totalOrganisationen = 42;
      mockadapter.onGet('/api/organisationen').replyOnce(200, pagedResponse([]));

      await organisationStore.getAllOrganisationen();
      await flushPromises();

      expect(organisationStore.allOrganisationen).toEqual([]);
      expect(organisationStore.totalOrganisationen).toBe(0);
      expect(organisationStore.errorCode).toBe('');
      expect(organisationStore.loading).toBe(false);
    });

    it('should fetch all organisations and update state', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const mockResponse: OrganisationResponse[] = [DoFactory.getOrganisationResponse()];

      mockadapter.onGet('/api/organisationen?offset=0&limit=30').replyOnce(200, pagedResponse(mockResponse, 42));
      const getAllOrganisationenPromise: Promise<void> = organisationStore.getAllOrganisationen({
        offset: 0,
        limit: 30,
      });

      await getAllOrganisationenPromise;

      expect(organisationStore.allOrganisationen).toEqual(mockResponse);
      expect(organisationStore.totalOrganisationen).toBe(42);
      expect(organisationStore.errorCode).toBe('');
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onGet('/api/organisationen?offset=0&limit=30').replyOnce(500, 'some mock server error');

      const getAllOrganisationenPromise: Promise<void> = organisationStore.getAllOrganisationen({
        offset: 0,
        limit: 30,
      });

      expect(organisationStore.loading).toBe(true);
      await getAllOrganisationenPromise;

      expect(organisationStore.allOrganisationen).toEqual([]);
      expect(organisationStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onGet('/api/organisationen?offset=0&limit=30').replyOnce(500, { code: 'some mock server error' });
      const getAllOrganisationenPromise: Promise<void> = organisationStore.getAllOrganisationen({
        offset: 0,
        limit: 30,
      });

      expect(organisationStore.loading).toBe(true);
      await getAllOrganisationenPromise;

      expect(organisationStore.allOrganisationen).toEqual([]);
      expect(organisationStore.errorCode).toEqual('some mock server error');
      expect(organisationStore.loading).toBe(false);
    });

    it('should accept filter', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const mockResponse: OrganisationResponse[] = [DoFactory.getOrganisationResponse()];

      mockadapter
        .onGet('/api/organisationen?offset=0&limit=30&searchString=searchString&systemrechte=ROLLEN_VERWALTEN')
        .replyOnce(200, pagedResponse(mockResponse));
      const getAllOrganisationenPromise: Promise<void> = organisationStore.getAllOrganisationen({
        offset: 0,
        limit: 30,
        searchString: 'searchString',
        systemrechte: ['ROLLEN_VERWALTEN'],
      });

      await getAllOrganisationenPromise;

      expect(organisationStore.allOrganisationen).toEqual(mockResponse);
      expect(organisationStore.loading).toBe(false);
    });

    it('should accept filter for typ Klasse', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const schule: OrganisationResponse = DoFactory.getOrganisationResponse({ typ: OrganisationsTyp.Schule });
      const klasse: OrganisationResponse = DoFactory.getOrganisationResponse({
        typ: OrganisationsTyp.Klasse,
        administriertVon: schule.id,
      });
      const mockResponse: OrganisationResponse[] = [klasse];

      mockadapter
        .onGet('/api/organisationen?offset=0&limit=30&typ=KLASSE')
        .replyOnce(200, pagedResponse(mockResponse, 42));
      mockadapter.onPost('/api/organisationen/by-ids', { organisationIds: [schule.id] }).replyOnce(200, [schule]);
      const getAllOrganisationenPromise: Promise<void> = organisationStore.getAllOrganisationen({
        offset: 0,
        limit: 30,
        includeTyp: OrganisationsTyp.Klasse,
      });

      await getAllOrganisationenPromise;
      expect(organisationStore.allKlassen).toEqual([
        { ...klasse, schuleDetails: `${schule.kennung} (${schule.name.trim()})` },
      ]);
      expect(organisationStore.totalKlassen).toBe(42);
      expect(organisationStore.errorCode).toBe('');
      expect(organisationStore.loading).toBe(false);
    });

    it('should accept filter for typ Schule', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const mockResponse: OrganisationResponse[] = [
        DoFactory.getOrganisationResponse({ typ: OrganisationsTyp.Schule }),
      ];

      mockadapter
        .onGet('/api/organisationen?offset=0&limit=30&typ=SCHULE')
        .replyOnce(200, pagedResponse(mockResponse, 42));
      const getAllOrganisationenPromise: Promise<void> = organisationStore.getAllOrganisationen({
        offset: 0,
        limit: 30,
        includeTyp: OrganisationsTyp.Schule,
      });

      await getAllOrganisationenPromise;

      expect(organisationStore.allSchulen).toEqual(mockResponse);
      expect(organisationStore.totalSchulen).toEqual(42);
      expect(organisationStore.loading).toBe(false);
    });

    it('should accept filter for typ Traeger', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const traeger: OrganisationResponse = DoFactory.getOrganisationResponse({ typ: OrganisationsTyp.Traeger });
      const schule: OrganisationResponse = DoFactory.getOrganisationResponse({
        typ: OrganisationsTyp.Schule,
      });
      const mockResponse: OrganisationResponse[] = [traeger];

      mockadapter
        .onGet('/api/organisationen?offset=0&limit=30&typ=TRAEGER')
        .replyOnce(200, pagedResponse(mockResponse, 42));
      mockadapter
        .onGet(`/api/organisationen?limit=30&typ=SCHULE&systemrechte=SCHULTRAEGER_VERWALTEN&zugehoerigZu=${traeger.id}`)
        .replyOnce(200, pagedResponse([schule]));

      const getAllOrganisationenPromise: Promise<void> = organisationStore.getAllOrganisationen({
        offset: 0,
        limit: 30,
        includeTyp: OrganisationsTyp.Traeger,
      });

      await getAllOrganisationenPromise;
      expect(organisationStore.allSchultraeger).toEqual([traeger]);
      expect(organisationStore.totalSchultraeger).toBe(42);
      expect(organisationStore.errorCode).toBe('');
      expect(organisationStore.loading).toBe(false);
    });
  });

  describe('getOrganisationById', () => {
    it('should load schule and update state', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const mockResponse: Organisation[] = [
        {
          id: '1',
          kennung: 'Org1',
          name: 'Organisation 1',
          namensergaenzung: 'Ergänzung',
          kuerzel: 'O1',
          typ: OrganisationsTyp.Schule,
          administriertVon: '1',
        },
      ];

      mockadapter.onGet('/api/organisationen/1').replyOnce(200, mockResponse);
      const getOrganisationByIdPromise: Promise<void> = organisationStore.getOrganisationById(
        '1',
        OrganisationsTyp.Schule,
      );
      await getOrganisationByIdPromise;
      expect(organisationStore.currentOrganisation).toEqual(mockResponse);
      expect(organisationStore.loading).toBe(false);
    });

    it('should load klasse and update state', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const mockResponse: Organisation[] = [
        {
          id: '2',
          kennung: 'Org2',
          name: 'Organisation 2',
          namensergaenzung: 'Ergänzung',
          kuerzel: 'O2',
          typ: OrganisationsTyp.Klasse,
          administriertVon: '1',
        },
      ];

      mockadapter.onGet('/api/organisationen/2').replyOnce(200, mockResponse);
      const getOrganisationByIdPromise: Promise<void> = organisationStore.getOrganisationById(
        '2',
        OrganisationsTyp.Klasse,
      );
      await getOrganisationByIdPromise;
      expect(organisationStore.currentKlasse).toEqual(mockResponse);
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onGet('/api/organisationen/1').replyOnce(500, 'some mock server error');
      const getOrganisationByIdPromise: Promise<void> = organisationStore.getOrganisationById(
        '1',
        OrganisationsTyp.Schule,
      );
      await getOrganisationByIdPromise;
      expect(organisationStore.currentOrganisation).toEqual(null);
      expect(organisationStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onGet('/api/organisationen/1').replyOnce(500, { code: 'some mock server error' });
      const getOrganisationByIdPromise: Promise<void> = organisationStore.getOrganisationById(
        '1',
        OrganisationsTyp.Schule,
      );
      expect(organisationStore.loading).toBe(true);
      await getOrganisationByIdPromise;
      expect(organisationStore.currentOrganisation).toEqual(null);
      expect(organisationStore.errorCode).toEqual('some mock server error');
      expect(organisationStore.loading).toBe(false);
    });
  });

  describe('loadOrganisationForSelection', () => {
    it('should load one initial object without changing current results or context', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const organisation: Organisation = DoFactory.getSchule();
      const current: Organisation = DoFactory.getSchule();
      organisationStore.currentOrganisation = current;
      organisationStore.allSchulen = [current];
      mockadapter.onGet(`/api/organisationen/${organisation.id}`).replyOnce(200, organisation);

      const request: Promise<void> = organisationStore.loadOrganisationForSelection(organisation.id);
      expect(organisationStore.loading).toBe(true);
      expect(organisationStore.organisationForSelection).toBeNull();
      expect(await request).toBeUndefined();
      await flushPromises();

      expect(organisationStore.organisationForSelection).toEqual(organisation);
      expect(organisationStore.currentOrganisation).toEqual(current);
      expect(organisationStore.allSchulen).toEqual([current]);
      expect(organisationStore.errorCode).toBe('');
      expect(organisationStore.loading).toBe(false);
    });

    it.each([
      [{ i18nKey: 'ORGANISATION_NOT_FOUND' }, 'ORGANISATION_NOT_FOUND'],
      ['server error', 'UNSPECIFIED_ERROR'],
    ])('should clear the previous lookup and expose errors', async (response: unknown, errorCode: string) => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const organisation: Organisation = DoFactory.getSchule();
      organisationStore.organisationForSelection = organisation;
      mockadapter.onGet(`/api/organisationen/${organisation.id}`).replyOnce(500, response);

      const request: Promise<void> = organisationStore.loadOrganisationForSelection(organisation.id);
      expect(organisationStore.loading).toBe(true);
      expect(organisationStore.organisationForSelection).toBeNull();
      await request;
      await flushPromises();

      expect(organisationStore.errorCode).toBe(errorCode);
      expect(organisationStore.loading).toBe(false);
    });
  });

  describe('getLockingOrganisationById', () => {
    it('should load the locking Organisation and update state', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const mockResponse: Organisation[] = [
        {
          id: '1',
          kennung: 'Org1',
          name: 'Organisation 1',
          namensergaenzung: 'Ergänzung',
          kuerzel: 'O1',
          typ: OrganisationsTyp.Schule,
          administriertVon: '1',
        },
      ];

      mockadapter.onGet('/api/organisationen/1').replyOnce(200, mockResponse);
      const promise: Promise<void> = organisationStore.getLockingOrganisationById('1');
      await promise;
      expect(organisationStore.lockingOrganisation).toEqual(mockResponse);
      expect(organisationStore.loading).toBe(false);
    });

    it('uses parentOrganisationen, if possible', async () => {
      const { organisationStore }: ReturnType<typeof setup> = setup();
      const mockResponse: Organisation[] = [
        {
          id: '1',
          kennung: 'Org1',
          name: 'Organisation 1',
          namensergaenzung: 'Ergänzung',
          kuerzel: 'O1',
          typ: OrganisationsTyp.Schule,
          administriertVon: '1',
        },
      ];
      organisationStore.parentOrganisationen = mockResponse;
      const promise: Promise<void> = organisationStore.getLockingOrganisationById('1');
      await promise;
      expect(organisationStore.lockingOrganisation).toEqual(mockResponse[0]);
      expect(organisationStore.loading).toBe(false);
    });

    it('uses allOrganisationen, if possible', async () => {
      const { organisationStore }: ReturnType<typeof setup> = setup();
      const mockResponse: Organisation[] = [
        {
          id: '1',
          kennung: 'Org1',
          name: 'Organisation 1',
          namensergaenzung: 'Ergänzung',
          kuerzel: 'O1',
          typ: OrganisationsTyp.Schule,
          administriertVon: '1',
        },
      ];
      organisationStore.allOrganisationen = mockResponse;
      const promise: Promise<void> = organisationStore.getLockingOrganisationById('1');
      await promise;
      expect(organisationStore.lockingOrganisation).toEqual(mockResponse[0]);
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onGet('/api/organisationen/1').replyOnce(500, 'some mock server error');
      const promise: Promise<void> = organisationStore.getLockingOrganisationById('1');
      await promise;
      expect(organisationStore.lockingOrganisation).toEqual(null);
      expect(organisationStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onGet('/api/organisationen/1').replyOnce(500, { code: 'some mock server error' });
      const promise: Promise<void> = organisationStore.getLockingOrganisationById('1');
      expect(organisationStore.loading).toBe(true);
      await promise;
      expect(organisationStore.lockingOrganisation).toEqual(null);
      expect(organisationStore.errorCode).toEqual('some mock server error');
      expect(organisationStore.loading).toBe(false);
    });
  });

  describe('getParentOrganisationsByIds', () => {
    const mockOrganisationen: Organisation[] = [
      {
        id: '1',
        kennung: 'Org1',
        name: 'Organisation 1',
        namensergaenzung: 'Ergänzung',
        kuerzel: 'O1',
        typ: OrganisationsTyp.Schule,
        administriertVon: '1',
      },
    ];
    const requestIds: string[] = mockOrganisationen.map((o: Organisation) => o.id);
    const mockResponse: { parents: Organisation[] } = {
      parents: mockOrganisationen,
    };

    it('should load the Organisations and update state', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onPost('/api/organisationen/parents-by-ids').replyOnce(200, mockResponse);
      await organisationStore.getParentOrganisationsByIds(requestIds);
      expect(organisationStore.parentOrganisationen).toEqual(mockOrganisationen);
      expect(organisationStore.errorCode).toEqual('');
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onPost('/api/organisationen/parents-by-ids').replyOnce(500, 'some mock server error');
      const getParentOrganisationsByIdPromise: Promise<void> =
        organisationStore.getParentOrganisationsByIds(requestIds);
      await getParentOrganisationsByIdPromise;
      expect(organisationStore.parentOrganisationen).toEqual([]);
      expect(organisationStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onPost('/api/organisationen/parents-by-ids').replyOnce(500, { code: 'some mock server error' });
      const getParentOrganisationsByIdPromise: Promise<void> =
        organisationStore.getParentOrganisationsByIds(requestIds);
      expect(organisationStore.loading).toBe(true);
      await getParentOrganisationsByIdPromise;
      expect(organisationStore.parentOrganisationen).toEqual([]);
      expect(organisationStore.errorCode).toEqual('some mock server error');
      expect(organisationStore.loading).toBe(false);
    });
  });

  describe('updateOrganisationNameById', () => {
    it('should update the organisation and update state', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const mockResponse: Organisation = {
        id: '1',
        kennung: 'Org1',
        name: 'Updated Organisation 1',
        namensergaenzung: 'Ergänzung',
        kuerzel: 'O1',
        typ: OrganisationsTyp.Schule,
        administriertVon: '1',
        version: 1,
      };

      organisationStore.currentKlasse = {
        id: '2',
        kennung: 'Org2',
        name: 'Organisation 2',
        namensergaenzung: 'Ergänzung',
        kuerzel: 'O2',
        typ: OrganisationsTyp.Klasse,
        administriertVon: '1',
        version: 1,
      };

      mockadapter.onPatch('/api/organisationen/1/name').replyOnce(200, mockResponse);
      const updateOrganisationPromise: Promise<void> = organisationStore.updateOrganisationNameById(
        '1',
        'Updated Organisation 1',
        OrganisationsTyp.Klasse,
      );
      expect(organisationStore.loading).toBe(true);
      await updateOrganisationPromise;
      expect(organisationStore.updatedOrganisation).toEqual(mockResponse);
      expect(organisationStore.loading).toBe(false);
    });

    it('should update schultraeger and update state', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const mockResponse: Organisation = {
        id: '2',
        kennung: '1111',
        name: 'Updated Träger 1',
        namensergaenzung: 'Ergänzung',
        kuerzel: 'O1',
        typ: OrganisationsTyp.Traeger,
        administriertVon: '1',
        version: 2,
      };

      organisationStore.currentOrganisation = {
        id: '2',
        kennung: '1111',
        name: 'Träger 1',
        namensergaenzung: 'Ergänzung',
        kuerzel: 'O1',
        typ: OrganisationsTyp.Traeger,
        administriertVon: '1',
        version: 1,
      };

      mockadapter.onPatch('/api/organisationen/2/name').replyOnce(200, mockResponse);
      const updateOrganisationPromise: Promise<void> = organisationStore.updateOrganisationNameById(
        '2',
        'Updated Träger 1',
        OrganisationsTyp.Traeger,
      );
      expect(organisationStore.loading).toBe(true);
      await updateOrganisationPromise;
      expect(organisationStore.updatedOrganisation).toEqual(mockResponse);
      expect(organisationStore.loading).toBe(false);
    });

    it('should update an organisation without a version-specific type', async (): Promise<void> => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const mockResponse: Organisation = DoFactory.getOrganisation({
        typ: OrganisationsTyp.Schule,
        name: 'Updated Schule',
      });
      mockadapter.onPatch('/api/organisationen/schule-id/name').replyOnce(200, mockResponse);

      await organisationStore.updateOrganisationNameById('schule-id', 'Updated Schule', OrganisationsTyp.Schule);

      expect(organisationStore.updatedOrganisation).toEqual(mockResponse);
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      organisationStore.currentOrganisation = {
        id: '2',
        kennung: '1111',
        name: 'Träger 1',
        namensergaenzung: 'Ergänzung',
        kuerzel: 'O1',
        typ: OrganisationsTyp.Traeger,
        administriertVon: '1',
        version: 1,
      };

      mockadapter.onPatch('/api/organisationen/2/name').replyOnce(500, 'some mock server error');
      const updateOrganisationPromise: Promise<void> = organisationStore.updateOrganisationNameById(
        '2',
        'Updated Träger 1',
        OrganisationsTyp.Traeger,
      );
      expect(organisationStore.loading).toBe(true);
      await updateOrganisationPromise;
      expect(organisationStore.updatedOrganisation).toEqual(null);
      expect(organisationStore.errorCode).toEqual('KLASSE_ERROR');
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      organisationStore.currentOrganisation = {
        id: '2',
        kennung: '1111',
        name: 'Träger 1',
        namensergaenzung: 'Ergänzung',
        kuerzel: 'O1',
        typ: OrganisationsTyp.Traeger,
        administriertVon: '1',
        version: 1,
      };

      mockadapter.onPatch('/api/organisationen/2/name').replyOnce(500, { i18nKey: 'UPDATE_ERROR' });
      const updateOrganisationPromise: Promise<void> = organisationStore.updateOrganisationNameById(
        '2',
        'Updated Träger 1',
        OrganisationsTyp.Traeger,
      );
      expect(organisationStore.loading).toBe(true);
      await updateOrganisationPromise;
      expect(organisationStore.updatedOrganisation).toEqual(null);
      expect(organisationStore.errorCode).toEqual('UPDATE_ERROR');
      expect(organisationStore.loading).toBe(false);
    });

    it('should throw error when klasse version is not found', async () => {
      const { organisationStore }: ReturnType<typeof setup> = setup();
      // Set currentKlasse version to undefined to trigger the error
      organisationStore.currentKlasse = {
        id: '2',
        kennung: 'Org2',
        name: 'Organisation 2',
        namensergaenzung: 'Ergänzung',
        kuerzel: 'O2',
        typ: OrganisationsTyp.Klasse,
        administriertVon: '1',
        version: undefined,
      };

      const updateOrganisationPromise: Promise<void> = organisationStore.updateOrganisationNameById(
        '1',
        'Updated Organisation 1',
        OrganisationsTyp.Klasse,
      );

      await updateOrganisationPromise;
      expect(organisationStore.updatedOrganisation).toEqual(null);
      expect(organisationStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(organisationStore.loading).toBe(false);
    });

    it('should throw error when traeger version is not found', async () => {
      const { organisationStore }: ReturnType<typeof setup> = setup();
      // Set currentOrganisation version to undefined to trigger the error
      organisationStore.currentOrganisation = DoFactory.getOrganisation({
        version: undefined,
      });

      const updateOrganisationPromise: Promise<void> = organisationStore.updateOrganisationNameById(
        '1',
        'Updated Organisation 1',
        OrganisationsTyp.Traeger,
      );

      await updateOrganisationPromise;
      expect(organisationStore.updatedOrganisation).toEqual(null);
      expect(organisationStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(organisationStore.loading).toBe(false);
    });
  });

  describe('fetchSchulDetails', () => {
    it('should load schule details with its schultraegerform', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const mockSchule: Organisation = {
        id: 'schule-1',
        kennung: '1234567',
        name: 'Testschule',
        typ: OrganisationsTyp.Schule,
        administriertVon: 'schultraeger-1',
      };
      const mockParentsTree: { parents: OrganisationResponse[] } = {
        parents: [
          {
            id: 'schultraeger-1',
            name: 'Test Schultraeger',
            typ: OrganisationsTyp.Land,
            administriertVon: 'root',
            kennung: '1',
            namensergaenzung: null,
            kuerzel: '',
            traegerschaft: '01',
            itslearningEnabled: false,
            version: 0,
            emailAdress: '',
          },
        ],
      };

      mockadapter.onGet('/api/organisationen/schule-1').replyOnce(200, mockSchule);
      mockadapter.onPost('/api/organisationen/parents-by-ids').replyOnce(200, mockParentsTree);

      const promise: Promise<void> = organisationStore.fetchSchulDetails('schule-1');

      expect(organisationStore.loading).toBe(true);
      await promise;

      expect(organisationStore.currentSchule).toEqual({
        ...mockSchule,
        schultraegerform: mockParentsTree.parents[0],
      });
      expect(organisationStore.errorCode).toBe('');
      expect(organisationStore.loading).toBe(false);
    });

    it('should not set school details for a non-school organisation', async (): Promise<void> => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const behoerde: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde });
      mockadapter.onGet('/api/organisationen/behoerde-id').replyOnce(200, behoerde);
      mockadapter.onPost('/api/organisationen/parents-by-ids').replyOnce(200, { parents: [] });

      await organisationStore.fetchSchulDetails('behoerde-id');

      expect(organisationStore.currentSchule).toBeNull();
      expect(organisationStore.loading).toBe(false);
    });

    it('should preserve the error code from a failed organisation request', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      organisationStore.errorCode = 'PREVIOUS_ERROR';
      const mockParentsTree: { parents: OrganisationResponse[] } = { parents: [] };

      mockadapter.onGet('/api/organisationen/schule-1').replyOnce(500, { code: 'SCHULE_NOT_FOUND' });
      mockadapter.onPost('/api/organisationen/parents-by-ids').replyOnce(200, mockParentsTree);

      await organisationStore.fetchSchulDetails('schule-1');

      expect(organisationStore.currentSchule).toBeNull();
      expect(organisationStore.errorCode).toBe('SCHULE_NOT_FOUND');
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onGet('/api/organisationen/1').replyOnce(500, 'some mock server error');
      const getOrganisationByIdPromise: Promise<void> = organisationStore.fetchSchulDetails('schule-1');
      await getOrganisationByIdPromise;
      expect(organisationStore.currentSchule).toEqual(null);
      expect(organisationStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(organisationStore.loading).toBe(false);
    });
  });

  describe('updateSchuleById', () => {
    it('should update school details and set the updated organisation', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const mockUpdatedSchool: Organisation = {
        id: 'schule-1',
        kennung: '1234567',
        name: 'Updated Testschule',
        typ: OrganisationsTyp.Schule,
        administriertVon: 'schultraeger-1',
        emailAdress: 'updated@schule.de',
        version: 2,
      };

      mockadapter.onPut('/api/organisationen/schule-1').replyOnce(200, mockUpdatedSchool);

      await organisationStore.updateSchuleById({
        organisationId: 'schule-1',
        schultraegerform: 'schultraeger-1',
        name: 'Updated Testschule',
        emailAdress: 'updated@schule.de',
      });

      expect(organisationStore.updatedOrganisation).toEqual(mockUpdatedSchool);
      expect(organisationStore.errorCode).toBe('');
      expect(organisationStore.loading).toBe(false);
    });

    it('should set an error code when the school update request fails', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onPut('/api/organisationen/schule-1').replyOnce(500, { i18nKey: 'SCHULE_UPDATE_FAILED' });

      await organisationStore.updateSchuleById({
        organisationId: 'schule-1',
        schultraegerform: 'schultraeger-1',
        name: 'Updated Testschule',
        emailAdress: 'updated@schule.de',
      });

      expect(organisationStore.updatedOrganisation).toBeNull();
      expect(organisationStore.errorCode).toBe('SCHULE_UPDATE_FAILED');
      expect(organisationStore.loading).toBe(false);
    });
  });

  describe('getRootChildren', () => {
    it('should update rootChildren', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const mockResponse: OrganisationRootChildrenResponse = {
        oeffentlich: {
          id: '2',
          name: 'Öffentliche Schulen',
          namensergaenzung: 'Ergänzung',
          kennung: null,
          kuerzel: '',
          traegerschaft: '01',
          typ: OrganisationsTyp.Land,
          administriertVon: '1',
          version: 1,
          itslearningEnabled: true,
          emailAdress: 'oeffentlich@example.com',
        },
        ersatz: {
          id: '3',
          name: 'Ersatzschulen Schulen',
          namensergaenzung: 'Ergänzung',
          kennung: null,
          kuerzel: '',
          traegerschaft: '01',
          typ: OrganisationsTyp.Land,
          administriertVon: '1',
          version: 1,
          itslearningEnabled: true,
          emailAdress: 'ersatz@example.com',
        },
      };

      mockadapter.onGet('/api/organisationen/root/children').replyOnce(200, mockResponse);
      const getRootChildrenPromise: Promise<void> = organisationStore.getRootChildren();
      await getRootChildrenPromise;
      expect(organisationStore.rootChildren).toEqual([mockResponse.oeffentlich, mockResponse.ersatz]);
    });

    it('should handle string error', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onGet('/api/organisationen/root/children').replyOnce(500, 'some mock server error');
      const getRootChildrenPromise: Promise<void> = organisationStore.getRootChildren();
      await getRootChildrenPromise;
      expect(organisationStore.rootChildren).toEqual([]);
      expect(organisationStore.errorCode).toEqual('SCHULTRAEGER_ERROR');
    });

    it('should handle error code', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onGet('/api/organisationen/root/children').replyOnce(500, { i18nKey: 'GET_ERROR' });
      const getRootChildrenPromise: Promise<void> = organisationStore.getRootChildren();
      await getRootChildrenPromise;
      expect(organisationStore.rootChildren).toEqual([]);
      expect(organisationStore.errorCode).toEqual('GET_ERROR');
    });
  });

  describe('fetchSchuleDetailsForKlassen', () => {
    const mockKlassen: Organisation[] = [
      {
        id: '1',
        administriertVon: '101',
        name: 'Klasse 1',
        typ: OrganisationsTyp.Klasse,
        schuleDetails: '123456 (Schule 1)',
      },
    ];

    const setupKlassen = (): ReturnType<typeof setup> => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      organisationStore.allKlassen = [...mockKlassen];
      return { organisationStore, mockadapter };
    };

    it('should fetch schule details', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setupKlassen();
      mockadapter.onPost('/api/organisationen/by-ids', { organisationIds: ['101'] }).replyOnce(200, [
        {
          id: '101',
          kennung: '123456',
          name: 'Schule 1',
          namensergaenzung: 'Ergänzung',
          kuerzel: 'O1',
          typ: OrganisationsTyp.Schule,
          administriertVon: '1',
        },
      ]);

      await organisationStore.fetchSchuleDetailsForKlassen();

      expect(organisationStore.allKlassen[0]?.schuleDetails).toBe('123456 (Schule 1)');
    });

    it('should use cached schule details without making a request', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const schule: Organisation = DoFactory.getSchule();
      const klasse: Organisation = DoFactory.getKlasse(schule);
      organisationStore.allKlassen = [klasse];
      organisationStore.cachedSchulenMap.set(schule.id, 'cached school details');

      await organisationStore.fetchSchuleDetailsForKlassen();

      expect(organisationStore.allKlassen).toEqual([{ ...klasse, schuleDetails: 'cached school details' }]);
      expect(mockadapter.history.post).toHaveLength(0);
      expect(organisationStore.errorCode).toBe('');
    });

    it.each([
      ['some mock server error', 'UNSPECIFIED_ERROR'],
      [{ i18nKey: 'GET_ERROR' }, 'GET_ERROR'],
    ])(
      'should handle error response %p',
      async (
        response:
          | string
          | {
              i18nKey: string;
            },
        expectedError: string,
      ) => {
        const { organisationStore, mockadapter }: ReturnType<typeof setup> = setupKlassen();
        mockadapter.onPost('/api/organisationen/by-ids').replyOnce(500, response);

        await organisationStore.fetchSchuleDetailsForKlassen();

        expect(organisationStore.rootChildren).toEqual([]);
        expect(organisationStore.errorCode).toEqual(expectedError);
      },
    );
  });

  describe('setItsLearningForSchule', () => {
    it('should successfully activate itslearning for an organisation', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const mockResponse: Organisation = {
        id: '1',
        kennung: 'Org1',
        name: 'Organisation 1',
        namensergaenzung: 'Ergänzung',
        kuerzel: 'O1',
        typ: OrganisationsTyp.Schule,
        administriertVon: '1',
        itslearningEnabled: true,
      };

      mockadapter.onPut('/api/organisationen/1/enable-for-its-learning').replyOnce(200, mockResponse);

      const promise: Promise<void> = organisationStore.setItsLearningForSchule('1');
      expect(organisationStore.loading).toBe(true);
      await promise;

      expect(organisationStore.errorCode).toBe('');
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle a generic error and set UNSPECIFIED_ERROR', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onPut('/api/organisationen/1/enable-for-its-learning').networkErrorOnce();

      const promise: Promise<void> = organisationStore.setItsLearningForSchule('1');
      expect(organisationStore.loading).toBe(true);
      await promise;

      expect(organisationStore.errorCode).toBe('ORGANISATION_SPECIFICATION_ERROR');
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle Axios-specific error with i18nKey or default error code', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onPut('/api/organisationen/1/enable-for-its-learning').replyOnce(500, { i18nKey: 'ENABLE_ERROR' });

      const promise: Promise<void> = organisationStore.setItsLearningForSchule('1');
      expect(organisationStore.loading).toBe(true);
      await promise;

      expect(organisationStore.errorCode).toBe('ENABLE_ERROR');
      expect(organisationStore.loading).toBe(false);
    });
  });

  describe('createOrganisation', () => {
    it('should create schule and update state', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const mockResponse: Organisation[] = [
        {
          id: '1',
          kennung: 'Org1',
          name: 'Organisation 1',
          namensergaenzung: 'Ergänzung',
          kuerzel: 'O1',
          typ: OrganisationsTyp.Schule,
          administriertVon: '1',
        },
      ];

      mockadapter.onPost('/api/organisationen').replyOnce(200, mockResponse);
      const createOrganisationPromise: Promise<void> = organisationStore.createOrganisation(
        '1',
        'Org1',
        'Organisation 1',
        'Ergänzung',
        'Org1',
        OrganisationsTyp.Schule,
      );
      expect(organisationStore.loading).toBe(true);
      await createOrganisationPromise;
      expect(organisationStore.createdSchule).toEqual(mockResponse);
      expect(organisationStore.loading).toBe(false);
    });

    it('should create klasse and update state', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const mockResponse: Organisation[] = [
        {
          id: '1',
          kennung: 'Org1',
          name: 'Organisation 1',
          namensergaenzung: 'Ergänzung',
          kuerzel: 'O1',
          typ: OrganisationsTyp.Klasse,
          administriertVon: '1',
        },
      ];

      mockadapter.onPost('/api/organisationen').replyOnce(200, mockResponse);
      const createOrganisationPromise: Promise<void> = organisationStore.createOrganisation(
        '1',
        'Org1',
        'Organisation 1',
        'Ergänzung',
        '01',
        OrganisationsTyp.Klasse,
      );
      expect(organisationStore.loading).toBe(true);
      await createOrganisationPromise;
      expect(organisationStore.createdKlasse).toEqual(mockResponse);
      expect(organisationStore.loading).toBe(false);
    });

    it('should create Schulträger and update state', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const mockResponse: Organisation[] = [
        {
          id: '1',
          kennung: 'Traeger',
          name: 'Traeger 1',
          namensergaenzung: 'Ergänzung',
          kuerzel: 'O1',
          typ: OrganisationsTyp.Traeger,
          administriertVon: '1',
        },
      ];

      mockadapter.onPost('/api/organisationen').replyOnce(200, mockResponse);
      const createOrganisationPromise: Promise<void> = organisationStore.createOrganisation(
        '1',
        'Org1',
        'Organisation 1',
        'Ergänzung',
        'Org1',
        OrganisationsTyp.Traeger,
      );
      expect(organisationStore.loading).toBe(true);
      await createOrganisationPromise;
      expect(organisationStore.createdSchultraeger).toEqual(mockResponse);
      expect(organisationStore.loading).toBe(false);
    });

    it('should not set a creation field for a Behörde created through this action', async (): Promise<void> => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const response: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde });
      mockadapter.onPost('/api/organisationen').replyOnce(200, response);

      await organisationStore.createOrganisation(
        'admin-id',
        undefined,
        response.name,
        undefined,
        undefined,
        OrganisationsTyp.Behoerde,
      );

      expect(organisationStore.createdKlasse).toBeNull();
      expect(organisationStore.createdSchule).toBeNull();
      expect(organisationStore.createdSchultraeger).toBeNull();
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onPost('/api/organisationen').replyOnce(500, 'some mock server error');
      const createOrganisationPromise: Promise<void> = organisationStore.createOrganisation(
        '1',
        'Org1',
        'Organisation 1',
        'Ergänzung',
        'Org1',
        OrganisationsTyp.Schule,
      );
      expect(organisationStore.loading).toBe(true);
      await createOrganisationPromise;
      expect(organisationStore.createdSchule).toEqual(null);
      expect(organisationStore.errorCode).toEqual('ORGANISATION_SPECIFICATION_ERROR');
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onPost('/api/organisationen').replyOnce(500, { i18nKey: 'SOME_MOCK_SERVER_ERROR' });
      const createOrganisationPromise: Promise<void> = organisationStore.createOrganisation(
        '1',
        'Org1',
        'Organisation 1',
        'Ergänzung',
        'Org1',
        OrganisationsTyp.Schule,
      );
      expect(organisationStore.loading).toBe(true);
      await createOrganisationPromise;
      expect(organisationStore.createdSchule).toEqual(null);
      expect(organisationStore.errorCode).toEqual('SOME_MOCK_SERVER_ERROR');
      expect(organisationStore.loading).toBe(false);
    });
  });

  describe('createBehoerde', () => {
    describe('without kennung', () => {
      it('should omit kennung from the request and update state', async () => {
        const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
        const administriertVon: string = DoFactory.getOrganisation().id;
        const mockResponse: Organisation = DoFactory.getOrganisation({
          typ: OrganisationsTyp.Behoerde,
          administriertVon,
          kennung: undefined,
        });

        mockadapter
          .onPost('/api/organisationen', {
            administriertVon,
            name: mockResponse.name,
            typ: OrganisationsTyp.Behoerde,
          })
          .replyOnce(201, mockResponse);

        const promise: Promise<void> = organisationStore.createBehoerde(administriertVon, mockResponse.name);

        expect(organisationStore.loading).toBe(true);
        expect(organisationStore.createdBehoerde).toBeNull();
        await promise;

        expect(organisationStore.createdBehoerde).toEqual(mockResponse);
        expect(organisationStore.errorCode).toBe('');
        expect(organisationStore.loading).toBe(false);
      });
    });

    describe('with an unstructured error response', () => {
      it('should set the fallback error code', async () => {
        const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
        const mockBehoerde: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde });
        const administriertVon: string = DoFactory.getOrganisation().id;

        mockadapter.onPost('/api/organisationen').replyOnce(500, 'some mock server error');

        const promise: Promise<void> = organisationStore.createBehoerde(administriertVon, mockBehoerde.name);

        expect(organisationStore.loading).toBe(true);
        await promise;

        expect(organisationStore.createdBehoerde).toBeNull();
        expect(organisationStore.errorCode).toBe('ORGANISATION_SPECIFICATION_ERROR');
        expect(organisationStore.loading).toBe(false);
      });
    });

    describe('with a structured error response', () => {
      it('should set the error code from i18nKey', async () => {
        const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
        const mockBehoerde: Organisation = DoFactory.getOrganisation({ typ: OrganisationsTyp.Behoerde });
        const administriertVon: string = DoFactory.getOrganisation().id;

        mockadapter.onPost('/api/organisationen').replyOnce(500, { i18nKey: 'BEHOERDE_CREATE_ERROR' });

        const promise: Promise<void> = organisationStore.createBehoerde(administriertVon, mockBehoerde.name);

        expect(organisationStore.loading).toBe(true);
        await promise;

        expect(organisationStore.createdBehoerde).toBeNull();
        expect(organisationStore.errorCode).toBe('BEHOERDE_CREATE_ERROR');
        expect(organisationStore.loading).toBe(false);
      });
    });
  });

  describe('deleteOrganisationById', () => {
    const organisationId: string = faker.string.uuid();
    const endpoint: string = `/api/organisationen/${organisationId}`;

    it('should delete organisation and update state', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onDelete(endpoint).replyOnce(200);
      const deleteOrganisationPromise: Promise<void> = organisationStore.deleteOrganisationById(organisationId);
      expect(organisationStore.loadingDelete).toBe(true);
      await deleteOrganisationPromise;
      expect(organisationStore.loadingDelete).toBe(false);
      expect(organisationStore.errorCode).toEqual('');
    });

    type ErrorType = string | { i18nKey: string };

    it.each([
      ['some mock server error', 'UNSPECIFIED_ERROR'],
      [{ i18nKey: 'some mock server error' }, 'some mock server error'],
    ])('should handle error', async (error: ErrorType, expectedErrorCode: string) => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      mockadapter.onDelete(endpoint).replyOnce(500, error);
      const deleteOrganisationPromise: Promise<void> = organisationStore.deleteOrganisationById(organisationId);
      expect(organisationStore.loadingDelete).toBe(true);
      await deleteOrganisationPromise;
      expect(organisationStore.loadingDelete).toBe(false);
      expect(organisationStore.errorCode).toEqual(expectedErrorCode);
    });
  });

  describe('loadOrganisationenForFilter', () => {
    it('should replace current results and preserve the server total without a filter', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const previous: Organisation = DoFactory.getSchule();
      const result: OrganisationResponse = DoFactory.getOrganisationResponse({ typ: OrganisationsTyp.Schule });
      organisationStore.organisationenFilters.set('', { filterResult: [previous], total: 99, loading: false });
      mockadapter.onGet('/api/organisationen').replyOnce(200, pagedResponse([result], 42));

      await organisationStore.loadOrganisationenForFilter();
      await flushPromises();

      expect(organisationStore.organisationenFilters.get('')).toMatchObject({
        filterResult: [result],
        total: 42,
        loading: false,
      });
      expect(organisationStore.allSchulen).toEqual([]);
      expect(organisationStore.organisationForSelection).toBeNull();
    });

    describe.each([[''], ['testId']])('with storeKey=%s', (storeKey: string) => {
      const defaultFilter: OrganisationenFilter = {
        offset: 0,
        limit: 30,
        includeTyp: OrganisationsTyp.Schule,
      };
      const defaultUrl: string = '/api/organisationen?offset=0&limit=30&typ=SCHULE';

      test('should load organisationen for filter', async () => {
        const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
        const mockResponse: OrganisationResponse[] = [
          DoFactory.getOrganisationResponse({ typ: OrganisationsTyp.Schule }),
        ];

        mockadapter.onGet(defaultUrl).replyOnce(200, pagedResponse(mockResponse));
        const promise: Promise<void> = organisationStore.loadOrganisationenForFilter(defaultFilter, storeKey);
        const store: AutoCompleteStore<Organisation> = organisationStore.organisationenFilters.get(storeKey)!;

        expect(store).toBeDefined();
        expect(store.loading).toBe(true);

        await promise;

        expect(store.filterResult).toEqual(mockResponse);
        expect(store.total).toEqual(1);
        expect(store.loading).toBe(false);
      });

      it('should handle string error', async () => {
        const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
        mockadapter.onGet(defaultUrl).replyOnce(500, 'some mock server error');
        const promise: Promise<void> = organisationStore.loadOrganisationenForFilter(defaultFilter, storeKey);
        const store: AutoCompleteStore<Organisation> = organisationStore.organisationenFilters.get(storeKey)!;
        expect(store).toBeDefined();
        expect(store.loading).toBe(true);
        await promise;
        expect(store.filterResult).toEqual([]);
        expect(store.errorCode).toEqual('UNSPECIFIED_ERROR');
        expect(store.loading).toBe(false);
      });

      it('should handle error code', async () => {
        const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
        mockadapter.onGet(defaultUrl).replyOnce(500, { code: 'some mock server error' });
        const promise: Promise<void> = organisationStore.loadOrganisationenForFilter(defaultFilter, storeKey);
        const store: AutoCompleteStore<Organisation> = organisationStore.organisationenFilters.get(storeKey)!;
        expect(store).toBeDefined();
        expect(store.loading).toBe(true);
        await promise;
        expect(store.filterResult).toEqual([]);
        expect(store.errorCode).toEqual('some mock server error');
        expect(store.loading).toBe(false);
      });
    });
  });

  describe('resetOrganisationenFilter', () => {
    it('should initialize an empty filter when no filter exists', (): void => {
      const { organisationStore }: ReturnType<typeof setup> = setup();
      organisationStore.resetOrganisationenFilter();

      expect(organisationStore.organisationenFilters.get('')).toEqual({
        filterResult: [],
        loading: false,
        total: 0,
      });
    });

    describe.each([['', undefined, 'something']])('when store key is %s', (storeKey: string | undefined) => {
      test('should reset filter', () => {
        const { organisationStore }: ReturnType<typeof setup> = setup();
        const organisationen: Organisation[] = [DoFactory.getSchule()];
        organisationStore.organisationenFilters = new Map([
          [
            storeKey ?? '',
            {
              filterResult: organisationen,
              loading: true,
              total: 1,
            },
          ],
        ]);
        const expected: AutoCompleteStore<Organisation> = {
          filterResult: organisationen,
          loading: false,
          total: 1,
        };
        organisationStore.resetOrganisationenFilter(storeKey);
        expect(organisationStore.organisationenFilters.get(storeKey ?? '')).toEqual(expected);
      });
    });
  });

  describe('clearOrganisationenFilter', () => {
    it('should clear the default filter key', (): void => {
      const { organisationStore }: ReturnType<typeof setup> = setup();
      organisationStore.organisationenFilters.set('', {
        filterResult: [DoFactory.getSchule()],
        loading: true,
        total: 1,
      });

      organisationStore.clearOrganisationenFilter();

      expect(organisationStore.organisationenFilters.has('')).toBe(false);
    });

    describe.each([['', undefined, 'something']])('when store key is %s', (storeKey: string | undefined) => {
      test('should delete the filter', () => {
        const { organisationStore }: ReturnType<typeof setup> = setup();
        organisationStore.organisationenFilters = new Map([
          [storeKey ?? '', { filterResult: [DoFactory.getSchule()], loading: true, total: 1 }],
        ]);
        organisationStore.clearOrganisationenFilter(storeKey);
        expect(organisationStore.organisationenFilters.get(storeKey ?? '')).toBeUndefined();
      });
    });
  });

  describe('loadKlassenForFilter', () => {
    it('should count returned Klassen when pageTotal is omitted', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const items: OrganisationResponse[] = [DoFactory.getOrganisationResponse({ typ: OrganisationsTyp.Klasse })];
      const response: OrganisationControllerFindOrganizations200Response = {
        items,
        total: 42,
        offset: 0,
        limit: 200,
      };
      mockadapter.onGet('/api/organisationen?offset=0&limit=200&typ=KLASSE').replyOnce(200, response);

      await organisationStore.loadKlassenForFilter();
      await flushPromises();

      expect(organisationStore.klassenFilters.get('')).toMatchObject({
        filterResult: items,
        total: 1,
        loading: false,
      });
    });

    test('it initializes the field, if it does not exist', async () => {
      const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
      const mockResponse: OrganisationResponse[] = [
        DoFactory.getOrganisationResponse({ typ: OrganisationsTyp.Klasse }),
      ];
      mockadapter
        .onGet('/api/organisationen?offset=0&limit=200&typ=KLASSE')
        .replyOnce(200, pagedResponse(mockResponse));
      expect(organisationStore.klassenFilters.get('unknownKey')).toBeUndefined();

      await organisationStore.loadKlassenForFilter(undefined, 'unknownKey');
      await flushPromises();

      expect(organisationStore.klassenFilters.get('unknownKey')).toBeDefined();
    });

    describe.each(['', undefined, 'something'])('when store key is %s', (storeKey: string | undefined) => {
      test('should load klassen for filter', async () => {
        const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
        const mockResponse: OrganisationResponse[] = [
          DoFactory.getOrganisationResponse({ typ: OrganisationsTyp.Klasse }),
        ];

        mockadapter
          .onGet('/api/organisationen?offset=0&limit=200&typ=KLASSE')
          .replyOnce(200, pagedResponse(mockResponse, 42, 3));
        const promise: Promise<void> = organisationStore.loadKlassenForFilter(undefined, storeKey);

        await promise;
        await flushPromises();

        const klassenFilter: AutoCompleteStore<Organisation> = organisationStore.klassenFilters.get(storeKey ?? '')!;

        expect(klassenFilter).toBeDefined();
        expect(klassenFilter.filterResult).toEqual(mockResponse);
        expect(klassenFilter.total).toEqual(3);
        expect(klassenFilter.loading).toBe(false);
      });

      it('should handle string error', async () => {
        const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
        mockadapter.onGet('/api/organisationen?offset=0&limit=200&typ=KLASSE').replyOnce(500, 'some mock server error');
        const getAllOrganisationenPromise: Promise<void> = organisationStore.loadKlassenForFilter(undefined, storeKey);
        await getAllOrganisationenPromise;
        await flushPromises();

        const klassenFilter: AutoCompleteStore<Organisation> = organisationStore.klassenFilters.get(storeKey ?? '')!;
        expect(klassenFilter).toBeDefined();
        expect(klassenFilter.errorCode).toEqual('UNSPECIFIED_ERROR');
      });

      it('should handle error code', async () => {
        const { organisationStore, mockadapter }: ReturnType<typeof setup> = setup();
        mockadapter
          .onGet('/api/organisationen?offset=0&limit=200&typ=KLASSE')
          .replyOnce(500, { code: 'some mock server error' });
        const getAllOrganisationenPromise: Promise<void> = organisationStore.loadKlassenForFilter(undefined, storeKey);
        await getAllOrganisationenPromise;
        await flushPromises();
        const klassenFilter: AutoCompleteStore<Organisation> = organisationStore.klassenFilters.get(storeKey ?? '')!;
        expect(klassenFilter).toBeDefined();
        expect(klassenFilter.errorCode).toEqual('some mock server error');
      });
    });
  });

  describe('resetKlasseFilter', () => {
    it('should initialize an empty filter when no filter exists', (): void => {
      const { organisationStore }: ReturnType<typeof setup> = setup();
      organisationStore.resetKlasseFilter();

      expect(organisationStore.klassenFilters.get('')).toEqual({
        filterResult: [],
        loading: false,
        total: 0,
      });
    });

    describe.each([['', undefined, 'something']])('when store key is %s', (storeKey: string | undefined) => {
      const klassen: Organisation[] = [DoFactory.getKlasse()];
      test('should reset filter', () => {
        const { organisationStore }: ReturnType<typeof setup> = setup();
        organisationStore.klassenFilters = new Map([
          [storeKey ?? '', { filterResult: klassen, loading: true, total: 1 }],
        ]);
        const expected: AutoCompleteStore<Organisation> = {
          filterResult: klassen,
          loading: false,
          total: 1,
        };
        organisationStore.resetKlasseFilter(storeKey);
        expect(organisationStore.klassenFilters.get(storeKey ?? '')).toEqual(expected);
      });
    });
  });

  describe('clearKlasseFilter', () => {
    it('should clear the default filter key', (): void => {
      const { organisationStore }: ReturnType<typeof setup> = setup();
      organisationStore.klassenFilters.set('', {
        filterResult: [DoFactory.getKlasse()],
        loading: true,
        total: 1,
      });

      organisationStore.clearKlasseFilter();

      expect(organisationStore.klassenFilters.has('')).toBe(false);
    });

    describe.each([['', undefined, 'something']])('when store key is %s', (storeKey: string | undefined) => {
      test('should delete the filter', () => {
        const { organisationStore }: ReturnType<typeof setup> = setup();
        organisationStore.klassenFilters = new Map([
          [storeKey ?? '', { filterResult: [DoFactory.getKlasse()], loading: true, total: 1 }],
        ]);
        organisationStore.clearKlasseFilter(storeKey);
        expect(organisationStore.klassenFilters.get(storeKey ?? '')).toBeUndefined();
      });
    });
  });
});
