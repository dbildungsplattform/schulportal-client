import axiosApiInstance from '@/services/ApiService';
import { getResponseErrorCode } from '@/utils/errorHandlers';
import { defineStore, type Store, type StoreDefinition } from 'pinia';
import {
  Class2FAApiFactory,
  type AssignHardwareTokenBodyParams,
  type Class2FAApiInterface,
  type TokenInitBodyParams,
  type TokenRequiredResponse,
  type TokenStateResponse,
} from '../api-client/generated/api';

const twoFactorApi: Class2FAApiInterface = Class2FAApiFactory(undefined, '', axiosApiInstance);

type TwoFactorState = {
  errorCode: string;
  loading: boolean;
  hasToken: boolean | null;
  tokenKind: TokenKind | null;
  qrCode: string;
  serial: string;
  required: boolean;
};

type TwoFactorGetters = object;
type TwoFactorActions = {
  resetState: () => void;
  get2FAState: (personId: string) => Promise<void>;
  get2FARequirement: (personId: string) => Promise<void>;
  get2FASoftwareQRCode: (personId: string) => Promise<void>;
  assignHardwareToken: (assignHardwareTokenBodyParams: AssignHardwareTokenBodyParams) => Promise<void>;
  resetToken: (personId: string) => Promise<void>;
  verify2FAToken: (personId: string, token: string) => Promise<void>;
};

export type TwoFactorAuthentificationStore = Store<
  'twoFactorAuthentificationStore',
  TwoFactorState,
  TwoFactorGetters,
  TwoFactorActions
>;

export enum TokenKind {
  software = 'software',
  hardware = 'hardware',
}

export const useTwoFactorAuthentificationStore: StoreDefinition<
  'twoFactorAuthentificationStore',
  TwoFactorState,
  TwoFactorGetters,
  TwoFactorActions
> = defineStore('twoFactorAuthentificationStore', {
  state: (): TwoFactorState => {
    return {
      errorCode: '',
      loading: false,
      hasToken: null,
      tokenKind: null,
      qrCode: '',
      serial: '',
      required: false,
    };
  },
  actions: {
    resetState() {
      const tempRequired: boolean = this.required;
      this.$reset();
      this.required = tempRequired;
    },
    async get2FAState(personId: string) {
      this.loading = true;
      try {
        const twoFactorState: TokenStateResponse = (
          await twoFactorApi.privacyIdeaAdministrationControllerGetTwoAuthState(personId)
        ).data;

        this.hasToken = twoFactorState.hasToken;

        if (!twoFactorState.hasToken) {
          return;
        }

        switch (twoFactorState.tokenKind) {
          case TokenKind.hardware.toString():
            this.tokenKind = TokenKind.hardware;
            break;
          case TokenKind.software.toString():
            this.tokenKind = TokenKind.software;
            break;
          default:
            this.tokenKind = null;
        }
        this.serial = twoFactorState.serial;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'TOKEN_STATE_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async get2FARequirement(personId: string) {
      this.loading = true;
      this.required = false;
      try {
        const twoFactorState: TokenRequiredResponse = (
          await twoFactorApi.privacyIdeaAdministrationControllerRequiresTwoFactorAuthentication(personId)
        ).data;

        this.required = twoFactorState.required;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'UNSPECIFIED_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async get2FASoftwareQRCode(personId: string) {
      this.loading = true;
      try {
        const bodyParams: TokenInitBodyParams = {
          personId: personId,
        };
        const qrCodeImageBase64: string = (
          await twoFactorApi.privacyIdeaAdministrationControllerInitializeSoftwareToken(bodyParams)
        ).data;

        this.qrCode = qrCodeImageBase64;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'SOFTWARE_TOKEN_INITIALIZATION_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async assignHardwareToken(assignHardwareTokenBodyParams: AssignHardwareTokenBodyParams): Promise<void> {
      this.loading = true;
      try {
        await twoFactorApi.privacyIdeaAdministrationControllerAssignHardwareToken(assignHardwareTokenBodyParams);
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'HARDWARE_TOKEN_SERVICE_FEHLER');
      } finally {
        this.loading = false;
      }
    },

    async resetToken(personId: string): Promise<void> {
      this.loading = true;
      try {
        await twoFactorApi.privacyIdeaAdministrationControllerResetToken(personId);
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'TOKEN_RESET_ERROR');
      } finally {
        this.loading = false;
      }
    },

    async verify2FAToken(personId: string, token: string): Promise<void> {
      this.loading = true;
      try {
        await twoFactorApi.privacyIdeaAdministrationControllerVerifyToken({
          personId: personId,
          otp: token,
        });
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'SOFTWARE_TOKEN_VERIFICATION_ERROR');
      } finally {
        this.loading = false;
      }
    },
  },
});
