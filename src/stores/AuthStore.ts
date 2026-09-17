import axiosApiInstance from '@/services/ApiService';
import { defineStore, type Store, type StoreDefinition } from 'pinia';
import {
  AuthApiFactory,
  type AuthApiInterface,
  type CsrfTokenResponse,
  type PersonTimeLimitInfoResponse,
  type UserinfoResponse,
} from '../api-client/generated/api';
import type { Organisation } from './OrganisationStore';
import { RollenSystemRecht } from './RolleStore';
import type { AxiosResponse } from 'axios';

export enum StepUpLevel {
  NONE = 'none',
  SILVER = 'silver',
  GOLD = 'gold',
}

export type UserInfo = {
  sub: string;
  name: string | null;
  given_name: string | null;
  family_name: string | null;
  middle_name: string | null;
  preferred_username: string | null;
  profile: string | null;
  picture: string | null;
  website: string | null;
  email: string | null;
  email_verified: boolean | null;
  zoneinfo: string | null;
  locale: string | null;
  phone_number: string | null;
  updated_at: string | null;
  personId: string | null;
  personenkontexte: Array<PersonenkontextRolleFields> | null;
  password_updated_at: string | null;
};

export type PersonenkontextRolleFields = {
  organisation: Organisation;
  rolle: {
    systemrechte: Array<string>;
    serviceProviderIds: Array<string>;
  };
};

type AuthState = {
  currentUser: UserInfo | null;
  currentUserPermissions: Array<string>;
  hasImportPermission: boolean;
  hasKlassenverwaltungPermission: boolean;
  hasPersonenAnlegenPermission: boolean;
  hasPersonenLoeschenPermission: boolean;
  hasPersonenSyncPermission: boolean;
  hasPersonenverwaltungPermission: boolean;
  hasRollenverwaltungPermission: boolean;
  hasSchulverwaltungPermission: boolean;
  hasSchultraegerverwaltungPermission: boolean;
  hasPersonenBulkPermission: boolean;
  hasPortalVerwaltungPermission: boolean;
  hasHinweiseBearbeitenPermission: boolean;
  hasLandesbediensteteSuchenUndHinzufügenPermission: boolean;
  hasEingeschränktNeueBenutzerErstellenPermission: boolean;
  hasAngeboteVerwaltenPermission: boolean;
  hasRollenerweiternPermission: boolean;
  hasMptRollenVerwaltenPermission: boolean;
  hasEingeschränktAngeboteVerwaltenPermission: boolean;
  hasVidisPermission: boolean;
  isAuthenticated: boolean;
  acr: StepUpLevel;
  timeLimitInfos: PersonTimeLimitInfoResponse[];
  csrfToken: string | null;
};

type AuthActions = {
  initializeAuthStatus: () => Promise<void>;
  getCsrfToken: () => Promise<void>;
};

type AuthGetters = object;

export type AuthStore = Store<'authStore', AuthState, AuthGetters, AuthActions>;

const authApi: AuthApiInterface = AuthApiFactory(undefined, '', axiosApiInstance);

