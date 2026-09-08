import axiosApiInstance from '@/services/ApiService';
import MockAdapter from 'axios-mock-adapter';
import { createPinia, setActivePinia } from 'pinia';

import {
  ManageableServiceProviderSimpleListEntryResponse,
  RollenArt,
  ServiceProviderTarget,
  type ProviderControllerFindRollenerweiterungenByServiceProviderId200Response,
  type ProviderControllerGetManageableServiceProviders200Response,
  type RollenerweiterungWithExtendedDataResponse,
  type ServiceProviderResponse,
} from '@/api-client/generated';
import { faker } from '@faker-js/faker';
import { DoFactory } from 'test/DoFactory';
import {
  ManageableServiceProviderFilter,
  ServiceProviderKategorie,
  ServiceProviderMerkmal,
  useServiceProviderStore,
  type ManageableServiceProviderDetail,
  type PersistRollenerweiterung,
  type RollenErweiterungenUebersicht,
  type ServiceProviderCreationFilter,
  type ServiceProviderStore,
  type StartPageServiceProvider,
} from './ServiceProviderStore';

interface MultiErrorRolleIdWithI18nKey {
  rolleId: string;
  i18nKey: string;
}

interface MultiError {
  code: number;
  rolleIdsWithI18nKeys: MultiErrorRolleIdWithI18nKey[];
}

interface MalformedMultiError {
  code?: unknown;
  rolleIdsWithI18nKeys?: unknown;
}

const mockadapter: MockAdapter = new MockAdapter(axiosApiInstance);

