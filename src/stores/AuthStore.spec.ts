import type { UserinfoResponse } from '@/api-client/generated';
import MockAdapter from 'axios-mock-adapter';
import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import { useAuthStore, type AuthStore } from './AuthStore';
import axiosApiInstance from '@/services/ApiService';

describe('AuthStore', () => {
  let authStore: AuthStore;
  let mockadapter: MockAdapter;

  beforeEach(() => {
    setActivePinia(createPinia());
    authStore = useAuthStore();
    mockadapter = new MockAdapter(axiosApiInstance);
  });

  it('should initalize state correctly', () => {
    expect(authStore.isAuthenticated).toBe(false);
  });

  describe('initializeAuthStatus', () => {
    it('should get login status', async () => {
      const mockInfo: UserinfoResponse = DoFactory.getUserinfoResponse();

      mockadapter.onGet('/api/auth/logininfo').replyOnce(200, mockInfo);
      mockadapter.onGet('/api/auth/csrf-token').replyOnce(200, { csrfToken: 'mock-csrf-token' });

      const initializeAuthStatus: Promise<void> = authStore.initializeAuthStatus();
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.currentUser).toBe(null);
      expect(authStore.hasKlassenverwaltungPermission).toBe(false);
      expect(authStore.hasPersonenverwaltungPermission).toBe(false);
      expect(authStore.hasRollenverwaltungPermission).toBe(false);
      expect(authStore.hasMptRollenVerwaltenPermission).toBe(false);
      expect(authStore.hasSchulverwaltungPermission).toBe(false);
      expect(authStore.hasSchultraegerverwaltungPermission).toBe(false);
      expect(authStore.hasPersonenSyncPermission).toBe(false);
      expect(authStore.hasImportPermission).toBe(false);
      await initializeAuthStatus;
      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.currentUser).toEqual(mockInfo);
      expect(authStore.hasKlassenverwaltungPermission).toBe(false);
      expect(authStore.hasPersonenverwaltungPermission).toBe(false);
      expect(authStore.hasRollenverwaltungPermission).toBe(true);
      expect(authStore.hasMptRollenVerwaltenPermission).toBe(false);
      expect(authStore.hasSchulverwaltungPermission).toBe(true);
      expect(authStore.hasSchultraegerverwaltungPermission).toBe(false);
      expect(authStore.hasPersonenSyncPermission).toBe(true);
      expect(authStore.hasImportPermission).toBe(true);
      expect(authStore.csrfToken).toBe('mock-csrf-token');
    });

    it('should set mpt rollen verwalten permission when present', async () => {
      const mockInfo: UserinfoResponse = DoFactory.getUserinfoResponse();
      mockInfo.personenkontexte[0]!.rolle.systemrechte = ['MPT_ROLLEN_VERWALTEN'];

      mockadapter.onGet('/api/auth/logininfo').replyOnce(200, mockInfo);
      mockadapter.onGet('/api/auth/csrf-token').replyOnce(200, { csrfToken: 'mock-csrf-token' });

      await authStore.initializeAuthStatus();

      expect(authStore.hasMptRollenVerwaltenPermission).toBe(true);
    });

    it('should not set mpt rollen verwalten permission when absent', async () => {
      const mockInfo: UserinfoResponse = DoFactory.getUserinfoResponse();

      mockadapter.onGet('/api/auth/logininfo').replyOnce(200, mockInfo);
      mockadapter.onGet('/api/auth/csrf-token').replyOnce(200, { csrfToken: 'mock-csrf-token' });

      await authStore.initializeAuthStatus();

      expect(authStore.hasMptRollenVerwaltenPermission).toBe(false);
    });

    it('should save no system permissions if none are present', async () => {
      const mockResponse: UserinfoResponse = DoFactory.getUserinfoResponse({ personenkontexte: [] });

      mockadapter.onGet('/api/auth/logininfo').replyOnce(200, mockResponse);
      mockadapter.onGet('/api/auth/csrf-token').replyOnce(200, { csrfToken: 'mock-csrf-token' });

      const initializeAuthStatus: Promise<void> = authStore.initializeAuthStatus();
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.currentUserPermissions).toEqual([]);
      await initializeAuthStatus;
      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.currentUserPermissions).toEqual([]);
      expect(authStore.hasMptRollenVerwaltenPermission).toBe(false);
    });

    it('should not authenticate on server error', async () => {
      mockadapter.onGet('/api/auth/logininfo').replyOnce(401, 'unauthorized error');

      const initializeAuthStatus: Promise<void> = authStore.initializeAuthStatus();
      expect(authStore.isAuthenticated).toBe(false);
      await initializeAuthStatus;
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.hasMptRollenVerwaltenPermission).toBe(false);
    });
  });

  describe('getCsrfToken', () => {
    it('should store the csrf token on success', async () => {
      mockadapter.onGet('/api/auth/csrf-token').replyOnce(200, { csrfToken: 'mock-csrf-token' });

      await authStore.getCsrfToken();

      expect(authStore.csrfToken).toBe('mock-csrf-token');
    });

    it('should set csrfToken to null on failure', async () => {
      mockadapter.onGet('/api/auth/csrf-token').replyOnce(500);

      await authStore.getCsrfToken();

      expect(authStore.csrfToken).toBeNull();
    });
  });
});