export const useAuthStore: StoreDefinition<'authStore', AuthState, AuthGetters, AuthActions> = defineStore(
  'authStore',
  {
    state: (): AuthState => ({
      currentUser: null,
      currentUserPermissions: [],
      hasImportPermission: false,
      hasKlassenverwaltungPermission: false,
      hasPersonenAnlegenPermission: false,
      hasPersonenLoeschenPermission: false,
      hasPersonenSyncPermission: false,
      hasPersonenverwaltungPermission: false,
      hasRollenverwaltungPermission: false,
      hasSchulverwaltungPermission: false,
      hasSchultraegerverwaltungPermission: false,
      hasPersonenBulkPermission: false,
      hasPortalVerwaltungPermission: false,
      hasHinweiseBearbeitenPermission: false,
      hasLandesbediensteteSuchenUndHinzufügenPermission: false,
      hasEingeschränktNeueBenutzerErstellenPermission: false,
      hasAngeboteVerwaltenPermission: false,
      hasRollenerweiternPermission: false,
      hasMptRollenVerwaltenPermission: false,
      hasEingeschränktAngeboteVerwaltenPermission: false,
      isAuthenticated: false,
      acr: StepUpLevel.NONE,
      timeLimitInfos: [],
      csrfToken: null,
      hasVidisPermission: false,
    }),
    actions: {
      async initializeAuthStatus() {
        try {
          const { data, status: loginStatus }: { data: UserinfoResponse; status: number } =
            await authApi.authenticationControllerInfo({
              validateStatus: null,
            });

          if (loginStatus >= 200 && loginStatus < 400) {
            this.isAuthenticated = true;
            this.currentUser = data;
            this.acr = data.acr as StepUpLevel;
            this.timeLimitInfos = data.timeLimits;
            await this.getCsrfToken();

            /* extract all system permissions from current user's personenkontexte */
            const personenkontexte: Array<PersonenkontextRolleFields> | null = this.currentUser.personenkontexte;
            personenkontexte?.forEach((personenkontext: PersonenkontextRolleFields) => {
              personenkontext.rolle.systemrechte.forEach((systemrecht: string) => {
                /* push unique permissions only */
                if (systemrecht && this.currentUserPermissions.indexOf(systemrecht) === -1) {
                  this.currentUserPermissions.push(systemrecht);
                }
              });
            });

            /* set permission aliases for easier global access */
            this.hasImportPermission = this.currentUserPermissions.includes('IMPORT_DURCHFUEHREN');
            this.hasKlassenverwaltungPermission = this.currentUserPermissions.includes('KLASSEN_VERWALTEN');
            this.hasPersonenAnlegenPermission = this.currentUserPermissions.includes('PERSONEN_ANLEGEN');
            this.hasPersonenLoeschenPermission = this.currentUserPermissions.includes('PERSONEN_SOFORT_LOESCHEN');
            this.hasPersonenSyncPermission = this.currentUserPermissions.includes('PERSON_SYNCHRONISIEREN');
            this.hasPersonenverwaltungPermission = this.currentUserPermissions.includes('PERSONEN_VERWALTEN');
            this.hasRollenverwaltungPermission = this.currentUserPermissions.includes('ROLLEN_VERWALTEN');
            this.hasSchulverwaltungPermission = this.currentUserPermissions.includes('SCHULEN_VERWALTEN');
            this.hasSchultraegerverwaltungPermission = this.currentUserPermissions.includes('SCHULTRAEGER_VERWALTEN');
            this.hasPersonenBulkPermission = this.currentUserPermissions.includes('BULK_VERWALTEN');
            this.hasPortalVerwaltungPermission = this.currentUserPermissions.includes('SCHULPORTAL_VERWALTEN');
            this.hasHinweiseBearbeitenPermission = this.currentUserPermissions.includes('HINWEISE_BEARBEITEN');
            this.hasLandesbediensteteSuchenUndHinzufügenPermission = this.currentUserPermissions.includes(
              'LANDESBEDIENSTETE_SUCHEN_UND_HINZUFUEGEN',
            );
            this.hasEingeschränktNeueBenutzerErstellenPermission = this.currentUserPermissions.includes(
              'EINGESCHRAENKT_NEUE_BENUTZER_ERSTELLEN',
            );
            this.hasAngeboteVerwaltenPermission = this.currentUserPermissions.includes(
              RollenSystemRecht.AngeboteVerwalten,
            );
            this.hasRollenerweiternPermission = this.currentUserPermissions.includes(RollenSystemRecht.RollenErweitern);
            this.hasMptRollenVerwaltenPermission = this.currentUserPermissions.includes(
              RollenSystemRecht.MptRollenVerwalten,
            );
            this.hasEingeschränktAngeboteVerwaltenPermission = this.currentUserPermissions.includes(
              RollenSystemRecht.AngeboteEingeschraenktVerwalten,
            );
            this.hasVidisPermission = this.currentUserPermissions.includes(
              RollenSystemRecht.SchulischeVidisAngeboteAbrufen,
            );
          } else {
            throw new Error('User info could not be retrieved.');
          }
        } catch {
          // If user info can't be retrieved, consider the user unauthenticated.
          this.currentUser = null;
          this.currentUserPermissions = [];
          this.hasImportPermission = false;
          this.hasKlassenverwaltungPermission = false;
          this.hasPersonenAnlegenPermission = false;
          this.hasPersonenLoeschenPermission = false;
          this.hasPersonenSyncPermission = false;
          this.hasPersonenverwaltungPermission = false;
          this.hasRollenverwaltungPermission = false;
          this.hasSchulverwaltungPermission = false;
          this.hasSchultraegerverwaltungPermission = false;
          this.hasPersonenBulkPermission = false;
          this.hasPortalVerwaltungPermission = false;
          this.hasHinweiseBearbeitenPermission = false;
          this.hasLandesbediensteteSuchenUndHinzufügenPermission = false;
          this.hasEingeschränktNeueBenutzerErstellenPermission = false;
          this.hasAngeboteVerwaltenPermission = false;
          this.hasMptRollenVerwaltenPermission = false;
          this.hasEingeschränktAngeboteVerwaltenPermission = false;
          this.hasVidisPermission = false;
          this.isAuthenticated = false;
          this.acr = StepUpLevel.NONE;
          this.timeLimitInfos = [];
          this.csrfToken = null;
        }
      },

      async getCsrfToken(): Promise<void> {
        try {
          const response: AxiosResponse<CsrfTokenResponse> = await authApi.authenticationControllerGetCsrfToken();
          this.csrfToken = response.data.csrfToken;
        } catch {
          this.csrfToken = null;
        }
      },
    },
  },
);