describe('serviceProviderStore', () => {
  let serviceProviderStore: ServiceProviderStore;
  beforeEach(() => {
    setActivePinia(createPinia());
    serviceProviderStore = useServiceProviderStore();
    mockadapter.reset();
  });

  it('should initalize state correctly', () => {
    expect(serviceProviderStore.allServiceProviders).toEqual([]);
    expect(serviceProviderStore.errorCode).toEqual('');
    expect(serviceProviderStore.loading).toBe(false);
  });

  describe('getServiceProvidersForRollenVerwaltung', () => {
    const url: string = '/api/provider/manageable-land-root?limit=25';
    describe('when response is successful', () => {
      it('should load service providers and their total', async () => {
        const mockItems: ServiceProviderResponse[] = [
          DoFactory.getServiceProviderResponse(),
          DoFactory.getServiceProviderResponse(),
        ];
        const mockResponse: { items: ServiceProviderResponse[]; total: number; offset: number; limit: number } = {
          items: mockItems,
          total: 42,
          offset: 0,
          limit: 25,
        };

        mockadapter.onGet(url).replyOnce(200, mockResponse);
        await serviceProviderStore.getServiceProvidersForRollenVerwaltung({ limit: 25 });

        expect(serviceProviderStore.serviceProvidersForRollenVerwaltung).toEqual(
          mockItems.map((serviceProvider: ServiceProviderResponse) => ({
            id: serviceProvider.id,
            name: serviceProvider.name,
          })),
        );
        expect(serviceProviderStore.totalServiceProvidersForRollenVerwaltung).toEqual(42);
      });
    });

    describe('when response is a string error', () => {
      it('should handle string error', async () => {
        mockadapter.onGet(url).replyOnce(500, 'some mock server error');

        await serviceProviderStore.getServiceProvidersForRollenVerwaltung({ limit: 25 });

        expect(serviceProviderStore.serviceProvidersForRollenVerwaltung).toEqual([]);
        expect(serviceProviderStore.errorCode).toEqual('UNSPECIFIED_ERROR');
        expect(serviceProviderStore.loading).toBe(false);
      });
    });

    describe('when response is an error with code', () => {
      it('should handle error code', async () => {
        mockadapter.onGet(url).replyOnce(500, { code: 'some mock server error' });

        await serviceProviderStore.getServiceProvidersForRollenVerwaltung({ limit: 25 });

        expect(serviceProviderStore.serviceProvidersForRollenVerwaltung).toEqual([]);
        expect(serviceProviderStore.errorCode).toEqual('some mock server error');
        expect(serviceProviderStore.loading).toBe(false);
      });
    });

    describe('when searchStr is provided', () => {
      it('should pass searchStr as query parameter', async () => {
        const mockItems: ServiceProviderResponse[] = [DoFactory.getServiceProviderResponse()];
        const mockResponse: { items: ServiceProviderResponse[]; total: number; offset: number; limit: number } = {
          items: mockItems,
          total: 1,
          offset: 0,
          limit: 25,
        };

        mockadapter.onGet('/api/provider/manageable-land-root?limit=25&searchStr=test').replyOnce(200, mockResponse);
        await serviceProviderStore.getServiceProvidersForRollenVerwaltung({ limit: 25, searchStr: 'test' });

        expect(serviceProviderStore.serviceProvidersForRollenVerwaltung).toHaveLength(1);
        expect(serviceProviderStore.totalServiceProvidersForRollenVerwaltung).toEqual(1);
      });
    });

    describe('when a previous successful load is followed by a failed request', () => {
      it('should clear stale state instead of keeping previous results', async () => {
        const mockItems: ServiceProviderResponse[] = [
          DoFactory.getServiceProviderResponse(),
          DoFactory.getServiceProviderResponse(),
        ];
        mockadapter.onGet(url).replyOnce(200, { items: mockItems, total: 2, offset: 0, limit: 25 });
        await serviceProviderStore.getServiceProvidersForRollenVerwaltung({ limit: 25 });
        expect(serviceProviderStore.serviceProvidersForRollenVerwaltung).toHaveLength(2);
        expect(serviceProviderStore.totalServiceProvidersForRollenVerwaltung).toBe(2);

        mockadapter.onGet(url).replyOnce(500, { code: 'UNSPECIFIED_ERROR' });
        await serviceProviderStore.getServiceProvidersForRollenVerwaltung({ limit: 25 });

        expect(serviceProviderStore.serviceProvidersForRollenVerwaltung).toEqual([]);
        expect(serviceProviderStore.totalServiceProvidersForRollenVerwaltung).toBe(0);
      });
    });
  });

  describe('getAssignableServiceProvidersForRolleByOrganisationId', () => {
    const schulstrukturknotenOfRolle: string = faker.string.uuid();
    const url: string = `/api/provider/assignable-for-rolle?schulstrukturknotenOfRolle=${schulstrukturknotenOfRolle}`;

    it('should load service providers and update state', async () => {
      const mockResponse: StartPageServiceProvider[] = [
        DoFactory.getStartPageServiceProvider(),
        DoFactory.getStartPageServiceProvider(),
      ];
      mockadapter.onGet(url).replyOnce(200, mockResponse);
      const getAllServiceProvidersPromise: Promise<void> =
        serviceProviderStore.getAssignableServiceProvidersForRolleByOrganisationId(schulstrukturknotenOfRolle);
      expect(serviceProviderStore.loading).toBe(true);
      await getAllServiceProvidersPromise;
      expect(serviceProviderStore.allServiceProviders).toEqual([...mockResponse]);
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onGet(url).replyOnce(500, 'some mock server error');
      const getAllServiceProvidersPromise: Promise<void> =
        serviceProviderStore.getAssignableServiceProvidersForRolleByOrganisationId(schulstrukturknotenOfRolle);
      expect(serviceProviderStore.loading).toBe(true);
      await getAllServiceProvidersPromise;
      expect(serviceProviderStore.allServiceProviders).toEqual([]);
      expect(serviceProviderStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onGet(url).replyOnce(500, { code: 'some mock server error' });
      const getAllServiceProvidersPromise: Promise<void> =
        serviceProviderStore.getAssignableServiceProvidersForRolleByOrganisationId(schulstrukturknotenOfRolle);
      expect(serviceProviderStore.loading).toBe(true);
      await getAllServiceProvidersPromise;
      expect(serviceProviderStore.allServiceProviders).toEqual([]);
      expect(serviceProviderStore.errorCode).toEqual('some mock server error');
      expect(serviceProviderStore.loading).toBe(false);
    });
  });

  describe('getAvailableServiceProviders', () => {
    it("should load user's available service providers and update state", async () => {
      const mockResponse: StartPageServiceProvider[] = [
        {
          id: '1234',
          name: 'itslearning mock',
          url: 'example.org/itslearning',
          kategorie: 'EMAIL',
          hasLogo: true,
          target: 'URL',
          requires2fa: true,
        },
        {
          id: '5678',
          name: 'administration mock',
          url: '/admin',
          kategorie: 'VERWALTUNG',
          hasLogo: true,
          target: 'URL',
          requires2fa: false,
        },
      ];

      mockadapter.onGet('/api/provider').replyOnce(200, mockResponse);
      const getAvailableServiceProvidersPromise: Promise<void> = serviceProviderStore.getAvailableServiceProviders();
      expect(serviceProviderStore.loading).toBe(true);
      await getAvailableServiceProvidersPromise;
      expect(serviceProviderStore.availableServiceProviders).toEqual([...mockResponse]);
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onGet('/api/provider').replyOnce(500, 'some mock server error');
      const getAvailableServiceProvidersPromise: Promise<void> = serviceProviderStore.getAvailableServiceProviders();
      expect(serviceProviderStore.loading).toBe(true);
      await getAvailableServiceProvidersPromise;
      expect(serviceProviderStore.availableServiceProviders).toEqual([]);
      expect(serviceProviderStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onGet('/api/provider').replyOnce(500, { code: 'some mock server error' });
      const getAvailableServiceProvidersPromise: Promise<void> = serviceProviderStore.getAvailableServiceProviders();
      expect(serviceProviderStore.loading).toBe(true);
      await getAvailableServiceProvidersPromise;
      expect(serviceProviderStore.availableServiceProviders).toEqual([]);
      expect(serviceProviderStore.errorCode).toEqual('some mock server error');
      expect(serviceProviderStore.loading).toBe(false);
    });
  });

  describe('getManageableServiceProviders', () => {
    const page: number = 1;
    const entriesPerPage: number = 30;
    const offset: number = (page - 1) * entriesPerPage;
    const limit: number = entriesPerPage;
    const url: string = `/api/provider/manageable?offset=${offset}&limit=${limit}`;

    it('should load service providers manageable by the user', async () => {
      const kategorienItems: ManageableServiceProviderSimpleListEntryResponse[] = [
        DoFactory.getManageableServiceProviderSimpleListEntryResponse(),
        DoFactory.getManageableServiceProviderSimpleListEntryResponse(),
        DoFactory.getManageableServiceProviderSimpleListEntryResponse(),
      ];
      const mockResponse: ProviderControllerGetManageableServiceProviders200Response = {
        items: kategorienItems,
        offset,
        limit,
        total: 3,
      };

      const kategorien: ServiceProviderKategorie[] = kategorienItems.map(
        (item: ManageableServiceProviderSimpleListEntryResponse) => item.kategorie,
      );
      const urlWithKategorien: string = `${url}&${kategorien.map((kategorie: ServiceProviderKategorie) => `kategorien=${kategorie}`).join('&')}`;
      mockadapter.onGet(urlWithKategorien).replyOnce(200, mockResponse);

      const filter: ManageableServiceProviderFilter = { kategorien, page, entriesPerPage };
      const promise: Promise<void> = serviceProviderStore.getManageableServiceProviders(filter);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.manageableServiceProviders).toEqual(expect.arrayContaining(mockResponse.items));
      expect(serviceProviderStore.manageableServiceProviders).toHaveLength(mockResponse.items.length);
      expect(serviceProviderStore.totalManageableServiceProviders).toEqual(mockResponse.total);
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should pass the search filter to the request', async () => {
      const items: ManageableServiceProviderSimpleListEntryResponse[] = [
        DoFactory.getManageableServiceProviderSimpleListEntryResponse(),
      ];
      const mockResponse: ProviderControllerGetManageableServiceProviders200Response = {
        items,
        offset,
        limit,
        total: 1,
      };

      const searchFilter: string = 'meine-suche';
      const urlWithSearchFilter: string = `${url}&searchFilter=${searchFilter}`;
      mockadapter.onGet(urlWithSearchFilter).replyOnce(200, mockResponse);

      const filter: ManageableServiceProviderFilter = { kategorien: [], searchFilter, page, entriesPerPage };
      const promise: Promise<void> = serviceProviderStore.getManageableServiceProviders(filter);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.manageableServiceProviders).toEqual(expect.arrayContaining(mockResponse.items));
      expect(serviceProviderStore.totalManageableServiceProviders).toEqual(mockResponse.total);
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onGet(url).replyOnce(500, 'some mock server error');
      const filter: ManageableServiceProviderFilter = { kategorien: [], page, entriesPerPage };
      const promise: Promise<void> = serviceProviderStore.getManageableServiceProviders(filter);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.manageableServiceProviders).toEqual([]);
      expect(serviceProviderStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onGet(url).replyOnce(500, { code: 'some mock server error' });
      const filter: ManageableServiceProviderFilter = { kategorien: [], page, entriesPerPage };
      const promise: Promise<void> = serviceProviderStore.getManageableServiceProviders(filter);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.manageableServiceProviders).toEqual([]);
      expect(serviceProviderStore.errorCode).toEqual('some mock server error');
      expect(serviceProviderStore.loading).toBe(false);
    });
  });

  describe('getManageableServiceProvidersForOrganisation', () => {
    const organisationId: string = faker.string.uuid();
    const page: number = 1;
    const itemsPerPage: number = 30;
    const offset: number = (page - 1) * itemsPerPage;
    const limit: number = itemsPerPage;
    const url: string = `/api/provider/manageable-by-organisation?offset=${offset}&limit=${limit}&organisationId=${organisationId}`;

    it('should load service providers manageable for the organisation', async () => {
      const mockResponse: ProviderControllerGetManageableServiceProviders200Response = {
        items: [
          DoFactory.getManageableServiceProviderSimpleListEntryResponse(),
          DoFactory.getManageableServiceProviderSimpleListEntryResponse(),
          DoFactory.getManageableServiceProviderSimpleListEntryResponse(),
        ],
        offset,
        limit,
        total: 3,
      };

      mockadapter.onGet(url).replyOnce(200, mockResponse);
      const promise: Promise<void> = serviceProviderStore.getManageableServiceProvidersForOrganisation(
        organisationId,
        page,
        itemsPerPage,
      );
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.manageableServiceProvidersForOrganisation).toEqual(
        expect.arrayContaining(mockResponse.items),
      );
      expect(serviceProviderStore.manageableServiceProvidersForOrganisation).toHaveLength(mockResponse.items.length);
      expect(serviceProviderStore.totalManageableServiceProvidersForOrganisation).toEqual(mockResponse.total);
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onGet(url).replyOnce(500, 'some mock server error');
      const promise: Promise<void> = serviceProviderStore.getManageableServiceProvidersForOrganisation(
        organisationId,
        page,
        itemsPerPage,
      );
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.manageableServiceProvidersForOrganisation).toEqual([]);
      expect(serviceProviderStore.totalManageableServiceProvidersForOrganisation).toEqual(0);
      expect(serviceProviderStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onGet(url).replyOnce(500, { code: 'some mock server error' });
      const promise: Promise<void> = serviceProviderStore.getManageableServiceProvidersForOrganisation(
        organisationId,
        page,
        itemsPerPage,
      );
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.manageableServiceProvidersForOrganisation).toEqual([]);
      expect(serviceProviderStore.errorCode).toEqual('some mock server error');
      expect(serviceProviderStore.loading).toBe(false);
    });
  });

  describe('getManageableServiceProviderById', () => {
    const serviceProviderId: string = 'test-provider-id';
    const url: string = `/api/provider/manageable/${serviceProviderId}`;

    it('should load a manageable service provider by id', async () => {
      const mockResponse: ManageableServiceProviderDetail = DoFactory.getManageableServiceProviderDetail();

      mockadapter.onGet(url).replyOnce(200, mockResponse);
      const promise: Promise<void> = serviceProviderStore.getManageableServiceProviderById(serviceProviderId);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.currentServiceProvider).toEqual(mockResponse);
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onGet(url).replyOnce(500, 'some mock server error');
      const promise: Promise<void> = serviceProviderStore.getManageableServiceProviderById(serviceProviderId);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onGet(url).replyOnce(500, { code: 'some mock server error' });
      const promise: Promise<void> = serviceProviderStore.getManageableServiceProviderById(serviceProviderId);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toEqual('some mock server error');
      expect(serviceProviderStore.loading).toBe(false);
    });
  });

  describe('getServiceProviderLogoById', () => {
    const serviceProviderId: string = faker.string.uuid();
    const url: string = `/api/provider/${serviceProviderId}/logo`;

    let mockReader: {
      onload: (() => void) | null;
      onerror?: (() => void) | null;
      readAsDataURL: (blob: Blob) => void;
      result: string | ArrayBuffer | null;
    };

    beforeEach(() => {
      mockReader = {
        onload: null,
        result: 'data:image/png;base64,bW9jayBpbWFnZSBkYXRh',
        readAsDataURL: vi.fn(function (this: typeof mockReader, _blob: Blob) {
          this.onload?.();
        }),
      };

      vi.spyOn(globalThis, 'FileReader').mockImplementation(function () {
        return mockReader as FileReader;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should load service provider logo by id', async () => {
      const mockBlob: Blob = new Blob(['mock image data'], { type: 'image/png' });
      mockadapter.onGet(url).replyOnce(200, mockBlob, { 'content-type': 'image/png' });

      const promise: Promise<void> = serviceProviderStore.getServiceProviderLogoById(serviceProviderId);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.serviceProviderLogos.get(serviceProviderId)).toBe(
        'data:image/png;base64,bW9jayBpbWFnZSBkYXRh',
      );
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onGet(url).replyOnce(500, 'some mock server error');
      const promise: Promise<void> = serviceProviderStore.getServiceProviderLogoById(serviceProviderId);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toEqual('');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onGet(url).replyOnce(500, { code: 'some mock server error' });
      const promise: Promise<void> = serviceProviderStore.getServiceProviderLogoById(serviceProviderId);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toEqual('');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle FileReader error', async () => {
      // Mock the FileReader to trigger an error
      mockReader = {
        onload: null,
        onerror: null,
        result: null,
        readAsDataURL: vi.fn(function (this: typeof mockReader, _blob: Blob) {
          // Simulate FileReader error
          this.onerror?.();
        }),
      };

      vi.spyOn(globalThis, 'FileReader').mockImplementation(function () {
        return mockReader as unknown as FileReader;
      });

      const mockBlob: Blob = new Blob(['mock image data'], { type: 'image/png' });
      mockadapter
        .onGet(`/api/provider/${serviceProviderId}/logo`)
        .replyOnce(200, mockBlob, { 'content-type': 'image/png' });

      await serviceProviderStore.getServiceProviderLogoById(serviceProviderId);

      // The FileReader error triggers your rejection handler, which sets errorCode
      expect(serviceProviderStore.errorCode).toEqual('');
      expect(serviceProviderStore.loading).toBe(false);
    });
  });

  describe('getRollenerweiterungenById (generic test)', () => {
    const serviceProviderId: string = faker.string.uuid();
    const url: string = `/api/provider/${serviceProviderId}/rollenerweiterung`;

    it('should transform API response into displayable overview array', async () => {
      // Generate random API items
      const apiItems: RollenerweiterungWithExtendedDataResponse[] = Array.from({ length: 5 }, () =>
        DoFactory.getRollenerweiterungItem(),
      );

      const mockResponse: ProviderControllerFindRollenerweiterungenByServiceProviderId200Response =
        DoFactory.getRollenerweiterungenResponse(apiItems);

      mockadapter.onGet(url).replyOnce(200, mockResponse);

      await serviceProviderStore.getRollenerweiterungenById({ serviceProviderId: serviceProviderId });

      const expectedRollenerweiterungUebersicht: RollenErweiterungenUebersicht[] =
        DoFactory.buildRollenerweiterungenUebersicht(apiItems);

      // Assert the store built the same overview
      expect(serviceProviderStore.rollenerweiterungenUebersicht).toEqual(expectedRollenerweiterungUebersicht);
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should group multiple items that belong to the same organisation into a single overview entry', async () => {
      const sharedOrg: Partial<RollenerweiterungWithExtendedDataResponse> = {
        organisationId: faker.string.uuid(),
        organisationName: faker.company.name(),
        organisationKennung: faker.string.alphanumeric(6),
      };
      const apiItems: RollenerweiterungWithExtendedDataResponse[] = [
        DoFactory.getRollenerweiterungItem({ ...sharedOrg, rolleName: 'Rolle A' }),
        DoFactory.getRollenerweiterungItem({ ...sharedOrg, rolleName: 'Rolle B' }),
      ];

      const mockResponse: ProviderControllerFindRollenerweiterungenByServiceProviderId200Response =
        DoFactory.getRollenerweiterungenResponse(apiItems);

      mockadapter.onGet(url).replyOnce(200, mockResponse);

      await serviceProviderStore.getRollenerweiterungenById({ serviceProviderId: serviceProviderId });

      const expectedRollenerweiterungUebersicht: RollenErweiterungenUebersicht[] =
        DoFactory.buildRollenerweiterungenUebersicht(apiItems);

      expect(expectedRollenerweiterungUebersicht).toHaveLength(1);
      expect(serviceProviderStore.rollenerweiterungenUebersicht).toEqual(expectedRollenerweiterungUebersicht);
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should fall back to an empty overview when the response has no items', async () => {
      const mockResponse: Omit<ProviderControllerFindRollenerweiterungenByServiceProviderId200Response, 'items'> = {
        total: 0,
        offset: 0,
        limit: 0,
      };

      mockadapter.onGet(url).replyOnce(200, mockResponse);

      await serviceProviderStore.getRollenerweiterungenById({ serviceProviderId: serviceProviderId });

      expect(serviceProviderStore.rollenerweiterungenUebersicht).toEqual([]);
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle errors', async () => {
      mockadapter.onGet(url).replyOnce(500, 'some error');
      await serviceProviderStore.getRollenerweiterungenById({ serviceProviderId: serviceProviderId });
      expect(serviceProviderStore.rollenerweiterungenUebersicht).toEqual([]);
      expect(serviceProviderStore.errorCode).toBe('UNSPECIFIED_ERROR');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onGet(url).replyOnce(500, { code: 'some mock server error' });
      await serviceProviderStore.getRollenerweiterungenById({ serviceProviderId: serviceProviderId });
      expect(serviceProviderStore.rollenerweiterungenUebersicht).toEqual([]);
      expect(serviceProviderStore.errorCode).toBe('some mock server error');
      expect(serviceProviderStore.loading).toBe(false);
    });
  });

  describe('persistRollenerweiterungenForServiceProvider', () => {
    const serviceProviderId: string = faker.string.uuid();
    const organisationId: string = faker.string.uuid();
    const url: string = `/api/rollen-erweiterung/angebot/${serviceProviderId}/organisation/${organisationId}/apply`;

    const filter: PersistRollenerweiterung = {
      serviceProviderId,
      organisationId,
      addErweiterungenForRolleIds: [faker.string.uuid(), faker.string.uuid()],
      removeErweiterungenForRolleIds: [faker.string.uuid()],
    };

    it('should persist rollenerweiterungen and update loading state', async () => {
      mockadapter.onPost(url).replyOnce(200);

      const promise: Promise<void> = serviceProviderStore.persistRollenerweiterungenForServiceProvider(filter);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toEqual('');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onPost(url).replyOnce(500, 'some mock server error');

      const promise: Promise<void> = serviceProviderStore.persistRollenerweiterungenForServiceProvider(filter);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onPost(url).replyOnce(500, { code: 'some mock server error' });

      const promise: Promise<void> = serviceProviderStore.persistRollenerweiterungenForServiceProvider(filter);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toEqual('some mock server error');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle MultiError with valid rolleIdsWithI18nKeys', async () => {
      const code: number = 400;
      const multiError: MultiError = {
        code,
        rolleIdsWithI18nKeys: [
          { rolleId: 'role-1', i18nKey: 'ROLLENERWEITERUNG_TECHNICAL_ERROR' },
          { rolleId: 'role-2', i18nKey: 'NOT_FOUND' },
        ],
      };
      mockadapter.onPost(url).replyOnce(code, multiError);

      const promise: Promise<void> = serviceProviderStore.persistRollenerweiterungenForServiceProvider(filter);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errors.size).toBe(2);
      expect(serviceProviderStore.errors.get('role-1')).toBe('ROLLENERWEITERUNG_TECHNICAL_ERROR');
      expect(serviceProviderStore.errors.get('role-2')).toBe('NOT_FOUND');
      expect(serviceProviderStore.errorCode).toBe('');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle MultiError with empty rolleIdsWithI18nKeys', async () => {
      const code: number = 400;
      const multiError: MultiError = {
        code,
        rolleIdsWithI18nKeys: [],
      };
      mockadapter.onPost(url).replyOnce(code, multiError);

      const promise: Promise<void> = serviceProviderStore.persistRollenerweiterungenForServiceProvider(filter);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errors.size).toBe(0);
      expect(serviceProviderStore.errorCode).toBe('');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle MultiError with missing code property', async () => {
      const multiError: MalformedMultiError = {
        rolleIdsWithI18nKeys: [{ rolleId: 'role-1', i18nKey: 'ROLLENERWEITERUNG_TECHNICAL_ERROR' }],
      };
      mockadapter.onPost(url).replyOnce(500, multiError);

      const promise: Promise<void> = serviceProviderStore.persistRollenerweiterungenForServiceProvider(filter);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toBe('UNSPECIFIED_ERROR');
      expect(serviceProviderStore.errors.size).toBe(0);
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle MultiError with wrong code type', async () => {
      const multiError: MalformedMultiError = {
        code: null,
        rolleIdsWithI18nKeys: 'not-an-array',
      };
      mockadapter.onPost(url).replyOnce(400, multiError);

      const promise: Promise<void> = serviceProviderStore.persistRollenerweiterungenForServiceProvider(filter);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toBe('UNSPECIFIED_ERROR');
      expect(serviceProviderStore.errors.size).toBe(0);
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle MultiError with non-array rolleIdsWithI18nKeys', async () => {
      const code: number = 400;
      const multiError: MalformedMultiError = {
        code,
        rolleIdsWithI18nKeys: 'not-an-array',
      };
      mockadapter.onPost(url).replyOnce(code, multiError);

      const promise: Promise<void> = serviceProviderStore.persistRollenerweiterungenForServiceProvider(filter);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toBe(multiError.code);
      expect(serviceProviderStore.errors.size).toBe(0);
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle MultiError with null error', async () => {
      mockadapter.onPost(url).replyOnce(500, null);

      const promise: Promise<void> = serviceProviderStore.persistRollenerweiterungenForServiceProvider(filter);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toBe('UNSPECIFIED_ERROR');
      expect(serviceProviderStore.errors.size).toBe(0);
      expect(serviceProviderStore.loading).toBe(false);
    });
  });

  describe('createServiceProvider', () => {
    const filter: ServiceProviderCreationFilter = {
      organisationId: faker.string.uuid(),
      name: 'Test Service Provider',
      url: faker.internet.url(),
      kategorie: ServiceProviderKategorie.Email,
      requires2fa: true,
      merkmale: [ServiceProviderMerkmal.NachtraeglichZuweisbar, ServiceProviderMerkmal.VerfuegbarFuerRollenerweiterung],
      rollenartenWhitelist: [RollenArt.Lehr, RollenArt.Lern],
    };
    const url: string = '/api/provider';

    it('should create a service provider and update state', async () => {
      const mockResponse: ServiceProviderResponse = {
        id: faker.string.uuid(),
        name: filter.name,
        url: filter.url,
        target: ServiceProviderTarget.Url,
        hasLogo: false,
        logoId: 1,
        kategorie: filter.kategorie,
        requires2fa: filter.requires2fa,
        merkmale: filter.merkmale,
        rollenartenWhitelist: filter.rollenartenWhitelist,
      };

      mockadapter.onPost(url).replyOnce(200, mockResponse);
      const promise: Promise<void> = serviceProviderStore.createServiceProvider(filter);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.createdServiceProvider).toEqual(mockResponse);
      expect(serviceProviderStore.errorCode).toEqual('');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onPost(url).replyOnce(500, 'some mock server error');
      const promise: Promise<void> = serviceProviderStore.createServiceProvider(filter);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onPost(url).replyOnce(500, { code: 'some mock server error' });
      const promise: Promise<void> = serviceProviderStore.createServiceProvider(filter);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toEqual('some mock server error');
      expect(serviceProviderStore.loading).toBe(false);
    });
  });

  describe('updateServiceProvider', () => {
    beforeEach(() => {
      serviceProviderStore.updatedServiceProvider = null;
    });
    const providerId: string = 'provider-to-update';
    const apiUrl: string = `/api/provider/${providerId}`;
    const update: Partial<{
      name: string;
      url: string;
      kategorie: ServiceProviderKategorie;
      logoId: number;
      rollenartenWhitelist: RollenArt[];
    }> = {
      name: 'Updated Service Provider',
      url: 'https://updated-url.com',
      kategorie: ServiceProviderKategorie.Email,
      logoId: 1,
      rollenartenWhitelist: [RollenArt.Lehr, RollenArt.Lern],
    };

    it('should update a service provider and update state', async () => {
      const mockResponse: ServiceProviderResponse = {
        id: providerId,
        name: update.name!,
        url: update.url!,
        target: ServiceProviderTarget.Url,
        hasLogo: false,
        logoId: 1,
        rollenartenWhitelist: update.rollenartenWhitelist!,
        kategorie: update.kategorie!,
        requires2fa: false,
        merkmale: [],
      };

      mockadapter.onPatch(apiUrl).replyOnce(200, mockResponse);
      const promise: Promise<void> = serviceProviderStore.updateServiceProvider(providerId, update);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.updatedServiceProvider).toEqual(mockResponse);
      expect(serviceProviderStore.errorCode).toEqual('');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should include merkmale with anbietung values in patch request body', async () => {
      const updateWithMerkmale: { merkmale: ServiceProviderMerkmal[] } = {
        merkmale: [
          ServiceProviderMerkmal.AnbietenInSchulischerAngebotsverwaltung,
          ServiceProviderMerkmal.AnbietenInSchulischerRollenverwaltung,
        ],
      };
      const mockResponse: ServiceProviderResponse = {
        id: providerId,
        name: 'Updated Service Provider',
        url: 'https://updated-url.com',
        target: ServiceProviderTarget.Url,
        hasLogo: false,
        logoId: 1,
        kategorie: ServiceProviderKategorie.Email,
        requires2fa: false,
        merkmale: updateWithMerkmale.merkmale,
        rollenartenWhitelist: [],
      };

      mockadapter.onPatch(apiUrl).replyOnce(200, mockResponse);
      await serviceProviderStore.updateServiceProvider(providerId, updateWithMerkmale);

      const patchData: unknown = mockadapter.history.patch[0]?.data;
      const requestBodyRaw: unknown = JSON.parse(typeof patchData === 'string' ? patchData : '{}');
      const requestBody: { merkmale?: ServiceProviderMerkmal[] } =
        typeof requestBodyRaw === 'object' && requestBodyRaw !== null ? requestBodyRaw : {};
      expect(requestBody.merkmale).toEqual(updateWithMerkmale.merkmale);
    });

    it('should handle string error', async () => {
      mockadapter.onPatch(apiUrl).replyOnce(500, 'some mock server error');
      const promise: Promise<void> = serviceProviderStore.updateServiceProvider(providerId, update);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onPatch(apiUrl).replyOnce(500, { code: 'some mock server error' });
      const promise: Promise<void> = serviceProviderStore.updateServiceProvider(providerId, update);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toEqual('some mock server error');
      expect(serviceProviderStore.loading).toBe(false);
    });
  });

  describe('deleteServiceProvider', () => {
    const providerId: string = 'provider-to-delete';
    const apiUrl: string = `/api/provider/${providerId}`;

    beforeEach(() => {
      mockadapter.reset();
      serviceProviderStore.errorCode = '';
      serviceProviderStore.loading = false;
    });

    it('removes provider from all arrays and resets currentServiceProvider on success', async () => {
      mockadapter.onDelete(apiUrl).replyOnce(200);
      const promise: Promise<void> = serviceProviderStore.deleteServiceProvider(providerId);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toBe('');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('sets errorCode to UNSPECIFIED_ERROR on string error', async () => {
      mockadapter.onDelete(apiUrl).replyOnce(500, 'some error');
      const promise: Promise<void> = serviceProviderStore.deleteServiceProvider(providerId);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toBe('UNSPECIFIED_ERROR');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('sets errorCode to error code if present in error response', async () => {
      mockadapter.onDelete(apiUrl).replyOnce(500, { code: 'some error code' });
      const promise: Promise<void> = serviceProviderStore.deleteServiceProvider(providerId);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toBe('some error code');
      expect(serviceProviderStore.loading).toBe(false);
    });
  });

  describe('syncServiceProvidersForSchule', () => {
    const organisationId: string = faker.string.uuid();
    const apiUrl: string = `/api/vidis/${organisationId}/angebote-sync`;

    beforeEach(() => {
      mockadapter.reset();
      serviceProviderStore.errorCode = '';
      serviceProviderStore.loading = false;
    });

    it('should sync service providers for a school successfully', async () => {
      mockadapter.onPut(apiUrl).replyOnce(200);
      const promise: Promise<void> = serviceProviderStore.syncServiceProvidersForSchule(organisationId);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toBe('');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onPut(apiUrl).replyOnce(500, 'some mock server error');
      const promise: Promise<void> = serviceProviderStore.syncServiceProvidersForSchule(organisationId);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toBe('UNSPECIFIED_ERROR');
      expect(serviceProviderStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onPut(apiUrl).replyOnce(500, { code: 'some error code' });
      const promise: Promise<void> = serviceProviderStore.syncServiceProvidersForSchule(organisationId);
      expect(serviceProviderStore.loading).toBe(true);
      await promise;
      expect(serviceProviderStore.errorCode).toBe('some error code');
      expect(serviceProviderStore.loading).toBe(false);
    });
  });
});
