import type { MeldungResponse } from '@/api-client/generated';
import axiosApiInstance from '@/services/ApiService';
import MockAdapter from 'axios-mock-adapter';
import { setActivePinia, createPinia } from 'pinia';
import { useMeldungStore, type Meldung, type MeldungStore } from './MeldungStore';

const mockadapter: MockAdapter = new MockAdapter(axiosApiInstance);

describe('MeldungStore', () => {
  let meldungStore: MeldungStore;

  const meldungResponse: MeldungResponse[] = [
    {
      id: '1',
      inhalt: 'This is a test',
      status: 'VEROEFFENTLICHT',
    },
    {
      id: '2',
      inhalt: 'This is another test',
      status: 'VEROEFFENTLICHT',
    },
  ] as MeldungResponse[];

  beforeEach(() => {
    setActivePinia(createPinia());
    meldungStore = useMeldungStore();
    mockadapter.reset();
  });

  describe('getAllMeldungen', () => {
    it('should get all meldungen', async () => {
      mockadapter.onGet('/api/portal/meldung').replyOnce(200, meldungResponse);
      const getAllMeldungen: Promise<void> = meldungStore.getAllMeldungen();
      expect(meldungStore.loading).toBe(true);
      expect(meldungStore.errorCode).toBe('');
      expect(meldungStore.meldungen).toStrictEqual([]);

      await getAllMeldungen;
      expect(meldungStore.loading).toBe(false);
      expect(meldungStore.errorCode).toBe('');
      expect(meldungStore.meldungen).toEqual(
        meldungResponse.map((meldung: MeldungResponse) => ({
          id: meldung.id,
          text: meldung.inhalt,
          status: meldung.status,
        })),
      );
    });

    it('should handle error', async () => {
      mockadapter.onGet('/api/portal/meldung').replyOnce(500, 'Internal Server Error');
      const getAllMeldungen: Promise<void> = meldungStore.getAllMeldungen();
      expect(meldungStore.loading).toBe(true);
      expect(meldungStore.errorCode).toBe('');
      expect(meldungStore.meldungen).toStrictEqual([]);

      await getAllMeldungen;
      expect(meldungStore.loading).toBe(false);
      expect(meldungStore.errorCode).toBe('UNSPECIFIED_ERROR');
      expect(meldungStore.meldungen).toStrictEqual([]);
    });
  });

  describe('getCurrentMeldung', () => {
    it('should get current meldung', async () => {
      const currentmeldungResponse: MeldungResponse = {
        id: '1',
        inhalt: 'This is a test',
        status: 'VEROEFFENTLICHT',
      } as MeldungResponse;

      mockadapter.onGet('/api/portal/meldung/current').replyOnce(200, currentmeldungResponse);
      const getCurrentMeldung: Promise<void> = meldungStore.getCurrentMeldung();
      expect(meldungStore.loading).toBe(true);
      expect(meldungStore.errorCode).toBe('');
      expect(meldungStore.currentMeldung).toBe(null);

      await getCurrentMeldung;
      expect(meldungStore.loading).toBe(false);
      expect(meldungStore.errorCode).toBe('');
      expect(meldungStore.currentMeldung).toEqual({
        id: currentmeldungResponse.id,
        text: currentmeldungResponse.inhalt,
        status: currentmeldungResponse.status,
      });
    });

    it('should ignore empty response', async () => {
      mockadapter.onGet('/api/portal/meldung/current').replyOnce(200, {});
      const getCurrentMeldung: Promise<void> = meldungStore.getCurrentMeldung();
      expect(meldungStore.loading).toBe(true);
      expect(meldungStore.errorCode).toBe('');
      expect(meldungStore.currentMeldung).toBe(null);

      await getCurrentMeldung;
      expect(meldungStore.loading).toBe(false);
      expect(meldungStore.errorCode).toBe('');
      expect(meldungStore.currentMeldung).toBe(null);
    });

    it('should handle error', async () => {
      mockadapter.onGet('/api/portal/meldung/current').replyOnce(500, 'Internal Server Error');
      const getCurrentMeldung: Promise<void> = meldungStore.getCurrentMeldung();
      expect(meldungStore.loading).toBe(true);
      expect(meldungStore.errorCode).toBe('');
      expect(meldungStore.currentMeldung).toBe(null);

      await getCurrentMeldung;
      expect(meldungStore.loading).toBe(false);
      expect(meldungStore.errorCode).toBe('UNSPECIFIED_ERROR');
      expect(meldungStore.currentMeldung).toBe(null);
    });
  });

  describe('createOrUpdateMeldung', () => {
    it('should create or update meldung', async () => {
      const createUpdateMeldung: Meldung = {
        id: '1',
        text: 'This is a test',
        status: 'VEROEFFENTLICHT',
      } as Meldung;

      mockadapter.onPut('/api/portal/meldung').replyOnce(200);

      const createOrUpdateMeldung: Promise<void> = meldungStore.createOrUpdateMeldung(createUpdateMeldung);

      expect(meldungStore.loading).toBe(true);
      expect(meldungStore.errorCode).toBe('');

      await createOrUpdateMeldung;
      expect(meldungStore.loading).toBe(false);
      expect(meldungStore.errorCode).toBe('');
    });

    it('should handle error', async () => {
      const createUpdateMeldung: Meldung = {
        id: '1',
        text: 'This is a test',
        status: 'VEROEFFENTLICHT',
      } as Meldung;
      mockadapter.onPut('/api/portal/meldung').replyOnce(500, 'Internal Server Error');

      const createOrUpdateMeldung: Promise<void> = meldungStore.createOrUpdateMeldung(createUpdateMeldung);

      expect(meldungStore.loading).toBe(true);
      expect(meldungStore.errorCode).toBe('');

      await createOrUpdateMeldung;
      expect(meldungStore.loading).toBe(false);
      expect(meldungStore.errorCode).toBe('UNSPECIFIED_ERROR');
      expect(meldungStore.meldungen).toEqual([]);
    });
  });
});
