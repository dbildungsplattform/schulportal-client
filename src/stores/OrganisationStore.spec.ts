import { OrganisationResponse, OrganisationsTyp, type OrganisationRootChildrenResponse } from '@/api-client/generated';
import axiosApiInstance from '@/services/ApiService';
import { faker } from '@faker-js/faker';
import { flushPromises } from '@vue/test-utils';
import MockAdapter from 'axios-mock-adapter';
import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import {
  SchuleType,
  useOrganisationStore,
  type AutoCompleteStore,
  type Organisation,
  type OrganisationenFilter,
  type OrganisationStore,
} from './OrganisationStore';

const mockadapter: MockAdapter = new MockAdapter(axiosApiInstance);

describe('OrganisationStore', () => {
  let organisationStore: OrganisationStore;
  beforeEach(() => {
    setActivePinia(createPinia());
    organisationStore = useOrganisationStore();
    mockadapter.reset();
  });

  it('should initialize state correctly', () => {
    expect(organisationStore.allOrganisationen).toEqual([]);
    expect(organisationStore.errorCode).toEqual('');
    expect(organisationStore.loading).toBe(false);
  });

  describe('getAllOrganisations', () => {
    it('should fetch all organisations and update state', async () => {
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

      mockadapter.onGet('/api/organisationen?offset=0&limit=30').replyOnce(200, mockResponse);
      const getAllOrganisationenPromise: Promise<void> = organisationStore.getAllOrganisationen({
        offset: 0,
        limit: 30,
      });
      await getAllOrganisationenPromise;
      expect(organisationStore.allOrganisationen).toEqual(mockResponse);
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
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
      const mockResponse: Organisation[] = [
        {
          id: '1',
          kennung: 'Org1',
          name: 'Organisation 1',
          namensergaenzung: 'Ergänzung',
          kuerzel: 'O1',
          typ: OrganisationsTyp.Klasse,
        },
      ];

      mockadapter
        .onGet('/api/organisationen?offset=0&limit=30&searchString=searchString&systemrechte=ROLLEN_VERWALTEN')
        .replyOnce(200, mockResponse);
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
      const mockResponse: Organisation[] = [
        {
          id: '1',
          kennung: 'Org1',
          name: 'Organisation 1',
          namensergaenzung: 'Ergänzung',
          kuerzel: 'O1',
          typ: OrganisationsTyp.Klasse,
          schuleDetails: '---',
        },
      ];

      mockadapter.onGet('/api/organisationen?offset=0&limit=30&typ=KLASSE').replyOnce(200, mockResponse);
      mockadapter.onGet('/api/organisationen?limit=30&typ=SCHULE&systemrechte=KLASSEN_VERWALTEN').replyOnce(200, []);
      const getAllOrganisationenPromise: Promise<void> = organisationStore.getAllOrganisationen({
        offset: 0,
        limit: 30,
        includeTyp: OrganisationsTyp.Klasse,
      });
      await getAllOrganisationenPromise;
      expect(organisationStore.allKlassen).toEqual(mockResponse);
      expect(organisationStore.loading).toBe(false);
    });

    it('should accept filter for typ Schule', async () => {
      const mockResponse: Organisation[] = [
        {
          id: '1',
          kennung: 'Org1',
          name: 'Organisation 1',
          namensergaenzung: 'Ergänzung',
          kuerzel: 'O1',
          typ: OrganisationsTyp.Schule,
        },
      ];

      mockadapter.onGet('/api/organisationen?offset=0&limit=30&typ=SCHULE').replyOnce(200, mockResponse, {
        'x-paging-total': '1',
      });
      const getAllOrganisationenPromise: Promise<void> = organisationStore.getAllOrganisationen({
        offset: 0,
        limit: 30,
        includeTyp: OrganisationsTyp.Schule,
      });

      await getAllOrganisationenPromise;
      expect(organisationStore.allSchulen).toEqual(mockResponse);
      expect(organisationStore.totalSchulen).toEqual(1);
      expect(organisationStore.loading).toBe(false);
    });

    it('should accept filter for typ Traeger', async () => {
      const mockResponse: Organisation[] = [
        {
          id: '1',
          kennung: 'Org1',
          name: 'Organisation 1',
          namensergaenzung: 'Ergänzung',
          kuerzel: 'O1',
          typ: OrganisationsTyp.Traeger,
        },
      ];

      mockadapter.onGet('/api/organisationen?offset=0&limit=30&typ=TRAEGER').replyOnce(200, mockResponse, {
        'x-paging-total': '1',
      });
      mockadapter
        .onGet('/api/organisationen?limit=30&typ=SCHULE&systemrechte=SCHULTRAEGER_VERWALTEN&administriertVon=999')
        .replyOnce(200, []);

      const getAllOrganisationenPromise: Promise<void> = organisationStore.getAllOrganisationen({
        offset: 0,
        limit: 30,
        includeTyp: OrganisationsTyp.Traeger,
      });
      await getAllOrganisationenPromise;
      expect(organisationStore.allSchultraeger).toEqual(mockResponse);
      expect(organisationStore.loading).toBe(false);
    });
  });

  describe('getOrganisationById', () => {
    it('should load schule and update state', async () => {
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

  describe('getLockingOrganisationById', () => {
    it('should load the locking Organisation and update state', async () => {
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
      mockadapter.onGet('/api/organisationen/1').replyOnce(500, 'some mock server error');
      const promise: Promise<void> = organisationStore.getLockingOrganisationById('1');
      await promise;
      expect(organisationStore.lockingOrganisation).toEqual(null);
      expect(organisationStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
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
      mockadapter.onPost('/api/organisationen/parents-by-ids').replyOnce(200, mockResponse);
      await organisationStore.getParentOrganisationsByIds(requestIds);
      expect(organisationStore.parentOrganisationen).toEqual(mockOrganisationen);
      expect(organisationStore.errorCode).toEqual('');
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onPost('/api/organisationen/parents-by-ids').replyOnce(500, 'some mock server error');
      const getParentOrganisationsByIdPromise: Promise<void> =
        organisationStore.getParentOrganisationsByIds(requestIds);
      await getParentOrganisationsByIdPromise;
      expect(organisationStore.parentOrganisationen).toEqual([]);
      expect(organisationStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
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

  describe('getKlassenByOrganisationId', () => {
    it('should fetch all Klassen and update state', async () => {
      const mockKlassenResponse: Organisation[] = [
        {
          id: '1000',
          name: '9a',
          namensergaenzung: 'Ergänzung',
          kuerzel: 'O1',
          typ: OrganisationsTyp.Klasse,
          administriertVon: '1',
          schuleDetails: '---',
        },
      ];
      const mockSchulenResponse: Organisation[] = [
        {
          id: '1',
          kennung: '0815',
          name: 'Testschule',
          namensergaenzung: 'Ergänzung',
          kuerzel: 'O1',
          typ: OrganisationsTyp.Klasse,
          administriertVon: '1',
          schuleDetails: '---',
        },
      ];
      const expectedKlassen: Organisation[] = mockKlassenResponse.map((k: Organisation) => ({
        ...k,
        schuleDetails: '0815 (Testschule)',
      }));

      mockadapter.onGet('/api/organisationen?typ=KLASSE&administriertVon=1').replyOnce(200, mockKlassenResponse);
      mockadapter
        .onGet('/api/organisationen?limit=30&typ=SCHULE&systemrechte=KLASSEN_VERWALTEN&organisationIds=1')
        .replyOnce(200, mockSchulenResponse);
      const getAllKlassenByOrganisationId: Promise<void> = organisationStore.getKlassenByOrganisationId({
        administriertVon: ['1'],
      });
      await getAllKlassenByOrganisationId;
      expect(organisationStore.klassen).toEqual(expectedKlassen);
      expect(organisationStore.loadingKlassen).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onGet('/api/organisationen?typ=KLASSE&administriertVon=1').replyOnce(500, 'some mock server error');
      const getAllKlassenByOrganisationId: Promise<void> = organisationStore.getKlassenByOrganisationId({
        administriertVon: ['1'],
      });
      expect(organisationStore.loadingKlassen).toBe(true);
      await getAllKlassenByOrganisationId;
      expect(organisationStore.klassen).toEqual([]);
      expect(organisationStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(organisationStore.loadingKlassen).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter
        .onGet('/api/organisationen?typ=KLASSE&administriertVon=1')
        .replyOnce(500, { code: 'some mock server error' });
      const getAllKlassenByOrganisationId: Promise<void> = organisationStore.getKlassenByOrganisationId({
        administriertVon: ['1'],
      });
      expect(organisationStore.loadingKlassen).toBe(true);
      await getAllKlassenByOrganisationId;
      expect(organisationStore.klassen).toEqual([]);
      expect(organisationStore.errorCode).toEqual('some mock server error');
      expect(organisationStore.loadingKlassen).toBe(false);
    });
  });

  describe('updateOrganisationById', () => {
    it('should update the organisation and update state', async () => {
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
      const updateOrganisationPromise: Promise<void> = organisationStore.updateOrganisationById(
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
      const updateOrganisationPromise: Promise<void> = organisationStore.updateOrganisationById(
        '2',
        'Updated Träger 1',
        OrganisationsTyp.Traeger,
      );
      expect(organisationStore.loading).toBe(true);
      await updateOrganisationPromise;
      expect(organisationStore.updatedOrganisation).toEqual(mockResponse);
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
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
      const updateOrganisationPromise: Promise<void> = organisationStore.updateOrganisationById(
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
      const updateOrganisationPromise: Promise<void> = organisationStore.updateOrganisationById(
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

      const updateOrganisationPromise: Promise<void> = organisationStore.updateOrganisationById(
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
      // Set currentOrganisation version to undefined to trigger the error
      organisationStore.currentOrganisation = {
        id: '2',
        kennung: 'Org2',
        name: 'Organisation 2',
        namensergaenzung: 'Ergänzung',
        kuerzel: 'O2',
        typ: OrganisationsTyp.Traeger,
        administriertVon: '1',
        zugehoerigZu: '1',
        version: undefined,
      };

      const updateOrganisationPromise: Promise<void> = organisationStore.updateOrganisationById(
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
            zugehoerigZu: null,
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

    it('should preserve the error code from a failed organisation request', async () => {
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
      mockadapter.onGet('/api/organisationen/1').replyOnce(500, 'some mock server error');
      const getOrganisationByIdPromise: Promise<void> = organisationStore.fetchSchulDetails('schule-1');
      await getOrganisationByIdPromise;
      expect(organisationStore.currentSchule).toEqual(null);
      expect(organisationStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(organisationStore.loading).toBe(false);
    });
  });

  describe('loadSchultraeger', () => {
    it('should update the schultraeger', async () => {
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
          zugehoerigZu: '1',
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
          zugehoerigZu: '1',
          version: 1,
          itslearningEnabled: true,
          emailAdress: 'ersatz@example.com',
        },
      };

      mockadapter.onGet('/api/organisationen/root/children').replyOnce(200, mockResponse);
      const updateOrganisationPromise: Promise<void> = organisationStore.getRootKinderSchultraeger();
      await updateOrganisationPromise;
      expect(organisationStore.schultraeger).toEqual([mockResponse.oeffentlich, mockResponse.ersatz]);
    });

    it('should handle string error', async () => {
      mockadapter.onGet('/api/organisationen/root/children').replyOnce(500, 'some mock server error');
      const updateOrganisationPromise: Promise<void> = organisationStore.getRootKinderSchultraeger();
      await updateOrganisationPromise;
      expect(organisationStore.schultraeger).toEqual([]);
      expect(organisationStore.errorCode).toEqual('SCHULTRAEGER_ERROR');
    });

    it('should handle error code', async () => {
      mockadapter.onGet('/api/organisationen/root/children').replyOnce(500, { i18nKey: 'GET_ERROR' });
      const updateOrganisationPromise: Promise<void> = organisationStore.getRootKinderSchultraeger();
      await updateOrganisationPromise;
      expect(organisationStore.schultraeger).toEqual([]);
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

    beforeEach(() => {
      organisationStore.allKlassen = [...mockKlassen];
      organisationStore.klassen = [...mockKlassen];
      organisationStore.loading = false;
    });

    it('should fetch schule details', async () => {
      mockadapter
        .onGet('/api/organisationen?limit=30&typ=SCHULE&systemrechte=KLASSEN_VERWALTEN&organisationIds=101')
        .replyOnce(200, [
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

      await organisationStore.fetchSchuleDetailsForKlassen(false);

      expect(organisationStore.klassen).toEqual(mockKlassen);
      expect(organisationStore.allKlassen[0]?.schuleDetails).toBe('123456 (Schule 1)');
      expect(organisationStore.loadingKlassen).toBe(false);
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
        mockadapter
          .onGet('/api/organisationen?limit=30&typ=SCHULE&systemrechte=KLASSEN_VERWALTEN&organisationIds=101')
          .replyOnce(500, response);

        await organisationStore.fetchSchuleDetailsForKlassen(false);

        expect(organisationStore.schultraeger).toEqual([]);
        expect(organisationStore.errorCode).toEqual(expectedError);
      },
    );
  });

  describe('fetchSchuleDetailsForSchultraeger', () => {
    const mockSchultraeger: Organisation[] = [
      DoFactory.getOrganisation({ typ: OrganisationsTyp.Traeger }),
      DoFactory.getOrganisation({ typ: OrganisationsTyp.Traeger }),
    ];
    const zugehoerigZuParams: string = mockSchultraeger.map((st: Organisation) => `zugehoerigZu=${st.id}`).join('&');
    const url: string = `/api/organisationen?limit=30&typ=SCHULE&systemrechte=SCHULTRAEGER_VERWALTEN&${zugehoerigZuParams}`;

    beforeEach(() => {
      organisationStore.allSchultraeger = [...mockSchultraeger];
      organisationStore.errorCode = '';
      organisationStore.loading = false;
    });

    it('should fetch Schule details for Schulträger', async () => {
      const mockResponse: Organisation[] = [DoFactory.getOrganisation({ zugehoerigZu: mockSchultraeger[0]!.id })];
      mockadapter.onGet(url).replyOnce(200, mockResponse);

      await organisationStore.fetchSchuleDetailsForSchultraeger();

      expect(organisationStore.allSchultraeger[0]?.schuleDetails).toBe(
        mockResponse
          .filter((org: Organisation) => org.zugehoerigZu === mockSchultraeger[0]!.id)
          .map((org: Organisation) => org.kennung)
          .join(', ') || '---',
      );
      expect(organisationStore.loading).toBe(false);
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
        mockadapter.onGet(url).replyOnce(500, response);

        await organisationStore.fetchSchuleDetailsForSchultraeger();

        expect(organisationStore.errorCode).toBe(expectedError);
        expect(organisationStore.loading).toBe(false);
      },
    );
  });

  describe('fetchSchulen', () => {
    it('should load all schulen for a specific traeger ID (ASSIGNED)', async () => {
      const mockResponse: Array<Organisation> = [
        {
          id: '11',
          kennung: '652464',
          name: 'Schule from Traeger',
          namensergaenzung: 'Ergänzung',
          kuerzel: 'O1',
          typ: OrganisationsTyp.Schule,
          administriertVon: '2',
          zugehoerigZu: '2',
        },
      ];

      mockadapter
        .onGet('/api/organisationen?searchString=&typ=SCHULE&systemrechte=SCHULTRAEGER_VERWALTEN&zugehoerigZu=2')
        .replyOnce(200, mockResponse);

      await organisationStore.fetchSchulen(
        { searchString: '', zugehoerigZu: ['2'], offset: undefined, limit: undefined },
        SchuleType.ASSIGNED,
      );

      expect(organisationStore.schulenFromTraeger).toEqual(mockResponse);
      expect(organisationStore.loading).toBe(false);
      expect(organisationStore.errorCode).toBe('');
    });

    it('should handle a server error and set default error code', async () => {
      mockadapter
        .onGet('/api/organisationen?searchString=&typ=SCHULE&systemrechte=SCHULTRAEGER_VERWALTEN&zugehoerigZu=999')
        .replyOnce(500, 'some mock server error');

      await organisationStore.fetchSchulen(
        { searchString: '', zugehoerigZu: ['999'], offset: undefined, limit: undefined },
        SchuleType.ASSIGNED,
      );

      expect(organisationStore.schulenFromTraeger).toEqual([]); // Should reset to empty array
      expect(organisationStore.errorCode).toEqual('SCHULTRAEGER_ERROR'); // Default error code
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle API error responses containing a specific error code', async () => {
      mockadapter
        .onGet('/api/organisationen?searchString=&typ=SCHULE&systemrechte=SCHULTRAEGER_VERWALTEN&zugehoerigZu=999')
        .replyOnce(500, { code: 'MOCK_ERROR_CODE' });

      await organisationStore.fetchSchulen(
        { searchString: '', zugehoerigZu: ['999'], offset: undefined, limit: undefined },
        SchuleType.ASSIGNED,
      );

      expect(organisationStore.schulenFromTraeger).toEqual([]); // Should reset to empty array
      expect(organisationStore.errorCode).toEqual('MOCK_ERROR_CODE'); // Should pick up the mock error code
      expect(organisationStore.loading).toBe(false);
    });

    it('should load unassigned schulen when called with SchuleType.UNASSIGNED', async () => {
      const mockResponse: Array<Organisation> = [
        {
          id: '22',
          kennung: '123456',
          name: 'Unassigned Schule',
          namensergaenzung: '',
          kuerzel: 'U1',
          typ: OrganisationsTyp.Schule,
          administriertVon: null,
          zugehoerigZu: null,
        },
      ];
      mockadapter
        .onGet('/api/organisationen?limit=50&searchString=&typ=SCHULE&systemrechte=SCHULTRAEGER_VERWALTEN')
        .replyOnce(200, mockResponse);

      await organisationStore.fetchSchulen(
        { searchString: '', zugehoerigZu: undefined, offset: undefined, limit: 50 },
        SchuleType.UNASSIGNED,
      );

      expect(organisationStore.schulenWithoutTraeger).toEqual(mockResponse);
      expect(organisationStore.loading).toBe(false);
      expect(organisationStore.errorCode).toBe('');
    });
  });

  describe('assignSchuleToTraeger', () => {
    it('should assign schule to traeger', async () => {
      mockadapter.onPost('/api/organisationen/2/zugehoerig').replyOnce(201);
      const assignSchuleToTraegerPromise: Promise<void> = organisationStore.assignSchuleToTraeger('2', {
        organisationId: '11',
      });
      await assignSchuleToTraegerPromise;
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter.onPost('/api/organisationen/999/zugehoerig').replyOnce(500, 'some mock server error');
      const assignSchuleToTraegerPromise: Promise<void> = organisationStore.assignSchuleToTraeger('999', {
        organisationId: '997979797',
      });
      await assignSchuleToTraegerPromise;
      expect(organisationStore.errorCode).toEqual('SCHULTRAEGER_ERROR');
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter.onPost('/api/organisationen/999/zugehoerig').replyOnce(500, { code: 'some mock server error' });
      const assignSchuleToTraegerPromise: Promise<void> = organisationStore.assignSchuleToTraeger('999', {
        organisationId: '997979797',
      });
      expect(organisationStore.loading).toBe(true);
      await assignSchuleToTraegerPromise;
      expect(organisationStore.errorCode).toEqual('some mock server error');
      expect(organisationStore.loading).toBe(false);
    });
  });

  describe('setItsLearningForSchule', () => {
    it('should successfully activate itslearning for an organisation and update state', async () => {
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

      expect(organisationStore.activatedItslearningOrganisation).toEqual(mockResponse);
      expect(organisationStore.errorCode).toBe('');
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle a generic error and set UNSPECIFIED_ERROR', async () => {
      mockadapter.onPut('/api/organisationen/1/enable-for-its-learning').networkErrorOnce();

      const promise: Promise<void> = organisationStore.setItsLearningForSchule('1');
      expect(organisationStore.loading).toBe(true);
      await promise;

      expect(organisationStore.activatedItslearningOrganisation).toBeNull();
      expect(organisationStore.errorCode).toBe('ORGANISATION_SPECIFICATION_ERROR');
      expect(organisationStore.loading).toBe(false);
    });

    it('should handle Axios-specific error with i18nKey or default error code', async () => {
      mockadapter.onPut('/api/organisationen/1/enable-for-its-learning').replyOnce(500, { i18nKey: 'ENABLE_ERROR' });

      const promise: Promise<void> = organisationStore.setItsLearningForSchule('1');
      expect(organisationStore.loading).toBe(true);
      await promise;

      expect(organisationStore.activatedItslearningOrganisation).toBeNull();
      expect(organisationStore.errorCode).toBe('ENABLE_ERROR');
      expect(organisationStore.loading).toBe(false);
    });
  });

  describe('createOrganisation', () => {
    it('should create schule and update state', async () => {
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

    it('should handle string error', async () => {
      mockadapter.onPost('/api/organisationen').replyOnce(500, 'some mock server error');
      const createOrganisationPromise: Promise<void> = organisationStore.createOrganisation(
        '1',
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
      mockadapter.onPost('/api/organisationen').replyOnce(500, { i18nKey: 'SOME_MOCK_SERVER_ERROR' });
      const createOrganisationPromise: Promise<void> = organisationStore.createOrganisation(
        '1',
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

  describe('getFilteredKlassen', () => {
    it('should get all klassen for a schule with search string', async () => {
      const mockResponse: Organisation[] = [
        {
          id: '1',
          kennung: '1234567',
          name: 'Klasse 1',
          namensergaenzung: 'Ergänzung',
          kuerzel: 'K1',
          typ: OrganisationsTyp.Klasse,
          administriertVon: '1',
        },
      ];

      mockadapter
        .onGet('/api/organisationen?limit=200&searchString=klasse&typ=KLASSE&administriertVon=1')
        .replyOnce(200, mockResponse, { 'x-paging-total': '1' });
      const getFilteredKlassenPromise: Promise<void> = organisationStore.getFilteredKlassen({
        searchString: 'klasse',
        administriertVon: ['1'],
      });

      expect(organisationStore.loadingKlassen).toBe(true);
      await getFilteredKlassenPromise;
      expect(organisationStore.klassen).toEqual(mockResponse);
      expect(organisationStore.totalKlassen).toEqual(1);
      expect(organisationStore.loadingKlassen).toBe(false);
    });

    it('should handle string error', async () => {
      mockadapter
        .onGet('/api/organisationen?limit=200&searchString=klasse&typ=KLASSE&administriertVon=1')
        .replyOnce(500, 'some mock server error');
      const getFilteredKlassenPromise: Promise<void> = organisationStore.getFilteredKlassen({
        searchString: 'klasse',
        administriertVon: ['1'],
      });

      expect(organisationStore.loadingKlassen).toBe(true);
      await getFilteredKlassenPromise;
      expect(organisationStore.errorCode).toEqual('UNSPECIFIED_ERROR');
      expect(organisationStore.loadingKlassen).toBe(false);
    });

    it('should handle error code', async () => {
      mockadapter
        .onGet('/api/organisationen?limit=200&searchString=hund&typ=KLASSE&administriertVon=100')
        .replyOnce(500, { code: 'some mock server error' });
      const getFilteredKlassenPromise: Promise<void> = organisationStore.getFilteredKlassen({
        searchString: 'hund',
        administriertVon: ['100'],
      });

      expect(organisationStore.loadingKlassen).toBe(true);
      await getFilteredKlassenPromise;
      expect(organisationStore.errorCode).toEqual('some mock server error');
      expect(organisationStore.loadingKlassen).toBe(false);
    });
  });

  describe('deleteOrganisationById', () => {
    const organisationId: string = faker.string.uuid();
    const endpoint: string = `/api/organisationen/${organisationId}`;

    it('should delete organisation and update state', async () => {
      mockadapter.onDelete(endpoint).replyOnce(200);
      const deleteOrganisationPromise: Promise<void> = organisationStore.deleteOrganisationById(organisationId);
      expect(organisationStore.loading).toBe(true);
      await deleteOrganisationPromise;
      expect(organisationStore.loading).toBe(false);
      expect(organisationStore.errorCode).toEqual('');
    });

    type ErrorType = string | { i18nKey: string };

    it.each([
      ['some mock server error', 'UNSPECIFIED_ERROR'],
      [{ i18nKey: 'some mock server error' }, 'some mock server error'],
    ])('should handle error', async (error: ErrorType, expectedErrorCode: string) => {
      mockadapter.onDelete(endpoint).replyOnce(500, error);
      const deleteOrganisationPromise: Promise<void> = organisationStore.deleteOrganisationById(organisationId);
      expect(organisationStore.loading).toBe(true);
      await deleteOrganisationPromise;
      expect(organisationStore.loading).toBe(false);
      expect(organisationStore.errorCode).toEqual(expectedErrorCode);
    });
  });

  describe('loadOrganisationenForFilter', () => {
    describe.each([[''], ['testId']])('with storeKey=%s', (storeKey: string) => {
      const defaultFilter: OrganisationenFilter = {
        offset: 0,
        limit: 30,
        includeTyp: OrganisationsTyp.Schule,
      };
      const defaultUrl: string = '/api/organisationen?offset=0&limit=30&typ=SCHULE';

      test('should load organisationen for filter', async () => {
        const mockResponse: Organisation[] = [DoFactory.getSchule()];

        mockadapter.onGet(defaultUrl).replyOnce(200, mockResponse, {
          'x-paging-total': '1',
        });
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
    describe.each([['', undefined, 'something']])('when store key is %s', (storeKey: string | undefined) => {
      test('should reset filter', () => {
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
    describe.each([['', undefined, 'something']])('when store key is %s', (storeKey: string | undefined) => {
      test('should delete the filter', () => {
        organisationStore.organisationenFilters = new Map([
          [storeKey ?? '', { filterResult: [DoFactory.getSchule()], loading: true, total: 1 }],
        ]);
        organisationStore.clearOrganisationenFilter(storeKey);
        expect(organisationStore.organisationenFilters.get(storeKey ?? '')).toBeUndefined();
      });
    });
  });

  describe('loadKlassenForFilter', () => {
    test('it initializes the field, if it does not exist', async () => {
      const mockResponse: Organisation[] = [DoFactory.getSchule()];
      mockadapter.onGet('/api/organisationen?offset=0&limit=30&typ=KLASSE').replyOnce(200, mockResponse, {
        'x-paging-total': '1',
      });
      expect(organisationStore.klassenFilters.get('unknownKey')).toBeUndefined();
      organisationStore.loadKlassenForFilter(
        {
          offset: 0,
          limit: 30,
        },
        'unknownKey',
      );
      await flushPromises();
      expect(organisationStore.klassenFilters.get('unknownKey')).toBeDefined();
    });

    describe.each(['', undefined, 'something'])('when store key is %s', (storeKey: string | undefined) => {
      test('should load klassen for filter', async () => {
        const mockResponse: Organisation[] = [DoFactory.getSchule()];

        mockadapter.onGet('/api/organisationen?offset=0&limit=30&typ=KLASSE').replyOnce(200, mockResponse, {
          'x-paging-pagetotal': '1',
        });
        const promise: Promise<void> = organisationStore.loadKlassenForFilter(
          {
            offset: 0,
            limit: 30,
          },
          storeKey,
        );
        await promise;
        const klassenFilter: AutoCompleteStore<Organisation> = organisationStore.klassenFilters.get(storeKey ?? '')!;
        expect(klassenFilter).toBeDefined();
        expect(klassenFilter.filterResult).toEqual(mockResponse);
        expect(klassenFilter.total).toEqual(1);
        expect(klassenFilter.loading).toBe(false);
      });

      it('should handle string error', async () => {
        mockadapter.onGet('/api/organisationen?offset=0&limit=30&typ=KLASSE').replyOnce(500, 'some mock server error');
        const getAllOrganisationenPromise: Promise<void> = organisationStore.loadKlassenForFilter(
          {
            offset: 0,
            limit: 30,
          },
          storeKey,
        );
        await getAllOrganisationenPromise;

        const klassenFilter: AutoCompleteStore<Organisation> = organisationStore.klassenFilters.get(storeKey ?? '')!;
        expect(klassenFilter).toBeDefined();
        expect(klassenFilter.errorCode).toEqual('UNSPECIFIED_ERROR');
      });

      it('should handle error code', async () => {
        mockadapter
          .onGet('/api/organisationen?offset=0&limit=30&typ=KLASSE')
          .replyOnce(500, { code: 'some mock server error' });
        const getAllOrganisationenPromise: Promise<void> = organisationStore.loadKlassenForFilter(
          {
            offset: 0,
            limit: 30,
          },
          storeKey,
        );
        await getAllOrganisationenPromise;
        const klassenFilter: AutoCompleteStore<Organisation> = organisationStore.klassenFilters.get(storeKey ?? '')!;
        expect(klassenFilter).toBeDefined();
        expect(klassenFilter.errorCode).toEqual('some mock server error');
      });
    });
  });

  describe('resetKlasseFilter', () => {
    describe.each([['', undefined, 'something']])('when store key is %s', (storeKey: string | undefined) => {
      const klassen: Organisation[] = [DoFactory.getKlasse()];
      test('should reset filter', () => {
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
    describe.each([['', undefined, 'something']])('when store key is %s', (storeKey: string | undefined) => {
      test('should delete the filter', () => {
        organisationStore.klassenFilters = new Map([
          [storeKey ?? '', { filterResult: [DoFactory.getKlasse()], loading: true, total: 1 }],
        ]);
        organisationStore.clearKlasseFilter(storeKey);
        expect(organisationStore.klassenFilters.get(storeKey ?? '')).toBeUndefined();
      });
    });
  });
});
